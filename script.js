try { if (localStorage.getItem('mg-theme') === 'light') document.documentElement.setAttribute('data-theme', 'light') } catch (e) { }

document.addEventListener('DOMContentLoaded', function () {
(function () {
      var PALETTES = [
        ['#ff9a8b', '#ff6a88', '#ffd3a5', '#a18cd1', '#fbc2eb'],
        ['#12c2e9', '#c471ed', '#f64f59', '#ffd8a8', '#7f7fd5'],
        ['#0f2027', '#2c5364', '#43cea2', '#185a9d', '#b8f3d0'],
        ['#f6d365', '#fda085', '#ff5e62', '#fff1c1', '#b06ab3'],
        ['#1e3c72', '#2a5298', '#6dd5ed', '#e0c3fc', '#8ec5fc'],
        ['#232526', '#ff7e5f', '#feb47b', '#7b4397', '#dc2430']
      ];
      var MAX = 8, MIN = 3;
      var pts = [], sel = 0, soft = 60, grain = 25, pal = 0;
      var $ = function (id) { return document.getElementById(id) };
      var stage = $('stage'), cv = $('cv'), ctx = cv.getContext('2d');

      function hex2rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255] }
      function rnd(a, b) { return a + Math.random() * (b - a) }

      function layout(n) {
        var out = [], cols = Math.ceil(Math.sqrt(n * 1.5)), rows = Math.ceil(n / cols), k = 0;
        for (var r = 0; r < rows; r++)for (var c = 0; c < cols; c++) {
          if (k++ >= n) break;
          out.push({ x: Math.min(.95, Math.max(.05, (c + .5) / cols + rnd(-.12, .12))), y: Math.min(.95, Math.max(.05, (r + .5) / rows + rnd(-.12, .12))) });
        }
        return out;
      }
      function shuffle() {
        var next; do { next = Math.floor(Math.random() * PALETTES.length) } while (next === pal && PALETTES.length > 1);
        pal = next;
        var n = pts.length || 5, p = layout(n), cols = PALETTES[pal].slice().sort(function () { return Math.random() - .5 });
        pts = p.map(function (q, i) { return { x: q.x, y: q.y, c: cols[i % cols.length] } });
        if (sel >= pts.length) sel = 0;
        build();
      }

      function paint(c, w, h, addNoise) {
        var g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
        var cols = pts.map(function (p) { return hex2rgb(p.c) });
        var power = 4.2 - (soft / 100) * 3.2, half = power / 2, asp = w / h, i = 0;
        for (var y = 0; y < h; y++) {
          var fy = y / (h - 1);
          for (var x = 0; x < w; x++) {
            var fx = x / (w - 1), r = 0, gg = 0, b = 0, sum = 0;
            for (var k = 0; k < pts.length; k++) {
              var dx = (fx - pts[k].x) * asp, dy = fy - pts[k].y;
              var wt = 1 / (Math.pow(dx * dx + dy * dy, half) + 1e-4);
              r += cols[k][0] * wt; gg += cols[k][1] * wt; b += cols[k][2] * wt; sum += wt;
            }
            var n = addNoise ? (Math.random() - .5) * grain * .55 : 0;
            d[i++] = r / sum + n; d[i++] = gg / sum + n; d[i++] = b / sum + n; d[i++] = 255;
          }
        }
        g.putImageData(img, 0, 0);
      }

      var queued = false;
      function render() {
        if (queued) return; queued = true;
        requestAnimationFrame(function () {
          queued = false;
          var r = stage.getBoundingClientRect(), s = 1 / 7;
          cv.width = Math.max(40, Math.round(r.width * s));
          cv.height = Math.max(40, Math.round(r.height * s));
          paint(cv, cv.width, cv.height, false);
          $('grain').style.opacity = grain / 100;
        });
      }

      function build() {
        var sw = $('swatches'); sw.innerHTML = '';
        pts.forEach(function (p, i) {
          var b = document.createElement('button');
          b.className = 'sw' + (i === sel ? ' on' : ''); b.style.background = p.c;
          b.setAttribute('aria-label', 'Colour point ' + (i + 1) + ', ' + p.c);
          b.onclick = function () { sel = i; build() };
          sw.appendChild(b);
        });
        stage.querySelectorAll('.handle').forEach(function (h) { h.remove() });
        pts.forEach(function (p, i) {
          var h = document.createElement('div');
          h.className = 'handle' + (i === sel ? ' on' : ''); h.tabIndex = 0;
          h.style.left = p.x * 100 + '%'; h.style.top = p.y * 100 + '%'; h.style.background = p.c;
          h.setAttribute('aria-label', 'Move colour point ' + (i + 1));
          h.addEventListener('pointerdown', function (e) {
            e.preventDefault(); h.setPointerCapture(e.pointerId);
            if (sel !== i) { sel = i; syncSel() }
            var mv = function (ev) {
              var r = stage.getBoundingClientRect();
              p.x = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
              p.y = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
              h.style.left = p.x * 100 + '%'; h.style.top = p.y * 100 + '%'; render();
            };
            var up = function () { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up) };
            h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up);
          });
          h.addEventListener('keydown', function (e) {
            var st = e.shiftKey ? .05 : .01, m = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
            if (!m) return; e.preventDefault();
            p.x = Math.min(1, Math.max(0, p.x + m[0])); p.y = Math.min(1, Math.max(0, p.y + m[1]));
            h.style.left = p.x * 100 + '%'; h.style.top = p.y * 100 + '%'; render();
          });
          stage.appendChild(h);
        });
        $('picker').value = pts[sel].c; $('hex').textContent = pts[sel].c.toUpperCase();
        $('add').disabled = pts.length >= MAX; $('del').disabled = pts.length <= MIN;
        render();
      }
      function syncSel() {
        document.querySelectorAll('.sw').forEach(function (e, i) { e.classList.toggle('on', i === sel) });
        document.querySelectorAll('.handle').forEach(function (e, i) { e.classList.toggle('on', i === sel) });
        $('picker').value = pts[sel].c; $('hex').textContent = pts[sel].c.toUpperCase();
      }

      $('picker').addEventListener('input', function (e) {
        pts[sel].c = e.target.value;
        $('hex').textContent = e.target.value.toUpperCase();
        document.querySelectorAll('.sw')[sel].style.background = e.target.value;
        document.querySelectorAll('.handle')[sel].style.background = e.target.value;
        render();
      });
      $('add').onclick = function () {
        if (pts.length >= MAX) return;
        var cols = PALETTES[pal];
        pts.push({ x: rnd(.15, .85), y: rnd(.15, .85), c: cols[Math.floor(Math.random() * cols.length)] });
        sel = pts.length - 1; build();
      };
      $('del').onclick = function () {
        if (pts.length <= MIN) return;
        pts.splice(sel, 1); sel = Math.max(0, sel - 1); build();
      };
      $('soft').oninput = function (e) { soft = +e.target.value; render() };
      $('grainR').oninput = function (e) { grain = +e.target.value; render() };
      $('shuffle').onclick = shuffle;
      window.addEventListener('resize', render);

      function toast(t) { var el = $('toast'); el.textContent = t; el.classList.add('show'); setTimeout(function () { el.classList.remove('show') }, 1800) }

      function cssText() {
        var layers = pts.map(function (p) {
          return 'radial-gradient(at ' + Math.round(p.x * 100) + '% ' + Math.round(p.y * 100) + '%, ' + p.c + ' 0px, transparent 55%)';
        });
        return 'background-color: ' + pts[0].c + ';\nbackground-image: ' + layers.join(',\n  ') + ';';
      }
      $('export').onclick = function () {
        var r = stage.getBoundingClientRect(), long = 1800, k = long / Math.max(r.width, r.height);
        var c = document.createElement('canvas'); c.width = Math.round(r.width * k); c.height = Math.round(r.height * k);
        paint(c, c.width, c.height, true);
        var url = c.toDataURL('image/png');
        lastExport = c; $('out').src = url; $('css').textContent = cssText();
        $('dlg').showModal();
      };
      $('close').onclick = function () { $('dlg').close() };
      $('dlg').addEventListener('click', function (e) { if (e.target === $('dlg')) $('dlg').close() });
      $('copy').onclick = function () {
        var t = cssText();
        try {
          navigator.clipboard.writeText(t).then(function () { toast('CSS copied') }, function () { fallback(t) });
        } catch (e) { fallback(t) }
      };
      function fallback(t) {
        var s = window.getSelection(), r = document.createRange(); r.selectNodeContents($('css')); s.removeAllRanges(); s.addRange(r);
        try { document.execCommand('copy'); toast('CSS copied') } catch (e) { toast('Select the CSS and copy it') }
      }

      var lastExport = null;
      async function saveCanvas(c, name) {
        var blob = await new Promise(function (r) { c.toBlob(r, 'image/png') });
        try {
          var dl = window.claude && await window.claude.use('downloads');
          if (dl) { await dl.save({ filename: name, data: blob }); toast('Saved ' + name); return }
        } catch (e) { if (e && e.code === 'declined') return }
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
      }
      $('dl').onclick = function () { if (lastExport) saveCanvas(lastExport, 'mesh-gradient.png') };

      var PRESETS = [
        { n: 'Sunset Haze', s: 60, p: [[.1, .15, '#ff9a8b'], [.85, .1, '#ff6a88'], [.5, .55, '#ffd3a5'], [.15, .9, '#a18cd1'], [.9, .85, '#fbc2eb']] },
        { n: 'Ocean Drift', s: 60, p: [[.1, .2, '#0f2027'], [.8, .15, '#2c5364'], [.45, .6, '#43cea2'], [.12, .95, '#185a9d'], [.92, .9, '#b8f3d0']] },
        { n: 'Cotton Candy', s: 65, p: [[.1, .1, '#fbc2eb'], [.9, .2, '#a6c1ee'], [.5, .5, '#fdfbfb'], [.2, .9, '#ffd1ff'], [.85, .85, '#c2e9fb']] },
        { n: 'Aurora', s: 55, p: [[.15, .2, '#0b1026'], [.7, .1, '#1de9b6'], [.4, .55, '#7c4dff'], [.9, .7, '#00b0ff'], [.1, .95, '#0b1026']] },
        { n: 'Golden Hour', s: 60, p: [[.1, .1, '#f6d365'], [.9, .15, '#fda085'], [.5, .5, '#ff5e62'], [.15, .9, '#fff1c1'], [.9, .9, '#b06ab3']] },
        { n: 'Lavender Mist', s: 70, p: [[.1, .2, '#e0c3fc'], [.85, .1, '#8ec5fc'], [.5, .6, '#f5f0ff'], [.9, .9, '#c4b5fd'], [.1, .95, '#fbcfe8']] },
        { n: 'Midnight Ember', s: 55, p: [[.1, .15, '#232526'], [.8, .2, '#7b4397'], [.5, .55, '#dc2430'], [.15, .9, '#ff7e5f'], [.9, .9, '#feb47b']] },
        { n: 'Mint Fresh', s: 65, p: [[.1, .1, '#d4fc79'], [.9, .2, '#96e6a1'], [.5, .55, '#84fab0'], [.15, .9, '#8fd3f4'], [.9, .9, '#e0f7fa']] },
        { n: 'Berry Blast', s: 55, p: [[.1, .2, '#8e2de2'], [.85, .1, '#f857a6'], [.5, .5, '#ff5858'], [.2, .9, '#4a00e0'], [.9, .85, '#ffb347']] },
        { n: 'Sky Cloud', s: 70, p: [[.1, .1, '#4facfe'], [.9, .15, '#00f2fe'], [.5, .55, '#e0f2ff'], [.12, .92, '#667eea'], [.9, .9, '#ffffff']] },
        { n: 'Rosewood', s: 60, p: [[.1, .15, '#3a1c32'], [.85, .2, '#b5446e'], [.5, .55, '#f4a6a6'], [.15, .92, '#7a2e4d'], [.9, .9, '#ffd6c9']] },
        { n: 'Neon Pool', s: 70, p: [[.1, .2, '#12c2e9'], [.85, .1, '#c471ed'], [.5, .55, '#f64f59'], [.15, .95, '#7f7fd5'], [.9, .9, '#ffd8a8']] }
      ];
      var T = [
        [[.1, .15], [.85, .1], [.5, .55], [.15, .9], [.9, .85]],
        [[.15, .1], [.9, .3], [.4, .5], [.1, .8], [.75, .95]],
        [[.05, .5], [.5, .08], [.95, .45], [.5, .95], [.5, .5]],
        [[.2, .2], [.8, .2], [.2, .8], [.8, .8], [.5, .5]],
        [[0, 0], [1, .15], [.6, .6], [.1, .95], [.95, 1]],
        [[.3, .05], [.95, .2], [.05, .55], [.7, .7], [.4, .98]]
      ];
      [
        ['Peach Fuzz', 65, 1, '#ffe0cc', '#ffb4a2', '#e5989b', '#ffcdb2', '#b5838d'],
        ['Citrus Pop', 60, 2, '#fff176', '#ffb74d', '#ff8a65', '#aeea00', '#ffee58'],
        ['Deep Space', 55, 3, '#0b0d21', '#1b1464', '#5b2a86', '#0f3460', '#e94560'],
        ['Forest Floor', 60, 4, '#1b4332', '#2d6a4f', '#74c69d', '#d8f3dc', '#95d5b2'],
        ['Bubblegum', 60, 5, '#ff9ff3', '#feca57', '#48dbfb', '#ff6b6b', '#f368e0'],
        ['Desert Dusk', 60, 0, '#e9c46a', '#f4a261', '#e76f51', '#264653', '#2a9d8f'],
        ['Arctic Frost', 70, 2, '#e0f7fa', '#b3e5fc', '#81d4fa', '#ffffff', '#cfd8dc'],
        ['Plum Wine', 55, 1, '#4a148c', '#880e4f', '#c2185b', '#6a1b9a', '#f48fb1'],
        ['Spring Meadow', 65, 3, '#c5e1a5', '#fff59d', '#a5d6a7', '#80deea', '#f8bbd0'],
        ['Copper Sky', 55, 4, '#2b1d3a', '#6d3b6e', '#d9774b', '#f2b36d', '#4a5a8a'],
        ['Pearl', 70, 5, '#fdfbfb', '#ebedee', '#f3e7e9', '#e3eeff', '#fff5f0'],
        ['Electric Violet', 55, 0, '#4776e6', '#8e54e9', '#b721ff', '#21d4fd', '#6a11cb'],
        ['Coral Reef', 60, 2, '#ff7e67', '#ffb3a7', '#00b4a6', '#006d77', '#ffddd2'],
        ['Smoky Quartz', 65, 1, '#3d3a4b', '#6b6678', '#b8a9c9', '#e2d9f3', '#8a7fa0'],
        ['Tropical Punch', 55, 4, '#ff4e50', '#f9d423', '#fc913a', '#ff6f91', '#00c9a7'],
        ['Mocha Cream', 65, 3, '#4e342e', '#8d6e63', '#d7ccc8', '#efebe9', '#a1887f'],
        ['Ice Cream', 70, 5, '#ffd6e0', '#c1f0ff', '#fff4c1', '#d9c2ff', '#c8f7dc'],
        ['Northern Lights', 55, 0, '#0f2027', '#00c9a7', '#845ec2', '#00d2ff', '#1b1b3a'],
        ['Lemonade', 65, 2, '#fff9c4', '#ffe082', '#ffccbc', '#f8bbd0', '#b2ebf2'],
        ['Indigo Night', 55, 1, '#0d1b4c', '#283593', '#5c6bc0', '#9fa8da', '#311b92'],
        ['Rose Quartz', 70, 4, '#f7cac9', '#f4a6b7', '#fbe3e8', '#d6a5c0', '#fff0f3'],
        ['Jungle Fever', 55, 3, '#00b09b', '#96c93d', '#f9d423', '#ff4b2b', '#134e5e'],
        ['Cherry Cola', 55, 5, '#3b0a1a', '#8b1e3f', '#d7263d', '#f46036', '#2e1a47'],
        ['Seafoam', 65, 0, '#a8edea', '#fed6e3', '#84fab0', '#8fd3f4', '#e0fff4'],
        ['Dusty Blue', 70, 2, '#cfdcec', '#9db4cf', '#6f8fb3', '#e8eef5', '#b7c9dc'],
        ['Mango Tango', 60, 1, '#ffb347', '#ffcc33', '#ff6f61', '#ff9a44', '#fff0c2'],
        ['Twilight', 55, 4, '#2c3e50', '#4ca1af', '#c471ed', '#f64f59', '#1a1a2e'],
        ['Matcha Latte', 65, 3, '#d4e09b', '#a3b18a', '#588157', '#f6f4d2', '#cbdfbd'],
        ['Vaporwave', 55, 5, '#ff71ce', '#01cdfe', '#05ffa1', '#b967ff', '#fffb96'],
        ['Slate and Gold', 60, 0, '#1f2933', '#3e4c59', '#7b8794', '#e0b252', '#f5e6c4'],
        ['Lilac Dream', 70, 2, '#d8b4fe', '#a5b4fc', '#f0abfc', '#c7d2fe', '#fbcfe8'],
        ['Fire and Ice', 55, 1, '#ff512f', '#dd2476', '#4facfe', '#00f2fe', '#ffffff'],
        ['Olive Grove', 60, 4, '#606c38', '#283618', '#fefae0', '#dda15e', '#bc6c25'],
        ['Cyan Pulse', 55, 3, '#00c6ff', '#0072ff', '#7ee8fa', '#eec0c6', '#1e3a8a'],
        ['Honey Butter', 65, 5, '#fff3b0', '#ffd166', '#f4a261', '#fde2b3', '#e9c46a'],
        ['Orchid Bloom', 60, 0, '#da70d6', '#ff9de2', '#7b2cbf', '#ffd6ff', '#9d4edd'],
        ['Storm Cloud', 60, 2, '#232526', '#414345', '#6c7a89', '#a3b1c2', '#1c2833'],
        ['Cosmic Latte', 70, 1, '#fff8e7', '#f3d9b1', '#d4a5a5', '#a1c4fd', '#c2e9fb']
      ].forEach(function (r) {
        PRESETS.push({ n: r[0], s: r[1], p: T[r[2]].map(function (q, i) { return [q[0], q[1], r[3 + i]] }) });
      });
      function toPts(P) { return P.p.map(function (a) { return { x: a[0], y: a[1], c: a[2] } }) }
      function drawPreset(c, P, noise) {
        var sp = pts, ss = soft, sg = grain;
        pts = toPts(P); soft = P.s; grain = 25;
        try { paint(c, c.width, c.height, noise) } finally { pts = sp; soft = ss; grain = sg }
      }
      var IC = {
        dl: '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/>',
        out: '<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/>',
        shuffle: '<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="M4 4l5 5"/>',
        plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
        minus: '<path d="M5 12h14"/>',
        copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
        x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
        edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
        grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
        sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15v4"/><path d="M17 17h4"/>',
        left: '<path d="m15 18-6-6 6-6"/>',
        right: '<path d="m9 18 6-6-6-6"/>',
        up: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>',
        moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'
      };
      function ic(n) { return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>' }
      document.querySelectorAll('[data-ic]').forEach(function (el) { el.insertAdjacentHTML('afterbegin', ic(el.getAttribute('data-ic'))) });

      var root = document.documentElement;
      function setTheme(t, save) {
        root.setAttribute('data-theme', t);
        var b = $('theme'), next = t === 'dark' ? 'light' : 'dark';
        b.innerHTML = '<span class="seg' + (t === 'light' ? ' on' : '') + '">' + ic('sun') + '</span><span class="seg' + (t === 'dark' ? ' on' : '') + '">' + ic('moon') + '</span>';
        b.setAttribute('aria-label', 'Switch to ' + next + ' mode'); b.title = 'Switch to ' + next + ' mode';
        var m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t === 'dark' ? '#26282c' : '#f4f4f6';
        if (save) { try { localStorage.setItem('mg-theme', t) } catch (e) { } }
      }
      var savedTheme = null; try { savedTheme = localStorage.getItem('mg-theme') } catch (e) { }
      setTheme(savedTheme === 'light' ? 'light' : 'dark', false);
      $('theme').onclick = function () { setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true) };

      var PER = 10, page = 0;
      function go(n) { page = n; renderPage(); $('gallery').scrollIntoView({ behavior: 'smooth' }) }
      function renderPager() {
        var pages = Math.ceil(PRESETS.length / PER), nav = $('pager');
        nav.innerHTML = '';
        function mk(html, label, fn, dis, cur) {
          var b = document.createElement('button'); b.innerHTML = html; b.setAttribute('aria-label', label);
          b.disabled = !!dis; if (cur) b.setAttribute('aria-current', 'page'); b.onclick = fn; nav.appendChild(b);
        }
        mk(ic('left') + '<span>Previous</span>', 'Previous page', function () { go(page - 1) }, page === 0);
        for (var i = 0; i < pages; i++)(function (i) { mk(String(i + 1), 'Page ' + (i + 1), function () { go(i) }, false, i === page) })(i);
        mk('<span>Next</span>' + ic('right'), 'Next page', function () { go(page + 1) }, page === pages - 1);
        $('count').textContent = 'Showing ' + (page * PER + 1) + '\u2013' + Math.min(PRESETS.length, (page + 1) * PER) + ' of ' + PRESETS.length + ' gradients';
      }
      function renderPage() {
        $('grid').innerHTML = '';
        PRESETS.slice(page * PER, page * PER + PER).forEach(function (P) {
          var card = document.createElement('div'); card.className = 'card';
          var th = document.createElement('div'); th.className = 'thumb';
          var c = document.createElement('canvas'); c.width = 240; c.height = 150;
          drawPreset(c, P, false);
          var g = document.createElement('div'); g.className = 'grain';
          th.appendChild(c); th.appendChild(g);
          var row = document.createElement('div'); row.className = 'cardrow';
          row.innerHTML = '<b></b><button class="btn soft" title="Edit in generator" aria-label="Edit in generator">' + ic('edit') + '<span>Edit</span></button><button class="btn main" title="Download PNG" aria-label="Download PNG">' + ic('dl') + '<span>Download</span></button>';
          row.children[0].textContent = P.n;
          row.children[1].onclick = function () {
            pts = toPts(P); soft = P.s; grain = 25; sel = 0;
            $('soft').value = soft; $('grainR').value = grain;
            build(); window.scrollTo({ top: 0, behavior: 'smooth' });
          };
          row.children[2].onclick = function () {
            var big = document.createElement('canvas'); big.width = 2400; big.height = 1500;
            drawPreset(big, P, true);
            saveCanvas(big, P.n.toLowerCase().replace(/\s+/g, '-') + '.png');
          };
          card.appendChild(th); card.appendChild(row); $('grid').appendChild(card);
        });
        renderPager();
      }
      renderPage();

      pts = layout(5).map(function (q, i) { return { x: q.x, y: q.y, c: PALETTES[0][i] } });
      build();
    })();
});
