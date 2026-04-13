/* Gloria Widget — loaded on customer websites via <script> tag
 * %%WIDGET_KEY%% is replaced server-side when served via /widget.js?key=xxx
 * < 4KB gzipped, async, zero impact on host page performance
 */
(function(w, d, key) {
  if (!key || key === '%%WIDGET_KEY%%') return; // key not substituted yet
  if (w.__gloria) return; // already loaded
  w.__gloria = true;

  var CHAT_URL = '%%BASE_URL%%/chat?key=' + key;

  // Inject styles
  var style = d.createElement('style');
  style.textContent = [
    '#gloria-bubble{position:fixed;bottom:20px;right:20px;z-index:2147483647;',
    'width:56px;height:56px;border-radius:50%;',
    'background:linear-gradient(135deg,#c9a96e,#a07840);',
    'cursor:pointer;box-shadow:0 4px 24px rgba(201,169,110,.45);',
    'display:flex;align-items:center;justify-content:center;',
    'border:none;outline:none;transition:transform .2s,box-shadow .2s;}',
    '#gloria-bubble:hover{transform:scale(1.08);box-shadow:0 6px 32px rgba(201,169,110,.6);}',
    '#gloria-bubble svg{pointer-events:none;}',
    '#gloria-frame{position:fixed;bottom:88px;right:20px;z-index:2147483646;',
    'width:380px;height:560px;border:none;border-radius:16px;',
    'box-shadow:0 24px 64px rgba(0,0,0,.25);',
    'display:none;opacity:0;transition:opacity .2s,transform .2s;transform:translateY(8px);}',
    '#gloria-frame.open{display:block;}',
    '#gloria-frame.visible{opacity:1;transform:translateY(0);}',
    '@media(max-width:480px){',
    '#gloria-frame{width:100%;height:100%;bottom:0;right:0;border-radius:0;}}',
  ].join('');
  d.head.appendChild(style);

  // Chat bubble
  var bubble = d.createElement('button');
  bubble.id = 'gloria-bubble';
  bubble.setAttribute('aria-label', 'Chat with Gloria');
  bubble.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  d.body.appendChild(bubble);

  // Iframe (created lazily on first click)
  var frame = null;
  var open = false;

  bubble.onclick = function() {
    if (!frame) {
      frame = d.createElement('iframe');
      frame.id = 'gloria-frame';
      frame.src = CHAT_URL + '&ref=' + encodeURIComponent(location.href);
      frame.title = 'Chat with Gloria';
      frame.allow = 'microphone';
      d.body.appendChild(frame);
    }

    open = !open;

    if (open) {
      frame.className = 'open';
      requestAnimationFrame(function() {
        requestAnimationFrame(function() { frame.className = 'open visible'; });
      });
      bubble.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    } else {
      frame.className = 'open';
      setTimeout(function() { frame.className = ''; }, 200);
      bubble.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    }
  };

  // Close when iframe posts a close message
  w.addEventListener('message', function(e) {
    if (e.data === 'gloria:close' && open) bubble.onclick();
  });

})(window, document, '%%WIDGET_KEY%%');
