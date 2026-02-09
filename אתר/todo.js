(() => {
  const STORAGE_KEY = 'sefer1_todos_v1';

  const panel = document.getElementById('todoPanel');
  const toggleBtn = document.getElementById('todoToggle');

  const form = document.getElementById('todoForm');
  const input = document.getElementById('todoInput');
  const list = document.getElementById('todoList');
  const empty = document.getElementById('todoEmpty');

  if (toggleBtn && panel) {
    toggleBtn.addEventListener('click', () => {
      const willOpen = Boolean(panel.hidden);
      panel.hidden = !willOpen;
      toggleBtn.setAttribute('aria-expanded', String(willOpen));

      if (willOpen && input) {
        setTimeout(() => input.focus(), 0);
      }
    });
  }

  if (!form || !input || !list || !empty) return;

  let storageOk = true;
  const setStorageOk = (ok) => {
    storageOk = Boolean(ok);
    if (!storageOk) {
      empty.hidden = false;
      empty.textContent = 'שמירה לא זמינה בדפדפן זה.';
    }
  };

  const safeParse = (raw) => {
    try {
      const val = JSON.parse(raw);
      return Array.isArray(val) ? val : [];
    } catch {
      return [];
    }
  };

  const load = () => {
    let raw = '[]';
    try {
      raw = localStorage.getItem(STORAGE_KEY) || '[]';
      setStorageOk(true);
    } catch {
      setStorageOk(false);
    }

    const items = safeParse(raw);
    return items
      .filter((t) => t && typeof t.text === 'string')
      .map((t) => ({
        id: typeof t.id === 'string' ? t.id : String(Date.now()) + Math.random().toString(16).slice(2),
        text: t.text.trim(),
        done: Boolean(t.done),
      }))
      .filter((t) => t.text.length > 0);
  };

  const save = (items) => {
    if (!storageOk) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      setStorageOk(true);

      try {
        window.dispatchEvent(
          new CustomEvent('sefer1:dataChanged', {
            detail: { kind: 'todos', key: STORAGE_KEY, at: Date.now() },
          })
        );
      } catch {
        // ignore
      }
    } catch {
      setStorageOk(false);
    }
  };

  let todos = load();

  const uid = () => {
    return String(Date.now()) + '-' + Math.random().toString(16).slice(2);
  };

  const render = () => {
    list.replaceChildren();

    if (!todos.length) {
      empty.hidden = false;
      return;
    }

    empty.hidden = true;

    todos.forEach((t) => {
      const li = document.createElement('li');
      li.className = 'todo__item';
      li.dataset.id = t.id;

      const label = document.createElement('label');
      label.className = 'todo__label-row';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'todo__check';
      cb.checked = t.done;
      cb.setAttribute('aria-label', 'סימון משימה כבוצעה');

      const text = document.createElement('span');
      text.className = 'todo__text' + (t.done ? ' todo__text--done' : '');
      text.textContent = t.text;

      label.appendChild(cb);
      label.appendChild(text);

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn btn--ghost todo__delete';
      del.textContent = 'מחיקה';
      del.setAttribute('data-action', 'delete');

      li.appendChild(label);
      li.appendChild(del);

      list.appendChild(li);
    });
  };

  const addTodo = (text) => {
    const value = String(text || '').trim();
    if (!value) return;

    todos.unshift({ id: uid(), text: value, done: false });
    save(todos);
    render();
  };

  const toggleTodo = (id, done) => {
    const idx = todos.findIndex((t) => t.id === id);
    if (idx < 0) return;
    todos[idx] = { ...todos[idx], done: Boolean(done) };
    save(todos);
    render();
  };

  const deleteTodo = (id) => {
    todos = todos.filter((t) => t.id !== id);
    save(todos);
    render();
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    addTodo(input.value);
    input.value = '';
    input.focus();
  });

  list.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest && e.target.closest('[data-action="delete"]');
    if (!btn) return;

    const li = btn.closest('.todo__item');
    if (!li) return;

    deleteTodo(li.dataset.id);
  });

  list.addEventListener('change', (e) => {
    const cb = e.target;
    if (!cb || cb.tagName !== 'INPUT' || cb.type !== 'checkbox') return;

    const li = cb.closest('.todo__item');
    if (!li) return;

    toggleTodo(li.dataset.id, cb.checked);
  });

  // If another tab updates localStorage, keep in sync.
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    todos = load();
    render();
  });

  // If a pull updated localStorage in this tab, re-render.
  window.addEventListener('sefer1:dataApplied', () => {
    todos = load();
    render();
  });

  render();
})();
