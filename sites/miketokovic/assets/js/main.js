/* Tokovic LLC — main.js (vanilla, no dependencies)
   Sections: header/menu · reveals · scroll (parallax + process line) · flow canvas · copy */
(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.add('js');
  window.__tk = 1;

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---- Header + mobile menu ------------------------------------- */
  const header = $('.site-header');
  const btn = $('.menu-btn');
  const nav = $('#site-nav');

  function setMenu(open, refocus) {
    if (!btn || !nav) return;
    btn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
    root.classList.toggle('menu-open', open);
    if (open) { const first = $('a', nav); if (first) first.focus(); }
    else if (refocus) btn.focus();
  }
  if (btn && nav) {
    btn.addEventListener('click', () => setMenu(btn.getAttribute('aria-expanded') !== 'true', true));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => {
      if (btn.getAttribute('aria-expanded') !== 'true') return;
      if (e.key === 'Escape') { e.preventDefault(); setMenu(false, true); return; }
      if (e.key !== 'Tab') return;
      // keep focus inside brand + toggle + menu links while the panel is open
      const items = [$('.brand', header), btn, ...$$('a', nav)].filter(Boolean);
      const i = items.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }

  /* ---- Scroll reveals ------------------------------------------- */
  const reveals = $$('.reveal');
  if (reduce.matches || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---- Scroll driver: header state, parallax, process line ------ */
  const proc = $('.process');
  const nodes = proc ? $$('.pl-node', proc) : [];
  const NODE_AT = [0, 0.206, 0.414, 0.622, 0.83];
  const par = $$('[data-par]').map((el) => ({ el, f: parseFloat(el.dataset.par) || 0, ref: el.closest('.case') || el.parentElement }));
  let queued = false;

  function update() {
    queued = false;
    const vh = window.innerHeight;
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
    if (proc) {
      let p = 1;
      if (!reduce.matches) {
        const r = proc.getBoundingClientRect();
        p = clamp((vh * 0.8 - r.top) / (r.height * 0.9), 0, 1);
      }
      proc.style.setProperty('--draw', p.toFixed(3));
      nodes.forEach((n) => n.classList.toggle('on', p >= NODE_AT[+n.dataset.i] - 0.01));
    }
    if (!reduce.matches) {
      par.forEach(({ el, f, ref }) => {
        const r = ref.getBoundingClientRect();
        if (r.bottom < -300 || r.top > vh + 300) return;
        el.style.setProperty('--py', ((r.top + r.height / 2 - vh / 2) * f).toFixed(1) + 'px');
      });
    }
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  reduce.addEventListener('change', queue);
  update();

  /* ---- Hero flow field ------------------------------------------ */
  (function flow() {
    const cv = $('#flow');
    const ctx = cv && cv.getContext('2d', { alpha: false });
    if (!ctx) return;
    const hero = cv.parentElement;
    const BG = '#0A0C0F', ACCENT = 'rgb(61,219,180)';
    // stream-function terms [amp, kx, ky, speed, phase]; velocity = curl(psi) + rightward drift
    const TERMS = [[1, 0.0041, 0.0067, 0.21, 0], [0.6, -0.0072, 0.0038, -0.16, 2.1], [0.35, 0.011, -0.0093, 0.29, 4.2]];
    const v = [0, 0];
    let W = 0, H = 0, sc = 1, n = 0, X, Y, A, L, raf = 0, last = 0, inView = true;

    function field(x, y, t) {
      let dx = 0, dy = 0;
      x /= sc; y /= sc;
      for (let i = 0; i < 3; i++) {
        const k = TERMS[i], c = k[0] * Math.cos(k[1] * x + k[2] * y + k[3] * t + k[4]);
        dx += c * k[2]; dy -= c * k[1];
      }
      v[0] = 1 + dx * 70; v[1] = dy * 70;
    }
    function spawn(i, anywhere) {
      X[i] = anywhere ? Math.random() * W : -Math.random() * 40;
      Y[i] = Math.random() * H;
      A[i] = 0;
      L[i] = 240 + Math.random() * 420;
    }
    function step(t, dt, draw) {
      const speed = 1.15 * dt;
      for (let i = 0; i < n; i++) {
        field(X[i], Y[i], t);
        const nx = X[i] + v[0] * speed, ny = Y[i] + v[1] * speed;
        A[i] += dt;
        if (draw) {
          ctx.globalAlpha = 0.46 * Math.sin(Math.PI * Math.min(A[i] / L[i], 1));
          ctx.beginPath(); ctx.moveTo(X[i], Y[i]); ctx.lineTo(nx, ny); ctx.stroke();
        }
        X[i] = nx; Y[i] = ny;
        if (A[i] > L[i]) spawn(i, true);
        else if (nx > W + 30 || ny < -30 || ny > H + 30) spawn(i, false);
      }
    }
    function fade(dt) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1 - Math.pow(1 - 0.045, dt);
      ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
    }
    function drawStatic() {
      ctx.globalCompositeOperation = 'lighter';
      for (let s = 0, m = Math.round(n / 3); s < m; s++) {
        const x0 = Math.random() * W, y0 = Math.random() * H;
        ctx.globalAlpha = 0.1 + Math.random() * 0.16;
        ctx.beginPath();
        for (const dir of [1, -1]) {
          let x = x0, y = y0;
          ctx.moveTo(x, y);
          for (let k = 0; k < 64; k++) {
            field(x, y, 6);
            const len = Math.hypot(v[0], v[1]) || 1;
            x += dir * v[0] / len * 5; y += dir * v[1] / len * 5;
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
    }
    function resize() {
      const r = hero.getBoundingClientRect();
      const w = Math.round(r.width), h = Math.round(r.height);
      if (!w || !h) return;
      if (W && Math.abs(w - W) < 2 && Math.abs(h - H) < 120 && !reduce.matches) return; // ignore mobile URL-bar jitter
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = w; H = h; sc = clamp(w / 1440, 0.6, 1.25);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 1; ctx.lineCap = 'round'; ctx.strokeStyle = ACCENT;
      n = w < 700 ? 300 : Math.min(900, Math.max(420, Math.round(w * h / 1800)));
      X = new Float32Array(n); Y = new Float32Array(n); A = new Float32Array(n); L = new Float32Array(n);
      for (let i = 0; i < n; i++) { spawn(i, true); A[i] = Math.random() * L[i]; }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
      if (reduce.matches) { drawStatic(); return; }
      const t = performance.now() / 1000;
      for (let k = 0; k < 70; k++) { fade(1); step(t, 1, true); }   // pre-roll so trails exist on first paint
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 16.667, 3);
      last = now;
      fade(dt);
      step(now / 1000, dt, true);
    }
    function sync() {
      const go = inView && !document.hidden && !reduce.matches;
      if (go && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!go && raf) { cancelAnimationFrame(raf); raf = 0; }
    }

    let timer = 0;
    window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(resize, 160); });
    reduce.addEventListener('change', () => { W = 0; resize(); sync(); });
    document.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => { inView = e[0].isIntersecting; sync(); }).observe(hero);
    }
    resize();
    sync();
  })();

  /* ---- Copy email ------------------------------------------------ */
  (function copy() {
    const b = $('[data-copy]'), out = $('#copy-status');
    if (!b || !out) return;
    const label = $('.lbl', b);
    let t = 0;
    b.addEventListener('click', async () => {
      const text = b.dataset.copy;
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; }
      catch (e) {
        try {
          const ta = document.createElement('textarea');
          ta.value = text; ta.setAttribute('readonly', '');
          ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
          document.body.appendChild(ta); ta.select();
          ok = document.execCommand('copy'); ta.remove();
        } catch (e2) { /* fall through */ }
      }
      out.textContent = ok ? 'Copied ' + text + ' to your clipboard.' : 'Could not copy. Please select the address and copy it manually.';
      if (label) label.textContent = ok ? 'Copied' : 'Copy address';
      clearTimeout(t);
      t = setTimeout(() => { out.textContent = ''; if (label) label.textContent = 'Copy address'; }, 3200);
    });
  })();
})();
