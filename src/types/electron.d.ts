// TypeScript declarations for Electron API exposed via contextBridge

interface ElectronAPI {
  // Studio functionality
  launchStudio: (sessionId: string, dawType: string) => Promise<{
    success: boolean;
    streamingUrl?: string;
    vmId?: string;
    error?: string;
  }>;
  endSession: (sessionId: string) => Promise<{ success: boolean; message?: string }>;
  getSessionMetadata: (sessionId: string) => Promise<{
    success: boolean;
    metadata?: {
      id: string;
      name: string;
      participants: string[];
      createdAt: string;
      status: string;
    };
    error?: string;
  }>;

  // Session management
  getSessions: (userId: string) => Promise<{ success: boolean; sessions?: any[]; error?: string }>;
  createSession: (sessionData: any) => Promise<{ success: boolean; session?: any; error?: string }>;

  // File system operations
  selectFolder: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  selectFiles: () => Promise<{ canceled: boolean; filePaths: string[] }>;

  // App information
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;

  // Window controls
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;

  // Theme detection
  getSystemTheme: () => Promise<'light' | 'dark'>;
  onThemeChange: (callback: (theme: 'light' | 'dark') => void) => void;
  
  // Auto-updater functionality
  checkForUpdates: () => Promise<{ success: boolean; updateInfo?: any; error?: string }>;
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
  installUpdate: () => Promise<{ success: boolean; error?: string }>;
  
  // Auto-updater events
  onUpdateAvailable: (callback: (info: any) => void) => () => void;
  onDownloadProgress: (callback: (progress: {
    bytesPerSecond: number;
    percent: number;
    transferred: number;
    total: number;
  }) => void) => () => void;
  onUpdateDownloaded: (callback: (info: any) => void) => () => void;
}

interface AuthAPI {
  loginWithPopup: (provider: string) => Promise<{
    success: boolean;
    user?: {
      id: string;
      displayName: string;
      email: string;
      photoURL?: string;
      createdAt: Date;
      lastActive: Date;
    };
    error?: string;
  }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
  onAuthStateChanged: (callback: (user: any) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    api: {
      auth: AuthAPI;
    };
  }
}

export {};