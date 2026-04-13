// Gloria Chrome Extension — Popup UI

const API_BASE = 'http://localhost:3000'; // Change to live domain in production
const el = id => document.getElementById(id);
const content = () => document.getElementById('content');

const CMS_LABELS = {
  wordpress: 'WordPress', shopify: 'Shopify', wix: 'Wix',
  squarespace: 'Squarespace', 'google-sites': 'Google Sites', unknown: 'Custom website',
};

let tabId, siteUrl, siteCms, widgetKey;

// ── Boot ──────────────────────────────────────────────────────────────────────
(async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab.id;
  siteUrl = tab.url;

  // Check if already set up for this site
  const state = await msg('getState');
  if (state.widgetKey && state.siteUrl === siteUrl) {
    widgetKey = state.widgetKey;
    siteCms = state.cms;
    if (state.installed) return renderSuccess(state.bizName);
    return renderInstall(state.widgetKey, state.cms, state.bizName);
  }

  // Detect CMS via content script
  let detected;
  try {
    detected = await chrome.tabs.sendMessage(tabId, { action: 'detect' });
  } catch {
    detected = { cms: 'unknown', url: siteUrl, title: tab.title, canAutoInstall: false };
  }

  siteCms = detected.cms;
  renderDetected(detected);
})();

// ── Screens ───────────────────────────────────────────────────────────────────

function renderDetected(detected) {
  const domain = hostname(detected.url);
  const cmsLabel = CMS_LABELS[detected.cms] || 'Website';

  content().innerHTML = `
    <div class="site-pill">
      <div class="dot"></div>
      <div class="domain">${esc(domain)}</div>
      <div class="cms-tag">${esc(cmsLabel)}</div>
    </div>
    <div class="status">
      Gloria will scan this page, learn about your business, and be ready to answer customer questions.
      <br><br>
      <strong>Free 14-day trial — no card required.</strong>
    </div>
    <button class="btn btn-primary" id="scan-btn">Scan My Website →</button>
    <button class="btn btn-secondary" id="reset-btn">Not my site?</button>
  `;

  el('scan-btn').onclick = () => startScan(detected);
  el('reset-btn').onclick = () => {
    msg('clearState').then(() => renderDetected(detected));
  };
}

async function startScan(detected) {
  el('scan-btn').disabled = true;
  el('scan-btn').textContent = 'Scanning…';

  renderScanning();

  // Try to get JS-rendered content from the page (supplements server scrape)
  let scraped = { text: '', meta: {} };
  try {
    scraped = await Promise.race([
      chrome.tabs.sendMessage(tabId, { action: 'scrape' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);
  } catch {
    // Content script unavailable or timed out — server will scrape directly
    scraped = { text: '', meta: { title: detected.title, ogSiteName: '' } };
  }

  // Register with backend — server fetches the URL itself so this always works
  let result;
  try {
    result = await msg('register', {
      url: detected.url,
      cms: detected.cms,
      scrapedContent: scraped.text || '',
      scrapedMeta: scraped.meta || {},
    });
  } catch (err) {
    return renderError('Could not reach the Gloria server. Make sure it\'s running on localhost:3000.');
  }

  if (result?.error) return renderError(result.error);
  if (!result?.widgetKey) return renderError('Unexpected response from server. Please try again.');

  widgetKey = result.widgetKey;
  renderInstall(result.widgetKey, detected.cms, result.bizName || scraped.meta?.ogSiteName || scraped.meta?.title || hostname(detected.url));
}

function renderScanning() {
  content().innerHTML = `
    <div class="status"><strong>Reading your website…</strong></div>
    <div class="progress-wrap">
      <div class="progress-label"><span id="progress-text">Extracting content</span><span id="progress-pct">0%</span></div>
      <div class="progress-bar"><div class="progress-fill" id="progress-fill" style="width:0%"></div></div>
    </div>
  `;
  animateProgress();
}

function animateProgress() {
  const steps = [
    [20, 'Reading your homepage'],
    [45, 'Extracting services & prices'],
    [70, 'Building knowledge model'],
    [90, 'Finalising Gloria\'s training'],
    [100, 'Almost ready…'],
  ];
  let i = 0;
  const tick = () => {
    if (i >= steps.length) return;
    const [pct, label] = steps[i++];
    const fill = document.getElementById('progress-fill');
    const text = document.getElementById('progress-text');
    const pctEl = document.getElementById('progress-pct');
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = label;
    if (pctEl) pctEl.textContent = pct + '%';
    setTimeout(tick, 600 + Math.random() * 400);
  };
  setTimeout(tick, 300);
}

function renderInstall(key, cms, bizName) {
  const auto = cms === 'wordpress' || cms === 'shopify';
  const snippet = `<script src="${API_BASE}/widget.js?key=${key}" async defer></script>`;

  if (auto) {
    content().innerHTML = `
      <div class="status">
        Gloria knows about <strong>${esc(bizName)}</strong> and is ready to go live.
      </div>
      <ul class="result-list">
        <li class="highlight">${esc(bizName)}</li>
        <li>Knowledge model built</li>
        <li>${CMS_LABELS[cms]} auto-install available</li>
      </ul>
      <div id="error-area"></div>
      <button class="btn btn-primary" id="install-btn">Install on My Website →</button>
      <button class="btn btn-secondary" id="manual-btn">Install manually instead</button>
    `;
    el('install-btn').onclick = () => doAutoInstall(key, cms);
    el('manual-btn').onclick = () => renderManual(key, cms);
  } else {
    renderManual(key, cms, bizName);
  }
}

async function doAutoInstall(key, cms) {
  el('install-btn').disabled = true;
  el('install-btn').textContent = 'Installing…';
  el('error-area').innerHTML = '';

  let result;
  try {
    if (cms === 'wordpress') {
      result = await installWordPress(key);
    } else if (cms === 'shopify') {
      result = await installShopify(key);
    }
  } catch (err) {
    result = { success: false, reason: err.message };
  }

  if (result?.success) {
    await chrome.storage.local.set({ installed: true });
    renderSuccess(await getStoredBizName());
  } else {
    const errArea = el('error-area');
    if (errArea) errArea.innerHTML = `<div class="error-msg">${esc(result?.reason || 'Auto-install failed.')}</div>`;
    el('install-btn').disabled = false;
    el('install-btn').textContent = 'Retry Auto-Install';
  }
}

function renderManual(key, cms, bizName) {
  const snippet = `<script src="${API_BASE}/widget.js?key=${key}" async defer></script>`;
  const instructions = getInstructions(cms);

  content().innerHTML = `
    <div class="status">
      Paste this snippet into your website's <strong>${instructions.where}</strong>:
    </div>
    <div class="snippet-box" id="snippet">${esc(snippet)}</div>
    <button class="btn btn-primary" id="copy-btn">Copy Snippet</button>
    ${instructions.steps.length ? `
    <ul class="steps" style="margin-top:14px">
      ${instructions.steps.map((s, i) => `<li><div class="num">${i+1}</div><span>${esc(s)}</span></li>`).join('')}
    </ul>` : ''}
    ${instructions.link ? `<a class="help-link" href="${instructions.link}" target="_blank">View detailed guide →</a>` : ''}
    <button class="btn btn-secondary" id="done-btn" style="margin-top:12px">I've pasted it — Mark as Done</button>
  `;

  el('copy-btn').onclick = () => {
    navigator.clipboard.writeText(snippet);
    el('copy-btn').textContent = 'Copied!';
    setTimeout(() => { if (el('copy-btn')) el('copy-btn').textContent = 'Copy Snippet'; }, 2000);
  };
  el('done-btn').onclick = async () => {
    await chrome.storage.local.set({ installed: true });
    renderSuccess(bizName || await getStoredBizName());
  };
}

function renderSuccess(bizName) {
  content().innerHTML = `
    <div class="success-icon">✓</div>
    <div class="success-title">Gloria is live</div>
    <div class="success-sub">${esc(bizName || 'Your website')} now has an AI receptionist.</div>
    <button class="btn btn-primary" id="admin-btn">Open Admin Panel →</button>
    <button class="btn btn-secondary" id="reset-btn">Set up another site</button>
  `;
  el('admin-btn').onclick = () => chrome.tabs.create({ url: API_BASE });
  el('reset-btn').onclick = () => msg('clearState').then(init);
}

function renderError(message) {
  content().innerHTML = `
    <div class="error-msg">${esc(message)}</div>
    <button class="btn btn-secondary" id="back-btn">← Try Again</button>
  `;
  el('back-btn').onclick = init;
}

// ── WordPress / Shopify install (inline, no import needed in MV3 popup) ───────

async function installWordPress(widgetKey) {
  const snippetSrc = `${API_BASE}/widget.js?key=${widgetKey}`;
  const snippet = `<script src="${snippetSrc}" async defer><\/script>`;

  // Get nonce
  let nonce = null;
  try {
    const nonceResp = await fetch(`${siteUrl.replace(/\/[^/]*$/, '')}/wp-admin/admin-ajax.php?action=rest-nonce`, {
      credentials: 'include',
    });
    if (nonceResp.ok) nonce = (await nonceResp.text()).trim();
  } catch {}

  if (!nonce) {
    try {
      const homeResp = await fetch(siteUrl, { credentials: 'include' });
      const html = await homeResp.text();
      const match = html.match(/"nonce":"([^"]+)"/);
      if (match) nonce = match[1];
    } catch {}
  }

  if (!nonce) return { success: false, reason: 'Could not obtain WordPress nonce. Are you logged in as admin?' };

  const base = new URL(siteUrl).origin;
  const settingsResp = await fetch(`${base}/wp-json/wp/v2/settings`, {
    credentials: 'include',
    headers: { 'X-WP-Nonce': nonce },
  });

  if (!settingsResp.ok) return { success: false, reason: 'WordPress REST API not accessible. Please install manually.' };

  const settings = await settingsResp.json();
  if ((settings.footer_scripts || '').includes(widgetKey)) return { success: true, alreadyInstalled: true };

  const updateResp = await fetch(`${base}/wp-json/wp/v2/settings`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
    body: JSON.stringify({ footer_scripts: (settings.footer_scripts || '') + '\n' + snippet }),
  });

  return updateResp.ok ? { success: true } : { success: false, reason: 'WordPress update failed. Please install manually.' };
}

async function installShopify(widgetKey) {
  const snippetSrc = `${API_BASE}/widget.js?key=${widgetKey}`;
  const shopDomain = new URL(siteUrl).hostname;

  const listResp = await fetch(`https://${shopDomain}/admin/api/2024-01/script_tags.json`, {
    credentials: 'include',
  });
  if (!listResp.ok) return { success: false, reason: 'Shopify admin not accessible. Are you logged in as the store owner?' };

  const { script_tags } = await listResp.json();
  if (script_tags?.some(t => t.src?.includes(widgetKey))) return { success: true, alreadyInstalled: true };

  const createResp = await fetch(`https://${shopDomain}/admin/api/2024-01/script_tags.json`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script_tag: { event: 'onload', src: snippetSrc } }),
  });

  return createResp.ok ? { success: true } : { success: false, reason: 'Shopify install failed. Please install manually.' };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInstructions(cms) {
  const map = {
    wix: {
      where: 'Custom Code section',
      steps: ['Open Wix Editor', 'Click Add → Embed Code → Embed HTML', 'Paste the snippet, click Apply, then Publish'],
      link: 'https://support.wix.com/en/article/embedding-custom-code-on-your-site',
    },
    squarespace: {
      where: 'Footer (Code Injection)',
      steps: ['Go to Settings → Advanced → Code Injection', 'Paste into the Footer field', 'Click Save'],
      link: 'https://support.squarespace.com/hc/en-us/articles/205815908',
    },
    'google-sites': {
      where: 'Embed block',
      steps: ['Edit your Google Site', 'Insert → Embed, paste snippet', 'Publish the site'],
      link: null,
    },
  };
  return map[cms] || { where: 'page footer (before </body>)', steps: [], link: null };
}

function msg(action, payload) {
  return chrome.runtime.sendMessage({ action, payload });
}

function hostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function getStoredBizName() {
  const state = await msg('getState');
  return state?.bizName || '';
}
