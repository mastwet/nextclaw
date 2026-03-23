import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateSession } from '@/api/config';
import { updateNcpSession } from '@/api/ncp-session';
import type { ChatChain } from '@/components/chat/chat-chain';
import { t } from '@/lib/i18n';

type UpdateChatSessionLabelParams = {
  chatChain: ChatChain;
  sessionKey: string;
  label: string | null;
};

export function useChatSessionLabelService() {
  const queryClient = useQueryClient();

  return async (params: UpdateChatSessionLabelParams): Promise<void> => {
    try {
      if (params.chatChain === 'ncp') {
        await updateNcpSession(params.sessionKey, { label: params.label });
        queryClient.invalidateQueries({ queryKey: ['ncp-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['ncp-session-messages', params.sessionKey] });
      } else {
        await updateSession(params.sessionKey, { label: params.label });
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
        queryClient.invalidateQueries({ queryKey: ['session-history', params.sessionKey] });
      }
      toast.success(t('configSavedApplied'));
    } catch (error) {
      toast.error(t('configSaveFailed') + ': ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  };
}
