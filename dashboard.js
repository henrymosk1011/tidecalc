(function () {
  "use strict";

  var els = {
    peptideGroup: document.getElementById("peptideGroup"),
    skuGroup: document.getElementById("skuGroup"),
    skuStats: document.getElementById("skuStats"),
    freqToggle: document.getElementById("freqToggle"),
    customFreqRow: document.getElementById("customFreqRow"),
    customFreqDays: document.getElementById("customFreqDays"),
    doseMg: document.getElementById("doseMg"),
    reconMl: document.getElementById("reconMl"),
    syringeGroup: document.getElementById("syringeGroup"),
    bacMlPerVial: document.getElementById("bacMlPerVial"),
    bacLotVials: document.getElementById("bacLotVials"),
    bacLotPrice: document.getElementById("bacLotPrice"),
    powderShelfMonths: document.getElementById("powderShelfMonths"),
    vialShelfDays: document.getElementById("vialShelfDays"),
    bacShelfDays: document.getElementById("bacShelfDays"),
    planAmount: document.getElementById("planAmount"),
    planUnitToggle: document.getElementById("planUnitToggle"),

    vialLabel: document.getElementById("vialLabel"),
    syrLiquid: document.getElementById("syrLiquid"),
    plungerHead: document.getElementById("plungerHead"),
    tickGroup: document.getElementById("tickGroup"),
    warningBox: document.getElementById("warningBox"),
    doseTooBigBox: document.getElementById("doseTooBigBox"),
    unitsOut: document.getElementById("unitsOut"),
    volOut: document.getElementById("volOut"),

    econGrid: document.getElementById("econGrid"),
    wasteBarWrap: document.getElementById("wasteBarWrap"),
    wasteBarFill: document.getElementById("wasteBarFill"),
    wasteCaption: document.getElementById("wasteCaption"),

    bacEconGrid: document.getElementById("bacEconGrid"),
    bacWasteBarWrap: document.getElementById("bacWasteBarWrap"),
    bacWasteBarFill: document.getElementById("bacWasteBarFill"),
    bacWasteCaption: document.getElementById("bacWasteCaption"),

    summaryGrid: document.getElementById("summaryGrid"),
    summaryNote: document.getElementById("summaryNote"),
    powderWarningBox: document.getElementById("powderWarningBox"),
    addOrderBtn: document.getElementById("addOrderBtn"),

    compareTable: document.getElementById("compareTable"),

    orderDate: document.getElementById("orderDate"),
    orderDateDisplay: document.getElementById("orderDateDisplay"),
    orderTable: document.getElementById("orderTable"),
    orderEmpty: document.getElementById("orderEmpty"),
    orderTotal: document.getElementById("orderTotal"),
    clearOrderBtn: document.getElementById("clearOrderBtn"),

    themeToggle: document.getElementById("themeToggle")
  };

  els.unitsCard = els.unitsOut.closest(".readout-card");

  var DAY_LEN = { days: 1, weeks: 7, months: 30.44, years: 365.25 };
  var FREQ_LABEL = { daily: "Daily", eod: "Every other day", weekly: "Weekly", custom: "Custom" };

  var state = {
    peptideId: CATALOG.peptides[0].id,
    skuCode: CATALOG.peptides[0].defaultSku || CATALOG.peptides[0].skus[0].sku,
    freq: CATALOG.peptides[0].defaultFreq,
    customFreqDays: 3,
    syringeCapacity: 1,
    timeUnit: "days",
    planUnit: "months"
  };

  var BARREL_X0 = 64;
  var BARREL_X1 = 294;
  var BARREL_WIDTH = BARREL_X1 - BARREL_X0;

  function num(el) {
    var v = parseFloat(el.value);
    return isFinite(v) && v >= 0 ? v : 0;
  }

  function fmtSmart(v) {
    if (!isFinite(v) || v < 0) v = 0;
    var r = Math.round(v * 1000) / 1000;
    return r.toString();
  }

  function fmtVol(v) {
    if (v <= 0) return "0";
    if (v < 0.1) return (Math.round(v * 1000) / 1000).toString();
    return (Math.round(v * 100) / 100).toString();
  }

  function fmtMg(v) {
    if (!isFinite(v) || v < 0) v = 0;
    return (Math.round(v * 100) / 100).toString();
  }

  function fmtMoney(v) {
    if (!isFinite(v)) v = 0;
    return "$" + (Math.round(v * 100) / 100).toFixed(2);
  }

  function fmtPct(v) {
    if (!isFinite(v)) v = 0;
    return (Math.round(v * 1000) / 10).toString() + "%";
  }

  function fmtDaysApprox(days) {
    if (days >= 365) return (Math.round((days / 365.25) * 10) / 10) + " yr";
    if (days >= 60) return (Math.round((days / 30.44) * 10) / 10) + " mo";
    if (days >= 14) return (Math.round((days / 7) * 10) / 10) + " wk";
    return Math.round(days) + " day" + (Math.round(days) === 1 ? "" : "s");
  }

  function plural(n, word) {
    return n + " " + word + (n === 1 ? "" : "s");
  }

  function fmtDateShort(iso) {
    if (!iso) return "";
    var parts = iso.split("-");
    if (parts.length !== 3) return iso;
    return parseInt(parts[1], 10) + "/" + parseInt(parts[2], 10) + "/" + parts[0];
  }

  function getPeptide(id) {
    for (var i = 0; i < CATALOG.peptides.length; i++) {
      if (CATALOG.peptides[i].id === id) return CATALOG.peptides[i];
    }
    return CATALOG.peptides[0];
  }

  function getSku(peptide, skuCode) {
    for (var i = 0; i < peptide.skus.length; i++) {
      if (peptide.skus[i].sku === skuCode) return peptide.skus[i];
    }
    return peptide.skus[0];
  }

  function daysPerDose() {
    if (state.freq === "daily") return 1;
    if (state.freq === "eod") return 2;
    if (state.freq === "weekly") return 7;
    return Math.max(1, num(els.customFreqDays) || 1);
  }

  function vialEconomics(mgPerVial, doseMg, dpDose, vialShelfDays) {
    if (doseMg <= 0 || mgPerVial <= 0 || doseMg > mgPerVial) {
      return { dosesPerVial: 0, activeDays: 0, mgUsed: 0, mgWasted: mgPerVial, wastePct: mgPerVial > 0 ? 1 : 0, limitedBy: "dose" };
    }
    var byAmount = Math.floor(mgPerVial / doseMg);
    var byShelf = Math.max(1, Math.floor(vialShelfDays / dpDose));
    var dosesPerVial = Math.min(byAmount, byShelf);
    var activeDays = dosesPerVial * dpDose;
    var mgUsed = dosesPerVial * doseMg;
    var mgWasted = Math.max(0, mgPerVial - mgUsed);
    var wastePct = mgPerVial > 0 ? mgWasted / mgPerVial : 0;
    return {
      dosesPerVial: dosesPerVial,
      activeDays: activeDays,
      mgUsed: mgUsed,
      mgWasted: mgWasted,
      wastePct: wastePct,
      limitedBy: byAmount <= byShelf ? "amount" : "shelf"
    };
  }

  function planPeptide(sku, doseMg, dpDose, vialShelfDays, durationDays) {
    var econ = vialEconomics(sku.mgPerVial, doseMg, dpDose, vialShelfDays);
    if (econ.dosesPerVial <= 0 || durationDays <= 0) {
      return { econ: econ, ok: false };
    }
    var totalDoses = Math.ceil(durationDays / dpDose);
    var vialsNeeded = Math.ceil(totalDoses / econ.dosesPerVial);
    var lotsNeeded = Math.ceil(vialsNeeded / sku.lotVials);
    var vialsPurchased = lotsNeeded * sku.lotVials;
    var cost = lotsNeeded * sku.lotPrice;
    var daysCovered = vialsPurchased * econ.activeDays;
    return {
      econ: econ,
      ok: true,
      totalDoses: totalDoses,
      vialsNeeded: vialsNeeded,
      lotsNeeded: lotsNeeded,
      vialsPurchased: vialsPurchased,
      cost: cost,
      cycleDays: econ.activeDays,
      daysCovered: daysCovered
    };
  }

  function planBac(bacSku, reconMl, bacShelfDays, vialsNeeded, cycleDays) {
    if (vialsNeeded <= 0 || reconMl <= 0) return { vialsNeeded: 0, lotsNeeded: 0, cost: 0 };
    var bacVialsUsed = 0;
    var openedDay = null;
    var remaining = 0;
    for (var i = 0; i < vialsNeeded; i++) {
      var day = i * cycleDays;
      var needNew = openedDay === null || (day - openedDay) > bacShelfDays || remaining < reconMl;
      if (needNew) {
        bacVialsUsed++;
        openedDay = day;
        remaining = bacSku.mlPerVial - reconMl;
      } else {
        remaining -= reconMl;
      }
    }
    var lotsNeeded = Math.ceil(bacVialsUsed / bacSku.lotVials);
    var cost = lotsNeeded * bacSku.lotPrice;
    return { vialsNeeded: bacVialsUsed, lotsNeeded: lotsNeeded, cost: cost };
  }

  function niceStep(rough) {
    if (rough <= 0 || !isFinite(rough)) return 1;
    var mag = Math.pow(10, Math.floor(Math.log10(rough)));
    var norm = rough / mag;
    var niceNorm;
    if (norm < 1.5) niceNorm = 1;
    else if (norm < 3) niceNorm = 2;
    else if (norm < 7) niceNorm = 5;
    else niceNorm = 10;
    return niceNorm * mag;
  }

  function tickPlan(maxUnits) {
    if (!isFinite(maxUnits) || maxUnits <= 0) return [];
    var majorStep = niceStep(maxUnits / 8);
    var minorStep = majorStep / 5;
    if (!isFinite(minorStep) || minorStep <= 0 || (maxUnits / minorStep) > 120) {
      minorStep = majorStep;
    }
    var numMajors = Math.round(maxUnits / majorStep);
    var labelStep = numMajors > 8 ? majorStep * 2 : majorStep;

    var ticks = [];
    var seen = {};
    for (var u = 0; u <= maxUnits + 1e-9; u += minorStep) {
      var unit = Math.round(u * 100) / 100;
      if (seen[unit]) continue;
      seen[unit] = true;
      var modMajor = unit % majorStep;
      var isMajor = modMajor < 1e-6 || (majorStep - modMajor) < 1e-6;
      var modLabel = unit % labelStep;
      var isLabel = modLabel < 1e-6 || (labelStep - modLabel) < 1e-6;
      ticks.push({ unit: unit, isMajor: isMajor, showLabel: isLabel });
    }
    var last = ticks[ticks.length - 1];
    if (!last || Math.abs(last.unit - maxUnits) > 1e-6) {
      ticks.push({ unit: Math.round(maxUnits * 100) / 100, isMajor: true, showLabel: true });
    }
    var n = ticks.length;
    if (n >= 2 && ticks[n - 1].showLabel) {
      for (var j = n - 2; j >= 0; j--) {
        if (ticks[j].showLabel) {
          if ((ticks[n - 1].unit - ticks[j].unit) < labelStep * 0.6) {
            ticks[j].showLabel = false;
          }
          break;
        }
      }
    }
    return ticks;
  }

  function renderTicks(maxUnits) {
    var ns = "http://www.w3.org/2000/svg";
    els.tickGroup.innerHTML = "";
    tickPlan(maxUnits).forEach(function (t) {
      var x = BARREL_X0 + (t.unit / maxUnits) * BARREL_WIDTH;
      var line = document.createElementNS(ns, "line");
      line.setAttribute("x1", x);
      line.setAttribute("x2", x);
      line.setAttribute("y1", 78);
      line.setAttribute("y2", t.isMajor ? 96 : 90);
      line.setAttribute("class", t.isMajor ? "tick-major" : "tick");
      els.tickGroup.appendChild(line);

      if (t.showLabel) {
        var label = document.createElementNS(ns, "text");
        label.setAttribute("x", Math.min(Math.max(x, 14), 346));
        label.setAttribute("y", 118);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("class", "tick-label");
        label.textContent = t.unit;
        els.tickGroup.appendChild(label);
      }
    });
  }

  function buildPeptidePills() {
    els.peptideGroup.innerHTML = "";
    CATALOG.peptides.forEach(function (p) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pill";
      btn.dataset.peptide = p.id;
      btn.textContent = p.name;
      btn.addEventListener("click", function () { selectPeptide(p.id, true); });
      els.peptideGroup.appendChild(btn);
    });
  }

  function buildSkuPills(peptide) {
    els.skuGroup.innerHTML = "";
    peptide.skus.forEach(function (s) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pill";
      btn.dataset.sku = s.sku;
      btn.innerHTML = s.mgPerVial + "mg<span>" + fmtMoney(s.lotPrice) + " / " + s.lotVials + "</span>";
      btn.addEventListener("click", function () {
        state.skuCode = s.sku;
        setActiveButton(els.skuGroup, ".pill", "sku", s.sku);
        render();
      });
      els.skuGroup.appendChild(btn);
    });
  }

  function selectPeptide(id, resetDefaults) {
    var peptide = getPeptide(id);
    state.peptideId = id;
    setActiveButton(els.peptideGroup, ".pill", "peptide", id);
    buildSkuPills(peptide);
    if (resetDefaults) {
      state.skuCode = peptide.defaultSku || peptide.skus[0].sku;
      state.freq = peptide.defaultFreq || "daily";
      els.doseMg.value = fmtSmart(peptide.defaultDoseMg);
      els.reconMl.value = fmtSmart(peptide.defaultReconMl || 2);
      setActiveButton(els.freqToggle, ".mode-btn", "freq", state.freq);
      els.customFreqRow.hidden = state.freq !== "custom";
    }
    setActiveButton(els.skuGroup, ".pill", "sku", state.skuCode);
    render();
  }

  function setActiveButton(group, selector, attr, value) {
    group.querySelectorAll(selector).forEach(function (b) {
      b.classList.toggle("active", b.dataset[attr] === String(value));
    });
  }

  function renderSkuStats(sku) {
    els.skuStats.innerHTML = "";
    var stats = [
      { label: "Lot price", value: fmtMoney(sku.lotPrice) },
      { label: "Price / vial", value: fmtMoney(sku.lotPrice / sku.lotVials) },
      { label: "Price / mg", value: fmtMoney(sku.lotPrice / (sku.mgPerVial * sku.lotVials)) }
    ];
    stats.forEach(function (s) {
      var chip = document.createElement("div");
      chip.className = "stat-chip";
      chip.innerHTML = '<span class="stat-value">' + s.value + '</span><span class="stat-label">' + s.label + "</span>";
      els.skuStats.appendChild(chip);
    });
  }

  function renderEcon(sku, econ) {
    els.econGrid.innerHTML = "";
    if (econ.dosesPerVial <= 0) {
      var card = document.createElement("div");
      card.className = "econ-card";
      card.style.gridColumn = "1 / -1";
      card.innerHTML = '<span class="econ-label">Not possible</span><span class="econ-value" style="font-size:14px;">Dose is bigger than this vial</span>';
      els.econGrid.appendChild(card);
      els.wasteBarWrap.hidden = true;
      return;
    }
    els.wasteBarWrap.hidden = false;
    var limitedText = econ.limitedBy === "shelf" ? "capped by shelf life" : "capped by mg in vial";
    var cards = [
      { label: "Doses per vial", value: econ.dosesPerVial.toString(), sub: limitedText },
      { label: "Vial lasts", value: fmtDaysApprox(econ.activeDays), sub: econ.activeDays + " day" + (econ.activeDays === 1 ? "" : "s") + " before a new one" },
      { label: "mg used", value: fmtMg(econ.mgUsed) + " / " + sku.mgPerVial, sub: fmtPct(econ.wastePct) + " wasted per vial" }
    ];
    cards.forEach(function (c) {
      var el = document.createElement("div");
      el.className = "econ-card";
      el.innerHTML = '<span class="econ-label">' + c.label + '</span><span class="econ-value">' + c.value + '</span><span class="econ-sub">' + c.sub + "</span>";
      els.econGrid.appendChild(el);
    });

    var pct = Math.round((1 - econ.wastePct) * 1000) / 10;
    els.wasteBarFill.style.width = pct + "%";
    els.wasteBarFill.classList.toggle("warn", econ.wastePct > 0.15);
    els.wasteCaption.textContent = pct + "% of each vial gets used before it must be discarded.";
  }

  function bacEconomics(bacSku, reconMl, bacShelfDays, cycleDays) {
    if (reconMl <= 0 || bacSku.mlPerVial <= 0 || reconMl > bacSku.mlPerVial || cycleDays <= 0) {
      return { reconsPerBottle: 0, activeDays: 0, mlUsed: 0, mlWasted: bacSku.mlPerVial, wastePct: 0 };
    }
    // Simulates the same event-by-event rule planBac() uses (a bottle is reused until
    // it runs out of volume or its shelf-life window closes), so this always agrees
    // with the BAC vial count shown in Order Summary.
    var remaining = bacSku.mlPerVial - reconMl;
    var count = 1;
    var limitedBy = "volume";
    for (var i = 1; i < 5000; i++) {
      var day = i * cycleDays;
      if (day > bacShelfDays) { limitedBy = "shelf"; break; }
      if (remaining < reconMl) { limitedBy = "volume"; break; }
      remaining -= reconMl;
      count++;
    }
    var activeDays = count * cycleDays;
    var mlUsed = count * reconMl;
    var mlWasted = Math.max(0, bacSku.mlPerVial - mlUsed);
    var wastePct = bacSku.mlPerVial > 0 ? mlWasted / bacSku.mlPerVial : 0;
    return {
      reconsPerBottle: count,
      activeDays: activeDays,
      mlUsed: mlUsed,
      mlWasted: mlWasted,
      wastePct: wastePct,
      limitedBy: limitedBy
    };
  }

  function renderBacEcon(bacSku, bacEcon) {
    els.bacEconGrid.innerHTML = "";
    if (bacEcon.reconsPerBottle <= 0) {
      var card = document.createElement("div");
      card.className = "econ-card";
      card.style.gridColumn = "1 / -1";
      card.innerHTML = '<span class="econ-label">Not possible</span><span class="econ-value" style="font-size:14px;">Reconstitution volume is bigger than this bottle</span>';
      els.bacEconGrid.appendChild(card);
      els.bacWasteBarWrap.hidden = true;
      return;
    }
    els.bacWasteBarWrap.hidden = false;
    var limitedText = bacEcon.limitedBy === "shelf" ? "capped by shelf life" : "capped by mL in bottle";
    var cards = [
      { label: "Reconstitutions / bottle", value: bacEcon.reconsPerBottle.toString(), sub: limitedText },
      { label: "Bottle lasts", value: fmtDaysApprox(bacEcon.activeDays), sub: bacEcon.activeDays + " day" + (bacEcon.activeDays === 1 ? "" : "s") + " before a new one" },
      { label: "mL used", value: fmtMg(bacEcon.mlUsed) + " / " + bacSku.mlPerVial, sub: fmtPct(bacEcon.wastePct) + " wasted per bottle" }
    ];
    cards.forEach(function (c) {
      var el = document.createElement("div");
      el.className = "econ-card";
      el.innerHTML = '<span class="econ-label">' + c.label + '</span><span class="econ-value">' + c.value + '</span><span class="econ-sub">' + c.sub + "</span>";
      els.bacEconGrid.appendChild(el);
    });

    var pct = Math.round((1 - bacEcon.wastePct) * 1000) / 10;
    els.bacWasteBarFill.style.width = pct + "%";
    els.bacWasteBarFill.classList.toggle("warn", bacEcon.wastePct > 0.15);
    els.bacWasteCaption.textContent = pct + "% of each bottle gets used before it must be discarded.";
  }

  function renderSummary(peptide, sku, plan, bacPlan, bacSku, durationDays) {
    els.summaryGrid.innerHTML = "";
    if (!plan.ok) {
      var statusText = durationDays <= 0
        ? "Enter how long you want this to last"
        : "Not enough peptide per vial for this dose";
      els.summaryNote.textContent = durationDays <= 0
        ? "Fill in \"Plan for\" above to see vials and cost."
        : "Increase the vial size or lower the dose to get a working plan.";
      var card = document.createElement("div");
      card.className = "summary-card wide";
      card.innerHTML = '<span class="summary-label">Status</span><span class="summary-value" style="font-size:15px;">' + statusText + "</span>";
      els.summaryGrid.appendChild(card);
      return;
    }
    var totalCost = plan.cost + bacPlan.cost;
    var cards = [
      { label: "Peptide vials", value: plan.vialsNeeded.toString(), sub: plan.lotsNeeded + " box" + (plan.lotsNeeded === 1 ? "" : "es") + " of " + sku.lotVials + " &middot; " + fmtMoney(plan.cost) },
      { label: "BAC water vials", value: bacPlan.vialsNeeded.toString(), sub: bacPlan.lotsNeeded + " box" + (bacPlan.lotsNeeded === 1 ? "" : "es") + " of " + bacSku.lotVials + " &middot; " + fmtMoney(bacPlan.cost) },
      { label: "Covers", value: fmtDaysApprox(plan.daysCovered), sub: plan.daysCovered + " days from what you buy" },
      { label: "Total cost", value: fmtMoney(totalCost), sub: fmtMoney(totalCost / (durationDays / 30.44)) + " / month", cls: "total" }
    ];
    cards.forEach(function (c) {
      var el = document.createElement("div");
      el.className = "summary-card" + (c.cls ? " " + c.cls : "");
      el.innerHTML = '<span class="summary-label">' + c.label + '</span><span class="summary-value">' + c.value + '</span><span class="summary-sub">' + c.sub + "</span>";
      els.summaryGrid.appendChild(el);
    });

    var surplusDays = plan.daysCovered - durationDays;
    els.summaryNote.textContent = surplusDays > 0
      ? "Buying in full boxes covers " + Math.round(surplusDays) + " extra day" + (Math.round(surplusDays) === 1 ? "" : "s") + " beyond your plan."
      : "";
  }

  function renderPowderWarning(plan, powderShelfMonths) {
    if (!plan.ok) {
      els.powderWarningBox.hidden = true;
      return;
    }
    var powderShelfDays = powderShelfMonths * 30.44;
    var vialsSafeToStock = Math.max(1, Math.floor(powderShelfDays / plan.cycleDays) + 1);
    if (plan.vialsPurchased <= vialsSafeToStock) {
      els.powderWarningBox.hidden = true;
      return;
    }
    var batches = Math.ceil(plan.vialsPurchased / vialsSafeToStock);
    els.powderWarningBox.hidden = false;
    els.powderWarningBox.textContent =
      "The last of the " + plan.vialsPurchased + " vials you'd buy now would sit unopened past its " + powderShelfMonths +
      "-month powder shelf life before you get to it. Split this into " + batches + " orders of up to " + vialsSafeToStock +
      " vials each instead of buying it all at once.";
  }

  function renderCompareTable(peptide, doseMg, dpDose, vialShelfDays, durationDays, currentSku) {
    var rows = peptide.skus.map(function (sku) {
      var plan = planPeptide(sku, doseMg, dpDose, vialShelfDays, durationDays);
      return { sku: sku, plan: plan };
    });

    var okRows = rows.filter(function (r) { return r.plan.ok; });
    var bestCost = okRows.length ? Math.min.apply(null, okRows.map(function (r) { return r.plan.cost; })) : null;

    var html = "<thead><tr><th>Vial</th><th>Doses/vial</th><th>Waste</th><th>Vials</th><th>Boxes</th><th>Cost</th></tr></thead><tbody>";
    rows.forEach(function (r) {
      var isCurrent = r.sku.sku === currentSku.sku;
      var isBest = r.plan.ok && bestCost !== null && r.plan.cost === bestCost;
      var cls = [];
      if (isCurrent) cls.push("current");
      if (isBest) cls.push("best");
      html += '<tr class="' + cls.join(" ") + '">';
      html += "<td>" + r.sku.mgPerVial + "mg" + (isBest ? '<span class="best-tag">Best</span>' : "") + "</td>";
      if (r.plan.ok) {
        html += "<td>" + r.plan.econ.dosesPerVial + "</td>";
        html += "<td>" + fmtPct(r.plan.econ.wastePct) + "</td>";
        html += "<td>" + r.plan.vialsNeeded + "</td>";
        html += "<td>" + r.plan.lotsNeeded + "</td>";
        html += "<td>" + fmtMoney(r.plan.cost) + "</td>";
      } else {
        html += '<td class="na" colspan="5">Dose too large for this vial</td>';
      }
      html += "</tr>";
    });
    html += "</tbody>";
    els.compareTable.innerHTML = html;
  }

  var ORDER_KEY = "peptideOrderCart";

  function todayLocal() {
    var d = new Date();
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var dd = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + mm + "-" + dd;
  }

  function loadOrder() {
    try {
      var raw = localStorage.getItem(ORDER_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage unavailable */ }
    return { date: todayLocal(), items: [] };
  }

  function saveOrder(order) {
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(order));
    } catch (e) { /* storage unavailable */ }
  }

  var order = loadOrder();

  function renderOrder() {
    els.orderDate.value = order.date;
    els.orderDateDisplay.textContent = fmtDateShort(order.date);
    if (!order.items.length) {
      els.orderTable.innerHTML = "";
      els.orderEmpty.hidden = false;
      els.orderTotal.hidden = true;
      els.clearOrderBtn.hidden = true;
      return;
    }
    els.orderEmpty.hidden = true;
    els.orderTotal.hidden = false;
    els.clearOrderBtn.hidden = false;

    var html = "<thead><tr><th>Peptide</th><th>Vial</th><th>Dose</th><th>Duration</th><th>Vials</th><th>BAC</th><th>Total</th><th></th></tr></thead><tbody>";
    var grandTotal = 0;
    order.items.forEach(function (item, idx) {
      grandTotal += item.total;
      html += "<tr>";
      html += "<td>" + item.peptideName + "</td>";
      html += "<td>" + item.mgPerVial + "mg</td>";
      html += "<td>" + item.doseMg + "mg " + item.freqLabel + "</td>";
      html += "<td>" + item.durationLabel + "</td>";
      html += "<td>" + item.vials + " (" + item.peptideLots + " box)</td>";
      html += "<td>" + item.bacVials + " (" + item.bacLots + " box)</td>";
      html += "<td>" + fmtMoney(item.total) + "</td>";
      html += '<td><button type="button" class="order-row-remove" data-idx="' + idx + '" aria-label="Remove">&times;</button></td>';
      html += "</tr>";
    });
    html += "</tbody>";
    els.orderTable.innerHTML = html;

    els.orderTotal.innerHTML = '<span class="order-total-label">Grand total &middot; ' + plural(order.items.length, "item") + '</span><span class="order-total-value">' + fmtMoney(grandTotal) + "</span>";

    els.orderTable.querySelectorAll(".order-row-remove").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = parseInt(btn.dataset.idx, 10);
        order.items.splice(idx, 1);
        saveOrder(order);
        renderOrder();
      });
    });
  }

  var lastPlan = null;

  function render() {
    var peptide = getPeptide(state.peptideId);
    var sku = getSku(peptide, state.skuCode);
    renderSkuStats(sku);

    var doseMg = num(els.doseMg);
    var reconMl = num(els.reconMl) || 0.01;
    var dpDose = daysPerDose();
    var powderShelfMonths = num(els.powderShelfMonths) || 24;
    var vialShelfDays = num(els.vialShelfDays) || 28;
    var bacShelfDays = num(els.bacShelfDays) || 28;
    var planAmount = num(els.planAmount);
    var durationDays = planAmount * DAY_LEN[state.planUnit];

    var conc = sku.mgPerVial / reconMl;
    var doseVolumeMl = conc > 0 ? doseMg / conc : 0;
    var units = doseVolumeMl * 100;
    var maxUnits = Math.round(state.syringeCapacity * 100 * 100) / 100;

    els.unitsOut.textContent = fmtSmart(units);
    els.volOut.textContent = fmtVol(doseVolumeMl);
    els.vialLabel.textContent = conc.toFixed(2);

    renderTicks(maxUnits);

    var percentFull = state.syringeCapacity > 0 ? doseVolumeMl / state.syringeCapacity : 0;
    var overfill = percentFull > 1;
    var visualPercent = Math.min(Math.max(percentFull, 0), 1);
    var fillWidth = visualPercent * BARREL_WIDTH;
    els.syrLiquid.setAttribute("width", fillWidth);
    els.syrLiquid.setAttribute("fill", overfill ? "var(--warning)" : "var(--liquid)");
    var headX = BARREL_X0 + fillWidth;
    els.plungerHead.setAttribute("x1", headX);
    els.plungerHead.setAttribute("x2", headX);
    els.plungerHead.setAttribute("stroke", overfill ? "var(--warning)" : "var(--accent-strong)");
    els.unitsCard.classList.toggle("warn", overfill);
    els.warningBox.hidden = !overfill;
    els.doseTooBigBox.hidden = doseMg <= sku.mgPerVial;

    var bacSku = {
      mlPerVial: num(els.bacMlPerVial) || 10,
      lotVials: Math.max(1, Math.round(num(els.bacLotVials)) || 10),
      lotPrice: num(els.bacLotPrice)
    };

    var plan = planPeptide(sku, doseMg, dpDose, vialShelfDays, durationDays);
    var bacPlan = plan.ok ? planBac(bacSku, reconMl, bacShelfDays, plan.vialsNeeded, plan.cycleDays) : { vialsNeeded: 0, lotsNeeded: 0, cost: 0 };
    var bacEcon = plan.econ.dosesPerVial > 0 ? bacEconomics(bacSku, reconMl, bacShelfDays, plan.econ.activeDays) : { reconsPerBottle: 0, activeDays: 0, mlUsed: 0, mlWasted: bacSku.mlPerVial, wastePct: 0 };

    renderEcon(sku, plan.econ);
    renderBacEcon(bacSku, bacEcon);
    renderSummary(peptide, sku, plan, bacPlan, bacSku, durationDays);
    renderPowderWarning(plan, powderShelfMonths);
    renderCompareTable(peptide, doseMg, dpDose, vialShelfDays, durationDays, sku);

    lastPlan = {
      peptideName: peptide.name,
      mgPerVial: sku.mgPerVial,
      doseMg: doseMg,
      freqLabel: state.freq === "custom" ? "every " + dpDose + "d" : FREQ_LABEL[state.freq],
      durationLabel: planAmount + " " + state.planUnit,
      ok: plan.ok,
      vials: plan.ok ? plan.vialsNeeded : 0,
      peptideLots: plan.ok ? plan.lotsNeeded : 0,
      peptideCost: plan.ok ? plan.cost : 0,
      bacVials: bacPlan.vialsNeeded,
      bacLots: bacPlan.lotsNeeded,
      bacCost: bacPlan.cost,
      total: plan.ok ? plan.cost + bacPlan.cost : 0
    };

    saveState();
  }

  function selectSyringe(capacityValue) {
    state.syringeCapacity = parseFloat(capacityValue);
    setActiveButton(els.syringeGroup, ".pill", "capacity", capacityValue);
    render();
  }

  function wireEvents() {
    buildPeptidePills();

    els.doseMg.addEventListener("input", render);
    els.reconMl.addEventListener("input", render);
    els.bacMlPerVial.addEventListener("input", render);
    els.bacLotVials.addEventListener("input", render);
    els.bacLotPrice.addEventListener("input", render);
    els.vialShelfDays.addEventListener("input", render);
    els.bacShelfDays.addEventListener("input", render);
    els.planAmount.addEventListener("input", render);
    els.customFreqDays.addEventListener("input", render);

    els.syringeGroup.querySelectorAll(".pill").forEach(function (btn) {
      btn.addEventListener("click", function () { selectSyringe(btn.dataset.capacity); });
    });

    els.freqToggle.querySelectorAll(".mode-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.freq = btn.dataset.freq;
        setActiveButton(els.freqToggle, ".mode-btn", "freq", state.freq);
        els.customFreqRow.hidden = state.freq !== "custom";
        render();
      });
    });

    els.planUnitToggle.querySelectorAll(".mode-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.planUnit = btn.dataset.unit;
        setActiveButton(els.planUnitToggle, ".mode-btn", "unit", state.planUnit);
        render();
      });
    });

    els.addOrderBtn.addEventListener("click", function () {
      if (!lastPlan || !lastPlan.ok) return;
      order.items.push({
        peptideName: lastPlan.peptideName,
        mgPerVial: lastPlan.mgPerVial,
        doseMg: lastPlan.doseMg,
        freqLabel: lastPlan.freqLabel,
        durationLabel: lastPlan.durationLabel,
        vials: lastPlan.vials,
        peptideLots: lastPlan.peptideLots,
        peptideCost: lastPlan.peptideCost,
        bacVials: lastPlan.bacVials,
        bacLots: lastPlan.bacLots,
        bacCost: lastPlan.bacCost,
        total: lastPlan.total
      });
      saveOrder(order);
      renderOrder();
    });

    els.clearOrderBtn.addEventListener("click", function () {
      order.items = [];
      saveOrder(order);
      renderOrder();
    });

    els.orderDate.addEventListener("input", function () {
      if (!els.orderDate.value) return;
      order.date = els.orderDate.value;
      els.orderDateDisplay.textContent = fmtDateShort(order.date);
      saveOrder(order);
    });

    els.powderShelfMonths.addEventListener("input", render);

    els.themeToggle.addEventListener("click", toggleTheme);

    document.querySelectorAll('input[type="number"]').forEach(function (el) {
      el.addEventListener("wheel", function (e) { e.preventDefault(); }, { passive: false });
    });
  }

  var THEME_KEY = "peptideCalcTheme";

  function applyTheme(theme) {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
      els.themeToggle.setAttribute("aria-label", "Switch to dark mode");
      els.themeToggle.setAttribute("title", "Switch to dark mode");
    } else {
      document.documentElement.removeAttribute("data-theme");
      els.themeToggle.setAttribute("aria-label", "Switch to light mode");
      els.themeToggle.setAttribute("title", "Switch to light mode");
    }
    var metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute("content", theme === "light" ? "#EEF2F3" : "#0F1417");
  }

  function loadTheme() {
    var saved = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch (e) {
      saved = null;
    }
    applyTheme(saved === "light" ? "light" : "dark");
  }

  function toggleTheme() {
    var isLight = document.documentElement.getAttribute("data-theme") === "light";
    var next = isLight ? "dark" : "light";
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) { /* storage unavailable */ }
  }

  var STATE_KEY = "peptideDashboard";

  function saveState() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify({
        peptideId: state.peptideId,
        skuCode: state.skuCode,
        freq: state.freq,
        syringeCapacity: state.syringeCapacity,
        planUnit: state.planUnit,
        doseMg: els.doseMg.value,
        reconMl: els.reconMl.value,
        customFreqDays: els.customFreqDays.value,
        bacMlPerVial: els.bacMlPerVial.value,
        bacLotVials: els.bacLotVials.value,
        bacLotPrice: els.bacLotPrice.value,
        powderShelfMonths: els.powderShelfMonths.value,
        vialShelfDays: els.vialShelfDays.value,
        bacShelfDays: els.bacShelfDays.value,
        planAmount: els.planAmount.value
      }));
    } catch (e) { /* storage unavailable */ }
  }

  function loadState() {
    var saved = null;
    try {
      var raw = localStorage.getItem(STATE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (e) {
      saved = null;
    }

    var peptide = getPeptide((saved && saved.peptideId) || state.peptideId);
    selectPeptide(peptide.id, false);

    if (saved) {
      state.skuCode = saved.skuCode || peptide.defaultSku || peptide.skus[0].sku;
      state.freq = saved.freq || peptide.defaultFreq;
      state.syringeCapacity = saved.syringeCapacity || state.syringeCapacity;
      state.planUnit = saved.planUnit || state.planUnit;
      if (saved.doseMg !== undefined) els.doseMg.value = saved.doseMg;
      if (saved.reconMl !== undefined) els.reconMl.value = saved.reconMl;
      if (saved.customFreqDays !== undefined) els.customFreqDays.value = saved.customFreqDays;
      if (saved.bacMlPerVial !== undefined) els.bacMlPerVial.value = saved.bacMlPerVial;
      if (saved.bacLotVials !== undefined) els.bacLotVials.value = saved.bacLotVials;
      if (saved.bacLotPrice !== undefined) els.bacLotPrice.value = saved.bacLotPrice;
      if (saved.powderShelfMonths !== undefined) els.powderShelfMonths.value = saved.powderShelfMonths;
      if (saved.vialShelfDays !== undefined) els.vialShelfDays.value = saved.vialShelfDays;
      if (saved.bacShelfDays !== undefined) els.bacShelfDays.value = saved.bacShelfDays;
      if (saved.planAmount !== undefined) els.planAmount.value = saved.planAmount;
    } else {
      els.doseMg.value = fmtSmart(peptide.defaultDoseMg);
      els.reconMl.value = fmtSmart(peptide.defaultReconMl || 2);
    }

    setActiveButton(els.skuGroup, ".pill", "sku", state.skuCode);
    setActiveButton(els.freqToggle, ".mode-btn", "freq", state.freq);
    els.customFreqRow.hidden = state.freq !== "custom";
    setActiveButton(els.syringeGroup, ".pill", "capacity", state.syringeCapacity);
    setActiveButton(els.planUnitToggle, ".mode-btn", "unit", state.planUnit);
  }

  wireEvents();
  loadTheme();
  loadState();
  renderOrder();
  render();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {
        /* offline caching unavailable, app still works fully online */
      });
    });
  }
})();
