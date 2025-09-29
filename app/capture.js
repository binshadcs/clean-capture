// capture.js (renderer process)
const picker = document.getElementById("picker");
const stage = document.getElementById("stage");
const screenVideo = document.getElementById("screenVideo");
const cameraBox = document.getElementById("cameraBox");
const cameraVideo = document.getElementById("cameraVideo");
const refreshBtn = document.getElementById("refresh");
const toggleCamBtn = document.getElementById("toggleCam");

let screenStream = null;
let cameraStream = null;
let cameraEnabled = false;

async function renderSourceGrid(sources) {
  picker.innerHTML = "";
  // Sort by id to group screens first
  const sorted = [...sources].sort(
    (a, b) =>
      (a.id.startsWith("screen:") ? -1 : 1) -
      (b.id.startsWith("screen:") ? -1 : 1)
  );
  for (const s of sorted) {
    const card = document.createElement("button");
    card.className = "source-card";
    card.title = s.name;
    card.innerHTML = `
      <img class="source-thumb" src="${s.thumbnailDataUrl || ""}" alt="${
      s.name
    }" />
      <div class="source-name">${s.name}</div>
    `;
    card.addEventListener("click", () => startScreenShare(s.id));
    picker.appendChild(card);
  }
}

async function bootstrapCapture() {
  try {
    // Check screen permission first
    const hasPermission = await window.cleanCapture.checkScreenPermission();
    if (!hasPermission) {
      showPermissionError();
      return;
    }

    // Ask for both and then filter to screens for broader compatibility across OSes
    const allSources = await window.cleanCapture.getSources([
      "window",
      "screen",
    ]);

    if (allSources.length === 0) {
      showPermissionError();
      return;
    }

    const screens = allSources.filter(
      (s) =>
        s.kind === "screen" ||
        s.id.startsWith("screen:") ||
        /screen|display|entire screen/i.test(s.name)
    );

    if (screens.length === 1) {
      await startScreenShare(screens[0].id);
      return;
    }

    if (screens.length > 1) {
      await renderSourceGrid(screens);
      picker.classList.remove("hidden");
      return;
    }

    // If we couldn't positively identify screens but have sources, show them all
    if (allSources.length > 1) {
      await renderSourceGrid(allSources);
      picker.classList.remove("hidden");
      return;
    }

    if (allSources.length === 1) {
      await startScreenShare(allSources[0].id);
      return;
    }

    // Fallback: show error with actions
    showPermissionError();
  } catch (e) {
    console.error("bootstrapCapture error", e);
    showPermissionError();
  }
}

function showPermissionError() {
  const statuses = window.cleanCapture.getMediaStatuses
    ? window.cleanCapture.getMediaStatuses()
    : null;

  const msg = document.createElement("div");
  msg.className = "source-name";
  msg.innerHTML = `Screen recording permission required.${
    statuses
      ? ` Camera: ${statuses.camera}, Microphone: ${statuses.microphone}.`
      : ""
  }`;

  const tryBtn = document.createElement("button");
  tryBtn.className = "btn-small";
  tryBtn.textContent = "Try Again";
  tryBtn.addEventListener("click", async () => {
    await bootstrapCapture();
  });

  const permBtn = document.createElement("button");
  permBtn.className = "btn-small";
  permBtn.textContent = "Open Screen Recording Settings";
  permBtn.addEventListener("click", () => {
    if (window.cleanCapture.openScreenPermissions) {
      window.cleanCapture.openScreenPermissions();
    }
  });

  picker.innerHTML = "";
  picker.appendChild(msg);
  picker.appendChild(tryBtn);
  picker.appendChild(permBtn);
  picker.classList.remove("hidden");
}

async function startScreenShare(sourceId) {
  try {
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
    }

    const constraints = {
      audio: false,
      video: {
        // Electron chromium-based desktop capture
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: sourceId,
          maxFrameRate: 30,
          maxWidth: 1920,
          maxHeight: 1080,
        },
        // Fallback for environments that ignore 'mandatory'
        frameRate: { ideal: 30 },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        displaySurface: "monitor",
      },
    };

    // Try Electron desktop capture first
    screenStream = await navigator.mediaDevices.getUserMedia(constraints);
    // If no tracks or inactive, fall back to system picker
    const hasVideo =
      screenStream &&
      screenStream.getVideoTracks &&
      screenStream.getVideoTracks().length > 0;
    if (!hasVideo) {
      await startWithSystemPicker();
      return;
    }
    screenVideo.srcObject = screenStream;
    try {
      await screenVideo.play();
    } catch (_) {}
    picker.classList.add("hidden");
    stage.classList.remove("hidden");
  } catch (e) {
    console.error("Failed to start screen share", e);
    // Fall back to system picker when desktop constraints fail
    try {
      await startWithSystemPicker();
      return;
    } catch (err) {
      if (e.name === "NotAllowedError") {
        alert(
          "Screen sharing permission denied. Please allow screen recording in system settings."
        );
        if (window.cleanCapture.openScreenPermissions) {
          window.cleanCapture.openScreenPermissions();
        }
      } else {
        alert(`Failed to start screen share: ${e.message}`);
      }
    }
  }
}

async function startWithSystemPicker() {
  try {
    if (navigator.mediaDevices.getDisplayMedia) {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
      }

      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 30,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      screenVideo.srcObject = screenStream;
      picker.classList.add("hidden");
      stage.classList.remove("hidden");
    } else {
      alert("System display picker not available");
    }
  } catch (e) {
    console.error("System picker error", e);
    if (e.name === "NotAllowedError") {
      alert("Screen sharing permission denied");
    } else {
      alert(`Failed to start screen share: ${e.message}`);
    }
  }
}

async function ensureCameraStarted() {
  const hasLiveTracks =
    !!cameraStream &&
    cameraStream.getTracks().some((t) => t.readyState === "live");
  if (hasLiveTracks) return;

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: 30,
      },
      audio: false,
    });
    cameraVideo.srcObject = cameraStream;
  } catch (e) {
    console.error("Camera error", e);
    throw e;
  }
}

toggleCamBtn.addEventListener("click", async () => {
  try {
    if (!cameraEnabled) {
      await ensureCameraStarted();
      cameraBox.classList.remove("hidden");
      cameraEnabled = true;
      toggleCamBtn.textContent = "Hide Camera";
      try {
        await cameraVideo.play();
      } catch (_) {}
    } else {
      cameraBox.classList.add("hidden");
      // Stop and release camera tracks when turning off
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
        cameraStream = null;
        cameraVideo.srcObject = null;
      }
      cameraEnabled = false;
      toggleCamBtn.textContent = "Show Camera";
    }
  } catch (e) {
    console.error("Camera error", e);
    if (e.name === "NotAllowedError") {
      alert(
        "Camera permission denied. Please allow camera access in system settings."
      );
    } else {
      alert("Could not access camera");
    }
  }
});

refreshBtn.addEventListener("click", bootstrapCapture);

// Initialize on page load
bootstrapCapture();

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  [screenStream, cameraStream].forEach((stream) => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
  });
});
