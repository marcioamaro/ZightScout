import { localStorage } from "./storage";

const STORAGE_KEY = "zightscout_service_retry_state";

const DEFAULT_STATE = {
  retryCount: 0,
  nextRetryAt: 0,
  lastSuccessTimestamp: 0,
  criticalNotifiedAt: null,
  bleDisconnectAttempts: 0,
  lastBleAttemptAt: 0
};

function numberOr(value, fallback) {
  const number = Number(value);
  return isFinite(number) && number >= 0 ? number : fallback;
}

function normalize(value) {
  const state = value && typeof value === "object" ? value : {};
  return {
    retryCount: Math.floor(numberOr(state.retryCount, 0)),
    nextRetryAt: numberOr(state.nextRetryAt, 0),
    lastSuccessTimestamp: numberOr(state.lastSuccessTimestamp, 0),
    criticalNotifiedAt: state.criticalNotifiedAt === null || state.criticalNotifiedAt === undefined ? null : numberOr(state.criticalNotifiedAt, null),
    bleDisconnectAttempts: Math.floor(numberOr(state.bleDisconnectAttempts, 0)),
    lastBleAttemptAt: numberOr(state.lastBleAttemptAt, 0)
  };
}

export function loadServiceState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY, "");
    const state = raw ? normalize(JSON.parse(raw)) : {
      ...DEFAULT_STATE
    };
    if (!state.lastSuccessTimestamp) {
      state.lastSuccessTimestamp = numberOr(localStorage.getItem("zightscout_last_fetch_at"), 0);
    }
    return state;
  } catch (error) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (ignore) {}
    const state = {
      ...DEFAULT_STATE
    };
    state.lastSuccessTimestamp = numberOr(localStorage.getItem("zightscout_last_fetch_at"), 0);
    return state;
  }
}

export function saveServiceState(state) {
  const safeState = normalize(state);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
  } catch (error) {
    console.log("[ZIGHTSCOUT][RETRY] persistence error: " + String(error));
  }
  return safeState;
}

export function resetServiceState(timestamp) {
  return saveServiceState({
    retryCount: 0,
    nextRetryAt: 0,
    lastSuccessTimestamp: Number(timestamp) || Date.now(),
    criticalNotifiedAt: null,
    bleDisconnectAttempts: 0,
    lastBleAttemptAt: 0
  });
}

export function recordFetchSuccess(timestamp) {
  const ts = Number(timestamp) || Date.now();
  return resetServiceState(ts);
}
