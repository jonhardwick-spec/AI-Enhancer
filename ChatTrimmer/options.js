document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const keepCrashedCheck = document.getElementById('keepCrashed');

  chrome.storage.sync.get(['isEnabled', 'keepCrashed'], (data) => {
    const isEnabled = data.isEnabled !== undefined ? data.isEnabled : true;
    toggleBtn.textContent = isEnabled ? 'On' : 'Off';
    toggleBtn.className = isEnabled ? 'on' : 'off';
    keepCrashedCheck.checked = data.keepCrashed || false;
  });

  toggleBtn.addEventListener('click', () => {
    const newState = toggleBtn.textContent === 'On' ? false : true;
    toggleBtn.textContent = newState ? 'On' : 'Off';
    toggleBtn.className = newState ? 'on' : 'off';
    chrome.storage.sync.set({ isEnabled: newState });
  });

  keepCrashedCheck.addEventListener('change', () => {
    chrome.storage.sync.set({ keepCrashed: keepCrashedCheck.checked });
  });
});