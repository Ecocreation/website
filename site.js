/* Eco Creational — site.js
   Small, dependency-free behaviour shared by every page. */
(function () {
  'use strict';

  var header = document.querySelector('.site-header');
  var nav = document.getElementById('nav');
  var toggle = document.querySelector('.menu-toggle');

  /* Header border once the page scrolls */
  function onScroll() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 8); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Mobile menu */
  function setMenu(open) {
    if (!nav || !toggle) return;
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
  }
  if (toggle) {
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 900) setMenu(false); });
  }

  /* Auto-tag extra blocks for the scroll reveal (staggered), without touching the markup of every page */
  var wide = window.innerWidth > 900;
  var extra = document.querySelectorAll('.row, .step, .value, .section-head > *, .split > *, .founder > *, .mission > *, .stats > div, .footer-top > div, .cta-band .wrap > *, .faq-group, .work-meta');
  extra.forEach(function (el, i) {
    if (el.hasAttribute('data-rv') || el.querySelector('.sticky') || el.classList.contains('sticky')) return;
    if (el.parentElement && el.parentElement.closest('[data-rv]')) return;
    var sibs = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
    el.setAttribute('data-rv', wide && el.parentElement && el.parentElement.matches('.split, .founder, .mission') ? (sibs % 2 ? 'right' : 'left') : '');
    if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', Math.min(sibs, 5) * 90 + 'ms');
  });
  document.querySelectorAll('.split .ph, .founder .ph, .page-hero .ph').forEach(function (p) { p.classList.add('rv-img'); });

  /* Scroll reveal */
  var items = document.querySelectorAll('[data-rv], .rv-img');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  /* Generic filter: buttons[data-filter] toggle items[data-category] */
  function bindFilter(btnSel, itemSel, attr, onChange) {
    var btns = document.querySelectorAll(btnSel);
    if (!btns.length) return;
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var val = b.getAttribute(attr);
        btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        document.querySelectorAll(itemSel).forEach(function (it) {
          it.hidden = !(val === 'all' || it.getAttribute('data-category') === val);
        });
        if (onChange) onChange(val);
      });
    });
  }
  bindFilter('[data-filter]', '.work[data-category]', 'data-filter');
  bindFilter('[data-faq-filter]', '.faq-group[data-category]', 'data-faq-filter');

  /* Opening one FAQ closes the others in browsers without <details name> */
  var faqs = document.querySelectorAll('details.faq');
  faqs.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      faqs.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

  /* Count-up for stat figures */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nums = document.querySelectorAll('[data-count]');
  if (nums.length && 'IntersectionObserver' in window && !reduce) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        co.unobserve(en.target);
        var el = en.target, end = parseInt(el.getAttribute('data-count'), 10);
        var suffix = el.getAttribute('data-suffix') || '', comma = el.hasAttribute('data-comma');
        var t0 = null, dur = 1400;
        (function tick(ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1), v = Math.round((1 - Math.pow(1 - p, 3)) * end);
          el.textContent = (comma ? v.toLocaleString('en-US') : v) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        })(performance.now());
      });
    }, { threshold: 0.6 });
    nums.forEach(function (el) { co.observe(el); });
  }

  /* Scroll progress bar, back-to-top button and gentle hero parallax */
  var bar = document.createElement('div');
  bar.className = 'scroll-progress'; bar.setAttribute('aria-hidden', 'true'); bar.innerHTML = '<i></i>';
  document.body.appendChild(bar);
  var barFill = bar.firstChild;

  var C = 2 * Math.PI * 22;
  var top = document.createElement('button');
  top.type = 'button'; top.className = 'to-top'; top.setAttribute('aria-label', 'Back to top');
  top.innerHTML = '<svg class="ring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + C.toFixed(1) + '"/></svg>' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
  document.body.appendChild(top);
  var ring = top.querySelector('.ring circle');
  top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  /* One smoothed rAF loop: scroll position and parallax offsets are eased (lerp) so motion glides instead of jumping */
  var layers = reduce ? [] : [].slice.call(document.querySelectorAll('.mosaic .m1, .mosaic .m2, .mosaic .m3, .footer-word'));
  layers.forEach(function (el) {
    el.setAttribute('data-parallax', '');
    el.__k = el.classList.contains('m1') ? -0.04 : el.classList.contains('m2') ? 0.05 : el.classList.contains('m3') ? -0.07 : 0;
  });
  var pics = reduce ? [] : [].slice.call(document.querySelectorAll('.split .ph img, .founder .ph img, .page-hero .ph img'));
  pics.forEach(function (img) { img.parentNode.classList.add('px'); img.__v = 0; });

  var cur = window.scrollY, ticking = false;
  function frame() {
    ticking = false;
    var y = window.scrollY, vh = window.innerHeight, moving = false;
    cur += (y - cur) * 0.12;
    if (Math.abs(y - cur) < 0.3) cur = y; else moving = true;

    var max = document.documentElement.scrollHeight - vh;
    var p = max > 0 ? Math.min(Math.max(cur / max, 0), 1) : 0;
    barFill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    ring.style.strokeDashoffset = (C * (1 - p)).toFixed(1);
    top.classList.toggle('show', y > 600);

    var desk = window.innerWidth > 900;
    layers.forEach(function (el) {
      el.style.transform = desk && el.__k ? 'translate3d(0,' + (cur * el.__k).toFixed(1) + 'px,0)' : '';
    });
    pics.forEach(function (img) {
      var r = img.parentNode.getBoundingClientRect(), target = 0;
      if (r.bottom > -100 && r.top < vh + 100) {
        target = -((r.top + r.height / 2 - vh / 2) / vh) * (desk ? 44 : 26);
        target = Math.max(-40, Math.min(40, target));
        img.__v += (target - img.__v) * 0.14;
        if (Math.abs(target - img.__v) > 0.2) moving = true;
        img.style.setProperty('--py', img.__v.toFixed(1) + 'px');
      }
    });
    if (moving) req();
  }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);
  frame();
})();
