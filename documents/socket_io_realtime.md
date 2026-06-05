# Real-Time WebSockets with Socket.io

This document describes the implementation of real-time bidirectional communication using the `socket.io` library in our Node.js production application.

## 1. Concepts Demonstrated
- **Namespaces**: Isolating communications under logical scopes (e.g. `/chat` namespace).
- **Rooms**: Partitioning clients within specific channels (e.g. `room:tech` or `room:general`) so broadcasts only go to subscribed room members.
- **Broadcasting**: Broadcasting events to all clients in a room (`chatNamespace.to(roomName).emit(...)`) or all clients except the sender (`socket.to(roomName).emit(...)`).
- **Connection Handshake Authentication**: Restricts WebSocket connections by validating JWT tokens passed in connection payloads prior to establishing connections.

---

## 2. Server Architecture: [socketService.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/utils/socketService.js)
The socket service handles initialization, connection handshakes, authentication, and room subscriptions:

```javascript
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// Authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Token missing'));
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) return next(new Error('User not found'));
  
  socket.user = { id: user._id, name: user.name };
  next();
});

// Namespace registration
const chatNamespace = io.of('/chat');
chatNamespace.on('connection', (socket) => {
  // Join Room
  socket.on('join-room', (roomName) => {
    socket.join(roomName);
  });
  
  // Broadcast Message to Room
  socket.on('send-message', (text) => {
    chatNamespace.to(roomName).emit('message', { user: socket.user.name, text });
  });
});
```

---

## 3. Web Client Interface: [chat.html](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/public/chat.html)
We have designed a premium glassmorphism dark-mode client dashboard to interact with the WebSocket server.

### Features
1. **JWT Shield**: Prompts users to paste their JWT authentication token.
2. **Room Selector**: Allows joining `tech-talk`, `general`, or `random` rooms.
3. **Broadcasting Log**: Lists system logs (e.g., users joining/leaving) and user chat bubble logs.
4. **Typing Indicators**: Displays "X is typing..." alerts when other room members type in the input box.

### Visual Guide
To launch and test:
1. Start the server (`npm run dev`).
2. Register/Login to obtain a JWT access token.
3. Open `http://localhost:5000/chat.html` in multiple tabs.
4. Paste the JWT token to authenticate and start chatting in real time!
