/* NEET Atlas: map, correlations and notes. Plain D3, no build step. */
const fmt1 = d3.format(".1f"), fmt2 = d3.format("+.2f"), fmt0 = d3.format(",.0f");
const $ = (s) => document.querySelector(s);

/* ---------- configuration ---------- */
const SCOPES = {
  gb: {
    label: "Great Britain", unit: "local authorities", file: "data/gb.json", groupLabel: "Region",
    withinLabel: "Within English regions and Wales",
    size: [800, 900],
    measures: [
      { k: "neet", label: "NEET-type rate, Census 2021/22", short: "NEET rate", unit: "%", geo: "gb",
        desc: "% of all residents aged 16–24",
        note: "Students are counted at their term-time address, so university towns look low partly because the denominator is large. Try the “non-students” measure alongside this one. Scotland is from its 2022 census, a year later than England and Wales: see About the data." },
      { k: "neet_ns", label: "NEET-type rate among non-students", short: "NEET, non-students", unit: "%", geo: "gb",
        desc: "% of 16–24s who are not full-time students", note: "Removes the university-town effect by leaving full-time students out of the denominator." },
      { k: "neet_unemp", label: "Unemployed, not a student", short: "Unemployed", unit: "%", geo: "gb", desc: "% of all residents aged 16–24" },
      { k: "neet_inact", label: "Economically inactive, not a student", short: "Inactive", unit: "%", geo: "gb",
        desc: "% of all residents aged 16–24", note: "Includes caring for family, long-term sickness and disability." },
      { k: "student", label: "Full-time students", short: "Students", unit: "%", geo: "gb", desc: "% of all residents aged 16–24" },
    ],
    outcomes: ["neet", "neet_ns", "neet_unemp", "neet_inact"],
    covariates: [
      { k: "inc_pay", label: "Median weekly pay, full-time residents", unit: "£", theme: "Income" },
      { k: "dep_2plus", label: "Households deprived in 2+ dimensions", unit: "%", theme: "Income" },
      { k: "edu_l4", label: "Degree level or above (16+)", unit: "%", theme: "Education" },
      { k: "edu_none", label: "No qualifications (16+)", unit: "%", theme: "Education" },
      { k: "edu_apprent", label: "Apprenticeship as highest (16+)", unit: "%", theme: "Education" },
      { k: "ind_manuf", label: "Manufacturing, mining, utilities", unit: "%", theme: "Industry" },
      { k: "ind_constr", label: "Construction", unit: "%", theme: "Industry" },
      { k: "ind_agri", label: "Agriculture, forestry, fishing", unit: "%", theme: "Industry" },
      { k: "ind_trade", label: "Retail, transport, hospitality", unit: "%", theme: "Industry" },
      { k: "ind_fin_prof", label: "Finance, ICT, professional", unit: "%", theme: "Industry" },
      { k: "ind_public", label: "Public admin, education, health", unit: "%", theme: "Industry" },
      { k: "cls_prof", label: "Managerial and professional class", unit: "%", theme: "Class" },
      { k: "cls_routine", label: "Routine and semi-routine class", unit: "%", theme: "Class" },
      { k: "cls_never", label: "Never worked or long-term unemployed", unit: "%", theme: "Class", mech: "Overlaps with the outcome by construction: some of the same people are counted in both." },
      { k: "dem_age65", label: "Aged 65 and over", unit: "%", theme: "Demographics" },
      { k: "dem_foreign", label: "Born outside the UK", unit: "%", theme: "Demographics" },
      { k: "dem_nonwhite", label: "Ethnic minority (non-White groups)", unit: "%", theme: "Demographics" },
      { k: "dem_density", label: "Population density (log scale)", unit: "/km²", theme: "Demographics", log: true },
      { k: "student", label: "Full-time students (16–24)", unit: "%", theme: "Demographics", mech: "Mechanical link: students and NEETs are mutually exclusive shares of the same 16–24 population." },
      { k: "ten_own", label: "Owner-occupied homes", unit: "%", theme: "Housing" },
      { k: "ten_social", label: "Social rented homes", unit: "%", theme: "Housing" },
      { k: "ten_private", label: "Private rented homes", unit: "%", theme: "Housing" },
      { k: "hl_bad", label: "Bad or very bad health", unit: "%", theme: "Health" },
      { k: "hl_disabled", label: "Disabled (Equality Act)", unit: "%", theme: "Health" },
    ],
    defaultX: "edu_none",
  },
  eu: {
    label: "Europe", unit: "NUTS 2 regions", file: "data/eu.json", groupLabel: "Country",
    withinLabel: "Within countries (country fixed effects)",
    size: [900, 780],
    measures: [
      { k: "lfs", fill: "lfs_state", label: "NEET rate, ages 15–24, Labour Force Survey 2023–25 average", short: "NEET rate 2023–25", unit: "%", geo: "n24", desc: "% of 15–24s, LFS",
        note: "The official harmonised measure, and the right one for comparing countries. The UK left this series after 2019: see the 2019 and census layers. Eurostat withholds 13 German regions as unreliable: 11 show their state's rate, dotted and marked ≈, and these are left out of rankings and correlations." },
      { k: "lfs_2021", label: "NEET rate, ages 15–24, Labour Force Survey 2021", short: "NEET rate 2021", unit: "%", geo: "n24", desc: "% of 15–24s, LFS", note: "Same year as the census layers. The UK left this series after 2019." },
      { k: "lfs_2019", label: "NEET rate, ages 15–24, Labour Force Survey 2019 (includes UK)", short: "NEET rate 2019", unit: "%", geo: "n19", desc: "% of 15–24s, LFS", note: "2019 is the last year with UK regions in Eurostat's series." },
      { k: "cens_dev", label: "Census 2021 rate, ages 16–24, gap to country average", short: "Gap to country", unit: "pp", geo: "n21c", diverging: true, desc: "gap to own country",
        note: "Shows which regions sit above or below their own country. Use this rather than the raw census rate for regional patterns. British regions are built from local census tables on Eurostat's definition; Northern Ireland is not included." },
      { k: "cens", label: "Census 2021 rate, ages 16–24 (compare within a country only)", short: "Census rate", unit: "%", geo: "n21c", desc: "% of 16–24s, census",
        note: "Do not compare across countries: national censuses classify people differently. Spain runs 15 points above its LFS rate, Romania 2 below. Within a country it tracks the LFS closely (r = 0.85). British regions use Eurostat's definition, so they read higher than the Great Britain tab (16.8% against 12.6%), because job-seeking students count here." },
    ],
    outcomes: ["lfs", "lfs_2021", "cens"],
    covariates: [
      { k: "inc_gdp", label: "GDP per head (PPS)", unit: "PPS", theme: "Income" },
      { k: "inc_hh", label: "Household disposable income per head (PPS)", unit: "PPS", theme: "Income" },
      { k: "lab_unemp", label: "Unemployment rate, 20–64", unit: "%", theme: "Labour market" },
      { k: "lab_youth_unemp", label: "Unemployment rate, 15–24", unit: "%", theme: "Labour market", mech: "Overlaps with the outcome: unemployed young people are part of the NEET count." },
      { k: "edu_tertiary", label: "Tertiary educated (25–64)", unit: "%", theme: "Education" },
      { k: "edu_low", label: "Lower secondary or less (25–64)", unit: "%", theme: "Education" },
      { k: "edu_early", label: "Early leavers from education (18–24)", unit: "%", theme: "Education", mech: "Overlaps with the outcome: many early leavers are also NEET." },
      { k: "ind_manuf", label: "Manufacturing, mining, utilities", unit: "%", theme: "Industry" },
      { k: "ind_constr", label: "Construction", unit: "%", theme: "Industry" },
      { k: "ind_agri", label: "Agriculture, forestry, fishing", unit: "%", theme: "Industry" },
      { k: "ind_trade", label: "Retail, transport, hospitality", unit: "%", theme: "Industry" },
      { k: "ind_fin_prof", label: "Finance, ICT, professional", unit: "%", theme: "Industry" },
      { k: "ind_public", label: "Public admin, education, health", unit: "%", theme: "Industry" },
      { k: "dem_medage", label: "Median age", unit: "yrs", theme: "Demographics" },
      { k: "dem_age65", label: "Aged 65 and over", unit: "%", theme: "Demographics" },
      { k: "dem_density", label: "Population density (log scale)", unit: "/km²", theme: "Demographics", log: true },
    ],
    defaultX: "inc_gdp",
  },
};

const SEQ = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#1c5cab", "#0d366b"];
const SEQ_DARK = ["#104281", "#1c5cab", "#2a78d6", "#5598e7", "#86b6ef", "#cde2fb"];
const DIV = ["#1c5cab", "#6da7ec", "#b7d3f6", "#f0efec", "#f4bcb8", "#e66767", "#b52f2f"];
const DIV_DARK = ["#86b6ef", "#3987e5", "#184f95", "#383835", "#8f2f2e", "#d95050", "#f4a5a2"];
const isDark = () => matchMedia("(prefers-color-scheme: dark)").matches;

/* ---------- state ---------- */
const S = {
  scope: "gb", tab: "map", sel: null, sortKey: "v", sortDir: -1, query: "",
  measure: { gb: "neet", eu: "lfs" }, outcome: { gb: "neet", eu: "lfs" },
  x: { gb: SCOPES.gb.defaultX, eu: SCOPES.eu.defaultX }, within: { gb: false, eu: false }, hl: { gb: "", eu: "" },
};
const D = { rows: {}, byId: {}, geo: {} };
const sc = () => SCOPES[S.scope];
const rows = () => D.rows[S.scope];
const measure = () => sc().measures.find((m) => m.k === S.measure[S.scope]);
// A stand-in rate for an area with no figure of its own. Display only: statistics read the measure's own field.
const fillOf = (r, m) => m.fill && r && !Number.isFinite(r[m.k]) && Number.isFinite(r[m.fill]) ? r[m.fill] : null;
const unitFmt = (v, u) => v == null ? "n/a" : u === "£" ? "£" + fmt0(v) : u === "PPS" ? fmt0(v) : u === "pp" ? d3.format("+.1f")(v) + " pp"
  : u === "/km²" ? fmt0(v) + "/km²" : u === "yrs" ? fmt1(v) + " yrs" : fmt1(v) + "%";

/* ---------- statistics (computed in the browser so the toggles work) ---------- */
function ranks(a) {
  const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]), r = new Array(a.length);
  for (let i = 0; i < idx.length;) {
    let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}
function pearson(x, y) {
  const mx = d3.mean(x), my = d3.mean(y); let sxy = 0, sxx = 0, syy = 0;
  x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sxx += (v - mx) ** 2; syy += (y[i] - my) ** 2; });
  return { r: sxy / Math.sqrt(sxx * syy), slope: sxy / sxx, mx, my };
}
function correlate(data, xk, yk, log, within) {
  let pts = data.filter((d) => Number.isFinite(d[xk]) && Number.isFinite(d[yk]) && (!log || d[xk] > 0))
    .map((d) => ({ d, x: log ? Math.log(d[xk]) : d[xk], y: d[yk] }));
  let G = 1;
  if (within) {
    const g = d3.group(pts, (p) => p.d.grp); pts = []; G = 0;
    for (const a of g.values()) {
      if (a.length < 2) continue;
      G++; const mx = d3.mean(a, (p) => p.x), my = d3.mean(a, (p) => p.y);
      a.forEach((p) => pts.push({ d: p.d, x: p.x - mx, y: p.y - my }));
    }
  }
  const n = pts.length;
  if (n - G - 2 < 3) return { n, pts, G, r: NaN };
  const x = pts.map((p) => p.x), y = pts.map((p) => p.y), { r, slope, mx, my } = pearson(x, y);
  const se = 1 / Math.sqrt(n - G - 2), z = Math.atanh(r);
  return { n, G, pts, r, slope, mx, my, rho: pearson(ranks(x), ranks(y)).r, lo: Math.tanh(z - 1.96 * se), hi: Math.tanh(z + 1.96 * se) };
}

/* ---------- map ---------- */
const svg = d3.select("#map");
svg.append("defs").html(`<pattern id="nd" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" class="nd-bg"/><line x1="0" y1="0" x2="0" y2="7" class="nd-ln"/></pattern><pattern id="st" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1.25" cy="1.25" r=".55" class="st-a"/><circle cx="3.75" cy="3.75" r=".55" class="st-a"/></pattern>`);
const gRoot = svg.append("g");
const gBase = gRoot.append("g"), gAreas = gRoot.append("g"), gFill = gRoot.append("g").style("pointer-events", "none"), gRing = gRoot.append("g");
const zoom = d3.zoom().scaleExtent([1, 14]).on("zoom", (e) => gRoot.attr("transform", e.transform));
svg.call(zoom);
let path = null, drawnKey = null;

function drawGeometry() {
  const m = measure(), key = S.scope + m.geo;
  if (key === drawnKey) return;
  drawnKey = key;
  const [W, H] = sc().size;
  svg.attr("viewBox", `0 0 ${W} ${H}`);
  let feats = D.geo[m.geo].features, proj;
  if (S.scope === "gb") {
    feats = feats.filter((f) => f.id[0] !== "N");
    proj = d3.geoTransverseMercator().rotate([2, 0]).fitExtent([[12, 12], [W - 12, H - 12]], { type: "FeatureCollection", features: feats });
  } else {
    proj = d3.geoAzimuthalEqualArea().rotate([-12, -52]).fitExtent([[6, 6], [W - 6, H - 6]],
      { type: "MultiPoint", coordinates: [[-11, 36], [-10, 58], [32, 35], [31, 70], [15, 70.5], [26, 35]] });
  }
  path = d3.geoPath(proj);
  gBase.selectAll("path").data(S.scope === "eu" ? D.geo.base.features : [], (d) => d.id)
    .join("path").attr("class", "base").attr("d", path);
  gAreas.selectAll("path").data(feats, (d) => d.id).join("path").attr("class", "a").attr("d", path)
    .on("mousemove", (e, f) => { showTip(e, tipHtml(f.id)); ring("hover", f.id); })
    .on("mouseleave", () => { hideTip(); ring("hover", null); })
    .on("click", (e, f) => { if (D.byId[S.scope][f.id]) select(f.id); });
  svg.call(zoom.transform, d3.zoomIdentity);
}
function featureOf(id) { return gAreas.selectAll("path").data().find((f) => f.id === id); }
function ring(kind, id) {
  const f = id ? featureOf(id) : null, cls = "ring " + kind;
  gRing.selectAll("path." + kind).data(f ? [f] : []).join("path").attr("class", cls).attr("d", path);
}
function colourScale() {
  const m = measure(), vals = rows().map((d) => d[m.k]).filter(Number.isFinite).sort(d3.ascending);
  if (m.diverging) {
    const q = d3.quantile(vals.map(Math.abs).sort(d3.ascending), 0.95), step = Math.max(1, Math.round(q / 3));
    const t = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((v) => v * step);
    return d3.scaleThreshold().domain(t).range(isDark() ? DIV_DARK : DIV);
  }
  const t = d3.range(1, 6).map((i) => d3.quantile(vals, i / 6));
  return d3.scaleThreshold().domain(t).range(isDark() ? SEQ_DARK : SEQ);
}
function drawMap() {
  drawGeometry();
  const m = measure(), col = colourScale(), by = D.byId[S.scope];
  gAreas.selectAll("path").attr("fill", (f) => {
    const v = by[f.id]?.[m.k] ?? fillOf(by[f.id], m); return Number.isFinite(v) ? col(v) : "url(#nd)";
  });
  gFill.selectAll("path").data(gAreas.selectAll("path").data().filter((f) => fillOf(by[f.id], m) != null), (d) => d.id)
    .join("path").attr("fill", "url(#st)").attr("d", path);
  ring("sel", S.sel);
  drawLegend(col, m);
}
function drawLegend(col, m) {
  const t = col.domain(), lab = (v) => m.unit === "pp" ? d3.format("+.1f")(v) : fmt1(v);
  const sw = col.range().map((c, i) => `<div class="sw"><i style="background:${c}"></i><span>${i ? lab(t[i - 1]) : "&nbsp;"}</span></div>`).join("");
  const miss = "No data";
  $("#legend").innerHTML = `<div class="t">${m.short} (${m.unit})</div><div class="row">${sw}</div><div class="nd"><i></i>${miss}</div>${m.fill ? `<div class="nd fillkey"><i></i>State rate, no regional figure</div>` : ""}`;
}
function tipHtml(id) {
  const r = D.byId[S.scope][id], m = measure();
  if (!r) return `<b>${id}</b><span>No data</span>`;
  const fv = fillOf(r, m);
  if (fv != null) return `<b>${r.name}</b><span>${r.grp}</span><br>No regional figure<br>${r.lfs_state_name} state rate: <strong>${unitFmt(fv, m.unit)}</strong>`;
  return `<b>${r.name}</b><span>${r.grp}</span><br>${m.short}: <strong>${unitFmt(r[m.k], m.unit)}</strong>`;
}

/* ---------- tiles, detail, table ---------- */
function drawTiles() {
  const m = measure(), v = rows().filter((d) => Number.isFinite(d[m.k]));
  const lo = d3.least(v, (d) => d[m.k]), hi = d3.greatest(v, (d) => d[m.k]);
  const tile = (b, s) => `<div class="tile"><b>${b}</b><span title="${s}">${s}</span></div>`;
  $("#tiles").innerHTML = tile(unitFmt(d3.median(v, (d) => d[m.k]), m.unit), `Median area, ${m.desc}`)
    + tile(unitFmt(hi[m.k], m.unit), `Highest: ${hi.name}`) + tile(unitFmt(lo[m.k], m.unit), `Lowest: ${lo.name}`)
    + tile(v.length, `${sc().unit} with data`);
}
function drawDetail() {
  const r = S.sel && D.byId[S.scope][S.sel], el = $("#detail");
  if (!r) { el.innerHTML = `<div class="g">Select an area on the map or in the table to see its figures.</div>`; return; }
  const m = measure(), v = rows().filter((d) => Number.isFinite(d[m.k])).sort((a, b) => b[m.k] - a[m.k]);
  const pos = v.findIndex((d) => d.id === r.id);
  const lines = sc().measures.map((x) => { const f = fillOf(r, x); return `<dt>${x.short}</dt><dd>${f != null ? "≈ " + unitFmt(f, x.unit) : unitFmt(r[x.k], x.unit)}</dd>`; }).join("");
  const rank = pos >= 0 ? `<dt>Rank (${m.short})</dt><dd>${pos + 1} of ${v.length}</dd>` : "";
  const flags = [];
  if (r.lfs_state != null) flags.push(`Eurostat publishes no 2023–25 figure for this region, so ≈ is the rate for ${r.lfs_state_name} as a whole. It is not ranked or used in correlations.${r.lfs_state_low ? " The state rate is itself low reliability." : ""}`);
  if (r.lfs_low) flags.push("Eurostat marks at least one LFS year here as low reliability.");
  if (r.uk_census) flags.push("Built from British census tables on Eurostat's definition. Scottish regions are from 2022.");
  if (r.cens_unk > 3) flags.push(`${fmt1(r.cens_unk)}% of census records have unknown activity status.`);
  el.innerHTML = `<h3>${r.name}</h3><div class="g">${r.grp}</div><dl>${rank}${lines}</dl>`
    + flags.map((f) => `<p class="flag">${f}</p>`).join("");
}
function tableRows() {
  const m = measure(), q = S.query.toLowerCase();
  const a = rows().filter((d) => Number.isFinite(d[m.k] ?? fillOf(d, m)) && (!q || d.name.toLowerCase().includes(q) || d.grp.toLowerCase().includes(q)));
  const key = S.sortKey === "v" ? (d) => d[m.k] ?? fillOf(d, m) : (d) => d[S.sortKey];
  return a.sort((p, r) => S.sortDir * d3.ascending(key(p), key(r)));
}
function drawTable() {
  const m = measure(), cols = [["name", "Area"], ["grp", sc().groupLabel], ["v", m.unit === "pp" ? "Gap" : "Rate"]];
  const arrow = (k) => S.sortKey === k ? (S.sortDir > 0 ? " ↑" : " ↓") : "";
  $("#rank thead").innerHTML = "<tr>" + cols.map(([k, l]) => `<th data-k="${k}" class="${k === "v" ? "n" : ""}">${l}${arrow(k)}</th>`).join("") + "</tr>";
  d3.select("#rank tbody").selectAll("tr").data(tableRows(), (d) => d.id).join("tr")
    .attr("class", (d) => [d.id === S.sel ? "sel" : "", fillOf(d, m) != null ? "filled" : ""].join(" ").trim() || null)
    .html((d) => { const f = fillOf(d, m); return `<td>${d.name}</td><td>${d.grp}</td><td class="n">${f != null ? "≈ " + unitFmt(f, m.unit) : unitFmt(d[m.k], m.unit)}</td>`; })
    .on("click", (e, d) => select(d.id))
    .order();
}
$("#rank thead").addEventListener("click", (e) => {
  const k = e.target.closest("th")?.dataset.k; if (!k) return;
  if (S.sortKey === k) S.sortDir *= -1; else { S.sortKey = k; S.sortDir = k === "v" ? -1 : 1; }
  drawTable();
});
function select(id) {
  S.sel = S.sel === id ? null : id;
  ring("sel", S.sel); drawDetail(); drawTable();
  if (S.tab === "corr") drawScatter();
}

/* ---------- correlations ---------- */
function drawDots() {
  const host = $("#dots"), W = Math.max(300, host.clientWidth), yk = S.outcome[S.scope], within = S.within[S.scope];
  const lw = Math.min(250, W * 0.56), rowH = 23, m = { t: 22, r: 12, b: 8, l: lw };
  const stats = sc().covariates.map((c) => ({ c, ...correlate(rows(), c.k, yk, c.log, within) }))
    .filter((s) => Number.isFinite(s.r)).sort((a, b) => b.r - a.r);
  const H = m.t + m.b + stats.length * rowH, x = d3.scaleLinear([-1, 1], [m.l, W - m.r]);
  const s = d3.select(host).html("").append("svg").attr("width", W).attr("height", H).attr("role", "img").attr("aria-label", "Correlation of each statistic with the outcome");
  s.append("g").attr("class", "axis").attr("transform", `translate(0,${m.t})`).call(d3.axisTop(x).tickValues([-1, -0.5, 0, 0.5, 1]).tickSize(0)).select(".domain").remove();
  s.append("g").attr("class", "gridl").attr("transform", `translate(0,${m.t})`).call(d3.axisTop(x).tickValues([-1, -0.5, 0.5, 1]).tickSize(-(H - m.t - m.b)).tickFormat(""));
  s.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", m.t).attr("y2", H - m.b).attr("stroke", "var(--axis)").attr("stroke-width", 1.5);
  const g = s.selectAll("g.dotrow").data(stats).join("g").attr("class", (d) => "dotrow" + (d.c.k === S.x[S.scope] ? " sel" : ""))
    .attr("transform", (d, i) => `translate(0,${m.t + i * rowH})`)
    .on("click", (e, d) => { S.x[S.scope] = d.c.k; drawCorr(); })
    .on("mousemove", (e, d) => showTip(e, `<b>${d.c.label}</b>r = ${fmt2(d.r)} (95% ${fmt2(d.lo)} to ${fmt2(d.hi)})<br><span>Spearman ${fmt2(d.rho)}, n = ${d.n}${d.c.mech ? "<br>Overlaps with outcome" : ""}</span>`))
    .on("mouseleave", hideTip);
  g.append("rect").attr("x", 0).attr("width", W).attr("height", rowH);
  g.append("text").attr("x", 4).attr("y", rowH / 2 + 4).text((d) => {
    const t = d.c.label + (d.c.mech ? " *" : ""), max = Math.floor(lw / 6.3);
    return t.length > max ? t.slice(0, max - 1) + "…" : t;
  });
  g.append("line").attr("x1", (d) => x(d.lo)).attr("x2", (d) => x(d.hi)).attr("y1", rowH / 2).attr("y2", rowH / 2);
  g.append("circle").attr("cx", (d) => x(d.r)).attr("cy", rowH / 2).attr("r", 5);
  if (stats.some((d) => d.c.mech)) d3.select(host).append("p").attr("class", "sub").style("margin-top", "6px").text("* Overlaps with the outcome by construction, so read with care.");
}
function drawScatter() {
  const c = sc().covariates.find((v) => v.k === S.x[S.scope]), yk = S.outcome[S.scope], ym = sc().measures.find((v) => v.k === yk);
  const within = S.within[S.scope], R = correlate(rows(), c.k, yk, c.log, within), hl = S.hl[S.scope];
  const host = $("#scatter"), W = Math.max(300, host.clientWidth), H = Math.min(480, Math.max(320, W * 0.68));
  const m = { t: 10, r: 14, b: 44, l: 50 };
  $("#sc-title").textContent = `${ym.short} and ${c.label.toLowerCase().replace("gdp", "GDP").replace("ict", "ICT").replace("uk", "UK").replace("pps", "PPS").replace("equality act", "Equality Act")}`;
  $("#sc-stats").textContent = Number.isFinite(R.r)
    ? `r = ${fmt2(R.r)} (95% ${fmt2(R.lo)} to ${fmt2(R.hi)}), Spearman ${fmt2(R.rho)}, R² = ${d3.format(".0%")(R.r ** 2)}, n = ${R.n}${within ? ` in ${R.G} groups` : ""}`
    : "Too few areas with both figures.";
  $("#sc-note").textContent = c.mech || "";
  const x = d3.scaleLinear(d3.extent(R.pts, (p) => p.x), [m.l, W - m.r]).nice();
  const y = d3.scaleLinear(d3.extent(R.pts, (p) => p.y), [H - m.b, m.t]).nice();
  const s = d3.select(host).html("").append("svg").attr("width", W).attr("height", H).attr("role", "img").attr("aria-label", $("#sc-title").textContent);
  const xt = c.log && !within ? (v) => d3.format(",.0f")(Math.exp(v)) : (v) => d3.format(within ? "+.3~g" : "~s")(v);
  s.append("g").attr("class", "gridl").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6).tickSize(-(W - m.l - m.r)).tickFormat(""));
  s.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(W < 420 ? 4 : 7).tickFormat(xt));
  s.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(within ? "+.3~g" : ".3~g")));
  const dev = within ? " (gap to group mean)" : "";
  s.append("text").attr("x", (m.l + W - m.r) / 2).attr("y", H - 8).attr("text-anchor", "middle").text(`${c.label.length > 44 ? c.label.slice(0, 43) + "…" : c.label}${dev}`);
  s.append("text").attr("transform", `translate(13,${(m.t + H - m.b) / 2}) rotate(-90)`).attr("text-anchor", "middle").text(`${ym.short}, ${ym.unit}${dev}`);
  if (Number.isFinite(R.r)) {
    const [a, b] = x.domain(), f = (v) => R.my + R.slope * (v - R.mx);
    s.append("clipPath").attr("id", "plot").append("rect").attr("x", m.l).attr("y", m.t).attr("width", W - m.l - m.r).attr("height", H - m.t - m.b);
    s.append("path").attr("class", "fit").attr("clip-path", "url(#plot)").attr("d", d3.line()([[x(a), y(f(a))], [x(b), y(f(b))]]));
  }
  const order = R.pts.slice().sort((p, q) => (p.d.grp === hl) - (q.d.grp === hl) || (p.d.id === S.sel) - (q.d.id === S.sel));
  s.selectAll("circle.pt").data(order).join("circle")
    .attr("class", (p) => "pt" + (p.d.id === S.sel ? " sel" : hl ? (p.d.grp === hl ? " on" : " dim") : ""))
    .attr("cx", (p) => x(p.x)).attr("cy", (p) => y(p.y)).attr("r", (p) => p.d.id === S.sel ? 6 : 4)
    .on("mousemove", (e, p) => showTip(e, `<b>${p.d.name}</b><span>${p.d.grp}</span><br>${ym.short}: ${unitFmt(p.d[yk], ym.unit)}<br>${c.label}: ${unitFmt(p.d[c.k], c.unit)}`))
    .on("mouseleave", hideTip).on("click", (e, p) => select(p.d.id));
  const sp = R.pts.find((p) => p.d.id === S.sel);
  if (sp) s.append("text").attr("class", "lab").attr("x", x(sp.x) + (x(sp.x) > W * 0.7 ? -9 : 9)).attr("y", y(sp.y) - 8)
    .attr("text-anchor", x(sp.x) > W * 0.7 ? "end" : "start").text(sp.d.name);
}
function corrNote() {
  const within = S.within[S.scope], yk = S.outcome[S.scope];
  if (S.scope === "eu" && yk === "cens" && !within) return "Pooled census correlations mix real differences with national classification differences. Switch Compare to “Within countries” for this outcome.";
  if (S.scope === "gb") return "Most statistics here cover England and Wales only (n = 318), because Scottish census tables for them are not loaded. Pay, density and age 65+ include Scotland. Check n on each plot.";
  if (S.scope === "eu" && !within) return "Pooled across countries, these correlations mostly reflect differences between national economies and welfare states. Use “Within countries” to look at variation inside each country.";
  return "";
}
function drawCorr() { $("#corr-note").textContent = corrNote(); drawDots(); drawScatter(); }

/* ---------- tooltip ---------- */
const tip = $("#tip");
function showTip(e, html) {
  tip.innerHTML = html; tip.hidden = false;
  const r = tip.getBoundingClientRect();
  tip.style.left = Math.max(6, Math.min(e.clientX + 14, innerWidth - r.width - 6)) + "px";
  tip.style.top = Math.max(6, Math.min(e.clientY + 14, innerHeight - r.height - 6)) + "px";
}
function hideTip() { tip.hidden = true; }

/* ---------- controls ---------- */
function fillControls() {
  const c = sc();
  $("#measure").innerHTML = c.measures.map((m) => `<option value="${m.k}">${m.label}</option>`).join("");
  $("#measure").value = S.measure[S.scope];
  $("#outcome").innerHTML = c.outcomes.map((k) => { const m = c.measures.find((v) => v.k === k); return `<option value="${k}">${m.label}</option>`; }).join("");
  $("#outcome").value = S.outcome[S.scope];
  $("#within").innerHTML = `<option value="0">All ${c.unit}</option><option value="1">${c.withinLabel}</option>`;
  $("#within").value = S.within[S.scope] ? "1" : "0";
  const groups = [...new Set(rows().map((d) => d.grp))].sort();
  $("#hl").innerHTML = `<option value="">None</option>` + groups.map((g) => `<option>${g}</option>`).join("");
  $("#hl").value = S.hl[S.scope];
}
function render() {
  $("#measure-note").textContent = measure().note || "";
  if (S.tab === "map") { drawMap(); drawTiles(); drawDetail(); drawTable(); }
  if (S.tab === "corr") drawCorr();
}
function setTab(t) {
  S.tab = t;
  document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === t));
  ["map", "corr", "about"].forEach((k) => { $("#tab-" + k).hidden = k !== t; });
  render();
}
document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
document.querySelectorAll(".seg button").forEach((b) => b.addEventListener("click", () => {
  S.scope = b.dataset.scope; S.sel = null; S.query = ""; $("#search").value = ""; S.sortKey = "v"; S.sortDir = -1; ring("sel", null);
  document.querySelectorAll(".seg button").forEach((x) => x.setAttribute("aria-pressed", x === b));
  fillControls(); render();
}));
$("#measure").addEventListener("change", (e) => { S.measure[S.scope] = e.target.value; ring("sel", null); render(); });
$("#outcome").addEventListener("change", (e) => { S.outcome[S.scope] = e.target.value; drawCorr(); });
$("#within").addEventListener("change", (e) => { S.within[S.scope] = e.target.value === "1"; drawCorr(); });
$("#hl").addEventListener("change", (e) => { S.hl[S.scope] = e.target.value; drawScatter(); });
$("#search").addEventListener("input", (e) => { S.query = e.target.value; drawTable(); });
$("#zin").addEventListener("click", () => svg.transition().duration(200).call(zoom.scaleBy, 1.6));
$("#zout").addEventListener("click", () => svg.transition().duration(200).call(zoom.scaleBy, 1 / 1.6));
$("#zreset").addEventListener("click", () => svg.transition().duration(200).call(zoom.transform, d3.zoomIdentity));
$("#csv").addEventListener("click", () => {
  const blob = new Blob([d3.csvFormat(rows())], { type: "text/csv" }), a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `neet_atlas_${S.scope}.csv`; a.click(); URL.revokeObjectURL(a.href);
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (S.tab === "corr") drawCorr(); }, 120); });

/* ---------- about ---------- */
$("#tab-about").innerHTML = `
<h2>What is measured</h2>
<p><strong>Great Britain.</strong> No official NEET rate exists for 16–24s at local authority level. Official ONS figures are national, and DfE's local figures cover 16–17s only. This atlas builds an equivalent from Census 2021 table RM024: 16–24s who are unemployed or economically inactive and are not full-time students, as a share of all 16–24s. For England and Wales that gives 12.8%. Scotland uses the equivalent from its 2022 census (tables UV601a and UV603b), which gives 10.1%.</p>
<p><strong>Scotland is a year apart.</strong> Its census was in March 2022, after lockdowns had ended, while England and Wales counted in March 2021, during one. Definitions are matched: Scotland's “inactive: student” group includes people studying but not full-time (0.47% of its 16–24s), and UV603b is used to move them into the rate, as in England and Wales. The 2.7-point gap between the two splits into 1.8 points of unemployment and 0.9 of inactivity. It may partly reflect the stronger labour market of 2022, so the step at the border should not be read as a pure difference between places. Scottish cells are perturbed for disclosure control, so they may not sum exactly.</p>
<p><strong>Europe.</strong> The headline is Eurostat's official NEET rate from the Labour Force Survey (table edat_lfse_22), for ages 15–24, by NUTS 2 region. It counts anyone in formal or non-formal education or training as not NEET. The census layers use Census 2021 single-year ages to match 16–24 exactly: unemployed plus “other outside the labour force”, as a share of those with a known status.</p>
<h2>Why European areas are larger</h2>
<p>European figures are for NUTS 2 regions, which usually have between 800,000 and 3 million residents, so they are much larger than British local authorities. Comparable figures do not exist for smaller areas. The Labour Force Survey sample is too small, so Eurostat publishes NEET rates only down to NUTS 2, and its 2021 census tables for smaller areas do not record whether people are working, unemployed or inactive. Modelled estimates would look more detailed than the evidence allows, so they are left out.</p>
<h2>Coverage in Great Britain</h2>
<p>All 350 authorities in England, Wales and Scotland are mapped. Northern Ireland is outside the scope of “British” and is not drawn. Most correlations cover England and Wales only, as Scottish census tables for those statistics are not loaded. Survey data was not used to fill the gap, because mixing sources would distort the comparison. Pay (ASHE 2021), density and age 65+ include Scotland; its density and age figures come from mid-2021 population estimates.</p>
<h2>Comparing across countries</h2>
<p>Census rates should not be compared between countries. Against the LFS, census-based rates agree well within countries and much less well between them:</p>
<table><thead><tr><th>Census vs LFS (2020–22), 228 regions</th><th class="n">r</th></tr></thead>
<tbody><tr><td>Within countries</td><td class="n">0.85</td></tr><tr><td>All regions pooled</td><td class="n">0.68</td></tr><tr><td>Between country averages</td><td class="n">0.61</td></tr></tbody></table>
<p>The gap between the two sources ranges from −2.7 points (Luxembourg) to +15.3 (Spain). One reason is that Eurostat's tables only class students as “outside the labour force”, so a full-time student looking for work counts as unemployed.</p>
<h2>The UK on the Europe map</h2>
<p>Eurostat's LFS series ends for the UK in 2019, so the UK appears on the LFS 2019 layer but not on later LFS layers. No later source is on the same basis, so it is left blank rather than filled with different data.</p>
<p>The UK's census is not in Eurostat's 2021 tables, so the two census layers use British tables instead. Local authorities are aggregated to ITL 2 regions, the UK's NUTS 2 equivalent, and Eurostat's definition is applied by counting job-seeking full-time students as unemployed. That adds 4.2 points in England and Wales, which is why Great Britain reads 16.8% here against 12.6% on the Great Britain tab. Both are correct on their own definitions. The British regions are a local reconstruction rather than Eurostat data, and Scottish regions are from 2022. Northern Ireland is not included, and the UK's “country average” on the gap layer is Great Britain only. Across 36 matched regions, British census rates run 6.0 points above LFS 2019, in the middle of the range for other countries, with a regional correlation of 0.64 despite the two-year difference. Argyll and Bute, and North Ayrshire, straddle ITL 2 boundaries and are each assigned whole to one region. UK regions do not enter the Europe correlations, as Eurostat's covariates stop for the UK.</p>
<h2>Germany on the Labour Force Survey layers</h2>
<p>Eurostat publishes no 2023–25 figure for 13 of Germany's 38 regions, more than for any other country, because the estimates fall below its reliability limits. This is a gap in the source, not in the atlas. Germany's survey became part of a redesigned Mikrozensus in 2020, and regions with a value fell from 33 in 2019 to 8 in 2020 and about 22 since. The redesign is the likely cause, but that is an inference, as Germany's actual limits were not found. It is also not the whole story: Niederbayern and Oberpfalz have had no figure in any year since 2017.</p>
<p>On the 2023–25 layer, 11 of the 13 show the average rate for their state over the same years: Bavaria 5.3%, Hesse 8.2%, Rhineland-Palatinate 8.5% and Saxony 6.6%. They are dotted on the map and marked ≈ in the table, and they are not regional estimates. All regions in a state show the same figure, and that figure includes the state's published regions too. They are left out of rankings, summary figures and correlations. Bremen and Saarland stay blank because Eurostat publishes no state figure for them either. The 2021 and 2019 layers show only what Eurostat published.</p>
<p>Three further cautions apply. Most German regions that do have a figure carry a low-reliability flag for at least one year. The missing regions are not random: six of Bavaria's seven are absent, and Bavaria has some of Germany's lowest rates, so German correlations rest on an unbalanced set of regions. Eurostat also marks a series break for Germany in 2024, inside the three-year average. The census layers cover all 38 regions and are the better view of Germany's regional pattern.</p>
<h2>Things to keep in mind</h2>
<ul>
<li><strong>Timing.</strong> Census 2021 took place in March 2021, during a lockdown. People on furlough counted as employed, and student and labour market patterns were unusual.</li>
<li><strong>Students.</strong> British students are counted at their term-time address, which lowers the rate in university towns. The “non-students” measure removes this effect.</li>
<li><strong>Sampling.</strong> Census figures are close to complete counts. LFS regional figures are survey estimates, which is why the headline averages three years. Regions with a low-reliability flag say so in the detail panel.</li>
<li><strong>Correlation.</strong> These are area-level associations. They do not show what is true of individuals (the ecological fallacy) or what causes what. Nearby areas are also not independent, so the intervals shown are too narrow.</li>
<li><strong>Covariates.</strong> British industry figures describe where residents work, by Census 2021. European figures are LFS employment, averaged over 2021–23. Pay is missing for a few small authorities.</li>
<li><strong>Boundaries.</strong> LFS layers use NUTS 2024 and census layers NUTS 2021, so a few Dutch and Portuguese regions differ. The Canaries, Azores, Madeira and French overseas regions appear in the table but are not drawn.</li>
</ul>
<h2>Sources</h2>
<ul>
<li><a href="https://www.nomisweb.co.uk/sources/census_2021">Census 2021</a> tables RM024 and TS004, TS007A, TS011, TS021, TS037, TS038, TS054, TS060, TS062, TS067 (ONS, via Nomis, Open Government Licence)</li>
<li><a href="https://www.scotlandscensus.gov.uk/">Scotland's Census 2022</a> tables UV601a and UV603b (National Records of Scotland, Open Government Licence)</li>
<li><a href="https://www.nomisweb.co.uk/datasets/asher">ASHE 2021</a>, resident analysis, and mid-2021 population estimates (ONS, via Nomis)</li>
<li><a href="https://ec.europa.eu/eurostat/databrowser/view/edat_lfse_22/default/table">Eurostat</a> edat_lfse_22, cens_21a_r2, nama_10r_2gdp, nama_10r_2hhinc, lfst_r_lfu3rt, edat_lfse_04, edat_lfse_16, lfst_r_lfe2en2, demo_r_pjanind2, demo_r_d3dens (© European Union)</li>
<li>German survey changes: <a href="https://ec.europa.eu/eurostat/documents/10186/6246844/LFS-2020-Note-on-German-data.pdf">Eurostat note on German LFS data, 2020</a>; <a href="https://www.destatis.de/EN/Themes/Labour/Labour-Market/Employment/Methods/microcensus-2021-labour-market.html?nn=23096">Destatis on methodological changes, 2021</a></li>
<li>Boundaries: ONS Open Geography Portal (LAD December 2023, LAD to ITL lookup), Eurostat GISCO (NUTS 2021, NUTS 2024; © EuroGeographics)</li>
</ul>`;

/* ---------- boot ---------- */
Promise.all([
  d3.json("data/gb.json"), d3.json("data/eu.json"), d3.json("data/gb.geo.json"),
  d3.json("data/n21.geo.json"), d3.json("data/n24.geo.json"), d3.json("data/base.geo.json"), d3.json("data/uk.geo.json"),
]).then(([gb, eu, g, n21, n24, base, uk]) => {
  D.rows = { gb, eu };
  D.byId = { gb: Object.fromEntries(gb.map((d) => [d.id, d])), eu: Object.fromEntries(eu.map((d) => [d.id, d])) };
  // 2019 LFS rows use NUTS 2024 codes for the EU, and UK regions exist only in the 2021 file
  const n19 = { type: "FeatureCollection", features: [...n24.features, ...n21.features.filter((f) => f.id.startsWith("UK"))] };
  // Census layers: NUTS 2021 for the EU and EFTA, plus British ITL 2 regions in place of the old UK NUTS regions
  const n21c = { type: "FeatureCollection", features: [...n21.features.filter((f) => !f.id.startsWith("UK")), ...uk.features] };
  D.geo = { gb: g, n21, n24, n19, n21c, base };
  const [hs, ht, hm] = location.hash.slice(1).split("/");   // e.g. #eu/corr or #eu/map/cens_dev
  if (SCOPES[hs]) { S.scope = hs; document.querySelectorAll(".seg button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.scope === hs)); }
  if (hm && sc().measures.some((m) => m.k === hm)) S.measure[S.scope] = hm;
  fillControls();
  setTab(["map", "corr", "about"].includes(ht) ? ht : "map");
}).catch((e) => {
  document.querySelector("main").innerHTML = `<p class="note">Could not load the data (${e.message}). Serve this folder over http rather than opening the file directly.</p>`;
});
