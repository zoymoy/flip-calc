/**
 * FlipCalc — Listings
 * Reads property listings from a published Google Sheet (CSV) and maps
 * columns to FlipCalc params. No auth required — sheet must be published
 * to web (File → Share → Publish to web → CSV).
 */

window.Listings = {

  // Pre-filled default spreadsheet
  DEFAULT_SHEET_URL: 'https://docs.google.com/spreadsheets/d/1uDY58OpooOP0ieuD65d8DR3OdJhth0T_80rLxTTsD0U/edit?usp=sharing',

  saveSheetUrl(url) { window.Storage.saveSheetUrl(url); },

  loadSheetUrl() {
    return window.Storage.loadSheetUrl() || this.DEFAULT_SHEET_URL;
  },

  /**
   * Extract the spreadsheet ID from any Google Sheets URL and return
   * the gviz CSV endpoint, which is CORS-open for published sheets.
   * Returns null if the URL doesn't look like a Google Sheets URL.
   */
  normalizeUrl(rawUrl) {
    if (!rawUrl) return null;
    const match = rawUrl.match(/\/spreadsheets\/d\/([\w-]+)/);
    if (!match) return null;
    const id = match[1];
    return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`;
  },

  /**
   * Minimal spec-compliant CSV parser.
   * Handles: quoted fields with commas, escaped quotes (""), CRLF & LF,
   * blank trailing rows.
   * Returns an array of objects keyed by the normalised header row.
   */
  parseCSV(text) {
    if (!text) return [];

    const normalise = s => s.trim().toLowerCase();

    // Split into raw rows, respecting quoted newlines
    const rows = [];
    let field = '', row = [], inQuote = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuote) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuote = false;
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuote = true;
      } else if (c === ',') {
        row.push(field); field = '';
      } else if (c === '\n' || (c === '\r' && text[i + 1] === '\n')) {
        if (c === '\r') i++;
        row.push(field); field = '';
        rows.push(row); row = [];
      } else {
        field += c;
      }
    }
    row.push(field);
    if (row.some(f => f !== '')) rows.push(row);

    if (rows.length < 2) return [];

    const headers = rows[0].map(normalise);
    return rows.slice(1)
      .filter(r => r.some(f => f.trim() !== ''))
      .map(r => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (r[i] || '').trim(); });
        return obj;
      });
  },

  /**
   * Map a raw CSV row object (keyed by normalised header) to a listing.
   * Optional numeric fields are null if blank so loadFromListing()
   * can skip overwriting existing params.
   */
  mapRow(row) {
    const num = (key) => {
      const v = parseFloat((row[key] || '').replace(/[^0-9.-]/g, ''));
      return isNaN(v) ? null : v;
    };
    const str = (key) => (row[key] || '').trim();

    return {
      // Calculator params
      purchasePrice:  num('price')      || 0,
      renoCustomAmt:  num('renovation') || 0,
      renoQuality:    'custom',
      arv:            num('arv'),
      propertySize:   num('size'),

      // Metadata
      _listingName:    str('name'),
      _listingLink:    str('link'),
      _listingContact: str('contact'),
      _listingType:    str('type'),
      _listingStatus:  str('status'),
      _listingNotes:   str('notes'),
      _listingDate:    str('date'),
    };
  },

  /**
   * Fetch and parse listings from the configured Google Sheet.
   * Returns { listings: [...], error: null } or { listings: null, error: string }.
   */
  async fetchListings() {
    const url = this.loadSheetUrl();
    const endpoint = this.normalizeUrl(url);
    if (!endpoint) return { listings: null, error: 'invalidUrl' };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const resp = await fetch(endpoint, { cache: 'no-store', signal: controller.signal });
      clearTimeout(timeout);
      if (!resp.ok) return { listings: null, error: 'fetchFailed' };
      const text = await resp.text();
      const rows = this.parseCSV(text);
      if (!rows.length) return { listings: [], error: null };
      const listings = rows
        .map(r => this.mapRow(r))
        .filter(l => l._listingName || l.purchasePrice);
      return { listings, error: null };
    } catch (e) {
      clearTimeout(timeout);
      return { listings: null, error: e.name === 'AbortError' ? 'timeout' : 'fetchFailed' };
    }
  },
};
