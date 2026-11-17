if (typeof console !== "undefined") {
  if (typeof console.error !== "function") console.error = console.log;
  if (typeof console.warn !== "function") console.warn = console.log;
}

import { messageBuilder, MESSAGE_TYPES } from "./shared/message";

import * as ble from "@zos/ble";

import { localStorage } from "./shared/storage";

App({
  globalData: {
    messageBuilder: messageBuilder,
    MESSAGE_TYPES: MESSAGE_TYPES
  },
  onCreate(options) {
    console.log("ZightScout initialized");
    ble.createConnect((index, data, size) => {
      try {
        const bytes = new Uint8Array(data.buffer || data, data.byteOffset || 0, size || data.byteLength);
        localStorage.setItem("zightscout_ble_mailbox", JSON.stringify({
          timestamp: Date.now(),
          bytes: Array.from(bytes)
        }));
      } catch (e) {
        console.log("[BLE] Mailbox receive error: " + e);
      }
    });
  },
  onDestroy(options) {
    console.log("ZightScout destroyed");
  }
});
