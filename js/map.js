/* ============================================================
   RAAM · Live-Karte (Leaflet)
   - Route: echte RAAM-2026-Route (route-real.js) oder Fallback
   - Fahrer: ECHTE Live-Daten von trackleaders.com (mainpoints.js),
     CORS-frei via <script>-Include + Intercept der L.marker-Calls.
     Refresh ~90s. Fällt auf Beispieldaten zurück, wenn das Feed fehlt.
   ============================================================ */
(function () {
  "use strict";
  if (typeof L === "undefined") return;
  var mapEl = document.getElementById("liveMap");
  if (!mapEl) return;

  var MAINPOINTS = "https://trackleaders.com/spot/raam26/mainpoints.js";
  var MI = 1.60934; // Meile -> km
  var REFRESH_MS = 90000;

  /* ---- Route: echt (gebacken) oder Näherung als Fallback ---- */
  var APPROX = [
    [33.195, -117.379], [33.256, -116.375], [33.04, -115.55], [33.61, -114.60],
    [34.22, -112.80], [34.54, -112.47], [35.20, -111.65], [36.13, -111.24],
    [36.73, -110.25], [37.15, -109.86], [37.35, -108.59], [37.27, -107.88],
    [37.48, -106.80], [37.47, -105.87], [37.17, -104.50], [37.25, -103.35],
    [37.58, -101.36], [37.60, -100.44], [37.65, -98.74], [37.78, -97.47],
    [37.84, -94.71], [38.01, -92.74], [38.58, -92.17], [38.56, -91.01],
    [39.12, -88.55], [39.17, -86.53], [39.34, -85.48], [39.51, -84.74],
    [39.33, -82.98], [39.33, -82.10], [39.27, -81.56], [39.34, -80.02],
    [39.65, -78.76], [39.64, -77.72], [39.37, -77.15], [38.978, -76.492]
  ];
  var ROUTE = (window.RAAM_ROUTE && window.RAAM_ROUTE.length > 20) ? window.RAAM_ROUTE : APPROX;

  function haversine(a, b) {
    var R = 6371, toRad = Math.PI / 180;
    var dLat = (b[0] - a[0]) * toRad, dLng = (b[1] - a[1]) * toRad;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a[0] * toRad) * Math.cos(b[0] * toRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  }
  var CUM = [0];
  for (var i = 1; i < ROUTE.length; i++) CUM[i] = CUM[i - 1] + haversine(ROUTE[i - 1], ROUTE[i]);
  var TOTAL = CUM[CUM.length - 1];
  function pointAtFrac(f) {
    var d = Math.max(0, Math.min(f, 1)) * TOTAL;
    for (var i = 1; i < CUM.length; i++) {
      if (CUM[i] >= d) {
        var seg = CUM[i] - CUM[i - 1], t = seg > 0 ? (d - CUM[i - 1]) / seg : 0;
        var a = ROUTE[i - 1], b = ROUTE[i];
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      }
    }
    return ROUTE[ROUTE.length - 1];
  }

  /* ---- Map + Tiles ---- */
  function isDark() { return document.documentElement.getAttribute("data-theme") === "dark"; }
  var TILES = {
    light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
  };
  var ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a> · Tracking <a href="https://trackleaders.com/raam26f.php">trackleaders.com</a>';
  var LIME = (getComputedStyle(document.documentElement).getPropertyValue("--accent-strong") || "#DEFF00").trim();

  var map = L.map(mapEl, { zoomControl: true, scrollWheelZoom: false, attributionControl: true, minZoom: 3, maxZoom: 11 });
  var tiles = L.tileLayer(isDark() ? TILES.dark : TILES.light, { attribution: ATTR, subdomains: "abcd" }).addTo(map);

  L.polyline(ROUTE, { color: "#111", weight: 7, opacity: 0.22, lineJoin: "round", lineCap: "round" }).addTo(map);
  var routeLine = L.polyline(ROUTE, { color: LIME, weight: 3.5, opacity: 0.95, lineJoin: "round", lineCap: "round" }).addTo(map);
  map.fitBounds(routeLine.getBounds().pad(0.06));

  L.marker(ROUTE[0], { icon: L.divIcon({ className: "map-pin start", html: "Start", iconSize: [42, 20], iconAnchor: [21, 10] }), zIndexOffset: 500 })
    .addTo(map).bindTooltip("Oceanside, CA · Start", { direction: "top" });
  L.marker(ROUTE[ROUTE.length - 1], { icon: L.divIcon({ className: "map-pin finish", html: "Ziel", iconSize: [38, 20], iconAnchor: [19, 10] }), zIndexOffset: 500 })
    .addTo(map).bindTooltip("Annapolis, MD · Ziel", { direction: "top" });
  [
    { f: 0.16, name: "Flagstaff, AZ" }, { f: 0.29, name: "Wolf Creek Pass, CO" },
    { f: 0.48, name: "Ulysses, KS" }, { f: 0.60, name: "Camdenton, MO" }, { f: 0.82, name: "Athens, OH" }
  ].forEach(function (t) {
    L.marker(pointAtFrac(t.f), { icon: L.divIcon({ className: "map-ts", iconSize: [10, 10], iconAnchor: [5, 5] }) })
      .addTo(map).bindTooltip("TimeStation · " + t.name, { direction: "top" });
  });

  /* ---- Rider-Rendering ---- */
  var riderLayer = L.layerGroup().addTo(map);
  var riderMarkers = {}; // name -> marker
  function iconFor(r) {
    var size = r.rank === 1 ? 20 : 13;
    var cls = "racer-divicon";
    if (r.rank === 1) cls += " leader";
    else if (r.stale) cls += " stale";
    else if (r.status === "rest") cls += " rest";
    return L.divIcon({ className: cls, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
  }
  function tipText(r) {
    return r.name + " · " + Math.round(r.km).toLocaleString("de-DE") + " km" +
      (r.kmh ? " · " + r.kmh.toFixed(1).replace(".", ",") + " km/h" : "");
  }
  function renderRiders(list) {
    riderLayer.clearLayers();
    riderMarkers = {};
    list.forEach(function (r) {
      if (typeof r.lat !== "number" || typeof r.lng !== "number") return;
      var m = L.marker([r.lat, r.lng], { icon: iconFor(r), opacity: r.stale ? 0.55 : 1, zIndexOffset: r.rank === 1 ? 1000 : 0 });
      m.bindTooltip(tipText(r), { direction: "top", permanent: r.rank === 1, className: "racer-tip", offset: [0, -6] });
      m.addTo(riderLayer);
      riderMarkers[r.name] = m;
    });
  }

  /* ---- Leaderboard-Zeile -> Fahrer fokussieren ---- */
  function attachRowClicks() {
    document.querySelectorAll("#tracking .row-table tbody tr").forEach(function (tr) {
      tr.style.cursor = "pointer";
      tr.title = "Auf der Karte zeigen";
      tr.onclick = function () {
        var who = tr.querySelector(".who");
        if (!who) return;
        var clean = who.textContent.replace(/[\uD800-\uDFFF]/g, "").trim();
        var key = Object.keys(riderMarkers).filter(function (n) { return clean.indexOf(n) === 0 || n.indexOf(clean) === 0; })[0];
        if (!key) return;
        map.setView(riderMarkers[key].getLatLng(), 7, { animate: true });
        riderMarkers[key].openTooltip();
        mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
      };
    });
  }

  /* ============================================================
     DEMO-Pfad (Fallback): Fahrer aus dem Leaderboard-DOM,
     Position aus km entlang der Route, sanfter Zeitraffer-Drift.
     ============================================================ */
  function deNum(s) { return parseFloat(String(s).replace(/\./g, "").replace(",", ".")) || 0; }
  var demoTimer = null;
  function startDemo() {
    var demo = [];
    document.querySelectorAll("#tracking .row-table tbody tr").forEach(function (tr, idx) {
      var who = tr.querySelector(".who"); if (!who) return;
      var nums = tr.querySelectorAll("td.num");
      var st = tr.querySelector(".status");
      demo.push({
        name: who.textContent.replace(/[\uD800-\uDFFF]/g, "").trim(),
        km: nums[0] ? deNum(nums[0].textContent) : 0,
        kmh: nums[1] ? deNum(nums[1].textContent) : 22,
        status: st && st.classList.contains("rest") ? "rest" : "ride",
        rank: idx + 1, stale: false
      });
    });
    var NOMINAL = 4800;
    function placeDemo(r) { var p = pointAtFrac(Math.min(r.km, NOMINAL) / NOMINAL); r.lat = p[0]; r.lng = p[1]; }
    demo.forEach(placeDemo);
    renderRiders(demo); attachRowClicks();
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    var SPEEDUP = 25, TICK_S = 3;
    demoTimer = setInterval(function () {
      demo.forEach(function (r) {
        if (r.status === "rest" || r.km >= NOMINAL) return;
        r.km = Math.min(NOMINAL, r.km + r.kmh * TICK_S * SPEEDUP / 3600);
        placeDemo(r);
        var m = riderMarkers[r.name]; if (m) m.setLatLng([r.lat, r.lng]).setTooltipContent(tipText(r));
      });
    }, TICK_S * 1000);
  }

  /* ============================================================
     LIVE-Pfad: echte Positionen von trackleaders.com
     ============================================================ */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("load " + src)); };
      document.head.appendChild(s);
    });
  }
  function parseRider(st) {
    var ll = st._ll || [], tip = st._tip || "";
    var name = (tip.match(/\)\s*([^<]+?)\s*<\/b>/) || [])[1] || (st.name || "").replace(/_/g, " ") || "Rider";
    var age = (tip.match(/<\/b>\s*-\s*([^<]+?)<br>/) || [])[1] || "";
    var mph = parseFloat((tip.match(/([\d.]+)\s*mph/) || [])[1] || "0");
    var mile = parseFloat((tip.match(/route mile\s*([\d.]+)/) || [])[1] || "0");
    var ts = tip.match(/Distance to (TS\s*\d+:\s*[^:<]+?):\s*([\d.]+)\s*mi/) || [];
    var stale = /hour|day/.test(age);
    return {
      name: name.trim(), lat: ll[0], lng: ll[1],
      mph: mph, kmh: mph * MI, mile: mile, km: mile * MI,
      nextTS: (ts[1] || "").replace(/\s+/g, " ").trim(),
      age: age.trim(), stale: stale, cat: st.mycategory || "Solo",
      status: stale ? "stale" : (mph < 0.5 ? "rest" : "ride")
    };
  }
  function pullLive() {
    return loadScript(MAINPOINTS + "?t=" + Date.now()).then(function () {
      if (typeof addMainPoints !== "function") throw new Error("no addMainPoints");
      var cap = [], realMarker = L.marker;
      window.smallwindow = false;
      window.genIcons2 = function () { return {}; };
      window.markers = [];
      window.map = window.map || {}; // ihr Code ruft .addTo(map) auf — Dummy genügt, unser Stub ignoriert das Argument
      L.marker = function (ll) {
        var st = { _ll: ll, addTo: function () { return st; }, bindTooltip: function (h) { st._tip = h; return st; }, bindPopup: function () { return st; }, on: function () { return st; }, setOpacity: function () { return st; } };
        cap.push(st); return st;
      };
      try { addMainPoints(); } finally { L.marker = realMarker; }
      var riders = cap.map(parseRider).filter(function (r) { return typeof r.lat === "number" && r.name; });
      if (!riders.length) throw new Error("no riders parsed");
      riders.sort(function (a, b) { return b.mile - a.mile; }); // nach echter Streckenmeile
      riders.forEach(function (r, i) { r.rank = i + 1; });
      return riders;
    });
  }
  function cell(cls, text) {
    var td = document.createElement("td");
    if (cls) td.className = cls;
    if (text != null) td.textContent = text;
    return td;
  }
  function rebuildLeaderboard(riders) {
    var tbody = document.querySelector("#tracking .row-table tbody");
    if (!tbody) return;
    var thead = document.querySelector("#tracking .row-table thead tr");
    if (thead && thead.children[3]) thead.children[3].textContent = "Nächste TS";
    tbody.replaceChildren();
    riders.forEach(function (r, i) {
      var tr = document.createElement("tr");
      if (i >= 5) tr.className = "lb-extra";
      tr.appendChild(cell(i === 0 ? "rank top" : "rank", String(i + 1)));
      tr.appendChild(cell("who", r.name));
      tr.appendChild(cell("hide-sm", r.cat));
      tr.appendChild(cell(null, r.nextTS || "–"));
      tr.appendChild(cell("num", Math.round(r.km).toLocaleString("de-DE")));
      tr.appendChild(cell("num hide-sm", r.kmh ? r.kmh.toFixed(1).replace(".", ",") : "–"));
      var tdS = document.createElement("td");
      var chip = document.createElement("span");
      chip.className = r.stale ? "status stale" : (r.status === "rest" ? "status rest" : "status ride");
      chip.textContent = r.stale ? "kein Signal" : (r.status === "rest" ? "Pause" : "unterwegs");
      tdS.appendChild(chip);
      tr.appendChild(tdS);
      tbody.appendChild(tr);
    });
    attachRowClicks();
  }
  function setLiveLabels() {
    var mapHead = document.querySelector(".live-map__head .live__updated");
    if (mapHead) mapHead.textContent = "LIVE · trackleaders.com";
    var lbHead = document.querySelector(".live .live__updated");
    if (lbHead) lbHead.textContent = "Stand: live · RAAM 2026";
    var hint = document.querySelector(".live__hint");
    if (hint) hint.textContent = "Echte Tracking-Daten · Refresh ~90 s";
  }

  function goLive() {
    pullLive().then(function (riders) {
      if (demoTimer) { clearInterval(demoTimer); demoTimer = null; }
      renderRiders(riders);
      rebuildLeaderboard(riders);
      setLiveLabels();
      setTimeout(function () { map.invalidateSize(); }, 100);
      setInterval(function () {
        pullLive().then(function (rs) { renderRiders(rs); rebuildLeaderboard(rs); })
          .catch(function () { /* einzelner Refresh-Fehler: alten Stand behalten */ });
      }, REFRESH_MS);
    }).catch(function (err) {
      if (window.console) console.warn("Live-Tracking nicht verfügbar, nutze Beispieldaten:", err && err.message);
    });
  }

  // 1) sofort Demo zeigen, 2) auf echte Daten upgraden
  startDemo();
  goLive();

  /* ---- Theme-Swap ---- */
  new MutationObserver(function () { tiles.setUrl(isDark() ? TILES.dark : TILES.light); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  setTimeout(function () { map.invalidateSize(); }, 300);
  window.addEventListener("resize", function () { map.invalidateSize(); });
})();
