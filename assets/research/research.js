/* The Research page: tabs and the small interactive figures. */
(function () {
  "use strict";
  var root = document.getElementById("research-work");
  if (!root) return;
  var SVGNS = "http://www.w3.org/2000/svg";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Tabs */
  var tabs = Array.prototype.slice.call(root.querySelectorAll(".rw-tab"));
  var panels = {};
  tabs.forEach(function (t) { panels[t.dataset.tab] = document.getElementById(t.dataset.tab); });

  function select(id, opts) {
    opts = opts || {};
    if (!panels[id]) return;
    tabs.forEach(function (t) {
      var on = t.dataset.tab === id;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      panels[t.dataset.tab].hidden = !on;
    });
    if (opts.focus) {
      tabs.filter(function (t) { return t.dataset.tab === id; })[0].focus();
    }
    if (opts.hash) {
      try { history.replaceState(null, "", location.pathname + location.search + "#" + id); } catch (e) { location.hash = id; }
    }
    if (opts.scroll) {
      var top = panels[id].getBoundingClientRect().top + window.pageYOffset - 90;
      if (window.innerWidth <= 900 || panels[id].getBoundingClientRect().top < 0) {
        window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });
      }
    }
    document.dispatchEvent(new CustomEvent("rw:tab", { detail: id }));
  }

  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { select(t.dataset.tab, { hash: true, scroll: true }); });
    t.addEventListener("keydown", function (e) {
      var n = tabs.length, j = null;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") j = (i + 1) % n;
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") j = (i + n - 1) % n;
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = n - 1;
      if (j !== null) {
        e.preventDefault();
        select(tabs[j].dataset.tab, { focus: true, hash: true });
      }
    });
  });
  root.querySelectorAll("[data-goto]").forEach(function (b) {
    b.addEventListener("click", function () { select(b.dataset.goto, { hash: true, scroll: true }); });
  });
  function fromHash() {
    var h = (location.hash || "").replace("#", "");
    if (panels[h]) select(h);
  }
  window.addEventListener("hashchange", fromHash);
  fromHash();

  /* MPT: models as events */
  (function () {
    var slider = document.getElementById("mpt-train");
    if (!slider) return;
    var m = document.getElementById("mpt-m"), mf = document.getElementById("mpt-m-fill");
    var lab = document.getElementById("mpt-m-label"), out = document.getElementById("mpt-train-out");
    var S = { cx: 400, cy: 165, rx: 130, ry: 105 };
    function inside(x, y, e) {
      var dx = (x - e.cx) / e.rx, dy = (y - e.cy) / e.ry;
      return dx * dx + dy * dy <= 1;
    }
    function update() {
      var t = slider.value / 100;
      var M = { cx: 150 + t * 250, cy: 165, rx: 125 + t * 10, ry: 110 + t * 2 };
      [m, mf].forEach(function (el) {
        el.setAttribute("cx", M.cx.toFixed(1));
        el.setAttribute("rx", M.rx.toFixed(1));
        el.setAttribute("ry", M.ry.toFixed(1));
      });
      lab.setAttribute("x", (M.cx - 70).toFixed(1));
      var both = 0, star = 0;
      for (var x = 270; x <= 530; x += 4) {
        for (var y = 60; y <= 270; y += 4) {
          if (inside(x, y, S)) {
            star += 1;
            if (inside(x, y, M)) both += 1;
          }
        }
      }
      out.textContent = "overlap " + (both / star).toFixed(2);
    }
    slider.addEventListener("input", update);
    update();
  })();

  /* MPT: the bound on eight states */
  (function () {
    var box = document.getElementById("mpt-bars");
    if (!box) return;
    var beta = document.getElementById("mpt-beta"), alpha = document.getElementById("mpt-alpha");
    var bo = document.getElementById("mpt-beta-out"), ao = document.getElementById("mpt-alpha-out");
    var readout = document.getElementById("mpt-readout");
    var shape = [0.2, 1.0, 2.2, 0.6, 1.6, 0.1, 0.9, 0.4];
    var K = shape.length, prior = 1 / K, FULL = 0.6;
    var bars = shape.map(function (_, i) {
      var b = document.createElement("div");
      b.className = "rw-bar";
      b.innerHTML = '<div class="prior"></div><div class="model"></div><div class="lab">z' + (i + 1) + "</div>";
      box.appendChild(b);
      b.querySelector(".prior").style.height = "calc(" + (prior / FULL * 100).toFixed(2) + "% - " + (22 * prior / FULL).toFixed(1) + "px)";
      return b;
    });
    function update() {
      var bt = beta.value / 10, a = Number(alpha.value);
      var w = shape.map(function (s) { return Math.exp(bt * s); });
      var Z = w.reduce(function (x, y) { return x + y; }, 0);
      var q = w.map(function (x) { return x / Z; });
      var ratios = q.map(function (x) { return prior / x; });
      var minR = Math.min.apply(null, ratios), argmin = ratios.indexOf(minR);
      var soft = Math.pow(ratios.reduce(function (s, r) { return s + Math.pow(r, -a); }, 0), -1 / a);
      bars.forEach(function (b, i) {
        var h = Math.min(q[i] / FULL, 1);
        b.querySelector(".model").style.height = "calc(" + (h * 100).toFixed(2) + "% - " + (22 * h).toFixed(1) + "px)";
        b.classList.toggle("is-min", i === argmin);
      });
      bo.textContent = bt === 0 ? "agrees with the prior" : "β = " + bt.toFixed(1);
      ao.textContent = "α = " + a;
      readout.innerHTML = "P(M) ≤ <b>" + minR.toFixed(3) + "</b> &nbsp;·&nbsp; softmin at α = " + a + ": <b>" + soft.toFixed(3) +
        "</b> &nbsp;·&nbsp; information −log₂ P(M) = <b>" + (-Math.log(minR) / Math.LN2).toFixed(2) + " bits</b>";
    }
    beta.addEventListener("input", update);
    alpha.addEventListener("input", update);
    update();
  })();

  /* OOD: energy landscape */
  (function () {
    var svg = document.getElementById("ood-energy");
    if (!svg) return;
    var curve = document.getElementById("ood-curve"), ghost = document.getElementById("ood-curve-base");
    var pts = document.getElementById("ood-points");
    var xs = [90, 135, 175, 230, 280, 330, 385, 430];
    var raw = [0.9, 0.35, 2.6, 0.55, 1.9, 0.4, 0.7, 0.3];
    var X0 = 40, X1 = 610, BASE = 250, H = 175;
    function heights(on) {
      if (!on) return raw.slice();
      var c = raw.map(function (h) { return Math.pow(h, 0.35); });
      var mx = Math.max.apply(null, c);
      return c.map(function (h) { return h / mx * 1.25; });
    }
    function f(x, hs) {
      var s = 0.04;
      for (var i = 0; i < xs.length; i += 1) {
        var d = (x - xs[i]) / 22;
        s += hs[i] * Math.exp(-d * d);
      }
      return s;
    }
    function path(hs) {
      var d = "", y;
      for (var x = X0; x <= X1; x += 5) {
        y = BASE - Math.min(f(x, hs) / 2.7, 1) * H;
        d += (x === X0 ? "M" : " L") + x + " " + y.toFixed(1);
      }
      return d;
    }
    xs.forEach(function () {
      var c = document.createElementNS(SVGNS, "circle");
      c.setAttribute("r", "5");
      c.setAttribute("fill", "#fff");
      c.style.transition = reduceMotion ? "none" : "cy 0.6s ease";
      pts.appendChild(c);
    });
    function draw(on) {
      var hs = heights(on), other = heights(!on);
      curve.setAttribute("d", path(hs));
      ghost.setAttribute("d", path(other));
      Array.prototype.forEach.call(pts.children, function (c, i) {
        c.setAttribute("cx", xs[i]);
        c.setAttribute("cy", (BASE - Math.min(f(xs[i], hs) / 2.7, 1) * H).toFixed(1));
      });
      svg.parentNode.querySelectorAll("[data-ood]").forEach(function (b) {
        b.setAttribute("aria-pressed", (b.dataset.ood === "on") === on ? "true" : "false");
      });
    }
    svg.parentNode.querySelectorAll("[data-ood]").forEach(function (b) {
      b.addEventListener("click", function () { draw(b.dataset.ood === "on"); });
    });
    draw(true);
  })();

  /* Rejection sampling, live */
  (function () {
    var svg = document.getElementById("rs-svg");
    if (!svg) return;
    var gT = document.getElementById("rs-target"), gS = document.getElementById("rs-stacks"), gD = document.getElementById("rs-drops");
    var readout = document.getElementById("rs-readout");
    var playBtn = document.getElementById("rs-play");
    var panel = document.getElementById("sampling");
    var shapes = [
      [0.06, 0.10, 0.17, 0.22, 0.18, 0.12, 0.09, 0.06],
      [0.03, 0.04, 0.06, 0.44, 0.22, 0.10, 0.07, 0.04],
      [0.11, 0.14, 0.13, 0.12, 0.12, 0.13, 0.13, 0.12]
    ];
    var si = 0, q, beta, K = 8, p = 1 / K;
    var X0 = 40, W = 70, BASE = 290, TOP = 40, MAXH = 220;
    var counts, tried, accepted, drops = [], playing = !reduceMotion, last = 0, spawnAcc = 0, raf = null;
    var stacks = [];

    function el(name, attrs, parent) {
      var e = document.createElementNS(SVGNS, name);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      parent.appendChild(e);
      return e;
    }
    function setup() {
      q = shapes[si];
      beta = Math.max.apply(null, q.map(function (x) { return x / p; }));
      counts = q.map(function () { return 0; });
      tried = 0; accepted = 0; drops = [];
      while (gT.firstChild) gT.removeChild(gT.firstChild);
      while (gS.firstChild) gS.removeChild(gS.firstChild);
      while (gD.firstChild) gD.removeChild(gD.firstChild);
      var qmax = Math.max.apply(null, q);
      stacks = q.map(function (qi, i) {
        var h = qi / qmax * MAXH;
        el("rect", { x: X0 + i * W + 8, y: BASE - h, width: W - 16, height: h, rx: 3, "class": "s-target" }, gT);
        el("text", { x: X0 + i * W + W / 2, y: BASE + 22, "text-anchor": "middle", "class": "s-label" }, gT).textContent = "v" + (i + 1);
        return el("rect", { x: X0 + i * W + 14, y: BASE, width: W - 28, height: 0, rx: 2, "class": "s-acc" }, gS);
      });
      el("text", { x: X0, y: 24, "class": "s-label" }, gT).textContent = "mother p: uniform";
      if (reduceMotion) { for (var n = 0; n < 1500; n += 1) propose(false); }
      render();
    }
    function propose(animate) {
      var i = Math.floor(Math.random() * K);
      var acc = Math.random() < q[i] / (beta * p);
      tried += 1;
      if (!animate) { if (acc) { accepted += 1; counts[i] += 1; } return; }
      var c = el("circle", { cx: X0 + i * W + W / 2 + (Math.random() - 0.5) * 30, cy: TOP - 10, r: 4.5, "class": acc ? "s-drop-acc" : "s-drop-rej" }, gD);
      drops.push({ el: c, i: i, acc: acc, y: TOP - 10, v: 160 + Math.random() * 60, life: 1 });
    }
    function render() {
      var qmax = Math.max.apply(null, q);
      stacks.forEach(function (r, i) {
        var h = accepted ? (counts[i] / accepted) / qmax * MAXH : 0;
        h = Math.min(h, MAXH + 30);
        r.setAttribute("y", (BASE - h).toFixed(1));
        r.setAttribute("height", h.toFixed(1));
      });
      var rate = tried ? accepted / tried : 0;
      readout.innerHTML = "proposed <b>" + tried + "</b> &nbsp;·&nbsp; accepted <b>" + accepted + "</b> &nbsp;·&nbsp; acceptance rate <b>" +
        rate.toFixed(3) + "</b> &nbsp;·&nbsp; min p/q, the probability of the model: <b>" + (1 / beta).toFixed(3) + "</b>";
    }
    function step(t) {
      raf = null;
      if (!playing || panel.hidden || document.hidden) { last = 0; return; }
      var dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
      last = t;
      spawnAcc += dt * 26;
      while (spawnAcc >= 1) { propose(true); spawnAcc -= 1; }
      var keep = [];
      drops.forEach(function (d) {
        var stop = d.acc ? BASE - 6 : TOP + 120;
        if (d.y < stop) {
          d.y += d.v * dt;
          d.el.setAttribute("cy", d.y.toFixed(1));
          keep.push(d);
        } else if (d.acc) {
          accepted += 1; counts[d.i] += 1;
          d.el.parentNode.removeChild(d.el);
        } else {
          d.life -= dt * 2.5;
          if (d.life > 0) { d.el.setAttribute("opacity", d.life.toFixed(2)); keep.push(d); }
          else d.el.parentNode.removeChild(d.el);
        }
      });
      drops = keep;
      render();
      if (tried > 4000) { playing = false; syncBtn(); }
      raf = requestAnimationFrame(step);
    }
    function kick() { if (!raf && playing) raf = requestAnimationFrame(step); }
    function syncBtn() {
      playBtn.textContent = playing ? "Pause" : "Play";
      playBtn.setAttribute("aria-pressed", playing ? "true" : "false");
    }
    playBtn.addEventListener("click", function () {
      playing = !playing;
      if (playing && tried > 4000) setup();
      syncBtn(); kick();
    });
    document.getElementById("rs-reset").addEventListener("click", function () { setup(); kick(); });
    document.getElementById("rs-shape").addEventListener("click", function () { si = (si + 1) % shapes.length; setup(); kick(); });
    document.addEventListener("rw:tab", function (e) { if (e.detail === "sampling") kick(); });
    document.addEventListener("visibilitychange", kick);
    syncBtn();
    setup();
    kick();
  })();
})();
