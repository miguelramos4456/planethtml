/* ═══════════════════════════════════════════════════════════════
   BEYOND — interactions
   ═══════════════════════════════════════════════════════════════ */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer  = window.matchMedia('(pointer: fine)').matches;
const isMobile     = window.innerWidth < 769;
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

gsap.registerPlugin(ScrollTrigger);

/* ─────────────── Smooth scroll ─────────────── */
const lenis = new Lenis({ duration: 1.2, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(time => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

/* Hero is sized in CSS (100svh) so everything stays inside the viewport */
window.addEventListener('load', () => ScrollTrigger.refresh());

/* ─────────────── Anchors through Lenis ─────────────── */
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const t = $(a.getAttribute('href'));
  if (!t) return;
  e.preventDefault();
  lenis.scrollTo(t, { duration: 1.6 });
  closeSheet();
}));
$('#toTop').addEventListener('click', () => lenis.scrollTo(0, { duration: 2 }));

/* ─────────────── Nav: hide on scroll down, active section, sheet, clocks ─────────────── */
const nav = $('#nav'), burger = $('#navBurger'), sheet = $('#navSheet');
let lastY = 0;
lenis.on('scroll', ({ scroll }) => {
  const down = scroll > lastY && scroll > 200;
  if (sheet.hidden) nav.classList.toggle('nav--hidden', down);
  lastY = scroll;
});
['hero', 'archive', 'expedition', 'worlds', 'log', 'telemetry', 'footer'].forEach(id => ScrollTrigger.create({
  trigger: '#' + id, start: 'top 45%', end: 'bottom 45%',
  onToggle: s => s.isActive && $$('#navLinks a').forEach(l => l.classList.toggle('active', l.dataset.sec === id))
}));
function closeSheet() {
  sheet.hidden = true;
  burger.setAttribute('aria-expanded', 'false');
  burger.classList.remove('open');
  document.body.classList.remove('sheet-open');
}
burger.addEventListener('click', () => {
  const open = sheet.hidden;
  sheet.hidden = !open;
  burger.setAttribute('aria-expanded', String(open));
  burger.classList.toggle('open', open);
  document.body.classList.toggle('sheet-open', open);
});
document.addEventListener('keydown', e => e.key === 'Escape' && closeSheet());

(function clocks() {
  const pad = n => String(n).padStart(2, '0');
  const tick = () => {
    const d = new Date();
    $('#navClock').textContent = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    $('#fClock').textContent = `${pad((d.getUTCHours() + 21) % 24)}:${pad(d.getUTCMinutes())}`;
  };
  tick(); setInterval(tick, 1000);
})();

/* ─────────────── Custom cursor ─────────────── */
if (finePointer && !reduceMotion) {
  document.documentElement.classList.add('has-cursor');
  const cur = $('#cursor'), dot = $('.cursor-dot'), ring = $('.cursor-ring'), label = $('#cursorLabel');
  const dx = gsap.quickSetter(dot, 'x', 'px'), dy = gsap.quickSetter(dot, 'y', 'px');
  const rx = gsap.quickTo(ring, 'x', { duration: .45, ease: 'power3' });
  const ry = gsap.quickTo(ring, 'y', { duration: .45, ease: 'power3' });
  window.addEventListener('pointermove', e => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); cur.classList.add('on'); });
  document.addEventListener('pointerleave', () => cur.classList.remove('on'));
  document.addEventListener('pointerover', e => {
    const t = e.target.closest('[data-cursor], a, button, input');
    cur.classList.toggle('hover', !!t);
    const txt = t && t.dataset.cursor;
    label.textContent = txt || '';
    cur.classList.toggle('label', !!txt);
  });
}

/* ─────────────── Magnetic elements ─────────────── */
if (finePointer && !reduceMotion) {
  $$('[data-magnetic]').forEach(el => {
    const xTo = gsap.quickTo(el, 'x', { duration: .5, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: .5, ease: 'power3' });
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * .35);
      yTo((e.clientY - r.top - r.height / 2) * .35);
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, .4)' });
    });
  });
}

/* ─────────────── Hero: intro, parallax ─────────────── */
const titleLetters = $$('.hero-title span');
gsap.from(titleLetters, { yPercent: 110, opacity: 0, duration: 1.4, stagger: .07, ease: 'expo.out', delay: .2 });
gsap.from('.hero-bottom > *', { y: 40, opacity: 0, duration: 1.2, stagger: .15, ease: 'expo.out', delay: .7 });

/* Pinned, multi-depth scroll parallax: each layer moves at its own speed
   far → near:  sky/landscape · mist · title · planet · foreground grass */
if (!isMobile && !reduceMotion) {
  gsap.timeline({
    scrollTrigger: { trigger: '#hero', start: 'top top', end: '+=95%', pin: true, scrub: 1, anticipatePin: 1 }
  })
    .to('#bgWrap',          { scale: 1.16, yPercent: -3, ease: 'none' }, 0)
    .to('#mistWrap',        { yPercent: -8, scale: 1.12, opacity: .25, ease: 'none' }, 0)
    .to('.hero-title-wrap', { yPercent: -24, scale: 1.1, opacity: 0, ease: 'none' }, 0)
    .to('#planetWrap',      { yPercent: -42, scale: .7, ease: 'none' }, 0)
    .to('#mistFront',       { yPercent: -20, opacity: 0, ease: 'none' }, 0)
    .to('#fgWrap',          { scale: 1.14, transformOrigin: '50% 100%', ease: 'none' }, 0)
    .to('.hero-bottom',     { yPercent: -60, opacity: 0, ease: 'none' }, 0)
    .to('#heroScrim',       { opacity: .92, ease: 'none' }, .4)
    .to('#heroFade',        { opacity: 1, ease: 'none' }, .25);
} else {
  const st = { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: .9 };
  gsap.to('#planetWrap', { yPercent: -18, ease: 'none', scrollTrigger: st });
  gsap.to('#fgWrap',     { scale: 1.08, transformOrigin: '50% 100%', ease: 'none', scrollTrigger: st });
  gsap.to('#heroScrim',  { opacity: .85, ease: 'none', scrollTrigger: st });
  gsap.to('#heroFade',   { opacity: 1, ease: 'none', scrollTrigger: st });
}

/* Floating dust in the foreground */
(function () {
  const d = $('#dust');
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('i'), s = Math.random() * 3 + 1, t = Math.random() * 10 + 8;
    p.style.cssText = `left:${Math.random() * 100}%;top:${40 + Math.random() * 55}%;width:${s}px;height:${s}px;animation-duration:${t}s;animation-delay:${-Math.random() * t}s;--dx:${(Math.random() - .5) * 120}px`;
    d.appendChild(p);
  }
})();

/* Pointer parallax + letters that lift toward the cursor */
if (finePointer && !reduceMotion) {
  const layers = [[$('#bgWrap'), 8], [$('#mistWrap'), 16], [$('.hero-title-wrap'), 22], [$('#planetWrap'), 30], [$('#mistFront'), 44], [$('#fgWrap'), 70]];
  const lift = titleLetters.map(l => gsap.quickTo(l, 'y', { duration: .6, ease: 'power3' }));
  let tx = 0, ty = 0, cx = 0, cy = 0, mx = -9999;
  $('#hero').addEventListener('pointermove', e => {
    tx = (e.clientX / innerWidth - .5) * 2;
    ty = (e.clientY / innerHeight - .5) * 2;
    mx = e.clientX;
    titleLetters.forEach((l, i) => {
      const r = l.getBoundingClientRect();
      const d = Math.abs(mx - (r.left + r.width / 2));
      lift[i](-Math.max(0, 1 - d / 320) * 34);
    });
  });
  $('#hero').addEventListener('pointerleave', () => lift.forEach(f => f(0)));
  gsap.ticker.add(() => {
    cx += (tx - cx) * .06; cy += (ty - cy) * .06;
    layers.forEach(([el, d]) => el.style.translate = `${(-cx * d).toFixed(2)}px ${(-cy * d * .6).toFixed(2)}px`);
  });
}

/* ─────────────── Hero planet picker ───────────────
   Two stacked images cross-fade so the outgoing and incoming worlds share the sky.
   Every transition is built around distance: worlds recede into the haze,
   pan across the system, or eclipse one another. */
(function () {
  const PLANETS = [
    { src: 'planet.png',  name: 'Kaelen-IV',       type: 'Rocky world · 1,120 LY',  glow: '#e3342a' },
    { src: 'planet1.png', name: 'Azura-7b',        type: 'Ocean world · 2,340 LY',  glow: '#5b8cff' },
    { src: 'planet2.png', name: 'Korreth Expanse', type: 'Ringed rogue · 890 LY',   glow: '#d9a066' },
    { src: 'planet3.png', name: 'Sorel Prime',     type: 'Gas giant · 3,710 LY',    glow: '#6fd3a0' },
    { src: 'planet4.png', name: 'Nythari Veil',    type: 'Ice giant · 5,200 LY',    glow: '#4fb6e0' },
  ];
  PLANETS.forEach(p => { const i = new Image(); i.src = p.src; });

  const stage = $('#planetStage'), glow = $('#planetGlow'), thumbs = $$('.pp-thumb');
  const nameEl = $('#ppName'), typeEl = $('#ppType');
  let front = $('#heroPlanet'), back = $('#heroPlanetB');
  let cur = 0, busy = false, fx = 0;
  const N = PLANETS.length;

  /* resting look of a distant world: slightly hazed by the atmosphere in front of it */
  const REST = { xPercent: 0, yPercent: 0, rotate: 0, scale: 1, opacity: 1, filter: 'blur(0px) saturate(.9) brightness(.97)' };
  gsap.set(front, REST);
  gsap.set(back, { ...REST, opacity: 0 });
  glow.style.setProperty('--g', PLANETS[0].glow);

  /* Build warp streaks once */
  const warp = $('#warp');
  for (let k = 0; k < 30; k++) {
    const l = document.createElement('i');
    l.style.rotate = (k * 12 + Math.random() * 8) + 'deg';
    l.style.setProperty('--len', (40 + Math.random() * 45).toFixed(0) + '%');
    warp.appendChild(l);
  }

  /* Camera dolly: we fly past the current world (it swells, blurs and slides off-frame),
     space streaks by, the landscape breathes, and the next world arrives from deep distance. */
  const TRANSITIONS = [
    (o, n, dir) => gsap.timeline()
      .to(o, { xPercent: -55 * dir, yPercent: 6, scale: 2.1, opacity: 0, filter: 'blur(22px) saturate(.6) brightness(1.25)', duration: 1, ease: 'power3.in' }, 0)
      .fromTo('#warp i', { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: .75, duration: .45, ease: 'power2.out', stagger: { each: .008, from: 'random' } }, .3)
      .to('#warp i', { opacity: 0, x: 40, duration: .7, ease: 'power2.in' }, .8)
      .set('#warp i', { x: 0 })
      .fromTo('.layer-bg', { scale: 1 }, { scale: 1.05, duration: .9, ease: 'power2.inOut', yoyo: true, repeat: 1 }, 0)
      .fromTo('.hero-title', { x: 0 }, { x: -30 * dir, duration: .9, ease: 'power2.inOut', yoyo: true, repeat: 1 }, 0)
      .to('.orbit', { rotate: '+=' + (140 * dir), duration: 2, ease: 'expo.inOut' }, 0)
      .fromTo(n, { xPercent: 28 * dir, yPercent: -8, scale: .14, opacity: 0, filter: 'blur(6px) saturate(.4) brightness(2)' },
                 { ...REST, duration: 1.8, ease: 'expo.out' }, .6),
  ];

  function swapText(el, txt) {
    gsap.to(el, { yPercent: -100, opacity: 0, duration: .3, ease: 'power2.in', onComplete: () => {
      el.textContent = txt;
      gsap.fromTo(el, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .6, ease: 'expo.out' });
    }});
  }

  function go(i, forceDir) {
    if (i === cur || busy) return;
    busy = true;
    const p = PLANETS[i], dir = forceDir || (i > cur ? 1 : -1);
    cur = i;
    thumbs.forEach((t, k) => { t.classList.toggle('active', k === i); t.setAttribute('aria-pressed', String(k === i)); });
    swapText(nameEl, p.name); swapText(typeEl, p.type);
    glow.style.setProperty('--g', p.glow);

    back.src = p.src;
    back.alt = p.name;
    const run = () => {
      back.classList.add('is-front'); front.classList.remove('is-front');
      back.removeAttribute('aria-hidden'); front.setAttribute('aria-hidden', 'true');
      TRANSITIONS[fx++ % TRANSITIONS.length](front, back, dir)
        .to(glow, { opacity: .26, scale: 1, duration: 1, ease: 'power2.out' })
        .add(() => {
          gsap.set(front, { ...REST, opacity: 0 });
          [front, back] = [back, front];
          busy = false;
        });
    };
    back.decode ? back.decode().then(run, run) : run();
  }

  const next = () => go((cur + 1) % N, 1);
  const prev = () => go((cur - 1 + N) % N, -1);
  thumbs.forEach(t => t.addEventListener('click', () => go(+t.dataset.i)));
  $('#ppNext').addEventListener('click', next);
  $('#ppPrev').addEventListener('click', prev);
  window.addEventListener('keydown', e => {
    if (window.scrollY > innerHeight || e.target.matches('input')) return;
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft')  prev();
  });

  /* Drag / swipe the planet itself */
  let startX = null;
  stage.addEventListener('pointerdown', e => {
    if (busy) return;
    startX = e.clientX;
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('grabbing');
  });
  stage.addEventListener('pointermove', e => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    gsap.to(front, { xPercent: dx / 6, rotate: dx / 14, duration: .3, overwrite: 'auto' });
  });
  const release = e => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    stage.classList.remove('grabbing');
    if (Math.abs(dx) > 60) { gsap.killTweensOf(front); dx < 0 ? next() : prev(); }
    else gsap.to(front, { xPercent: 0, rotate: 0, duration: .8, ease: 'elastic.out(1, .5)' });
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
})();

/* ─────────────── Archive — 3D carousel ───────────────
   Items sit on a curved stage: the active one faces the camera, neighbours
   swing back in depth (translateZ + rotateY), dim and blur with distance. */
(function () {
  const ring = $('#arRing'), stage = $('#arStage');
  if (!ring) return;
  const ITEMS = [
    { img: 'planet.png',  kind: 'World',      name: 'Kaelen-IV',       desc: 'Our home survey world: a rust-red rocky planet with basalt plains and volcanic fissures that glow on the night side.', specs: [['Type', 'Rocky'], ['Distance', '1,120 LY'], ['Gravity', '0.71 g'], ['Day', '26.4 h']] },
    { img: 'probe.png',   kind: 'Spacecraft', name: 'Helion-3 Probe',  desc: 'Orbital survey probe. Its gold-foil body carries the spectrometers that first read the air of Azura-7b.', specs: [['Role', 'Survey'], ['Span', '14.2 m'], ['Power', '9.8 kW'], ['Launched', '2029']] },
    { img: 'planet1.png', kind: 'World',      name: 'Azura-7b',        desc: 'An ocean world under pale cloud bands, tracing a figure-eight orbit around twin suns.', specs: [['Type', 'Ocean'], ['Distance', '2,340 LY'], ['Mass', '4.2× Earth'], ['Cycle', '847 d']] },
    { img: 'lander.png',  kind: 'Spacecraft', name: 'Descent Lander',  desc: 'Crewed lander built for one landing and one return. It set down in the Crimson Flats of Kaelen-IV in 2040.', specs: [['Crew', '2'], ['Mass', '14.6 t'], ['Legs', '4'], ['Delta-v', '3.1 km/s']] },
    { img: 'planet2.png', kind: 'World',      name: 'Korreth Expanse', desc: 'A dark rogue world with a wide ring system, drifting starless with ten companions through the Draco void.', specs: [['Type', 'Rogue'], ['Distance', '890 LY'], ['Bodies', '11'], ['Mass', '3.8× Jupiter']] },
    { img: 'rover.png',   kind: 'Spacecraft', name: 'Pathfinder Rover', desc: 'Six-wheeled field rover. It mapped forty kilometres of the Crimson Flats in its first hundred sols.', specs: [['Wheels', '6'], ['Range', '42 km'], ['Speed', '0.4 km/h'], ['Sols', '1,842']] },
    { img: 'planet3.png', kind: 'World',      name: 'Sorel Prime',     desc: 'A banded gas giant in a trinary system, with a single pale storm larger than Earth.', specs: [['Type', 'Gas giant'], ['Distance', '3,710 LY'], ['Radius', '0.88× Earth'], ['Year', '19 d']] },
    { img: 'station.png', kind: 'Spacecraft', name: 'Relay Station',   desc: 'An orbital relay that carries every byte between the survey fleet and Ground Station 7.', specs: [['Modules', '2'], ['Arrays', '4'], ['Uplink', '1.2 Gb/s'], ['Crew', '3']] },
    { img: 'planet4.png', kind: 'World',      name: 'Nythari Veil',    desc: 'An ice giant wrapped in high white cloud streaks, embedded in a nebula rich with pre-biotic compounds.', specs: [['Type', 'Ice giant'], ['Distance', '5,200 LY'], ['Organics', '47'], ['Span', '~340 LY']] },
  ];

  /* Build items, dropping any whose image is missing */
  const els = [];
  ITEMS.forEach((it, i) => {
    const el = document.createElement('div');
    el.className = 'ar-item' + (it.kind === 'World' ? ' is-world' : ' is-craft');
    el.innerHTML = `<img src="${it.img}" alt="${it.name}" draggable="false" loading="lazy"><span class="ar-shadow"></span>`;
    el.addEventListener('click', () => { if (!moved) go(i); });
    ring.appendChild(el);
    els.push(el);
  });
  let items = ITEMS.map((it, i) => ({ ...it, el: els[i] }));
  const dots = $('#arDots');
  const buildDots = () => { dots.innerHTML = items.map(() => '<i></i>').join(''); };
  buildDots();
  items.forEach(it => it.el.querySelector('img').addEventListener('error', () => {
    it.el.remove();
    items = items.filter(x => x !== it);
    buildDots(); active = -1; update(true);
  }));

  let pos = 0, target = 0, active = -1, moved = false;
  const N = () => items.length;
  const wrap = d => { const n = N(); return ((d % n) + n + n / 2) % n - n / 2; };
  const spacing = () => Math.min(460, Math.max(190, window.innerWidth * .26));

  const kind = $('#arKind'), name = $('#arName'), desc = $('#arDesc'), specs = $('#arSpecs');
  function setInfo(it) {
    gsap.to([kind, name, desc, specs], { opacity: 0, y: 12, duration: .2, stagger: .03, onComplete: () => {
      kind.textContent = it.kind;
      name.textContent = it.name;
      desc.textContent = it.desc;
      specs.innerHTML = it.specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
      gsap.to([kind, name, desc, specs], { opacity: 1, y: 0, duration: .55, stagger: .05, ease: 'expo.out' });
    }});
  }

  function update(force) {
    const sp = spacing();
    items.forEach((it, i) => {
      const d = wrap(i - pos), a = Math.abs(d);
      const x = d * sp * (1 - Math.min(a, 3) * .08);
      const z = -a * 320;
      const ry = gsap.utils.clamp(-55, 55, -d * 32);
      const sc = 1 - Math.min(a, 3) * .1;
      it.el.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${(a * 18).toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      it.el.style.opacity = a > 3.4 ? 0 : (1 - a * .2).toFixed(3);
      it.el.style.filter = `blur(${(a * 1.6).toFixed(2)}px) brightness(${(1 - a * .18).toFixed(2)})`;
      it.el.style.zIndex = String(100 - Math.round(a * 10));
    });
    const n = N();
    const idx = ((Math.round(pos) % n) + n) % n;
    if (idx !== active || force) {
      active = idx;
      items.forEach((it, i) => it.el.classList.toggle('is-active', i === idx));
      [...dots.children].forEach((d, i) => d.classList.toggle('on', i === idx));
      setInfo(items[idx]);
    }
  }

  function go(i) {
    const d = wrap(i - target);
    target += d;
  }
  $('#arNext').addEventListener('click', () => { target = Math.round(target) + 1; });
  $('#arPrev').addEventListener('click', () => { target = Math.round(target) - 1; });
  stage.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { target = Math.round(target) + 1; e.preventDefault(); }
    if (e.key === 'ArrowLeft')  { target = Math.round(target) - 1; e.preventDefault(); }
  });

  /* Drag with inertia */
  let startX = null, startT = 0, lastX = 0, vel = 0;
  stage.addEventListener('pointerdown', e => {
    startX = lastX = e.clientX; startT = target; vel = 0; moved = false;
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('dragging');
  });
  stage.addEventListener('pointermove', e => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 5) moved = true;
    vel = e.clientX - lastX; lastX = e.clientX;
    target = startT - dx / spacing();
  });
  const end = () => {
    if (startX === null) return;
    startX = null;
    stage.classList.remove('dragging');
    target = Math.round(target - vel / 18);
    setTimeout(() => { moved = false; }, 0);
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  update(true);
  gsap.ticker.add(() => {
    if (Math.abs(target - pos) < .0005) return;
    pos += (target - pos) * (reduceMotion ? 1 : .09);
    update(false);
  });
  window.addEventListener('resize', () => update(false));
})();

/* ─────────────── Grass: wind follows the pointer ─────────────── */
(function () {
  const wind = $('#fgWind');
  if (!wind || reduceMotion) return;
  let last = null, w = 0;
  $('#hero').addEventListener('pointermove', e => {
    if (last !== null) w = gsap.utils.clamp(-6, 6, w + (e.clientX - last) * .05);
    last = e.clientX;
  });
  gsap.ticker.add(() => {
    w *= .94;
    wind.style.setProperty('--wind', w.toFixed(2) + 'deg');
  });
})();

/* ─────────────── Expedition cards ─────────────── */
(function () {
  const pad = n => String(n).padStart(2, '0');

  /* Route: lights up the stage whose card is in view */
  const routeLis = $$('.x-route li'), routeFill = $('#xRouteFill');
  $$('.x-card[data-stage]').forEach(card => {
    const s = +card.dataset.stage;
    ScrollTrigger.create({
      trigger: card, start: 'top 70%', end: 'bottom 30%',
      onToggle: st => {
        if (!st.isActive) return;
        routeLis.forEach((li, i) => li.classList.toggle('is-on', i <= s));
        gsap.to(routeFill, { scaleX: s / 2, duration: .8, ease: 'expo.out' });
      }
    });
  });

  /* 01 LISTEN — tune with the pointer or keys, lock with click / Enter */
  const scope = $('#xListen'), cv = $('#waveCanvas');
  if (scope && cv) {
    const ctx = cv.getContext('2d');
    const tuner = $('#xTuner'), tunerLbl = $('#xTunerLbl'), status = $('#xLock');
    const freqEl = $('#xFreq'), confEl = $('#xConf'), anom = $('#xAnom');
    const H_LINE = 1420.4, MIN = 1400, MAX = 1440;
    let freq = 1412, targetF = 1412, locked = false, lockAmt = 0, t = 0, W = 0, H = 0;
    const size = () => { const r = cv.getBoundingClientRect(); W = cv.width = r.width * devicePixelRatio; H = cv.height = r.height * devicePixelRatio; };
    size(); window.addEventListener('resize', size);

    const setFromX = x => {
      if (locked) return;
      const r = scope.getBoundingClientRect();
      targetF = MIN + gsap.utils.clamp(0, 1, (x - r.left) / r.width) * (MAX - MIN);
    };
    scope.addEventListener('pointermove', e => setFromX(e.clientX));
    const toggleLock = () => {
      locked = !locked;
      if (locked) {
        const conf = Math.max(0, 1 - Math.abs(freq - H_LINE) / 6);
        if (conf < .55) { locked = false; gsap.fromTo(status, { x: -4 }, { x: 0, duration: .4, ease: 'elastic.out(1,.3)' }); status.textContent = 'No carrier — retune'; return; }
        targetF = H_LINE;
        status.textContent = 'Locked · H-line';
        status.classList.add('on');
        anom.textContent = +anom.textContent + 1;
      } else {
        status.textContent = 'Scanning';
        status.classList.remove('on');
      }
    };
    scope.addEventListener('click', toggleLock);
    scope.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { toggleLock(); e.preventDefault(); }
      if (e.key === 'Escape' && locked) toggleLock();
      if (!locked && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        targetF = gsap.utils.clamp(MIN, MAX, targetF + (e.key === 'ArrowRight' ? .5 : -.5)); e.preventDefault();
      }
    });

    const draw = () => {
      t += .016;
      freq += (targetF - freq) * .12;
      const conf = Math.max(0, 1 - Math.abs(freq - H_LINE) / 6);
      lockAmt += ((locked ? 1 : conf * .7) - lockAmt) * .08;
      const u0 = (freq - MIN) / (MAX - MIN);
      tuner.style.left = (u0 * 100).toFixed(2) + '%';
      tunerLbl.textContent = freq.toFixed(1);
      freqEl.textContent = freq.toFixed(1);
      confEl.textContent = Math.round((locked ? .97 : conf) * 100) + '%';
      scope.setAttribute('aria-valuenow', freq.toFixed(1));

      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(115,196,219,.08)'; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += W / 8) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += H / 6)  { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      const peakU = (H_LINE - MIN) / (MAX - MIN);
      ctx.beginPath();
      for (let x = 0; x <= W; x += 3) {
        const u = x / W;
        const noise = (Math.sin(u * 90 + t * 9) * .3 + Math.sin(u * 37 - t * 5) * .4 + (Math.random() - .5) * .8) * (1 - lockAmt * .8);
        const env = Math.exp(-Math.pow((u - peakU) / .06, 2));
        const carrier = Math.sin(u * 140 - t * 8) * env * (.15 + lockAmt);
        const y = H * .55 + (noise * .12 + carrier * .34) * H;
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = locked ? '#FF5A4E' : '#73C4DB';
      ctx.lineWidth = 1.6 * devicePixelRatio;
      ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 10;
      ctx.stroke(); ctx.shadowBlur = 0;
      requestAnimationFrame(draw);
    };
    draw();
  }

  /* 02 SURVEY — layers, mapping ring, sampling reticle */
  const sv = $('#xSurvey');
  if (sv) {
    const NOTES = {
      visible: 'Visible light: cloud bands and storm systems, 0.4–0.7 µm. Hover the planet to sample it.',
      thermal: 'Thermal infrared: heat escaping the deep atmosphere. Hover to read cloud-top temperature.',
      atmos:   'Atmospheric chemistry: methane and ammonia absorption. Hover to read local concentration.'
    };
    const SAMPLE = {
      visible: (a, b) => `Albedo ${(.38 + a * .3).toFixed(2)}`,
      thermal: (a, b) => `${Math.round(118 + a * 60 + b * 20)} K`,
      atmos:   (a, b) => `CH₄ ${(1.2 + b * 2.4).toFixed(1)}%`
    };
    $$('.x-layers button').forEach(b => b.addEventListener('click', () => {
      $$('.x-layers button').forEach(o => { o.classList.toggle('active', o === b); o.setAttribute('aria-pressed', String(o === b)); });
      sv.dataset.layer = b.dataset.layer;
      $('#xLayerNote').textContent = NOTES[b.dataset.layer];
    }));
    const ret = $('#xReticle'), sample = $('#xSample'), coord = $('#xCoord');
    sv.addEventListener('pointermove', e => {
      const r = sv.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      const dx = x - .5, dy = y - .5, on = Math.hypot(dx, dy) < .36;
      ret.classList.toggle('on', on);
      gsap.to(ret, { left: x * 100 + '%', top: y * 100 + '%', duration: .25, overwrite: 'auto' });
      if (on) {
        const lat = (-dy / .36 * 90), lon = (dx / .36 * 180 + 360) % 360;
        coord.textContent = `LAT ${lat >= 0 ? '+' : ''}${lat.toFixed(1)}° · LON ${lon.toFixed(1).padStart(5, '0')}°`;
        sample.textContent = SAMPLE[sv.dataset.layer](Math.abs(Math.sin(y * 18)), x);
      }
    });
    sv.addEventListener('pointerleave', () => ret.classList.remove('on'));
    const ring = $('#xRing'), pct = $('#xPct');
    const C = 2 * Math.PI * 46;
    ring.style.strokeDasharray = C; ring.style.strokeDashoffset = C;
    ScrollTrigger.create({
      trigger: sv, start: 'top 80%', once: true,
      onEnter: () => gsap.to({ v: 0 }, { v: 82, duration: 2.6, ease: 'power2.out', onUpdate() {
        const v = this.targets()[0].v; pct.textContent = Math.round(v); ring.style.strokeDashoffset = C * (1 - v / 100);
      }})
    });
  }

  /* 03 LAND — scrub or replay the descent */
  const lander = $('#xLander'), path = $('#xPath');
  if (lander && path) {
    const L = path.getTotalLength(), box = $('#xLand');
    const alt = $('#xAlt'), velEl = $('#xVel'), phase = $('#xPhase'), scrub = $('#xScrub'), win = $('#xWindow');
    const ticks = $('#xRulerTicks');
    for (let k = 0; k <= 6; k++) {
      const y = 20 + k * (158 / 6);
      ticks.insertAdjacentHTML('beforeend', `<line x1="16" x2="28" y1="${y}" y2="${y}"/><text x="32" y="${y + 3}">${120 - k * 20}</text>`);
    }
    const st = { p: 0 };
    const place = () => {
      const p = st.p, pt = path.getPointAtLength(p * L), s = box.clientWidth / 300;
      const ahead = path.getPointAtLength(Math.min(L, p * L + 2));
      const tilt = Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 57.3 - 90;
      lander.style.transform = `translate(${pt.x * s}px, ${pt.y * s}px) translate(-50%, -78%) rotate(${(tilt * (1 - p) * .5).toFixed(1)}deg)`;
      alt.textContent = (120 * Math.pow(1 - p, 1.4)).toFixed(1);
      velEl.textContent = (1.84 * Math.pow(1 - p, .8) + .002).toFixed(2);
      path.style.strokeDashoffset = L * (1 - p);
      phase.textContent = p < .45 ? 'Approach' : p < .9 ? 'Braking' : p < 1 ? 'Terminal' : 'Touchdown';
      box.classList.toggle('touch', p >= 1);
      box.classList.toggle('burn', p > .45 && p < 1);
      scrub.value = Math.round(p * 1000);
      scrub.style.setProperty('--p', (p * 100).toFixed(1) + '%');
    };
    path.style.strokeDasharray = L;
    let auto;
    const replay = () => {
      if (auto) auto.kill();
      auto = gsap.fromTo(st, { p: 0 }, { p: 1, duration: 6, ease: 'power2.inOut', onUpdate: place });
    };
    scrub.addEventListener('input', () => { if (auto) auto.kill(); st.p = scrub.value / 1000; place(); });
    $('#xReplay').addEventListener('click', replay);
    ScrollTrigger.create({ trigger: box, start: 'top 75%', once: true, onEnter: replay });
    place();
    let secs = 2 * 3600 + 14 * 60 + 33;
    setInterval(() => {
      secs = secs > 0 ? secs - 1 : 3 * 3600;
      win.textContent = `${pad(Math.floor(secs / 3600))}:${pad(Math.floor(secs / 60) % 60)}:${pad(secs % 60)}`;
    }, 1000);
  }
})();

/* ─────────────── Expedition: cards drift at different depths ─────────────── */
if (!reduceMotion) {
  $$('[data-speed]').forEach(el => {
    gsap.fromTo(el, { y: () => +el.dataset.speed * 900 }, {
      y: () => -el.dataset.speed * 900, ease: 'none',
      scrollTrigger: { trigger: '#expedition', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true }
    });
  });
}

/* ─────────────── Mission log: pinned horizontal travel ─────────────── */
(function () {
  const track = $('#logTrack'), bar = $('#logBar');
  if (isMobile || reduceMotion) return;
  const dist = () => track.scrollWidth - window.innerWidth + parseFloat(getComputedStyle(track).paddingLeft);
  gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: {
      trigger: '#logPin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true,
      onUpdate: s => gsap.set(bar, { scaleX: s.progress })
    }
  });
  /* each card's image turns slowly as the log travels */
  $$('.log-card img').forEach(im => gsap.to(im, {
    rotate: 40, ease: 'none',
    scrollTrigger: { trigger: '#logPin', start: 'top top', end: () => '+=' + dist(), scrub: true }
  }));
})();

/* ─────────────── Telemetry console (simulated feed) ─────────────── */
(function () {
  const pad = n => String(n).padStart(2, '0');

  /* Signal bars: hover for reading, hold to freeze */
  const bars = $('#tBars'), tip = $('#tBarTip'), sigTile = $('#tSigTile');
  const N = 40, vals = Array.from({ length: N }, () => 55 + Math.random() * 45);
  for (let i = 0; i < N; i++) { const b = document.createElement('i'); b.className = 'bar'; b.dataset.i = i; bars.appendChild(b); }
  const barEls = $$('.bar', bars);
  let hold = false;
  $('#tHold').addEventListener('click', e => {
    hold = !hold; e.currentTarget.setAttribute('aria-pressed', String(hold));
    e.currentTarget.textContent = hold ? 'Release' : 'Hold trace';
    sigTile.classList.toggle('held', hold);
  });
  bars.addEventListener('pointermove', e => {
    const b = e.target.closest('.bar'); if (!b) return;
    const i = +b.dataset.i, r = b.getBoundingClientRect(), tr = sigTile.getBoundingClientRect();
    barEls.forEach(x => x.classList.toggle('hot', x === b));
    tip.textContent = `T−${(N - 1 - i) * 1.2}s · ${vals[i].toFixed(1)}%`;
    tip.style.left = (r.left - tr.left + r.width / 2) + 'px';
    tip.style.top = (r.top - tr.top - 8) + 'px';
    tip.classList.add('on');
  });
  bars.addEventListener('pointerleave', () => { tip.classList.remove('on'); barEls.forEach(x => x.classList.remove('hot')); });

  /* Velocity sparkline + unit toggle */
  const vHist = Array.from({ length: 30 }, (_, i) => 7.64 + Math.sin(i / 4) * .015 + Math.random() * .01);
  let kmh = false;
  const velEl = $('#tVel'), velU = $('#tVelU'), trend = $('#tTrend');
  $('#tVelTile').addEventListener('click', () => { kmh = !kmh; render(); gsap.fromTo(velEl, { yPercent: 30, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .4 }); });
  const spark = () => {
    const mn = Math.min(...vHist) - .005, mx = Math.max(...vHist) + .005;
    const pts = vHist.map((v, i) => `${(i / (vHist.length - 1) * 200).toFixed(1)},${(46 - (v - mn) / (mx - mn) * 40).toFixed(1)}`);
    $('#tVelPath').setAttribute('d', 'M' + pts.join(' L'));
    $('#tVelArea').setAttribute('d', 'M0,50 L' + pts.join(' L') + ' L200,50Z');
  };

  /* Distance + unit toggle */
  let km = 4118204550, au = false;
  const distEl = $('#tDist'), distU = $('#tDistU');
  $('#tDistTile').addEventListener('click', () => { au = !au; render(); gsap.fromTo(distEl, { yPercent: 30, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .4 }); });

  /* Orbit: selectable craft */
  const CRAFT = [
    { name: 'Helion-3', d: [['Orbit', 'Inner · 8 h'], ['Range', '12,400 km'], ['Link', '98.2% · OK'], ['Task', 'Spectral pass 214']] },
    { name: 'Relay-2',  d: [['Orbit', 'Middle · 15 h'], ['Range', '38,100 km'], ['Link', '99.6% · OK'], ['Task', 'Data relay']] },
    { name: 'Lander',   d: [['Orbit', 'Outer · 26 h'], ['Range', '71,900 km'], ['Link', '91.0% · WEAK'], ['Task', 'Awaiting window']] },
  ];
  const tabs = $$('.t-crafts button'), detail = $('#tDetail'), dots = $$('.t-orbit b');
  const pick = i => {
    tabs.forEach((t, k) => t.setAttribute('aria-selected', String(k === i)));
    dots.forEach((d, k) => d.classList.toggle('sel', k === i));
    detail.innerHTML = CRAFT[i].d.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    gsap.from(detail.children, { opacity: 0, y: 8, stagger: .05, duration: .4 });
  };
  tabs.forEach((t, i) => t.addEventListener('click', () => pick(i)));
  dots.forEach((d, i) => d.addEventListener('click', () => pick(i)));
  pick(0);

  /* Crew roster */
  const CREW = [['Cmdr. A. Reyes', 'Commander', 'Shift A · awake'], ['Dr. Y. Correth', 'Astronomer', 'Shift A · awake'], ['L. Okafor', 'Pilot', 'Shift B · resting'],
                ['M. Lindqvist', 'Engineer', 'Shift B · resting'], ['Dr. S. Haddad', 'Medic', 'Shift A · awake'], ['K. Mori', 'Geologist', 'Shift C · EVA prep']];
  const crewBox = $('#tCrew'), crewInfo = $('#tCrewInfo');
  CREW.forEach(([n, r, s], i) => {
    const b = document.createElement('button');
    b.className = 't-crewman' + (s.includes('awake') || s.includes('EVA') ? ' awake' : '');
    b.setAttribute('aria-label', `${n}, ${r}, ${s}`);
    b.innerHTML = `<span>${n.split(' ').pop()[0]}</span>`;
    const show = () => { crewInfo.innerHTML = `<b>${n}</b> · ${r}<br><em>${s}</em>`; };
    b.addEventListener('pointerenter', show); b.addEventListener('focus', show); b.addEventListener('click', show);
    crewBox.appendChild(b);
  });

  /* Sol timeline */
  const EV = [['Relay sync', .4], ['EVA · Crimson Flats', 2.1], ['Descent window', 3.6], ['Survey pass 215', 5.2]];
  const sols = $('#tSols'), next = $('#tNext');
  sols.innerHTML = '<i class="now"></i>' + EV.map(([n, d], i) => `<button style="--x:${(d / 6 * 100).toFixed(1)}%" data-i="${i}" aria-label="${n} in ${d} sol"></button>`).join('');
  $$('button', sols).forEach(b => {
    const show = () => { const [n, d] = EV[+b.dataset.i]; next.innerHTML = `Next · <b>${n}</b> in ${d} sol`; };
    b.addEventListener('pointerenter', show); b.addEventListener('focus', show); b.addEventListener('click', show);
  });

  /* Live loop */
  const lat = $('#tLat'), stamp = $('#tStamp'), sig = $('#tSignal'), peak = $('#tPeak');
  let pk = 0;
  function render() {
    const v = vHist[vHist.length - 1];
    velEl.textContent = kmh ? Math.round(v * 3600).toLocaleString('en-US') : v.toFixed(2);
    velU.textContent = kmh ? 'km/h' : 'km/s';
    distEl.textContent = au ? (km / 149597870.7).toFixed(4) : km.toLocaleString('en-US');
    distU.textContent = au ? 'AU' : 'km';
  }
  const tick = () => {
    const d = new Date();
    stamp.textContent = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    lat.textContent = 400 + Math.round(Math.random() * 30);
    if (!hold) {
      vals.shift(); vals.push(52 + Math.random() * 47);
      barEls.forEach((b, i) => b.style.setProperty('--s', (vals[i] / 100).toFixed(3)));
      const s = 97.4 + Math.random() * 1.6; sig.textContent = s.toFixed(1);
      pk = Math.max(pk, s); peak.textContent = pk.toFixed(1);
    }
    const prev = vHist[vHist.length - 1];
    vHist.shift(); vHist.push(gsap.utils.clamp(7.6, 7.7, prev + (Math.random() - .45) * .012));
    trend.textContent = vHist[vHist.length - 1] >= prev ? '▲' : '▼';
    trend.classList.toggle('down', vHist[vHist.length - 1] < prev);
    km += Math.round(7.66 * 1.2 * 60);
    spark(); render();
  };
  tick();
  if (!reduceMotion) setInterval(tick, 1200);
})();

/* ─────────────── Velocity marquee ─────────────── */
(function () {
  const track = $('#marquee1');
  let x = 0, vel = 0;
  lenis.on('scroll', ({ velocity }) => { vel = velocity; });
  gsap.ticker.add(() => {
    if (reduceMotion) return;
    const w = track.scrollWidth / 2;
    x -= .45 + Math.abs(vel) * .12;
    if (x <= -w) x += w;
    track.style.transform = `translate3d(${x}px,0,0)`;
    vel *= .9;
  });
})();

/* ─────────────── Split-word reveals ─────────────── */
$$('.split').forEach(el => {
  let i = 0;
  const wrap = (txt, em) => txt.split(/(\s+)/).map(w => {
    if (!w.trim()) return w;
    const inner = em ? `<em>${w}</em>` : w;
    return `<span class="sw"><span style="--i:${i++}">${inner}</span></span>`;
  }).join('');
  el.innerHTML = [...el.childNodes].map(n => n.nodeType === 3 ? wrap(n.textContent, false) : wrap(n.textContent, true)).join('');
});

const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); }
}), { threshold: .2 });
$$('.split, .w-item, .w-sub, .f-col, .x-sub, .t-sub, .log-sub, .t-tile, .ar-sub').forEach(el => io.observe(el));

/* ─────────────── Worlds index: hover preview + accordion ─────────────── */
(function () {
  const list = $('#wList'), prev = $('#wPreview'), pimg = $('#wPreviewImg');
  const items = $$('.w-item');

  if (finePointer) {
    const xTo = gsap.quickTo(prev, 'x', { duration: .6, ease: 'power3' });
    const yTo = gsap.quickTo(prev, 'y', { duration: .6, ease: 'power3' });
    let lastX = 0, px = 0, py = 0;
    const hide = () => prev.classList.remove('on');

    /* Decide from what is actually under the pointer, so scrolling never leaves it stuck */
    function update(x, y, fromScroll) {
      const el = document.elementFromPoint(x, y);
      const row = el && el.closest('.w-row');
      const it = row && row.closest('.w-item');
      if (!it || it.classList.contains('open') || fromScroll) { hide(); return; }
      if (prev.dataset.cur !== it.dataset.img) {
        pimg.src = it.dataset.img;
        prev.dataset.cur = it.dataset.img;
        prev.style.setProperty('--g', it.dataset.glow);
      }
      if (!prev.classList.contains('on')) gsap.set(prev, { x, y });
      prev.classList.add('on');
    }

    window.addEventListener('pointermove', e => {
      px = e.clientX; py = e.clientY;
      xTo(px); yTo(py);
      gsap.to(pimg, { rotate: gsap.utils.clamp(-18, 18, (px - lastX) * 1.2), duration: .6, overwrite: 'auto' });
      lastX = px;
      update(px, py, false);
    });
    lenis.on('scroll', () => hide());
    document.addEventListener('pointerleave', hide);
  }

  items.forEach(it => {
    const row = $('.w-row', it);
    row.addEventListener('click', () => {
      const open = !it.classList.contains('open');
      items.forEach(o => { o.classList.remove('open'); $('.w-row', o).setAttribute('aria-expanded', 'false'); });
      if (open) { it.classList.add('open'); row.setAttribute('aria-expanded', 'true'); prev.classList.remove('on'); }
      setTimeout(() => ScrollTrigger.refresh(), 800);
    });
  });
})();

/* ─────────────── 3D tilt + specular on glass ─────────────── */
if (finePointer && !reduceMotion) {
  $$('[data-tilt]').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      card.style.setProperty('--rx', ((.5 - py) * 7).toFixed(2) + 'deg');
      card.style.setProperty('--ry', ((px - .5) * 7).toFixed(2) + 'deg');
      card.classList.add('is-tilting');
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg');
      card.classList.remove('is-tilting');
    });
  });
}

/* ─────────────── Signal section ─────────────── */
(function () {
  const c = $('#particles');
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div'), s = Math.random() * 2.2 + .4, d = Math.random() * 9 + 6;
    el.className = 'pt';
    el.style.cssText = `left:${Math.random() * 100}%;bottom:${Math.random() * 50}%;width:${s}px;height:${s}px;--dx:${(Math.random() - .5) * 90}px;animation-duration:${d}s;animation-delay:${-Math.random() * d}s`;
    c.appendChild(el);
  }
})();

gsap.to('#breakBg', { y: '22%', ease: 'none', scrollTrigger: { trigger: '#pbreak', start: 'top bottom', end: 'bottom top', scrub: true } });

(function () {
  const stat = $('#bigStat'), sub = $('#pbSubLbl'), sep = $('#pbSep'), txt = $('#pqText'), attr = $('#pqAttr');
  const words = txt.textContent.trim().split(/\s+/);
  txt.innerHTML = words.map(w => `<span class="pq-w">${w}</span>`).join(' ');
  gsap.set([stat, sub], { opacity: 0, y: 22 });
  gsap.set(sep, { scaleX: 0 });
  gsap.set('.pq-w', { opacity: 0, y: 15 });
  gsap.set(attr, { opacity: 0, y: 10 });
  ScrollTrigger.create({
    trigger: '#pbreak', start: 'top 65%', once: true,
    onEnter() {
      gsap.timeline()
        .to({ v: 0 }, { v: 14000, duration: 2, ease: 'power2.out', onUpdate() { stat.innerHTML = Math.round(this.targets()[0].v).toLocaleString() + '<i>+</i>'; } }, 0)
        .to(stat, { opacity: 1, y: 0, duration: .55 }, 0)
        .to(sub, { opacity: 1, y: 0, duration: .5 }, .3)
        .to(sep, { scaleX: 1, duration: .9, ease: 'expo.out' }, .75)
        .to('.pq-w', { opacity: 1, y: 0, duration: .45, stagger: .055 }, 1.25)
        .to(attr, { opacity: 1, y: 0, duration: .6 }, 1.25 + words.length * .055 + .25);
    }
  });
})();

/* ─────────────── Footer ─────────────── */
$('#fForm').addEventListener('submit', e => {
  e.preventDefault();
  $('#fNote').textContent = 'Transmission received — welcome aboard.';
  e.target.reset();
});

gsap.from('.f-word span', {
  yPercent: 100, duration: 1.2, stagger: .06, ease: 'expo.out',
  scrollTrigger: { trigger: '.f-word', start: 'top 95%' }
});

/* Custom cursor steps back over dense instruments */
document.addEventListener('pointerover', e => {
  const c = document.getElementById('cursor');
  if (c) c.classList.toggle('quiet', !!e.target.closest('.t-tile, .x-vis'));
});
