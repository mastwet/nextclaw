import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { upsertNcpSessionSummaryInQueryClient } from '@/api/ncp-session-query-cache';
import { updateNcpSession } from '@/api/ncp-session';
import { t } from '@/lib/i18n';

type UpdateChatSessionLabelParams = {
  sessionKey: string;
  label: string | null;
};

export function useChatSessionLabelService() {
  const queryClient = useQueryClient();

  return async (params: UpdateChatSessionLabelParams): Promise<void> => {
    try {
      const updated = await updateNcpSession(params.sessionKey, { label: params.label });
      upsertNcpSessionSummaryInQueryClient(queryClient, updated);
      toast.success(t('configSavedApplied'));
    } catch (error) {
      toast.error(t('configSaveFailed') + ': ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  };
}
