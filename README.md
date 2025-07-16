# Syncdaw - Real-Time DAW Collaboration Platform

Syncdaw is a desktop application that enables music producers using the same DAW to collaborate in real-time via cloud-hosted virtual machines. Built with Electron, React, and powered by Azure infrastructure with Firebase Authentication.

## 🎯 Features

- **Cross-platform desktop app** (Windows, macOS, Linux)
- **Real-time collaboration** with live presence indicators
- **Cloud file synchronization** via Azure Blob Storage
- **Session management** with automatic VM provisioning
- **File versioning** with complete change history
- **In-session chat** and file commenting
- **Social authentication** (Google, Apple, GitHub)
- **Beautiful, modern UI** inspired by Linear and Figma

## 🛠 Tech Stack

- **Frontend**: Electron + React + TypeScript + Vite
- **Styling**: TailwindCSS with dark/light theme support
- **Authentication**: Firebase Auth
- **Backend**: Azure Functions + Azure App Service
- **Database**: Azure CosmosDB
- **Storage**: Azure Blob Storage
- **Real-time**: Socket.IO on Azure Web Apps
- **Testing**: Jest + Cypress

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
git clone https://github.com/your-org/syncdaw.git
cd syncdaw
npm install
```

### 2. Firebase Authentication Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Authentication and configure providers:
   - **Google**: Enable and configure OAuth consent screen
   - **Apple**: Enable and add your Apple Developer credentials
   - **GitHub**: Enable and add GitHub OAuth app credentials
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

## 🚀 Running Locally

### Development Mode
```bash
npm run dev
```
This starts both the Vite dev server and Electron in development mode with hot reload.

### Production Build
```bash
npm run build
npm run build:electron
```

### Testing
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

## 📁 Project Structure

```
syncdaw/
├── electron/                 # Electron main process
│   ├── main.js              # Main process entry
│   ├── preload.js           # Preload script for IPC
│   └── updater.js           # Auto-updater logic
├── src/                     # React application
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base UI components
│   │   ├── auth/           # Authentication components
│   │   ├── session/        # Session management
│   │   └── chat/           # Chat and messaging
│   ├── pages/              # Application pages
│   │   ├── Dashboard.tsx   # Main dashboard
│   │   ├── Session.tsx     # Session view
│   │   └── Auth.tsx        # Authentication page
│   ├── hooks/              # Custom React hooks
│   ├── context/            # React context providers
│   ├── services/           # API and external services
│   ├── utils/              # Utility functions
│   └── styles/             # Global styles and themes
├── functions/              # Azure Functions
│   ├── session-create/     # Create new session
│   ├── vm-provision/       # VM provisioning
│   └── file-upload/        # File upload handler
├── server/                 # WebSocket server
│   ├── index.js           # Socket.IO server
│   ├── handlers/          # Socket event handlers
│   └── middleware/        # Authentication middleware
├── shared/                # Shared types and utilities
│   ├── types/            # TypeScript definitions
│   └── utils/            # Shared utility functions
├── tests/                # Test files
│   ├── unit/            # Unit tests
│   └── e2e/             # End-to-end tests
├── .env.example         # Environment variables template
├── tailwind.config.js   # TailwindCSS configuration
├── vite.config.ts       # Vite configuration
└── electron-builder.json # Electron builder config
```

## 🧪 Testing Guide

### Unit Testing
- Tests are located in `tests/unit/`
- Run with `npm test`
- Uses Jest with React Testing Library

### Integration Testing
- E2E tests use Cypress
- Tests cover authentication flow, file upload, and real-time sync
- Run with `npm run test:e2e`

### Manual Testing Checklist
- [ ] Authentication with all providers works
- [ ] File upload to Azure Blob Storage
- [ ] Real-time presence indicators
- [ ] Session creation and joining
- [ ] Chat functionality
- [ ] File versioning
- [ ] Dark/light theme switching
- [ ] Cross-platform compatibility

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

### Backend Deployment
- Azure Functions: Auto-deployed via GitHub Actions
- WebSocket server: Deployed to Azure Web Apps
- Static assets: Served from Azure CDN

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: Check the `/docs` folder
- **Issues**: GitHub Issues
- **Discord**: Join our community server
- **Email**: support@syncdaw.com

---

Built with ❤️ for the music production community