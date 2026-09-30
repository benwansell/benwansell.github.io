/* app.js — everything the Shiny server() did, running in the browser.
 *
 * Charts are hand-rolled SVG (no plotting library); the maps are Leaflet.
 * The model itself lives in model.js.
 */
(function () {
"use strict";

var M = window.GEModel;
var PARTIES = M.PARTIES;
var COL = M.PARTY_COLOUR;

/* ---------------------------------------------------------------- state */

var state = {
  inputs: Object.assign({}, M.DEFAULT_INPUTS),
  mode: "uns",
  tab: "seats",
  xDemog: "c21HouseOutright",
  yDemog: "Con",
  constituency: null,
  picked: null            // {mode, name} from a plot click
};

var prepared = null;
var hexGeo = null;
var results = { uns: [], ps: [] };
var maps = {};            // mode -> {map, layer}

var POLLS = [
  ["cons", "Conservative", "Con"],
  ["lab", "Labour", "Lab"],
  ["lib", "Liberal Democrats", "Lib"],
  ["ref", "Reform UK", "Ref"],
  ["green", "Green Party", "Green"],
  ["snp", "SNP", "SNP"],
  ["pc", "Plaid Cymru", "PC"]
];

var TACTICAL = [
  ["tacLab", "Labour voters"],
  ["tacLib", "Liberal Democrat voters"],
  ["tacGreen", "Green voters"],
  ["tacCon", "Conservative voters"],
  ["tacRef", "Reform voters"]
];

var DEMOGRAPHICS = [
  ["c21HouseOutright", "Own house: outright"],
  ["c21HouseMortgage", "Own house: mortgage"],
  ["c21HousePrivateLandlord", "Private renter"],
  ["c21HouseSocialLA", "Social renter"],
  ["c21QualLevel1", "Level 1 quals (primary)"],
  ["c21QualLevel2", "Level 2 quals (GCSE/O-level)"],
  ["c21QualLevel3", "Level 3 quals (A-level)"],
  ["c21QualLevel4", "Level 4 quals (degree)"],
  ["c21QualApprentice", "Apprenticeships"],
  ["c21Employed", "Employed"],
  ["c21Unemployed", "Unemployed"],
  ["c21NSSECFulltimeStudent", "Student"],
  ["c21InactiveRetired", "Retired"],
  ["HanrettyLeave", "Brexit leave vote"],
  ["c21PopulationDensity", "Population density"],
  ["AgeUnder15", "Age under 15"],
  ["Age16to24", "Age 16 to 24"],
  ["Age25to34", "Age 25 to 34"],
  ["Age35to44", "Age 35 to 44"],
  ["Age45to54", "Age 45 to 54"],
  ["Age55to64", "Age 55 to 64"],
  ["AgeOver65", "Age over 65"],
  ["born_uk", "Born in UK"],
  ["c21PassportNone", "No passport"],
  ["c21EthnicityWhite", "White"],
  ["c21EthnicityWhiteBritish", "White British"],
  ["c21EthnicityWhiteOther", "Other white"],
  ["c21EthnicityAsian", "Asian"],
  ["c21EthnicityBlack", "Black"],
  ["c21EthnicityMixed", "Mixed ethnicity"],
  ["c21Buddhist", "Buddhist"],
  ["c21Christian", "Christian"],
  ["c21Hindu", "Hindu"],
  ["c21Jewish", "Jewish"],
  ["c21Muslim", "Muslim"],
  ["c21Sikh", "Sikh"],
  ["c21ReligionOther", "Other religion"],
  ["c21NoReligion", "Not religious"]
];

var DEMOG_LABEL = {};
DEMOGRAPHICS.forEach(function (d) { DEMOG_LABEL[d[0]] = d[1]; });

var MODE_LABEL = { uns: "Uniform National Swing", ps: "Proportionate Swing" };

/* ------------------------------------------------------------- dom utils */

function $(sel) { return document.querySelector(sel); }

function h(tag, attrs, kids) {
  var node = document.createElement(tag);
  if (attrs) for (var k in attrs) {
    if (k === "class") node.className = attrs[k];
    else if (k === "text") node.textContent = attrs[k];
    else if (k === "html") node.innerHTML = attrs[k];
    else node.setAttribute(k, attrs[k]);
  }
  (kids || []).forEach(function (c) { node.appendChild(c); });
  return node;
}

var NS = "http://www.w3.org/2000/svg";
function s(tag, attrs, parent) {
  var node = document.createElementNS(NS, tag);
  if (attrs) for (var k in attrs) {
    if (k === "text") node.textContent = attrs[k];
    else node.setAttribute(k, attrs[k]);
  }
  if (parent) parent.appendChild(node);
  return node;
}

function fmt(x, d) {
  if (x == null || !isFinite(x)) return "–";
  return x.toFixed(d == null ? 1 : d);
}

/* ------------------------------------------------------------ axis ticks */

function niceTicks(lo, hi, want) {
  if (!(hi > lo)) { hi = lo + 1; }
  var raw = (hi - lo) / (want || 6);
  var mag = Math.pow(10, Math.floor(Math.log10(raw)));
  var norm = raw / mag;
  var step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  var ticks = [];
  for (var t = Math.ceil(lo / step) * step; t <= hi + step * 1e-9; t += step) {
    ticks.push(Math.abs(t) < step * 1e-9 ? 0 : t);
  }
  return ticks;
}

function tickLabel(v) {
  if (Math.abs(v) >= 10000) return (v / 1000) + "k";
  return String(Math.round(v * 1000) / 1000);
}

/* --------------------------------------------------------- chart chassis */

// Returns {svg, plot, x, y, W, H, pad} with axes already drawn.
function frame(opts) {
  var W = opts.width || 660, H = opts.height || 430;
  var pad = Object.assign({ t: 14, r: 18, b: 46, l: 58 }, opts.pad);
  var svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.setAttribute("role", "img");
  // Scale down to fit a narrow screen, but never up: past its natural size the
  // chart just gets bigger, not more readable.
  svg.style.maxWidth = W + "px";
  if (opts.title) svg.setAttribute("aria-label", opts.title);

  var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  var xs = opts.xDomain, ys = opts.yDomain;

  function x(v) { return pad.l + (v - xs[0]) / (xs[1] - xs[0]) * iw; }
  function y(v) { return pad.t + ih - (v - ys[0]) / (ys[1] - ys[0]) * ih; }

  var g = s("g", {}, svg);

  // y grid + labels
  (opts.yTicks || niceTicks(ys[0], ys[1], 6)).forEach(function (t) {
    if (t < ys[0] - 1e-9 || t > ys[1] + 1e-9) return;
    s("line", { x1: pad.l, x2: W - pad.r, y1: y(t), y2: y(t),
                stroke: "#eceff3", "stroke-width": 1 }, g);
    s("text", { x: pad.l - 8, y: y(t) + 4, "text-anchor": "end",
                "font-size": 11, fill: "#5b6b7c", text: tickLabel(t) }, g);
  });

  // x ticks
  if (opts.xBand) {
    opts.xBand.forEach(function (name, i) {
      var cx = pad.l + iw * (i + 0.5) / opts.xBand.length;
      s("text", { x: cx, y: H - pad.b + 18, "text-anchor": "middle",
                  "font-size": 12, fill: "#17202a", text: name }, g);
    });
  } else {
    (opts.xTicks || niceTicks(xs[0], xs[1], 7)).forEach(function (t) {
      if (t < xs[0] - 1e-9 || t > xs[1] + 1e-9) return;
      s("text", { x: x(t), y: H - pad.b + 18, "text-anchor": "middle",
                  "font-size": 11, fill: "#5b6b7c", text: tickLabel(t) }, g);
    });
  }

  // axis lines (theme_classic)
  s("line", { x1: pad.l, x2: W - pad.r, y1: H - pad.b, y2: H - pad.b,
              stroke: "#17202a", "stroke-width": 1 }, g);
  s("line", { x1: pad.l, x2: pad.l, y1: pad.t, y2: H - pad.b,
              stroke: "#17202a", "stroke-width": 1 }, g);

  if (opts.xLab) {
    s("text", { x: pad.l + iw / 2, y: H - 6, "text-anchor": "middle",
                "font-size": 12, fill: "#17202a", text: opts.xLab }, g);
  }
  if (opts.yLab) {
    s("text", { x: 14, y: pad.t + ih / 2, "text-anchor": "middle", "font-size": 12,
                fill: "#17202a", transform: "rotate(-90 14 " + (pad.t + ih / 2) + ")",
                text: opts.yLab }, g);
  }

  var plot = s("g", {}, svg);
  return { svg: svg, plot: plot, x: x, y: y, W: W, H: H, pad: pad, iw: iw, ih: ih };
}

// Wire up click-to-identify over a set of {px, py, row} points.
function clickable(f, points, onPick) {
  f.svg.style.cursor = "crosshair";
  f.svg.addEventListener("click", function (ev) {
    var box = f.svg.getBoundingClientRect();
    var sx = (ev.clientX - box.left) / box.width * f.W;
    var sy = (ev.clientY - box.top) / box.height * f.H;
    var best = null, bestD = Infinity;
    points.forEach(function (p) {
      var d = (p.px - sx) * (p.px - sx) + (p.py - sy) * (p.py - sy);
      if (d < bestD) { bestD = d; best = p; }
    });
    // nearPoints() in Shiny uses a 5px threshold on a ~700px plot
    if (best && Math.sqrt(bestD) <= 14) onPick(best.row);
  });
}

/* ------------------------------------------------------------ the charts */

function seatChart(res, mode) {
  var counts = M.seatCounts(res);
  var order = PARTIES.slice().sort(function (a, b) {
    return (counts[b] || 0) - (counts[a] || 0);
  });
  var maxSeat = Math.max(340, Math.max.apply(null, order.map(function (p) { return counts[p] || 0; })));

  var f = frame({
    width: 660, height: 420, yDomain: [0, maxSeat * 1.06], xDomain: [0, 1],
    xBand: order, yLab: "No. of seats", pad: { t: 14, r: 18, b: 40, l: 58 },
    title: "Predicted seats, " + MODE_LABEL[mode]
  });

  var bw = f.iw / order.length;
  order.forEach(function (p, i) {
    var n = counts[p] || 0;
    var cx = f.pad.l + bw * (i + 0.5);
    var w = bw * 0.72;
    s("rect", { x: cx - w / 2, y: f.y(n), width: w, height: Math.max(0, f.y(0) - f.y(n)),
                fill: COL[p] }, f.plot);
    s("text", { x: cx, y: f.y(n) - 6, "text-anchor": "middle", "font-size": 12,
                "font-weight": 600, fill: "#17202a", text: n }, f.plot);
  });

  // 325 = pure majority
  s("line", { x1: f.pad.l, x2: f.W - f.pad.r, y1: f.y(325), y2: f.y(325),
              stroke: "#17202a", "stroke-width": 1, "stroke-dasharray": "3 3" }, f.plot);
  s("text", { x: f.W - f.pad.r - 2, y: f.y(325) - 5, "text-anchor": "end",
              "font-size": 10, fill: "#5b6b7c", text: "325 (majority)" }, f.plot);

  return f.svg;
}

function scatterChart(res, mode, onPick) {
  var xs = res.map(function (r) { return r.lab_min_con_24; });
  var ys = res.map(function (r) { return r.HanrettyLeave; });
  var f = frame({
    width: 700, height: 500,
    xDomain: pad2(Math.min.apply(null, xs), Math.max.apply(null, xs)),
    yDomain: pad2(Math.min.apply(null, ys), Math.max.apply(null, ys)),
    xLab: "Labour lead over Conservatives 2024",
    yLab: "Brexit vote (Hanretty)",
    title: "Predicted winner by 2024 Lab–Con gap and Brexit vote, " + MODE_LABEL[mode]
  });

  s("line", { x1: f.x(0), x2: f.x(0), y1: f.pad.t, y2: f.H - f.pad.b,
              stroke: "#d8dee6", "stroke-dasharray": "4 3" }, f.plot);
  s("line", { x1: f.pad.l, x2: f.W - f.pad.r, y1: f.y(50), y2: f.y(50),
              stroke: "#d8dee6", "stroke-dasharray": "4 3" }, f.plot);

  var pts = [];
  res.forEach(function (r) {
    var px = f.x(r.lab_min_con_24), py = f.y(r.HanrettyLeave);
    s("text", { x: px, y: py + 3, "text-anchor": "middle", "font-size": 9,
                fill: COL[r.winner], opacity: 0.75, text: r.winner }, f.plot);
    pts.push({ px: px, py: py, row: r });
  });
  clickable(f, pts, onPick);
  return f.svg;
}

function pad2(lo, hi) {
  var d = (hi - lo) || 1;
  return [lo - d * 0.04, hi + d * 0.04];
}

// Ordinary least squares plus a 95% confidence band for the mean — the same
// thing geom_smooth(method = "lm") draws.
function olsFit(pts) {
  var n = pts.length;
  if (n < 3) return null;
  var sx = 0, sy = 0;
  pts.forEach(function (p) { sx += p.x; sy += p.y; });
  var mx = sx / n, my = sy / n;
  var sxx = 0, sxy = 0;
  pts.forEach(function (p) { sxx += (p.x - mx) * (p.x - mx); sxy += (p.x - mx) * (p.y - my); });
  if (!(sxx > 0)) return null;
  var b1 = sxy / sxx, b0 = my - b1 * mx;
  var sse = 0;
  pts.forEach(function (p) { var e = p.y - (b0 + b1 * p.x); sse += e * e; });
  var sigma2 = sse / (n - 2);
  return {
    at: function (x0) { return b0 + b1 * x0; },
    se: function (x0) {
      return Math.sqrt(sigma2 * (1 / n + (x0 - mx) * (x0 - mx) / sxx));
    },
    tcrit: tQuantile975(n - 2)
  };
}

// Cornish–Fisher expansion; exact enough well past df = 30.
function tQuantile975(df) {
  var z = 1.959963985;
  return z + (z * z * z + z) / (4 * df) +
         (5 * Math.pow(z, 5) + 16 * z * z * z + 3 * z) / (96 * df * df);
}

function demogChart(res, mode, xVar, yVar, onPick) {
  var pts = [];
  res.forEach(function (r) {
    var xv = (xVar in r) ? r[xVar] : r._src[xVar];
    var yv = r[yVar];
    if (xv == null || yv == null || !isFinite(xv) || !isFinite(yv)) return;
    pts.push({ x: xv, y: yv, row: r });
  });

  if (!pts.length) return h("p", { class: "readout", text: "No data for this combination." });

  var xr = pad2(Math.min.apply(null, pts.map(function (p) { return p.x; })),
                Math.max.apply(null, pts.map(function (p) { return p.x; })));
  var yr = pad2(Math.min.apply(null, pts.map(function (p) { return p.y; })),
                Math.max.apply(null, pts.map(function (p) { return p.y; })));

  var f = frame({
    width: 700, height: 500, xDomain: xr, yDomain: yr,
    xLab: "Demographic: " + (DEMOG_LABEL[xVar] || xVar),
    yLab: "Predicted vote for " + (M.PARTY_LABEL[yVar] || yVar),
    title: (DEMOG_LABEL[xVar] || xVar) + " against predicted " + yVar + " vote, " + MODE_LABEL[mode]
  });

  var fit = olsFit(pts);
  if (fit) {
    var lo = [], hi = [], line = [];
    for (var i = 0; i <= 80; i++) {
      var x0 = xr[0] + (xr[1] - xr[0]) * i / 80;
      var m = fit.at(x0), e = fit.tcrit * fit.se(x0);
      line.push([f.x(x0), f.y(m)]);
      lo.push([f.x(x0), f.y(m - e)]);
      hi.push([f.x(x0), f.y(m + e)]);
    }
    var ribbon = hi.concat(lo.slice().reverse())
      .map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); })
      .join(" ") + " Z";
    s("path", { d: ribbon, fill: "#9aa5b1", opacity: 0.22 }, f.plot);
    s("path", {
      d: line.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" "),
      fill: "none", stroke: "#6b7683", "stroke-width": 1.6
    }, f.plot);
  }

  var hit = [];
  pts.forEach(function (p) {
    var px = f.x(p.x), py = f.y(p.y);
    s("text", { x: px, y: py + 3, "text-anchor": "middle", "font-size": 9,
                fill: COL[p.row.winner], opacity: 0.75, text: p.row.winner }, f.plot);
    hit.push({ px: px, py: py, row: p.row });
  });
  clickable(f, hit, onPick);
  return f.svg;
}

function prChart(res, mode) {
  var pr = M.prSeats(state.inputs);
  var fptp = M.seatCounts(res);
  var order = PARTIES.slice().sort(function (a, b) { return (pr[b] || 0) - (pr[a] || 0); });
  var top = Math.max(340, Math.max.apply(null, order.map(function (p) {
    return Math.max(pr[p] || 0, fptp[p] || 0);
  })));

  var f = frame({
    width: 660, height: 430, yDomain: [0, top * 1.1], xDomain: [0, 1], xBand: order,
    yLab: "Seats", pad: { t: 14, r: 18, b: 40, l: 58 },
    title: "Seats under PR compared with first-past-the-post, " + MODE_LABEL[mode]
  });

  var bw = f.iw / order.length;
  order.forEach(function (p, i) {
    var cx = f.pad.l + bw * (i + 0.5);
    var w = bw * 0.72;
    var nPr = pr[p] || 0, nF = fptp[p] || 0;
    s("rect", { x: cx - w / 2, y: f.y(nPr), width: w, height: Math.max(0, f.y(0) - f.y(nPr)),
                fill: COL[p], opacity: 0.85 }, f.plot);
    s("rect", { x: cx - w / 2, y: f.y(nF), width: w, height: Math.max(0, f.y(0) - f.y(nF)),
                fill: "none", stroke: "#17202a", "stroke-width": 1.5, "stroke-dasharray": "4 2" }, f.plot);
    var top = f.y(Math.max(nPr, nF));
    s("text", { x: cx, y: top - 20, "text-anchor": "middle", "font-size": 11,
                "font-weight": 600, fill: "#17202a", text: "PR " + nPr }, f.plot);
    s("text", { x: cx, y: top - 7, "text-anchor": "middle", "font-size": 11,
                fill: "#5b6b7c", text: "FPTP " + nF }, f.plot);
  });

  s("line", { x1: f.pad.l, x2: f.W - f.pad.r, y1: f.y(325), y2: f.y(325),
              stroke: "#17202a", "stroke-width": 1, "stroke-dasharray": "3 3" }, f.plot);
  return f.svg;
}

/* -------------------------------------------------------------- the maps */

// Re-fit the hexes to the container. Needed after creation and after any
// resize: the map is built while its panel is still being laid out, so the
// first fitBounds sees the wrong width and leaves the UK small and off-centre.
// Fitting against a zero-size container leaves Leaflet's SVG renderer at 0x0
// and every hex gets clipped away, so only fit once the panel has real
// dimensions — and fit again whenever they change.
function fitMap(m) {
  if (m.fitting || m.userMoved) return;   // the observer fires again mid-fit
  var r = m.host.getBoundingClientRect();
  if (!(r.width > 0 && r.height > 0)) return;
  m.fitting = true;
  try {
    m.map.invalidateSize({ animate: false });
    var b = m.layer.getBounds();
    if (b.isValid()) m.map.fitBounds(b, { padding: [10, 10], animate: false });
  } finally {
    m.fitting = false;
  }
}

function ensureMap(mode, host) {
  if (maps[mode] && maps[mode].host === host) return maps[mode];
  if (maps[mode]) { if (maps[mode].ro) maps[mode].ro.disconnect(); maps[mode].map.remove(); }

  var map = L.map(host, {
    attributionControl: true, zoomControl: true, dragging: true,
    scrollWheelZoom: false, doubleClickZoom: true, maxZoom: 10,
    // The hex layout is tall, so the fit is height-limited; integer zoom
    // steps would leave it at less than half the available size.
    zoomSnap: 0, zoomDelta: 0.5
  });
  map.attributionControl.setPrefix(
    'Hex layout: Automatic Knowledge Ltd · <a href="https://leafletjs.com">Leaflet</a>'
  );

  var layer = L.geoJSON(hexGeo, {
    style: function () { return { color: "grey", weight: 0.75, opacity: 0.5, fillOpacity: 1 }; }
  }).addTo(map);

  // Give the map a valid view straight away, even if the container has no
  // size yet: until a view is set Leaflet never builds the vector renderer.
  var b0 = layer.getBounds();
  if (b0.isValid()) map.fitBounds(b0, { animate: false });

  var m = { map: map, layer: layer, host: host, fitting: false, userMoved: false };
  // Stop auto-fitting once the reader pans or zooms themselves. Watching the
  // DOM rather than Leaflet's zoom events avoids counting our own fitBounds.
  ["pointerdown", "wheel", "touchstart"].forEach(function (evt) {
    host.addEventListener(evt, function () { m.userMoved = true; }, { passive: true });
  });

  fitMap(m);
  // The panel may have been hidden or mid-layout a moment ago; refit when it
  // gets its real size, and on window resize.
  if (typeof ResizeObserver === "function") {
    m.ro = new ResizeObserver(function () { fitMap(m); });
    m.ro.observe(host);
  }

  maps[mode] = m;
  return m;
}

function paintMap(mode, host) {
  var m = ensureMap(mode, host);
  var byId = {};
  results[mode].forEach(function (r) { byId[r.ONSConstID] = r; });

  m.layer.eachLayer(function (lyr) {
    var p = lyr.feature.properties;
    var r = byId[p.ONSConstID];
    // The only hex without a row is Chorley — the Speaker's seat, excluded
    // from the model. Draw it hatched-grey rather than as a spurious winner.
    lyr.setStyle(r ? { fillColor: COL[r.winner], fillOpacity: 1 }
                   : { fillColor: "#ffffff", fillOpacity: 0.35 });
    lyr.bindTooltip(
      r ? "<b>" + esc(p.BCName) + "</b><br>" +
          "Winner in GE24: " + esc(r.Winner24) + "<br>" +
          "Winner in GE29: " + esc(r.winner) + "<br>" +
          "Margin: " + fmt(r.margin, 1) + " pts"
        : "<b>" + esc(p.BCName) + "</b><br>Not modelled (Speaker's seat)",
      { sticky: true }
    );
    lyr.off("click").on("click", function () {
      if (r) { state.constituency = r.ConstituencyName; $("#constPick").value = r.ConstituencyName; renderConstDetail(); }
    });
  });
  setTimeout(function () { if (!m.userMoved) fitMap(m); else m.map.invalidateSize(); }, 0);
}

function esc(x) {
  return String(x == null ? "" : x).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}

/* --------------------------------------------------------------- tables */

function table(cols, rows, opts) {
  var thead = h("thead", {}, [h("tr", {}, cols.map(function (c) {
    return h("th", { text: c.label });
  }))]);
  var tbody = h("tbody", {}, rows.map(function (r) {
    return h("tr", {}, cols.map(function (c) {
      var v = c.get(r);
      var td = h("td", { text: v == null ? "–" : String(v) });
      if (c.cls) td.className = c.cls(r, v);
      return td;
    }));
  }));
  var wrap = h("div", { class: "tablewrap" + ((opts && opts.short) ? " short" : "") },
                [h("table", {}, [thead, tbody])]);
  return wrap;
}

function renderDiffTable() {
  var uns = M.seatCounts(results.uns);
  var ps = M.seatCounts(results.ps);
  var pr = M.prSeats(state.inputs);

  // app.R left-joins UNS onto PS, which silently drops parties that win seats
  // only under PS. Showing the union instead — same numbers, no missing rows.
  var parties = PARTIES.filter(function (p) { return uns[p] || ps[p] || pr[p]; });

  var rows = parties.map(function (p) {
    return { p: p, uns: uns[p] || 0, ps: ps[p] || 0, pr: pr[p] || 0 };
  });

  var fresh = table([
    { label: "Winner", get: function (r) { return M.PARTY_LABEL[r.p]; }, cls: function () { return "party"; } },
    { label: "UNS", get: function (r) { return r.uns; } },
    { label: "PS", get: function (r) { return r.ps; } },
    { label: "PS − UNS", get: function (r) { return signed(r.ps - r.uns); }, cls: neg },
    { label: "PR seats", get: function (r) { return r.pr; } },
    { label: "UNS − PR", get: function (r) { return signed(r.uns - r.pr); }, cls: neg },
    { label: "PS − PR", get: function (r) { return signed(r.ps - r.pr); }, cls: neg }
  ], rows, { short: true });
  fresh.id = "diffTable";
  $("#diffTable").replaceWith(fresh);
}

function signed(n) { return (n > 0 ? "+" : "") + n; }
function neg(r, v) { return String(v).indexOf("-") === 0 ? "neg" : ""; }

function renderMarginals() {
  var host = $("#marginalsPair");
  host.innerHTML = "";
  var modes = state.mode === "both" ? ["uns", "ps"] : [state.mode];
  host.className = "pair" + (modes.length > 1 ? " two" : "");

  modes.forEach(function (mode) {
    var top50 = results[mode].slice()
      .sort(function (a, b) { return a.margin - b.margin; })
      .slice(0, 50);
    var fig = h("div", { class: "fig" }, [h("h4", { text: MODE_LABEL[mode] })]);
    fig.appendChild(table([
      { label: "Constituency", get: function (r) { return r.ConstituencyName; } },
      { label: "GE24 winner", get: function (r) { return r.Winner24; } },
      { label: "GE29 winner", get: function (r) { return r.winner; }, cls: function () { return "party"; } },
      { label: "Margin", get: function (r) { return fmt(r.margin, 2); } }
    ], top50));
    host.appendChild(fig);
  });
}

function renderConstDetail() {
  var name = state.constituency;
  var rowsFor = function (mode) {
    var r = results[mode].filter(function (x) { return x.ConstituencyName === name; })[0];
    return r ? { mode: mode, r: r } : null;
  };
  var rows = ["uns", "ps"].map(rowsFor).filter(Boolean);

  var cols = [{ label: "Model", get: function (d) { return MODE_LABEL[d.mode]; } },
              { label: "Margin", get: function (d) { return fmt(d.r.margin, 2); } },
              { label: "Winner", get: function (d) { return d.r.winner; }, cls: function () { return "party"; } }]
    .concat(PARTIES.map(function (p) {
      return { label: p, get: function (d) { return fmt(d.r[p], 2); } };
    }));

  var host = $("#constDetail");
  var fresh = table(cols, rows, { short: true });
  fresh.id = "constDetail";
  host.replaceWith(fresh);
}

/* ------------------------------------------------------------- downloads */

function toCsv(res) {
  var cols = ["ONSConstID", "ConstituencyName", "Country", "Region", "Winner24",
              "winner", "margin"].concat(PARTIES);
  var lines = [cols.join(",")];
  res.forEach(function (r) {
    lines.push(cols.map(function (c) {
      var v = r[c];
      if (typeof v === "string" && /[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
      return v;
    }).join(","));
  });
  return lines.join("\n");
}

function download(name, text) {
  var blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var a = h("a", { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
}

/* ---------------------------------------------------------------- render */

function describe(r, mode) {
  return r.ConstituencyName + " (" + MODE_LABEL[mode] + ") — winner " + r.winner +
    ", margin " + fmt(r.margin, 2) + " · " +
    PARTIES.map(function (p) { return p + " " + fmt(r[p], 1); }).join("  ");
}

function renderTab() {
  var modes = state.mode === "both" ? ["uns", "ps"] : [state.mode];
  var twoClass = "pair" + (modes.length > 1 ? " two" : "");

  if (state.tab === "seats") {
    var host = $("#seatsPair");
    host.className = twoClass; host.innerHTML = "";
    modes.forEach(function (m) {
      host.appendChild(h("div", { class: "fig" },
        [h("h4", { text: MODE_LABEL[m] }), seatChart(results[m], m)]));
    });
  }

  if (state.tab === "plot") {
    var ph = $("#plotPair");
    ph.className = twoClass; ph.innerHTML = "";
    modes.forEach(function (m) {
      ph.appendChild(h("div", { class: "fig" }, [
        h("h4", { text: MODE_LABEL[m] }),
        scatterChart(results[m], m, function (r) {
          $("#plotReadout").textContent = describe(r, m);
          state.constituency = r.ConstituencyName;
          $("#constPick").value = r.ConstituencyName;
          renderConstDetail();
        })
      ]));
    });
  }

  if (state.tab === "demog") {
    var dh = $("#demogPair");
    dh.className = twoClass; dh.innerHTML = "";
    modes.forEach(function (m) {
      dh.appendChild(h("div", { class: "fig" }, [
        h("h4", { text: MODE_LABEL[m] }),
        demogChart(results[m], m, state.xDemog, state.yDemog, function (r) {
          $("#demogReadout").textContent = describe(r, m);
          state.constituency = r.ConstituencyName;
          $("#constPick").value = r.ConstituencyName;
          renderConstDetail();
        })
      ]));
    });
  }

  if (state.tab === "map") {
    var mh = $("#mapPair");
    mh.className = twoClass + " maps";
    // Leaflet keeps DOM state, so only rebuild when the set of panes changes.
    if (mh.dataset.modes !== modes.join(",")) {
      Object.keys(maps).forEach(function (k) {
        if (maps[k].ro) maps[k].ro.disconnect();
        maps[k].map.remove(); delete maps[k];
      });
      mh.innerHTML = "";
      modes.forEach(function (m) {
        var host = h("div", { class: "leafmap", id: "leaf-" + m });
        mh.appendChild(h("div", { class: "fig" }, [h("h4", { text: MODE_LABEL[m] }), host]));
      });
      mh.dataset.modes = modes.join(",");
    }
    modes.forEach(function (m) { paintMap(m, document.getElementById("leaf-" + m)); });
  }

  if (state.tab === "pr") {
    var rh = $("#prPair");
    rh.className = twoClass; rh.innerHTML = "";
    modes.forEach(function (m) {
      rh.appendChild(h("div", { class: "fig" },
        [h("h4", { text: "First-past-the-post: " + MODE_LABEL[m] }), prChart(results[m], m)]));
    });
  }
}

function recompute() {
  results.uns = M.runModel(prepared, state.inputs, "uns");
  results.ps = M.runModel(prepared, state.inputs, "ps");
  renderTab();
  renderDiffTable();
  renderMarginals();
  renderConstDetail();
  renderPollTotal();
}

function renderPollTotal() {
  var t = POLLS.reduce(function (a, p) { return a + (state.inputs[p[0]] || 0); }, 0);
  var el = $("#pollTotal");
  el.textContent = "Named parties total " + t.toFixed(1) + "% — " +
    (100 - t).toFixed(1) + "% left for others.";
  el.className = "totals" + (t > 100 ? " over" : "");
}

/* ----------------------------------------------------------- the controls */

function buildControls() {
  var pg = $("#pollGrid");
  POLLS.forEach(function (p) {
    var input = h("input", { type: "number", step: "0.1", min: "0", max: "100",
                             value: state.inputs[p[0]], id: "in-" + p[0] });
    input.addEventListener("input", function () {
      var v = parseFloat(input.value);
      state.inputs[p[0]] = isFinite(v) ? v : 0;
      recompute();
    });
    var lab = h("label", { for: "in-" + p[0] });
    lab.appendChild(h("span", { class: "swatch" }));
    lab.lastChild.style.background = COL[p[2]];
    lab.appendChild(document.createTextNode(p[1]));
    pg.appendChild(h("div", { class: "poll-row" }, [lab, input]));
  });

  var tg = $("#tacticalGrid");
  TACTICAL.forEach(function (t) {
    var out = h("b", { text: "0%" });
    var range = h("input", { type: "range", min: "0", max: "1", step: "0.01",
                             value: state.inputs[t[0]], id: "in-" + t[0] });
    range.addEventListener("input", function () {
      state.inputs[t[0]] = parseFloat(range.value);
      out.textContent = Math.round(state.inputs[t[0]] * 100) + "%";
      recompute();
    });
    var head = h("div", { class: "slabel" }, [h("span", { text: t[1] }), out]);
    tg.appendChild(h("div", { class: "slider-row" }, [head, range]));
  });

  $("#resetBtn").addEventListener("click", function () {
    state.inputs = Object.assign({}, M.DEFAULT_INPUTS);
    POLLS.forEach(function (p) { $("#in-" + p[0]).value = state.inputs[p[0]]; });
    TACTICAL.forEach(function (t) {
      $("#in-" + t[0]).value = 0;
      $("#in-" + t[0]).parentNode.querySelector("b").textContent = "0%";
    });
    recompute();
  });

  var xSel = $("#xDemog"), ySel = $("#yDemog");
  DEMOGRAPHICS.forEach(function (d) {
    xSel.appendChild(h("option", { value: d[0], text: d[1] }));
  });
  xSel.value = state.xDemog;
  [["Con", "Predicted Conservative vote"], ["Lab", "Predicted Labour vote"],
   ["Lib", "Predicted Liberal Democrat vote"], ["Ref", "Predicted Reform vote"],
   ["Green", "Predicted Green vote"], ["SNP", "Predicted SNP vote"],
   ["PC", "Predicted Plaid vote"]].forEach(function (d) {
    ySel.appendChild(h("option", { value: d[0], text: d[1] }));
  });
  ySel.value = state.yDemog;
  xSel.addEventListener("change", function () { state.xDemog = xSel.value; renderTab(); });
  ySel.addEventListener("change", function () { state.yDemog = ySel.value; renderTab(); });

  $("#tabs").addEventListener("click", function (ev) {
    var btn = ev.target.closest("button[data-tab]");
    if (!btn) return;
    state.tab = btn.dataset.tab;
    document.querySelectorAll("#tabs button").forEach(function (b) {
      b.classList.toggle("active", b === btn);
    });
    document.querySelectorAll(".panel").forEach(function (p) {
      p.classList.toggle("active", p.dataset.panel === state.tab);
    });
    renderTab();
  });

  $("#modeSwitch").addEventListener("change", function (ev) {
    state.mode = ev.target.value;
    renderTab();
    renderMarginals();
  });

  $("#dlUns").addEventListener("click", function () {
    download("ge2029_predictions_uns.csv", toCsv(results.uns));
  });
  $("#dlPs").addEventListener("click", function () {
    download("ge2029_predictions_ps.csv", toCsv(results.ps));
  });

  var pick = $("#constPick");
  prepared.rows.map(function (r) { return r.ConstituencyName; }).sort().forEach(function (n) {
    pick.appendChild(h("option", { value: n, text: n }));
  });
  state.constituency = pick.options[0].value;
  pick.addEventListener("change", function () {
    state.constituency = pick.value;
    renderConstDetail();
  });

  var leg = $("#mapLegend");
  PARTIES.forEach(function (p) {
    var sw = h("i");
    sw.style.background = COL[p];
    leg.appendChild(h("span", {}, [sw, document.createTextNode(M.PARTY_LABEL[p])]));
  });
}

/* ------------------------------------------------------------------ boot */

Promise.all([
  fetch("data/constituencies.json").then(function (r) {
    if (!r.ok) throw new Error("constituencies.json: HTTP " + r.status);
    return r.json();
  }),
  fetch("data/hex_boundaries.geojson").then(function (r) {
    if (!r.ok) throw new Error("hex_boundaries.geojson: HTTP " + r.status);
    return r.json();
  })
]).then(function (out) {
  prepared = M.prepare(out[0]);
  hexGeo = out[1];
  buildControls();
  recompute();
  $("#loading").classList.add("hidden");
}).catch(function (err) {
  var l = $("#loading");
  l.className = "loading error";
  l.textContent = "Could not load the data (" + err.message +
    "). This page must be served over http:// — open it with a local web server, not from file://.";
});

})();
