// sefer1 site configuration
//
// IMPORTANT: If you set `defaultGistId`, anyone who can access the site source can also see this ID.
// Secret gists are "unlisted" but not truly private once the ID is public.
//
// Leave empty to require setting Gist ID per device (manual / URL param).
window.Sefer1Config = {
  defaultGistId: '',

  // Default scope for journal notes keys.
  // Matches the default repo shown in the UI.
  defaultNotesScope: {
    owner: 'yanivmizrachiy',
    repo: 'sefer1',
    branch: 'main',
  },

  // Seed day notes (written into localStorage only if missing).
  // Format: { "YYYY-MM-DD": "..." }
  seedDayNotes: {
    '2026-02-09': 'שיעור פרטי 17:30–19:00\nשיר\nרון\nנועם\nנועם',
    '2026-02-10': 'שיעור פרטי 17:30–19:00\nמירב\nשגיא',
    '2026-02-11': 'שיעור פרטי 19:00–20:30\nנועם',
  },

  // Calendar events shown in weekly + monthly views (without touching day notes).
  // style: vacation | blue | red
  calendarEvents: [
    { date: '2026-02-15', text: 'השתלמות בית ספר טדי 15:00' },

    { date: '2026-02-22', text: 'מסיבת פורים למורים' },
    { date: '2026-02-25', text: 'מסיבת פורים למורים' },
    { date: '2026-03-01', text: 'מסיבת פורים בבית הספר' },

    { start: '2026-03-03', end: '2026-03-04', style: 'vacation', text: 'חופשת פורים' },
    { date: '2026-03-08', text: 'השתלמות בית ספר טדי\n14:00–15:30' },
    { date: '2026-03-10', style: 'red', text: 'יום עיון עם איילת' },
    { date: '2026-03-15', text: 'ישיבת חדר מורים' },
    { start: '2026-03-17', end: '2026-03-18', text: 'טיול שכבת ז' },
    { date: '2026-03-22', text: 'טיול למורים' },
    { date: '2026-03-23', text: 'ישיבות ט פדגוגיות\nמל"ל' },

    { start: '2026-03-24', end: '2026-04-08', style: 'vacation', text: 'חופשת פסח' },
    { date: '2026-04-12', text: 'התכנסות ליום השואה' },
    { date: '2026-04-14', text: 'יום השואה' },
    { date: '2026-04-19', text: 'רבעון\nיום הורים' },
    { date: '2026-04-20', text: 'ישיבות ח פדגוגיות\nמל"ל' },
    { date: '2026-04-21', style: 'blue', text: 'יום הזיכרון' },
    { date: '2026-04-22', style: 'blue', text: 'יום העצמאות' },

    { date: '2026-04-26', text: 'מפגש חדר מורים' },
    { date: '2026-04-27', text: 'ישיבה פדגוגית ז\nמל"ל' },
    { start: '2026-04-29', end: '2026-04-30', text: 'מסע ט\nמסע תקומה' },

    { date: '2026-05-03', text: 'מפגש חדר מורים' },
    { date: '2026-05-13', text: 'גיחה ח' },
    { date: '2026-05-14', text: 'יום ישראל' },
    { date: '2026-05-17', text: 'חדר מורים\nגיוס כוחות' },
    { start: '2026-05-21', end: '2026-05-23', style: 'vacation', text: 'חופשת שבועות' },
    { date: '2026-05-24', text: 'מיפוי ז-ט' },
    { date: '2026-05-27', text: 'מסיבת ביום ט' },

    { date: '2026-06-07', text: 'סיכום פדגוגי' },
    { date: '2026-06-09', text: 'סיכום גשרים' },
    { date: '2026-06-14', text: 'חדר מורים\nפרידה' },
    { date: '2026-06-18', text: 'תעודות סוף שנה' },
  ],
};
