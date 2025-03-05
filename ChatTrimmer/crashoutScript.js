(function() {
  const KEEP_TEN = 10;
  const CHILL_VIBE = 500;
  const STASH_CAP = 50;

  const hoodSpots = {
    'grok.com': ['.grok-jug', '[class*="message"]', '.message'],
    'chat.openai.com': ['div[data-testid^="jug"]', '.jug'],
    'deepseek.com': ['.chat-jug', '.jug'],
    'qwen.ai': ['.qwen-jug', '.chat-rush']
  };

  const wildHooks = [
    '.jug', '.chat-jug', '.msg', '.jug-item', '.chat-rush',
    '.grok-msg', '[data-jug-id]', '.chat-blast', '.grok-crash-item',
    '[role="log"] > div', '[role="crashitem"]', '.text-crash',
    '.convo-jug', 'div[class^="css-"]', '.blast', '.text-block',
    '.message', '[class*="message"]', 'div.text', '.chat-item'
  ];

  const crashPads = [
    'grok-crash', 'chat-pad', 'grok-convo', 'convo-view',
    'chat-box', 'jug-list', 'grok-ui', 'chatgpt-crash', 'deepseek-crash'
  ];

  const aiNames = {
    'grok.com': 'Grok',
    'chat.openai.com': 'ChatGPT',
    'deepseek.com': 'DeepSeek',
    'qwen.ai': 'Qwen'
  };

  const crashout = (...args) => console.log('[Crash Trimmer] Skrrt:', ...args);

  let crashedJugs = [];
  let fullChatLog = [];
  let crashedIds = new Set();

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
      const hood = window.location.hostname;
      const hooks = hoodSpots[hood] || wildHooks;
      let topHook = null;
      let maxCrash = 0;
      hooks.forEach(hook => {
        const jugs = crashRoot.querySelectorAll(hook);
        let realCrash = 0;
        jugs.forEach(jug => {
          const text = jug.textContent.trim();
          if (text && text.length > 5 && text.length < 1000 && !jug.matches('button, input, .btn')) {
            realCrash++;
          }
        });
        if (realCrash > maxCrash) {
          maxCrash = realCrash;
          topHook = hook;
        }
      });
      return { hook: topHook, crashCount: maxCrash };
    } catch (e) {
      crashout('Hook snatch crashed out:', e.message);
      return { hook: null, crashCount: 0 };
    }
  }

  let crashZone = document;
  let bestCrashHook = null;
  let crashHits = 0;
  let lastCrashTime = 0;

  function setupCrash() {
    try {
      crashPads.forEach(pad => {
        const hideout = document.querySelector(pad);
        if (hideout && hideout.shadowRoot) {
          const { hook, crashCount } = snatchBestHook(hideout.shadowRoot);
          if (crashCount > crashHits) {
            crashHits = crashCount;
            bestCrashHook = hook;
            crashZone = hideout.shadowRoot;
            crashout(`Locked in <${pad}> shadow crash`);
          }
        }
      });

      if (!bestCrashHook || crashHits === 0) {
        const { hook, crashCount } = snatchBestHook(document);
        bestCrashHook = hook;
        crashHits = crashCount;
        crashZone = document;
      }

      if (bestCrashHook) {
        crashout(`Crash hook set: "${bestCrashHook}" with ${crashHits} jugs`);
      }
    } catch (e) {
      crashout('Crash setup fucked:', e.message);
    }
  }

  function showCrashCount(count) {
    const hood = window.location.hostname;
    const aiName = aiNames[hood] || 'Unknown AI';
    let banner = document.querySelector('.crashout-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'crashout-banner';
      document.body.appendChild(banner);
    }
    banner.textContent = `Switched down ${count} messages from ${aiName}`;
    setTimeout(() => banner.classList.add('fade-out'), 2000);
    setTimeout(() => banner.remove(), 2500);
  }

  function saveAndOpenChatLog() {
    const hood = window.location.hostname;
    const aiName = aiNames[hood] || 'UnknownAI';
    const chatText = fullChatLog.join('\n---\n');
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url: url,
      filename: `${aiName}_fullChatLog.txt`,
      saveAs: false
    }, (downloadId) => {
      chrome.downloads.search({ id: downloadId }, (results) => {
        if (results && results[0] && results[0].filename) {
          const filePath = 'file://' + results[0].filename;
          window.open(filePath, '_blank');
          URL.revokeObjectURL(url);
        }
      });
    });
  }

  function setupGui() {
    const gui = document.createElement('div');
    gui.className = 'crashout-gui';
    gui.innerHTML = `
      <button class="crashout-btn">Crash Stash</button>
      <div class="crashout_dropdown">
        <button class="crashout-btn-grab">Grab Chat</button>
        <button class="crashout-btn-color">Change Color</button>
        <div class="crashout-color-menu">
          <div class="crashout-color-wheel">
            <input type="range" min="0" max="360" value="0" id="color-wheel">
            <label><input type="checkbox" id="rainbow-check"> Rainbow</label>
          </div>
          <div class="crashout-rgb-slider">
            <label>R: <input type="range" min="0" max="255" value="255" id="r-slider"></label>
            <label>G: <input type="range" min="0" max="255" value="0" id="g-slider"></label>
            <label>B: <input type="range" min="0" max="255" value="0" id="b-slider"></label>
          </div>
        </div>
        <div id="crashed-list"></div>
      </div>
    `;
    document.body.appendChild(gui);

    const btn = gui.querySelector('.crashout-btn');
    const dropdown = gui.querySelector('.crashout_dropdown');
    const grabBtn = gui.querySelector('.crashout-btn-grab');
    const colorBtn = gui.querySelector('.crashout-btn-color');
    const colorMenu = gui.querySelector('.crashout-color-menu');
    const colorWheel = gui.querySelector('#color-wheel');
    const rainbowCheck = gui.querySelector('#rainbow-check');
    const rSlider = gui.querySelector('#r-slider');
    const gSlider = gui.querySelector('#g-slider');
    const bSlider = gui.querySelector('#b-slider');

    btn.addEventListener('click', () => {
      dropdown.classList.toggle('show');
      colorMenu.classList.remove('show');
      adjustDropdownPosition();
    });
    grabBtn.addEventListener('click', saveAndOpenChatLog);
    colorBtn.addEventListener('click', () => {
      colorMenu.classList.toggle('show');
      adjustColorMenuPosition();
    });

    function updateColors() {
      const rainbow = rainbowCheck.checked;
      if (rainbow) {
        [btn, dropdown, colorMenu, grabBtn, colorBtn, ...dropdown.querySelectorAll('.crashout-btn-restore, .crashout-btn-delete')]
          .forEach(el => {
            el.classList.add('rainbow');
            el.style.color = '';
            el.style.borderColor = '';
            el.style.background = '';
          });
      } else {
        const hue = colorWheel.value;
        const r = rSlider.value;
        const g = gSlider.value;
        const b = bSlider.value;
        const color = hue === '0' ? `rgb(${r}, ${g}, ${b})` : `hsl(${hue}, 100%, 50%)`;
        [btn, dropdown, colorMenu, grabBtn, colorBtn, ...dropdown.querySelectorAll('.crashout-btn-restore, .crashout-btn-delete')]
          .forEach(el => {
            el.classList.remove('rainbow');
            el.style.color = el.classList.contains('crashout-btn') ? color : '#fff';
            el.style.borderColor = color;
            el.style.background = el.classList.contains('crashout-btn') ? '#000' : `${color}22`;
          });
      }
    }

    colorWheel.addEventListener('input', updateColors);
    rainbowCheck.addEventListener('change', updateColors);
    rSlider.addEventListener('input', updateColors);
    gSlider.addEventListener('input', updateColors);
    bSlider.addEventListener('input', updateColors);

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

        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - gui.offsetWidth));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - gui.offsetHeight));

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
      const windowWidth = window.innerWidth;
      if (guiLeft + 350 > windowWidth) {
        dropdown.classList.add('left');
      } else {
        dropdown.classList.remove('left');
      }
    }

    function adjustColorMenuPosition() {
      const guiLeft = gui.offsetLeft;
      const windowWidth = window.innerWidth;
      if (guiLeft + 250 > windowWidth) {
        colorMenu.classList.add('left');
      } else {
        colorMenu.classList.remove('left');
      }
    }

    updateGui();
    updateColors();
  }

  function updateGui() {
    const list = document.querySelector('#crashed-list');
    if (!list) return;
    list.innerHTML = crashedJugs.map((jug, i) => `
      <div class="crashout-msg" data-index="${i}">
        ${jug.text.substring(0, 50)}${jug.text.length > 50 ? '...' : ''}
        <button class="crashout-btn-restore" data-index="${i}">Back</button>
        <button class="crashout-btn-delete" data-index="${i}">Wipe</button>
      </div>
    `).join('');

    list.querySelectorAll('.crashout-btn-restore').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        const jug = crashedJugs[index];
        if (jug && jug.element) {
          jug.element.style.display = '';
          crashedJugs.splice(index, 1);
          crashedIds.delete(jug.id);
          updateGui();
          crashChat();
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

  function crashChat() {
    const now = Date.now();
    if (now - lastCrashTime < CHILL_VIBE) return;
    lastCrashTime = now;

    try {
      if (!bestCrashHook) {
        setupCrash();
        if (!bestCrashHook) {
          crashout('No crash hook yet, hold up');
          return;
        }
      }

      const jugs = crashZone.querySelectorAll(bestCrashHook);
      const totalJugs = jugs.length;
      crashout(`Snagged ${totalJugs} jugs with "${bestCrashHook}"`);

      jugs.forEach(jug => {
        const text = jug.textContent.trim();
        if (text && !fullChatLog.includes(text)) {
          fullChatLog.push(text);
        }
      });

      if (totalJugs > KEEP_TEN) {
        let crashCount = 0;
        for (let i = 0; i < totalJugs - KEEP_TEN; i++) {
          const jug = jugs[i];
          if (jug && typeof jug.style !== 'undefined') {
            const text = jug.textContent.trim();
            const jugId = hashJug(text);
            if (!crashedIds.has(jugId) && jug.style.display !== 'none') {
              const peek = text.substring(0, 20) || '[No text]';
              crashout(`Crashin’ jug ${i + 1}: "${peek}..."`);
              crashedJugs.unshift({ text, element: jug, id: jugId });
              if (crashedJugs.length > STASH_CAP) crashedJugs.pop();
              jug.style.display = 'none';
              crashedIds.add(jugId);
              crashCount++;
            }
          }
        }
        for (let i = totalJugs - KEEP_TEN; i < totalJugs; i++) {
          const jug = jugs[i];
          if (jug && typeof jug.style !== 'undefined' && jug.style.display === 'none') {
            jug.style.display = '';
          }
        }
        if (crashCount > 0) {
          crashout(`Crashed to last ${KEEP_TEN} of ${totalJugs}, gang`);
          showCrashCount(crashCount);
          updateGui();
        }
      }
    } catch (e) {
      crashout('Chat crash fucked up:', e.message);
    }
  }

  try {
    document.addEventListener('DOMContentLoaded', () => {
      crashout('Page lit, crashin’ now');
      setupGui();
      crashChat();
    });

    const crashWatcher = new MutationObserver(() => {
      crashout('Shit moved, crashin’ again');
      crashChat();
    });

    function startCrashWatch() {
      if (document.body) {
        crashWatcher.observe(document.body, { childList: true, subtree: true });
        crashout('Crash watch on, fam');
      } else {
        setTimeout(startCrashWatch, 10);
      }
    }
    startCrashWatch();
  } catch (e) {
    crashout('Crash kickoff fucked:', e.message);
  }
})();