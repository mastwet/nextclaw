import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveRemoteInstance,
  createRemoteShareGrant,
  deleteRemoteInstance,
  fetchRemoteInstances,
  fetchRemoteShareGrants,
  openRemoteInstance,
  revokeRemoteShareGrant,
  unarchiveRemoteInstance
} from '@/api/client';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export function useRemoteInstancesCardState(props: {
  token: string;
  t: Translate;
}) {
  const queryClient = useQueryClient();
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const invalidateRemoteInstanceQueries = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['remote-instances'] });
    await queryClient.invalidateQueries({ queryKey: ['remote-instances', 'all'] });
  };

  const remoteInstancesQuery = useQuery({
    queryKey: ['remote-instances'],
    queryFn: async () => await fetchRemoteInstances(props.token)
  });

  const archivedInstancesQuery = useQuery({
    queryKey: ['remote-instances', 'all'],
    queryFn: async () => await fetchRemoteInstances(props.token, { includeArchived: true })
  });

  const resolvedInstanceId = selectedInstanceId ?? remoteInstancesQuery.data?.items?.[0]?.id ?? null;
  const archivedInstances = useMemo(
    () => (archivedInstancesQuery.data?.items ?? []).filter((instance) => instance.archivedAt),
    [archivedInstancesQuery.data?.items]
  );

  const remoteShareGrantsQuery = useQuery({
    queryKey: ['remote-share-grants', resolvedInstanceId],
    enabled: Boolean(resolvedInstanceId),
    queryFn: async () => await fetchRemoteShareGrants(props.token, resolvedInstanceId ?? '')
  });

  const openRemoteInstanceMutation = useMutation({
    mutationFn: async (instanceId: string) => await openRemoteInstance(props.token, instanceId),
    onSuccess: (session) => {
      window.open(session.openUrl, '_blank', 'noopener,noreferrer');
    }
  });

  const createRemoteShareMutation = useMutation({
    mutationFn: async (instanceId: string) => await createRemoteShareGrant(props.token, instanceId),
    onSuccess: async (grant) => {
      setSelectedInstanceId(grant.instanceId);
      await queryClient.invalidateQueries({ queryKey: ['remote-share-grants', grant.instanceId] });
      try {
        await navigator.clipboard.writeText(grant.shareUrl);
        setShareFeedback(props.t('remote.messages.newShareCopied'));
      } catch {
        setShareFeedback(props.t('remote.messages.newShareCreated'));
      }
    }
  });

  const revokeRemoteShareMutation = useMutation({
    mutationFn: async (params: { grantId: string; instanceId: string }) => await revokeRemoteShareGrant(props.token, params.grantId),
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['remote-share-grants', variables.instanceId] });
      setShareFeedback(props.t('remote.messages.shareRevoked'));
    }
  });

  const archiveRemoteInstanceMutation = useMutation({
    mutationFn: async (instanceId: string) => await archiveRemoteInstance(props.token, instanceId),
    onSuccess: async (instance) => {
      if (selectedInstanceId === instance.id) {
        setSelectedInstanceId(null);
      }
      await invalidateRemoteInstanceQueries();
      setShareFeedback(props.t('remote.messages.archiveSuccess'));
    }
  });

  const unarchiveRemoteInstanceMutation = useMutation({
    mutationFn: async (instanceId: string) => await unarchiveRemoteInstance(props.token, instanceId),
    onSuccess: async () => {
      await invalidateRemoteInstanceQueries();
      setShareFeedback(props.t('remote.messages.restoreSuccess'));
    }
  });

  const deleteRemoteInstanceMutation = useMutation({
    mutationFn: async (instanceId: string) => await deleteRemoteInstance(props.token, instanceId),
    onSuccess: async ({ instanceId }) => {
      if (selectedInstanceId === instanceId) {
        setSelectedInstanceId(null);
      }
      await invalidateRemoteInstanceQueries();
      setShareFeedback(props.t('remote.messages.deleteSuccess'));
    }
  });

  async function copyShareUrl(shareUrl: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareFeedback(props.t('remote.messages.shareCopied'));
    } catch {
      setShareFeedback(props.t('remote.messages.shareCopyManual'));
    }
  }

  function handleArchiveInstance(instanceId: string): void {
    if (!window.confirm(props.t('remote.messages.archiveConfirm'))) {
      return;
    }
    archiveRemoteInstanceMutation.mutate(instanceId);
  }

  function handleRestoreInstance(instanceId: string): void {
    unarchiveRemoteInstanceMutation.mutate(instanceId);
  }

  function handleDeleteInstance(instanceId: string): void {
    if (!window.confirm(props.t('remote.messages.deleteConfirm'))) {
      return;
    }
    deleteRemoteInstanceMutation.mutate(instanceId);
  }

  return {
    archivedInstances,
    archivedInstancesQuery,
    archiveRemoteInstanceMutation,
    copyShareUrl,
    createRemoteShareMutation,
    deleteRemoteInstanceMutation,
    handleArchiveInstance,
    handleDeleteInstance,
    handleRestoreInstance,
    openRemoteInstanceMutation,
    remoteInstancesQuery,
    remoteShareGrantsQuery,
    resolvedInstanceId,
    revokeRemoteShareMutation,
    setSelectedInstanceId,
    shareFeedback,
    unarchiveRemoteInstanceMutation
  };
}
