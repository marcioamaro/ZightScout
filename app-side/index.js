let debugContext = "phone";

let debugSequence = 0;

const debugInstance = String(Date.now());

function setDebugContext(val) {
  debugContext = val;
}

function safeUrl(value) {
  return String(value || "").replace(/(https?:\/\/)[^/@]+@/i, "$1[credentials]@").replace(/[?#].*$/, "[parameters omitted]");
}

function errorDetails(error) {
  return {
    message: safeUrl(String(error && error.message || error)),
    stack: safeUrl(String(error && error.stack || ""))
  };
}

function trace(event, details) {
  console.log("[ZIGHTSCOUT][TRACE] " + JSON.stringify({
    timestamp: Date.now(),
    version: "3.0.61",
    appId: 1127420,
    context: debugContext,
    instance: debugInstance,
    sequence: ++debugSequence,
    event: event,
    ...details || {}
  }));
}

import { messageBuilder, MESSAGE_TYPES } from "../shared/message";

import { normalizeGlucoseUnit } from "../shared/glucose-unit";

const DATA_POINTS_COUNT = 144;

const STATUS_ENDPOINT = "/api/v1/status";

const ENTRIES_ENDPOINT = "/api/v1/entries.json";

const ADMIN_ENDPOINT = "/api/v1/treatments.json";

const DEFAULT_URL = "";

let configuredUrl = DEFAULT_URL;

let configuredToken = "";

let cachedServerUnit = null;

function cleanToken(value) {
  return typeof value === "string" ? value.trim() : "";
}

function withToken(endpoint, token) {
  const clean = cleanToken(token);
  return clean ? endpoint + (endpoint.indexOf("?") === -1 ? "?" : "&") + "token=" + encodeURIComponent(clean) : endpoint;
}

function authCode(status) {
  if (status === 401 || status === 403) return "errAuth";
  if (status === 429) return "errRateLimit";
  if (status >= 500) return "errServerDown";
  return "errNetwork";
}

function authMessage(status) {
  if (status === 401 || status === 403) return "Token invalido ou sem permissao de leitura";
  if (status === 429) return "Limite de consultas atingido; tente novamente depois";
  if (status >= 500) return "Servidor Nightscout indisponivel";
  return "Falha ao consultar o Nightscout (HTTP " + status + ")";
}

function isSha1Hex(str) {
  return typeof str === "string" && /^[0-9a-f]{40}$/i.test(str.trim());
}

function sha1(str) {
  const utf8 = unescape(encodeURIComponent(str));
  const words = [];
  for (let i = 0; i < utf8.length; i++) {
    words[i >> 2] = (words[i >> 2] || 0) | (utf8.charCodeAt(i) & 255) << 24 - i % 4 * 8;
  }
  const len = utf8.length * 8;
  words[len >> 5] = (words[len >> 5] || 0) | 128 << 24 - len % 32;
  words[(len + 64 >> 9 << 4) + 15] = len;
  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878, e = -1009589776;
  const w = new Array(80);
  for (let i = 0; i < words.length; i += 16) {
    const oldA = a, oldB = b, oldC = c, oldD = d, oldE = e;
    for (let j = 0; j < 80; j++) {
      if (j < 16) {
        w[j] = words[i + j] || 0;
      } else {
        const t = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
        w[j] = t << 1 | t >>> 31;
      }
      let f, k;
      if (j < 20) {
        f = b & c | ~b & d;
        k = 1518500249;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 1859775393;
      } else if (j < 60) {
        f = b & c | b & d | c & d;
        k = -1894007588;
      } else {
        f = b ^ c ^ d;
        k = -899497514;
      }
      const temp = (a << 5 | a >>> 27) + f + e + k + w[j] | 0;
      e = d;
      d = c;
      c = b << 30 | b >>> 2;
      b = a;
      a = temp;
    }
    a = a + oldA | 0;
    b = b + oldB | 0;
    c = c + oldC | 0;
    d = d + oldD | 0;
    e = e + oldE | 0;
  }
  function toHex(val) {
    let s = "";
    for (let i = 7; i >= 0; i--) s += (val >>> i * 4 & 15).toString(16);
    return s;
  }
  return (toHex(a) + toHex(b) + toHex(c) + toHex(d) + toHex(e)).toLowerCase();
}

function buildAuthHeaders(token) {
  const clean = cleanToken(token);
  if (!clean) return {};
  const hash = isSha1Hex(clean) ? clean.toLowerCase() : sha1(clean);
  return {
    "api-secret": hash,
    Authorization: "Bearer " + clean
  };
}

function extractUrlAndToken(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    return {
      url: "",
      token: ""
    };
  }
  let clean = rawUrl.trim();
  if (!clean) return {
    url: "",
    token: ""
  };
  const tokenMatch = /[?&]token=([^&#\s]+)/i.exec(clean);
  const token = tokenMatch ? decodeURIComponent(tokenMatch[1]).trim() : "";
  if (tokenMatch) {
    clean = clean.replace(/[?&]token=[^&#\s]*/i, "").replace(/\?&/, "?").replace(/[?&]$/, "");
  }
  clean = clean.replace(/\/+$/, "");
  if (clean && !clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = "https://" + clean;
  }
  return {
    url: clean,
    token: token
  };
}

function sanitizeUrl(rawUrl) {
  return extractUrlAndToken(rawUrl).url;
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

function parsePayload(payload) {
  if (!payload) return null;
  let raw = payload;
  if (raw && typeof raw === "object" && raw.data !== undefined && !raw.type) {
    raw = raw.data;
  }
  if (raw && typeof raw === "object" && !(raw instanceof ArrayBuffer) && !ArrayBuffer.isView(raw) && raw.type) {
    return raw;
  }
  try {
    let rawStr = "";
    if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(raw)) {
      rawStr = raw.toString("utf-8");
    } else if (raw instanceof ArrayBuffer || ArrayBuffer.isView(raw)) {
      const view = new Uint8Array(raw.buffer || raw, raw.byteOffset || 0, raw.byteLength || 0);
      rawStr = buf2str(view);
    } else if (typeof raw === "string") {
      rawStr = raw;
    } else {
      return raw;
    }
    const idx = rawStr.indexOf("{");
    if (idx !== -1) {
      return JSON.parse(rawStr.substring(idx));
    }
    return JSON.parse(rawStr);
  } catch (e) {
    console.error("[AUDIT] Error parsing payload:", e);
    return null;
  }
}

function getStoredSetting(key, defaultVal) {
  try {
    if (typeof settingsStorage !== "undefined" && settingsStorage.getItem) {
      const val = settingsStorage.getItem(key);
      if (val !== undefined && val !== null && val !== "") {
        try {
          return JSON.parse(val);
        } catch (e) {
          return val;
        }
      }
    }
    if (typeof settings !== "undefined" && settings && settings.settingsStorage && settings.settingsStorage.getItem) {
      const val = settings.settingsStorage.getItem(key);
      if (val !== undefined && val !== null && val !== "") {
        try {
          return JSON.parse(val);
        } catch (e) {
          return val;
        }
      }
    }
  } catch (e) {}
  return defaultVal;
}

function setStoredSetting(key, value) {
  try {
    const valStr = typeof value === "string" ? value : JSON.stringify(value);
    if (typeof settingsStorage !== "undefined" && settingsStorage.setItem) {
      settingsStorage.setItem(key, valStr);
    }
    if (typeof settings !== "undefined" && settings && settings.settingsStorage && settings.settingsStorage.setItem) {
      settings.settingsStorage.setItem(key, valStr);
    }
  } catch (e) {}
}

let bgFetchTimer = null;

function setupBackgroundFetch(intervalMinutes, fetchCallback) {
  if (bgFetchTimer) {
    clearInterval(bgFetchTimer);
    bgFetchTimer = null;
  }
  const interval = parseInt(intervalMinutes, 10);
  if (!interval || interval <= 0) {
    console.log("ZightScout SideService: Periodic background fetch disabled (interval=0)");
    return;
  }
  console.log("ZightScout SideService: Periodic background fetch set for every", interval, "minutes");
  const intervalMs = interval * 60 * 1e3;
  bgFetchTimer = setInterval(() => {
    console.log("ZightScout SideService: Periodic background timer fired");
    if (typeof fetchCallback === "function") {
      fetchCallback();
    }
  }, intervalMs);
}

AppSideService({
  onInit() {
    setDebugContext("phone");
    trace("LIFECYCLE_INIT");
    configuredToken = cleanToken(getStoredSetting("zightscout_nightscout_token", ""));
    console.log("ZightScout: App-side service initialized");
    this.setupMessageHandlers();
    this.sendToDeviceHelper({
      tokenUpdate: true,
      configured: !!configuredToken
    });
    console.log("[ZIGHTSCOUT][BACKGROUND] Polling is owned by the watch App-Service");
  },
  onRun() {
    console.log("ZightScout: App-side service running");
  },
  onDestroy() {
    console.log("ZightScout: App-side service destroyed");
    if (bgFetchTimer) {
      clearInterval(bgFetchTimer);
      bgFetchTimer = null;
    }
  },
  setupPeriodicFetch(interval) {
    setupBackgroundFetch(interval, () => {
      this.fetchNightscoutData(configuredUrl, "");
    });
  },
  _listenerRegistered: false,
  _messageListener: null,
  setupMessageHandlers() {
    if (typeof messaging === "undefined" || !messaging.peerSocket) {
      console.error("CRITICAL: messaging.peerSocket is unavailable in side service");
      return;
    }
    if (this._listenerRegistered) {
      console.log("[AUDIT] Message listener already registered (idempotent skip)");
      return;
    }
    const handleIncomingMessage = rawPayload => {
      console.log("[AUDIT] Received raw message from device");
      const data = parsePayload(rawPayload);
      if (!data) {
        console.error("[AUDIT] Failed to parse message payload");
        return;
      }
      console.log("[AUDIT] Parsed message type:", data.type);
      trace("PHONE_COMMAND", {
        type: data.type,
        cycle: data.backgroundCycle,
        requestId: data.requestId,
        apiUrl: safeUrl(data.apiUrl)
      });
      if (data.type === MESSAGE_TYPES.FETCH_DATA) {
        if (data.apiUrl) {
          const parsed = extractUrlAndToken(data.apiUrl);
          configuredUrl = parsed.url;
          if (parsed.token) {
            configuredToken = cleanToken(parsed.token);
            setStoredSetting("zightscout_nightscout_token", configuredToken);
            this.sendToDeviceHelper({
              tokenUpdate: true,
              configured: true
            });
          }
        }
        console.log("[ZIGHTSCOUT][NIGHTSCOUT] FETCH_DATA url=" + safeUrl(configuredUrl) + " token=" + (configuredToken ? "configured" : "none"));
        if (Array.isArray(data.watchLogs) && data.watchLogs.length > 0) {
          console.log("[WATCH_BG_DUMP] Recent watch events count=" + data.watchLogs.length);
          data.watchLogs.forEach(entry => {
            console.log("[WATCH_BG]", entry.event, JSON.stringify(entry));
          });
        }
        this._currentRequestId = data.requestId || null;
        this.fetchNightscoutData(configuredUrl, configuredToken, data.backgroundCycle);
      } else if (data.type === MESSAGE_TYPES.UPDATE_SETTINGS) {
        if (data.settings && Object.prototype.hasOwnProperty.call(data.settings, "apiUrl")) {
          const parsed = extractUrlAndToken(data.settings.apiUrl);
          configuredUrl = parsed.url;
          if (parsed.token) {
            configuredToken = cleanToken(parsed.token);
            setStoredSetting("zightscout_nightscout_token", configuredToken);
            this.sendToDeviceHelper({
              tokenUpdate: true,
              configured: true
            });
          }
        }
        if (data.settings && Object.prototype.hasOwnProperty.call(data.settings, "apiToken")) {
          configuredToken = cleanToken(data.settings.apiToken);
          setStoredSetting("zightscout_nightscout_token", configuredToken);
          this.sendToDeviceHelper({
            tokenUpdate: true,
            configured: !!configuredToken
          });
        }
      } else if (data.type === MESSAGE_TYPES.VERIFY_URL) {
        if (data.apiToken) {
          configuredToken = cleanToken(data.apiToken);
          setStoredSetting("zightscout_nightscout_token", configuredToken);
        }
        this.verifyNightscoutUrl(data.apiUrl || configuredUrl, data.apiToken);
      } else if (data.type === MESSAGE_TYPES.VALIDATE_TOKEN) {
        this.validateToken(data.apiUrl, data.apiToken);
      }
    };
    this._messageListener = handleIncomingMessage;
    if (typeof messaging.peerSocket.on === "function") {
      try {
        messaging.peerSocket.on("message", handleIncomingMessage);
        this._listenerRegistered = true;
      } catch (e) {
        console.warn("[AUDIT] peerSocket.on registration failed:", e);
      }
    } else if (typeof messaging.peerSocket.addListener === "function") {
      try {
        messaging.peerSocket.addListener("message", handleIncomingMessage);
        this._listenerRegistered = true;
      } catch (e) {
        console.warn("[AUDIT] peerSocket.addListener registration failed:", e);
      }
    } else if ("message" in messaging.peerSocket) {
      messaging.peerSocket.message = handleIncomingMessage;
      this._listenerRegistered = true;
    } else {
      console.error("peerSocket sem API de mensagem suportada");
      return;
    }
  },
  fetchNightscoutData(apiUrl, apiToken, backgroundCycle, requestId) {
    const activeRequestId = requestId || this._currentRequestId || null;
    trace("PHONE_FETCH_START", {
      cycle: backgroundCycle,
      requestId: activeRequestId,
      apiUrl: safeUrl(apiUrl),
      hasToken: !!apiToken
    });
    const url = sanitizeUrl(apiUrl);
    if (!url) {
      this.sendToDeviceHelper({
        error: true,
        code: "errNoUrl",
        message: "URL do Nightscout nao configurada",
        backgroundCycle: backgroundCycle,
        requestId: activeRequestId
      });
      return;
    }
    console.log("Fetching from Nightscout:", safeUrl(url));
    const count = backgroundCycle ? 2 : DATA_POINTS_COUNT;
    const entriesEndpoint = withToken(url + ENTRIES_ENDPOINT + "?count=" + count + "&_=" + Date.now(), apiToken);
    const statusEndpoint = withToken(url + STATUS_ENDPOINT, apiToken);
    const authHeaders = buildAuthHeaders(apiToken || configuredToken);
    const unitPromise = backgroundCycle || cachedServerUnit ? Promise.resolve(cachedServerUnit) : this.request({
      method: "GET",
      url: statusEndpoint,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders
      },
      endpointType: "status-unit",
      timeout: 6e3
    }).then(statusResponse => {
      if (statusResponse.status >= 200 && statusResponse.status < 300) {
        cachedServerUnit = normalizeGlucoseUnit(statusResponse.body && statusResponse.body.settings && statusResponse.body.settings.units);
        return cachedServerUnit;
      }
      return null;
    }).catch(() => null);
    const entriesPromise = this.request({
      method: "GET",
      url: entriesEndpoint,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders
      },
      endpointType: "entries",
      timeout: 1e4
    });
    Promise.all([ entriesPromise, unitPromise ]).then(([entriesRes, serverUnit]) => {
      console.log("API response received");
      if (entriesRes.status < 200 || entriesRes.status >= 300) {
        throw new Error(authMessage(entriesRes.status));
      }
      const data = entriesRes.body;
      if (Array.isArray(data) && data.length > 0) {
        const parsedData = this.parseNightscoutData(data, Boolean(backgroundCycle));
        if (serverUnit) parsedData.unit = serverUnit;
        trace("PHONE_GLUCOSE", {
          cycle: backgroundCycle,
          requestId: activeRequestId,
          count: data.length,
          currentBG: parsedData.currentBG,
          readingTimestamp: parsedData.readingTimestamp,
          cacheBusted: true
        });
        parsedData.backgroundCycle = backgroundCycle;
        if (activeRequestId) parsedData.requestId = activeRequestId;
        this.sendDataToDevice(parsedData);
      } else {
        this.sendToDeviceHelper({
          error: true,
          code: "errNoReadings",
          message: "Sem leituras no Nightscout",
          backgroundCycle: backgroundCycle,
          requestId: activeRequestId
        });
      }
    }).catch(error => {
      console.log("Fetch error:", error);
      const errCode = error && error.httpStatus ? authCode(error.httpStatus) : "errNetwork";
      this.sendToDeviceHelper({
        error: true,
        code: errCode,
        message: "Problema de conexao: " + (error.message || "servidor indisponivel"),
        backgroundCycle: backgroundCycle,
        requestId: activeRequestId
      });
    });
  },
  verifyNightscoutUrl(apiUrl, apiToken) {
    const parsed = extractUrlAndToken(apiUrl);
    const url = parsed.url;
    const tokenToUse = cleanToken(apiToken) || parsed.token || configuredToken;
    if (!url) {
      this.sendVerificationResultToDevice({
        success: false,
        code: "errNoUrl",
        message: "URL do Nightscout nao configurada"
      });
      return;
    }
    console.log("Verifying URL:", safeUrl(url), "token:", tokenToUse ? "present" : "none");
    const authHeaders = buildAuthHeaders(tokenToUse);
    const statusReq = this.request({
      method: "GET",
      url: withToken(`${url}${STATUS_ENDPOINT}`, tokenToUse),
      headers: {
        "Content-Type": "application/json",
        ...authHeaders
      },
      endpointType: "status",
      timeout: 6e3
    });
    const entriesReq = this.request({
      method: "GET",
      url: withToken(`${url}${ENTRIES_ENDPOINT}?count=1&_=${Date.now()}`, tokenToUse),
      headers: {
        "Content-Type": "application/json",
        ...authHeaders
      },
      endpointType: "entries-verify",
      timeout: 6e3
    });
    Promise.all([ statusReq, entriesReq ]).then(([statusRes, entriesRes]) => {
      const data = statusRes.body;
      const isHtmlOk = typeof data === "string" && (data.indexOf("STATUS OK") !== -1 || data.indexOf("status") !== -1 || data.indexOf("ok") !== -1);
      const isJsonOk = data && (data.status === "ok" || data.name || data.version);
      if (statusRes.status !== 200 && !isHtmlOk && !isJsonOk) {
        this.sendVerificationResultToDevice({
          success: false,
          httpStatus: statusRes.status,
          code: authCode(statusRes.status),
          message: "Status HTTP " + statusRes.status
        });
        return;
      }
      if (entriesRes.status < 200 || entriesRes.status >= 300) {
        this.sendVerificationResultToDevice({
          success: false,
          httpStatus: entriesRes.status,
          code: authCode(entriesRes.status),
          message: "Status HTTP " + entriesRes.status
        });
        return;
      }
      if (!Array.isArray(entriesRes.body) || entriesRes.body.length === 0) {
        throw new Error("Servidor respondeu, mas sem dados de glicose");
      }
      const detectedUnit = normalizeGlucoseUnit(data && data.settings && data.settings.units);
      if (detectedUnit) cachedServerUnit = detectedUnit;
      this.sendVerificationResultToDevice({
        success: true,
        httpStatus: 200,
        hasToken: Boolean(tokenToUse),
        unit: detectedUnit,
        serverInfo: {
          name: data && data.name ? data.name : "Nightscout Online",
          version: data && data.version ? data.version : "OK (200)",
          data: "ok"
        }
      });
    }).catch(error => {
      console.log("Verify error:", error);
      const status = error && error.status || error && error.httpStatus || null;
      this.sendVerificationResultToDevice({
        success: false,
        httpStatus: status,
        code: status ? authCode(status) : "errNetwork",
        message: error.message || "Falha ao conectar"
      });
    });
  },
  validateToken(apiUrl, apiToken) {
    const url = sanitizeUrl(apiUrl || configuredUrl);
    const tokenToUse = cleanToken(apiToken) || configuredToken;
    if (!tokenToUse) {
      this.sendTokenValidationResultToDevice({
        success: true,
        accessLevel: "none",
        message: "Acesso anonimo / sem token"
      });
      return;
    }
    const authHeaders = buildAuthHeaders(tokenToUse);
    const endpoint = withToken(`${url}${ADMIN_ENDPOINT}`, tokenToUse);
    this.request({
      method: "POST",
      url: endpoint,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders
      },
      body: JSON.stringify([ {
        eventType: "Note",
        notes: "verify"
      } ]),
      endpointType: "admin"
    }).then(response => {
      if (response.status < 200 || response.status >= 300) throw {
        httpStatus: response.status
      };
      this.sendTokenValidationResultToDevice({
        success: true,
        accessLevel: "admin",
        message: "Token de escrita (Admin)"
      });
    }).catch(error => {
      const status = error && error.httpStatus;
      if (status === 401 || status === 403) {
        this.sendTokenValidationResultToDevice({
          success: true,
          accessLevel: "readable",
          code: "authReadable",
          message: "Token somente leitura (Seguro)"
        });
        return;
      }
      this.sendTokenValidationResultToDevice({
        success: false,
        accessLevel: "unknown",
        code: status ? authCode(status) : "errAuth",
        message: status ? authMessage(status) : "Nao foi possivel validar o token; tente novamente"
      });
    });
  },
  parseNightscoutData(entries, isBackgroundCycle) {
    if (!entries || entries.length === 0) return null;
    const ordered = entries.slice().map(entry => ({
      ...entry,
      _timestamp: Number(entry.date || Date.parse(entry.dateString))
    })).filter(entry => isFinite(entry._timestamp) && isFinite(Number(entry.sgv))).sort((a, b) => b._timestamp - a._timestamp);
    if (!ordered.length) return null;
    const latest = ordered[0];
    const previous = ordered[1];
    let delta = 0;
    let deltaDisplay = "--";
    if (previous && latest.sgv && previous.sgv) {
      delta = latest.sgv - previous.sgv;
      deltaDisplay = (delta > 0 ? "+" : "") + delta;
    }
    const trendMap = {
      DoubleUp: "↑↑",
      DOUBLE_UP: "↑↑",
      DOUBLEUP: "↑↑",
      TripleUp: "↑↑↑",
      SingleUp: "↑",
      SINGLE_UP: "↑",
      FortyFiveUp: "↗",
      FORTY_FIVE_UP: "↗",
      Flat: "→",
      FLAT: "→",
      FortyFiveDown: "↘",
      FORTY_FIVE_DOWN: "↘",
      SingleDown: "↓",
      SINGLE_DOWN: "↓",
      DoubleDown: "↓↓",
      DOUBLE_DOWN: "↓↓",
      DOUBLEDOWN: "↓↓",
      TripleDown: "↓↓↓",
      "NOT COMPUTABLE": "-",
      "RATE OUT OF RANGE": "?"
    };
    const dirKey = latest.direction ? String(latest.direction).trim() : "";
    const trend = trendMap[dirKey] || trendMap[dirKey.toUpperCase()] || "→";
    const dataPoints = ordered.map(entry => entry.sgv || 0);
    const lastUpdate = this.formatTimeSince(latest._timestamp);
    const historyData = isBackgroundCycle ? [] : dataPoints.slice(0, DATA_POINTS_COUNT).reverse();
    return {
      readingTimestamp: latest._timestamp,
      currentBG: latest.sgv ? latest.sgv.toString() : "--",
      trend: trend,
      directionArrow: trend,
      direction: latest.direction,
      delta: deltaDisplay,
      deltaValue: delta,
      lastUpdate: lastUpdate,
      dataPoints: historyData
    };
  },
  formatTimeSince(timestamp) {
    try {
      const date = new Date(timestamp);
      const now = new Date;
      const diffMs = now - date;
      const diffMin = Math.floor(diffMs / 6e4);
      if (diffMin < 1) return "Agora";
      if (diffMin === 1) return "1 min atrás";
      if (diffMin < 60) return `${diffMin} min atrás`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour === 1) return "1 hora atrás";
      return `${diffHour} horas atrás`;
    } catch (error) {
      return "Desconhecido";
    }
  },
  sendToDeviceHelper(data) {
    if (typeof messaging === "undefined" || !messaging.peerSocket) {
      console.error("messaging.peerSocket not found");
      return;
    }
    trace("PHONE_RESPONSE_SEND", {
      currentBG: data.currentBG,
      cycle: data.backgroundCycle,
      error: data.error,
      keys: Object.keys(data)
    });
    const message = messageBuilder.response(data);
    const jsonStr = JSON.stringify(message);
    try {
      if (typeof Buffer !== "undefined") {
        const buf = Buffer.from(jsonStr, "utf-8");
        messaging.peerSocket.send(buf.buffer);
      } else {
        const buf = str2buf(jsonStr);
        messaging.peerSocket.send(buf);
      }
    } catch (err) {
      console.warn("Buffer send failed, fallback to raw send:", err.message);
      try {
        messaging.peerSocket.send(message);
      } catch (e2) {}
    }
  },
  sendDataToDevice(data) {
    this.sendToDeviceHelper(data);
  },
  sendVerificationResultToDevice(result) {
    this.sendToDeviceHelper({
      verification: true,
      ...result
    });
  },
  sendTokenValidationResultToDevice(result) {
    this.sendToDeviceHelper({
      tokenValidation: true,
      ...result
    });
  },
  sendErrorToDevice(errorMessage) {
    this.sendToDeviceHelper({
      error: true,
      message: errorMessage
    });
  },
  updateSettings(settings) {
    console.log("Updating settings:", settings);
    this.settings = settings;
  },
  request(options) {
    if (typeof fetch === "undefined") {
      return this.getSimulatedResponse(options);
    }
    const timeoutMs = options.timeout || 8e3;
    const originalUrl = String(options.url || "");
    const httpsUrl = originalUrl.replace(/^http:\/\//i, "https://");
    const started = Date.now();
    const fetchOptions = {
      url: httpsUrl,
      method: options.method || "GET",
      headers: options.headers || {},
      timeout: timeoutMs
    };
    if (options.body) {
      fetchOptions.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }
    trace("HTTP_START", {
      url: safeUrl(httpsUrl),
      endpoint: options.endpointType,
      method: fetchOptions.method
    });
    let timeoutTimer = null;
    const fetchPromise = fetch(fetchOptions).then(response => {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }
      trace("HTTP_RESULT", {
        status: response.status,
        durationMs: Date.now() - started,
        endpoint: options.endpointType,
        bodyType: typeof response.body,
        length: typeof response.body === "string" ? response.body.length : undefined
      });
      let body = response.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch (e) {}
      }
      return {
        body: body,
        status: response.status
      };
    });
    const timeoutPromise = new Promise((_, reject) => {
      timeoutTimer = setTimeout(() => {
        timeoutTimer = null;
        reject(new Error("Tempo limite (" + Math.round(timeoutMs / 1e3) + "s)"));
      }, timeoutMs);
    });
    return Promise.race([ fetchPromise, timeoutPromise ]).catch(error => {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }
      trace("HTTP_ERROR", {
        ...errorDetails(error),
        durationMs: Date.now() - started,
        endpoint: options.endpointType
      });
      throw error;
    });
  },
  getSimulatedResponse(options) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          body: [ {
            sgv: 115,
            direction: "Flat",
            date: Date.now() - 6e4,
            dateString: (new Date).toISOString()
          }, {
            sgv: 112,
            direction: "Flat",
            date: Date.now() - 36e4,
            dateString: (new Date).toISOString()
          } ]
        });
      }, 500);
    });
  }
});
