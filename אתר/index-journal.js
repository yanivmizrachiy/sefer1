(() => {
  const root = document.getElementById('monthJournal');
  const titleEl = document.getElementById('monthTitle');
  const gridEl = document.getElementById('calGrid');

  if (!root || !titleEl || !gridEl) return;

  const owner = root.getAttribute('data-owner') || 'yanivmizrachiy';
  const repo = root.getAttribute('data-repo') || 'sefer1';
  const branch = root.getAttribute('data-branch') || 'main';

  const monthNames = [
    'ינואר',
    'פברואר',
    'מרץ',
    'אפריל',
    'מאי',
    'יוני',
    'יולי',
    'אוגוסט',
    'ספטמבר',
    'אוקטובר',
    'נובמבר',
    'דצמבר',
  ];

  const pad2 = (n) => String(n).padStart(2, '0');

  const toIsoDate = (y, m0, d) => `${y}-${pad2(m0 + 1)}-${pad2(d)}`;

  const dailyJournalUrlForDate = (isoDate) => {
    const p = new URLSearchParams({ date: isoDate, owner, repo, branch });
    return `./%D7%99%D7%95%D7%9E%D7%9F-%D7%99%D7%95%D7%9E%D7%99.html?${p.toString()}`;
  };

  const commitsUrlForDate = (isoDate) => {
    const since = `${isoDate}T00:00:00Z`;
    const until = `${isoDate}T23:59:59Z`;
    const params = new URLSearchParams({ since, until });
    return `https://github.com/${owner}/${repo}/commits/${branch}/?${params.toString()}`;
  };

  const today = new Date();
  const state = {
    year: today.getFullYear(),
    month0: today.getMonth(),
  };

  const render = () => {
    const { year, month0 } = state;

    const first = new Date(year, month0, 1);
    const firstDow = first.getDay(); // 0..6 (Sun..Sat)
    const daysInMonth = new Date(year, month0 + 1, 0).getDate();

    titleEl.textContent = `${monthNames[month0]} ${year}`;

    while (gridEl.firstChild) gridEl.removeChild(gridEl.firstChild);

    const isThisMonthToday =
      year === today.getFullYear() && month0 === today.getMonth();

    const totalCells = 42; // 6 weeks
    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - firstDow + 1;

      if (dayNumber < 1 || dayNumber > daysInMonth) {
        const empty = document.createElement('div');
        empty.className = 'cal__cell cal__cell--empty';
        empty.setAttribute('aria-hidden', 'true');
        gridEl.appendChild(empty);
        continue;
      }

      const iso = toIsoDate(year, month0, dayNumber);
      const dateObj = new Date(year, month0, dayNumber);
      const dow = dateObj.getDay(); // 0..6 (Sun..Sat)
      const a = document.createElement('a');
      a.className = 'cal__cell';
      a.href = dailyJournalUrlForDate(iso);
      a.setAttribute('aria-label', `פתיחת יומן יומי עבור ${iso}`);

      if (dow === 6) {
        a.classList.add('cal__cell--shabbat');
      }

      if (isThisMonthToday && dayNumber === today.getDate()) {
        a.classList.add('cal__cell--today');
      }

      const daySpan = document.createElement('span');
      daySpan.className = 'cal__day';
      daySpan.textContent = String(dayNumber);
      a.appendChild(daySpan);

      gridEl.appendChild(a);
    }
  };

  const shiftMonth = (delta) => {
    const d = new Date(state.year, state.month0 + delta, 1);
    state.year = d.getFullYear();
    state.month0 = d.getMonth();
    render();
  };

  root.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest && e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    if (!action) return;

    e.preventDefault();

    if (action === 'prev') shiftMonth(-1);
    if (action === 'next') shiftMonth(1);
    if (action === 'today') {
      state.year = today.getFullYear();
      state.month0 = today.getMonth();
      render();
    }
  });

  render();
})();
