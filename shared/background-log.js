import { localStorage } from "./storage";

let logForwarder = null;

let inForward = false;

export function setLogForwarder(fn) {
  logForwarder = fn;
}

export function backgroundLog(event, details) {
  const entry = {
    timestamp: Date.now(),
    event: event,
    ...details || {}
  };
  console.log("[ZIGHTSCOUT][BG] " + JSON.stringify(entry));
  try {
    let entries = JSON.parse(localStorage.getItem("zightscout_background_log") || "[]");
    if (!Array.isArray(entries)) entries = [];
    entries.push(entry);
    localStorage.setItem("zightscout_background_log", JSON.stringify(entries.slice(-50)));
  } catch (e) {
    console.log("[BG] Debug log storage failed");
  }
  if (logForwarder && !inForward) {
    inForward = true;
    try {
      logForwarder(event, details);
    } catch (err) {}
    inForward = false;
  }
}
