chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.storage.sync.set({ isEnabled: true, keepCrashed: true }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Chat Trimmer Background] Storage set failed:', chrome.runtime.lastError);
      } else {
        console.log('[Chat Trimmer Background] Defaults set: isEnabled=true, keepCrashed=true');
      }
    });
  } catch (e) {
    console.error('[Chat Trimmer Background] Install failed:', e.message);
  }
});