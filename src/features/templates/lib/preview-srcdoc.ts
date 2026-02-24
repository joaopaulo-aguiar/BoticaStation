/**
 * Generates the srcdoc content for the preview iframe,
 * including optional inspector overlay and dark-mode simulation.
 */

export type PreviewOptions = {
  inspectorEnabled?: boolean
  darkMode?: boolean
}

function getInspectorScript(): string {
  return `(function() {
  var OVERLAY_ID = '__vm_overlay__';
  var TIP_ID = '__vm_tip__';

  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;border:2px solid #0078d4;border-radius:2px;box-sizing:border-box;background:rgba(0,120,212,0.06);display:none';

  var tip = document.createElement('div');
  tip.id = TIP_ID;
  tip.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;font:11px/1.25 Consolas,Monaco,Courier New,monospace;background:rgba(0,0,0,0.85);color:#fff;padding:6px 8px;border-radius:4px;max-width:380px;white-space:pre-wrap;display:none';

  document.documentElement.appendChild(overlay);
  document.documentElement.appendChild(tip);

  function domPath(el) {
    if (!el || el.nodeType !== 1) return '';
    var parts = [];
    var cur = el;
    for (var i = 0; cur && cur.nodeType === 1 && i < 6; i++) {
      var p = cur.tagName.toLowerCase();
      if (cur.id) p += '#' + cur.id;
      var cls = (cur.className && typeof cur.className === 'string') ? cur.className.trim().split(/\\\\s+/).slice(0, 3) : [];
      if (cls.length) p += '.' + cls.join('.');
      parts.unshift(p);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }

  function setBox(rect) {
    overlay.style.left = rect.left + 'px';
    overlay.style.top = rect.top + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    overlay.style.display = 'block';
  }

  function setTip(x, y, text) {
    tip.textContent = text;
    var pad = 10;
    var vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    var vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    tip.style.display = 'block';
    var tr = tip.getBoundingClientRect();
    var left = x + pad;
    var top = y + pad;
    if (left + tr.width > vw) left = Math.max(0, x - tr.width - pad);
    if (top + tr.height > vh) top = Math.max(0, y - tr.height - pad);
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }

  function hide() {
    overlay.style.display = 'none';
    tip.style.display = 'none';
  }

  window.addEventListener('mousemove', function(e) {
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === overlay || el === tip || el.id === OVERLAY_ID || el.id === TIP_ID) {
      hide();
      return;
    }
    var rect = el.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) {
      hide();
      return;
    }
    var cs = window.getComputedStyle(el);
    var text = domPath(el) + '\\n' +
      'size: ' + Math.round(rect.width) + 'x' + Math.round(rect.height) + '  pos: ' + Math.round(rect.left) + ',' + Math.round(rect.top) + '\\n' +
      'display: ' + cs.display + '  position: ' + cs.position + '\\n' +
      'color: ' + cs.color + '  bg: ' + cs.backgroundColor + '\\n' +
      'font: ' + cs.fontSize + '/' + cs.lineHeight + ' ' + cs.fontFamily + '\\n' +
      'padding: ' + cs.paddingTop + ' ' + cs.paddingRight + ' ' + cs.paddingBottom + ' ' + cs.paddingLeft + '\\n' +
      'margin: ' + cs.marginTop + ' ' + cs.marginRight + ' ' + cs.marginBottom + ' ' + cs.marginLeft;
    setBox(rect);
    setTip(e.clientX, e.clientY, text);
  }, { passive: true });

  window.addEventListener('mouseleave', hide);

  window.addEventListener('click', function(e) {
    var target = e.target && e.target.closest ? e.target.closest('[data-vm-node]') : null;
    if (!target) return;
    var id = target.getAttribute('data-vm-node');
    if (id) {
      window.parent && window.parent.postMessage({ type: 'vm-preview-click', id: id }, '*');
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
})();`
}

function getDarkModeStyles(): string {
  return `
    html, body {
      background-color: #1a1a1a !important;
      color: #e8e8e8 !important;
    }
    body, table, td, th, div, p, span, a, li, ul, ol, h1, h2, h3, h4, h5, h6 {
      color: #e8e8e8 !important;
    }
    table[bgcolor], td[bgcolor], th[bgcolor], div[style*="background"],
    [style*="background-color: #fff"], [style*="background-color:#fff"],
    [style*="background-color: white"], [style*="background-color:white"] {
      background-color: #2d2d2d !important;
    }
    [style*="#fafafa"], [style*="#f5f5f5"], [style*="#f0f0f0"], [style*="#eeeeee"], [style*="#e0e0e0"] {
      background-color: #333333 !important;
    }
    a { color: #6db3f2 !important; }
    img { opacity: 0.95; }
    body::before {
      content: 'DARK MODE PREVIEW';
      display: block;
      background: #0078d4;
      color: white;
      text-align: center;
      padding: 4px;
      font-size: 10px;
      font-family: sans-serif;
      letter-spacing: 1px;
    }
  `
}

export function buildPreviewSrcDoc(renderedBodyHtml: string, opts?: PreviewOptions): string {
  const inspectorEnabled = opts?.inspectorEnabled ?? true
  const darkMode = opts?.darkMode ?? false

  const parts = [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '<style>',
    '  html, body { margin: 0; padding: 0; width: 100%; height: 100%; }',
    '  body { overflow-x: hidden; -webkit-text-size-adjust: 100%; }',
    '  img { max-width: 100% !important; height: auto !important; }',
    '  table { max-width: 100% !important; }',
    '  td, th { word-wrap: break-word !important; }',
    '</style>',
  ]

  if (darkMode) {
    parts.push('<style id="dark-mode-styles">')
    parts.push(getDarkModeStyles())
    parts.push('</style>')
  }

  parts.push('</head>')
  parts.push('<body>')
  parts.push(renderedBodyHtml)

  if (inspectorEnabled) {
    parts.push('<script>')
    parts.push(getInspectorScript())
    parts.push('</' + 'script>')
  }

  parts.push('</body>')
  parts.push('</html>')

  return parts.join('\n')
}
