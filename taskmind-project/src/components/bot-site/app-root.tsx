'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCheck, CloudCog, Sparkles, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Header from '@/components/bot-site/header';
import Hero from '@/components/bot-site/hero';
import DemoChat from '@/components/bot-site/demo-chat';
import Features from '@/components/bot-site/features';
import HowItWorks from '@/components/bot-site/how-it-works';
import Stats from '@/components/bot-site/stats';
import Commands from '@/components/bot-site/commands';
import Faq from '@/components/bot-site/faq';
import Footer from '@/components/bot-site/footer';
import AuthDialog, {
  type AuthMode,
  type SessionUser,
} from '@/components/bot-site/auth-dialog';
import Workspace from '@/components/bot-site/workspace';
import { Loader2 } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Upsell — invitation to create an account, shown under the demo      */
/* ------------------------------------------------------------------ */

function Upsell({ onAuth }: { onAuth: () => void }) {
  const perks = [
    {
      icon: CloudCog,
      title: 'Облачное хранение',
      text: 'Задачи сохраняются в аккаунте — доступны после перезагрузки и с любого устройства.',
    },
    {
      icon: Sparkles,
      title: 'Настоящий ИИ в чате',
      text: 'Общайтесь с ассистентом прямо на сайте: планирование, советы, разбор задач по шагам.',
    },
    {
      icon: UserRound,
      title: 'Личное пространство',
      text: 'Ваша история чата и список задач — только ваши. Вход по email и паролю.',
    },
  ];

  return (
    <section className="scroll-mt-20 py-10 sm:py-14">
      <div className="mx-auto max-w-4xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-teal-500/25 bg-gradient-to-b from-teal-500/10 via-zinc-900/80 to-zinc-900/80 p-6 sm:p-10"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-500/15 blur-3xl"
          />
          <div className="relative text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/25 bg-teal-500/10 px-3.5 py-1.5 text-sm text-teal-300">
              <CheckCheck className="h-4 w-4" />
              Новое: аккаунт на сайте
            </span>
            <h2 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
              Демо хранит задачи только в браузере
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-zinc-400">
              Создайте бесплатный аккаунт — и получите полноценную версию
              TaskMind с ИИ-чатом прямо на сайте.
            </p>
          </div>

          <div className="relative mt-8 grid gap-4 sm:grid-cols-3">
            {perks.map((p) => (
              <div
                key={p.title}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <p.icon className="h-5 w-5 text-teal-400" />
                <p className="mt-3 text-sm font-semibold">{p.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                  {p.text}
                </p>
              </div>
            ))}
          </div>

          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              onClick={onAuth}
              size="lg"
              className="w-full bg-teal-500 font-medium text-zinc-950 hover:bg-teal-400 sm:w-auto"
            >
              <UserRound className="mr-2 h-4 w-4" />
              Создать аккаунт бесплатно
            </Button>
            <span className="text-xs text-zinc-500">
              Без карты и подписки · 30 секунд
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* App root                                                            */
/* ------------------------------------------------------------------ */

export default function AppRoot() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('register');

  /* restore session */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json().catch(() => null);
        if (!cancelled) setUser(data?.user ?? null);
      } catch {
        if (!cancelled) setUser(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openAuth = useCallback((mode: AuthMode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);

  const handleAuthSuccess = useCallback((u: SessionUser) => {
    setUser(u);
    setAuthOpen(false);
  }, []);

  const handleLogout = useCallback(() => setUser(null), []);

  /* still checking the session */
  if (user === undefined) {
    return (
      <div className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
          <p className="text-sm text-zinc-500">Загрузка TaskMind…</p>
        </div>
      </div>
    );
  }

  /* logged in → workspace */
  if (user) {
    return <Workspace user={user} onLogout={handleLogout} />;
  }

  /* logged out → marketing site + auth dialog */
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-zinc-950 text-zinc-100">
      <Header onAuthClick={() => openAuth('login')} />
      <main className="flex-1">
        <Hero />
        <DemoChat />
        <Upsell onAuth={() => openAuth('register')} />
        <Features />
        <HowItWorks />
        <Stats />
        <Commands />
        <Faq />
      </main>
      <Footer />
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        mode={authMode}
        onModeChange={setAuthMode}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
