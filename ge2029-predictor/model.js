/* model.js — pure port of the reactive model in app.R.
 *
 * No DOM, no dependencies. Loaded by app.js in the browser and by
 * test/run_model.js under JavaScriptCore so the numbers can be checked
 * against R.
 */
(function (root) {
  "use strict";

  // Order matters: max.col(..., ties.method = "first") picks the first column
  // on a tie, so this must match the column order in app.R.
  var PARTIES = ["Con", "Lab", "Lib", "Ref", "Green", "SNP", "PC", "Other"];

  // scale_fill_manual(limits = c("Con","Green","Lab","Lib","Ref","SNP","PC","Other"),
  //                   values = c("blue","green","red","orange","#40E0D0","gold","dark green","grey"))
  var PARTY_COLOUR = {
    Con: "#0000ff",
    Green: "#00ff00",
    Lab: "#ff0000",
    Lib: "#ffa500",
    Ref: "#40e0d0",
    SNP: "#ffd700",
    PC: "#006400",
    Other: "#bebebe"
  };

  var PARTY_LABEL = {
    Con: "Conservative", Lab: "Labour", Lib: "Liberal Democrat", Ref: "Reform UK",
    Green: "Green", SNP: "SNP", PC: "Plaid Cymru", Other: "Other"
  };

  // 2024 national shares the proportionate-swing model divides by (from app.R).
  var PS_BASE = { cons: 24.3, lab: 34.6 };

  var DEFAULT_INPUTS = {
    cons: 24.3, lab: 34.6, lib: 12.5, ref: 14.7, green: 6.7, snp: 2.6, pc: 0.7,
    tacLab: 0, tacLib: 0, tacGreen: 0, tacCon: 0, tacRef: 0
  };

  /* ---- numeric helpers ------------------------------------------------ */

  // R's round() rounds halves to even. Matters only for exact .005 values,
  // but it keeps the JS output bit-identical to the Shiny app.
  function rround(x, digits) {
    if (x == null || !isFinite(x)) return x;
    var p = Math.pow(10, digits);
    var y = x * p;
    if (Math.abs(y - Math.trunc(y)) === 0.5) {
      var f = Math.floor(y);
      return (f % 2 === 0 ? f : f + 1) / p;
    }
    return Math.round(y) / p;
  }

  // case_when(x < 0 ~ 0, x >= 0 & x <= 100 ~ x, x > 100 ~ 100)
  function clamp100(x) {
    if (!(x >= 0)) return 0;       // also catches NaN, as case_when returns NA
    if (x > 100) return 100;
    return x;
  }

  function meanOf(arr) {
    var s = 0, n = 0;
    for (var i = 0; i < arr.length; i++) {
      var v = arr[i];
      if (v != null && isFinite(v)) { s += v; n++; }   // na.rm = TRUE
    }
    return n ? s / n : NaN;
  }

  /* ---- data loading --------------------------------------------------- */

  // constituencies.json is columnar: { fields: [...], rows: [[...], ...] }.
  // Expand it and precompute everything that does not depend on the sliders.
  function prepare(payload) {
    var fields = payload.fields;
    var rows = payload.rows.map(function (r) {
      var o = {};
      for (var i = 0; i < fields.length; i++) o[fields[i]] = r[i];
      return o;
    });

    var meanTotalVote = meanOf(rows.map(function (r) { return r.TotalVote24; }));
    rows.forEach(function (r) {
      r.weight = r.TotalVote24 / meanTotalVote;
      r.lab_min_con_24 = r.Lab24 - r.Con24;
      r.con_min_lab_24 = r.Con24 - r.Lab24;
    });

    // weight * mean(weight * <party>24) is the same scalar for every row, so
    // hoist it out of the reactive: cons_adj = Con24 + weight*(surv - wmean).
    var wmean = {};
    [["Con", "Con24"], ["Lab", "Lab24"], ["Lib", "LD24"], ["Ref", "RUK24"],
     ["Green", "Green24"], ["SNP", "SNP24"], ["PC", "PC24"]].forEach(function (p) {
      wmean[p[0]] = meanOf(rows.map(function (r) { return r.weight * r[p[1]]; }));
    });

    var hanMean = meanOf(rows.map(function (r) { return r.HanrettyLeave; }));
    rows.forEach(function (r) { r.han_est_norm = r.HanrettyLeave - hanMean; });

    return { rows: rows, wmean: wmean, n: rows.length };
  }

  /* ---- the model ------------------------------------------------------ */

  /* One constituency, one swing model.
   * `mode` is "uns" or "ps"; in PS mode only Con and Lab use proportionate
   * swing — every other party stays on UNS, exactly as in app.R. */
  function predictRow(r, wmean, inp, mode) {
    var w = r.weight;

    var cons_adj, lab_adj;
    if (mode === "ps") {
      cons_adj = clamp100(r.Con24 * inp.cons / PS_BASE.cons);
      lab_adj = clamp100(r.Lab24 * inp.lab / PS_BASE.lab);
    } else {
      cons_adj = clamp100(r.Con24 + w * (inp.cons - wmean.Con));
      lab_adj = clamp100(r.Lab24 + w * (inp.lab - wmean.Lab));
    }

    var lib_adj = clamp100(r.LD24 + w * (inp.lib - wmean.Lib));
    var ref_adj = clamp100(r.RUK24 + w * (inp.ref - wmean.Ref));
    var green_adj = clamp100(r.Green24 + w * (inp.green - wmean.Green));

    // Nation-only parties are scaled up by 631/seats so a GB-wide poll share
    // lands as a Scotland-/Wales-wide share.
    var snp_adj = r.SNP24 + (631 / 59) * (w * (inp.snp - wmean.SNP));
    snp_adj = r.Country !== "Scotland" ? 0 : clamp100(snp_adj);

    var pc_adj = r.PC24 + (631 / 40) * (w * (inp.pc - wmean.PC));
    pc_adj = r.Country !== "Wales" ? 0 : clamp100(pc_adj);

    // Tactical voting. Every right-hand side uses the *pre-tactical* _adj
    // values, so these five lines are order-independent (as in the R mutate).
    var lab_prob, lib_prob, green_prob, cons_prob, ref_prob;

    if (r.Lab24 >= r.LD24 && r.Lab24 >= r.Green24) {
      lab_prob = inp.tacLib * lib_adj + inp.tacGreen * green_adj + lab_adj;
    } else {
      lab_prob = (1 - inp.tacLab) * lab_adj;
    }

    if (r.LD24 > r.Lab24 && r.LD24 > r.Green24) {
      lib_prob = inp.tacLab * lab_adj + inp.tacGreen * green_adj + lib_adj;
    } else {
      lib_prob = (1 - inp.tacLib) * lib_adj;
    }

    if (r.Green24 > r.Lab24 && r.Green24 > r.LD24) {
      green_prob = inp.tacLab * lab_adj + inp.tacLib * lib_adj + green_adj;
    } else {
      green_prob = (1 - inp.tacGreen) * green_adj;
    }

    if (r.Con24 >= r.RUK24) {
      cons_prob = inp.tacRef * ref_adj + cons_adj;
    } else {
      cons_prob = (1 - inp.tacCon) * cons_adj;
    }

    if (r.RUK24 >= r.Con24) {
      ref_prob = inp.tacCon * cons_adj + ref_adj;
    } else {
      ref_prob = (1 - inp.tacRef) * ref_adj;
    }

    var out = {
      ONSConstID: r.ONSConstID,
      ConstituencyName: r.ConstituencyName,
      Country: r.Country,
      Region: r.Region,
      Winner24: r.Winner24,
      lab_min_con_24: r.lab_min_con_24,
      HanrettyLeave: r.HanrettyLeave,
      Con: clamp100(rround(cons_prob, 2)),
      Lab: clamp100(rround(lab_prob, 2)),
      Lib: clamp100(rround(lib_prob, 2)),
      Ref: clamp100(rround(ref_prob, 2)),
      Green: clamp100(rround(green_prob, 2)),
      SNP: clamp100(rround(snp_adj, 2)),
      PC: clamp100(rround(pc_adj, 2)),
      Other: r.Other24,
      _src: r
    };

    // max.col with ties.method = "first"
    var best = PARTIES[0], bestVal = out[PARTIES[0]];
    for (var i = 1; i < PARTIES.length; i++) {
      if (out[PARTIES[i]] > bestVal) { bestVal = out[PARTIES[i]]; best = PARTIES[i]; }
    }
    out.winner = best;

    // top_n(2, value) then max - min is just first minus second.
    var sorted = PARTIES.map(function (p) { return out[p]; })
                        .sort(function (a, b) { return b - a; });
    out.margin = sorted[0] - sorted[1];

    return out;
  }

  function runModel(prepared, inputs, mode) {
    var inp = Object.assign({}, DEFAULT_INPUTS, inputs || {});
    var wmean = prepared.wmean;
    return prepared.rows.map(function (r) { return predictRow(r, wmean, inp, mode); });
  }

  function seatCounts(results) {
    var counts = {};
    results.forEach(function (r) { counts[r.winner] = (counts[r.winner] || 0) + 1; });
    return counts;
  }

  // Seats each party would hold on a pure national-share allocation of 631
  // seats (round(share * 6.31)), with Other pinned at 12, as in app.R.
  function prSeats(inputs) {
    var inp = Object.assign({}, DEFAULT_INPUTS, inputs || {});
    return {
      Con: Math.round(inp.cons * 6.31),
      Green: Math.round(inp.green * 6.31),
      Lab: Math.round(inp.lab * 6.31),
      Lib: Math.round(inp.lib * 6.31),
      Ref: Math.round(inp.ref * 6.31),
      SNP: Math.round(inp.snp * 6.31),
      PC: Math.round(inp.pc * 6.31),
      Other: 12
    };
  }

  var api = {
    PARTIES: PARTIES,
    PARTY_COLOUR: PARTY_COLOUR,
    PARTY_LABEL: PARTY_LABEL,
    DEFAULT_INPUTS: DEFAULT_INPUTS,
    prepare: prepare,
    runModel: runModel,
    seatCounts: seatCounts,
    prSeats: prSeats,
    rround: rround
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.GEModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
