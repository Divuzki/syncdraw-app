import '@testing-library/jest-dom'

// Mock Electron API
global.electronAPI = {
  selectFolder: jest.fn(),
  selectFiles: jest.fn(),
  getAppVersion: jest.fn(() => Promise.resolve('1.0.0')),
  getPlatform: jest.fn(() => Promise.resolve('darwin')),
  minimize: jest.fn(),
  maximize: jest.fn(),
  close: jest.fn(),
  getSystemTheme: jest.fn(() => Promise.resolve('light')),
  onThemeChange: jest.fn(),
}

// Mock environment variables
process.env.VITE_FIREBASE_API_KEY = 'test-api-key'
process.env.VITE_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com'
process.env.VITE_FIREBASE_PROJECT_ID = 'test-project'
process.env.VITE_AZURE_STORAGE_CONNECTION_STRING = 'test-connection-string'