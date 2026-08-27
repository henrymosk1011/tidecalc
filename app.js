(function () {
  "use strict";

  var els = {
    vialMg: document.getElementById("vialMg"),
    vialVolume: document.getElementById("vialVolume"),
    vialConc: document.getElementById("vialConc"),
    syringeGroup: document.getElementById("syringeGroup"),
    customPill: document.getElementById("customPill"),
    customCapRow: document.getElementById("customCapRow"),
    customCapInput: document.getElementById("customCapInput"),
    customUnitsLabel: document.getElementById("customUnitsLabel"),
    freqToggle: document.getElementById("freqToggle"),
    doseMg: document.getElementById("doseMg"),
    vialLabel: document.getElementById("vialLabel"),
    syrLiquid: document.getElementById("syrLiquid"),
    plungerHead: document.getElementById("plungerHead"),
    tickGroup: document.getElementById("tickGroup"),
    warningBox: document.getElementById("warningBox"),
    unitsInput: document.getElementById("unitsInput"),
    volInput: document.getElementById("volInput"),
    doseGrid: document.getElementById("doseGrid"),
    doseGridExtra: document.getElementById("doseGridExtra"),
    supplyReadout: document.getElementById("supplyReadout"),
    timeToggle: document.getElementById("timeToggle"),
    supplyDuration: document.getElementById("supplyDuration"),
    planAmount: document.getElementById("planAmount"),
    planUnitToggle: document.getElementById("planUnitToggle"),
    planResult: document.getElementById("planResult"),
    themeToggle: document.getElementById("themeToggle")
  };

  els.unitsCard = els.unitsInput.closest(".readout-card");

  var DAY_LEN = { days: 1, weeks: 7, months: 30.44, years: 365.25 };

  var state = {
    syringeCapacity: 1,
    freq: "daily",
    vialOrder: ["conc", "vol", "mg"],
    drawPrimary: "dose",
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

  function fmtUnits(u) {
    var rounded = Math.round(u * 10) / 10;
    return rounded.toString();
  }

  function fmtVol(v) {
    if (v <= 0) return "0";
    if (v < 0.1) return (Math.round(v * 1000) / 1000).toString();
    return (Math.round(v * 100) / 100).toString();
  }

  function touchVialField(field) {
    var idx = state.vialOrder.indexOf(field);
    if (idx > -1) state.vialOrder.splice(idx, 1);
    state.vialOrder.push(field);
  }

  function solveVial() {
    var mg = num(els.vialMg), vol = num(els.vialVolume), conc = num(els.vialConc);
    var target = state.vialOrder[0];
    if (target === "mg") {
      mg = conc * vol;
      els.vialMg.value = fmtSmart(mg);
    } else if (target === "vol") {
      vol = conc > 0 ? mg / conc : 0;
      els.vialVolume.value = fmtSmart(vol);
    } else {
      conc = vol > 0 ? mg / vol : 0;
      els.vialConc.value = fmtSmart(conc);
    }
    return { mg: mg, vol: vol, conc: conc };
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

    var planAmt = num(els.planAmount);
    var targetDays = planAmt * DAY_LEN[state.planUnit];
    var dosesNeeded = targetDays / daysPerDose();
    var vialsNeeded = totalDoses > 0 ? Math.ceil(dosesNeeded / totalDoses) : 0;
    els.planResult.textContent =
      planAmt > 0 && totalDoses > 0
        ? "You'll need about " + vialsNeeded + " vial" + (vialsNeeded === 1 ? "" : "s") + " to cover " + planAmt + " " + state.planUnit + "."
        : "Enter a vial setup and a time span to estimate vials needed.";
  }

  function render() {
    var vial = solveVial();
    var conc = vial.conc;
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
      dose = num(els.doseMg);
      volumeMl = conc > 0 ? dose / conc : 0;
      units = volumeMl * 100;
    }

    if (state.drawPrimary !== "dose") els.doseMg.value = fmtSmart(dose);
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

    renderSupply(vial.mg, dose);
    saveState();
  }

  function setActiveButton(group, selector, attr, value) {
    group.querySelectorAll(selector).forEach(function (b) {
      b.classList.toggle("active", b.dataset[attr] === String(value));
    });
  }

  function selectSyringe(capacityValue) {
    if (capacityValue === "custom") {
      els.customCapRow.hidden = false;
      state.syringeCapacity = num(els.customCapInput) || 1;
      setActiveButton(els.syringeGroup, ".pill", "capacity", "custom");
    } else {
      els.customCapRow.hidden = true;
      state.syringeCapacity = parseFloat(capacityValue);
      setActiveButton(els.syringeGroup, ".pill", "capacity", capacityValue);
    }
    render();
  }

  function wireEvents() {
    els.vialMg.addEventListener("input", function () { touchVialField("mg"); render(); });
    els.vialVolume.addEventListener("input", function () { touchVialField("vol"); render(); });
    els.vialConc.addEventListener("input", function () { touchVialField("conc"); render(); });

    els.doseMg.addEventListener("input", function () { state.drawPrimary = "dose"; render(); });
    els.volInput.addEventListener("input", function () { state.drawPrimary = "volume"; render(); });
    els.unitsInput.addEventListener("input", function () { state.drawPrimary = "units"; render(); });

    els.syringeGroup.querySelectorAll(".pill").forEach(function (btn) {
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

    els.planAmount.addEventListener("input", render);

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
        syringeCapacity: state.syringeCapacity,
        freq: state.freq,
        vialOrder: state.vialOrder,
        drawPrimary: state.drawPrimary,
        timeUnit: state.timeUnit,
        planUnit: state.planUnit,
        vialMg: els.vialMg.value,
        vialVolume: els.vialVolume.value,
        vialConc: els.vialConc.value,
        doseMg: els.doseMg.value,
        volInput: els.volInput.value,
        unitsInput: els.unitsInput.value,
        customCapInput: els.customCapInput.value,
        planAmount: els.planAmount.value,
        customActive: !els.customCapRow.hidden
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
      state.freq = saved.freq || state.freq;
      state.vialOrder = saved.vialOrder || state.vialOrder;
      state.drawPrimary = saved.drawPrimary || state.drawPrimary;
      state.timeUnit = saved.timeUnit || state.timeUnit;
      state.planUnit = saved.planUnit || state.planUnit;
      if (saved.vialMg !== undefined) els.vialMg.value = saved.vialMg;
      if (saved.vialVolume !== undefined) els.vialVolume.value = saved.vialVolume;
      if (saved.vialConc !== undefined) els.vialConc.value = saved.vialConc;
      if (saved.doseMg !== undefined) els.doseMg.value = saved.doseMg;
      if (saved.volInput !== undefined) els.volInput.value = saved.volInput;
      if (saved.unitsInput !== undefined) els.unitsInput.value = saved.unitsInput;
      if (saved.customCapInput !== undefined) els.customCapInput.value = saved.customCapInput;
      if (saved.planAmount !== undefined) els.planAmount.value = saved.planAmount;

      state.syringeCapacity = saved.syringeCapacity || state.syringeCapacity;
      if (saved.customActive) {
        els.customCapRow.hidden = false;
        setActiveButton(els.syringeGroup, ".pill", "capacity", "custom");
        els.customUnitsLabel.textContent = Math.round(state.syringeCapacity * 100) + " units";
      } else {
        setActiveButton(els.syringeGroup, ".pill", "capacity", state.syringeCapacity);
      }
      setActiveButton(els.freqToggle, ".mode-btn", "freq", state.freq);
      setActiveButton(els.timeToggle, ".mode-btn", "unit", state.timeUnit);
      setActiveButton(els.planUnitToggle, ".mode-btn", "unit", state.planUnit);
    }
    done();
  }

  wireEvents();
  loadTheme();
  loadState(render);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {
        /* offline caching unavailable, app still works fully online */
      });
    });
  }
})();
