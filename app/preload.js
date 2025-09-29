// preload.js
const {
  contextBridge,
  desktopCapturer,
  shell,
  systemPreferences,
} = require("electron");

contextBridge.exposeInMainWorld("cleanCapture", {
  getSources: async (types = ["window", "screen"]) => {
    try {
      // Do not pre-block on macOS; some versions still return sources even if not explicitly granted yet.

      const sources = await desktopCapturer.getSources({
        types,
        fetchWindowIcons: true,
        thumbnailSize: { width: 320, height: 200 },
      });

      return sources.map((s) => ({
        id: s.id,
        name: s.name,
        kind: s.id.split(":")[0],
        thumbnailDataUrl:
          s.thumbnail && typeof s.thumbnail.toDataURL === "function"
            ? s.thumbnail.toDataURL()
            : null,
      }));
    } catch (e) {
      console.error("getSources error", e);
      return [];
    }
  },

  // Add method to check and request permissions
  checkScreenPermission: async () => {
    if (process.platform !== "darwin") {
      return true; // Assume granted on non-macOS platforms
    }

    try {
      // Try to get desktop sources - this will trigger permission prompt if needed
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 1, height: 1 },
      });
      return sources.length > 0;
    } catch (error) {
      console.error("Permission check error:", error);
      return false;
    }
  },

  openScreenPermissions: () => {
    try {
      if (process.platform === "darwin") {
        return shell.openExternal(
          "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
        );
      }
      if (process.platform === "win32") {
        return shell.openExternal("ms-settings:privacy-webcam");
      }
      return false;
    } catch (_) {
      return false;
    }
  },

  getMediaStatuses: () => {
    let camera = "unknown";
    let microphone = "unknown";

    try {
      if (process.platform === "darwin") {
        camera = systemPreferences.getMediaAccessStatus("camera");
        microphone = systemPreferences.getMediaAccessStatus("microphone");
        // Note: Screen recording permission can't be checked directly via systemPreferences
      }
    } catch (error) {
      console.error("Error getting media statuses:", error);
    }

    return { camera, microphone, platform: process.platform };
  },
});
