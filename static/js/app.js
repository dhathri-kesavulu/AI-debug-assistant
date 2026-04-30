/* ============================================
   DΞBUG — Frontend Logic
   ============================================ */

// ── State ──
const state = {
  history: [],
  isStreaming: false,
  msgCount: 0,
  bugCount: 0,
};

// ── DOM refs ──
const messagesEl = document.getElementById('messages');
const welcomeScreen = document.getElementById('welcomeScreen');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const langSelect = document.getElementById('langSelect');
const charCount = document.getElementById('charCount');
const msgCountEl = document.getElementById('msgCount');
const bugCountEl = document.getElementById('bugCount');

// ── Marked.js config ──
marked.setOptions({
  breaks: true,
  gfm: true,
});

// ── Highlight.js renderer override ──
const renderer = new marked.Renderer();
renderer.code = function (token) {
  const code = (typeof token === 'string') ? token : (token.text || '');
  const lang = (typeof token === 'string') ? arguments[1] : (token.lang || '');
  const language = lang || 'plaintext';
  const validLang = hljs.getLanguage(language) ? language : 'plaintext';
  const highlighted = hljs.highlight(code, { language: validLang }).value;
  const langLabel = language.toUpperCase();
  return `
    <div class="code-block-wrapper">
      <pre><div class="code-header">
        <span class="code-lang">${langLabel}</span>
        <button class="copy-btn" onclick="copyCode(this)">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          COPY
        </button>
      </div><code class="hljs language-${validLang}">${highlighted}</code></pre>
    </div>`;
};

marked.use({ renderer });

// ── Copy code ──
function copyCode(btn) {
  const pre = btn.closest('pre');
  const code = pre.querySelector('code');
  const text = code.textContent || code.innerText;
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('copied');
    btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> COPIED`;
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> COPY`;
    }, 2000);
  });
}

// ── Toast notifications ──
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success'
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Time formatter ──
function getTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ── Append user message ──
function appendUserMessage(text) {
  hideWelcome();
  const el = document.createElement('div');
  el.className = 'message user';
  el.innerHTML = `
    <div class="message-avatar">YOU</div>
    <div class="message-content">
      <div class="message-header">
        <span class="message-name">USER</span>
        <span class="message-time">${getTime()}</span>
      </div>
      <div class="message-body">${escapeHtml(text)}</div>
    </div>`;
  messagesEl.appendChild(el);
  scrollToBottom();
}

// ── Append assistant message (streaming) ──
function appendAssistantMessage() {
  const el = document.createElement('div');
  el.className = 'message assistant';
  el.innerHTML = `
    <div class="message-avatar">AI</div>
    <div class="message-content">
      <div class="message-header">
        <span class="message-name">DΞBUG</span>
        <span class="message-time">${getTime()}</span>
      </div>
      <div class="message-body">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    </div>`;
  messagesEl.appendChild(el);
  scrollToBottom();
  return el.querySelector('.message-body');
}

// ── Update streaming content ──
function updateStreamContent(bodyEl, fullText) {
  bodyEl.innerHTML = marked.parse(fullText);
  scrollToBottom();
}

// ── Helpers ──
function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function hideWelcome() {
  if (welcomeScreen) welcomeScreen.style.display = 'none';
}

function setInputDisabled(disabled) {
  state.isStreaming = disabled;
  sendBtn.disabled = disabled;
  userInput.disabled = disabled;
  if (disabled) {
    sendBtn.innerHTML = `<span class="send-label">...</span>`;
  } else {
    sendBtn.innerHTML = `<span class="send-label">DEBUG</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>`;
  }
}

function updateStats() {
  msgCountEl.textContent = state.msgCount;
  bugCountEl.textContent = state.bugCount;
}

// ── Main send function ──
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || state.isStreaming) return;

  const language = langSelect.value;

  // Add to history & UI
  state.history.push({ role: 'user', content: text });
  appendUserMessage(text);
  state.msgCount++;
  updateStats();

  userInput.value = '';
  charCount.textContent = '0';
  autoResize();
  setInputDisabled(true);

  const bodyEl = appendAssistantMessage();
  let fullResponse = '';
  let hasError = false;

  try {
    const response = await fetch('/api/debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: state.history.slice(0, -1), // exclude last user msg (already added)
        language,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.error) {
            bodyEl.innerHTML = `<div style="color: var(--red); padding: 8px 0;">⚠ ${escapeHtml(data.error)}</div>`;
            showToast(data.error, 'error');
            hasError = true;
            break;
          }
          if (data.done) break;
          if (data.text) {
            fullResponse += data.text;
            updateStreamContent(bodyEl, fullResponse);
          }
        } catch (_) { /* skip malformed lines */ }
      }

      if (hasError) break;
    }

    if (!hasError && fullResponse) {
      state.history.push({ role: 'assistant', content: fullResponse });
      state.msgCount++;
      state.bugCount++;
      updateStats();
    }

  } catch (err) {
    bodyEl.innerHTML = `<div style="color: var(--red); padding: 8px 0;">⚠ Connection error: ${escapeHtml(err.message)}</div>`;
    showToast('Connection error. Is the server running?', 'error');
  } finally {
    setInputDisabled(false);
    userInput.focus();
    scrollToBottom();
  }
}

// ── Auto-resize textarea ──
function autoResize() {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 200) + 'px';
}

// ── Quick prompts ──
document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const prompt = btn.dataset.prompt;
    userInput.value = prompt;
    autoResize();
    charCount.textContent = prompt.length;
    userInput.focus();
    userInput.setSelectionRange(prompt.length, prompt.length);
  });
});

// ── Example tags ──
const examples = {
  null: `I'm getting a NullPointerException in Java. Here's the code:\n\npublic String getUserName(User user) {\n    return user.getProfile().getName().toUpperCase();\n}\n\nError: java.lang.NullPointerException at line 2`,
  async: `My async JavaScript code has a race condition. Both requests sometimes overwrite each other:\n\nasync function fetchUserData(userId) {\n    const profile = await fetch(\`/api/users/\${userId}\`);\n    const posts = await fetch(\`/api/posts/\${userId}\`);\n    return { profile: await profile.json(), posts: await posts.json() };\n}`,
  seg: `I'm getting a segfault in C. Here's the code:\n\n#include <stdio.h>\n\nint main() {\n    int *ptr = NULL;\n    *ptr = 42;\n    printf("%d\\n", *ptr);\n    return 0;\n}`,
  type: `Getting a TypeError in Python. What's wrong?\n\ndef calculate_average(numbers):\n    total = sum(numbers)\n    return total / len(numbers)\n\nresult = calculate_average("12345")\nprint(result)`,
};

function setExample(key) {
  const prompt = examples[key];
  if (prompt) {
    userInput.value = prompt;
    autoResize();
    charCount.textContent = prompt.length;
    userInput.focus();
  }
}

// ── Clear conversation ──
clearBtn.addEventListener('click', () => {
  state.history = [];
  state.msgCount = 0;
  state.bugCount = 0;
  updateStats();
  messagesEl.innerHTML = '';
  // Re-add welcome
  const welcome = document.createElement('div');
  welcome.id = 'welcomeScreen';
  welcome.className = 'welcome';
  welcome.innerHTML = `
    <div class="welcome-icon">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    </div>
    <h2 class="welcome-title">Ready to squash bugs.</h2>
    <p class="welcome-sub">Paste your code, error message, or stack trace.<br>I'll find the root cause and fix it fast.</p>
    <div class="welcome-examples">
      <span class="example-tag" onclick="setExample('null')">NullPointerException</span>
      <span class="example-tag" onclick="setExample('async')">Async Race Condition</span>
      <span class="example-tag" onclick="setExample('seg')">Segfault</span>
      <span class="example-tag" onclick="setExample('type')">TypeError</span>
    </div>`;
  messagesEl.appendChild(welcome);
  showToast('Conversation cleared', 'success');
});

// ── Input events ──
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

userInput.addEventListener('input', () => {
  autoResize();
  charCount.textContent = userInput.value.length;
});

sendBtn.addEventListener('click', sendMessage);

// ── Init ──
userInput.focus();
