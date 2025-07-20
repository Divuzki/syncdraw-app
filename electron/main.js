const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// Load environment variables
require('dotenv').config();

// Check if we should use mock data
const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true';
console.log(`🔧 Electron Main: ${USE_MOCK_DATA ? 'MOCK' : 'REAL'} mode enabled`);

// Mock data for sessions
const mockSessions = [
  {
    id: 'mock-session-1',
    name: 'Design Review Meeting',
    description: 'Weekly design review for the new product features',
    createdAt: new Date('2024-01-15T10:00:00Z').toISOString(),
    updatedAt: new Date('2024-01-15T14:30:00Z').toISOString(),
    status: 'active',
    ownerId: 'user-123',
    settings: {
      maxParticipants: 10,
      allowFileUpload: true,
      allowChat: true,
      autoSave: true
    }
  },
  {
    id: 'mock-session-2',
    name: 'Sprint Planning',
    description: 'Planning session for Sprint 23',
    createdAt: new Date('2024-01-14T09:00:00Z').toISOString(),
    updatedAt: new Date('2024-01-14T12:00:00Z').toISOString(),
    status: 'inactive',
    ownerId: 'user-456',
    settings: {
      maxParticipants: 8,
      allowFileUpload: true,
      allowChat: true,
      autoSave: false
    }
  },
  {
    id: 'mock-session-3',
    name: 'Client Presentation',
    description: 'Final presentation to the client',
    createdAt: new Date('2024-01-13T14:00:00Z').toISOString(),
    updatedAt: new Date('2024-01-13T16:30:00Z').toISOString(),
    status: 'launching',
    ownerId: 'user-123',
    settings: {
      maxParticipants: 15,
      allowFileUpload: false,
      allowChat: true,
      autoSave: true
    }
  }
];

// Mock delay function
const mockDelay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

let mainWindow;

function createWindow() {
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
    mainWindow.show();
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
app.whenReady().then(createWindow);

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

// VM Orchestration module
const vmOrchestration = {
  async launchVM(sessionId, dawType) {
    try {
      // Call Azure Functions to provision VM
      const response = await fetch(`${process.env.AZURE_FUNCTIONS_URL}/api/vm-provision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-functions-key': process.env.AZURE_FUNCTIONS_KEY,
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
  
  async getStreamingUrl(vmId) {
    try {
      // Generate signed streaming URL
      const response = await fetch(`${process.env.AZURE_FUNCTIONS_URL}/api/vm-stream?vmId=${vmId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-functions-key': process.env.AZURE_FUNCTIONS_KEY,
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
ipcMain.handle('launch-studio', async (event, sessionId, dawType = 'pro-tools') => {
  console.log('Launching studio for session:', sessionId, 'with DAW:', dawType);
  
  if (USE_MOCK_DATA) {
    // Mock VM launch with delay
    console.log('🎭 Mock: Simulating VM launch...');
    await mockDelay(2000); // Simulate VM provisioning delay
    
    return {
      success: true,
      sessionId,
      vmId: `mock-vm-${sessionId}-${Date.now()}`,
      streamingUrl: 'https://example.com/mock-stream',
      dawType,
      message: 'Mock studio launched successfully'
    };
  }
  
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
    return { success: false, error: error.message };
  }
});

ipcMain.handle('end-session', async (event, sessionId) => {
  console.log('Ending session:', sessionId);
  try {
    // Add your session cleanup logic here
    // This could involve stopping VMs, saving state, etc.
    return { success: true, sessionId, message: 'Session ended successfully' };
  } catch (error) {
    console.error('Failed to end session:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-session-metadata', async (event, sessionId) => {
  console.log('Getting metadata for session:', sessionId);
  
  if (USE_MOCK_DATA) {
    console.log('🎭 Mock: Getting session metadata...');
    await mockDelay();
    
    const session = mockSessions.find(s => s.id === sessionId);
    if (session) {
      return {
        success: true,
        metadata: {
          ...session,
          participants: [
            { id: 'user-123', name: 'John Doe', email: 'john@example.com', role: 'owner' },
            { id: 'user-456', name: 'Jane Smith', email: 'jane@example.com', role: 'editor' },
            { id: 'user-789', name: 'Bob Wilson', email: 'bob@example.com', role: 'viewer' }
          ]
        }
      };
    } else {
      return { success: false, error: 'Session not found' };
    }
  }
  
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
    return { success: false, error: error.message };
  }
});

// Legacy IPC handlers
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select DAW Project Folder',
  });
  
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    title: 'Select Project Files',
    filters: [
      { name: 'Audio Files', extensions: ['wav', 'mp3', 'aiff', 'flac'] },
      { name: 'Project Files', extensions: ['als', 'flp', 'logic', 'ptx'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

// Window control IPC handlers
ipcMain.handle('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Authentication IPC handlers
ipcMain.handle('auth-login-popup', async (event, provider) => {
  try {
    // Create a new BrowserWindow for authentication popup
    const authWindow = new BrowserWindow({
      width: 500,
      height: 600,
      show: false,
      parent: mainWindow,
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Load the authentication URL based on provider
    const authUrl = getAuthUrl(provider);
    await authWindow.loadURL(authUrl);
    authWindow.show();

    return new Promise((resolve, reject) => {
      // Listen for navigation to success/callback URL
      authWindow.webContents.on('will-redirect', (event, navigationUrl) => {
        const urlObj = new URL(navigationUrl);
        
        if (urlObj.pathname.includes('/auth/callback')) {
          // Extract auth data from URL or handle success
          authWindow.close();
          resolve({ success: true, user: extractUserFromUrl(navigationUrl) });
        }
      });

      authWindow.on('closed', () => {
        reject(new Error('Authentication cancelled'));
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auth-logout', async () => {
  try {
    // Clear any stored authentication data
    // Send auth state change to renderer
    if (mainWindow) {
      mainWindow.webContents.send('auth-state-changed', null);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Helper functions for authentication
function getAuthUrl(provider) {
  const baseUrl = isDev ? 'http://localhost:3000' : 'https://your-app-domain.com';
  
  switch (provider) {
    case 'google':
      return `${baseUrl}/auth/google`;
    case 'github':
      return `${baseUrl}/auth/github`;
    case 'apple':
      return `${baseUrl}/auth/apple`;
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

function extractUserFromUrl(url) {
  // Extract user data from callback URL
  // This would depend on your authentication flow
  const urlObj = new URL(url);
  const token = urlObj.searchParams.get('token');
  const user = urlObj.searchParams.get('user');
  
  return user ? JSON.parse(decodeURIComponent(user)) : null;
}

// Session management IPC handlers
ipcMain.handle('get-sessions', async (event, userId) => {
  if (USE_MOCK_DATA) {
    console.log('🎭 Mock: Getting sessions for user:', userId);
    await mockDelay();
    return { success: true, sessions: [...mockSessions] };
  }
  
  try {
    // Call Azure Functions to get sessions
    const response = await fetch(`${process.env.AZURE_FUNCTIONS_URL}/api/session-get?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-functions-key': process.env.AZURE_FUNCTIONS_KEY,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const sessions = await response.json();
    return { success: true, sessions };
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-session', async (event, sessionData) => {
  if (USE_MOCK_DATA) {
    console.log('🎭 Mock: Creating session:', sessionData.name);
    await mockDelay(800); // Slightly longer delay for creation
    
    const newSession = {
      id: `mock-session-${Date.now()}`,
      name: sessionData.name,
      description: sessionData.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      ownerId: sessionData.ownerId || 'user-123',
      settings: sessionData.settings || {
        maxParticipants: 10,
        allowFileUpload: true,
        allowChat: true,
        autoSave: true
      }
    };
    
    mockSessions.push(newSession);
    return { success: true, session: newSession };
  }
  
  try {
    // Call Azure Functions to create session
    const response = await fetch(`${process.env.AZURE_FUNCTIONS_URL}/api/session-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-functions-key': process.env.AZURE_FUNCTIONS_KEY,
      },
      body: JSON.stringify(sessionData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const session = await response.json();
    return { success: true, session };
  } catch (error) {
    console.error('Error creating session:', error);
    return { success: false, error: error.message };
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// Auto-updater (placeholder for future implementation)
if (!isDev) {
  // const { autoUpdater } = require('electron-updater');
  // autoUpdater.checkForUpdatesAndNotify();
}