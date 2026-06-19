(function () {
  console.log('[suit.js] script running');

  if (typeof THREE === 'undefined') {
    console.error('[suit.js] THREE not found');
    return;
  }

  var container = document.getElementById('suitViewer');
  var canvas    = document.getElementById('suitCanvas');
  if (!container || !canvas) { console.error('[suit.js] elements missing'); return; }

  /* ── Renderer ── */
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping    = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;

  /* ── Scene / Camera ── */
  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(46, 1, 0.01, 100);
  camera.position.set(0, 0.2, 4.5);

  /* ── Lighting ── */
  scene.add(new THREE.AmbientLight(0xd4e8ff, 0.55));
  var key = new THREE.DirectionalLight(0xfff4e0, 3.0);
  key.position.set(2.5, 4, 3); scene.add(key);
  var fill = new THREE.DirectionalLight(0x6699ff, 0.8);
  fill.position.set(-3, 1, 2); scene.add(fill);
  var rim = new THREE.DirectionalLight(0xe74c3c, 1.6);
  rim.position.set(0, -0.5, -4); scene.add(rim);
  var top = new THREE.DirectionalLight(0xffffff, 0.35);
  top.position.set(0, 6, 0); scene.add(top);

  /* ── Controls ── */
  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping   = true;
  controls.dampingFactor   = 0.06;
  controls.enableZoom      = false;
  controls.enablePan       = false;
  controls.autoRotate      = true;
  controls.autoRotateSpeed = 0.6;
  controls.target.set(0, 0, 0);
  controls.minPolarAngle   = Math.PI * 0.15;
  controls.maxPolarAngle   = Math.PI * 0.82;

  /* ── Hotspot data ── */
  /* Positions are in world space after the model is scaled to 1.8 units
     and centered at origin (y: -0.90 feet → +0.90 helmet top).        */
  var HOTSPOTS = [
    {
      id: 'helmet', label: 'HELMET ASSEMBLY', icon: '◉',
      pos: new THREE.Vector3(0, 0.72, 0.12),   /* visor / helmet front */
      specs: [['VISOR TINT','GOLD COAT · UV'],['O₂ PRESSURE','8.3 PSI'],['HUD STATUS','ACTIVE'],['CAM SYSTEM','360° / 4K HDR']]
    },
    {
      id: 'chest', label: 'LIFE SUPPORT UNIT', icon: '◈',
      pos: new THREE.Vector3(0.06, 0.22, 0.25), /* chest / torso front */
      specs: [['O₂ SUPPLY','97.4 %'],['PRESSURE','14.7 PSI'],['CO₂ SCRUB','NOMINAL'],['TEMP CTRL','ACTIVE']]
    },
    {
      id: 'arm', label: 'BIOMETRIC MONITOR', icon: '◐',
      pos: new THREE.Vector3(-0.40, 0.04, 0.10), /* left arm */
      specs: [['HEART RATE','72 BPM'],['CORE TEMP','36.8 °C'],['BLOOD O₂','99 %'],['FATIGUE IDX','LOW']]
    },
    {
      id: 'plss', label: 'PLSS BACKPACK', icon: '◧',
      pos: new THREE.Vector3(0, 0.14, -0.22),   /* rear backpack */
      specs: [['BATTERY','87 %'],['PROPULSION','STANDBY'],['AIR SUPPLY','6 h 42 m'],['UPTIME','04:32:17']]
    },
    {
      id: 'legs', label: 'MOBILITY SYSTEM', icon: '◫',
      pos: new THREE.Vector3(0.15, -0.46, 0.15), /* right thigh */
      specs: [['JOINT STATUS','NOMINAL'],['FLEX RANGE','± 45 °'],['SEAL CHECK','INTACT'],['GYRO STAB','ACTIVE']]
    },
  ];

  /* ── DOM ── */
  var overlay   = document.getElementById('hsOverlay');
  var connector = document.getElementById('hsConnector');
  var hint      = document.getElementById('suitHint');

  /* Single label element — repositioned per active hotspot */
  var labelEl = document.createElement('div');
  labelEl.className = 'hs-label';
  overlay.appendChild(labelEl);

  /* ── Build dot elements ── */
  var dotEls  = {};
  var screenPos = {};  /* {sx, sy, visible} per hotspot id */

  HOTSPOTS.forEach(function (hs, i) {
    var dot = document.createElement('div');
    dot.className = 'hs-dot';
    dot.dataset.id = hs.id;
    dot.style.animationDelay = (i * 0.18) + 's';
    dot.innerHTML =
      '<div class="hs-ring r1"></div>' +
      '<div class="hs-ring r2"></div>' +
      '<div class="hs-core"></div>';
    overlay.appendChild(dot);
    dotEls[hs.id] = dot;

    dot.addEventListener('mouseenter', function () {
      dot.classList.add('hs-dot--hover');
      if (!lockedId) setHovered(hs.id);
    });
    dot.addEventListener('mouseleave', function () {
      dot.classList.remove('hs-dot--hover');
      if (!lockedId) setHovered(null);
    });
    dot.addEventListener('click', function (e) {
      e.stopPropagation();
      setLocked(lockedId === hs.id ? null : hs.id);
    });
  });

  /* ── Annotation state ── */
  var hoveredId     = null;
  var lockedId      = null;
  var userInteracted = false;

  /* ── Camera zoom ── */
  var CAM_DEFAULT_POS    = new THREE.Vector3(0, 0.2, 4.5);
  var CAM_DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);
  var ZOOM_DIST = 1.4; /* world units from hotspot to camera */

  function zoomToHotspot(hs) {
    controls.enableDamping = false;
    controls.autoRotate    = false;

    /* Camera position: stay on same side as current camera, just much closer.
       Exception: backpack (z < -0.05) — camera must go behind the suit. */
    var newCamPos;
    if (hs.pos.z < -0.05) {
      newCamPos = { x: hs.pos.x, y: hs.pos.y + 0.05, z: hs.pos.z - ZOOM_DIST };
    } else {
      var dir = new THREE.Vector3()
        .subVectors(camera.position, hs.pos)
        .normalize();
      newCamPos = {
        x: hs.pos.x + dir.x * ZOOM_DIST,
        y: hs.pos.y + dir.y * ZOOM_DIST,
        z: hs.pos.z + dir.z * ZOOM_DIST
      };
    }

    gsap.killTweensOf(camera.position);
    gsap.killTweensOf(controls.target);

    gsap.to(controls.target, {
      x: hs.pos.x, y: hs.pos.y, z: hs.pos.z,
      duration: 1.2, ease: 'power2.inOut'
    });
    gsap.to(camera.position, {
      x: newCamPos.x, y: newCamPos.y, z: newCamPos.z,
      duration: 1.2, ease: 'power2.inOut',
      onComplete: function () { controls.enableDamping = true; }
    });
  }

  function zoomOut() {
    controls.enableDamping = false;

    gsap.killTweensOf(camera.position);
    gsap.killTweensOf(controls.target);

    gsap.to(controls.target, {
      x: CAM_DEFAULT_TARGET.x, y: CAM_DEFAULT_TARGET.y, z: CAM_DEFAULT_TARGET.z,
      duration: 1.0, ease: 'power2.inOut'
    });
    gsap.to(camera.position, {
      x: CAM_DEFAULT_POS.x, y: CAM_DEFAULT_POS.y, z: CAM_DEFAULT_POS.z,
      duration: 1.0, ease: 'power2.inOut',
      onComplete: function () {
        controls.enableDamping = true;
        if (!userInteracted) controls.autoRotate = true;
      }
    });
  }

  function setHovered(id) { hoveredId = id; }
  function setLocked(id) {
    var prev  = lockedId;
    lockedId  = id;
    Object.keys(dotEls).forEach(function (k) {
      dotEls[k].classList.toggle('hs-dot--active', k === id);
    });
    if (!id) {
      hideAnnotation();
      zoomOut();
    } else if (id !== prev) {
      var hs = HOTSPOTS.find(function (h) { return h.id === id; });
      if (hs) zoomToHotspot(hs);
    }
  }
  function activeId() { return lockedId || hoveredId; }

  /* ── Annotation draw ── */
  var LABEL_W  = 200;
  var LABEL_H  = 130;
  var V_PAD    = 20;

  var LABEL_ZONE_R = 0.68; /* left edge of right-side label  (% of width) */
  var LABEL_ZONE_L = 0.32; /* right edge of left-side label  (% of width) */

  var lastActiveId = null;

  function showAnnotation(hs, sx, sy) {
    var w = container.clientWidth, h = container.clientHeight;

    var goRight  = sx > w / 2;
    var labelLeft = goRight ? w * LABEL_ZONE_R : w * LABEL_ZONE_L - LABEL_W;
    var labelTop  = Math.max(V_PAD, Math.min(sy - LABEL_H / 2, h - LABEL_H - V_PAD));
    var labelCY   = labelTop + LABEL_H / 2;

    /* Inner edge of the label — where the line terminates */
    var connEndX = goRight ? labelLeft : labelLeft + LABEL_W;

    /* Elbow: diagonal from dot → sharp corner → horizontal shoulder to label.
       elbowX is 55 px outward from dot, clamped so it stays inside the label zone. */
    var DIAG   = 55;
    var elbowX = goRight
      ? Math.min(sx + DIAG, connEndX - 24)
      : Math.max(sx - DIAG, connEndX + 24);
    /* elbowY is the label's vertical centre — makes the shoulder perfectly flat */
    var elbowY = labelCY;

    /* Path: dot  ──diagonal──▶  elbow  ──horizontal──▶  label edge */
    var d = 'M '  + sx.toFixed(1)       + ' ' + sy.toFixed(1) +
            ' L ' + elbowX.toFixed(1)   + ' ' + elbowY.toFixed(1) +
            ' L ' + connEndX.toFixed(1) + ' ' + elbowY.toFixed(1);

    connector.setAttribute('d', d);

    /* Trigger connector opacity transition when hotspot changes.
       getBBox() forces a real SVG reflow (offsetWidth is 0 on <path>). */
    if (hs.id !== lastActiveId) {
      connector.classList.remove('hsc--on');
      connector.getBBox();
      connector.classList.add('hsc--on');
      lastActiveId = hs.id;
    }

    /* Build label content only when switching hotspot */
    if (hs.id !== labelEl.dataset.hsId) {
      labelEl.dataset.hsId = hs.id;
      labelEl.innerHTML =
        '<div class="hsl-header">' +
          '<span class="hsl-icon">' + hs.icon + '</span>' +
          '<span class="hsl-title">' + hs.label + '</span>' +
        '</div>' +
        '<div class="hsl-rule"></div>' +
        '<div class="hsl-specs">' +
          hs.specs.map(function (r) {
            return '<div class="hsl-row">' +
              '<span class="hsl-k">' + r[0] + '</span>' +
              '<span class="hsl-v">' + r[1] + '</span>' +
            '</div>';
          }).join('') +
        '</div>';
    }

    /* Side-specific classes */
    if (goRight) {
      labelEl.classList.remove('hsl--right');
    } else {
      labelEl.classList.add('hsl--right');
    }

    labelEl.style.left = labelLeft.toFixed(1) + 'px';
    labelEl.style.top  = labelTop.toFixed(1)  + 'px';
    labelEl.classList.add('hsl--visible');
  }

  function hideAnnotation() {
    connector.setAttribute('d', '');
    connector.classList.remove('hsc--on');
    labelEl.classList.remove('hsl--visible');
    lastActiveId  = null;
    labelEl.dataset.hsId = '';
  }

  /* Close on background click */
  canvas.addEventListener('pointerdown', function () {
    hint.style.opacity = '0';
    userInteracted = true;
    if (!lockedId) controls.autoRotate = false;
  }, { once: true });

  container.addEventListener('click', function (e) {
    if (!e.target.closest('.hs-dot')) setLocked(null);
  });

  /* ── Load GLB ── */
  var dracoLoader = new THREE.DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  var loader = new THREE.GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  var mixer = null;

  console.log('[suit.js] loading astronaut_suit.glb');

  loader.load(
    'astronaut_suit.glb',
    function (gltf) {
      console.log('[suit.js] model loaded');
      var model = gltf.scene;
      var box = new THREE.Box3().setFromObject(model);
      var sz  = box.getSize(new THREE.Vector3());
      /* Scale first, then re-center on the scaled bounding box */
      model.scale.setScalar(1.8 / Math.max(sz.x, sz.y, sz.z));
      var box2 = new THREE.Box3().setFromObject(model);
      model.position.sub(box2.getCenter(new THREE.Vector3()));
      scene.add(model);

      if (gltf.animations.length) {
        mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach(function (c) { mixer.clipAction(c).play(); });
      }

      var loading = document.getElementById('suitLoading');
      if (loading) {
        loading.style.transition = 'opacity 0.6s ease';
        loading.style.opacity = '0';
        setTimeout(function () { if (loading.parentNode) loading.remove(); }, 700);
      }

      bootHud();
    },
    function (xhr) {
      if (xhr.total) console.log('[suit.js] ' + Math.round(xhr.loaded / xhr.total * 100) + '%');
    },
    function (err) {
      console.error('[suit.js] load error:', err);
      var loading = document.getElementById('suitLoading');
      if (loading) loading.innerHTML =
        '<span style="font-family:monospace;color:#e74c3c;font-size:11px;letter-spacing:.12em">MODEL UNAVAILABLE</span>';
    }
  );

  /* ── Resize ── */
  function onResize() {
    var w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  onResize();
  new ResizeObserver(onResize).observe(container);

  /* ── Project dots + live annotation update ── */
  var _v = new THREE.Vector3();

  function updateDots() {
    var w = container.clientWidth, h = container.clientHeight;

    HOTSPOTS.forEach(function (hs) {
      _v.copy(hs.pos).project(camera);
      var sx = ( _v.x + 1) / 2 * w;
      var sy = (-_v.y + 1) / 2 * h;
      var vis = _v.z < 1 && sx > 0 && sx < w && sy > 0 && sy < h;

      screenPos[hs.id] = { sx: sx, sy: sy, visible: vis };

      var dot = dotEls[hs.id];
      dot.style.left          = sx + 'px';
      dot.style.top           = sy + 'px';
      dot.style.opacity       = vis ? '1' : '0';
      dot.style.pointerEvents = vis ? 'auto' : 'none';
    });

    /* Update annotation every frame so line tracks the rotating dot */
    var aid = activeId();
    if (aid && screenPos[aid] && screenPos[aid].visible) {
      var sp = screenPos[aid];
      var hs = HOTSPOTS.find(function (h) { return h.id === aid; });
      if (hs) showAnnotation(hs, sp.sx, sp.sy);
    } else {
      hideAnnotation();
    }
  }

  /* ── Render loop ── */
  var clock = new THREE.Clock();
  (function tick() {
    requestAnimationFrame(tick);
    var d = clock.getDelta();
    if (mixer) mixer.update(d);
    controls.update();
    renderer.render(scene, camera);
    updateDots();
  })();

  console.log('[suit.js] running');

  /* ── HUD helpers ── */
  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function hudSet(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function hudFluc(id, base, range, dec, suffix) {
    hudSet(id, (base + (Math.random() - 0.5) * range * 2).toFixed(dec) + suffix);
  }

  function bootHud() {
    var hud = document.getElementById('hud');
    if (!hud) return;

    /* Fade in after short delay */
    setTimeout(function () { hud.classList.add('hud--on'); }, 350);

    /* Mission uptime clock */
    var t0 = Date.now();
    setInterval(function () {
      var s  = Math.floor((Date.now() - t0) / 1000);
      var hh = Math.floor(s / 3600);
      var mm = Math.floor((s % 3600) / 60);
      var ss = s % 60;
      hudSet('hudTimer', pad2(hh) + ':' + pad2(mm) + ':' + pad2(ss));
    }, 1000);

    /* Live telemetry — update every ~2.8 s with small random drift */
    setInterval(function () {
      hudFluc('hudPower',  87.4, 1.5, 1, '%');
      hudFluc('hudOutput', 23.1, 0.9, 1, ' kW');
      hudFluc('hudTemp',   312,  5,   0, ' K');
      hudFluc('hudO2',     99.1, 0.2, 1, '%');
      hudFluc('hudPsi',    14.7, 0.15, 1, ' PSI');
      hudFluc('hudSignal', 98.2, 0.8, 1, '%');
      hudFluc('hudVel',    7.66, 0.04, 2, ' km/s');

      /* Sync power-bar width */
      var pwEl  = document.getElementById('hudPower');
      var pwBar = document.getElementById('hudPowerBar');
      if (pwEl && pwBar) pwBar.style.width = parseFloat(pwEl.textContent) + '%';
    }, 2800);
  }
})();
