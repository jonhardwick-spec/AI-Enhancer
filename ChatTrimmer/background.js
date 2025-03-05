chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ isEnabled: true, keepCrashed: false });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getState') {
    chrome.storage.sync.get(['isEnabled', 'keepCrashed'], (data) => {
      sendResponse(data);
    });
    return true;
  } else if (request.action === 'setState') {
    chrome.storage.sync.set(request.state, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});