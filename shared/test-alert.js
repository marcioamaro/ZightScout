import { notify } from "@zos/notification";

import { backgroundLog } from "./background-log";

import { scheduleAlertRepeats, cancelAlertRepeats } from "./alert-repeat";

import { triggerVibration } from "./vibrator";

import { t } from "./i18n";

export function testAlertNotification(level, vibratorInstance) {
  if (level !== "warning" && level !== "critical") return false;
  try {
    cancelAlertRepeats(true);
    triggerVibration(level, vibratorInstance);
    const options = {
      title: level === "critical" ? t("testAlertCritTitle") : t("testAlertWarnTitle"),
      content: t("testAlertBody"),
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
        param: "alert=" + level
      } ]
    };
    const id = notify(options);
    const accepted = typeof id === "number" && id > 0;
    backgroundLog("TEST_NOTIFY_RESULT", {
      level: level,
      notificationId: id,
      accepted: accepted
    });
    if (accepted) {
      if (level === "critical") scheduleAlertRepeats(options, "manual", true);
    }
    return accepted;
  } catch (e) {
    backgroundLog("TEST_NOTIFY_ERROR", {
      error: String(e)
    });
    return false;
  }
}
