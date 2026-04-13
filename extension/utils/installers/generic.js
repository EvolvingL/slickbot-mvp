// Generic fallback installer — returns the snippet for manual paste
// Used for Wix, Squarespace, Google Sites, and any unknown CMS.

export function getManualSnippet(widgetKey) {
  const src = `${getAPIBase()}/widget.js?key=${widgetKey}`;
  return `<script src="${src}" async defer></script>`;
}

export function getManualInstructions(cms) {
  const instructions = {
    wix: {
      label: 'Wix',
      steps: [
        'Open your Wix Editor',
        'Click Add → Embed Code → Embed HTML',
        'Paste the snippet into the HTML box',
        'Click Apply, then Publish',
      ],
      link: 'https://support.wix.com/en/article/embedding-custom-code-on-your-site',
    },
    squarespace: {
      label: 'Squarespace',
      steps: [
        'Go to Settings → Advanced → Code Injection',
        'Paste the snippet into the Footer field',
        'Click Save',
      ],
      link: 'https://support.squarespace.com/hc/en-us/articles/205815908',
    },
    'google-sites': {
      label: 'Google Sites',
      steps: [
        'Open your Google Site in edit mode',
        'Click Insert → Embed',
        'Paste the snippet and click Insert',
        'Publish your site',
      ],
      link: 'https://support.google.com/sites/answer/90569',
    },
  };

  return instructions[cms] || {
    label: 'Your website',
    steps: [
      'Open your website\'s HTML template or footer file',
      'Paste the snippet just before the closing </body> tag',
      'Save and redeploy your site',
    ],
    link: null,
  };
}

function getAPIBase() {
  return 'http://localhost:3000';
}
