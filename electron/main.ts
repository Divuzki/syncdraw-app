// Add this at the very top, before other imports
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import http from 'http';
import { URL } from 'url';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
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
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Auto-updater setup (only in production)
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
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
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// OAuth authentication handlers
let authWindow: BrowserWindow | null = null;
let authCallback: ((result: any) => void) | null = null;
let callbackServer: http.Server | null = null;

function createAuthWindowWithServer(authUrl: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // Store the callback
    authCallback = resolve;
    
    // Open the auth URL in the default browser
    shell.openExternal(authUrl);
    
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

function startCallbackServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    callbackServer = http.createServer((req, res) => {
      if (req.url && req.url.startsWith('/auth/callback')) {
        handleAuthCallback(req.url, res);
      } else {
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
    
    callbackServer.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        // Port 8080 is in use, try random port
        callbackServer = http.createServer((req, res) => {
          if (req.url && req.url.startsWith('/auth/callback')) {
            handleAuthCallback(req.url, res);
          } else {
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
      } else {
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

function handleAuthCallback(url: string, res?: http.ServerResponse) {
  console.log('Received auth callback:', url);
  
  if (authCallback) {
    try {
      const urlObj = new URL(`http://localhost${url}`);
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
        } else if (code) {
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
        } else {
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
      } else if (code) {
        authCallback({ success: true, code, state });
      } else {
        authCallback({ success: false, error: 'No authorization code received' });
      }
    } catch (err) {
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
  } else if (res) {
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
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // App event handlers
  app.whenReady().then(() => {
    createWindow();
  
  // Auto-updater events
  if (!isDev) {
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
    });
    
    autoUpdater.on('update-available', (info) => {
      console.log('Update available.');
      mainWindow?.webContents.send('update-available', info);
    });
    
    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available.');
    });
    
    autoUpdater.on('error', (err) => {
      console.log('Error in auto-updater. ' + err);
    });
    
    autoUpdater.on('download-progress', (progressObj) => {
      let log_message = "Download speed: " + progressObj.bytesPerSecond;
      log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
      log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
      console.log(log_message);
      mainWindow?.webContents.send('download-progress', progressObj);
    });
    
    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded');
      mainWindow?.webContents.send('update-downloaded', info);
    });
  }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Auto-updater IPC handlers
ipcMain.handle('check-for-updates', async () => {
  if (!isDev) {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, updateInfo: result?.updateInfo };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
  return { success: false, error: 'Updates not available in development mode' };
});

ipcMain.handle('download-update', async () => {
  if (!isDev) {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
  return { success: false, error: 'Updates not available in development mode' };
});

ipcMain.handle('install-update', async () => {
  if (!isDev) {
    autoUpdater.quitAndInstall();
    return { success: true };
  }
  return { success: false, error: 'Updates not available in development mode' };
});

// Authentication IPC handlers
ipcMain.handle('auth-login-external', async (event, provider: string) => {
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
    } else {
      return {
        success: false,
        error: result.error || 'Authentication failed'
      };
    }
  } catch (error) {
    console.error('Auth error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    };
  }
});

ipcMain.handle('auth-logout', async () => {
  try {
    // Clear any stored auth data
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Logout failed'
    };
  }
});

// VM Orchestration module
const vmOrchestration = {
  async launchVM(sessionId: string, dawType: string) {
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
    } catch (error) {
      console.error('VM launch error:', error);
      throw error;
    }
  },
  
  async getStreamingUrl(vmId: string) {
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
    } catch (error) {
      console.error('Streaming URL error:', error);
      throw error;
    }
  }
};

// IPC handlers for studio functionality
ipcMain.handle('launch-studio', async (event, sessionId: string, dawType: string = 'pro-tools') => {
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
  } catch (error) {
    console.error('Failed to launch studio:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('end-session', async (event, sessionId: string) => {
  console.log('Ending session:', sessionId);
  try {
    // Add your session cleanup logic here
    // This could involve stopping VMs, saving state, etc.
    return { success: true, sessionId, message: 'Session ended successfully' };
  } catch (error) {
    console.error('Failed to end session:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-session-metadata', async (event, sessionId: string) => {
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
  } catch (error) {
    console.error('Failed to get session metadata:', error);
    return { success: false, error: (error as Error).message };
  }
});

// Legacy IPC handlers
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  });
  return result;
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'Audio Files', extensions: ['wav', 'mp3', 'aiff', 'flac'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result;
});