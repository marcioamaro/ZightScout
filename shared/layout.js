import { getDeviceInfo } from "@zos/device";

export function isDeviceSupported() {
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
  if (W < 390 || H < 400) {
    return false;
  }
  return true;
}

export function getLayout() {
  let dev = null;
  try {
    dev = getDeviceInfo();
  } catch (e) {
    if (typeof hmSetting !== "undefined" && typeof hmSetting.getDeviceInfo === "function") {
      dev = hmSetting.getDeviceInfo();
    }
  }
  if (!dev || !dev.width || !dev.height) {
    dev = {
      width: 466,
      height: 466,
      screenShape: 1
    };
  }
  const W = dev.width || 466;
  const H = dev.height || 466;
  const BASE = 466;
  const scaleX = W / BASE;
  const scaleY = H / BASE;
  const scale = Math.min(scaleX, scaleY);
  const CX = Math.floor(W / 2);
  const CY = Math.floor(H / 2);
  let isRound = true;
  if (dev.screenShape !== undefined && dev.screenShape !== null) {
    isRound = dev.screenShape === 1;
  } else {
    isRound = W === H;
  }
  const headerY = isRound ? Math.max(14, Math.floor(36 * scaleY)) : Math.max(10, Math.floor(26 * scaleY));
  const headerFontSize = Math.max(16, Math.floor(22 * scale));
  const glucoseY = isRound ? Math.max(48, Math.floor(72 * scaleY)) : Math.max(38, Math.floor(54 * scaleY));
  const glucoseH = isRound ? Math.max(50, Math.floor(96 * scaleY)) : Math.max(44, Math.floor(82 * scaleY));
  const glucoseFontSize = Math.max(36, Math.floor(76 * scale));
  const arrowSize = Math.max(28, Math.floor(40 * scale));
  const arrowY = glucoseY + Math.floor((glucoseH - arrowSize) / 2);
  const deltaY = isRound ? Math.max(glucoseY + glucoseH + 4, Math.floor(172 * scaleY)) : Math.max(glucoseY + glucoseH + 2, Math.floor(140 * scaleY));
  const deltaFontSize = Math.max(12, Math.floor(16 * scale));
  const statusY = isRound ? Math.max(deltaY + 24, Math.floor(206 * scaleY)) : Math.max(deltaY + 20, Math.floor(168 * scaleY));
  const statusFontSize = Math.max(13, Math.floor(16 * scale));
  const connectionY = statusY + Math.floor(25 * scaleY);
  const connectionH = Math.max(19, Math.floor(22 * scaleY));
  const connectionFontSize = Math.max(10, Math.floor(13 * scale));
  const snoozeBannerY = connectionY + connectionH + 1;
  const snoozeBannerH = Math.max(24, Math.floor(28 * scaleY));
  const lastUpdateY = Math.floor(H * .79);
  const graphY = isRound ? Math.max(snoozeBannerY + snoozeBannerH + 4, Math.floor(H * .54)) : Math.max(snoozeBannerY + snoozeBannerH + 4, Math.floor(H * .52));
  const graphMaxH = Math.max(42, lastUpdateY - graphY - Math.max(6, Math.floor(8 * scaleY)));
  const graphPreferredH = isRound ? Math.max(50, Math.floor(H * .12)) : Math.max(54, Math.floor(H * .17));
  const graphH = Math.min(graphPreferredH, graphMaxH);
  const graphW = Math.floor(W * (isRound ? .84 : .92));
  const graphX = Math.floor((W - graphW) / 2);
  const btnBottomY = Math.floor(H * (isRound ? .85 : .89));
  const btnW = Math.max(80, Math.floor(120 * scaleX));
  const btnH = Math.max(32, Math.floor(38 * scaleY));
  const btnRadius = Math.floor(btnH / 2);
  const btnFontSize = Math.max(12, Math.floor(16 * scale));
  const btnGap = Math.max(10, Math.floor(20 * scaleX));
  const p2TitleY = Math.max(10, Math.floor(18 * scaleY));
  const p2TitleFontSize = Math.max(15, Math.floor(20 * scale));
  const tabW = Math.max(76, Math.floor(104 * scaleX));
  const tabH = Math.max(26, Math.floor(32 * scaleY));
  const tabY = Math.max(p2TitleY + 24, Math.floor(48 * scaleY));
  const tabGap = Math.max(4, Math.floor(8 * scaleX));
  const tabStartX = CX - Math.floor((tabW * 3 + tabGap * 2) / 2);
  const tabFontSize = Math.max(11, Math.floor(14 * scale));
  const saveBtnW = Math.max(120, Math.floor(180 * scaleX));
  const saveBtnH = Math.max(34, Math.floor(40 * scaleY));
  const saveBtnY = H - saveBtnH - Math.max(8, Math.floor(isRound ? 16 * scaleY : 8 * scaleY));
  const saveBtnRadius = Math.floor(saveBtnH / 2);
  const saveBtnFontSize = Math.max(13, Math.floor(16 * scale));
  const rowStartY = tabY + tabH + Math.max(8, Math.floor(12 * scaleY));
  const rowH = Math.max(48, Math.floor(64 * scaleY));
  const stepBtnW = Math.max(36, Math.floor(48 * scaleX));
  const stepBtnH = Math.max(26, Math.floor(36 * scaleY));
  const stepBtnRadius = Math.floor(stepBtnH / 2);
  const valDisplayW = Math.max(54, Math.floor(72 * scaleX));
  return {
    W: W,
    H: H,
    CX: CX,
    CY: CY,
    BASE: BASE,
    scale: scale,
    scaleX: scaleX,
    scaleY: scaleY,
    isRound: isRound,
    headerY: headerY,
    headerFontSize: headerFontSize,
    glucoseY: glucoseY,
    glucoseH: glucoseH,
    glucoseFontSize: glucoseFontSize,
    arrowSize: arrowSize,
    arrowY: arrowY,
    deltaY: deltaY,
    deltaFontSize: deltaFontSize,
    statusY: statusY,
    statusFontSize: statusFontSize,
    connectionY: connectionY,
    connectionH: connectionH,
    connectionFontSize: connectionFontSize,
    snoozeBannerY: snoozeBannerY,
    snoozeBannerH: snoozeBannerH,
    lastUpdateY: lastUpdateY,
    graphBox: {
      x: graphX,
      y: graphY,
      w: graphW,
      h: graphH
    },
    btnBottomY: btnBottomY,
    btnW: btnW,
    btnH: btnH,
    btnRadius: btnRadius,
    btnFontSize: btnFontSize,
    btnGap: btnGap,
    p2TitleY: p2TitleY,
    p2TitleFontSize: p2TitleFontSize,
    tabW: tabW,
    tabH: tabH,
    tabY: tabY,
    tabGap: tabGap,
    tabStartX: tabStartX,
    tabFontSize: tabFontSize,
    saveBtnW: saveBtnW,
    saveBtnH: saveBtnH,
    saveBtnY: saveBtnY,
    saveBtnRadius: saveBtnRadius,
    saveBtnFontSize: saveBtnFontSize,
    rowStartY: rowStartY,
    rowH: rowH,
    stepBtnW: stepBtnW,
    stepBtnH: stepBtnH,
    stepBtnRadius: stepBtnRadius,
    valDisplayW: valDisplayW
  };
}
