const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

let wss = null;

const wsService = {
  /**
   * Attach the raw WebSocket server to the existing HTTP server instance
   * using the HTTP 'upgrade' event.
   */
  attach: (httpServer) => {
    // 1. Initialize a standalone WebSocket server instance with noServer config
    wss = new WebSocket.Server({ noServer: true });
    console.log('[ws] Raw WebSocket server initialized.');

    // 2. Intercept the HTTP 'upgrade' event to manually route /ws requests
    httpServer.on('upgrade', async (request, socket, head) => {
      try {
        const url = new URL(request.url, `http://${request.headers.host}`);
        
        // Only handle upgrades targeting /ws
        if (url.pathname !== '/ws') {
          return; // Let other handlers (like Socket.io or Express) handle it
        }

        // 3. Authenticate JWT during connection upgrade handshake
        const token = url.searchParams.get('token');
        if (!token) {
          console.warn('[ws] Upgrade rejected: Token missing.');
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        let decoded;
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
          console.warn(`[ws] Upgrade rejected: Malformed or expired JWT (${err.message}).`);
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        const user = await User.findById(decoded.id);
        if (!user) {
          console.warn('[ws] Upgrade rejected: User no longer exists.');
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // 4. Complete WebSocket handshake and delegate connection to wss
        wss.handleUpgrade(request, socket, head, (ws) => {
          // Attach authenticated user metadata directly to the ws instance
          ws.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
          };
          ws.currentRoom = null;
          
          wss.emit('connection', ws, request);
        });
      } catch (err) {
        console.error('[ws] Error handling server upgrade:', err);
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
      }
    });

    // 5. Connection lifecycle handlers
    wss.on('connection', (ws) => {
      console.log(`[ws] User ${ws.user.name} connected to raw WebSocket server.`);

      ws.on('message', (messageStr) => {
        try {
          const data = JSON.parse(messageStr);
          const { type } = data;

          switch (type) {
            case 'join':
              handleJoinRoom(ws, data.room);
              break;
            case 'message':
              handleSendMessage(ws, data.text);
              break;
            case 'typing':
              handleTypingIndicator(ws, data.isTyping);
              break;
            default:
              ws.send(JSON.stringify({ type: 'error', text: `Unknown message type: ${type}` }));
          }
        } catch (err) {
          console.error('[ws] Failed to parse client message:', err.message);
          ws.send(JSON.stringify({ type: 'error', text: 'Invalid message payload. Expected valid JSON.' }));
        }
      });

      ws.on('close', () => {
        console.log(`[ws] User ${ws.user.name} disconnected.`);
        if (ws.currentRoom) {
          broadcastToRoom(ws.currentRoom, {
            type: 'sys-message',
            text: `${ws.user.name} disconnected.`,
            timestamp: new Date().toISOString(),
          }, ws); // exclude self (already disconnected anyway)
        }
      });

      ws.on('error', (err) => {
        console.error(`[ws] Socket error for ${ws.user.name}:`, err.message);
      });
    });
  },

  getWSS: () => {
    if (!wss) {
      throw new Error('WebSocket server not initialized!');
    }
    return wss;
  },
};

/**
 * Handle Room Joining for raw WebSocket connections
 */
function handleJoinRoom(ws, roomName) {
  if (!roomName) {
    return ws.send(JSON.stringify({ type: 'error', text: 'Room name is required.' }));
  }

  // 1. Leave current room if already in one
  if (ws.currentRoom) {
    const oldRoom = ws.currentRoom;
    console.log(`[ws] User ${ws.user.name} left room ${oldRoom}`);
    broadcastToRoom(oldRoom, {
      type: 'sys-message',
      text: `${ws.user.name} has left the room.`,
      timestamp: new Date().toISOString(),
    }, ws);
  }

  // 2. Set current room and broadcast join
  ws.currentRoom = roomName;
  console.log(`[ws] User ${ws.user.name} joined room ${roomName}`);

  // Confirm join to the client
  ws.send(JSON.stringify({
    type: 'joined',
    room: roomName,
    text: `You joined room: ${roomName}`,
  }));

  // Broadcast to all other users in that room
  broadcastToRoom(roomName, {
    type: 'sys-message',
    text: `${ws.user.name} has joined the room.`,
    timestamp: new Date().toISOString(),
  }, ws);
}

/**
 * Handle Chat Messages (Broadcast to all clients in the room)
 */
function handleSendMessage(ws, text) {
  if (!ws.currentRoom) {
    return ws.send(JSON.stringify({ type: 'error', text: 'Please join a room before sending messages.' }));
  }
  if (!text || text.trim() === '') return;

  // Broadcast the chat message to everyone in the room (including sender)
  broadcastToRoom(ws.currentRoom, {
    type: 'message',
    userId: ws.user.id,
    user: ws.user.name,
    text: text,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handle Live Typing Indicators (Broadcast status to all other clients in the room)
 */
function handleTypingIndicator(ws, isTyping) {
  if (!ws.currentRoom) return;

  broadcastToRoom(ws.currentRoom, {
    type: 'user-typing',
    userId: ws.user.id,
    user: ws.user.name,
    isTyping: !!isTyping,
  }, ws); // exclude sender
}

/**
 * Broadcast JSON payload to all clients subscribed to a target room name.
 * Optionally excludes a specific socket client (e.g. the sender).
 */
function broadcastToRoom(roomName, payload, excludeWs = null) {
  if (!wss) return;

  const payloadStr = JSON.stringify(payload);
  
  wss.clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.currentRoom === roomName &&
      client !== excludeWs
    ) {
      client.send(payloadStr);
    }
  });
}

module.exports = wsService;
