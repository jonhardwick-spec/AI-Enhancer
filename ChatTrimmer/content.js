(function() {
  const KEEP_MESSAGES = 5;
  const CHILL_VIBE = 50;
  const STASH_CAP = 50;
  const ID_CAP = 100;
  const HEAVY_LOAD_THRESHOLD = 100;
  const MUTATION_THRESHOLD = 50;

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
  let isHeavyLoadWarning = false;
  let isMenuOpen = false;
  let isTurboMode = false;
  let matrixCanvas = null;
  let originalStyles = new Map();

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

  // Show notification banner
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

  // Suppress network errors
  function suppressNetworkErrors() {
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      return originalFetch(url, options).catch(err => {
        if (url.includes('/api/log_metric') || url.includes('/rest/app-chat/conversations') || url.includes('/api/statsig/log_event')) {
          crashout(`Suppressed network error for ${url}: ${err.message}`);
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
        }
        throw err;
      });
    };
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
          isHeavyLoadWarning = true;
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

  // Setup GUI with hover circle and expandable menu
  function setupGui() {
    try {
      if (document.querySelector('.crashout-circle')) return;
      crashout('Setting up GUI circle');
      const circle = document.createElement('div');
      circle.className = 'crashout-circle';
      circle.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; width: 50px; height: 50px; 
        background: #ff0000; border-radius: 50%; z-index: 1000; cursor: pointer; 
        transition: all 0.3s ease; box-shadow: 0 0 15px rgba(255, 0, 0, 0.7);
      `;
      circle.innerHTML = `
        <div class="crashout-menu" style="display: none; position: absolute; bottom: 60px; right: 0; 
          width: 250px; background: #000; border: 2px solid #ff0000; border-radius: 8px; 
          padding: 10px; color: #ff0000; font-family: 'Courier New', monospace; 
          box-shadow: 0 0 10px rgba(255, 0, 0, 0.5); transform-origin: bottom right; 
          transition: all 0.3s ease;">
          <button class="crashout-btn" style="background: #ff0000; color: #000; border: none; padding: 8px; font-size: 14px; width: 100%; border-radius: 4px; margin-bottom: 8px;">Chat Cleaner</button>
          <div class="crashout_dropdown" style="flex-direction: column; gap: 8px; pointer-events: auto;">
            <button class="crashout-btn-toggle" style="background: ${isEnabled ? '#00ff00' : '#ff0000'}; color: #000; border: none; padding: 8px; font-size: 14px; width: 100%; border-radius: 4px;">${isEnabled ? 'On' : 'Off'}</button>
            <label style="font-size: 12px;"><input type="checkbox" id="keep-crashed" ${keepCrashed ? 'checked' : ''}> Keep Stashed</label>
            <label style="font-size: 12px;"><input type="checkbox" id="turbo-mode"> Turbo Mode</label>
            <button class="crashout-btn-copy" style="display: ${keepCrashed && !isHeavyLoadWarning ? 'block' : 'none'}; background: #ff0000; color: #000; border: none; padding: 8px; font-size: 14px; width: 100%; border-radius: 4px;">Copy Log</button>
            <div id="crashed-list" style="max-height: 70px; overflow-y: auto; margin-top: 8px; font-size: 12px;"></div>
            <div id="heavy-load-warning" style="display: ${isHeavyLoadWarning ? 'block' : 'none'}; color: #ff0000; background: #000; padding: 4px; font-size: 10px; text-align: center; border-top: 1px solid #ff0000; word-wrap: break-word;">Keep Stashed chats was automatically disabled due to high volume</div>
          </div>
        </div>
      `;
      document.body.appendChild(circle);

      const menu = circle.querySelector('.crashout-menu');
      const btn = menu.querySelector('.crashout-btn');
      const toggleBtn = menu.querySelector('.crashout-btn-toggle');
      const keepCrashedCheck = menu.querySelector('#keep-crashed');
      const turboModeCheck = menu.querySelector('#turbo-mode');
      const copyBtn = menu.querySelector('.crashout-btn-copy');

      circle.addEventListener('mouseover', () => {
        if (!isMenuOpen) circle.style.transform = 'scale(1.2)';
      });
      circle.addEventListener('mouseout', () => {
        if (!isMenuOpen) circle.style.transform = 'scale(1)';
      });

      circle.addEventListener('click', () => {
        isMenuOpen = !isMenuOpen;
        if (isMenuOpen) {
          circle.style.width = '60px';
          circle.style.height = '60px';
          circle.style.background = '#000';
          circle.style.boxShadow = '0 0 20px rgba(255, 0, 0, 1)';
          menu.style.display = 'block';
          menu.style.transform = 'scale(1)';
          applyMatrixBackground();
          if (isTurboMode) applyTurboMode();
          else applyRedBlackTheme();
        } else {
          circle.style.width = '50px';
          circle.style.height = '50px';
          circle.style.background = '#ff0000';
          circle.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.7)';
          menu.style.transform = 'scale(0)';
          setTimeout(() => menu.style.display = 'none', 300);
          removeMatrixBackground();
          if (isTurboMode) removeTurboMode();
          else removeRedBlackTheme();
        }
        updateGui();
        crashout(`Menu ${isMenuOpen ? 'opened' : 'closed'}`);
      });

      btn.addEventListener('click', () => crashChat());
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
        isHeavyLoadWarning = !keepCrashed && isHeavyLoadWarning;
        chrome.storage.sync.set({ keepCrashed });
        copyBtn.style.display = keepCrashed && !isHeavyLoadWarning ? 'block' : 'none';
        updateGui();
        crashout(`Keep crashed set to ${keepCrashed}`);
      });

      turboModeCheck.addEventListener('change', () => {
        isTurboMode = turboModeCheck.checked;
        if (isMenuOpen) {
          if (isTurboMode) {
            removeRedBlackTheme();
            applyTurboMode();
          } else {
            removeTurboMode();
            applyRedBlackTheme();
          }
        }
        crashout(`Turbo Mode ${isTurboMode ? 'enabled' : 'disabled'}`);
      });

      copyBtn.addEventListener('click', () => {
        const allMessages = crashedJugs.map(jug => jug.text).join('\n');
        navigator.clipboard.writeText(allMessages).then(() => crashout('Chat log copied'));
      });
    } catch (e) {
      crashout('GUI setup failed:', e.message);
      showNotification(`Error on line ${e.lineNumber || 'unknown'}`);
    }
  }

  // Update GUI with restore/wipe
  function updateGui() {
    try {
      const list = document.querySelector('#crashed-list');
      const warning = document.querySelector('#heavy-load-warning');
      const copyBtn = document.querySelector('.crashout-btn-copy');
      if (!list || !warning || !copyBtn) return;
      list.innerHTML = crashedJugs.map((jug, i) => `
        <div class="crashout-msg" data-index="${i}" style="background: ${jug.isGrok ? `${grokColor}22` : `${userColor}22`}; padding: 4px; margin: 2px 0; display: flex; justify-content: space-between; border-radius: 4px;">
          <span style="font-size: 12px;">${jug.text.substring(0, 30)}${jug.text.length > 30 ? '...' : ''}</span>
          <div>
            <button class="crashout-btn-restore" data-index="${i}" style="background: #ff0000; color: #000; border: none; padding: 4px 8px; font-size: 12px; pointer-events: auto; border-radius: 2px;">R</button>
            <button class="crashout-btn-delete" data-index="${i}" style="background: #ff0000; color: #000; border: none; padding: 4px 8px; font-size: 12px; pointer-events: auto; border-radius: 2px;">W</button>
          </div>
        </div>
      `).join('');
      warning.style.display = isHeavyLoadWarning ? 'block' : 'none';
      copyBtn.style.display = keepCrashed && !isHeavyLoadWarning ? 'block' : 'none';

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

  // Apply Matrix background
  function applyMatrixBackground() {
    if (matrixCanvas) return;
    matrixCanvas = document.createElement('canvas');
    matrixCanvas.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
      z-index: -1; pointer-events: none; opacity: 0.2;
    `;
    document.body.appendChild(matrixCanvas);
    const ctx = matrixCanvas.getContext('2d');
    matrixCanvas.width = window.innerWidth;
    matrixCanvas.height = window.innerHeight;

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const fontSize = 16;
    const columns = matrixCanvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    function draw() {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
      ctx.font = `${fontSize}px 'Courier New', monospace`;

      drops.forEach((y, i) => {
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        ctx.fillStyle = Math.random() > 0.5 ? '#ff0000' : '#000';
        ctx.fillText(text, i * fontSize, y * fontSize);
        if (y * fontSize > matrixCanvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
    }

    const interval = setInterval(draw, 50);
    window.addEventListener('resize', () => {
      matrixCanvas.width = window.innerWidth;
      matrixCanvas.height = window.innerHeight;
    });
    matrixCanvas.dataset.interval = interval;
  }

  // Remove Matrix background
  function removeMatrixBackground() {
    if (matrixCanvas) {
      clearInterval(matrixCanvas.dataset.interval);
      matrixCanvas.remove();
      matrixCanvas = null;
    }
  }

  // Apply red and black theme (scoped)
  function applyRedBlackTheme() {
    const exclusions = ['crashout-circle', 'crashout-menu', 'message-row', 'message-bubble', 'max-w-3xl', 'btn', 'input'];
    document.body.style.backgroundColor = '#000';
    document.body.style.color = '#ff0000';
    const elements = document.querySelectorAll('body *:not(.crashout-circle):not(.crashout-menu)');
    elements.forEach(el => {
      const shouldExclude = exclusions.some(cls => el.classList.contains(cls));
      if (!shouldExclude) {
        originalStyles.set(el, {
          color: el.style.color,
          backgroundColor: el.style.backgroundColor,
          borderColor: el.style.borderColor
        });
        el.style.color = '#ff0000';
        if (el.tagName === 'A') el.style.color = '#ff5555';
        if (el.style.backgroundColor && !el.style.backgroundColor.includes('rgb')) {
          el.style.backgroundColor = '#1a1a1a';
        }
        if (el.style.borderColor) el.style.borderColor = '#ff0000';
      }
    });
    const style = document.createElement('style');
    style.id = 'red-black-theme';
    style.textContent = `
      ::selection { background: #ff0000; color: #000; }
      input:not(#keep-crashed):not(#turbo-mode), textarea { background: #1a1a1a; color: #ff0000; border: 1px solid #ff0000; }
      button:not(.crashout-btn):not(.crashout-btn-toggle):not(.crashout-btn-copy):not(.crashout-btn-restore):not(.crashout-btn-delete) {
        background: #ff0000; color: #000; border: 1px solid #ff0000; }
    `;
    document.head.appendChild(style);
  }

  // Remove red and black theme
  function removeRedBlackTheme() {
    const style = document.getElementById('red-black-theme');
    if (style) style.remove();
    document.body.style.backgroundColor = '';
    document.body.style.color = '';
    originalStyles.forEach((styles, el) => {
      el.style.color = styles.color;
      el.style.backgroundColor = styles.backgroundColor;
      el.style.borderColor = styles.borderColor;
    });
    originalStyles.clear();
  }

  // Apply Turbo Mode (strip to basic HTML)
  function applyTurboMode() {
    crashout('Applying Turbo Mode - stripping site');
    document.body.style.backgroundColor = '#000';
    document.body.style.color = '#ff0000';
    const elements = document.querySelectorAll('body > *:not(.crashout-circle):not(.max-w-3xl):not(canvas)');
    elements.forEach(el => {
      if (!el.classList.contains('crashout-circle') && !el.classList.contains('max-w-3xl')) {
        originalStyles.set(el, {
          display: el.style.display,
          innerHTML: el.innerHTML
        });
        el.style.display = 'none';
      }
    });
    const scripts = document.querySelectorAll('script:not([data-chat-critical])');
    scripts.forEach(script => script.remove());
    const styles = document.querySelectorAll('link[rel="stylesheet"], style:not(#red-black-theme)');
    styles.forEach(style => style.remove());
    const turboStyle = document.createElement('style');
    turboStyle.id = 'turbo-mode';
    turboStyle.textContent = `
      .max-w-3xl { background: #000; color: #ff0000; }
      .message-row, .message-bubble { color: #ff0000; }
      ::selection { background: #ff0000; color: #000; }
    `;
    document.head.appendChild(turboStyle);
    showNotification('Turbo Mode ON - Site stripped for speed!');
  }

  // Remove Turbo Mode
  function removeTurboMode() {
    crashout('Removing Turbo Mode');
    const turboStyle = document.getElementById('turbo-mode');
    if (turboStyle) turboStyle.remove();
    document.body.style.backgroundColor = '';
    document.body.style.color = '';
    originalStyles.forEach((styles, el) => {
      el.style.display = styles.display;
      el.innerHTML = styles.innerHTML;
    });
    originalStyles.clear();
    showNotification('Turbo Mode OFF - Site restored');
  }

  // Optimize loading
  function optimizeLoad() {
    try {
      const scripts = document.querySelectorAll('script:not([data-chat-critical])');
      scripts.forEach(script => {
        script.defer = true;
        script.async = true;
        script.setAttribute('importance', 'low');
      });

      const images = document.querySelectorAll('img');
      images.forEach(img => {
        img.loading = 'lazy';
        img.decoding = 'async';
        img.setAttribute('importance', 'low');
      });

      const styles = document.querySelectorAll('link[rel="stylesheet"]');
      styles.forEach(style => {
        if (!style.href.includes('critical')) {
          style.media = 'print';
          style.onload = () => style.media = 'all';
        }
      });

      const preconnect = document.createElement('link');
      preconnect.rel = 'preconnect';
      preconnect.href = 'https://grok.com';
      document.head.appendChild(preconnect);

      crashout('Optimized load with defer, lazy, and preconnect');
    } catch (e) {
      crashout('Load optimization failed:', e.message);
      showNotification(`Error on line ${e.lineNumber || 'unknown'}`);
    }
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
        crashWatcher.observe(chatContainer, { childList: true, subtree: true, attributes: false });
        crashout('Mutation observer started');
      }
    } catch (e) {
      crashout('Watcher failed:', e.message);
      showNotification(`Error on line ${e.lineNumber || 'unknown'}`);
    }
  }

  // Initialize
  function initialize() {
    try {
      crashout('Initializing Chat Trimmer');
      suppressNetworkErrors();
      chrome.storage.sync.get(['isEnabled', 'keepCrashed'], (data) => {
        try {
          isEnabled = data.isEnabled !== undefined ? data.isEnabled : true;
          keepCrashed = data.keepCrashed !== undefined ? data.keepCrashed : true;
          crashout('Storage retrieved:', { isEnabled, keepCrashed });
          setupGui();
          preTrim();
          optimizeLoad();
          startCrashWatch();
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
      if (!document.querySelector('.crashout-circle')) {
        crashout('DOMContentLoaded missed, forcing init');
        initialize();
      }
    }, 1000);
  }
})();