const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { activeConnections } = require('./metrics');


let io = null;

const socketService = {
  init: (httpServer) => {
    // Instantiate Socket.io server with CORS support
    io = new Server(httpServer, {
      cors: {
        origin: '*', // Allow all origins for development
        methods: ['GET', 'POST'],
      },
    });

    console.log('[Socket.io] Real-time server initialized.');

    // 2. Chat Namespace definition
    const chatNamespace = io.of('/chat');

    // 1. Handshake Authentication Middleware
    chatNamespace.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
          return next(new Error('Authentication failed: Token missing.'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
          return next(new Error('Authentication failed: User no longer exists.'));
        }

        // Attach user metadata to socket instance
        socket.user = {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        };
        next();
      } catch (err) {
        return next(new Error(`Authentication failed: ${err.message}`));
      }
    });

    chatNamespace.on('connection', (socket) => {
      console.log(`[Socket.io] User ${socket.user.name} connected to /chat namespace.`);
      activeConnections.inc({ type: 'websocket' });
      
      let currentRoom = null;

      // Handle room joining
      socket.on('join-room', (roomName) => {
        if (currentRoom) {
          socket.leave(currentRoom);
          console.log(`[Socket.io] User ${socket.user.name} left room ${currentRoom}`);
        }

        socket.join(roomName);
        currentRoom = roomName;
        console.log(`[Socket.io] User ${socket.user.name} joined room ${roomName}`);

        // Broadcast to others in the room that a user has joined
        socket.to(roomName).emit('sys-message', {
          user: 'System',
          text: `${socket.user.name} has joined the room.`,
          timestamp: new Date().toISOString(),
        });
      });

      // Handle leaving room explicitly
      socket.on('leave-room', () => {
        if (currentRoom) {
          socket.leave(currentRoom);
          console.log(`[Socket.io] User ${socket.user.name} left room ${currentRoom}`);
          
          socket.to(currentRoom).emit('sys-message', {
            user: 'System',
            text: `${socket.user.name} has left the room.`,
            timestamp: new Date().toISOString(),
          });
          currentRoom = null;
        }
      });

      // Handle chat messages (broadcasting to room)
      socket.on('send-message', (messageText) => {
        if (!currentRoom) {
          return socket.emit('error-msg', 'Please join a room before sending messages.');
        }

        // Broadcast message to everyone in the room (including the sender using namespace level emit or standard room broadcast)
        // We broadcast to everyone *else* using socket.to(), and echo back to sender, or emit to all in room:
        chatNamespace.to(currentRoom).emit('message', {
          userId: socket.user.id,
          user: socket.user.name,
          text: messageText,
          timestamp: new Date().toISOString(),
        });
      });

      // Handle typing indicator (broadcasting to others in the room)
      socket.on('typing', (isTyping) => {
        if (currentRoom) {
          socket.to(currentRoom).emit('user-typing', {
            userId: socket.user.id,
            user: socket.user.name,
            isTyping: isTyping,
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`[Socket.io] User ${socket.user.name} disconnected from /chat.`);
        activeConnections.dec({ type: 'websocket' });
        if (currentRoom) {
          socket.to(currentRoom).emit('sys-message', {
            user: 'System',
            text: `${socket.user.name} disconnected.`,
            timestamp: new Date().toISOString(),
          });
        }
      });
    });
  },

  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  },
};

module.exports = socketService;
