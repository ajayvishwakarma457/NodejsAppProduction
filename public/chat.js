let socket = null;
let currentRoom = null;
let typingTimeout = null;
let isCurrentlyTyping = false;

const authScreen = document.getElementById('auth-screen');
const jwtInput = document.getElementById('jwt-input');
const authBtn = document.getElementById('auth-btn');

const namespaceSelect = document.getElementById('namespace-select');
const roomSelect = document.getElementById('room-select');
const userDisplay = document.getElementById('user-display');
const usernameTag = document.getElementById('username-tag');
const userEmailTag = document.getElementById('user-email-tag');

const currentRoomTitle = document.getElementById('current-room-title');
const currentRoomDesc = document.getElementById('current-room-desc');
const messagesBox = document.getElementById('messages-box');
const typingBox = document.getElementById('typing-box');
const chatForm = document.getElementById('chat-form');
const msgInput = document.getElementById('msg-input');
const sendBtn = document.getElementById('send-btn');

// 1. Establish Authentication & Socket Connection
authBtn.addEventListener('click', () => {
  const token = jwtInput.value.trim();
  if (!token) {
    alert('Please paste a valid JWT access token.');
    return;
  }

  // Check if Socket.io client script loaded
  if (typeof io === 'undefined') {
    alert('Socket.io library failed to load from server. Verify server is running.');
    return;
  }

  // Connect to the /chat namespace passing token in auth payload
  socket = io('/chat', {
    auth: {
      token: token
    }
  });

  socket.on('connect', () => {
    console.log('Successfully connected to WebSocket.');
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      usernameTag.textContent = payload.name || 'Roadmap User';
      userEmailTag.textContent = payload.email || 'authenticated';
    } catch {
      usernameTag.textContent = 'Authenticated User';
    }

    userDisplay.style.display = 'block';
    authScreen.classList.add('hidden');
    roomSelect.removeAttribute('disabled');
    msgInput.removeAttribute('disabled');
    sendBtn.removeAttribute('disabled');
    
    messagesBox.innerHTML = '<div class="sys-msg">Connected to /chat namespace. Join a room!</div>';
    joinRoom(roomSelect.value);
  });

  socket.on('connect_error', (err) => {
    alert(`WebSocket Connection Failed: ${err.message}`);
    socket.disconnect();
  });

  // System message listener
  socket.on('sys-message', (data) => {
    const sysDiv = document.createElement('div');
    sysDiv.className = 'sys-msg';
    sysDiv.textContent = `${data.text}`;
    messagesBox.appendChild(sysDiv);
    scrollToBottom();
  });

  // General message listener (broadcasting)
  socket.on('message', (data) => {
    const msgWrapper = document.createElement('div');
    const isMe = data.user === usernameTag.textContent;
    msgWrapper.className = `message-wrapper ${isMe ? 'me' : 'others'}`;

    const metaDiv = document.createElement('div');
    metaDiv.className = 'message-meta';
    const formattedTime = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    metaDiv.textContent = `${data.user} • ${formattedTime}`;

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    bubbleDiv.textContent = data.text;

    msgWrapper.appendChild(metaDiv);
    msgWrapper.appendChild(bubbleDiv);
    messagesBox.appendChild(msgWrapper);
    scrollToBottom();
  });

  // Typing indicator listener
  socket.on('user-typing', (data) => {
    if (data.isTyping) {
      typingBox.textContent = `${data.user} is typing...`;
    } else {
      typingBox.textContent = '';
    }
  });
});

// 2. Room management
roomSelect.addEventListener('change', () => {
  joinRoom(roomSelect.value);
});

function joinRoom(roomName) {
  if (!socket) return;
  currentRoom = roomName;
  socket.emit('join-room', roomName);

  const roomLabels = {
    'room:tech': '💻 tech-talk',
    'room:general': '💬 general',
    'room:random': '🎲 random'
  };

  currentRoomTitle.textContent = roomLabels[roomName];
  currentRoomDesc.textContent = `Real-time broadcast stream for ${roomLabels[roomName]}`;
  messagesBox.innerHTML = `<div class="sys-msg">You joined room ${roomLabels[roomName]}.</div>`;
}

// 3. Message dispatching
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = msgInput.value.trim();
  if (!text || !socket) return;

  socket.emit('send-message', text);
  msgInput.value = '';
  
  stoppedTyping();
});

// 4. Typing indicators hooks
msgInput.addEventListener('input', () => {
  if (!socket || !currentRoom) return;

  if (!isCurrentlyTyping) {
    isCurrentlyTyping = true;
    socket.emit('typing', true);
  }

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(stoppedTyping, 2000);
});

function stoppedTyping() {
  if (isCurrentlyTyping && socket) {
    isCurrentlyTyping = false;
    socket.emit('typing', false);
  }
}

function scrollToBottom() {
  messagesBox.scrollTop = messagesBox.scrollHeight;
}
