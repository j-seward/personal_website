/* ============================================================
   Interactive Research Charts — jseward.com
   Recreates key results from published papers using Canvas.
   Themed to match the site's navy/gold palette.
   ============================================================ */

(function () {
  'use strict';

  // Theme colors
  const C = {
    navy: '#0f1923',
    slate: '#2c3e50',
    gold: '#c5a55a',
    goldLight: '#d4b96a',
    goldDark: '#a88b3d',
    gray: '#8e97a4',
    grayLight: '#dde1e7',
    grayLighter: '#eef0f3',
    white: '#ffffff',
    text: '#1a202c',
    textMuted: '#6b7685',
  };

  const fontHeading = '"Space Grotesk", "Inter", sans-serif';
  const fontBody = '"Inter", sans-serif';
  const tooltipCache = new WeakMap();
  const hoverHandlerCache = new WeakMap();

  function getTooltip(canvas) {
    const existing = tooltipCache.get(canvas);
    if (existing) return existing;

    const tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    canvas.parentElement.appendChild(tooltip);
    tooltipCache.set(canvas, tooltip);
    return tooltip;
  }

  function bindCanvasHover(canvas, onMove) {
    const existing = hoverHandlerCache.get(canvas);
    if (existing) {
      canvas.removeEventListener('mousemove', existing.mousemove);
      canvas.removeEventListener('mouseleave', existing.mouseleave);
    }

    const mousemove = (event) => onMove(event);
    const mouseleave = () => getTooltip(canvas).classList.remove('visible');
    canvas.addEventListener('mousemove', mousemove);
    canvas.addEventListener('mouseleave', mouseleave);
    hoverHandlerCache.set(canvas, { mousemove, mouseleave });
  }

  function getCanvasPoint(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    const dpr = parseFloat(canvas.dataset.chartDpr || '1');
    const scaleX = canvas.width / rect.width / dpr;
    const scaleY = canvas.height / rect.height / dpr;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
      localX: event.clientX - rect.left,
      localY: event.clientY - rect.top,
    };
  }

  // Utility: get DPR-aware canvas context
  function setupCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.parentElement.getBoundingClientRect();
    const w = Math.max(rect.width - 32, 220); // minus padding with narrow-screen floor
    const aspect = canvas.height / canvas.width;
    const h = w * aspect;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.dataset.chartDpr = String(dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { canvas, ctx, w, h, dpr };
  }

  // ============================================================
  // CHART 1: JHR — First Stage (histogram + regression line)
  // ============================================================
  function drawJHR() {
    const setup = setupCanvas('canvas-jhr');
    if (!setup) return;
    const { canvas, ctx, w, h } = setup;

    // Layout
    const pad = { top: 30, right: 60, bottom: 55, left: 55 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    // Data: histogram bins from JHR analysis dataset (TAY subsample)
    const bins = [
      { x: -0.5875, h: 0.000000 }, { x: -0.5625, h: 0.000000 }, { x: -0.5375, h: 0.000000 },
      { x: -0.5125, h: 0.000000 }, { x: -0.4875, h: 0.000000 }, { x: -0.4625, h: 0.000000 },
      { x: -0.4375, h: 0.000000 }, { x: -0.4125, h: 0.000000 }, { x: -0.3875, h: 0.000000 },
      { x: -0.3625, h: 0.000000 }, { x: -0.3375, h: 0.000000 }, { x: -0.3125, h: 0.000000 },
      { x: -0.2875, h: 0.000000 }, { x: -0.2625, h: 0.000179 }, { x: -0.2375, h: 0.000269 },
      { x: -0.2125, h: 0.001525 }, { x: -0.1875, h: 0.000179 }, { x: -0.1625, h: 0.002512 },
      { x: -0.1375, h: 0.071768 }, { x: -0.1125, h: 0.077599 }, { x: -0.0875, h: 0.086122 },
      { x: -0.0625, h: 0.227146 }, { x: -0.0375, h: 0.077868 }, { x: -0.0125, h: 0.025209 },
      { x: 0.0125, h: 0.032027 }, { x: 0.0375, h: 0.102001 }, { x: 0.0625, h: 0.002602 },
      { x: 0.0875, h: 0.140486 }, { x: 0.1125, h: 0.019557 }, { x: 0.1375, h: 0.011842 },
      { x: 0.1625, h: 0.090069 }, { x: 0.1875, h: 0.004396 }, { x: 0.2125, h: 0.001077 },
      { x: 0.2375, h: 0.025567 }, { x: 0.2625, h: 0.000000 }, { x: 0.2875, h: 0.000000 },
      { x: 0.3125, h: 0.000000 }, { x: 0.3375, h: 0.000000 }, { x: 0.3625, h: 0.000000 },
      { x: 0.3875, h: 0.000000 }, { x: 0.4125, h: 0.000000 }, { x: 0.4375, h: 0.000000 },
      { x: 0.4625, h: 0.000000 }, { x: 0.4875, h: 0.000000 }, { x: 0.5125, h: 0.000000 },
      { x: 0.5375, h: 0.000000 }, { x: 0.5625, h: 0.000000 }, { x: 0.5875, h: 0.000000 },
    ];

    const xMin = -0.6, xMax = 0.6;
    const yMaxHist = 0.25;

    function toX(v) { return pad.left + ((v - xMin) / (xMax - xMin)) * plotW; }
    function toY(v) { return pad.top + (1 - v / yMaxHist) * plotH; }

    // Background
    ctx.fillStyle = C.white;
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = C.grayLighter;
    ctx.lineWidth = 0.5;
    for (let v = 0; v <= 0.25; v += 0.05) {
      ctx.beginPath();
      ctx.moveTo(pad.left, toY(v));
      ctx.lineTo(w - pad.right, toY(v));
      ctx.stroke();
    }

    // Histogram bars
    const barW = (plotW / bins.length) * 0.8;
    bins.forEach(b => {
      const bx = toX(b.x) - barW / 2;
      const by = toY(b.h);
      const bh = toY(0) - by;
      ctx.fillStyle = 'rgba(197, 165, 90, 0.3)';
      ctx.fillRect(bx, by, barW, bh);
      ctx.strokeStyle = 'rgba(197, 165, 90, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, barW, bh);
    });

    // Local polynomial first stage from JHR analysis data (TAY)
    // Parameters mirror Stata: Gaussian kernel, degree(1), bw(0.35), n(100)
    const lineYMin = -0.10, lineYMax = 0.40;
    function toYRight(v) { return pad.top + (1 - (v - lineYMin) / (lineYMax - lineYMin)) * plotH; }

    const fsCurve = [
      { x: -0.257230, y: -0.030949, se: 0.005222 },
      { x: -0.252268, y: -0.027100, se: 0.005153 },
      { x: -0.247305, y: -0.023250, se: 0.005083 },
      { x: -0.242342, y: -0.019399, se: 0.005012 },
      { x: -0.237379, y: -0.015546, se: 0.004941 },
      { x: -0.232417, y: -0.011693, se: 0.004869 },
      { x: -0.227454, y: -0.007839, se: 0.004797 },
      { x: -0.222491, y: -0.003983, se: 0.004724 },
      { x: -0.217529, y: -0.000127, se: 0.004650 },
      { x: -0.212566, y: 0.003731, se: 0.004576 },
      { x: -0.207603, y: 0.007589, se: 0.004501 },
      { x: -0.202641, y: 0.011448, se: 0.004426 },
      { x: -0.197678, y: 0.015309, se: 0.004351 },
      { x: -0.192715, y: 0.019170, se: 0.004275 },
      { x: -0.187753, y: 0.023032, se: 0.004199 },
      { x: -0.182790, y: 0.026895, se: 0.004123 },
      { x: -0.177827, y: 0.030759, se: 0.004047 },
      { x: -0.172865, y: 0.034624, se: 0.003970 },
      { x: -0.167902, y: 0.038490, se: 0.003893 },
      { x: -0.162939, y: 0.042357, se: 0.003817 },
      { x: -0.157977, y: 0.046225, se: 0.003740 },
      { x: -0.153014, y: 0.050093, se: 0.003664 },
      { x: -0.148051, y: 0.053963, se: 0.003587 },
      { x: -0.143088, y: 0.057833, se: 0.003511 },
      { x: -0.138126, y: 0.061704, se: 0.003436 },
      { x: -0.133163, y: 0.065576, se: 0.003361 },
      { x: -0.128200, y: 0.069448, se: 0.003286 },
      { x: -0.123238, y: 0.073322, se: 0.003212 },
      { x: -0.118275, y: 0.077196, se: 0.003140 },
      { x: -0.113312, y: 0.081071, se: 0.003068 },
      { x: -0.108350, y: 0.084947, se: 0.002997 },
      { x: -0.103387, y: 0.088824, se: 0.002927 },
      { x: -0.098424, y: 0.092701, se: 0.002859 },
      { x: -0.093462, y: 0.096579, se: 0.002792 },
      { x: -0.088499, y: 0.100458, se: 0.002727 },
      { x: -0.083536, y: 0.104337, se: 0.002664 },
      { x: -0.078574, y: 0.108218, se: 0.002603 },
      { x: -0.073611, y: 0.112099, se: 0.002544 },
      { x: -0.068648, y: 0.115980, se: 0.002488 },
      { x: -0.063686, y: 0.119863, se: 0.002435 },
      { x: -0.058723, y: 0.123746, se: 0.002385 },
      { x: -0.053760, y: 0.127630, se: 0.002338 },
      { x: -0.048797, y: 0.131514, se: 0.002295 },
      { x: -0.043835, y: 0.135399, se: 0.002256 },
      { x: -0.038872, y: 0.139285, se: 0.002220 },
      { x: -0.033909, y: 0.143171, se: 0.002189 },
      { x: -0.028947, y: 0.147058, se: 0.002163 },
      { x: -0.023984, y: 0.150946, se: 0.002141 },
      { x: -0.019021, y: 0.154834, se: 0.002124 },
      { x: -0.014059, y: 0.158723, se: 0.002112 },
      { x: -0.009096, y: 0.162613, se: 0.002105 },
      { x: -0.004133, y: 0.166503, se: 0.002104 },
      { x: 0.000829, y: 0.170394, se: 0.002108 },
      { x: 0.005792, y: 0.174285, se: 0.002117 },
      { x: 0.010755, y: 0.178177, se: 0.002131 },
      { x: 0.015717, y: 0.182070, se: 0.002150 },
      { x: 0.020680, y: 0.185963, se: 0.002174 },
      { x: 0.025643, y: 0.189856, se: 0.002203 },
      { x: 0.030605, y: 0.193751, se: 0.002237 },
      { x: 0.035568, y: 0.197645, se: 0.002275 },
      { x: 0.040531, y: 0.201541, se: 0.002317 },
      { x: 0.045493, y: 0.205436, se: 0.002363 },
      { x: 0.050456, y: 0.209333, se: 0.002413 },
      { x: 0.055419, y: 0.213230, se: 0.002466 },
      { x: 0.060382, y: 0.217127, se: 0.002522 },
      { x: 0.065344, y: 0.221025, se: 0.002581 },
      { x: 0.070307, y: 0.224924, se: 0.002643 },
      { x: 0.075270, y: 0.228823, se: 0.002707 },
      { x: 0.080232, y: 0.232722, se: 0.002773 },
      { x: 0.085195, y: 0.236622, se: 0.002842 },
      { x: 0.090158, y: 0.240522, se: 0.002912 },
      { x: 0.095120, y: 0.244423, se: 0.002984 },
      { x: 0.100083, y: 0.248325, se: 0.003058 },
      { x: 0.105046, y: 0.252227, se: 0.003133 },
      { x: 0.110008, y: 0.256129, se: 0.003209 },
      { x: 0.114971, y: 0.260032, se: 0.003287 },
      { x: 0.119934, y: 0.263935, se: 0.003365 },
      { x: 0.124896, y: 0.267839, se: 0.003444 },
      { x: 0.129859, y: 0.271743, se: 0.003524 },
      { x: 0.134822, y: 0.275648, se: 0.003605 },
      { x: 0.139784, y: 0.279553, se: 0.003686 },
      { x: 0.144747, y: 0.283458, se: 0.003767 },
      { x: 0.149710, y: 0.287364, se: 0.003849 },
      { x: 0.154673, y: 0.291271, se: 0.003932 },
      { x: 0.159635, y: 0.295177, se: 0.004014 },
      { x: 0.164598, y: 0.299085, se: 0.004097 },
      { x: 0.169561, y: 0.302992, se: 0.004179 },
      { x: 0.174523, y: 0.306900, se: 0.004262 },
      { x: 0.179486, y: 0.310809, se: 0.004345 },
      { x: 0.184449, y: 0.314717, se: 0.004428 },
      { x: 0.189411, y: 0.318627, se: 0.004510 },
      { x: 0.194374, y: 0.322536, se: 0.004593 },
      { x: 0.199337, y: 0.326446, se: 0.004675 },
      { x: 0.204299, y: 0.330356, se: 0.004757 },
      { x: 0.209262, y: 0.334267, se: 0.004838 },
      { x: 0.214225, y: 0.338178, se: 0.004920 },
      { x: 0.219187, y: 0.342090, se: 0.005001 },
      { x: 0.224150, y: 0.346002, se: 0.005081 },
      { x: 0.229113, y: 0.349914, se: 0.005161 },
      { x: 0.234075, y: 0.353826, se: 0.005241 },
    ];

    const drawSeries = (points, yGetter) => {
      if (!points.length) return;
      ctx.beginPath();
      points.forEach((p, i) => {
        const x = toX(p.x);
        const y = toYRight(yGetter(p));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    // Confidence interval (dashed)
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = C.gray;
    drawSeries(fsCurve, p => p.y + 1.96 * p.se);
    drawSeries(fsCurve, p => p.y - 1.96 * p.se);
    ctx.setLineDash([]);

    // Local polynomial first-stage fit
    ctx.strokeStyle = C.navy;
    ctx.lineWidth = 2.5;
    drawSeries(fsCurve, p => p.y);

    // Axes
    ctx.strokeStyle = C.slate;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, h - pad.bottom);
    ctx.lineTo(w - pad.right, h - pad.bottom);
    ctx.lineTo(w - pad.right, pad.top);
    ctx.stroke();

    // X axis labels
    ctx.fillStyle = C.textMuted;
    ctx.font = `10px ${fontBody}`;
    ctx.textAlign = 'center';
    for (let v = -0.6; v <= 0.6; v += 0.2) {
      ctx.fillText(v.toFixed(1), toX(v), h - pad.bottom + 15);
    }

    // Y axis labels (left — histogram)
    ctx.textAlign = 'right';
    for (let v = 0; v <= 0.25; v += 0.05) {
      ctx.fillText(v.toFixed(2), pad.left - 8, toY(v) + 3);
    }

    // Y axis labels (right — first stage)
    ctx.textAlign = 'left';
    const rightTicks = [-0.1, 0.0, 0.1, 0.2, 0.3, 0.4];
    rightTicks.forEach(v => {
      ctx.fillText(v.toFixed(2), w - pad.right + 8, toYRight(v) + 3);
    });

    // Axis titles
    ctx.fillStyle = C.text;
    ctx.font = `500 11px ${fontHeading}`;
    ctx.textAlign = 'center';
    ctx.fillText('Distribution of Initial Assessment of Mental Health Court Propensity', w / 2, h - 5);

    ctx.save();
    ctx.translate(12, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Fraction of Sample', 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(w - 5, h / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = C.text;
    ctx.font = `500 10px ${fontHeading}`;
    ctx.fillText('Residualized Propensity (First Stage)', 0, 0);
    ctx.restore();

    // Title
    ctx.fillStyle = C.text;
    ctx.font = `600 13px ${fontHeading}`;
    ctx.textAlign = 'center';
    ctx.fillText('Distribution and First Stage of Mental Health Court (Under 25)', w / 2, 18);
  }

  // ============================================================
  // CHART 2: JHE — Horizontal stacked bars (ASC vs HOPD)
  // ============================================================
  function drawJHE() {
    const setup = setupCanvas('canvas-jhe');
    if (!setup) return;
    const { canvas, ctx, w, h } = setup;

    const pad = { top: 30, right: 30, bottom: 40, left: 150 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    // Data from original vert_int analysis output (Figure 1 source)
    const groups = [
      {
        label: 'Not Vertically\nIntegrated',
        data: [
          { year: 2009, asc: 0.260813, hopd: 0.739187 },
          { year: 2010, asc: 0.261002, hopd: 0.738998 },
          { year: 2011, asc: 0.266932, hopd: 0.733068 },
          { year: 2012, asc: 0.276330, hopd: 0.723670 },
          { year: 2013, asc: 0.277283, hopd: 0.722717 },
          { year: 2014, asc: 0.284623, hopd: 0.715377 },
          { year: 2015, asc: 0.285623, hopd: 0.714377 },
        ]
      },
      {
        label: 'Vertically\nIntegrated',
        data: [
          { year: 2009, asc: 0.040867, hopd: 0.959133 },
          { year: 2010, asc: 0.042121, hopd: 0.957879 },
          { year: 2011, asc: 0.067828, hopd: 0.932172 },
          { year: 2012, asc: 0.075923, hopd: 0.924077 },
          { year: 2013, asc: 0.099634, hopd: 0.900366 },
          { year: 2014, asc: 0.105108, hopd: 0.894892 },
          { year: 2015, asc: 0.103549, hopd: 0.896451 },
        ]
      }
    ];

    ctx.fillStyle = C.white;
    ctx.fillRect(0, 0, w, h);

    const totalBars = groups.reduce((s, g) => s + g.data.length, 0) + 1; // +1 for gap
    const barH = plotH / (totalBars + 2);
    const gap = barH * 1.5;

    let yPos = pad.top + barH;

    // Tooltip state
    const barRects = [];

    groups.forEach((group, gi) => {
      // Group label
      ctx.fillStyle = C.text;
      ctx.font = `600 12px ${fontHeading}`;
      ctx.textAlign = 'right';
      const lines = group.label.split('\n');
      const labelY = yPos + (group.data.length * barH) / 2;
      lines.forEach((line, li) => {
        ctx.fillText(line, pad.left - 12, labelY + (li - (lines.length - 1) / 2) * 14);
      });

      group.data.forEach((d, di) => {
        const y = yPos + di * barH;
        const ascW = (d.asc / 1) * plotW;
        const hopdW = (d.hopd / 1) * plotW;

        // ASC bar (dark gold)
        ctx.fillStyle = C.goldDark;
        ctx.fillRect(pad.left, y, ascW, barH * 0.75);

        // HOPD bar (light gold)
        ctx.fillStyle = 'rgba(197, 165, 90, 0.25)';
        ctx.fillRect(pad.left + ascW, y, hopdW, barH * 0.75);

        // Border
        ctx.strokeStyle = C.grayLight;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(pad.left, y, plotW, barH * 0.75);

        // Year label
        ctx.fillStyle = C.textMuted;
        ctx.font = `10px ${fontBody}`;
        ctx.textAlign = 'right';
        ctx.fillText(d.year, pad.left + 88, y + barH * 0.45);

        barRects.push({ x: pad.left, y, w: plotW, h: barH * 0.75, asc: d.asc, hopd: d.hopd, year: d.year, group: gi === 0 ? 'Non-VI' : 'VI' });
      });

      yPos += group.data.length * barH + gap;
    });

    // X axis
    ctx.strokeStyle = C.slate;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, h - pad.bottom);
    ctx.lineTo(w - pad.right, h - pad.bottom);
    ctx.stroke();

    // X ticks
    ctx.fillStyle = C.textMuted;
    ctx.font = `10px ${fontBody}`;
    ctx.textAlign = 'center';
    for (let v = 0; v <= 1; v += 0.2) {
      const x = pad.left + (v / 1) * plotW;
      ctx.fillText(v.toFixed(1), x, h - pad.bottom + 15);
      ctx.strokeStyle = C.grayLighter;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, h - pad.bottom);
      ctx.stroke();
    }

    // Legend
    const legX = pad.left + plotW * 0.3;
    const legY = h - 12;
    ctx.fillStyle = C.goldDark;
    ctx.fillRect(legX, legY - 8, 14, 10);
    ctx.fillStyle = C.text;
    ctx.font = `10px ${fontBody}`;
    ctx.textAlign = 'left';
    ctx.fillText('Share in ASCs', legX + 18, legY);

    ctx.fillStyle = 'rgba(197, 165, 90, 0.25)';
    ctx.fillRect(legX + 110, legY - 8, 14, 10);
    ctx.strokeStyle = C.grayLight;
    ctx.strokeRect(legX + 110, legY - 8, 14, 10);
    ctx.fillStyle = C.text;
    ctx.fillText('Share in HOPDs', legX + 128, legY);

    // Title
    ctx.fillStyle = C.text;
    ctx.font = `600 13px ${fontHeading}`;
    ctx.textAlign = 'center';
    ctx.fillText('Outpatient Case Setting by Vertical Integration Status', w / 2, 18);

    // Hover tooltip
    const tooltip = getTooltip(canvas);
    bindCanvasHover(canvas, (event) => {
      const point = getCanvasPoint(canvas, event);
      let found = null;
      for (const r of barRects) {
        if (point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h) {
          found = r;
          break;
        }
      }

      if (found) {
        tooltip.textContent = `${found.group} ${found.year}: ASC ${(found.asc * 100).toFixed(0)}% | HOPD ${(found.hopd * 100).toFixed(0)}%`;
        tooltip.classList.add('visible');
        tooltip.style.left = (point.localX + 10) + 'px';
        tooltip.style.top = (point.localY - 30) + 'px';
      } else {
        tooltip.classList.remove('visible');
      }
    });
  }

  // ============================================================
  // CHART 3: AJMC — Line chart (TKA trends by payer)
  // ============================================================
  function drawAJMC() {
    const setup = setupCanvas('canvas-ajmc');
    if (!setup) return;
    const { canvas, ctx, w, h } = setup;

    const pad = { top: 30, right: 30, bottom: 50, left: 60 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    // Data from original AJMC analysis workbook
    const medicare = [
      { year: 2012, freq: 17010 },
      { year: 2013, freq: 17141 },
      { year: 2014, freq: 17348 },
      { year: 2015, freq: 17898 },
      { year: 2016, freq: 19735 },
      { year: 2017, freq: 19470 },
      { year: 2018, freq: 16527 },
    ];

    const pvt = [
      { year: 2012, freq: 9376 },
      { year: 2013, freq: 9739 },
      { year: 2014, freq: 10576 },
      { year: 2015, freq: 11019 },
      { year: 2016, freq: 11997 },
      { year: 2017, freq: 11766 },
      { year: 2018, freq: 10306 },
    ];

    const xMin = 2012, xMax = 2018;
    const yMin = 0, yMax = 20000;

    function toX(v) { return pad.left + ((v - xMin) / (xMax - xMin)) * plotW; }
    function toY(v) { return pad.top + (1 - (v - yMin) / (yMax - yMin)) * plotH; }

    ctx.fillStyle = C.white;
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = C.grayLighter;
    ctx.lineWidth = 0.5;
    for (let v = 0; v <= 20000; v += 5000) {
      ctx.beginPath();
      ctx.moveTo(pad.left, toY(v));
      ctx.lineTo(w - pad.right, toY(v));
      ctx.stroke();
    }

    // Policy change line (effective Jan 1, 2018; shown between 2017 and 2018)
    const policyCutoffX = 2017.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = C.gray;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(toX(policyCutoffX), pad.top);
    ctx.lineTo(toX(policyCutoffX), h - pad.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Policy label
    ctx.fillStyle = C.textMuted;
    ctx.font = `italic 9px ${fontBody}`;
    ctx.textAlign = 'right';
    ctx.fillText('CMS policy effective Jan 1, 2018', toX(policyCutoffX) - 5, pad.top + 12);
    ctx.fillText('TKA removed from inpatient-only list', toX(policyCutoffX) - 5, pad.top + 23);

    // Draw lines
    function drawLine(data, color, lineW) {
      ctx.beginPath();
      data.forEach((d, i) => {
        const x = toX(d.year);
        const y = toY(d.freq);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = lineW;
      ctx.stroke();

      // Dots
      data.forEach(d => {
        ctx.beginPath();
        ctx.arc(toX(d.year), toY(d.freq), 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = C.white;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    drawLine(medicare, C.navy, 2.5);
    drawLine(pvt, C.gold, 2.5);

    // Axes
    ctx.strokeStyle = C.slate;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, h - pad.bottom);
    ctx.lineTo(w - pad.right, h - pad.bottom);
    ctx.stroke();

    // X labels
    ctx.fillStyle = C.textMuted;
    ctx.font = `10px ${fontBody}`;
    ctx.textAlign = 'center';
    for (let yr = 2012; yr <= 2018; yr++) {
      ctx.fillText(yr, toX(yr), h - pad.bottom + 18);
    }

    // Y labels
    ctx.textAlign = 'right';
    for (let v = 0; v <= 20000; v += 5000) {
      ctx.fillText(v.toLocaleString(), pad.left - 8, toY(v) + 3);
    }

    // Axis titles
    ctx.fillStyle = C.text;
    ctx.font = `500 11px ${fontHeading}`;
    ctx.textAlign = 'center';
    ctx.fillText('Year', w / 2, h - 5);

    ctx.save();
    ctx.translate(14, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Frequency', 0, 0);
    ctx.restore();

    // Legend
    const legX = pad.left + 15;
    const legY = pad.top + 15;
    ctx.strokeStyle = C.navy;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(legX, legY);
    ctx.lineTo(legX + 24, legY);
    ctx.stroke();
    ctx.fillStyle = C.text;
    ctx.font = `500 10px ${fontBody}`;
    ctx.textAlign = 'left';
    ctx.fillText('Medicare FFS TKA', legX + 30, legY + 3);

    ctx.strokeStyle = C.gold;
    ctx.beginPath();
    ctx.moveTo(legX, legY + 18);
    ctx.lineTo(legX + 24, legY + 18);
    ctx.stroke();
    ctx.fillStyle = C.text;
    ctx.fillText('Private TKA', legX + 30, legY + 21);

    // Title
    ctx.fillStyle = C.text;
    ctx.font = `600 13px ${fontHeading}`;
    ctx.textAlign = 'center';
    ctx.fillText('Inpatient TKA Trends by Payer, 2012-2018', w / 2, 18);

    // Hover tooltip
    const tooltip = getTooltip(canvas);

    const allPoints = [
      ...medicare.map(d => ({ ...d, label: 'Medicare FFS', color: C.navy })),
      ...pvt.map(d => ({ ...d, label: 'Private', color: C.gold })),
    ];

    bindCanvasHover(canvas, (event) => {
      const point = getCanvasPoint(canvas, event);

      let closest = null;
      let minDist = 20;
      allPoints.forEach(p => {
        const px = toX(p.year);
        const py = toY(p.freq);
        const dist = Math.sqrt((point.x - px) ** 2 + (point.y - py) ** 2);
        if (dist < minDist) {
          minDist = dist;
          closest = p;
        }
      });

      if (closest) {
        tooltip.textContent = `${closest.label} (${closest.year}): ${closest.freq.toLocaleString()}`;
        tooltip.classList.add('visible');
        tooltip.style.left = (point.localX + 10) + 'px';
        tooltip.style.top = (point.localY - 30) + 'px';
      } else {
        tooltip.classList.remove('visible');
      }
    });
  }

  // ============================================================
  // Observer: draw charts when they become visible
  // ============================================================
  function initCharts() {
    // Draw charts when publication details are expanded. Canvases start hidden and
    // need a visible layout box before dimensions can be measured correctly.
    document.querySelectorAll('.publication-card').forEach(card => {
      const btn = card.querySelector('.btn-expand');
      if (!btn) return;

      btn.addEventListener('click', () => {
        // Small delay to let the abstract become visible
        setTimeout(() => {
          if (card.querySelector('#canvas-jhr')) drawJHR();
          if (card.querySelector('#canvas-jhe')) drawJHE();
          if (card.querySelector('#canvas-ajmc')) drawAJMC();
        }, 100);
      });
    });
  }

  // Resize handler
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Redraw visible charts
      document.querySelectorAll('.pub-abstract:not([hidden])').forEach(abs => {
        if (abs.querySelector('#canvas-jhr')) drawJHR();
        if (abs.querySelector('#canvas-jhe')) drawJHE();
        if (abs.querySelector('#canvas-ajmc')) drawAJMC();
      });
    }, 200);
  });

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCharts);
  } else {
    initCharts();
  }
})();
