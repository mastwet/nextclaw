import { useEffect, useMemo, useState } from 'react';
import type { RemoteRuntimeView, RemoteServiceView } from '@/api/types';
import {
  useRemoteDoctor,
  useRemoteBrowserAuthPoll,
  useRemoteBrowserAuthStart,
  useRemoteLogout,
  useRemoteServiceControl,
  useRemoteSettings,
  useRemoteStatus
} from '@/hooks/useRemoteAccess';
import { PageHeader, PageLayout } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusDot } from '@/components/ui/status-dot';
import { Switch } from '@/components/ui/switch';
import { formatDateTime, t } from '@/lib/i18n';
import { Activity, KeyRound, Laptop, RefreshCcw, ServerCog, ShieldCheck, SquareTerminal } from 'lucide-react';
import type { RemoteAccessView, RemoteDoctorView } from '@/api/remote.types';

function getRuntimeStatus(runtime: RemoteRuntimeView | null): { status: 'active' | 'inactive' | 'ready' | 'setup' | 'warning'; label: string } {
  if (!runtime) {
    return { status: 'inactive', label: t('remoteRuntimeMissing') };
  }
  if (runtime.state === 'connected') {
    return { status: 'ready', label: t('remoteStateConnected') };
  }
  if (runtime.state === 'connecting') {
    return { status: 'warning', label: t('remoteStateConnecting') };
  }
  if (runtime.state === 'error') {
    return { status: 'warning', label: t('remoteStateError') };
  }
  if (runtime.state === 'disconnected') {
    return { status: 'warning', label: t('remoteStateDisconnected') };
  }
  return { status: 'inactive', label: t('remoteStateDisabled') };
}

function getServiceStatus(service: RemoteServiceView): { status: 'active' | 'inactive' | 'ready' | 'setup' | 'warning'; label: string } {
  if (!service.running) {
    return { status: 'inactive', label: t('remoteServiceStopped') };
  }
  return service.currentProcess
    ? { status: 'ready', label: t('remoteServiceManagedRunning') }
    : { status: 'active', label: t('remoteServiceRunning') };
}

function KeyValueRow(props: { label: string; value?: string | number | null; muted?: boolean }) {
  const value = props.value === undefined || props.value === null || props.value === '' ? '-' : String(props.value);
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-gray-500">{props.label}</span>
      <span className={props.muted ? 'text-right text-gray-500' : 'text-right text-gray-800'}>{value}</span>
    </div>
  );
}

function resolvePlatformApiBase(platformApiBase: string, status: RemoteAccessView | undefined) {
  return platformApiBase.trim() || status?.settings.platformApiBase || status?.account.apiBase || undefined;
}

function useRemoteBrowserAuthFlow(props: {
  status: RemoteAccessView | undefined;
  platformApiBase: string;
  startBrowserAuth: ReturnType<typeof useRemoteBrowserAuthStart>;
  pollBrowserAuth: ReturnType<typeof useRemoteBrowserAuthPoll>;
}) {
  const { status, platformApiBase, startBrowserAuth, pollBrowserAuth } = props;
  const [authSessionId, setAuthSessionId] = useState<string | null>(null);
  const [authVerificationUri, setAuthVerificationUri] = useState<string | null>(null);
  const [authStatusMessage, setAuthStatusMessage] = useState('');
  const [authExpiresAt, setAuthExpiresAt] = useState<string | null>(null);
  const [authPollIntervalMs, setAuthPollIntervalMs] = useState(1500);

  useEffect(() => {
    if (!status?.account.loggedIn) {
      return;
    }
    setAuthSessionId(null);
    setAuthVerificationUri(null);
    setAuthExpiresAt(null);
    setAuthStatusMessage('');
    setAuthPollIntervalMs(1500);
  }, [status?.account.loggedIn]);

  useEffect(() => {
    if (!authSessionId || status?.account.loggedIn) {
      return;
    }

    let cancelled = false;
    const timerId = window.setTimeout(async () => {
      try {
        const result = await pollBrowserAuth.mutateAsync({
          sessionId: authSessionId,
          apiBase: resolvePlatformApiBase(platformApiBase, status)
        });
        if (cancelled) {
          return;
        }
        if (result.status === 'pending') {
          setAuthStatusMessage(t('remoteBrowserAuthWaiting'));
          setAuthPollIntervalMs(result.nextPollMs ?? 1500);
          return;
        }
        if (result.status === 'authorized') {
          setAuthStatusMessage(t('remoteBrowserAuthCompleted'));
          setAuthSessionId(null);
          setAuthVerificationUri(null);
          return;
        }
        setAuthStatusMessage(result.message || t('remoteBrowserAuthExpired'));
        setAuthSessionId(null);
        setAuthVerificationUri(null);
      } catch {
        if (cancelled) {
          return;
        }
        setAuthSessionId(null);
        setAuthVerificationUri(null);
      }
    }, authPollIntervalMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [authPollIntervalMs, authSessionId, platformApiBase, pollBrowserAuth, status]);

  const start = async () => {
    const result = await startBrowserAuth.mutateAsync({
      apiBase: resolvePlatformApiBase(platformApiBase, status)
    });
    setAuthSessionId(result.sessionId);
    setAuthVerificationUri(result.verificationUri);
    setAuthExpiresAt(result.expiresAt);
    setAuthPollIntervalMs(result.intervalMs);
    setAuthStatusMessage(t('remoteBrowserAuthWaiting'));
    const opened = window.open(result.verificationUri, '_blank', 'noopener,noreferrer');
    if (!opened) {
      setAuthStatusMessage(t('remoteBrowserAuthPopupBlocked'));
    }
  };

  const resume = () => {
    if (!authVerificationUri) {
      return;
    }
    window.open(authVerificationUri, '_blank', 'noopener,noreferrer');
  };

  return {
    authExpiresAt,
    authSessionId,
    authStatusMessage,
    authVerificationUri,
    resume,
    start
  };
}

function RemoteOverviewCard(props: {
  status: RemoteAccessView | undefined;
  runtimeStatus: { status: 'active' | 'inactive' | 'ready' | 'setup' | 'warning'; label: string };
  serviceStatus: { status: 'active' | 'inactive' | 'ready' | 'setup' | 'warning'; label: string };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          {t('remoteOverviewTitle')}
        </CardTitle>
        <CardDescription>{t('remoteOverviewDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <StatusDot status={props.status?.account.loggedIn ? 'ready' : 'inactive'} label={props.status?.account.loggedIn ? t('remoteAccountConnected') : t('remoteAccountNotConnected')} />
          <StatusDot status={props.serviceStatus.status} label={props.serviceStatus.label} />
          <StatusDot status={props.runtimeStatus.status} label={props.runtimeStatus.label} />
        </div>

        <div className="rounded-2xl border border-gray-200/70 bg-gray-50/70 px-4 py-3">
          <KeyValueRow label={t('remoteLocalOrigin')} value={props.status?.localOrigin} />
          <KeyValueRow label={t('remotePublicPlatform')} value={props.status?.platformBase ?? props.status?.account.platformBase} />
          <KeyValueRow label={t('remoteDeviceId')} value={props.status?.runtime?.deviceId} muted />
          <KeyValueRow label={t('remoteLastConnectedAt')} value={props.status?.runtime?.lastConnectedAt ? formatDateTime(props.status.runtime.lastConnectedAt) : '-'} muted />
          <KeyValueRow label={t('remoteLastError')} value={props.status?.runtime?.lastError} muted />
        </div>
      </CardContent>
    </Card>
  );
}

function RemoteDeviceCard(props: {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  deviceName: string;
  setDeviceName: (value: string) => void;
  platformApiBase: string;
  setPlatformApiBase: (value: string) => void;
  settingsMutation: ReturnType<typeof useRemoteSettings>;
  serviceMutation: ReturnType<typeof useRemoteServiceControl>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Laptop className="h-4 w-4 text-primary" />
          {t('remoteDeviceTitle')}
        </CardTitle>
        <CardDescription>{t('remoteDeviceDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-2xl border border-gray-200/70 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{t('remoteEnabled')}</p>
              <p className="mt-1 text-xs text-gray-500">{t('remoteEnabledHelp')}</p>
            </div>
            <Switch checked={props.enabled} onCheckedChange={props.setEnabled} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="remote-device-name">{t('remoteDeviceName')}</Label>
          <Input id="remote-device-name" value={props.deviceName} onChange={(event) => props.setDeviceName(event.target.value)} placeholder={t('remoteDeviceNamePlaceholder')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="remote-platform-api-base">{t('remotePlatformApiBase')}</Label>
          <Input
            id="remote-platform-api-base"
            value={props.platformApiBase}
            onChange={(event) => props.setPlatformApiBase(event.target.value)}
            placeholder="https://ai-gateway-api.nextclaw.io/v1"
          />
          <p className="text-xs text-gray-500">{t('remotePlatformApiBaseHelp')}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() =>
              props.settingsMutation.mutate({
                enabled: props.enabled,
                deviceName: props.deviceName,
                platformApiBase: props.platformApiBase
              })
            }
            disabled={props.settingsMutation.isPending}
          >
            {props.settingsMutation.isPending ? t('saving') : t('remoteSaveSettings')}
          </Button>
          <Button variant="outline" onClick={() => props.serviceMutation.mutate('restart')} disabled={props.serviceMutation.isPending}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {t('remoteRestartService')}
          </Button>
        </div>
        <p className="text-xs text-gray-500">{t('remoteSaveHint')}</p>
      </CardContent>
    </Card>
  );
}

function RemoteAccountCard(props: {
  status: RemoteAccessView | undefined;
  platformApiBase: string;
  browserAuthStartMutation: ReturnType<typeof useRemoteBrowserAuthStart>;
  logoutMutation: ReturnType<typeof useRemoteLogout>;
  authSessionId: string | null;
  authExpiresAt: string | null;
  authStatusMessage: string;
  authVerificationUri: string | null;
  onStartBrowserAuth: () => Promise<void>;
  onResumeBrowserAuth: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          {t('remoteAccountTitle')}
        </CardTitle>
        <CardDescription>{t('remoteAccountDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {props.status?.account.loggedIn ? (
          <>
            <div className="rounded-2xl border border-gray-200/70 bg-gray-50/70 px-4 py-3">
              <KeyValueRow label={t('remoteAccountEmail')} value={props.status.account.email} />
              <KeyValueRow label={t('remoteAccountRole')} value={props.status.account.role} />
              <KeyValueRow label={t('remoteApiBase')} value={props.status.account.apiBase} />
            </div>
            <Button variant="outline" onClick={() => props.logoutMutation.mutate()} disabled={props.logoutMutation.isPending}>
              {props.logoutMutation.isPending ? t('remoteLoggingOut') : t('remoteLogout')}
            </Button>
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-gray-200/70 bg-gray-50/70 px-4 py-3">
              <p className="text-sm font-medium text-gray-900">{t('remoteBrowserAuthTitle')}</p>
              <p className="mt-1 text-sm text-gray-600">{t('remoteBrowserAuthDescription')}</p>
              <div className="mt-3 border-t border-white/80 pt-3">
                <KeyValueRow label={t('remoteApiBase')} value={props.platformApiBase || props.status?.settings.platformApiBase || props.status?.account.apiBase} muted />
                <KeyValueRow label={t('remoteBrowserAuthSession')} value={props.authSessionId} muted />
                <KeyValueRow label={t('remoteBrowserAuthExpiresAt')} value={props.authExpiresAt ? formatDateTime(props.authExpiresAt) : '-'} muted />
              </div>
            </div>
            {props.authStatusMessage ? <p className="text-sm text-gray-600">{props.authStatusMessage}</p> : null}
            <div className="flex flex-wrap gap-3">
              <Button onClick={props.onStartBrowserAuth} disabled={props.browserAuthStartMutation.isPending || !!props.authSessionId}>
                {props.browserAuthStartMutation.isPending
                  ? t('remoteBrowserAuthStarting')
                  : props.authSessionId
                    ? t('remoteBrowserAuthAuthorizing')
                    : t('remoteBrowserAuthAction')}
              </Button>
              {props.authVerificationUri ? (
                <Button variant="outline" onClick={props.onResumeBrowserAuth}>
                  {t('remoteBrowserAuthResume')}
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-gray-500">{t('remoteBrowserAuthHint')}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RemoteServiceCard(props: {
  status: RemoteAccessView | undefined;
  serviceMutation: ReturnType<typeof useRemoteServiceControl>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ServerCog className="h-4 w-4 text-primary" />
          {t('remoteServiceTitle')}
        </CardTitle>
        <CardDescription>{t('remoteServiceDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-gray-200/70 bg-gray-50/70 px-4 py-3">
          <KeyValueRow label={t('remoteServicePid')} value={props.status?.service.pid} />
          <KeyValueRow label={t('remoteServiceUiUrl')} value={props.status?.service.uiUrl} />
          <KeyValueRow label={t('remoteServiceCurrentProcess')} value={props.status?.service.currentProcess ? t('yes') : t('no')} />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => props.serviceMutation.mutate('start')} disabled={props.serviceMutation.isPending}>
            {t('remoteStartService')}
          </Button>
          <Button variant="outline" onClick={() => props.serviceMutation.mutate('restart')} disabled={props.serviceMutation.isPending}>
            {t('remoteRestartService')}
          </Button>
          <Button variant="outline" onClick={() => props.serviceMutation.mutate('stop')} disabled={props.serviceMutation.isPending}>
            {t('remoteStopService')}
          </Button>
        </div>
        <p className="text-xs text-gray-500">{t('remoteServiceHint')}</p>
      </CardContent>
    </Card>
  );
}

function RemoteDoctorCard(props: {
  doctorMutation: ReturnType<typeof useRemoteDoctor>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          {t('remoteDoctorTitle')}
        </CardTitle>
        <CardDescription>{t('remoteDoctorDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => props.doctorMutation.mutate()} disabled={props.doctorMutation.isPending}>
            <SquareTerminal className="mr-2 h-4 w-4" />
            {props.doctorMutation.isPending ? t('remoteDoctorRunning') : t('remoteRunDoctor')}
          </Button>
        </div>

        {props.doctorMutation.data ? <DoctorResultPanel doctor={props.doctorMutation.data} /> : <p className="text-sm text-gray-500">{t('remoteDoctorEmpty')}</p>}
      </CardContent>
    </Card>
  );
}

function DoctorResultPanel(props: { doctor: RemoteDoctorView }) {
  return (
    <div className="rounded-2xl border border-gray-200/70 bg-gray-50/70 px-4 py-3">
      <KeyValueRow label={t('remoteDoctorGeneratedAt')} value={formatDateTime(props.doctor.generatedAt)} muted />
      <div className="mt-3 space-y-2">
        {props.doctor.checks.map((check) => (
          <div key={check.name} className="rounded-xl border border-white bg-white px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-gray-900">{check.name}</span>
              <StatusDot status={check.ok ? 'ready' : 'warning'} label={check.ok ? t('remoteCheckPassed') : t('remoteCheckFailed')} />
            </div>
            <p className="mt-2 text-sm text-gray-600">{check.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RemoteAccessPage() {
  const remoteStatus = useRemoteStatus();
  const browserAuthStartMutation = useRemoteBrowserAuthStart();
  const browserAuthPollMutation = useRemoteBrowserAuthPoll();
  const logoutMutation = useRemoteLogout();
  const settingsMutation = useRemoteSettings();
  const doctorMutation = useRemoteDoctor();
  const serviceMutation = useRemoteServiceControl();

  const status = remoteStatus.data;
  const runtimeStatus = useMemo(() => getRuntimeStatus(status?.runtime ?? null), [status?.runtime]);
  const serviceStatus = useMemo(() => getServiceStatus(status?.service ?? { running: false, currentProcess: false }), [status?.service]);

  const [enabled, setEnabled] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [platformApiBase, setPlatformApiBase] = useState('');
  const browserAuth = useRemoteBrowserAuthFlow({
    status,
    platformApiBase,
    startBrowserAuth: browserAuthStartMutation,
    pollBrowserAuth: browserAuthPollMutation
  });

  useEffect(() => {
    if (!status) {
      return;
    }
    setEnabled(status.settings.enabled);
    setDeviceName(status.settings.deviceName);
    setPlatformApiBase(status.settings.platformApiBase);
  }, [status]);

  if (remoteStatus.isLoading && !status) {
    return <div className="p-8 text-gray-400">{t('remoteLoading')}</div>;
  }

  return (
    <PageLayout className="space-y-6">
      <PageHeader title={t('remotePageTitle')} description={t('remotePageDescription')} />

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <RemoteOverviewCard status={status} runtimeStatus={runtimeStatus} serviceStatus={serviceStatus} />
        <RemoteDeviceCard
          enabled={enabled}
          setEnabled={setEnabled}
          deviceName={deviceName}
          setDeviceName={setDeviceName}
          platformApiBase={platformApiBase}
          setPlatformApiBase={setPlatformApiBase}
          settingsMutation={settingsMutation}
          serviceMutation={serviceMutation}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <RemoteAccountCard
          status={status}
          platformApiBase={platformApiBase}
          browserAuthStartMutation={browserAuthStartMutation}
          logoutMutation={logoutMutation}
          authSessionId={browserAuth.authSessionId}
          authExpiresAt={browserAuth.authExpiresAt}
          authStatusMessage={browserAuth.authStatusMessage}
          authVerificationUri={browserAuth.authVerificationUri}
          onStartBrowserAuth={browserAuth.start}
          onResumeBrowserAuth={browserAuth.resume}
        />
        <RemoteServiceCard status={status} serviceMutation={serviceMutation} />
      </div>

      <RemoteDoctorCard doctorMutation={doctorMutation} />
    </PageLayout>
  );
}
