import { localStorage } from "./storage";

import { notify } from "@zos/notification";

import { triggerVibration } from "./vibrator";

import { loadSettings, getBGStatus, evaluateGlucoseLevel } from "./settings";

import { scheduleAlertRepeats, cancelAlertRepeats } from "./alert-repeat";

import { t } from "./i18n";

import { formatGlucose, normalizeGlucoseUnit, formatDelta } from "./glucose-unit";

import { set as setAlarm, REPEAT_ONCE } from "@zos/alarm";

import { backgroundLog } from "./background-log";

export const SNOOZE_UNTIL_KEY = "zightscout_alert_snooze_until";

export const PENDING_INDEX_KEY = "zightscout_pending_alert_index";

export const PENDING_PREFIX = "zightscout_pending_alert_";

export const MAX_PENDING_SLOTS = 25;

export const PENDING_ALERT_TTL_MS = 9e5;

export const CRITICAL_ALERT_TTL_MS = 18e5;

export const ALERT_HEARTBEAT_KEY = "zightscout_alert_heartbeat";

export const LAST_EVALUATION_KEY = "zightscout_last_alert_evaluation";

export const LAST_NOTIF_ATTEMPT_KEY = "zightscout_last_notification_attempt";

export const LAST_NOTIF_ACCEPTED_KEY = "zightscout_last_notification_accepted";

export const PENDING_COUNT_KEY = "zightscout_pending_alert_count";

export const RETRY_COUNT_KEY = "zightscout_notification_retry_count";

export const PIPELINE_STATE_KEY = "zightscout_alert_pipeline_state";

export const STATE_STARTING = "STARTING";

export const STATE_RUNNING = "RUNNING";

export const STATE_DEGRADED = "DEGRADED";

export const STATE_RECOVERING = "RECOVERING";

export const STATE_ERROR = "ERROR";

export const RETRY_DELAYS_MS = [ 5e3, 15e3, 3e4, 6e4 ];

export const MAX_RETRY_ATTEMPTS = 5;

function safeJsonParse(str, fallback) {
  if (!str || typeof str !== "string") return fallback;
  try {
    const val = JSON.parse(str);
    return val !== null && typeof val !== "undefined" ? val : fallback;
  } catch (e) {
    return fallback;
  }
}

export function recordAlertHeartbeat() {
  try {
    localStorage.setItem(ALERT_HEARTBEAT_KEY, String(Date.now()));
  } catch (e) {}
}

export function setPipelineState(nextState, reason) {
  try {
    localStorage.setItem(PIPELINE_STATE_KEY, nextState);
    recordAlertHeartbeat();
    backgroundLog("ALERT_PIPELINE_STATE", {
      state: nextState,
      reason: reason || ""
    });
  } catch (e) {}
}

export function getPipelineState() {
  return localStorage.getItem(PIPELINE_STATE_KEY) || STATE_RUNNING;
}

export function getAlertIndex() {
  const raw = localStorage.getItem(PENDING_INDEX_KEY);
  if (!raw) return [];
  let index = safeJsonParse(raw, null);
  if (!Array.isArray(index)) {
    backgroundLog("ALERT_QUEUE_ERROR", {
      reason: "CORRUPTED_INDEX_RESET",
      raw: String(raw)
    });
    index = [];
    try {
      localStorage.setItem(PENDING_INDEX_KEY, JSON.stringify(index));
    } catch (e) {}
  }
  return index;
}

export function saveAlertIndex(index) {
  try {
    localStorage.setItem(PENDING_INDEX_KEY, JSON.stringify(index));
    localStorage.setItem(PENDING_COUNT_KEY, String(index.length));
    recordAlertHeartbeat();
  } catch (e) {
    backgroundLog("ALERT_QUEUE_ERROR", {
      action: "SAVE_INDEX",
      error: String(e)
    });
  }
}

export function pruneExpiredAlerts(now) {
  const currentTime = Number(now) || Date.now();
  const index = getAlertIndex();
  const alive = [];
  for (let i = 0; i < index.length; i++) {
    const item = index[i];
    const itemToken = typeof item === "object" && item ? item.token : item;
    const createdAt = typeof item === "object" && item && item.createdAt ? Number(item.createdAt) : 0;
    const level = typeof item === "object" && item ? item.level : "warning";
    const ttl = level === "critical" ? CRITICAL_ALERT_TTL_MS : PENDING_ALERT_TTL_MS;
    const expiresAt = typeof item === "object" && item && item.expiresAt ? Number(item.expiresAt) : createdAt > 0 ? createdAt + ttl : 0;
    const isExpired = expiresAt > 0 && currentTime >= expiresAt;
    if (isExpired) {
      try {
        localStorage.removeItem(PENDING_PREFIX + itemToken);
        backgroundLog("ALERT_EXPIRED", {
          token: itemToken,
          level: level,
          ageMs: currentTime - (createdAt || expiresAt),
          reason: "TTL_EXPIRED"
        });
      } catch (e) {}
    } else {
      alive.push(item);
    }
  }
  if (alive.length > MAX_PENDING_SLOTS) {
    backgroundLog("ALERT_QUEUE_STORAGE_WARNING", {
      count: alive.length,
      max: MAX_PENDING_SLOTS
    });
    while (alive.length > MAX_PENDING_SLOTS) {
      const nonCriticalIndex = alive.findIndex(it => typeof it === "object" && it && it.level !== "critical");
      if (nonCriticalIndex >= 0) {
        const discarded = alive.splice(nonCriticalIndex, 1)[0];
        const discToken = typeof discarded === "object" && discarded ? discarded.token : discarded;
        try {
          localStorage.removeItem(PENDING_PREFIX + discToken);
        } catch (e) {}
        backgroundLog("ALERT_DISCARDED_CAPACITY", {
          token: discToken,
          reason: "NON_CRITICAL_PRUNED"
        });
      } else {
        backgroundLog("ALERT_QUEUE_CRITICAL_PRESERVED", {
          count: alive.length,
          note: "CRITICAL_ALERTS_RETAINED"
        });
        break;
      }
    }
  }
  saveAlertIndex(alive);
  return alive;
}

function storePendingAlert(token, payload) {
  const now = Date.now();
  const alive = pruneExpiredAlerts(now);
  const alertId = payload.id || String(payload.readingTimestamp || payload.backgroundCycle) + ":" + payload.currentBG + ":" + payload.level;
  const existingIdx = alive.findIndex(it => {
    const itToken = typeof it === "object" && it ? it.token : it;
    if (itToken === token) return true;
    if (typeof it === "object" && it && it.alertId && it.alertId === alertId) return true;
    return false;
  });
  const entry = {
    token: token,
    alertId: alertId,
    level: payload.level || "warning",
    createdAt: existingIdx >= 0 && alive[existingIdx].createdAt ? alive[existingIdx].createdAt : now,
    expiresAt: payload.expiresAt || now + (payload.level === "critical" ? CRITICAL_ALERT_TTL_MS : PENDING_ALERT_TTL_MS),
    updatedAt: now,
    status: payload.status || "QUEUED",
    attempts: payload.attempts || 0
  };
  if (existingIdx >= 0) {
    alive[existingIdx] = entry;
  } else {
    alive.push(entry);
  }
  saveAlertIndex(alive);
  try {
    localStorage.setItem(PENDING_PREFIX + token, JSON.stringify(payload));
    backgroundLog("ALERT_QUEUED", {
      token: token,
      alertId: alertId,
      level: payload.level,
      count: alive.length
    });
  } catch (e) {
    backgroundLog("ALERT_QUEUE_ERROR", {
      action: "STORE_PAYLOAD",
      error: String(e)
    });
  }
}

export function peekPendingAlert(token, storageKey) {
  try {
    const key = storageKey || (token ? PENDING_PREFIX + token : null);
    if (!token || !key || !key.startsWith(PENDING_PREFIX)) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const payload = safeJsonParse(raw, null);
    if (!payload) return null;
    if (payload.token !== token) return null;
    return payload;
  } catch (e) {
    backgroundLog("PENDING_ALERT_PEEK_ERROR", {
      error: String(e)
    });
    return null;
  }
}

export function ackPendingAlert(token, storageKey) {
  try {
    const key = storageKey || (token ? PENDING_PREFIX + token : null);
    if (!token || !key || !key.startsWith(PENDING_PREFIX)) return false;
    localStorage.removeItem(key);
    let index = getAlertIndex();
    index = index.filter(item => {
      const itToken = typeof item === "object" && item ? item.token : item;
      return itToken !== token;
    });
    saveAlertIndex(index);
    backgroundLog("ALERT_COMPLETED", {
      token: token
    });
    return true;
  } catch (e) {
    backgroundLog("ALERT_ACK_ERROR", {
      error: String(e)
    });
    return false;
  }
}

export function consumePendingAlert(token, storageKey) {
  try {
    const payload = peekPendingAlert(token, storageKey);
    if (!payload) return null;
    ackPendingAlert(token, storageKey);
    return payload;
  } catch (e) {
    backgroundLog("PENDING_ALERT_CONSUME_ERROR", {
      error: String(e)
    });
    return null;
  }
}

export function markAlertRetry(token, storageKey, reason) {
  try {
    const payload = peekPendingAlert(token, storageKey);
    if (!payload) return false;
    payload.attempts = (payload.attempts || 0) + 1;
    payload.notificationAttempts = (payload.notificationAttempts || 0) + 1;
    payload.lastError = String(reason || "");
    if (payload.attempts >= MAX_RETRY_ATTEMPTS) {
      backgroundLog("ALERT_EXPIRED", {
        token: token,
        level: payload.level,
        reason: "MAX_RETRIES_EXCEEDED",
        attempts: payload.attempts
      });
      ackPendingAlert(token, storageKey);
      setPipelineState(STATE_RUNNING, "RETRIES_EXHAUSTED");
      return false;
    }
    payload.status = "RETRY_PENDING";
    const retryIndex = Math.min(payload.attempts - 1, RETRY_DELAYS_MS.length - 1);
    const delayMs = RETRY_DELAYS_MS[retryIndex] || 6e4;
    const nextRetryAt = Date.now() + delayMs;
    payload.nextRetryAt = nextRetryAt;
    const key = storageKey || PENDING_PREFIX + token;
    try {
      localStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {}
    let index = getAlertIndex();
    const idx = index.findIndex(it => (typeof it === "object" && it ? it.token : it) === token);
    if (idx >= 0) {
      index[idx].attempts = payload.attempts;
      index[idx].status = "RETRY_PENDING";
      index[idx].nextRetryAt = nextRetryAt;
      saveAlertIndex(index);
    }
    const totalRetries = Number(localStorage.getItem(RETRY_COUNT_KEY) || 0) + 1;
    try {
      localStorage.setItem(RETRY_COUNT_KEY, String(totalRetries));
    } catch (e) {}
    setPipelineState(STATE_DEGRADED, "NOTIFICATION_RETRY_" + payload.attempts);
    const alarmTime = Math.ceil(nextRetryAt / 1e3);
    const alarmId = setAlarm({
      url: "app-service/alert-service",
      time: alarmTime,
      repeat_type: REPEAT_ONCE,
      store: true,
      param: JSON.stringify({
        action: "alert-retry",
        token: token,
        storageKey: key,
        attempt: payload.attempts
      })
    });
    if (alarmId > 0) {
      backgroundLog("NOTIFY_RETRY_SCHEDULED", {
        token: token,
        attempt: payload.attempts,
        delayMs: delayMs,
        alarmId: alarmId
      });
      return true;
    } else {
      backgroundLog("NOTIFY_RETRY_ALARM_FAILED", {
        token: token,
        attempt: payload.attempts
      });
      return false;
    }
  } catch (e) {
    backgroundLog("ALERT_RETRY_SCHEDULE_ERROR", {
      error: String(e)
    });
    return false;
  }
}

export function scheduleInitialAlert(reading) {
  try {
    recordAlertHeartbeat();
    const safeCycle = String(reading.backgroundCycle || "fg").replace(/[^a-zA-Z0-9_]/g, "_");
    const token = String(Date.now()) + "_" + safeCycle;
    const storageKey = PENDING_PREFIX + token;
    const value = Number(reading.currentBG);
    const s = loadSettings();
    const level = evaluateGlucoseLevel(value, s);
    const alertId = String(reading.readingTimestamp || safeCycle) + ":" + value + ":" + level;
    const now = Date.now();
    const ttl = level === "critical" ? CRITICAL_ALERT_TTL_MS : PENDING_ALERT_TTL_MS;
    const payload = {
      id: alertId,
      token: token,
      storageKey: storageKey,
      currentBG: reading.currentBG,
      sgv: reading.sgv,
      readingTimestamp: reading.readingTimestamp,
      trend: reading.trend,
      directionArrow: reading.directionArrow,
      direction: reading.direction,
      delta: reading.delta,
      deltaValue: reading.deltaValue,
      unit: reading.unit,
      backgroundCycle: reading.backgroundCycle,
      receivedAt: reading.receivedAt || now,
      level: level,
      status: "QUEUED",
      attempts: 0,
      notificationAttempts: 0,
      vibrationAttempts: 0,
      notificationAccepted: false,
      nextRetryAt: 0,
      lastError: "",
      createdAt: now,
      expiresAt: now + ttl
    };
    backgroundLog("ALERT_CREATED", {
      token: token,
      alertId: alertId,
      level: level
    });
    storePendingAlert(token, payload);
    const alarmTime = Math.ceil(Date.now() / 1e3) + 1;
    const alarmId = setAlarm({
      url: "app-service/alert-service",
      time: alarmTime,
      repeat_type: REPEAT_ONCE,
      store: true,
      param: JSON.stringify({
        action: "glucose-alert",
        token: token,
        storageKey: storageKey
      })
    });
    if (alarmId > 0) {
      backgroundLog("ALERT_ALARM_SCHEDULED", {
        cycle: reading.backgroundCycle,
        alarmId: alarmId,
        token: token,
        storageKey: storageKey,
        level: level
      });
    } else {
      backgroundLog("ALERT_ALARM_FAILED", {
        cycle: reading.backgroundCycle,
        token: token,
        storageKey: storageKey
      });
      processAlertQueue(token, storageKey);
    }
  } catch (e) {
    backgroundLog("ALERT_SCHEDULE_ERROR", {
      error: String(e)
    });
    try {
      processBackgroundReading(reading);
    } catch (eFallback) {}
  }
}

export function getSnoozeUntil() {
  const until = Number(localStorage.getItem(SNOOZE_UNTIL_KEY));
  if (!(until > Date.now())) {
    if (until) localStorage.removeItem(SNOOZE_UNTIL_KEY);
    return 0;
  }
  return until;
}

export function setAlertSnooze(minutes) {
  const duration = Number(minutes);
  if ([ 15, 30, 60 ].indexOf(duration) === -1) return 0;
  const until = Date.now() + duration * 6e4;
  localStorage.setItem(SNOOZE_UNTIL_KEY, String(until));
  cancelAlertRepeats();
  backgroundLog("SNOOZE_SET", {
    minutes: duration,
    until: until
  });
  return until;
}

export function clearAlertSnooze() {
  localStorage.removeItem(SNOOZE_UNTIL_KEY);
  localStorage.removeItem("zightscout_notified_reading");
  localStorage.removeItem("zightscout_last_alert_time");
  cancelAlertRepeats();
  backgroundLog("SNOOZE_CLEARED");
}

function debugSettings(s) {
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
}

export function processBackgroundReading(data) {
  recordAlertHeartbeat();
  const now = Date.now();
  const s = loadSettings();
  const value = Number(data.currentBG);
  const cycle = data.backgroundCycle || "foreground";
  const expiresAt = Number(data.expiresAt || 0);
  if (expiresAt > 0 && now >= expiresAt) {
    backgroundLog("ALERT_EXPIRED", {
      token: data.token,
      glucose: value,
      reason: "EXPIRED_BEFORE_PROCESSING"
    });
    if (data.token) ackPendingAlert(data.token, data.storageKey);
    return;
  }
  if ((data.attempts || 0) >= MAX_RETRY_ATTEMPTS) {
    backgroundLog("ALERT_EXPIRED", {
      token: data.token,
      glucose: value,
      reason: "RETRIES_EXCEEDED_BEFORE_PROCESSING"
    });
    if (data.token) ackPendingAlert(data.token, data.storageKey);
    return;
  }
  backgroundLog("GLUCOSE_RECEIVED", {
    cycle: cycle,
    glucose: data.currentBG,
    readingTimestamp: data.readingTimestamp,
    settings: debugSettings(s)
  });
  if (!(s.backgroundInterval > 0) || !isFinite(value) || value <= 0) {
    if (!(s.backgroundInterval > 0)) cancelAlertRepeats();
    backgroundLog("ALERT_SKIPPED", {
      cycle: cycle,
      reason: s.backgroundInterval > 0 ? "INVALID_READING" : "OFF"
    });
    if (data.token) ackPendingAlert(data.token, data.storageKey);
    return;
  }
  const readingTime = Number(data.readingTimestamp) || Date.parse(data.readingTimestamp || "") || 0;
  const staleAfterMs = Math.max(10, Number(s.backgroundInterval) * 2) * 6e4;
  if (readingTime && now - readingTime >= staleAfterMs) {
    backgroundLog("STALE_READING", {
      cycle: cycle,
      glucose: value,
      ageMinutes: Math.floor((now - readingTime) / 6e4)
    });
    cancelAlertRepeats(false);
    if (data.token) ackPendingAlert(data.token, data.storageKey);
    return;
  }
  const snoozeUntil = getSnoozeUntil();
  if (snoozeUntil) {
    backgroundLog("ALERT_SKIPPED", {
      cycle: cycle,
      glucose: value,
      reason: "SNOOZED",
      snoozeUntil: snoozeUntil
    });
    if (data.token) ackPendingAlert(data.token, data.storageKey);
    return;
  }
  localStorage.setItem("lastBgExecution", String(now));
  const level = evaluateGlucoseLevel(value, s);
  const enabled = level === "critical" ? s.criticalVibration : level === "warning" && s.outOfRangeVibration;
  try {
    localStorage.setItem(LAST_EVALUATION_KEY, JSON.stringify({
      timestamp: now,
      glucose: value,
      level: level,
      enabled: !!enabled
    }));
  } catch (e) {}
  backgroundLog("ALERT_EVALUATE", {
    cycle: cycle,
    glucose: value,
    level: level,
    enabled: !!enabled,
    readingAgeMinutes: readingTime ? Math.floor((now - readingTime) / 6e4) : -1,
    settings: debugSettings(s)
  });
  if (level !== "critical" || !enabled) cancelAlertRepeats(false);
  if (!enabled) {
    backgroundLog("ALERT_SKIPPED", {
      cycle: cycle,
      glucose: value,
      level: level,
      reason: level === "normal" ? "IN_TARGET" : "VIBRATION_DISABLED"
    });
    if (data.token) ackPendingAlert(data.token, data.storageKey);
    return;
  }
  const lastNotifiedAt = Number(localStorage.getItem("zightscout_last_alert_time") || 0);
  const key = String(data.readingTimestamp || cycle) + ":" + value + ":" + level;
  const sameReading = localStorage.getItem("zightscout_notified_reading") === key;
  const minRepeatMs = Math.max(3, (Number(s.backgroundInterval) || 5) - 1.5) * 6e4;
  if (sameReading && now - lastNotifiedAt < minRepeatMs) {
    backgroundLog("ALERT_SKIPPED", {
      cycle: cycle,
      reason: "READING_ALREADY_NOTIFIED",
      elapsedMs: now - lastNotifiedAt
    });
    if (data.token) ackPendingAlert(data.token, data.storageKey);
    return;
  }
  backgroundLog("ALERT_MATCH", {
    cycle: cycle,
    glucose: value,
    level: level
  });
  try {
    backgroundLog("VIBRATION_ATTEMPT", {
      cycle: cycle,
      level: level
    });
    const vibrated = triggerVibration(level);
    backgroundLog(vibrated ? "VIBRATION_ACCEPTED" : "VIBRATION_SKIPPED", {
      cycle: cycle,
      level: level
    });
  } catch (ve) {
    backgroundLog("VIBRATION_ERROR", {
      cycle: cycle,
      level: level,
      error: String(ve)
    });
  }
  const trend = data.trend || data.directionArrow || "";
  const unit = normalizeGlucoseUnit(data.unit) || s.unit || "mg/dL";
  const delta = data.delta && data.delta !== "--" ? " " + formatDelta(data.delta, unit) : "";
  const detail = (trend ? " " + trend : "") + delta;
  let id = 0;
  try {
    try {
      localStorage.setItem(LAST_NOTIF_ATTEMPT_KEY, String(now));
    } catch (e) {}
    backgroundLog("NOTIFY_ATTEMPT", {
      cycle: cycle,
      level: level,
      glucose: value,
      attempt: data.attempts || 0
    });
    const options = {
      title: level === "critical" ? t("criticalAlertTitle") : t("warningAlertTitle"),
      content: formatGlucose(value, unit) + " " + unit + detail + " - " + getBGStatus(value, s),
      vibrate: level === "critical" ? 5 : 4,
      actions: [ {
        text: t("minXAction", {
          n: 15
        }),
        file: "page/index",
        param: "action=snooze&minutes=15"
      }, {
        text: t("minXAction", {
          n: 30
        }),
        file: "page/index",
        param: "action=snooze&minutes=30"
      }, {
        text: t("minXAction", {
          n: 60
        }),
        file: "page/index",
        param: "action=snooze&minutes=60"
      }, {
        text: t("openNotification"),
        file: "page/index",
        param: "alert=" + level + "&sgv=" + value + "&unit=" + encodeURIComponent(unit)
      } ]
    };
    id = notify(options);
    const accepted = typeof id === "number" && id > 0;
    if (accepted) {
      backgroundLog("NOTIFY_ACCEPTED", {
        cycle: cycle,
        glucose: value,
        level: level,
        notificationId: id
      });
      try {
        localStorage.setItem("zightscout_notified_reading", key);
        localStorage.setItem("zightscout_last_alert_time", String(now));
        localStorage.setItem(LAST_NOTIF_ACCEPTED_KEY, String(now));
      } catch (e) {}
      setPipelineState(STATE_RUNNING, "NOTIFICATION_ACCEPTED");
      if (data.token) {
        ackPendingAlert(data.token, data.storageKey);
      }
      if (level === "critical") {
        scheduleAlertRepeats(options, key, false);
      }
    } else {
      backgroundLog("NOTIFY_FAILED", {
        cycle: cycle,
        glucose: value,
        level: level,
        notificationId: id
      });
      if (data.token) {
        markAlertRetry(data.token, data.storageKey, "NOTIFY_RETURNED_" + id);
      }
    }
  } catch (ne) {
    backgroundLog("NOTIFY_ERROR", {
      cycle: cycle,
      error: String(ne)
    });
    if (data.token) {
      markAlertRetry(data.token, data.storageKey, "NOTIFY_EXCEPTION: " + String(ne));
    }
  }
}

export function processAlertQueue(preferredToken, preferredStorageKey) {
  const now = Date.now();
  recordAlertHeartbeat();
  pruneExpiredAlerts(now);
  const index = getAlertIndex();
  if (!index || !index.length) {
    if (preferredToken) {
      const p = peekPendingAlert(preferredToken, preferredStorageKey);
      if (p) processBackgroundReading(p);
    }
    return 0;
  }
  const items = [];
  for (let i = 0; i < index.length; i++) {
    const it = index[i];
    const token = typeof it === "object" && it ? it.token : it;
    const key = PENDING_PREFIX + token;
    const payload = peekPendingAlert(token, key);
    if (payload) {
      items.push(payload);
    }
  }
  if (!items.length) {
    if (preferredToken) {
      const p = peekPendingAlert(preferredToken, preferredStorageKey);
      if (p) processBackgroundReading(p);
    }
    return 0;
  }
  items.sort((a, b) => {
    if (a.level === "critical" && b.level !== "critical") return -1;
    if (a.level !== "critical" && b.level === "critical") return 1;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
  let processedCount = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const exp = Number(item.expiresAt || 0);
    if (exp > 0 && now >= exp) {
      backgroundLog("ALERT_EXPIRED", {
        token: item.token,
        level: item.level,
        reason: "QUEUE_TTL_EXPIRED"
      });
      ackPendingAlert(item.token, item.storageKey);
      continue;
    }
    if ((item.attempts || 0) >= MAX_RETRY_ATTEMPTS) {
      backgroundLog("ALERT_EXPIRED", {
        token: item.token,
        level: item.level,
        reason: "QUEUE_RETRIES_EXCEEDED"
      });
      ackPendingAlert(item.token, item.storageKey);
      continue;
    }
    const isReady = !item.nextRetryAt || now >= item.nextRetryAt || item.token === preferredToken;
    if (isReady) {
      try {
        if (preferredToken && item.token !== preferredToken) {
          backgroundLog("ALERT_PREEMPTED", {
            preferred: preferredToken,
            dispatched: item.token,
            level: item.level
          });
        }
        processBackgroundReading(item);
        processedCount++;
      } catch (err) {
        backgroundLog("ALERT_PROCESSING_ERROR", {
          token: item.token,
          error: String(err)
        });
      }
      if (preferredToken) {
        break;
      }
    }
  }
  return processedCount;
}

export function recoverPendingAlerts() {
  try {
    backgroundLog("ALERT_SERVICE_RECOVERY", {
      action: "START"
    });
    setPipelineState(STATE_RECOVERING, "PENDING_ALERTS_FOUND");
    const processed = processAlertQueue();
    setPipelineState(STATE_RUNNING, "RECOVERY_COMPLETED");
    return processed;
  } catch (e) {
    backgroundLog("ALERT_RECOVERY_ERROR", {
      error: String(e)
    });
    setPipelineState(STATE_ERROR, String(e));
    return 0;
  }
}

export function checkAlertWatchdog(logEvent = true) {
  recordAlertHeartbeat();
  try {
    const rawIndex = localStorage.getItem(PENDING_INDEX_KEY);
    const index = safeJsonParse(rawIndex, []);
    const pendingCount = Array.isArray(index) ? index.length : 0;
    try {
      localStorage.setItem(PENDING_COUNT_KEY, String(pendingCount));
    } catch (e) {}
    const lastEval = safeJsonParse(localStorage.getItem(LAST_EVALUATION_KEY), null);
    const now = Date.now();
    if (logEvent || pendingCount > 0) {
      backgroundLog("ALERT_WATCHDOG", {
        timestamp: now,
        pendingCount: pendingCount,
        state: getPipelineState(),
        lastEvalTimestamp: lastEval ? lastEval.timestamp : 0
      });
    }
    if (pendingCount > 0) {
      processAlertQueue();
    }
  } catch (e) {
    backgroundLog("ALERT_WATCHDOG_ERROR", {
      error: String(e)
    });
  }
}
