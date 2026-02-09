(() => {
  const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

  const getConfigEvents = () => {
    try {
      const arr = window.Sefer1Config && Array.isArray(window.Sefer1Config.calendarEvents) ? window.Sefer1Config.calendarEvents : [];
      return arr;
    } catch {
      return [];
    }
  };

  const normalizeEvent = (ev) => {
    if (!ev || typeof ev !== 'object') return null;
    const start = String(ev.start || '').trim();
    const end = String(ev.end || '').trim();
    const date = String(ev.date || '').trim();
    const style = String(ev.style || '').trim();
    const text = typeof ev.text === 'string' ? ev.text : String(ev.text ?? '');
    const t = text.trim();

    const s = start || date;
    const e = end || start || date;
    if (!isIsoDate(s) || !isIsoDate(e) || !t) return null;
    const from = s <= e ? s : e;
    const to = s <= e ? e : s;

    return { start: from, end: to, text: t, style };
  };

  const getEventsForIso = (iso) => {
    if (!isIsoDate(iso)) return [];
    const out = [];
    for (const raw of getConfigEvents()) {
      const ev = normalizeEvent(raw);
      if (!ev) continue;
      if (iso < ev.start || iso > ev.end) continue;
      out.push(ev);
    }
    return out;
  };

  const primaryStyleFor = (events) => {
    const styles = new Set(events.map((e) => e.style));
    if (styles.has('vacation')) return 'green';
    if (styles.has('blue')) return 'blue';
    if (styles.has('red')) return 'red';
    return '';
  };

  const textFor = (events) => {
    if (!events.length) return '';
    return events.map((e) => e.text).join('\n');
  };

  window.Sefer1Events = {
    getEventsForIso,
    getPrimaryStyleForIso: (iso) => primaryStyleFor(getEventsForIso(iso)),
    getTextForIso: (iso) => textFor(getEventsForIso(iso)),
  };
})();
