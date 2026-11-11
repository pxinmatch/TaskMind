import { addDays, format } from "date-fns";
import { ru } from "date-fns/locale";

export type Priority = "high" | "normal" | "low";
export type RepeatMode = "none" | "daily" | "weekly" | "monthly";

export interface ParsedTask {
  title: string;
  due: Date | null;
  priority: Priority;
  tags: string[];
  repeat: RepeatMode;
}

export interface Task {
  id: string;
  title: string;
  dueISO: string | null;
  priority: Priority;
  tags: string[];
  repeat: RepeatMode;
  done: boolean;
  createdAt: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Word boundary that works with Cyrillic letters. */
function boundary(word: string): RegExp {
  return new RegExp(`(?<![a-zа-яё\\d])${word}(?![a-zа-яё\\d])`, "i");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function addMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60_000);
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function nextWeekday(base: Date, target: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const diff = (target - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const WEEKDAY_STEMS: Array<[RegExp, number]> = [
  [/понедельни/, 1],
  [/вторник/, 2],
  [/сред/, 3],
  [/четвер/, 4],
  [/пятниц/, 5],
  [/суббот/, 6],
  [/воскресень/, 0],
];

const MONTH_STEMS: Array<[string, number]> = [
  ["январ", 0],
  ["феврал", 1],
  ["март", 2],
  ["апрел", 3],
  ["ма", 4],
  ["июн", 5],
  ["июл", 6],
  ["август", 7],
  ["сентябр", 8],
  ["октябр", 9],
  ["ноябр", 10],
  ["декабр", 11],
];

interface TimeInfo {
  h: number;
  m: number;
  matched: string;
}

function adjustPartOfDay(h: number, pod: string): number {
  const p = pod.toLowerCase();
  if (p === "вечера" || p === "дня") return h < 12 ? h + 12 : h;
  if (p === "утра") return h === 12 ? 0 : h;
  if (p === "ночи") {
    if (h === 12) return 0;
    if (h >= 7 && h < 12) return h + 12;
    return h;
  }
  return h;
}

function extractTime(text: string): TimeInfo | null {
  // "в 18:00", "в 8", "к 19:30", "в 7 вечера", "в 8 часов утра"
  const withPrep = text.match(
    /(?:^|[\s,])(?:в|к|на)\s+(\d{1,2})(?::(\d{2}))?(?!\d)\s*(?:час(?:ов|а)?)?\s*(утра|дня|вечера|ночи)?(?=$|[\s,.;:!?])/i,
  );
  if (withPrep) {
    const h = adjustPartOfDay(parseInt(withPrep[1], 10), withPrep[4] ?? "");
    const m = withPrep[2] ? parseInt(withPrep[2], 10) : 0;
    if (h > 23 || m > 59) return null;
    return { h, m, matched: withPrep[0] };
  }
  // standalone "18:30"
  const colon = text.match(/(?:^|[\s,])(\d{1,2}):(\d{2})(?!\d)(?=$|[\s,.;:!?])/);
  if (colon) {
    const h = parseInt(colon[1], 10);
    const m = parseInt(colon[2], 10);
    if (h > 23 || m > 59) return null;
    return { h, m, matched: colon[0] };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Main parser                                                         */
/* ------------------------------------------------------------------ */

export function parseTask(raw: string): ParsedTask {
  const now = new Date();
  let text = ` ${raw.replace(/\s+/g, " ").trim()} `;
  const tags: string[] = [];
  let priority: Priority = "normal";
  let repeat: RepeatMode = "none";
  let weeklyDay: number | null = null;

  // 1. Tags: #работа #дом
  text = text.replace(/#[\wа-яё-]+/gi, (m) => {
    const t = m.slice(1);
    if (t && !tags.includes(t.toLowerCase())) tags.push(t.toLowerCase());
    return " ";
  });

  // 2. Priority: !важно !! !срочно !1 (high) / !неважно !3 (low)
  if (/!{2,}|!важн|!срочн|!высок|!1(?![\wа-яё])/i.test(text)) priority = "high";
  else if (/!неважн|!низк|!3(?![\wа-яё])/i.test(text)) priority = "low";
  text = text.replace(/!+[\wа-яё]*/gi, " ");

  // 3. Repeat: каждый день / каждую неделю / по пятницам / ежедневно …
  const repMatch = text.match(
    /кажд(?:ый|ую|ое|ые)\s+(?:день|неделю|месяц|понедельник|вторник|среду|четверг|пятницу|субботу|воскресенье)|ежедневно|еженедельно|ежемесячно|по\s+(?:будням|выходным|понедельникам|вторникам|средам|четвергам|пятницам|субботам|воскресеньям)/i,
  );
  if (repMatch) {
    const s = repMatch[0].toLowerCase();
    const wd = s.match(
      /понедельни|вторник|сред|четвер|пятниц|суббот|воскресень/,
    );
    if (wd) {
      repeat = "weekly";
      const found = WEEKDAY_STEMS.find(([re]) => re.test(wd[0]));
      if (found) weeklyDay = found[1];
    } else if (/недел|еженедельно|выходным/.test(s)) repeat = "weekly";
    else if (/месяц|ежемесячно/.test(s)) repeat = "monthly";
    else repeat = "daily";
    text = text.replace(repMatch[0], " ");
  }

  // 4. Relative time: через 2 часа / через 30 мин / через день
  let due: Date | null = null;
  const rel = text.match(
    /через\s+(\d+)?\s*(мин(?:ут[а-яё]*)?|ч(?:ас[а-яё]*|\.?)|дн(?:я|ей|ю)?|день|недел[а-яё]*)/i,
  );
  if (rel) {
    const n = rel[1] ? parseInt(rel[1], 10) : 1;
    const u = rel[2].toLowerCase();
    let mins: number;
    if (u.startsWith("мин")) mins = n;
    else if (u.startsWith("ч")) mins = n * 60;
    else if (u.startsWith("недел")) mins = n * 7 * 24 * 60;
    else mins = n * 24 * 60;
    due = addMinutes(now, mins);
    text = text.replace(rel[0], " ");
  }

  // 5. Weekday: в пятницу / во вторник / по субботам
  let weekdayBase: Date | null = null;
  if (!due) {
    const wd = text.match(
      /(?:^|\s)(?:в|во|по)\s+(понедельни[а-яё]*|вторни[а-яё]*|сред[а-яё]*|четвер[а-яё]*|пятниц[а-яё]*|суббот[а-яё]*|воскресень[а-яё]*)/i,
    );
    if (wd) {
      const w = wd[1].toLowerCase();
      const found = WEEKDAY_STEMS.find(([re]) => re.test(w));
      if (found) {
        weekdayBase = nextWeekday(now, found[1]);
        if (weeklyDay !== null && weeklyDay !== found[1]) {
          // "по пятницам" already set weekly + this day — keep consistent
          weeklyDay = found[1];
        }
        text = text.replace(wd[0], " ");
      }
    }
  }

  // 6. Day words: сегодня / завтра / послезавтра
  let dayBase: Date | null = null;
  if (!due && !weekdayBase) {
    if (boundary("послезавтра").test(text)) {
      dayBase = addDays(now, 2);
      text = text.replace(boundary("послезавтра"), " ");
    } else if (boundary("завтра").test(text)) {
      dayBase = addDays(now, 1);
      text = text.replace(boundary("завтра"), " ");
    } else if (boundary("сегодня").test(text)) {
      dayBase = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      text = text.replace(boundary("сегодня"), " ");
    }
  }

  // 7. Calendar date: 25.12 или 25 декабря
  let dateBase: Date | null = null;
  if (!due && !weekdayBase && !dayBase) {
    const dmw = text.match(
      /(?<!\d)(\d{1,2})\s+(январ[а-яё]*|феврал[а-яё]*|март[а-яё]*|апрел[а-яё]*|ма[йя][а-яё]*|июн[а-яё]*|июл[а-яё]*|август[а-яё]*|сентябр[а-яё]*|октябр[а-яё]*|ноябр[а-яё]*|декабр[а-яё]*)(?![а-яё])/i,
    );
    if (dmw) {
      const day = parseInt(dmw[1], 10);
      const stem = dmw[2].toLowerCase();
      const month = MONTH_STEMS.find(([s]) => stem.startsWith(s))?.[1];
      if (month !== undefined && day >= 1 && day <= 31) {
        const candidate = new Date(now.getFullYear(), month, day);
        if (startOfDay(candidate) < startOfDay(now)) {
          candidate.setFullYear(candidate.getFullYear() + 1);
        }
        dateBase = candidate;
        text = text.replace(dmw[0], " ");
      }
    } else {
      const dm = text.match(/(?<![\d.])(\d{1,2})[.\-/](\d{1,2})(?![\d.])/);
      if (dm) {
        const day = parseInt(dm[1], 10);
        const month = parseInt(dm[2], 10) - 1;
        if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
          const candidate = new Date(now.getFullYear(), month, day);
          if (startOfDay(candidate) < startOfDay(now)) {
            candidate.setFullYear(candidate.getFullYear() + 1);
          }
          dateBase = candidate;
          text = text.replace(dm[0], " ");
        }
      }
    }
  }

  // 8. Time: в 18:00, в 8 вечера, 14:30
  const time = extractTime(text);
  if (time) text = text.replace(time.matched, " ");

  if (!due) {
    const base = dateBase ?? weekdayBase ?? dayBase;
    if (base) {
      due = new Date(base);
      if (time) due.setHours(time.h, time.m, 0, 0);
      else due.setHours(9, 0, 0, 0);
      if (due.getTime() <= now.getTime()) {
        // time already passed → move to next day (or next week for weekday)
        due = weekdayBase && isSameDay(due, now) ? addDays(due, 7) : addDays(due, 1);
      }
    } else if (time) {
      due = new Date(now);
      due.setHours(time.h, time.m, 0, 0);
      if (due.getTime() <= now.getTime()) due = addDays(due, 1);
    }
  }

  const title = cleanTitle(text);

  return { title, due, priority, tags, repeat };
}

/* ------------------------------------------------------------------ */
/* Title cleanup                                                       */
/* ------------------------------------------------------------------ */

function cleanTitle(text: string): string {
  let t = text.replace(/\s+/g, " ").trim();
  t = t.replace(/^[\s,.;:!?\-–—]+/, "");
  t = t.replace(/[\s,.;:!?\-–—]+$/, "");
  t = t.replace(
    /^(?:напомни(?:ть)?|напоминание)\s+(?:мне\s+)?(?:пожалуйста\s+)?/i,
    "",
  );
  t = t.replace(
    /^(?:добав(?:ь|ить|и)|постав(?:ь|ить)?|созда(?:й|ть)?|создай)\s+(?:новую\s+)?(?:задачу\s+|задач[аи]\s+)?(?:пожалуйста\s+)?/i,
    "",
  );
  t = t.replace(/^(?:мне|пожалуйста|плиз)[,\s]+/i, "");
  t = t.replace(/^(?:в|во|к|на|о|об|про)\s+(?=[а-яёa-z])/i, "");
  t = t.replace(/^(?:[а-яё])\s+(?=[а-яёa-z])/i, "");
  t = t.replace(/\s+пожалуйста\s*$/i, "");
  t = t.replace(/[\s,.;:!?]+$/, "").trim();
  if (!t) return "";
  return capitalize(t.charAt(0)) + t.slice(1);
}

/* ------------------------------------------------------------------ */
/* Task utilities                                                      */
/* ------------------------------------------------------------------ */

export function taskFromParsed(p: ParsedTask): Task {
  return {
    id: crypto.randomUUID(),
    title: p.title || "Задача",
    dueISO: p.due ? p.due.toISOString() : null,
    priority: p.priority,
    tags: p.tags,
    repeat: p.repeat,
    done: false,
    createdAt: Date.now(),
  };
}

export function sortTasks(tasks: Task[]): Task[] {
  const pending = tasks
    .filter((t) => !t.done)
    .sort((a, b) => {
      if (a.dueISO && b.dueISO)
        return new Date(a.dueISO).getTime() - new Date(b.dueISO).getTime();
      if (a.dueISO) return -1;
      if (b.dueISO) return 1;
      return b.createdAt - a.createdAt;
    });
  const done = tasks
    .filter((t) => t.done)
    .sort((a, b) => b.createdAt - a.createdAt);
  return [...pending, ...done];
}

export function formatDue(d: Date): string {
  const now = new Date();
  const diffDays = Math.round((startOfDay(d) - startOfDay(now)) / 86_400_000);
  const time = format(d, "HH:mm");
  if (diffDays === 0) return `сегодня, ${time}`;
  if (diffDays === 1) return `завтра, ${time}`;
  if (diffDays === 2) return `послезавтра, ${time}`;
  if (diffDays > 2 && diffDays < 7)
    return capitalize(format(d, "EEEE", { locale: ru })) + `, ${time}`;
  return `${format(d, "d MMMM", { locale: ru })}, ${time}`;
}

export function repeatLabel(r: RepeatMode): string {
  switch (r) {
    case "daily":
      return "каждый день";
    case "weekly":
      return "каждую неделю";
    case "monthly":
      return "каждый месяц";
    default:
      return "";
  }
}
