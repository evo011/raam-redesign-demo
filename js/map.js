/* ============================================================
   RAAM · Live-Karte (Leaflet + CARTO tiles)
   - Route Oceanside -> Annapolis als Lime-Polyline
   - Animierte Fahrer-Marker (Beispieldaten, "live")
   - Theme-passende Tiles (Positron / Dark Matter)
   - Leaderboard-Zeile klicken -> Fahrer auf Karte fokussieren
   ============================================================ */
(function () {
  "use strict";
  if (typeof L === "undefined") return;
  var mapEl = document.getElementById("liveMap");
  if (!mapEl) return;

  /* ---- Route (approx. RAAM-Waypoints, West -> Ost) ---- */
  var ROUTE = [
    [33.195, -117.379], // Oceanside, CA (Start)
    [33.256, -116.375], // Borrego Springs
    [33.04, -115.55],   // Brawley
    [33.61, -114.60],   // Blythe
    [34.22, -112.80],   // Yarnell
    [34.54, -112.47],   // Prescott
    [35.20, -111.65],   // Flagstaff
    [36.13, -111.24],   // Tuba City
    [36.73, -110.25],   // Kayenta
    [37.15, -109.86],   // Mexican Hat
    [37.35, -108.59],   // Cortez, CO
    [37.27, -107.88],   // Durango
    [37.48, -106.80],   // Wolf Creek Pass
    [37.47, -105.87],   // Alamosa
    [37.17, -104.50],   // Trinidad
    [37.25, -103.35],   // Kim
    [37.58, -101.36],   // Ulysses, KS
    [37.60, -100.44],   // Montezuma
    [37.65, -98.74],    // Pratt
    [37.78, -97.47],    // Wichita
    [37.84, -94.71],    // Fort Scott
    [38.01, -92.74],    // Camdenton, MO
    [38.58, -92.17],    // Jefferson City
    [38.56, -91.01],    // Washington, MO
    [39.12, -88.55],    // Effingham, IL
    [39.17, -86.53],    // Bloomington, IN
    [39.34, -85.48],    // Greensburg, IN
    [39.51, -84.74],    // Oxford, OH
    [39.33, -82.98],    // Chillicothe
    [39.33, -82.10],    // Athens, OH
    [39.27, -81.56],    // Parkersburg, WV
    [39.34, -80.02],    // Grafton, WV
    [39.65, -78.76],    // Cumberland, MD
    [39.64, -77.72],    // Hagerstown
    [39.37, -77.15],    // Mt. Airy, MD
    [38.978, -76.492]   // Annapolis, MD (Ziel)
  ];

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
  var NOMINAL = 4800; // nominelle Renndistanz, auf die die Fahrer-km bezogen sind

  function pointAtDistance(d) {
    d = Math.max(0, Math.min(d, TOTAL));
    for (var i = 1; i < CUM.length; i++) {
      if (CUM[i] >= d) {
        var segLen = CUM[i] - CUM[i - 1];
        var t = segLen > 0 ? (d - CUM[i - 1]) / segLen : 0;
        var a = ROUTE[i - 1], b = ROUTE[i];
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      }
    }
    return ROUTE[ROUTE.length - 1];
  }
  // place(nominalKm) -> latlng entlang der echten Polyline, proportional
  function place(nominalKm) { return pointAtDistance((Math.max(0, Math.min(nominalKm, NOMINAL)) / NOMINAL) * TOTAL); }

  /* ---- Fahrer (identisch zum Leaderboard) ---- */
  var RACERS = [
    { rank: 1, name: "M. Reyes", cls: "Solo", status: "ride", km: 2910 },
    { rank: 2, name: "L. Brandt", cls: "Solo", status: "ride", km: 2844 },
    { rank: 3, name: "S. Novak", cls: "Solo", status: "rest", km: 2790 },
    { rank: 4, name: "Team Velocità", cls: "4er", status: "ride", km: 3180 },
    { rank: 5, name: "A. Okafor", cls: "Solo", status: "ride", km: 2701 },
    { rank: 6, name: "K. Sørensen", cls: "Solo", status: "ride", km: 2655 },
    { rank: 7, name: "Team Adler", cls: "8er", status: "ride", km: 2620 },
    { rank: 8, name: "P. Lindqvist", cls: "Solo", status: "rest", km: 2588 },
    { rank: 9, name: "M. Costa", cls: "Solo", status: "ride", km: 2555 },
    { rank: 10, name: "Team Tramontana", cls: "2er", status: "ride", km: 2520 },
    { rank: 11, name: "J. Becker", cls: "Solo", status: "ride", km: 2488 },
    { rank: 12, name: "R. Tanaka", cls: "Solo", status: "rest", km: 2455 },
    { rank: 13, name: "Team Phoenix", cls: "4er", status: "ride", km: 2420 },
    { rank: 14, name: "E. Dubois", cls: "Solo", status: "ride", km: 2388 },
    { rank: 15, name: "H. Steiner", cls: "Solo", status: "ride", km: 2355 }
  ];

  function isDark() { return document.documentElement.getAttribute("data-theme") === "dark"; }
  var TILES = {
    light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
  };
  var ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
  var LIME = (getComputedStyle(document.documentElement).getPropertyValue("--accent-strong") || "#DEFF00").trim();

  var map = L.map(mapEl, { zoomControl: true, scrollWheelZoom: false, attributionControl: true, minZoom: 3, maxZoom: 11 });
  var tiles = L.tileLayer(isDark() ? TILES.dark : TILES.light, { attribution: ATTR, subdomains: "abcd" }).addTo(map);

  // Route: dunkles Casing + Lime-Linie obendrauf (auf beiden Tiles lesbar)
  L.polyline(ROUTE, { color: "#111", weight: 7, opacity: 0.22, lineJoin: "round", lineCap: "round" }).addTo(map);
  var routeLine = L.polyline(ROUTE, { color: LIME, weight: 3.5, opacity: 0.95, lineJoin: "round", lineCap: "round" }).addTo(map);
  map.fitBounds(routeLine.getBounds().pad(0.08));

  // Start / Ziel
  L.marker(ROUTE[0], { icon: L.divIcon({ className: "map-pin start", html: "Start", iconSize: [42, 20], iconAnchor: [21, 10] }), zIndexOffset: 500 })
    .addTo(map).bindTooltip("Oceanside, CA · Start", { direction: "top" });
  L.marker(ROUTE[ROUTE.length - 1], { icon: L.divIcon({ className: "map-pin finish", html: "Ziel", iconSize: [38, 20], iconAnchor: [19, 10] }), zIndexOffset: 500 })
    .addTo(map).bindTooltip("Annapolis, MD · Ziel", { direction: "top" });

  // TimeStations
  [
    { km: 1000, name: "Flagstaff, AZ" },
    { km: 1800, name: "Wolf Creek Pass, CO" },
    { km: 2550, name: "Ulysses, KS" },
    { km: 3050, name: "Camdenton, MO" },
    { km: 3950, name: "Athens, OH" }
  ].forEach(function (t) {
    L.marker(place(t.km), { icon: L.divIcon({ className: "map-ts", iconSize: [10, 10], iconAnchor: [5, 5] }) })
      .addTo(map).bindTooltip("TimeStation · " + t.name, { direction: "top" });
  });

  // Fahrer-Marker
  var markers = {};
  function racerIcon(r) {
    var size = r.rank === 1 ? 20 : 13;
    var cls = "racer-divicon";
    if (r.rank === 1) cls += " leader";
    else if (r.status === "rest") cls += " rest";
    return L.divIcon({ className: cls, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
  }
  function tipText(r) { return r.name + " · " + Math.round(r.km).toLocaleString("de-DE") + " km"; }
  RACERS.forEach(function (r) {
    var m = L.marker(place(r.km), { icon: racerIcon(r), zIndexOffset: r.rank === 1 ? 1000 : 0 }).addTo(map);
    m.bindTooltip(tipText(r), { direction: "top", permanent: r.rank === 1, className: "racer-tip", offset: [0, -6] });
    markers[r.name] = { marker: m, r: r };
  });

  /* ---- Live-Animation ---- */
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pulseEl = document.getElementById("mapPulse");
  function flash() { if (pulseEl) { pulseEl.classList.remove("on"); void pulseEl.offsetWidth; pulseEl.classList.add("on"); } }
  function step() {
    Object.keys(markers).forEach(function (k) {
      var o = markers[k], r = o.r;
      if (r.status === "rest" || r.km >= NOMINAL) return;
      var base = r.cls === "Solo" ? 1.8 : r.cls === "2er" ? 2.4 : r.cls === "4er" ? 3.0 : 3.6;
      r.km = Math.min(NOMINAL, r.km + base + Math.random() * 1.2);
      o.marker.setLatLng(place(r.km));
      o.marker.setTooltipContent(tipText(r));
    });
    flash();
  }
  if (!reduced) setInterval(step, 1600);

  /* ---- Theme-Swap (Tiles) ---- */
  new MutationObserver(function () {
    tiles.setUrl(isDark() ? TILES.dark : TILES.light);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  /* ---- Leaderboard-Zeile -> Fahrer fokussieren ---- */
  document.querySelectorAll("#tracking .row-table tbody tr").forEach(function (tr) {
    tr.style.cursor = "pointer";
    tr.title = "Auf der Karte zeigen";
    tr.addEventListener("click", function () {
      var who = tr.querySelector(".who");
      if (!who) return;
      var clean = who.textContent.replace(/[\uD800-\uDFFF]/g, "").trim(); // Flag-Emoji entfernen
      var key = Object.keys(markers).filter(function (n) { return clean.indexOf(n) === 0; })[0];
      if (!key) return;
      var o = markers[key];
      map.setView(o.marker.getLatLng(), 7, { animate: true });
      o.marker.openTooltip();
      document.getElementById("liveMap").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  // korrekte Größe nach Layout / Resize
  setTimeout(function () { map.invalidateSize(); }, 300);
  window.addEventListener("resize", function () { map.invalidateSize(); });
})();
