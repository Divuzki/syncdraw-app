# Syncdaw - Real-Time DAW Collaboration Platform

Syncdaw is a desktop application that enables music producers using the same DAW to collaborate in real-time. Built with Electron, React, and designed for Azure infrastructure with Firebase Authentication.

## 🚧 Current Development Status

**This project is currently in active development.** The application runs in development mode with mock services for rapid prototyping and UI development. Production Azure infrastructure is planned but not yet fully implemented.

### ✅ Implemented Features

- **Cross-platform desktop app** (Electron + React + TypeScript)
- **Modern UI/UX** with dark/light theme support
- **Firebase Authentication** (Google, Passkey)
- **Real-time WebSocket server** for collaboration
- **Session management** with mock data
- **File upload/management** interface
- **In-session chat** simulation
- **Beautiful, responsive UI** inspired by Linear and Figma

### 🔄 In Progress

- **Azure Blob Storage** integration for file storage
- **Azure Functions** for backend services
- **CosmosDB** for session and user data
- **Real-time collaboration** features
- **VM provisioning** for DAW hosting

### 📋 Planned Features

- **Cloud file synchronization** via Azure Blob Storage
- **Automatic VM provisioning** for DAW sessions
- **File versioning** with complete change history
- **Advanced collaboration** tools and presence indicators

## 🛠 Tech Stack

### Frontend
- **Desktop App**: Electron + React + TypeScript
- **Build Tool**: Vite for fast development
- **Styling**: TailwindCSS with dark/light theme support
- **State Management**: Zustand + React Context
- **UI Components**: Custom components with Lucide icons
- **Animations**: Framer Motion

### Backend (Current Development)
- **Authentication**: Firebase Auth (Google, Passkey)
- **Real-time**: Socket.IO WebSocket server (Node.js)
- **Development**: Mock services for rapid prototyping

### Backend (Planned Production)
- **Cloud Functions**: Azure Functions
- **Database**: Azure CosmosDB
- **File Storage**: Azure Blob Storage
- **VM Orchestration**: Azure Compute
- **Real-time**: Socket.IO on Azure Web Apps

### Development Tools
- **Testing**: Jest + React Testing Library + Cypress
- **Code Quality**: ESLint + TypeScript
- **Package Management**: npm
- **CI/CD**: GitHub Actions (configured)

## 📋 Prerequisites

Before running Syncdaw locally, ensure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Azure CLI** installed and configured
- **Firebase project** set up
- **Git** for version control

## 🔧 Setup Instructions

### 1. Clone and Install

```bash
git clone https://github.com/divuzki/syncdaw.git
cd syncdaw
npm install
```

### 2. Firebase Authentication Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Authentication and configure providers:
   - **Google**: Enable and configure OAuth consent screen
4. Get your Firebase config from Project Settings > General > Your apps
5. Copy the config values to your `.env` file

### 3. Azure Infrastructure Setup

#### Storage Account
```bash
# Create resource group
az group create --name syncdaw-rg --location eastus

# Create storage account
az storage account create \
  --name syncdawstorage \
  --resource-group syncdaw-rg \
  --location eastus \
  --sku Standard_LRS

# Get connection string
az storage account show-connection-string \
  --name syncdawstorage \
  --resource-group syncdaw-rg
```

#### CosmosDB Setup
```bash
# Create CosmosDB account
az cosmosdb create \
  --name syncdaw-cosmos \
  --resource-group syncdaw-rg \
  --default-consistency-level Session

# Create database and containers
az cosmosdb sql database create \
  --account-name syncdaw-cosmos \
  --resource-group syncdaw-rg \
  --name syncdaw

az cosmosdb sql container create \
  --account-name syncdaw-cosmos \
  --database-name syncdaw \
  --resource-group syncdaw-rg \
  --name sessions \
  --partition-key-path "/sessionId"
```

#### Azure Functions
```bash
# Create function app
az functionapp create \
  --resource-group syncdaw-rg \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name syncdaw-functions \
  --storage-account syncdawstorage
```

#### WebSocket Server (Azure Web App)
```bash
# Create app service plan
az appservice plan create \
  --name syncdaw-plan \
  --resource-group syncdaw-rg \
  --sku B1

# Create web app
az webapp create \
  --resource-group syncdaw-rg \
  --plan syncdaw-plan \
  --name syncdaw-websocket \
  --runtime "NODE|18-lts"
```

### 4. Environment Configuration

1. Copy `.env.example` to `.env`
2. Fill in all the configuration values from your Firebase and Azure setup
3. Ensure all URLs and connection strings are correct

### 5. Deploy Backend Services

```bash
# Deploy Azure Functions
cd functions
func azure functionapp publish syncdaw-functions

# Deploy WebSocket server
cd ../server
az webapp deployment source config-zip \
  --resource-group syncdaw-rg \
  --name syncdaw-websocket \
  --src websocket-server.zip
```

## 🚀 Quick Start (Development Mode)

### 1. Clone and Install
```bash
git clone <repository-url>
cd syncdaw-app
npm install
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Firebase config (required for auth)
# Set USE_MOCK_DATA=true for development with mock services
```

### 3. Start Development Servers
```bash
# Start both WebSocket server and Electron app
npm run dev
```

This will:
- Start the WebSocket server on `http://localhost:3001`
- Start the Vite dev server on `http://localhost:5173`
- Launch the Electron app with hot reload

### 4. Production Build
```bash
npm run build
npm run build:electron
```

### 5. Testing
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

## 📁 Project Structure

```
syncdaw-app/
├── electron/                 # Electron main process
│   ├── main.ts              # Main process entry (TypeScript)
│   ├── main.js              # Compiled main process
│   └── preload.js           # Preload script for IPC
├── src/                     # React application
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base UI components (buttons, inputs, etc.)
│   │   ├── auth/           # Authentication components
│   │   ├── session/        # Session management UI
│   │   └── studio/         # Studio/DAW interface components
│   ├── pages/              # Application pages
│   │   ├── Auth.tsx        # Authentication page
│   │   ├── Dashboard.tsx   # Main dashboard
│   │   ├── Sessions.tsx    # Sessions list
│   │   ├── Session.tsx     # Individual session view
│   │   └── studio/         # Studio pages
│   ├── context/            # React context providers
│   │   ├── AuthContext.tsx # Authentication state
│   │   ├── SessionContext.tsx # Session management
│   │   ├── SocketContext.tsx # WebSocket connection
│   │   └── ThemeContext.tsx # Theme management
│   ├── services/           # Service layer
│   │   ├── index.ts        # Service exports with mock/real switching
│   │   ├── firebase.ts     # Firebase configuration
│   │   ├── azure.ts        # Azure services (planned)
│   │   ├── localAuth.ts    # Local OAuth flow
│   │   ├── passkeyAuth.ts  # Passkey authentication
│   │   ├── mockSession.ts  # Mock session service
│   │   ├── mockChat.ts     # Mock chat service
│   │   └── mockFiles.ts    # Mock file service
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   └── styles/             # Global styles and themes
├── server/                 # WebSocket server (Node.js)
│   ├── index.js           # Socket.IO server with OAuth endpoints
│   ├── package.json       # Server dependencies
│   └── package-lock.json  # Server lock file
├── functions/              # Azure Functions (planned)
│   ├── session-create/     # Create new session
│   ├── session-get/        # Get session data
│   ├── vm-provision/       # VM provisioning
│   └── package.json        # Functions dependencies
├── shared/                # Shared types and utilities
│   └── types/             # TypeScript definitions
├── __tests__/             # Test files
│   ├── ChatPanel.test.tsx # Component tests
│   ├── StudioWindow.test.tsx
│   └── simple.test.tsx
├── cypress/               # E2E tests
│   ├── e2e/              # Test specs
│   └── support/          # Test utilities
├── build/                # Electron build assets
│   ├── icon.svg          # App icon (SVG)
│   ├── entitlements.mac.plist # macOS entitlements
│   └── README.md         # Build documentation
├── .env.example          # Environment variables template
├── .github/              # GitHub Actions CI/CD
├── package.json          # Main dependencies and scripts
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # TailwindCSS configuration
├── tsconfig.json         # TypeScript configuration
└── ELECTRON_SETUP.md     # Electron setup documentation
```

## 🔄 Development Workflow

### Mock vs Real Services

The project uses a service layer that can switch between mock and real implementations:

```bash
# Development with mock services (default)
USE_MOCK_DATA=true npm run dev

# Development with real Azure services (requires setup)
USE_MOCK_DATA=false npm run dev
```

### Service Architecture

- **Mock Services**: Located in `src/services/mock*.ts` - provide realistic data for UI development
- **Real Services**: Located in `src/services/azure.ts` and `src/services/firebase.ts`
- **Service Layer**: `src/services/index.ts` handles the switching logic

### Development Servers

1. **WebSocket Server** (`server/index.js`): Handles real-time communication and OAuth flows
2. **Vite Dev Server**: Serves the React application with hot reload
3. **Electron**: Desktop app wrapper with IPC communication

## 🧪 Testing Guide

### Unit Testing
- Tests are located in `__tests__/`
- Run with `npm test`
- Uses Jest with React Testing Library
- Focus on component logic and user interactions

### E2E Testing
- E2E tests use Cypress (located in `cypress/`)
- Tests cover authentication flow and core user journeys
- Run with `npm run test:e2e`

### Manual Testing Checklist
- [ ] Authentication with Firebase providers works
- [ ] WebSocket connection establishes
- [ ] Session creation and navigation
- [ ] Mock chat functionality
- [ ] Mock file management
- [ ] Dark/light theme switching
- [ ] Electron app launches and functions
- [ ] Cross-platform compatibility (Windows, macOS, Linux)

## 🔒 Security Considerations

- All API keys are environment variables
- Firebase Auth handles user authentication
- Azure Functions validate requests
- File uploads are scanned and validated
- WebSocket connections are authenticated

## 🚢 Deployment

### Desktop App Distribution

```bash
# Build for all platforms
npm run build:electron

# Platform-specific builds
npm run build:electron -- --mac
npm run build:electron -- --win
npm run build:electron -- --linux
```

**Note**: Before building, ensure you have the required icon files in the `build/` directory:
- `icon.icns` (macOS)
- `icon.ico` (Windows) 
- `icon.png` (Linux)

See `build/README.md` for detailed icon requirements.

### Backend Deployment (Planned)

**Current State**: Development uses local WebSocket server

**Production Plan**:
- Azure Functions: Auto-deployed via GitHub Actions
- WebSocket server: Deployed to Azure Web Apps
- Static assets: Served from Azure CDN
- Database: Azure CosmosDB
- File storage: Azure Blob Storage

## 🗺️ Development Roadmap

### Phase 1: Core Infrastructure ✅
- [x] Electron + React setup
- [x] Firebase Authentication
- [x] WebSocket server
- [x] Mock services for development
- [x] Basic UI/UX implementation

### Phase 2: Backend Integration 🔄
- [ ] Azure Blob Storage integration
- [ ] Azure Functions deployment
- [ ] CosmosDB setup and integration
- [ ] Real-time collaboration features
- [ ] File versioning system

### Phase 3: Advanced Features 📋
- [ ] VM provisioning for DAW hosting
- [ ] Advanced collaboration tools
- [ ] Plugin system for DAW integration
- [ ] Performance optimization
- [ ] Advanced security features

### Phase 4: Production Ready 🎯
- [ ] Comprehensive testing suite
- [ ] Performance monitoring
- [ ] Auto-updater implementation
- [ ] Documentation and tutorials
- [ ] Beta testing program

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 📚 Documentation

- **[Development Guide](DEVELOPMENT.md)** - Comprehensive guide for contributors
- **[Server Documentation](server/README.md)** - WebSocket server implementation
- **[Electron Setup](ELECTRON_SETUP.md)** - Desktop app configuration
- **[Build Assets](build/README.md)** - Icon and build requirements

## 🆘 Support

- **Documentation**: Check the documentation files above
- **Issues**: GitHub Issues for bug reports and feature requests
- **Discussions**: GitHub Discussions for questions and ideas
- **Contributing**: See [DEVELOPMENT.md](DEVELOPMENT.md) for contribution guidelines

---

**Current Status**: Active development with working authentication, WebSocket server, and mock services for rapid UI development. Azure backend integration in progress.

Built with ❤️ for the music production community