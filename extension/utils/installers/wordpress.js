// WordPress auto-installer
// Uses the logged-in owner's existing session cookies to inject the widget via WP REST API.

export async function installOnWordPress(siteUrl, widgetKey) {
  const snippetSrc = `${getAPIBase()}/widget.js?key=${widgetKey}`;
  const snippet = `<script src="${snippetSrc}" async defer></script>`;

  // Step 1: Get WP nonce from admin-ajax
  let nonce = null;
  try {
    const nonceResp = await fetch(`${siteUrl}/wp-admin/admin-ajax.php?action=rest-nonce`, {
      credentials: 'include',
    });
    if (nonceResp.ok) nonce = (await nonceResp.text()).trim();
  } catch (_) {}

  if (!nonce) {
    // Fallback: parse nonce from inline wp-json data that WP embeds for logged-in users
    try {
      const homeResp = await fetch(siteUrl, { credentials: 'include' });
      const html = await homeResp.text();
      const match = html.match(/"nonce":"([^"]+)"/);
      if (match) nonce = match[1];
    } catch (_) {}
  }

  if (!nonce) return { success: false, reason: 'Could not obtain WP nonce — are you logged into WordPress?' };

  // Step 2: Read existing custom_css / footer_scripts setting
  const settingsResp = await fetch(`${siteUrl}/wp-json/wp/v2/settings`, {
    credentials: 'include',
    headers: { 'X-WP-Nonce': nonce },
  });

  if (!settingsResp.ok) return { success: false, reason: 'WP REST API not accessible. Install manually.' };

  const settings = await settingsResp.json();

  // Append to footer_scripts if available, else custom_html widget
  const existing = settings.footer_scripts || '';
  if (existing.includes(widgetKey)) return { success: true, alreadyInstalled: true };

  const updateResp = await fetch(`${siteUrl}/wp-json/wp/v2/settings`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-WP-Nonce': nonce,
    },
    body: JSON.stringify({ footer_scripts: existing + '\n' + snippet }),
  });

  if (updateResp.ok) return { success: true };

  // Last resort: return snippet for manual paste
  return { success: false, reason: 'Auto-install blocked. Please paste the snippet manually.', snippet };
}

function getAPIBase() {
  // In production, replace with your live domain
  return 'http://localhost:3000';
}
