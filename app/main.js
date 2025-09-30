// // main.js
// const { app, BrowserWindow, session, systemPreferences, desktopCapturer } = require("electron/main");
// const path = require("path");

// const createWindow = () => {
//   const win = new BrowserWindow({
//     width: 1000,
//     height: 700,
//     webPreferences: {
//       preload: path.join(__dirname, "preload.js"),
//       nodeIntegration: false,
//       contextIsolation: true,
//       sandbox: false,
//       // Add these for better media device access
//       enableRemoteModule: false,
//       webSecurity: true,
//     },
//   });
  
//   win.loadFile("index.html");
  
//   // Open dev tools in development
//   if (process.env.NODE_ENV === 'development') {
//     win.webContents.openDevTools();
//   }
  
//   return win;
// };

// // Function to check screen recording permission on macOS
// async function checkScreenPermission() {
//   if (process.platform !== 'darwin') {
//     return true; // Assume granted on non-macOS platforms
//   }
  
//   try {
//     // Try to get desktop sources - this will trigger permission prompt if needed
//     const sources = await desktopCapturer.getSources({ 
//       types: ['screen'],
//       thumbnailSize: { width: 1, height: 1 } // Minimal thumbnail to reduce overhead
//     });
    
//     // If we get sources, permission is granted
//     return sources.length > 0;
//   } catch (error) {
//     console.error('Screen permission check failed:', error);
//     return false;
//   }
// }

// app.whenReady().then(async () => {
//   // Check screen capture permission on macOS
//   if (process.platform === 'darwin') {
//     try {
//       const hasScreenPermission = await checkScreenPermission();
//       console.log('Screen recording permission:', hasScreenPermission ? 'granted' : 'denied/not determined');
      
//       if (!hasScreenPermission) {
//         console.log('Screen recording permission not available. User will be prompted when trying to capture.');
//       }
//     } catch (error) {
//       console.error('Error checking screen permission:', error);
//     }
//   }
  
//   createWindow();
  
//   // Enhanced permission handler
//   session.defaultSession.setPermissionRequestHandler(
//     (webContents, permission, callback, details) => {
//       console.log('Permission requested:', permission, details);
      
//       // Allow media permissions (camera, microphone, screen)
//       if (['media', 'display-capture', 'camera', 'microphone'].includes(permission)) {
//         return callback(true);
//       }
      
//       // For other permissions, deny by default
//       callback(false);
//     }
//   );
  
//   // Handle certificate errors for local development
//   session.defaultSession.setCertificateVerifyProc((request, callback) => {
//     callback(0); // Accept all certificates in development
//   });
  
//   app.on("activate", () => {
//     if (BrowserWindow.getAllWindows().length === 0) {
//       createWindow();
//     }
//   });
// });

// app.on("window-all-closed", () => {
//   if (process.platform !== "darwin") {
//     app.quit();
//   }
// });

// main.js
const { app, BrowserWindow, desktopCapturer, session } = require('electron')

app.whenReady().then(() => {
  const mainWindow = new BrowserWindow()

  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      // Grant access to the first screen found.
      console.log(sources);
      callback({ video: sources[0], audio: 'loopback' })
    })
    // If true, use the system picker if available.
    // Note: this is currently experimental. If the system picker
    // is available, it will be used and the media request handler
    // will not be invoked.
  }, { useSystemPicker: true })

  mainWindow.loadFile('index.html')
})