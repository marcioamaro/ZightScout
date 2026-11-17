import { gettext } from "i18n";

function isRtl() {
  const languageList = typeof navigator !== "undefined" ? navigator.languages && navigator.languages.length ? navigator.languages : [ navigator.language ] : [];
  return languageList.some(language => {
    const languageCode = String(language || "").replace("_", "-").split("-")[0].toLowerCase();
    return languageCode === "ar" || languageCode === "he" || languageCode === "iw";
  });
}

const rtl = isRtl();

const colors = {
  primary: "#005f73",
  accent: "#0a9396",
  text: "#2b2d42",
  muted: "#5c677d",
  card: "#ffffff",
  border: "#e9ecef"
};

const directionStyle = {
  direction: rtl ? "rtl" : "ltr",
  textAlign: rtl ? "right" : "left"
};

function getText(key) {
  return gettext(key);
}

function getPlainText(key) {
  return getText(key).replace(/<[^>]*>/g, "");
}

function contentBlock(title, description, styles) {
  const blockStyle = Object.assign({
    backgroundColor: colors.card,
    border: "1px solid " + colors.border,
    borderRadius: "12px",
    marginBottom: "18px",
    padding: "20px"
  }, styles || {});
  return Section({
    style: blockStyle
  }, [ Section({
    title: title,
    style: Object.assign({
      borderBottom: "2px solid " + colors.border,
      color: colors.primary,
      fontSize: "20px",
      marginBottom: "12px",
      paddingBottom: "8px"
    }, directionStyle)
  }), Section({
    description: description,
    style: Object.assign({
      color: colors.text,
      fontSize: "15px",
      lineHeight: "1.7"
    }, directionStyle)
  }) ]);
}

function alertBlock(title, description, background, border, foreground) {
  const borderStyle = {};
  borderStyle[rtl ? "borderRight" : "borderLeft"] = "5px solid " + border;
  return Section({
    style: Object.assign({
      backgroundColor: background,
      borderRadius: "12px",
      color: foreground,
      marginBottom: "18px",
      padding: "15px 20px"
    }, borderStyle, directionStyle)
  }, [ Section({
    title: title,
    style: Object.assign({
      color: foreground,
      fontSize: "16px",
      fontWeight: "700",
      marginBottom: "8px"
    }, directionStyle)
  }), Section({
    description: description,
    style: Object.assign({
      color: foreground,
      fontSize: "14px",
      lineHeight: "1.6"
    }, directionStyle)
  }) ]);
}

function supportBlock() {
  return Section({
    style: Object.assign({
      backgroundColor: "#f1f3f5",
      borderRadius: "12px",
      margin: "25px 0",
      padding: "20px"
    }, directionStyle)
  }, [ Section({
    description: getText("supportLabel"),
    style: Object.assign({
      color: colors.primary,
      fontSize: "16px",
      fontWeight: "700"
    }, directionStyle)
  }), Section({
    description: "buymeacoffee.com/marcioamaro",
    style: Object.assign({
      color: colors.accent,
      fontSize: "15px",
      marginBottom: "10px"
    }, directionStyle)
  }), Section({
    description: getText("contactLabel") + " zightscout@gmail.com",
    style: Object.assign({
      color: colors.accent,
      fontSize: "15px"
    }, directionStyle)
  }) ]);
}

function renderSettingsPage() {
  const hero = getText("heroHeadline") + "\n" + getText("heroDescription") + " " + getText("heroCare");
  const configuration = getPlainText("configurationIntro") + "\n\n" + getPlainText("connectionCheck");
  const permissionSteps = [ "1. " + getPlainText("stepSettings"), "2. " + getPlainText("stepPermissions"), "3. " + getPlainText("stepApp"), "4. " + getPlainText("stepBackground") ].join("\n");
  const supportedLanguages = [ "🇧🇷 Português (Brasil)", "🇺🇸 English (United States)", "🇪🇸 Español (España)", "🇫🇷 Français (France)", "🇩🇪 Deutsch (Deutschland)", "🇮🇹 Italiano (Italia)", "🇷🇺 Русский (Россия)", "🇨🇳 简体中文 (中国)", "🇰🇷 한국어 (대한민국)", "🇯🇵 日本語 (日本)", "🇹🇼 繁體中文 (台灣)", "🇮🇩 Bahasa Indonesia", "🇵🇱 Polski (Polska)", "🇹🇭 ไทย (ประเทศไทย)", "🇪🇬 العربية (مصر)", "🇻🇳 Tiếng Việt (Việt Nam)", "🇵🇹 Português (Portugal)", "🇳🇱 Nederlands (Nederland)", "🇹🇷 Türkçe (Türkiye)", "🇺🇦 Українська (Україна)", "🇮🇱 עברית (ישראל)", "🇷🇴 Română (România)", "🇨🇿 Čeština (Česko)", "🇬🇷 Ελληνικά (Ελλάδα)", "🇷🇸 Srpski (Srbija)", "🏴 Català (Espanya)", "🇫🇮 Suomi (Suomi)", "🇳🇴 Norsk (Norge)", "🇩🇰 Dansk (Danmark)", "🇸🇪 Svenska (Sverige)", "🇭🇺 Magyar (Magyarország)", "🇲🇾 Bahasa Melayu", "🇸🇰 Slovenčina (Slovensko)", "🇮🇳 हिन्दी (भारत)" ].join("\n");
  return Section({
    style: Object.assign({
      backgroundColor: "#f8f9fa",
      color: colors.text,
      fontFamily: "Segoe UI, system-ui, sans-serif",
      padding: "20px"
    }, directionStyle)
  }, [ contentBlock("🦉 ZightScout — " + getText("brandTag"), hero, {
    padding: "30px",
    textAlign: "center"
  }), alertBlock(getText("importantLabel"), getText("importantBody"), "#e3f2fd", "#2196f3", "#0d47a1"), alertBlock(getText("disclaimerLabel"), getPlainText("disclaimerBody"), "#fff3e0", "#ff9800", "#e65100"), supportBlock(), contentBlock(getText("configurationTitle"), configuration), contentBlock(getText("watchPermissionTitle"), getText("watchPermissionLead") + "\n\n" + getText("watchPermissionBody") + "\n\n" + getPlainText("watchPermissionCritical") + "\n\n" + permissionSteps, rtl ? {
    borderRight: "5px solid #f44336"
  } : {
    borderLeft: "5px solid #f44336"
  }), contentBlock(getText("supportedLanguagesTitle"), getText("supportedLanguagesIntro") + "\n\n" + supportedLanguages), Section({
    description: "© 2024 ZightScout. " + getText("footerSlogan"),
    style: Object.assign({
      color: "#adb5bd",
      fontSize: "13px",
      marginTop: "30px",
      textAlign: "center"
    }, directionStyle)
  }) ]);
}

AppSettingsPage({
  build() {
    return renderSettingsPage();
  }
});
