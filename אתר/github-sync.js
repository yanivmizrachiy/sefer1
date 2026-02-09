(() => {
  const GIST_INPUT_ID = 'ghSyncGistId';
  const TOKEN_INPUT_ID = 'ghSyncToken';
  const PULL_BTN_ID = 'ghSyncPull';
  const PUSH_BTN_ID = 'ghSyncPush';
  const STATUS_ID = 'ghSyncStatus';

  const gistEl = document.getElementById(GIST_INPUT_ID);
  const tokenEl = document.getElementById(TOKEN_INPUT_ID);
  const pullEl = document.getElementById(PULL_BTN_ID);
  const pushEl = document.getElementById(PUSH_BTN_ID);
  const statusEl = document.getElementById(STATUS_ID);

  const core = window.Sefer1Sync;
  if (!core) return;

  const setStatus = (text) => {
    if (!statusEl) return;
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

  if (gistEl) {
    gistEl.value = core.getGistId() || '';
    gistEl.addEventListener('input', () => {
      const v = String(gistEl.value || '').trim();
      core.applyGistId(v);
    });
  }

  const withHandling = (fn) => async () => {
    setStatus('');
    try {
      await fn();
    } catch (e) {
      const msg = e && e.message ? String(e.message) : 'שגיאה';
      setStatus(`שגיאה ${msg}`);
    }
  };

  if (tokenEl) {
    // Token is stored only for the current browser session (sessionStorage), not persisted.
    const existing = core.getToken();
    if (existing) tokenEl.value = existing;
    tokenEl.addEventListener('input', () => {
      core.setToken(String(tokenEl.value || '').trim());
    });
  }

  if (pullEl) {
    pullEl.addEventListener(
      'click',
      withHandling(async () => {
        if (!core.getGistId()) {
          setStatus('אין מזהה Gist עדיין הדבק מזהה או בצע שלח כדי ליצור');
          return;
        }
        setStatus(core.getToken() ? 'טוען מגיטהאב' : 'טוען מגיטהאב (קריאה בלבד)');
        await core.pullFromGitHub({ silent: true });
        setStatus('נמשכו נתונים ונשמרו בדפדפן');
      })
    );
  }

  if (pushEl) {
    pushEl.addEventListener(
      'click',
      withHandling(async () => {
        setStatus('שולח לגיטהאב');
        await core.pushToGitHub({ silent: true });
        // Refresh gist id if it was created now.
        if (gistEl) gistEl.value = core.getGistId() || '';
        setStatus('נשלחו נתונים לגיטהאב');
      })
    );
  }
})();
