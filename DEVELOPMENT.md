# Syncdaw Development Guide

This guide provides comprehensive information for developers working on Syncdaw, including the current implementation status, development workflow, and next steps.

## 🎯 Project Overview

Syncdaw is a real-time DAW collaboration platform that allows music producers to work together on projects through cloud-hosted virtual machines. The project is currently in active development with a focus on building the core infrastructure and user interface.

## 🚧 Current Implementation Status

### ✅ Completed Features

#### Frontend Application
- **Electron Desktop App**: Cross-platform desktop application
- **React + TypeScript**: Modern frontend with type safety
- **Vite Build System**: Fast development and building
- **TailwindCSS**: Utility-first styling with dark/light themes
- **Component Library**: Reusable UI components with consistent design
- **Responsive Design**: Works across different screen sizes

#### Authentication System
- **Firebase Auth**: Complete authentication infrastructure
- **Multiple Providers**: Google, GitHub, Apple, and Passkey support
- **OAuth Flow**: Local OAuth implementation for desktop app
- **JWT Tokens**: Secure token-based authentication
- **Auth Context**: React context for authentication state management

#### Real-time Infrastructure
- **WebSocket Server**: Node.js + Socket.IO server
- **Session Management**: Real-time session joining/leaving
- **User Presence**: Live user tracking in sessions
- **Message Broadcasting**: Real-time communication between users

#### Development Tools
- **Mock Services**: Complete mock implementations for rapid development
- **Service Layer**: Abstraction layer for switching between mock/real services
- **Testing Setup**: Jest + React Testing Library + Cypress
- **CI/CD**: GitHub Actions for automated testing and building
- **Code Quality**: ESLint + TypeScript for code consistency

### 🔄 In Progress

#### Backend Integration
- **Azure Blob Storage**: File storage service (partially implemented)
- **Azure Functions**: Serverless backend functions (scaffolded)
- **CosmosDB**: Database integration (planned)

#### Real-time Collaboration
- **File Synchronization**: Real-time file updates
- **Conflict Resolution**: Handling simultaneous edits
- **Version Control**: File versioning system

### 📋 Planned Features

#### VM Orchestration
- **Azure Compute**: Virtual machine provisioning
- **DAW Integration**: Support for popular DAWs
- **Remote Desktop**: Streaming DAW interface to clients
- **Resource Management**: Automatic scaling and cleanup

#### Advanced Collaboration
- **Audio Streaming**: Real-time audio collaboration
- **MIDI Synchronization**: Synchronized MIDI playback
- **Plugin Sharing**: Shared plugin instances
- **Advanced Permissions**: Role-based access control

## 🏗 Architecture Overview

### Frontend Architecture

```
Electron App
├── Main Process (Node.js)
│   ├── Window Management
│   ├── IPC Communication
│   └── System Integration
└── Renderer Process (React)
    ├── React Components
    ├── Context Providers
    ├── Service Layer
    └── WebSocket Client
```

### Backend Architecture (Current)

```
Development Setup
├── WebSocket Server (Node.js)
│   ├── Socket.IO
│   ├── OAuth Endpoints
│   └── Session Management
├── Firebase Auth
│   ├── User Authentication
│   ├── Token Management
│   └── Provider Integration
└── Mock Services
    ├── Session Data
    ├── File Management
    └── Chat Simulation
```

### Backend Architecture (Planned)

```
Production Setup
├── Azure Web Apps
│   └── WebSocket Server
├── Azure Functions
│   ├── Session Management
│   ├── File Operations
│   └── VM Orchestration
├── Azure CosmosDB
│   ├── Session Data
│   ├── User Profiles
│   └── File Metadata
├── Azure Blob Storage
│   ├── Project Files
│   ├── Audio Assets
│   └── Backups
└── Azure Compute
    ├── DAW VMs
    ├── Audio Processing
    └── Streaming Services
```

## 🔄 Development Workflow

### Setting Up Development Environment

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd syncdraw-app
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase configuration
   # Set USE_MOCK_DATA=true for development
   ```

3. **Start Development Servers**
   ```bash
   npm run dev
   # This starts:
   # - WebSocket server on localhost:3001
   # - Vite dev server on localhost:5173
   # - Electron app with hot reload
   ```

### Service Layer Usage

The project uses a service layer that can switch between mock and real implementations:

```typescript
// In src/services/index.ts
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === "true";

export const SessionService = USE_MOCK_DATA
  ? MockSessionService
  : RealSessionService;
```

**Mock Mode (Default)**:
- Fast development without external dependencies
- Realistic data for UI testing
- No network calls or authentication required

**Real Mode**:
- Requires Firebase and Azure configuration
- Tests actual service integration
- Used for production builds

### Development Best Practices

#### Code Organization
- **Components**: Keep components small and focused
- **Hooks**: Extract reusable logic into custom hooks
- **Context**: Use React context for global state
- **Services**: Keep business logic in service layer
- **Types**: Define TypeScript interfaces in `shared/types/`

#### Testing Strategy
- **Unit Tests**: Test individual components and functions
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user workflows
- **Mock Testing**: Test with mock services
- **Real Testing**: Test with actual backend services

#### Git Workflow
- **Feature Branches**: Create branches for new features
- **Conventional Commits**: Use conventional commit messages
- **Pull Requests**: Review all changes before merging
- **CI/CD**: Ensure all tests pass before merging

## 🧪 Testing Guide

### Running Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

### Test Structure

```
__tests__/
├── ChatPanel.test.tsx      # Component tests
├── StudioWindow.test.tsx   # Component tests
└── simple.test.tsx         # Basic functionality

cypress/
├── e2e/
│   ├── auth.cy.ts         # Authentication flow
│   └── session.cy.ts      # Session management
└── support/
    ├── commands.ts        # Custom commands
    └── e2e.ts            # Test configuration
```

### Writing Tests

#### Component Tests
```typescript
import { render, screen } from '@testing-library/react';
import { ChatPanel } from '../src/components/ChatPanel';

test('renders chat panel', () => {
  render(<ChatPanel />);
  expect(screen.getByText('Chat')).toBeInTheDocument();
});
```

#### E2E Tests
```typescript
describe('Authentication', () => {
  it('should login with Google', () => {
    cy.visit('/');
    cy.get('[data-testid="google-login"]').click();
    cy.url().should('include', '/dashboard');
  });
});
```

## 🚀 Building and Deployment

### Development Builds

```bash
# Build React app
npm run build

# Build Electron app
npm run build:electron

# Build for specific platform
npm run build:electron -- --mac
npm run build:electron -- --win
npm run build:electron -- --linux
```

### Production Deployment

#### Desktop App
1. **Prepare Icons**: Add required icon files to `build/` directory
2. **Update Version**: Bump version in `package.json`
3. **Build**: Run `npm run build:electron`
4. **Distribute**: Upload to GitHub releases or app stores

#### Backend Services
1. **Azure Setup**: Configure Azure resources
2. **Environment Variables**: Set production environment variables
3. **Deploy Functions**: Deploy Azure Functions
4. **Deploy WebSocket**: Deploy to Azure Web Apps

## 🔧 Configuration

### Environment Variables

```bash
# Firebase (Required for authentication)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id

# Azure (Optional for development)
VITE_AZURE_STORAGE_CONNECTION_STRING=your_connection_string
VITE_AZURE_FUNCTIONS_URL=your_functions_url

# Development
USE_MOCK_DATA=true
VITE_SERVER_URL=http://localhost:3001
```

### Build Configuration

#### Vite Configuration (`vite.config.ts`)
- React plugin configuration
- Build optimization settings
- Development server settings

#### Electron Builder (`package.json`)
- Platform-specific build settings
- Icon and asset configuration
- Auto-updater settings
- Code signing configuration

## 🐛 Debugging

### Common Issues

#### WebSocket Connection Failed
- Check if server is running on port 3001
- Verify CORS settings in server configuration
- Check firewall settings

#### Authentication Not Working
- Verify Firebase configuration in `.env`
- Check OAuth provider settings
- Ensure redirect URLs are configured correctly

#### Electron App Not Starting
- Check if Vite dev server is running
- Verify Electron main process configuration
- Check for TypeScript compilation errors

### Debug Tools

#### Browser DevTools
- React DevTools for component inspection
- Network tab for API calls
- Console for error messages

#### Electron DevTools
- Main process debugging with Node.js inspector
- Renderer process debugging with Chrome DevTools
- IPC communication logging

#### Server Debugging
- WebSocket event logging
- Express request logging
- Error stack traces

## 📚 Next Steps for Contributors

### Immediate Priorities

1. **Azure Integration**
   - Complete Azure Blob Storage implementation
   - Deploy and test Azure Functions
   - Set up CosmosDB integration

2. **Real-time Features**
   - Implement file synchronization
   - Add conflict resolution
   - Build version control system

3. **Testing**
   - Increase test coverage
   - Add integration tests
   - Test with real backend services

### Medium-term Goals

1. **VM Orchestration**
   - Research DAW integration options
   - Prototype VM provisioning
   - Test remote desktop streaming

2. **Performance**
   - Optimize WebSocket communication
   - Implement caching strategies
   - Add performance monitoring

3. **Security**
   - Implement rate limiting
   - Add input validation
   - Security audit and testing

### Long-term Vision

1. **Advanced Collaboration**
   - Real-time audio streaming
   - MIDI synchronization
   - Plugin sharing

2. **Scalability**
   - Multi-region deployment
   - Load balancing
   - Auto-scaling

3. **Ecosystem**
   - Plugin marketplace
   - Template library
   - Community features

## 🤝 Contributing Guidelines

### Before Contributing

1. **Read Documentation**: Understand the project structure and goals
2. **Set Up Environment**: Get the development environment working
3. **Run Tests**: Ensure all tests pass locally
4. **Check Issues**: Look for existing issues or create new ones

### Making Changes

1. **Create Branch**: Create a feature branch from main
2. **Make Changes**: Implement your feature or fix
3. **Add Tests**: Write tests for new functionality
4. **Update Docs**: Update documentation if needed
5. **Test Thoroughly**: Test both mock and real modes

### Submitting Changes

1. **Commit Messages**: Use conventional commit format
2. **Pull Request**: Create a detailed pull request
3. **Code Review**: Address review feedback
4. **CI/CD**: Ensure all checks pass
5. **Merge**: Squash and merge when approved

## 📞 Getting Help

- **Documentation**: Check this guide and other README files
- **Issues**: Search existing GitHub issues
- **Discussions**: Use GitHub Discussions for questions
- **Code Review**: Ask for help in pull requests

This development guide should help you understand the current state of Syncdaw and how to contribute effectively. The project is in an exciting phase where core infrastructure is solid and we're building toward production-ready features.