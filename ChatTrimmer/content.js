(function() {
  const KEEP_MESSAGES = 5; // Total visible messages
  const CHILL_VIBE = 10; // Throttle in ms
  const STASH_CAP = 50; // Max stashed messages
  const ID_CAP = 100; // Max unique IDs tracked
  const HEAVY_LOAD_THRESHOLD = 100; // Messages triggering heavy load
  const MUTATION_THRESHOLD = 50; // Mutations in 5s

  const hoodSpots = { 'grok.com': ['.message-row', '.message-bubble'] };
  const wildHooks = ['.message'];
  const whitelist = ['.btn', '.input', '#chat-input', '.history-menu'];

  const crashout = (...args) => console.log('[Chat Trimmer] Skrrt:', ...args);

  let crashedJugs = [];
  let crashedIds = new Set();
  let isEnabled = true;
  let keepCrashed = true;
  let crashWatcher = null;
  let lastCrashTime = 0;
  const userColor = 'hsl(0, 0%, 0%)';
  const grokColor = 'hsl(0, 100%, 50%)';
  let chatContainer = null;
  let notificationBanner = null;
  let mutationCount = 0;
  let lastMutationCheck = Date.now();

  const replyCache = { 'Ran script': 'Yo, fam, Ran script hittin’—we fast now!' };

  let crashZone = document;
  let bestCrashHook = null;

  // Hash function for message IDs
  function hashJug(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString();
  }

  // Snatch best hook for trimming
  function snatchBestHook(crashRoot = document) {
    try {
      const hooks = hoodSpots['grok.com'] || wildHooks;
      let topHook = hooks[0];
      let maxCount = 0;
      hooks.forEach(hook => {
        const jugs = crashRoot.querySelectorAll(hook);
        if (jugs.length > maxCount) {
          topHook = hook;
          maxCount = jugs.length;
        }
      });
      crashout(`Snatched hook: ${topHook}, found ${maxCount} elements`);
      return { hook: topHook, crashCount: maxCount };
    } catch (e) {
      crashout('Hook snatch failed:', e.message);
      showNotification(`Error on line ${e.lineNumber || 'unknown'}`);
      return { hook: null, crashCount: 0 };
    }
  }

  // Setup chat container and hook
  function setupCrash() {
    try {
      const { hook } = snatchBestHook(document);
      bestCrashHook = hook;
      crashZone = document;
      chatContainer = crashZone.querySelector('.max-w-3xl') || document.body;
      if (!chatContainer) throw new Error('Chat container not found');
      if (bestCrashHook) crashout(`Hook locked: "${bestCrashHook}"`);
    } catch (e) {
      crashout('Setup crashed:', e.message);
      showNotification(`Error on line ${e.lineNumber || 'unknown'}`);
      selfHeal('setupCrash', e);
    }
  }

  // Show notification banner (red/black themed)
  function showNotification(message) {
    if (!notificationBanner) {
      notificationBanner = document.createElement('div');
      notificationBanner.style.cssText = `
        position: fixed; top: 0; left: 50%; transform: translateX(-50%); 
        background: #000; color: #ff0000; padding: 8px 16px; border: 2px solid #ff0000; 
        border-radius: 0 0 4px 4px; z-index: 1001; font-family: 'Courier New', monospace; 
        font-size: 14px; opacity: 0; transition: opacity 0.3s; box-shadow: 0 2px 4px rgba(255, 0, 0, 0.3);
      `;
      document.body.appendChild(notificationBanner);
    }
    notificationBanner.textContent = message;
    notificationBanner.style.opacity = '1';
    setTimeout(() => {
      notificationBanner.style.opacity = '0';
      setTimeout(() => notificationBanner.style.display = 'none', 300);
    }, 2000);
  }

  // Self-healing error handler
  function selfHeal(funcName, error) {
    crashout(`Attempting self-heal in ${funcName}:`, error.message);
    try {
      switch (funcName) {
        case 'setupCrash':
          crashZone = document.body;
          chatContainer = crashZone.querySelector('.max-w-3xl') || crashZone;
          crashout('Self-healed setupCrash with fallback');
          break;
        case 'crashChat':
          setupCrash();
          crashChat();
          crashout('Self-healed crashChat with retry');
          break;
        default:
          throw new Error('No healing strategy');
      }
    } catch (healError) {
      crashout(`Self-heal failed in ${funcName}:`, healError.message);
      showNotification(`Error on line ${healError.lineNumber || 'unknown'} - Unhealable`);
    }
  }

  // Trim chat messages
  function crashChat() {
    if (!isEnabled || !chatContainer) return;
    const now = Date.now();
    if (now - lastCrashTime < CHILL_VIBE) return;
    lastCrashTime = now;

    try {
      if (!bestCrashHook) {
        setupCrash();
        if (!bestCrashHook) return;
      }

      const jugs = Array.from(chatContainer.querySelectorAll(bestCrashHook));
      const totalJugs = jugs.length;
      crashout(`Snagged ${totalJugs}`);

      if (totalJugs > HEAVY_LOAD_THRESHOLD || (now - lastMutationCheck > 5000 && mutationCount > MUTATION_THRESHOLD)) {
        if (keepCrashed) {
          keepCrashed = false;
          chrome.storage.sync.set({ keepCrashed });
          crashout('Heavy load detected, disabled keepCrashed');
          showNotification('Heavy load detected - Stash disabled');
          updateGui();
        }
        mutationCount = 0;
        lastMutationCheck = now;
      }

      jugs.forEach(jug => {
        if (whitelist.some(cls => jug.matches(cls))) return;
        const isGrok = jug.classList.contains('items-start') || 
                      (jug.parentElement && jug.parentElement.classList.contains('items-start'));
        jug.style.willChange = 'background-color';
        jug.style.backgroundColor = isGrok ? `${grokColor}22` : `${userColor}22`;
      });

      if (totalJugs > KEEP_MESSAGES) {
        let crashCount = 0;
        const visibleJugs = jugs.filter(jug => !jug.classList.contains('hidden') && 
                                               !whitelist.some(cls => jug.matches(cls)));
        const toCrash = visibleJugs.slice(0, Math.max(0, visibleJugs.length - KEEP_MESSAGES));
        
        toCrash.forEach(jug => {
          const text = jug.textContent.trim();
          const jugId = hashJug(text);
          if (!crashedIds.has(jugId)) {
            const isGrok = jug.classList.contains('items-start') || 
                          (jug.parentElement && jug.parentElement.classList.contains('items-start'));
            if (keepCrashed) {
              crashedJugs.unshift({ text, element: jug.cloneNode(true), id: jugId, restored: false, isGrok });
              if (crashedJugs.length > STASH_CAP) crashedJugs.pop();
            }
            jug.classList.add('hidden');
            jug.parentNode.removeChild(jug);
            crashedIds.add(jugId);
            if (crashedIds.size > ID_CAP) crashedIds.clear();
            crashCount++;
            showNotification(`Deleted message: "${text.substring(0, 20)}..."`);
          }
        });

        if (crashCount > 0) {
          crashout(`Crashed ${crashCount}, kept ${KEEP_MESSAGES}`);
          showNotification(`Switched down ${crashCount} messages`);
          updateGui();
          const remaining = chatContainer.querySelectorAll(bestCrashHook).length;
          crashout(`Post-trim check: ${remaining} messages remain`);
        }
      }
    } catch (e) {
      crashout('Crash failed:', e.message);
      showNotification(`Error on line ${e.lineNumber || 'unknown'}`);
      selfHeal('crashChat', e);
    }
  }

  // Fast reply for cached messages
  function fastGrokReply(userText) {
    try {
      const cachedReply = replyCache[userText.trim()];
      if (cachedReply && chatContainer) {
        const jug = document.createElement('div');
        jug.className = 'message-row items-start hidden';
        jug.innerHTML = `<div class="message-bubble" style="background-color: ${grokColor}22">${cachedReply.substring(0, 50)}</div>`;
        chatContainer.appendChild(jug);
        setTimeout(() => {
          jug.classList.remove('hidden');
          jug.scrollIntoView({ behavior: 'smooth' });
          if (cachedReply.length > 50) jug.querySelector('.message-bubble').textContent = cachedReply;
          crashChat();
        }, 10);
      }
    } catch (e) {
      crashout('Fast reply failed:', e.message);
      showNotification(`Error on line ${e.lineNumber || 'unknown'}`);
    }
  }

  // Pre-trim on load
  function preTrim() {
    try {
      setupCrash();
      if (!bestCrashHook || !chatContainer) return;
      const jugs = Array.from(chatContainer.querySelectorAll(bestCrashHook));
      let crashCount = 0;
      jugs.forEach(jug => {
        if (!whitelist.some(cls => jug.matches(cls))) {
          const text = jug.textContent.trim();
          const jugId = hashJug(text);
          if (keepCrashed) {
            const isGrok = jug.classList.contains('items-start') || 
                          (jug.parentElement && jug.parentElement.classList.contains('items-start'));
            crashedJugs.unshift({ text, element: jug.cloneNode(true), id: jugId, restored: false, isGrok });
            if (crashedJugs.length > STASH_CAP) crashedJugs.pop();
          }
          jug.classList.add('hidden');
          jug.parentNode.removeChild(jug);
          crashedIds.add(jugId);
          crashCount++;
          showNotification(`Deleted message: "${text.substring(0, 20)}..."`);
        }
      });
      crashout(`Pre-nuked ${crashCount}`);
      if (crashCount > 0) showNotification(`Switched down ${crashCount} messages`);
      const firstJug = document.createElement('div');
      firstJug.className = 'message-row hidden';
      firstJug.innerHTML = `<div class="message-bubble">Chat start</div>`;
      chatContainer.appendChild(firstJug);
      setTimeout(() => firstJug.classList.remove('hidden'), 10);
      updateGui();
    } catch (e) {
      crashout('Pre-trim failed:', e.message);
      showNotification(`Error on line ${e.lineNumber || 'unknown'}`);
    }
  }

  // Setup GUI with drag, resize, and cleaner look
  function setupGui() {
    try {
      if (document.querySelector('.crashout-gui')) return;
      crashout('Setting up GUI');
      const gui = document.createElement('div');
      gui.className = 'crashout-gui';
      gui.style.cssText = `
        position: fixed; top: 10px; right: 10px; z-index: 1000; background: #000; 
        border: 2px solid #ff0000; border-radius: 8px; padding: 10px; 
        width: 250px; min-width: 250px; min-height: 150px; color: #ff0000; 
        font-family: 'Courier New', monospace; overflow: hidden; box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
      `;
      gui.innerHTML = `
        <button class="crashout-btn" style="background: #ff0000; color: #000; border: none; padding: 8px; font-size: 14px; cursor: move; width: 100%; border-radius: 4px; margin-bottom: 8px;">Stash</button>
        <div class="crashout_dropdown" style="display: none; flex-direction: column; gap: 8px; pointer-events: auto;">
          <button class="crashout-btn-toggle" style="background: ${isEnabled ? '#00ff00' : '#ff0000'}; color: #000; border: none; padding: 8px; font-size: 14px; width: 100%; border-radius: 4px;">${isEnabled ? 'On' : 'Off'}</button>
          <label style="font-size: 12px;"><input type="checkbox" id="keep-crashed" ${keepCrashed ? 'checked' : ''}> Keep Stashed</label>
          <button class="crashout-btn-copy" style="display: ${keepCrashed ? 'block' : 'none'}; background: #ff0000; color: #000; border: none; padding: 8px; font-size: 14px; width: 100%; border-radius: 4px;">Copy Log</button>
          <div id="crashed-list" style="max-height: 100px; overflow-y: auto; margin-top: 8px; font-size: 12px;"></div>
        </div>
        <div class="resize-handle" style="position: absolute; bottom: 0; right: 0; width: 12px; height: 12px; background: #ff0000; cursor: se-resize;"></div>
      `;
      document.body.appendChild(gui);
      crashout('GUI appended to body');
      updateGui();

      const btn = gui.querySelector('.crashout-btn');
      const dropdown = gui.querySelector('.crashout_dropdown');
      const toggleBtn = gui.querySelector('.crashout-btn-toggle');
      const keepCrashedCheck = gui.querySelector('#keep-crashed');
      const copyBtn = gui.querySelector('.crashout-btn-copy');
      const resizeHandle = gui.querySelector('.resize-handle');

      btn.addEventListener('click', () => {
        dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none';
        crashout('Dropdown toggled');
      });

      toggleBtn.addEventListener('click', () => {
        isEnabled = !isEnabled;
        toggleBtn.textContent = isEnabled ? 'On' : 'Off';
        toggleBtn.style.backgroundColor = isEnabled ? '#00ff00' : '#ff0000';
        chrome.storage.sync.set({ isEnabled });
        if (isEnabled) startCrashWatch();
        else if (crashWatcher) crashWatcher.disconnect();
        crashout(`Toggled to ${isEnabled ? 'On' : 'Off'}`);
      });

      keepCrashedCheck.addEventListener('change', () => {
        keepCrashed = keepCrashedCheck.checked;
        chrome.storage.sync.set({ keepCrashed });
        copyBtn.style.display = keepCrashed ? 'block' : 'none';
        updateGui();
        crashout(`Keep crashed set to ${keepCrashed}`);
      });

      copyBtn.addEventListener('click', () => {
        const allMessages = crashedJugs.map(jug => jug.text).join('\n');
        navigator.clipboard.writeText(allMessages).then(() => crashout('Chat log copied'));
      });

      let isDragging = false;
      let offsetX, offsetY;
      btn.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - gui.offsetLeft;
        offsetY = e.clientY - gui.offsetTop;
      });
      document.addEventListener('mousemove', (e) => {
        if (isDragging) {
          gui.style.left = `${e.clientX - offsetX}px`;
          gui.style.top = `${e.clientY - offsetY}px`;
          gui.style.right = 'auto';
        }
      });
      document.addEventListener('mouseup', () => isDragging = false);

      let isResizing = false;
      resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        offsetX = e.clientX;
        offsetY = e.clientY;
      });
      document.addEventListener('mousemove', (e) => {
        if (isResizing) {
          const newWidth = Math.max(250, gui.offsetWidth + (e.clientX - offsetX)); // Min width
          const newHeight = Math.max(150, gui.offsetHeight + (e.clientY - offsetY)); // Min height
          gui.style.width = `${newWidth}px`;
          gui.style.height = `${newHeight}px`;
          offsetX = e.clientX;
          offsetY = e.clientY;
        }
      });
      document.addEventListener('mouseup', () => isResizing = false);
    } catch (e) {
      crashout('GUI setup failed:', e.message);
      showNotification(`Error on line ${e.lineNumber || 'unknown'}`);
    }
  }

  // Update GUI with restore/wipe
  function updateGui() {
    try {
      const list = document.querySelector('#crashed-list');
      if (!list) return;
      list.innerHTML = crashedJugs.map((jug, i) => `
        <div class="crashout-msg" data-index="${i}" style="background: ${jug.isGrok ? `${grokColor}22` : `${userColor}22`}; padding: 4px; margin: 2px 0; display: flex; justify-content: space-between; border-radius: 4px;">
          <span style="font-size: 12px;">${jug.text.substring(0, 30)}${jug.text.length > 30 ? '...' : ''}</span>
          <div>
            <button class="crashout-btn-restore" data-index="${i}" style="background: #ff0000; color: #000; border: none; padding: 4px 8px; font-size: 12px; pointer-events: auto; border-radius: 2px;">R</button>
            <button class="crashout-btn-delete" data-index="${i}" style="background: #ff0000; color: #000; border: none; padding: 4px 8px; font-size: 12px; pointer-events: auto; border-radius: 2px;">W</button>
          </div>
        </div>
      `).join('');

      list.querySelectorAll('.crashout-btn-restore').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.dataset.index);
          const jug = crashedJugs[index];
          if (jug && jug.element && chatContainer) {
            chatContainer.appendChild(jug.element);
            jug.element.classList.remove('hidden');
            jug.restored = true;
            crashedJugs.splice(index, 1);
            crashedIds.delete(jug.id);
            updateGui();
            crashChat();
            crashout(`Restored message: ${jug.text.substring(0, 20)}...`);
          }
        });
      });

      list.querySelectorAll('.crashout-btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.dataset.index);
          crashedJugs.splice(index, 1);
          updateGui();
          crashout('Wiped message from stash');
        });
      });
    } catch (e) {
      crashout('GUI update failed:', e.message);
      showNotification(`Error on line ${e.lineNumber || 'unknown'}`);
    }
  }

  // Matrix-themed background
  function setupMatrixBackground() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
      z-index: -1; pointer-events: none; opacity: 0.2;
    `;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const fontSize = 16;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    function draw() {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px 'Courier New', monospace`;

      drops.forEach((y, i) => {
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        ctx.fillStyle = Math.random() > 0.5 ? '#ff0000' : '#000'; // Red or black
        ctx.fillText(text, i * fontSize, y * fontSize);
        if (y * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
    }

    setInterval(draw, 50);
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  }

  // Start watching for chat changes
  function startCrashWatch() {
    try {
      if (!document.body || !isEnabled) {
        if (crashWatcher) crashWatcher.disconnect();
        setTimeout(startCrashWatch, 10);
        return;
      }
      if (!chatContainer) {
        setupCrash();
        if (!chatContainer) {
          setTimeout(startCrashWatch, 10);
          return;
        }
      }
      if (!crashWatcher) {
        crashWatcher = new MutationObserver((mutations) => {
          mutationCount += mutations.length;
          const userInput = document.querySelector('#chat-input:not(.message-bubble)');
          if (userInput && userInput.textContent.trim()) fastGrokReply(userInput.textContent);
          crashChat();
        });
        crashWatcher.observe(chatContainer, { childList: true, subtree: true });
        crashout('Mutation observer started');
      }
    } catch (e) {
      crashout('Watcher failed:', e.message);
      showNotification(`Error on line ${e.lineNumber || 'unknown'}`);
    }
  }

  // Optimize loading with defer and lazy-load
  function optimizeLoad() {
    try {
      const scripts = document.querySelectorAll('script:not([data-chat-critical])');
      scripts.forEach(script => {
        script.defer = true;
        script.async = true;
      });
      const images = document.querySelectorAll('img');
      images.forEach(img => img.loading = 'lazy');
      crashout('Optimized load with defer and lazy');
    } catch (e) {
      crashout('Load optimization failed:', e.message);
      showNotification(`Error on line ${e.lineNumber || 'unknown'}`);
    }
  }

  // Initialize with robust fallback
  function initialize() {
    try {
      crashout('Initializing Chat Trimmer');
      chrome.storage.sync.get(['isEnabled', 'keepCrashed'], (data) => {
        try {
          isEnabled = data.isEnabled !== undefined ? data.isEnabled : true;
          keepCrashed = data.keepCrashed !== undefined ? data.keepCrashed : true;
          crashout('Storage retrieved:', { isEnabled, keepCrashed });
          setupGui();
          setupMatrixBackground();
          preTrim();
          startCrashWatch();
          optimizeLoad();
        } catch (e) {
          crashout('Inner init failed:', e.message);
          showNotification(`Error on line ${e.lineNumber || 'unknown'}`);
        }
      });
    } catch (e) {
      crashout('Outer init failed:', e.message);
      showNotification(`Error on line ${e.lineNumber || 'unknown'}`);
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initialize();
  } else {
    document.addEventListener('DOMContentLoaded', initialize);
    setTimeout(() => {
      if (!document.querySelector('.crashout-gui')) {
        crashout('DOMContentLoaded missed, forcing init');
        initialize();
      }
    }, 1000);
  }
})();