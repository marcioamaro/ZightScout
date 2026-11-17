import { Vibrator, VIBRATOR_SCENE_NOTIFICATION, VIBRATOR_SCENE_STRONG_REMINDER, VIBRATOR_SCENE_DURATION, VIBRATOR_SCENE_DURATION_LONG } from "@zos/sensor";

import { backgroundLog } from "./background-log";

let sharedVibrator = null;

export function getSharedVibrator() {
  if (!sharedVibrator) {
    try {
      if (typeof Vibrator !== "undefined") {
        sharedVibrator = new Vibrator;
      }
    } catch (e) {
      sharedVibrator = null;
    }
  }
  return sharedVibrator;
}

export function triggerVibration(levelOrMode, instance) {
  try {
    const v = instance || (typeof Vibrator !== "undefined" ? new Vibrator : null) || getSharedVibrator();
    if (!v) {
      backgroundLog("VIBRATOR_SKIPPED", {
        reason: "NO_VIBRATOR_CLASS"
      });
      return false;
    }
    const mode = typeof levelOrMode === "number" ? levelOrMode : levelOrMode === "critical" ? typeof VIBRATOR_SCENE_STRONG_REMINDER !== "undefined" ? VIBRATOR_SCENE_STRONG_REMINDER : 2 : typeof VIBRATOR_SCENE_NOTIFICATION !== "undefined" ? VIBRATOR_SCENE_NOTIFICATION : 1;
    try {
      if (typeof v.stop === "function") v.stop();
    } catch (e) {}
    let modeSet = false;
    if (typeof v.setMode === "function") {
      try {
        v.setMode({
          mode: mode
        });
        modeSet = true;
      } catch (e) {
        try {
          v.setMode(mode);
          modeSet = true;
        } catch (e2) {}
      }
    }
    if (!modeSet) {
      try {
        v.scene = mode;
      } catch (e) {}
    }
    backgroundLog("VIBRATION_START", {
      level: levelOrMode,
      mode: mode
    });
    try {
      v.start({
        mode: mode
      });
      backgroundLog("VIBRATION_STARTED", {
        level: levelOrMode,
        mode: mode
      });
      return true;
    } catch (eStart) {
      try {
        v.start();
        backgroundLog("VIBRATION_STARTED", {
          level: levelOrMode,
          mode: mode,
          fallback: true
        });
        return true;
      } catch (eFallback) {
        backgroundLog("VIBRATION_FAILED", {
          level: levelOrMode,
          error: String(eFallback)
        });
        return false;
      }
    }
  } catch (ve) {
    backgroundLog("VIBRATION_FAILED", {
      level: levelOrMode,
      error: String(ve)
    });
    return false;
  }
}
