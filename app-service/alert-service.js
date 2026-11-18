if (typeof console !== "undefined") {
  if (typeof console.error !== "function") console.error = console.log;
  if (typeof console.warn !== "function") console.warn = console.log;
}

import { exit } from "@zos/app-service";

import { triggerVibration } from "../shared/vibrator";

import { notify } from "@zos/notification";

import { localStorage } from "../shared/storage";

import { processBackgroundReading, peekPendingAlert, ackPendingAlert, consumePendingAlert, processAlertQueue, recoverPendingAlerts, getAlertIndex, getSnoozeUntil } from "../shared/background-alert";

import { backgroundLog } from "../shared/background-log";

import { t } from "../shared/i18n";

import { handleAlertRepeat } from "../shared/alert-repeat";

import { CONNECTION_STATES } from "../shared/message";

function parseParams(params) {
  try {
    return JSON.parse(params || "{}");
  } catch (e) {
    const data = {};
    String(params || "").split("&").forEach(pair => {
      const parts = pair.split("=");
      data[parts[0]] = decodeURIComponent(parts.slice(1).join("="));
    });
    return data;
  }
}

function connectionLost(data) {
  const minutes = Math.max(3, Number(data.minutes) || 3);
  const lastFetchAt = Number(localStorage.getItem("zightscout_last_fetch_at")) || 0;
  if (lastFetchAt > 0 && Date.now() - lastFetchAt < 12e4) {
    backgroundLog("CONNECTION_LOST_ABORTED_GLUCOSE_PRIORITY", {
      reason: "RECENT_GLUCOSE_RECEIVED",
      lastFetchAt: lastFetchAt
    });
    try {
      localStorage.removeItem("zightscout_pending_offline_alert");
    } catch (e) {}
    return;
  }
  const pendingAlerts = getAlertIndex();
  if (Array.isArray(pendingAlerts) && pendingAlerts.length > 0) {
    backgroundLog("CONNECTION_LOST_ABORTED_GLUCOSE_PRIORITY", {
      reason: "GLUCOSE_ALERT_PENDING_IN_QUEUE",
      count: pendingAlerts.length
    });
    try {
      localStorage.removeItem("zightscout_pending_offline_alert");
    } catch (e) {}
    return;
  }
  const snoozeUntil = getSnoozeUntil();
  if (snoozeUntil) {
    backgroundLog("CONNECTION_LOST_ALERT_SNOOZED", {
      minutes: minutes,
      snoozeUntil: snoozeUntil,
      errorState: data.errorState
    });
    try {
      localStorage.removeItem("zightscout_pending_offline_alert");
    } catch (e) {}
    return;
  }
  let title = t("offlineAlertTitle");
  let content = t("offlineAlertBody", {
    minutes: minutes
  });
  const errState = data.errorState;
  if (errState === CONNECTION_STATES.BLUETOOTH_OFFLINE) {
    title = t("offlineBluetoothTitle");
    content = t("offlineBluetoothBody");
  } else if (errState === CONNECTION_STATES.NIGHTSCOUT_AUTH_ERROR) {
    title = t("offlineAuthTitle");
    content = t("offlineAuthBody");
  } else if (errState === CONNECTION_STATES.NIGHTSCOUT_ACCESS_ERROR) {
    title = t("offlineAccessTitle");
    content = t("offlineAccessBody");
  } else if (errState === CONNECTION_STATES.NIGHTSCOUT_NOT_FOUND) {
    title = t("offlineNotFoundTitle");
    content = t("offlineNotFoundBody");
  } else if (errState === CONNECTION_STATES.NIGHTSCOUT_SERVER_ERROR) {
    title = t("offlineServerTitle");
    content = t("offlineServerBody");
  } else if (errState === CONNECTION_STATES.NIGHTSCOUT_TIMEOUT) {
    title = t("offlineTimeoutTitle");
    content = t("offlineTimeoutBody");
  } else if (errState === CONNECTION_STATES.NETWORK_OFFLINE) {
    title = t("offlineNetworkTitle");
    content = t("offlineNetworkBody");
  } else if (errState === CONNECTION_STATES.UNKNOWN_CONNECTION_ERROR) {
    title = t("offlineUnknownTitle");
    content = t("offlineUnknownBody");
  }
  try {
    triggerVibration("critical");
  } catch (e) {
    backgroundLog("CONNECTION_LOST_VIBRATE_ERROR", {
      error: String(e)
    });
  }
  let id = 0;
  try {
    id = notify({
      title: title,
      content: content,
      vibrate: 5,
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
        param: "alert=critical"
      } ]
    });
  } catch (e) {
    backgroundLog("CONNECTION_LOST_NOTIFY_ERROR", {
      error: String(e),
      minutes: minutes,
      errorState: errState
    });
  }
  backgroundLog(typeof id === "number" && id > 0 ? "CONNECTION_LOST_NOTIFY_ACCEPTED" : "CONNECTION_LOST_NOTIFY_FAILED", {
    minutes: minutes,
    errorState: errState,
    title: title,
    notificationId: id
  });
  try {
    localStorage.removeItem("zightscout_pending_offline_alert");
  } catch (e) {}
}

function finishService() {
  setTimeout(() => {
    try {
      exit();
    } catch (e) {
      console.log("[ALERT_SERVICE] exit error: " + String(e));
    }
  }, 500);
}

function handle(params) {
  try {
    const data = parseParams(params);
    const action = data.action || data.type || "";
    backgroundLog("ALERT_SERVICE_WAKE", {
      type: action,
      token: data.token || ""
    });
    if (data.type === "CONNECTION_LOST") {
      connectionLost(data);
      finishService();
      return;
    }
    if (action === "critical-repeat") {
      handleAlertRepeat(data);
      finishService();
      return;
    }
    if (action === "alert-retry" || action === "glucose-alert") {
      if (action === "alert-retry") {
        backgroundLog("NOTIFY_RETRY_EXECUTED", {
          token: data.token || "",
          attempt: data.attempt || 1
        });
      }
      processAlertQueue(data.token, data.storageKey);
      finishService();
      return;
    }
    if (data.currentBG || data.sgv) {
      processBackgroundReading({
        ...data,
        currentBG: data.currentBG || data.sgv
      });
      finishService();
      return;
    }
    recoverPendingAlerts();
    finishService();
  } catch (e) {
    backgroundLog("ALERT_SERVICE_ERROR", {
      error: String(e)
    });
    finishService();
  }
}

AppService({
  onInit: handle,
  onEvent: handle
});
