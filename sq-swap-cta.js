/*!
 * sq-swap-cta.js — Squarespace 7.1 two-part "swap" CTA button
 * Pill + arrow circle. On hover/focus the circle collapses, relocates while tiny,
 * and reopens on the left while the pill slides right.
 * Requires GSAP 3 (load before this file).
 *
 * Optional config (set before this script loads):
 *   window.sqSwapCTA = { selector: '.sqs-block-button a.sqs-block-button-element' };
 */
(function () {
  'use strict';

  var cfg = window.sqSwapCTA || {};
  var SELECTOR = cfg.selector || '.sqs-block-button a.sqs-block-button-element';

  var DURATION = 0.62;
  var COLLAPSE = +(DURATION * 0.45).toFixed(3); // 0.279
  var REOPEN = +(DURATION * 0.55).toFixed(3);   // 0.341
  var EASE_OUT = 'back.out(1.35)';

  var CSS =
    '.swap-cta{display:inline-flex!important;flex-direction:row;align-items:center;gap:0px!important;' +
      'width:auto!important;min-width:0!important;padding:0!important;margin:0!important;border:0!important;' +
      'background:none!important;background-color:transparent!important;box-shadow:none!important;' +
      'overflow:visible!important;opacity:1!important;text-decoration:none!important;}' +
    '.swap-cta::before,.swap-cta::after{content:none!important;display:none!important;}' +
    '.swap-cta__pill,.swap-cta__circle{background:var(--swap-bg);color:var(--swap-fg);will-change:transform;}' +
    '.swap-cta__pill{position:relative;z-index:2;display:inline-flex;align-items:center;justify-content:center;' +
      'height:56px;padding:0 34px;border-radius:9999px;white-space:nowrap;line-height:1;}' +
    '.swap-cta__circle{position:relative;z-index:1;flex:0 0 56px;width:56px;height:56px;border-radius:50%;' +
      'display:inline-flex;align-items:center;justify-content:center;}' +
    '.swap-cta__circle svg{width:42%;height:42%;display:block;}' +
    '.sqs-block-button-container:has(.swap-cta){width:auto;}';

  var ARROW =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M4 12h16M13 5l7 7-7 7"/></svg>';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  function injectCSS() {
    if (document.getElementById('swap-cta-css')) return;
    var s = document.createElement('style');
    s.id = 'swap-cta-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function decorate(link) {
    if (link.dataset.swapCta === 'ready') return;
    var label = (link.textContent || '').trim();
    if (!label) return;

    // Capture live colours as fallback before the link's own styling is stripped.
    var cs = getComputedStyle(link);
    var bg = cs.backgroundColor;
    var fg = cs.color;
    if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') bg = '#000';

    var pill = document.createElement('span');
    pill.className = 'swap-cta__pill';
    pill.textContent = label;

    var circle = document.createElement('span');
    circle.className = 'swap-cta__circle';
    circle.setAttribute('aria-hidden', 'true');
    circle.innerHTML = ARROW;

    link.textContent = '';
    link.appendChild(pill);
    link.appendChild(circle);
    link.classList.add('swap-cta');
    link.style.setProperty('--swap-bg', 'var(--primaryButtonBackgroundColor, ' + bg + ')');
    link.style.setProperty('--swap-fg', 'var(--primaryButtonTextColor, ' + fg + ')');
    link.dataset.swapCta = 'ready';

    var tl = null;
    var hovered = false;
    var focused = false;

    function isActive() { return hovered || focused; }

    function build() {
      if (tl) tl.kill();
      gsap.set([pill, circle], { clearProps: 'transform' });

      var pillW = pill.offsetWidth;
      var circleW = circle.offsetWidth;
      var gap = parseFloat(getComputedStyle(link).columnGap) || 0;

      gsap.set(pill, { x: 0 });
      gsap.set(circle, { x: 0, scale: 1, transformOrigin: 'center center' });

      tl = gsap.timeline({ paused: true });
      tl.fromTo(pill, { x: 0 }, { x: circleW + gap, duration: DURATION, ease: EASE_OUT }, 0)
        .fromTo(circle, { scale: 1 }, { scale: 0.1, duration: COLLAPSE, ease: 'power2.in' }, 0)
        .set(circle, { x: -(pillW + gap) }, COLLAPSE)
        .fromTo(circle, { scale: 0.1 }, {
          scale: 1, duration: REOPEN, ease: EASE_OUT, immediateRender: false
        }, COLLAPSE);

      tl.progress(isActive() ? 1 : 0).pause();
    }

    function update() {
      if (!tl) return;
      if (reduceMotion && reduceMotion.matches) {
        tl.pause().progress(isActive() ? 1 : 0);
        return;
      }
      if (isActive()) tl.play(); else tl.reverse();
    }

    link.addEventListener('mouseenter', function () { hovered = true; update(); });
    link.addEventListener('mouseleave', function () { hovered = false; update(); });
    link.addEventListener('focus', function () {
      var keyboard = true;
      try { keyboard = link.matches(':focus-visible'); } catch (e) {}
      if (keyboard) { focused = true; update(); }
    });
    link.addEventListener('blur', function () { focused = false; update(); });

    // Reset + remeasure on resize or label reflow (e.g. web fonts loading).
    var raf = 0;
    function schedule() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(build);
    }
    window.addEventListener('resize', schedule);
    if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(pill);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);

    build();
  }

  function init(root) {
    if (typeof window.gsap === 'undefined') {
      console.warn('[sq-swap-cta] GSAP not found. Load gsap.min.js before sq-swap-cta.js.');
      return;
    }
    injectCSS();
    (root || document).querySelectorAll(SELECTOR).forEach(decorate);
  }

  window.sqSwapCTA = Object.assign(cfg, { init: init });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }
})();
