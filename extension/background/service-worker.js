// Gloria Chrome Extension — Background Service Worker
// Handles API calls and persists state across popup open/close.

const API_BASE = 'http://localhost:3000'; // Change to https://your-domain.com in production

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {

  if (msg.action === 'register') {
    handleRegister(msg.payload).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (msg.action === 'getState') {
    chrome.storage.local.get(['widgetKey', 'siteUrl', 'cms', 'bizName', 'installed'], sendResponse);
    return true;
  }

  if (msg.action === 'clearState') {
    chrome.storage.local.clear(() => sendResponse({ ok: true }));
    return true;
  }

});

async function handleRegister({ url, cms, scrapedContent, scrapedMeta }) {
  const resp = await fetch(`${API_BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, cms, scrapedContent, scrapedMeta }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(err || 'Registration failed');
  }

  const data = await resp.json();

  // Persist for this site
  await chrome.storage.local.set({
    widgetKey: data.widgetKey,
    siteUrl: url,
    cms,
    bizName: data.bizName || scrapedMeta?.ogSiteName || scrapedMeta?.title || url,
    installed: false,
  });

  return data;
}
