'use client';

import { useState } from 'react';
import { CheckCheck, Loader2, LockKeyhole, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

export type AuthMode = 'login' | 'register';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onSuccess: (user: SessionUser) => void;
}

export default function AuthDialog({
  open,
  onOpenChange,
  mode,
  onModeChange,
  onSuccess,
}: AuthDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { toast } = useToast();

  const switchMode = (m: string) => {
    setError(null);
    onModeChange(m === 'register' ? 'register' : 'login');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'register' ? { name, email, password } : { email, password },
        ),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.user) {
        setError(data?.error ?? 'Что-то пошло не так. Попробуйте ещё раз');
        return;
      }
      toast({
        title:
          mode === 'register' ? '🎉 Аккаунт создан!' : `С возвращением! 👋`,
        description:
          mode === 'register'
            ? 'Теперь ваши задачи хранятся в облаке, а в чате отвечает настоящий ИИ.'
            : 'Рады видеть вас снова.',
      });
      setName('');
      setPassword('');
      onSuccess(data.user as SessionUser);
    } catch {
      setError('Нет соединения с сервером. Проверьте интернет');
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-zinc-900 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 shadow-lg shadow-teal-500/25">
              <CheckCheck className="h-5 w-5 text-zinc-950" strokeWidth={2.5} />
            </span>
            <span className="text-lg font-semibold">TaskMind</span>
          </div>
          <DialogTitle>
            {mode === 'login' ? 'Вход в аккаунт' : 'Создать аккаунт'}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {mode === 'login'
              ? 'Ваши задачи и чат с ИИ — всегда под рукой на любом устройстве.'
              : 'Бесплатно, без подтверждений. Задачи будут храниться в облаке.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={switchMode} className="mt-1">
          <TabsList className="grid w-full grid-cols-2 bg-white/5">
            <TabsTrigger value="login">Вход</TabsTrigger>
            <TabsTrigger value="register">Регистрация</TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={submit} className="mt-4 space-y-4">
          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="auth-name">Имя (необязательно)</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="auth-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Как к вам обращаться"
                  autoComplete="name"
                  className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-zinc-500"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="auth-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-zinc-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-password">Пароль</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Минимум 6 символов' : 'Ваш пароль'}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-zinc-500"
              />
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={pending}
            className={cn(
              'w-full bg-teal-500 font-medium text-zinc-950 hover:bg-teal-400',
              pending && 'opacity-70',
            )}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </Button>

          <p className="text-center text-xs text-zinc-500">
            Регистрируясь, вы соглашаетесь, что это демо-проект TaskMind 🙂
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
