(() => {
  const root = document.getElementById('weekJournal');
  const titleEl = document.getElementById('weekTitle');
  const rowEl = document.getElementById('weekRow');
  const dailyBtnEl = document.getElementById('weekDailyBtn');
  const prevWeekEl = document.getElementById('weekPrevBtn');
  const nextWeekEl = document.getElementById('weekNextBtn');

  if (!root || !titleEl || !rowEl) return;

  const owner = root.getAttribute('data-owner') || 'yanivmizrachiy';
  const repo = root.getAttribute('data-repo') || 'sefer1';
  const branch = root.getAttribute('data-branch') || 'main';

  const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  const pad2 = (n) => String(n).padStart(2, '0');
  const toIsoDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  const toDayMonth = (d) => `${d.getDate()}/${d.getMonth() + 1}`;

  const dailyJournalUrlForDate = (isoDate) => {
    const p = new URLSearchParams({ date: isoDate, owner, repo, branch });
    return `./%D7%99%D7%95%D7%9E%D7%9F-%D7%99%D7%95%D7%9E%D7%99.html?${p.toString()}`;
  };

  const NOTES_STORAGE_PREFIX = 'sefer1_day_notes_v1';
  const notesKeyFor = (dateIso) => `${NOTES_STORAGE_PREFIX}:${owner}/${repo}/${branch}:${dateIso}`;

  const readNotesSnippet = (dateIso) => {
    try {
      const raw = localStorage.getItem(notesKeyFor(dateIso));
      const text = String(raw || '').trim();
      if (!text) return '';

      const lines = text
        .split(/\r?\n/)
        .map((l) => String(l || '').trim())
        .filter(Boolean);

      if (!lines.length) return '';

      const out = [];
      let total = 0;
      const maxLines = 8;
      const maxChars = 220;

      for (const line of lines) {
        if (out.length >= maxLines) break;
        const nextTotal = total + line.length + (out.length ? 1 : 0);
        if (nextTotal > maxChars) break;
        out.push(line);
        total = nextTotal;
      }

      const truncated = out.length < lines.length;
      return out.join('\n') + (truncated ? '\n…' : '');
    } catch {
      return '';
    }
  };

  const today = new Date();
  const todayIso = toIsoDate(today);

  const hebcalCreditEl = document.getElementById('hebcalCredit');

  const initialWeekOffset = (() => {
    const p = new URLSearchParams(location.search);
    const raw = String(p.get('weekOffset') || '').trim();
    const n = Number.parseInt(raw || '0', 10);
    if (!Number.isFinite(n)) return 0;
    // Prevent absurd offsets from producing confusing UI.
    return Math.max(-520, Math.min(520, n));
  })();

  let currentWeekOffset = initialWeekOffset;

  let refreshTimer = 0;
  const scheduleRefresh = () => {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => render(), 120);
  };

  const urlForWeekOffset = (offset) => {
    const u = new URL(location.href);
    if (!offset) u.searchParams.delete('weekOffset');
    else u.searchParams.set('weekOffset', String(offset));
    return u.pathname + (u.searchParams.toString() ? `?${u.searchParams.toString()}` : '') + (u.hash || '');
  };

  if (dailyBtnEl) {
    dailyBtnEl.href = dailyJournalUrlForDate(todayIso);
    dailyBtnEl.setAttribute('aria-label', `פתיחת יומן יומי עבור היום (${todayIso})`);
  }

  const syncWeekNavHrefs = () => {
    if (prevWeekEl) prevWeekEl.href = urlForWeekOffset(currentWeekOffset - 1);
    if (nextWeekEl) nextWeekEl.href = urlForWeekOffset(currentWeekOffset + 1);
  };

  if (prevWeekEl) prevWeekEl.setAttribute('aria-label', 'מעבר לשבוע קודם');
  if (nextWeekEl) nextWeekEl.setAttribute('aria-label', 'מעבר לשבוע הבא');

  const addDays = (d, delta) => {
    const n = new Date(d);
    n.setDate(n.getDate() + delta);
    return n;
  };

  const startOfWeekSunday = (d) => {
    const n = new Date(d);
    n.setHours(0, 0, 0, 0);
    n.setDate(n.getDate() - n.getDay());
    return n;
  };

  const render = () => {
    while (rowEl.firstChild) rowEl.removeChild(rowEl.firstChild);

    const base = addDays(today, currentWeekOffset * 7);
    const start = startOfWeekSunday(base);
    const end = addDays(start, 6);
    // Avoid RTL bidi flipping for numeric dates (e.g. 7/4 -> 4/7).
    titleEl.replaceChildren();
    titleEl.appendChild(document.createTextNode('תצוגה שבועית לתאריכים '));
    const titleDates = document.createElement('span');
    titleDates.setAttribute('dir', 'ltr');
    titleDates.textContent = `${toDayMonth(start)}–${toDayMonth(end)}`;
    titleEl.appendChild(titleDates);

    // Always render a real week Sunday..Saturday.
    // In RTL layouts, the first cell is on the right, so Sunday is right-most and Saturday is left-most.
    const dayIndexes = [0, 1, 2, 3, 4, 5, 6];

    const isoDatesInWeek = [];

    for (const i of dayIndexes) {
      const d = addDays(start, i);
      const iso = toIsoDate(d);
      const dow = d.getDay();
      const dm = toDayMonth(d);

      const a = document.createElement('a');
      a.className = 'week__cell cal__cell';
      a.href = dailyJournalUrlForDate(iso);
      a.setAttribute('aria-label', `פתיחת יומן יומי עבור ${dm} (${iso})`);

      if (iso === todayIso) {
        a.classList.add('cal__cell--today');
      }
      if (dow === 6) {
        a.classList.add('cal__cell--shabbat');
      }

      const top = document.createElement('div');
      top.className = 'week__top';

      const name = document.createElement('div');
      name.className = 'week__name';
      name.textContent = dayNames[dow];

      const day = document.createElement('div');
      day.className = 'week__day';
      day.setAttribute('dir', 'ltr');
      day.textContent = dm;

      top.appendChild(name);
      top.appendChild(day);
      a.appendChild(top);

      const snippet = readNotesSnippet(iso);
      if (snippet) {
        const notes = document.createElement('div');
        notes.className = 'week__notes';
        notes.textContent = snippet;
        a.appendChild(notes);
      }

      const eventsApi = window.Sefer1Events;
      if (eventsApi) {
        const style = String(eventsApi.getPrimaryStyleForIso(iso) || '').trim();
        if (style) a.classList.add(`cal__cell--event-${style}`);

        const evText = String(eventsApi.getTextForIso(iso) || '').trim();
        if (evText) {
          const ev = document.createElement('div');
          ev.className = 'week__events';
          ev.textContent = evText;
          a.appendChild(ev);
        }
      }

      const hebcalBox = document.createElement('div');
      hebcalBox.className = 'week__hebcal';
      hebcalBox.hidden = true;
      hebcalBox.setAttribute('data-iso-date', iso);
      a.appendChild(hebcalBox);

      isoDatesInWeek.push(iso);

      rowEl.appendChild(a);
    }

    const hasHebcal = !!window.SeferHebcal;
    if (hebcalCreditEl) hebcalCreditEl.hidden = true;
    if (hasHebcal) populateHebcalForWeek(isoDatesInWeek);
  };

  // Keep weekly snippets in sync when localStorage changes.
  window.addEventListener('storage', (e) => {
    const k = e && typeof e.key === 'string' ? e.key : '';
    if (!k) return;
    if (k.startsWith(NOTES_STORAGE_PREFIX + ':')) scheduleRefresh();
  });

  // If returning to this page via back/forward cache, re-read localStorage.
  window.addEventListener('pageshow', () => scheduleRefresh());
  window.addEventListener('focus', () => scheduleRefresh());
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleRefresh();
  });

  // If a pull updated localStorage in this tab, re-render immediately.
  window.addEventListener('sefer1:dataApplied', () => scheduleRefresh());

  const populateHebcalForWeek = async (isoDates) => {
    const api = window.SeferHebcal;
    if (!api || !Array.isArray(isoDates) || isoDates.length === 0) return;

    const byDate = await api.getInfoForDates(isoDates);

    let anyShown = false;
    const boxes = rowEl.querySelectorAll('.week__hebcal[data-iso-date]');
    for (const box of boxes) {
      const iso = box.getAttribute('data-iso-date');
      const info = byDate?.[iso] || {};
      const parts = [];

      // Friday: candle lighting (כניסת שבת). Saturday: parasha + havdalah.
      const d = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
      const dow = d.getDay();

      if (dow === 5 && info.candles) {
        parts.push({ kind: 'candles', label: 'כניסת שבת', value: info.candles });
      }
      if (dow === 6) {
        if (info.parasha) parts.push({ kind: 'parasha', label: 'פרשת השבוע', value: info.parasha });
        if (info.havdalah) parts.push({ kind: 'havdalah', label: 'יציאת שבת', value: info.havdalah });
      }

      if (parts.length) {
        box.replaceChildren();
        for (let idx = 0; idx < parts.length; idx++) {
          const p = parts[idx];

          const item = document.createElement('span');
          item.className = `hebcalItem hebcalItem--${p.kind}`;

          const label = document.createElement('span');
          label.className = 'hebcalLabel';
          label.textContent = `${p.label}`;

          const value = document.createElement('span');
          value.className = 'hebcalValue';
          value.textContent = String(p.value || '').trim();

          item.appendChild(label);
          item.appendChild(document.createTextNode(' '));
          item.appendChild(value);
          box.appendChild(item);

          if (idx < parts.length - 1) {
            const sep = document.createElement('span');
            sep.className = 'hebcalSep';
            sep.textContent = ' • ';
            box.appendChild(sep);
          }
        }
        box.hidden = false;
        anyShown = true;
      } else {
        box.replaceChildren();
        box.hidden = true;
      }
    }

    if (hebcalCreditEl) hebcalCreditEl.hidden = !anyShown;
  };

  const clampWeekOffset = (n) => Math.max(-520, Math.min(520, n));

  let animTimer = 0;
  const animateToWeek = (nextOffset, shiftPx) => {
    window.clearTimeout(animTimer);
    const target = clampWeekOffset(nextOffset);
    if (target === currentWeekOffset) return;

    // Stage 1: slide current content out.
    rowEl.style.willChange = 'transform, opacity';
    rowEl.style.transition = 'transform 160ms ease, opacity 160ms ease';
    rowEl.style.transform = `translateX(${shiftPx}px)`;
    rowEl.style.opacity = '0.55';

    animTimer = window.setTimeout(() => {
      currentWeekOffset = target;
      try {
        history.pushState(null, '', urlForWeekOffset(currentWeekOffset));
      } catch {
        // ignore
      }

      // Render the new week off-screen on the opposite side.
      rowEl.style.transition = 'none';
      rowEl.style.transform = `translateX(${-shiftPx}px)`;
      rowEl.style.opacity = '0.55';
      render();
      syncWeekNavHrefs();

      // Stage 2: slide new content in.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          rowEl.style.transition = 'transform 160ms ease, opacity 160ms ease';
          rowEl.style.transform = 'translateX(0)';
          rowEl.style.opacity = '1';

          window.setTimeout(() => {
            rowEl.style.willChange = '';
          }, 180);
        });
      });
    }, 160);
  };

  if (prevWeekEl) {
    prevWeekEl.addEventListener('click', (e) => {
      // Right arrow: previous week, slide right.
      e.preventDefault();
      animateToWeek(currentWeekOffset - 1, +28);
    });
  }
  if (nextWeekEl) {
    nextWeekEl.addEventListener('click', (e) => {
      // Left arrow: next week, slide left.
      e.preventDefault();
      animateToWeek(currentWeekOffset + 1, -28);
    });
  }

  render();
  syncWeekNavHrefs();
})();
