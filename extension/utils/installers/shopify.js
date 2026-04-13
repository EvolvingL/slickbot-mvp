// Shopify auto-installer
// Uses the ScriptTag API available to logged-in Shopify store owners.

export async function installOnShopify(shopDomain, widgetKey) {
  const snippetSrc = `${getAPIBase()}/widget.js?key=${widgetKey}`;

  // Check for existing script tags to avoid duplicates
  const listResp = await fetch(`https://${shopDomain}/admin/api/2024-01/script_tags.json`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!listResp.ok) return { success: false, reason: 'Shopify admin API not accessible. Are you logged in as the store owner?' };

  const { script_tags } = await listResp.json();
  const alreadyInstalled = script_tags?.some(t => t.src?.includes(widgetKey));
  if (alreadyInstalled) return { success: true, alreadyInstalled: true };

  // Create new script tag
  const createResp = await fetch(`https://${shopDomain}/admin/api/2024-01/script_tags.json`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      script_tag: {
        event: 'onload',
        src: snippetSrc,
      },
    }),
  });

  if (createResp.ok) return { success: true };
  return { success: false, reason: 'Shopify script tag creation failed. Install manually.' };
}

function getAPIBase() {
  return 'http://localhost:3000';
}
