(() => {
  const titleEl = document.getElementById('dayTitle');
  const metaEl = document.getElementById('dayMeta');
  const listEl = document.getElementById('commitList');
  const loadingEl = document.getElementById('state-loading');
  const emptyEl = document.getElementById('state-empty');
  const errorEl = document.getElementById('state-error');

  if (!titleEl || !metaEl || !listEl || !loadingEl || !emptyEl || !errorEl) return;

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

  const isValidIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

  const today = new Date();
  const isoDate = isValidIsoDate(dateParam) ? dateParam : toIsoDate(today);

  const parseIsoDate = (iso) => {
    const [y, m, d] = String(iso).split('-').map((x) => Number(x));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
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

  const dayUrl = (dateIso) => {
    const p = new URLSearchParams({ date: dateIso, owner, repo, branch });
    return `./%D7%99%D7%95%D7%9E%D7%9F-%D7%99%D7%95%D7%9E%D7%99.html?${p.toString()}`;
  };

  if (prevEl) prevEl.href = dayUrl(addDays(isoDate, -1));
  if (nextEl) nextEl.href = dayUrl(addDays(isoDate, 1));
  if (todayEl) todayEl.href = dayUrl(toIsoDate(today));

  const githubCommitsPage = (() => {
    const p = new URLSearchParams({ since, until });
    return `https://github.com/${owner}/${repo}/commits/${branch}/?${p.toString()}`;
  })();

  function setState({ loading, empty, error }) {
    loadingEl.hidden = !loading;
    emptyEl.hidden = !empty;
    errorEl.hidden = !error;
  }

  function escapeText(s) {
    return String(s == null ? '' : s);
  }

  async function load() {
    titleEl.textContent = `יומן יומי — ${isoDate}`;
    metaEl.textContent = `הנתונים נטענים מ־GitHub עבור ${owner}/${repo} (ענף: ${branch}).`;

    setState({ loading: true, empty: false, error: false });
    listEl.replaceChildren();

    try {
      const apiUrl = new URL(`https://api.github.com/repos/${owner}/${repo}/commits`);
      apiUrl.searchParams.set('sha', branch);
      apiUrl.searchParams.set('since', since);
      apiUrl.searchParams.set('until', until);
      apiUrl.searchParams.set('per_page', '100');

      const res = await fetch(apiUrl.toString(), {
        headers: {
          Accept: 'application/vnd.github+json',
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const commits = await res.json();
      if (!Array.isArray(commits) || commits.length === 0) {
        setState({ loading: false, empty: true, error: false });
        return;
      }

      commits.forEach((c) => {
        const li = document.createElement('li');

        const sha = (c && c.sha ? String(c.sha) : '').slice(0, 7);
        const message = c && c.commit && c.commit.message ? String(c.commit.message) : '(ללא הודעה)';
        const oneLine = message.split('\n')[0];
        const url = c && c.html_url ? String(c.html_url) : githubCommitsPage;

        const a = document.createElement('a');
        a.className = 'link';
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = `${escapeText(oneLine)} (${sha})`;

        li.appendChild(a);
        listEl.appendChild(li);
      });

      const more = document.createElement('li');
      const moreLink = document.createElement('a');
      moreLink.className = 'link';
      moreLink.href = githubCommitsPage;
      moreLink.target = '_blank';
      moreLink.rel = 'noopener noreferrer';
      moreLink.textContent = 'פתיחה ב־GitHub (רשימת commits מלאה ליום)';
      more.appendChild(moreLink);
      listEl.appendChild(more);

      setState({ loading: false, empty: false, error: false });
    } catch (err) {
      console.error('Failed to load day commits', err);
      setState({ loading: false, empty: false, error: true });
    }
  }

  load();
})();
