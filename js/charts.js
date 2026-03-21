/**
 * FlipCalc — Charts
 * ROI bar chart + Capital waterfall using Chart.js
 */

window.Charts = {
  _charts: {},

  destroy(id) {
    if (this._charts[id]) { this._charts[id].destroy(); delete this._charts[id]; }
  },

  fmt(n) { return '€' + Math.round(n).toLocaleString(); },

  colors: {
    teal:   { bg: 'rgba(15,110,86,0.85)',  border: '#0F6E56' },
    purple: { bg: 'rgba(83,74,183,0.85)',  border: '#534AB7' },
    blue:   { bg: 'rgba(24,95,165,0.85)',  border: '#185FA5' },
    gray:   { bg: 'rgba(95,94,90,0.4)',    border: '#5F5E5A' },
    red:    { bg: 'rgba(163,45,45,0.75)',  border: '#A32D2D' },
    amber:  { bg: 'rgba(186,117,23,0.75)', border: '#BA7517' },
  },

  /**
   * ROI comparison bar chart (3 modes × 2 metrics)
   */
  renderROI(canvasId, results, t) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const { equity, partnership, loan } = results;

    this._charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [t.scenario100, t.scenarioPartner, t.scenarioLoan],
        datasets: [
          {
            label: t.roiOnCapital,
            data: [equity.roi, partnership.roi, loan.roi].map(v => +v.toFixed(1)),
            backgroundColor: [this.colors.teal.bg, this.colors.purple.bg, this.colors.blue.bg],
            borderColor: [this.colors.teal.border, this.colors.purple.border, this.colors.blue.border],
            borderWidth: 1.5, borderRadius: 6,
          },
          {
            label: t.annualROI,
            data: [equity.annualROI, partnership.annualROI, loan.annualROI].map(v => +v.toFixed(1)),
            backgroundColor: [this.colors.teal.bg, this.colors.purple.bg, this.colors.blue.bg].map(c => c.replace('0.85','0.35')),
            borderColor: [this.colors.teal.border, this.colors.purple.border, this.colors.blue.border],
            borderWidth: 1, borderRadius: 6, borderDash: [4,2],
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { size: 12 }, boxWidth: 12 } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}%` } },
          datalabels: false,
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => v + '%' }, grid: { color: 'rgba(0,0,0,0.06)' } },
          x: { grid: { display: false } }
        }
      }
    });
  },

  /**
   * Capital required + Net profit grouped bar
   */
  renderCapitalProfit(canvasId, results, t) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const { equity, partnership, loan } = results;

    this._charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [t.scenario100, t.scenarioPartner, t.scenarioLoan],
        datasets: [
          {
            label: t.capitalRequired,
            data: [equity.capitalRequired, partnership.capitalRequired, loan.capitalRequired],
            backgroundColor: [this.colors.teal.bg, this.colors.purple.bg, this.colors.blue.bg].map(c=>c.replace('0.85','0.5')),
            borderColor: [this.colors.teal.border, this.colors.purple.border, this.colors.blue.border],
            borderWidth: 1.5, borderRadius: 6,
          },
          {
            label: t.netProfitLabel,
            data: [equity.netProfit, partnership.netProfit, loan.netProfit],
            backgroundColor: [this.colors.teal.bg, this.colors.purple.bg, this.colors.blue.bg],
            borderColor: [this.colors.teal.border, this.colors.purple.border, this.colors.blue.border],
            borderWidth: 1.5, borderRadius: 6,
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { size: 12 }, boxWidth: 12 } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: €${Math.round(ctx.parsed.y).toLocaleString()}` } },
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => '€' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(0,0,0,0.06)' } },
          x: { grid: { display: false } }
        }
      }
    });
  },

  /**
   * Waterfall chart for equity scenario cost breakdown
   */
  renderWaterfall(canvasId, equityResult, t) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const r = equityResult;

    const items = [
      { label: t.purchasePriceLabel, value: r.purchasePrice, type: 'cost' },
      { label: t.notaryFee,   value: r.acq.notary,       type: 'cost' },
      { label: t.buyerAgent,  value: r.acq.buyerAgent,   type: 'cost' },
      { label: t.landRegistry,value: r.acq.landRegistry, type: 'cost' },
      { label: t.renoLabel,   value: r.reno,             type: 'cost' },
      { label: t.holdingCosts,value: r.holding.total,    type: 'cost' },
      { label: t.sellerAgent, value: r.saleCosts.sellerAgent, type: 'cost' },
      { label: t.capitalGainsTax, value: r.cgt,          type: 'tax' },
      { label: t.netProfitLabel,  value: r.netProfit,    type: 'profit' },
    ];

    const labels = items.map(i => i.label);
    const profits = items.map(i => i.type === 'profit' ? i.value : 0);
    const costs   = items.map(i => i.type === 'cost' ? i.value : 0);
    const taxes   = items.map(i => i.type === 'tax' ? i.value : 0);

    this._charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Cost', data: costs, backgroundColor: this.colors.gray.bg, borderColor: this.colors.gray.border, borderWidth: 1, borderRadius: 4 },
          { label: 'Tax',  data: taxes, backgroundColor: this.colors.amber.bg, borderColor: this.colors.amber.border, borderWidth: 1, borderRadius: 4 },
          { label: t.netProfitLabel, data: profits, backgroundColor: this.colors.teal.bg, borderColor: this.colors.teal.border, borderWidth: 1.5, borderRadius: 4 },
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 10 } },
          tooltip: { callbacks: { label: ctx => ctx.parsed.x > 0 ? ` €${Math.round(ctx.parsed.x).toLocaleString()}` : '' } }
        },
        scales: {
          x: { beginAtZero: true, stacked: false, ticks: { callback: v => '€' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(0,0,0,0.05)' } },
          y: { stacked: false, grid: { display: false }, ticks: { font: { size: 11 } } }
        }
      }
    });
  },

  /**
   * Multi-scenario comparison bar (for Compare page)
   */
  renderCompare(canvasId, scenarioResults, metric, t) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const palette = [this.colors.teal, this.colors.purple, this.colors.blue, this.colors.amber, this.colors.red];

    const modes = ['equity', 'partnership', 'loan'];
    const modeLabels = [t.scenario100, t.scenarioPartner, t.scenarioLoan];
    const isPercent = metric === 'roi' || metric === 'annualROI';

    const datasets = scenarioResults.map((sr, i) => ({
      label: sr.name,
      data: modes.map(m => {
        const v = sr.results[m][metric];
        return isPercent ? +v.toFixed(1) : Math.round(v);
      }),
      backgroundColor: palette[i % palette.length].bg,
      borderColor: palette[i % palette.length].border,
      borderWidth: 1.5, borderRadius: 6,
    }));

    this._charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: { labels: modeLabels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { size: 12 }, boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: ctx => isPercent
                ? ` ${ctx.dataset.label}: ${ctx.parsed.y}%`
                : ` ${ctx.dataset.label}: €${ctx.parsed.y.toLocaleString()}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: v => isPercent ? v + '%' : '€' + (v/1000).toFixed(0) + 'k' },
            grid: { color: 'rgba(0,0,0,0.06)' }
          },
          x: { grid: { display: false } }
        }
      }
    });
  }
};
