import { trace, safeUrl } from "./debug";

import { localStorage } from "./storage";

import { backgroundLog } from "./background-log";

import { t } from "./i18n";

import { CONVERSION_FACTOR, snapMgdlThreshold } from "./glucose-unit";

export { CONVERSION_FACTOR, snapMgdlThreshold };

export const NIGHTSCOUT_URL = "";

export const DEFAULT_PRESET_URL = "";

export const DEFAULT_SETTINGS_MGDL = {
  veryLow: 65,
  low: 85,
  high: 120,
  veryHigh: 185
};

export const DEFAULT_SETTINGS_MMOL = {
  veryLow: 3.6,
  low: 4.7,
  high: 6.7,
  veryHigh: 10.3
};

export const DEFAULT_SETTINGS = {
  version: 1,
  veryLow: 65,
  low: 85,
  high: 120,
  veryHigh: 185,
  outOfRangeVibration: true,
  criticalVibration: true,
  notificationSound: true,
  backgroundInterval: 5,
  unit: "mg/dL",
  apiUrl: "",
  tokenConfigured: false
};

const STORAGE_KEY = "zightscout_settings";

export const VERIFIED_URL_KEY = "zightscout_last_verified_url";

const VALID_INTERVALS = [ 0, 5, 10, 30, 60 ];

function asNumber(value, fallback, isMmol = false) {
  const number = parseFloat(value);
  if (isNaN(number) || !isFinite(number)) return fallback;
  return isMmol ? Number(number.toFixed(1)) : Math.round(number);
}

function asBoolean(value, fallback) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return fallback;
}

export function convertSettingsUnit(settings, targetUnit) {
  const normUnit = targetUnit === "mmol/L" ? "mmol/L" : "mg/dL";
  const s = {
    ...settings || DEFAULT_SETTINGS,
    unit: normUnit
  };
  const prevUnit = settings && settings.unit === "mmol/L" ? "mmol/L" : "mg/dL";
  const vh = parseFloat(settings && settings.veryHigh);
  const needsConvert = normUnit === "mmol/L" && vh >= 30 || normUnit === "mg/dL" && vh < 30 && !isNaN(vh);
  if (normUnit === prevUnit && !needsConvert) {
    if (normUnit === "mg/dL") {
      let vl = snapMgdlThreshold(s.veryLow, DEFAULT_SETTINGS_MGDL.veryLow);
      let l = snapMgdlThreshold(s.low, DEFAULT_SETTINGS_MGDL.low);
      let h = snapMgdlThreshold(s.high, DEFAULT_SETTINGS_MGDL.high);
      let vhVal = snapMgdlThreshold(s.veryHigh, DEFAULT_SETTINGS_MGDL.veryHigh);
      if (vl + 5 <= l && l + 5 <= h && h + 5 <= vhVal && vl >= 20 && vhVal <= 500) {
        s.veryLow = vl;
        s.low = l;
        s.high = h;
        s.veryHigh = vhVal;
      } else {
        s.veryLow = DEFAULT_SETTINGS_MGDL.veryLow;
        s.low = DEFAULT_SETTINGS_MGDL.low;
        s.high = DEFAULT_SETTINGS_MGDL.high;
        s.veryHigh = DEFAULT_SETTINGS_MGDL.veryHigh;
      }
    }
    return s;
  }
  if (normUnit === "mmol/L") {
    let vl = parseFloat(settings && settings.veryLow);
    let l = parseFloat(settings && settings.low);
    let h = parseFloat(settings && settings.high);
    let vh = parseFloat(settings && settings.veryHigh);
    if (vh < 30 && vl < l && l < h && h < vh && vl >= 2 && vh <= 25) {
      s.veryLow = Number(vl.toFixed(1));
      s.low = Number(l.toFixed(1));
      s.high = Number(h.toFixed(1));
      s.veryHigh = Number(vh.toFixed(1));
    } else if (vh >= 30) {
      vl = Number((vl / CONVERSION_FACTOR).toFixed(1));
      l = Number((l / CONVERSION_FACTOR).toFixed(1));
      h = Number((h / CONVERSION_FACTOR).toFixed(1));
      vh = Number((vh / CONVERSION_FACTOR).toFixed(1));
      if (vl >= 2 && vh <= 25 && vl < l && l < h && h < vh) {
        s.veryLow = vl;
        s.low = l;
        s.high = h;
        s.veryHigh = vh;
      } else {
        s.veryLow = DEFAULT_SETTINGS_MMOL.veryLow;
        s.low = DEFAULT_SETTINGS_MMOL.low;
        s.high = DEFAULT_SETTINGS_MMOL.high;
        s.veryHigh = DEFAULT_SETTINGS_MMOL.veryHigh;
      }
    } else {
      s.veryLow = DEFAULT_SETTINGS_MMOL.veryLow;
      s.low = DEFAULT_SETTINGS_MMOL.low;
      s.high = DEFAULT_SETTINGS_MMOL.high;
      s.veryHigh = DEFAULT_SETTINGS_MMOL.veryHigh;
    }
  } else {
    let vl = parseFloat(settings && settings.veryLow);
    let l = parseFloat(settings && settings.low);
    let h = parseFloat(settings && settings.high);
    let vh = parseFloat(settings && settings.veryHigh);
    if (vh >= 30 && vl < l && l < h && h < vh && vl >= 20 && vh <= 500) {
      vl = snapMgdlThreshold(vl, DEFAULT_SETTINGS_MGDL.veryLow);
      l = snapMgdlThreshold(l, DEFAULT_SETTINGS_MGDL.low);
      h = snapMgdlThreshold(h, DEFAULT_SETTINGS_MGDL.high);
      vh = snapMgdlThreshold(vh, DEFAULT_SETTINGS_MGDL.veryHigh);
      if (vl + 5 <= l && l + 5 <= h && h + 5 <= vh && vl >= 20 && vh <= 500) {
        s.veryLow = vl;
        s.low = l;
        s.high = h;
        s.veryHigh = vh;
      } else {
        s.veryLow = DEFAULT_SETTINGS_MGDL.veryLow;
        s.low = DEFAULT_SETTINGS_MGDL.low;
        s.high = DEFAULT_SETTINGS_MGDL.high;
        s.veryHigh = DEFAULT_SETTINGS_MGDL.veryHigh;
      }
    } else if (vh < 30) {
      vl = snapMgdlThreshold(vl * CONVERSION_FACTOR, DEFAULT_SETTINGS_MGDL.veryLow);
      l = snapMgdlThreshold(l * CONVERSION_FACTOR, DEFAULT_SETTINGS_MGDL.low);
      h = snapMgdlThreshold(h * CONVERSION_FACTOR, DEFAULT_SETTINGS_MGDL.high);
      vh = snapMgdlThreshold(vh * CONVERSION_FACTOR, DEFAULT_SETTINGS_MGDL.veryHigh);
      if (vl >= 20 && vh <= 500 && vl + 5 <= l && l + 5 <= h && h + 5 <= vh) {
        s.veryLow = vl;
        s.low = l;
        s.high = h;
        s.veryHigh = vh;
      } else {
        s.veryLow = DEFAULT_SETTINGS_MGDL.veryLow;
        s.low = DEFAULT_SETTINGS_MGDL.low;
        s.high = DEFAULT_SETTINGS_MGDL.high;
        s.veryHigh = DEFAULT_SETTINGS_MGDL.veryHigh;
      }
    } else {
      s.veryLow = DEFAULT_SETTINGS_MGDL.veryLow;
      s.low = DEFAULT_SETTINGS_MGDL.low;
      s.high = DEFAULT_SETTINGS_MGDL.high;
      s.veryHigh = DEFAULT_SETTINGS_MGDL.veryHigh;
    }
  }
  return s;
}

export function validateSettings(settings) {
  const candidate = settings || {};
  return getSettingsValidationError(candidate) === null;
}

export function getSettingsValidationError(settings) {
  const candidate = settings || {};
  const isMmol = candidate.unit === "mmol/L";
  const vl = parseFloat(candidate.veryLow);
  const l = parseFloat(candidate.low);
  const h = parseFloat(candidate.high);
  const vh = parseFloat(candidate.veryHigh);
  if (isNaN(vl) || isNaN(l) || isNaN(h) || isNaN(vh)) {
    return "threshold_nan";
  }
  if (isMmol) {
    if (!(vl < l && l < h && h < vh)) {
      return "threshold_order";
    }
    if (vl < 1 || vh > 30) return "threshold_range";
  } else {
    if (Math.round(vl) !== vl || Math.round(l) !== l || Math.round(h) !== h || Math.round(vh) !== vh || vl % 5 !== 0 || l % 5 !== 0 || h % 5 !== 0 || vh % 5 !== 0) {
      return "threshold_multiple_of_5";
    }
    if (!(vl + 5 <= l && l + 5 <= h && h + 5 <= vh)) {
      return "threshold_order";
    }
    if (vl < 20 || vh > 500) return "threshold_range";
  }
  if (VALID_INTERVALS.indexOf(candidate.backgroundInterval) === -1) {
    return "background_interval";
  }
  if (candidate.unit !== "mg/dL" && candidate.unit !== "mmol/L") return "unit";
  return null;
}

export function formatSettings(settings) {
  const candidate = settings || {};
  return "thresholds=" + candidate.veryLow + "/" + candidate.low + "/" + candidate.high + "/" + candidate.veryHigh + " vibration=" + (candidate.outOfRangeVibration ? "out" : "none") + "/" + (candidate.criticalVibration ? "critical" : "none") + " interval=" + candidate.backgroundInterval + "m unit=" + candidate.unit + " token=" + (candidate.tokenConfigured ? "configured" : "none");
}

function normalizeSettings(raw) {
  let obj = raw || {};
  let normUnit = obj.unit === "mmol/L" ? "mmol/L" : "mg/dL";
  const vh = parseFloat(obj.veryHigh !== undefined ? obj.veryHigh : obj.highCritical);
  if (normUnit === "mmol/L" && vh >= 30) {
    obj = convertSettingsUnit(obj, "mmol/L");
  } else if (normUnit === "mg/dL" && vh < 30 && !isNaN(vh)) {
    obj = convertSettingsUnit(obj, "mg/dL");
  }
  const isMmol = normUnit === "mmol/L";
  const defaults = isMmol ? DEFAULT_SETTINGS_MMOL : DEFAULT_SETTINGS_MGDL;
  let vl, l, h, vhVal;
  if (isMmol) {
    vl = asNumber(obj.veryLow !== undefined ? obj.veryLow : obj.lowCritical, defaults.veryLow, true);
    l = asNumber(obj.low !== undefined ? obj.low : obj.lowWarn, defaults.low, true);
    h = asNumber(obj.high !== undefined ? obj.high : obj.highWarn, defaults.high, true);
    vhVal = asNumber(obj.veryHigh !== undefined ? obj.veryHigh : obj.highCritical, defaults.veryHigh, true);
    if (!(vl < l && l < h && h < vhVal)) {
      vl = defaults.veryLow;
      l = defaults.low;
      h = defaults.high;
      vhVal = defaults.veryHigh;
    }
  } else {
    vl = snapMgdlThreshold(obj.veryLow !== undefined ? obj.veryLow : obj.lowCritical, defaults.veryLow);
    l = snapMgdlThreshold(obj.low !== undefined ? obj.low : obj.lowWarn, defaults.low);
    h = snapMgdlThreshold(obj.high !== undefined ? obj.high : obj.highWarn, defaults.high);
    vhVal = snapMgdlThreshold(obj.veryHigh !== undefined ? obj.veryHigh : obj.highCritical, defaults.veryHigh);
    if (!(vl + 5 <= l && l + 5 <= h && h + 5 <= vhVal)) {
      vl = defaults.veryLow;
      l = defaults.low;
      h = defaults.high;
      vhVal = defaults.veryHigh;
    }
  }
  const settings = {
    version: 1,
    veryLow: vl,
    low: l,
    high: h,
    veryHigh: vhVal,
    outOfRangeVibration: asBoolean(obj.outOfRangeVibration !== undefined ? obj.outOfRangeVibration : obj.vibrateYellow, DEFAULT_SETTINGS.outOfRangeVibration),
    criticalVibration: asBoolean(obj.criticalVibration !== undefined ? obj.criticalVibration : obj.vibrateRed, DEFAULT_SETTINGS.criticalVibration),
    notificationSound: asBoolean(obj.notificationSound, DEFAULT_SETTINGS.notificationSound),
    backgroundInterval: asNumber(obj.backgroundInterval !== undefined ? obj.backgroundInterval : obj.bgInterval, DEFAULT_SETTINGS.backgroundInterval, false),
    unit: normUnit,
    apiUrl: typeof obj.apiUrl === "string" ? obj.apiUrl.trim().replace(/\/+$/, "") : String(localStorage.getItem(VERIFIED_URL_KEY) || ""),
    tokenConfigured: asBoolean(obj.tokenConfigured, DEFAULT_SETTINGS.tokenConfigured)
  };
  if (!validateSettings(settings)) {
    return {
      ...DEFAULT_SETTINGS,
      ...defaults,
      unit: normUnit,
      apiUrl: settings.apiUrl
    };
  }
  return settings;
}

export function markUrlVerified(rawUrl) {
  const url = resolveUrlInput(rawUrl);
  if (!url) return "";
  localStorage.setItem(VERIFIED_URL_KEY, url);
  return url;
}

export function extractTokenFromUrl(raw) {
  const value = raw === undefined || raw === null ? "" : String(raw).trim();
  if (!value) return {
    url: "",
    token: ""
  };
  const tokenMatch = /[?&]token=([^&#\s]+)/i.exec(value);
  const token = tokenMatch ? decodeURIComponent(tokenMatch[1]).trim() : "";
  let cleanUrl = value;
  if (tokenMatch) {
    cleanUrl = value.replace(/[?&]token=[^&#\s]*/i, "").replace(/\?&/, "?").replace(/[?&]$/, "");
  }
  return {
    url: resolveUrlInput(cleanUrl),
    token: token
  };
}

export function resolveUrlInput(raw) {
  const value = raw === undefined || raw === null ? "" : String(raw).trim();
  if (!value) return "";
  let url = value.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  if (!/^https?:\/\/([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:[\/?#].*)?$/i.test(url)) return "";
  return url;
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
      const settings = normalizeSettings(obj);
      console.log("[ZIGHTSCOUT][STORAGE] LOAD source=storage " + formatSettings(settings));
      trace("SETTINGS_LOADED", {
        settings: {
          ...settings,
          apiUrl: safeUrl(settings.apiUrl)
        }
      });
      return settings;
    }
  } catch (e) {
    console.log("[ZIGHTSCOUT][STORAGE] LOAD result=error reason=" + (e && e.message ? e.message : e));
  }
  const fallback = normalizeSettings({});
  console.log("[ZIGHTSCOUT][STORAGE] LOAD source=defaults " + formatSettings(fallback));
  return fallback;
}

export function saveSettings(settings) {
  try {
    const existingRaw = localStorage.getItem(STORAGE_KEY);
    let existing = {};
    try {
      existing = typeof existingRaw === "string" ? JSON.parse(existingRaw) : existingRaw || {};
    } catch (e) {}
    let target = {
      ...existing,
      ...settings || {}
    };
    if (settings && settings.unit) {
      const newUnit = settings.unit === "mmol/L" ? "mmol/L" : "mg/dL";
      const prevUnit = existing && existing.unit === "mmol/L" ? "mmol/L" : "mg/dL";
      const vh = parseFloat(target.veryHigh);
      if (newUnit !== prevUnit || newUnit === "mmol/L" && vh >= 30 || newUnit === "mg/dL" && vh < 30 && !isNaN(vh)) {
        target = convertSettingsUnit(target, newUnit);
      }
    }
    if (target && target.veryLow !== undefined) {
      const isMmol = target.unit === "mmol/L";
      let vl = isMmol ? asNumber(target.veryLow, NaN, true) : snapMgdlThreshold(target.veryLow, NaN);
      let l = isMmol ? asNumber(target.low, NaN, true) : snapMgdlThreshold(target.low, NaN);
      let h = isMmol ? asNumber(target.high, NaN, true) : snapMgdlThreshold(target.high, NaN);
      let vh = isMmol ? asNumber(target.veryHigh, NaN, true) : snapMgdlThreshold(target.veryHigh, NaN);
      const candidate = {
        veryLow: vl,
        low: l,
        high: h,
        veryHigh: vh,
        backgroundInterval: asNumber(target.backgroundInterval, NaN, false),
        unit: target.unit
      };
      const candidateError = getSettingsValidationError(candidate);
      if (candidateError) {
        console.log("[ZIGHTSCOUT][STORAGE] SAVE result=rejected reason=" + candidateError + " " + formatSettings(target));
        return false;
      }
      target.veryLow = candidate.veryLow;
      target.low = candidate.low;
      target.high = candidate.high;
      target.veryHigh = candidate.veryHigh;
    }
    if (settings && Object.prototype.hasOwnProperty.call(settings, "apiUrl") && !String(settings.apiUrl || "").trim()) {
      target.apiUrl = "";
      localStorage.removeItem(VERIFIED_URL_KEY);
    }
    const normalized = normalizeSettings(target);
    const normalizedError = getSettingsValidationError(normalized);
    if (normalizedError) {
      console.log("[ZIGHTSCOUT][STORAGE] SAVE result=rejected reason=" + normalizedError);
      return false;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    const stored = localStorage.getItem(STORAGE_KEY);
    const saved = stored ? normalizeSettings(typeof stored === "string" ? JSON.parse(stored) : stored) : null;
    const verified = saved && JSON.stringify(saved) === JSON.stringify(normalized);
    console.log("[ZIGHTSCOUT][STORAGE] SAVE result=" + (verified ? "verified" : "failed") + " " + formatSettings(normalized));
    backgroundLog("SETTINGS_SAVED", {
      verified: !!verified,
      settings: {
        veryLow: normalized.veryLow,
        low: normalized.low,
        high: normalized.high,
        veryHigh: normalized.veryHigh,
        backgroundInterval: normalized.backgroundInterval,
        outOfRangeVibration: normalized.outOfRangeVibration,
        criticalVibration: normalized.criticalVibration,
        unit: normalized.unit,
        urlConfigured: !!normalized.apiUrl
      }
    });
    trace("SETTINGS_VERIFIED", {
      verified: !!verified,
      settings: {
        ...normalized,
        apiUrl: safeUrl(normalized.apiUrl)
      }
    });
    return verified;
  } catch (e) {
    console.log("[ZIGHTSCOUT][STORAGE] SAVE result=error reason=" + (e && e.message ? e.message : e));
    return false;
  }
}

export function evaluateGlucoseLevel(value, settings) {
  const v = parseFloat(value);
  if (isNaN(v)) return "normal";
  const cfg = settings || DEFAULT_SETTINGS;
  const isMmol = cfg.unit === "mmol/L";
  const defaults = isMmol ? DEFAULT_SETTINGS_MMOL : DEFAULT_SETTINGS_MGDL;
  let lowCrit = parseFloat(cfg.veryLow);
  let lowW = parseFloat(cfg.low);
  let highW = parseFloat(cfg.high);
  let highCrit = parseFloat(cfg.veryHigh);
  if (isNaN(lowCrit)) lowCrit = defaults.veryLow;
  if (isNaN(lowW)) lowW = defaults.low;
  if (isNaN(highW)) highW = defaults.high;
  if (isNaN(highCrit)) highCrit = defaults.veryHigh;
  let testVal = v;
  let testLowCrit = lowCrit;
  let testLowW = lowW;
  let testHighW = highW;
  let testHighCrit = highCrit;
  if (v >= 35 && testHighCrit < 30) {
    testLowCrit = testLowCrit * CONVERSION_FACTOR;
    testLowW = testLowW * CONVERSION_FACTOR;
    testHighW = testHighW * CONVERSION_FACTOR;
    testHighCrit = testHighCrit * CONVERSION_FACTOR;
  } else if (v < 35 && testHighCrit >= 30) {
    testVal = testVal * CONVERSION_FACTOR;
  }
  if (testVal < testLowCrit || testVal > testHighCrit) return "critical";
  if (testVal < testLowW || testVal > testHighW) return "warning";
  return "normal";
}

export function getBGColor(value, settings) {
  const v = parseFloat(value);
  if (isNaN(v)) return 16777215;
  const level = evaluateGlucoseLevel(v, settings);
  if (level === "critical") return 16724787;
  if (level === "warning") return 16755200;
  return 52326;
}

export function getBGStatus(value, settings) {
  const v = parseFloat(value);
  if (isNaN(v)) return t("stable");
  const cfg = settings || DEFAULT_SETTINGS;
  const isMmol = cfg.unit === "mmol/L";
  const defaults = isMmol ? DEFAULT_SETTINGS_MMOL : DEFAULT_SETTINGS_MGDL;
  let lowCrit = parseFloat(cfg.veryLow);
  let lowW = parseFloat(cfg.low);
  let highW = parseFloat(cfg.high);
  let highCrit = parseFloat(cfg.veryHigh);
  if (isNaN(lowCrit)) lowCrit = defaults.veryLow;
  if (isNaN(lowW)) lowW = defaults.low;
  if (isNaN(highW)) highW = defaults.high;
  if (isNaN(highCrit)) highCrit = defaults.veryHigh;
  let testVal = v;
  let testLowCrit = lowCrit;
  let testLowW = lowW;
  let testHighW = highW;
  let testHighCrit = highCrit;
  if (v >= 35 && testHighCrit < 30) {
    testLowCrit = testLowCrit * CONVERSION_FACTOR;
    testLowW = testLowW * CONVERSION_FACTOR;
    testHighW = testHighW * CONVERSION_FACTOR;
    testHighCrit = testHighCrit * CONVERSION_FACTOR;
  } else if (v < 35 && testHighCrit >= 30) {
    testVal = testVal * CONVERSION_FACTOR;
  }
  if (testVal < testLowCrit) return t("veryLow");
  if (testVal < testLowW) return t("low");
  if (testVal <= testHighW) return t("inRange");
  if (testVal <= testHighCrit) return t("high");
  return t("veryHigh");
}
