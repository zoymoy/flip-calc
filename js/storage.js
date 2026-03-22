/**
 * FlipCalc — Scenario Storage
 * Local: localStorage CRUD (synchronous, always available)
 * Cloud: Firebase Firestore (async, optional — graceful fallback if unavailable)
 */

window.Storage = {
  KEY: 'flipcalc_scenarios',
  _db: null,

  // ── Firebase init ──────────────────────────────────────────────────────────
  initFirebase() {
    try {
      if (!window._firebaseConfig || window._firebaseConfig.apiKey === 'REPLACE_ME') return;
      const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(window._firebaseConfig);
      this._db = firebase.firestore(app);
    } catch (e) { /* Firebase unavailable — local-only mode */ }
  },

  // ── Local storage helpers ──────────────────────────────────────────────────
  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || '{}');
    } catch { return {}; }
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
  },

  getFirestoreId(name) {
    return this.getAll()[name]?._firestoreId || null;
  },

  // ── Save: localStorage immediately, Firestore in background ───────────────
  save(name, params) {
    const all = this.getAll();
    const savedAt = new Date().toISOString();
    // Preserve existing _firestoreId (don't overwrite a cloud-synced entry)
    const existing = all[name] || {};
    all[name] = { ...params, savedAt, _firestoreId: existing._firestoreId || null };
    localStorage.setItem(this.KEY, JSON.stringify(all));

    if (this._db) {
      this._db.collection('scenarios').add({ name, params, savedAt })
        .then(docRef => {
          const latest = this.getAll();
          if (latest[name]) {
            latest[name]._firestoreId = docRef.id;
            localStorage.setItem(this.KEY, JSON.stringify(latest));
          }
        })
        .catch(e => console.warn('[FlipCalc] Firestore sync failed:', e));
    }
  },

  // ── Cloud load: fetch a scenario by Firestore document ID ─────────────────
  async loadFromCloud(id) {
    if (!this._db) return null;
    try {
      const doc = await this._db.collection('scenarios').doc(id).get();
      if (!doc.exists) return null;
      const { name, params, savedAt } = doc.data();
      return { name, ...params, savedAt, _firestoreId: id };
    } catch { return null; }
  },
};
