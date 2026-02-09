(() => {
  const GIST_ID_KEY = 'sefer1_sync_gist_id_v1';
  const TOKEN_SESSION_KEY = 'sefer1_sync_token_session_v1';

  const TODOS_KEY = 'sefer1_todos_v1';
  const NOTES_PREFIX = 'sefer1_day_notes_v1:';
  const FILE_NAME = 'sefer1-sync.json';

  const safeJsonParse = (raw, fallback) => {
    try {
      return JSON.parse(String(raw || ''));
    } catch {
      return fallback;
    }
  };

  const getConfigDefaultGistId = () => {
    try {
      const v = window.Sefer1Config && typeof window.Sefer1Config.defaultGistId === 'string' ? window.Sefer1Config.defaultGistId : '';
      return String(v || '').trim();
    } catch {
      return '';
    }
  };

  const getStoredGistId = () => {
    try {
      return String(localStorage.getItem(GIST_ID_KEY) || '').trim();
    } catch {
      return '';
    }
  };

  const setStoredGistId = (id) => {
    try {
      localStorage.setItem(GIST_ID_KEY, String(id || '').trim());
      return true;
    } catch {
      return false;
    }
  };

  const applyGistId = (id) => {
    const v = String(id || '').trim();
    if (!v) return '';
    setStoredGistId(v);
    return v;
  };

  const getToken = () => {
    try {
      return String(sessionStorage.getItem(TOKEN_SESSION_KEY) || '').trim();
    } catch {
      return '';
    }
  };

  const setToken = (token) => {
    try {
      const v = String(token || '').trim();
      if (!v) sessionStorage.removeItem(TOKEN_SESSION_KEY);
      else sessionStorage.setItem(TOKEN_SESSION_KEY, v);
      return true;
    } catch {
      return false;
    }
  };

  const getGistId = () => getStoredGistId() || getConfigDefaultGistId();

  // Allow sharing the sync target via URL, e.g. index.html?gistId=<id>
  try {
    const p = new URLSearchParams(location.search);
    const fromUrl = String(p.get('gistId') || '').trim();
    if (fromUrl) applyGistId(fromUrl);
    else {
      const fromConfig = getConfigDefaultGistId();
      if (fromConfig && !getStoredGistId()) applyGistId(fromConfig);
    }
  } catch {
    // ignore
  }

  const listNoteKeys = () => {
    const keys = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && String(k).startsWith(NOTES_PREFIX)) keys.push(String(k));
      }
    } catch {
      // ignore
    }
    keys.sort();
    return keys;
  };

  const collectLocalPayload = () => {
    let todos = [];
    try {
      todos = safeJsonParse(localStorage.getItem(TODOS_KEY) || '[]', []);
    } catch {
      todos = [];
    }

    const notes = {};
    for (const k of listNoteKeys()) {
      try {
        const v = localStorage.getItem(k);
        if (typeof v === 'string') notes[k] = v;
      } catch {
        // ignore
      }
    }

    return {
      schema: 1,
      updatedAt: new Date().toISOString(),
      data: {
        todos: Array.isArray(todos) ? todos : [],
        notes,
      },
    };
  };

  const mergeTodos = (localArr, remoteArr) => {
    const out = new Map();
    const put = (t) => {
      if (!t || typeof t !== 'object') return;
      const id = typeof t.id === 'string' ? t.id : '';
      const text = typeof t.text === 'string' ? t.text.trim() : '';
      if (!id || !text) return;
      out.set(id, { id, text, done: Boolean(t.done) });
    };

    (Array.isArray(localArr) ? localArr : []).forEach(put);
    (Array.isArray(remoteArr) ? remoteArr : []).forEach(put);

    return Array.from(out.values());
  };

  const dispatchDataApplied = () => {
    try {
      window.dispatchEvent(new CustomEvent('sefer1:dataApplied', { detail: { source: 'sync', at: Date.now() } }));
    } catch {
      // ignore
    }
  };

  const applyRemotePayload = (payload) => {
    const remoteTodos = payload?.data?.todos;
    const remoteNotes = payload?.data?.notes;

    try {
      const localTodos = safeJsonParse(localStorage.getItem(TODOS_KEY) || '[]', []);
      const merged = mergeTodos(localTodos, remoteTodos);
      localStorage.setItem(TODOS_KEY, JSON.stringify(merged));
    } catch {
      // ignore
    }

    if (remoteNotes && typeof remoteNotes === 'object') {
      for (const [k, v] of Object.entries(remoteNotes)) {
        if (!String(k).startsWith(NOTES_PREFIX)) continue;
        try {
          localStorage.setItem(String(k), typeof v === 'string' ? v : String(v ?? ''));
        } catch {
          // ignore
        }
      }
    }

    dispatchDataApplied();
  };

  const ghFetch = async (url, { token, method, body } = {}) => {
    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    const t = String(token || '').trim();
    if (t) headers.Authorization = `Bearer ${t}`;

    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetch(url, {
      method: method || 'GET',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    const json = safeJsonParse(text, null);

    if (!res.ok) {
      const msg = json?.message ? String(json.message) : `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return json;
  };

  const getSyncFileContentFromGist = (gistJson) => {
    const files = gistJson?.files;
    if (!files || typeof files !== 'object') return '';

    if (files[FILE_NAME]?.content) return String(files[FILE_NAME].content);

    for (const f of Object.values(files)) {
      if (!f || typeof f !== 'object') continue;
      const fn = String(f.filename || '');
      if (fn.toLowerCase().endsWith('.json') && typeof f.content === 'string') return f.content;
    }

    return '';
  };

  const pullFromGitHub = async ({ silent } = {}) => {
    const gistId = getGistId();
    if (!gistId) return;

    const token = getToken();
    const gist = await ghFetch(`https://api.github.com/gists/${encodeURIComponent(gistId)}`, { token });
    const content = getSyncFileContentFromGist(gist);
    const payload = safeJsonParse(content, null);

    if (!payload || payload.schema !== 1 || !payload.data) {
      if (!silent) throw new Error('הקובץ בגיטהאב לא בפורמט הנכון');
      return;
    }

    applyRemotePayload(payload);
  };

  const hasAnyLocalData = () => {
    try {
      const todos = safeJsonParse(localStorage.getItem(TODOS_KEY) || '[]', []);
      if (Array.isArray(todos) && todos.length) return true;
    } catch {
      // ignore
    }

    try {
      return listNoteKeys().length > 0;
    } catch {
      return false;
    }
  };

  const pushToGitHub = async ({ silent } = {}) => {
    const token = getToken();
    if (!token) {
      if (!silent) throw new Error('צריך token כדי לדחוף');
      return;
    }

    const payload = collectLocalPayload();
    const content = JSON.stringify(payload, null, 2);

    const existingGistId = getGistId();

    if (!existingGistId) {
      const created = await ghFetch('https://api.github.com/gists', {
        token,
        method: 'POST',
        body: {
          description: 'sefer1 synced data',
          public: false,
          files: {
            [FILE_NAME]: { content },
          },
        },
      });

      const newId = String(created?.id || '').trim();
      if (newId) applyGistId(newId);
      return;
    }

    await ghFetch(`https://api.github.com/gists/${encodeURIComponent(existingGistId)}`, {
      token,
      method: 'PATCH',
      body: {
        files: {
          [FILE_NAME]: { content },
        },
      },
    });
  };

  // Seed local data from site config (committed defaults).
  const applySeedDayNotes = () => {
    let seed = null;
    let scope = null;
    try {
      seed = window.Sefer1Config && window.Sefer1Config.seedDayNotes && typeof window.Sefer1Config.seedDayNotes === 'object' ? window.Sefer1Config.seedDayNotes : null;
      scope = window.Sefer1Config && window.Sefer1Config.defaultNotesScope && typeof window.Sefer1Config.defaultNotesScope === 'object' ? window.Sefer1Config.defaultNotesScope : null;
    } catch {
      seed = null;
      scope = null;
    }

    if (!seed) return;

    const owner = scope && typeof scope.owner === 'string' ? String(scope.owner || '').trim() : 'yanivmizrachiy';
    const repo = scope && typeof scope.repo === 'string' ? String(scope.repo || '').trim() : 'sefer1';
    const branch = scope && typeof scope.branch === 'string' ? String(scope.branch || '').trim() : 'main';

    const isIso = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

    let changed = false;
    for (const [iso, text] of Object.entries(seed)) {
      if (!isIso(iso)) continue;
      const value = typeof text === 'string' ? text : String(text ?? '');
      const v = value.trim();
      if (!v) continue;

      const k = `${NOTES_PREFIX}${owner}/${repo}/${branch}:${iso}`;
      try {
        const existing = String(localStorage.getItem(k) || '').trim();
        if (existing) continue;
        localStorage.setItem(k, v);
        changed = true;
      } catch {
        // ignore
      }
    }

    if (changed) dispatchDataApplied();
  };

  // Auto behavior
  let lastLocalChangeAt = 0;
  let lastPushAttemptAt = 0;
  let lastPullAttemptAt = 0;
  let autoPushTimer = 0;
  let inFlight = false;

  const canSyncNow = () => {
    const gistId = getGistId();
    if (!gistId) return false;
    if (Date.now() - lastLocalChangeAt < 6500) return false;
    return true;
  };

  const scheduleAutoPush = () => {
    window.clearTimeout(autoPushTimer);
    autoPushTimer = window.setTimeout(async () => {
      const token = getToken();
      const gistId = getGistId();
      if (!token || !gistId) return;
      if (inFlight) return;

      inFlight = true;
      lastPushAttemptAt = Date.now();
      try {
        await pushToGitHub({ silent: true });
      } catch {
        // ignore
      } finally {
        inFlight = false;
      }
    }, 1400);
  };

  const tryAutoPull = async () => {
    if (document.visibilityState === 'hidden') return;
    if (!canSyncNow()) return;
    if (inFlight) return;
    if (Date.now() - lastPullAttemptAt < 10_000) return;
    if (Date.now() - lastPushAttemptAt < 4_000) return;

    inFlight = true;
    lastPullAttemptAt = Date.now();
    try {
      await pullFromGitHub({ silent: true });
    } catch {
      // ignore
    } finally {
      inFlight = false;
    }
  };

  // External browsers: pull once when empty.
  const autoPullIfEmpty = async () => {
    const gistId = getGistId();
    if (!gistId) return;
    if (hasAnyLocalData()) return;

    try {
      await pullFromGitHub({ silent: true });
    } catch {
      // ignore
    }
  };

  window.addEventListener('sefer1:dataChanged', () => {
    lastLocalChangeAt = Date.now();
    scheduleAutoPush();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void tryAutoPull();
  });

  window.setInterval(() => {
    void tryAutoPull();
  }, 12_000);

  applySeedDayNotes();
  autoPullIfEmpty();

  window.Sefer1Sync = {
    applyGistId,
    getGistId,
    getToken,
    setToken,
    pullFromGitHub,
    pushToGitHub,
  };
})();
