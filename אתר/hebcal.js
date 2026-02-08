(() => {
  const CACHE_KEY = 'sefer1_hebcal_jerusalem_v1';

  const JERUSALEM = {
    latitude: 31.778,
    longitude: 35.235,
    tzid: 'Asia/Jerusalem',
  };

  const pad2 = (n) => String(n).padStart(2, '0');
  const toIsoDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  const addDays = (d, delta) => {
    const n = new Date(d);
    n.setDate(n.getDate() + delta);
    return n;
  };

  const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

  const parseTimeItem = (dateTime) => {
    // Expected: 2026-02-06T16:20:00+02:00
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(String(dateTime || ''));
    if (!m) return null;
    return { date: m[1], time: m[2] };
  };

  const normalizeParasha = (raw) => {
    const s = String(raw || '').trim();
    if (!s) return '';
    // Avoid double prefix if API already returns "פרשת ..."
    if (s.startsWith('פרשת')) return s;
    return `פרשת ${s}`;
  };

  const safeJsonParse = (s) => {
    try {
      return JSON.parse(String(s || ''));
    } catch {
      return null;
    }
  };

  const safeGetCache = () => {
    try {
      return safeJsonParse(localStorage.getItem(CACHE_KEY));
    } catch {
      return null;
    }
  };

  const safeSetCache = (obj) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
      return true;
    } catch {
      return false;
    }
  };

  const buildUrl = ({ start, end }) => {
    const u = new URL('https://www.hebcal.com/hebcal');
    u.searchParams.set('v', '1');
    u.searchParams.set('cfg', 'json');

    u.searchParams.set('start', start);
    u.searchParams.set('end', end);

    // Only what we need.
    u.searchParams.set('s', 'on'); // Parashat ha-Shavuah
    u.searchParams.set('c', 'on'); // Candle lighting + havdalah
    u.searchParams.set('i', 'on'); // Israel schedule
    u.searchParams.set('b', '18'); // minutes before sunset (override Jerusalem default)
    u.searchParams.set('M', 'on'); // havdalah at nightfall
    u.searchParams.set('leyning', 'off');

    // Location: lat/long + timezone.
    u.searchParams.set('latitude', String(JERUSALEM.latitude));
    u.searchParams.set('longitude', String(JERUSALEM.longitude));
    u.searchParams.set('tzid', JERUSALEM.tzid);

    // Hebrew titles.
    u.searchParams.set('lg', 'he');

    return u.toString();
  };

  const parseHebcal = (json) => {
    const items = Array.isArray(json?.items) ? json.items : [];
    const byDate = {};

    const ensure = (iso) => {
      if (!byDate[iso]) byDate[iso] = {};
      return byDate[iso];
    };

    for (const item of items) {
      const category = String(item?.category || '');

      if (category === 'candles') {
        const parsed = parseTimeItem(item?.date);
        if (!parsed) continue;
        ensure(parsed.date).candles = parsed.time;
        continue;
      }

      if (category === 'havdalah') {
        const parsed = parseTimeItem(item?.date);
        if (!parsed) continue;
        ensure(parsed.date).havdalah = parsed.time;
        continue;
      }

      if (category === 'parashat') {
        const iso = String(item?.date || '').trim();
        if (!isIsoDate(iso)) continue;
        const heb = String(item?.hebrew || '').trim();
        const title = String(item?.title || '').trim();
        const raw = heb || title;
        ensure(iso).parasha = normalizeParasha(raw.replace(/^פרשת\s+/, ''));
        continue;
      }
    }

    return byDate;
  };

  const fetchJsonWithTimeout = async (url, timeoutMs) => {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      window.clearTimeout(timer);
    }
  };

  const shouldUseCache = (cache, now) => {
    if (!cache || typeof cache !== 'object') return false;
    if (!isIsoDate(cache.start) || !isIsoDate(cache.end)) return false;

    // Cache should cover "today..today+~50w".
    if (!cache.byDate || typeof cache.byDate !== 'object') return false;

    const fetchedAt = Date.parse(String(cache.fetchedAt || ''));
    if (!Number.isFinite(fetchedAt)) return false;

    // Refresh weekly to be safe.
    const ageMs = now.getTime() - fetchedAt;
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
    return ageMs >= 0 && ageMs <= maxAgeMs;
  };

  const computeDefaultRange = () => {
    const now = new Date();
    const start = toIsoDate(now);
    const end = toIsoDate(addDays(now, 370)); // ~50-52 weeks ahead
    return { start, end };
  };

  let inFlight = null;
  const getData = async () => {
    if (inFlight) return inFlight;

    const now = new Date();
    const cached = safeGetCache();
    if (shouldUseCache(cached, now)) return cached;

    const { start, end } = computeDefaultRange();
    const url = buildUrl({ start, end });

    inFlight = (async () => {
      try {
        const json = await fetchJsonWithTimeout(url, 10_000);
        const byDate = parseHebcal(json);
        const payload = { start, end, fetchedAt: new Date().toISOString(), byDate };
        safeSetCache(payload);
        return payload;
      } catch {
        // Fallback to any stale cache we might have.
        const fallback = safeGetCache();
        if (fallback && fallback.byDate) return fallback;
        return { start, end, fetchedAt: new Date(0).toISOString(), byDate: {} };
      } finally {
        inFlight = null;
      }
    })();

    return inFlight;
  };

  const getInfoForIsoDate = async (isoDate) => {
    const data = await getData();
    const entry = data.byDate?.[isoDate];
    return entry && typeof entry === 'object' ? entry : {};
  };

  const getInfoForDates = async (isoDates) => {
    const data = await getData();
    const out = {};
    const list = Array.isArray(isoDates) ? isoDates : [];
    for (const iso of list) {
      if (!isIsoDate(iso)) continue;
      const entry = data.byDate?.[iso];
      out[iso] = entry && typeof entry === 'object' ? entry : {};
    }
    return out;
  };

  window.SeferHebcal = {
    getData,
    getInfoForIsoDate,
    getInfoForDates,
  };
})();
