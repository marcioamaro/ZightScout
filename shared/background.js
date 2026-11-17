import { localStorage } from "./storage";

import { backgroundLog } from "./background-log";

import { set, cancel, REPEAT_ONCE } from "@zos/alarm";

import { start, stop, getAllAppServices } from "@zos/app-service";

import { cancelAlertRepeats } from "./alert-repeat";

export const SERVICE_FILE = "app-service/index";

const ALARM_KEY = "zightscout_poll_alarm";

const DUE_KEY = "zightscout_poll_due";

export const LAST_REQUEST_KEY = "zightscout_bg_last_request";

export const PENDING_RESPONSE_KEY = "zightscout_bg_pending_response";

export const MANUAL_REFRESH_KEY = "zightscout_bg_manual_refresh";

export function cancelPollAlarm() {
  const id = Number(localStorage.getItem(ALARM_KEY));
  if (id > 0 && Number(localStorage.getItem(DUE_KEY)) * 1e3 > Date.now() && cancel(id) !== 0) {
    console.log("[BG] Failed to cancel poll alarm " + id);
    return false;
  }
  localStorage.removeItem(ALARM_KEY);
  localStorage.removeItem(DUE_KEY);
  return true;
}

export function schedulePoll(settings, retryAt) {
  const minutes = Number(settings.backgroundInterval);
  if (!(minutes > 0)) {
    cancelPollAlarm();
    return 0;
  }
  const now = Date.now();
  let last = Number(localStorage.getItem(LAST_REQUEST_KEY));
  if (!last || last > now) {
    last = now;
    localStorage.setItem(LAST_REQUEST_KEY, String(last));
  }
  const due = retryAt || Math.max(now + 1e3, last + minutes * 6e4);
  const seconds = Math.ceil(due / 1e3);
  if (Number(localStorage.getItem(DUE_KEY)) === seconds && Number(localStorage.getItem(ALARM_KEY)) > 0) return due;
  if (!cancelPollAlarm()) return due;
  const id = set({
    url: SERVICE_FILE,
    time: seconds,
    repeat_type: REPEAT_ONCE,
    param: "action=poll",
    store: true
  });
  if (id > 0) {
    localStorage.setItem(ALARM_KEY, String(id));
    localStorage.setItem(DUE_KEY, String(seconds));
    backgroundLog("ALARM_SCHEDULED", {
      alarmId: id,
      at: seconds * 1e3,
      intervalMinutes: minutes
    });
  } else backgroundLog("ALARM_FAILED", {
    at: seconds * 1e3,
    intervalMinutes: minutes
  });
  return due;
}

export function consumePollAlarm() {
  if (Number(localStorage.getItem(DUE_KEY)) * 1e3 <= Date.now()) {
    localStorage.removeItem(ALARM_KEY);
    localStorage.removeItem(DUE_KEY);
  }
}

export function requestBackgroundRefresh(settings) {
  const config = settings || loadSettings();
  if (!(Number(config.backgroundInterval) > 0)) return 0;
  const requestedAt = Date.now();
  localStorage.setItem(MANUAL_REFRESH_KEY, String(requestedAt));
  backgroundLog("MANUAL_REFRESH_REQUESTED", {
    at: requestedAt
  });
  return schedulePoll(config, requestedAt + 1e3);
}

export function syncBackground(settings, onReady) {
  schedulePoll(settings);
  let running = false;
  try {
    running = getAllAppServices().some(file => file === SERVICE_FILE || file === SERVICE_FILE + ".js");
  } catch (e) {
    running = Number(localStorage.getItem("zightscout_service_heartbeat")) > Date.now() - 12e4;
  }
  if (Number(settings.backgroundInterval) > 0) {
    if (running) {
      if (onReady) onReady();
      return;
    }
    const code = start({
      file: SERVICE_FILE,
      complete_func: result => {
        if (onReady) onReady();
        console.log("[BG] Start result: " + JSON.stringify(result));
      }
    });
  } else {
    cancelAlertRepeats();
    localStorage.removeItem(LAST_REQUEST_KEY);
    localStorage.removeItem(PENDING_RESPONSE_KEY);
    localStorage.removeItem("zightscout_commands");
    if (!running) {
      if (onReady) onReady();
      return;
    }
    stop({
      file: SERVICE_FILE,
      complete_func: result => {
        if (onReady) onReady();
        console.log("[BG] OFF stop result: " + JSON.stringify(result));
      }
    });
  }
}
