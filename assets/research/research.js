/* The Research page: tabs and the interactive figures. */
(function () {
  "use strict";
  var root = document.getElementById("research-work");
  if (!root) return;
  var SVGNS = "http://www.w3.org/2000/svg";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(name, attrs, parent) {
    var e = document.createElementNS(SVGNS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function clear(g) { while (g.firstChild) g.removeChild(g.firstChild); }
  function txt(parent, x, y, s, cls, anchor) {
    var t = el("text", { x: x, y: y, "class": cls || "s-label" }, parent);
    if (anchor) t.setAttribute("text-anchor", anchor);
    t.textContent = s;
    return t;
  }
  function H2(p) { return (p <= 0 || p >= 1) ? 0 : -(p * Math.log(p) + (1 - p) * Math.log(1 - p)) / Math.LN2; }
  function visible(id) { var p = document.getElementById(id); return p && !p.hidden && !document.hidden; }

  /* A shared animation loop for the live simulations. */
  var loops = [];
  var rafId = null, lastT = 0;
  function frame(t) {
    rafId = null;
    var dt = lastT ? Math.min((t - lastT) / 1000, 0.05) : 0;
    lastT = t;
    var any = false;
    loops.forEach(function (L) { if (L.active()) { L.step(dt); any = true; } });
    if (any) rafId = requestAnimationFrame(frame);
    else lastT = 0;
  }
  function kick() { if (!rafId) rafId = requestAnimationFrame(frame); }
  document.addEventListener("visibilitychange", kick);

  /* Tabs */
  var tabs = Array.prototype.slice.call(root.querySelectorAll(".rw-tab"));
  var panels = {};
  tabs.forEach(function (t) { panels[t.dataset.tab] = document.getElementById(t.dataset.tab); });

  var groups = Array.prototype.slice.call(root.querySelectorAll(".rw-toc-group"));
  function setGroup(g, open) {
    var head = g.querySelector(".rw-group-head"), body = g.querySelector(".rw-group-body");
    head.setAttribute("aria-expanded", open ? "true" : "false");
    body.hidden = !open;
    g.classList.toggle("is-open", open);
  }
  groups.forEach(function (g) {
    g.querySelector(".rw-group-head").addEventListener("click", function () {
      var open = g.querySelector(".rw-group-head").getAttribute("aria-expanded") !== "true";
      setGroup(g, open);
      if (open) {
        var first = g.querySelector(".rw-tab");
        if (first && !g.querySelector('.rw-tab[aria-selected="true"]')) select(first.dataset.tab, { hash: true, scroll: true });
      }
    });
  });

  function select(id, opts) {
    opts = opts || {};
    if (!panels[id]) return;
    groups.forEach(function (g) { if (g.querySelector('[data-tab="' + id + '"]')) setGroup(g, true); });
    tabs.forEach(function (t) {
      var on = t.dataset.tab === id;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      panels[t.dataset.tab].hidden = !on;
    });
    if (opts.focus) tabs.filter(function (t) { return t.dataset.tab === id; })[0].focus();
    if (opts.hash) {
      try { history.replaceState(null, "", location.pathname + location.search + "#" + id); } catch (e) { location.hash = id; }
    }
    if (opts.scroll) {
      var r = panels[id].getBoundingClientRect();
      if (window.innerWidth <= 900 || r.top < 0) {
        window.scrollTo({ top: r.top + window.pageYOffset - 90, behavior: reduceMotion ? "auto" : "smooth" });
      }
    }
    kick();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { select(t.dataset.tab, { hash: true, scroll: true }); });
    t.addEventListener("keydown", function (e) {
      var n = tabs.length, j = null;
      i = tabs.indexOf(t);
      if (e.key === "ArrowDown" || e.key === "ArrowRight") j = (i + 1) % n;
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") j = (i + n - 1) % n;
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = n - 1;
      if (j !== null) { e.preventDefault(); select(tabs[j].dataset.tab, { focus: true, hash: true }); }
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

  /* MPT: models as events */
  (function () {
    var slider = document.getElementById("mpt-train");
    if (!slider) return;
    var m = document.getElementById("mpt-m"), mf = document.getElementById("mpt-m-fill");
    var lab = document.getElementById("mpt-m-label"), out = document.getElementById("mpt-train-out");
    var S = { cx: 400, cy: 165, rx: 130, ry: 105 };
    function inside(x, y, e) { var dx = (x - e.cx) / e.rx, dy = (y - e.cy) / e.ry; return dx * dx + dy * dy <= 1; }
    function update() {
      var t = slider.value / 100;
      var M = { cx: 150 + t * 250, cy: 165, rx: 125 + t * 10, ry: 110 + t * 2 };
      [m, mf].forEach(function (e) {
        e.setAttribute("cx", M.cx.toFixed(1)); e.setAttribute("rx", M.rx.toFixed(1)); e.setAttribute("ry", M.ry.toFixed(1));
      });
      lab.setAttribute("x", (M.cx - 70).toFixed(1));
      var both = 0, star = 0;
      for (var x = 270; x <= 530; x += 4) for (var y = 60; y <= 270; y += 4) {
        if (inside(x, y, S)) { star += 1; if (inside(x, y, M)) both += 1; }
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
    function h(v) { return "calc(" + (v * 100).toFixed(2) + "% - " + (22 * v).toFixed(1) + "px)"; }
    var bars = shape.map(function (_, i) {
      var b = document.createElement("div");
      b.className = "rw-bar";
      b.innerHTML = '<div class="prior"></div><div class="model"></div><div class="lab">z' + (i + 1) + "</div>";
      box.appendChild(b);
      b.querySelector(".prior").style.height = h(prior / FULL);
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
        b.querySelector(".model").style.height = h(Math.min(q[i] / FULL, 1));
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

  /* MPT: the most probable coin */
  (function () {
    var s = document.getElementById("coin-theta");
    if (!s) return;
    var X0 = 60, X1 = 600, Y0 = 210, Y1 = 30;
    function P(t) { return Math.min(1, 0.5 / Math.max(t, 1e-9), 0.5 / Math.max(1 - t, 1e-9)); }
    function X(t) { return X0 + t * (X1 - X0); }
    function Y(p) { return Y0 - p * (Y0 - Y1 - 10) - 0; }
    var d = "";
    for (var i = 0; i <= 200; i += 1) { var t = i / 200; d += (i ? " L" : "M") + X(t).toFixed(1) + " " + Y(P(t)).toFixed(1); }
    document.getElementById("coin-curve").setAttribute("d", d);
    var dot = document.getElementById("coin-dot"), drop = document.getElementById("coin-drop");
    var label = document.getElementById("coin-text"), out = document.getElementById("coin-out");
    function update() {
      var t = s.value / 100, p = P(t);
      dot.setAttribute("cx", X(t)); dot.setAttribute("cy", Y(p));
      drop.setAttribute("x1", X(t)); drop.setAttribute("x2", X(t)); drop.setAttribute("y1", Y(p));
      label.setAttribute("x", Math.min(Math.max(X(t), 110), 560)); label.setAttribute("y", Y(p) - 16);
      label.textContent = "P(M) = " + p.toFixed(2);
      out.textContent = "θ = " + t.toFixed(2);
    }
    s.addEventListener("input", update);
    update();
  })();

  /* Probabilistic optimization on three hard objectives */
  (function () {
    var svg = document.getElementById("po-svg");
    if (!svg) return;
    var OBJ = {
      valleys: {
        f: function (x) { var y = x * x * x * x - 4 * x * x + 2 * x; y = Math.floor(y * 4) / 4; return Math.min(y, 10); },
        XL: -2.5, XR: 2.6, YB: -8, YT: 10, mu0: 2.0, sd0: 0.5, clip: 0.3, sdMax: 3.3, alpha: 2, gdH: 1e-4, gdLr: 0.01,
        cap: "x⁴ − 4x² + 2x, cut into fine steps: the toy from my notebook. Two valleys, the deeper one on the left. Both start at x = 2. Gradient descent sits on a flat step and never moves. Without MPT the bell collapses into the shallow valley; with MPT it stays wide, finds the deep one, and only then narrows."
      },
      stairs: {
        f: function (x) { return Math.floor(x * x * 0.1) / 0.1; },
        XL: -10, XR: 10, YB: -5, YT: 100, mu0: 8, sd0: 1, clip: 1, sdMax: 6, alpha: 1.1, gdH: 1e-4, gdLr: 0.01, speed: 32, maxIter: 500,
        cap: "A quadratic turned into a staircase: discrete, with a derivative that is zero on every step and infinite at every edge. Gradient descent has nothing to follow. The sampling distribution does not need a derivative, it walks down the stairs to the flat bottom."
      },
      noisy: {
        f: function (x) { return x * x + Math.random() * 10; },
        XL: -10, XR: 10, YB: -5, YT: 110, mu0: 8, sd0: 1, clip: 1, sdMax: 6, alpha: 1.1, gdH: 0.01, gdLr: 0.002, noisy: true, speed: 32, maxIter: 500,
        cap: "x² plus noise ten times larger than the slope near the minimum, drawn fresh at every evaluation. The function is bounded, but its derivative is not: gradient descent, estimating slopes from two nearby evaluations, is thrown around by the noise. The sampling distribution averages the noise away inside its neighbourhood and settles at the bottom."
      }
    };
    var key = "valleys", O = OBJ[key], PX0 = 50, PX1 = 620, PY0 = 300, PY1 = 20;
    function sx(x) { return PX0 + (x - O.XL) / (O.XR - O.XL) * (PX1 - PX0); }
    function sy(y) { return PY0 - (Math.max(O.YB, Math.min(O.YT, y)) - O.YB) / (O.YT - O.YB) * (PY0 - PY1); }
    var axes = document.getElementById("po-axes"), fpath = document.getElementById("po-f");
    var bell = document.getElementById("po-bell"), muDot = document.getElementById("po-mu"), gdDot = document.getElementById("po-gd");
    var sampG = document.getElementById("po-samples"), readout = document.getElementById("po-readout");
    var playBtn = document.getElementById("po-play"), cap = document.getElementById("po-cap");
    var N = 200, lr = 0.1, useMPT = true, mu, pp, gd, iter, playing = !reduceMotion, acc = 0, dots = [];
    for (var j = 0; j < 40; j += 1) dots.push(el("circle", { r: 2.6, "class": "s-samp" }, sampG));
    function randn() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    function alpha() { return useMPT ? O.alpha : 1; }
    function drawF() {
      clear(axes);
      el("line", { x1: PX0, y1: sy(0), x2: PX1, y2: sy(0), "class": "s-dash" }, axes);
      txt(axes, PX1, sy(0) + 18, "f = 0", "s-label s-dim", "end");
      var d = "", prev = null, i, x, y;
      if (O.noisy) {
        for (i = 0; i <= 400; i += 1) { x = O.XL + (O.XR - O.XL) * i / 400; d += (i ? " L" : "M") + sx(x).toFixed(1) + " " + sy(O.f(x)).toFixed(1); }
      } else {
        for (i = 0; i <= 1020; i += 1) {
          x = O.XL + (O.XR - O.XL) * i / 1020; y = O.f(x);
          if (prev === null) d += "M" + sx(x).toFixed(1) + " " + sy(y).toFixed(1);
          else if (y !== prev) d += " L" + sx(x).toFixed(1) + " " + sy(prev).toFixed(1) + " L" + sx(x).toFixed(1) + " " + sy(y).toFixed(1);
          prev = y;
        }
        d += " L" + sx(O.XR).toFixed(1) + " " + sy(prev).toFixed(1);
      }
      fpath.setAttribute("d", d);
      cap.textContent = O.cap;
    }
    function reset() { mu = O.mu0; pp = Math.log(1 / O.sd0); gd = O.mu0; iter = 0; drawF(); draw([]); }
    function step() {
      var prec = Math.exp(pp), xs = [], e = [], ev = [], k, a = alpha();
      for (k = 0; k < N; k += 1) { var x = mu + randn() / prec; xs.push(x); e.push(-Math.pow((x - mu) * prec, 2) / 2); ev.push(-O.f(x)); }
      var mL = Math.max.apply(null, ev), mR = Math.max.apply(null, e.map(function (v) { return (a - 1) * v; }));
      var L = ev.map(function (v) { return Math.exp(v - mL); }), R = e.map(function (v) { return Math.exp((a - 1) * v - mR); });
      var sL = L.reduce(function (p, q) { return p + q; }, 0), sR = R.reduce(function (p, q) { return p + q; }, 0);
      var dmu = 0, dpp = 0;
      for (k = 0; k < N; k += 1) {
        var G = L[k] / sL - R[k] / sR, dx = xs[k] - mu;
        dmu += G * dx * prec * prec;
        dpp += G * (-dx * dx * prec * prec);
      }
      mu += Math.max(-O.clip, Math.min(O.clip, lr * dmu));
      pp = Math.max(Math.log(1 / O.sdMax), Math.min(Math.log(40), pp + Math.max(-0.3, Math.min(0.3, lr * dpp))));
      var g = (O.f(gd + O.gdH) - O.f(gd - O.gdH)) / (2 * O.gdH);
      if (Math.abs(g) < 1e3 || O.noisy) gd = Math.max(O.XL, Math.min(O.XR, gd - Math.max(-1.5, Math.min(1.5, O.gdLr * g))));
      iter += 1;
      draw(xs);
    }
    function draw(xs) {
      var sd = 1 / Math.exp(pp), b = "";
      for (var i = 0; i <= 160; i += 1) {
        var x = mu - 4 * sd + 8 * sd * i / 160;
        var dens = Math.exp(-0.5 * Math.pow((x - mu) / sd, 2));
        b += (i ? " L" : "M") + Math.max(PX0, Math.min(PX1, sx(x))).toFixed(1) + " " + (PY0 - dens * 90).toFixed(1);
      }
      bell.setAttribute("d", b + " Z");
      dots.forEach(function (c, i) {
        if (i < xs.length && xs[i] > O.XL && xs[i] < O.XR) {
          c.setAttribute("cx", sx(xs[i]).toFixed(1)); c.setAttribute("cy", sy(O.f(xs[i])).toFixed(1)); c.style.display = "";
        } else c.style.display = "none";
      });
      muDot.setAttribute("cx", sx(mu)); muDot.setAttribute("cy", sy(O.f(mu)));
      gdDot.setAttribute("cx", sx(gd)); gdDot.setAttribute("cy", sy(O.f(gd)) - 14);
      readout.innerHTML = "step <b>" + iter + "</b> &nbsp;·&nbsp; α = <b>" + alpha() + "</b> &nbsp;·&nbsp; mean <b>" + mu.toFixed(2) +
        "</b> &nbsp;·&nbsp; width σ = <b>" + sd.toFixed(2) + "</b> &nbsp;·&nbsp; gradient descent at x = " + gd.toFixed(2);
    }
    function syncBtn() { playBtn.textContent = playing ? "Pause" : "Play"; playBtn.setAttribute("aria-pressed", playing ? "true" : "false"); }
    playBtn.addEventListener("click", function () { playing = !playing; if (playing && iter >= (O.maxIter || 400)) reset(); syncBtn(); kick(); });
    document.getElementById("po-reset").addEventListener("click", function () { reset(); kick(); });
    var fig = svg.parentNode;
    fig.querySelectorAll("[data-po-mpt]").forEach(function (b) {
      b.addEventListener("click", function () {
        useMPT = b.dataset.poMpt === "on";
        fig.querySelectorAll("[data-po-mpt]").forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
        reset(); playing = true; syncBtn(); kick();
      });
    });
    fig.querySelectorAll("[data-po-obj]").forEach(function (b) {
      b.addEventListener("click", function () {
        key = b.dataset.poObj; O = OBJ[key];
        fig.querySelectorAll("[data-po-obj]").forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
        reset(); playing = true; syncBtn(); kick();
      });
    });
    loops.push({
      active: function () { return playing && visible("optimization"); },
      step: function (dt) {
        acc += dt * (O.speed || 14);
        while (acc >= 1) { step(); acc -= 1; }
        if (iter >= (O.maxIter || 400)) { playing = false; syncBtn(); }
      }
    });
    reset();
    if (reduceMotion) { for (var n = 0; n < 400; n += 1) step(); }
    syncBtn();
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
      for (var i = 0; i < xs.length; i += 1) { var d = (x - xs[i]) / 22; s += hs[i] * Math.exp(-d * d); }
      return s;
    }
    function path(hs) {
      var d = "";
      for (var x = X0; x <= X1; x += 5) d += (x === X0 ? "M" : " L") + x + " " + (BASE - Math.min(f(x, hs) / 2.7, 1) * H).toFixed(1);
      return d;
    }
    xs.forEach(function () {
      var c = el("circle", { r: 5, fill: "#fff" }, pts);
      c.style.transition = reduceMotion ? "none" : "cy 0.6s ease";
    });
    function draw(on) {
      var hs = heights(on);
      curve.setAttribute("d", path(hs));
      ghost.setAttribute("d", path(heights(!on)));
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
    var readout = document.getElementById("rs-readout"), playBtn = document.getElementById("rs-play");
    var shapes = [
      [0.06, 0.10, 0.17, 0.22, 0.18, 0.12, 0.09, 0.06],
      [0.03, 0.04, 0.06, 0.44, 0.22, 0.10, 0.07, 0.04],
      [0.11, 0.14, 0.13, 0.12, 0.12, 0.13, 0.13, 0.12]
    ];
    var si = 0, q, beta, K = 8, p = 1 / K, X0 = 40, W = 70, BASE = 290, TOP = 40, MAXH = 220;
    var counts, tried, accepted, drops = [], playing = !reduceMotion, spawnAcc = 0, stacks = [];
    function setup() {
      q = shapes[si];
      beta = Math.max.apply(null, q.map(function (x) { return x / p; }));
      counts = q.map(function () { return 0; });
      tried = 0; accepted = 0; drops = [];
      clear(gT); clear(gS); clear(gD);
      var qmax = Math.max.apply(null, q);
      stacks = q.map(function (qi, i) {
        var h = qi / qmax * MAXH;
        el("rect", { x: X0 + i * W + 8, y: BASE - h, width: W - 16, height: h, rx: 3, "class": "s-target" }, gT);
        txt(gT, X0 + i * W + W / 2, BASE + 22, "v" + (i + 1), "s-label", "middle");
        return el("rect", { x: X0 + i * W + 14, y: BASE, width: W - 28, height: 0, rx: 2, "class": "s-acc" }, gS);
      });
      txt(gT, X0, 24, "mother p: uniform");
      if (reduceMotion) { for (var n = 0; n < 1500; n += 1) propose(false); }
      render();
    }
    function propose(animate) {
      var i = Math.floor(Math.random() * K), ok = Math.random() < q[i] / (beta * p);
      tried += 1;
      if (!animate) { if (ok) { accepted += 1; counts[i] += 1; } return; }
      var c = el("circle", { cx: X0 + i * W + W / 2 + (Math.random() - 0.5) * 30, cy: TOP - 10, r: 4.5, "class": ok ? "s-drop-acc" : "s-drop-rej" }, gD);
      drops.push({ el: c, i: i, acc: ok, y: TOP - 10, v: 160 + Math.random() * 60, life: 1 });
    }
    function render() {
      var qmax = Math.max.apply(null, q);
      stacks.forEach(function (r, i) {
        var h = accepted ? Math.min((counts[i] / accepted) / qmax * MAXH, MAXH + 30) : 0;
        r.setAttribute("y", (BASE - h).toFixed(1)); r.setAttribute("height", h.toFixed(1));
      });
      readout.innerHTML = "proposed <b>" + tried + "</b> &nbsp;·&nbsp; accepted <b>" + accepted + "</b> &nbsp;·&nbsp; acceptance rate <b>" +
        (tried ? accepted / tried : 0).toFixed(3) + "</b> &nbsp;·&nbsp; min p/q, the probability of the model: <b>" + (1 / beta).toFixed(3) + "</b>";
    }
    function syncBtn() { playBtn.textContent = playing ? "Pause" : "Play"; playBtn.setAttribute("aria-pressed", playing ? "true" : "false"); }
    playBtn.addEventListener("click", function () { playing = !playing; if (playing && tried > 4000) setup(); syncBtn(); kick(); });
    document.getElementById("rs-reset").addEventListener("click", function () { setup(); kick(); });
    document.getElementById("rs-shape").addEventListener("click", function () { si = (si + 1) % shapes.length; setup(); kick(); });
    loops.push({
      active: function () { return playing && visible("sampling"); },
      step: function (dt) {
        spawnAcc += dt * 26;
        while (spawnAcc >= 1) { propose(true); spawnAcc -= 1; }
        var keep = [];
        drops.forEach(function (d) {
          var stop = d.acc ? BASE - 6 : TOP + 120;
          if (d.y < stop) { d.y += d.v * dt; d.el.setAttribute("cy", d.y.toFixed(1)); keep.push(d); }
          else if (d.acc) { accepted += 1; counts[d.i] += 1; d.el.parentNode.removeChild(d.el); }
          else {
            d.life -= dt * 2.5;
            if (d.life > 0) { d.el.setAttribute("opacity", d.life.toFixed(2)); keep.push(d); }
            else d.el.parentNode.removeChild(d.el);
          }
        });
        drops = keep;
        render();
        if (tried > 4000) { playing = false; syncBtn(); }
      }
    });
    syncBtn();
    setup();
  })();

  /* Taylor series of 1/x */
  (function () {
    var a = document.getElementById("taylor-alpha");
    if (!a) return;
    var n = document.getElementById("taylor-n");
    var X0 = 50, X1 = 620, Y0 = 240, Y1 = 20, XR = 4, YT = 5;
    function sx(x) { return X0 + x / XR * (X1 - X0); }
    function sy(y) { return Y0 - y / YT * (Y0 - Y1); }
    var axes = document.getElementById("taylor-axes");
    el("line", { x1: X0, y1: Y0, x2: X1, y2: Y0, "class": "s-axis" }, axes);
    el("line", { x1: X0, y1: Y0, x2: X0, y2: Y1, "class": "s-axis" }, axes);
    for (var k = 1; k <= 4; k += 1) txt(axes, sx(k), Y0 + 20, String(k), "s-label", "middle");
    txt(axes, X1, Y0 + 40, "x", "s-label s-dim", "end");
    var tr = "";
    for (var i = 1; i <= 300; i += 1) { var x = 0.2 + (XR - 0.2) * i / 300; tr += (i > 1 ? " L" : "M") + sx(x).toFixed(1) + " " + sy(1 / x).toFixed(1); }
    document.getElementById("taylor-true").setAttribute("d", tr);
    var band = document.getElementById("taylor-band"), sum = document.getElementById("taylor-sum");
    function update() {
      var al = a.value / 10, terms = Number(n.value), d = "", started = false;
      band.setAttribute("x", sx(0)); band.setAttribute("width", Math.min(sx(2 * al), X1) - sx(0));
      for (var i = 0; i <= 400; i += 1) {
        var x = 0.02 + (XR - 0.02) * i / 400, s = 0, term = 1 / al;
        for (var j = 0; j <= terms; j += 1) { s += term; term *= -(x - al) / al; }
        var y = Math.max(-0.5, Math.min(YT + 0.5, s));
        d += (started ? " L" : "M") + sx(x).toFixed(1) + " " + sy(y).toFixed(1);
        started = true;
      }
      sum.setAttribute("d", d);
      document.getElementById("taylor-alpha-out").textContent = "α = " + al.toFixed(1);
      document.getElementById("taylor-n-out").textContent = terms + " terms";
    }
    a.addEventListener("input", update); n.addEventListener("input", update);
    update();
  })();

  /* Generalized rejection sampling against rejection sampling */
  (function () {
    var svg = document.getElementById("grs-svg");
    if (!svg) return;
    var q = [0.04, 0.08, 0.15, 0.26, 0.18, 0.12, 0.10, 0.07], K = 8, p = 1 / K;
    var r = q.map(function (x) { return x / p; }), rmax = Math.max.apply(null, r);
    var slider = document.getElementById("grs-alpha"), out = document.getElementById("grs-alpha-out");
    var playBtn = document.getElementById("grs-play"), autoBtn = document.getElementById("grs-auto");
    var readout = document.getElementById("grs-readout");
    var BASE = 220, H = 170, BW = 26, playing = !reduceMotion, auto = false;
    var panes = [{ g: document.getElementById("grs-left"), x0: 20, title: "rejection sampling" },
                 { g: document.getElementById("grs-right"), x0: 340, title: "generalized" }];
    var rs, gs;
    function draw0() {
      panes.forEach(function (P) {
        clear(P.g);
        txt(P.g, P.x0, 26, P.title, "s-name");
        el("line", { x1: P.x0, y1: BASE, x2: P.x0 + 285, y2: BASE, "class": "s-axis" }, P.g);
        P.bars = q.map(function (qi, i) {
          var x = P.x0 + 8 + i * 35, h = qi / 0.26 * H;
          el("rect", { x: x, y: BASE - h, width: BW, height: h, rx: 2, "class": "s-target" }, P.g);
          return el("rect", { x: x + 4, y: BASE, width: BW - 8, height: 0, rx: 2, "class": "s-acc" }, P.g);
        });
        P.info = txt(P.g, P.x0, 316, "", "s-label");
      });
    }
    function reset() {
      rs = { tried: 0, acc: 0, c: q.map(function () { return 0; }) };
      gs = { tried: 0, runs: 0, S: q.map(function () { return 0; }), w: 1, steps: 0, rsum: 0 };
      render();
    }
    function alphaNow() { return auto && gs.tried > 20 ? gs.rsum / gs.tried : slider.value / 100 * rmax; }
    function propose() {
      var v = Math.floor(Math.random() * K);
      rs.tried += 1;
      if (Math.random() < r[v] / rmax) { rs.acc += 1; rs.c[v] += 1; }
      v = Math.floor(Math.random() * K);
      gs.tried += 1; gs.rsum += r[v];
      var c = r[v] / alphaNow(), k = Math.floor(c) + (Math.random() < c - Math.floor(c) ? 1 : 0);
      gs.S[v] += gs.w * k;
      gs.w *= (1 - k);
      gs.steps += 1;
      if (gs.w === 0 || gs.steps > 300 || Math.abs(gs.w) > 1e6) { gs.runs += 1; gs.w = 1; gs.steps = 0; }
    }
    function err(est) { return est.reduce(function (s, e, i) { return s + Math.abs(e - q[i]); }, 0); }
    function render() {
      var e1 = q.map(function (_, i) { return rs.acc ? rs.c[i] / rs.acc : 0; });
      var e2 = q.map(function (_, i) { return gs.runs ? gs.S[i] / gs.runs : 0; });
      [e1, e2].forEach(function (est, j) {
        panes[j].bars.forEach(function (b, i) {
          var h = Math.max(-60, Math.min(H + 40, est[i] / 0.26 * H));
          if (h >= 0) { b.setAttribute("y", (BASE - h).toFixed(1)); b.setAttribute("height", h.toFixed(1)); b.setAttribute("class", "s-acc"); }
          else { b.setAttribute("y", BASE); b.setAttribute("height", (-h).toFixed(1)); b.setAttribute("class", "s-neg"); }
        });
      });
      panes[0].info.textContent = rs.acc + " samples kept of " + rs.tried;
      panes[1].info.textContent = gs.runs + " estimates from " + gs.tried;
      var al = alphaNow();
      out.textContent = "α = " + al.toFixed(2) + (al <= 0.5 ? ", diverges" : "");
      readout.innerHTML = "proposals per estimate: <b>" + (rs.acc ? rs.tried / rs.acc : 0).toFixed(2) + "</b> against <b>" +
        (gs.runs ? gs.tried / gs.runs : 0).toFixed(2) + "</b> &nbsp;·&nbsp; error: <b>" + (rs.acc ? err(e1) : 2).toFixed(3) + "</b> against <b>" +
        (gs.runs ? err(e2) : 2).toFixed(3) + "</b> &nbsp;·&nbsp; " + rs.tried + " proposals each";
    }
    function syncBtn() { playBtn.textContent = playing ? "Pause" : "Play"; playBtn.setAttribute("aria-pressed", playing ? "true" : "false"); }
    playBtn.addEventListener("click", function () { playing = !playing; if (playing && rs.tried >= 15000) reset(); syncBtn(); kick(); });
    document.getElementById("grs-reset").addEventListener("click", function () { reset(); kick(); });
    autoBtn.addEventListener("click", function () {
      auto = !auto; autoBtn.setAttribute("aria-pressed", auto ? "true" : "false"); slider.disabled = auto; reset(); kick();
    });
    slider.addEventListener("input", function () { reset(); kick(); });
    loops.push({
      active: function () { return playing && visible("sampling"); },
      step: function () {
        for (var i = 0; i < 14; i += 1) propose();
        render();
        if (rs.tried >= 15000) { playing = false; syncBtn(); }
      }
    });
    draw0(); reset();
    if (reduceMotion) { for (var n = 0; n < 6000; n += 1) propose(); render(); }
    syncBtn();
  })();

  /* Binary ICA: two bits and one XOR */
  (function () {
    var box = document.getElementById("copula");
    if (!box) return;
    var s = document.getElementById("copula-a"), out = document.getElementById("copula-out");
    function table(title, rows, ent) {
      var h = '<div><table><caption>' + title + '</caption><thead><tr><th>bits</th><th>probability</th></tr></thead><tbody>';
      rows.forEach(function (r) {
        h += '<tr><td class="bits">' + r[0] + '</td><td>' + r[1].toFixed(3) + '<span class="pbar" style="width:' + (r[1] * 160).toFixed(0) + 'px"></span></td></tr>';
      });
      return h + '</tbody></table><div class="ent">' + ent + '</div></div>';
    }
    function update() {
      var a = s.value / 100, same = (1 - a) / 2, diff = a / 2;
      var joint = 1 + H2(a);
      var left = table("B", [["00", same], ["01", diff], ["10", diff], ["11", same]],
        "H(b₁) + H(b₂) = 1 + 1 = <b>2.000</b> bits<br>joint entropy H(B) = <b>" + joint.toFixed(3) + "</b> bits");
      var right = table("B′ = (b₁, b₁ ⊕ b₂)", [["00", same], ["01", diff], ["11", diff], ["10", same]],
        "H(b₁′) + H(b₂′) = 1 + " + H2(a).toFixed(3) + " = <b>" + joint.toFixed(3) + "</b> bits<br>joint entropy H(B′) = <b>" + joint.toFixed(3) + "</b> bits");
      box.innerHTML = left + '<div class="arrow">⊕<small>saves ' + (2 - joint).toFixed(3) + ' bits</small></div>' + right;
      out.textContent = "P(b₁ ≠ b₂) = " + a.toFixed(2);
    }
    s.addEventListener("input", update);
    update();
  })();

  /* Binary ICA: one gate */
  (function () {
    var g = document.getElementById("gate-grid");
    if (!g) return;
    var bits = "0110100111010010110100101101001011010011101001011".split("");
    var C = 7, R = 5, S = 26, tr = 2, tc = 3;
    for (var r = 0; r < R; r += 1) for (var c = 0; c < C; c += 1) {
      var b = bits[(r * C + c) % bits.length];
      var cls = "s-cell" + (b === "1" ? " s-cell-on" : "");
      var causal = (r === tr - 1 && Math.abs(c - tc) <= 1) || (r === tr && c === tc - 1);
      if (causal) cls = "s-cell s-cell-ctx";
      if (r === tr && c === tc) cls = "s-cell s-cell-t";
      el("rect", { x: c * S, y: r * S, width: S - 3, height: S - 3, rx: 3, "class": cls }, g);
      txt(g, c * S + (S - 3) / 2, r * S + 17, b, "s-bit", "middle");
    }
  })();

  /* Binary ICA: CIFAR10 numbers */
  (function () {
    var svg = document.getElementById("bica-bars");
    if (svg) {
      var rows = [["Raw bits", 7.986, "s-hbar"], ["Gray coded bits", 7.937, "s-hbar"], ["Binary ICA gates", 6.026, "s-hbar-gold"], ["PNG", 5.866, "s-hbar-blue"]];
      var X0 = 190, X1 = 610;
      rows.forEach(function (r, i) {
        var y = 20 + i * 48, w = r[1] / 8.8 * (X1 - X0);
        txt(svg, X0 - 14, y + 22, r[0], i === 2 ? "s-label s-accent" : "s-label", "end");
        el("rect", { x: X0, y: y + 4, width: w, height: 26, rx: 3, "class": r[2] }, svg);
        txt(svg, X0 + w + 8, y + 23, r[1].toFixed(2), "s-label");
      });
      el("line", { x1: X0, y1: 12, x2: X0, y2: 210, "class": "s-axis" }, svg);
      txt(svg, X1, 225, "bits per subpixel", "s-label s-dim", "end");
    }
    var sp = document.getElementById("bica-planes");
    if (sp) {
      var data = { R: [0.997, 0.988, 0.957, 0.89, 0.786, 0.632, 0.437, 0.398], G: [0.997, 0.982, 0.953, 0.885, 0.783, 0.621, 0.428, 0.325], B: [0.998, 0.992, 0.957, 0.893, 0.8, 0.65, 0.423, 0.304] };
      var names = { R: "red", G: "green", B: "blue" }, BASE = 200, H = 170;
      el("line", { x1: 40, y1: BASE, x2: 620, y2: BASE, "class": "s-axis" }, sp);
      el("line", { x1: 40, y1: BASE - H, x2: 620, y2: BASE - H, "class": "s-dash" }, sp);
      txt(sp, 36, BASE - H + 5, "1 bit", "s-label", "end");
      ["R", "G", "B"].forEach(function (k, gi) {
        var gx = 60 + gi * 190;
        data[k].forEach(function (v, i) {
          el("rect", { x: gx + i * 21, y: BASE - v * H, width: 15, height: v * H, rx: 2, "class": "s-hbar-gold", opacity: (0.35 + 0.65 * (1 - v) / 0.7).toFixed(2) }, sp);
        });
        txt(sp, gx + 80, BASE + 24, names[k], "s-label", "middle");
        txt(sp, gx, BASE + 44, "low", "s-label s-dim");
        txt(sp, gx + 165, BASE + 44, "high", "s-label s-dim", "end");
      });
    }
  })();

  /* Finite state: LNorm next to ReLU */
  (function () {
    var svg = document.getElementById("act-svg");
    if (!svg) return;
    var s = document.getElementById("act-temp"), out = document.getElementById("act-out");
    var X0 = 50, X1 = 620, Y0 = 30, Y1 = 230, DL = -5, DR = 5, YT = 0.5, YB = -5.5;
    function sx(d) { return X0 + (d - DL) / (DR - DL) * (X1 - X0); }
    function sy(y) { return Y0 + (YT - y) / (YT - YB) * (Y1 - Y0); }
    el("line", { x1: X0, y1: sy(0), x2: X1, y2: sy(0), "class": "s-axis" }, svg);
    el("line", { x1: sx(0), y1: Y0, x2: sx(0), y2: Y1, "class": "s-dash" }, svg);
    txt(svg, X1, sy(0) - 8, "x₁ − x₂", "s-label s-dim", "end");
    var relu = "";
    for (var i = 0; i <= 200; i += 1) { var d = DL + (DR - DL) * i / 200; relu += (i ? " L" : "M") + sx(d).toFixed(1) + " " + sy(-Math.max(0, -d)).toFixed(1); }
    el("path", { d: relu, "class": "s-true" }, svg);
    var ln = el("path", { d: "", "class": "s-curve" }, svg);
    function update() {
      var k = s.value / 10, p = "";
      for (var i = 0; i <= 200; i += 1) {
        var d = DL + (DR - DL) * i / 200, z = -k * d;
        var sp = z > 30 ? z : Math.log(1 + Math.exp(z));
        p += (i ? " L" : "M") + sx(d).toFixed(1) + " " + sy(Math.max(YB, -sp / k)).toFixed(1);
      }
      ln.setAttribute("d", p);
      out.textContent = "× " + k.toFixed(1);
    }
    s.addEventListener("input", update);
    update();
  })();

  /* Vehicles: alone or cooperative */
  (function () {
    var svg = document.getElementById("coop-svg");
    if (!svg) return;
    var status = document.getElementById("coop-status");
    function set(mode) {
      svg.classList.toggle("is-alone", mode === "alone");
      status.textContent = mode === "alone" ? "Car A: nothing behind the truck" : "Car A: pedestrian detected, through car B";
      svg.parentNode.querySelectorAll("[data-coop]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.coop === mode ? "true" : "false"); });
    }
    svg.parentNode.querySelectorAll("[data-coop]").forEach(function (b) { b.addEventListener("click", function () { set(b.dataset.coop); }); });
    set("coop");
  })();

  /* Show or fold every proof at once */
  (function () {
    var t = document.getElementById("rw-proofs");
    if (!t) return;
    var all = root.querySelectorAll(".rw-proof");
    t.addEventListener("click", function () {
      var on = t.getAttribute("aria-pressed") !== "true";
      all.forEach(function (d) { d.open = on; });
      t.setAttribute("aria-pressed", on ? "true" : "false");
      t.textContent = on ? "Fold all proofs" : "Show all proofs";
    });
  })();

  fromHash();
  kick();
})();
