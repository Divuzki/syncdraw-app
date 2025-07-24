"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Add this at the very top, before other imports
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });
const electron_1 = require("electron");
const electron_updater_1 = require("electron-updater");
const http_1 = __importDefault(require("http"));
const url_1 = require("url");
const isDev = process.env.NODE_ENV === 'development';
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        frame: false,
        titleBarStyle: 'hidden',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        show: false,
        icon: path.join(__dirname, '../public/syncdaw-icon.png'),
    });
    // Load the app
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    // Auto-updater setup (only in production)
    if (!isDev) {
        electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
    }
    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    // Handle window events
    mainWindow.on('minimize', () => {
        console.log('Window minimized');
    });
    mainWindow.on('maximize', () => {
        console.log('Window maximized');
    });
    mainWindow.on('unmaximize', () => {
        console.log('Window unmaximized');
    });
    mainWindow.on('close', (event) => {
        console.log('Window close requested');
        // You can add confirmation dialog here if needed
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
}
// OAuth authentication handlers
let authWindow = null;
let authCallback = null;
let callbackServer = null;
function createAuthWindowWithServer(authUrl) {
    return new Promise((resolve, reject) => {
        // Store the callback
        authCallback = resolve;
        // Open the auth URL in the default browser
        electron_1.shell.openExternal(authUrl);
        // Set up a timeout to reject if no response
        const timeout = setTimeout(() => {
            authCallback = null;
            stopCallbackServer();
            reject(new Error('Authentication timeout'));
        }, 300000); // 5 minutes timeout
        // Override the callback to clear timeout
        const originalCallback = authCallback;
        authCallback = (result) => {
            clearTimeout(timeout);
            stopCallbackServer();
            originalCallback(result);
        };
    });
}
function startCallbackServer() {
    return new Promise((resolve, reject) => {
        callbackServer = http_1.default.createServer((req, res) => {
            if (req.url && req.url.startsWith('/auth/callback')) {
                handleAuthCallback(req.url, res);
            }
            else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            }
        });
        // Try to bind to port 8080, fallback to random port
        callbackServer.listen(8080, 'localhost', () => {
            const address = callbackServer?.address();
            const port = typeof address === 'object' && address ? address.port : 8080;
            console.log(`OAuth callback server started on port ${port}`);
            resolve(port);
        });
        callbackServer.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                // Port 8080 is in use, try random port
                callbackServer = http_1.default.createServer((req, res) => {
                    if (req.url && req.url.startsWith('/auth/callback')) {
                        handleAuthCallback(req.url, res);
                    }
                    else {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('Not Found');
                    }
                });
                callbackServer.listen(0, 'localhost', () => {
                    const address = callbackServer?.address();
                    const port = typeof address === 'object' && address ? address.port : 0;
                    console.log(`OAuth callback server started on port ${port}`);
                    resolve(port);
                });
                callbackServer.on('error', reject);
            }
            else {
                reject(err);
            }
        });
    });
}
function stopCallbackServer() {
    if (callbackServer) {
        callbackServer.close();
        callbackServer = null;
        console.log('OAuth callback server stopped');
    }
}
function handleAuthCallback(url, res) {
    console.log('Received auth callback:', url);
    if (authCallback) {
        try {
            const urlObj = new url_1.URL(`http://localhost${url}`);
            const code = urlObj.searchParams.get('code');
            const error = urlObj.searchParams.get('error');
            const errorDescription = urlObj.searchParams.get('error_description');
            const state = urlObj.searchParams.get('state');
            // Send response to browser
            if (res) {
                if (error) {
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end(`
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Authentication Error - SyncDraw</title>
                <style>
                  * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                  }
                  
                  body {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, hsl(221.2, 83.2%, 53.3%) 0%, hsl(217.2, 91.2%, 59.8%) 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: hsl(210, 40%, 98%);
                  }
                  
                  .container {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 16px;
                    padding: 2rem;
                    max-width: 400px;
                    width: 90%;
                    text-align: center;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                  }
                  
                  .icon {
                    width: 64px;
                    height: 64px;
                    background: rgba(239, 68, 68, 0.2);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                    font-size: 2rem;
                  }
                  
                  h1 {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    color: hsl(210, 40%, 98%);
                  }
                  
                  p {
                    color: rgba(255, 255, 255, 0.8);
                    margin-bottom: 1rem;
                    line-height: 1.5;
                  }
                  
                  .countdown {
                    font-size: 0.875rem;
                    color: rgba(255, 255, 255, 0.6);
                    margin-bottom: 0;
                  }
                  
                  .pulse {
                    animation: pulse 2s infinite;
                  }
                  
                  @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="icon pulse">❌</div>
                  <h1>Authentication Error</h1>
                  <p>Error: ${error}</p>
                  ${errorDescription ? `<p>Description: ${errorDescription}</p>` : ''}
                  <p class="countdown">This window will close automatically in <span id="countdown">3</span> seconds</p>
                </div>
                
                <script>
                  let seconds = 3;
                  const countdownEl = document.getElementById('countdown');
                  
                  const timer = setInterval(() => {
                    seconds--;
                    countdownEl.textContent = seconds;
                    
                    if (seconds <= 0) {
                      clearInterval(timer);
                      window.close();
                    }
                  }, 1000);
                </script>
              </body>
            </html>
          `);
                }
                else if (code) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Authentication Successful - SyncDraw</title>
                <style>
                  * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                  }
                  
                  body {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, hsl(221.2, 83.2%, 53.3%) 0%, hsl(217.2, 91.2%, 59.8%) 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: hsl(210, 40%, 98%);
                  }
                  
                  .container {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 16px;
                    padding: 2rem;
                    max-width: 400px;
                    width: 90%;
                    text-align: center;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                    animation: slideUp 0.3s ease-out;
                  }
                  
                  .icon {
                    width: 64px;
                    height: 64px;
                    background: rgba(34, 197, 94, 0.2);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                    font-size: 2rem;
                    animation: bounce 0.6s ease-out;
                  }
                  
                  h1 {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    color: hsl(210, 40%, 98%);
                  }
                  
                  p {
                    color: rgba(255, 255, 255, 0.8);
                    margin-bottom: 1.5rem;
                    line-height: 1.5;
                  }
                  
                  
                  @keyframes slideUp {
                    from {
                      transform: translateY(20px);
                      opacity: 0;
                    }
                    to {
                      transform: translateY(0);
                      opacity: 1;
                    }
                  }
                  
                  @keyframes bounce {
                    0%, 20%, 53%, 80%, 100% {
                      transform: translate3d(0, 0, 0);
                    }
                    40%, 43% {
                      transform: translate3d(0, -8px, 0);
                    }
                    70% {
                      transform: translate3d(0, -4px, 0);
                    }
                    90% {
                      transform: translate3d(0, -2px, 0);
                    }
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="icon">✓</div>
                  <h1>Authentication Successful!</h1>
                  <p>Welcome to SyncDraw! You can close this window and return to the application.</p>
                  
                  </div>
                
               
              </body>
            </html>
          `);
                }
                else {
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end(`
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Authentication Error - SyncDraw</title>
                <style>
                  * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                  }
                  
                  body {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, hsl(221.2, 83.2%, 53.3%) 0%, hsl(217.2, 91.2%, 59.8%) 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: hsl(210, 40%, 98%);
                  }
                  
                  .container {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 16px;
                    padding: 2rem;
                    max-width: 400px;
                    width: 90%;
                    text-align: center;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                  }
                  
                  .icon {
                    width: 64px;
                    height: 64px;
                    background: rgba(239, 68, 68, 0.2);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                    font-size: 2rem;
                  }
                  
                  h1 {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    color: hsl(210, 40%, 98%);
                  }
                  
                  p {
                    color: rgba(255, 255, 255, 0.8);
                    margin-bottom: 1rem;
                    line-height: 1.5;
                  }
                  
                  .countdown {
                    font-size: 0.875rem;
                    color: rgba(255, 255, 255, 0.6);
                    margin-bottom: 0;
                  }
                  
                  .pulse {
                    animation: pulse 2s infinite;
                  }
                  
                  @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="icon pulse">❌</div>
                  <h1>Authentication Error</h1>
                  <p>No authorization code received</p>
                  <p class="countdown">This window will close automatically in <span id="countdown">3</span> seconds</p>
                </div>
                
                <script>
                  let seconds = 3;
                  const countdownEl = document.getElementById('countdown');
                  
                  const timer = setInterval(() => {
                    seconds--;
                    countdownEl.textContent = seconds;
                    
                    if (seconds <= 0) {
                      clearInterval(timer);
                      window.close();
                    }
                  }, 1000);
                </script>
              </body>
            </html>
          `);
                }
            }
            // Handle the callback
            if (error) {
                authCallback({ success: false, error: error, description: errorDescription });
            }
            else if (code) {
                authCallback({ success: true, code, state });
            }
            else {
                authCallback({ success: false, error: 'No authorization code received' });
            }
        }
        catch (err) {
            if (res) {
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end(`
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Authentication Error - SyncDraw</title>
              <style>
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                
                body {
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  background: linear-gradient(135deg, hsl(221.2, 83.2%, 53.3%) 0%, hsl(217.2, 91.2%, 59.8%) 100%);
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: hsl(210, 40%, 98%);
                }
                
                .container {
                  background: rgba(255, 255, 255, 0.1);
                  backdrop-filter: blur(16px);
                  border: 1px solid rgba(255, 255, 255, 0.2);
                  border-radius: 16px;
                  padding: 2rem;
                  max-width: 400px;
                  width: 90%;
                  text-align: center;
                  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                }
                
                .icon {
                  width: 64px;
                  height: 64px;
                  background: rgba(239, 68, 68, 0.2);
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto 1.5rem;
                  font-size: 2rem;
                }
                
                h1 {
                  font-size: 1.5rem;
                  font-weight: 600;
                  margin-bottom: 0.5rem;
                  color: hsl(210, 40%, 98%);
                }
                
                p {
                  color: rgba(255, 255, 255, 0.8);
                  margin-bottom: 1rem;
                  line-height: 1.5;
                }
                
                .countdown {
                  font-size: 0.875rem;
                  color: rgba(255, 255, 255, 0.6);
                  margin-bottom: 0;
                }
                
                .pulse {
                  animation: pulse 2s infinite;
                }
                
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.5; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="icon pulse">❌</div>
                <h1>Authentication Error</h1>
                <p>Invalid callback URL</p>
                <p class="countdown">This window will close automatically in <span id="countdown">3</span> seconds</p>
              </div>
              
              <script>
                let seconds = 3;
                const countdownEl = document.getElementById('countdown');
                
                const timer = setInterval(() => {
                  seconds--;
                  countdownEl.textContent = seconds;
                  
                  if (seconds <= 0) {
                    clearInterval(timer);
                    window.close();
                  }
                }, 1000);
              </script>
            </body>
          </html>
        `);
            }
            authCallback({ success: false, error: 'Invalid callback URL' });
        }
        authCallback = null;
    }
    else if (res) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Authentication Error - SyncDraw</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, hsl(221.2, 83.2%, 53.3%) 0%, hsl(217.2, 91.2%, 59.8%) 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              color: hsl(210, 40%, 98%);
            }
            
            .container {
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(16px);
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 16px;
              padding: 2rem;
              max-width: 400px;
              width: 90%;
              text-align: center;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            }
            
            .icon {
              width: 64px;
              height: 64px;
              background: rgba(239, 68, 68, 0.2);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 1.5rem;
              font-size: 2rem;
            }
            
            h1 {
              font-size: 1.5rem;
              font-weight: 600;
              margin-bottom: 0.5rem;
              color: hsl(210, 40%, 98%);
            }
            
            p {
              color: rgba(255, 255, 255, 0.8);
              margin-bottom: 1rem;
              line-height: 1.5;
            }
            
            .countdown {
              font-size: 0.875rem;
              color: rgba(255, 255, 255, 0.6);
              margin-bottom: 0;
            }
            
            .pulse {
              animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon pulse">❌</div>
            <h1>Authentication Error</h1>
            <p>No active authentication session</p>
            <p class="countdown">This window will close automatically in <span id="countdown">3</span> seconds</p>
          </div>
          
          <script>
            let seconds = 3;
            const countdownEl = document.getElementById('countdown');
            
            const timer = setInterval(() => {
              seconds--;
              countdownEl.textContent = seconds;
              
              if (seconds <= 0) {
                clearInterval(timer);
                window.close();
              }
            }, 1000);
          </script>
        </body>
      </html>
    `);
    }
}
// Ensure single instance
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    // App event handlers
    electron_1.app.whenReady().then(() => {
        createWindow();
        // Auto-updater events
        if (!isDev) {
            electron_updater_1.autoUpdater.on('checking-for-update', () => {
                console.log('Checking for update...');
            });
            electron_updater_1.autoUpdater.on('update-available', (info) => {
                console.log('Update available.');
                mainWindow?.webContents.send('update-available', info);
            });
            electron_updater_1.autoUpdater.on('update-not-available', (info) => {
                console.log('Update not available.');
            });
            electron_updater_1.autoUpdater.on('error', (err) => {
                console.log('Error in auto-updater. ' + err);
            });
            electron_updater_1.autoUpdater.on('download-progress', (progressObj) => {
                let log_message = "Download speed: " + progressObj.bytesPerSecond;
                log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
                log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
                console.log(log_message);
                mainWindow?.webContents.send('download-progress', progressObj);
            });
            electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
                console.log('Update downloaded');
                mainWindow?.webContents.send('update-downloaded', info);
            });
        }
    });
}
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
// Auto-updater IPC handlers
electron_1.ipcMain.handle('check-for-updates', async () => {
    if (!isDev) {
        try {
            const result = await electron_updater_1.autoUpdater.checkForUpdates();
            return { success: true, updateInfo: result?.updateInfo };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    return { success: false, error: 'Updates not available in development mode' };
});
electron_1.ipcMain.handle('download-update', async () => {
    if (!isDev) {
        try {
            await electron_updater_1.autoUpdater.downloadUpdate();
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    return { success: false, error: 'Updates not available in development mode' };
});
electron_1.ipcMain.handle('install-update', async () => {
    if (!isDev) {
        electron_updater_1.autoUpdater.quitAndInstall();
        return { success: true };
    }
    return { success: false, error: 'Updates not available in development mode' };
});
// Authentication IPC handlers
electron_1.ipcMain.handle('auth-login-external', async (event, provider) => {
    try {
        // Start callback server first to get the actual port
        const port = await startCallbackServer();
        // Generate OAuth URLs based on provider
        let authUrl = '';
        const redirectUri = `http://localhost:${port}/auth/callback`;
        const state = Math.random().toString(36).substring(2, 15);
        switch (provider) {
            case 'google':
                const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
                authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                    `client_id=${googleClientId}&` +
                    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
                    `response_type=code&` +
                    `scope=${encodeURIComponent('openid email profile')}&` +
                    `state=${state}`;
                break;
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
        console.log('Opening auth URL:', authUrl);
        const result = await createAuthWindowWithServer(authUrl);
        if (result.success && result.code) {
            // Here you would typically exchange the code for tokens
            // For now, we'll return the code to be handled by the renderer
            return {
                success: true,
                code: result.code,
                state: result.state,
                provider
            };
        }
        else {
            return {
                success: false,
                error: result.error || 'Authentication failed'
            };
        }
    }
    catch (error) {
        console.error('Auth error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Authentication failed'
        };
    }
});
electron_1.ipcMain.handle('auth-logout', async () => {
    try {
        // Clear any stored auth data
        return { success: true };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Logout failed'
        };
    }
});
// VM Orchestration module
const vmOrchestration = {
    async launchVM(sessionId, dawType) {
        try {
            // Call Azure Functions to provision VM
            const response = await fetch(`${process.env.AZURE_FUNCTIONS_URL}/api/vm-provision`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-functions-key': process.env.AZURE_FUNCTIONS_KEY || '',
                },
                body: JSON.stringify({
                    sessionId,
                    dawType,
                    userId: sessionId, // Assuming sessionId contains user info
                }),
            });
            if (!response.ok) {
                throw new Error(`VM provisioning failed: ${response.status}`);
            }
            const result = await response.json();
            return {
                success: true,
                vmId: result.vmId,
                streamingUrl: result.streamingUrl,
                status: result.status
            };
        }
        catch (error) {
            console.error('VM launch error:', error);
            throw error;
        }
    },
    async getStreamingUrl(vmId) {
        try {
            // Generate signed streaming URL
            const response = await fetch(`${process.env.AZURE_FUNCTIONS_URL}/api/vm-stream?vmId=${vmId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-functions-key': process.env.AZURE_FUNCTIONS_KEY || '',
                },
            });
            if (!response.ok) {
                throw new Error(`Failed to get streaming URL: ${response.status}`);
            }
            const result = await response.json();
            return result.signedUrl;
        }
        catch (error) {
            console.error('Streaming URL error:', error);
            throw error;
        }
    }
};
// IPC handlers for studio functionality
electron_1.ipcMain.handle('launch-studio', async (event, sessionId, dawType = 'pro-tools') => {
    console.log('Launching studio for session:', sessionId, 'with DAW:', dawType);
    try {
        // Step 1: Launch VM with specified DAW
        const vmResult = await vmOrchestration.launchVM(sessionId, dawType);
        if (!vmResult.success) {
            throw new Error('Failed to launch VM');
        }
        // Step 2: Get signed streaming URL
        const streamingUrl = await vmOrchestration.getStreamingUrl(vmResult.vmId);
        return {
            success: true,
            sessionId,
            vmId: vmResult.vmId,
            streamingUrl,
            dawType,
            message: 'Studio launched successfully'
        };
    }
    catch (error) {
        console.error('Failed to launch studio:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('end-session', async (event, sessionId) => {
    console.log('Ending session:', sessionId);
    try {
        // Add your session cleanup logic here
        // This could involve stopping VMs, saving state, etc.
        return { success: true, sessionId, message: 'Session ended successfully' };
    }
    catch (error) {
        console.error('Failed to end session:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('get-session-metadata', async (event, sessionId) => {
    console.log('Getting metadata for session:', sessionId);
    try {
        // Add your metadata retrieval logic here
        // This could involve fetching from database, APIs, etc.
        const metadata = {
            sessionId,
            name: `Session ${sessionId}`,
            participants: [],
            createdAt: new Date().toISOString(),
            status: 'active'
        };
        return { success: true, metadata };
    }
    catch (error) {
        console.error('Failed to get session metadata:', error);
        return { success: false, error: error.message };
    }
});
// Legacy IPC handlers
electron_1.ipcMain.handle('select-folder', async () => {
    const result = await electron_1.dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
    });
    return result;
});
electron_1.ipcMain.handle('select-file', async () => {
    const result = await electron_1.dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Audio Files', extensions: ['wav', 'mp3', 'aiff', 'flac'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    return result;
});
