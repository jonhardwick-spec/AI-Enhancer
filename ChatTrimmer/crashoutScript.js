(function() {
  const KEEP_TWO = 2;     // Live cap
  const PRE_KEEP = 0;     // Pre-trim to 0
  const CHILL_VIBE = 25;  // Max throttle
  const STASH_CAP = 50;
  const ID_CAP = 100;

  const hoodSpots = {
    'grok.com': ['.max-w-3xl .message-row'], // Hyper-specific
    'chat.openai.com': ['div[data-testid^="jug"]'],
    'deepseek.com': ['.chat-jug'],
    'qwen.ai': ['.qwen-jug']
  };

  const wildHooks = ['.message'];

  const crashPads = ['grok-crash', 'chat-box'];

  const aiNames = { 'grok.com': 'Grok' };

  const crashout = (...args) => console.log('[Crash Trimmer] Skrrt:', ...args);

  let crashedJugs = [];
  let crashedIds = new Set();
  let isEnabled = true;   // Green “On” = crashin’
  let keepCrashed = false;
  let crashWatcher = null;
  let lastCrashTime = 0;
  let grokColor = 'hsl(0, 100%, 50%)'; // Red
  let userColor = 'hsl(0, 0%, 0%)';   // Black

  // Local reply cache
  const replyCache = {
    'Ran script': 'Yo, fam, Ran script hittin’—we fast now!'
  };

  function hashJug(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString();
  }

  function snatchBestHook(crashRoot = document) {
    try {
      const hooks = hoodSpots['grok.com'] || wildHooks;
      let topHook = hooks[0]; // Force lean selector
      const jugs = crashRoot.querySelectorAll(topHook);
      return { hook: topHook, crashCount: jugs.length };
    } catch (e) {
      crashout('Hook snatch fucked:', e.message);
      return { hook: null, crashCount: 0 };
    }
  }

  let crashZone = document;
  let bestCrashHook = null;

  function setupCrash() {
    try {
      const { hook, crashCount } = snatchBestHook(document);
      bestCrashHook = hook;
      crashZone = document;
      if (bestCrashHook) crashout(`Hook: "${bestCrashHook}", ${crashCount} jugs`);
    } catch (e) {
      crashout('Setup fucked:', e.message);
    }
  }

  function showCrashCount(count) {
    let banner = document.querySelector('.crashout-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'crashout-banner';
      document.body.appendChild(banner);
    }
    banner.textContent = `Nuked ${count}`;
    setTimeout(() => banner.classList.add('fade-out'), 300);
    setTimeout(() => banner.remove(), 350);
  }

  function crashChat() {
    if (!isEnabled) return;
    const now = Date.now();
    if (now - lastCrashTime < CHILL_VIBE) return;
    lastCrashTime = now;

    try {
      if (!bestCrashHook) {
        setupCrash();
        if (!bestCrashHook) return;
      }

      const jugs = Array.from(crashZone.querySelectorAll(bestCrashHook));
      const totalJugs = jugs.length;
      crashout(`Snagged ${totalJugs}`);

      jugs.forEach(jug => {
        const isGrok = jug.classList.contains('items-start') || 
                       (jug.parentElement && jug.parentElement.classList.contains('items-start'));
        const isUser = jug.classList.contains('items-end') || 
                       (jug.parentElement && jug.parentElement.classList.contains('items-end'));
        jug.style.willChange = 'background-color';
        jug.style.backgroundColor = isGrok ? `${grokColor}22` : isUser ? `${userColor}22` : '';
      });

      if (totalJugs > KEEP_TWO) {
        let crashCount = 0;
        const visibleJugs = jugs.filter(jug => !jug.classList.contains('hidden'));
        const unrestoredJugs = visibleJugs.filter(jug => {
          const jugId = hashJug(jug.textContent.trim());
          return !crashedJugs.some(cj => cj.id === jugId && cj.restored);
        });

        const toCrash = unrestoredJugs.slice(0, Math.max(0, unrestoredJugs.length - KEEP_TWO));
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
            jug.remove();
            crashedIds.add(jugId);
            if (crashedIds.size > ID_CAP) crashedIds.clear(); // Cap IDs
            crashCount++;
          }
        });

        if (crashCount > 0) {
          crashout(`Crashed ${crashCount}, kept ${KEEP_TWO}`);
          showCrashCount(crashCount);
          updateGui();
        }
      }
    } catch (e) {
      crashout('Crash fucked:', e.message);
    }
  }

  // Fast Grok reply
  function fastGrokReply(userText) {
    const cachedReply = replyCache[userText.trim()];
    if (cachedReply) {
      const jug = document.createElement('div');
      jug.className = 'message-row items-start hidden';
      jug.innerHTML = `<div class="message-bubble" style="background-color: ${grokColor}22">${cachedReply.substring(0, 50)}</div>`;
      const container = crashZone.querySelector('.max-w-3xl') || crashZone;
      container.appendChild(jug);
      setTimeout(() => {
        jug.classList.remove('hidden');
        jug.scrollIntoView({ behavior: 'smooth' });
        if (cachedReply.length > 50) {
          jug.querySelector('.message-bubble').textContent = cachedReply; // Stream rest
        }
      }, 10);
      crashChat(); // Trim after
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'message-row items-start hidden';
      placeholder.innerHTML = `<div class="message-bubble" style="background-color: ${grokColor}22">Grok typin’…</div>`;
      const container = crashZone.querySelector('.max-w-3xl') || crashZone;
      container.appendChild(placeholder);
      setTimeout(() => placeholder.classList.remove('hidden'), 10);
    }
  }

  // Pre-trim to 0, hide container
  function preTrim() {
    try {
      setupCrash();
      if (!bestCrashHook) return;
      const chatContainer = document.querySelector('.overflow-y-auto');
      if (chatContainer) chatContainer.style.visibility = 'hidden';
      const jugs = Array.from(crashZone.querySelectorAll(bestCrashHook));
      jugs.forEach(jug => {
        jug.classList.add('hidden');
        jug.remove();
        crashedIds.add(hashJug(jug.textContent.trim()));
      });
      crashout(`Pre-nuked all, loadin’ 0`);
      setTimeout(() => {
        if (chatContainer) chatContainer.style.visibility = 'visible';
        const firstJug = document.createElement('div');
        firstJug.className = 'message-row hidden';
        firstJug.innerHTML = `<div class="message-bubble">Chat start</div>`;
        crashZone.appendChild(firstJug);
        setTimeout(() => firstJug.classList.remove('hidden'), 10);
      }, 50); // Lazy-add 1
    } catch (e) {
      crashout('Pre-trim fucked:', e.message);
    }
  }

  function setupGui() {
    const gui = document.createElement('div');
    gui.className = 'crashout-gui';
    gui.innerHTML = `
      <button class="crashout-btn">S</button>
      <div class="crashout_dropdown">
        <button class="crashout-btn-toggle">On</button>
        <button class="crashout-btn-color">C</button>
        <label><input type="checkbox" id="keep-crashed"> S</label>
        <div class="crashout-color-menu">
          <div class="crashout-color-wheel">
            <label>G: <input type="range" min="0" max="360" value="0" id="grok-color-wheel"></label>
            <label>U: <input type="range" min="0" max="360" value="0" id="user-color-wheel"></label>
            <label><input type="checkbox" id="rainbow-check"> R</label>
          </div>
          <div class="crashout-rgb-slider">
            <label>GR: <input type="range" min="0" max="255" value="255" id="grok-r-slider"></label>
            <label>GG: <input type="range" min="0" max="255" value="0" id="grok-g-slider"></label>
            <label>GB: <input type="range" min="0" max="255" value="0" id="grok-b-slider"></label>
            <label>UR: <input type="range" min="0" max="255" value="0" id="user-r-slider"></label>
            <label>UG: <input type="range" min="0" max="255" value="0" id="user-g-slider"></label>
            <label>UB: <input type="range" min="0" max="255" value="0" id="user-b-slider"></label>
          </div>
        </div>
        <div id="crashed-list"></div>
      </div>
    `;
    document.body.appendChild(gui);

    const btn = gui.querySelector('.crashout-btn');
    const dropdown = gui.querySelector('.crashout_dropdown');
    const toggleBtn = gui.querySelector('.crashout-btn-toggle');
    const colorBtn = gui.querySelector('.crashout-btn-color');
    const keepCrashedCheck = gui.querySelector('#keep-crashed');
    const colorMenu = gui.querySelector('.crashout-color-menu');
    const grokColorWheel = gui.querySelector('#grok-color-wheel');
    const userColorWheel = gui.querySelector('#user-color-wheel');
    const rainbowCheck = gui.querySelector('#rainbow-check');
    const grokRSlider = gui.querySelector('#grok-r-slider');
    const grokGSlider = gui.querySelector('#grok-g-slider');
    const grokBSlider = gui.querySelector('#grok-b-slider');
    const userRSlider = gui.querySelector('#user-r-slider');
    const userGSlider = gui.querySelector('#user-g-slider');
    const userBSlider = gui.querySelector('#user-b-slider');

    btn.addEventListener('click', () => {
      dropdown.classList.toggle('show');
      colorMenu.classList.remove('show');
      adjustDropdownPosition();
    });
    toggleBtn.addEventListener('click', () => {
      isEnabled = !isEnabled;
      toggleBtn.textContent = isEnabled ? 'On' : 'Off';
      toggleBtn.style.backgroundColor = isEnabled ? '#00ff00' : '#ff0000';
      if (isEnabled) {
        startCrashWatch();
        crashChat();
        crashout('Crashin’ on');
      } else {
        if (crashWatcher) crashWatcher.disconnect();
        crashout('Crashin’ off');
        const jugs = Array.from(crashZone.querySelectorAll(bestCrashHook));
        jugs.forEach(jug => {
          jug.classList.remove('hidden');
          jug.style.display = '';
        });
      }
    });
    keepCrashedCheck.addEventListener('change', () => {
      keepCrashed = keepCrashedCheck.checked;
      if (!keepCrashed) {
        crashedJugs = [];
        crashedIds.clear();
        updateGui();
        crashout('Wiped stash');
      } else {
        crashout('Stashin’');
      }
    });
    colorBtn.addEventListener('click', () => {
      colorMenu.classList.toggle('show');
      adjustColorMenuPosition();
    });

    function updateColors() {
      const rainbow = rainbowCheck.checked;
      if (rainbow) {
        [btn, dropdown, colorMenu, toggleBtn, colorBtn, ...dropdown.querySelectorAll('.crashout-btn-restore, .crashout-btn-delete')]
          .forEach(el => {
            el.classList.add('rainbow');
            el.style.color = '';
            el.style.borderColor = '';
            if (el !== toggleBtn) el.style.background = '';
            else el.style.background = isEnabled ? '#00ff00' : '#ff0000';
          });
        grokColor = 'hsl(0, 100%, 50%)';
        userColor = 'hsl(0, 0%, 0%)';
      } else {
        const grokHue = grokColorWheel.value;
        const grokR = grokRSlider.value;
        const grokG = grokGSlider.value;
        const grokB = grokBSlider.value;
        const userHue = userColorWheel.value;
        const userR = userRSlider.value;
        const userG = userGSlider.value;
        const userB = userBSlider.value;
        grokColor = grokHue === '0' ? `rgb(${grokR}, ${grokG}, ${grokB})` : `hsl(${grokHue}, 100%, 50%)`;
        userColor = userHue === '0' ? `rgb(${userR}, ${userG}, ${userB})` : `hsl(${userHue}, 100%, 50%)`;
        [btn, dropdown, colorMenu, toggleBtn, colorBtn, ...dropdown.querySelectorAll('.crashout-btn-restore, .crashout-btn-delete')]
          .forEach(el => {
            el.classList.remove('rainbow');
            el.style.color = el.classList.contains('crashout-btn') ? grokColor : '#fff';
            el.style.borderColor = grokColor;
            if (el !== toggleBtn) el.style.background = el.classList.contains('crashout-btn') ? '#000' : `${grokColor}22`;
            else el.style.background = isEnabled ? '#00ff00' : '#ff0000';
          });
      }
      crashChat();
    }

    grokColorWheel.addEventListener('input', updateColors);
    userColorWheel.addEventListener('input', updateColors);
    rainbowCheck.addEventListener('change', updateColors);
    grokRSlider.addEventListener('input', updateColors);
    grokGSlider.addEventListener('input', updateColors);
    grokBSlider.addEventListener('input', updateColors);
    userRSlider.addEventListener('input', updateColors);
    userGSlider.addEventListener('input', updateColors);
    userBSlider.addEventListener('input', updateColors);

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    btn.addEventListener('mousedown', (e) => {
      isDragging = true;
      offsetX = e.clientX - gui.offsetLeft;
      offsetY = e.clientY - gui.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;
        const maxLeft = window.innerWidth - gui.offsetWidth;
        const maxTop = window.innerHeight - gui.offsetHeight - 350;
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
        gui.style.left = `${newLeft}px`;
        gui.style.top = `${newTop}px`;
        gui.style.right = 'auto';
        adjustDropdownPosition();
        adjustColorMenuPosition();
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    function adjustDropdownPosition() {
      const guiLeft = gui.offsetLeft;
      if (guiLeft + 350 > window.innerWidth) dropdown.classList.add('left');
      else dropdown.classList.remove('left');
    }

    function adjustColorMenuPosition() {
      const guiLeft = gui.offsetLeft;
      if (guiLeft + 250 > window.innerWidth) colorMenu.classList.add('left');
      else colorMenu.classList.remove('left');
    }

    updateGui();
    updateColors();
  }

  function updateGui() {
    const list = document.querySelector('#crashed-list');
    if (!list) return;
    list.innerHTML = crashedJugs.map((jug, i) => `
      <div class="crashout-msg" data-index="${i}" style="background: ${jug.isGrok ? `${grokColor}22` : `${userColor}22`}">
        ${jug.text.substring(0, 50)}${jug.text.length > 50 ? '...' : ''}
        <button class="crashout-btn-restore" data-index="${i}">R</button>
        <button class="crashout-btn-delete" data-index="${i}">W</button>
      </div>
    `).join('');

    list.querySelectorAll('.crashout-btn-restore').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        const jug = crashedJugs[index];
        if (jug && jug.element) {
          const container = crashZone.querySelector('.max-w-3xl') || crashZone;
          container.appendChild(jug.element);
          jug.element.style.display = '';
          jug.element.style.backgroundColor = jug.isGrok ? `${grokColor}22` : `${userColor}22`;
          jug.element.scrollIntoView({ behavior: 'smooth' });
          jug.restored = true;
          crashedJugs.splice(index, 1);
          crashedIds.delete(jug.id);
          updateGui();
          crashChat();
          crashout(`Restored ${jug.isGrok ? 'Grok' : 'User'}`);
        }
      });
    });

    list.querySelectorAll('.crashout-btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        crashedJugs.splice(index, 1);
        updateGui();
      });
    });
  }

  // Early DOM intercept
  const earlyWatcher = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length) {
        preTrim();
        earlyWatcher.disconnect();
      }
    });
  });
  earlyWatcher.observe(document.documentElement, { childList: true, subtree: true });

  crashWatcher = new MutationObserver(() => {
    const userInput = document.querySelector('.bg-input:not(.message-bubble):not(.message-row)');
    if (userInput && userInput.textContent.trim()) fastGrokReply(userInput.textContent);
    crashChat();
  });

  function startCrashWatch() {
    if (document.body && isEnabled) {
      const chatContainer = crashZone.querySelector('.max-w-3xl') || document.body;
      crashWatcher.observe(chatContainer, { childList: true, subtree: true });
      crashout('Watch on');
    } else if (!isEnabled) {
      if (crashWatcher) crashWatcher.disconnect();
    } else {
      setTimeout(startCrashWatch, 10);
    }
  }

  preTrim();
  document.addEventListener('DOMContentLoaded', () => {
    setupGui();
    crashChat();
    startCrashWatch();
    setTimeout(() => document.querySelectorAll(':not(.max-w-3xl):not(.crashout-gui)').forEach(el => el.style.display = 'none'), 0); // Defer non-chat
    setTimeout(() => document.querySelectorAll(':not(.max-w-3xl):not(.crashout-gui)').forEach(el => el.style.display = ''), 50);
  });

  if (document.readyState === 'complete') {
    setupGui();
    crashChat();
    startCrashWatch();
  }
})();