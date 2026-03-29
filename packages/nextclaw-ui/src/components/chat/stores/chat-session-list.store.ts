import { create } from 'zustand';
export type ChatSessionListSnapshot = {
  selectedSessionKey: string | null;
  selectedAgentId: string;
  query: string;
};

type ChatSessionListStore = {
  snapshot: ChatSessionListSnapshot;
  setSnapshot: (patch: Partial<ChatSessionListSnapshot>) => void;
};

const initialSnapshot: ChatSessionListSnapshot = {
  selectedSessionKey: null,
  selectedAgentId: 'main',
  query: ''
};

export const useChatSessionListStore = create<ChatSessionListStore>((set) => ({
  snapshot: initialSnapshot,
  setSnapshot: (patch) =>
    set((state) => ({
      snapshot: {
        ...state.snapshot,
        ...patch
      }
    }))
}));
