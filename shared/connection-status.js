import { localStorage } from "./storage";

import { loadSettings } from "./settings";

import { t, formatAgeText } from "./i18n";

const GREEN = 52326;

const YELLOW = 16755200;

const RED = 16733525;

function number(value) {
  const n = Number(value);
  return isFinite(n) && n > 0 ? n : 0;
}

function timestamp(value) {
  if (typeof value === "number") return value > 0 && value < 1e11 ? value * 1e3 : value;
  const numeric = number(value);
  if (numeric) return numeric < 1e11 ? numeric * 1e3 : numeric;
  const parsed = Date.parse(value || "");
  return isFinite(parsed) ? parsed : 0;
}

function ageMinutes(value, now) {
  const time = timestamp(value);
  return time ? Math.max(0, Math.floor((now - time) / 6e4)) : -1;
}

function ageText(minutes) {
  return formatAgeText(minutes);
}

function storedJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch (e) {
    return null;
  }
}

function httpPort(url) {
  const match = String(url || "").match(/^https?:\/\/[^/:]+(?::(\d+))?/i);
  if (match && match[1]) return match[1];
  return /^https:/i.test(String(url || "")) ? "443" : "80";
}

export function getConnectionStatus(settings, now) {
  const config = settings || loadSettings();
  const current = now || Date.now();
  const interval = Number(config.backgroundInterval) || 5;
  const delayedMinutes = 10;
  const staleMinutes = Math.max(20, interval * 4);
  const reading = storedJson("zightscout_last_data");
  const readingMinutes = ageMinutes(reading && reading.readingTimestamp, current);
  const fetchAt = number(localStorage.getItem("zightscout_last_fetch_at"));
  const fetchMinutes = fetchAt ? Math.max(0, Math.floor((current - fetchAt) / 6e4)) : -1;
  const lastContact = number(localStorage.getItem("zightscout_ble_last_contact"));
  const blePort = number(localStorage.getItem("zightscout_ble_port"));
  const httpPortValue = httpPort(config.apiUrl);
  const lastDisconnect = number(localStorage.getItem("zightscout_ble_last_disconnect"));
  const contactMinutes = lastContact ? Math.max(0, Math.floor((current - lastContact) / 6e4)) : -1;
  const connectionLimitMs = Math.max(12e4, interval * 9e4);
  const bleConnecting = String(localStorage.getItem("zightscout_ble_connecting") || "") === "true";
  const bleDisconnected = !bleConnecting && lastDisconnect && lastDisconnect >= lastContact;
  const ble = bleConnecting ? {
    label: t("bleConnectingLabel"),
    detail: t("bleConnectingDetail"),
    color: YELLOW,
    level: "yellow"
  } : bleDisconnected ? {
    label: t("bleOffLabel"),
    detail: t("bleOffDetail"),
    color: RED,
    level: "red"
  } : !lastContact ? {
    label: t("bleWaitingLabel"),
    detail: t("bleWaitingPhone"),
    color: YELLOW,
    level: "yellow"
  } : current - lastContact > connectionLimitMs ? {
    label: t("bleWaitingLabel"),
    detail: t("bleNoRecentContact"),
    color: YELLOW,
    level: "yellow"
  } : {
    label: t("bleOkLabel"),
    detail: t("bleContactAgo") + ageText(contactMinutes),
    color: GREEN,
    level: "green"
  };
  const httpValidating = String(localStorage.getItem("zightscout_http_validating") || "") === "true";
  const lastError = storedJson("zightscout_last_fetch_error");
  const httpFailLabel = t("httpFailLabel");
  const http = !config.apiUrl ? {
    label: t("httpUrlLabel"),
    detail: t("httpUrlNotConfigured"),
    color: RED,
    level: "red"
  } : lastError ? {
    label: t("httpErrorLabel"),
    detail: String(lastError.message || t("httpQueryFailed")),
    color: RED,
    level: "red"
  } : bleConnecting || bleDisconnected || httpValidating ? {
    label: httpFailLabel,
    detail: bleConnecting ? t("httpWaitingConnection") : bleDisconnected ? t("bleOffDetail") : t("httpValidating"),
    color: RED,
    level: "red"
  } : fetchMinutes < 0 ? {
    label: t("httpWaitingLabel"),
    detail: t("httpNoQuery"),
    color: YELLOW,
    level: "yellow"
  } : fetchMinutes >= staleMinutes ? {
    label: t("httpWaitingLabel"),
    detail: t("httpQueryAgo") + ageText(fetchMinutes),
    color: YELLOW,
    level: "yellow"
  } : {
    label: t("httpOkLabel"),
    detail: t("httpQueryAgo") + ageText(fetchMinutes),
    color: GREEN,
    level: "green"
  };
  const isDisconnectedOrConnecting = bleConnecting || bleDisconnected || httpValidating;
  const readingDetail = bleConnecting ? t("readingNoAccessBleConnecting") : bleDisconnected ? t("readingNoAccessBleDisconnected") : t("readingNoAccessNoData");
  const readingState = isDisconnectedOrConnecting ? {
    label: t("readingNoAccessLabel"),
    detail: readingDetail,
    color: bleConnecting ? YELLOW : RED,
    level: bleConnecting ? "yellow" : "red"
  } : readingMinutes < 0 ? {
    label: t("readingNoReadingLabel"),
    detail: t("readingWaitingGlucose"),
    color: YELLOW,
    level: "yellow"
  } : readingMinutes >= staleMinutes ? {
    label: t("readingExpiredLabel"),
    detail: t("readingAgo") + ageText(readingMinutes),
    color: RED,
    level: "red"
  } : readingMinutes > delayedMinutes ? {
    label: t("readingDelayedLabel"),
    detail: t("readingAgo") + ageText(readingMinutes),
    color: YELLOW,
    level: "yellow"
  } : {
    label: t("readingCurrentLabel"),
    detail: t("readingUpdated"),
    color: GREEN,
    level: "green"
  };
  const level = [ ble, http, readingState ].some(item => item.level === "red") ? "red" : [ ble, http, readingState ].some(item => item.level === "yellow") ? "yellow" : "green";
  const color = level === "red" ? RED : level === "yellow" ? YELLOW : GREEN;
  const bleText = ble.label + (ble.level === "green" && blePort ? " P" + blePort : "");
  const httpText = http.label + (config.apiUrl ? http.label === httpFailLabel ? " " + httpPortValue : ":" + httpPortValue : "");
  return {
    ble: ble,
    http: http,
    reading: readingState,
    level: level,
    color: color,
    text: bleText + " | " + httpText + " | " + readingState.label,
    detail: "BLE: " + ble.detail + (blePort ? " (" + t("portWord") + blePort + ")" : "") + " • HTTP: " + http.detail + (config.apiUrl ? " (" + t("portWord") + httpPortValue + ")" : "") + " • " + readingState.detail
  };
}
