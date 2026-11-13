/* Designs: home card + Designs page (2D gallery with expand-on-click, 3D gallery with live 3D viewer) */
(function () {
  var PF = window.PF, esc = PF.esc, head = PF.head, empty = PF.empty, ic = PF.ic;
  var THREE_VER = '0.160.0';
  var CDN = 'https://cdn.jsdelivr.net/npm/three@' + THREE_VER + '/';

  /* ---------- tiles ---------- */
  function tile(d, kind, i) {
    var title = d.title || (kind === '3d' ? '3D design' : '2D design');
    var openable = kind === '3d' ? (d.model || d.image) : d.image;
    return '<figure class="tile"' + (openable ? ' data-kind="' + kind + '" data-i="' + i + '" tabindex="0" role="button" aria-label="Open ' + esc(title) + '"' : '') + '>' +
      '<b>' + esc(title) + '</b>' +
      (d.image ? '<img src="' + esc(d.image) + '" alt="' + esc(title) + '" loading="lazy"' + PF.IMGLOAD + '>' : '') +
      (kind === '3d' ? '<span class="t-badge">' + ic('box') + '3D</span>' : '') +
      '<figcaption>' + esc(title) + '</figcaption></figure>';
  }

  /* ---------- viewer ---------- */
  var V = { el: null, list: [], pos: 0, kind: '2d', opener: null, three: null, token: 0, raf: 0 };

  function build() {
    if (V.el) { return; }
    var wrap = document.createElement('div');
    wrap.className = 'dv'; wrap.id = 'dv'; wrap.hidden = true;
    wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-label', 'Design viewer');
    wrap.innerHTML =
      '<button class="dv-x" type="button" aria-label="Close">&times;</button>' +
      '<button class="dv-nav dv-prev" type="button" aria-label="Previous">&#8249;</button>' +
      '<button class="dv-nav dv-next" type="button" aria-label="Next">&#8250;</button>' +
      '<div class="dv-stage" id="dvStage"></div>' +
      '<div class="dv-tools" id="dvTools" hidden>' +
        '<button type="button" id="dvSpin" aria-pressed="true">Auto-rotate</button>' +
        '<button type="button" id="dvReset">Reset view</button>' +
        '<span>Drag to rotate &middot; scroll to zoom &middot; side slider for height</span></div>' +
      '<div class="dv-bar"><b id="dvTitle"></b><span id="dvCount"></span></div>';
    document.body.appendChild(wrap);
    V.el = wrap;
    V.stage = wrap.querySelector('#dvStage');

    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target === V.stage) { close(); }
    });
    wrap.querySelector('.dv-x').addEventListener('click', close);
    wrap.querySelector('.dv-prev').addEventListener('click', function () { go(-1); });
    wrap.querySelector('.dv-next').addEventListener('click', function () { go(1); });
    wrap.querySelector('#dvSpin').addEventListener('click', function () {
      if (!V.three) { return; }
      var on = !V.three.controls.autoRotate;
      V.three.controls.autoRotate = on;
      this.setAttribute('aria-pressed', String(on));
    });
    wrap.querySelector('#dvReset').addEventListener('click', function () { if (V.three) { V.three.reset(); } });

    document.addEventListener('keydown', function (e) {
      if (wrap.hidden) { return; }
      if (e.key === 'Escape') { close(); }
      else if (e.key === 'ArrowLeft') { go(-1); }
      else if (e.key === 'ArrowRight') { go(1); }
      else if (e.key === 'Tab') {            // keep focus inside the viewer
        var f = Array.prototype.filter.call(wrap.querySelectorAll('button'), function (b) { return !b.hidden && b.offsetParent !== null; });
        if (!f.length) { return; }
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    var x0 = null;                           // swipe left/right on phones (2D only; 3D uses touch to rotate)
    wrap.addEventListener('touchstart', function (e) { x0 = V.kind === '2d' && e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
    wrap.addEventListener('touchend', function (e) {
      if (x0 == null) { return; }
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 60) { go(dx < 0 ? 1 : -1); }
    });
  }

  function open(kind, index, opener) {
    build();
    var all = (kind === '3d' ? PF.D.designs3d : PF.D.designs2d) || [];
    V.kind = kind; V.opener = opener || null;
    V.list = all.map(function (d, i) { return { d: d, i: i }; })
      .filter(function (x) { return kind === '3d' ? (x.d.model || x.d.image) : x.d.image; });
    V.pos = Math.max(0, V.list.map(function (x) { return x.i; }).indexOf(index));
    V.el.hidden = false;
    requestAnimationFrame(function () { V.el.classList.add('on'); });
    show();
    V.el.querySelector('.dv-x').focus();
  }

  function close() {
    if (!V.el || V.el.hidden) { return; }
    V.token++;
    disposeThree();
    V.el.classList.remove('on');
    V.el.hidden = true;
    V.stage.innerHTML = '';
    if (V.opener && V.opener.focus) { V.opener.focus(); }
  }

  function go(step) {
    if (V.list.length < 2) { return; }
    V.pos = (V.pos + step + V.list.length) % V.list.length;
    show();
  }

  function show() {
    var item = V.list[V.pos].d, many = V.list.length > 1;
    V.token++;
    disposeThree();
    V.stage.innerHTML = '';
    V.el.querySelector('.dv-prev').hidden = !many;
    V.el.querySelector('.dv-next').hidden = !many;
    V.el.querySelector('#dvTitle').textContent = item.title || (V.kind === '3d' ? '3D design' : '2D design');
    V.el.querySelector('#dvCount').textContent = many ? (V.pos + 1) + ' / ' + V.list.length : '';
    var tools = V.el.querySelector('#dvTools');
    if (V.kind === '3d' && item.model) {
      tools.hidden = false;
      V.el.querySelector('#dvSpin').setAttribute('aria-pressed', String(!PF.reduced));
      show3d(item);
    } else {
      tools.hidden = true;
      var img = document.createElement('img');
      img.className = 'dv-img'; img.alt = item.title || '';
      img.onerror = function () { V.stage.innerHTML = '<p class="dv-msg">Couldn\'t load this image.</p>'; };
      img.src = item.image;
      V.stage.appendChild(img);
    }
  }

  /* ---------- 3D (three.js loaded from a CDN only when a 3D design is opened) ---------- */
  var libs = {};
  function lib(name, path) {
    if (!libs[name]) { libs[name] = import(path ? CDN + path + '/+esm' : CDN + '+esm'); }
    return libs[name];
  }

  function disposeThree() {
    cancelAnimationFrame(V.raf);
    var t = V.three;
    if (!t) { return; }
    V.three = null;
    t.ro.disconnect();
    t.controls.dispose();
    t.scene.traverse(function (o) {
      if (o.geometry) { o.geometry.dispose(); }
      var m = o.material; if (!m) { return; }
      (Array.isArray(m) ? m : [m]).forEach(function (mm) {
        Object.keys(mm).forEach(function (k) { if (mm[k] && mm[k].isTexture) { mm[k].dispose(); } });
        mm.dispose();
      });
    });
    if (t.env) { t.env.dispose(); }
    t.renderer.dispose();
    if (t.renderer.domElement.parentNode) { t.renderer.domElement.parentNode.removeChild(t.renderer.domElement); }
  }

  function msg(text) { V.stage.innerHTML = '<p class="dv-msg">' + esc(text) + '</p>'; }

  async function show3d(item) {
    var token = V.token;
    var ext = String(item.model).split('?')[0].split('.').pop().toLowerCase();
    var loaderFile = { glb: 'GLTFLoader', gltf: 'GLTFLoader', obj: 'OBJLoader', stl: 'STLLoader' }[ext];
    if (!loaderFile) { msg('Unsupported 3D file (.' + ext + '). Use .glb, .gltf, .obj or .stl.'); return; }

    var panel = document.createElement('div');
    panel.className = 'dv-3d';
    var load = document.createElement('div');
    load.className = 'dv-load'; load.innerHTML = '<span>Loading 3D model&hellip;</span><i><u></u></i>';
    panel.appendChild(load);
    V.stage.appendChild(panel);

    try {
      var mods = await Promise.all([
        lib('three', ''),
        lib('orbit', 'examples/jsm/controls/OrbitControls.js'),
        lib('env', 'examples/jsm/environments/RoomEnvironment.js'),
        lib(loaderFile, 'examples/jsm/loaders/' + loaderFile + '.js')
      ]);
      if (token !== V.token) { return; }
      var THREE = mods[0], Loader = mods[3][loaderFile];

      var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      panel.insertBefore(renderer.domElement, load);

      var scene = new THREE.Scene();
      var pmrem = new THREE.PMREMGenerator(renderer);
      var env = pmrem.fromScene(new mods[2].RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
      scene.environment = env;
      scene.add(new THREE.AmbientLight(0xffffff, 0.35));
      var sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(3, 5, 4); scene.add(sun);

      var camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
      var controls = new mods[1].OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; controls.dampingFactor = 0.08;
      controls.autoRotate = !PF.reduced; controls.autoRotateSpeed = 1.6;
      controls.zoomSpeed = 2.4;                 // default is 1 (too sluggish); raise or lower to taste

      function size() {
        var w = panel.clientWidth || 1, h = panel.clientHeight || 1;
        renderer.setSize(w, h, false);
        renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
        camera.aspect = w / h; camera.updateProjectionMatrix();
      }
      var ro = new ResizeObserver(size); ro.observe(panel); size();

      var home = { pos: new THREE.Vector3(), target: new THREE.Vector3(), r: 1 };
      V.three = { renderer: renderer, scene: scene, controls: controls, ro: ro, env: env,
        reset: function () { camera.position.copy(home.pos); controls.target.copy(home.target); controls.update(); } };

      function place(obj) {                      // centre the model and frame it
        var box = new THREE.Box3().setFromObject(obj);
        var sphere = box.getBoundingSphere(new THREE.Sphere());
        obj.position.sub(sphere.center);
        var r = sphere.radius || 1;
        home.r = r;
        var dist = r / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.05;
        camera.near = r / 100; camera.far = r * 100; camera.updateProjectionMatrix();
        home.target.set(0, 0, 0);
        home.pos.set(dist * 0.6, dist * 0.35, dist * 0.8);
        controls.minDistance = r * 0.25; controls.maxDistance = r * 12;
        V.three.reset();
        scene.add(obj);
      }

      var loader = new Loader();
      loader.load(item.model, function (res) {
        if (token !== V.token) { return; }
        var obj;
        if (ext === 'glb' || ext === 'gltf') { obj = res.scene; }
        else if (ext === 'stl') {
          res.computeVertexNormals();
          obj = new THREE.Mesh(res, new THREE.MeshStandardMaterial({ color: 0xd9d4cc, metalness: 0.15, roughness: 0.55 }));
          obj.rotation.x = -Math.PI / 2;         // STL files are usually Z-up
        } else { obj = res; }
        place(obj);
        load.remove();

        // Height slider: moves the camera and its look-at point up/down together, so tall models can be explored
        var hb = document.createElement('div');
        hb.className = 'dv-h'; hb.title = 'Move the camera up or down';
        hb.innerHTML = '<span>&#9650;</span><input type="range" min="-1.2" max="1.2" step="0.005" value="0" aria-label="Camera height"><span>&#9660;</span>';
        panel.appendChild(hb);
        var rng = hb.querySelector('input'), dragging = false;
        rng.addEventListener('pointerdown', function () { dragging = true; });
        ['pointerup', 'pointercancel', 'blur'].forEach(function (ev) { rng.addEventListener(ev, function () { dragging = false; }); });
        rng.addEventListener('input', function () {
          var ny = parseFloat(rng.value) * home.r, dy = ny - controls.target.y;
          camera.position.y += dy; controls.target.y = ny; controls.update();
        });

        (function tick() {
          V.raf = requestAnimationFrame(tick);
          if (!dragging) { rng.value = Math.max(-1.2, Math.min(1.2, controls.target.y / home.r)); }  // follows right-drag / two-finger panning and Reset
          controls.update();
          renderer.render(scene, camera);
        })();
      }, function (e) {
        if (e.lengthComputable) { var u = load.querySelector('u'); if (u) { u.style.width = Math.round(e.loaded / e.total * 100) + '%'; } }
      }, function () {
        if (token === V.token) { load.innerHTML = '<span>Couldn\'t load this model. Check the file path and format.</span>'; }
      });
    } catch (err) {
      if (token === V.token) { load.innerHTML = '<span>The 3D viewer couldn\'t start (no internet, or WebGL is turned off).</span>'; }
    }
  }

  PF.section({
    id: 'designs',
    card: { order: 2, html: function () {
      var d2 = PF.D.designs2d || [], d3 = PF.D.designs3d || [];
      return '<section class="card hc c-designs" data-go="designs" tabindex="0" role="link" aria-label="Open designs">' + head('pen', 'Designs') +
        '<p class="sub">Visual work I\'ve created in 2D and 3D.</p>' +
        '<div class="duo"><div class="duo-tile"><span class="badge">' + ic('image') + '</span><b>2D</b>' + (d2.length ? '<small>' + d2.length + ' works</small>' : '') + '</div>' +
        '<div class="duo-tile"><span class="badge">' + ic('box') + '</span><b>3D</b>' + (d3.length ? '<small>' + d3.length + ' works</small>' : '') + '</div></div></section>';
    } },
    page: { id: 'designs', order: 1, html: function () {
      var d2 = PF.D.designs2d || [], d3 = PF.D.designs3d || [];
      return '<div id="view-designs" class="view"><div class="vhead"><h1>Designs</h1><p>My 2D and 3D work. Click a piece to open it.</p></div>' +
        '<section class="card">' + head('image', '2D Designs') + '<div class="gallery">' +
          (d2.map(function (d, i) { return tile(d, '2d', i); }).join('') || empty('Coming soon.')) + '</div></section>' +
        '<section class="card">' + head('box', '3D Designs') + '<div class="gallery">' +
          (d3.map(function (d, i) { return tile(d, '3d', i); }).join('') || empty('Coming soon.')) + '</div></section></div>';
    } },
    init: function () {
      var view = document.getElementById('view-designs');
      if (!view) { return; }
      function openFrom(el) {
        var t = el.closest('.tile[data-kind]');
        if (t) { open(t.getAttribute('data-kind'), parseInt(t.getAttribute('data-i'), 10), t); }
      }
      view.addEventListener('click', function (e) { openFrom(e.target); });
      view.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.tile[data-kind]')) { e.preventDefault(); openFrom(e.target); }
      });
    }
  });
})();