(() => {
  const GIST_INPUT_ID = 'ghSyncGistId';
  const TOKEN_INPUT_ID = 'ghSyncToken';
  const PULL_BTN_ID = 'ghSyncPull';
  const PUSH_BTN_ID = 'ghSyncPush';
  const STATUS_ID = 'ghSyncStatus';

  const GIST_ID_KEY = 'sefer1_sync_gist_id_v1';
  const TODOS_KEY = 'sefer1_todos_v1';
  const NOTES_PREFIX = 'sefer1_day_notes_v1:';

  const FILE_NAME = 'sefer1-sync.json';

  const gistEl = document.getElementById(GIST_INPUT_ID);
  const tokenEl = document.getElementById(TOKEN_INPUT_ID);
  const pullEl = document.getElementById(PULL_BTN_ID);
  const pushEl = document.getElementById(PUSH_BTN_ID);
  const statusEl = document.getElementById(STATUS_ID);

  if (!tokenEl || !pullEl || !pushEl || !statusEl) return;

  const setStatus = (text) => {
    const value = String(text || '').trim();
    statusEl.hidden = !value;
    statusEl.textContent = value;
  };

  const safeJsonParse = (raw, fallback) => {
    try {
      return JSON.parse(String(raw || ''));
    } catch {
      return fallback;
    }
  };

  const getStoredGistId = () => {
    try {
      return String(localStorage.getItem(GIST_ID_KEY) || '').trim();
    } catch {
      return '';
    }
  };

  const getGistId = () => {
    const fromUi = gistEl ? String(gistEl.value || '').trim() : '';
    return fromUi || getStoredGistId();
  };

  const setGistId = (id) => {
    try {
      localStorage.setItem(GIST_ID_KEY, String(id || '').trim());
      return true;
    } catch {
      return false;
    }
  };

  if (gistEl) {
    gistEl.value = getStoredGistId();
    gistEl.addEventListener('input', () => {
      const v = String(gistEl.value || '').trim();
      setGistId(v);
    });
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

    // Prefer remote values when same id exists
    (Array.isArray(localArr) ? localArr : []).forEach(put);
    (Array.isArray(remoteArr) ? remoteArr : []).forEach(put);

    return Array.from(out.values());
  };

  const applyRemotePayload = (payload) => {
    const remoteTodos = payload?.data?.todos;
    const remoteNotes = payload?.data?.notes;

    // Todos
    try {
      const localTodos = safeJsonParse(localStorage.getItem(TODOS_KEY) || '[]', []);
      const merged = mergeTodos(localTodos, remoteTodos);
      localStorage.setItem(TODOS_KEY, JSON.stringify(merged));
    } catch {
      // ignore
    }

    // Notes (remote overwrites same key)
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

    // Prefer our file name, fallback to first JSON-ish file.
    if (files[FILE_NAME]?.content) return String(files[FILE_NAME].content);

    for (const f of Object.values(files)) {
      if (!f || typeof f !== 'object') continue;
      const fn = String(f.filename || '');
      if (fn.toLowerCase().endsWith('.json') && typeof f.content === 'string') return f.content;
    }

    return '';
  };

  const pullFromGitHub = async () => {
    const token = String(tokenEl.value || '').trim();
    if (!token) {
      setStatus('צריך token כדי למשוך');
      return;
    }

    const gistId = getGistId();
    if (!gistId) {
      setStatus('אין מזהה Gist עדיין הדבק מזהה או בצע שלח כדי ליצור');
      return;
    }

    setStatus('טוען מגיטהאב');
    const gist = await ghFetch(`https://api.github.com/gists/${encodeURIComponent(gistId)}`, { token });
    const content = getSyncFileContentFromGist(gist);
    const payload = safeJsonParse(content, null);

    if (!payload || payload.schema !== 1 || !payload.data) {
      setStatus('הקובץ בגיטהאב לא בפורמט הנכון');
      return;
    }

    applyRemotePayload(payload);
    setStatus('נמשכו נתונים ונשמרו בדפדפן');
  };

  const pushToGitHub = async () => {
    const token = String(tokenEl.value || '').trim();
    if (!token) {
      setStatus('צריך token כדי לדחוף');
      return;
    }

    const payload = collectLocalPayload();
    const content = JSON.stringify(payload, null, 2);

    const existingGistId = getGistId();

    setStatus('שולח לגיטהאב');

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
      if (newId) {
        setGistId(newId);
        if (gistEl) gistEl.value = newId;
      }
      setStatus('נוצר Gist ונשלחו נתונים');
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

    setStatus('נשלחו נתונים לגיטהאב');
  };

  const withHandling = (fn) => async () => {
    setStatus('');
    try {
      await fn();
    } catch (e) {
      const msg = e && e.message ? String(e.message) : 'שגיאה';
      setStatus(`שגיאה ${msg}`);
    }
  };

  pullEl.addEventListener('click', withHandling(pullFromGitHub));
  pushEl.addEventListener('click', withHandling(pushToGitHub));
})();
