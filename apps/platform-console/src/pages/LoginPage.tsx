import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { sendEmailCode, verifyEmailCode } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth';

const highlights = [
  {
    title: '一个账号贯通设备',
    description: '同一个 NextClaw Account 连接你的本地设备、网页设备列表和后续 token 能力。'
  },
  {
    title: '远程访问从这里开始',
    description: '桌面端授权后的设备会直接出现在平台里，点击即可继续原来的 Agent 链路。'
  },
  {
    title: '不区分注册和登录',
    description: '输入邮箱即可继续。如果这是第一次使用，验证成功后会自动创建账号。'
  }
] as const;

type AuthCardProps = {
  email: string;
  code: string;
  codeStepActive: boolean;
  maskedEmail: string;
  sentToEmail: string;
  expiresAtText: string;
  debugCode: string | null;
  error: string | null;
  sendCodePending: boolean;
  verifyCodePending: boolean;
  canSendCode: boolean;
  canVerifyCode: boolean;
  onEmailChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onSendCode: () => void;
  onVerifyCode: () => void;
  onResetEmail: () => void;
};

function LoginHighlights(): JSX.Element {
  return (
    <section className="flex items-center">
      <div className="w-full rounded-[32px] border border-white/60 bg-white/70 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.10)] backdrop-blur md:p-10">
        <div className="max-w-xl space-y-6">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-brand-700">NextClaw Platform</p>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
              一个 NextClaw Account，连接你的设备和 Agent 工作流。
            </h1>
            <p className="max-w-lg text-base leading-7 text-slate-600 md:text-lg">
              这是 NextClaw 的统一账号入口。登录后，你可以在网页里查看设备、打开本地实例，并逐步接入更多账号能力。
            </p>
          </div>

          <div className="grid gap-4">
            {highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-slate-200/80 bg-slate-50/90 px-5 py-4"
              >
                <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LoginAuthCard(props: AuthCardProps): JSX.Element {
  return (
    <section className="flex items-center">
      <Card className="w-full rounded-[32px] border-slate-200/80 bg-white/92 p-7 shadow-[0_24px_72px_rgba(15,23,42,0.12)] md:p-8">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-700">NextClaw Account</p>
          <CardTitle className="text-[28px] leading-tight tracking-[-0.03em]">
            {props.codeStepActive ? '输入验证码继续' : '通过邮箱继续'}
          </CardTitle>
          <p className="text-sm leading-6 text-slate-500">
            {props.codeStepActive
              ? '验证码同时用于登录和注册。验证成功后会自动进入平台。'
              : '我们会把 6 位验证码发送到你的邮箱。如果这是新邮箱，验证后会自动创建账号。'}
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              邮箱
            </label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={props.email}
              onChange={(event) => props.onEmailChange(event.target.value)}
              disabled={props.codeStepActive}
              className="h-12 rounded-2xl px-4 text-[15px]"
            />
          </div>

          {props.codeStepActive ? (
            <div className="rounded-3xl border border-brand-100 bg-brand-50/70 px-4 py-4">
              <p className="text-sm font-medium text-slate-900">验证码已发送至 {props.maskedEmail || props.sentToEmail}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                请输入 6 位验证码。当前验证码过期时间：{props.expiresAtText || '-'}。
              </p>
              {props.debugCode ? (
                <p className="mt-3 rounded-2xl border border-dashed border-brand-300 bg-white px-3 py-2 text-sm text-brand-700">
                  Dev code: <span className="font-semibold tracking-[0.22em]">{props.debugCode}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          {props.codeStepActive ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="code">
                验证码
              </label>
              <Input
                id="code"
                inputMode="numeric"
                placeholder="123456"
                value={props.code}
                onChange={(event) => props.onCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="h-12 rounded-2xl px-4 text-[18px] tracking-[0.28em]"
              />
            </div>
          ) : null}
        </div>

        {props.error ? <p className="mt-4 text-sm text-rose-600">{props.error}</p> : null}

        <div className="mt-6 space-y-3">
          {props.codeStepActive ? (
            <>
              <Button
                className="h-12 w-full rounded-2xl text-[15px]"
                onClick={props.onVerifyCode}
                disabled={!props.canVerifyCode}
              >
                {props.verifyCodePending ? '验证中...' : '继续进入平台'}
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  className="h-11 rounded-2xl"
                  onClick={props.onSendCode}
                  disabled={props.sendCodePending}
                >
                  {props.sendCodePending ? '发送中...' : '重新发送'}
                </Button>
                <Button
                  variant="ghost"
                  className="h-11 rounded-2xl border border-slate-200"
                  onClick={props.onResetEmail}
                >
                  更换邮箱
                </Button>
              </div>
            </>
          ) : (
            <Button
              className="h-12 w-full rounded-2xl text-[15px]"
              onClick={props.onSendCode}
              disabled={!props.canSendCode}
            >
              {props.sendCodePending ? '发送中...' : '发送验证码'}
            </Button>
          )}
        </div>
      </Card>
    </section>
  );
}

export function LoginPage(): JSX.Element {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sentToEmail, setSentToEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);

  const sendCodeMutation = useMutation({
    mutationFn: async () => await sendEmailCode(email),
    onSuccess: (result) => {
      setSentToEmail(result.email);
      setMaskedEmail(result.maskedEmail);
      setExpiresAt(result.expiresAt);
      setDebugCode(result.debugCode ?? null);
      setError(null);
      setCode('');
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    }
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async () => await verifyEmailCode(sentToEmail || email, code),
    onSuccess: (result) => {
      setToken(result.token);
      setUser(result.user);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to verify code');
    }
  });

  const codeStepActive = sentToEmail.trim().length > 0;
  const canSendCode = email.trim().length > 0 && !sendCodeMutation.isPending;
  const canVerifyCode = codeStepActive && /^\d{6}$/.test(code.trim()) && !verifyCodeMutation.isPending;
  const expiresAtText = useMemo(() => {
    if (!expiresAt) {
      return '';
    }
    return new Date(expiresAt).toLocaleString();
  }, [expiresAt]);

  return (
    <main className="min-h-screen bg-transparent text-slate-950">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1.08fr_0.92fr] lg:px-10">
        <LoginHighlights />
        <LoginAuthCard
          email={email}
          code={code}
          codeStepActive={codeStepActive}
          maskedEmail={maskedEmail}
          sentToEmail={sentToEmail}
          expiresAtText={expiresAtText}
          debugCode={debugCode}
          error={error}
          sendCodePending={sendCodeMutation.isPending}
          verifyCodePending={verifyCodeMutation.isPending}
          canSendCode={canSendCode}
          canVerifyCode={canVerifyCode}
          onEmailChange={setEmail}
          onCodeChange={setCode}
          onSendCode={() => sendCodeMutation.mutate()}
          onVerifyCode={() => verifyCodeMutation.mutate()}
          onResetEmail={() => {
            setSentToEmail('');
            setMaskedEmail('');
            setExpiresAt('');
            setDebugCode(null);
            setCode('');
            setError(null);
          }}
        />
      </div>
    </main>
  );
}
