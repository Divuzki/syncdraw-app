const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const querystring = require("querystring");
const admin = require("firebase-admin");
const path = require("path");

// Load environment variables from parent directory's .env file
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID || "syncdaw-app",
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  };

  if (serviceAccount.private_key && serviceAccount.client_email) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    console.log("Firebase Admin initialized with service account");
  } else {
    try {
      admin.initializeApp();
      console.log("Firebase Admin initialized with default credentials");
    } catch (error) {
      console.warn("Firebase Admin initialization failed:", error.message);
      console.warn("Custom tokens will use fallback JWT method");
    }
  }
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// In-memory storage (use proper database in production)
const pendingOAuthRequests = new Map();
const activeSessions = new Map();
const userSessions = new Map();

const MOCK_MODE =
  process.env.VITE_USE_MOCK_DATA === "true" ||
  process.env.USE_MOCK_DATA === "true"
    ? true
    : false;

async function socketAuthMiddleware(socket, next) {
  if (MOCK_MODE) {
    const userId = socket.handshake.auth.userId;
    const displayName = socket.handshake.auth.displayName;
    const photoURL = socket.handshake.auth.photoURL;
    if (!userId) {
      console.error(
        JSON.stringify({
          event: "socket_auth_failure",
          mode: "mock",
          reason: "missing_userId",
        })
      );
      return next(new Error("Authentication error"));
    }
    socket.userId = userId;
    socket.displayName = displayName;
    socket.photoURL = photoURL;
    return next();
  }

  try {
    const idToken = socket.handshake.auth && socket.handshake.auth.idToken;
    if (!idToken) {
      console.error(
        JSON.stringify({
          event: "socket_auth_failure",
          mode: "real",
          reason: "missing_idToken",
        })
      );
      return next(new Error("Authentication error"));
    }
    const decoded = await admin.auth().verifyIdToken(idToken);
    socket.userId = decoded.uid;
    socket.displayName = decoded.name || decoded.email || decoded.uid;
    socket.photoURL = decoded.picture || null;
    return next();
  } catch (e) {
    console.error(
      JSON.stringify({
        event: "socket_auth_failure",
        mode: "real",
        reason: "verify_failed",
        error: e && e.message ? e.message : "unknown",
      })
    );
    return next(new Error("Authentication error"));
  }
}

io.use(socketAuthMiddleware);

// WebSocket connection handling
io.on("connection", (socket) => {
  console.log(`User ${socket.displayName} connected`);

  socket.on("join_session", ({ sessionId }) => {
    socket.join(sessionId);

    if (!activeSessions.has(sessionId)) {
      activeSessions.set(sessionId, new Set());
    }

    const sessionUsers = activeSessions.get(sessionId);
    sessionUsers.add({
      userId: socket.userId,
      displayName: socket.displayName,
      photoURL: socket.photoURL,
      socketId: socket.id,
    });

    if (!userSessions.has(socket.userId)) {
      userSessions.set(socket.userId, new Set());
    }
    userSessions.get(socket.userId).add(sessionId);

    const users = Array.from(sessionUsers);
    io.to(sessionId).emit("session_users_updated", { sessionId, users });
    socket.to(sessionId).emit("user_joined", {
      sessionId,
      user: {
        userId: socket.userId,
        displayName: socket.displayName,
        photoURL: socket.photoURL,
      },
    });

    console.log(`User ${socket.displayName} joined session ${sessionId}`);
  });

  socket.on("leave_session", ({ sessionId }) => {
    socket.leave(sessionId);

    const sessionUsers = activeSessions.get(sessionId);
    if (sessionUsers) {
      for (const user of sessionUsers) {
        if (user.userId === socket.userId) {
          sessionUsers.delete(user);
          break;
        }
      }

      const userSessionSet = userSessions.get(socket.userId);
      if (userSessionSet) {
        userSessionSet.delete(sessionId);
      }

      const users = Array.from(sessionUsers);
      io.to(sessionId).emit("session_users_updated", { sessionId, users });
      socket.to(sessionId).emit("user_left", {
        sessionId,
        user: {
          userId: socket.userId,
          displayName: socket.displayName,
          photoURL: socket.photoURL,
        },
      });
    }

    console.log(`User ${socket.displayName} left session ${sessionId}`);
  });

  socket.on("send_message", ({ sessionId, message }) => {
    const messageData = {
      id: Date.now().toString(),
      sessionId,
      userId: socket.userId,
      userName: socket.displayName,
      userAvatar: socket.photoURL,
      message,
      timestamp: new Date(),
      type: "text",
    };

    io.to(sessionId).emit("new_message", messageData);
    console.log(
      `Message in session ${sessionId} from ${socket.displayName}: ${message}`
    );
  });

  socket.on("file_updated", ({ sessionId, fileName, fileUrl }) => {
    socket.to(sessionId).emit("file_updated", {
      sessionId,
      fileName,
      fileUrl,
      updatedBy: {
        userId: socket.userId,
        displayName: socket.displayName,
        photoURL: socket.photoURL,
      },
    });

    console.log(
      `File ${fileName} updated in session ${sessionId} by ${socket.displayName}`
    );
  });

  socket.on("disconnect", () => {
    console.log(`User ${socket.displayName} disconnected`);

    const userSessionSet = userSessions.get(socket.userId);
    if (userSessionSet) {
      for (const sessionId of userSessionSet) {
        const sessionUsers = activeSessions.get(sessionId);
        if (sessionUsers) {
          for (const user of sessionUsers) {
            if (user.userId === socket.userId) {
              sessionUsers.delete(user);
              break;
            }
          }

          const users = Array.from(sessionUsers);
          io.to(sessionId).emit("session_users_updated", { sessionId, users });
          socket.to(sessionId).emit("user_left", {
            sessionId,
            user: {
              userId: socket.userId,
              displayName: socket.displayName,
              photoURL: socket.photoURL,
            },
          });
        }
      }
      userSessions.delete(socket.userId);
    }
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// OAuth callback endpoint with modern UI
app.get("/auth/callback", (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.send(
      getErrorPageHTML("Authentication Error", `Error: ${error}`)
    );
  }

  if (!state || !pendingOAuthRequests.has(state)) {
    return res.send(
      getErrorPageHTML(
        "Authentication Error",
        "Invalid or expired authentication request"
      )
    );
  }

  const request = pendingOAuthRequests.get(state);
  pendingOAuthRequests.delete(state);

  request.code = code;
  request.completed = true;

  res.send(getSuccessPageHTML());
});

// Start OAuth flow
app.post("/auth/start", (req, res) => {
  const { provider } = req.body;

  if (!provider || provider !== "google") {
    return res.status(400).json({ error: "Unsupported provider" });
  }

  const state = crypto.randomBytes(32).toString("hex");
  const redirectUri = `http://localhost:${PORT}/auth/callback`;

  pendingOAuthRequests.set(state, {
    provider,
    timestamp: Date.now(),
    completed: false,
  });

  // Clean up old requests (older than 10 minutes)
  for (const [key, value] of pendingOAuthRequests.entries()) {
    if (Date.now() - value.timestamp > 10 * 60 * 1000) {
      pendingOAuthRequests.delete(key);
    }
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${querystring.stringify(
    {
      client_id: process.env.GOOGLE_CLIENT_ID || "your-google-client-id",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state: state,
      access_type: "offline",
      prompt: "consent",
    }
  )}`;

  res.json({ authUrl, state });
});

// Poll for OAuth completion
app.get("/auth/poll/:state", (req, res) => {
  const { state } = req.params;

  if (!pendingOAuthRequests.has(state)) {
    return res.status(404).json({ error: "Request not found or expired" });
  }

  const request = pendingOAuthRequests.get(state);

  if (request.completed) {
    pendingOAuthRequests.delete(state);
    return res.json({
      completed: true,
      code: request.code,
      provider: request.provider,
    });
  }

  res.json({ completed: false });
});

// Exchange authorization code for custom token
app.post("/auth/exchange", async (req, res) => {
  const { code, provider } = req.body;

  if (!code || !provider) {
    return res.status(400).json({ error: "Missing code or provider" });
  }

  try {
    let userData;

    if (provider === "google") {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          code: code,
          grant_type: "authorization_code",
          redirect_uri: `http://localhost:8080/auth/callback`,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.log("Google OAuth error response:", errorText);
        throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
      }

      const tokenData = await tokenResponse.json();

      const userResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        }
      );

      if (!userResponse.ok) {
        throw new Error(`User info fetch failed: ${userResponse.statusText}`);
      }

      const googleUser = await userResponse.json();

      userData = {
        uid: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        provider: "google",
      };
    }

    let customToken;

    if (admin.apps.length > 0) {
      try {
        customToken = await admin.auth().createCustomToken(userData.uid, {
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          provider: userData.provider,
        });
        console.log("Created Firebase custom token using Admin SDK");
      } catch (adminError) {
        console.warn(
          "Firebase Admin token creation failed:",
          adminError.message
        );
        customToken = createFallbackToken(userData);
      }
    } else {
      customToken = createFallbackToken(userData);
    }

    res.json({ customToken, user: userData });
  } catch (error) {
    console.error("Token exchange error:", error);
    res.status(500).json({ error: "Failed to exchange authorization code" });
  }
});

// Note: Passkey endpoints removed - PasskeyAuth now handles everything client-side
// using Firebase Auth, Firestore, and WebAuthn APIs directly

// Get session statistics
app.get("/api/sessions/:sessionId/stats", (req, res) => {
  const { sessionId } = req.params;
  const sessionUsers = activeSessions.get(sessionId);

  res.json({
    sessionId,
    activeUsers: sessionUsers ? sessionUsers.size : 0,
    users: sessionUsers ? Array.from(sessionUsers) : [],
  });
});

// Helper functions for HTML responses
function createFallbackToken(userData) {
  console.log("Using fallback JWT token creation");
  return jwt.sign(
    {
      iss: "syncdaw-local-auth",
      sub: userData.uid,
      aud: "syncdaw-app",
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      iat: Math.floor(Date.now() / 1000),
      uid: userData.uid,
      claims: {
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        provider: userData.provider,
      },
    },
    process.env.JWT_SECRET || "your-jwt-secret-key"
  );
}

function getSuccessPageHTML() {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Authentication Successful - SyncDaw</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, hsl(221.2, 83.2%, 53.3%) 0%, hsl(217.2, 91.2%, 59.8%) 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: hsl(210, 40%, 98%);
          }
          
          .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            padding: 2rem;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            animation: slideUp 0.3s ease-out;
          }
          
          .icon {
            width: 64px;
            height: 64px;
            background: rgba(34, 197, 94, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            font-size: 2rem;
            animation: bounce 0.6s ease-out;
          }
          
          h1 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: hsl(210, 40%, 98%);
          }
          
          p {
            color: rgba(255, 255, 255, 0.8);
            margin-bottom: 1.5rem;
            line-height: 1.5;
          }
          
          @keyframes slideUp {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          
          @keyframes bounce {
            0%, 20%, 53%, 80%, 100% {
              transform: translate3d(0, 0, 0);
            }
            40%, 43% {
              transform: translate3d(0, -8px, 0);
            }
            70% {
              transform: translate3d(0, -4px, 0);
            }
            90% {
              transform: translate3d(0, -2px, 0);
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">✓</div>
          <h1>Authentication Successful!</h1>
          <p>Welcome to SyncDaw! You can now close this window and return to the application.</p>
          
          </div>
      </body>
    </html>
  `;
}

function getErrorPageHTML(title, message) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - SyncDaw</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, hsl(221.2, 83.2%, 53.3%) 0%, hsl(217.2, 91.2%, 59.8%) 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: hsl(210, 40%, 98%);
          }
          
          .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            padding: 2rem;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          }
          
          .icon {
            width: 64px;
            height: 64px;
            background: rgba(239, 68, 68, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            font-size: 2rem;
          }
          
          h1 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: hsl(210, 40%, 98%);
          }
          
          p {
            color: rgba(255, 255, 255, 0.8);
            margin-bottom: 1rem;
            line-height: 1.5;
          }
          
          .countdown {
            font-size: 0.875rem;
            color: rgba(255, 255, 255, 0.6);
            margin-bottom: 0;
          }
          
          .pulse {
            animation: pulse 2s infinite;
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon pulse">❌</div>
          <h1>${title}</h1>
          <p>${message}</p>
          <p class="countdown">This window will close automatically in <span id="countdown">3</span> seconds</p>
        </div>
        
        <script>
          let seconds = 3;
          const countdownEl = document.getElementById('countdown');
          
          const timer = setInterval(() => {
            seconds--;
            countdownEl.textContent = seconds;
            
            if (seconds <= 0) {
              clearInterval(timer);
              window.close();
            }
          }, 1000);
        </script>
      </body>
    </html>
  `;
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SyncDaw server running on port ${PORT}`);
  console.log(`WebSocket server: ws://localhost:${PORT}`);
  console.log(`OAuth callback: http://localhost:${PORT}/auth/callback`);
});

module.exports = { app, server, io, socketAuthMiddleware };
