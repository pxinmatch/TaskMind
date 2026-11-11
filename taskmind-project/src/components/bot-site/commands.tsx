'use client';

import { motion } from 'framer-motion';

const COMMANDS = [
  { cmd: '/start', desc: 'Запустить бота и получить приветствие' },
  { cmd: '/add', desc: 'Добавить задачу (или просто напишите её текстом)' },
  { cmd: '/list', desc: 'Показать все активные задачи' },
  { cmd: '/today', desc: 'Задачи, запланированные на сегодня' },
  { cmd: '/done', desc: 'Отметить задачу выполненной' },
  { cmd: '/remind', desc: 'Настроить или перенести напоминание' },
  { cmd: '/stats', desc: 'Статистика продуктивности' },
  { cmd: '/tz', desc: 'Настроить часовой пояс для напоминаний' },
  { cmd: '/clear', desc: 'Удалить выполненные и очищенные задачи' },
  { cmd: '/help', desc: 'Справка и примеры запросов' },
];

export default function Commands() {
  return (
    <section id="commands" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-12 max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Команды бота
          </h2>
          <p className="mt-4 text-zinc-400">
            Короткие команды для быстрой навигации — а всё остальное можно просто
            писать словами.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COMMANDS.map((c, i) => (
            <motion.div
              key={c.cmd}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.06 }}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-zinc-900/60 p-4 transition hover:border-teal-500/25"
            >
              <code className="rounded-lg border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 font-mono text-sm font-semibold text-teal-300">
                {c.cmd}
              </code>
              <p className="pt-0.5 text-sm leading-snug text-zinc-400">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
