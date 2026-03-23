/**
 * FlipCalc Romania — Main App
 */

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  let lang = 'en';
  let currentPage = 'scenarios';
  let params = {
    purchasePrice: 80000,
    propertySize: 60,
    renoQuality: 'mid',
    renoCustomAmt: 30000,
    arv: 150000,
    projectMonths: 9,
    taxStructure: 'individual',
    buildingEra: '1978',
    mortgageRate: 6.5,
    ltvPct: 70,
    yourSharePct: 50,
    mgmtFeePct: 5,
  };

  const t = () => window.TRANSLATIONS[lang];
  const fmt = n => '€' + Math.round(n).toLocaleString();
  const pct = n => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
  const pctPlain = n => Math.round(n) + '%';

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // Restore saved language preference
    const savedLang = localStorage.getItem('flipcalc_lang');
    if (savedLang && window.TRANSLATIONS[savedLang]) {
      lang = savedLang;
    }

    // Apply localStorage assumption overrides immediately (sync, fast)
    const localOverrides = window.Storage.loadAssumptions();
    if (Object.keys(localOverrides).length) {
      Object.assign(window.ASSUMPTIONS, localOverrides);
    }

    // Initialise Firebase (no-op if config is placeholder or SDK unavailable)
    window.Storage.initFirebase();

    // After Firebase is ready, also pull Firestore assumption overrides (async)
    window.Storage.loadAssumptionsFromCloud().then(cloudOverrides => {
      if (!cloudOverrides || !Object.keys(cloudOverrides).length) return;
      Object.assign(window.ASSUMPTIONS, cloudOverrides);
      // Keep localStorage in sync with cloud
      localStorage.setItem('flipcalc_assumptions', JSON.stringify(cloudOverrides));
      recalc();
      if (currentPage === 'assumptions') renderAssumptionsPage();
    });

    // Restore shared scenario from URL hash (#s=<base64>)
    try {
      const hash = window.location.hash;
      if (hash.startsWith('#s=')) {
        const decoded = JSON.parse(atob(hash.slice(3)));
        params = { ...params, ...decoded };
        if (decoded._scenarioName) {
          const nameEl = document.getElementById('scenario-name');
          if (nameEl) nameEl.value = decoded._scenarioName;
        }
      }
    } catch (e) { /* malformed hash — ignore, use defaults */ }

    // Load shared scenario from Firestore (?s=<firestoreDocId>)
    const _urlParams = new URLSearchParams(window.location.search);
    const _cloudId = _urlParams.get('s');
    if (_cloudId) {
      window.Storage.loadFromCloud(_cloudId).then(data => {
        if (!data) return;
        const { savedAt, _firestoreId, name, ...p } = data;
        params = { ...params, ...p };
        if (name) {
          const nameEl = document.getElementById('scenario-name');
          if (nameEl) nameEl.value = name;
        }
        syncControlsToParams();
        recalc();
      });
    }

    bindNav();
    bindLang();
    bindControls();
    bindTooltips();
    bindScenarioActions();
    applyLang();
    recalc();
    renderSavedList();
    // hamburger
    const ham = document.getElementById('hamburger');
    const nav = document.getElementById('topbar-nav');
    if (ham) ham.addEventListener('click', () => nav.classList.toggle('open'));
  });

  // ── Navigation ─────────────────────────────────────────────────────────────
  function bindNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.page;
        showPage(p);
      });
    });
  }

  function showPage(page) {
    currentPage = page;
    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === page);
    });
    document.getElementById('topbar-nav')?.classList.remove('open');
    if (page === 'compare') renderComparePage();
    if (page === 'assumptions') renderAssumptionsPage();
    if (page === 'guide') renderGuidePage();
  }

  // ── Language ───────────────────────────────────────────────────────────────
  function bindLang() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      // Sync active state on load
      btn.classList.toggle('active', btn.dataset.lang === lang);
      btn.addEventListener('click', () => {
        lang = btn.dataset.lang;
        localStorage.setItem('flipcalc_lang', lang);
        document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyLang();
        recalc();
        renderSavedList();
        if (currentPage === 'compare') renderComparePage();
        if (currentPage === 'assumptions') renderAssumptionsPage();
        if (currentPage === 'guide') renderGuidePage();
      });
    });
  }

  function applyLang() {
    const tr = t();
    document.documentElement.lang = tr.lang;
    document.documentElement.dir = tr.dir;
    document.body.classList.toggle('rtl', tr.dir === 'rtl');

    // Text substitution by data-i18n (update text node only, preserving child elements like .tip-icon)
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (tr[key] === undefined) return;
      const textNode = [...el.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
      if (textNode) { textNode.nodeValue = tr[key]; } else { el.textContent = tr[key]; }
    });
    // Placeholders
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.dataset.i18nPh;
      if (tr[key] !== undefined) el.placeholder = tr[key];
    });
    // Tooltip text (data-i18n-tip → data-tip attribute, read by CSS ::after)
    document.querySelectorAll('[data-i18n-tip]').forEach(el => {
      const key = el.dataset.i18nTip;
      if (tr[key] !== undefined) el.setAttribute('data-tip', tr[key]);
    });
  }

  // ── Controls ───────────────────────────────────────────────────────────────
  function bindControls() {
    const bind = (id, key, type) => {
      const el = document.getElementById(id);
      if (!el) return;
      const evt = type === 'range' ? 'input' : 'change';
      el.addEventListener(evt, () => {
        const raw = type === 'number' ? parseFloat(el.value) : (type === 'range' ? parseFloat(el.value) : el.value);
        params[key] = isNaN(raw) ? el.value : raw;
        // Update display for range
        const disp = document.getElementById(id + '-val');
        if (disp) {
          if (key === 'projectMonths') disp.textContent = t().months(params[key]);
          else if (['ltvPct','yourSharePct','mgmtFeePct','mortgageRate'].includes(key)) disp.textContent = params[key] + '%';
          else if (key === 'propertySize') disp.textContent = params[key] + ' m²';
          else disp.textContent = fmt(params[key]);
        }
        // Show/hide custom reno
        if (key === 'renoQuality') {
          document.getElementById('custom-reno-field').classList.toggle('hidden', el.value !== 'custom');
        }
        recalc();
      });
    };

    bind('inp-price',    'purchasePrice', 'range');
    bind('inp-size',     'propertySize',  'range');
    bind('inp-arv',      'arv',           'range');
    bind('inp-months',   'projectMonths', 'range');
    bind('inp-reno-q',   'renoQuality',   'select');
    bind('inp-reno-custom','renoCustomAmt','number');
    bind('inp-tax',      'taxStructure',  'select');
    bind('inp-era',      'buildingEra',   'select');
    bind('inp-rate',     'mortgageRate',  'range');
    bind('inp-ltv',      'ltvPct',        'range');
    bind('inp-share',    'yourSharePct',  'range');
    bind('inp-mgmt',     'mgmtFeePct',    'range');
  }

  // ── Tooltip interaction (mobile tap + keyboard dismiss) ────────────────────
  function bindTooltips() {
    document.addEventListener('click', function(e) {
      const icon = e.target.closest('.tip-icon');
      if (icon) {
        e.stopPropagation();
        const isActive = icon.classList.contains('tip-active');
        document.querySelectorAll('.tip-icon.tip-active').forEach(el => el.classList.remove('tip-active'));
        if (!isActive) icon.classList.add('tip-active');
        return;
      }
      document.querySelectorAll('.tip-icon.tip-active').forEach(el => el.classList.remove('tip-active'));
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') document.querySelectorAll('.tip-icon.tip-active').forEach(el => el.classList.remove('tip-active'));
    });
  }

  // ── Recalculate & render ───────────────────────────────────────────────────
  function recalc() {
    const results = window.Calculator.calcAll(params);
    renderResults(results);
    renderSummaries(results);
    renderCharts(results);
    updateSplitBar();
    updateEraBadge(results.eraInfo);
    // ARV loss warning
    const warn = document.getElementById('arv-warning');
    if (warn) {
      const isLoss = results.equity.netProfit < 0;
      warn.classList.toggle('hidden', !isLoss);
      if (isLoss) warn.textContent = t().arvWarning;
    }
  }

  function seismicCssClass(seismicClass) {
    // Map seismic class string to a CSS-safe key
    if (seismicClass.includes('IV')) return 'rs4';
    if (seismicClass.includes('II') && seismicClass.includes('III')) return 'rs23';
    if (seismicClass.includes('III')) return 'rs3';
    if (seismicClass.includes('II')) return 'rs2';
    return 'rs1';
  }

  function updateEraBadge(eraInfo) {
    const badge = document.getElementById('era-seismic-badge');
    if (!badge) return;
    badge.textContent = eraInfo.seismicClass;
    badge.className = 'era-badge era-' + seismicCssClass(eraInfo.seismicClass);
  }

  function updateSplitBar() {
    const bar = document.getElementById('split-bar-you');
    if (bar) bar.style.width = params.yourSharePct + '%';
  }

  // ── Render results tables ──────────────────────────────────────────────────
  function renderResults(results) {
    renderEquity(results.equity, results.eraInfo);
    renderPartnership(results.partnership, results.eraInfo);
    renderLoan(results.loan, results.eraInfo);
  }

  function metricHTML(label, value, cls) {
    return `<div class="col-metric"><div class="col-metric-lbl">${label}</div><div class="col-metric-val ${cls || ''}">${value}</div></div>`;
  }

  function renderEquity(r, eraInfo) {
    const tr = t();
    // Metrics
    document.getElementById('eq-metric-capital').textContent = fmt(r.capitalRequired);
    document.getElementById('eq-metric-profit').textContent  = fmt(r.netProfit);
    document.getElementById('eq-metric-roi').textContent     = pctPlain(r.roi);
    document.getElementById('eq-metric-annroi').textContent  = pctPlain(r.annualROI);

    // Table
    const rows = [
      ['td-lbl', tr.purchasePriceLabel, fmt(r.purchasePrice)],
      ['td-lbl', tr.notaryFee,          fmt(r.acq.notary),               tr.tipNotaryFee],
      ['td-lbl', tr.buyerAgent,         fmt(r.acq.buyerAgent),           tr.tipBuyerAgent],
      ['td-lbl', tr.landRegistry,       fmt(r.acq.landRegistry),         tr.tipLandRegistry],
      ['td-lbl', tr.renoLabel,          fmt(r.reno),                     tr.tipRenoLabel],
      r.renoHidden > 0 && ['warn', tr.hiddenRenoLabel, fmt(r.renoHidden), tr.tipHiddenReno],
      ['td-lbl', tr.utilityHolding,     fmt(r.holding.utility)],
      ['td-lbl', tr.propTaxHolding,     fmt(r.holding.propTax)],
      ['td-lbl', tr.maintHolding,       fmt(r.holding.maint)],
      ['divider', tr.totalInvestment,   fmt(r.totalInvestment)],
      ['td-lbl', tr.saleProceeds,       fmt(r.arv)],
      ['td-lbl', tr.sellerAgent,        fmt(r.saleCosts.sellerAgent),    tr.tipSellerAgent],
      ['td-lbl', tr.sellerNotary,       fmt(r.saleCosts.sellerNotary),   tr.tipSellerNotary],
      ['td-lbl', tr.capitalGainsTax,    '−' + fmt(r.cgt),               tr.tipCapitalGainsTax],
      ['profit', tr.netProfit,          fmt(r.netProfit),                tr.tipNetProfit],
      ['roi',    tr.roiOnCapital,       pctPlain(r.roi),                 tr.tipRoiOnCapital],
      ['roi',    tr.annualROI,          pctPlain(r.annualROI),           tr.tipAnnualROI],
      ['roi',    tr.profitMargin,       pctPlain(r.profitMargin),        tr.tipProfitMargin],
      ['risk',   tr.riskScore,          r.riskScore,                     tr.tipRiskScore],
    ].filter(Boolean);
    document.getElementById('eq-table').innerHTML = buildTableRows(rows);
    document.getElementById('eq-col-head')?.classList.toggle('col-head-loss', r.netProfit < 0);
  }

  function renderPartnership(r, eraInfo) {
    const tr = t();
    document.getElementById('p-metric-capital').textContent = fmt(r.capitalRequired);
    document.getElementById('p-metric-profit').textContent  = fmt(r.yourNetProfit);
    document.getElementById('p-metric-roi').textContent     = pctPlain(r.roi);
    document.getElementById('p-metric-annroi').textContent  = pctPlain(r.annualROI);

    const rows = [
      ['td-lbl', tr.totalCost,          fmt(r.totalInvestment)],
      r.renoHidden > 0 && ['warn', tr.hiddenRenoLabel, fmt(r.renoHidden), tr.tipHiddenReno],
      ['td-lbl', tr.yourCapital + ' (' + Math.round(r.yourShare*100) + '%)', fmt(r.yourCapital)],
      ['td-lbl', tr.partnerCapital,     fmt(r.partnerCapital)],
      ['divider', tr.sectionResults,    ''],
      ['td-lbl', tr.netProfit + ' (total)', fmt(r.grossProfit - r.cgt + r.yourCGT - r.yourCGT + (r.cgt - r.yourCGT))],
      ['divider', tr.yourNetProfit,     ''],
      ['td-lbl', tr.mgmtFeeLabel,       fmt(r.mgmtFee),                  tr.tipMgmtFeeLabel],
      ['td-lbl', tr.profitShareLabel,   fmt(r.yourProfitShare),           tr.tipProfitShareLabel],
      ['td-lbl', tr.capitalGainsTax,    '−' + fmt(r.yourCGT),           tr.tipCapitalGainsTax],
      ['profit-purple', tr.yourNetProfit, fmt(r.yourNetProfit),           tr.tipNetProfit],
      ['roi-purple', tr.roiOnCapital,   pctPlain(r.roi),                 tr.tipRoiOnCapital],
      ['roi-purple', tr.annualROI,      pctPlain(r.annualROI),           tr.tipAnnualROI],
      ['roi-purple', tr.profitMargin,   pctPlain(r.profitMargin),        tr.tipProfitMargin],
      ['warn',   tr.capitalFreed,       fmt(r.capitalFreed),             tr.tipCapitalFreed],
      ['risk',   tr.riskScore,          r.riskScore,                     tr.tipRiskScore],
    ].filter(Boolean);
    document.getElementById('p-table').innerHTML = buildTableRows(rows);
    document.getElementById('p-col-head')?.classList.toggle('col-head-loss', r.yourNetProfit < 0);
  }

  function renderLoan(r, eraInfo) {
    const tr = t();
    document.getElementById('ln-metric-capital').textContent = fmt(r.capitalRequired);
    document.getElementById('ln-metric-profit').textContent  = fmt(r.netProfit);
    document.getElementById('ln-metric-roi').textContent     = pctPlain(r.roi);
    document.getElementById('ln-metric-annroi').textContent  = pctPlain(r.annualROI);

    const rows = [
      eraInfo && !eraInfo.mortgageEligible && ['fullwarn', tr.noMortgageWarning],
      ['td-lbl', tr.purchasePriceLabel, fmt(r.purchasePrice)],
      ['td-lbl', tr.loanAmount,         fmt(r.loanAmount),               tr.tipLoanAmount],
      ['td-lbl', tr.ownEquity,          fmt(r.ownEquity),                tr.tipOwnEquity],
      ['td-lbl', tr.notaryFee,          fmt(r.acq.notary),               tr.tipNotaryFee],
      ['td-lbl', tr.buyerAgent,         fmt(r.acq.buyerAgent),           tr.tipBuyerAgent],
      ['td-lbl', tr.bankSetupFee,       fmt(r.acq.bankSetupFee),         tr.tipBankSetupFee],
      ['td-lbl', tr.renoLabel,          fmt(r.reno),                     tr.tipRenoLabel],
      r.renoHidden > 0 && ['warn', tr.hiddenRenoLabel, fmt(r.renoHidden), tr.tipHiddenReno],
      ['td-lbl', tr.holdingCosts,       fmt(r.holding.total),            tr.tipHoldingCosts],
      ['divider', tr.totalInvestment,   fmt(r.totalEquityDeployed)],
      ['td-lbl', tr.loanInterest,       '−' + fmt(r.interest),          tr.tipLoanInterest],
      ['td-lbl', tr.saleProceeds,       fmt(r.arv)],
      ['td-lbl', tr.loanRepayment,      '−' + fmt(r.loanAmount)],
      ['td-lbl', tr.sellerAgent,        '−' + fmt(r.saleCosts.sellerAgent), tr.tipSellerAgent],
      ['td-lbl', tr.capitalGainsTax,    '−' + fmt(r.cgt),               tr.tipCapitalGainsTax],
      ['profit', tr.netProfit,          fmt(r.netProfit),                tr.tipNetProfit],
      ['roi',    tr.roiOnCapital,       pctPlain(r.roi),                 tr.tipRoiOnCapital],
      ['roi',    tr.annualROI,          pctPlain(r.annualROI),           tr.tipAnnualROI],
      ['roi',    tr.profitMargin,       pctPlain(r.profitMargin),        tr.tipProfitMargin],
      ['warn',   tr.capitalFreed,       fmt(r.capitalFreed),             tr.tipCapitalFreed],
      ['risk',   tr.riskScore,          r.riskScore,                     tr.tipRiskScore],
    ].filter(Boolean);
    document.getElementById('ln-table').innerHTML = buildTableRows(rows);
    document.getElementById('ln-col-head')?.classList.toggle('col-head-loss', r.netProfit < 0);
  }

  function buildTableRows(rows) {
    return rows.map(([type, label, val, tipText]) => {
      if (type === 'divider') {
        return `<tr class="divider"><td colspan="2">${label}${val ? ' — ' + val : ''}</td></tr>`;
      }
      if (type === 'fullwarn') {
        return `<tr class="fullwarn-row"><td colspan="2">${label}</td></tr>`;
      }
      const rowClass = {
        'profit': 'profit-row',
        'profit-purple': 'purple-profit',
        'roi': 'roi-row',
        'roi-purple': 'roi-row',
        'warn': 'warn-row',
        'neg': 'neg-row',
        'risk': 'risk-row',
        'td-lbl': '',
      }[type] || '';
      const tipHtml = tipText
        ? `<span class="tip-icon" aria-label="${escHtml(tipText)}" data-tip="${escHtml(tipText)}" tabindex="0">ⓘ</span>`
        : '';
      if (type === 'risk') {
        const level = val <= 3 ? 'low' : val <= 6 ? 'med' : 'high';
        return `<tr class="risk-row"><td>${label}${tipHtml}</td><td><span class="risk-badge risk-${level}">${val} / 10</span></td></tr>`;
      }
      return `<tr class="${rowClass}"><td class="${type === 'td-lbl' ? 'td-lbl' : ''}">${label}${tipHtml}</td><td>${val}</td></tr>`;
    }).join('');
  }

  // ── Tooltip interactions ────────────────────────────────────────────────────
  function bindTooltips() {
    document.addEventListener('click', function(e) {
      const icon = e.target.closest('.tip-icon');
      if (icon) {
        e.stopPropagation();
        const isActive = icon.classList.contains('tip-active');
        document.querySelectorAll('.tip-icon.tip-active').forEach(el => el.classList.remove('tip-active'));
        if (!isActive) icon.classList.add('tip-active');
        return;
      }
      document.querySelectorAll('.tip-icon.tip-active').forEach(el => el.classList.remove('tip-active'));
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') document.querySelectorAll('.tip-icon.tip-active').forEach(el => el.classList.remove('tip-active'));
    });
  }

  // ── Summary sections ───────────────────────────────────────────────────────
  function buildSummaryHTML(explain, pros, cons, verdict, accentClass, verdictLabel) {
    const prosHTML = pros.map(p => `<li>${p}</li>`).join('');
    const consHTML = cons.map(c => `<li>${c}</li>`).join('');
    return `
      <p class="col-summary-explain">${explain}</p>
      <div class="col-summary-pros-cons">
        <div>
          <div class="col-summary-block-title pros">${t().prosLabel}</div>
          <ul class="col-summary-list">${prosHTML}</ul>
        </div>
        <div>
          <div class="col-summary-block-title cons">${t().consLabel}</div>
          <ul class="col-summary-list">${consHTML}</ul>
        </div>
      </div>
      <div class="col-summary-verdict" data-label="${escHtml(verdictLabel)}">${verdict}</div>
    `;
  }

  function renderSummaries(results) {
    const tr = t();
    const { equity: eq, partnership: pt, loan: ln } = results;

    // helper to pass fmt into the result objects for use in template strings
    const withFmt = r => Object.assign({ fmt }, r);
    const eqF = withFmt(eq);
    const ptF = withFmt(pt);
    const lnF = withFmt(ln);

    const share = Math.round((params.yourSharePct || 50));
    const label = tr.verdictLabel;

    // Equity
    const eqEl = document.getElementById('eq-summary');
    if (eqEl) eqEl.innerHTML = buildSummaryHTML(
      tr.summaryEquityExplain(eqF),
      tr.summaryEquityPros,
      tr.summaryEquityCons(eqF, ptF, lnF),
      tr.summaryEquityVerdict(eqF),
      'teal', label
    );

    // Partnership
    const ptEl = document.getElementById('p-summary');
    if (ptEl) ptEl.innerHTML = buildSummaryHTML(
      tr.summaryPartnerExplain(eqF, share),
      tr.summaryPartnerPros(eqF, ptF),
      tr.summaryPartnerCons,
      tr.summaryPartnerVerdict(ptF),
      'purple', label
    );

    // Loan
    const lnEl = document.getElementById('ln-summary');
    if (lnEl) lnEl.innerHTML = buildSummaryHTML(
      tr.summaryLoanExplain(lnF),
      tr.summaryLoanPros(eqF, lnF),
      tr.summaryLoanCons,
      tr.summaryLoanVerdict(lnF),
      'blue', label
    );
  }

  // ── Charts ─────────────────────────────────────────────────────────────────
  function renderCharts(results) {
    const tr = t();
    window.Charts.renderROI('chart-roi', results, tr);
    window.Charts.renderCapitalProfit('chart-capital', results, tr);
  }

  // ── Scenario Save/Load ────────────────────────────────────────────────────
  function bindScenarioActions() {
    document.getElementById('btn-save')?.addEventListener('click', saveScenario);
    document.getElementById('btn-new')?.addEventListener('click', newScenario);
    document.getElementById('btn-share')?.addEventListener('click', shareScenario);
    document.getElementById('btn-print')?.addEventListener('click', () => window.print());
    document.getElementById('btn-reset-assumptions')?.addEventListener('click', resetAssumptions);
  }

  function saveScenario() {
    const nameEl = document.getElementById('scenario-name');
    const name = nameEl?.value.trim() || 'Untitled';
    window.Storage.save(name, { ...params });
    renderSavedList();
    showToast(t().scenarioSaved);
  }

  function newScenario() {
    const nameEl = document.getElementById('scenario-name');
    if (nameEl) nameEl.value = '';
    params = {
      purchasePrice: 80000, propertySize: 60, renoQuality: 'mid',
      renoCustomAmt: 30000, arv: 150000, projectMonths: 9,
      taxStructure: 'individual', buildingEra: '1978', mortgageRate: 6.5, ltvPct: 70,
      yourSharePct: 50, mgmtFeePct: 5,
    };
    syncControlsToParams();
    recalc();
  }

  function shareScenario() {
    try {
      const encoded = btoa(JSON.stringify(params));
      const url = window.location.href.split('#')[0] + '#s=' + encoded;
      navigator.clipboard.writeText(url).then(() => showToast(t().linkCopied));
    } catch (e) { /* clipboard not available */ }
  }

  function shareScenarioByName(name) {
    const firestoreId = window.Storage.getFirestoreId(name);
    const base = window.location.href.split(/[#?]/)[0];
    let url;
    if (firestoreId) {
      // Cloud-synced: use a clean short URL with Firestore doc ID
      url = base + '?s=' + firestoreId;
    } else {
      // Not yet synced: fall back to base64 hash
      const data = window.Storage.load(name);
      if (!data) return;
      const { savedAt, _firestoreId, ...p } = data;
      url = base + '#s=' + btoa(JSON.stringify({ ...p, _scenarioName: name }));
    }
    try {
      navigator.clipboard.writeText(url).then(() => showToast(t().linkCopied));
    } catch (e) { /* clipboard not available */ }
  }

  function syncControlsToParams() {
    const setRange = (id, val) => {
      const el = document.getElementById(id);
      if (el) { el.value = val; const d = document.getElementById(id + '-val'); if (d) d.textContent = val; }
    };
    setRange('inp-price', params.purchasePrice);
    setRange('inp-size', params.propertySize);
    setRange('inp-arv', params.arv);
    setRange('inp-months', params.projectMonths);
    setRange('inp-rate', params.mortgageRate);
    setRange('inp-ltv', params.ltvPct);
    setRange('inp-share', params.yourSharePct);
    setRange('inp-mgmt', params.mgmtFeePct);
    const rq = document.getElementById('inp-reno-q');
    if (rq) rq.value = params.renoQuality;
    const tax = document.getElementById('inp-tax');
    if (tax) tax.value = params.taxStructure;
    const era = document.getElementById('inp-era');
    if (era) era.value = params.buildingEra || '1978';
    // Update display
    document.getElementById('inp-price-val').textContent   = fmt(params.purchasePrice);
    document.getElementById('inp-size-val').textContent    = params.propertySize + ' sqm';
    document.getElementById('inp-arv-val').textContent     = fmt(params.arv);
    document.getElementById('inp-months-val').textContent  = t().months(params.projectMonths);
    document.getElementById('inp-rate-val').textContent    = params.mortgageRate + '%';
    document.getElementById('inp-ltv-val').textContent     = params.ltvPct + '%';
    document.getElementById('inp-share-val').textContent   = params.yourSharePct + '%';
    document.getElementById('inp-mgmt-val').textContent    = params.mgmtFeePct + '%';
  }

  function renderSavedList() {
    const list = document.getElementById('saved-list');
    if (!list) return;
    const items = window.Storage.list();
    const tr = t();
    if (!items.length) {
      list.innerHTML = `<div class="empty-state">${tr.noSavedScenarios}</div>`;
      return;
    }
    list.innerHTML = items.map(item => {
      const date = new Date(item.savedAt).toLocaleDateString();
      return `<div class="saved-item">
        <div>
          <div class="saved-item-name">${escHtml(item.name)}</div>
          <div class="saved-item-date">${date}</div>
        </div>
        <div class="saved-item-actions">
          <button class="btn btn-sm" onclick="App.loadScenario('${escHtml(item.name)}')">${tr.loadScenario}</button>
          <button class="btn btn-sm btn-ghost" onclick="App.shareScenarioByName('${escHtml(item.name)}')">${tr.shareScenario}</button>
          <button class="btn btn-sm btn-ghost btn-danger" onclick="App.deleteScenario('${escHtml(item.name)}')">${tr.deleteScenario}</button>
        </div>
      </div>`;
    }).join('');
  }

  function loadScenario(name) {
    const data = window.Storage.load(name);
    if (!data) return;
    const { savedAt, ...rest } = data;
    params = { ...params, ...rest };
    const nameEl = document.getElementById('scenario-name');
    if (nameEl) nameEl.value = name;
    syncControlsToParams();
    recalc();
    showPage('scenarios');
  }

  function deleteScenario(name) {
    if (!confirm(t().confirmDelete)) return;
    window.Storage.delete(name);
    renderSavedList();
  }

  // ── Compare page ───────────────────────────────────────────────────────────
  function renderComparePage() {
    const tr = t();
    const items = window.Storage.list();
    const container = document.getElementById('compare-checks');
    const empty = document.getElementById('compare-empty');
    if (!container) return;

    if (items.length < 2) {
      container.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      document.getElementById('compare-charts-wrap')?.classList.add('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');

    container.innerHTML = `<div class="compare-check-grid">` + items.map(item => `
      <label class="compare-check">
        <input type="checkbox" value="${escHtml(item.name)}" checked>
        ${escHtml(item.name)}
      </label>`).join('') + `</div>
      <button class="btn btn-teal" id="btn-run-compare">${tr.compareBtn}</button>`;

    document.getElementById('btn-run-compare')?.addEventListener('click', runCompare);
  }

  function runCompare() {
    const checks = document.querySelectorAll('#compare-checks input[type=checkbox]:checked');
    const names = Array.from(checks).map(c => c.value);
    if (names.length < 2) { showToast(t().compareSelectTwo); return; }

    const scenarioResults = names.map(name => {
      const data = window.Storage.load(name);
      if (!data) return null;
      const { savedAt, ...p } = data;
      return { name, results: window.Calculator.calcAll(p) };
    }).filter(Boolean);

    const wrap = document.getElementById('compare-charts-wrap');
    if (wrap) wrap.classList.remove('hidden');

    const tr = t();
    window.Charts.renderCompare('chart-compare-roi', scenarioResults, 'roi', tr);
    window.Charts.renderCompare('chart-compare-annroi', scenarioResults, 'annualROI', tr);
    window.Charts.renderCompare('chart-compare-profit', scenarioResults, 'netProfit', tr);
    window.Charts.renderCompare('chart-compare-capital', scenarioResults, 'capitalRequired', tr);
  }

  // ── Assumptions page ───────────────────────────────────────────────────────
  const EDITABLE_ASSUMPTION_KEYS = [
    'notaryFeePct','buyerAgentPct','landRegistryFee','transferTaxIndividualPct','bankSetupFeePct',
    'renoLow','renoMid','renoHigh',
    'utilityMonthly','propertyTaxMonthly','buildingMaintMonthly',
    'sellerAgentPct','sellerNotaryPct',
    'cgtIndividualShortPct','cgtIndividualLongPct',
    'avgPricePerSqmBucharest','avgRentalYieldBucharest','avgDaysOnMarket',
    'avgPriceGrowthAnnual','mortgageRateDefault','ltvMaxForeigner',
  ];

  function renderAssumptionsPage() {
    const A = window.ASSUMPTIONS;
    const D = window.ASSUMPTION_DEFAULTS;
    const tr = t();

    // Editable input row: label | [unit] <input> [unit]
    const erow = (label, key, unitBefore, unitAfter, step) => {
      const val = A[key];
      const isModified = D && val !== D[key];
      return `<div class="assumption-item">
        <span class="assumption-key">${label}</span>
        <span class="assumption-val-wrap">
          ${unitBefore ? `<span class="assumption-unit">${unitBefore}</span>` : ''}
          <input type="number"
                 class="assumption-input${isModified ? ' assumption-modified' : ''}"
                 id="asmp-${key}"
                 data-asmp-key="${key}"
                 value="${val}"
                 step="${step !== undefined ? step : 'any'}">
          ${unitAfter ? `<span class="assumption-unit">${unitAfter}</span>` : ''}
        </span>
      </div>`;
    };

    const acqEl = document.getElementById('assumptions-acq');
    if (acqEl) acqEl.innerHTML = [
      erow(tr.notaryFee,              'notaryFeePct',            '', '%', 0.01),
      erow(tr.buyerAgent,             'buyerAgentPct',           '', '%', 0.1),
      erow(tr.landRegistry,           'landRegistryFee',         '€', '', 50),
      erow(tr.assumptionsTransferTax, 'transferTaxIndividualPct','', '%', 0.1),
      erow(tr.assumptionsBankSetup,   'bankSetupFeePct',         '', '%', 0.1),
    ].join('');

    const renoEl = document.getElementById('assumptions-reno');
    if (renoEl) renoEl.innerHTML = [
      erow(tr.renoLow,  'renoLow',  '€', '/m²', 10),
      erow(tr.renoMid,  'renoMid',  '€', '/m²', 10),
      erow(tr.renoHigh, 'renoHigh', '€', '/m²', 10),
    ].join('');

    const holdEl = document.getElementById('assumptions-hold');
    if (holdEl) holdEl.innerHTML = [
      erow(tr.assumptionsUtilities,    'utilityMonthly',       '€', '/mo', 5),
      erow(tr.assumptionsPropTax,      'propertyTaxMonthly',   '€', '/mo', 5),
      erow(tr.assumptionsBuildingMaint,'buildingMaintMonthly', '€', '/mo', 5),
    ].join('');

    const saleEl = document.getElementById('assumptions-sale');
    if (saleEl) saleEl.innerHTML = [
      erow(tr.sellerAgent,  'sellerAgentPct',  '', '%', 0.1),
      erow(tr.sellerNotary, 'sellerNotaryPct', '', '%', 0.01),
    ].join('');

    const taxEl = document.getElementById('assumptions-tax');
    if (taxEl) taxEl.innerHTML = [
      erow(tr.assumptionsIndividual,     'cgtIndividualShortPct', '', '%', 0.1),
      erow(tr.assumptionsIndividualLong, 'cgtIndividualLongPct',  '', '%', 0.1),
    ].join('');

    const mktEl = document.getElementById('assumptions-market');
    if (mktEl) mktEl.innerHTML = [
      erow(tr.assumptionsAvgPrice,     'avgPricePerSqmBucharest', '€', '/m²', 10),
      erow(tr.assumptionsRentalYield,  'avgRentalYieldBucharest', '', '%',    0.1),
      erow(tr.assumptionsDaysOnMarket, 'avgDaysOnMarket',          '', ' days', 1),
      erow(tr.assumptionsPriceGrowth,  'avgPriceGrowthAnnual',     '', '%',    0.1),
      erow(tr.assumptionsMortgageRate, 'mortgageRateDefault',      '', '%',    0.25),
      erow(tr.assumptionsMaxLtv,       'ltvMaxForeigner',          '', '%',    5),
    ].join('');

    const srcEl = document.getElementById('assumptions-sources');
    if (srcEl) srcEl.innerHTML = A.sources.map(s =>
      `<div class="source-item">↗ <a href="${s.url}" target="_blank" rel="noopener">${s.name}</a></div>`
    ).join('');

    bindAssumptionInputs();
  }

  function bindAssumptionInputs() {
    document.querySelectorAll('[data-asmp-key]').forEach(input => {
      input.addEventListener('change', () => {
        const key = input.dataset.asmpKey;
        const val = parseFloat(input.value);
        if (isNaN(val)) { input.value = window.ASSUMPTIONS[key]; return; }
        window.ASSUMPTIONS[key] = val;
        const D = window.ASSUMPTION_DEFAULTS;
        input.classList.toggle('assumption-modified', D ? val !== D[key] : false);
        saveCurrentOverrides();
        recalc();
      });
    });
  }

  function saveCurrentOverrides() {
    const D = window.ASSUMPTION_DEFAULTS;
    if (!D) { window.Storage.saveAssumptions({}); return; }
    const overrides = {};
    EDITABLE_ASSUMPTION_KEYS.forEach(k => {
      if (window.ASSUMPTIONS[k] !== D[k]) overrides[k] = window.ASSUMPTIONS[k];
    });
    window.Storage.saveAssumptions(overrides);
  }

  function resetAssumptions() {
    if (!confirm(t().confirmResetAssumptions)) return;
    const D = window.ASSUMPTION_DEFAULTS;
    if (D) Object.assign(window.ASSUMPTIONS, D);
    window.Storage.resetAssumptions();
    renderAssumptionsPage();
    recalc();
    showToast(t().assumptionsReset);
  }

  // ── Guide page ─────────────────────────────────────────────────────────────
  function renderGuidePage() {
    const A = window.ASSUMPTIONS;
    const tr = t();

    const eraKeys = ['pre1940', '1940', '1963', '1978', '1990', '2000'];
    const eraLabels = {
      pre1940: tr.eraPre1940, '1940': tr.era1940, '1963': tr.era1963,
      '1978': tr.era1978, '1990': tr.era1990, '2000': tr.era2000,
    };

    // Era reference table
    const tableEl = document.getElementById('guide-era-table');
    if (tableEl) {
      const headerCells = [
        tr.guideColEra, tr.guideColSeismic, tr.guideColPriceDiscount,
        tr.guideColHiddenReno, tr.guideColMortgage, tr.guideColInsurance,
      ].map(h => `<th>${h}</th>`).join('');

      const dataRows = eraKeys.map(key => {
        const era = A.BUILDING_ERAS[key];
        const seismicBadge = `<span class="era-badge era-${seismicCssClass(era.seismicClass)}">${era.seismicClass}</span>`;
        const discount = era.priceDiscountPct > 0 ? `+${era.priceDiscountPct}%` : `${era.priceDiscountPct}%`;
        const hiddenReno = era.renoHiddenCost > 0 ? `€${era.renoHiddenCost.toLocaleString()}` : '—';
        const mortgageBadge = era.mortgageEligible
          ? `<span class="guide-status guide-yes">${tr.guideEligible}</span>`
          : `<span class="guide-status guide-no">${tr.guideNotEligible}</span>`;
        const insuranceBadge = era.insurable
          ? `<span class="guide-status guide-yes">${tr.guideEligible}</span>`
          : `<span class="guide-status guide-no">${tr.guideNotEligible}</span>`;
        return `<tr>
          <td class="guide-era-label">${eraLabels[key] || key}</td>
          <td>${seismicBadge}</td>
          <td class="${era.priceDiscountPct > 0 ? 'guide-positive' : 'guide-negative'}">${discount}</td>
          <td>${hiddenReno}</td>
          <td>${mortgageBadge}</td>
          <td>${insuranceBadge}</td>
        </tr>`;
      }).join('');

      tableEl.innerHTML = `<div class="guide-table-wrap"><table class="guide-table">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${dataRows}</tbody>
      </table></div>`;
    }

    // Seismic explanations
    const seismicEl = document.getElementById('guide-seismic');
    if (seismicEl) {
      seismicEl.innerHTML = [
        ['Rs I',    'guide-rs1', tr.guideSeismicRs1],
        ['Rs II',   'guide-rs2', tr.guideSeismicRs2],
        ['Rs III',  'guide-rs3', tr.guideSeismicRs3],
        ['Rs IV',   'guide-rs4', tr.guideSeismicRs4],
      ].map(([cls, cssCls, text]) =>
        `<div class="guide-seismic-item">
          <span class="era-badge era-${seismicCssClass(cls)}">${cls}</span>
          <span>${text}</span>
        </div>`
      ).join('');
    }

    // How to use
    const howEl = document.getElementById('guide-how-to-use');
    if (howEl) howEl.innerHTML = `<p>${tr.guideHowToUseText}</p>`;

    // Mortgage note
    const mortgageEl = document.getElementById('guide-mortgage-note');
    if (mortgageEl) mortgageEl.innerHTML = `<p>${tr.guideMortgageNoteText}</p>`;

    // Sources
    const srcEl = document.getElementById('guide-sources');
    if (srcEl) {
      const seismicSources = A.sources.filter(s =>
        s.name.includes('MDLPA') || s.name.includes('Harta') || s.name.includes('imobiliare')
      );
      srcEl.innerHTML = seismicSources.map(s =>
        `<div class="source-item">↗ <a href="${s.url}" target="_blank" rel="noopener">${s.name}</a></div>`
      ).join('');
    }
  }

  // ── Toast ──────────────────────────────────────────────────────────────────
  function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2500);
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Public API (for inline onclick) ───────────────────────────────────────
  window.App = { loadScenario, deleteScenario, shareScenarioByName };

})();
