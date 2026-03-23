import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

interface IdentityState {
  userId: string;
  apiKey: string;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
}

export const useIdentityStore = create<IdentityState>()(
  persist(
    (set) => ({
      userId: uuidv4(),
      apiKey: '',
      setApiKey: (key) => set({ apiKey: key }),
      clearApiKey: () => set({ apiKey: '' }),
    }),
    { name: 'tn_identity' },
  ),
);
