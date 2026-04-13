// Gloria Chrome Extension — Content Script
// Injected into every page. Supplements server-side scraping with JS-rendered content.

function detectCMS() {
  const html = document.documentElement.innerHTML;
  const meta = document.querySelector('meta[name="generator"]')?.content || '';
  if (html.includes('wp-content') || html.includes('wp-json') || meta.toLowerCase().includes('wordpress')) return 'wordpress';
  if (window.Shopify || html.includes('cdn.shopify.com')) return 'shopify';
  if (html.includes('static.wixstatic.com') || html.includes('wix-bolt')) return 'wix';
  if (html.includes('squarespace.com') || meta.toLowerCase().includes('squarespace')) return 'squarespace';
  if (html.includes('sites.google.com')) return 'google-sites';
  return 'unknown';
}

function scrapePageContent() {
  const results = [];

  // 1. Structured data (most reliable source)
  document.querySelectorAll('script[type="application/ld+json"]').forEach(el => {
    try {
      const data = JSON.parse(el.textContent);
      results.push('SCHEMA: ' + JSON.stringify(data).slice(0, 2000));
    } catch {}
  });

  // 2. Meta tags
  const getMeta = (sel) => document.querySelector(sel)?.getAttribute('content') || '';
  const ogName    = getMeta('meta[property="og:site_name"]');
  const ogDesc    = getMeta('meta[property="og:description"]') || getMeta('meta[name="description"]');
  const title     = document.title;
  if (ogName || ogDesc || title) {
    results.push(`META: name="${ogName || title}" description="${ogDesc}"`);
  }

  // 3. Walk ALL text nodes including shadow DOM
  function extractText(root) {
    const chunks = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const tag = node.parentElement?.tagName?.toLowerCase();
        if (['script','style','noscript','svg','path','head'].includes(tag)) return NodeFilter.FILTER_REJECT;
        const t = node.textContent.trim();
        return t.length > 3 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    let n;
    while ((n = walker.nextNode())) chunks.push(n.textContent.trim());
    return chunks.join(' ');
  }

  // Main document
  let bodyText = extractText(document.body);

  // Shadow roots (used by Wix, Webflow, custom elements)
  document.querySelectorAll('*').forEach(el => {
    if (el.shadowRoot) {
      try { bodyText += ' ' + extractText(el.shadowRoot); } catch {}
    }
  });

  // 4. Extract contact info directly from HTML (href="tel:", href="mailto:")
  const phones = [...new Set(
    [...document.querySelectorAll('a[href^="tel:"]')]
      .map(a => a.href.replace('tel:', '').trim())
      .concat((bodyText.match(/(\+44|0)[\d\s\-]{9,14}/g) || []))
  )].slice(0, 5);

  const emails = [...new Set(
    [...document.querySelectorAll('a[href^="mailto:"]')]
      .map(a => a.href.replace('mailto:', '').split('?')[0].trim())
      .concat((bodyText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || []))
      .filter(e => !e.includes('example') && !e.includes('sentry'))
  )].slice(0, 5);

  // 5. Opening hours (common patterns)
  const hoursMatches = bodyText.match(/(?:mon|tue|wed|thu|fri|sat|sun)[a-z\s\-–—]*(?:\d{1,2}(?::\d{2})?(?:am|pm)?)/gi) || [];

  results.push('BODY TEXT:\n' + bodyText.slice(0, 10000));

  return {
    text: results.join('\n\n').slice(0, 15000),
    meta: {
      title,
      description: ogDesc,
      ogSiteName: ogName,
      phone: phones.join(', '),
      email: emails.join(', '),
      hours: hoursMatches.slice(0, 5).join(', '),
    }
  };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'detect') {
    const cms = detectCMS();
    sendResponse({ cms, url: location.href, title: document.title, canAutoInstall: cms === 'wordpress' || cms === 'shopify' });
    return true;
  }
  if (msg.action === 'scrape') {
    try {
      sendResponse(scrapePageContent());
    } catch (e) {
      sendResponse({ text: document.body?.innerText?.slice(0, 5000) || '', meta: { title: document.title } });
    }
    return true;
  }
});
