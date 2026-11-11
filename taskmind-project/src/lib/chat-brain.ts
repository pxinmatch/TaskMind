import ZAI from "z-ai-web-dev-sdk";
import {
  formatDue,
  isSameDay,
  parseTask,
  repeatLabel,
  sortTasks,
  taskFromParsed,
  type Task,
} from "@/lib/task-parser";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface BrainMessage {
  role: "user" | "assistant";
  content: string;
}

export interface BrainResult {
  reply: string;
  createdTask?: Task;
  clearedTasks?: boolean;
  usedAI: boolean;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const GREETING = `👋 Привет! Я TaskMind — ваш умный список задач.
Просто напишите задачу обычными словами, например:
«Купить хлеб завтра в 18:00» — я сам разберу время.`;

const GREETING_SHORT =
  "Привет! 👋 Напишите новую задачу или /help — покажу, что я умею.";

const HELP = `Чем я могу помочь:
• Напишите задачу словами: «Оплатить интернет послезавтра»
• ❗️ !важно — приоритет · 🏷 #тег — категория
• Время: «завтра в 18:00», «через 2 часа», «в пятницу», «каждый день»
• Команды: /list · /today · /stats · /clear
• Или просто спросите меня о чём угодно — я настоящий ИИ 🙂`;

const AI_FALLBACK =
  "🤖 ИИ временно не отвечает — но я всё ещё умею записывать задачи! " +
  "Напишите, например: «Позвонить маме завтра в 12:00».";

/** Verbs / nouns that signal "this is a task", even without a time. */
const TASK_VERBS =
  /(напомни|напоминан|добав|постав|созда|запиши|записать|купи|купить|оплати|оплатить|заплати|заплатить|позвони|позвонить|напиши|написать|отправь|отправить|встреч|созвон|сделать|сделай|прочита|заказ|тренировк|уборк|отчёт|отчет|собеседован|забрать|забери|проверить|проверь|подготов|полить|выехать|вынести|забронир|посетить|сдать|позвон)/i;

/** Questions and small talk are NOT tasks. */
const NOT_TASK =
  /(^\s*(как|что|где|когда|почему|зачем|сколько|кто|какой|какая|какие|можешь|можете|умеешь|умеете|расскажи|объясни|подскажи|посоветуй|скажи|привет|здравствуй|спасибо|благодарю|хай|hello|hi|помоги|помогите)\b)|(\?\s*$)/i;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function listText(list: Task[], title = "📋 Активные задачи"): string {
  const sorted = sortTasks(list);
  return list.length > 0
    ? `${title} (${list.length}):\n` +
        sorted
          .map(
            (t, i) =>
              `${i + 1}. «${t.title}»${
                t.dueISO ? ` — ${formatDue(new Date(t.dueISO))}` : ""
              }${t.priority === "high" ? " ❗️" : ""}`,
          )
          .join("\n")
    : "🎉 Активных задач нет — можно отдыхать!";
}

export function confirmation(t: Task): string {
  const lines = ["✅ Задача добавлена!", `📋 «${t.title}»`];
  if (t.dueISO) {
    lines.push(`⏰ Напомню: ${formatDue(new Date(t.dueISO))}`);
  } else {
    lines.push(
      "💬 Без напоминания. Напишите время — например, «завтра в 18:00».",
    );
  }
  if (t.repeat !== "none") lines.push(`🔁 Повтор: ${repeatLabel(t.repeat)}`);
  if (t.priority === "high") lines.push("❗️ Приоритет: высокий");
  if (t.priority === "low") lines.push("⬇️ Приоритет: низкий");
  if (t.tags.length > 0)
    lines.push(`🏷 Категории: ${t.tags.map((x) => `#${x}`).join(" ")}`);
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/* System prompt for the LLM                                           */
/* ------------------------------------------------------------------ */

function buildSystemPrompt(tasks: Task[]): string {
  const pending = sortTasks(tasks.filter((t) => !t.done));
  const taskLines =
    pending.length > 0
      ? pending
          .slice(0, 15)
          .map((t) => {
            const due = t.dueISO ? formatDue(new Date(t.dueISO)) : "без времени";
            const prio = t.priority === "high" ? " ❗️высокий" : "";
            const tags = t.tags.length ? ` (${t.tags.map((x) => "#" + x).join(" ")})` : "";
            return `- «${t.title}» — ${due}${prio}${tags}`;
          })
          .join("\n")
      : "пока нет активных задач";

  return [
    "Ты — TaskMind, дружелюбный ИИ-ассистент для управления задачами и напоминаниями. Ты работаешь и в Telegram, и на сайте TaskMind.",
    "",
    "Правила ответа:",
    "- Отвечай по-русски, живо и кратко: обычно 1–4 предложения. Уместны эмодзи.",
    "- Не используй Markdown-разметку: ни **жирного**, ни ###заголовков, ни списков через дефис. Только обычный текст, нумерация и переносы строк.",
    "- Ниже приведён актуальный список задач пользователя. Опирайся только на него и не выдумывай задачи.",
    "- Если пользователь просит добавить задачу или напомнить о чём-то — скажи, что достаточно написать это сообщением с временем, например: «Купить хлеб завтра в 18:00». Задачи с указанным временем создаются автоматически.",
    "- Если просят спланировать день или разбить большую задачу на шаги — предложи короткий нумерованный план из 3–5 пунктов.",
    "- Если пользователь спрашивает про свои задачи (например «что у меня на завтра?») — перечисли их из списка ниже.",
    "- Будь конкретным и полезным, без воды.",
    "",
    "Активные задачи пользователя:",
    taskLines,
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* LLM call                                                            */
/* ------------------------------------------------------------------ */

async function callLLM(
  tasks: Task[],
  history: BrainMessage[],
  userMessage: string,
): Promise<string | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: buildSystemPrompt(tasks) },
          ...history.slice(-10),
          { role: "user", content: userMessage },
        ],
        thinking: { type: "disabled" },
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (text) return text;
      throw new Error("empty response");
    } catch (err) {
      console.error(`LLM attempt ${attempt} failed:`, err);
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Main brain                                                          */
/* ------------------------------------------------------------------ */

export async function processMessage(
  message: string,
  tasks: Task[],
  history: BrainMessage[],
  actions: {
    completeByNumber: (n: number) => Promise<Task | null>;
    clearAllTasks: () => Promise<void>;
  },
): Promise<BrainResult> {
  const cmd = message.trim().toLowerCase().replace(/\s+/g, " ");
  const pending = tasks.filter((t) => !t.done);

  /* ----- commands & small talk (deterministic, like the bot) ----- */

  if (cmd.startsWith("/start")) return { reply: GREETING, usedAI: false };
  if (cmd.startsWith("/help") || /помощь|что ты умеешь|как пользоваться/.test(cmd))
    return { reply: HELP, usedAI: false };

  if (
    cmd.startsWith("/list") ||
    ["список", "задачи", "мои задачи", "все задачи"].includes(cmd)
  )
    return { reply: listText(pending), usedAI: false };

  if (cmd.startsWith("/today") || ["сегодня", "на сегодня"].includes(cmd)) {
    const today = pending.filter(
      (t) => t.dueISO && isSameDay(new Date(t.dueISO), new Date()),
    );
    return {
      reply:
        today.length > 0
          ? `☀️ Задачи на сегодня (${today.length}):\n` +
            today
              .map(
                (t, i) =>
                  `${i + 1}. «${t.title}» — ${formatDue(
                    new Date(t.dueISO!),
                  )}${t.priority === "high" ? " ❗️" : ""}`,
              )
              .join("\n")
          : "☀️ На сегодня задач нет. Отличный день, чтобы спланировать завтра!",
      usedAI: false,
    };
  }

  if (cmd.startsWith("/stats") || cmd === "статистика") {
    const done = tasks.length - pending.length;
    const high = pending.filter((t) => t.priority === "high").length;
    return {
      reply: `📊 Ваша статистика:\n• Всего задач: ${tasks.length}\n• Выполнено: ${done}\n• Активных: ${pending.length}\n• ❗️ С высоким приоритетом: ${high}`,
      usedAI: false,
    };
  }

  if (cmd.startsWith("/clear") || cmd === "очистить") {
    await actions.clearAllTasks();
    return { reply: "🧹 Все задачи удалены. Чистый лист!", clearedTasks: true, usedAI: false };
  }

  if (/^(спасибо|благодарю|thanks|спс)/.test(cmd))
    return {
      reply: "Всегда рад помочь! 😊 Если что-то нужно напомнить — просто напишите.",
      usedAI: false,
    };

  if (
    /^(привет|здравствуй|доброе утро|добрый день|добрый вечер|хай|hello|hi)[\s!.,]*$/.test(
      cmd,
    )
  )
    return { reply: GREETING_SHORT, usedAI: false };

  if (cmd.startsWith("/") && cmd.length > 1)
    return {
      reply: "🤔 Не знаю такую команду. Напишите /help — покажу, что я умею.",
      usedAI: false,
    };

  /* ----- «готово N» — complete the Nth task ----- */

  const doneMatch = cmd.match(/^(?:готово|done)\s+(\d+)$/);
  if (doneMatch) {
    const n = parseInt(doneMatch[1], 10) - 1;
    const target = n >= 0 ? await actions.completeByNumber(n) : null;
    return {
      reply: target
        ? `Отлично! «${target.title}» выполнена ✅ Так держать! 🎉`
        : "Нет задачи с таким номером. Напишите /list, чтобы увидеть список.",
      usedAI: false,
    };
  }

  /* ----- task detection ----- */

  const parsed = parseTask(message);
  const looksLikeTask =
    parsed.title.length >= 3 &&
    !NOT_TASK.test(message.trim()) &&
    (parsed.due !== null ||
      parsed.tags.length > 0 ||
      parsed.priority !== "normal" ||
      parsed.repeat !== "none" ||
      TASK_VERBS.test(message));

  if (looksLikeTask) {
    const task = taskFromParsed(parsed);
    return { reply: confirmation(task), createdTask: task, usedAI: false };
  }

  /* ----- everything else → real AI ----- */

  const aiReply = await callLLM(tasks, history, message);
  return {
    reply: aiReply ?? AI_FALLBACK,
    usedAI: aiReply !== null,
  };
}
