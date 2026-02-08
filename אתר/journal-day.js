(() => {
  const titleEl = document.getElementById('dayTitle');

  const shabbatWrapEl = document.getElementById('dayShabbat');
  const shabbatLinesEl = document.getElementById('dayShabbatLines');

  const notesInputEl = document.getElementById('dayNotesInput');
  const notesSaveEl = document.getElementById('dayNotesSave');
  const notesStatusEl = document.getElementById('dayNotesStatus');

  if (!titleEl) return;

  const DEFAULT_OWNER = 'yanivmizrachiy';
  const DEFAULT_REPO = 'sefer1';
  const DEFAULT_BRANCH = 'main';

  const prevEl = document.getElementById('dayPrev');
  const nextEl = document.getElementById('dayNext');
  const todayEl = document.getElementById('dayToday');

  const params = new URLSearchParams(location.search);
  const dateParam = params.get('date');

  const pad2 = (n) => String(n).padStart(2, '0');
  const toIsoDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  const toDayMonthYear = (d) => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

  const isValidIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

  const today = new Date();
  const isoDate = (() => {
    const raw = String(dateParam || '').trim();
    if (raw === 'today' || raw === 'היום') return toIsoDate(today);
    return isValidIsoDate(raw) ? raw : toIsoDate(today);
  })();

  const parseIsoDate = (iso) => {
    const [y, m, d] = String(iso).split('-').map((x) => Number(x));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };

  const weekdayForIsoDate = (iso) => {
    const date = parseIsoDate(iso);
    if (!date) return '';

    try {
      const label = new Intl.DateTimeFormat('he-IL', { weekday: 'long' }).format(date);
      return String(label || '');
    } catch {
      const dayNames = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];
      return dayNames[date.getDay()] || '';
    }
  };

  const addDays = (iso, delta) => {
    const base = parseIsoDate(iso);
    if (!base) return iso;
    base.setDate(base.getDate() + delta);
    return toIsoDate(base);
  };

  const since = `${isoDate}T00:00:00Z`;
  const until = `${isoDate}T23:59:59Z`;

  const owner = params.get('owner') || DEFAULT_OWNER;
  const repo = params.get('repo') || DEFAULT_REPO;
  const branch = params.get('branch') || DEFAULT_BRANCH;

  const NOTES_STORAGE_PREFIX = 'sefer1_day_notes_v1';
  const notesKeyFor = (dateIso) => `${NOTES_STORAGE_PREFIX}:${owner}/${repo}/${branch}:${dateIso}`;

  const setNotesStatus = (text) => {
    if (!notesStatusEl) return;
    const value = String(text || '').trim();
    if (!value) {
      notesStatusEl.hidden = true;
      notesStatusEl.textContent = '';
      return;
    }
    notesStatusEl.hidden = false;
    notesStatusEl.textContent = value;
  };

  const loadNotes = () => {
    if (!notesInputEl) return;
    try {
      const raw = localStorage.getItem(notesKeyFor(isoDate));
      notesInputEl.value = typeof raw === 'string' ? raw : '';
    } catch {
      // localStorage might be blocked; do nothing.
    }
  };

  const saveNotes = ({ silent } = {}) => {
    if (!notesInputEl) return;
    try {
      localStorage.setItem(notesKeyFor(isoDate), String(notesInputEl.value || ''));
      if (!silent) {
        setNotesStatus('נשמר.');
        window.setTimeout(() => setNotesStatus(''), 1400);
      }
    } catch {
      if (!silent) setNotesStatus('לא ניתן לשמור בדפדפן זה.');
    }
  };

  let autosaveTimer = 0;
  const scheduleAutosave = () => {
    if (!notesInputEl) return;
    window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => saveNotes({ silent: true }), 900);
  };

  const dayUrl = (dateIso) => {
    const p = new URLSearchParams({ date: dateIso, owner, repo, branch });
    return `./%D7%99%D7%95%D7%9E%D7%9F-%D7%99%D7%95%D7%9E%D7%99.html?${p.toString()}`;
  };

  if (prevEl) prevEl.href = dayUrl(addDays(isoDate, -1));
  if (nextEl) nextEl.href = dayUrl(addDays(isoDate, 1));
  if (todayEl) todayEl.href = dayUrl(toIsoDate(today));

  if (notesSaveEl) {
    notesSaveEl.addEventListener('click', () => saveNotes());
  }
  if (notesInputEl) {
    notesInputEl.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        saveNotes();
      }
    });

    notesInputEl.addEventListener('input', () => scheduleAutosave());
    notesInputEl.addEventListener('blur', () => saveNotes({ silent: true }));
  }

  window.addEventListener('beforeunload', () => saveNotes({ silent: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveNotes({ silent: true });
  });

  window.addEventListener('storage', (e) => {
    if (!notesInputEl) return;
    if (e.key !== notesKeyFor(isoDate)) return;
    loadNotes();
  });

  const weekday = weekdayForIsoDate(isoDate);
  const titleDate = parseIsoDate(isoDate);
  const dmy = titleDate ? toDayMonthYear(titleDate) : isoDate;

  // Avoid RTL bidi flipping for numeric dates (e.g. 8/2/2026 -> 2026/2/8)
  titleEl.replaceChildren();
  if (weekday) titleEl.appendChild(document.createTextNode(`${weekday} — `));
  const dateSpan = document.createElement('span');
  dateSpan.setAttribute('dir', 'ltr');
  dateSpan.textContent = dmy;
  titleEl.appendChild(dateSpan);

  document.title = weekday ? `${weekday} — ${dmy}` : dmy;
  loadNotes();

  const renderShabbatInfo = async () => {
    if (!shabbatWrapEl || !shabbatLinesEl) return;

    const date = parseIsoDate(isoDate);
    if (!date) return;
    const dow = date.getDay();
    const isFriOrSat = dow === 5 || dow === 6;
    if (!isFriOrSat) {
      shabbatWrapEl.hidden = true;
      shabbatLinesEl.replaceChildren();
      return;
    }

    const api = window.SeferHebcal;
    if (!api) return;

    const info = await api.getInfoForIsoDate(isoDate);
    const parts = [];
    if (dow === 5 && info.candles) parts.push({ kind: 'candles', label: 'כניסת שבת', value: info.candles });
    if (dow === 6) {
      if (info.parasha) parts.push({ kind: 'parasha', label: 'פרשת השבוע', value: info.parasha });
      if (info.havdalah) parts.push({ kind: 'havdalah', label: 'יציאת שבת', value: info.havdalah });
    }

    if (!parts.length) {
      shabbatWrapEl.hidden = true;
      shabbatLinesEl.replaceChildren();
      return;
    }

    shabbatLinesEl.replaceChildren();
    for (const p of parts) {
      const row = document.createElement('div');
      row.className = `hebcalRow hebcalRow--${p.kind}`;

      const label = document.createElement('span');
      label.className = 'hebcalLabel';
      label.textContent = `${p.label}`;

      const value = document.createElement('span');
      value.className = 'hebcalValue';
      value.textContent = String(p.value || '').trim();

      row.appendChild(label);
      row.appendChild(document.createTextNode(' '));
      row.appendChild(value);
      shabbatLinesEl.appendChild(row);
    }
    shabbatWrapEl.hidden = false;
  };

  renderShabbatInfo();
})();
