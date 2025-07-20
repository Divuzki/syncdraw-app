import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';

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