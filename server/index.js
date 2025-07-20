const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const querystring = require('querystring');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Store pending OAuth requests
const pendingOAuthRequests = new Map();

// Store active sessions and users
const activeSessions = new Map();
const userSessions = new Map();

// Middleware for socket authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const userId = socket.handshake.auth.userId;
  const displayName = socket.handshake.auth.displayName;
  const photoURL = socket.handshake.auth.photoURL;

  if (!userId) {
    return next(new Error('Authentication error'));
  }

  socket.userId = userId;
  socket.displayName = displayName;
  socket.photoURL = photoURL;
  next();
});

io.on('connection', (socket) => {
  console.log(`User ${socket.displayName} connected`);

  // Join session
  socket.on('join_session', ({ sessionId }) => {
    socket.join(sessionId);
    
    // Add user to session
    if (!activeSessions.has(sessionId)) {
      activeSessions.set(sessionId, new Set());
    }
    
    const sessionUsers = activeSessions.get(sessionId);
    sessionUsers.add({
      userId: socket.userId,
      displayName: socket.displayName,
      photoURL: socket.photoURL,
      socketId: socket.id
    });

    // Track user's sessions
    if (!userSessions.has(socket.userId)) {
      userSessions.set(socket.userId, new Set());
    }
    userSessions.get(socket.userId).add(sessionId);

    // Notify all users in session
    const users = Array.from(sessionUsers);
    io.to(sessionId).emit('session_users_updated', { sessionId, users });
    
    socket.to(sessionId).emit('user_joined', {
      sessionId,
      user: {
        userId: socket.userId,
        displayName: socket.displayName,
        photoURL: socket.photoURL
      }
    });

    console.log(`User ${socket.displayName} joined session ${sessionId}`);
  });

  // Leave session
  socket.on('leave_session', ({ sessionId }) => {
    socket.leave(sessionId);
    
    const sessionUsers = activeSessions.get(sessionId);
    if (sessionUsers) {
      // Remove user from session
      for (const user of sessionUsers) {
        if (user.userId === socket.userId) {
          sessionUsers.delete(user);
          break;
        }
      }

      // Update user sessions
      const userSessionSet = userSessions.get(socket.userId);
      if (userSessionSet) {
        userSessionSet.delete(sessionId);
      }

      // Notify remaining users
      const users = Array.from(sessionUsers);
      io.to(sessionId).emit('session_users_updated', { sessionId, users });
      
      socket.to(sessionId).emit('user_left', {
        sessionId,
        user: {
          userId: socket.userId,
          displayName: socket.displayName,
          photoURL: socket.photoURL
        }
      });
    }

    console.log(`User ${socket.displayName} left session ${sessionId}`);
  });

  // Handle chat messages
  socket.on('send_message', ({ sessionId, message }) => {
    const messageData = {
      id: Date.now().toString(),
      sessionId,
      userId: socket.userId,
      userName: socket.displayName,
      userAvatar: socket.photoURL,
      message,
      timestamp: new Date(),
      type: 'text'
    };

    io.to(sessionId).emit('new_message', messageData);
    console.log(`Message in session ${sessionId} from ${socket.displayName}: ${message}`);
  });

  // Handle file updates
  socket.on('file_updated', ({ sessionId, fileName, fileUrl }) => {
    socket.to(sessionId).emit('file_updated', {
      sessionId,
      fileName,
      fileUrl,
      updatedBy: {
        userId: socket.userId,
        displayName: socket.displayName,
        photoURL: socket.photoURL
      }
    });

    console.log(`File ${fileName} updated in session ${sessionId} by ${socket.displayName}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User ${socket.displayName} disconnected`);
    
    // Remove user from all sessions
    const userSessionSet = userSessions.get(socket.userId);
    if (userSessionSet) {
      for (const sessionId of userSessionSet) {
        const sessionUsers = activeSessions.get(sessionId);
        if (sessionUsers) {
          // Remove user from session
          for (const user of sessionUsers) {
            if (user.userId === socket.userId) {
              sessionUsers.delete(user);
              break;
            }
          }

          // Notify remaining users
          const users = Array.from(sessionUsers);
          io.to(sessionId).emit('session_users_updated', { sessionId, users });
          
          socket.to(sessionId).emit('user_left', {
            sessionId,
            user: {
              userId: socket.userId,
              displayName: socket.displayName,
              photoURL: socket.photoURL
            }
          });
        }
      }
      userSessions.delete(socket.userId);
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OAuth callback endpoints - VS Code extension style
app.get('/auth/callback', (req, res) => {
  const { code, state, error } = req.query;
  
  if (error) {
    return res.send(`
      <html>
        <body>
          <h1>Authentication Error</h1>
          <p>Error: ${error}</p>
          <script>window.close();</script>
        </body>
      </html>
    `);
  }
  
  if (!state || !pendingOAuthRequests.has(state)) {
    return res.send(`
      <html>
        <body>
          <h1>Authentication Error</h1>
          <p>Invalid or expired authentication request</p>
          <script>window.close();</script>
        </body>
      </html>
    `);
  }
  
  const request = pendingOAuthRequests.get(state);
  pendingOAuthRequests.delete(state);
  
  // Store the authorization code for the client to retrieve
  request.code = code;
  request.completed = true;
  
  res.send(`
    <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px; }
          .success { color: #28a745; }
          .container { max-width: 400px; margin: 0 auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="success">✓ Authentication Successful</h1>
          <p>You can now close this window and return to the application.</p>
          <script>
            // Auto-close after 2 seconds
            setTimeout(() => window.close(), 2000);
          </script>
        </div>
      </body>
    </html>
  `);
});

// Start OAuth flow endpoint
app.post('/auth/start', (req, res) => {
  const { provider } = req.body;
  
  if (!['google', 'github', 'apple'].includes(provider)) {
    return res.status(400).json({ error: 'Unsupported provider' });
  }
  
  // Generate a unique state parameter
  const state = crypto.randomBytes(32).toString('hex');
  const redirectUri = `http://localhost:${PORT}/auth/callback`;
  
  // Store the request
  pendingOAuthRequests.set(state, {
    provider,
    timestamp: Date.now(),
    completed: false
  });
  
  // Clean up old requests (older than 10 minutes)
  for (const [key, value] of pendingOAuthRequests.entries()) {
    if (Date.now() - value.timestamp > 10 * 60 * 1000) {
      pendingOAuthRequests.delete(key);
    }
  }
  
  let authUrl;
  
  switch (provider) {
    case 'google':
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${querystring.stringify({
        client_id: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state: state,
        access_type: 'offline',
        prompt: 'consent'
      })}`;
      break;
      
    case 'github':
      authUrl = `https://github.com/login/oauth/authorize?${querystring.stringify({
        client_id: process.env.GITHUB_CLIENT_ID || 'your-github-client-id',
        redirect_uri: redirectUri,
        scope: 'user:email',
        state: state
      })}`;
      break;
      
    case 'apple':
      authUrl = `https://appleid.apple.com/auth/authorize?${querystring.stringify({
        client_id: process.env.APPLE_CLIENT_ID || 'your-apple-client-id',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'name email',
        state: state,
        response_mode: 'query'
      })}`;
      break;
  }
  
  res.json({ authUrl, state });
});

// Poll for OAuth completion
app.get('/auth/poll/:state', (req, res) => {
  const { state } = req.params;
  
  if (!pendingOAuthRequests.has(state)) {
    return res.status(404).json({ error: 'Request not found or expired' });
  }
  
  const request = pendingOAuthRequests.get(state);
  
  if (request.completed) {
    pendingOAuthRequests.delete(state);
    return res.json({ completed: true, code: request.code, provider: request.provider });
  }
  
  res.json({ completed: false });
});

// Exchange authorization code for custom token
app.post('/auth/exchange', async (req, res) => {
  const { code, provider } = req.body;
  
  if (!code || !provider) {
    return res.status(400).json({ error: 'Missing code or provider' });
  }
  
  try {
    // In a real implementation, you would:
    // 1. Exchange the authorization code for an access token with the OAuth provider
    // 2. Get user information from the provider's API
    // 3. Create or update the user in your database
    // 4. Generate a Firebase custom token
    
    // For demo purposes, we'll create a mock custom token
    // In production, use Firebase Admin SDK to create real custom tokens
    const mockUserData = {
      uid: `${provider}_${Date.now()}`,
      email: `user@${provider}.com`,
      name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
      picture: `https://via.placeholder.com/150?text=${provider.charAt(0).toUpperCase()}`,
      provider: provider
    };
    
    // This should be replaced with actual Firebase Admin SDK token creation
    const customToken = jwt.sign(
      {
        iss: 'syncdraw-local-auth',
        sub: mockUserData.uid,
        aud: 'syncdraw-app',
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
        iat: Math.floor(Date.now() / 1000),
        uid: mockUserData.uid,
        claims: {
          email: mockUserData.email,
          name: mockUserData.name,
          picture: mockUserData.picture,
          provider: mockUserData.provider
        }
      },
      process.env.JWT_SECRET || 'your-jwt-secret-key'
    );
    
    res.json({ customToken, user: mockUserData });
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(500).json({ error: 'Failed to exchange authorization code' });
  }
});

// Get session stats
app.get('/api/sessions/:sessionId/stats', (req, res) => {
  const { sessionId } = req.params;
  const sessionUsers = activeSessions.get(sessionId);
  
  res.json({
    sessionId,
    activeUsers: sessionUsers ? sessionUsers.size : 0,
    users: sessionUsers ? Array.from(sessionUsers) : []
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});