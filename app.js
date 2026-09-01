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
    themeToggle: document.getElementById("themeToggle")
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
