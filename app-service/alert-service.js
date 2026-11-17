if (typeof console !== "undefined") {
  if (typeof console.error !== "function") console.error = console.log;
  if (typeof console.warn !== "function") console.warn = console.log;
}

import { exit } from "@zos/app-service";

import { triggerVibration } from "../shared/vibrator";

import { notify } from "@zos/notification";

import { localStorage } from "../shared/storage";

import { processBackgroundReading, peekPendingAlert, ackPendingAlert, consumePendingAlert, processAlertQueue, recoverPendingAlerts, getSnoozeUntil } from "../shared/background-alert";

import { backgroundLog } from "../shared/background-log";

import { t } from "../shared/i18n";

import { handleAlertRepeat } from "../shared/alert-repeat";

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
  const snoozeUntil = getSnoozeUntil();
  if (snoozeUntil) {
    backgroundLog("CONNECTION_LOST_ALERT_SNOOZED", {
      minutes: minutes,
      snoozeUntil: snoozeUntil
    });
    return;
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
      title: t("offlineAlertTitle"),
      content: t("offlineAlertBody", {
        minutes: minutes
      }),
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
      minutes: minutes
    });
  }
  backgroundLog(typeof id === "number" && id > 0 ? "CONNECTION_LOST_NOTIFY_ACCEPTED" : "CONNECTION_LOST_NOTIFY_FAILED", {
    minutes: minutes,
    notificationId: id
  });
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
