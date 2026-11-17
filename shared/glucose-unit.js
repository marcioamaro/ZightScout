export const CONVERSION_FACTOR = 18.0156;

export function normalizeGlucoseUnit(value) {
  const unit = String(value || "").trim().toLowerCase().replace(/\s/g, "");
  if (unit === "mmol" || unit === "mmol/l" || unit === "mmolperlitre" || unit === "mmolperl") return "mmol/L";
  if (unit === "mg/dl" || unit === "mgdl" || unit === "mgperdl") return "mg/dL";
  return null;
}

export function snapMgdlThreshold(value, fallback = 65) {
  const number = parseFloat(value);
  if (isNaN(number) || !isFinite(number)) return fallback;
  return Math.round(number / 5) * 5;
}

export function mgdlToMmol(mgdl) {
  const numeric = typeof mgdl === "number" ? mgdl : Number(mgdl);
  if (!isFinite(numeric) || isNaN(numeric)) return NaN;
  return numeric / CONVERSION_FACTOR;
}

export function mmolToMgdl(mmol) {
  const numeric = typeof mmol === "number" ? mmol : Number(mmol);
  if (!isFinite(numeric) || isNaN(numeric)) return NaN;
  return snapMgdlThreshold(numeric * CONVERSION_FACTOR);
}

export function formatGlucose(sgv, units) {
  const numeric = typeof sgv === "number" ? sgv : Number(sgv);
  if (!isFinite(numeric) || isNaN(numeric) || sgv === null || sgv === undefined || sgv === "" || sgv === "--") {
    return "--";
  }
  const normalizedUnit = (units || "mg/dl").toLowerCase();
  if (normalizedUnit.includes("mmol")) {
    const mmolValue = numeric / CONVERSION_FACTOR;
    return mmolValue.toFixed(1);
  }
  return Math.round(numeric).toString();
}

export function formatDelta(delta, units) {
  if (delta === undefined || delta === null || delta === "" || delta === "--") {
    return "--";
  }
  const numeric = typeof delta === "number" ? delta : Number(String(delta).replace(/[^\d.-]/g, ""));
  if (!isFinite(numeric) || isNaN(numeric)) {
    return String(delta);
  }
  const normalizedUnit = (units || "mg/dl").toLowerCase();
  if (normalizedUnit.includes("mmol")) {
    const isPreConverted = typeof delta === "number" && !Number.isInteger(delta) || typeof delta === "string" && delta.includes(".");
    const inMmol = isPreConverted ? numeric : numeric / CONVERSION_FACTOR;
    const rounded = Number(inMmol.toFixed(1));
    if (rounded === 0) return "0.0 mmol/L";
    const sign = rounded > 0 ? "+" : "";
    return sign + rounded.toFixed(1) + " mmol/L";
  } else {
    const rounded = Math.round(numeric);
    if (rounded === 0) return "0 mg/dL";
    const sign = rounded > 0 ? "+" : "";
    return sign + rounded + " mg/dL";
  }
}
