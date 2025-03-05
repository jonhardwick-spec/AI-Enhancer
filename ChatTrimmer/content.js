(function() {
  const KEEP_COUNT = 5;
  const CHILL_VIBE = 100; // Debounce 100ms
  const STASH_CAP = 50;

  const crashout = (...args) => console.log('[ChatTrimmer]', ...args);
  let debugLogs = [];
  let crashedJugsCompressed = [];
  let activeJugs = [];
  let crashedIds = new Set();
  let isEnabled = true;
  let keepCrashed = false;
  let debugSite = false;
  let debugPlugin = false;
  let platform = 'grok';
  let chatContainer = null;
  let worker = null;
  let crashWatcher = null;
  let lastCrashTime = 0;
  const userColor = 'hsl(0, 0%, 0%)';
  const grokColor = 'hsl(0, 100%, 50%)';

  const platformSelectors = {
    grok: { container: '.max-w-3xl', message: '.message-row', bubble: '.message-bubble', grokMarker: 'items-start', userMarker: 'items-end' },
    chatgpt: { container: '.conversation', message: '.message', bubble: '.text', grokMarker: 'bot', userMarker: 'user' },
    deepseek: { container: '.chat-container', message: '.chat-message', bubble: '.content', grokMarker: 'ai', userMarker: 'human' },
    qwen: { container: '.chat-box', message: '.msg', bubble: '.msg-text', grokMarker: 'assistant', userMarker: 'user' },
    claude: { container: '.chat-thread', message: '.chat-entry', bubble: '.entry-text', grokMarker: 'claude', userMarker: 'user' }
  };

  // Web Worker for compression/hashing
  const workerScript = `
    self.addEventListener('message', (e) => {
      const { type, text, id } = e.data;
      const LZString = (function(){var e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";function t(t){var n,r,i="";for(n=0;n<t.length;){var o=t.charCodeAt(n++);if(o<128)i+=String.fromCharCode(o);else if(o>191&&o<224){r=t.charCodeAt(n++);i+=String.fromCharCode((31&o)<<6|63&r)}else{r=t.charCodeAt(n++);var a=t.charCodeAt(n++);i+=String.fromCharCode((15&o)<<12|(63&r)<<6|63&a)}}return i}function n(t){var n,r,i="";for(n=0;n<t.length;){var o=t.charCodeAt(n++);if(o<128)i+=e.charAt(o);else if(o>127&&o<2048)i+=e.charAt(o>>6|192)+e.charAt(63&o);else{r=t.charCodeAt(n++);i+=e.charAt(o>>12|224)+e.charAt(o>>6&63|128)+e.charAt(63&r)}}return i}function r(e){for(var t="",n=0,r=0,i=0,o=0,a=0;e.length>n;){r=e.charCodeAt(n)-32,i<<=6,i+=r,o+=6,a>7&&(t+=String.fromCharCode(i>>>a-8&255),i&=255>>>8-a,o=a,a-=8),n++}return o>0&&(i<<=8-o,t+=String.fromCharCode(i>>>o-8)),t}function i(e){for(var t="",n=0,r=0,i=0,o=0;e.length>n;){r="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(e.charAt(n++)),i<<=6,i+=r,o+=6,o>=8&&(t+=String.fromCharCode(i>>>o-8&255),i&=255>>>8-o,o-=8)}return t}return{compress:function(e){return r(n(e))},decompress:function(e){return t(i(e))}}})();
      if (type === 'compress') {
        const compressedText = LZString.compress(text);
        self.postMessage({ id, compressedText });
      } else if (type === 'hash') {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
          hash = (hash << 5) - hash + text.charCodeAt(i);
          hash |= 0;
        }
        self.postMessage({ id, hash: hash.toString() });
      }
    });
  `;

  function initWorker() {
    if (!worker) {
      const blob = new Blob([workerScript], { type: 'application/javascript' });
      worker = new Worker(URL.createObjectURL(blob));
    }
  }

  function logSite(...args) {
    if (debugSite) {
      const msg = `[Site] ${Date.now()} - ${args.join(' ')}`;
      crashout(msg);
      debugLogs.push(msg);
    }
  }

  function logPlugin(...args) {
    if (debugPlugin) {
      const msg = `[Plugin] ${Date.now()} - ${args.join(' ')}`;
      crashout(msg);
      debugLogs.push(msg);
    }
  }

  function setupCrash() {
    const sel = platformSelectors[platform];
    chatContainer = document.querySelector(sel.container);
    if (chatContainer) logPlugin(`Chat container locked: ${sel.container}`);
    else logPlugin(`No container found for ${platform}`);
  }

  function showCrashCount(count) {
    requestAnimationFrame(() => {
      let banner = document.querySelector('.crashout-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.className = 'crashout-banner';
        banner.style.cssText = 'position: fixed; top: 10px; left: 50%; transform: translateX(-50%); background: #000; color: #fff; padding: 6px 12px; border-radius: 4px; z-index: 9999; pointer-events: none;';
        document.body.appendChild(banner);
      }
      banner.textContent = `Nuked ${count}`;
      banner.classList.remove('fade-out');
      setTimeout(() => banner.classList.add('fade-out'), 300);
      setTimeout(() => banner.remove(), 350);
    });
  }

  async function trimChat() {
    if (!isEnabled || !chatContainer) return;
    const now = Date.now();
    if (now - lastCrashTime < CHILL_VIBE) return;
    lastCrashTime = now;

    const sel = platformSelectors[platform];
    const jugs = Array.from(chatContainer.querySelectorAll(sel.message));
    const totalJugs = jugs.length;
    logPlugin(`Snagged ${totalJugs} messages`);

    if (totalJugs <= KEEP_COUNT) return;

    const fragment = document.createDocumentFragment();
    activeJugs = [];
    const toKeep = jugs.slice(-KEEP_COUNT);
    const hashPromises = toKeep.map(jug => new Promise(resolve => {
      const text = jug.querySelector(sel.bubble)?.textContent.trim() || '';
      worker.postMessage({ type: 'hash', text, id: text });
      worker.onmessage = (e) => {
        if (e.data.id === text) {
          const jugId = e.data.hash;
          const isGrok = jug.classList.contains(sel.grokMarker);
          const clone = jug.cloneNode(true);
          clone.style.backgroundColor = isGrok ? `${grokColor}22` : `${userColor}22`;
          fragment.appendChild(clone);
          activeJugs.push({ text, id: jugId, isGrok, html: jug.innerHTML });
          resolve();
        }
      };
    }));

    await Promise.all(hashPromises);

    const toCrash = jugs.slice(0, totalJugs - KEEP_COUNT);
    let crashCount = 0;
    const compressPromises = [];
    toCrash.forEach(jug => {
      const text = jug.querySelector(sel.bubble)?.textContent.trim() || '';
      const jugId = `${Date.now()}-${Math.random()}`; // Faster ID generation
      if (!crashedIds.has(jugId)) {
        if (keepCrashed && crashedJugsCompressed.length < STASH_CAP) {
          crashedJugsCompressed.unshift({ id: jugId, isGrok: jug.classList.contains(sel.grokMarker), text });
          compressPromises.push(new Promise(resolve => {
            worker.postMessage({ type: 'compress', text, id: jugId });
            worker.onmessage = (e) => {
              if (e.data.id === jugId) {
                crashedJugsCompressed[0].compressedText = e.data.compressedText;
                resolve();
              }
            };
          }));
        }
        crashedIds.add(jugId);
        crashCount++;
        jug.remove();
      }
    });

    if (crashCount > 0) {
      await Promise.all(compressPromises);
      logPlugin(`Crashed ${crashCount}, kept ${KEEP_COUNT}`);
      logSite(`DOM updated, removed ${crashCount} messages`);
      showCrashCount(crashCount);
      updateGui();
    }

    requestIdleCallback(() => {
      while (chatContainer.firstChild) chatContainer.firstChild.remove();
      chatContainer.appendChild(fragment);
    });
  }

  function preTrim() {
    setupCrash();
    if (!chatContainer) return;
    const sel = platformSelectors[platform];
    const jugs = Array.from(chatContainer.querySelectorAll(sel.message));
    if (jugs.length === 0) {
      const div = document.createElement('div');
      div.className = sel.message;
      div.innerHTML = `<div class="${sel.bubble}">Chat start</div>`;
      chatContainer.appendChild(div);
      logPlugin('Chat empty, added start message');
      return;
    }
    trimChat();
  }

  function setupGui() {
    if (document.querySelector('.crashout-gui')) return;
    const gui = document.createElement('div');
    gui.className = 'crashout-gui';
    gui.style.cssText = `
      position: fixed; bottom: 10px; right: 10px; z-index: 9999; background: #000; 
      border-radius: 4px; padding: 8px; display: flex; flex-direction: column; 
      width: 250px; color: #fff; font-family: Arial, sans-serif; font-size: 12px;
    `;
    gui.innerHTML = `
      <button class="crashout-btn" style="background: #000; color: #fff; border: 1px solid ${grokColor}; padding: 4px; margin-bottom: 8px; cursor: move;">Stash</button>
      <div class="crashout_dropdown" style="display: none; flex-direction: column; gap: 8px;">
        <button class="crashout-btn-toggle" style="background: ${isEnabled ? '#00ff00' : '#ff0000'}; color: #fff; border: none; padding: 4px;">${isEnabled ? 'On' : 'Off'}</button>
        <label><input type="checkbox" id="keep-crashed" ${keepCrashed ? 'checked' : ''}> Keep Stashed</label>
        <button class="crashout-btn-copy-chat" style="background: #000; color: #fff; border: 1px solid ${grokColor}; padding: 4px;">Copy Chat</button>
        <label><input type="checkbox" id="debug-site" ${debugSite ? 'checked' : ''}> Debug Site</label>
        <label><input type="checkbox" id="debug-plugin" ${debugPlugin ? 'checked' : ''}> Debug Plugin</label>
        <button class="crashout-btn-copy-debug" style="background: #000; color: #fff; border: 1px solid ${grokColor}; padding: 4px;">Copy Logs</button>
        <select id="platform-select" style="background: #000; color: #fff; border: 1px solid ${grokColor}; padding: 4px;">
          <option value="grok" ${platform === 'grok' ? 'selected' : ''}>Grok</option>
          <option value="chatgpt" ${platform === 'chatgpt' ? 'selected' : ''}>ChatGPT</option>
          <option value="deepseek" ${platform === 'deepseek' ? 'selected' : ''}>DeepSeek</option>
          <option value="qwen" ${platform === 'qwen' ? 'selected' : ''}>Qwen</option>
          <option value="claude" ${platform === 'claude' ? 'selected' : ''}>Claude</option>
        </select>
        <div id="crashed-list" style="max-height: 100px; overflow-y: auto; margin-top: 8px;"></div>
      </div>
    `;

    const btn = gui.querySelector('.crashout-btn');
    const dropdown = gui.querySelector('.crashout_dropdown');
    const toggleBtn = gui.querySelector('.crashout-btn-toggle');
    const keepCrashedCheck = gui.querySelector('#keep-crashed');
    const copyChatBtn = gui.querySelector('.crashout-btn-copy-chat');
    const debugSiteCheck = gui.querySelector('#debug-site');
    const debugPluginCheck = gui.querySelector('#debug-plugin');
    const copyDebugBtn = gui.querySelector('.crashout-btn-copy-debug');
    const platformSelect = gui.querySelector('#platform-select');

    btn.addEventListener('click', () => dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none');
    toggleBtn.addEventListener('click', () => {
      isEnabled = !isEnabled;
      toggleBtn.textContent = isEnabled ? 'On' : 'Off';
      toggleBtn.style.backgroundColor = isEnabled ? '#00ff00' : '#ff0000';
      chrome.storage.sync.set({ isEnabled });
      if (isEnabled) startCrashWatch();
      else if (crashWatcher) crashWatcher.disconnect();
      logPlugin(`Plugin ${isEnabled ? 'enabled' : 'disabled'}`);
    });
    keepCrashedCheck.addEventListener('change', () => {
      keepCrashed = keepCrashedCheck.checked;
      chrome.storage.sync.set({ keepCrashed });
      logPlugin(`Keep stashed: ${keepCrashed}`);
      if (!keepCrashed) {
        crashedJugsCompressed = [];
        crashedIds.clear();
        updateGui();
      }
    });
    copyChatBtn.addEventListener('click', () => {
      if (!chatContainer) return;
      const allMessages = [...crashedJugsCompressed.map(jug => jug.text || ''), ...activeJugs.map(jug => jug.text)].join('\n');
      navigator.clipboard.writeText(allMessages).then(() => logPlugin('Chat log copied'));
    });
    debugSiteCheck.addEventListener('change', () => {
      debugSite = debugSiteCheck.checked;
      chrome.storage.sync.set({ debugSite });
      logSite(`Site debug: ${debugSite}`);
    });
    debugPluginCheck.addEventListener('change', () => {
      debugPlugin = debugPluginCheck.checked;
      chrome.storage.sync.set({ debugPlugin });
      logPlugin(`Plugin debug: ${debugPlugin}`);
    });
    copyDebugBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(debugLogs.join('\n')).then(() => logPlugin('Debug logs copied'));
    });
    platformSelect.addEventListener('change', () => {
      platform = platformSelect.value;
      chrome.storage.sync.set({ platform });
      logPlugin(`Platform set: ${platform}`);
      setupCrash();
      trimChat();
    });

    // Dragging logic (optimized)
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;
    btn.addEventListener('mousedown', (e) => {
      isDragging = true;
      offsetX = e.clientX - gui.offsetLeft;
      offsetY = e.clientY - gui.offsetTop;
      logPlugin('GUI drag started');
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      requestAnimationFrame(() => {
        e.preventDefault();
        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;
        const maxLeft = window.innerWidth - gui.offsetWidth;
        const maxTop = window.innerHeight - gui.offsetHeight;
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
        gui.style.left = `${newLeft}px`;
        gui.style.top = `${newTop}px`;
        gui.style.bottom = 'auto';
        gui.style.right = 'auto';
      });
    });
    document.addEventListener('mouseup', () => {
      isDragging = false;
      logPlugin('GUI drag stopped');
    });

    document.body.appendChild(gui);
    updateGui();
    logPlugin('GUI injected');
  }

  function updateGui() {
    const list = document.querySelector('#crashed-list');
    if (!list) return;
    list.innerHTML = crashedJugsCompressed.slice(0, STASH_CAP).map(jug => `
      <div style="padding: 4px; background: ${jug.isGrok ? `${grokColor}22` : `${userColor}22`};">
        ${jug.text.slice(0, 50)}${jug.text.length > 50 ? '...' : ''}
      </div>
    `).join('');
  }

  function startCrashWatch() {
    if (!document.body || !isEnabled) {
      if (crashWatcher) crashWatcher.disconnect();
      setTimeout(startCrashWatch, 10);
      return;
    }
    setupCrash();
    if (!chatContainer) {
      setTimeout(startCrashWatch, 10);
      return;
    }
    if (!crashWatcher) {
      crashWatcher = new MutationObserver(() => requestIdleCallback(trimChat));
      crashWatcher.observe(chatContainer, { childList: true, subtree: true });
      logPlugin('MutationObserver started');
    }
  }

  window.onerror = (msg, url, line) => logPlugin(`Global error: ${msg} at ${url}:${line}`);

  chrome.storage.sync.get(['isEnabled', 'keepCrashed', 'debugSite', 'debugPlugin', 'platform'], (data) => {
    isEnabled = data.isEnabled !== undefined ? data.isEnabled : true;
    keepCrashed = data.keepCrashed || false;
    debugSite = data.debugSite || false;
    debugPlugin = data.debugPlugin || false;
    platform = data.platform || 'grok';
    initWorker();
    setupGui();
    document.addEventListener('DOMContentLoaded', () => {
      preTrim();
      startCrashWatch();
      logPlugin('Plugin initialized');
    });
    if (document.readyState === 'complete') {
      preTrim();
      startCrashWatch();
    }
  });
})();