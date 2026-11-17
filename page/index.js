if (typeof console !== "undefined") {
  if (typeof console.error !== "function") console.error = console.log;
  if (typeof console.warn !== "function") console.warn = console.log;
}

import { trace, setDebugContext, errorDetails } from "../shared/debug";

import * as ble from "../shared/page-ble";

import { syncBackground } from "../shared/page-ble";

import { createWidget, deleteWidget, widget, prop, align, event } from "@zos/ui";

import { push } from "@zos/router";

import { Vibrator, VIBRATOR_SCENE_NOTIFICATION, VIBRATOR_SCENE_STRONG_REMINDER } from "@zos/sensor";

import { triggerVibration } from "../shared/vibrator";

import { queryPermission, requestPermission, getPackageInfo } from "@zos/app";

import { showToast } from "@zos/interaction";

import { localStorage } from "../shared/storage";

import * as alarm from "@zos/alarm";

import { loadSettings, saveSettings, getBGColor, getBGStatus, evaluateGlucoseLevel } from "../shared/settings";

import { getLayout, isDeviceSupported } from "../shared/layout";

import { getSnoozeUntil, setAlertSnooze, clearAlertSnooze, processBackgroundReading } from "../shared/background-alert";

import { getConnectionStatus } from "../shared/connection-status";

import { recordFetchSuccess } from "../shared/serviceState";

import { t, formatReadingAge } from "../shared/i18n";

import { formatGlucose, normalizeGlucoseUnit, formatDelta } from "../shared/glucose-unit";

import { AnimatedToast } from "../shared/animated-toast";

function ensureBgServicePermission() {
  try {
    const query = queryPermission({
      code: "device:os.bg_service"
    });
    console.log("[BG] Permission query: " + JSON.stringify(query));
    console.log("[BG] Permission query type: " + typeof query + " isNull:" + (query === null));
    let isGranted = false;
    if (query !== null && typeof query === "object" && typeof query.length !== "undefined") {
      const len = query.length;
      console.log("[BG] Permission array len: " + len + (len > 0 ? " code:" + query[0] : ""));
      isGranted = len > 0 && query[0] === 0;
      if (len === 0) {
        console.log("[BG] Permission undetermined. Calling requestPermission...");
      }
    } else if (query !== null && typeof query === "object") {
      isGranted = query.code === 0 && query.granted === true;
      console.log("[BG] Permission object granted=" + isGranted);
    } else {
      console.log("[BG] Permission unknown format, assuming granted");
      return true;
    }
    if (isGranted) {
      console.log("[BG] Permission already granted");
      return true;
    }
    console.log("[BG] typeof requestPermission: " + typeof requestPermission);
    if (typeof requestPermission !== "function") {
      console.log("[BG] requestPermission unavailable. Assuming granted.");
      return true;
    }
    console.log("[BG] Requesting bg_service permission...");
    const req = requestPermission({
      code: "device:os.bg_service"
    });
    console.log("[BG] requestPermission result: " + JSON.stringify(req));
    let reqGranted = false;
    if (req !== null && typeof req === "object" && typeof req.length !== "undefined") {
      reqGranted = req.length > 0 && req[0] === 0;
    } else if (req !== null && typeof req === "object") {
      reqGranted = req.granted === true;
    }
    if (reqGranted) {
      console.log("[BG] Permission granted after request");
      return true;
    }
    console.log("[BG] Permission DENIED by user");
    return false;
  } catch (e) {
    console.log("[BG] Permission check EXCEPTION: " + (e && e.message ? e.message : String(e)));
    return true;
  }
}

function cancelPendingAlarm() {
  try {
    const pendingAlarmId = localStorage.getItem("zightscout_pending_alarm");
    if (pendingAlarmId) {
      const id = parseInt(pendingAlarmId, 10);
      if (typeof alarm.unset === "function") {
        alarm.unset(id);
      } else if (typeof alarm.cancel === "function") {
        alarm.cancel(id);
      }
      localStorage.removeItem("zightscout_pending_alarm");
      console.log("[PAGE] Pending alarm cancelled, id=" + id);
    }
  } catch (e) {
    console.log("[PAGE] Alarm cancel error: " + (e && e.message ? e.message : e));
  }
}

const APP_ID = 1127420;

const layout = getLayout();

const W = layout.W;

const H = layout.H;

const GRAPH_POINTS = 48;

const MIN_Y = 40;

const MAX_Y = 250;

function mapValueToY(val, containerHeight, topOffset) {
  const clamped = Math.max(MIN_Y, Math.min(MAX_Y, val));
  const ratio = (clamped - MIN_Y) / (MAX_Y - MIN_Y);
  const pad = 6;
  const usableH = containerHeight - pad * 2;
  return Math.round(topOffset + pad + usableH * (1 - ratio));
}

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

Page({
  state: {
    layout: layout,
    appSidePort: 0,
    fetchTimer: null,
    refreshInterval: null,
    widgets: {},
    graphDots: [],
    settings: null,
    vibrator: null,
    lastVibratedBG: null,
    lastVibratedLevel: "normal",
    lastVibratedTime: 0,
    lastReadingData: null,
    readingHealthTimer: null,
    fetchInFlight: false
  },
  _bleInitialized: false,
  _bleConnected: false,
  _waitingForServiceStop: false,
  _bleListenerRegistered: false,
  _handshakeTimer: null,
  _handshakeTimeoutValid: false,
  onInit(params) {
    this._animatedToast = new AnimatedToast;
    setDebugContext("page");
    trace("LIFECYCLE_INIT");
    setDebugContext("page");
    trace("LIFECYCLE_INIT");
    console.log("[AUDIT] ZightScout: Universal - Page onInit params: " + (typeof params === "object" ? JSON.stringify(params) : params));
    cancelPendingAlarm();
    if (params) {
      try {
        let paramStr = typeof params === "string" ? params : params.param ? String(params.param) : JSON.stringify(params);
        if (paramStr) {
          const snoozeMatch = /(?:action=snooze|"action":"snooze").*?(?:minutes=(\d+)|"minutes":(\d+))/.exec(paramStr) || /(?:minutes=(\d+)|"minutes":(\d+)).*?(?:action=snooze|"action":"snooze")/.exec(paramStr);
          if (snoozeMatch) {
            const m = Number(snoozeMatch[1] || snoozeMatch[2]);
            if (m === 15 || m === 30 || m === 60) {
              setAlertSnooze(m);
              const snoozeMsg = t("snoozeToast", {
                minutes: m
              });
              if (this._animatedToast) {
                this._animatedToast.show({
                  type: "bell_off",
                  message: snoozeMsg,
                  duration: 2e3,
                  textColor: 16777215
                });
              } else {
                try {
                  showToast({
                    content: snoozeMsg
                  });
                } catch (e) {}
              }
            }
          }
          const pairs = paramStr.split("&");
          let alertVal = null;
          let sgvVal = null;
          let unitVal = null;
          let levelVal = null;
          let alarmWake = false;
          for (let i = 0; i < pairs.length; i++) {
            const parts = pairs[i].split("=");
            if (parts[0] === "alert") alertVal = decodeURIComponent(parts[1] || "");
            if (parts[0] === "sgv") sgvVal = decodeURIComponent(parts[1] || "");
            if (parts[0] === "unit") unitVal = decodeURIComponent(parts[1] || "");
            if (parts[0] === "level") levelVal = decodeURIComponent(parts[1] || "");
            if (parts[0] === "alarm_wake") alarmWake = parts[1] === "true";
          }
          if (alertVal || alarmWake) {
            console.log(`[PAGE] Opened via ${alarmWake ? "ALARM" : "NOTIFICATION"}. SGV=${sgvVal}, Level=${levelVal || alertVal}`);
            this._openedViaAlert = true;
            this._alertContext = {
              sgv: sgvVal,
              unit: unitVal,
              level: levelVal || alertVal,
              alarmWake: alarmWake
            };
          }
        }
      } catch (e) {
        console.log("[PAGE] Param parse error: " + (e && e.message ? e.message : e));
      }
    }
    if (!this._openedViaAlert) {
      try {
        const flagStr = localStorage.getItem("zightscout_open_flag");
        if (flagStr) {
          const flag = JSON.parse(flagStr);
          const age = Date.now() - flag.timestamp;
          if (flag.openRequested && age < 12e4) {
            console.log(`[PAGE] onInit: Recovered alert from open_flag. SGV=${flag.sgv}, Level=${flag.level}`);
            this._openedViaAlert = true;
            this._alertContext = {
              sgv: flag.sgv,
              level: flag.level
            };
          }
          localStorage.removeItem("zightscout_open_flag");
        }
      } catch (flagErr) {}
    }
    this.state.layout = getLayout();
    if (!isDeviceSupported()) {
      console.warn("[AUDIT] Device resolution not supported for medical safety");
      return;
    }
    this.state.settings = loadSettings();
    try {
      this.state.vibrator = new Vibrator;
    } catch (e) {
      console.log("Vibrator init error:", e);
    }
    syncBackground(this.state.settings);
    this.state.fetchInFlight = false;
    this.state.appSidePort = 0;
    if (this.state.readingHealthTimer) clearInterval(this.state.readingHealthTimer);
    this.state.readingHealthTimer = setInterval(() => this.refreshReadingHealth(), 15e3);
    this.refreshReadingHealth();
    setTimeout(() => this._initPageCommunication(), 50);
  },
  _initPageCommunication() {
    if (this._bleInitialized) {
      console.log("[PAGE] BLE already initialized. Skipping duplicate call.");
      return;
    }
    this._bleInitialized = true;
    console.log("[PAGE] Initializing page communication");
    if (!this._openedViaAlert) {
      localStorage.setItem("zightscout_bg_manual_refresh", String(Date.now()));
      if (this._animatedToast) {
        this._animatedToast.show({
          type: "hourglass",
          message: t("refreshToast"),
          duration: 3500
        });
      } else {
        try {
          showToast({
            content: t("refreshToast")
          });
        } catch (e) {}
      }
      try {
        const cachedStr = localStorage.getItem("zightscout_last_data");
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (cached && (cached.currentBG || cached.sgv)) {
            cached._forceNoStrikethrough = true;
            this.state.lastReadingData = cached;
            this.updateUI(cached);
          }
        }
      } catch (e) {
        console.log("[PAGE] Cache read error on manual init: " + (e && e.message ? e.message : e));
      }
      this.updateGlucoseStrikethrough("", false);
      if (this.state.widgets && this.state.widgets.status) {
        try {
          this.state.widgets.status.setProperty(prop.TEXT, t("refreshToast"));
          this.state.widgets.status.setProperty(prop.COLOR, 52326);
        } catch (e) {}
      }
    } else {
      this._showCachedDataWithWarning("Conectando ao celular...");
    }
    this._initCommunicationWithRetry(0);
  },
  onResume() {
    console.log("[PAGE] onResume called");
    cancelPendingAlarm();
    let openedViaAlert = this._openedViaAlert || false;
    try {
      const flagStr = localStorage.getItem("zightscout_open_flag");
      if (flagStr) {
        const flag = JSON.parse(flagStr);
        const age = Date.now() - flag.timestamp;
        if (flag.openRequested && age < 12e4) {
          console.log(`[PAGE] Opened via alert notification flag. SGV=${flag.sgv}, Level=${flag.level}, Age=${Math.floor(age / 1e3)}s`);
          openedViaAlert = true;
          this._openedViaAlert = true;
          this._alertContext = {
            sgv: flag.sgv,
            level: flag.level
          };
        } else {
          console.log(`[PAGE] Stale open flag ignored. Age=${Math.floor(age / 1e3)}s`);
        }
        localStorage.removeItem("zightscout_open_flag");
      }
    } catch (e) {
      console.log("[PAGE] Error reading open flag: " + (e && e.message ? e.message : e));
      try {
        localStorage.removeItem("zightscout_open_flag");
      } catch (err) {}
    }
    this.state.layout = getLayout();
    if (!isDeviceSupported()) return;
    this.state.settings = loadSettings();
    if (!this.state.lastReadingData) {
      try {
        const cachedStr = localStorage.getItem("zightscout_last_data");
        if (cachedStr) {
          this.state.lastReadingData = JSON.parse(cachedStr);
        }
      } catch (e) {}
    }
    if (this.state.lastReadingData) {
      this.updateUI(this.state.lastReadingData);
    }
    try {
      const bgInterval = parseInt(this.state.settings.backgroundInterval, 10) || 0;
      if (bgInterval > 0) {
        const lastExecStr = localStorage.getItem("lastBgExecution");
        if (lastExecStr) {
          const lastExec = parseInt(lastExecStr, 10);
          const gapMs = Date.now() - lastExec;
          const maxAllowed = bgInterval * 6e4 * 1.5;
          if (gapMs > maxAllowed) {
            const gapMinutes = Math.round(gapMs / 1e3);
            console.log(`[BG] Execution gap detected: ${gapMinutes} min since last run`);
            if (this.state.widgets && this.state.widgets.status) {
              this.state.widgets.status.setProperty(prop.TEXT, t("bgInterrupted"));
              this.state.widgets.status.setProperty(prop.COLOR, 16755200);
            }
          }
        }
        try {
          const hb = parseInt(localStorage.getItem("zightscout_service_heartbeat") || "0", 10);
          const ageSec = Math.floor((Date.now() - hb) / 1e3);
          if (hb === 0) {
            console.log("[DIAG] NO HEARTBEAT. Service never started or was killed.");
          } else if (ageSec > bgInterval * 60 * 1.5) {
            console.log(`[DIAG] STALE HEARTBEAT: ${ageSec}s ago (expected ≤${bgInterval * 60}s). Service may be dead.`);
          } else {
            console.log(`[DIAG] HEALTHY: heartbeat ${ageSec}s ago. Service running normally.`);
          }
        } catch (hbErr) {
          console.log("[DIAG] Heartbeat check error: " + (hbErr && hbErr.message ? hbErr.message : hbErr));
        }
      } else {
        console.log("[DIAG] bgInterval=0 (OFF). No heartbeat expected.");
      }
    } catch (e) {
      console.log("ZightScout: onResume check gap error:", e);
    }
    syncBackground(this.state.settings);
    if (this.state.readingHealthTimer) clearInterval(this.state.readingHealthTimer);
    this.state.readingHealthTimer = setInterval(() => this.refreshReadingHealth(), 15e3);
    this.refreshReadingHealth();
    ble.createConnect((index, data, size) => this.handleDataReceived(data, size));
    this.state.fetchInFlight = false;
    if (this.state.appSidePort === 0) {
      const storedPort = Number(localStorage.getItem("zightscout_ble_port"));
      if (storedPort > 0) this.state.appSidePort = storedPort;
    }
    if (!this._bleInitialized) {
      this._initPageCommunication();
      return;
    }
    if (this._bleInitialized && this._bleConnected) {
      console.log("[PAGE] BLE already connected. Refreshing data only.");
      this.fetchData();
    } else if (this._bleInitialized && !this._bleConnected) {
      console.log("[PAGE] BLE initialized but not connected. Reconnecting...");
      this.initCommunication();
    }
    if (this._alertContext) {
      console.log("[PAGE] Highlighting alert context: " + JSON.stringify(this._alertContext));
      if (this.state.widgets && this.state.widgets.status) {
        const prefix = (this._alertContext.level === "critical" ? "🚨 " : "⚠️ ") + t("alertPrefix") + " ";
        const unit = normalizeGlucoseUnit(this._alertContext.unit) || this.state.lastReadingData && this.state.lastReadingData.unit || "mg/dL";
        this.state.widgets.status.setProperty(prop.TEXT, prefix + formatGlucose(this._alertContext.sgv || "", unit) + " " + unit);
      }
    }
  },
  build() {
    console.log("ZightScout: Universal - Page build");
    if (!isDeviceSupported()) {
      this.createUnsupportedUI();
      return;
    }
    this.createUI();
  },
  createUnsupportedUI() {
    const l = this.state.layout || getLayout();
    createWidget(widget.TEXT, {
      x: 0,
      y: Math.floor(l.H * .15),
      w: l.W,
      h: 30,
      text: "ZightScout",
      text_size: Math.max(18, Math.floor(24 * l.scale)),
      color: 3377407,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    });
    createWidget(widget.TEXT, {
      x: Math.floor(l.W * .08),
      y: Math.floor(l.H * .28),
      w: Math.floor(l.W * .84),
      h: 36,
      text: t("unsupportedDeviceTitle"),
      text_size: Math.max(13, Math.floor(16 * l.scale)),
      color: 16724787,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    });
    createWidget(widget.TEXT, {
      x: Math.floor(l.W * .08),
      y: Math.floor(l.H * .4),
      w: Math.floor(l.W * .84),
      h: Math.floor(l.H * .35),
      text: t("unsupportedDeviceBody", {
        w: l.W,
        h: l.H
      }),
      text_size: Math.max(11, Math.floor(13 * l.scale)),
      color: 13421772,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    });
  },
  createUI() {
    const widgets = this.state.widgets;
    const l = this.state.layout || getLayout();
    const headerTitleY = Math.max(10, l.headerY - Math.floor(10 * l.scaleY));
    widgets.title = createWidget(widget.TEXT, {
      x: 0,
      y: headerTitleY,
      w: l.W,
      h: Math.floor(26 * l.scaleY),
      text: t("appName"),
      text_size: l.headerFontSize,
      color: 3377407,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    });
    let versionStr = "3.0.61";
    try {
      if (typeof getPackageInfo === "function") {
        const pkg = getPackageInfo();
        if (pkg && pkg.version) {
          versionStr = typeof pkg.version === "object" ? pkg.version.name || "3.0.61" : String(pkg.version);
        }
      }
    } catch (e) {}
    widgets.author = createWidget(widget.TEXT, {
      x: 0,
      y: headerTitleY + Math.floor(22 * l.scaleY),
      w: l.W,
      h: Math.floor(18 * l.scaleY),
      text: "v" + versionStr + " " + t("byAuthor"),
      text_size: Math.max(10, Math.floor(12 * l.scale)),
      color: 8952234,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    });
    widgets.glucose = createWidget(widget.TEXT, {
      x: 0,
      y: l.glucoseY,
      w: l.W,
      h: l.glucoseH,
      text: "--",
      text_size: l.glucoseFontSize,
      color: 16777215,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    });
    const strikeH = Math.max(3, Math.floor(4 * l.scale));
    widgets.glucoseStrike = createWidget(widget.FILL_RECT, {
      x: -999,
      y: l.glucoseY + Math.floor(l.glucoseH / 2) - Math.floor(strikeH / 2),
      w: 0,
      h: strikeH,
      radius: Math.floor(strikeH / 2),
      color: 16755200
    });
    widgets.arrow = createWidget(widget.IMG, {
      x: l.CX + Math.floor(45 * l.scale),
      y: l.arrowY,
      w: l.arrowSize,
      h: l.arrowSize,
      src: "arrows/flat.png"
    });
    widgets.arrowText = createWidget(widget.TEXT, {
      x: -999,
      y: l.arrowY,
      w: l.arrowSize,
      h: l.arrowSize,
      text: "",
      text_size: Math.max(18, Math.floor(24 * l.scale)),
      color: 8952234,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    });
    widgets.delta = createWidget(widget.TEXT, {
      x: 0,
      y: l.deltaY,
      w: l.W,
      h: Math.floor(32 * l.scaleY),
      text: "",
      text_size: l.deltaFontSize,
      color: 11184810,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    });
    widgets.status = createWidget(widget.TEXT, {
      x: 0,
      y: l.statusY,
      w: l.W,
      h: Math.floor(28 * l.scaleY),
      text: t("starting"),
      text_size: l.statusFontSize,
      color: 8947848,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    });
    widgets.connectionStatus = createWidget(widget.TEXT, {
      x: Math.floor(l.W * .06),
      y: l.connectionY,
      w: Math.floor(l.W * .88),
      h: l.connectionH,
      text: t("initialConnStatus"),
      text_size: l.connectionFontSize,
      color: 16755200,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    });
    try {
      widgets.connectionStatus.addEventListener(event.CLICK_DOWN, () => {
        push({
          url: "page/page2?tab=server"
        });
      });
    } catch (e) {
      console.log("[PAGE] Connection status touch unavailable:", e);
    }
    const snoozeBannerH = l.snoozeBannerH;
    const snoozeBannerY = l.snoozeBannerY;
    widgets.snoozeBanner = createWidget(widget.FILL_RECT, {
      x: Math.floor(l.W * .1),
      y: snoozeBannerY,
      w: Math.floor(l.W * .8),
      h: snoozeBannerH,
      radius: Math.floor(snoozeBannerH / 2),
      color: 0
    });
    widgets.snoozeText = createWidget(widget.TEXT, {
      x: Math.floor(l.W * .12),
      y: snoozeBannerY,
      w: Math.floor(l.W * .76),
      h: snoozeBannerH,
      text: "",
      text_size: Math.max(10, Math.floor(12 * l.scale)),
      color: 16764040,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    });
    try {
      const onSnoozeClick = () => {
        const snoozeUntil = getSnoozeUntil();
        if (snoozeUntil > Date.now()) {
          this.showSnoozeCancelConfirmation();
        } else {
          push({
            url: "page/page2?tab=alerts"
          });
        }
      };
      widgets.snoozeBanner.addEventListener(event.CLICK_DOWN, onSnoozeClick);
      widgets.snoozeText.addEventListener(event.CLICK_DOWN, onSnoozeClick);
    } catch (e) {
      console.log("[PAGE] Snooze banner click listener error:", e);
    }
    const graphY = l.graphBox.y;
    const graphH = l.graphBox.h;
    const graphW = l.graphBox.w;
    const graphX = l.graphBox.x;
    createWidget(widget.FILL_RECT, {
      x: graphX,
      y: graphY,
      w: graphW,
      h: graphH,
      radius: Math.floor(12 * l.scale),
      color: 1119781
    });
    const y180 = mapValueToY(180, graphH, graphY);
    const y70 = mapValueToY(70, graphH, graphY);
    createWidget(widget.FILL_RECT, {
      x: graphX + 8,
      y: y180,
      w: graphW - 16,
      h: 1,
      color: 1714232
    });
    createWidget(widget.FILL_RECT, {
      x: graphX + 8,
      y: y70,
      w: graphW - 16,
      h: 1,
      color: 1714232
    });
    const dots = [];
    const dotSpacing = (graphW - 24) / (GRAPH_POINTS - 1);
    const dotStartX = graphX + 12;
    const dotSize = Math.max(3, Math.floor(4 * l.scale));
    const dotRadius = Math.floor(dotSize / 2);
    for (let i = 0; i < GRAPH_POINTS; i++) {
      const dot = createWidget(widget.FILL_RECT, {
        x: Math.round(dotStartX + i * dotSpacing),
        y: graphY + Math.floor(graphH / 2),
        w: dotSize,
        h: dotSize,
        radius: dotRadius,
        color: 2241365
      });
      dots.push(dot);
    }
    this.state.graphDots = dots;
    widgets.lastUpdate = createWidget(widget.TEXT, {
      x: 0,
      y: l.lastUpdateY,
      w: l.W,
      h: Math.floor(22 * l.scaleY),
      text: "",
      text_size: Math.max(12, Math.floor(14 * l.scale)),
      color: 6710886,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    });
    createWidget(widget.BUTTON, {
      x: l.CX - l.btnW - Math.floor(l.btnGap / 2),
      y: l.btnBottomY,
      w: l.btnW,
      h: l.btnH,
      radius: l.btnRadius,
      normal_color: 1720448,
      press_color: 2254506,
      text: t("refreshBtn"),
      text_size: l.btnFontSize,
      color: 13426175,
      click_func: () => {
        const now = Date.now();
        if (this._lastManualRefresh && now - this._lastManualRefresh < 4e3) {
          console.log("[PAGE] Button Refresh ignored: debounce < 4s");
          return;
        }
        this._lastManualRefresh = now;
        if (this._animatedToast) {
          this._animatedToast.show({
            type: "hourglass",
            message: t("refreshToast"),
            duration: 4e3
          });
        } else {
          try {
            showToast({
              content: t("refreshToast")
            });
          } catch (e) {}
        }
        console.log("[PAGE] Button Refresh: restarting foreground BLE flow.");
        this._bleConnected = false;
        this.state.appSidePort = 0;
        this.state.fetchInFlight = false;
        this._bleListenerRegistered = false;
        localStorage.setItem("zightscout_bg_manual_refresh", String(now));
        localStorage.setItem("zightscout_ble_connecting", "true");
        localStorage.setItem("zightscout_http_validating", "true");
        this.refreshConnectionStatus();
        this.refreshReadingHealth();
        this._initCommunicationWithRetry(0);
      }
    });
    createWidget(widget.BUTTON, {
      x: l.CX + Math.floor(l.btnGap / 2),
      y: l.btnBottomY,
      w: l.btnW,
      h: l.btnH,
      radius: l.btnRadius,
      normal_color: 1713466,
      press_color: 2766154,
      text: t("settingsBtn"),
      text_size: l.btnFontSize,
      color: 8961006,
      click_func: () => {
        push({
          url: "page/page2"
        });
      }
    });
    try {
      const cachedStr = localStorage.getItem("zightscout_last_data");
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached && (cached.currentBG || cached.sgv)) {
          this.state.lastReadingData = cached;
          this.updateUI(cached);
        }
      }
    } catch (e) {}
    this.refreshReadingHealth();
  },
  initCommunication() {
    this._initCommunicationWithRetry(0);
  },
  _initCommunicationWithRetry(attempt) {
    const MAX_RETRIES = 1;
    const HANDSHAKE_TIMEOUT_MS = 4e3;
    const currentAttempt = attempt || 0;
    console.log("[PAGE] BLE init attempt " + (currentAttempt + 1) + "/" + (MAX_RETRIES + 1));
    this._handshakeTimeoutValid = true;
    try {
      if (!this._bleListenerRegistered) {
        this._bleListenerRegistered = true;
        console.log("[AUDIT] ZightScout: Active 2 BLE registering connection");
        ble.createConnect((index, data, size) => {
          this.handleDataReceived(data, size);
        });
      }
      setTimeout(() => {
        const sent = this.sendShake();
        if (!sent && currentAttempt >= MAX_RETRIES) {
          this._handleBleFailure();
        }
      }, 200);
      if (this.state.readingHealthTimer) {
        clearInterval(this.state.readingHealthTimer);
        this.state.readingHealthTimer = null;
      }
      if (this.state.refreshInterval) {
        clearInterval(this.state.refreshInterval);
        this.state.refreshInterval = null;
      }
      this.state.refreshInterval = setInterval(() => {
        if (loadSettings().backgroundInterval > 0) return;
        this.fetchData();
      }, 3e4);
    } catch (e) {
      console.log("[AUDIT] ZightScout: BLE createConnect error:", e && e.message ? e.message : e);
      this._handleBleFailure();
    }
    if (this._handshakeTimer) {
      clearTimeout(this._handshakeTimer);
      this._handshakeTimer = null;
    }
    this._handshakeTimer = setTimeout(() => {
      if (!this._handshakeTimeoutValid) return;
      if (this._bleConnected && this.state.appSidePort !== 0) return;
      console.warn("[PAGE] ⚠️ BLE handshake TIMEOUT after " + HANDSHAKE_TIMEOUT_MS + "ms (attempt " + (currentAttempt + 1) + ")");
      if (!this._bleConnected && currentAttempt < MAX_RETRIES) {
        console.log("[PAGE] Retrying BLE handshake...");
        this._initCommunicationWithRetry(currentAttempt + 1);
      } else if (!this._bleConnected) {
        this._handleBleFailure();
      }
    }, HANDSHAKE_TIMEOUT_MS);
  },
  _handleBleFailure() {
    this._bleConnected = false;
    this.state.appSidePort = 0;
    this.state.fetchInFlight = false;
    localStorage.removeItem("zightscout_ble_connecting");
    localStorage.removeItem("zightscout_http_validating");
    localStorage.setItem("zightscout_ble_last_disconnect", String(Date.now()));
    this.refreshConnectionStatus();
    this.refreshReadingHealth();
    console.log("[PAGE] ❌ BLE handshake FAILED. Stored disconnect.");
    this._showCachedDataWithWarning("Sem conexão com celular");
  },
  _showCachedDataWithWarning(reason) {
    console.log("[PAGE] _showCachedDataWithWarning: " + (reason || ""));
    if (this.state.fetchTimer) {
      clearTimeout(this.state.fetchTimer);
      this.state.fetchTimer = null;
    }
    localStorage.removeItem("zightscout_ble_connecting");
    localStorage.removeItem("zightscout_http_validating");
    this.refreshConnectionStatus();
    const widgets = this.state.widgets;
    let rendered = false;
    try {
      const cachedStr = localStorage.getItem("zightscout_last_data");
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached && (cached.currentBG || cached.sgv)) {
          console.log("[PAGE] Rendering cached data from localStorage: " + (cached.currentBG || cached.sgv));
          this.updateUI(cached);
          rendered = true;
        }
      }
    } catch (e) {
      console.log("[PAGE] Cache read error: " + (e && e.message ? e.message : e));
    }
    if (!rendered && this._alertContext && this._alertContext.sgv) {
      console.log("[PAGE] Rendering alertContext SGV: " + this._alertContext.sgv);
      this.updateUI({
        currentBG: parseInt(this._alertContext.sgv, 10) || this._alertContext.sgv,
        direction: "Flat",
        statusText: this._alertContext.level === "critical" ? t("criticalAlertTitle") : t("warningAlertTitle")
      });
      rendered = true;
    }
    if (!rendered && widgets && widgets.status) {
      try {
        const msg = reason ? reason + " • " + t("tapToRefresh") : t("staleDataPrompt") + " • " + t("tapToRefresh");
        widgets.status.setProperty(prop.TEXT, msg);
        widgets.status.setProperty(prop.COLOR, 16746496);
      } catch (err) {}
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
      const res = ble.send(buf, buf.byteLength);
      console.log("ZightScout: Shake packet sent to scheduler, result:", res);
      return res !== false;
    } catch (e) {
      console.log("ZightScout: Shake packet error:", e && e.message ? e.message : e);
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
      ble.send(buf, buf.byteLength);
      console.log("ZightScout: Message sent to appSidePort =", this.state.appSidePort);
    } catch (e) {
      console.log("ZightScout: Send error:", e && e.message ? e.message : e);
      this.showError(t("bleSendFail"));
    }
  },
  fetchData() {
    if (this.state.fetchInFlight) {
      console.log("[PAGE] Fetch skipped: request already in flight");
      return;
    }
    this.state.fetchInFlight = true;
    console.log("ZightScout: Requesting glucose data...");
    if (this.state.widgets.lastUpdate) {
      try {
        this.state.widgets.lastUpdate.setProperty(prop.TEXT, t("syncing"));
        this.state.widgets.lastUpdate.setProperty(prop.COLOR, 16755200);
      } catch (e) {}
    }
    const widgets = this.state.widgets;
    if (widgets.status && !localStorage.getItem("zightscout_last_data")) {
      try {
        widgets.status.setProperty(prop.TEXT, t("updating"));
        widgets.status.setProperty(prop.COLOR, 16755200);
      } catch (e) {}
    }
    if (this.state.fetchTimer) {
      clearTimeout(this.state.fetchTimer);
      this.state.fetchTimer = null;
    }
    this.state.fetchTimer = setTimeout(() => {
      console.warn("[PAGE] ⚠️ Fetch timeout (12s) without response. Showing cached data.");
      this.state.fetchInFlight = false;
      localStorage.removeItem("zightscout_ble_connecting");
      localStorage.removeItem("zightscout_http_validating");
      this.refreshConnectionStatus();
      this.refreshReadingHealth();
      this._showCachedDataWithWarning("Sem resposta do servidor");
    }, 12e3);
    const cfg = this.state.settings || loadSettings();
    if (!cfg.apiUrl || !cfg.apiUrl.trim()) {
      this.state.fetchInFlight = false;
      this._showCachedDataWithWarning("Abra Ajustes e configure a URL");
      return;
    }
    if (this.state.appSidePort === 0) {
      const storedPort = Number(localStorage.getItem("zightscout_ble_port"));
      if (storedPort > 0) this.state.appSidePort = storedPort;
    }
    if (this.state.appSidePort === 0) {
      this.sendShake();
      setTimeout(() => {
        this.sendDataMessage({
          type: "FETCH_DATA",
          apiUrl: cfg.apiUrl
        });
      }, 600);
    } else {
      this.sendDataMessage({
        type: "FETCH_DATA",
        apiUrl: cfg.apiUrl
      });
    }
  },
  handleDataReceived(data, size) {
    try {
      if (!data) return;
      const len = size && size > 0 ? size : data.byteLength || 0;
      const u8 = new Uint8Array(data.buffer || data, data.byteOffset || 0, len);
      if (u8.length === 0) return;
      if (u8.length >= 16 && u8[0] === 1 && u8[1] === 1) {
        const dv = new DataView(u8.buffer, u8.byteOffset, u8.length);
        const pType = dv.getUint16(2, true);
        const pPort2 = dv.getUint16(6, true);
        if (pType === 1) {
          this.state.appSidePort = pPort2;
          localStorage.setItem("zightscout_ble_port", String(this.state.appSidePort));
          localStorage.setItem("zightscout_ble_last_contact", String(Date.now()));
          localStorage.removeItem("zightscout_ble_connecting");
          localStorage.removeItem("zightscout_ble_last_disconnect");
          this._bleConnected = true;
          this.refreshConnectionStatus();
          this._handshakeTimeoutValid = false;
          if (this._handshakeTimer) {
            clearTimeout(this._handshakeTimer);
            this._handshakeTimer = null;
          }
          console.log("[PAGE] ✅ BLE handshake established, appSidePort =", this.state.appSidePort);
          this.fetchData();
          return;
        } else if (pType === 2) {
          console.log("ZightScout: Session reset notice from schedule");
          this.state.appSidePort = 0;
          localStorage.setItem("zightscout_ble_last_disconnect", String(Date.now()));
          localStorage.removeItem("zightscout_ble_connecting");
          this._bleConnected = false;
          this.refreshConnectionStatus();
          setTimeout(() => {
            this.sendShake();
          }, 3e4);
          return;
        }
      }
      const offset = u8.length >= 16 && u8[0] === 1 && u8[1] === 1 ? 16 : 0;
      const payloadU8 = u8.subarray(offset);
      const jsonStr = buf2str(payloadU8);
      if (!jsonStr || jsonStr.indexOf("{") === -1) return;
      const parsed = JSON.parse(jsonStr);
      if (parsed && parsed.data) {
        if (this.state.fetchTimer) {
          clearTimeout(this.state.fetchTimer);
          this.state.fetchTimer = null;
        }
        this.state.fetchInFlight = false;
        if (parsed.data.error) {
          localStorage.removeItem("zightscout_ble_connecting");
          localStorage.removeItem("zightscout_http_validating");
          this.refreshConnectionStatus();
          this.refreshReadingHealth();
          this.showError(parsed.data.code ? t(parsed.data.code) : parsed.data.message || t("nightscoutError"));
        } else if (!parsed.data.verification && !parsed.data.tokenValidation && !parsed.data.secret) {
          const receivedAt = Date.now();
          const reading = {
            ...parsed.data,
            receivedAt: receivedAt
          };
          this.state.lastReadingData = reading;
          try {
            localStorage.setItem("zightscout_last_data", JSON.stringify(reading));
            localStorage.setItem("zightscout_last_fetch_at", String(receivedAt));
            localStorage.removeItem("zightscout_last_fetch_error");
            localStorage.removeItem("zightscout_ble_connecting");
            localStorage.removeItem("zightscout_http_validating");
            localStorage.removeItem("zightscout_ble_last_disconnect");
            recordFetchSuccess(receivedAt);
          } catch (e) {}
          this.updateUI(reading);
          this.refreshReadingHealth();
          if (loadSettings().backgroundInterval > 0) {
            try {
              processBackgroundReading(reading);
            } catch (e) {}
          } else {
            this.checkVibrationAlerts(reading);
          }
        }
      }
    } catch (e) {
      console.log("ZightScout: Parse error:", e && e.message ? e.message : e);
      this.showError(t("dataParseError"));
    }
  },
  updateGlucoseStrikethrough(bgVal, isDelayed, color) {
    const widgets = this.state.widgets;
    if (!widgets || !widgets.glucoseStrike) return;
    const l = this.state.layout || getLayout();
    if (isDelayed && bgVal && bgVal !== "--") {
      const charCount = String(bgVal).length;
      const fontSize = l.glucoseFontSize || 70;
      let textW = 0;
      for (let i = 0; i < charCount; i++) {
        const ch = String(bgVal)[i];
        textW += ch === "." || ch === "," ? Math.floor(fontSize * .28) : Math.floor(fontSize * .54);
      }
      textW += Math.floor(6 * l.scale);
      const strikeX = l.CX - Math.floor(textW / 2);
      const strikeH = Math.max(3, Math.floor(4 * l.scale));
      const strikeY = l.glucoseY + Math.floor(l.glucoseH / 2) - Math.floor(strikeH / 2);
      try {
        widgets.glucoseStrike.setProperty(prop.X, strikeX);
        widgets.glucoseStrike.setProperty(prop.Y, strikeY);
        widgets.glucoseStrike.setProperty(prop.W, textW);
        widgets.glucoseStrike.setProperty(prop.H, strikeH);
        widgets.glucoseStrike.setProperty(prop.COLOR, color || 16755200);
      } catch (e) {}
    } else {
      try {
        widgets.glucoseStrike.setProperty(prop.W, 0);
        widgets.glucoseStrike.setProperty(prop.X, -999);
      } catch (e) {}
    }
  },
  updateUI(data) {
    if (!data) return;
    if (this._animatedToast && !data._forceNoStrikethrough) {
      this._animatedToast.hide();
    }
    const widgets = this.state.widgets;
    const cfg = this.state.settings || loadSettings();
    const displayUnit = normalizeGlucoseUnit(data.unit) || cfg.unit || "mg/dL";
    const bgColor = getBGColor(data.currentBG, cfg);
    const ARROW_FILES = {
      DoubleUp: "arrows/up_up.png",
      DOUBLE_UP: "arrows/up_up.png",
      DOUBLEUP: "arrows/up_up.png",
      TripleUp: "arrows/up_up.png",
      SingleUp: "arrows/up.png",
      SINGLE_UP: "arrows/up.png",
      FortyFiveUp: "arrows/forty_five_up.png",
      FORTY_FIVE_UP: "arrows/forty_five_up.png",
      Flat: "arrows/flat.png",
      FLAT: "arrows/flat.png",
      FortyFiveDown: "arrows/forty_five_down.png",
      FORTY_FIVE_DOWN: "arrows/forty_five_down.png",
      SingleDown: "arrows/down.png",
      SINGLE_DOWN: "arrows/down.png",
      DoubleDown: "arrows/down_down.png",
      DOUBLE_DOWN: "arrows/down_down.png",
      DOUBLEDOWN: "arrows/down_down.png",
      TripleDown: "arrows/down_down.png"
    };
    const dirKey = data.direction ? String(data.direction).trim() : "";
    const arrowSrc = ARROW_FILES[dirKey] || ARROW_FILES[dirKey.toUpperCase()] || data.trend && ARROW_FILES[data.trend] || "arrows/flat.png";
    const bgVal = data.currentBG && data.currentBG !== "--" ? formatGlucose(data.currentBG, displayUnit) : "--";
    const ts = Number(data.readingTimestamp || 0);
    const readingAgeMin = ts > 0 ? Math.floor((Date.now() - ts) / 6e4) : 0;
    const isDelayed = data._forceNoStrikethrough ? false : readingAgeMin > 10 || data.currentBG === "--";
    if (widgets.glucose) {
      try {
        widgets.glucose.setProperty(prop.TEXT, bgVal);
        widgets.glucose.setProperty(prop.COLOR, isDelayed ? 8952234 : bgColor);
      } catch (e) {}
    }
    this.updateGlucoseStrikethrough(bgVal, isDelayed, isDelayed ? 16755200 : bgColor);
    const l = this.state.layout || getLayout();
    const offset = bgVal.length >= 3 ? Math.floor(75 * l.scale) : bgVal.length === 2 ? Math.floor(54 * l.scale) : Math.floor(35 * l.scale);
    if (isDelayed) {
      if (widgets.arrow) {
        try {
          widgets.arrow.setProperty(prop.X, -999);
        } catch (e) {}
      }
      if (widgets.arrowText) {
        try {
          widgets.arrowText.setProperty(prop.X, l.CX + offset);
          widgets.arrowText.setProperty(prop.TEXT, "- -");
          widgets.arrowText.setProperty(prop.COLOR, 8952234);
        } catch (e) {}
      }
    } else {
      if (widgets.arrowText) {
        try {
          widgets.arrowText.setProperty(prop.X, -999);
          widgets.arrowText.setProperty(prop.TEXT, "");
        } catch (e) {}
      }
      if (widgets.arrow) {
        try {
          widgets.arrow.setProperty(prop.X, l.CX + offset);
          widgets.arrow.setProperty(prop.SRC, arrowSrc);
        } catch (e) {}
      }
    }
    if (widgets.delta) {
      try {
        let deltaPart = "";
        const rawDelta = data.deltaValue !== undefined && data.deltaValue !== null ? data.deltaValue : data.delta;
        if (rawDelta !== undefined && rawDelta !== null && rawDelta !== "--") {
          deltaPart = formatDelta(rawDelta, displayUnit);
        }
        const agePart = data.readingTimestamp ? formatReadingAge(data.readingTimestamp) : data.lastUpdate || "";
        let fullDeltaText = "";
        if (deltaPart && deltaPart !== "--" && agePart) {
          fullDeltaText = deltaPart + "  •  " + agePart;
        } else {
          fullDeltaText = (deltaPart !== "--" ? deltaPart : "") || agePart;
        }
        widgets.delta.setProperty(prop.TEXT, fullDeltaText);
      } catch (e) {}
    }
    if (widgets.status) {
      try {
        const statusText = getBGStatus(data.currentBG, cfg);
        const statusSnooze = getSnoozeUntil();
        const statusRemain = statusSnooze ? Math.max(1, Math.ceil((statusSnooze - Date.now()) / 6e4)) : 0;
        widgets.status.setProperty(prop.TEXT, statusText + (statusRemain ? t("snoozeActiveStatus") + statusRemain + t("minRemaining") : ""));
        widgets.status.setProperty(prop.COLOR, bgColor);
      } catch (e) {}
    }
    const dots = this.state.graphDots;
    const historyList = data.dataPoints && data.dataPoints.length > 0 ? data.dataPoints : data.history || [];
    if (historyList && Array.isArray(historyList) && dots && dots.length > 0) {
      const l = this.state.layout || getLayout();
      const graphY = l.graphBox.y;
      const graphH = l.graphBox.h;
      const listLen = historyList.length;
      if (listLen >= GRAPH_POINTS) {
        for (let i = 0; i < GRAPH_POINTS; i++) {
          const sampleIdx = Math.floor(i * (listLen - 1) / (GRAPH_POINTS - 1));
          const entry = historyList[sampleIdx];
          const val = typeof entry === "number" ? entry : entry && entry.sgv ? entry.sgv : 0;
          if (val > 0) {
            const dotY = mapValueToY(val, graphH, graphY);
            const dotColor = getBGColor(val, cfg);
            try {
              dots[i].setProperty(prop.Y, dotY);
              dots[i].setProperty(prop.COLOR, dotColor);
            } catch (e) {}
          }
        }
      } else {
        const offset = GRAPH_POINTS - listLen;
        for (let i = 0; i < GRAPH_POINTS; i++) {
          if (i < offset) {
            try {
              dots[i].setProperty(prop.COLOR, 1119781);
            } catch (e) {}
            continue;
          }
          const entry = historyList[i - offset];
          const val = typeof entry === "number" ? entry : entry && entry.sgv ? entry.sgv : 0;
          if (val > 0) {
            const dotY = mapValueToY(val, graphH, graphY);
            const dotColor = getBGColor(val, cfg);
            try {
              dots[i].setProperty(prop.Y, dotY);
              dots[i].setProperty(prop.COLOR, dotColor);
            } catch (e) {}
          }
        }
      }
    }
    const snoozeUntil = getSnoozeUntil();
    const snoozeSeconds = snoozeUntil ? Math.max(1, Math.ceil((snoozeUntil - Date.now()) / 1e3)) : 0;
    if (widgets.snoozeBanner && widgets.snoozeText) {
      try {
        widgets.snoozeBanner.setProperty(prop.COLOR, snoozeSeconds ? 5648927 : 0);
        widgets.snoozeText.setProperty(prop.TEXT, snoozeSeconds ? t("snoozeActiveBanner") + Math.floor(snoozeSeconds / 60) + ":" + String(snoozeSeconds % 60).padStart(2, "0") : t("snoozeDisabledBanner"));
      } catch (e) {}
    }
    if (widgets.lastUpdate) {
      try {
        const fetchAt = Number(data.receivedAt) || Number(localStorage.getItem("zightscout_last_fetch_at")) || Date.now();
        this.state.lastFetchAt = fetchAt;
        localStorage.setItem("zightscout_last_fetch_at", String(fetchAt));
        const fetchDate = new Date(fetchAt);
        const hh = String(fetchDate.getHours()).padStart(2, "0");
        const mm = String(fetchDate.getMinutes()).padStart(2, "0");
        const ss = String(fetchDate.getSeconds()).padStart(2, "0");
        widgets.lastUpdate.setProperty(prop.TEXT, t("lastUpdatePrefix") + hh + ":" + mm + ":" + ss);
      } catch (e) {}
    }
  },
  refreshConnectionStatus() {
    const widgets = this.state.widgets || {};
    if (!widgets.connectionStatus) return;
    try {
      const status = getConnectionStatus(this.state.settings || loadSettings());
      this.state.connectionStatus = status;
      widgets.connectionStatus.setProperty(prop.TEXT, status.text);
      widgets.connectionStatus.setProperty(prop.COLOR, status.color);
    } catch (e) {
      console.log("[PAGE] Connection status update error:", e);
    }
  },
  refreshReadingHealth() {
    const widgets = this.state.widgets || {};
    this.refreshConnectionStatus();
    const connection = this.state.connectionStatus || getConnectionStatus(this.state.settings || loadSettings());
    const readingState = connection.reading;
    let reading = this.state.lastReadingData;
    if (!reading) {
      try {
        reading = JSON.parse(localStorage.getItem("zightscout_last_data") || "null");
      } catch (e) {}
    }
    const snoozeUntil = getSnoozeUntil();
    const snoozeSeconds = snoozeUntil ? Math.max(1, Math.ceil((snoozeUntil - Date.now()) / 1e3)) : 0;
    if (widgets.snoozeBanner && widgets.snoozeText) {
      try {
        widgets.snoozeBanner.setProperty(prop.COLOR, snoozeSeconds ? 5648927 : 0);
        widgets.snoozeText.setProperty(prop.TEXT, snoozeSeconds ? t("snoozeActiveBanner") + Math.floor(snoozeSeconds / 60) + ":" + String(snoozeSeconds % 60).padStart(2, "0") : t("snoozeDisabledBanner"));
      } catch (e) {}
    }
    if (widgets.lastUpdate) {
      try {
        const fetchAt = Number(this.state.lastFetchAt || reading && reading.receivedAt || localStorage.getItem("zightscout_last_fetch_at"));
        if (fetchAt > 0) {
          const fetchDate = new Date(fetchAt);
          const hh = String(fetchDate.getHours()).padStart(2, "0");
          const mm = String(fetchDate.getMinutes()).padStart(2, "0");
          const ss = String(fetchDate.getSeconds()).padStart(2, "0");
          widgets.lastUpdate.setProperty(prop.TEXT, t("lastUpdatePrefix") + hh + ":" + mm + ":" + ss);
        } else {
          widgets.lastUpdate.setProperty(prop.TEXT, t("waitingUpdate"));
        }
        widgets.lastUpdate.setProperty(prop.COLOR, readingState ? readingState.color : 6710886);
      } catch (e) {}
    }
    if (widgets.status) {
      try {
        const statusRemain = snoozeUntil ? Math.max(1, Math.ceil((snoozeUntil - Date.now()) / 6e4)) : 0;
        if (readingState && (readingState.label === t("readingDelayedLabel") || readingState.label === t("readingExpiredLabel"))) {
          widgets.status.setProperty(prop.TEXT, readingState.label + " • " + readingState.detail + (statusRemain ? t("snoozeActiveStatus") + statusRemain + t("minRemaining") : ""));
          widgets.status.setProperty(prop.COLOR, readingState.color);
        } else if (reading && reading.currentBG !== undefined) {
          widgets.status.setProperty(prop.TEXT, getBGStatus(reading.currentBG, this.state.settings || loadSettings()) + (statusRemain ? t("snoozeActiveStatus") + statusRemain + t("minRemaining") : ""));
          widgets.status.setProperty(prop.COLOR, getBGColor(reading.currentBG, this.state.settings || loadSettings()));
        }
      } catch (e) {}
    }
    if (reading && reading.currentBG !== undefined) {
      try {
        const ts = Number(reading.readingTimestamp || 0);
        const readingAgeMin = ts > 0 ? Math.floor((Date.now() - ts) / 6e4) : 0;
        const isDelayed = reading._forceNoStrikethrough ? false : reading.currentBG === "--" || readingAgeMin > 10 || readingState && (readingState.label === t("readingDelayedLabel") || readingState.label === t("readingExpiredLabel"));
        const cfg = this.state.settings || loadSettings();
        const displayUnit = normalizeGlucoseUnit(reading.unit) || cfg.unit || "mg/dL";
        const bgVal = reading.currentBG && reading.currentBG !== "--" ? formatGlucose(reading.currentBG, displayUnit) : "--";
        const bgColor = getBGColor(reading.currentBG, cfg);
        if (widgets.glucose) {
          widgets.glucose.setProperty(prop.COLOR, isDelayed ? 8952234 : bgColor);
        }
        this.updateGlucoseStrikethrough(bgVal, isDelayed, isDelayed ? 16755200 : bgColor);
        const l = this.state.layout || getLayout();
        const offset = bgVal.length >= 3 ? Math.floor(75 * l.scale) : bgVal.length === 2 ? Math.floor(54 * l.scale) : Math.floor(35 * l.scale);
        if (isDelayed) {
          if (widgets.arrow) {
            try {
              widgets.arrow.setProperty(prop.X, -999);
            } catch (e) {}
          }
          if (widgets.arrowText) {
            try {
              widgets.arrowText.setProperty(prop.X, l.CX + offset);
              widgets.arrowText.setProperty(prop.TEXT, "- -");
              widgets.arrowText.setProperty(prop.COLOR, 8952234);
            } catch (e) {}
          }
        } else {
          if (widgets.arrowText) {
            try {
              widgets.arrowText.setProperty(prop.X, -999);
              widgets.arrowText.setProperty(prop.TEXT, "");
            } catch (e) {}
          }
          if (widgets.arrow) {
            try {
              widgets.arrow.setProperty(prop.X, l.CX + offset);
            } catch (e) {}
          }
        }
      } catch (e) {}
    }
  },
  checkVibrationAlerts(data) {
    if (loadSettings().backgroundInterval > 0 || getSnoozeUntil()) return;
    if (!data || !data.currentBG) return;
    const numBG = parseInt(data.currentBG, 10);
    if (isNaN(numBG)) return;
    const cfg = this.state.settings || loadSettings();
    const now = Date.now();
    const level = evaluateGlucoseLevel(numBG, cfg);
    const isRed = level === "critical";
    const isYellow = level === "warning";
    const transitioned = level !== this.state.lastVibratedLevel;
    this.state.lastVibratedLevel = level;
    if (!transitioned) return;
    if (isRed && cfg.criticalVibration) {
      console.log("ZightScout: Critical RED alert triggered -> strong vibration");
      triggerVibration("critical", this.state.vibrator);
      this.state.lastVibratedBG = data.currentBG;
      this.state.lastVibratedTime = now;
    } else if (isYellow && cfg.outOfRangeVibration) {
      console.log("ZightScout: Out of target YELLOW alert triggered -> notification vibration");
      triggerVibration("warning", this.state.vibrator);
      this.state.lastVibratedBG = data.currentBG;
      this.state.lastVibratedTime = now;
    }
  },
  showError(msg) {
    if (this._animatedToast) {
      this._animatedToast.hide();
    }
    try {
      localStorage.setItem("zightscout_last_fetch_error", JSON.stringify({
        timestamp: Date.now(),
        message: String(msg || t("genericError"))
      }));
    } catch (e) {}
    localStorage.removeItem("zightscout_ble_connecting");
    localStorage.removeItem("zightscout_http_validating");
    if (!this.state.lastReadingData) {
      try {
        const cachedStr = localStorage.getItem("zightscout_last_data");
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (cached && (cached.currentBG || cached.sgv)) {
            this.state.lastReadingData = cached;
            this.updateUI(cached);
          }
        }
      } catch (e) {}
    }
    this.refreshConnectionStatus();
    const widgets = this.state.widgets;
    if (widgets.status) {
      try {
        widgets.status.setProperty(prop.TEXT, msg || "Erro");
        widgets.status.setProperty(prop.COLOR, 16729156);
      } catch (e) {}
    }
  },
  showSnoozeCancelConfirmation() {
    this.hideSnoozeCancelConfirmation();
    const l = this.state.layout || getLayout();
    const modalW = Math.floor(l.W * .86);
    const modalH = Math.floor(130 * l.scaleY);
    const modalX = Math.floor((l.W - modalW) / 2);
    const modalY = Math.floor((l.H - modalH) / 2);
    this._snoozeModalWidgets = [];
    const modalBg = createWidget(widget.FILL_RECT, {
      x: modalX,
      y: modalY,
      w: modalW,
      h: modalH,
      radius: 16,
      color: 1712688
    });
    this._snoozeModalWidgets.push(modalBg);
    const modalTitle = createWidget(widget.TEXT, {
      x: modalX,
      y: modalY + Math.floor(14 * l.scaleY),
      w: modalW,
      h: Math.floor(28 * l.scaleY),
      text: t("cancelSnoozeConfirm"),
      text_size: Math.max(13, Math.floor(16 * l.scale)),
      color: 16777215,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    });
    this._snoozeModalWidgets.push(modalTitle);
    const btnW = Math.floor((modalW - Math.floor(36 * l.scaleX)) / 2);
    const btnH = Math.max(30, Math.floor(36 * l.scaleY));
    const btnY = modalY + modalH - btnH - Math.floor(16 * l.scaleY);
    const btnGap = Math.floor(12 * l.scaleX);
    const btnStartX = modalX + Math.floor((modalW - (btnW * 2 + btnGap)) / 2);
    const btnNo = createWidget(widget.BUTTON, {
      x: btnStartX,
      y: btnY,
      w: btnW,
      h: btnH,
      radius: Math.floor(btnH / 2),
      normal_color: 3359829,
      press_color: 4478310,
      text: t("btnNo"),
      text_size: Math.max(12, Math.floor(14 * l.scale)),
      color: 13426158,
      click_func: () => {
        this.hideSnoozeCancelConfirmation();
      }
    });
    this._snoozeModalWidgets.push(btnNo);
    const btnYes = createWidget(widget.BUTTON, {
      x: btnStartX + btnW + btnGap,
      y: btnY,
      w: btnW,
      h: btnH,
      radius: Math.floor(btnH / 2),
      normal_color: 8921634,
      press_color: 11154227,
      text: t("btnYes"),
      text_size: Math.max(12, Math.floor(14 * l.scale)),
      color: 16777215,
      click_func: () => {
        this.hideSnoozeCancelConfirmation();
        try {
          clearAlertSnooze();
          if (this._animatedToast) {
            this._animatedToast.show({
              type: "bell",
              message: t("snoozeCancelledToast"),
              duration: 2e3,
              textColor: 16777215
            });
          } else {
            showToast({
              content: t("snoozeCancelledToast")
            });
          }
        } catch (e) {
          console.log("[PAGE] clearAlertSnooze error:", e);
        }
        this.refreshReadingHealth();
      }
    });
    this._snoozeModalWidgets.push(btnYes);
  },
  hideSnoozeCancelConfirmation() {
    if (this._snoozeModalWidgets && this._snoozeModalWidgets.length) {
      this._snoozeModalWidgets.forEach(w => {
        try {
          deleteWidget(w);
        } catch (e) {}
      });
      this._snoozeModalWidgets = [];
    }
  },
  onDestroy() {
    console.log("[AUDIT] ZightScout: Active 2 - Page onDestroy");
    if (this._animatedToast) {
      this._animatedToast.hide();
      this._animatedToast = null;
    }
    this.hideSnoozeCancelConfirmation();
    if (this._handshakeTimer) {
      clearTimeout(this._handshakeTimer);
      this._handshakeTimer = null;
    }
    this._handshakeTimeoutValid = false;
    if (this.state.readingHealthTimer) {
      clearInterval(this.state.readingHealthTimer);
      this.state.readingHealthTimer = null;
    }
    if (this.state.refreshInterval) {
      clearInterval(this.state.refreshInterval);
      this.state.refreshInterval = null;
    }
    if (this.state.fetchTimer) {
      clearTimeout(this.state.fetchTimer);
      this.state.fetchTimer = null;
    }
    this._bleInitialized = false;
    this._bleConnected = false;
    this._waitingForServiceStop = false;
    this._bleListenerRegistered = false;
    this.state.fetchInFlight = false;
    this.state.appSidePort = 0;
    syncBackground(loadSettings());
  }
});
