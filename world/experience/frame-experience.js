/* FRAME World · Phases 2–3: cinematic intro, 3D country carousel, country entry transition.
 * Standalone, no dependencies. Usage: FrameExperience.init({ root: '#id', countries: [...] })
 * Country: { code, name, capital?, flag?, image?, credit?, accent? }
 * An image must have a verified source and licence before it is used.
 */
(function (w, d) {
  'use strict';

  var EASE = 'cubic-bezier(.2,.7,.1,1)';
  var mq = w.matchMedia ? w.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(mq && mq.matches); }

  function node(tag, cls, text) {
    var n = d.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function setBg(n, url) {
    n.style.backgroundImage = url ? 'url("' + String(url).replace(/["\\]/g, '') + '")' : '';
    n.style.backgroundSize = url ? 'cover' : '';
  }
  function flagFor(code) {
    if (!code || code.length !== 2) return '';
    return String.fromCodePoint.apply(null, code.toUpperCase().split('').map(function (ch) {
      return 127397 + ch.charCodeAt(0);
    }));
  }
  function preload(url) {
    return new Promise(function (res) {
      if (!url) return res();
      var im = new Image(), t = setTimeout(res, 1500);
      im.onload = im.onerror = function () { clearTimeout(t); res(); };
      im.src = url;
    });
  }
  function cancelAll(n) {
    if (n.getAnimations) n.getAnimations().forEach(function (a) { a.cancel(); });
  }

  function runIntro(root, opts) {
    return new Promise(function (done) {
      var seen = false;
      try { seen = w.localStorage.getItem('fwx-intro-seen') === '1'; } catch (e) {}
      if (opts.introOnce !== false && seen) { root.classList.add('is-live'); return done(); }
      var wrap = node('div', 'fwx-intro');
      var l1 = node('p', 'fwx-intro__line', 'The world,');
      var l2 = node('p', 'fwx-intro__line', 'beyond what you know.');
      var skip = node('button', 'fwx-skip', 'Skip intro');
      var timers = [], ended = false;
      wrap.setAttribute('role', 'dialog');
      wrap.setAttribute('aria-modal', 'true');
      wrap.setAttribute('aria-label', 'Introduction');
      wrap.append(node('div', 'fwx-intro__haze'), l1, l2, skip);
      root.appendChild(wrap);
      function onKey(e) { if (e.key === 'Escape') finish(); }
      function finish() {
        if (ended) return;
        ended = true;
        timers.forEach(clearTimeout);
        d.removeEventListener('keydown', onKey);
        try { w.localStorage.setItem('fwx-intro-seen', '1'); } catch (e) {}
        root.classList.add('is-live');
        wrap.classList.add('is-out');
        setTimeout(function () { wrap.remove(); done(); }, reduced() ? 0 : 800);
      }
      skip.addEventListener('click', finish);
      d.addEventListener('keydown', onKey);
      timers.push(setTimeout(function () { l1.classList.add('is-on'); }, reduced() ? 0 : 300));
      timers.push(setTimeout(function () { l2.classList.add('is-on'); }, reduced() ? 0 : 1300));
      timers.push(setTimeout(finish, reduced() ? 1200 : 4600));
      skip.focus({ preventScroll: true });
    });
  }

  function init(opts) {
    opts = opts || {};
    var root = typeof opts.root === 'string' ? d.querySelector(opts.root) : opts.root;
    var all = (opts.countries || []).filter(function (c) { return c && c.name; });
    if (!root || !all.length) return null;

    var api = {};
    var S = { mode: 'curated', items: all.slice(), i: 0, timer: null, busy: false, hover: false, moved: false, sx: 0, layer: null };
    var cards = [];
    var onEnter = opts.onEnter || null;

    root.classList.add('fwx-root');
    var stage = node('section', 'fwx-stage');
    stage.setAttribute('aria-roledescription', 'carousel');
    stage.setAttribute('aria-label', opts.label || 'Countries');
    var bar = node('header', 'fwx-bar');
    var count = node('span', 'fwx-count');
    var orderBtn = node('button', 'fwx-pill', 'A–Z');
    var track = node('div', 'fwx-track');
    var prev = node('button', 'fwx-arrow fwx-arrow--prev', '‹');
    var next = node('button', 'fwx-arrow fwx-arrow--next', '›');
    var live = node('p', 'fwx-sr');
    prev.type = next.type = orderBtn.type = 'button';
    prev.setAttribute('aria-label', 'Previous country');
    next.setAttribute('aria-label', 'Next country');
    orderBtn.setAttribute('aria-pressed', 'false');
    live.setAttribute('aria-live', 'polite');
    track.tabIndex = 0;
    bar.append(count, orderBtn);
    stage.append(bar, track, prev, next, live);
    root.appendChild(stage);

    function build() {
      track.textContent = '';
      cards = S.items.map(function (c, i) {
        var card = node('div', 'fwx-card');
        var btn = node('button', 'fwx-card__btn');
        var media = node('span', 'fwx-card__media');
        var meta = node('span', 'fwx-card__meta');
        card.dataset.i = i;
        card.setAttribute('role', 'group');
        card.setAttribute('aria-roledescription', 'slide');
        card.setAttribute('aria-label', (i + 1) + ' of ' + S.items.length);
        card.style.setProperty('--accent', c.accent || '#c9a46a');
        btn.setAttribute('aria-label', c.name + (c.capital ? ', capital ' + c.capital : '') + '. Open country');
        meta.append(node('span', 'fwx-flag', c.flag || flagFor(c.code)), node('span', 'fwx-card__name', c.name));
        if (c.capital) meta.append(node('span', 'fwx-card__capital', c.capital));
        btn.append(media, node('span', 'fwx-card__shade'), meta);
        if (c.credit) btn.append(node('span', 'fwx-card__credit', 'Photo: ' + c.credit));
        card.appendChild(btn);
        track.appendChild(card);
        return { card: card, btn: btn, media: media, data: c, loaded: false };
      });
    }

    function layout() {
      var n = cards.length, a = S.i;
      cards.forEach(function (cv, i) {
        var off = i - a;
        if (off > n / 2) off -= n; else if (off < -n / 2) off += n;
        var ad = Math.abs(off), show = ad <= 2;
        cv.card.style.setProperty('--d', off);
        cv.card.style.setProperty('--ad', ad);
        cv.card.style.zIndex = 10 - ad;
        cv.card.classList.toggle('is-active', ad === 0);
        cv.card.classList.toggle('is-hidden', !show);
        cv.btn.tabIndex = show ? 0 : -1;
        if (show && !cv.loaded && cv.data.image) { setBg(cv.media, cv.data.image); cv.loaded = true; }
      });
      count.textContent = String(a + 1).padStart(2, '0') + ' / ' + n;
      live.textContent = S.items[a].name;
    }

    function go(i) {
      var n = S.items.length;
      S.i = ((i % n) + n) % n;
      layout();
    }
    function indexOfKey(key) {
      var k = String(key).toLowerCase();
      for (var i = 0; i < S.items.length; i++) {
        if (String(S.items[i].code).toLowerCase() === k || S.items[i].name.toLowerCase() === k) return i;
      }
      return -1;
    }
    function setOrder(mode) {
      var cur = S.items[S.i];
      S.mode = mode === 'alpha' ? 'alpha' : 'curated';
      S.items = S.mode === 'alpha'
        ? all.slice().sort(function (a, b) { return a.name.localeCompare(b.name); })
        : all.slice();
      build();
      S.i = Math.max(0, S.items.indexOf(cur));
      orderBtn.textContent = S.mode === 'alpha' ? 'Curated' : 'A–Z';
      orderBtn.setAttribute('aria-pressed', String(S.mode === 'alpha'));
      layout();
    }

    /* Autoplay: off by default, paused on hover or focus, disabled for reduced motion. */
    function pause() { clearInterval(S.timer); S.timer = null; }
    function play() {
      pause();
      if (!opts.autoplay || reduced() || S.hover || S.layer) return;
      S.timer = setInterval(function () { if (!d.hidden) api.next(); }, opts.interval || 6000);
    }

    /* Swipe: pointer listeners on window so the click target stays the card. */
    function onMove(e) { if (Math.abs(e.clientX - S.sx) > 8) S.moved = true; }
    function onUp(e) {
      w.removeEventListener('pointermove', onMove);
      w.removeEventListener('pointerup', onUp);
      w.removeEventListener('pointercancel', onUp);
      var dx = e.clientX - S.sx;
      if (dx < -48) api.next(); else if (dx > 48) api.prev();
    }
    track.addEventListener('pointerdown', function (e) {
      if (e.button || S.busy) return;
      S.sx = e.clientX;
      S.moved = false;
      w.addEventListener('pointermove', onMove);
      w.addEventListener('pointerup', onUp);
      w.addEventListener('pointercancel', onUp);
    });
    track.addEventListener('click', function (e) {
      if (S.moved) return;
      var card = e.target.closest ? e.target.closest('.fwx-card') : null;
      if (!card) return;
      var i = Number(card.dataset.i);
      if (i === S.i) enter(); else go(i);
    });

    /* Country entry: the card lifts, its frame expands to full screen, then the title appears. */
    function motion(cv, c) {
      var r = cv.btn.getBoundingClientRect(), vw = w.innerWidth, vh = w.innerHeight;
      var o = node('div', 'fwx-enter');
      var img = node('div', 'fwx-enter__img');
      var veil = node('div', 'fwx-enter__veil');
      var title = node('div', 'fwx-enter__title');
      var back = node('button', 'fwx-enter__back', '← Back');
      back.type = 'button';
      title.append(node('p', 'fwx-enter__kicker', c.capital || c.code || ''), node('h1', 'fwx-enter__name', c.name));
      o.style.setProperty('--accent', c.accent || '#c9a46a');
      o.append(img, veil, title, back);
      d.body.appendChild(o);
      S.layer = { node: o, cv: cv };
      back.addEventListener('click', exit);
      setBg(img, c.image);
      var fromClip = 'inset(' + r.top + 'px ' + (vw - r.right) + 'px ' + (vh - r.bottom) + 'px ' + r.left + 'px round 20px)';

      if (reduced() || typeof o.animate !== 'function') {
        veil.style.opacity = title.style.opacity = back.style.opacity = '1';
        return preload(c.image);
      }
      return preload(c.image).then(function () {
        return cv.btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }],
          { duration: 320, easing: EASE, fill: 'forwards' }).finished;
      }).then(function () {
        img.animate([{ transform: 'scale(1.14)' }, { transform: 'scale(1)' }],
          { duration: 1600, easing: EASE, fill: 'forwards' });
        veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: 500, fill: 'forwards' });
        title.animate([
          { opacity: 0, transform: 'translateY(28px)', filter: 'blur(10px)', letterSpacing: '.3em' },
          { opacity: 1, transform: 'none', filter: 'blur(0px)', letterSpacing: '.04em' }
        ], { duration: 1300, delay: 900, easing: EASE, fill: 'forwards' });
        back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 1800, fill: 'forwards' });
        return o.animate([{ clipPath: fromClip }, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }],
          { duration: 1100, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' }).finished;
      });
    }

    function enter() {
      if (S.busy || !cards.length) return;
      S.busy = true;
      pause();
      var cv = cards[S.i], c = cv.data;
      live.textContent = 'Entering ' + c.name;
      motion(cv, c).then(function () {
        var back = S.layer && S.layer.node.querySelector('.fwx-enter__back');
        if (back) back.focus({ preventScroll: true });
        if (onEnter) onEnter(c, cv.btn);
        d.dispatchEvent(new CustomEvent('frameworld:enter', { detail: c }));
      });
    }

    function exit() {
      var L = S.layer;
      if (!L) return;
      S.layer = null;
      var o = L.node;
      var done = function () {
        o.remove();
        cancelAll(L.cv.btn);
        S.busy = false;
        L.cv.btn.focus({ preventScroll: true });
        play();
      };
      if (typeof o.animate === 'function' && !reduced()) {
        o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' }).finished.then(done);
      } else {
        done();
      }
    }

    api.next = function () { if (!S.layer) go(S.i + 1); };
    api.prev = function () { if (!S.layer) go(S.i - 1); };
    api.go = function (key) {
      if (S.layer) return;
      var idx = typeof key === 'number' ? key : indexOfKey(key);
      if (idx >= 0) go(idx);
    };
    api.setOrder = setOrder;
    api.enter = enter;
    api.exit = exit;
    api.current = function () { return S.items[S.i]; };

    prev.addEventListener('click', function () { api.prev(); });
    next.addEventListener('click', function () { api.next(); });
    orderBtn.addEventListener('click', function () { setOrder(S.mode === 'alpha' ? 'curated' : 'alpha'); });
    stage.addEventListener('keydown', function (e) {
      if (S.layer) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); api.next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); api.prev(); }
    });
    stage.addEventListener('pointerenter', function () { S.hover = true; pause(); });
    stage.addEventListener('pointerleave', function () { S.hover = false; play(); });
    stage.addEventListener('focusin', pause);
    stage.addEventListener('focusout', play);
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && S.layer) exit(); });

    build();
    layout();
    if (opts.intro === false) root.classList.add('is-live');
    else runIntro(root, opts).then(play);
    return api;
  }

  w.FrameExperience = { init: init };
})(window, document);