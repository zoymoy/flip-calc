/**
 * FlipCalc — Scenario Storage
 * Persists named scenarios to localStorage
 */

window.Storage = {
  KEY: 'flipcalc_scenarios',

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || '{}');
    } catch { return {}; }
  },

  save(name, params) {
    const all = this.getAll();
    all[name] = { ...params, savedAt: new Date().toISOString() };
    localStorage.setItem(this.KEY, JSON.stringify(all));
  },

  load(name) {
    return this.getAll()[name] || null;
  },

  delete(name) {
    const all = this.getAll();
    delete all[name];
    localStorage.setItem(this.KEY, JSON.stringify(all));
  },

  list() {
    const all = this.getAll();
    return Object.entries(all).map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  }
};
