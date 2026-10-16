(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;

  /* ---------- Loader ---------- */
  window.addEventListener('load', () => setTimeout(() => $('#loader').classList.add('done'), 500));

  /* ---------- Particle network background ---------- */
  const canvas = $('#bg');
  const ctx = canvas.getContext('2d');
  let W, H, dpr, particles = [];
  const mouse = { x: -9999, y: -9999 };
  const COLORS = ['139,92,246', '34,211,238', '244,114,182'];

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(110, Math.floor((W * H) / 14000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .45, vy: (Math.random() - .5) * .45,
      r: Math.random() * 1.6 + .6,
      c: COLORS[(Math.random() * COLORS.length) | 0],
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;

      // gentle repulsion from cursor
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
      if (d2 < 14000) { const f = (14000 - d2) / 14000 * .6; p.x += dx / Math.sqrt(d2 + 1) * f; p.y += dy / Math.sqrt(d2 + 1) * f; }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.c},.85)`;
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const ax = p.x - q.x, ay = p.y - q.y, dist = ax * ax + ay * ay;
        if (dist < 15000) {
          ctx.strokeStyle = `rgba(${p.c},${(1 - dist / 15000) * .22})`;
          ctx.lineWidth = .7;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
    }
    if (!reduceMotion) requestAnimationFrame(draw);
  }
  resize(); draw();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { resize(); if (reduceMotion) draw(); }, 150); });

  /* ---------- Cursor glow + spotlight on cards ---------- */
  const glow = $('#cursorGlow');
  addEventListener('pointermove', e => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (finePointer) { glow.style.left = e.clientX + 'px'; glow.style.top = e.clientY + 'px'; }
  });
  addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });

  /* ---------- 3D tilt cards ---------- */
  if (finePointer && !reduceMotion) {
    $$('.tilt').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.setProperty('--mx', x + 'px');
        card.style.setProperty('--my', y + 'px');
        const rx = ((y / r.height) - .5) * -8, ry = ((x / r.width) - .5) * 8;
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* ---------- Typed text ---------- */
  const phrases = ['agentic AI systems', 'voice sales agents', 'MERN web platforms', 'cross-platform mobile apps', 'data-driven products'];
  const typed = $('#typed');
  let pi = 0, ci = 0, del = false;
  (function type() {
    if (reduceMotion) { typed.textContent = phrases[0]; return; }
    const word = phrases[pi];
    typed.textContent = word.slice(0, ci);
    let delay = del ? 35 : 80;
    if (!del && ci === word.length) { del = true; delay = 1600; }
    else if (del && ci === 0) { del = false; pi = (pi + 1) % phrases.length; delay = 350; }
    ci += del ? -1 : 1;
    setTimeout(type, delay);
  })();

  /* ---------- Scroll reveal + counters ---------- */
  const countUp = el => {
    const target = +el.dataset.count, suffix = el.dataset.suffix || '', dur = 1600, t0 = performance.now();
    const step = t => {
      const k = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(target * e).toLocaleString('en-IN') + suffix;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      const siblings = $$('.reveal', el.parentElement);
      el.style.transitionDelay = Math.min(siblings.indexOf(el), 6) * 90 + 'ms';
      el.classList.add('in');
      const num = $('[data-count]', el);
      if (num) countUp(num);
      io.unobserve(el);
    });
  }, { threshold: .15 });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- Nav: scroll state, progress, active link, mobile menu ---------- */
  const nav = $('#nav'), progress = $('#progress');
  const links = $$('#menu a[href^="#"]:not(.btn-mini)');
  const sections = links.map(a => $(a.getAttribute('href')));
  const onScroll = () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    nav.classList.toggle('scrolled', y > 30);
    const tl = $('#eduTimeline');
    if (tl) {
      const r = tl.getBoundingClientRect();
      tl.style.setProperty('--fill', Math.min(Math.max((innerHeight * .65 - r.top) / r.height, 0), 1).toFixed(3));
    }
    progress.style.width = (max > 0 ? y / max * 100 : 0) + '%';
    let cur = -1;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * .4) cur = i; });
    links.forEach((a, i) => a.classList.toggle('active', i === cur));
    $('#toTop').style.opacity = y > 600 ? 1 : .35;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const burger = $('#burger'), navEl = $('.nav nav');
  const toggleMenu = open => { burger.classList.toggle('open', open); navEl.classList.toggle('open', open); };
  burger.addEventListener('click', () => toggleMenu(!navEl.classList.contains('open')));
  $$('#menu a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));

  /* ---------- Code windows: line-by-line reveal + copy ---------- */
  const decode = h => h.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  $$('.terminal').forEach(term => {
    const code = $('pre code', term);
    const lines = code.innerHTML.split('\n');
    code.innerHTML = lines.map((l, i) => `<span class="line" style="--i:${i}">${l || ' '}</span>`).join('');
    $('.copy', term).addEventListener('click', async e => {
      const btn = e.currentTarget;
      try { await navigator.clipboard.writeText(lines.map(decode).join('\n')); btn.textContent = 'copied ✓'; }
      catch { btn.textContent = 'press Ctrl+C'; }
      setTimeout(() => (btn.textContent = 'copy'), 1600);
    });
  });
  const tio = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('typed'); tio.unobserve(en.target); }
  }), { threshold: .35 });
  $$('.terminal').forEach(t => tio.observe(t));

  /* ---------- Misc ---------- */
  $('#toTop').addEventListener('click', () => scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
  $('#year').textContent = new Date().getFullYear();
})();
