'use strict';
/* ЕГЭ-2027 · Информатика — годовой планер подготовки.
   Одна ученица = одна запись {id, name, share_token, data}; data — весь её план и результаты. */

const CFG = window.APP_CONFIG || {};
const CLOUD = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
const STRUCTURE_NOTE = 'Структура заданий — по проекту КИМ ЕГЭ-2027 (ФИПИ; на 14.10.2026 документы опубликованы как проекты). После выхода окончательных материалов сверьте темы: все поля редактируются.';
const EXAM_MIN = 235; // 3 ч 55 мин

/* ================= утилиты ================= */
const $ = (s, r = document) => r.querySelector(s);
const h = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const today = () => iso(new Date());
const addDays = (s, n) => { const d = new Date(s + 'T00:00'); d.setDate(d.getDate() + n); return iso(d); };
const daysTo = s => Math.round((new Date(s + 'T00:00') - new Date(today() + 'T00:00')) / 864e5);
const fmtDate = s => {
  if (!s) return '—';
  const d = new Date(s + 'T00:00');
  if (isNaN(d)) return s;
  const o = { day: 'numeric', month: 'short' };
  if (s.slice(0, 4) !== today().slice(0, 4)) o.year = 'numeric';
  return d.toLocaleDateString('ru-RU', o);
};
const isSet = v => v !== null && v !== undefined && v !== '';
const num = v => (isSet(v) ? (+v || 0) : 0);
const uid = () => Math.random().toString(36).slice(2, 10);
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
const plural = (n, one, few, many) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many; };
const opt = arr => arr.map(x => [x, x]);
const clone = o => JSON.parse(JSON.stringify(o));
const linkify = s => h(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
const parseNums = s => String(s || '').split(/[^0-9]+/).map(Number).filter(n => n >= 1 && n <= 27);

/* ================= шаблон плана ================= */
const RUBRIC = [
  'не понимает основу',
  'решает с пошаговой помощью',
  'решает нестабильно или с подсказками',
  'самостоятельно решает типовые задачи',
  'решает разные формулировки и объясняет метод',
];

// [№, тема, макс. первичный балл, пометка об изменении 2027]
const TASKS = [
  [1, 'Анализ информационных моделей (графы, таблицы)', 1],
  [2, 'Таблицы истинности логических выражений', 1],
  [3, 'Поиск информации в реляционных базах данных', 1],
  [4, 'Кодирование и декодирование информации (условие Фано)', 1],
  [5, 'Анализ алгоритма для исполнителя (преобразование чисел)', 1],
  [6, 'Анализ работы алгоритма с циклом (Черепаха)', 1],
  [7, 'Кодирование графической и звуковой информации, объём', 1],
  [8, 'Перебор слов и комбинаторика', 1],
  [9, 'Обработка числовых данных в электронных таблицах', 1],
  [10, 'Маска подсети, IP-адресация', 1, 'изм. 2027: вместо поиска в текстовом документе'],
  [11, 'Количество информации (пароли, идентификаторы)', 1],
  [12, 'Исполнитель Редактор: выполнение алгоритма', 1],
  [13, 'Анализ хода исполнения алгоритма', 1, 'изм. 2027: вместо маски подсети'],
  [14, 'Позиционные системы счисления', 1],
  [15, 'Логические выражения с параметром', 1],
  [16, 'Рекурсивные алгоритмы', 1],
  [17, 'Обработка целочисленной последовательности из файла', 1],
  [18, 'Динамическое программирование в электронной таблице', 1],
  [19, 'Теория игр: выигрышная стратегия (1 ход)', 1],
  [20, 'Теория игр: выигрышная стратегия (2 хода)', 1],
  [21, 'Теория игр: полная стратегия', 1],
  [22, 'Параллельные процессы, время выполнения', 1],
  [23, 'Графы: кратчайшие пути и количество путей в ориентированном ациклическом графе', 1, 'изм. 2027: вместо анализа исполнения алгоритма'],
  [24, 'Обработка символьных строк из файла', 1],
  [25, 'Делители и маски чисел', 1],
  [26, 'Сортировка и обработка данных из файла', 2],
  [27, 'Анализ данных (вычисления по файлу)', 2, 'изм. 2027: ответ — одна строка из двух чисел'],
];

const STAGES = [
  { month: 'Сентябрь', title: 'Диагностика и основы', topics: 'Входная диагностика; базовая логика; кодирование информации; единицы измерения информации; начало Python', tasks: '1, 2, 4, 7, 11', python: 'Ввод-вывод, переменные, условия, циклы for / while', criterion: 'Диагностика проведена, маршрут скорректирован. По заданиям этапа — подтверждённое освоение по критериям карты знаний.' },
  { month: 'Октябрь', title: 'Python, перебор, системы счисления', topics: 'Python; перебор; преобразования чисел; комбинаторика; Черепаха; системы счисления', tasks: '5, 6, 8, 14', python: 'Функции, строки, списки, перевод систем счисления, вложенные циклы, itertools, turtle', criterion: 'Задания этапа освоены по критериям; перебор пишется на Python без подсказок.' },
  { month: 'Ноябрь', title: 'Данные, таблицы, сети', topics: 'Базы данных; электронные таблицы; компьютерные сети (маска подсети); динамика в таблицах', tasks: '3, 9, 10, 18', python: 'Модуль ipaddress, чтение файлов, обработка табличных данных', criterion: 'Задания этапа освоены по критериям.' },
  { month: 'Декабрь', title: 'Исполнители, алгоритмы, рекурсия', topics: 'Исполнители; анализ алгоритмов; рекурсия; файлы и последовательности', tasks: '12, 13, 16, 17', python: 'Рекурсия, functools.lru_cache, работа с последовательностями из файла', criterion: 'Задания этапа освоены по критериям.' },
  { month: 'Январь', title: 'Логика с параметром и игры', topics: 'Логика с параметром; игровые стратегии', tasks: '15, 19, 20, 21', python: 'Перебор параметра, рекурсивный анализ позиций игры', criterion: 'Задания этапа освоены по критериям.' },
  { month: 'Февраль', title: 'Процессы, графы, строки', topics: 'Параллельные процессы; графы; обработка строк', tasks: '22, 23, 24', python: 'Словари, обход графа, динамика по ациклическому графу, обработка строк', criterion: 'Задания этапа освоены по критериям.' },
  { month: 'Март', title: 'Числа и анализ данных', topics: 'Делители; сортировки; моделирование; анализ данных; задания №25–27', tasks: '25, 26, 27', python: 'Оптимизированный перебор делителей, сортировка с ключом, работа с координатами', criterion: 'Задания этапа освоены по критериям; №26–27 решаются в пределах времени.' },
  { month: 'Апрель', title: 'Сборка полного варианта', topics: 'Сборка полного варианта; закрытие слабых тем; стратегия и распределение времени', tasks: '', python: 'Личная библиотека шаблонов решений', criterion: 'Полный вариант укладывается в 3 ч 55 мин; слабые темы из карты знаний закрыты.' },
  { month: 'Май', title: 'Стабильные результаты', topics: 'Полные пробники; сложные задания; повторение ошибок', tasks: '', python: 'Отработка скорости на типовых шаблонах', criterion: 'Рабочий ориентир: 27–29 первичных баллов на нескольких полных пробниках подряд с соблюдением времени (ориентир, а не гарантия 90+ тестовых баллов).' },
  { month: 'Июнь', title: 'Финальное повторение', topics: 'Финальное повторение; подготовка к экзамену: правила, бланки, режим дня', tasks: '', python: 'Повторение шаблонов', criterion: 'Нет просроченных повторений; план на последние дни перед экзаменом.' },
];

const STAGE_ST = { 'Не начат': 'gray', 'В работе': 'lilac', 'Завершён': 'green', 'Скорректирован': 'amber' };
const LESSON_ST = { 'Запланировано': 'lilac', 'Проведено': 'green', 'Перенесено': 'amber', 'Отменено': 'gray' };
const HW_ST = { 'Нет ДЗ': 'gray', 'Задано': 'lilac', 'Сдано — на проверку': 'amber', 'Проверено': 'green', 'Не сдано': 'red' };
const DIAG_ST = { 'Не проведена': 'amber', 'Запланирована': 'lilac', 'Проведена': 'green' };
const CAUSES = ['', 'Не знает теорию', 'Неверно поняла условие', 'Ошибка в коде', 'Невнимательность / вычисления', 'Неэффективный метод', 'Не хватило времени', 'Другое'];
const TASK_ST = {
  none: ['Не начато', 'gray'],
  progress: ['Есть решения, нет оценки', 'blue'],
  weak: ['Слабая тема', 'red'],
  unstable: ['Нестабильно', 'amber'],
  confirm: ['Нужно подтвердить', 'lilac'],
  mastered: ['Освоено', 'green'],
};

function newPlan(p = {}) {
  return {
    v: 1,
    profile: { name: p.name || '', tutor: p.tutor || '', year: '2026/2027', target: 90, examDate: '' },
    diagnostic: { status: 'Не проведена', date: '', summary: '', lessonsPerWeek: '', hoursPerWeek: '' },
    settings: { criteria: { minLevel: 3, minSolved: 5, minAcc: 80 }, rubric: [...RUBRIC], bench: { primary: 27, streak: 3 } },
    stages: STAGES.map(s => ({ id: uid(), ...s, load: '', status: 'Не начат', progressNote: '', comment: '' })),
    tasks: TASKS.map(([n, topic, max, note]) => ({ n, topic, max, note: note || '', plan: '', level: null, checkDate: '', extraSolved: null, extraCorrect: null, nextStep: '', comment: '' })),
    lessons: [], errors: [], mocks: [],
    private: { notes: '' },
  };
}

function normalize(d) {
  const base = newPlan();
  d = d && typeof d === 'object' ? d : base;
  for (const k of Object.keys(base)) if (d[k] === undefined || d[k] === null) d[k] = base[k];
  d.profile = { ...base.profile, ...d.profile };
  d.diagnostic = { ...base.diagnostic, ...d.diagnostic };
  d.settings = { ...base.settings, ...d.settings };
  d.settings.criteria = { ...base.settings.criteria, ...d.settings.criteria };
  d.settings.bench = { ...base.settings.bench, ...d.settings.bench };
  if (!Array.isArray(d.settings.rubric) || d.settings.rubric.length !== 5) d.settings.rubric = [...RUBRIC];
  ['stages', 'tasks', 'lessons', 'errors', 'mocks'].forEach(k => { if (!Array.isArray(d[k])) d[k] = base[k]; });
  d.mocks.forEach(m => { if (!Array.isArray(m.scores)) m.scores = []; while (m.scores.length < d.tasks.length) m.scores.push(null); });
  return d;
}

// Копия плана для новой ученицы: структура и настройки переносятся, результаты — нет.
function copyPlan(src, p) {
  const d = newPlan(p);
  d.profile.target = src.profile.target;
  d.profile.year = src.profile.year;
  d.profile.examDate = src.profile.examDate;
  d.settings = clone(src.settings);
  d.stages = src.stages.map(s => ({ ...clone(s), id: uid(), status: 'Не начат', progressNote: '', comment: '' }));
  d.tasks = src.tasks.map(t => ({ n: t.n, topic: t.topic, max: t.max, note: t.note, plan: t.plan, level: null, checkDate: '', extraSolved: null, extraCorrect: null, nextStep: '', comment: '' }));
  return d;
}

/* ================= расчёты ================= */
function taskStat(d, i) {
  const t = d.tasks[i];
  let aS = 0, aC = 0;
  for (const l of d.lessons) if (+l.task === t.n && l.hwStatus === 'Проверено') { aS += num(l.solved); aC += num(l.correct); }
  const solved = aS + num(t.extraSolved), correct = aC + num(t.extraCorrect);
  const acc = solved ? Math.round(correct / solved * 100) : null;
  const c = d.settings.criteria;
  const lv = isSet(t.level) ? +t.level : null;
  const mastered = lv !== null && lv >= num(c.minLevel) && solved >= num(c.minSolved) && acc !== null && acc >= num(c.minAcc);
  let st;
  if (mastered) st = 'mastered';
  else if (lv === null) st = solved ? 'progress' : 'none';
  else if (lv <= 1) st = 'weak';
  else if (lv === 2) st = 'unstable';
  else st = 'confirm';
  return { aS, aC, solved, correct, acc, mastered, st, lv, bad: correct > solved };
}

function mockStat(d, m) {
  let sum = 0, checked = 0;
  d.tasks.forEach((t, j) => { const v = m.scores[j]; if (isSet(v)) { sum += Math.min(+v, num(t.max)); checked++; } });
  const max = d.tasks.reduce((a, t) => a + num(t.max), 0);
  const inTime = isSet(m.time) ? +m.time <= EXAM_MIN : null;
  return { sum, checked, complete: checked === d.tasks.length, max, inTime };
}

function stageStat(d, s) {
  const ns = parseNums(s.tasks);
  if (!ns.length) return null;
  const done = ns.filter(n => { const i = d.tasks.findIndex(t => t.n === n); return i >= 0 && taskStat(d, i).mastered; }).length;
  return { done, total: ns.length, pct: Math.round(done / ns.length * 100) };
}

function errState(e) {
  if (e.done) return ['Закрыто', 'green'];
  if (!e.recheck) return ['Без даты', 'gray'];
  const dd = daysTo(e.recheck);
  if (dd < 0) return ['Просрочено', 'red'];
  if (dd <= 3) return ['Скоро', 'amber'];
  return ['Запланировано', 'lilac'];
}

function overview(d) {
  const t0 = today();
  const ts = d.tasks.map((_, i) => taskStat(d, i));
  const mocks = d.mocks.filter(m => m.date).slice().sort((a, b) => a.date.localeCompare(b.date)).map(m => ({ m, ...mockStat(d, m) }));
  const complete = mocks.filter(x => x.complete);
  const best = complete.reduce((b, x) => (!b || x.sum > b.sum ? x : b), null);
  const bench = d.settings.bench;
  const recent = complete.slice(-num(bench.streak));
  let streak = 0;
  for (let k = complete.length - 1; k >= 0; k--) { const x = complete[k]; if (x.sum >= num(bench.primary) && x.inTime === true) streak++; else break; }
  const curStageIdx = d.stages.findIndex(s => s.status !== 'Завершён');

  // слабые темы: низкая оценка, низкая точность или регулярные потери на пробниках
  const weak = [];
  d.tasks.forEach((t, i) => {
    const s = ts[i], why = [];
    if (s.lv !== null && s.lv <= 2) why.push(`оценка ${s.lv}`);
    if (s.acc !== null && s.solved >= 3 && s.acc < num(d.settings.criteria.minAcc)) why.push(`точность ${s.acc}%`);
    const last = mocks.filter(x => isSet(x.m.scores[i])).slice(-3);
    const lost = last.filter(x => +x.m.scores[i] < num(t.max)).length;
    if (last.length >= 2 && lost >= 2) why.push(`потери в ${lost} из ${last.length} пробников`);
    if (why.length) weak.push({ i, t, why, s });
  });
  weak.sort((a, b) => (a.s.lv ?? 5) - (b.s.lv ?? 5) || b.why.length - a.why.length);

  const hwCheck = d.lessons.map((l, i) => ({ l, i })).filter(x => x.l.hwStatus === 'Сдано — на проверку');
  const overdue = d.errors.map((e, i) => ({ e, i })).filter(x => !x.e.done && x.e.recheck && x.e.recheck < t0);

  return {
    ts, mocks, complete, best, last: mocks.at(-1) || null, recent, streak, weak, hwCheck, overdue, curStageIdx,
    mastered: ts.filter(s => s.mastered).length,
    stagesDone: d.stages.filter(s => s.status === 'Завершён').length,
    lessonsDone: d.lessons.filter(l => l.status === 'Проведено').length,
  };
}

function nextActions(d, o) {
  const t0 = today(), soon = addDays(t0, 7), A = [];
  if (d.diagnostic.status !== 'Проведена') A.push({ tone: 'amber', text: 'Провести входную диагностику и настроить нагрузку', date: d.diagnostic.date, tab: 'settings' });
  o.overdue.forEach(({ e }) => A.push({ tone: 'red', text: `Повторить: ${e.task ? '№' + e.task + ' — ' : ''}${e.error || 'ошибка без описания'}`, date: e.recheck, tab: 'errors', late: true }));
  o.hwCheck.forEach(({ l }) => A.push({ tone: 'amber', text: `Проверить ДЗ: ${l.topic || (l.task ? '№' + l.task : 'занятие ' + fmtDate(l.date))}`, date: l.due, tab: 'lessons' }));
  d.lessons.forEach(l => {
    if (l.hwStatus === 'Задано' && l.due && l.due <= soon) A.push({ tone: l.due < t0 ? 'red' : 'lilac', text: `Сдать ДЗ: ${l.hw ? l.hw.split('\n')[0].slice(0, 80) : l.topic || 'домашнее задание'}`, date: l.due, tab: 'lessons', late: l.due < t0 });
  });
  d.lessons.filter(l => l.status === 'Запланировано' && l.date >= t0).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 2)
    .forEach(l => A.push({ tone: 'blue', text: `Занятие: ${l.topic || (l.task ? 'задание №' + l.task : 'тема не указана')}`, date: l.date, tab: 'lessons' }));
  d.errors.forEach(e => { if (!e.done && e.recheck && e.recheck >= t0 && e.recheck <= soon) A.push({ tone: 'lilac', text: `Повторная проверка: ${e.task ? '№' + e.task + ' — ' : ''}${e.error || ''}`, date: e.recheck, tab: 'errors' }); });
  const st = d.stages[o.curStageIdx];
  if (st) parseNums(st.tasks).forEach(n => {
    const i = d.tasks.findIndex(t => t.n === n);
    if (i >= 0 && !o.ts[i].mastered && d.tasks[i].nextStep) A.push({ tone: 'gray', text: `№${n}: ${d.tasks[i].nextStep}`, tab: 'map' });
  });
  A.sort((a, b) => (b.late ? 1 : 0) - (a.late ? 1 : 0) || (a.date || '9999').localeCompare(b.date || '9999'));
  return A;
}

/* ================= хранилище ================= */
const LS_KEY = 'ege27.students.v1';
const lsAll = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; } };
const lsPut = a => localStorage.setItem(LS_KEY, JSON.stringify(a));

const LocalStore = {
  async list() { return lsAll(); },
  async get(id) { return lsAll().find(s => s.id === id) || null; },
  async create(name, data) {
    const r = { id: uid(), name, share_token: token(), data, updated_at: new Date().toISOString() };
    const a = lsAll(); a.push(r); lsPut(a); return r;
  },
  async save(r) {
    const a = lsAll(), i = a.findIndex(x => x.id === r.id);
    r.updated_at = new Date().toISOString();
    if (i < 0) a.push(r); else a[i] = { ...a[i], name: r.name, data: r.data, share_token: r.share_token, updated_at: r.updated_at };
    lsPut(a);
  },
  async remove(id) { lsPut(lsAll().filter(x => x.id !== id)); },
  async byToken(t) {
    const r = lsAll().find(x => x.share_token === t);
    if (!r) return null;
    const data = clone(r.data); delete data.private;
    return { name: r.name, data, updated_at: r.updated_at };
  },
  async rotate(r) { r.share_token = token(); await this.save(r); },
};

let sb = null;
const chk = ({ data, error }) => { if (error) throw error; return data; };
const CloudStore = {
  async list() { return chk(await sb.from('students').select('id,name,share_token,data,updated_at').order('name')); },
  async get(id) { return chk(await sb.from('students').select('id,name,share_token,data,updated_at').eq('id', id).maybeSingle()); },
  async create(name, data) { return chk(await sb.from('students').insert({ name, data, share_token: token() }).select().single()); },
  async save(r) { chk(await sb.from('students').update({ name: r.name, data: r.data }).eq('id', r.id)); },
  async remove(id) { chk(await sb.from('students').delete().eq('id', id)); },
  async byToken(t) { return chk(await sb.rpc('student_by_token', { p_token: t })); },
  async rotate(r) { const t = token(); chk(await sb.from('students').update({ share_token: t }).eq('id', r.id)); r.share_token = t; },
};
const Store = CLOUD ? CloudStore : LocalStore;

/* ================= состояние и сохранение ================= */
const S = { view: 'loading', ro: false, cur: null, list: [], tab: 'home', user: null, open: new Set(), f: {}, hl: null, err: '' };

let saveTimer = null, saving = false, dirty = false;
function setSave(state, text) {
  const el = $('#savest'); if (!el) return;
  el.className = 'save ' + state; el.textContent = text;
}
function queueSave() {
  dirty = true; setSave('pending', 'Сохранение…');
  clearTimeout(saveTimer); saveTimer = setTimeout(flush, 600);
}
async function flush() {
  clearTimeout(saveTimer);
  if (!dirty || !S.cur || S.ro) return;
  if (saving) { saveTimer = setTimeout(flush, 300); return; }
  saving = true; dirty = false;
  S.cur.name = S.cur.data.profile.name || 'Без имени';
  try {
    await Store.save(S.cur);
    setSave('ok', 'Сохранено ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
  } catch (e) {
    console.error(e); dirty = true;
    setSave('err', 'Не сохранено — повтор…');
    saveTimer = setTimeout(flush, 4000);
  }
  saving = false;
}
window.addEventListener('beforeunload', e => { if (dirty) { flush(); e.preventDefault(); e.returnValue = ''; } });

function getPath(path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), S.cur.data); }
function setPath(path, val) {
  const ks = path.split('.'), last = ks.pop();
  const o = ks.reduce((o, k) => o[k], S.cur.data);
  o[last] = val;
}
function readVal(el) {
  if (el.type === 'checkbox') return el.checked;
  const t = el.dataset.t;
  if (t === 'num') return el.value === '' ? null : Number(el.value);
  return el.value;
}

/* ================= поля ввода (в режиме ученицы — просто текст) ================= */
function inp(k, v, o = {}) {
  if (S.ro) {
    const shown = o.type === 'date' ? (v ? fmtDate(v) : '') : v;
    return `<span class="v ${o.cls || ''}">${isSet(shown) ? h(shown) : '<span class="muted">—</span>'}</span>`;
  }
  return `<input class="f ${o.cls || ''}" data-k="${k}"${o.t ? ` data-t="${o.t}"` : ''}${o.r ? ' data-r' : ''} type="${o.type || 'text'}" value="${h(v ?? '')}"${o.ph ? ` placeholder="${h(o.ph)}"` : ''}${o.attrs ? ' ' + o.attrs : ''}>`;
}
function numInp(k, v, o = {}) { return inp(k, v, { type: 'number', t: 'num', r: true, cls: 'num ' + (o.cls || ''), attrs: `min="0" ${o.max != null ? `max="${o.max}"` : ''} step="${o.step || 1}" inputmode="numeric"`, ph: o.ph }); }
function dateInp(k, v) { return inp(k, v, { type: 'date', cls: 'date' }); }
function area(k, v, o = {}) {
  if (S.ro) return isSet(v) ? `<div class="v pre">${linkify(v)}</div>` : '<span class="muted">—</span>';
  return `<textarea class="f ${o.cls || ''}" data-k="${k}" rows="${o.rows || 2}"${o.ph ? ` placeholder="${h(o.ph)}"` : ''}>${h(v ?? '')}</textarea>`;
}
function sel(k, v, opts, o = {}) {
  const cur = opts.find(x => String(x[0]) === String(v ?? ''));
  if (S.ro) {
    if (!cur || !isSet(cur[0])) return '<span class="muted">—</span>';
    return o.tones ? badge(cur[1], o.tones[cur[0]]) : `<span class="v">${h(cur[1])}</span>`;
  }
  const tone = o.tones && cur ? o.tones[cur[0]] : '';
  return `<select class="f ${o.cls || ''} ${tone ? 'tone-' + tone : ''}" data-k="${k}"${o.t ? ` data-t="${o.t}"` : ''}>${opts.map(([val, l]) => `<option value="${h(val)}"${String(val) === String(v ?? '') ? ' selected' : ''}>${h(l)}</option>`).join('')}</select>`;
}
function check(k, v, label = '') {
  if (S.ro) return `<span class="v">${v ? '✅' : '⬜️'} ${h(label)}</span>`;
  return `<label class="chk"><input type="checkbox" data-k="${k}"${v ? ' checked' : ''}><span>${h(label)}</span></label>`;
}
const badge = (text, tone = 'gray') => `<span class="badge t-${tone}">${h(text)}</span>`;
const fld = (label, html, o = {}) => `<div class="fld ${o.cls || ''}"><label>${h(label)}</label>${html}${o.hint ? `<div class="hint">${o.hint}</div>` : ''}</div>`;
const bar = (pct, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;
const taskOpts = d => [['', '—'], ...d.tasks.map(t => [t.n, '№' + t.n])];
const levelOpts = d => [['', 'не оценено'], ...d.settings.rubric.map((r, i) => [i, `${i} — ${r}`])];
const LEVEL_TONE = { '': 'gray', 0: 'red', 1: 'red', 2: 'amber', 3: 'lilac', 4: 'green' };
const act = (name, label, o = {}) => `<button type="button" class="btn ${o.cls || ''}" data-act="${name}"${o.i != null ? ` data-i="${o.i}"` : ''}${o.title ? ` title="${h(o.title)}"` : ''}>${label}</button>`;

/* ================= отрисовка ================= */
function paintTop() {
  const t = $('#top');
  if (S.view === 'public') {
    t.innerHTML = `<div class="top-in"><span class="brand"><span class="logo">∑</span>ЕГЭ-2027 · Информатика</span>
      <span class="badge t-lilac">Только просмотр</span><span class="sp"></span>
      <span class="muted small">Обновлено ${S.cur?.updated_at ? new Date(S.cur.updated_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
      ${act('reload', '↻ Обновить', { cls: 'sm' })}</div>`;
    return;
  }
  t.innerHTML = `<div class="top-in">
    <a class="brand" href="#/"><span class="logo">∑</span>ЕГЭ-2027 · Информатика</a>
    ${S.cur ? `<span class="muted">/</span><b>${h(S.cur.data.profile.name || 'Без имени')}</b>` : ''}
    ${!CLOUD ? `<span class="badge t-amber mode-badge" title="Данные хранятся только в этом браузере. Подключите облако по инструкции, чтобы ученицы могли открывать свои ссылки.">Локальный режим</span>` : ''}
    <span class="sp"></span>
    ${S.cur ? `<span class="save ok" id="savest">Все изменения сохранены</span>` : ''}
    ${CLOUD && S.user ? `<span class="muted small">${h(S.user.email || '')}</span>${act('logout', 'Выйти', { cls: 'sm ghost' })}` : ''}
  </div>`;
}

function render() {
  const ae = document.activeElement, fk = ae && ae.dataset ? ae.dataset.k : null;
  const main = $('#main');
  const V = { loading: () => '<div class="loading">Загрузка…</div>', login: viewLogin, list: viewList, student: viewStudent, public: viewStudent, error: viewError };
  main.innerHTML = (V[S.view] || viewError)();
  if (fk) { const el = document.querySelector(`[data-k="${CSS.escape(fk)}"]`); if (el) el.focus({ preventScroll: true }); }
  if (S.hl != null) {
    const row = document.getElementById('task-' + S.hl);
    if (row) { row.classList.add('hl'); row.scrollIntoView({ block: 'center' }); }
    S.hl = null;
  }
}
function paint() { paintTop(); render(); }

function viewError() {
  return `<div class="wrap"><div class="card card-b"><h2>Не получилось открыть</h2><p class="muted">${h(S.err || 'Неизвестная ошибка')}</p><a class="btn" href="#/">На главную</a></div></div>`;
}

function viewLogin() {
  return `<div class="wrap"><form class="card login" id="loginForm">
    <div class="card-h"><h3>Вход для репетитора</h3></div>
    <div class="card-b stack">
      ${fld('Электронная почта', '<input class="f" name="email" type="email" required autocomplete="username">')}
      ${fld('Пароль', '<input class="f" name="password" type="password" required minlength="6" autocomplete="current-password">')}
      <div class="small muted" id="loginMsg"></div>
    </div>
    <div class="modal-f"><button type="button" class="btn" data-act="signup">Создать аккаунт</button><button class="btn pri">Войти</button></div>
  </form>
  <p class="muted small" style="text-align:center">Ученицам вход не нужен — они открывают свою карточку по личной ссылке.</p></div>`;
}

function viewList() {
  const cards = S.list.map(r => {
    const d = normalize(r.data), o = overview(d);
    return `<div class="card st-card">
      <div class="row"><h3 style="flex:1">${h(d.profile.name || 'Без имени')}</h3>${badge('цель ' + (d.profile.target || '—'), 'lilac')}</div>
      <div class="muted small">Репетитор: ${h(d.profile.tutor || '—')} · ${h(d.profile.year)}</div>
      <div class="st-stats">
        <div><b>${o.mastered}<small class="muted">/27</small></b><span>освоено</span></div>
        <div><b>${o.last ? o.last.sum : '—'}</b><span>посл. пробник</span></div>
        <div><b style="color:${o.overdue.length ? 'var(--red)' : 'inherit'}">${o.overdue.length}</b><span>просрочено</span></div>
      </div>
      ${bar(o.mastered / 27 * 100)}
      <div class="row">
        <a class="btn pri sm" href="#/st/${r.id}">Открыть</a>
        <button class="btn sm" data-act="copyLink" data-id="${r.id}">🔗 Ссылка ученицы</button>
      </div>
    </div>`;
  }).join('');
  return `<div class="wrap stack">
    <div class="row"><h2 style="flex:1">Ученицы</h2>
      <label class="btn" title="Восстановить ученицу из резервной копии">⤒ Импорт копии<input type="file" accept=".json,application/json" id="importFile" hidden></label>
      ${act('newStudent', '＋ Новая ученица', { cls: 'pri' })}</div>
    ${!CLOUD ? `<div class="callout warn"><div class="grow"><b>Локальный режим.</b> Всё сохраняется в этом браузере на этом компьютере. Чтобы ученицы могли открывать свои ссылки с телефона, подключите облачную базу — пошагово в файле <b>ИНСТРУКЦИЯ.md</b>.</div></div>` : ''}
    ${S.list.length ? `<div class="students">${cards}</div>` : `<div class="empty">Пока нет ни одной ученицы. Нажмите «Новая ученица» — план на год создастся по шаблону, его можно будет настроить после диагностики.</div>`}
  </div>`;
}

const TABS = [
  ['home', 'Главная'], ['route', 'Годовой маршрут'], ['map', 'Карта знаний'], ['lessons', 'Занятия и ДЗ'],
  ['errors', 'Ошибки и повторение'], ['mocks', 'Пробники'], ['settings', 'Настройка'],
];

function viewStudent() {
  const d = S.cur.data, p = d.profile, o = overview(d);
  const base = S.ro ? `#/s/${S.cur.share_token}` : `#/st/${S.cur.id}`;
  const tabs = TABS.filter(([k]) => !(S.ro && k === 'settings'));
  if (!tabs.some(([k]) => k === S.tab)) S.tab = 'home';
  const dleft = p.examDate ? daysTo(p.examDate) : null;
  const VIEWS = { home: viewHome, route: viewRoute, map: viewMap, lessons: viewLessons, errors: viewErrors, mocks: viewMocks, settings: viewSettings };
  return `<div class="wrap">
    <section class="card hero">
      <div class="grow">
        <h1>${h(p.name || 'Без имени')}</h1>
        <div class="meta"><span>Репетитор: <b>${h(p.tutor || '—')}</b></span><span>Учебный год: <b>${h(p.year || '—')}</b></span>
          <span>Цель: <b>${h(p.target || '—')} баллов</b></span>
          <span>Экзамен: <b>${p.examDate ? fmtDate(p.examDate) : 'дата не указана'}</b>${dleft != null && dleft >= 0 ? ` · ещё ${dleft} ${plural(dleft, 'день', 'дня', 'дней')}` : ''}</span></div>
      </div>
      <div style="min-width:220px">
        <div class="row small" style="justify-content:space-between"><span class="muted">Освоено заданий</span><b>${o.mastered} из ${d.tasks.length}</b></div>
        ${bar(o.mastered / d.tasks.length * 100, 'green')}
        <div class="row small" style="justify-content:space-between;margin-top:6px"><span class="muted">Пройдено этапов</span><b>${o.stagesDone} из ${d.stages.length}</b></div>
        ${bar(d.stages.length ? o.stagesDone / d.stages.length * 100 : 0)}
      </div>
      ${S.ro ? '' : act('quickLesson', '✎ Итоги урока', { cls: 'pri' })}
    </section>
    <nav class="tabs">${tabs.map(([k, l]) => {
      const cnt = k === 'errors' ? o.overdue.length : k === 'lessons' && !S.ro ? o.hwCheck.length : 0;
      return `<a href="${base}/${k}" class="${S.tab === k ? 'on' : ''}">${l}${cnt ? `<span class="cnt">${cnt}</span>` : ''}</a>`;
    }).join('')}</nav>
    ${VIEWS[S.tab](d, o)}
  </div>`;
}

/* ---------- Главная */
function tiles(d, o) {
  return `<div class="tiles">${d.tasks.map((t, i) => {
    const s = o.ts[i], [lab, tone] = TASK_ST[s.st];
    return `<a class="tile t-${tone}" data-act="goTask" data-i="${i}" title="№${t.n}. ${h(t.topic)} — ${lab}"><b>${t.n}</b><span>${s.lv !== null ? 'ур. ' + s.lv : '—'}</span></a>`;
  }).join('')}</div>
  <div class="legend" style="margin-top:8px">${Object.values(TASK_ST).map(([l, t]) => `<span><i class="t-${t}"></i>${l}</span>`).join('')}</div>`;
}

function viewHome(d, o) {
  const A = nextActions(d, o);
  const last = o.last, best = o.best, bench = d.settings.bench;
  const st = d.stages[o.curStageIdx];
  const sst = st ? stageStat(d, st) : null;
  const diagDone = d.diagnostic.status === 'Проведена';
  const lastTxt = last ? `${last.sum}<small> / ${last.max}</small>` : '—';
  const lastSub = last ? `${fmtDate(last.m.date)}${last.complete ? '' : ` · проверено ${last.checked} из ${d.tasks.length}`}${isSet(last.m.test) ? ` · ${last.m.test} тест.` : ''}` : 'пробников пока нет';
  return `<div class="stack">
    ${!diagDone ? `<div class="callout warn"><div class="grow"><b>Входная диагностика ещё не проведена.</b> Текущий уровень и доступная нагрузка пока неизвестны: маршрут ниже — предварительный шаблон. После диагностики выставьте оценки в карте знаний и скорректируйте этапы.</div>${S.ro ? '' : `<a class="btn" href="#/st/${S.cur.id}/settings">Настроить</a>`}</div>` : ''}
    <div class="kpis">
      <div class="kpi"><div class="kpi-l">Освоенные задания</div><div class="kpi-v">${o.mastered}<small> / ${d.tasks.length}</small></div><div class="kpi-s">подтверждено по критериям</div></div>
      <div class="kpi"><div class="kpi-l">Пройденные этапы</div><div class="kpi-v">${o.stagesDone}<small> / ${d.stages.length}</small></div><div class="kpi-s">${st ? 'сейчас: ' + h(st.month) : 'все этапы завершены'}</div></div>
      <div class="kpi"><div class="kpi-l">Проведено занятий</div><div class="kpi-v">${o.lessonsDone}</div><div class="kpi-s">${d.lessons.filter(l => l.status === 'Запланировано').length} запланировано</div></div>
      <div class="kpi"><div class="kpi-l">Последний пробник</div><div class="kpi-v">${lastTxt}</div><div class="kpi-s">${lastSub}</div></div>
      <div class="kpi"><div class="kpi-l">Лучший полный пробник</div><div class="kpi-v">${best ? `${best.sum}<small> / ${best.max}</small>` : '—'}</div><div class="kpi-s">${best ? fmtDate(best.m.date) + (isSet(best.m.test) ? ` · ${best.m.test} тест.` : '') : 'учитываются полностью проверенные'}</div></div>
      <div class="kpi ${o.hwCheck.length ? 'warn' : ''}"><div class="kpi-l">ДЗ на проверку</div><div class="kpi-v">${o.hwCheck.length}</div><div class="kpi-s">${d.lessons.filter(l => l.hwStatus === 'Задано').length} задано и ещё не сдано</div></div>
      <div class="kpi ${o.overdue.length ? 'alert' : ''}"><div class="kpi-l">Просроченные повторения</div><div class="kpi-v">${o.overdue.length}</div><div class="kpi-s">${d.errors.filter(e => !e.done).length} открытых ошибок</div></div>
      <div class="kpi"><div class="kpi-l">Ориентир ${bench.primary}+ перв. баллов</div><div class="kpi-v">${o.streak}<small> / ${bench.streak} подряд</small></div><div class="kpi-s">полные пробники с соблюдением времени</div></div>
    </div>

    <div class="grid2">
      <div class="card"><div class="card-h"><h3>Ближайшие действия</h3></div><div class="card-b">
        ${A.length ? `<ul class="list">${A.slice(0, 10).map(a => `<li><span class="dot ${a.tone}"></span><div class="grow">${h(a.text)}</div><span class="when">${a.date ? (a.late ? '<b style="color:var(--red)">' + fmtDate(a.date) + '</b>' : fmtDate(a.date)) : ''}</span></li>`).join('')}</ul>` : '<div class="empty">Нет срочных дел. Запланированные занятия, сроки ДЗ и повторения появятся здесь.</div>'}
      </div></div>
      <div class="card"><div class="card-h"><h3>Слабые темы</h3></div><div class="card-b">
        ${o.weak.length ? `<ul class="list">${o.weak.slice(0, 8).map(w => `<li><span class="dot ${TASK_ST[w.s.st][1]}"></span><div class="grow"><b>№${w.t.n}</b> ${h(w.t.topic)}<div class="sub">${h(w.why.join(' · '))}${w.t.nextStep ? ' · дальше: ' + h(w.t.nextStep) : ''}</div></div></li>`).join('')}</ul>` : '<div class="empty">Слабые темы появятся после первых оценок, решений и пробников.</div>'}
      </div></div>
    </div>

    ${!S.ro && o.hwCheck.length ? `<div class="card"><div class="card-h"><h3>Проверка ДЗ</h3><span class="muted small">впишите, сколько решено самостоятельно и сколько верно, — данные попадут в карту знаний</span></div>
      <div class="tbl-wrap"><table class="t"><thead><tr><th>Занятие</th><th>Задание</th><th>ДЗ</th><th class="c">Решено сам.</th><th class="c">Верно</th><th></th></tr></thead><tbody>
      ${o.hwCheck.map(({ l, i }) => `<tr><td>${fmtDate(l.date)}<div class="sub">${h(l.topic)}</div></td><td>${l.task ? '№' + l.task : '—'}</td><td><div class="pre small">${linkify(l.hw || '')}</div></td>
        <td class="c">${numInp(`lessons.${i}.solved`, l.solved)}</td><td class="c">${numInp(`lessons.${i}.correct`, l.correct, { cls: num(l.correct) > num(l.solved) ? 'bad' : '' })}</td>
        <td>${act('hwChecked', '✓ Проверено', { cls: 'sm', i })}</td></tr>`).join('')}
      </tbody></table></div></div>` : ''}

    <div class="grid2">
      <div class="card"><div class="card-h"><h3>Карта 27 заданий</h3><span class="muted small">нажмите на номер, чтобы открыть</span></div><div class="card-b">${tiles(d, o)}</div></div>
      <div class="card"><div class="card-h"><h3>Текущий этап</h3>${st ? badge(st.status, STAGE_ST[st.status]) : ''}</div><div class="card-b stack">
        ${st ? `<div><span class="month">${h(st.month)}</span> — <b>${h(st.title)}</b></div>
          <div class="small">${h(st.topics)}</div>
          ${parseNums(st.tasks).length ? `<div class="row">${parseNums(st.tasks).map(n => `<span class="chip">№${n}</span>`).join('')}</div>` : ''}
          ${sst ? `<div><div class="row small" style="justify-content:space-between"><span class="muted">Освоено заданий этапа</span><b>${sst.done} из ${sst.total}</b></div>${bar(sst.pct, 'green')}</div>` : ''}
          <div class="small"><span class="lbl">Критерий завершения:</span> ${h(st.criterion)}</div>
          ${st.python ? `<div class="small"><span class="lbl">Python:</span> ${h(st.python)}</div>` : ''}`
        : '<div class="empty">Все этапы завершены.</div>'}
      </div></div>
    </div>
  </div>`;
}

/* ---------- Годовой маршрут */
function viewRoute(d, o) {
  const f = S.f.route || '';
  const list = d.stages.map((s, i) => ({ s, i })).filter(x => !f || x.s.status === f);
  return `<div class="stack">
    <div class="callout"><div class="grow"><b>Python — сквозная линия года.</b> В каждом этапе указано, какие приёмы Python осваиваются и применяются. Маршрут предварительный: после диагностики скорректируйте темы, сроки и нагрузку.</div></div>
    <div class="row">
      <select class="f" style="max-width:220px" data-filter="route">${[['', 'Все статусы'], ...opt(Object.keys(STAGE_ST))].map(([v, l]) => `<option value="${h(v)}"${v === f ? ' selected' : ''}>${h(l)}</option>`).join('')}</select>
      <span class="sp" style="flex:1"></span>
      ${act('openAll', 'Развернуть все', { cls: 'sm' })}${act('closeAll', 'Свернуть все', { cls: 'sm' })}
      ${S.ro ? '' : act('addStage', '＋ Этап', { cls: 'sm pri' })}
    </div>
    <div>${list.map(({ s, i }) => stageCard(d, o, s, i)).join('') || '<div class="empty">Нет этапов с таким статусом.</div>'}</div>
  </div>`;
}

function stageCard(d, o, s, i) {
  const ss = stageStat(d, s), k = `stages.${i}`;
  const isOpen = S.open.has(s.id) || (!S.open.has('init:' + s.id) && i === o.curStageIdx);
  const ns = parseNums(s.tasks);
  return `<details class="stage ${i === o.curStageIdx ? 'current' : ''}" data-id="${s.id}"${isOpen ? ' open' : ''}>
    <summary>
      <div class="month">${h(s.month || '—')}${i === o.curStageIdx ? '<small>текущий этап</small>' : ''}</div>
      <div><b>${h(s.title || 'Без названия')}</b><div class="row" style="margin-top:4px">${ns.map(n => `<span class="chip">№${n}</span>`).join('')}</div></div>
      <div>${badge(s.status, STAGE_ST[s.status])}</div>
      <div class="s-prog">${ss ? `<div class="small muted">освоено ${ss.done}/${ss.total}</div>${bar(ss.pct, 'green')}` : '<div class="small muted">прогресс — в комментарии</div>'}</div>
    </summary>
    <div class="stage-body">
      <div class="form-grid">
        ${fld('Месяц / сроки', inp(`${k}.month`, s.month, { r: true }))}
        ${fld('Название этапа', inp(`${k}.title`, s.title, { r: true }))}
        ${fld('Статус', sel(`${k}.status`, s.status, opt(Object.keys(STAGE_ST)), { tones: STAGE_ST }))}
        ${fld('Номера заданий ЕГЭ', inp(`${k}.tasks`, s.tasks, { r: true, ph: 'например: 2, 4, 7' }), { hint: 'по ним считается фактический прогресс этапа' })}
        ${fld('Темы', area(`${k}.topics`, s.topics), { cls: 'wide' })}
        ${fld('Python на этапе', inp(`${k}.python`, s.python))}
        ${fld('Планируемая нагрузка', inp(`${k}.load`, s.load, { ph: 'уточнить после диагностики' }))}
        ${fld('Критерий завершения', area(`${k}.criterion`, s.criterion), { cls: 'wide' })}
        ${fld('Фактический прогресс', area(`${k}.progressNote`, s.progressNote, { ph: 'что реально сделано' }))}
        ${fld('Комментарий репетитора', area(`${k}.comment`, s.comment))}
      </div>
      ${S.ro ? '' : `<div class="row" style="margin-top:12px;justify-content:flex-end">
        ${act('stageUp', '↑ Выше', { cls: 'sm ghost', i })}${act('stageDown', '↓ Ниже', { cls: 'sm ghost', i })}${act('delStage', 'Удалить этап', { cls: 'sm danger', i })}</div>`}
    </div>
  </details>`;
}

/* ---------- Карта знаний */
function viewMap(d, o) {
  const f = S.f.map || '';
  const c = d.settings.criteria;
  const rows = d.tasks.map((t, i) => ({ t, i, s: o.ts[i] })).filter(x => !f || x.s.st === f || (f === 'notm' && !x.s.mastered));
  const months = n => d.stages.filter(s => parseNums(s.tasks).includes(n)).map(s => s.month);
  return `<div class="stack">
    <div class="card"><div class="card-b stack">
      ${tiles(d, o)}
      <div class="small muted">${h(STRUCTURE_NOTE)}</div>
    </div></div>
    <div class="callout"><div class="grow small">
      <b>Задание считается освоенным</b>, только если одновременно: оценка репетитора ≥ <b>${c.minLevel}</b>, самостоятельных решений ≥ <b>${c.minSolved}</b>, точность ≥ <b>${c.minAcc}%</b>. Прохождение темы на уроке не означает освоения.
      Решения и верные ответы считаются автоматически из проверенных ДЗ (вкладка «Занятия и ДЗ») плюс дополнительные решения, внесённые вручную.
      ${S.ro ? '' : 'Критерии и рубрику можно изменить во вкладке «Настройка».'}
    </div></div>
    <div class="row">
      ${`<select class="f" style="max-width:260px" data-filter="map">${[['', 'Все задания'], ['notm', 'Все, кроме освоенных'], ...Object.entries(TASK_ST).map(([k, v]) => [k, v[0]])].map(([v, l]) => `<option value="${v}"${v === f ? ' selected' : ''}>${l}</option>`).join('')}</select>`}
      <span class="muted small">${rows.length} из ${d.tasks.length}</span>
    </div>
    <div class="card"><div class="tbl-wrap"><table class="t">
      <thead><tr><th>№</th><th style="min-width:230px">Тема</th><th class="c">Макс.</th><th style="min-width:130px">План изучения</th><th style="min-width:200px">Оценка репетитора</th><th>Дата проверки</th>
        <th class="c">Решено сам.</th><th class="c">Верно</th><th class="c">Точность</th><th>Статус</th><th style="min-width:200px">Следующий шаг</th><th style="min-width:200px">Комментарий</th></tr></thead>
      <tbody>${rows.map(({ t, i, s }) => {
        const k = `tasks.${i}`, [lab, tone] = TASK_ST[s.st], ms = months(t.n);
        return `<tr id="task-${i}">
          <td><b>${t.n}</b></td>
          <td>${S.ro ? h(t.topic) : area(`${k}.topic`, t.topic, { rows: 2 })}${t.note ? `<div class="note-2027">${h(t.note)}</div>` : ''}</td>
          <td class="c">${S.ro ? t.max : numInp(`${k}.max`, t.max, { max: 4 })}</td>
          <td>${ms.length ? ms.map(m => `<span class="chip">${h(m)}</span>`).join(' ') : '<span class="muted small">нет в маршруте</span>'}<div style="margin-top:4px">${inp(`${k}.plan`, t.plan, { ph: 'доп. план' })}</div></td>
          <td>${sel(`${k}.level`, t.level, levelOpts(d), { t: 'num', tones: LEVEL_TONE })}</td>
          <td>${dateInp(`${k}.checkDate`, t.checkDate)}</td>
          <td class="c"><b class="mono">${s.solved}</b><div class="sub">ДЗ: ${s.aS}</div>${S.ro ? '' : `<div class="sub">+ вручную</div>${numInp(`${k}.extraSolved`, t.extraSolved)}`}</td>
          <td class="c"><b class="mono" style="${s.bad ? 'color:var(--red)' : ''}">${s.correct}</b><div class="sub">ДЗ: ${s.aC}</div>${S.ro ? '' : `<div class="sub">+ вручную</div>${numInp(`${k}.extraCorrect`, t.extraCorrect)}`}</td>
          <td class="c">${s.acc !== null ? `<b class="mono">${s.acc}%</b>` : '<span class="muted">—</span>'}${s.bad ? '<div class="sub" style="color:var(--red)">верных больше, чем решено</div>' : ''}</td>
          <td>${badge(lab, tone)}</td>
          <td>${area(`${k}.nextStep`, t.nextStep)}</td>
          <td>${area(`${k}.comment`, t.comment)}</td>
        </tr>`;
      }).join('')}</tbody></table></div></div>
  </div>`;
}

/* ---------- Занятия и ДЗ */
function viewLessons(d, o) {
  const f = S.f.lessons || {};
  const rows = d.lessons.map((l, i) => ({ l, i }))
    .filter(({ l }) => (!f.status || l.status === f.status) && (!f.hw || l.hwStatus === f.hw) && (!f.task || String(l.task) === f.task))
    .sort((a, b) => (b.l.date || '').localeCompare(a.l.date || ''));
  const fsel = (key, cur, opts) => `<select class="f" style="max-width:220px" data-filter="lessons.${key}">${opts.map(([v, l]) => `<option value="${h(v)}"${String(v) === String(cur || '') ? ' selected' : ''}>${h(l)}</option>`).join('')}</select>`;
  return `<div class="stack">
    <div class="row">
      ${fsel('status', f.status, [['', 'Все занятия'], ...opt(Object.keys(LESSON_ST))])}
      ${fsel('hw', f.hw, [['', 'Любой статус ДЗ'], ...opt(Object.keys(HW_ST))])}
      ${fsel('task', f.task, [['', 'Все задания'], ...d.tasks.map(t => [String(t.n), '№' + t.n])])}
      <span style="flex:1"></span>
      ${S.ro ? '' : act('addLesson', '＋ Запланировать занятие', { cls: 'sm' }) + act('quickLesson', '✎ Итоги урока', { cls: 'sm pri' })}
    </div>
    ${rows.length ? `<div class="card"><div class="tbl-wrap"><table class="t">
      <thead><tr><th>Дата</th><th>№</th><th style="min-width:180px">Тема</th><th style="min-width:150px">Статус занятия</th><th style="min-width:220px">Домашнее задание и ссылки</th><th>Срок</th><th style="min-width:180px">Проверка ДЗ</th><th class="c">Решено сам.</th><th class="c">Верно</th><th style="min-width:180px">Комментарий</th>${S.ro ? '' : '<th></th>'}</tr></thead>
      <tbody>${rows.map(({ l, i }) => {
        const k = `lessons.${i}`, late = l.hwStatus === 'Задано' && l.due && l.due < today();
        return `<tr class="${late ? 'overdue' : ''}">
          <td>${dateInp(`${k}.date`, l.date)}</td>
          <td>${sel(`${k}.task`, l.task ?? '', taskOpts(d), { t: 'num' })}</td>
          <td>${area(`${k}.topic`, l.topic)}</td>
          <td>${sel(`${k}.status`, l.status, opt(Object.keys(LESSON_ST)), { tones: LESSON_ST })}</td>
          <td>${area(`${k}.hw`, l.hw, { rows: 2, ph: 'задание, ссылки' })}</td>
          <td>${dateInp(`${k}.due`, l.due)}${late ? '<div class="sub" style="color:var(--red)">срок прошёл</div>' : ''}</td>
          <td>${sel(`${k}.hwStatus`, l.hwStatus, opt(Object.keys(HW_ST)), { tones: HW_ST })}</td>
          <td class="c">${numInp(`${k}.solved`, l.solved)}</td>
          <td class="c">${numInp(`${k}.correct`, l.correct, { cls: num(l.correct) > num(l.solved) ? 'bad' : '' })}</td>
          <td>${area(`${k}.comment`, l.comment)}</td>
          ${S.ro ? '' : `<td>${act('delLesson', '✕', { cls: 'sm ghost', i, title: 'Удалить занятие' })}</td>`}
        </tr>`;
      }).join('')}</tbody></table></div></div>
      <div class="small muted">Решения из ДЗ попадают в карту знаний, когда статус проверки — «Проверено».</div>`
    : `<div class="empty">${d.lessons.length ? 'Нет занятий по выбранным фильтрам.' : 'Занятий пока нет. После урока нажмите «Итоги урока» — одна форма заполнит занятие, ДЗ, оценку и ошибку.'}</div>`}
  </div>`;
}

/* ---------- Ошибки и повторение */
function viewErrors(d, o) {
  const f = S.f.errors || '';
  const rows = d.errors.map((e, i) => ({ e, i, st: errState(e) }))
    .filter(x => !f || (f === 'open' ? !x.e.done : x.st[0] === f))
    .sort((a, b) => (a.e.done - b.e.done) || (a.e.recheck || '9999').localeCompare(b.e.recheck || '9999'));
  return `<div class="stack">
    ${o.overdue.length ? `<div class="callout warn"><div class="grow"><b style="color:var(--red)">Просрочено повторений: ${o.overdue.length}.</b> Дата повторной проверки прошла, а самостоятельное повторное решение не отмечено.</div></div>` : ''}
    <div class="row">
      <select class="f" style="max-width:240px" data-filter="errors">${[['', 'Все ошибки'], ['open', 'Открытые'], ['Просрочено', 'Просроченные'], ['Скоро', 'Скоро проверка'], ['Закрыто', 'Закрытые']].map(([v, l]) => `<option value="${v}"${v === f ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <span style="flex:1"></span>${S.ro ? '' : act('addError', '＋ Ошибка', { cls: 'sm pri' })}
    </div>
    ${rows.length ? `<div class="card"><div class="tbl-wrap"><table class="t">
      <thead><tr><th>Дата</th><th>№</th><th style="min-width:200px">Ошибка</th><th style="min-width:170px">Причина</th><th style="min-width:200px">Как исправить</th><th>Повторная проверка</th><th style="min-width:150px">Решила сама повторно</th><th>Состояние</th>${S.ro ? '' : '<th></th>'}</tr></thead>
      <tbody>${rows.map(({ e, i, st }) => {
        const k = `errors.${i}`;
        return `<tr class="${st[0] === 'Просрочено' ? 'overdue' : ''}">
          <td>${dateInp(`${k}.date`, e.date)}</td>
          <td>${sel(`${k}.task`, e.task ?? '', taskOpts(d), { t: 'num' })}</td>
          <td>${area(`${k}.error`, e.error)}</td>
          <td>${sel(`${k}.cause`, e.cause, CAUSES.map(c => [c, c || '—']))}</td>
          <td>${area(`${k}.fix`, e.fix)}</td>
          <td>${dateInp(`${k}.recheck`, e.recheck)}</td>
          <td>${check(`${k}.done`, e.done, 'да')}${e.done && e.doneDate ? `<div class="sub">${fmtDate(e.doneDate)}</div>` : ''}</td>
          <td>${badge(st[0], st[1])}</td>
          ${S.ro ? '' : `<td>${act('delError', '✕', { cls: 'sm ghost', i, title: 'Удалить' })}</td>`}
        </tr>`;
      }).join('')}</tbody></table></div></div>`
    : `<div class="empty">${d.errors.length ? 'Нет ошибок по выбранному фильтру.' : 'Ошибок пока нет. Добавляйте их после урока или пробника — с датой повторной проверки.'}</div>`}
  </div>`;
}

/* ---------- Пробники */
function chartSVG(d, o) {
  const ms = o.mocks;
  if (!ms.length) return '<div class="empty">График появится после первого пробника с датой.</div>';
  const W = 760, H = 270, pl = 38, pr = 18, pt = 14, pb = 44;
  const maxY = ms[0].max || 29, bench = num(d.settings.bench.primary);
  const x = i => pl + (ms.length === 1 ? (W - pl - pr) / 2 : i * (W - pl - pr) / (ms.length - 1));
  const y = v => pt + (H - pt - pb) * (1 - v / maxY);
  const ticks = [0, 5, 10, 15, 20, 25, maxY].filter((v, i, a) => a.indexOf(v) === i);
  const step = Math.ceil(ms.length / 8);
  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Динамика первичного балла">`;
  svg += `<rect x="${pl}" y="${y(maxY)}" width="${W - pl - pr}" height="${y(bench) - y(maxY)}" fill="#e2f2e9"/>`;
  svg += `<text x="${W - pr - 4}" y="${y(maxY) + 13}" text-anchor="end" font-size="11" fill="#2d855b">рабочий ориентир ${bench}–${maxY} (не гарантия 90+)</text>`;
  ticks.forEach(v => { svg += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="#e4def0"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#6e6787">${v}</text>`; });
  svg += `<polyline fill="none" stroke="#7656c6" stroke-width="2.5" stroke-linejoin="round" points="${ms.map((m, i) => `${x(i)},${y(m.sum)}`).join(' ')}"/>`;
  ms.forEach((m, i) => {
    svg += `<circle cx="${x(i)}" cy="${y(m.sum)}" r="5.5" fill="${m.complete ? '#7656c6' : '#fff'}" stroke="#7656c6" stroke-width="2"><title>${fmtDate(m.m.date)}: ${m.sum} перв.${m.complete ? '' : ` (проверено ${m.checked} из ${d.tasks.length})`}${isSet(m.m.test) ? `, ${m.m.test} тест.` : ''}</title></circle>`;
    svg += `<text x="${x(i)}" y="${y(m.sum) - 10}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#2a2440">${m.sum}</text>`;
    if (i % step === 0 || i === ms.length - 1) svg += `<text x="${x(i)}" y="${H - pb + 18}" text-anchor="middle" font-size="11" fill="#6e6787">${h(fmtDate(m.m.date))}</text>`;
  });
  svg += `</svg>`;
  return svg + `<div class="legend"><span><i style="background:#7656c6;border-color:#7656c6;border-radius:50%"></i>полностью проверен</span><span><i style="background:#fff;border-color:#7656c6;border-radius:50%"></i>проверен частично — сумма неполная</span></div>`;
}

function heatTable(d, o) {
  const ms = o.mocks.slice().reverse();
  if (!ms.length) return '';
  return `<div class="card"><div class="card-h"><h3>Баллы по заданиям</h3>
    <div class="legend"><span><i class="h full" style="border-color:var(--green-line)"></i>максимум</span><span><i class="h part" style="border-color:var(--amber-line)"></i>частично</span><span><i class="h zero" style="border-color:var(--red-line)"></i>0 — потеря балла</span><span><i style="border-color:var(--line-strong)"></i>· — не проверено</span></div></div>
    <div class="tbl-wrap"><table class="t heat"><thead><tr><th>Дата</th>${d.tasks.map(t => `<th class="c">${t.n}</th>`).join('')}<th class="c">Σ</th></tr></thead>
    <tbody>${ms.map(m => `<tr><td style="white-space:nowrap">${fmtDate(m.m.date)}</td>${d.tasks.map((t, j) => {
      const v = m.m.scores[j];
      if (!isSet(v)) return '<td class="h nc">·</td>';
      const c = +v >= num(t.max) ? 'full' : +v === 0 ? 'zero' : 'part';
      return `<td class="h ${c}">${v}</td>`;
    }).join('')}<td class="c"><b>${m.sum}</b></td></tr>`).join('')}</tbody></table></div></div>`;
}

function viewMocks(d, o) {
  const list = d.mocks.map((m, i) => ({ m, i, s: mockStat(d, m) })).sort((a, b) => (b.m.date || '').localeCompare(a.m.date || ''));
  return `<div class="stack">
    <div class="callout"><div class="grow small">
      <b>Пустая клетка — «не проверено», 0 — реальная потеря балла.</b> Эти состояния не смешиваются: сумма частично проверенного пробника помечается как неполная и не участвует в «лучшем результате».
      Рабочий ориентир подготовки — ${d.settings.bench.primary}–29 первичных баллов на нескольких полных пробниках подряд с соблюдением времени (${EXAM_MIN} мин). Это ориентир, а не гарантированный перевод в 90+ тестовых баллов: шкала перевода 2027 года официально не известна, поэтому тестовый балл вносится вручную с указанием шкалы.
    </div></div>
    <div class="card"><div class="card-h"><h3>Динамика первичного балла</h3></div><div class="card-b">${chartSVG(d, o)}</div></div>
    ${heatTable(d, o)}
    <div class="row"><h3 style="flex:1">Пробники</h3>${S.ro ? '' : act('addMock', '＋ Пробник', { cls: 'sm pri' })}</div>
    ${list.length ? list.map(({ m, i, s }) => mockCard(d, m, i, s)).join('') : '<div class="empty">Пробников пока нет.</div>'}
  </div>`;
}

function mockCard(d, m, i, s) {
  const k = `mocks.${i}`;
  return `<details class="mock" data-id="${m.id}"${S.open.has(m.id) ? ' open' : ''}>
    <summary>
      <b>${m.date ? fmtDate(m.date) : 'Дата не указана'}</b><span class="muted">${h(m.source || 'источник не указан')}</span>
      <span style="flex:1"></span>
      <span class="big">${s.sum}<span class="muted small"> / ${s.max} перв.</span></span>
      ${s.complete ? badge('проверен полностью', 'green') : badge(`проверено ${s.checked} из ${d.tasks.length}`, 'amber')}
      ${isSet(m.test) ? badge(`${m.test} тест.${m.scale ? ' · ' + m.scale : ''}`, 'lilac') : ''}
      ${s.inTime === null ? badge('время не указано', 'gray') : s.inTime ? badge(`${m.time} мин`, 'green') : badge(`${m.time} мин — дольше лимита`, 'red')}
    </summary>
    <div class="stage-body stack">
      <div class="form-grid">
        ${fld('Дата', dateInp(`${k}.date`, m.date))}
        ${fld('Источник варианта', inp(`${k}.source`, m.source, { ph: 'например: демоверсия ФИПИ 2027' }))}
        ${fld('Время выполнения, мин', numInp(`${k}.time`, m.time), { hint: `лимит экзамена — ${EXAM_MIN} мин` })}
        ${fld('Тестовый балл', numInp(`${k}.test`, m.test, { max: 100 }), { hint: 'вносится вручную' })}
        ${fld('Использованная шкала перевода', inp(`${k}.scale`, m.scale, { ph: 'например: шкала 2026 г.' }))}
      </div>
      <div><div class="lbl" style="margin-bottom:6px">Баллы по заданиям (пусто — не проверено)</div>
        <div class="scores">${d.tasks.map((t, j) => {
          const v = m.scores[j], c = !isSet(v) ? '' : +v >= num(t.max) ? 'full' : +v === 0 ? 'zero' : 'part';
          return `<div class="sc ${c}"><div class="lbl">№${t.n}${t.max > 1 ? ` <span class="muted">/${t.max}</span>` : ''}</div>${S.ro ? `<b>${isSet(v) ? v : '·'}</b>` : `<input class="f ${+v > num(t.max) ? 'bad' : ''}" type="number" min="0" max="${t.max}" step="1" inputmode="numeric" data-k="${k}.scores.${j}" data-t="num" data-r value="${isSet(v) ? v : ''}">`}</div>`;
        }).join('')}</div>
        ${S.ro ? '' : `<div class="row" style="margin-top:8px">${act('mockFill', 'Отметить непроверенные как «максимум»', { cls: 'sm', i, title: 'Только для пустых клеток; нули не трогает' })}<span class="muted small">удобно, когда ошибок мало: потом впишите 0 там, где балл потерян</span></div>`}
      </div>
      ${fld('Разбор ошибок', area(`${k}.analysis`, m.analysis, { rows: 3 }))}
      ${S.ro ? '' : `<div class="row" style="justify-content:flex-end">${act('mockToErrors', 'Перенести потери в «Ошибки»', { cls: 'sm', i })}${act('delMock', 'Удалить пробник', { cls: 'sm danger', i })}</div>`}
    </div>
  </details>`;
}

/* ---------- Настройка */
function viewSettings(d) {
  const p = d.profile, g = d.diagnostic, c = d.settings.criteria, b = d.settings.bench;
  const link = studentLink(S.cur);
  return `<div class="stack">
    <div class="card"><div class="card-h"><h3>Профиль</h3></div><div class="card-b"><div class="form-grid">
      ${fld('Имя ученицы', inp('profile.name', p.name, { r: true }))}
      ${fld('Репетитор', inp('profile.tutor', p.tutor, { r: true }))}
      ${fld('Учебный год', inp('profile.year', p.year, { r: true }))}
      ${fld('Целевой балл', numInp('profile.target', p.target, { max: 100 }))}
      ${fld('Дата экзамена', dateInp('profile.examDate', p.examDate), { hint: 'укажите, когда выйдет расписание ЕГЭ-2027' })}
    </div></div></div>

    <div class="card"><div class="card-h"><h3>Входная диагностика и нагрузка</h3>${badge(g.status, DIAG_ST[g.status])}</div><div class="card-b"><div class="form-grid">
      ${fld('Статус диагностики', sel('diagnostic.status', g.status, opt(Object.keys(DIAG_ST)), { tones: DIAG_ST }))}
      ${fld('Дата', dateInp('diagnostic.date', g.date))}
      ${fld('Занятий в неделю', inp('diagnostic.lessonsPerWeek', g.lessonsPerWeek, { ph: 'после диагностики' }))}
      ${fld('Часов самостоятельной работы в неделю', inp('diagnostic.hoursPerWeek', g.hoursPerWeek, { ph: 'после диагностики' }))}
      ${fld('Итоги диагностики', area('diagnostic.summary', g.summary, { rows: 3, ph: 'что получилось, что нет, с чего начинаем' }), { cls: 'wide', hint: 'Оценки по отдельным заданиям выставляйте в «Карте знаний», а этапы и нагрузку правьте в «Годовом маршруте».' })}
    </div></div></div>

    <div class="grid2">
      <div class="card"><div class="card-h"><h3>Критерии освоения задания</h3></div><div class="card-b stack">
        <div class="form-grid">
          ${fld('Минимальная оценка (0–4)', numInp('settings.criteria.minLevel', c.minLevel, { max: 4 }))}
          ${fld('Самостоятельных решений не меньше', numInp('settings.criteria.minSolved', c.minSolved))}
          ${fld('Точность не ниже, %', numInp('settings.criteria.minAcc', c.minAcc, { max: 100 }))}
        </div>
        <div class="small muted">Все три условия должны выполняться одновременно.</div>
      </div></div>
      <div class="card"><div class="card-h"><h3>Ориентир по пробникам</h3></div><div class="card-b stack">
        <div class="form-grid">
          ${fld('Первичных баллов не меньше', numInp('settings.bench.primary', b.primary, { max: 29 }))}
          ${fld('Полных пробников подряд', numInp('settings.bench.streak', b.streak, { max: 10 }))}
        </div>
        <div class="small muted">Считаются только полностью проверенные пробники, выполненные не дольше ${EXAM_MIN} мин. Это рабочий ориентир, а не гарантия 90+ тестовых баллов.</div>
      </div></div>
    </div>

    <div class="card"><div class="card-h"><h3>Рубрика оценки репетитора</h3></div><div class="card-b"><div class="form-grid">
      ${d.settings.rubric.map((r, i) => fld(`Уровень ${i}`, inp(`settings.rubric.${i}`, r, { r: true }))).join('')}
    </div></div></div>

    <div class="card"><div class="card-h"><h3>Ссылка для ученицы</h3></div><div class="card-b stack">
      <div class="small">По этой ссылке ученица видит свою карточку <b>без входа и только для чтения</b>: главную, маршрут, карту знаний, занятия, ошибки и пробники. Заметки ниже ей не показываются.</div>
      ${CLOUD ? '' : '<div class="small" style="color:var(--amber)">Сейчас локальный режим: ссылка откроется только в этом браузере. Для учениц подключите облако (ИНСТРУКЦИЯ.md).</div>'}
      <div class="row"><input class="f" readonly value="${h(link)}" style="flex:1;min-width:240px" onclick="this.select()">
        <button class="btn" data-act="copyLink" data-id="${S.cur.id}">Скопировать</button>
        <a class="btn" href="${h(link)}" target="_blank" rel="noopener">Открыть как ученица</a>
        ${act('rotateLink', 'Сменить ссылку', { cls: 'danger', title: 'Старая ссылка перестанет работать' })}</div>
    </div></div>

    <div class="card"><div class="card-h"><h3>Заметки только для репетитора</h3></div><div class="card-b">${area('private.notes', d.private?.notes, { rows: 4, ph: 'не видны ученице' })}</div></div>

    <div class="card"><div class="card-h"><h3>Резервная копия и копия плана</h3></div><div class="card-b row">
      ${act('exportJson', '⤓ Скачать резервную копию')}
      <span class="muted small">Новую ученицу с копией этого плана (без результатов) можно создать кнопкой «Новая ученица» на главной.</span>
      <span style="flex:1"></span>${act('delStudent', 'Удалить ученицу', { cls: 'danger' })}
    </div></div>

    <div class="card"><div class="card-h"><h3>Как пользоваться</h3></div><div class="card-b small stack">
      <div><b>После урока:</b> «✎ Итоги урока» — одна форма: занятие, оценка по заданию, ДЗ со сроком и, при необходимости, ошибка с датой повторения.</div>
      <div><b>Когда ДЗ сдано:</b> в занятии поставьте «Сдано — на проверку». На главной появится строка проверки: впишите «решено сам.» и «верно», нажмите «Проверено» — числа уйдут в карту знаний.</div>
      <div><b>Освоение:</b> оценка урока сама по себе не делает задание освоенным — нужны подтверждённые самостоятельные решения и точность по критериям выше.</div>
      <div><b>Пробники:</b> пустая клетка — не проверено, 0 — потеря балла. Кнопка «Перенести потери в „Ошибки“» создаст записи для повторения.</div>
      <div><b>Маршрут:</b> этапы, темы, номера заданий, нагрузку и критерии можно менять в любой момент; прогресс этапа считается по освоенным заданиям из его списка.</div>
      <div class="muted">${h(STRUCTURE_NOTE)}</div>
    </div></div>
  </div>`;
}

function studentLink(r) { return location.href.split('#')[0] + '#/s/' + r.share_token; }

/* ================= окна ================= */
function modal(title, body, onSubmit, okLabel = 'Сохранить') {
  const w = document.createElement('div');
  w.className = 'modal-wrap';
  w.innerHTML = `<form class="card modal"><div class="card-h"><h3>${h(title)}</h3><button type="button" class="btn ghost sm" data-close>✕</button></div>
    <div class="card-b">${body}</div><div class="modal-f"><button type="button" class="btn" data-close>Отмена</button><button class="btn pri">${h(okLabel)}</button></div></form>`;
  document.body.appendChild(w);
  w.addEventListener('click', e => { if (e.target === w || e.target.closest('[data-close]')) w.remove(); });
  w.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    e.target.querySelectorAll('input[type=checkbox]').forEach(c => { fd[c.name] = c.checked; });
    if ((await onSubmit(fd, w)) !== false) w.remove();
  });
  setTimeout(() => w.querySelector('input,select,textarea')?.focus(), 30);
  return w;
}
const closeModals = () => document.querySelectorAll('.modal-wrap').forEach(m => m.remove());
function toast(text) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = text;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
}
const mOpts = (opts, cur) => opts.map(([v, l]) => `<option value="${h(v)}"${String(v) === String(cur ?? '') ? ' selected' : ''}>${h(l)}</option>`).join('');

function quickLessonModal() {
  const d = S.cur.data, t0 = today();
  const planned = d.lessons.map((l, i) => ({ l, i })).filter(x => x.l.status === 'Запланировано').sort((a, b) => a.l.date.localeCompare(b.l.date));
  const body = `
    ${planned.length ? fld('Занятие', `<select class="f" name="lessonIdx">${mOpts([['', 'новое занятие'], ...planned.map(x => [x.i, `${fmtDate(x.l.date)} — ${x.l.topic || 'запланированное'}`])], planned[0].l.date <= t0 ? planned[0].i : '')}</select>`) : ''}
    <div class="form-grid">
      ${fld('Дата', `<input class="f" type="date" name="date" value="${t0}">`)}
      ${fld('Задание ЕГЭ', `<select class="f" name="task" id="qlTask">${mOpts(taskOpts(d))}</select>`)}
      ${fld('Тема', `<input class="f" name="topic" id="qlTopic" placeholder="тема урока">`, { cls: 'wide' })}
      ${fld('Оценка по заданию после урока', `<select class="f" name="level">${mOpts([['', 'не менять'], ...levelOpts(d).slice(1)])}</select>`, { cls: 'wide', hint: 'Оценка не делает задание освоенным: нужны подтверждённые самостоятельные решения.' })}
      ${fld('Следующий шаг по заданию', `<input class="f" name="nextStep" placeholder="необязательно">`, { cls: 'wide' })}
    </div>
    <div class="form-grid">
      ${fld('Домашнее задание и ссылки', `<textarea class="f" name="hw" rows="2" placeholder="оставьте пустым, если ДЗ нет"></textarea>`, { cls: 'wide' })}
      ${fld('Срок ДЗ', `<input class="f" type="date" name="due" value="${addDays(t0, 7)}">`)}
      ${fld('Комментарий', `<input class="f" name="comment">`)}
    </div>
    <label class="chk"><input type="checkbox" name="addErr" id="qlErr"><span>Добавить ошибку в «Работу над ошибками»</span></label>
    <div class="form-grid hidden" id="qlErrBox">
      ${fld('Ошибка', `<input class="f" name="error">`, { cls: 'wide' })}
      ${fld('Причина', `<select class="f" name="cause">${mOpts(CAUSES.map(c => [c, c || '—']))}</select>`)}
      ${fld('Повторная проверка', `<input class="f" type="date" name="recheck" value="${addDays(t0, 7)}">`)}
      ${fld('Как исправить', `<input class="f" name="fix">`, { cls: 'wide' })}
    </div>`;
  const w = modal('Итоги урока', body, f => {
    const task = f.task ? +f.task : null;
    const rec = { date: f.date, task, topic: f.topic, status: 'Проведено', hw: f.hw, due: f.hw ? f.due : '', hwStatus: f.hw ? 'Задано' : 'Нет ДЗ', comment: f.comment };
    if (isSet(f.lessonIdx)) Object.assign(d.lessons[+f.lessonIdx], rec);
    else d.lessons.push({ id: uid(), solved: null, correct: null, ...rec });
    if (task) {
      const t = d.tasks.find(x => x.n === task);
      if (f.level !== '') { t.level = +f.level; t.checkDate = f.date; }
      if (f.nextStep) t.nextStep = f.nextStep;
    }
    if (f.addErr && f.error) d.errors.push({ id: uid(), date: f.date, task, error: f.error, cause: f.cause, fix: f.fix, recheck: f.recheck, done: false });
    queueSave(); render(); toast('Итоги урока сохранены');
  });
  const tSel = w.querySelector('#qlTask'), topic = w.querySelector('#qlTopic');
  tSel.addEventListener('change', () => { const t = d.tasks.find(x => String(x.n) === tSel.value); if (t && !topic.dataset.touched) topic.value = t.topic; });
  topic.addEventListener('input', () => { topic.dataset.touched = '1'; });
  const lsel = w.querySelector('[name=lessonIdx]');
  const fillFromPlanned = () => {
    if (!lsel || lsel.value === '') return;
    const l = d.lessons[+lsel.value];
    if (l.task) tSel.value = l.task;
    if (l.topic) { topic.value = l.topic; topic.dataset.touched = '1'; }
    if (l.date) w.querySelector('[name=date]').value = l.date;
  };
  lsel?.addEventListener('change', fillFromPlanned); fillFromPlanned();
  w.querySelector('#qlErr').addEventListener('change', e => w.querySelector('#qlErrBox').classList.toggle('hidden', !e.target.checked));
}

function newStudentModal() {
  const lastTutor = (() => { try { return localStorage.getItem('ege27.tutor') || ''; } catch { return ''; } })();
  const body = `<div class="form-grid">
      ${fld('Имя ученицы', '<input class="f" name="name" required>')}
      ${fld('Репетитор', `<input class="f" name="tutor" value="${h(lastTutor)}">`)}
      ${fld('Основа плана', `<select class="f" name="base">${mOpts([['', 'Стандартный шаблон на год'], ...S.list.map(r => [r.id, 'Копия плана: ' + (r.name || 'без имени')])])}</select>`, { cls: 'wide', hint: 'Из копии переносятся этапы, темы, критерии и рубрика. Оценки, занятия и пробники не копируются.' })}
    </div>`;
  modal('Новая ученица', body, async f => {
    try { localStorage.setItem('ege27.tutor', f.tutor); } catch { /* приватный режим */ }
    const src = f.base ? S.list.find(r => r.id === f.base) : null;
    const data = src ? copyPlan(normalize(src.data), f) : newPlan(f);
    try {
      const r = await Store.create(f.name || 'Без имени', data);
      location.hash = `#/st/${r.id}/home`;
    } catch (e) { alert('Не удалось создать: ' + (e.message || e)); return false; }
  }, 'Создать');
}

/* ================= действия ================= */
const swap = (a, i, j) => { if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; };
const ACTS = {
  quickLesson: () => quickLessonModal(),
  newStudent: () => newStudentModal(),
  addLesson: () => { S.cur.data.lessons.push({ id: uid(), date: today(), task: null, topic: '', status: 'Запланировано', hw: '', due: '', hwStatus: 'Нет ДЗ', solved: null, correct: null, comment: '' }); S.f.lessons = {}; queueSave(); render(); },
  delLesson: i => { if (confirm('Удалить занятие?')) { S.cur.data.lessons.splice(i, 1); queueSave(); render(); } },
  hwChecked: i => { S.cur.data.lessons[i].hwStatus = 'Проверено'; queueSave(); render(); toast('ДЗ отмечено как проверенное'); },
  addError: () => { S.cur.data.errors.push({ id: uid(), date: today(), task: null, error: '', cause: '', fix: '', recheck: addDays(today(), 7), done: false }); S.f.errors = ''; queueSave(); render(); },
  delError: i => { if (confirm('Удалить запись об ошибке?')) { S.cur.data.errors.splice(i, 1); queueSave(); render(); } },
  addMock: () => { const m = { id: uid(), date: today(), source: '', scores: S.cur.data.tasks.map(() => null), time: null, test: null, scale: '', analysis: '' }; S.cur.data.mocks.push(m); S.open.add(m.id); queueSave(); render(); },
  delMock: i => { if (confirm('Удалить пробник со всеми баллами?')) { S.cur.data.mocks.splice(i, 1); queueSave(); render(); } },
  mockFill: i => { const d = S.cur.data, m = d.mocks[i]; d.tasks.forEach((t, j) => { if (!isSet(m.scores[j])) m.scores[j] = t.max; }); queueSave(); render(); },
  mockToErrors: i => {
    const d = S.cur.data, m = d.mocks[i]; let n = 0;
    d.tasks.forEach((t, j) => {
      const v = m.scores[j];
      if (isSet(v) && +v < num(t.max) && !d.errors.some(e => e.mockId === m.id && e.task === t.n)) {
        d.errors.push({ id: uid(), mockId: m.id, date: m.date || today(), task: t.n, error: `Пробник ${fmtDate(m.date)}${m.source ? ' (' + m.source + ')' : ''}: ${v} из ${t.max}`, cause: '', fix: '', recheck: addDays(today(), 7), done: false });
        n++;
      }
    });
    queueSave(); render(); toast(n ? `Добавлено ошибок: ${n}` : 'Новых потерь нет');
  },
  addStage: () => { const s = { id: uid(), month: '', title: 'Новый этап', topics: '', tasks: '', python: '', load: '', criterion: '', status: 'Не начат', progressNote: '', comment: '' }; S.cur.data.stages.push(s); S.open.add(s.id); queueSave(); render(); },
  delStage: i => { if (confirm('Удалить этап из маршрута?')) { S.cur.data.stages.splice(i, 1); queueSave(); render(); } },
  stageUp: i => { swap(S.cur.data.stages, i, i - 1); queueSave(); render(); },
  stageDown: i => { swap(S.cur.data.stages, i, i + 1); queueSave(); render(); },
  openAll: () => { S.cur.data.stages.forEach(s => S.open.add(s.id)); render(); },
  closeAll: () => { S.cur.data.stages.forEach(s => { S.open.delete(s.id); S.open.add('init:' + s.id); }); render(); },
  goTask: i => { S.hl = i; S.f.map = ''; const base = S.ro ? `#/s/${S.cur.share_token}` : `#/st/${S.cur.id}`; if (S.tab === 'map') render(); else location.hash = base + '/map'; },
  copyLink: async (_, el) => {
    const r = el.dataset.id === S.cur?.id ? S.cur : S.list.find(x => x.id === el.dataset.id);
    const link = studentLink(r);
    try { await navigator.clipboard.writeText(link); toast('Ссылка скопирована'); } catch { prompt('Скопируйте ссылку:', link); }
  },
  rotateLink: async () => {
    if (!confirm('Создать новую ссылку? Старая перестанет открываться.')) return;
    await flush();
    try { await Store.rotate(S.cur); render(); toast('Ссылка обновлена'); } catch (e) { alert('Не удалось: ' + (e.message || e)); }
  },
  exportJson: () => {
    const blob = new Blob([JSON.stringify({ app: 'ege27', name: S.cur.name, data: S.cur.data }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ЕГЭ-2027 ${S.cur.data.profile.name || 'ученица'} ${today()}.json`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  delStudent: async () => {
    const nm = S.cur.data.profile.name || 'Без имени';
    if (prompt(`Удалить ученицу «${nm}» со всеми данными? Это нельзя отменить.\nЧтобы подтвердить, введите её имя:`) !== nm) return;
    dirty = false;
    await Store.remove(S.cur.id); S.cur = null; location.hash = '#/';
  },
  logout: async () => { await flush(); await sb.auth.signOut(); },
  reload: () => route(true),
  signup: async () => {
    const f = $('#loginForm'), msg = $('#loginMsg');
    if (!f.reportValidity()) return;
    const { error, data } = await sb.auth.signUp({ email: f.email.value, password: f.password.value, options: { emailRedirectTo: location.origin + location.pathname } });
    msg.textContent = error ? 'Ошибка: ' + error.message : data.session ? '' : 'Аккаунт создан. Подтвердите почту по ссылке из письма, затем войдите.';
  },
};

document.addEventListener('click', async e => {
  const a = e.target.closest('[data-act]');
  if (!a) return;
  const fn = ACTS[a.dataset.act];
  if (!fn) return;
  e.preventDefault();
  try { await fn(a.dataset.i != null ? +a.dataset.i : null, a, e); } catch (err) { console.error(err); alert('Ошибка: ' + (err.message || err)); }
});

// Ввод данных: текст сохраняется на лету; выбор, даты и числа — с перерисовкой зависящих показателей.
let ptrDown = false, pendingRender = false;
document.addEventListener('pointerdown', () => { ptrDown = true; }, true);
document.addEventListener('pointerup', () => { ptrDown = false; if (pendingRender) { pendingRender = false; setTimeout(render, 0); } }, true);
function softRender() { if (ptrDown) pendingRender = true; else setTimeout(render, 0); }

document.addEventListener('input', e => {
  const el = e.target;
  if (!el.dataset || !el.dataset.k || S.ro || el.closest('.modal-wrap')) return;
  if (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'date') return;
  setPath(el.dataset.k, readVal(el)); queueSave();
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset?.filter) {
    const [scope, key] = el.dataset.filter.split('.');
    if (key) { S.f[scope] = { ...(S.f[scope] || {}), [key]: el.value }; } else S.f[scope] = el.value;
    render(); return;
  }
  if (el.id === 'importFile') return importFile(el.files[0]);
  if (!el.dataset?.k || S.ro || el.closest('.modal-wrap')) return;
  const k = el.dataset.k;
  setPath(k, readVal(el));
  if (/^errors\.\d+\.done$/.test(k)) setPath(k.replace(/done$/, 'doneDate'), el.checked ? today() : '');
  if (/^lessons\.\d+\.task$/.test(k)) {
    const l = getPath(k.replace(/\.task$/, '')), t = S.cur.data.tasks.find(x => x.n === l.task);
    if (t && !l.topic) l.topic = t.topic;
  }
  queueSave();
  if (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'date' || 'r' in el.dataset) softRender();
  if (k === 'profile.name') paintTop();
});
document.addEventListener('toggle', e => {
  const el = e.target;
  if (!el.matches || !el.matches('details[data-id]')) return;
  const id = el.dataset.id;
  if (el.open) S.open.add(id); else { S.open.delete(id); S.open.add('init:' + id); }
}, true);

async function importFile(file) {
  if (!file) return;
  try {
    const j = JSON.parse(await file.text());
    if (!j || j.app !== 'ege27' || !j.data) throw new Error('это не резервная копия планера');
    const data = normalize(j.data);
    const name = (data.profile.name || j.name || 'Без имени') + ' (копия)';
    data.profile.name = name;
    const r = await Store.create(name, data);
    location.hash = `#/st/${r.id}/home`;
  } catch (e) { alert('Не удалось импортировать: ' + (e.message || e)); }
}

document.addEventListener('submit', async e => {
  if (e.target.id !== 'loginForm') return;
  e.preventDefault();
  const f = e.target, msg = $('#loginMsg');
  msg.textContent = 'Вход…';
  const { error } = await sb.auth.signInWithPassword({ email: f.email.value, password: f.password.value });
  if (error) msg.textContent = error.message === 'Invalid login credentials' ? 'Неверная почта или пароль.' : 'Ошибка: ' + error.message;
});

/* ================= навигация ================= */
async function route(force = false) {
  await flush();
  closeModals();
  // Возврат по ссылке из письма Supabase: убираем служебные параметры из адреса.
  if (/^#(error|access_token|type)=/.test(location.hash)) {
    const q = new URLSearchParams(location.hash.slice(1));
    history.replaceState(null, '', location.pathname + '#/');
    if (q.get('error')) {
      S.view = 'login'; paint();
      const msg = $('#loginMsg');
      if (msg) msg.textContent = q.get('error_code') === 'otp_expired'
        ? 'Ссылка из письма устарела или уже использована. Попробуйте войти; если почта не подтверждена — запросите новое письмо через «Создать аккаунт».'
        : 'Ошибка входа: ' + (q.get('error_description') || q.get('error'));
      return;
    }
  }
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  try {
    if (parts[0] === 's' && parts[1]) {
      if (force || !S.cur || S.cur.share_token !== parts[1] || !S.ro) {
        S.view = 'loading'; paint();
        const r = await Store.byToken(parts[1]);
        if (!r) { S.view = 'error'; S.err = 'Ссылка недействительна или устарела. Попросите репетитора прислать новую.'; S.cur = null; return paint(); }
        S.cur = { id: null, share_token: parts[1], name: r.name, data: normalize(r.data), updated_at: r.updated_at };
      }
      S.ro = true; S.view = 'public'; S.tab = parts[2] || 'home';
      document.title = `${S.cur.data.profile.name || 'Ученица'} — ЕГЭ-2027`;
      return paint();
    }
    S.ro = false;
    if (CLOUD && !S.user) { S.cur = null; S.view = 'login'; return paint(); }
    if (parts[0] === 'st' && parts[1]) {
      if (!S.cur || S.cur.id !== parts[1]) {
        S.view = 'loading'; paint();
        const r = await Store.get(parts[1]);
        if (!r) { S.view = 'error'; S.err = 'Ученица не найдена.'; S.cur = null; return paint(); }
        r.data = normalize(r.data);
        S.cur = r; S.open = new Set(); S.f = {};
      }
      S.view = 'student'; S.tab = parts[2] || 'home';
      document.title = `${S.cur.data.profile.name || 'Ученица'} — ЕГЭ-2027`;
      return paint();
    }
    S.cur = null; S.view = 'list';
    S.list = await Store.list();
    document.title = 'Ученицы — ЕГЭ-2027 · Информатика';
    paint();
  } catch (e) {
    console.error(e); S.view = 'error'; S.err = e.message || String(e); paint();
  }
}
window.addEventListener('hashchange', () => route());

function loadScript(src) {
  return new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => fail(new Error('не загрузилась библиотека ' + src)); document.head.appendChild(s); });
}

(async function init() {
  try {
    if (CLOUD) {
      await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.50.0/dist/umd/supabase.min.js');
      sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
      const { data } = await sb.auth.getSession();
      S.user = data.session?.user || null;
      sb.auth.onAuthStateChange((_ev, session) => {
        const had = !!S.user; S.user = session?.user || null;
        if (had !== !!S.user) route();
      });
    }
  } catch (e) { S.view = 'error'; S.err = e.message; paint(); return; }
  route();
})();
