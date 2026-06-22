import { ICONS, DEFAULT_LABELS } from './icons.js';
import { renderMarkdown, fetchMarkdown } from './markdown.js';
import Lenis from 'lenis';

/**
 * Resolve a potentially localized value.
 * Accepts a plain string or an object like { fr: '...', en: '...' }.
 * Returns the value for `locale`, or the first non-empty value as fallback.
 */
function loc(val, locale) {
  if (val == null) return '';
  if (typeof val !== 'object') return val;
  if (locale && val[locale]) return val[locale];
  for (const v of Object.values(val)) {
    if (v) return v;
  }
  return '';
}

let styleInjected = false;

const CSS = `
.slp-root {
  --slp-bg: var(--bg-1, #0a0e17);
  --slp-text: var(--t2, #c8d6e5);
  --slp-text-muted: var(--t3, #7a97b0);
  --slp-heading: var(--t1, #e4eef6);
  --slp-link: var(--cyan, #38bdf8);
  --slp-border: var(--border-6, rgba(255,255,255,0.06));
  --slp-code-bg: var(--surface-3, rgba(255,255,255,0.03));
  --slp-icon-size: 26px;
  --slp-max-width: 800px;
  --slp-radius: 16px;
  font-family: inherit;
  color: var(--slp-text);
  max-width: var(--slp-max-width);
  margin: 0 auto;
  padding: 48px 24px 64px;
}
.slp-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-bottom: 32px;
  position: relative;
  overflow: hidden;
}
/* Bottom panel: sinusoidal line + ripple spasm */
.slp-root > .slp-links {
  cursor: pointer;
  overflow: visible;
}
.slp-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 28px;
  background: var(--slp-code-bg);
  border: 1px solid var(--slp-border);
  color: var(--slp-text);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
}
.slp-link:hover {
  color: var(--slp-link);
  border-color: var(--slp-link);
  transform: translateY(-1px);
}
.slp-link svg {
  width: var(--slp-icon-size);
  height: var(--slp-icon-size);
  flex-shrink: 0;
}

/* Toolbar icon-only buttons */
.slp-toolbar-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: inherit;
  transition: color 0.2s, transform 0.2s;
  position: relative;
}
@keyframes slpShineSmall {
  0% { left: -20px; }
  25% { left: calc(100% + 20px); }
  100% { left: calc(100% + 20px); }
}
.slp-toolbar-icon:hover {
  color: var(--slp-link, var(--cyan, #38bdf8));
  transform: scale(1.1);
}
.slp-toolbar-icon svg {
  width: 16px;
  height: 16px;
  display: block;
}

/* Modal links */
.slp-modal-body .slp-links {
  display: flex;
  position: relative;
  overflow: visible;
  padding-top: 28px;
}
.slp-modal-body .slp-links::after { display: none; }

/* GitHub wobble */
.slp-gh-body {
  transform-box: fill-box;
  transform-origin: center;
  animation: slpGhWobble 3s ease-in-out infinite;
}
@keyframes slpGhWobble {
  0%, 100% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(-5deg) scale(1.05); }
  50% { transform: rotate(0deg) scale(1); }
  75% { transform: rotate(5deg) scale(1.05); }
}

/* Instagram animations */
.slp-blog-icon .slp-ig-border,
.slp-blog-icon .slp-ig-lens,
.slp-blog-icon .slp-ig-dot {
  transform-box: fill-box;
  transform-origin: center;
}
.slp-ig-border { animation: slpIgBorder 2s ease-in-out infinite; }
.slp-ig-lens { animation: slpIgLens 2s ease-in-out infinite; }
.slp-ig-dot { animation: slpIgDot 2s ease-in-out infinite; }
@keyframes slpIgBorder {
  0%, 100% { rx: 5; transform: rotate(0deg); }
  50% { rx: 8; transform: rotate(10deg); }
}
@keyframes slpIgLens {
  0%, 100% { r: 5; stroke-width: 1.8; }
  50% { r: 4; stroke-width: 2.5; }
}
@keyframes slpIgDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  30% { opacity: 0; transform: scale(0); }
  60% { opacity: 1; transform: scale(1.5); }
}

/* Activity in modal header */
.slp-modal-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.slp-activity-range {
  width: 100%;
  order: 1;
  font-size: 12px;
  font-weight: 500;
  color: var(--slp-text-muted);
  margin-top: 2px;
}
.slp-activity-arrow {
  display: none;
}
.slp-activity-date {
  font-weight: 500;
}
.slp-activity-status {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  flex-shrink: 0;
}
.slp-activity-status.loading {
  background: rgba(148,163,184,0.15);
  color: var(--slp-text-muted);
  animation: slpStatusPulse 1.5s ease-in-out infinite;
}
.slp-activity-status.active {
  background: rgba(52,211,153,0.15);
  color: #34d399;
  border: 1px solid rgba(52,211,153,0.3);
}
.slp-activity-status.recent {
  background: rgba(251,191,36,0.15);
  color: #fbbf24;
  border: 1px solid rgba(251,191,36,0.3);
}
.slp-activity-status.inactive {
  background: rgba(239,68,68,0.15);
  color: #ef4444;
  border: 1px solid rgba(239,68,68,0.3);
}
@keyframes slpStatusPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* README toggle button */
.slp-readme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 24px;
  border-radius: 12px;
  background: var(--slp-code-bg);
  border: 1px solid var(--slp-border);
  color: var(--slp-text);
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.5px;
}
.slp-readme-toggle:hover {
  color: var(--slp-link);
  border-color: var(--slp-link);
}

/* Modal overlay */
.slp-modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--slp-overlay, rgba(0,0,0,0.4));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.25s;
  pointer-events: none;
}
.slp-modal-overlay.open {
  opacity: 1;
  pointer-events: auto;
}
.slp-modal {
  background: var(--slp-modal-bg, #ffffff);
  color: var(--slp-modal-text, #1e293b);
  border: 1px solid var(--slp-modal-border, rgba(0,0,0,0.1));
  border-radius: var(--slp-radius);
  width: 90vw;
  max-width: 800px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  transform: translateY(20px) scale(0.97);
  transition: transform 0.25s;
  box-shadow: 0 24px 80px rgba(0,0,0,0.25);
}
.slp-modal-overlay.open .slp-modal {
  transform: translateY(0) scale(1);
}
.slp-modal-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px 0;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
  background: var(--slp-modal-bg, #ffffff);
  padding-bottom: 20px;
}
.slp-modal-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--slp-modal-heading, #0f172a);
  letter-spacing: 0.5px;
}
.slp-modal-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}
.slp-modal-close {
  background: none;
  border: none;
  color: var(--slp-modal-muted, #94a3b8);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.15s;
  font-family: inherit;
  line-height: 1;
  font-size: 22px;
  display: inline-flex;
  align-items: center;
}
.slp-modal-close:hover {
  color: var(--slp-modal-heading, #0f172a);
  background: rgba(0,0,0,0.05);
}
.slp-readme-wrap {
  position: relative;
}
.slp-readme-wrap .slp-readme h1:first-child {
  padding-right: 36px;
}
.slp-modal-copy {
  background: none;
  border: none;
  color: var(--slp-modal-muted, #94a3b8);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  line-height: 1;
  position: absolute;
  top: 32px;
  right: 32px;
}
@media (max-width: 768px) {
  .slp-modal-copy { top: 20px; right: 20px; }
}
.slp-modal-copy:hover {
  color: var(--slp-modal-heading, #0f172a);
  background: rgba(0,0,0,0.05);
}
.slp-modal-copy.copied {
  color: var(--slp-modal-link, #0284c7);
}
.slp-modal-body {
  overflow-y: scroll;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: none;
  overscroll-behavior: contain;
  scroll-behavior: smooth;
  flex: 1;
}

/* README content */
.slp-readme {
  padding: 32px;
  line-height: 1.7;
  font-size: 15px;
  overflow-x: auto;
  color: var(--slp-modal-text, #1e293b);
}
.slp-readme h1 { font-size: 28px; font-weight: 800; color: var(--slp-modal-heading, #0f172a); margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 1px solid var(--slp-modal-border, rgba(0,0,0,0.1)); }
.slp-readme h1:first-child { margin-top: 0; }
.slp-readme h2 { font-size: 22px; font-weight: 700; color: var(--slp-modal-heading, #0f172a); margin: 28px 0 12px; padding-bottom: 6px; border-bottom: 1px solid var(--slp-modal-border, rgba(0,0,0,0.1)); }
.slp-readme h3 { font-size: 18px; font-weight: 700; color: var(--slp-modal-heading, #0f172a); margin: 24px 0 10px; }
.slp-readme h4, .slp-readme h5, .slp-readme h6 { font-size: 15px; font-weight: 700; color: var(--slp-modal-heading, #0f172a); margin: 20px 0 8px; }
.slp-readme p { margin: 12px 0; }
.slp-readme a { color: var(--slp-modal-link, #0284c7); text-decoration: none; }
.slp-readme a:hover { text-decoration: underline; }
.slp-readme code { background: var(--slp-modal-code-bg, #f1f5f9); padding: 2px 6px; border-radius: 4px; font-size: 0.9em; font-family: 'SF Mono','Fira Code',monospace; }
.slp-readme pre { background: var(--slp-modal-code-bg, #f1f5f9); border: 1px solid var(--slp-modal-border, rgba(0,0,0,0.1)); border-radius: 8px; padding: 16px; overflow-x: auto; overflow-y: hidden; margin: 16px 0; overscroll-behavior: contain; touch-action: pan-x; }
.slp-readme pre code { background: none; padding: 0; font-size: 13px; line-height: 1.5; }
.slp-readme ul, .slp-readme ol { padding-left: 24px; margin: 12px 0; }
.slp-readme li { margin: 4px 0; }
.slp-readme blockquote { border-left: 3px solid var(--slp-modal-link, #0284c7); padding: 8px 16px; margin: 16px 0; color: var(--slp-modal-muted, #94a3b8); font-style: italic; }
.slp-readme hr { border: none; border-top: 1px solid var(--slp-modal-border, rgba(0,0,0,0.1)); margin: 24px 0; }
.slp-readme table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
.slp-readme th, .slp-readme td { padding: 8px 12px; border: 1px solid var(--slp-modal-border, rgba(0,0,0,0.1)); text-align: left; }
.slp-readme th { font-weight: 600; color: var(--slp-modal-heading, #0f172a); }
.slp-readme img { max-width: 100%; border-radius: 8px; }
.slp-loading { text-align: center; color: var(--slp-text-muted); padding: 32px; font-size: 14px; }
.slp-modal-body .slp-links { padding: 24px 32px 0; }
.slp-modal-body .slp-link { color: var(--slp-modal-text, #1e293b); border-color: var(--slp-modal-border, rgba(0,0,0,0.1)); background: var(--slp-modal-code-bg, #f1f5f9); }
.slp-modal-body .slp-link:hover { color: var(--slp-modal-link, #0284c7); border-color: var(--slp-modal-link, #0284c7); }
.slp-modal-body .slp-link svg { width: 20px; height: 20px; }
.slp-modal-header .slp-links {
  width: 100%;
  order: 3;
  padding: 16px 0 20px;
  margin: 0;
  display: flex;
  position: relative;
  overflow: visible;
  justify-content: center;
  gap: 12px;
  background: var(--slp-modal-bg, #ffffff);
}
.slp-modal-header .slp-link { color: var(--slp-modal-text, #1e293b); border-color: var(--slp-modal-border, rgba(0,0,0,0.1)); background: var(--slp-modal-code-bg, #f1f5f9); }
.slp-modal-header .slp-link:hover { color: var(--slp-modal-link, #0284c7); border-color: var(--slp-modal-link, #0284c7); }
.slp-modal-header .slp-link svg { width: 20px; height: 20px; }
@media (max-width: 768px) {
  .slp-root { padding: 32px 16px 48px; }
  .slp-readme { padding: 20px; }
  .slp-readme h1 { font-size: 22px; }
  .slp-readme h2 { font-size: 18px; }
  .slp-links { gap: 8px; }
  .slp-link { padding: 8px 14px; font-size: 13px; }
}
`;

function initWaveLine(container) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;bottom:-20px;left:0;width:100%;height:10px;pointer-events:none';
  container.style.position = 'relative';
  container.appendChild(canvas);

  let w, h;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = canvas.width = rect.width * 2;
    h = canvas.height = rect.height * 2;
  }
  // Defer initial sizing to next frame so layout is settled
  requestAnimationFrame(() => {
    resize();
    window.addEventListener('resize', resize);
  });

  const ctx = canvas.getContext('2d');
  let t = 0;
  let ripple = -1; // ripple center x (normalized 0-1), -1 = inactive
  let rippleT = 0;
  const RIPPLE_INTERVAL = 2.5; // seconds between spasms
  const RIPPLE_DUR = 0.8;
  let nextRipple = RIPPLE_INTERVAL;

  function draw() {
    requestAnimationFrame(draw);
    const dt = 1 / 60;
    t += dt;

    // Trigger ripple periodically
    nextRipple -= dt;
    if (nextRipple <= 0) {
      ripple = 0.5; // start from center
      rippleT = 0;
      nextRipple = RIPPLE_INTERVAL;
    }
    if (ripple >= 0) rippleT += dt;
    if (rippleT > RIPPLE_DUR) ripple = -1;

    ctx.clearRect(0, 0, w, h);
    const midY = h / 2;
    const amp = 3;

    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      const nx = x / w; // 0-1
      // Base sinusoidal oscillation
      let y = midY + Math.sin(nx * Math.PI * 4 + t * 2) * amp;

      // Ripple: concentrated wavelet spreading from center
      if (ripple >= 0) {
        const spread = rippleT / RIPPLE_DUR; // 0-1
        const rippleRadius = spread * 0.6;
        const dist = Math.abs(nx - 0.5);
        if (dist < rippleRadius) {
          const localPhase = (dist / rippleRadius) * Math.PI * 6;
          const envelope = (1 - dist / rippleRadius) * (1 - spread);
          y += Math.sin(localPhase - rippleT * 20) * envelope * 14;
        }
      }

      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    const isLight = document.documentElement.classList.contains('light-theme');
    ctx.strokeStyle = isLight ? 'rgba(2,132,199,0.5)' : 'rgba(255,255,255,0.6)';
    ctx.lineWidth = isLight ? 5 : 3;
    ctx.stroke();
  }
  draw();
}


function injectStyles() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
}

/**
 * Create a social links panel instance.
 *
 * @param {Object} config
 * @param {Array}  config.links       - Social links: [{ type, url, label? }]
 * @param {Object} config.readme      - { url?, fallback?, label? } — markdown source
 * @param {string} config.content     - Custom HTML content (used instead of readme)
 * @param {string} config.theme       - 'auto' | 'dark' | 'light'
 * @param {string} config.infoLabel   - Label for the info tab button (default: 'Info')
 * @returns {{ mount, appendTo, unmount, element, createTabButton }}
 */
export function createSocialPanel(config = {}) {
  injectStyles();

  const { links = [], readme, content, theme = 'auto', toolbar = true, nav = [], onOpen, onClose, locale, firstCommitDate } = config;
  let modalConfig = config.modal || 'light';

  const MODAL_PRESETS = {
    light: {
      bg: '#ffffff', text: '#1e293b', heading: '#0f172a', link: '#0284c7',
      border: 'rgba(0,0,0,0.08)', codeBg: '#f1f5f9', muted: '#64748b', overlay: 'rgba(0,0,0,0.4)',
    },
    dark: {
      bg: '#0f172a', text: '#cbd5e1', heading: '#e2e8f0', link: '#38bdf8',
      border: 'rgba(255,255,255,0.08)', codeBg: 'rgba(255,255,255,0.05)', muted: '#64748b', overlay: 'rgba(0,0,0,0.5)',
    },
  };
  let root = null;
  let overlay = null;
  let readmeLoaded = false;
  let readmeEl = null;
  let rawMd = null;
  let modalLenis = null;

  function buildSocialSectionMd() {
    const lines = ['\n---\n\n## Social\n\n'];
    for (const link of links) {
      const label = loc(link.label, locale) || DEFAULT_LABELS[link.type] || link.type;
      const desc = loc(link.desc, locale);
      const href = link.type === 'email' ? `mailto:${link.url}` : link.url;
      if (desc) {
        lines.push(`- ${desc} — [see here](${href})\n`);
      } else {
        lines.push(`- [${label}](${href})\n`);
      }
    }
    return lines.join('');
  }

  function buildLinksHTML() {
    if (links.length === 0) return '';
    const items = links.map(link => {
      const icon = ICONS[link.type] || ICONS.website;
      const label = loc(link.label, locale) || DEFAULT_LABELS[link.type] || link.type;
      const href = link.type === 'email' ? `mailto:${link.url}` : link.url;
      const aria = loc(link.aria, locale) || label;
      return `<a class="slp-link" href="${href}" target="_blank" rel="noopener" aria-label="${aria}" title="${aria}">${icon}<span>${label}</span></a>`;
    }).join('');
    return `<div class="slp-links">${items}</div>`;
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
    return ok;
  }

  function buildModal() {
    overlay = document.createElement('div');
    overlay.className = 'slp-modal-overlay';
    // Resolve modal colors: preset name or custom object
    const m = typeof modalConfig === 'string'
      ? MODAL_PRESETS[modalConfig] || MODAL_PRESETS.light
      : { ...(MODAL_PRESETS.light), ...modalConfig };

    overlay.style.setProperty('--slp-modal-bg', m.bg);
    overlay.style.setProperty('--slp-modal-text', m.text);
    overlay.style.setProperty('--slp-modal-heading', m.heading);
    overlay.style.setProperty('--slp-modal-link', m.link);
    overlay.style.setProperty('--slp-modal-border', m.border);
    overlay.style.setProperty('--slp-modal-code-bg', m.codeBg);
    overlay.style.setProperty('--slp-modal-muted', m.muted);
    overlay.style.setProperty('--slp-overlay', m.overlay);

    // Build social section for modal (links with descriptions)
    const socialMd = links.length > 0 ? buildSocialSectionMd() : '';

    overlay.innerHTML = `
      <div class="slp-modal">
        <div class="slp-modal-header">
          <div class="slp-modal-title-row">
            <span class="slp-modal-title">${loc(readme?.label, locale) || 'INFO : README'}</span>
            ${buildActivityStatusHTML()}
          </div>
          ${buildActivityDatesHTML()}
          ${buildLinksHTML()}
          <div class="slp-modal-actions">
            <button class="slp-modal-close">&times;</button>
          </div>
        </div>
        <div class="slp-modal-body">
          <div class="slp-readme-wrap">
            <div class="slp-readme slp-loading">Loading...</div>
            <button class="slp-modal-copy" title="Copy markdown">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            </button>
          </div>
          ${buildLinksHTML()}
        </div>
      </div>`;
    document.body.appendChild(overlay);

    readmeEl = overlay.querySelector('.slp-readme');

    // Stagger modal link flash delays
    // Wave line under both link rows in modal
    overlay.querySelectorAll('.slp-links').forEach(el => initWaveLine(el));

    overlay.querySelector('.slp-modal-copy').addEventListener('click', () => {
      if (!rawMd) return;
      function onCopied() {
        const btn = overlay.querySelector('.slp-modal-copy');
        btn.classList.add('copied');
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
        }, 2000);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(rawMd).then(onCopied).catch(() => {
          fallbackCopy(rawMd) && onCopied();
        });
      } else {
        fallbackCopy(rawMd) && onCopied();
      }
    });
    overlay.querySelector('.slp-modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
    });
  }

  function setModalTheme(mode) {
    if (typeof mode === 'string' && MODAL_PRESETS[mode]) {
      modalConfig = mode;
    } else if (typeof mode === 'object') {
      modalConfig = mode;
    }
    if (!overlay) return;

    // Just update CSS variables — no rebuild needed
    const m = typeof modalConfig === 'string'
      ? MODAL_PRESETS[modalConfig] || MODAL_PRESETS.light
      : { ...(MODAL_PRESETS.light), ...modalConfig };

    overlay.style.setProperty('--slp-modal-bg', m.bg);
    overlay.style.setProperty('--slp-modal-text', m.text);
    overlay.style.setProperty('--slp-modal-heading', m.heading);
    overlay.style.setProperty('--slp-modal-link', m.link);
    overlay.style.setProperty('--slp-modal-border', m.border);
    overlay.style.setProperty('--slp-modal-code-bg', m.codeBg);
    overlay.style.setProperty('--slp-modal-muted', m.muted);
    overlay.style.setProperty('--slp-overlay', m.overlay);
  }

  function openModal() {
    if (!overlay) buildModal();
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    const body = overlay.querySelector('.slp-modal-body');
    if (body) {
      body.scrollTop = 0;
      if (!modalLenis) {
        modalLenis = new Lenis({
          wrapper: body,
          content: body,
          smooth: true,
          lerp: 0.08,
        });
        function raf(time) {
          modalLenis.raf(time);
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
      }
    }
    if (onOpen) onOpen();
    if (!readmeLoaded) {
      readmeLoaded = true;
      loadReadme(readmeEl);
    }
  }

  function closeModal() {
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
    if (onClose) onClose();
  }

  function fmtDate(str) {
    const d = new Date(str);
    const loc2 = locale === 'fr' ? 'fr-FR' : 'en-US';
    return d.toLocaleDateString(loc2, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function buildActivityStatusHTML() {
    if (!firstCommitDate) return '';
    return `<span class="slp-activity-status" style="display:none"></span>`;
  }

  function buildActivityDatesHTML() {
    if (!firstCommitDate) return '';
    return `<div class="slp-activity-range">${fmtDate(firstCommitDate)}<span class="slp-activity-arrow"> → </span><span class="slp-activity-date"></span></div>`;
  }

  function buildRoot() {
    root = document.createElement('div');
    root.className = 'slp-root';
    root.id = 'slp-panel';
    if (theme === 'dark') root.setAttribute('data-slp-theme', 'dark');
    if (theme === 'light') root.setAttribute('data-slp-theme', 'light');

    root.innerHTML = buildLinksHTML();

    // Click on the links bar opens the modal
    const linksBar = root.querySelector('.slp-links');
    if (linksBar && readme) {
      linksBar.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        openModal();
      });
    }

    // Sinusoidal line with ripple spasm
    if (linksBar) initWaveLine(linksBar);

    if (content) {
      const contentEl = document.createElement('div');
      contentEl.className = 'slp-readme';
      contentEl.innerHTML = content;
      root.appendChild(contentEl);
    } else if (readme) {
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'slp-readme-toggle';
      toggleBtn.innerHTML = `<span>${loc(readme.label, locale) || 'INFO : README'}</span>`;
      toggleBtn.addEventListener('click', openModal);
      root.appendChild(toggleBtn);
    }

    return root;
  }

  async function loadReadme(el) {
    el.className = 'slp-readme';
    const socialMd = links.length > 0 ? buildSocialSectionMd() : '';
    let contentMd = null;

    // 1. Inline content
    if (readme.md) contentMd = readme.md;
    else if (readme.html) { el.innerHTML = renderMarkdown(socialMd) + readme.html; return; }

    // 2. Custom URL
    if (!contentMd && readme.url) {
      contentMd = await fetchMarkdown(readme.url);
    }

    // 3. Fallback URL (GitHub)
    if (!contentMd && readme.fallbackUrl) {
      contentMd = await fetchMarkdown(readme.fallbackUrl);
    }

    // 4. Store raw md and render
    rawMd = contentMd ? contentMd + '\n\n' + socialMd : socialMd;
    el.innerHTML = rawMd ? renderMarkdown(rawMd) : '';
  }

  return {
    mount(container) {
      if (!root) buildRoot();
      container.innerHTML = '';
      container.appendChild(root);
    },

    appendTo(container) {
      if (!root) buildRoot();
      container.appendChild(root);
    },

    unmount() {
      if (root && root.parentNode) root.parentNode.removeChild(root);
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      root = null;
      overlay = null;
    },

    get element() {
      if (!root) buildRoot();
      return root;
    },

    openModal,
    closeModal,
    setModalTheme,

    /**
     * Create compact icon-only link buttons for the toolbar/utility bar.
     * Respects config.toolbar: true = all links, array of types = filtered.
     * Order always matches config.links order.
     * @param {string} className - CSS class to match host buttons
     * @returns {HTMLElement[]}
     */
    createToolbarIcons(className = '') {
      if (!toolbar) return [];
      const filter = Array.isArray(toolbar) ? toolbar : null;
      const filtered = links.filter(link => !filter || filter.includes(link.type));
      return filtered.map((link, i) => {
          const icon = ICONS[link.type] || ICONS.website;
          const a = document.createElement('a');
          a.className = `slp-toolbar-icon ${className}`.trim();
          a.href = link.type === 'email' ? `mailto:${link.url}` : link.url;
          a.target = '_blank';
          a.rel = 'noopener';
          const ariaText = loc(link.aria, locale) || loc(link.label, locale) || DEFAULT_LABELS[link.type] || link.type;
          a.title = ariaText;
          a.setAttribute('aria-label', ariaText);
          a.innerHTML = icon;
          return a;
        });
    },

    /**
     * Create nav buttons defined in config.nav.
     * Each entry: { key, label, action: 'modal' | url }
     * @param {string} className - CSS class to match host buttons
     * @returns {HTMLElement[]}
     */
    createNavButtons(className = '') {
      return nav.map(item => {
        const btn = document.createElement('button');
        btn.className = className;
        btn.id = `slp-nav-${item.key}`;
        btn.textContent = loc(item.label, locale);
        if (item.action === 'modal') {
          btn.addEventListener('click', () => openModal());
        } else if (item.action) {
          btn.addEventListener('click', () => window.open(item.action, '_blank'));
        }
        return btn;
      });
    },
  };
}
