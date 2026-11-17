if (typeof console !== "undefined") {
  if (typeof console.error !== "function") console.error = console.log;
  if (typeof console.warn !== "function") console.warn = console.log;
}

import { trace, setDebugContext, errorDetails } from "../shared/debug";

import * as ble from "../shared/page-ble";

import { syncBackground } from "../shared/page-ble";

import { createWidget, deleteWidget, widget, prop, align, createKeyboard, deleteKeyboard, inputType } from "@zos/ui";

import { back, push } from "@zos/router";

import { Vibrator, VIBRATOR_SCENE_NOTIFICATION, VIBRATOR_SCENE_STRONG_REMINDER } from "@zos/sensor";

import { showToast } from "@zos/interaction";

import { queryPermission, requestPermission } from "@zos/app";

import { loadSettings, saveSettings, validateSettings, formatSettings, NIGHTSCOUT_URL, resolveUrlInput, extractTokenFromUrl, markUrlVerified, VERIFIED_URL_KEY, DEFAULT_SETTINGS_MMOL, DEFAULT_SETTINGS_MGDL, convertSettingsUnit } from "../shared/settings";

import { getLayout } from "../shared/layout";

import { localStorage } from "../shared/storage";

import { getSnoozeUntil, setAlertSnooze, clearAlertSnooze } from "../shared/background-alert";

import { testAlertNotification } from "../shared/test-alert";

import { getConnectionStatus } from "../shared/connection-status";

import { t } from "../shared/i18n";

import { formatGlucose, normalizeGlucoseUnit } from "../shared/glucose-unit";

import { AnimatedToast } from "../shared/animated-toast";

const APP_ID = 1127420;

const layout = getLayout();

const W = layout.W;

const H = layout.H;

const CX = layout.CX;

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

Page({
  state: {
    layout: layout,
    appSidePort: 0,
    currentTab: 0,
    settings: {},
    tabWidgets: [],
    thresholdTextWidgets: {},
    widgets: {},
    vibrator: null,
    pendingVerification: false,
    verificationPending: false,
    testingUrl: "",
    unitPrompt: false,
    snoozeSyncTimer: null,
    lastSnoozeUntil: 0
  },
  handleNotificationAction(params) {
    try {
      let raw = "";
      if (typeof params === "string") raw = params; else if (params && typeof params === "object") raw = params.param ? String(params.param) : JSON.stringify(params);
      const match = /(?:action=snooze|"action":"snooze").*?(?:minutes=(\d+)|"minutes":(\d+))/.exec(raw) || /(?:minutes=(\d+)|"minutes":(\d+)).*?(?:action=snooze|"action":"snooze")/.exec(raw);
      if (match) {
        const mins = Number(match[1] || match[2]);
        if (mins === 15 || mins === 30 || mins === 60) {
          setAlertSnooze(mins);
          const snoozeMsg = t("snoozeToast", {
            minutes: mins
          });
          if (!this._animatedToast) this._animatedToast = new AnimatedToast;
          if (this._animatedToast) {
            this._animatedToast.show({
              type: "bell_off",
              message: snoozeMsg,
              duration: 2e3,
              textColor: 16777215
            });
          } else {
            showToast({
              content: snoozeMsg
            });
          }
          return true;
        }
      }
    } catch (e) {
      console.log("Error handling snooze param:", e);
    }
    return false;
  },
  onInit(params) {
    this._animatedToast = new AnimatedToast;
    const raw = typeof params === "string" ? params : params && params.param ? String(params.param) : JSON.stringify(params || "");
    if (raw.indexOf("tab=server") !== -1) this.state.currentTab = 2;
    if (raw.indexOf("tab=alerts") !== -1) this.state.currentTab = 1;
    this.handleNotificationAction(params);
    setDebugContext("settings");
    trace("LIFECYCLE_INIT");
    console.log("[ZIGHTSCOUT][SETTINGS] OPEN screen=page2");
    this.state.layout = getLayout();
    this.state.settings = loadSettings();
    const storedPort = Number(localStorage.getItem("zightscout_ble_port"));
    if (storedPort > 0 && storedPort <= 65535) this.state.appSidePort = storedPort;
    this.state.connectionStatus = getConnectionStatus(this.state.settings);
    console.log("[ZIGHTSCOUT][SETTINGS] OPEN loaded " + formatSettings(this.state.settings));
    try {
      this.state.vibrator = new Vibrator;
    } catch (e) {
      console.log("Vibrator init error:", e);
    }
  },
  build() {
    console.log("[ZIGHTSCOUT][SETTINGS] UI build tab=thresholds");
    this.createHeader();
    this.renderCurrentTab();
    this.initCommunication();
    this.startSnoozeSync();
  },
  persistDraftSettings() {
    if (!validateSettings(this.state.settings)) return false;
    const saved = saveSettings(this.state.settings);
    if (saved) syncBackground(this.state.settings);
    console.log("[ZIGHTSCOUT][SETTINGS] CHANGE persisted=" + saved + " " + formatSettings(this.state.settings));
    return saved;
  },
  createHeader() {
    const l = this.state.layout || getLayout();
    createWidget(widget.TEXT, {
      x: 0,
      y: l.p2TitleY,
      w: l.W,
      h: Math.floor(26 * l.scaleY),
      text: t("p2Title"),
      text_size: l.p2TitleFontSize,
      color: 3377407,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    });
    const tabW = l.tabW;
    const tabH = l.tabH;
    const tabY = l.tabY;
    const gap = l.tabGap;
    const startX = l.tabStartX;
    createWidget(widget.BUTTON, {
      x: startX,
      y: tabY,
      w: tabW,
      h: tabH,
      radius: Math.floor(tabH / 2),
      normal_color: 1714756,
      press_color: 2254506,
      text: t("tabRanges"),
      text_size: l.tabFontSize,
      color: 13426158,
      click_func: () => {
        this.switchTab(0);
      }
    });
    createWidget(widget.BUTTON, {
      x: startX + tabW + gap,
      y: tabY,
      w: tabW,
      h: tabH,
      radius: Math.floor(tabH / 2),
      normal_color: 1714756,
      press_color: 2254506,
      text: t("tabAlerts"),
      text_size: Math.max(10, l.tabFontSize - 1),
      color: 13426158,
      click_func: () => {
        this.switchTab(1);
      }
    });
    createWidget(widget.BUTTON, {
      x: startX + (tabW + gap) * 2,
      y: tabY,
      w: tabW,
      h: tabH,
      radius: Math.floor(tabH / 2),
      normal_color: 1714756,
      press_color: 2254506,
      text: t("tabServer"),
      text_size: l.tabFontSize,
      color: 13426158,
      click_func: () => {
        this.switchTab(2);
      }
    });
    this.state.widgets.tabIndicator = createWidget(widget.FILL_RECT, {
      x: startX,
      y: tabY + tabH + 2,
      w: tabW,
      h: 3,
      color: 52326
    });
    createWidget(widget.BUTTON, {
      x: l.CX - Math.floor(l.saveBtnW / 2),
      y: l.saveBtnY,
      w: l.saveBtnW,
      h: l.saveBtnH,
      radius: l.saveBtnRadius,
      normal_color: 34884,
      press_color: 43605,
      text: t("saveAndReturn"),
      text_size: l.saveBtnFontSize,
      color: 16777215,
      click_func: () => {
        this.saveAndExit();
      }
    });
  },
  switchTab(tabIndex) {
    if (this._isExiting) return;
    if (this.state.currentTab === tabIndex) return;
    this.state.currentTab = tabIndex;
    const l = this.state.layout || getLayout();
    const tabW = l.tabW;
    const gap = l.tabGap;
    const startX = l.tabStartX;
    if (this.state.widgets.tabIndicator) {
      try {
        this.state.widgets.tabIndicator.setProperty(prop.X, startX + tabIndex * (tabW + gap));
      } catch (e) {}
    }
    this.renderCurrentTab();
  },
  clearTabWidgets() {
    this.hidePermissionDeniedModal();
    for (let i = 0; i < this.state.tabWidgets.length; i++) {
      try {
        const item = this.state.tabWidgets[i];
        if (item) {
          deleteWidget(item);
        }
      } catch (e) {
        console.log("Error deleting widget:", e);
      }
    }
    this.state.tabWidgets = [];
    this.state.thresholdTextWidgets = {};
  },
  renderCurrentTab() {
    this.clearTabWidgets();
    if (this.state.currentTab === 0) {
      this.renderThresholdsTab();
    } else if (this.state.currentTab === 1) {
      this.renderVibrationTab();
    } else {
      this.renderServerTab();
    }
    if (this._animatedToast && this._animatedToast.isShowing()) {
      this._animatedToast.bringToFront();
    }
  },
  renderThresholdsTab() {
    const list = this.state.tabWidgets;
    const s = this.state.settings;
    const l = this.state.layout || getLayout();
    const rowH = l.rowH;
    const startY = l.rowStartY;
    const isMmol = s.unit === "mmol/L";
    const step = isMmol ? .1 : 5;
    const minVal = isMmol ? 2 : 30;
    const maxVal = isMmol ? 25 : 350;
    const rows = [ {
      key: "veryLow",
      label: t("veryLowThreshold"),
      color: 16724787,
      defaultVal: isMmol ? DEFAULT_SETTINGS_MMOL.veryLow : DEFAULT_SETTINGS_MGDL.veryLow
    }, {
      key: "low",
      label: t("lowThreshold"),
      color: 16755200,
      defaultVal: isMmol ? DEFAULT_SETTINGS_MMOL.low : DEFAULT_SETTINGS_MGDL.low
    }, {
      key: "high",
      label: t("highThreshold"),
      color: 16755200,
      defaultVal: isMmol ? DEFAULT_SETTINGS_MMOL.high : DEFAULT_SETTINGS_MGDL.high
    }, {
      key: "veryHigh",
      label: t("veryHighThreshold"),
      color: 16724787,
      defaultVal: isMmol ? DEFAULT_SETTINGS_MMOL.veryHigh : DEFAULT_SETTINGS_MGDL.veryHigh
    } ];
    rows.forEach((row, idx) => {
      const y = startY + idx * rowH;
      list.push(createWidget(widget.TEXT, {
        x: Math.floor(l.W * .08),
        y: y,
        w: Math.floor(l.W * .84),
        h: Math.floor(22 * l.scaleY),
        text: row.label + " (" + (s.unit || "mg/dL") + ")",
        text_size: Math.max(12, Math.floor(15 * l.scale)),
        color: row.color,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V
      }));
      const btnY = y + Math.floor(22 * l.scaleY);
      const valW = l.valDisplayW;
      const stepW = l.stepBtnW;
      const stepH = l.stepBtnH;
      const stepR = l.stepBtnRadius;
      list.push(createWidget(widget.BUTTON, {
        x: l.CX - Math.floor(valW / 2) - stepW - 6,
        y: btnY,
        w: stepW,
        h: stepH,
        radius: stepR,
        normal_color: 2236979,
        press_color: 4473941,
        text: "-",
        text_size: Math.max(16, Math.floor(22 * l.scale)),
        color: 16777215,
        click_func: () => {
          const cur = isMmol ? parseFloat(s[row.key]) || row.defaultVal : parseInt(s[row.key], 10) || row.defaultVal;
          const next = isMmol ? Number((cur - step).toFixed(1)) : Math.round((cur - step) / 5) * 5;
          const candidate = {
            ...s,
            [row.key]: Math.max(minVal, next)
          };
          if (!validateSettings(candidate)) return;
          s[row.key] = candidate[row.key];
          this.persistDraftSettings();
          if (this.state.thresholdTextWidgets[row.key]) {
            try {
              const display = isMmol ? Number(s[row.key]).toFixed(1) : String(s[row.key]);
              this.state.thresholdTextWidgets[row.key].setProperty(prop.TEXT, display);
            } catch (e) {}
          }
        }
      }));
      const currentVal = isMmol ? (parseFloat(s[row.key]) || row.defaultVal).toFixed(1) : String(Math.round((parseInt(s[row.key], 10) || row.defaultVal) / 5) * 5);
      const textWidget = createWidget(widget.TEXT, {
        x: l.CX - Math.floor(valW / 2),
        y: btnY,
        w: valW,
        h: stepH,
        text: currentVal,
        text_size: Math.max(16, Math.floor(22 * l.scale)),
        color: 16777215,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V
      });
      list.push(textWidget);
      this.state.thresholdTextWidgets[row.key] = textWidget;
      list.push(createWidget(widget.BUTTON, {
        x: l.CX + Math.floor(valW / 2) + 6,
        y: btnY,
        w: stepW,
        h: stepH,
        radius: stepR,
        normal_color: 2236979,
        press_color: 4473941,
        text: "+",
        text_size: Math.max(16, Math.floor(22 * l.scale)),
        color: 16777215,
        click_func: () => {
          const cur = isMmol ? parseFloat(s[row.key]) || row.defaultVal : parseInt(s[row.key], 10) || row.defaultVal;
          const next = isMmol ? Number((cur + step).toFixed(1)) : Math.round((cur + step) / 5) * 5;
          const candidate = {
            ...s,
            [row.key]: Math.min(maxVal, next)
          };
          if (!validateSettings(candidate)) return;
          s[row.key] = candidate[row.key];
          this.persistDraftSettings();
          if (this.state.thresholdTextWidgets[row.key]) {
            try {
              const display = isMmol ? Number(s[row.key]).toFixed(1) : String(s[row.key]);
              this.state.thresholdTextWidgets[row.key].setProperty(prop.TEXT, display);
            } catch (e) {}
          }
        }
      }));
    });
  },
  renderVibrationTab() {
    const list = this.state.tabWidgets;
    const s = this.state.settings;
    const l = this.state.layout || getLayout();
    const switchW = Math.max(110, Math.floor(140 * l.scaleX));
    const testW = Math.max(66, Math.floor(80 * l.scaleX));
    const btnH = Math.max(28, Math.floor(34 * l.scaleY));
    const btnR = Math.floor(btnH / 2);
    const gap = Math.max(8, Math.floor(10 * l.scaleX));
    const startBtnX = l.CX - Math.floor((switchW + testW + gap) / 2);
    const fontSize = Math.max(11, Math.floor(13 * l.scale));
    const yelY = l.rowStartY;
    list.push(createWidget(widget.TEXT, {
      x: 20,
      y: yelY,
      w: l.W - 40,
      h: Math.floor(22 * l.scaleY),
      text: t("yellowAlertTitle"),
      text_size: Math.max(12, Math.floor(15 * l.scale)),
      color: 16755200,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    }));
    const yelText = s.outOfRangeVibration ? t("vibOn") : t("vibOff");
    const btnYelY = yelY + Math.floor(24 * l.scaleY);
    const btnYel = createWidget(widget.BUTTON, {
      x: startBtnX,
      y: btnYelY,
      w: switchW,
      h: btnH,
      radius: btnR,
      normal_color: s.outOfRangeVibration ? 34884 : 3355460,
      press_color: 43605,
      text: yelText,
      text_size: fontSize,
      color: 16777215,
      click_func: () => {
        s.outOfRangeVibration = !s.outOfRangeVibration;
        this.persistDraftSettings();
        this.renderCurrentTab();
      }
    });
    list.push(btnYel);
    list.push(createWidget(widget.BUTTON, {
      x: startBtnX + switchW + gap,
      y: btnYelY,
      w: testW,
      h: btnH,
      radius: btnR,
      normal_color: 2241348,
      press_color: 3359829,
      text: t("testBtn"),
      text_size: fontSize,
      color: 16755200,
      click_func: () => {
        if (!testAlertNotification("warning", this.state.vibrator)) {
          showToast({
            content: t("testFailToast")
          });
        }
      }
    }));
    const sep1Y = btnYelY + btnH + Math.floor(8 * l.scaleY);
    list.push(createWidget(widget.FILL_RECT, {
      x: Math.floor(l.W * .15),
      y: sep1Y,
      w: Math.floor(l.W * .7),
      h: 1,
      color: 2236996
    }));
    const redY = sep1Y + Math.floor(8 * l.scaleY);
    list.push(createWidget(widget.TEXT, {
      x: 20,
      y: redY,
      w: l.W - 40,
      h: Math.floor(22 * l.scaleY),
      text: t("redAlertTitle"),
      text_size: Math.max(12, Math.floor(15 * l.scale)),
      color: 16724787,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    }));
    const redText = s.criticalVibration ? t("vibOn") : t("vibOff");
    const btnRedY = redY + Math.floor(24 * l.scaleY);
    const btnRed = createWidget(widget.BUTTON, {
      x: startBtnX,
      y: btnRedY,
      w: switchW,
      h: btnH,
      radius: btnR,
      normal_color: s.criticalVibration ? 34884 : 3355460,
      press_color: 43605,
      text: redText,
      text_size: fontSize,
      color: 16777215,
      click_func: () => {
        s.criticalVibration = !s.criticalVibration;
        this.persistDraftSettings();
        this.renderCurrentTab();
      }
    });
    list.push(btnRed);
    list.push(createWidget(widget.BUTTON, {
      x: startBtnX + switchW + gap,
      y: btnRedY,
      w: testW,
      h: btnH,
      radius: btnR,
      normal_color: 2241348,
      press_color: 3359829,
      text: t("test3xBtn"),
      text_size: fontSize,
      color: 16724787,
      click_func: () => {
        if (!testAlertNotification("critical", this.state.vibrator)) {
          showToast({
            content: t("testFailToast")
          });
        }
      }
    }));
    const sep2Y = btnRedY + btnH + Math.floor(8 * l.scaleY);
    list.push(createWidget(widget.FILL_RECT, {
      x: Math.floor(l.W * .15),
      y: sep2Y,
      w: Math.floor(l.W * .7),
      h: 1,
      color: 2236996
    }));
    const curInterval = parseInt(s.backgroundInterval, 10) || 0;
    const intervalLabel = curInterval > 0 ? t("bgIntervalPrefix") + curInterval + t("bgIntervalSuffix") : t("bgIntervalOff");
    const bgY = sep2Y + Math.floor(8 * l.scaleY);
    list.push(createWidget(widget.TEXT, {
      x: 20,
      y: bgY,
      w: l.W - 40,
      h: Math.floor(22 * l.scaleY),
      text: intervalLabel,
      text_size: Math.max(12, Math.floor(15 * l.scale)),
      color: 3377407,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    }));
    const options = [ {
      label: t("optOff"),
      val: 0
    }, {
      label: "5m",
      val: 5
    }, {
      label: "10m",
      val: 10
    }, {
      label: "30m",
      val: 30
    }, {
      label: "60m",
      val: 60
    } ];
    const optW = Math.max(38, Math.floor(46 * l.scaleX));
    const optH = Math.max(26, Math.floor(32 * l.scaleY));
    const optGap = Math.max(3, Math.floor(4 * l.scaleX));
    const optStartX = l.CX - Math.floor((optW * options.length + optGap * (options.length - 1)) / 2);
    const optY = bgY + Math.floor(24 * l.scaleY);
    options.forEach((opt, i) => {
      const isSelected = curInterval === opt.val;
      list.push(createWidget(widget.BUTTON, {
        x: optStartX + i * (optW + optGap),
        y: optY,
        w: optW,
        h: optH,
        radius: Math.floor(optH / 2),
        normal_color: isSelected ? 34884 : 2236979,
        press_color: 43605,
        text: opt.label,
        text_size: Math.max(10, Math.floor(13 * l.scale)),
        color: isSelected ? 16777215 : 8952234,
        click_func: () => {
          if (opt.val === 0) {
            this.hidePermissionDeniedModal();
            s.backgroundInterval = 0;
            this.persistDraftSettings();
            this.renderCurrentTab();
          } else {
            this.requestBackgroundPermission(opt.val);
          }
        }
      }));
    });
    const snoozeUntil = getSnoozeUntil();
    const snoozeMinutes = snoozeUntil ? Math.max(1, Math.ceil((snoozeUntil - Date.now()) / 6e4)) : 0;
    const snoozeY = optY + optH + Math.floor(10 * l.scaleY);
    this.state.lastSnoozeUntil = snoozeUntil;
    this.state.widgets.snoozeStatus = createWidget(widget.TEXT, {
      x: 20,
      y: snoozeY,
      w: l.W - 40,
      h: Math.floor(20 * l.scaleY),
      text: snoozeMinutes ? t("snoozeActiveLabel") + snoozeMinutes + " min" : t("snoozeInactiveLabel"),
      text_size: Math.max(10, Math.floor(12 * l.scale)),
      color: snoozeMinutes ? 16755200 : 7833753,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    });
    list.push(this.state.widgets.snoozeStatus);
    const snoozeOptions = snoozeMinutes ? [ {
      label: t("cancelSnooze"),
      minutes: 0
    } ] : [ {
      label: "15 min",
      minutes: 15
    }, {
      label: "30 min",
      minutes: 30
    }, {
      label: "60 min",
      minutes: 60
    } ];
    const snoozeW = snoozeMinutes ? Math.max(140, Math.floor(170 * l.scaleX)) : Math.max(58, Math.floor(68 * l.scaleX));
    const snoozeGap = Math.max(5, Math.floor(7 * l.scaleX));
    const snoozeStart = l.CX - Math.floor((snoozeW * snoozeOptions.length + snoozeGap * (snoozeOptions.length - 1)) / 2);
    snoozeOptions.forEach((opt, i) => list.push(createWidget(widget.BUTTON, {
      x: snoozeStart + i * (snoozeW + snoozeGap),
      y: snoozeY + Math.floor(21 * l.scaleY),
      w: snoozeW,
      h: Math.max(25, Math.floor(29 * l.scaleY)),
      radius: btnR,
      normal_color: opt.minutes ? 4863264 : 6697779,
      press_color: 8934707,
      text: opt.label,
      text_size: Math.max(10, Math.floor(12 * l.scale)),
      color: 16777215,
      click_func: () => {
        if (opt.minutes) {
          const until = setAlertSnooze(opt.minutes);
          this.state.lastSnoozeUntil = until;
          this.renderCurrentTab();
          const snoozeMsg = t("snoozeToast", {
            minutes: opt.minutes
          });
          if (!this._animatedToast) this._animatedToast = new AnimatedToast;
          if (this._animatedToast) {
            this._animatedToast.show({
              type: "bell_off",
              message: snoozeMsg,
              duration: 2e3,
              textColor: 16777215,
              onComplete: () => {
                try {
                  back();
                } catch (e) {
                  push({
                    url: "page/index"
                  });
                }
              }
            });
          } else {
            try {
              showToast({
                content: snoozeMsg
              });
            } catch (e) {}
            try {
              back();
            } catch (e) {
              push({
                url: "page/index"
              });
            }
          }
        } else {
          try {
            clearAlertSnooze();
            this.state.lastSnoozeUntil = null;
            this.renderCurrentTab();
            if (!this._animatedToast) this._animatedToast = new AnimatedToast;
            if (this._animatedToast) {
              this._animatedToast.show({
                type: "bell",
                message: t("snoozeCancelledToast"),
                duration: 2e3,
                textColor: 16777215
              });
            } else {
              showToast({
                content: t("snoozeCancelledToast")
              });
            }
          } catch (e) {
            console.log("[PAGE2] clearAlertSnooze error:", e);
          }
        }
      }
    })));
  },
  renderServerTab() {
    const list = this.state.tabWidgets;
    const s = this.state.settings;
    const l = this.state.layout || getLayout();
    const startY = l.rowStartY;
    list.push(createWidget(widget.TEXT, {
      x: 20,
      y: startY + Math.floor(6 * l.scaleY),
      w: l.W - 40,
      h: Math.floor(22 * l.scaleY),
      text: t("serverHeader"),
      text_size: Math.max(12, Math.floor(15 * l.scale)),
      color: 7829367,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    }));
    const cleanDisplay = (s.apiUrl || localStorage.getItem(VERIFIED_URL_KEY) || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    list.push(createWidget(widget.TEXT, {
      x: 20,
      y: startY + Math.floor(30 * l.scaleY),
      w: l.W - 40,
      h: Math.floor(44 * l.scaleY),
      text: cleanDisplay || t("noUrlConfigured"),
      text_size: Math.max(12, Math.floor(15 * l.scale)),
      color: 52326,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    }));
    const tokenBtnW = Math.max(150, Math.floor(180 * l.scaleX));
    const tokenBtnH = Math.max(30, Math.floor(34 * l.scaleY));
    const tokenBtnR = Math.floor(tokenBtnH / 2);
    const tokenBtnFontSize = Math.max(11, Math.floor(13 * l.scale));
    list.push(createWidget(widget.BUTTON, {
      x: l.CX - Math.floor(tokenBtnW / 2),
      y: startY + Math.floor(74 * l.scaleY),
      w: tokenBtnW,
      h: tokenBtnH,
      radius: tokenBtnR,
      normal_color: s.tokenConfigured ? 1720448 : 2241348,
      press_color: 2774425,
      text: s.tokenConfigured ? t("tokenConfiguredBtn") : t("enterTokenBtn"),
      text_size: tokenBtnFontSize,
      color: 16777215,
      click_func: () => this.openTokenKeyboard()
    }));
    this.state.widgets.testResult = createWidget(widget.TEXT, {
      x: 20,
      y: startY + Math.floor(110 * l.scaleY),
      w: l.W - 40,
      h: Math.floor(20 * l.scaleY),
      text: "",
      text_size: Math.max(10, Math.floor(12 * l.scale)),
      color: 52326,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    });
    list.push(this.state.widgets.testResult);
    let cached = null;
    try {
      cached = JSON.parse(localStorage.getItem("zightscout_last_data") || "null");
    } catch (e) {}
    const heartbeat = Number(localStorage.getItem("zightscout_service_heartbeat") || 0);
    const heartbeatAge = heartbeat ? Math.max(0, Math.floor((Date.now() - heartbeat) / 6e4)) : -1;
    this.state.widgets.diagnostic = createWidget(widget.TEXT, {
      x: 20,
      y: startY + Math.floor(132 * l.scaleY),
      w: l.W - 40,
      h: Math.floor(34 * l.scaleY),
      text: t("diagnosticTitle") + (cached && cached.currentBG ? t("lastReading") + formatGlucose(cached.currentBG, normalizeGlucoseUnit(cached.unit) || "mg/dL") + " " + (normalizeGlucoseUnit(cached.unit) || "mg/dL") : t("noReadingDiag")) + "\n" + t("bgActivePrefix") + (heartbeatAge >= 0 ? t("bgActiveHa") + heartbeatAge + " min" : t("bgNoSignal")),
      text_size: Math.max(10, Math.floor(12 * l.scale)),
      color: heartbeatAge > 10 ? 16746496 : 7833753,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    });
    list.push(this.state.widgets.diagnostic);
    const btnW = Math.max(140, Math.floor(170 * l.scaleX));
    const btnH = Math.max(34, Math.floor(40 * l.scaleY));
    const btnR = Math.floor(btnH / 2);
    const btnFontSize = Math.max(12, Math.floor(15 * l.scale));
    list.push(createWidget(widget.BUTTON, {
      x: l.CX - Math.floor(btnW / 2),
      y: startY + Math.floor(170 * l.scaleY),
      w: btnW,
      h: btnH,
      radius: btnR,
      normal_color: 34884,
      press_color: 43605,
      text: t("enterUrlBtn"),
      text_size: btnFontSize,
      color: 16777215,
      click_func: () => this.openUrlKeyboard()
    }));
    const rowGap = Math.max(4, Math.floor(6 * l.scaleX));
    const unitBtnH = Math.max(26, Math.floor(28 * l.scaleY));
    const unitBtnR = Math.floor(unitBtnH / 2);
    const unitFontSize = Math.max(11, Math.floor(12 * l.scale));
    const unitW = Math.max(52, Math.floor(58 * l.scaleX));
    const testBtnW = Math.max(96, Math.floor(114 * l.scaleX));
    const totalRowW = 2 * unitW + testBtnW + 2 * rowGap;
    const rowX = l.CX - Math.floor(totalRowW / 2);
    const rowY = startY + Math.floor(270 * l.scaleY);
    [ "mg/dL", "mmol/L" ].forEach((unit, index) => {
      const selected = s.unit === unit;
      list.push(createWidget(widget.BUTTON, {
        x: rowX + index * (unitW + rowGap),
        y: rowY,
        w: unitW,
        h: unitBtnH,
        radius: unitBtnR,
        normal_color: selected ? 34884 : 1720448,
        press_color: 43605,
        text: unit,
        text_size: unitFontSize,
        color: selected ? 16777215 : 13426175,
        click_func: () => this.selectFallbackUnit(unit)
      }));
    });
    list.push(createWidget(widget.BUTTON, {
      x: rowX + 2 * (unitW + rowGap),
      y: rowY,
      w: testBtnW,
      h: unitBtnH,
      radius: unitBtnR,
      normal_color: 1720448,
      press_color: 2254506,
      text: t("testConnBtn"),
      text_size: unitFontSize,
      color: 13426175,
      click_func: () => this.testConnection()
    }));
    list.push(createWidget(widget.TEXT, {
      x: 24,
      y: startY + Math.floor(216 * l.scaleY),
      w: l.W - 48,
      h: Math.floor(48 * l.scaleY),
      text: t("bgPermissionNotice"),
      text_size: Math.max(10, Math.floor(12 * l.scale)),
      color: 14263361,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    }));
  },
  openUrlKeyboard() {
    if (this._isExiting) return;
    try {
      createKeyboard({
        inputType: typeof inputType !== "undefined" && inputType.CHAR !== undefined ? inputType.CHAR : 2,
        text: "",
        onComplete: (keyboard, result) => {
          this.handleUrlEntered(result);
          try {
            if (typeof deleteKeyboard === "function") deleteKeyboard();
          } catch (e) {}
        },
        onCancel: () => {
          try {
            if (typeof deleteKeyboard === "function") deleteKeyboard();
          } catch (e) {}
        }
      });
    } catch (e) {
      console.log("[SETTINGS] keyboard error", e);
    }
  },
  openTokenKeyboard() {
    if (this._isExiting) return;
    try {
      try {
        showToast({
          content: t("pasteToken")
        });
      } catch (e) {}
      createKeyboard({
        inputType: typeof inputType !== "undefined" && inputType.CHAR !== undefined ? inputType.CHAR : 2,
        text: "",
        onComplete: (keyboard, result) => {
          this.handleTokenEntered(result);
          try {
            if (typeof deleteKeyboard === "function") deleteKeyboard();
          } catch (e) {}
        },
        onCancel: () => {
          try {
            if (typeof deleteKeyboard === "function") deleteKeyboard();
          } catch (e) {}
        }
      });
    } catch (e) {
      console.log("[SETTINGS] token keyboard error", e);
      try {
        showToast({
          content: t("tokenOpenFail")
        });
      } catch (err) {}
    }
  },
  handleTokenEntered(result) {
    let raw = "";
    if (result && typeof result === "object") raw = result.data !== undefined ? String(result.data) : result.text !== undefined ? String(result.text) : String(result.value || ""); else if (result !== undefined && result !== null) raw = String(result);
    const token = raw.trim();
    if (token.length > 256 || /\s/.test(token)) {
      if (this._animatedToast) {
        this._animatedToast.show({
          type: "warning",
          message: t("tokenInvalid"),
          duration: 3e3,
          textColor: 16729156
        });
      } else {
        try {
          showToast({
            content: t("tokenInvalid")
          });
        } catch (e) {}
      }
      return;
    }
    this.state.settings.tokenConfigured = token.length > 0;
    if (!saveSettings(this.state.settings)) {
      try {
        showToast({
          content: t("tokenSaveFail")
        });
      } catch (e) {}
      return;
    }
    this.sendMessage({
      type: "UPDATE_SETTINGS",
      settings: {
        apiUrl: this.state.settings.apiUrl,
        apiToken: token
      }
    });
    try {
      showToast({
        content: token ? t("tokenSaved") : t("tokenRemoved")
      });
    } catch (e) {}
    this.renderCurrentTab();
    if (token) {
      setTimeout(() => {
        this.testConnection(token);
      }, 350);
    }
  },
  showTokenPromptModal() {
    this.hideTokenPromptModal();
    this.hidePermissionDeniedModal();
    const l = this.state.layout;
    const modalW = Math.min(l.W - 32, Math.floor(280 * l.scaleX));
    const modalH = Math.floor(180 * l.scaleY);
    const modalX = Math.floor((l.W - modalW) / 2);
    const modalY = Math.floor((l.H - modalH) / 2);
    this._tokenModalWidgets = [];
    const overlay = createWidget(widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: l.W,
      h: l.H,
      color: 0
    });
    this._tokenModalWidgets.push(overlay);
    const card = createWidget(widget.FILL_RECT, {
      x: modalX,
      y: modalY,
      w: modalW,
      h: modalH,
      radius: Math.floor(16 * l.scale),
      color: 1450547
    });
    this._tokenModalWidgets.push(card);
    const title = createWidget(widget.TEXT, {
      x: modalX + 10,
      y: modalY + 12,
      w: modalW - 20,
      h: Math.floor(28 * l.scaleY),
      text: t("promptTokenTitle"),
      text_size: Math.max(14, Math.floor(16 * l.scale)),
      color: 16777215,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    });
    this._tokenModalWidgets.push(title);
    const desc = createWidget(widget.TEXT, {
      x: modalX + 12,
      y: modalY + Math.floor(44 * l.scaleY),
      w: modalW - 24,
      h: Math.floor(48 * l.scaleY),
      text: t("promptTokenBody"),
      text_size: Math.max(11, Math.floor(12 * l.scale)),
      color: 13426158,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    });
    this._tokenModalWidgets.push(desc);
    const btnW = Math.floor((modalW - 36) / 2);
    const btnH = Math.max(30, Math.floor(34 * l.scaleY));
    const btnY = modalY + modalH - btnH - 14;
    const btnStartX = modalX + Math.floor((modalW - (btnW * 2 + 12)) / 2);
    const btnNo = createWidget(widget.BUTTON, {
      x: btnStartX,
      y: btnY,
      w: btnW,
      h: btnH,
      radius: Math.floor(btnH / 2),
      normal_color: 3359829,
      press_color: 4478310,
      text: t("btnNo"),
      text_size: Math.max(12, Math.floor(13 * l.scale)),
      color: 13426158,
      click_func: () => {
        this.hideTokenPromptModal();
        this.hidePermissionDeniedModal();
        this.testConnection();
      }
    });
    this._tokenModalWidgets.push(btnNo);
    const btnYes = createWidget(widget.BUTTON, {
      x: btnStartX + btnW + 12,
      y: btnY,
      w: btnW,
      h: btnH,
      radius: Math.floor(btnH / 2),
      normal_color: 1730218,
      press_color: 2263261,
      text: t("btnYes"),
      text_size: Math.max(12, Math.floor(13 * l.scale)),
      color: 16777215,
      click_func: () => {
        this.hideTokenPromptModal();
        this.hidePermissionDeniedModal();
        this.openTokenKeyboard();
      }
    });
    this._tokenModalWidgets.push(btnYes);
  },
  hideTokenPromptModal() {
    if (this._tokenModalWidgets && this._tokenModalWidgets.length) {
      this._tokenModalWidgets.forEach(w => {
        try {
          deleteWidget(w);
        } catch (e) {}
      });
      this._tokenModalWidgets = [];
    }
  },
  requestBackgroundPermission(intervalVal) {
    this.hidePermissionDeniedModal();
    if (typeof queryPermission === "function") {
      try {
        const queryRes = queryPermission({
          permissions: [ "device:os.bg_service" ]
        });
        console.log("[PAGE2][PERMISSION] queryPermission result: " + JSON.stringify(queryRes));
        let isAlreadyGranted = false;
        if (Array.isArray(queryRes) && queryRes.length > 0) {
          isAlreadyGranted = queryRes[0] === 2;
        } else if (queryRes && typeof queryRes === "object") {
          if (queryRes.code === 2 || queryRes.code === 0 || queryRes.granted === true) {
            isAlreadyGranted = true;
          } else if (Array.isArray(queryRes.permissions)) {
            isAlreadyGranted = queryRes.permissions[0] === 2;
          }
        }
        if (isAlreadyGranted) {
          console.log("[PAGE2][PERMISSION] Permission already granted in queryPermission. Activating directly.");
          this.activateBackgroundInterval(intervalVal);
          return;
        }
      } catch (qe) {
        console.log("[PAGE2][PERMISSION] queryPermission error: " + qe);
      }
    }
    if (typeof requestPermission !== "function") {
      console.log("[PAGE2][PERMISSION] requestPermission unavailable in runtime. Activating directly.");
      this.activateBackgroundInterval(intervalVal);
      return;
    }
    let handled = false;
    let timer = null;
    const onResult = (result, isTimeout = false) => {
      if (handled) return;
      handled = true;
      if (timer) {
        try {
          clearTimeout(timer);
        } catch (e) {}
        timer = null;
      }
      this._permModalTimer = null;
      console.log("[PAGE2][PERMISSION] requestPermission result: " + JSON.stringify(result) + " (timeout=" + isTimeout + ")");
      if (isTimeout) {
        console.log("[PAGE2][PERMISSION] requestPermission timed out (1.5s). Activating directly to avoid lock.");
        this.activateBackgroundInterval(intervalVal);
        return;
      }
      let granted = false;
      if (Array.isArray(result) && result.length > 0) {
        granted = result[0] === 2 || result[0] === 0;
      } else if (result && typeof result === "object") {
        if (result.code === 0 || result.code === 2 || result.granted === true) {
          granted = true;
        } else if (Array.isArray(result.permissions)) {
          granted = result.permissions[0] === 2 || result.permissions[0] === 0;
        } else if (Array.isArray(result.result)) {
          granted = result.result[0] === 2 || result.result[0] === 0;
        }
      }
      if (granted) {
        this.activateBackgroundInterval(intervalVal);
      } else {
        console.log("[PAGE2][PERMISSION] Permission DENIED. Reverting backgroundInterval to 0 and showing modal.");
        this.state.settings.backgroundInterval = 0;
        this.persistDraftSettings();
        this.renderCurrentTab();
        this.showPermissionDeniedModal(intervalVal);
      }
    };
    try {
      timer = setTimeout(() => {
        onResult(null, true);
      }, 1500);
      this._permModalTimer = timer;
    } catch (te) {}
    try {
      const syncRes = requestPermission({
        permissions: [ "device:os.bg_service" ],
        callback: res => {
          onResult(res, false);
        }
      });
      if (syncRes !== undefined && syncRes !== null && (Array.isArray(syncRes) || typeof syncRes === "object")) {
        if (Array.isArray(syncRes) && syncRes.length > 0) {
          onResult(syncRes, false);
        }
      }
    } catch (e) {
      console.log("[PAGE2][PERMISSION] requestPermission error:", e);
      onResult(null, true);
    }
  },
  activateBackgroundInterval(intervalVal) {
    this.state.settings.backgroundInterval = intervalVal;
    this.persistDraftSettings();
    this.renderCurrentTab();
    if (this._animatedToast) {
      this._animatedToast.show({
        type: "check",
        message: t("bgIntervalPrefix") + intervalVal + t("bgIntervalSuffix"),
        duration: 2e3,
        textColor: 58998
      });
    } else {
      try {
        showToast({
          content: t("bgIntervalPrefix") + intervalVal + t("bgIntervalSuffix")
        });
      } catch (e) {}
    }
  },
  showPermissionDeniedModal(intervalVal) {
    this.hidePermissionDeniedModal();
    const l = this.state.layout || getLayout();
    const modalW = Math.min(l.W - 32, Math.floor(300 * l.scaleX));
    const modalH = Math.floor(270 * l.scaleY);
    const modalX = Math.floor((l.W - modalW) / 2);
    const modalY = Math.floor((l.H - modalH) / 2);
    this._permModalWidgets = [];
    const overlay = createWidget(widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: l.W,
      h: l.H,
      color: 0
    });
    this._permModalWidgets.push(overlay);
    const card = createWidget(widget.FILL_RECT, {
      x: modalX,
      y: modalY,
      w: modalW,
      h: modalH,
      radius: Math.floor(16 * l.scale),
      color: 1450547
    });
    this._permModalWidgets.push(card);
    const title = createWidget(widget.TEXT, {
      x: modalX + 10,
      y: modalY + 8,
      w: modalW - 20,
      h: Math.floor(24 * l.scaleY),
      text: t("bgPermissionDeniedTitle"),
      text_size: Math.max(13, Math.floor(15 * l.scale)),
      color: 16755200,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    });
    this._permModalWidgets.push(title);
    const desc = createWidget(widget.TEXT, {
      x: modalX + 12,
      y: modalY + Math.floor(32 * l.scaleY),
      w: modalW - 24,
      h: Math.floor(95 * l.scaleY),
      text: t("bgPermissionDeniedBody"),
      text_size: Math.max(10, Math.floor(11 * l.scale)),
      color: 13426158,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V
    });
    this._permModalWidgets.push(desc);
    const btnW = Math.floor(modalW * .85);
    const btnH = Math.max(26, Math.floor(30 * l.scaleY));
    const btnX = modalX + Math.floor((modalW - btnW) / 2);
    const gap = Math.max(4, Math.floor(6 * l.scaleY));
    const btn1Y = modalY + modalH - (3 * btnH + 2 * gap) - 10;
    const btn2Y = btn1Y + btnH + gap;
    const btn3Y = btn2Y + btnH + gap;
    const btnForce = createWidget(widget.BUTTON, {
      x: btnX,
      y: btn1Y,
      w: btnW,
      h: btnH,
      radius: Math.floor(btnH / 2),
      normal_color: 34884,
      press_color: 43605,
      text: t("btnActivateAnyway"),
      text_size: Math.max(11, Math.floor(13 * l.scale)),
      color: 16777215,
      click_func: () => {
        this.hidePermissionDeniedModal();
        this.activateBackgroundInterval(intervalVal);
      }
    });
    this._permModalWidgets.push(btnForce);
    const btnRetry = createWidget(widget.BUTTON, {
      x: btnX,
      y: btn2Y,
      w: btnW,
      h: btnH,
      radius: Math.floor(btnH / 2),
      normal_color: 1730218,
      press_color: 2263261,
      text: t("btnRetry"),
      text_size: Math.max(11, Math.floor(12 * l.scale)),
      color: 16777215,
      click_func: () => {
        this.hidePermissionDeniedModal();
        this.requestBackgroundPermission(intervalVal);
      }
    });
    this._permModalWidgets.push(btnRetry);
    const btnClose = createWidget(widget.BUTTON, {
      x: btnX,
      y: btn3Y,
      w: btnW,
      h: btnH,
      radius: Math.floor(btnH / 2),
      normal_color: 3359829,
      press_color: 4478310,
      text: t("btnClose"),
      text_size: Math.max(11, Math.floor(12 * l.scale)),
      color: 13426158,
      click_func: () => {
        this.hidePermissionDeniedModal();
      }
    });
    this._permModalWidgets.push(btnClose);
  },
  hidePermissionDeniedModal() {
    if (this._permModalTimer) {
      try {
        clearTimeout(this._permModalTimer);
      } catch (e) {}
      this._permModalTimer = null;
    }
    if (this._permModalWidgets && this._permModalWidgets.length) {
      this._permModalWidgets.forEach(w => {
        try {
          deleteWidget(w);
        } catch (e) {}
      });
      this._permModalWidgets = [];
    }
  },
  handleUrlEntered(result) {
    let raw = "";
    if (result && typeof result === "object") raw = result.data !== undefined ? String(result.data) : result.text !== undefined ? String(result.text) : String(result.value || ""); else if (result !== undefined && result !== null) raw = String(result);
    raw = raw.trim();
    if (!raw) return;
    const tokenMatch = /[?&]token=([^&#\s]+)/i.exec(raw);
    let extractedToken = "";
    let urlToResolve = raw;
    if (tokenMatch) {
      extractedToken = decodeURIComponent(tokenMatch[1]).trim();
      urlToResolve = raw.replace(/[?&]token=[^&#\s]*/i, "").replace(/\?&/, "?").replace(/[?&]$/, "");
    }
    const resolved = resolveUrlInput(urlToResolve);
    if (!resolved) {
      if (this._animatedToast) {
        this._animatedToast.show({
          type: "warning",
          message: t("invalidUrl"),
          duration: 3e3,
          textColor: 16729156
        });
      } else {
        try {
          showToast({
            content: t("invalidUrl")
          });
        } catch (e) {}
      }
      return;
    }
    this.state.settings.apiUrl = resolved;
    this.state.unitPrompt = false;
    if (extractedToken) {
      this.state.settings.tokenConfigured = true;
      if (!saveSettings(this.state.settings)) {
        try {
          showToast({
            content: t("urlSaveFail")
          });
        } catch (e) {}
        return;
      }
      this.state.settings = loadSettings();
      syncBackground(this.state.settings);
      this.sendMessage({
        type: "UPDATE_SETTINGS",
        settings: {
          apiUrl: this.state.settings.apiUrl,
          apiToken: extractedToken
        }
      });
      try {
        showToast({
          content: t("urlAndTokenSaved")
        });
      } catch (e) {}
      this.renderCurrentTab();
      setTimeout(() => {
        this.testConnection(extractedToken);
      }, 350);
      return;
    }
    if (!saveSettings(this.state.settings)) {
      try {
        showToast({
          content: t("urlSaveFail")
        });
      } catch (e) {}
      return;
    }
    this.state.settings = loadSettings();
    console.log("[ZIGHTSCOUT][SETTINGS] URL_SAVED verified=" + (this.state.settings.apiUrl === resolved));
    syncBackground(this.state.settings);
    this.sendMessage({
      type: "UPDATE_SETTINGS",
      settings: this.state.settings
    });
    this.renderCurrentTab();
    this.showTokenPromptModal();
  },
  selectFallbackUnit(unit) {
    if (unit !== "mg/dL" && unit !== "mmol/L") return;
    this.state.settings = convertSettingsUnit(this.state.settings, unit);
    this.state.unitPrompt = false;
    if (!saveSettings(this.state.settings)) {
      try {
        showToast({
          content: t("unitSaveFailed")
        });
      } catch (e) {}
      return;
    }
    syncBackground(this.state.settings);
    this.sendMessage({
      type: "UPDATE_SETTINGS",
      settings: this.state.settings
    });
    this.sendMessage({
      type: "FETCH_DATA",
      apiUrl: this.state.settings.apiUrl
    });
    this.renderCurrentTab();
    if (this.state.widgets.testResult) {
      this.state.widgets.testResult.setProperty(prop.TEXT, t("unitSelected", {
        unit: unit
      }));
      this.state.widgets.testResult.setProperty(prop.COLOR, 52326);
    }
  },
  saveAndExit() {
    if (this._isExiting) return;
    console.log("[ZIGHTSCOUT][SETTINGS] SAVE requested " + formatSettings(this.state.settings));
    if (!validateSettings(this.state.settings) || !saveSettings(this.state.settings)) {
      console.log("[ZIGHTSCOUT][SETTINGS] SAVE completed result=rejected");
      if (this._animatedToast) {
        this._animatedToast.show({
          type: "warning",
          message: t("invalidRanges"),
          duration: 3e3,
          textColor: 16729156
        });
      } else {
        try {
          showToast({
            content: t("invalidRanges")
          });
        } catch (e) {}
      }
      return;
    }
    this._isExiting = true;
    syncBackground(this.state.settings);
    this.sendMessage({
      type: "UPDATE_SETTINGS",
      settings: this.state.settings
    });
    console.log("[ZIGHTSCOUT][SETTINGS] SAVE completed result=success");
    if (this._animatedToast) {
      this._animatedToast.show({
        type: "check",
        message: t("settingsSavedToast"),
        duration: 0,
        repeatCount: 0,
        textColor: 58998
      });
      setTimeout(() => {
        back();
      }, 1e3);
    } else {
      try {
        showToast({
          content: t("settingsSavedToast")
        });
      } catch (e) {}
      setTimeout(() => {
        back();
      }, 150);
    }
  },
  initCommunication() {
    try {
      ble.createConnect((index, data, size) => {
        this.handleResponse(data, size);
      });
      console.log("ZightScout: Settings BLE registered");
      setTimeout(() => {
        this.sendShake();
      }, 300);
    } catch (e) {
      console.log("ZightScout: Settings BLE connect error:", e && e.message ? e.message : e);
    }
  },
  sendShake() {
    const buf = new ArrayBuffer(16 + 1);
    const dv = new DataView(buf);
    const u8 = new Uint8Array(buf);
    dv.setUint8(0, 1);
    dv.setUint8(1, 1);
    dv.setUint16(2, 1, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 0, true);
    dv.setUint32(8, APP_ID, true);
    dv.setUint32(12, 0, true);
    u8[16] = APP_ID & 255;
    try {
      const result = ble.send(buf, buf.byteLength);
      trace("SETTINGS_BLE_SHAKE", {
        result: String(result),
        cachedPort: Number(localStorage.getItem("zightscout_ble_port")) || 0
      });
      return result !== false;
    } catch (e) {
      trace("SETTINGS_BLE_SHAKE_FAILED", errorDetails(e));
      return false;
    }
  },
  sendMessage(msgObj) {
    const jsonStr = JSON.stringify(msgObj);
    const utf8Buf = str2buf(jsonStr);
    const totalLen = 16 + utf8Buf.byteLength;
    const buf = new ArrayBuffer(totalLen);
    const dv = new DataView(buf);
    const u8 = new Uint8Array(buf);
    dv.setUint8(0, 1);
    dv.setUint8(1, 1);
    dv.setUint16(2, 4, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, this.state.appSidePort, true);
    dv.setUint32(8, APP_ID, true);
    dv.setUint32(12, 0, true);
    const payloadBytes = new Uint8Array(utf8Buf);
    u8.set(payloadBytes, 16);
    try {
      const result = ble.send(buf, buf.byteLength);
      trace("SETTINGS_BLE_SEND", {
        type: msgObj && msgObj.type,
        port: this.state.appSidePort,
        result: String(result)
      });
      return result !== false;
    } catch (e) {
      trace("SETTINGS_BLE_SEND_FAILED", {
        type: msgObj && msgObj.type,
        port: this.state.appSidePort,
        ...errorDetails(e)
      });
      return false;
    }
  },
  testConnection(tokenOverride) {
    if (this._isExiting) return;
    this.state.testingUrl = this.state.settings.apiUrl || localStorage.getItem(VERIFIED_URL_KEY) || "";
    if (!this.state.appSidePort) {
      const storedPort = Number(localStorage.getItem("zightscout_ble_port"));
      if (storedPort > 0 && storedPort <= 65535) this.state.appSidePort = storedPort;
    }
    this.state.verificationPending = true;
    localStorage.removeItem("zightscout_verification_result");
    if (this._verificationPoll) {
      clearInterval(this._verificationPoll);
      this._verificationPoll = null;
    }
    this._verificationPoll = setInterval(() => {
      const rawRes = localStorage.getItem("zightscout_verification_result");
      if (rawRes && this.state.verificationPending) {
        clearInterval(this._verificationPoll);
        this._verificationPoll = null;
        try {
          const resObj = JSON.parse(rawRes);
          if (Date.now() - resObj.timestamp < 15e3) {
            this.handleResponse(new Uint8Array(str2buf(JSON.stringify({
              type: "response",
              data: resObj
            }))), 0);
          }
        } catch (e) {}
      }
    }, 250);
    const resWidget = this.state.widgets.testResult;
    if (resWidget) {
      try {
        resWidget.setProperty(prop.TEXT, t("testConnBtn") + "...");
        resWidget.setProperty(prop.COLOR, 16755200);
      } catch (e) {}
    }
    if (this._verifyRetryTimer) {
      clearTimeout(this._verifyRetryTimer);
      this._verifyRetryTimer = null;
    }
    if (this._verifyTimeoutTimer) {
      clearTimeout(this._verifyTimeoutTimer);
      this._verifyTimeoutTimer = null;
    }
    this._verifyTimeoutTimer = setTimeout(() => {
      if (this._verificationPoll) {
        clearInterval(this._verificationPoll);
        this._verificationPoll = null;
      }
      if (this.state.verificationPending) {
        const timeoutMsg = t("errTimeout");
        if (this.state.widgets.testResult) {
          try {
            this.state.widgets.testResult.setProperty(prop.TEXT, t("testFailPrefix") + " " + timeoutMsg);
            this.state.widgets.testResult.setProperty(prop.COLOR, 16729156);
          } catch (e) {}
        }
        if (this._animatedToast) {
          this._animatedToast.show({
            type: "warning",
            message: timeoutMsg,
            duration: 3500,
            textColor: 16729156
          });
        }
      }
      this.state.pendingVerify = null;
      this.state.verificationPending = false;
    }, 8e3);
    const verifyPayload = {
      type: "VERIFY_URL",
      apiUrl: this.state.settings.apiUrl
    };
    if (tokenOverride && typeof tokenOverride === "string" && tokenOverride.trim()) {
      verifyPayload.apiToken = tokenOverride.trim();
    }
    if (!this.state.appSidePort) {
      this.state.pendingVerify = verifyPayload;
      this.sendShake();
      this._verifyRetryTimer = setTimeout(() => {
        if (this.state.verificationPending && !this.state.appSidePort) {
          this.sendShake();
        }
      }, 2500);
      return;
    }
    this.sendMessage(verifyPayload);
    this._verifyRetryTimer = setTimeout(() => {
      if (this.state.verificationPending && this.state.appSidePort) {
        this.sendMessage(verifyPayload);
      }
    }, 2500);
  },
  handleResponse(data, size) {
    try {
      if (!data) return;
      const len = size && size > 0 ? size : data.byteLength || 0;
      const u8 = new Uint8Array(data.buffer || data, data.byteOffset || 0, len);
      if (u8.length === 0) return;
      if (u8.length >= 16 && u8[0] === 1 && u8[1] === 1) {
        const dv = new DataView(u8.buffer, u8.byteOffset, u8.length);
        const pType = dv.getUint16(2, true);
        const pPort2 = dv.getUint16(6, true);
        if (pType === 1) {
          this.state.appSidePort = pPort2;
          localStorage.setItem("zightscout_ble_port", String(pPort2));
          localStorage.setItem("zightscout_ble_last_contact", String(Date.now()));
          localStorage.removeItem("zightscout_ble_last_disconnect");
          trace("SETTINGS_BLE_HANDSHAKE", {
            port: pPort2
          });
          if (this.state.pendingVerify) {
            const pv = this.state.pendingVerify;
            this.state.pendingVerify = null;
            this.sendMessage(pv);
          } else if (this.state.pendingVerification) {
            this.state.pendingVerification = false;
            this.testConnection();
          }
          return;
        } else if (pType === 2) {
          this.state.appSidePort = 0;
          localStorage.setItem("zightscout_ble_last_disconnect", String(Date.now()));
          trace("SETTINGS_BLE_DISCONNECT");
          return;
        }
      }
      const offset = u8.length >= 16 && u8[0] === 1 && u8[1] === 1 ? 16 : 0;
      const jsonStr = buf2str(u8.subarray(offset));
      if (!jsonStr || jsonStr.indexOf("{") === -1) return;
      const parsed = JSON.parse(jsonStr);
      const res = parsed.data || parsed;
      const resWidget = this.state.widgets.testResult;
      if (res.verification) {
        this.state.verificationPending = false;
        this.state.pendingVerify = null;
        if (this._verificationPoll) {
          clearInterval(this._verificationPoll);
          this._verificationPoll = null;
        }
        if (this._verifyRetryTimer) {
          clearTimeout(this._verifyRetryTimer);
          this._verifyRetryTimer = null;
        }
        if (this._verifyTimeoutTimer) {
          clearTimeout(this._verifyTimeoutTimer);
          this._verifyTimeoutTimer = null;
        }
        if (res.success) {
          const verifiedUrl = markUrlVerified(this.state.testingUrl || this.state.settings.apiUrl);
          if (verifiedUrl && !this.state.settings.apiUrl) {
            this.state.settings.apiUrl = verifiedUrl;
            saveSettings(this.state.settings);
          }
          const detectedUnit = normalizeGlucoseUnit(res.unit);
          if (detectedUnit && detectedUnit !== this.state.settings.unit) {
            this.state.settings = convertSettingsUnit(this.state.settings, detectedUnit);
            saveSettings(this.state.settings);
            syncBackground(this.state.settings);
          }
          const hasToken = Boolean(this.state.settings.tokenConfigured || res.hasToken);
          const successMsg = hasToken ? t("urlAndTokenValidResponse") : t("urlOkResponse");
          if (resWidget) {
            resWidget.setProperty(prop.TEXT, successMsg);
            resWidget.setProperty(prop.COLOR, 52326);
          }
          if (this._animatedToast) {
            this._animatedToast.show({
              type: "cloud",
              message: successMsg,
              duration: 3500,
              textColor: 58998
            });
          } else {
            try {
              showToast({
                content: successMsg
              });
            } catch (e) {}
          }
          this.sendMessage({
            type: "UPDATE_SETTINGS",
            settings: this.state.settings
          });
          this.sendMessage({
            type: "FETCH_DATA",
            apiUrl: this.state.settings.apiUrl
          });
        } else {
          const rawStatus = res.httpStatus || res.message && (res.message.match(/HTTP\s*(\d+)/i) || [])[1];
          let failMsg = "";
          if (rawStatus) {
            const statusNum = Number(rawStatus);
            if (statusNum === 401) {
              failMsg = t("http401");
            } else if (statusNum === 403) {
              failMsg = t("http403");
            } else if (statusNum === 404) {
              failMsg = t("http404");
            } else if (statusNum === 429) {
              failMsg = t("http429");
            } else if (statusNum === 500) {
              failMsg = t("http500");
            } else if (statusNum >= 501 && statusNum <= 504) {
              failMsg = t("http5xx", {
                code: statusNum
              });
            } else {
              failMsg = "HTTP " + statusNum;
            }
          } else if (res.code === "errTimeout" || res.message && /timeout|tempo limite/i.test(res.message)) {
            failMsg = t("errTimeout");
          } else if (res.code === "errNetwork" || res.message && /rede|network|desconect/i.test(res.message)) {
            failMsg = t("errNetworkShort");
          } else {
            failMsg = res.code ? t(res.code) : res.message || t("genericError");
          }
          if (resWidget) {
            resWidget.setProperty(prop.TEXT, t("testFailPrefix") + " " + failMsg);
            resWidget.setProperty(prop.COLOR, 16729156);
          }
          if (this._animatedToast) {
            this._animatedToast.show({
              type: "warning",
              message: failMsg,
              duration: 3500,
              textColor: 16729156
            });
          } else {
            try {
              showToast({
                content: t("testFailPrefix") + " " + failMsg
              });
            } catch (e) {}
          }
        }
      } else if (res.secret) {
        if (res.success && res.token) {
          if (resWidget) {
            resWidget.setProperty(prop.TEXT, t("tokenObtained") + "\n" + res.token.substring(0, 14) + "...");
            resWidget.setProperty(prop.COLOR, 52326);
          }
        } else {
          if (resWidget) {
            resWidget.setProperty(prop.TEXT, t("tokenObtainFail"));
            resWidget.setProperty(prop.COLOR, 16729156);
          }
        }
      }
    } catch (e) {
      console.log("ZightScout Settings: handleResponse error:", e);
    }
  },
  startSnoozeSync() {
    if (this.state.snoozeSyncTimer) clearInterval(this.state.snoozeSyncTimer);
    this.state.snoozeSyncTimer = setInterval(() => this.refreshSnoozeStatus(), 1e3);
  },
  refreshSnoozeStatus() {
    if (this.state.currentTab !== 1) return;
    if (this._animatedToast && this._animatedToast.isShowing()) return;
    const until = getSnoozeUntil();
    const minutes = until ? Math.max(1, Math.ceil((until - Date.now()) / 6e4)) : 0;
    if (until !== this.state.lastSnoozeUntil) {
      this.state.lastSnoozeUntil = until;
      console.log("[SETTINGS] Snooze state synchronized: " + (minutes ? minutes + " min" : "off"));
      this.renderCurrentTab();
      return;
    }
    const statusWidget = this.state.widgets.snoozeStatus;
    if (statusWidget) {
      try {
        statusWidget.setProperty(prop.TEXT, minutes ? t("snoozeActiveStatusMsg", {
          minutes: minutes
        }) : t("snoozeDisabledBanner"));
        statusWidget.setProperty(prop.COLOR, minutes ? 16755200 : 7833753);
      } catch (e) {}
    }
  },
  onResume() {
    this.refreshSnoozeStatus();
  },
  onDestroy() {
    console.log("[AUDIT] page2 onDestroy: cleaning up tab widgets (BLE connection kept alive for page/index)");
    if (this._animatedToast) {
      this._animatedToast.hide();
      this._animatedToast = null;
    }
    this.hideTokenPromptModal();
    this.hidePermissionDeniedModal();
    if (this._verificationPoll) {
      clearInterval(this._verificationPoll);
      this._verificationPoll = null;
    }
    if (this._verifyRetryTimer) {
      clearTimeout(this._verifyRetryTimer);
      this._verifyRetryTimer = null;
    }
    if (this._verifyTimeoutTimer) {
      clearTimeout(this._verifyTimeoutTimer);
      this._verifyTimeoutTimer = null;
    }
    if (this.state.snoozeSyncTimer) {
      clearInterval(this.state.snoozeSyncTimer);
      this.state.snoozeSyncTimer = null;
    }
    if (this.state.settings && validateSettings(this.state.settings)) {
      const saved = saveSettings(this.state.settings);
      console.log("[ZIGHTSCOUT][SETTINGS] CLOSE persisted=" + saved + " " + formatSettings(this.state.settings));
    }
    syncBackground(loadSettings());
    this.clearTabWidgets();
  }
});
