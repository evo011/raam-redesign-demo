/* ============================================================
   RAAM · Panda-Reskin — Interactions
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Theme toggle (default light, persisted as 'raam-theme') ---- */
  var toggle = document.getElementById("themeToggle");
  function syncToggleLabel() {
    if (!toggle) return;
    var dark = root.getAttribute("data-theme") === "dark";
    toggle.textContent = dark ? "◑ Light" : "◐ Dark";
    toggle.setAttribute("aria-pressed", String(dark));
  }
  syncToggleLabel();
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("raam-theme", next); } catch (_) {}
      syncToggleLabel();
    });
  }

  /* ---- Scroll progress ---- */
  var progress = document.getElementById("scrollProgress");
  function onScroll() {
    if (!progress) return;
    var y = window.scrollY || window.pageYOffset;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- Reveal on scroll ---- */
  var revealEls = document.querySelectorAll(".reveal");
  if (prefersReduced || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---- Animated stat counters (tabular, de-DE) ---- */
  var counters = document.querySelectorAll(".stat__num [data-count]");
  function fmt(n) { return Math.round(n).toLocaleString("de-DE"); }
  function runCounter(el) {
    var target = parseFloat(el.getAttribute("data-count")) || 0;
    if (prefersReduced) { el.textContent = fmt(target); return; }
    var duration = 1300, start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { runCounter(entry.target); cio.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(runCounter);
  }

  /* ---- Scroll spy (active nav link) ---- */
  var ids = ["strecke", "racers", "tracking", "ergebnisse", "faq"];
  var linkMap = {};
  document.querySelectorAll(".mast-nav a").forEach(function (a) {
    linkMap[a.getAttribute("href").replace("#", "")] = a;
  });
  var sections = ids.map(function (id) { return document.getElementById(id); }).filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = linkMap[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          Object.keys(linkMap).forEach(function (k) { linkMap[k].removeAttribute("aria-current"); });
          link.setAttribute("aria-current", "page");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }
})();
