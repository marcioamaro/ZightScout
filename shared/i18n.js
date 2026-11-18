import { getLanguage } from "@zos/settings";

import { getText as zosGetText } from "@zos/i18n";

let cachedLocale = null;

export function getSystemLocale() {
  if (cachedLocale) return cachedLocale;
  let raw = null;
  try {
    if (typeof getLanguage === "function") {
      raw = getLanguage();
    }
  } catch (e) {}
  if (raw === null || raw === undefined) {
    try {
      if (typeof hmSetting !== "undefined" && typeof hmSetting.getLanguage === "function") {
        raw = hmSetting.getLanguage();
      }
    } catch (e) {}
  }
  const NUMERIC_LOCALE_MAP = {
    0: "zh",
    1: "zh-TW",
    2: "en",
    3: "es",
    4: "ru",
    5: "ko",
    6: "fr",
    7: "de",
    8: "id",
    9: "pl",
    10: "it",
    11: "ja",
    12: "th",
    13: "ar",
    14: "vi",
    15: "pt-PT",
    16: "nl",
    17: "tr",
    18: "uk",
    19: "iw",
    20: "pt",
    21: "ro",
    22: "cs",
    23: "el",
    24: "sr",
    25: "ca",
    26: "fi",
    27: "nb",
    28: "da",
    29: "sv",
    30: "hu",
    31: "ms",
    32: "sk",
    33: "hi"
  };
  let loc = "pt";
  if (typeof raw === "number") {
    loc = NUMERIC_LOCALE_MAP[raw] || "pt";
  } else if (typeof raw === "string") {
    const s = raw.toLowerCase();
    if (s === "pt-pt" || s.startsWith("pt-pt")) loc = "pt-PT"; else if (s.startsWith("pt")) loc = "pt"; else if (s === "zh-tw" || s.startsWith("zh-tw") || s.startsWith("zh-hant")) loc = "zh-TW"; else if (s.startsWith("zh")) loc = "zh"; else if (s.startsWith("en")) loc = "en"; else if (s.startsWith("es")) loc = "es"; else if (s.startsWith("fr")) loc = "fr"; else if (s.startsWith("de")) loc = "de"; else if (s.startsWith("ja")) loc = "ja"; else if (s.startsWith("ko")) loc = "ko"; else if (s.startsWith("ar")) loc = "ar"; else if (s.startsWith("hi")) loc = "hi"; else if (s.startsWith("it")) loc = "it"; else if (s.startsWith("ru")) loc = "ru"; else if (s.startsWith("pl")) loc = "pl"; else if (s.startsWith("id")) loc = "id"; else if (s.startsWith("th")) loc = "th"; else if (s.startsWith("vi")) loc = "vi"; else if (s.startsWith("nl")) loc = "nl"; else if (s.startsWith("tr")) loc = "tr"; else if (s.startsWith("uk")) loc = "uk"; else if (s.startsWith("iw") || s.startsWith("he")) loc = "iw"; else if (s.startsWith("ro")) loc = "ro"; else if (s.startsWith("cs")) loc = "cs"; else if (s.startsWith("el")) loc = "el"; else if (s.startsWith("sr")) loc = "sr"; else if (s.startsWith("ca")) loc = "ca"; else if (s.startsWith("fi")) loc = "fi"; else if (s.startsWith("nb") || s.startsWith("no")) loc = "nb"; else if (s.startsWith("da")) loc = "da"; else if (s.startsWith("sv")) loc = "sv"; else if (s.startsWith("hu")) loc = "hu"; else if (s.startsWith("ms")) loc = "ms"; else if (s.startsWith("sk")) loc = "sk"; else loc = "pt";
  } else {
    loc = "pt";
  }
  cachedLocale = loc;
  return loc;
}

export function resetLocaleCache() {
  cachedLocale = null;
}

export function isRtlLanguage() {
  const loc = getSystemLocale();
  return loc === "ar" || loc.startsWith("ar") || loc === "iw" || loc === "he" || loc.startsWith("iw") || loc.startsWith("he");
}

const FALLBACK_STRINGS = {
  pt: {
    offlineBluetoothTitle: "⚠️ Bluetooth Desconectado",
    offlineBluetoothBody: "Bluetooth desconectado. Verifique a conexão com o relógio.",
    offlineAuthTitle: "⚠️ Falha de Autenticação",
    offlineAuthBody: "Falha de autenticação Nightscout. Verifique seu token.",
    offlineAccessTitle: "⚠️ Acesso Negado",
    offlineAccessBody: "O servidor Nightscout recusou o acesso.",
    offlineNotFoundTitle: "⚠️ Recurso Não Encontrado",
    offlineNotFoundBody: "Endereço ou recurso Nightscout não encontrado.",
    offlineServerTitle: "⚠️ Servidor Indisponível",
    offlineServerBody: "Servidor Nightscout indisponível. Não foi possível consultar os dados.",
    offlineTimeoutTitle: "⚠️ Tempo Esgotado",
    offlineTimeoutBody: "Tempo esgotado ao tentar acessar o Nightscout.",
    offlineNetworkTitle: "⚠️ Sem Comunicação",
    offlineNetworkBody: "Sem comunicação com a internet ou servidor Nightscout.",
    offlineUnknownTitle: "⚠️ Erro de Conexão",
    offlineUnknownBody: "Falha na comunicação com o Nightscout."
  },
  en: {
    offlineBluetoothTitle: "⚠️ Bluetooth Disconnected",
    offlineBluetoothBody: "Bluetooth disconnected. Check connection with your watch.",
    offlineAuthTitle: "⚠️ Authentication Failed",
    offlineAuthBody: "Nightscout authentication failed. Check your token.",
    offlineAccessTitle: "⚠️ Access Denied",
    offlineAccessBody: "Nightscout server denied access.",
    offlineNotFoundTitle: "⚠️ Not Found (404)",
    offlineNotFoundBody: "Nightscout URL or resource not found.",
    offlineServerTitle: "⚠️ Server Unavailable",
    offlineServerBody: "Nightscout server unavailable. Could not query glucose data.",
    offlineTimeoutTitle: "⚠️ Connection Timeout",
    offlineTimeoutBody: "Timed out while trying to reach Nightscout.",
    offlineNetworkTitle: "⚠️ Network Offline",
    offlineNetworkBody: "No communication with internet or Nightscout server.",
    offlineUnknownTitle: "⚠️ Connection Failed",
    offlineUnknownBody: "Communication with Nightscout failed."
  }
};

export function getText(key) {
  if (typeof zosGetText === "function") {
    try {
      const res = zosGetText(key);
      if (res !== undefined && res !== null && res !== "" && res !== key) {
        return res;
      }
    } catch (e) {}
  }
  const loc = getSystemLocale();
  const langKey = loc && loc.startsWith("pt") ? "pt" : "en";
  if (FALLBACK_STRINGS[langKey] && FALLBACK_STRINGS[langKey][key]) {
    return FALLBACK_STRINGS[langKey][key];
  }
  if (FALLBACK_STRINGS.en && FALLBACK_STRINGS.en[key]) {
    return FALLBACK_STRINGS.en[key];
  }
  return key;
}

export function t(key, params) {
  let val = getText(key);
  if (params && typeof params === "object" && typeof val === "string") {
    Object.keys(params).forEach(p => {
      val = val.replace(new RegExp("\\{" + p + "\\}", "g"), String(params[p]));
    });
  }
  return val;
}

export function formatReadingAge(timestamp) {
  if (!timestamp) return "";
  const date = Number(timestamp);
  if (!date || isNaN(date)) return "";
  const diffMs = Math.max(0, Date.now() - date);
  const diffMin = Math.floor(diffMs / 6e4);
  if (diffMin < 1) return t("ageNow");
  if (diffMin === 1) return t("age1Min");
  if (diffMin < 60) return t("ageXMin", {
    n: diffMin
  });
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour === 1) return t("age1Hour");
  return t("ageXHours", {
    n: diffHour
  });
}

export function formatAgeText(minutes) {
  if (minutes < 0) return t("noData");
  if (minutes === 0) return t("nowUpper");
  return minutes + " " + t("minWord");
}
