/* North Star — personal life planner. Vanilla JS, data stored on this device (localStorage). */
'use strict';

const KEY = 'northstar.v1';
const MAX_TODAY = 3;
const AREA_ORDER = ['family', 'side', 'money', 'career', 'growth']; // priority for Today suggestions

/* ---------------- helpers ---------------- */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let _n = 0;
const uid = () => Date.now().toString(36) + (_n++).toString(36) + Math.random().toString(36).slice(2, 6);
const pad = (n) => String(n).padStart(2, '0');
const ds = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const todayKey = () => ds(new Date());
const mondayOf = (d) => addDays(d, -((d.getDay() + 6) % 7));
const lastSunday = (d = new Date()) => addDays(d, -d.getDay());
const planWeek = () => ds(addDays(lastSunday(), 1));     // week you're planning/living (Mon)
const reviewWeek = () => ds(addDays(lastSunday(), -6));  // week that just ended / ends today (Mon)
const fmt = (s, o = { month: 'short', day: 'numeric' }) => parse(s).toLocaleDateString('en-CA', o);
const weekRange = (mon) => `${fmt(mon)} – ${fmt(ds(addDays(parse(mon), 6)))}`;
const daysUntil = (s) => Math.round((parse(s) - parse(todayKey())) / 864e5);
const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-CA');
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const sum = (arr, k) => arr.reduce((a, e) => a + num(e[k]), 0);
const inWeek = (dateStr, mon) => dateStr && dateStr >= mon && dateStr <= ds(addDays(parse(mon), 6));
const TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const STAR = '<svg class="star-svg" viewBox="0 0 24 24" fill="#f6d48c"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z"/></svg>';

/* ---------------- starter plan ----------------
   This is a neutral starter plan, safe to publish. Your real plan lives in a private
   backup file (my-plan.json) that you import once via Settings → Import. */
function seed() {
  const t = (title, size = 'quick') => ({ id: uid(), title, size, done: false, doneAt: null });
  const g = (title, tasks, extra = {}) => ({ id: uid(), title, tasks, status: 'active', note: '', ...extra });

  const areas = [
    { id: 'family', name: 'Family & Home', emoji: '🏡', why: 'A settled, happy home.', trackers: ['apt'], goals: [
      g('Find a new home', [
        t('Set saved searches for the areas you like'),
        t('Shortlist 5 listings in the Apartment tracker'),
        t('Book 3 viewings'),
        t('Gather rental docs: job letter, pay stubs, credit report', 'focus'),
        t('Sign the lease', 'focus'),
      ]),
      g('Moving week', [
        t('Book movers or a van'),
        t('Set up hydro & internet at the new place'),
        t('Get tenant insurance'),
        t('Update your address everywhere'),
      ]),
    ] },
    { id: 'money', name: 'Money', emoji: '💳', why: 'Calm, simple finances.', trackers: ['card', 'loan', 'uber'], goals: [
      g('Clear the credit card', [
        t('Pick a weekly card payment'),
        t('Turn on autopay for at least the minimum'),
        t('Make the final payment — card cleared!'),
      ], { note: 'Log payments in Trackers → Card' }),
      g('Build a monthly budget', [
        t('List fixed monthly costs', 'focus'),
        t('Draft next month’s budget', 'focus'),
        t('Set an automatic transfer to savings'),
      ]),
      g('Pay down the loan', [t('Write down balance, rate & payment date'), t('Log each payment in Trackers → Loan')]),
      g('Weekly side-income log', [t('Log side income each Sunday (in Review)')]),
    ] },
    { id: 'career', name: 'Career', emoji: '🚀', why: 'Grow into the next role.', trackers: ['copilot'], goals: [
      g('Build AI workflows at work', [
        t('List 5 repetitive tasks at work'),
        t('Build workflow #1', 'focus'),
        t('Note the time it saves'),
      ]),
      g('Career chat with my manager', [
        t('Write 3 talking points: wins, growth, next role'),
        t('Book the chat'),
        t('Have the chat & write down next steps', 'focus'),
      ]),
      g('Portfolio case studies', [t('Pick 2 projects with measurable results'), t('Write case study #1', 'focus')]),
    ] },
    { id: 'side', name: 'Side Projects', emoji: '💼', why: 'Build options beyond the 9–5.', trackers: ['sk'], goals: [
      g('Test one idea', [
        t('Make sure every sign-up is tracked', 'focus'),
        t('Log sign-ups in Trackers'),
        t('Decide: scale, tweak or stop'),
      ]),
    ] },
    { id: 'growth', name: 'Personal Growth', emoji: '🌱', why: 'Keep growing, gently.', trackers: ['books'], goals: [
      g('Read 1–2 books a month', [t('Pick the next book or audiobook')]),
      g('Move your body', [t('Find a weekly game or class')]),
    ] },
  ];

  const s = {
    v: 1,
    starter: true,
    created: todayKey(),
    northStar: 'Write your North Star in Settings — where do you want to be in a year?',
    northStarDate: ds(addDays(new Date(), 365)),
    profile: {
      name: '', leaseEnd: '', moveIn: '', rentBudget: 0, hoods: [],
      homeChip: '🏡 Settled home', roleChip: '💼 Next role',
      restNote: 'Recharge, see the people you love, and take 15 minutes for your review.',
      winHint: 'e.g. A good walk with family', skName: '', gig: '',
    },
    areas,
    habits: [
      { id: 'news', name: 'News', emoji: '📰', freq: 'daily' },
      { id: 'audio', name: 'Audiobook', emoji: '🎧', freq: 'daily', days: [1, 2, 3, 4, 5, 6] },
      { id: 'faith', name: 'Reflection', emoji: '🙏', freq: 'weekly' },
      { id: 'ball', name: 'Exercise', emoji: '⚽', freq: 'weekly' },
    ],
    habitLog: {},
    days: {},
    weeks: {},
    trackers: { apt: [], card: [], loan: [], uber: [], books: [], copilot: [], sk: [] },
    config: { cardStart: 1000, loanStart: 5000, bookGoal: 2, copilotGoal: 5 },
    settings: { theme: 'auto' },
    lastBackup: null,
  };

  const find = (frag) => { for (const a of areas) for (const gl of a.goals) for (const tk of gl.tasks) if (tk.title.includes(frag)) return { tk, a }; };
  s.weeks[planWeek()] = {
    big3: ['Shortlist 5 listings', 'every sign-up is tracked', 'List fixed monthly'].map((f) => {
      const r = find(f); return { id: uid(), title: r.tk.title, taskId: r.tk.id, areaId: r.a.id, done: false };
    }),
    wins: [], reviewed: null,
  };
  return s;
}

/* ---------------- state ---------------- */
let S = load();
let ui = { addOpen: false, edit: false, focus: null };

function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return migrate(JSON.parse(raw)); } catch (e) { console.warn(e); }
  const s = seed(); persist(s); return s;
}
function migrate(s) {
  const base = seed();
  for (const k of ['habits', 'habitLog', 'days', 'weeks', 'config', 'settings']) if (s[k] == null) s[k] = base[k];
  s.trackers = Object.assign({ apt: [], card: [], loan: [], uber: [], books: [], copilot: [], sk: [] }, s.trackers || {});
  s.config = Object.assign({}, base.config, s.config);
  s.profile = Object.assign({}, base.profile, s.profile);
  s.northStar ||= base.northStar; s.northStarDate ||= base.northStarDate;
  // keep the stored days small: drop day plans older than 90 days
  const cutoff = ds(addDays(new Date(), -90));
  for (const k of Object.keys(s.days)) if (k < cutoff) delete s.days[k];
  return s;
}
function persist(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { toast('Could not save — storage full?'); } }
function save() { persist(S); }

const area = (id) => S.areas.find((a) => a.id === id);
const P = () => S.profile;
const budget = () => num(P().rentBudget);
const gig = () => P().gig || 'Side job';
function findTask(id) {
  for (const a of S.areas) for (const g of a.goals) { const t = g.tasks.find((x) => x.id === id); if (t) return { task: t, goal: g, area: a }; }
  return null;
}
function areaStats(a) {
  let total = 0, done = 0;
  a.goals.filter((g) => g.status !== 'paused').forEach((g) => g.tasks.forEach((t) => { total++; if (t.done) done++; }));
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}
function nextTask(a) {
  for (const g of a.goals) if (g.status !== 'paused') { const t = g.tasks.find((x) => !x.done); if (t) return t; }
  return null;
}
function week(key) { return (S.weeks[key] ||= { big3: [], wins: [], reviewed: null }); }
function bigDone(b) { if (b.taskId) { const f = findTask(b.taskId); if (f) return f.task.done; } return !!b.done; }

/* ---------------- day profile (fits your schedule) ---------------- */
function profile(d = new Date()) {
  const w = d.getDay();
  if (w === 0) return {
    kind: 'rest', label: 'Rest day', auto: 0, sizes: ['quick'],
    hint: 'Sundays are for rest and family. Your only job today: a gentle Sunday Review.',
    slots: ['Gently, if you feel like it', 'Optional', 'Optional'],
    sched: [['Rest & family', 6, 'rest'], ['Review', 2, 'you'], ['Rest', 3, 'rest']],
  };
  if (w === 6) return {
    kind: 'sat', label: 'Saturday', auto: 3, sizes: ['focus', 'quick'],
    hint: `${gig()} noon – 10pm. Use the morning for one focused task.`,
    slots: ['Morning focus · 9–10:30', 'Quick win · before 11:30', 'Quick win · before noon'],
    sched: [['You', 3, 'you'], [`${gig()} 12–10`, 10, '']],
  };
  const office = w === 2 || w === 4;
  return {
    kind: office ? 'office' : 'home', label: office ? 'Office day' : 'Home day', auto: 3, sizes: ['quick'],
    hint: office ? `Work till 5 · ${gig()} 6–10pm. 🎧 Audiobook on the commute.` : `Work till 5 · ${gig()} 6–10pm. Short tasks only.`,
    slots: ['Lunch break · 15 min', `5:00–5:45 · before ${gig()}`, 'After 10pm · only if you have energy'],
    sched: [['Work 9–5', 8, ''], ['You', 1, 'you'], [`${gig()} 6–10`, 4, '']],
  };
}

function candidates(prof, exclude) {
  const ok = (t) => t && !t.done && !exclude.has(t.id) && prof.sizes.includes(t.size);
  const out = [];
  const push = (t) => { if (ok(t) && !out.includes(t)) out.push(t); };
  (week(planWeek()).big3 || []).forEach((b) => b.taskId && push(findTask(b.taskId)?.task)); // Big 3 first
  const lists = AREA_ORDER.map((id) => {
    const a = area(id); if (!a) return [];
    return a.goals.filter((g) => g.status !== 'paused').map((g) => g.tasks.find((t) => !t.done)).filter(Boolean);
  });
  const depth = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < depth; i++) lists.forEach((l) => push(l[i])); // round-robin across areas
  // Saturday: lead with one focus task
  // Saturday: lead with ONE focus task, then quick wins (other focus tasks only as later swaps)
  if (prof.kind === 'sat') {
    const f = out.find((t) => t.size === 'focus');
    const rest = out.filter((t) => t !== f);
    return [...(f ? [f] : []), ...rest.filter((t) => t.size === 'quick'), ...rest.filter((t) => t.size === 'focus')];
  }
  return out;
}
function ensureDay() {
  const k = todayKey();
  if (!S.days[k]) {
    const prof = profile();
    const picks = candidates(prof, new Set()).slice(0, prof.auto);
    S.days[k] = { items: picks.map((t) => ({ taskId: t.id })), skipped: [] };
    save();
  }
  return S.days[k];
}
function dayItems(day) {
  return day.items.map((it, i) => {
    if (it.custom) return { i, custom: true, id: it.id, title: it.title, done: it.done, areaId: 'none' };
    const f = findTask(it.taskId); if (!f) return null;
    return { i, id: f.task.id, title: f.task.title, done: f.task.done, size: f.task.size, areaId: f.area.id, area: f.area };
  }).filter(Boolean);
}
const usedIds = (day) => new Set([...day.items.filter((x) => x.taskId).map((x) => x.taskId), ...day.skipped]);

/* ---------------- habits ---------------- */
function habitShown(h, d = new Date()) { return !h.days || h.days.includes(d.getDay()); }
function habitDone(h) {
  if (h.freq === 'weekly') {
    const mon = mondayOf(new Date());
    for (let i = 0; i < 7; i++) if ((S.habitLog[ds(addDays(mon, i))] || []).includes(h.id)) return true;
    return false;
  }
  return (S.habitLog[todayKey()] || []).includes(h.id);
}

/* ---------------- trackers ---------------- */
const APT_ST = ['Saved', 'Viewing booked', 'Viewed', 'Applied', 'Approved', 'Signed ✓', 'Not for us'];
const BOOK_ST = ['Want to read', 'Reading', 'Finished'];
const T = {
  apt: { name: 'Apartment', emoji: '🏠', area: 'family', add: 'Add a listing',
    fields: [
      { k: 'name', l: 'Address or listing', type: 'text', req: 1, ph: 'e.g. 12 Main St, unit 1204' },
      { k: 'hood', l: 'Area', type: 'select', get opts() { return [...(P().hoods || []), 'Other']; } },
      { k: 'rent', l: 'Rent ($/month)', type: 'number', get ph() { return budget() ? String(budget()) : ''; } },
      { k: 'status', l: 'Status', type: 'select', opts: APT_ST },
      { k: 'link', l: 'Link (optional)', type: 'url', ph: 'https://' },
      { k: 'notes', l: 'Notes', type: 'text', ph: 'Near TTC? Laundry? Parking?' },
    ],
    cycle: { k: 'status', opts: APT_ST },
    row: (e) => ({ t: e.name, s: [e.hood, e.rent ? money(e.rent) + '/mo' : '', e.notes].filter(Boolean).join(' · '), pill: e.status, pillCls: e.status === 'Signed ✓' || e.status === 'Approved' ? 'ok' : (budget() && num(e.rent) > budget() ? 'warn' : ''), link: e.link }),
    summary: (l) => {
      const { leaseEnd, moveIn } = P(); const signed = l.some((e) => e.status === 'Signed ✓');
      const active = l.filter((e) => e.status !== 'Not for us');
      const viewings = l.filter((e) => ['Viewing booked', 'Viewed', 'Applied', 'Approved', 'Signed ✓'].includes(e.status)).length;
      const d = leaseEnd ? daysUntil(leaseEnd) : null;
      const head = signed ? '🎉 Lease signed for the new place!'
        : leaseEnd ? `Lease ends <b>${fmt(leaseEnd, { month: 'long', day: 'numeric' })}</b>${moveIn ? ` · move in ${fmt(moveIn, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}` : 'Your apartment search';
      const big = signed ? 'Home found' : d === null ? `${active.length} listing${active.length === 1 ? '' : 's'}` : d >= 0 ? `${d} days left` : 'Lease ended';
      return `<div class="muted small">${head}</div>
        <div class="big-num" style="margin:6px 0 12px">${big}</div>
        <div class="stat-row"><div class="stat"><b>${active.length}</b><span>listings</span></div><div class="stat"><b>${viewings}</b><span>viewings+</span></div>${budget() ? `<div class="stat"><b>${active.filter((e) => e.rent && num(e.rent) <= budget()).length}</b><span>≤ ${money(budget())}</span></div>` : ''}</div>`;
    } },
  card: { name: 'Card', emoji: '💳', area: 'money', add: 'Log a card payment',
    fields: [{ k: 'date', l: 'Date', type: 'date' }, { k: 'amount', l: 'Amount ($)', type: 'number', req: 1, ph: '100' }, { k: 'note', l: 'Note', type: 'text', ph: 'From this week' }],
    row: (e) => ({ t: money(e.amount) + ' paid', s: [fmt(e.date, { month: 'short', day: 'numeric', year: 'numeric' }), e.note].filter(Boolean).join(' · ') }),
    summary: (l) => payoff(l, S.config.cardStart, 'cardStart', 'credit card', 'Card cleared! 🎉') },
  loan: { name: 'Loan', emoji: '🏦', area: 'money', add: 'Log a loan payment',
    fields: [{ k: 'date', l: 'Date', type: 'date' }, { k: 'amount', l: 'Amount ($)', type: 'number', req: 1, ph: '300' }, { k: 'note', l: 'Note', type: 'text' }],
    row: (e) => ({ t: money(e.amount) + ' paid', s: [fmt(e.date, { month: 'short', day: 'numeric', year: 'numeric' }), e.note].filter(Boolean).join(' · ') }),
    summary: (l) => payoff(l, S.config.loanStart, 'loanStart', 'loan', 'Loan paid off! 🎉') },
  uber: { get name() { return gig(); }, emoji: '🛵', area: 'money', add: 'Log a week',
    fields: [{ k: 'date', l: 'Week of (Monday)', type: 'date' }, { k: 'amount', l: 'Earnings ($)', type: 'number', req: 1, ph: '450' }, { k: 'hours', l: 'Hours (optional)', type: 'number', ph: '22' }],
    row: (e) => ({ t: money(e.amount), s: ['Week of ' + fmt(e.date), e.hours ? `${e.hours} h · ${money(num(e.amount) / num(e.hours))}/h` : ''].filter(Boolean).join(' · ') }),
    summary: (l) => {
      const total = sum(l, 'amount'); const avg = l.length ? total / l.length : 0;
      const month = l.filter((e) => e.date && e.date.slice(0, 7) === todayKey().slice(0, 7));
      const last = [...l].sort((a, b) => (a.date > b.date ? 1 : -1)).slice(-8);
      return `<div class="stat-row"><div class="stat"><b>${money(avg)}</b><span>avg / week</span></div><div class="stat"><b>${money(sum(month, 'amount'))}</b><span>this month</span></div><div class="stat"><b>${money(total)}</b><span>all time</span></div></div>
        ${bars(last.map((e) => ({ l: fmt(e.date), v: num(e.amount), x: money(e.amount) })))}`;
    } },
  books: { name: 'Books', emoji: '📚', area: 'growth', add: 'Add a book',
    fields: [
      { k: 'title', l: 'Title', type: 'text', req: 1 }, { k: 'author', l: 'Author', type: 'text' },
      { k: 'format', l: 'Format', type: 'select', opts: ['Audiobook', 'Book', 'Ebook'] },
      { k: 'status', l: 'Status', type: 'select', opts: BOOK_ST, def: 'Reading' }, { k: 'date', l: 'Finished on', type: 'date', blank: 1 },
    ],
    cycle: { k: 'status', opts: BOOK_ST },
    row: (e) => ({ t: e.title, s: [e.author, e.format, e.status === 'Finished' && e.date ? 'finished ' + fmt(e.date) : ''].filter(Boolean).join(' · '), pill: e.status, pillCls: e.status === 'Finished' ? 'ok' : '' }),
    summary: (l) => {
      const fin = l.filter((e) => e.status === 'Finished');
      const m = fin.filter((e) => (e.date || '').slice(0, 7) === todayKey().slice(0, 7)).length;
      const y = fin.filter((e) => (e.date || '').slice(0, 4) === todayKey().slice(0, 4)).length;
      const reading = l.find((e) => e.status === 'Reading');
      const goal = S.config.bookGoal;
      return `<div class="muted small">This month · goal ${goal}</div><div class="big-num" style="margin:4px 0 10px">${m} / ${goal} ${m >= goal ? '🎉' : ''}</div>
        <div class="bar thick a-growth"><i style="width:${Math.min(100, (m / goal) * 100)}%"></i></div>
        <div class="stat-row" style="margin-top:12px"><div class="stat"><b>${y}</b><span>finished this year</span></div><div class="stat"><b style="font-size:15px;line-height:1.3">${reading ? esc(reading.title) : '—'}</b><span>reading now</span></div></div>`;
    } },
  copilot: { name: 'Copilot', emoji: '🤖', area: 'career', add: 'Add a workflow',
    fields: [{ k: 'name', l: 'Workflow name', type: 'text', req: 1, ph: 'Content brief drafter' }, { k: 'purpose', l: 'What it does', type: 'text' }, { k: 'mins', l: 'Minutes saved per week', type: 'number', ph: '60' }, { k: 'date', l: 'Built on', type: 'date' }],
    row: (e) => ({ t: e.name, s: [e.purpose, e.mins ? `saves ${e.mins} min/wk` : '', fmt(e.date)].filter(Boolean).join(' · ') }),
    summary: (l) => {
      const goal = S.config.copilotGoal; const mins = sum(l, 'mins');
      return `<div class="muted small">Workflows built · goal ${goal}</div><div class="big-num" style="margin:4px 0 10px">${l.length} / ${goal}</div>
        <div class="bar thick a-career"><i style="width:${Math.min(100, (l.length / goal) * 100)}%"></i></div>
        <div class="stat-row" style="margin-top:12px"><div class="stat"><b>${(mins / 60).toFixed(1)} h</b><span>saved per week</span></div><div class="stat"><b>${Math.round((mins * 52) / 60)} h</b><span>per year — great for your case studies</span></div></div>`;
    } },
  sk: { get name() { return P().skName || 'Sign-ups'; }, emoji: '📈', area: 'side', add: 'Log sign-ups',
    fields: [{ k: 'date', l: 'Date', type: 'date' }, { k: 'count', l: 'Sign-ups', type: 'number', req: 1, ph: '3' }, { k: 'spend', l: 'Ad spend ($, optional)', type: 'number', ph: '20' },
      { k: 'source', l: 'Source', type: 'select', opts: ['Meta ad', 'Organic', 'Referral', 'Other'] }, { k: 'note', l: 'Note', type: 'text' }],
    row: (e) => ({ t: `${num(e.count)} sign-up${num(e.count) === 1 ? '' : 's'}`, s: [fmt(e.date), e.source, e.spend ? money(e.spend) + ' spend' : '', e.note].filter(Boolean).join(' · ') }),
    summary: (l) => {
      const total = sum(l, 'count'); const meta = l.filter((e) => e.source === 'Meta ad');
      const ms = sum(meta, 'spend'); const mc = sum(meta, 'count');
      const byWeek = {}; l.forEach((e) => { const w = ds(mondayOf(parse(e.date))); byWeek[w] = (byWeek[w] || 0) + num(e.count); });
      const pts = Object.keys(byWeek).sort().slice(-8).map((w) => ({ l: fmt(w), v: byWeek[w], x: byWeek[w] }));
      return `<div class="stat-row"><div class="stat"><b>${total}</b><span>total sign-ups</span></div><div class="stat"><b>${money(ms)}</b><span>Meta spend</span></div><div class="stat"><b>${mc ? '$' + (ms / mc).toFixed(2) : '—'}</b><span>per Meta sign-up</span></div></div>
        ${pts.length ? `<div class="tiny muted" style="margin-top:14px">Sign-ups per week</div>${bars(pts)}` : ''}`;
    } },
};
function payoff(l, start, key, label, doneMsg) {
  const paid = sum(l, 'amount'); const left = Math.max(0, start - paid); const pct = start ? Math.min(100, (paid / start) * 100) : 0;
  return `<div class="muted small">Left on the ${label}</div>
    <div class="big-num" style="margin:4px 0 10px">${left <= 0 ? doneMsg : money(left)}</div>
    <div class="bar thick a-money"><i style="width:${pct}%"></i></div>
    <div class="row-between tiny muted" style="display:flex;justify-content:space-between;margin-top:8px"><span>Paid ${money(paid)} of ${money(start)} · ${Math.round(pct)}%</span>
    <button class="pill" data-act="editStart" data-k="${key}">Edit start</button></div>`;
}
function bars(pts) {
  if (!pts.length) return '';
  const max = Math.max(...pts.map((p) => p.v), 1);
  return `<div class="bars">${pts.map((p) => `<div class="b"><em>${esc(p.x ?? p.v)}</em><i style="height:${Math.max(4, (p.v / max) * 78)}%"></i><span>${esc(p.l)}</span></div>`).join('')}</div>`;
}
function sortedEntries(k) {
  return [...S.trackers[k]].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.ts || 0) - (a.ts || 0));
}

/* ---------------- views ---------------- */
function vHome() {
  const nsDate = parse(S.northStarDate); const n = new Date();
  const months = (nsDate.getFullYear() - n.getFullYear()) * 12 + (nsDate.getMonth() - n.getMonth());
  const cardLeft = Math.max(0, S.config.cardStart - sum(S.trackers.card, 'amount'));
  const pw = planWeek(); const b3 = week(pw).big3;
  const leaseDays = P().leaseEnd ? daysUntil(P().leaseEnd) : -1; const signed = S.trackers.apt.some((e) => e.status === 'Signed ✓');
  const day = ensureDay(); const items = dayItems(day); const tDone = items.filter((x) => x.done).length;

  return `
  <div class="top">
    <div><div class="sub">${new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}</div><h1>Hi${P().name ? ' ' + esc(P().name) : ' there'}</h1></div>
    <a class="icon-btn" href="#settings" aria-label="Settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></a>
  </div>

  <section class="hero" aria-label="North Star">
    <div class="countdown"><b>${months > 0 ? months : '⭐'}</b>${months > 0 ? 'months to go' : 'this is it'}</div>
    <div class="eyebrow">${STAR} North Star · ${nsDate.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })}</div>
    <p class="goal">${esc(S.northStar)}</p>
    <div class="chips">
      <span class="chip">${signed ? '🏡 New home ✓' : esc(P().homeChip)}</span>
      <span class="chip">💳 ${cardLeft <= 0 ? 'Card cleared ✓' : money(cardLeft) + ' to go'}</span>
      <span class="chip">${esc(P().roleChip)}</span>
    </div>
  </section>

  ${S.starter ? `<div class="card" style="background:var(--accent-soft);border-color:transparent">
    <b>👋 Welcome to North Star</b>
    <p class="small muted" style="margin:4px 0 12px">Have your plan file (my-plan.json)? Import it to load your goals, trackers and Big 3.</p>
    <button class="btn block" data-act="import">⬆ Import my plan</button>
  </div>` : ''}

  ${!signed && leaseDays >= 0 && leaseDays <= 75 ? `<a class="banner" href="#trackers/apt"><span class="big">🏠</span><div><b>Lease ends in ${leaseDays} days</b><div class="small muted">${S.trackers.apt.length ? S.trackers.apt.length + ' listing' + (S.trackers.apt.length === 1 ? '' : 's') + ' tracked' : 'Start your apartment shortlist'}</div></div><span class="arrow">›</span></a>` : ''}

  <a class="card banner" href="#today" style="background:var(--surface);border-color:var(--line)">
    <span class="big">☀️</span><div><b>Today · ${tDone} of ${items.length} done</b><div class="small muted">${items.length ? esc((items.find((x) => !x.done) || items[0]).title) : profile().kind === 'rest' ? 'Rest day — just your Sunday Review' : 'Nothing planned yet'}</div></div><span class="arrow">›</span>
  </a>

  <div class="h2"><span>This week’s Big 3 · ${weekRange(pw)}</span><a href="#review">Edit</a></div>
  <div class="card tight list">
    ${b3.length ? b3.map((b, i) => bigRow(b, i, pw)).join('') : `<div class="empty">No Big 3 yet. <a href="#review">Set them in Review</a></div>`}
  </div>

  <div class="h2"><span>Life areas</span></div>
  ${S.areas.map((a) => { const st = areaStats(a); const nt = nextTask(a); return `
    <a class="area a-${a.id}" href="#area/${a.id}">
      <div class="row"><div class="tile">${a.emoji}</div>
        <div class="meta"><div class="name">${esc(a.name)}</div><div class="next">${nt ? 'Next: ' + esc(nt.title) : 'All done here ✨'}</div></div>
        <div class="pct">${st.pct}%</div></div>
      <div class="bar"><i style="width:${st.pct}%"></i></div>
    </a>`; }).join('')}
  `;
}

function bigRow(b, i, wk) {
  const done = bigDone(b); const a = b.areaId ? area(b.areaId) : null;
  return `<div class="task a-${a ? a.id : 'none'} ${done ? 'done' : ''}">
    <button class="check" data-act="toggleBig" data-w="${wk}" data-i="${i}" aria-label="${done ? 'Mark not done' : 'Mark done'}">${TICK}</button>
    <div class="body"><div class="title">${esc(b.title)}</div>${a ? `<div class="hint"><span class="dot"></span>${esc(a.name)}</div>` : ''}</div>
  </div>`;
}

function vToday() {
  const prof = profile(); const day = ensureDay(); const items = dayItems(day);
  const done = items.filter((x) => x.done).length; const total = Math.max(items.length, 1);
  const C = 2 * Math.PI * 30; const off = C * (1 - done / total);
  const habits = S.habits.filter((h) => habitShown(h));
  const room = items.length < MAX_TODAY;
  const sugg = ui.addOpen && room ? candidates({ ...prof, sizes: ['quick', 'focus'] }, usedIds(day)).slice(0, 5) : [];

  return `
  <div class="top"><div><div class="sub">${new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}</div><h1>Today</h1></div></div>
  <div class="card">
    <div class="today-head">
      <div class="ring"><svg viewBox="0 0 72 72"><circle class="bg" cx="36" cy="36" r="30"/><circle class="fg" cx="36" cy="36" r="30" stroke-dasharray="${C}" stroke-dashoffset="${items.length ? off : C}"/></svg><div class="lbl">${done}/${items.length}</div></div>
      <div><b>${prof.label}</b><div class="small muted">${prof.hint}</div></div>
    </div>
    <div class="sched">${prof.sched.map(([l, f, c]) => `<div class="${c}" style="flex:${f}">${l}</div>`).join('')}</div>
  </div>

  ${prof.kind === 'rest' && !items.length ? `
    <div class="card rest-card"><div class="e">🌿</div><h3>Rest. You’ve earned it.</h3>
      <p class="muted small">${esc(P().restNote)}</p>
      <div class="btn-row" style="margin-top:16px"><a class="btn" href="#review">Start Sunday Review</a></div>
    </div>` : ''}

  ${items.length ? `<div class="h2"><span>Up to 3 small things</span></div>
  <div class="card tight list">
    ${items.map((x) => `
      <div class="task a-${x.areaId} ${x.done ? 'done' : ''}">
        <button class="check" data-act="${x.custom ? 'toggleCustom' : 'toggleTask'}" data-id="${x.id}" aria-label="Done">${TICK}</button>
        <div class="body"><div class="title">${esc(x.title)}</div>
          <div class="hint">${x.area ? `<span class="dot"></span>${esc(x.area.name)} ·` : ''} ${esc(prof.slots[x.i] || '')}</div></div>
        ${x.done ? '' : `${x.custom ? '' : `<button class="icon-btn" data-act="swap" data-i="${x.i}" aria-label="Swap for another task" title="Swap">⇄</button>`}
        <button class="icon-btn" data-act="removeToday" data-i="${x.i}" aria-label="Remove from today" title="Remove">✕</button>`}
      </div>`).join('')}
  </div>` : ''}

  ${done && done === items.length && items.length ? `<p class="empty">✨ All done. That’s a good day — rest now.</p>` : ''}

  ${room ? (ui.addOpen ? `
    <div class="card">
      <div class="small muted" style="margin-bottom:10px">Pick a next step${prof.kind === 'sat' ? '' : ' (keep it small)'}:</div>
      <div class="sugg">${sugg.map((t) => { const f = findTask(t.id); return `<button class="a-${f.area.id}" data-act="addToday" data-id="${t.id}"><span class="dot"></span><span>${esc(t.title)}${t.size === 'focus' ? ' <span class="pill">Focus</span>' : ''}</span><span class="plus">+</span></button>`; }).join('') || '<div class="empty">Everything is done or planned!</div>'}</div>
      <form class="add-row" data-form="todayCustom"><input type="text" name="title" placeholder="Or type your own…" maxlength="120" autocomplete="off"><button class="btn">Add</button></form>
      <button class="btn ghost block" style="margin-top:10px" data-act="closeAdd">Close</button>
    </div>` : `<button class="btn soft block" data-act="openAdd">+ ${items.length ? 'Add a task' : prof.kind === 'rest' ? 'Add one small task anyway' : 'Add a task'} (${items.length}/${MAX_TODAY})</button>`) : ''}

  <div class="h2"><span>Gentle rhythms</span></div>
  <div class="habits">${habits.map((h) => `<button class="habit ${habitDone(h) ? 'on' : ''}" data-act="toggleHabit" data-id="${h.id}"><span class="e">${h.emoji}</span><span><span class="n">${esc(h.name)}</span><br><span class="w">${h.freq === 'weekly' ? 'once this week' : 'today'}</span></span></button>`).join('')}</div>
  <p class="tiny muted" style="margin:10px 4px">Rhythms don’t count toward your 3 tasks.</p>
  `;
}

function vArea(id) {
  const a = area(id); if (!a) return vHome();
  const st = areaStats(a);
  return `
  <a class="back" href="#home">‹ Home</a>
  <div class="card a-${a.id}" style="margin-top:6px">
    <div class="row" style="display:flex;gap:12px;align-items:center"><div class="tile">${a.emoji}</div>
      <div style="flex:1"><h1 style="font-size:22px">${esc(a.name)}</h1><div class="small muted">${esc(a.why)}</div></div>
      <div style="font-weight:750;font-size:20px;color:var(--c)">${st.pct}%</div></div>
    <div class="bar thick" style="margin-top:14px"><i style="width:${st.pct}%"></i></div>
    <div class="tiny muted" style="margin-top:8px">${st.done} of ${st.total} steps done</div>
    ${a.trackers.length ? `<div class="btn-row" style="margin-top:12px">${a.trackers.map((k) => `<a class="btn ghost" style="min-height:44px;font-size:14.5px" href="#trackers/${k}">${T[k].emoji} ${T[k].name}</a>`).join('')}</div>` : ''}
  </div>

  ${a.goals.map((g) => { const d = g.tasks.filter((t) => t.done).length; const paused = g.status === 'paused'; return `
  <div class="card a-${a.id} ${paused ? 'paused' : ''}">
    <div class="goal-head"><h3>${esc(g.title)} ${paused ? '<span class="pill">On hold</span>' : ''}</h3><span class="count">${d}/${g.tasks.length}</span></div>
    ${g.note ? `<div class="tiny muted" style="margin-top:2px">${esc(g.note)}</div>` : ''}
    <div class="list" style="margin-top:6px">
      ${g.tasks.map((t) => `
        <div class="task ${t.done ? 'done' : ''}">
          <button class="check" data-act="toggleTask" data-id="${t.id}" aria-label="Done">${TICK}</button>
          <div class="body"><div class="title">${esc(t.title)}</div></div>
          <button class="pill ${t.size === 'focus' ? 'c' : ''}" data-act="toggleSize" data-id="${t.id}" title="Quick ≈ 15 min · Focus ≈ 30–60 min">${t.size === 'focus' ? 'Focus' : 'Quick'}</button>
          ${ui.edit ? `<button class="icon-btn" data-act="delTask" data-id="${t.id}" aria-label="Delete task">🗑</button>` : ''}
        </div>`).join('')}
    </div>
    <form class="add-row" data-form="addTask" data-goal="${g.id}"><input type="text" name="title" placeholder="+ Add a step" maxlength="140" autocomplete="off"><button class="btn ghost">Add</button></form>
    ${ui.edit ? `<div class="btn-row" style="margin-top:10px"><button class="btn ghost" data-act="pauseGoal" data-id="${g.id}">${paused ? 'Resume goal' : 'Put on hold'}</button><button class="btn danger" data-act="delGoal" data-id="${g.id}">Delete goal</button></div>` : ''}
  </div>`; }).join('')}

  ${ui.edit ? `<div class="card"><form data-form="addGoal" data-area="${a.id}"><label class="f">New goal</label><div class="inline"><input type="text" name="title" placeholder="e.g. Open a TFSA" maxlength="120" required><button class="btn">Add</button></div></form></div>` : ''}
  <button class="btn ghost block" data-act="editMode">${ui.edit ? 'Done editing' : 'Edit goals'}</button>
  <p class="tiny muted" style="margin:12px 4px">Tip: tap “Quick/Focus” to change a step’s size. Weekdays only suggest Quick steps; Saturday mornings get one Focus step.</p>
  `;
}

function vReview() {
  const rw = reviewWeek(); const pw = planWeek(); const W = week(rw); const P = week(pw);
  const isSun = new Date().getDay() === 0;
  const doneThisWeek = [];
  S.areas.forEach((a) => a.goals.forEach((g) => g.tasks.forEach((t) => { if (t.done && inWeek(t.doneAt, rw)) doneThisWeek.push({ t, a }); })));
  const uberE = S.trackers.uber.find((e) => e.wk === rw); const skE = S.trackers.sk.find((e) => e.wk === rw);
  const prof = { kind: 'review', sizes: ['quick', 'focus'] };
  const inBig = new Set(P.big3.map((b) => b.taskId).filter(Boolean));
  const sugg = P.big3.length < 3 ? candidates(prof, inBig).slice(0, 6) : [];
  const backupDays = S.lastBackup ? daysUntil(S.lastBackup) * -1 : null;

  return `
  <div class="top"><div><div class="sub">${isSun ? 'It’s Sunday — perfect timing' : 'Best on Sundays, fine anytime'}</div><h1>Sunday Review</h1></div></div>
  <div class="card flat small muted">Reviewing <b style="color:var(--text)">${weekRange(rw)}</b> · planning <b style="color:var(--text)">${weekRange(pw)}</b>. About 15 minutes.</div>

  <div class="step"><span class="n">1</span><h3>Last week’s Big 3</h3></div>
  <div class="card tight list">${W.big3.length ? W.big3.map((b, i) => bigRow(b, i, rw)).join('') : `<div class="empty">No Big 3 were set for that week — you’re just getting started. 🌱</div>`}</div>

  <div class="step"><span class="n">2</span><h3>Wins — anything counts</h3></div>
  <div class="card">
    ${doneThisWeek.length ? `<div class="small muted" style="margin-bottom:6px">You finished ${doneThisWeek.length} step${doneThisWeek.length === 1 ? '' : 's'} this week:</div>
      <div class="list">${doneThisWeek.slice(0, 8).map(({ t, a }) => `<div class="win a-${a.id}"><span class="dot"></span><span class="t small">${esc(t.title)}</span></div>`).join('')}</div>` : ''}
    ${W.wins.length ? `<div class="list" style="margin-top:6px">${W.wins.map((w, i) => `<div class="win"><span class="e">🏆</span><span class="t">${esc(w)}</span><button class="icon-btn" data-act="delWin" data-i="${i}" aria-label="Remove win">✕</button></div>`).join('')}</div>` : ''}
    <form class="add-row" data-form="win"><input id="winInput" type="text" name="win" placeholder="${esc(P().winHint)}" maxlength="140" autocomplete="off"><button class="btn">Add</button></form>
  </div>

  <div class="step"><span class="n">3</span><h3>Quick numbers</h3></div>
  <form class="card" data-form="numbers">
    <div class="grid2">
      <div><label class="f">🛵 ${esc(gig())} ($)</label><input type="number" inputmode="decimal" name="uber" value="${uberE ? esc(uberE.amount) : ''}" placeholder="0"></div>
      <div><label class="f">📈 SK sign-ups</label><input type="number" inputmode="numeric" name="sk" value="${skE ? esc(skE.count) : ''}" placeholder="0"></div>
    </div>
    <button class="btn ghost block" style="margin-top:12px">Save numbers</button>
  </form>

  <div class="step"><span class="n">4</span><h3>Where you stand</h3></div>
  <div class="card">
    ${S.areas.map((a) => { const st = areaStats(a); const wk = doneThisWeek.filter((x) => x.a.id === a.id).length; return `
      <div class="a-${a.id}" style="margin:6px 0 14px"><div style="display:flex;justify-content:space-between;font-size:14.5px;margin-bottom:6px"><span>${a.emoji} ${esc(a.name)}</span><span class="muted">${wk ? `+${wk} this week · ` : ''}<b style="color:var(--c)">${st.pct}%</b></span></div>
      <div class="bar"><i style="width:${st.pct}%"></i></div></div>`; }).join('')}
  </div>

  <div class="step"><span class="n">5</span><h3>Big 3 for ${weekRange(pw)}</h3></div>
  <div class="card">
    <div class="list">
      ${[0, 1, 2].map((i) => { const b = P.big3[i]; const a = b && b.areaId ? area(b.areaId) : null; return b ? `
        <div class="slot filled a-${a ? a.id : 'none'}"><span class="num">${i + 1}</span><span class="title">${esc(b.title)}${a ? `<div class="tiny muted">${esc(a.name)}</div>` : ''}</span><button class="icon-btn" data-act="bigClear" data-i="${i}" aria-label="Remove">✕</button></div>` : `
        <div class="slot"><span class="num">${i + 1}</span><span class="title muted small">Empty — pick below or type one</span></div>`; }).join('')}
    </div>
    ${P.big3.length < 3 ? `
      <div class="sugg" style="margin-top:12px">${sugg.map((t) => { const f = findTask(t.id); return `<button class="a-${f.area.id}" data-act="bigFill" data-id="${t.id}"><span class="dot"></span><span class="small">${esc(t.title)}</span><span class="plus">+</span></button>`; }).join('')}</div>
      <form class="add-row" data-form="bigCustom"><input type="text" name="title" placeholder="Or type your own…" maxlength="120" autocomplete="off"><button class="btn">Add</button></form>` : ''}
  </div>

  ${backupDays === null || backupDays > 14 ? `<a class="banner" href="#settings" style="background:var(--accent-soft);border-color:transparent"><span class="big">💾</span><div><b>Back up your plan</b><div class="small muted">${backupDays === null ? 'No backup yet' : `Last backup ${backupDays} days ago`} — takes 5 seconds</div></div><span class="arrow">›</span></a>` : ''}

  <button class="btn block" data-act="finishReview" style="margin-top:6px">${W.reviewed ? 'Reviewed ✓ — update' : 'Finish review'}</button>
  `;
}

function vTrackers(k) {
  if (!T[k]) k = 'apt';
  const cfg = T[k]; const list = sortedEntries(k); const ac = cfg.area;
  return `
  <div class="top"><div><div class="sub">Small numbers, big picture</div><h1>Trackers</h1></div></div>
  <div class="scroller" role="tablist">${Object.entries(T).map(([key, c]) => `<a class="tab ${key === k ? 'on' : ''}" role="tab" href="#trackers/${key}" style="display:inline-flex;align-items:center;text-decoration:none">${c.emoji} ${c.name}</a>`).join('')}</div>

  <div class="card a-${ac}" style="margin-top:12px">${cfg.summary(S.trackers[k])}</div>

  <details class="add" ${list.length ? '' : 'open'}>
    <summary>＋ ${cfg.add}</summary>
    <form class="card" data-form="tracker" data-t="${k}">
      ${cfg.fields.map((f) => `<label class="f" for="f_${f.k}">${f.l}</label>${field(f)}`).join('')}
      <button class="btn block" style="margin-top:14px">Save</button>
    </form>
  </details>

  ${list.length ? `<div class="card tight list a-${ac}">${list.map((e) => { const r = cfg.row(e); return `
    <div class="entry"><div class="body"><div class="t">${esc(r.t)}</div>${r.s ? `<div class="s">${esc(r.s)}</div>` : ''}
      ${r.link && /^https?:\/\//i.test(r.link) ? `<a class="tiny" href="${esc(r.link)}" target="_blank" rel="noopener">Open listing ↗</a>` : ''}</div>
      ${r.pill ? `<button class="pill ${r.pillCls || 'c'}" data-act="cycle" data-t="${k}" data-id="${e.id}" title="Tap to change status">${esc(r.pill)}</button>` : ''}
      <button class="icon-btn" data-act="delEntry" data-t="${k}" data-id="${e.id}" aria-label="Delete entry">✕</button>
    </div>`; }).join('')}</div>` : `<p class="empty">Nothing logged yet.</p>`}
  ${cfg.cycle ? '<p class="tiny muted" style="margin:0 4px">Tip: tap a status to move it to the next stage.</p>' : ''}
  `;
}
function field(f) {
  const id = `f_${f.k}`;
  if (f.type === 'select') return `<select id="${id}" name="${f.k}">${f.opts.map((o) => `<option ${o === f.def ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  const val = f.type === 'date' && !f.blank ? todayKey() : '';
  const im = f.type === 'number' ? ' inputmode="decimal" step="any" min="0"' : '';
  return `<input id="${id}" type="${f.type}" name="${f.k}" value="${val}" ${f.ph ? `placeholder="${esc(f.ph)}"` : ''}${im} ${f.req ? 'required' : ''} autocomplete="off">`;
}

let deferredInstall = null;
function vSettings() {
  const th = S.settings.theme || 'auto';
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return `
  <a class="back" href="#home">‹ Home</a>
  <div class="top"><h1>Settings</h1></div>

  <div class="h2"><span>Your North Star</span></div>
  <form class="card" data-form="northstar">
    <textarea name="ns" maxlength="300">${esc(S.northStar)}</textarea>
    <label class="f">Target month</label><input type="date" name="date" value="${esc(S.northStarDate)}">
    <button class="btn block" style="margin-top:12px">Save</button>
  </form>

  <div class="h2"><span>Appearance</span></div>
  <div class="seg">${['auto', 'light', 'dark'].map((v) => `<button class="${th === v ? 'on' : ''}" data-act="theme" data-v="${v}">${v === 'auto' ? 'Auto' : v === 'light' ? '☀️ Light' : '🌙 Dark'}</button>`).join('')}</div>

  <div class="h2"><span>Backup</span></div>
  <div class="card">
    <p class="small muted" style="margin-bottom:12px">Your plan lives only on this device. Export a backup now and then (save it to OneDrive or email it to yourself). Import it to move to a new phone.</p>
    <div class="btn-row"><button class="btn" data-act="export">⬇ Export</button><button class="btn ghost" data-act="import">⬆ Import</button></div>
    <p class="tiny muted" style="margin-top:10px">${S.lastBackup ? 'Last backup: ' + fmt(S.lastBackup, { month: 'long', day: 'numeric', year: 'numeric' }) : 'No backup yet.'}</p>
  </div>

  <div class="h2"><span>Install on your phone</span></div>
  <div class="card small">
    ${standalone ? '✅ Installed — you’re running North Star from your home screen.' : `
    ${deferredInstall ? '<button class="btn block" data-act="install" style="margin-bottom:12px">Install North Star</button>' : ''}
    <p><b>iPhone (Safari):</b> Share button → <i>Add to Home Screen</i>.</p>
    <p style="margin-top:6px"><b>Android (Chrome):</b> ⋮ menu → <i>Install app</i>.</p>`}
  </div>

  <div class="h2"><span>Start over</span></div>
  <button class="btn danger block" data-act="reset">Reset to the starter plan</button>
  <p class="tiny muted" style="margin:16px 4px;text-align:center">North Star · works offline · your data never leaves this device</p>
  `;
}

/* ---------------- actions ---------------- */
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}
const CHEERS = ['Nice — one step closer ⭐', 'Done. Well played ⚽', 'Progress! 🌱', 'That counts 💪', 'Lovely work ✨'];
const cheer = () => toast(CHEERS[Math.floor(Math.random() * CHEERS.length)]);

function setTaskDone(t, v) { t.done = v; t.doneAt = v ? todayKey() : null; if (v) cheer(); }

const ACT = {
  toggleTask: (d) => { const f = findTask(d.id); if (f) setTaskDone(f.task, !f.task.done); },
  toggleCustom: (d) => { const it = ensureDay().items.find((x) => x.id === d.id); if (it) { it.done = !it.done; if (it.done) cheer(); } },
  toggleBig: (d) => {
    const b = week(d.w).big3[+d.i]; if (!b) return;
    const f = b.taskId && findTask(b.taskId);
    if (f) setTaskDone(f.task, !f.task.done); else { b.done = !b.done; if (b.done) cheer(); }
  },
  toggleHabit: (d) => {
    const h = S.habits.find((x) => x.id === d.id); if (!h) return;
    if (habitDone(h)) { // un-check: remove from today, or from whichever day this week for weekly
      const keys = h.freq === 'weekly' ? [...Array(7)].map((_, i) => ds(addDays(mondayOf(new Date()), i))) : [todayKey()];
      keys.forEach((k) => { if (S.habitLog[k]) S.habitLog[k] = S.habitLog[k].filter((x) => x !== h.id); });
    } else { (S.habitLog[todayKey()] ||= []).push(h.id); toast(`${h.emoji} ${h.name} ✓`); }
  },
  swap: (d) => {
    const day = ensureDay(); const it = day.items[+d.i]; if (!it || !it.taskId) return;
    const prof = profile(); const used = usedIds(day); used.add(it.taskId);
    const next = candidates(prof, used)[0] || candidates({ ...prof, sizes: ['quick', 'focus'] }, used)[0];
    if (!next) return toast('No other steps fit today');
    day.skipped.push(it.taskId); day.items[+d.i] = { taskId: next.id };
  },
  removeToday: (d) => { const day = ensureDay(); const it = day.items[+d.i]; if (it?.taskId) day.skipped.push(it.taskId); day.items.splice(+d.i, 1); },
  openAdd: () => { ui.addOpen = true; },
  closeAdd: () => { ui.addOpen = false; },
  addToday: (d) => { const day = ensureDay(); if (day.items.length >= MAX_TODAY) return toast('3 is the max — keep it light'); day.items.push({ taskId: d.id }); if (day.items.length >= MAX_TODAY) ui.addOpen = false; },
  toggleSize: (d) => { const f = findTask(d.id); if (f) f.task.size = f.task.size === 'focus' ? 'quick' : 'focus'; },
  editMode: () => { ui.edit = !ui.edit; },
  delTask: (d) => { const f = findTask(d.id); if (f && confirm(`Delete “${f.task.title}”?`)) f.goal.tasks = f.goal.tasks.filter((t) => t.id !== d.id); },
  delGoal: (d) => { for (const a of S.areas) { const g = a.goals.find((x) => x.id === d.id); if (g && confirm(`Delete the goal “${g.title}” and its steps?`)) a.goals = a.goals.filter((x) => x.id !== d.id); } },
  pauseGoal: (d) => { for (const a of S.areas) { const g = a.goals.find((x) => x.id === d.id); if (g) g.status = g.status === 'paused' ? 'active' : 'paused'; } },
  cycle: (d) => {
    const cfg = T[d.t]; const e = S.trackers[d.t].find((x) => x.id === d.id); if (!e || !cfg.cycle) return;
    const o = cfg.cycle.opts; e[cfg.cycle.k] = o[(o.indexOf(e[cfg.cycle.k]) + 1) % o.length];
    if (d.t === 'books' && e.status === 'Finished') { e.date ||= todayKey(); toast('📚 Another book done!'); }
    if (d.t === 'apt' && e.status === 'Signed ✓') toast('🎉 New home! Huge step.');
  },
  delEntry: (d) => { if (confirm('Delete this entry?')) S.trackers[d.t] = S.trackers[d.t].filter((x) => x.id !== d.id); },
  editStart: (d) => { const v = prompt('Starting balance ($)', S.config[d.k]); if (v !== null && num(v) > 0) S.config[d.k] = num(v); },
  bigFill: (d) => {
    const P = week(planWeek()); if (P.big3.length >= 3) return;
    const f = findTask(d.id); if (f) P.big3.push({ id: uid(), title: f.task.title, taskId: f.task.id, areaId: f.area.id, done: false });
  },
  bigClear: (d) => { week(planWeek()).big3.splice(+d.i, 1); },
  delWin: (d) => { week(reviewWeek()).wins.splice(+d.i, 1); },
  finishReview: () => { week(reviewWeek()).reviewed = todayKey(); toast('Review done. Enjoy your rest 🌿'); setTimeout(() => { location.hash = '#home'; }, 600); },
  theme: (d) => { S.settings.theme = d.v; applyTheme(); },
  export: () => {
    S.lastBackup = todayKey(); save();
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `north-star-backup-${todayKey()}.json`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast('Backup saved 💾');
  },
  import: () => $('#importFile').click(),
  install: async () => { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; render(); },
  reset: () => { if (confirm('Reset everything to the starter plan? Export a backup first if you want to keep your data.')) { S = seed(); ui = { addOpen: false, edit: false }; toast('Fresh start ✨'); } },
};

const FORMS = {
  addTask: (f, fd) => {
    const title = (fd.get('title') || '').trim(); if (!title) return;
    for (const a of S.areas) { const g = a.goals.find((x) => x.id === f.dataset.goal); if (g) g.tasks.push({ id: uid(), title, size: 'quick', done: false, doneAt: null }); }
    ui.focus = `form[data-goal="${f.dataset.goal}"] input`;
  },
  addGoal: (f, fd) => { const title = (fd.get('title') || '').trim(); const a = area(f.dataset.area); if (title && a) a.goals.push({ id: uid(), title, tasks: [], status: 'active', note: '' }); },
  todayCustom: (f, fd) => {
    const title = (fd.get('title') || '').trim(); if (!title) return; const day = ensureDay();
    if (day.items.length >= MAX_TODAY) return toast('3 is the max — keep it light');
    day.items.push({ custom: true, id: uid(), title, done: false }); if (day.items.length >= MAX_TODAY) ui.addOpen = false;
  },
  tracker: (f, fd) => {
    const k = f.dataset.t; const cfg = T[k]; const e = { id: uid(), ts: Date.now() };
    cfg.fields.forEach((x) => { const v = (fd.get(x.k) ?? '').toString().trim(); e[x.k] = x.type === 'number' ? (v === '' ? '' : num(v)) : v; });
    if (!e.date && cfg.fields.some((x) => x.k === 'date') && !(k === 'books')) e.date = todayKey();
    if (k === 'books' && e.status === 'Finished' && !e.date) e.date = todayKey();
    if (k === 'uber' && e.date) e.date = ds(mondayOf(parse(e.date)));
    S.trackers[k].push(e); toast('Saved ✓');
  },
  win: (f, fd) => { const w = (fd.get('win') || '').trim(); if (w) { week(reviewWeek()).wins.push(w); ui.focus = '#winInput'; } },
  numbers: (f, fd) => {
    const rw = reviewWeek(); const u = fd.get('uber'); const s = fd.get('sk');
    const upsert = (k, val, make) => {
      const list = S.trackers[k]; const ex = list.find((e) => e.wk === rw);
      if (val === '' || val == null) { if (ex) S.trackers[k] = list.filter((e) => e !== ex); return; }
      if (ex) Object.assign(ex, make(num(val))); else list.push({ id: uid(), ts: Date.now(), wk: rw, ...make(num(val)) });
    };
    upsert('uber', u, (v) => ({ date: rw, amount: v, hours: '' }));
    upsert('sk', s, (v) => ({ date: ds(addDays(parse(rw), 6)), count: v, spend: '', source: 'Meta ad', note: 'Weekly total' }));
    toast('Numbers saved ✓');
  },
  bigCustom: (f, fd) => { const title = (fd.get('title') || '').trim(); const P = week(planWeek()); if (title && P.big3.length < 3) P.big3.push({ id: uid(), title, taskId: null, areaId: null, done: false }); },
  northstar: (f, fd) => { const t = (fd.get('ns') || '').trim(); if (t) S.northStar = t; if (fd.get('date')) S.northStarDate = fd.get('date'); toast('North Star updated ⭐'); },
};

/* ---------------- render & wiring ---------------- */
function route() { const [v, arg] = (location.hash.slice(1) || 'home').split('/'); return { v, arg }; }
function render() {
  const { v, arg } = route();
  const views = { home: vHome, today: vToday, review: vReview, trackers: () => vTrackers(arg), area: () => vArea(arg), settings: vSettings };
  // keep open <details> state across re-renders
  const openAdd = document.querySelector('details.add')?.open;
  $('#app').innerHTML = (views[v] || vHome)();
  if (openAdd && v === 'trackers') { const d = document.querySelector('details.add'); if (d) d.open = true; }
  const navKey = v === 'area' || v === 'settings' ? 'home' : v;
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('on', a.dataset.v === navKey));
  if (ui.focus) { document.querySelector(ui.focus)?.focus(); ui.focus = null; }
  const tab = document.querySelector('.tab.on'); if (tab) tab.parentElement.scrollLeft = tab.offsetLeft - 16;
}
function applyTheme() {
  const t = S.settings.theme;
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name=theme-color]').content = dark ? '#0e1117' : '#1b2440';
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = ACT[el.dataset.act]; if (!fn) return;
  e.preventDefault(); fn(el.dataset, el); save(); render();
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-form]'); if (!f) return;
  e.preventDefault(); const fn = FORMS[f.dataset.form]; if (!fn) return;
  fn(f, new FormData(f)); save(); render();
});
$('#importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0]; e.target.value = ''; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.areas) || !data.trackers) throw new Error('Not a North Star backup');
    if (!confirm('Replace everything on this device with this backup?')) return;
    S = migrate(data); save(); applyTheme(); render(); toast('Backup restored ✓');
  } catch (err) { alert('Could not import: ' + err.message); }
});
window.addEventListener('hashchange', () => { ui.addOpen = false; ui.edit = false; render(); window.scrollTo(0, 0); });
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; if (route().v === 'settings') render(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
// New day while the app sits open → refresh Today
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});

applyTheme();
render();
