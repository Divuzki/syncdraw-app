import '@testing-library/jest-dom'

// Type declarations for test environment
declare global {
  var electronAPI: any;
  var api: any;
  namespace NodeJS {
    interface Global {
      electronAPI: any;
      api: any;
    }
  }
}

// Mock Electron API
const mockElectronAPI = {
  // Studio functionality
  launchStudio: () => Promise.resolve({ 
    success: true, 
    streamingUrl: 'https://mock-stream.example.com/session123',
    vmId: 'vm-mock-123'
  }),
  endSession: () => Promise.resolve({ success: true }),
  getSessionMetadata: () => Promise.resolve({
    success: true,
    metadata: {
      id: 'test-session',
      name: 'Test Session',
      participants: [],
      createdAt: new Date().toISOString(),
      status: 'active'
    }
  }),
  getSessions: () => Promise.resolve({ success: true, sessions: [] }),
  createSession: () => Promise.resolve({ success: true, session: { id: 'mock-session-id', name: 'Mock Session' } }),
  
  // File system operations
  selectFolder: () => Promise.resolve({ canceled: false, filePaths: [] }),
  selectFiles: () => Promise.resolve({ canceled: false, filePaths: [] }),
  
  // App information
  getAppVersion: () => Promise.resolve('1.0.0'),
  getPlatform: () => Promise.resolve('darwin'),
  
  // Window controls
  minimize: () => Promise.resolve(),
  maximize: () => Promise.resolve(),
  close: () => Promise.resolve(),
  isMaximized: () => Promise.resolve(false),
  
  // Theme detection
  getSystemTheme: () => Promise.resolve('light' as const),
  onThemeChange: () => {},
};

// Mock window.api for authentication
const mockAPI = {
  auth: {
    loginWithPopup: (provider: string) => Promise.resolve({
      success: true,
      user: {
        id: 'test-user-id',
        displayName: 'Test User',
        email: 'test@example.com',
        photoURL: 'https://example.com/photo.jpg',
        createdAt: new Date(),
        lastActive: new Date(),
      }
    }),
    logout: () => Promise.resolve({ success: true }),
    onAuthStateChanged: (callback: (user: any) => void) => {
      // Simulate initial auth state
      setTimeout(() => callback(null), 0);
      return () => {}; // Cleanup function
    },
  },
};

// Assign mocks to global
(global as any).electronAPI = mockElectronAPI;
(global as any).api = mockAPI;

// Mock environment variables
(process.env as any).VITE_FIREBASE_API_KEY = 'test-api-key';
(process.env as any).VITE_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
(process.env as any).VITE_FIREBASE_PROJECT_ID = 'test-project';
(process.env as any).VITE_AZURE_STORAGE_CONNECTION_STRING = 'test-connection-string';