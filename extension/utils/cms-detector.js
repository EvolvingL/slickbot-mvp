// CMS detection helpers — shared utility
// Used by content.js (and potentially popup.js for display labels)

export function cmsLabel(cms) {
  const labels = {
    wordpress: 'WordPress',
    shopify: 'Shopify',
    wix: 'Wix',
    squarespace: 'Squarespace',
    'google-sites': 'Google Sites',
    unknown: 'Custom website',
  };
  return labels[cms] || 'Website';
}

export function installMethod(cms) {
  if (cms === 'wordpress') return 'auto';
  if (cms === 'shopify') return 'auto';
  return 'manual'; // wix, squarespace, unknown
}
