(function () {
  "use strict";

  var els = {
    syringeGroup: document.getElementById("syringeGroup"),
    customPill: document.getElementById("customPill"),
    customCapInput: document.getElementById("customCapInput"),
    customUnitsLabel: document.getElementById("customUnitsLabel"),
    freqToggle: document.getElementById("freqToggle"),
    vialLabel: document.getElementById("vialLabel"),
    syrLiquid: document.getElementById("syrLiquid"),
    plungerHead: document.getElementById("plungerHead"),
    tickGroup: document.getElementById("tickGroup"),
    warningBox: document.getElementById("warningBox"),
    concValue: document.getElementById("concValue"),
    unitsInput: document.getElementById("unitsInput"),
    volInput: document.getElementById("volInput"),
    doseGrid: document.getElementById("doseGrid"),
    doseGridExtra: document.getElementById("doseGridExtra"),
    supplyReadout: document.getElementById("supplyReadout"),
    timeToggle: document.getElementById("timeToggle"),
    supplyDuration: document.getElementById("supplyDuration"),
    planUnitToggle: document.getElementById("planUnitToggle"),
    planResult: document.getElementById("planResult"),
    themeToggle: document.getElementById("themeToggle"),

    bacShelfDaysGlobal: document.getElementById("bacShelfDaysGlobal"),
    bacRowsList: document.getElementById("bacRowsList"),
    bacRowsEmpty: document.getElementById("bacRowsEmpty"),
    addBacRowBtn: document.getElementById("addBacRowBtn"),
    bacSummary: document.getElementById("bacSummary")
  };

  els.unitsCard = els.unitsInput.closest(".readout-card");

  var DAY_LEN = { days: 1, weeks: 7, months: 30.44, years: 365.25 };

  var state = {
    vialMg: 5,
    vialVolume: 2,
    doseMg: 0.25,
    syringeCapacity: 1,
    freq: "daily",
    drawPrimary: "dose",
    timeUnit: "days",
    planAmount: 3,
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

  function fmtUnits(u) {
    var rounded = Math.round(u * 10) / 10;
    return rounded.toString();
  }

  function fmtVol(v) {
    if (v <= 0) return "0";
    if (v < 0.1) return (Math.round(v * 1000) / 1000).toString();
    return (Math.round(v * 100) / 100).toString();
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

  function daysPerDose() {
    return state.freq === "daily" ? 1 : 7;
  }

  function renderSupply(vialMg, doseMg) {
    var totalDoses = doseMg > 0 ? Math.floor(vialMg / doseMg) : 0;
    var totalDays = totalDoses * daysPerDose();

    els.doseGrid.innerHTML = "";
    var cap = 60;
    var shown = Math.min(totalDoses, cap);
    for (var i = 0; i < shown; i++) {
      var b = document.createElement("div");
      b.className = "dose-block";
      els.doseGrid.appendChild(b);
    }
    els.doseGridExtra.hidden = totalDoses <= cap;
    els.doseGridExtra.textContent = totalDoses > cap ? "+" + (totalDoses - cap) + " more" : "";

    if (totalDoses > 0) {
      els.supplyReadout.textContent =
        "This vial covers " + totalDoses + " " + state.freq + " injection" + (totalDoses === 1 ? "" : "s") + ".";
      var val = totalDays / DAY_LEN[state.timeUnit];
      var rounded = Math.round(val * 10) / 10;
      els.supplyDuration.textContent = "About " + rounded + " " + state.timeUnit + " of supply.";
    } else {
      els.supplyReadout.textContent = "Not enough peptide in the vial for one full dose at this amount.";
      els.supplyDuration.textContent = "";
    }

    var targetDays = state.planAmount * DAY_LEN[state.planUnit];
    var dosesNeeded = targetDays / daysPerDose();
    var vialsNeeded = totalDoses > 0 ? Math.ceil(dosesNeeded / totalDoses) : 0;
    els.planResult.textContent =
      state.planAmount > 0 && totalDoses > 0
        ? "You'll need about " + vialsNeeded + " vial" + (vialsNeeded === 1 ? "" : "s") + " to cover " + state.planAmount + " " + state.planUnit + "."
        : "Enter a vial setup and a time span to estimate vials needed.";
  }

  function render() {
    var conc = state.vialVolume > 0 ? state.vialMg / state.vialVolume : 0;
    var maxUnits = Math.round(state.syringeCapacity * 100 * 100) / 100;

    var dose, volumeMl, units;
    if (state.drawPrimary === "volume") {
      volumeMl = num(els.volInput);
      dose = volumeMl * conc;
      units = volumeMl * 100;
    } else if (state.drawPrimary === "units") {
      units = num(els.unitsInput);
      volumeMl = units / 100;
      dose = volumeMl * conc;
    } else {
      dose = state.doseMg;
      volumeMl = conc > 0 ? dose / conc : 0;
      units = volumeMl * 100;
    }

    els.concValue.textContent = fmtSmart(conc);
    if (state.drawPrimary !== "volume") els.volInput.value = fmtVol(volumeMl);
    if (state.drawPrimary !== "units") els.unitsInput.value = fmtUnits(units);

    var percentFull = state.syringeCapacity > 0 ? volumeMl / state.syringeCapacity : 0;
    var overfill = percentFull > 1;
    var visualPercent = Math.min(percentFull, 1);

    els.vialLabel.textContent = conc.toFixed(2);

    renderTicks(maxUnits);

    var fillWidth = visualPercent * BARREL_WIDTH;
    els.syrLiquid.setAttribute("width", fillWidth);
    els.syrLiquid.setAttribute("fill", overfill ? "var(--warning)" : "var(--liquid)");
    var headX = BARREL_X0 + fillWidth;
    els.plungerHead.setAttribute("x1", headX);
    els.plungerHead.setAttribute("x2", headX);
    els.plungerHead.setAttribute("stroke", overfill ? "var(--warning)" : "var(--accent-strong)");

    els.unitsCard.classList.toggle("warn", overfill);
    els.warningBox.hidden = !overfill;

    renderSupply(state.vialMg, dose);
    saveState();
  }

  function setActiveButton(group, selector, attr, value) {
    group.querySelectorAll(selector).forEach(function (b) {
      b.classList.toggle("active", b.dataset[attr] === String(value));
    });
  }

  function selectSyringe(capacityValue) {
    if (capacityValue === "custom") {
      els.customCapInput.hidden = false;
      state.syringeCapacity = num(els.customCapInput) || 1;
      setActiveButton(els.syringeGroup, ".chip", "capacity", "custom");
    } else {
      els.customCapInput.hidden = true;
      state.syringeCapacity = parseFloat(capacityValue);
      setActiveButton(els.syringeGroup, ".chip", "capacity", capacityValue);
    }
    render();
  }

  function setupChipField(groupId, customId) {
    var group = document.getElementById(groupId);
    var custom = document.getElementById(customId);
    var chips = Array.prototype.slice.call(group.querySelectorAll(".chip"));

    function highlight(value, isCustom) {
      chips.forEach(function (chip) {
        chip.classList.toggle("active", !isCustom && Math.abs(parseFloat(chip.dataset.value) - value) < 1e-9);
      });
      custom.classList.toggle("active-custom", isCustom);
    }

    return {
      onSelect: null,
      wire: function (onSelect) {
        this.onSelect = onSelect;
        chips.forEach(function (chip) {
          chip.addEventListener("click", function () {
            var v = parseFloat(chip.dataset.value);
            highlight(v, false);
            custom.value = "";
            onSelect(v);
            render();
          });
        });
        custom.addEventListener("input", function () {
          var v = parseFloat(custom.value);
          if (isFinite(v) && v >= 0) {
            highlight(v, true);
            onSelect(v);
            render();
          }
        });
      },
      init: function (value, onSelect) {
        var matched = chips.some(function (chip) { return Math.abs(parseFloat(chip.dataset.value) - value) < 1e-9; });
        highlight(value, !matched);
        if (!matched) custom.value = fmtSmart(value);
        onSelect(value);
      }
    };
  }

  var vialMgField = setupChipField("vialMgGroup", "vialMgCustom");
  var vialVolumeField = setupChipField("vialVolumeGroup", "vialVolumeCustom");
  var doseMgField = setupChipField("doseMgGroup", "doseMgCustom");
  var planAmountField = setupChipField("planAmountGroup", "planAmountCustom");

  // BAC Water Planner: a free-form list of peptides (catalog presets or
  // fully custom entries), each with its own vial size, dose, frequency,
  // and BAC bottle size, used only to total up BAC water consumption
  // across a month/year under a shared shelf-life assumption.

  var BAC_KEY = "peptideBacPlanner";
  var bacShelfDays = 28;
  var bacRows = [];

  function plural(n, word) {
    return n + " " + word + (n === 1 ? "" : "s");
  }

  function fmtDaysApprox(days) {
    if (days >= 365) return (Math.round((days / 365.25) * 10) / 10) + " yr";
    if (days >= 60) return (Math.round((days / 30.44) * 10) / 10) + " mo";
    if (days >= 14) return (Math.round((days / 7) * 10) / 10) + " wk";
    return Math.round(days) + " day" + (Math.round(days) === 1 ? "" : "s");
  }

  function vialEconomics(mgPerVial, doseMg, dpDose, vialShelfDays) {
    if (doseMg <= 0 || mgPerVial <= 0 || doseMg > mgPerVial) {
      return { dosesPerVial: 0, activeDays: 0, limitedBy: "dose" };
    }
    var byAmount = Math.floor(mgPerVial / doseMg);
    var byShelf = Math.max(1, Math.floor(vialShelfDays / dpDose));
    var dosesPerVial = Math.min(byAmount, byShelf);
    return {
      dosesPerVial: dosesPerVial,
      activeDays: dosesPerVial * dpDose,
      limitedBy: byAmount <= byShelf ? "amount" : "shelf"
    };
  }

  function planPeptideVials(mgPerVial, doseMg, dpDose, vialShelfDays, durationDays) {
    var econ = vialEconomics(mgPerVial, doseMg, dpDose, vialShelfDays);
    if (econ.dosesPerVial <= 0 || durationDays <= 0) return { econ: econ, ok: false };
    var totalDoses = Math.ceil(durationDays / dpDose);
    return { econ: econ, ok: true, vialsNeeded: Math.ceil(totalDoses / econ.dosesPerVial), cycleDays: econ.activeDays };
  }

  function planBacBottles(bottleMl, reconMl, shelfDays, vialsNeeded, cycleDays) {
    if (vialsNeeded <= 0 || reconMl <= 0 || bottleMl <= 0) return 0;
    var bottlesUsed = 0;
    var openedDay = null;
    var remaining = 0;
    for (var i = 0; i < vialsNeeded; i++) {
      var day = i * cycleDays;
      var needNew = openedDay === null || (day - openedDay) > shelfDays || remaining < reconMl;
      if (needNew) {
        bottlesUsed++;
        openedDay = day;
        remaining = bottleMl - reconMl;
      } else {
        remaining -= reconMl;
      }
    }
    return bottlesUsed;
  }

  function newBacRowId() {
    return "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function defaultBacRow(index) {
    var p = CATALOG.peptides[index % CATALOG.peptides.length];
    var skuCode = p.defaultSku || p.skus[0].sku;
    var sku = p.skus.filter(function (s) { return s.sku === skuCode; })[0] || p.skus[0];
    return {
      id: newBacRowId(),
      name: p.name,
      mgPerVial: sku.mgPerVial,
      reconMl: p.defaultReconMl || 2,
      bottleMl: 10,
      doseMg: p.defaultDoseMg,
      freq: p.defaultFreq || "daily",
      customFreqDays: 3
    };
  }

  function findBacRow(id) {
    for (var i = 0; i < bacRows.length; i++) {
      if (bacRows[i].id === id) return bacRows[i];
    }
    return null;
  }

  function bacRowDaysPerDose(row) {
    if (row.freq === "daily") return 1;
    if (row.freq === "eod") return 2;
    if (row.freq === "weekly") return 7;
    return Math.max(1, row.customFreqDays || 1);
  }

  function computeBacRow(row) {
    var dpDose = bacRowDaysPerDose(row);
    var econ = vialEconomics(row.mgPerVial, row.doseMg, dpDose, bacShelfDays);

    function period(days) {
      var plan = planPeptideVials(row.mgPerVial, row.doseMg, dpDose, bacShelfDays, days);
      if (!plan.ok) return { ok: false };
      var bottles = planBacBottles(row.bottleMl, row.reconMl, bacShelfDays, plan.vialsNeeded, plan.cycleDays);
      // bacBottles is how many bottles you must open (can't buy a fraction of
      // one); trueBottles is the actual average rate of consumption, so a
      // rounded-up "2 bottles" doesn't read as if all of both get used up.
      var trueBottles = row.bottleMl > 0 ? (days / plan.cycleDays) * row.reconMl / row.bottleMl : 0;
      return { ok: true, peptideVials: plan.vialsNeeded, bacBottles: bottles, bacMl: plan.vialsNeeded * row.reconMl, trueBottles: trueBottles };
    }

    return {
      econ: econ,
      bottleTooSmall: row.bottleMl > 0 && row.reconMl > row.bottleMl,
      month: period(DAY_LEN.months),
      year: period(DAY_LEN.years)
    };
  }

  function escapeAttr(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function bacFieldHtml(label, role, id, value, unit, step) {
    return '<div class="bac-field"><label>' + label + '</label><div class="bac-input-wrap"><input type="number" inputmode="decimal" min="0" step="' +
      step + '" class="bac-input" data-role="' + role + '" data-id="' + id + '" value="' + fmtSmart(value) + '" /><span class="unit">' + unit + "</span></div></div>";
  }

  var BAC_FREQ_OPTIONS = [["daily", "Daily"], ["eod", "EOD"], ["weekly", "Weekly"], ["custom", "Custom"]];

  function bacRowHtml(row) {
    var isCustom = row.freq === "custom";
    var html = '<div class="bac-row" data-id="' + row.id + '">';
    html += '<div class="bac-row-head">';
    html += '<input type="text" class="bac-row-name" data-role="bac-name" data-id="' + row.id + '" value="' + escapeAttr(row.name) + '" placeholder="Peptide name" />';
    html += '<button type="button" class="bac-row-remove" data-role="bac-remove" data-id="' + row.id + '" aria-label="Remove peptide">&times;</button>';
    html += "</div>";

    html += '<div class="bac-row-group bac-row-group-peptide">';
    html += '<div class="bac-row-group-title">Peptide</div>';
    html += '<div class="bac-row-fields">';
    html += bacFieldHtml("mg / vial", "bac-mg", row.id, row.mgPerVial, "mg", "0.01");
    html += bacFieldHtml("Dose", "bac-dose", row.id, row.doseMg, "mg", "0.01");
    html += '<div class="bac-field"><label>Frequency</label><select class="bac-select" data-role="bac-freq" data-id="' + row.id + '">';
    BAC_FREQ_OPTIONS.forEach(function (opt) {
      html += '<option value="' + opt[0] + '"' + (row.freq === opt[0] ? " selected" : "") + ">" + opt[1] + "</option>";
    });
    html += "</select></div>";
    html += '<div class="bac-field" data-role="bac-custom-wrap"' + (isCustom ? "" : " hidden") + ">";
    html += bacFieldHtml("Every", "bac-custom-days", row.id, row.customFreqDays, "days", "1");
    html += "</div>";
    html += "</div>";
    html += "</div>";

    html += '<div class="bac-row-group bac-row-group-bac">';
    html += '<div class="bac-row-group-title">BAC Water</div>';
    html += '<div class="bac-row-fields bac-row-fields-bac">';
    html += bacFieldHtml("BAC added", "bac-recon", row.id, row.reconMl, "mL", "0.01");
    html += bacFieldHtml("Bottle size", "bac-bottle", row.id, row.bottleMl, "mL", "0.1");
    html += "</div>";
    html += "</div>";

    html += '<div class="bac-row-result" data-role="bac-result"></div>';
    html += "</div>";
    return html;
  }

  function fmtBottles(v) {
    if (!isFinite(v) || v < 0) v = 0;
    return (Math.round(v * 10) / 10).toString();
  }

  function bacPeriodCardHtml(label, period) {
    if (!period.ok) {
      return '<div class="bac-period-card"><span class="bac-period-label">' + label +
        '</span><span class="bac-period-value">&mdash;</span><span class="bac-period-sub">Not enough plan to estimate</span></div>';
    }
    return '<div class="bac-period-card"><span class="bac-period-label">' + label +
      '</span><span class="bac-period-value">' + plural(period.bacBottles, "bottle") +
      '</span><span class="bac-period-fraction">&asymp; ' + fmtBottles(period.trueBottles) + " actually used</span>" +
      '<span class="bac-period-sub">' + fmtSmart(period.bacMl) + " mL &middot; " + plural(period.peptideVials, "vial") + "</span></div>";
  }

  function bacResultHtml(row, calc) {
    if (calc.econ.dosesPerVial <= 0) {
      return '<div class="bac-row-note">Dose is bigger than this vial &mdash; lower the dose or use a bigger vial.</div>';
    }
    var limitedText = calc.econ.limitedBy === "shelf" ? "capped by shelf life" : "capped by mg in vial";
    var html = '<div class="bac-row-note">' + calc.econ.dosesPerVial + " dose" + (calc.econ.dosesPerVial === 1 ? "" : "s") +
      "/vial &middot; lasts " + fmtDaysApprox(calc.econ.activeDays) + " (" + limitedText + ")</div>";
    if (calc.bottleTooSmall) {
      html += '<div class="bac-row-warning">This bottle can&rsquo;t hold a full ' + fmtSmart(row.reconMl) + "mL reconstitution &mdash; use a bigger bottle.</div>";
    }
    html += '<div class="bac-period-grid">' + bacPeriodCardHtml("This month", calc.month) + bacPeriodCardHtml("This year", calc.year) + "</div>";
    return html;
  }

  function updateBacRowResult(id) {
    var row = findBacRow(id);
    if (!row) return;
    var rowEl = els.bacRowsList.querySelector('.bac-row[data-id="' + id + '"]');
    if (!rowEl) return;
    rowEl.querySelector('[data-role="bac-result"]').innerHTML = bacResultHtml(row, computeBacRow(row));
  }

  function bacBreakdownForPeriod(periodKey) {
    var counts = {};
    var order = [];
    bacRows.forEach(function (row) {
      var period = computeBacRow(row)[periodKey];
      if (!period.ok || period.bacBottles <= 0) return;
      var key = fmtSmart(row.bottleMl);
      if (!(key in counts)) { counts[key] = 0; order.push(key); }
      counts[key] += period.bacBottles;
    });
    order.sort(function (a, b) { return parseFloat(a) - parseFloat(b); });
    return order.map(function (key) { return counts[key] + "&times; " + key + "mL"; }).join(" &middot; ");
  }

  function updateBacSummary() {
    if (!bacRows.length) {
      els.bacSummary.innerHTML = '<div class="bac-summary-title">Total Bottles</div><div class="bac-empty">Add a peptide above to see your BAC water totals.</div>';
      return;
    }
    var totalMonthMl = 0, totalMonthBottles = 0, totalMonthTrue = 0, totalYearMl = 0, totalYearBottles = 0, totalYearTrue = 0, activeCount = 0;
    bacRows.forEach(function (row) {
      var calc = computeBacRow(row);
      if (calc.month.ok) { totalMonthMl += calc.month.bacMl; totalMonthBottles += calc.month.bacBottles; totalMonthTrue += calc.month.trueBottles; activeCount++; }
      if (calc.year.ok) { totalYearMl += calc.year.bacMl; totalYearBottles += calc.year.bacBottles; totalYearTrue += calc.year.trueBottles; }
    });
    if (!activeCount) {
      els.bacSummary.innerHTML = '<div class="bac-summary-title">Total Bottles</div><div class="bac-empty">Fix the peptide setups above (dose vs. vial size) to see totals.</div>';
      return;
    }
    var peptideLabel = plural(bacRows.length, "peptide");
    var monthBreakdown = bacBreakdownForPeriod("month");
    var yearBreakdown = bacBreakdownForPeriod("year");
    var html = '<div class="bac-summary-title">Total Bottles</div><div class="bac-summary-grid">';
    html += '<div class="bac-summary-card"><span class="bac-summary-label">Per month</span><span class="bac-summary-value">' +
      plural(totalMonthBottles, "bottle") + "</span>" +
      '<span class="bac-summary-fraction">&asymp; ' + fmtBottles(totalMonthTrue) + " actually used</span>" +
      (monthBreakdown ? '<span class="bac-summary-breakdown">' + monthBreakdown + "</span>" : "") +
      '<span class="bac-summary-sub">' + fmtSmart(totalMonthMl) + " mL &middot; " + peptideLabel + "</span></div>";
    html += '<div class="bac-summary-card"><span class="bac-summary-label">Per year</span><span class="bac-summary-value">' +
      plural(totalYearBottles, "bottle") + "</span>" +
      '<span class="bac-summary-fraction">&asymp; ' + fmtBottles(totalYearTrue) + " actually used</span>" +
      (yearBreakdown ? '<span class="bac-summary-breakdown">' + yearBreakdown + "</span>" : "") +
      '<span class="bac-summary-sub">' + fmtSmart(totalYearMl) + " mL &middot; " + peptideLabel + "</span></div>";
    html += "</div>";
    els.bacSummary.innerHTML = html;
  }

  function renderAllBacResults() {
    bacRows.forEach(function (row) { updateBacRowResult(row.id); });
    updateBacSummary();
  }

  function wireBacNumberField(role, key, fallback) {
    els.bacRowsList.querySelectorAll('[data-role="' + role + '"]').forEach(function (input) {
      input.addEventListener("input", function () {
        var row = findBacRow(input.dataset.id);
        if (!row) return;
        row[key] = fallback === undefined ? num(input) : (num(input) || fallback);
        updateBacRowResult(row.id);
        updateBacSummary();
        saveBacState();
      });
    });
  }

  function renderBacRows() {
    els.bacRowsList.innerHTML = bacRows.map(bacRowHtml).join("");
    els.bacRowsEmpty.hidden = bacRows.length > 0;

    els.bacRowsList.querySelectorAll('[data-role="bac-remove"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        bacRows = bacRows.filter(function (r) { return r.id !== btn.dataset.id; });
        renderBacRows();
        updateBacSummary();
        saveBacState();
      });
    });
    els.bacRowsList.querySelectorAll('[data-role="bac-name"]').forEach(function (input) {
      input.addEventListener("input", function () {
        var row = findBacRow(input.dataset.id);
        if (row) { row.name = input.value; saveBacState(); }
      });
    });

    wireBacNumberField("bac-mg", "mgPerVial");
    wireBacNumberField("bac-recon", "reconMl");
    wireBacNumberField("bac-bottle", "bottleMl");
    wireBacNumberField("bac-dose", "doseMg");
    wireBacNumberField("bac-custom-days", "customFreqDays", 1);

    els.bacRowsList.querySelectorAll('[data-role="bac-freq"]').forEach(function (select) {
      select.addEventListener("change", function () {
        var row = findBacRow(select.dataset.id);
        if (!row) return;
        row.freq = select.value;
        var wrap = select.closest(".bac-row").querySelector('[data-role="bac-custom-wrap"]');
        if (wrap) wrap.hidden = row.freq !== "custom";
        updateBacRowResult(row.id);
        updateBacSummary();
        saveBacState();
      });
    });

    renderAllBacResults();
  }

  function saveBacState() {
    try {
      localStorage.setItem(BAC_KEY, JSON.stringify({ bacShelfDays: bacShelfDays, bacRows: bacRows }));
    } catch (e) { /* storage unavailable */ }
  }

  function loadBacState() {
    var saved = null;
    try {
      var raw = localStorage.getItem(BAC_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (e) {
      saved = null;
    }

    if (saved) {
      if (saved.bacShelfDays) bacShelfDays = saved.bacShelfDays;
      bacRows = Array.isArray(saved.bacRows) && saved.bacRows.length ? saved.bacRows : [defaultBacRow(0)];
      bacRows.forEach(function (row) { if (!row.bottleMl) row.bottleMl = 10; });
    } else {
      bacRows = [defaultBacRow(0)];
    }
    els.bacShelfDaysGlobal.value = fmtSmart(bacShelfDays);
  }

  function wireBacEvents() {
    els.bacShelfDaysGlobal.addEventListener("input", function () {
      bacShelfDays = num(els.bacShelfDaysGlobal) || 28;
      renderAllBacResults();
      saveBacState();
    });
    els.addBacRowBtn.addEventListener("click", function () {
      bacRows.push(defaultBacRow(bacRows.length));
      renderBacRows();
      saveBacState();
    });
  }

  function wireEvents() {
    vialMgField.wire(function (v) { state.vialMg = v; });
    vialVolumeField.wire(function (v) { state.vialVolume = v; });
    doseMgField.wire(function (v) { state.doseMg = v; state.drawPrimary = "dose"; });
    planAmountField.wire(function (v) { state.planAmount = v; });

    els.unitsInput.addEventListener("input", function () { state.drawPrimary = "units"; render(); });
    els.volInput.addEventListener("input", function () { state.drawPrimary = "volume"; render(); });

    els.syringeGroup.querySelectorAll(".chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectSyringe(btn.dataset.capacity);
      });
    });

    els.customCapInput.addEventListener("input", function () {
      state.syringeCapacity = num(els.customCapInput);
      els.customUnitsLabel.textContent = Math.round(state.syringeCapacity * 100) + " units";
      render();
    });

    els.freqToggle.querySelectorAll(".mode-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.freq = btn.dataset.freq;
        setActiveButton(els.freqToggle, ".mode-btn", "freq", state.freq);
        render();
      });
    });

    els.timeToggle.querySelectorAll(".mode-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.timeUnit = btn.dataset.unit;
        setActiveButton(els.timeToggle, ".mode-btn", "unit", state.timeUnit);
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
    } catch (e) {
      /* storage unavailable, e.g. private browsing; skip persistence */
    }
  }

  function saveState() {
    try {
      localStorage.setItem("peptideCalc", JSON.stringify({
        vialMg: state.vialMg,
        vialVolume: state.vialVolume,
        doseMg: state.doseMg,
        syringeCapacity: state.syringeCapacity,
        freq: state.freq,
        drawPrimary: state.drawPrimary,
        timeUnit: state.timeUnit,
        planAmount: state.planAmount,
        planUnit: state.planUnit,
        volInput: els.volInput.value,
        unitsInput: els.unitsInput.value,
        customCapInput: els.customCapInput.value,
        customActive: !els.customCapInput.hidden
      }));
    } catch (e) {
      /* storage unavailable, e.g. private browsing; skip persistence */
    }
  }

  function loadState(done) {
    var saved = null;
    try {
      var raw = localStorage.getItem("peptideCalc");
      if (raw) saved = JSON.parse(raw);
    } catch (e) {
      saved = null;
    }
    if (saved) {
      if (saved.vialMg !== undefined) state.vialMg = saved.vialMg;
      if (saved.vialVolume !== undefined) state.vialVolume = saved.vialVolume;
      if (saved.doseMg !== undefined) state.doseMg = saved.doseMg;
      state.freq = saved.freq || state.freq;
      state.drawPrimary = saved.drawPrimary || state.drawPrimary;
      state.timeUnit = saved.timeUnit || state.timeUnit;
      state.planUnit = saved.planUnit || state.planUnit;
      if (saved.planAmount !== undefined) state.planAmount = saved.planAmount;
      if (saved.volInput !== undefined) els.volInput.value = saved.volInput;
      if (saved.unitsInput !== undefined) els.unitsInput.value = saved.unitsInput;

      state.syringeCapacity = saved.syringeCapacity || state.syringeCapacity;
      if (saved.customActive) {
        els.customCapInput.hidden = false;
        els.customCapInput.value = saved.customCapInput || state.syringeCapacity;
        setActiveButton(els.syringeGroup, ".chip", "capacity", "custom");
        els.customUnitsLabel.textContent = Math.round(state.syringeCapacity * 100) + " units";
      } else {
        setActiveButton(els.syringeGroup, ".chip", "capacity", state.syringeCapacity);
      }
      setActiveButton(els.freqToggle, ".mode-btn", "freq", state.freq);
      setActiveButton(els.timeToggle, ".mode-btn", "unit", state.timeUnit);
      setActiveButton(els.planUnitToggle, ".mode-btn", "unit", state.planUnit);
    }

    vialMgField.init(state.vialMg, function (v) { state.vialMg = v; });
    vialVolumeField.init(state.vialVolume, function (v) { state.vialVolume = v; });
    doseMgField.init(state.doseMg, function (v) { state.doseMg = v; });
    planAmountField.init(state.planAmount, function (v) { state.planAmount = v; });

    done();
  }

  wireEvents();
  wireBacEvents();
  loadTheme();
  loadState(render);
  loadBacState();
  renderBacRows();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {
        /* offline caching unavailable, app still works fully online */
      });
    });
  }
})();
