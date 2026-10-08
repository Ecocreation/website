/* enhance.js — smooth scroll polish shared by every page.
   Works alongside each page's own reveal observer; no dependencies. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1 ── Scroll progress bar (single rAF-throttled transform) */
  if (!reduce) {
    var bar = document.createElement('div');
    bar.id = 'scrollProgress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var ticking = false;
    var update = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(window.scrollY / h, 1) : 0) + ')';
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* 2 ── Stagger siblings so grids cascade instead of popping in together */
  var groups = new Map();
  document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(function (el) {
    if (/\bdelay-\d/.test(el.className)) return;
    var p = el.parentElement;
    if (!groups.has(p)) groups.set(p, []);
    groups.get(p).push(el);
  });
  groups.forEach(function (list) {
    if (list.length < 2) return;
    list.forEach(function (el, i) { el.style.transitionDelay = Math.min(i * 90, 450) + 'ms'; });
  });

  /* 3 ── Drop will-change once an element has finished animating in */
  document.addEventListener('transitionend', function (e) {
    var t = e.target;
    if (e.propertyName === 'transform' && t.classList && t.classList.contains('visible')) {
      t.classList.add('is-done');
      t.style.transitionDelay = '0ms';
    }
  });

  /* 4 ── FAQ: animate to the real content height instead of a fixed guess */
  var items = document.querySelectorAll('.faq-item');
  var sync = function (item) {
    var a = item.querySelector('.faq-a');
    if (!a) return;
    a.style.maxHeight = item.classList.contains('open') ? a.scrollHeight + 'px' : '0px';
  };
  if ('MutationObserver' in window) {
    var mo = new MutationObserver(function (list) {
      list.forEach(function (m) { sync(m.target); });
    });
    items.forEach(function (item) {
      mo.observe(item, { attributes: true, attributeFilter: ['class'] });
      sync(item);
    });
  }
  window.addEventListener('resize', function () {
    items.forEach(function (i) { if (i.classList.contains('open')) sync(i); });
  });
})();
