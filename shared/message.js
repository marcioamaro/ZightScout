export const messageBuilder = {
  request: params => ({
    type: "request",
    ...params
  }),
  response: data => ({
    type: "response",
    data: data
  })
};

export const MESSAGE_TYPES = {
  FETCH_DATA: "FETCH_DATA",
  UPDATE_SETTINGS: "UPDATE_SETTINGS",
  VERIFY_URL: "VERIFY_URL",
  VALIDATE_TOKEN: "VALIDATE_TOKEN"
};

export const CONNECTION_STATES = {
  ONLINE: "ONLINE",
  BLUETOOTH_OFFLINE: "BLUETOOTH_OFFLINE",
  NETWORK_OFFLINE: "NETWORK_OFFLINE",
  NIGHTSCOUT_AUTH_ERROR: "NIGHTSCOUT_AUTH_ERROR",
  NIGHTSCOUT_ACCESS_ERROR: "NIGHTSCOUT_ACCESS_ERROR",
  NIGHTSCOUT_NOT_FOUND: "NIGHTSCOUT_NOT_FOUND",
  NIGHTSCOUT_SERVER_ERROR: "NIGHTSCOUT_SERVER_ERROR",
  NIGHTSCOUT_TIMEOUT: "NIGHTSCOUT_TIMEOUT",
  UNKNOWN_CONNECTION_ERROR: "UNKNOWN_CONNECTION_ERROR"
};

export function classifyHttpError(status, error) {
  if (error && (error.isTimeout || /timeout|tempo limite/i.test(String(error.message || "")))) {
    return CONNECTION_STATES.NIGHTSCOUT_TIMEOUT;
  }
  const s = Number(status) || error && Number(error.httpStatus) || 0;
  if (s === 401) return CONNECTION_STATES.NIGHTSCOUT_AUTH_ERROR;
  if (s === 403) return CONNECTION_STATES.NIGHTSCOUT_ACCESS_ERROR;
  if (s === 404) return CONNECTION_STATES.NIGHTSCOUT_NOT_FOUND;
  if (s >= 500 && s <= 599) return CONNECTION_STATES.NIGHTSCOUT_SERVER_ERROR;
  if (s === 429) return CONNECTION_STATES.NIGHTSCOUT_SERVER_ERROR;
  const msg = String(error && error.message ? error.message : "").toLowerCase();
  if (msg.includes("network") || msg.includes("dns") || msg.includes("failed to fetch") || msg.includes("econnrefused") || msg.includes("offline") || msg.includes("enotfound") || msg.includes("conexao") || msg.includes("internet")) {
    return CONNECTION_STATES.NETWORK_OFFLINE;
  }
  return s > 0 ? CONNECTION_STATES.NIGHTSCOUT_SERVER_ERROR : msg ? CONNECTION_STATES.NETWORK_OFFLINE : CONNECTION_STATES.UNKNOWN_CONNECTION_ERROR;
}

export const APP_ID = 1127420;
