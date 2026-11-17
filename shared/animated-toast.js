import { createWidget, deleteWidget, widget, prop, align, anim_status } from "@zos/ui";

import { getDeviceInfo } from "@zos/device";

const STATUS_START = typeof anim_status !== "undefined" && anim_status && anim_status.START !== undefined ? anim_status.START : 1;

const STATUS_STOP = typeof anim_status !== "undefined" && anim_status && anim_status.STOP !== undefined ? anim_status.STOP : 0;

export class AnimatedToast {
  constructor() {
    this._widgets = [];
    this._timer = null;
    this._animWidget = null;
    this._onComplete = null;
    this._currentConfig = null;
    this._expiresAt = 0;
  }
  isShowing() {
    return Boolean(this._widgets && this._widgets.length > 0);
  }
  bringToFront() {
    if (!this.isShowing() || !this._currentConfig) return;
    const remaining = this._expiresAt > 0 ? Math.max(200, this._expiresAt - Date.now()) : 0;
    const config = {
      ...this._currentConfig,
      duration: remaining
    };
    this.show(config);
  }
  show({type: type = "hourglass", message: message = "", duration: duration = 2500, textColor: textColor = null, repeatCount: repeatCount = 0, onComplete: onComplete = null} = {}) {
    this.hide();
    this._currentConfig = {
      type: type,
      message: message,
      duration: duration,
      textColor: textColor,
      repeatCount: repeatCount,
      onComplete: onComplete
    };
    this._expiresAt = duration > 0 ? Date.now() + duration : 0;
    let dev = null;
    try {
      dev = getDeviceInfo();
    } catch (e) {
      if (typeof hmSetting !== "undefined" && typeof hmSetting.getDeviceInfo === "function") {
        dev = hmSetting.getDeviceInfo();
      }
    }
    const W = dev && dev.width || 466;
    const H = dev && dev.height || 466;
    const CX = Math.floor(W / 2);
    const CY = Math.floor(H / 2);
    const cardW = Math.min(270, Math.floor(W * .82));
    const cardH = 144;
    const cardX = CX - Math.floor(cardW / 2);
    const cardY = CY - Math.floor(cardH / 2);
    try {
      const bg = createWidget(widget.FILL_RECT, {
        x: cardX,
        y: cardY,
        w: cardW,
        h: cardH,
        radius: 18,
        color: 1579032
      });
      this._widgets.push(bg);
      const animSize = 64;
      const animX = CX - Math.floor(animSize / 2);
      const animY = cardY + 12;
      let animPrefix = "hourglass";
      let animFrames = 25;
      let defaultTextColor = 58879;
      if (type === "check") {
        animPrefix = "check";
        animFrames = 24;
        defaultTextColor = 58998;
      } else if (type === "cloud") {
        animPrefix = "cloud";
        animFrames = 28;
        defaultTextColor = 58998;
      } else if (type === "warning") {
        animPrefix = "warning";
        animFrames = 28;
        defaultTextColor = 16729156;
      } else if (type === "bell") {
        animPrefix = "bell";
        animFrames = 28;
        defaultTextColor = 16777215;
      } else if (type === "bell_off") {
        animPrefix = "bell_off";
        animFrames = 28;
        defaultTextColor = 16777215;
      }
      const animRepeat = typeof repeatCount === "number" ? repeatCount : 0;
      this._animWidget = createWidget(widget.IMG_ANIM, {
        x: animX,
        y: animY,
        anim_path: "anim",
        anim_prefix: animPrefix,
        anim_ext: "png",
        anim_fps: 24,
        anim_size: animFrames,
        repeat_count: animRepeat,
        anim_status: STATUS_START
      });
      this._widgets.push(this._animWidget);
      try {
        this._animWidget.setProperty(prop.ANIM_STATUS, STATUS_START);
      } catch (e) {}
      const finalColor = textColor !== null && textColor !== undefined ? textColor : defaultTextColor;
      const fontSize = message && message.length > 20 ? 16 : 18;
      const label = createWidget(widget.TEXT, {
        x: cardX + 8,
        y: animY + animSize + 6,
        w: cardW - 16,
        h: 44,
        text: message,
        color: finalColor,
        text_size: fontSize,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V
      });
      this._widgets.push(label);
      this._onComplete = onComplete;
      if (duration > 0) {
        this._timer = setTimeout(() => {
          this.hide(true);
        }, duration);
      }
    } catch (err) {
      console.log("[ANIM_TOAST] Error creating animated toast: " + (err && err.message ? err.message : err));
    }
  }
  hide(triggerCallback = false) {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    if (this._animWidget) {
      try {
        this._animWidget.setProperty(prop.ANIM_STATUS, STATUS_STOP);
      } catch (e) {}
      this._animWidget = null;
    }
    if (this._widgets && this._widgets.length > 0) {
      for (let i = 0; i < this._widgets.length; i++) {
        try {
          deleteWidget(this._widgets[i]);
        } catch (e) {}
      }
      this._widgets = [];
    }
    const cb = this._onComplete;
    this._onComplete = null;
    this._currentConfig = null;
    this._expiresAt = 0;
    if (triggerCallback && typeof cb === "function") {
      try {
        cb();
      } catch (e) {
        console.log("[ANIM_TOAST] onComplete error: " + (e && e.message ? e.message : e));
      }
    }
  }
}
