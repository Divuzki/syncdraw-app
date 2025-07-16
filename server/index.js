const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');

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