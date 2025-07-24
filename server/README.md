# Syncdaw WebSocket Server

This is the real-time WebSocket server for Syncdaw, built with Node.js and Socket.IO. It handles real-time collaboration, OAuth authentication flows, and session management.

## 🚀 Features

- **Real-time WebSocket communication** using Socket.IO
- **OAuth authentication flows** for Google, GitHub, and Apple
- **Session management** with user presence tracking
- **Health monitoring** endpoint
- **CORS configuration** for cross-origin requests
- **JWT token handling** for secure authentication

## 🛠 Tech Stack

- **Runtime**: Node.js
- **WebSocket**: Socket.IO
- **Web Framework**: Express.js
- **Authentication**: JWT + OAuth providers
- **Environment**: dotenv for configuration

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Environment variables configured (see parent `.env.example`)

## 🚀 Running the Server

### Development Mode

```bash
# From the server directory
cd server
npm install
npm start

# Or from the project root
npm run dev  # Starts both Vite and WebSocket server
```

The server will start on `http://localhost:3001`

### Environment Variables

The server uses environment variables from the parent directory's `.env` file:

```bash
# OAuth Configuration
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GITHUB_CLIENT_ID=your-github-oauth-client-id
APPLE_CLIENT_ID=your-apple-oauth-client-id
JWT_SECRET=your-jwt-secret-key

# Server Configuration
VITE_SERVER_URL=http://localhost:3001
VITE_APP_PORT=5173
```

## 📡 API Endpoints

### OAuth Authentication

- `GET /auth/start` - Initiate OAuth flow
- `GET /auth/poll` - Poll for authentication completion
- `GET /auth/exchange` - Exchange authorization code for tokens
- `GET /auth/callback/:provider` - OAuth callback handler

### Health & Monitoring

- `GET /health` - Health check endpoint
- `GET /stats` - Session statistics

### WebSocket Events

#### Client → Server

- `authenticate` - Authenticate WebSocket connection
- `join-session` - Join a collaboration session
- `leave-session` - Leave a collaboration session
- `session-message` - Send message to session
- `file-update` - Broadcast file changes
- `user-presence` - Update user presence status

#### Server → Client

- `authenticated` - Authentication successful
- `session-joined` - Successfully joined session
- `session-left` - Successfully left session
- `session-message` - Receive session message
- `file-update` - Receive file changes
- `user-presence` - User presence updates
- `session-users` - List of users in session

## 🏗 Architecture

### Session Management

```javascript
// In-memory session storage
const sessions = new Map(); // sessionId -> Set of socketIds
const userSessions = new Map(); // userId -> sessionId
const socketUsers = new Map(); // socketId -> userId
```

### Authentication Flow

1. Client initiates OAuth via `/auth/start`
2. Server redirects to OAuth provider
3. Provider redirects to `/auth/callback/:provider`
4. Server exchanges code for tokens
5. Client polls `/auth/poll` for completion
6. Client receives JWT token for WebSocket auth

### WebSocket Authentication

```javascript
// Middleware for WebSocket authentication
socket.use((packet, next) => {
  const token = packet[1]?.token;
  if (verifyJWT(token)) {
    next();
  } else {
    next(new Error('Authentication failed'));
  }
});
```

## 🔧 Configuration

### CORS Settings

```javascript
const corsOptions = {
  origin: [
    "http://localhost:5173",  // Vite dev server
    "http://localhost:3000",  // Alternative dev port
    // Add production domains here
  ],
  credentials: true
};
```

### Socket.IO Configuration

```javascript
const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling']
});
```

## 🧪 Testing

### Manual Testing

1. Start the server: `npm start`
2. Check health endpoint: `curl http://localhost:3001/health`
3. Test WebSocket connection using browser dev tools or Socket.IO client

### Integration Testing

The server is tested as part of the main application's E2E tests using Cypress.

## 🚀 Deployment

### Local Development

- Runs on `http://localhost:3001`
- Auto-restarts with nodemon (if configured)
- Logs all WebSocket events for debugging

### Production (Planned)

- Deploy to Azure Web Apps
- Configure environment variables in Azure
- Set up SSL/TLS certificates
- Configure load balancing for multiple instances

## 🔒 Security Considerations

- **JWT tokens** for WebSocket authentication
- **CORS** properly configured for allowed origins
- **OAuth state validation** to prevent CSRF attacks
- **Rate limiting** (planned for production)
- **Input validation** for all WebSocket events

## 📝 Logging

The server logs:
- WebSocket connections and disconnections
- Authentication attempts
- Session join/leave events
- Error conditions
- Health check requests

## 🤝 Contributing

When modifying the server:

1. Test WebSocket events thoroughly
2. Ensure OAuth flows work with all providers
3. Validate CORS settings for new origins
4. Update this documentation for new endpoints
5. Test with both mock and real authentication

## 📚 Related Documentation

- [Main README](../README.md) - Project overview
- [Electron Setup](../ELECTRON_SETUP.md) - Desktop app configuration
- [Build Assets](../build/README.md) - Icon and build requirements