let socket = null;
let currentRoom = null;
let typingTimeout = null;
let isCurrentlyTyping = false;
let myName = 'Roadmap User';

const authScreen = document.getElementById('auth-screen');
const jwtInput = document.getElementById('jwt-input');
const authBtn = document.getElementById('auth-btn');

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

// 1. Establish Authentication & WebSocket Connection
authBtn.addEventListener('click', () => {
  const token = jwtInput.value.trim();
  if (!token) {
    alert('Please paste a valid JWT access token.');
    return;
  }

  // Determine WebSocket protocol based on page protocol
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;

  // Connect using native browser WebSocket client
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log('[WebSocket] Connection established successfully.');
    
    // Decode user info from JWT for profile visual
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // The database user fetch handles details, but we pull name if present (or query if needed)
      // Since JWT only has { id: userId }, let's try to fall back:
      usernameTag.textContent = payload.name || 'Test User';
      userEmailTag.textContent = payload.email || 'Authenticated via JWT';
      myName = payload.name || 'Test User';
    } catch {
      usernameTag.textContent = 'Test User';
      myName = 'Test User';
    }

    userDisplay.style.display = 'block';
    authScreen.classList.add('hidden');
    roomSelect.removeAttribute('disabled');
    msgInput.removeAttribute('disabled');
    sendBtn.removeAttribute('disabled');
    
    messagesBox.innerHTML = '<div class="sys-msg">Connected to raw WebSocket server. Join a room!</div>';
    joinRoom(roomSelect.value);
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const { type } = data;

      switch (type) {
        case 'joined':
          handleJoinedConfirm(data);
          break;
        case 'sys-message':
          handleSysMessage(data);
          break;
        case 'message':
          handleChatMessage(data);
          break;
        case 'user-typing':
          handleUserTyping(data);
          break;
        case 'error':
          alert(`Server Error: ${data.text}`);
          break;
        default:
          console.warn('[WebSocket] Unknown payload type:', type);
      }
    } catch (err) {
      console.error('[WebSocket] Error parsing message payload:', err.message);
    }
  };

  socket.onclose = (event) => {
    console.log('[WebSocket] Connection closed:', event.code, event.reason);
    alert('WebSocket connection closed or rejected by server.');
    resetUI();
  };

  socket.onerror = (err) => {
    console.error('[WebSocket] Error occurred:', err);
    alert('WebSocket connection encountered an error.');
    resetUI();
  };
});

// 2. Room management
roomSelect.addEventListener('change', () => {
  joinRoom(roomSelect.value);
});

function joinRoom(roomName) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  
  currentRoom = roomName;
  
  // Dispatch custom JSON message to server requesting join
  socket.send(JSON.stringify({
    type: 'join',
    room: roomName
  }));
}

function handleJoinedConfirm(data) {
  const roomLabels = {
    'room:tech': '💻 tech-talk',
    'room:general': '💬 general',
    'room:random': '🎲 random'
  };

  currentRoomTitle.textContent = roomLabels[data.room];
  currentRoomDesc.textContent = `Real-time raw WS stream for ${roomLabels[data.room]}`;
  messagesBox.innerHTML = `<div class="sys-msg">${data.text}</div>`;
}

// 3. UI rendering helpers
function handleSysMessage(data) {
  const sysDiv = document.createElement('div');
  sysDiv.className = 'sys-msg';
  sysDiv.textContent = data.text;
  messagesBox.appendChild(sysDiv);
  scrollToBottom();
}

function handleChatMessage(data) {
  const msgWrapper = document.createElement('div');
  // Check if current user is sender
  const isMe = data.user === myName;
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
}

function handleUserTyping(data) {
  if (data.isTyping) {
    typingBox.textContent = `${data.user} is typing...`;
  } else {
    typingBox.textContent = '';
  }
}

// 4. Message dispatching
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = msgInput.value.trim();
  if (!text || !socket || socket.readyState !== WebSocket.OPEN) return;

  // Dispatch custom JSON chat message
  socket.send(JSON.stringify({
    type: 'message',
    text: text
  }));

  msgInput.value = '';
  stoppedTyping();
});

// 5. Typing indicators hooks
msgInput.addEventListener('input', () => {
  if (!socket || socket.readyState !== WebSocket.OPEN || !currentRoom) return;

  if (!isCurrentlyTyping) {
    isCurrentlyTyping = true;
    socket.send(JSON.stringify({
      type: 'typing',
      isTyping: true
    }));
  }

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(stoppedTyping, 2000);
});

function stoppedTyping() {
  if (isCurrentlyTyping && socket && socket.readyState === WebSocket.OPEN) {
    isCurrentlyTyping = false;
    socket.send(JSON.stringify({
      type: 'typing',
      isTyping: false
    }));
  }
}

function scrollToBottom() {
  messagesBox.scrollTop = messagesBox.scrollHeight;
}

function resetUI() {
  socket = null;
  currentRoom = null;
  authScreen.classList.remove('hidden');
  roomSelect.setAttribute('disabled', 'true');
  msgInput.setAttribute('disabled', 'true');
  sendBtn.setAttribute('disabled', 'true');
  userDisplay.style.display = 'none';
  messagesBox.innerHTML = '<div class="sys-msg">Establish authenticated connection to enter rooms.</div>';
  currentRoomTitle.textContent = 'No Room Joined';
  currentRoomDesc.textContent = 'Select a room from the sidebar menu to start broadcasting';
  typingBox.textContent = '';
}
