if (typeof console !== "undefined") {
  if (typeof console.error !== "function") console.error = console.log;
  if (typeof console.warn !== "function") console.warn = console.log;
}

import { getPackageInfo } from "@zos/app";

import { trace, setDebugContext, errorDetails } from "../shared/debug";

import * as ble from "@zos/ble";

import { Time } from "@zos/sensor";

import { processBackgroundReading, scheduleInitialAlert, setAlertSnooze, getSnoozeUntil, recoverPendingAlerts, checkAlertWatchdog } from "../shared/background-alert";

import { exit } from "@zos/app-service";

import { localStorage } from "../shared/storage";

import { loadSettings, getBGStatus } from "../shared/settings";

import { schedulePoll, consumePollAlarm, cancelPollAlarm, LAST_REQUEST_KEY, PENDING_RESPONSE_KEY, MANUAL_REFRESH_KEY } from "../shared/background";

import { backgroundLog, setLogForwarder } from "../shared/background-log";

import { loadServiceState, saveServiceState, resetServiceState } from "../shared/serviceState";

import { set as setAlarm, REPEAT_ONCE } from "@zos/alarm";

import { CONNECTION_STATES } from "../shared/message";

const APP_ID = 1127420;

const RESPONSE_WAKE_INTERVAL_MS = 15e3;

const RESPONSE_TIMEOUT_MS = 45e3;

const CRITICAL_AFTER_MS = 18e5;

const CONNECTION = {
  IDLE: "IDLE",
  FETCHING: "FETCHING",
  RETRY_PENDING: "RETRY_PENDING",
  CRITICAL_FAILURE: "CRITICAL_FAILURE"
};

function str2buf(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 128) {
      bytes.push(c);
    } else if (c < 2048) {
      bytes.push(192 | c >> 6, 128 | c & 63);
    } else if (c < 55296 || c >= 57344) {
      bytes.push(224 | c >> 12, 128 | c >> 6 & 63, 128 | c & 63);
    } else {
      i++;
      c = 65536 + ((c & 1023) << 10 | str.charCodeAt(i) & 1023);
      bytes.push(240 | c >> 18, 128 | c >> 12 & 63, 128 | c >> 6 & 63, 128 | c & 63);
    }
  }
  const buf = new ArrayBuffer(bytes.length);
  const u8 = new Uint8Array(buf);
  for (let j = 0; j < bytes.length; j++) {
    u8[j] = bytes[j];
  }
  return buf;
}

function buf2str(u8) {
  if (!u8 || u8.length === 0) return "";
  let out = "";
  let i = 0;
  while (i < u8.length) {
    let c = u8[i++];
    if (c < 128) {
      out += String.fromCharCode(c);
    } else if (c > 191 && c < 224) {
      out += String.fromCharCode((c & 31) << 6 | u8[i++] & 63);
    } else if (c > 223 && c < 240) {
      out += String.fromCharCode((c & 15) << 12 | (u8[i++] & 63) << 6 | u8[i++] & 63);
    } else {
      let u = ((c & 7) << 18 | (u8[i++] & 63) << 12 | (u8[i++] & 63) << 6 | u8[i++] & 63) - 65536;
      out += String.fromCharCode(55296 + (u >> 10), 56320 + (u & 1023));
    }
  }
  return out;
}

AppService({
  _bleReceiverRegistered: false,
  _bleStatusListenerRegistered: false,
  state: {
    appSidePort: 0,
    timeSensor: null,
    pendingSince: 0,
    cycle: "",
    responseSequence: 0,
    lastMailboxTimestamp: 0,
    retry: null,
    connectionState: CONNECTION.IDLE
  },
  onInit(params) {
    setDebugContext("service");
    trace("LIFECYCLE_INIT");
    try {
      trace("RUNTIME_PACKAGE", {
        package: getPackageInfo()
      });
    } catch (e) {
      trace("RUNTIME_PACKAGE_ERROR", errorDetails(e));
    }
    const settings = loadSettings();
    this.state.retry = loadServiceState();
    this.state.connectionState = this.state.retry.criticalNotifiedAt ? CONNECTION.CRITICAL_FAILURE : this.state.retry.retryCount ? CONNECTION.RETRY_PENDING : CONNECTION.IDLE;
    this.handleNotificationAction(params);
    try {
      recoverPendingAlerts();
    } catch (e) {}
    backgroundLog("SERVICE_STARTED", {
      trigger: params || "start",
      settings: this.debugSettings(settings)
    });
    if (!(settings.backgroundInterval > 0)) {
      cancelPollAlarm();
      exit();
      return;
    }
    localStorage.setItem("zightscout_service_heartbeat", String(Date.now()));
    const pending = this.getPendingResponse();
    this.state.pendingSince = pending ? pending.since : 0;
    const storedPort = Number(localStorage.getItem("zightscout_ble_port"));
    if (storedPort > 0) this.state.appSidePort = storedPort;
    this.ensureBleReceiver();
    this.consumeBleMailbox();
    this.state.timeSensor = new Time;
    this._minuteCallback = () => this.runCycle("minute", false);
    this.state.timeSensor.onPerMinute(this._minuteCallback);
    this.runCycle(params || "start", false);
    const lastDisconnect = Number(localStorage.getItem("zightscout_ble_last_disconnect"));
    const isPortInvalid = !storedPort || storedPort === 0;
    const isRecentDisconnect = lastDisconnect && Date.now() - lastDisconnect < 12e4;
    if (isPortInvalid || isRecentDisconnect || this.state.waitingForPort) {
      this.sendShake();
    }
  },
  ensureBleReceiver() {
    if (this._bleReceiverRegistered) return;
    try {
      if (typeof ble.createConnect !== "function") throw new Error("ble.createConnect unavailable");
      ble.createConnect((index, data, size) => {
        try {
          const len = size && size > 0 ? size : data && data.byteLength ? data.byteLength : 0;
          if (data && len > 0) {
            this.state.lastMailboxTimestamp = Date.now();
          }
        } catch (err) {}
        this.handleBleMessage(data, size);
      });
      if (typeof ble.addListener === "function" && !this._bleStatusListenerRegistered) {
        try {
          ble.addListener(status => {
            trace("BLE_STATUS_CHANGED", {
              connected: status
            });
            if (!status) {
              localStorage.setItem("zightscout_ble_last_disconnect", String(Date.now()));
              this.checkBluetoothAlert("ble-listener-disconnect");
            } else {
              localStorage.removeItem("zightscout_ble_last_disconnect");
              localStorage.setItem("zightscout_ble_last_contact", String(Date.now()));
              if (this.state.retry) {
                this.state.retry.bleDisconnectAttempts = 0;
                this.state.retry.lastBleAttemptAt = 0;
                this.persistRetry();
              }
              this.sendShake();
            }
          });
          this._bleStatusListenerRegistered = true;
        } catch (errStatus) {}
      }
      this._bleReceiverRegistered = true;
      backgroundLog("BLE_RECEIVER_READY", {
        owner: "app_service",
        port: this.state.appSidePort
      });
    } catch (e) {
      this._bleReceiverRegistered = false;
      backgroundLog("BLE_RECEIVER_ERROR", errorDetails(e));
    }
  },
  isBluetoothDisconnected() {
    try {
      if (typeof ble.connectStatus === "function") {
        return !ble.connectStatus();
      }
    } catch (e) {}
    const lastContact = Number(localStorage.getItem("zightscout_ble_last_contact")) || 0;
    const lastDisconnect = Number(localStorage.getItem("zightscout_ble_last_disconnect")) || 0;
    if (lastDisconnect > 0 && lastDisconnect >= lastContact) return true;
    if (!this.state.appSidePort && this.state.waitingForPort) return true;
    return false;
  },
  checkBluetoothAlert(reason) {
    const snoozeUntil = getSnoozeUntil();
    if (snoozeUntil) {
      backgroundLog("BLUETOOTH_CHECK_SNOOZED", {
        snoozeUntil: snoozeUntil
      });
      return false;
    }
    const isDisconnected = this.isBluetoothDisconnected();
    if (!isDisconnected) {
      if (this.state.retry && this.state.retry.bleDisconnectAttempts > 0) {
        this.state.retry.bleDisconnectAttempts = 0;
        this.state.retry.lastBleAttemptAt = 0;
        this.persistRetry();
        backgroundLog("BLUETOOTH_RECONNECTED", {
          retryCount: this.state.retry.retryCount
        });
      }
      return false;
    }
    if (!this.state.retry) this.state.retry = loadServiceState();
    const now = Date.now();
    const lastAttemptAt = Number(this.state.retry.lastBleAttemptAt) || 0;
    if (lastAttemptAt > 0 && now - lastAttemptAt < 45e3) {
      return false;
    }
    this.state.retry.lastBleAttemptAt = now;
    const attempts = (Number(this.state.retry.bleDisconnectAttempts) || 0) + 1;
    this.state.retry.bleDisconnectAttempts = attempts;
    backgroundLog("BLUETOOTH_DISCONNECT_ATTEMPT", {
      attempt: attempts,
      maxAttempts: 3,
      reason: reason || "ble-disconnect"
    });
    this.sendShake();
    if (attempts < 3) {
      const nextAttemptAt = now + 6e4;
      this.state.retry.nextRetryAt = nextAttemptAt;
      this.persistRetry();
      const s = loadSettings();
      schedulePoll(s, nextAttemptAt);
      return false;
    }
    if (!this.state.retry.criticalNotifiedAt || this.state.retry.lastNotifiedErrorState !== CONNECTION_STATES.BLUETOOTH_OFFLINE) {
      this.state.retry.criticalNotifiedAt = now;
      this.state.retry.lastNotifiedErrorState = CONNECTION_STATES.BLUETOOTH_OFFLINE;
      this.setConnectionState(CONNECTION.CRITICAL_FAILURE, CONNECTION_STATES.BLUETOOTH_OFFLINE);
      const delta = this.failureDelta(now);
      const minutes = Math.max(3, Math.floor(delta / 6e4));
      this.triggerOfflineAlert(minutes, CONNECTION_STATES.BLUETOOTH_OFFLINE);
    }
    this.persistRetry();
    return true;
  },
  persistRetry() {
    this.state.retry = saveServiceState(this.state.retry);
  },
  getCriticalThresholdMs(intervalMinutes) {
    const intervalMs = (Number(intervalMinutes) || 5) * 6e4;
    return Math.max(intervalMs * 2, intervalMs + 15 * 6e4);
  },
  failureDelta(now) {
    const storedLastFetch = Number(localStorage.getItem("zightscout_last_fetch_at"));
    const lastSuccess = storedLastFetch > 0 ? storedLastFetch : this.state.retry && this.state.retry.lastSuccessTimestamp > 0 ? this.state.retry.lastSuccessTimestamp : 0;
    return lastSuccess > 0 ? Math.max(0, now - lastSuccess) : 0;
  },
  setConnectionState(next, reason) {
    this.state.connectionState = next;
    this.persistRetry();
    backgroundLog("CONNECTION_STATE", {
      timestamp: Date.now(),
      state: next,
      reason: reason,
      retryCount: this.state.retry.retryCount,
      deltaTime: this.failureDelta(Date.now())
    });
  },
  triggerOfflineAlert(minutes, errorState) {
    const snoozeUntil = getSnoozeUntil();
    if (snoozeUntil) {
      backgroundLog("CONNECTION_LOST_ALERT_SNOOZED", {
        minutes: minutes,
        snoozeUntil: snoozeUntil,
        errorState: errorState
      });
      return;
    }
    const state = errorState || null;
    try {
      localStorage.setItem("zightscout_pending_offline_alert", JSON.stringify({
        errorState: state,
        minutes: minutes,
        scheduledAt: Date.now()
      }));
    } catch (e) {}
    const alarmTime = Math.ceil(Date.now() / 1e3) + 1;
    const alarmId = setAlarm({
      url: "app-service/alert-service",
      time: alarmTime,
      repeat_type: REPEAT_ONCE,
      store: true,
      param: JSON.stringify({
        type: "CONNECTION_LOST",
        minutes: minutes,
        errorState: state
      })
    });
    backgroundLog(alarmId > 0 ? "CONNECTION_LOST_ALARM_SCHEDULED" : "CONNECTION_LOST_ALARM_FAILED", {
      minutes: minutes,
      errorState: state,
      alarmId: alarmId
    });
  },
  registerFailure(reason, errorDetails) {
    const now = Date.now();
    const storedLastFetch = Number(localStorage.getItem("zightscout_last_fetch_at"));
    if (storedLastFetch > 0) {
      this.state.retry.lastSuccessTimestamp = storedLastFetch;
    } else if (!(this.state.retry.lastSuccessTimestamp > 0)) {
      this.state.retry.lastSuccessTimestamp = now;
    }
    this.state.retry.retryCount += 1;
    const delta = this.failureDelta(now);
    const s = loadSettings();
    const criticalThresholdMs = this.getCriticalThresholdMs(s.backgroundInterval);
    const isBleFailure = reason === CONNECTION_STATES.BLUETOOTH_OFFLINE || reason === "ble-disconnect" || reason === "ble-send-failed" || reason === "ble-port-unavailable" || this.isBluetoothDisconnected();
    if (isBleFailure) {
      this.checkBluetoothAlert(reason);
    } else {
      const errorState = errorDetails && errorDetails.connectionState || (typeof reason === "string" && reason.startsWith("NIGHTSCOUT_") ? reason : reason === "errAuth" ? CONNECTION_STATES.NIGHTSCOUT_AUTH_ERROR : reason === "errTimeout" || reason === "http-timeout" ? CONNECTION_STATES.NIGHTSCOUT_TIMEOUT : CONNECTION_STATES.NETWORK_OFFLINE);
      const isConfirmedFailure = this.state.retry.retryCount >= 3 && delta >= criticalThresholdMs;
      const stateChanged = this.state.retry.lastNotifiedErrorState && this.state.retry.lastNotifiedErrorState !== errorState;
      if (isConfirmedFailure && (!this.state.retry.criticalNotifiedAt || stateChanged)) {
        this.state.retry.criticalNotifiedAt = now;
        this.state.retry.lastNotifiedErrorState = errorState;
        this.setConnectionState(CONNECTION.CRITICAL_FAILURE, errorState);
        const minutes = Math.max(3, Math.floor(delta / 6e4));
        this.triggerOfflineAlert(minutes, errorState);
      } else if (this.state.connectionState !== CONNECTION.CRITICAL_FAILURE) {
        this.setConnectionState(CONNECTION.RETRY_PENDING, errorState);
      }
    }
    if (!isBleFailure || !this.state.retry.nextRetryAt || this.state.retry.nextRetryAt <= now) {
      const delay = this.state.retry.retryCount === 1 || isBleFailure && this.state.retry.bleDisconnectAttempts < 3 ? 6e4 : (Number(s.backgroundInterval) || 5) * 6e4;
      this.state.retry.nextRetryAt = now + delay;
    }
    this.persistRetry();
    backgroundLog("FETCH_FAILURE", {
      timestamp: now,
      state: this.state.connectionState,
      reason: reason,
      retryCount: this.state.retry.retryCount,
      bleAttempts: this.state.retry.bleDisconnectAttempts,
      delayMs: Math.max(0, this.state.retry.nextRetryAt - now),
      nextRetryAt: this.state.retry.nextRetryAt,
      deltaTime: delta
    });
    schedulePoll(s, this.state.retry.nextRetryAt);
  },
  registerSuccess(reading) {
    const ts = reading && reading.receivedAt ? Number(reading.receivedAt) : Date.now();
    const wasCritical = !!(this.state.retry && this.state.retry.criticalNotifiedAt);
    const prevErrorState = this.state.retry ? this.state.retry.lastNotifiedErrorState : null;
    this.state.retry = resetServiceState(ts);
    try {
      localStorage.removeItem("zightscout_pending_offline_alert");
    } catch (e) {}
    if (wasCritical) {
      backgroundLog("CONNECTION_RECOVERED", {
        timestamp: ts,
        previousState: prevErrorState || "CRITICAL_FAILURE",
        recoveredAfterDelta: this.failureDelta(ts)
      });
      try {
        localStorage.setItem("zightscout_connection_recovered", String(ts));
      } catch (e) {}
    }
    this.setConnectionState(CONNECTION.IDLE, "response-success");
    backgroundLog("FETCH_SUCCESS", {
      timestamp: ts,
      state: CONNECTION.IDLE,
      retryCount: 0,
      deltaTime: 0,
      currentBG: reading && reading.currentBG
    });
  },
  handleNotificationAction(params) {
    let raw = "";
    if (typeof params === "string") raw = params; else if (params && typeof params === "object") raw = params.param ? String(params.param) : JSON.stringify(params);
    const match = /(?:action=snooze|"action":"snooze").*?(?:minutes=(\d+)|"minutes":(\d+))/.exec(raw) || /(?:minutes=(\d+)|"minutes":(\d+)).*?(?:action=snooze|"action":"snooze")/.exec(raw);
    if (!match) return false;
    const mins = Number(match[1] || match[2]);
    const until = setAlertSnooze(mins);
    if (until) {
      backgroundLog("SNOOZE_ACTION", {
        minutes: mins,
        until: until
      });
      if (this.state.retry) {
        this.state.retry.criticalNotifiedAt = null;
        this.state.retry.bleDisconnectAttempts = 0;
        this.state.retry.lastBleAttemptAt = 0;
        this.persistRetry();
        backgroundLog("SNOOZE_BLE_STATE_RESET", {
          minutes: mins,
          until: until
        });
      }
    }
    return !!until;
  },
  debugSettings(s) {
    return {
      veryLow: s.veryLow,
      low: s.low,
      high: s.high,
      veryHigh: s.veryHigh,
      backgroundInterval: s.backgroundInterval,
      outOfRangeVibration: s.outOfRangeVibration,
      criticalVibration: s.criticalVibration,
      unit: s.unit,
      urlConfigured: !!s.apiUrl
    };
  },
  getPendingResponse() {
    try {
      const pending = JSON.parse(localStorage.getItem(PENDING_RESPONSE_KEY) || "null");
      return pending && pending.cycle && Number(pending.since) ? pending : null;
    } catch (e) {
      localStorage.removeItem(PENDING_RESPONSE_KEY);
      return null;
    }
  },
  clearPendingResponse(cycle, requestId) {
    const pending = this.getPendingResponse();
    if (!pending) return false;
    if (cycle && pending.cycle !== cycle) return false;
    if (requestId && pending.requestId && pending.requestId !== requestId) return false;
    localStorage.removeItem(PENDING_RESPONSE_KEY);
    this.state.pendingSince = 0;
    return true;
  },
  consumeBleMailbox() {
    return false;
  },
  runCycle(trigger, retryDue) {
    this.consumeBleMailbox();
    const now = Date.now();
    const s = loadSettings();
    try {
      checkAlertWatchdog(trigger !== "minute");
    } catch (e) {}
    const isIdleMinute = trigger === "minute" && this.state.connectionState === CONNECTION.IDLE && !retryDue && !this.state.pendingSince;
    if (!isIdleMinute) {
      backgroundLog("WAKE", {
        timestamp: now,
        trigger: trigger,
        cycle: this.state.cycle,
        state: this.state.connectionState,
        retryCount: this.state.retry.retryCount,
        deltaTime: this.failureDelta(now),
        settings: this.debugSettings(s)
      });
    } else {
      console.log("[ZIGHTSCOUT][BG] " + JSON.stringify({
        timestamp: now,
        event: "WAKE",
        trigger: "minute",
        state: this.state.connectionState
      }));
    }
    if (!(s.backgroundInterval > 0)) {
      cancelPollAlarm();
      backgroundLog("DISABLED", {
        reason: "OFF"
      });
      exit();
      return;
    }
    localStorage.setItem("zightscout_service_heartbeat", String(now));
    consumePollAlarm();
    this.ensureBleReceiver();
    if (this.isBluetoothDisconnected()) {
      this.checkBluetoothAlert("run-cycle");
    } else if (this.state.retry && this.state.retry.bleDisconnectAttempts > 0) {
      this.state.retry.bleDisconnectAttempts = 0;
      this.state.retry.lastBleAttemptAt = 0;
      this.persistRetry();
    }
    let nextTarget;
    try {
      const pending = this.getPendingResponse();
      if (pending && now - pending.since >= RESPONSE_TIMEOUT_MS) {
        backgroundLog("FETCH_TIMEOUT", {
          cycle: pending.cycle
        });
        this.clearPendingResponse(pending.cycle);
        if (this.state.retry && this.state.retry.retryCount >= 1) {
          this.state.appSidePort = 0;
          this.state.waitingForPort = true;
        }
        this.sendShake();
        this.registerFailure("response-timeout");
        return;
      }
      this.flushCommands();
      const retryNow = retryDue || this.state.retry.nextRetryAt > 0 && now >= this.state.retry.nextRetryAt;
      if (this.state.retry.nextRetryAt > now && !retryNow) {
        nextTarget = this.state.retry.nextRetryAt;
        return;
      }
      let last = Number(localStorage.getItem(LAST_REQUEST_KEY));
      if (!last || last > now) {
        localStorage.setItem(LAST_REQUEST_KEY, String(now));
        last = now;
      }
      const manualAt = Number(localStorage.getItem(MANUAL_REFRESH_KEY));
      const manualRefresh = manualAt > 0 && now - manualAt < 12e4;
      if (!this.state.pendingSince && (retryNow || manualRefresh || now - last >= s.backgroundInterval * 6e4)) {
        this.fetchData(retryNow || manualRefresh, manualRefresh);
      }
    } catch (e) {
      backgroundLog("CYCLE_ERROR", errorDetails(e));
    } finally {
      if (!nextTarget) {
        nextTarget = this.state.pendingSince ? now + RESPONSE_WAKE_INTERVAL_MS : this.state.waitingForPort || !s.apiUrl ? now + 6e4 : this.state.retry.nextRetryAt > now ? this.state.retry.nextRetryAt : undefined;
      }
      const next = schedulePoll(s, nextTarget);
      if (!isIdleMinute) {
        backgroundLog("NEXT_POLL", {
          cycle: this.state.cycle,
          at: next,
          intervalMinutes: s.backgroundInterval,
          state: this.state.connectionState,
          retryCount: this.state.retry.retryCount
        });
      } else {
        console.log("[ZIGHTSCOUT][BG] " + JSON.stringify({
          timestamp: now,
          event: "NEXT_POLL",
          at: next
        }));
      }
    }
  },
  sendShake() {
    const buf = new ArrayBuffer(16 + 1);
    const dv = new DataView(buf);
    const u8 = new Uint8Array(buf);
    dv.setUint8(0, 1);
    dv.setUint8(1, 1);
    dv.setUint16(2, 1, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 0, true);
    dv.setUint32(8, APP_ID, true);
    dv.setUint32(12, 0, true);
    u8[16] = APP_ID & 255;
    try {
      if (typeof ble.send !== "function") throw new Error("ble.send unavailable");
      const result = ble.send(buf, buf.byteLength);
      trace("BLE_SEND", {
        bytes: buf.byteLength,
        result: String(result),
        port: this.state.appSidePort
      });
      return result !== false;
    } catch (e) {
      backgroundLog("BLE_SEND_FAILED", {
        error: String(e)
      });
      return false;
    }
  },
  sendDataMessage(msgObj) {
    const jsonStr = JSON.stringify(msgObj);
    const utf8Buf = str2buf(jsonStr);
    const totalLen = 16 + utf8Buf.byteLength;
    const buf = new ArrayBuffer(totalLen);
    const dv = new DataView(buf);
    const u8 = new Uint8Array(buf);
    dv.setUint8(0, 1);
    dv.setUint8(1, 1);
    dv.setUint16(2, 4, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, this.state.appSidePort, true);
    dv.setUint32(8, APP_ID, true);
    dv.setUint32(12, 0, true);
    const payloadBytes = new Uint8Array(utf8Buf);
    u8.set(payloadBytes, 16);
    try {
      if (typeof ble.send !== "function") return false;
      return ble.send(buf, buf.byteLength) !== false;
    } catch (e) {
      return false;
    }
  },
  dumpPendingLogs() {
    try {
      if (this.state && this.state.appSidePort > 0) {
        const raw = localStorage.getItem("zightscout_background_log");
        if (raw) {
          const entries = JSON.parse(raw);
          if (Array.isArray(entries) && entries.length > 0) {
            this.sendDataMessage({
              type: "BG_LOG_DUMP",
              logs: entries.slice(-15)
            });
          }
        }
      }
    } catch (e) {}
  },
  flushCommands() {
    const raw = localStorage.getItem("zightscout_commands");
    trace("COMMAND_QUEUE_CHECK", {
      queued: !!raw,
      port: this.state.appSidePort
    });
    if (!raw) return;
    const queue = JSON.parse(raw);
    if (!queue.length) return;
    if (!this.state.appSidePort) {
      this.sendShake();
      return;
    }
    localStorage.removeItem("zightscout_commands");
    trace("COMMAND_QUEUE_FLUSH", {
      count: queue.length,
      port: this.state.appSidePort
    });
    for (let i = 0; i < queue.length; i++) {
      const bytes = new Uint8Array(queue[i]);
      new DataView(bytes.buffer).setUint16(6, this.state.appSidePort, true);
      try {
        const result = ble.send(bytes.buffer, bytes.length);
        trace("COMMAND_BLE_SEND", {
          bytes: bytes.length,
          result: String(result),
          port: this.state.appSidePort
        });
      } catch (e) {
        backgroundLog("COMMAND_FAILED", {
          error: String(e)
        });
      }
    }
  },
  fetchData(force, isManualRefresh = false) {
    const s = loadSettings();
    if (!(s.backgroundInterval > 0) || this.state.pendingSince) return;
    const now = Date.now();
    const last = Number(localStorage.getItem(LAST_REQUEST_KEY));
    if (!force && last && now - last < s.backgroundInterval * 6e4) return;
    if (!s.apiUrl) {
      backgroundLog("FETCH_SKIPPED", {
        reason: "URL_NOT_CONFIGURED"
      });
      return;
    }
    if (!this.state.appSidePort) {
      const storedPort = Number(localStorage.getItem("zightscout_ble_port"));
      if (storedPort > 0) this.state.appSidePort = storedPort;
    }
    if (!this.state.appSidePort) {
      this.state.waitingForPort = true;
      this.sendShake();
      this.registerFailure("ble-port-unavailable");
      return;
    }
    this.state.waitingForPort = false;
    this.state.cycle = String(now);
    this.state.pendingSince = now;
    this.setConnectionState(CONNECTION.FETCHING, "fetch-sent");
    backgroundLog("FETCH_SENT", {
      cycle: this.state.cycle,
      settings: this.debugSettings(s)
    });
    const requestId = this.state.cycle + "_" + Math.random().toString(36).substring(2, 7);
    this.state.currentRequestId = requestId;
    if (this.sendDataMessage({
      type: "FETCH_DATA",
      apiUrl: s.apiUrl,
      backgroundCycle: this.state.cycle,
      requestId: requestId
    })) {
      localStorage.setItem(LAST_REQUEST_KEY, String(now));
      localStorage.setItem(PENDING_RESPONSE_KEY, JSON.stringify({
        cycle: this.state.cycle,
        requestId: requestId,
        since: now
      }));
      if (force) localStorage.removeItem(MANUAL_REFRESH_KEY);
      schedulePoll(s, now + RESPONSE_WAKE_INTERVAL_MS);
      if (isManualRefresh) {
        try {
          if (this._manualHoldTimer) clearTimeout(this._manualHoldTimer);
          this._manualHoldTimer = setTimeout(() => {
            try {
              this.consumeBleMailbox();
            } finally {
              this._manualHoldTimer = null;
            }
          }, 3500);
          backgroundLog("MANUAL_HOLD_TIMER_ARMED", {
            cycle: this.state.cycle,
            ms: 3500
          });
        } catch (eTimer) {
          backgroundLog("MANUAL_HOLD_TIMER_ERROR", {
            error: String(eTimer)
          });
        }
      }
    } else {
      this.state.pendingSince = 0;
      this.state.appSidePort = 0;
      this.state.waitingForPort = true;
      this.sendShake();
      this.registerFailure("ble-send-failed");
    }
  },
  onEvent(params) {
    if (!this.handleNotificationAction(params)) this.runCycle(params || "event", false);
  },
  handleBleMessage(data, size) {
    try {
      if (!data) return;
      const bytes = new Uint8Array(data.buffer || data, data.byteOffset || 0, size || data.byteLength);
      trace("BLE_RECEIVE", {
        bytes: bytes.length,
        pendingSince: this.state.pendingSince,
        cycle: this.state.cycle
      });
      const framed = bytes.length >= 16 && bytes[0] === 1 && bytes[1] === 1;
      if (framed) {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
        const type = view.getUint16(2, true);
        if (type === 1) {
          this.state.appSidePort = view.getUint16(6, true);
          localStorage.setItem("zightscout_ble_port", String(this.state.appSidePort));
          localStorage.setItem("zightscout_ble_last_contact", String(Date.now()));
          localStorage.removeItem("zightscout_ble_last_disconnect");
          if (this.state.retry) {
            this.state.retry.bleDisconnectAttempts = 0;
            this.state.retry.lastBleAttemptAt = 0;
            this.persistRetry();
          }
          localStorage.setItem("zightscout_response", JSON.stringify({
            timestamp: Date.now(),
            sequence: ++this.state.responseSequence,
            bytes: Array.from(bytes)
          }));
          trace("BLE_HANDSHAKE", {
            port: this.state.appSidePort
          });
          this.flushCommands();
          const manualAt = Number(localStorage.getItem(MANUAL_REFRESH_KEY));
          const isManual = manualAt > 0 && Date.now() - manualAt < 12e4;
          const shouldForce = isManual || this.state.waitingForPort || this.state.connectionState === CONNECTION.RETRY_PENDING || this.state.connectionState === CONNECTION.CRITICAL_FAILURE || Boolean(localStorage.getItem("zightscout_ble_last_disconnect"));
          this.fetchData(shouldForce, isManual);
          return;
        }
        if (type === 2) {
          this.state.appSidePort = 0;
          this.state.waitingForPort = true;
          localStorage.setItem("zightscout_ble_last_disconnect", String(Date.now()));
          this.sendShake();
          this.registerFailure("ble-disconnect");
          return;
        }
      }
      const parsed = JSON.parse(buf2str(bytes.subarray(framed ? 16 : 0)));
      trace("BLE_RESPONSE_PARSED", {
        type: parsed.type,
        keys: Object.keys(parsed.data || {}),
        currentBG: parsed.data && parsed.data.currentBG,
        cycle: parsed.data && parsed.data.backgroundCycle
      });
      if (this._manualHoldTimer) {
        try {
          clearTimeout(this._manualHoldTimer);
        } catch (eTimer) {}
        this._manualHoldTimer = null;
      }
      const isBg = parsed && parsed.data && Boolean(parsed.data.backgroundCycle);
      if (!isBg) {
        localStorage.setItem("zightscout_response", JSON.stringify({
          timestamp: Date.now(),
          sequence: ++this.state.responseSequence,
          bytes: Array.from(bytes)
        }));
      }
      if (parsed && parsed.data) {
        const reading = parsed.data;
        const pending = this.getPendingResponse();
        if (pending && pending.requestId && reading.requestId && pending.requestId !== reading.requestId) {
          backgroundLog("RESPONSE_DROPPED_MISMATCH", {
            cycle: reading.backgroundCycle,
            receivedRequestId: reading.requestId,
            expectedRequestId: pending.requestId
          });
          return;
        }
        const lastDataRaw = localStorage.getItem("zightscout_last_data");
        let lastData = null;
        try {
          lastData = lastDataRaw ? JSON.parse(lastDataRaw) : null;
        } catch (e) {}
        const incomingTs = Number(reading.readingTimestamp || reading.date || 0);
        const lastTs = lastData ? Number(lastData.readingTimestamp || lastData.date || 0) : 0;
        if (lastTs > 0 && incomingTs > 0 && incomingTs < lastTs) {
          backgroundLog("RESPONSE_DROPPED_STALE", {
            cycle: reading.backgroundCycle,
            incomingTs: incomingTs,
            lastTs: lastTs
          });
          if (reading.backgroundCycle) this.clearPendingResponse(reading.backgroundCycle, reading.requestId);
          return;
        }
        if (reading.verification) {
          localStorage.setItem("zightscout_verification_result", JSON.stringify({
            timestamp: Date.now(),
            ...reading
          }));
        }
        if (reading.backgroundCycle && this.clearPendingResponse(reading.backgroundCycle, reading.requestId)) {
          backgroundLog("FETCH_RESPONSE", {
            cycle: reading.backgroundCycle,
            requestId: reading.requestId,
            currentBG: reading.currentBG || ""
          });
        }
        if (reading.error) {
          localStorage.removeItem("zightscout_ble_connecting");
          localStorage.removeItem("zightscout_http_validating");
          const errorState = reading.connectionState || (reading.code === "errAuth" ? CONNECTION_STATES.NIGHTSCOUT_AUTH_ERROR : reading.code === "errTimeout" ? CONNECTION_STATES.NIGHTSCOUT_TIMEOUT : CONNECTION_STATES.NETWORK_OFFLINE);
          localStorage.setItem("zightscout_last_fetch_error", JSON.stringify({
            timestamp: Date.now(),
            code: reading.code,
            connectionState: errorState,
            httpStatus: reading.httpStatus,
            message: String(reading.message || "Falha ao consultar o Nightscout")
          }));
          backgroundLog("FETCH_ERROR", {
            cycle: reading.backgroundCycle || "foreground",
            message: reading.message,
            code: reading.code,
            connectionState: errorState
          });
          if (reading.backgroundCycle) this.registerFailure(errorState, reading);
        } else if (reading.currentBG || reading.sgv !== undefined && reading.sgv !== null) {
          const receivedAt = Date.now();
          const currentBG = String(reading.currentBG || reading.sgv);
          const normalizedReading = {
            ...reading,
            currentBG: currentBG,
            receivedAt: receivedAt
          };
          localStorage.setItem("zightscout_last_data", JSON.stringify(normalizedReading));
          localStorage.setItem("zightscout_last_fetch_at", String(receivedAt));
          localStorage.removeItem("zightscout_last_fetch_error");
          localStorage.removeItem("zightscout_ble_connecting");
          localStorage.removeItem("zightscout_http_validating");
          localStorage.removeItem("zightscout_ble_last_disconnect");
          try {
            localStorage.removeItem("zightscout_pending_offline_alert");
          } catch (e) {}
          this.registerSuccess(normalizedReading);
          scheduleInitialAlert(normalizedReading);
        }
      }
    } catch (e) {
      backgroundLog("RESPONSE_ERROR", errorDetails(e));
    }
  },
  processBackgroundReading(data) {
    processBackgroundReading(data);
  },
  onDestroy() {
    if (this._minuteCallback && this.state.timeSensor && typeof this.state.timeSensor.offPerMinute === "function") {
      this.state.timeSensor.offPerMinute(this._minuteCallback);
    }
    this._minuteCallback = null;
    this._bleReceiverRegistered = false;
    this._bleStatusListenerRegistered = false;
    if (this._manualHoldTimer) {
      try {
        clearTimeout(this._manualHoldTimer);
      } catch (eTimer) {}
      this._manualHoldTimer = null;
    }
    const settings = loadSettings();
    const pending = this.getPendingResponse();
    schedulePoll(settings, this.state.retry && this.state.retry.nextRetryAt > Date.now() ? this.state.retry.nextRetryAt : pending ? Date.now() + RESPONSE_WAKE_INTERVAL_MS : undefined);
    backgroundLog("SERVICE_DESTROYED", {
      intervalMinutes: settings.backgroundInterval,
      monitoringEnabled: settings.backgroundInterval > 0,
      pendingResponse: !!pending
    });
    localStorage.removeItem("zightscout_service_heartbeat");
  }
});
