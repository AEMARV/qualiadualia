/* The Research hub: the map, the coin question and the reader's filter. */
(function () {
  "use strict";
  var root = document.getElementById("research-hub");
  if (!root) return;

  var teaser = document.getElementById("rh-teaser");
  var nodes = root.querySelectorAll(".rh-node");
  var idle = teaser.textContent;
  nodes.forEach(function (n) {
    function show() {
      nodes.forEach(function (o) { o.classList.toggle("is-on", o === n); });
      teaser.textContent = n.getAttribute("data-teaser");
    }
    n.addEventListener("mouseenter", show);
    n.addEventListener("focus", show);
    n.addEventListener("touchstart", function (e) {
      if (!n.classList.contains("is-on")) { e.preventDefault(); show(); }
    }, { passive: false });
  });
  root.querySelector(".rh-map").addEventListener("mouseleave", function () {
    nodes.forEach(function (o) { o.classList.remove("is-on"); });
    teaser.textContent = idle;
  });

  var answer = document.getElementById("rh-coin-answer");
  root.querySelectorAll(".rh-coin").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = Number(b.dataset.theta);
      root.querySelectorAll(".rh-coin").forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
      var p = function (x) { return Math.min(1, 0.5 / Math.max(x, 1e-9), 0.5 / Math.max(1 - x, 1e-9)); };
      var verdict = t === 0.5 ? "Yes, the fair coin." : "Not quite.";
      answer.hidden = false;
      answer.innerHTML = "<p><b>" + verdict + "</b> By the Maximum Probability Theorem the fair coin has probability <b>1</b>, " +
        "the 0.8 coin <b>" + p(0.8).toFixed(3) + "</b>, and the coin that always lands heads <b>" + p(1).toFixed(1) + "</b>. " +
        "Not zero: it still overlaps with half of what the prior believes. A confident model is an expensive model, " +
        "and that one fact is a regularizer for any network.</p><p><a href=\"/research-work#mpt\">See why, and play with it</a></p>";
    });
  });

  var cards = root.querySelectorAll(".rh-card");
  root.querySelectorAll("[data-f]").forEach(function (b) {
    b.addEventListener("click", function () {
      var f = b.dataset.f;
      root.querySelectorAll("[data-f]").forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
      cards.forEach(function (c) {
        var on = f === "all" || (" " + c.dataset.tags + " ").indexOf(" " + f + " ") >= 0;
        c.classList.toggle("is-dim", !on);
      });
    });
  });
})();
