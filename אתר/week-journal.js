(() => {
  const root = document.getElementById('weekJournal');
  const titleEl = document.getElementById('weekTitle');
  const rowEl = document.getElementById('weekRow');

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

  const today = new Date();
  const todayIso = toIsoDate(today);

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

    const start = startOfWeekSunday(today);
    const end = addDays(start, 6);
    titleEl.textContent = `שבוע נוכחי (ראשון–שבת) ${toDayMonth(start)}–${toDayMonth(end)}`;

    // Render a real week: Sunday..Saturday (in RTL the week reads right-to-left naturally).
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i);
      const iso = toIsoDate(d);
      const dow = d.getDay();

      const a = document.createElement('a');
      a.className = 'week__cell cal__cell';
      a.href = dailyJournalUrlForDate(iso);
      a.setAttribute('aria-label', `פתיחת יומן יומי עבור ${iso}`);

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
      day.textContent = String(d.getDate());

      const isoSmall = document.createElement('div');
      isoSmall.className = 'week__iso';
      isoSmall.textContent = toDayMonth(d);

      top.appendChild(name);
      top.appendChild(day);
      a.appendChild(top);
      a.appendChild(isoSmall);

      rowEl.appendChild(a);
    }
  };

  render();
})();
