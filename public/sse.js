let eventSource = null;

const authScreen = document.getElementById('auth-screen');
const jwtInput = document.getElementById('jwt-input');
const authBtn = document.getElementById('auth-btn');

const statusTag = document.getElementById('status-tag');
const userDisplay = document.getElementById('user-display');
const usernameTag = document.getElementById('username-tag');
const userEmailTag = document.getElementById('user-email-tag');

const systemUptime = document.getElementById('system-uptime');
const cpuValue = document.getElementById('cpu-value');
const cpuProgress = document.getElementById('cpu-progress');
const memValue = document.getElementById('mem-value');
const memProgress = document.getElementById('mem-progress');

const logBox = document.getElementById('log-box');
const clearLogsBtn = document.getElementById('clear-logs');

// 1. Establish SSE stream connection
authBtn.addEventListener('click', () => {
  const token = jwtInput.value.trim();
  if (!token) {
    alert('Please paste a valid JWT access token.');
    return;
  }

  // Pre-update status to connecting
  updateStatus('connecting');

  // Build stream URL with token query parameter
  const streamUrl = `/api/v1/sse/stream?token=${encodeURIComponent(token)}`;

  // Create native EventSource
  eventSource = new EventSource(streamUrl);

  // Default event listener (for standard anonymous events)
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const { type } = data;

      switch (type) {
        case 'sys-info':
          updateStatus('connected');
          
          // Decode user info from JWT for sidebar profile visual
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            usernameTag.textContent = payload.name || 'Test User';
            userEmailTag.textContent = payload.email || 'Authenticated via JWT';
          } catch {
            usernameTag.textContent = 'Test User';
          }
          userDisplay.style.display = 'block';
          authScreen.classList.add('hidden');
          logBox.innerHTML = '';
          
          appendLogLine('sys-info', data.text);
          break;
          
        case 'telemetry':
          updateTelemetry(data);
          appendLogLine('telemetry', `System metrics updated: CPU: ${data.cpu}% | RAM: ${data.memory}MB`);
          break;

        default:
          console.warn('[SSE] Unknown default message format:', data);
      }
    } catch (err) {
      console.error('[SSE] Failed parsing default message:', err.message);
    }
  };

  // 2. Custom Named Event Listener ('user-signup' event)
  eventSource.addEventListener('user-signup', (event) => {
    try {
      const data = JSON.parse(event.data);
      appendLogLine('user-signup', `New user registered: ${data.name} (${data.email})`);
    } catch (err) {
      console.error('[SSE] Failed parsing user-signup event:', err.message);
    }
  });

  // 3. Error and Close handler
  eventSource.onerror = (err) => {
    console.error('[SSE] Connection error:', err);
    alert('SSE stream connection terminated or rejected by server.');
    resetSSE();
  };
});

// Clear log display
clearLogsBtn.addEventListener('click', () => {
  logBox.innerHTML = '<div class="sys-msg">Logs cleared. Waiting for events...</div>';
});

// Update UI Telemetry fields
function updateTelemetry(data) {
  // Update CPU elements
  cpuValue.textContent = `${data.cpu}%`;
  cpuProgress.style.width = `${Math.min(data.cpu, 100)}%`;
  
  // Update Memory elements
  memValue.textContent = `${data.memory} MB`;
  // Assuming 512MB limit for visual percentage
  const memPct = Math.min((data.memory / 512) * 100, 100);
  memProgress.style.width = `${memPct}%`;

  // Update Uptime
  systemUptime.textContent = `Server uptime: ${data.uptime}s`;
}

// Append logs directly
function appendLogLine(type, text) {
  const line = document.createElement('div');
  line.className = `log-line ${type}`;

  const timeSpan = document.createElement('span');
  timeSpan.className = 'log-time';
  timeSpan.textContent = new Date().toLocaleTimeString();

  const contentSpan = document.createElement('span');
  contentSpan.className = 'log-content';
  contentSpan.textContent = text;

  line.appendChild(timeSpan);
  line.appendChild(contentSpan);
  logBox.appendChild(line);
  
  // Auto-scroll to bottom of logs
  logBox.scrollTop = logBox.scrollHeight;
}

function updateStatus(state) {
  statusTag.className = `status-badge ${state}`;
  if (state === 'connected') {
    statusTag.textContent = 'Streaming';
  } else if (state === 'connecting') {
    statusTag.textContent = 'Connecting';
  } else {
    statusTag.textContent = 'Disconnected';
  }
}

function resetSSE() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  updateStatus('disconnected');
  authScreen.classList.remove('hidden');
  userDisplay.style.display = 'none';
  logBox.innerHTML = '<div class="sys-msg">Establish authorized connection to begin streaming logs.</div>';
  cpuValue.textContent = '--%';
  cpuProgress.style.width = '0%';
  memValue.textContent = '-- MB';
  memProgress.style.width = '0%';
  systemUptime.textContent = 'Server uptime: --s';
}
