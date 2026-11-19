// Small stand-in for the Squarespace scripts this site relied on.
(function () {
  "use strict";
  var doc = document.documentElement;
  var body = document.body;

  /* Fluid images: fit the frame to the picture (contain) or to the crop ratio
     (cover, used by the egg and circle masks), so masks and borders hug the image. */
  function ratioFor(root) {
    var block = root.closest(".sqs-block");
    var fit = getComputedStyle(block).getPropertyValue("--image-component-object-fit").trim() || "cover";
    var aspect = block && block.getAttribute("data-aspect-ratio");
    var img = root.querySelector("img");
    var dims = img && img.getAttribute("data-image-dimensions");
    var natural = null;
    if (dims) {
      var p = dims.split("x");
      natural = parseFloat(p[0]) / parseFloat(p[1]);
    } else if (img && img.naturalWidth) {
      natural = img.naturalWidth / img.naturalHeight;
    }
    if (fit === "cover") {
      if (root.getAttribute("data-is-image-stretched") === "true") return { fit: fit, ratio: null };
      return { fit: fit, ratio: aspect ? 100 / parseFloat(aspect) : null };
    }
    return { fit: fit, ratio: natural };
  }

  function sizeImage(root) {
    var info = ratioFor(root);
    var box = root.getBoundingClientRect();
    var s = root.style;
    s.setProperty("--image-component-object-fit", info.fit);
    if (!info.ratio || !box.width || !box.height) {
      s.setProperty("--image-component-container-width", "100%");
      s.setProperty("--image-component-container-height", "100%");
      return;
    }
    s.setProperty("--image-component-native-aspect-ratio", String(info.ratio));
    if (box.width / box.height > info.ratio) {
      s.setProperty("--image-component-container-height", "100%");
      s.setProperty("--image-component-container-width", box.height * info.ratio + "px");
    } else {
      s.setProperty("--image-component-container-width", "100%");
      s.setProperty("--image-component-container-height", box.width / info.ratio + "px");
    }
  }

  var roots = Array.prototype.slice.call(document.querySelectorAll(".fluid-image-component-root"));
  function sizeAll() { roots.forEach(sizeImage); }
  if ("ResizeObserver" in window) {
    var ro = new ResizeObserver(function (entries) {
      entries.forEach(function (e) { sizeImage(e.target); });
    });
    roots.forEach(function (r) { ro.observe(r); });
  }
  sizeAll();
  window.addEventListener("load", sizeAll);

  /* First section sits under the fixed header, as on Squarespace. */
  var header = document.querySelector("header#header, header.header");
  function padFirstSection() {
    var first = document.querySelector("main .page-section");
    if (!header || !first) return;
    first.style.paddingTop = header.getBoundingClientRect().height + "px";
    var menu = document.querySelector(".header-menu");
    if (menu) menu.style.paddingTop = header.getBoundingClientRect().height + "px";
  }
  padFirstSection();
  window.addEventListener("resize", padFirstSection);
  window.addEventListener("load", padFirstSection);

  /* Mobile menu. */
  var burgers = document.querySelectorAll(".header-burger-btn");
  Array.prototype.forEach.call(burgers, function (btn) {
    btn.addEventListener("click", function () {
      var open = !body.classList.contains("header--menu-open");
      body.classList.toggle("header--menu-open", open);
      if (header) header.classList.toggle("black", open); // menu overlay theme
      Array.prototype.forEach.call(burgers, function (b) {
        b.classList.toggle("burger--active", open);
        b.setAttribute("aria-expanded", String(open));
      });
      var menu = document.querySelector(".header-menu");
      if (menu) menu.setAttribute("aria-hidden", String(!open));
    });
  });

  /* Sticky blocks centre themselves using their own height. */
  var stickies = Array.prototype.slice.call(document.querySelectorAll(".fe-block.sqs-position-sticky"));
  function sizeSticky() {
    stickies.forEach(function (b) { b.style.setProperty("--block-height", b.offsetHeight + "px"); });
  }
  sizeSticky();
  window.addEventListener("resize", sizeSticky);
  window.addEventListener("load", sizeSticky);

  /* Gallery slideshows: same attribute choreography as Squarespace, so its CSS
     transitions (slide, fade...) run unchanged. */
  Array.prototype.forEach.call(document.querySelectorAll(".gallery-slideshow"), function (show) {
    var items = Array.prototype.slice.call(show.querySelectorAll(".gallery-slideshow-item"));
    if (items.length < 2) return;
    var props = {};
    try { props = JSON.parse(show.getAttribute("data-props") || "{}"); } catch (e) {}
    if (props.galleryHeight) show.style.height = "calc(" + props.galleryHeight + "vh + (var(--pagePadding) * 2))";
    if (props.galleryWidth) show.style.maxWidth = "calc(var(--maxPageWidth) * " + props.galleryWidth / 100 + ")";
    items.forEach(function (it) {
      var img = it.querySelector("img");
      if (img) img.style.display = "block";
    });
    var current = Math.max(0, items.findIndex(function (it) { return it.getAttribute("data-active") === "true"; }));
    var timer = null;
    function go(n, forward) {
      n = (n + items.length) % items.length;
      if (n === current) return;
      var oldEl = items[current];
      var newEl = items[n];
      oldEl.setAttribute("data-next", forward ? "false" : "true");
      oldEl.setAttribute("data-in", "false");
      newEl.setAttribute("data-active", "false");
      newEl.setAttribute("data-next", forward ? "true" : "false");
      newEl.setAttribute("data-in", "false");
      void newEl.offsetWidth; // commit the starting position before animating in
      setTimeout(function () {
        newEl.setAttribute("data-active", "true");
        newEl.setAttribute("data-in", "true");
      }, 50);
      setTimeout(function () {
        if (oldEl !== items[current]) oldEl.setAttribute("data-active", "false");
      }, 900);
      current = n;
    }
    function restart() {
      if (!props.autoplayEnabled) return;
      clearInterval(timer);
      timer = setInterval(function () { go(current + 1, true); }, props.slideDurationMs || 5000);
    }
    var prev = show.querySelector("[data-previous]");
    var next = show.querySelector("[data-next].gallery-slideshow-control-btn, .gallery-slideshow-control-next button");
    if (prev) prev.addEventListener("click", function (e) { e.preventDefault(); go(current - 1, false); restart(); });
    if (next) next.addEventListener("click", function (e) { e.preventDefault(); go(current + 1, true); restart(); });
    var startX = null;
    show.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    show.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) { go(current + (dx < 0 ? 1 : -1), dx < 0); restart(); }
      startX = null;
    });
    restart();
  });

  /* Fade-in. Everything already on screen is shown at once by CSS (site.css staggers it
     piece by piece from the first paint, no waiting for this script). Only blocks that are
     still below the fold are hidden here and revealed as they scroll into view. */
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce && "IntersectionObserver" in window) {
    var fold = window.innerHeight * 1.05;
    var targets = document.querySelectorAll(
      "main .sqs-html-content > *, main .fluid-image-animation-wrapper"
    );
    var io = new IntersectionObserver(function (entries) {
      var i = 0;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.style.transitionTimingFunction = "ease";
        el.style.transitionDuration = "0.5s";
        el.style.transitionDelay = (i++ * 0.04) + "s";
        el.classList.add("fadeIn");
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -4% 0px" });
    Array.prototype.forEach.call(targets, function (el) {
      if (el.getBoundingClientRect().top < fold) return;
      el.classList.add("preFade");
      io.observe(el);
    });
  }

  doc.classList.add("js");
})();
