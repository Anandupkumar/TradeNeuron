import { useIdentityStore } from '../identity.store';

describe('useIdentityStore', () => {
  beforeEach(() => {
    useIdentityStore.setState({ apiKey: '' });
  });

  it('initial state has a userId (non-empty string) and empty apiKey', () => {
    const state = useIdentityStore.getState();
    expect(state.userId.length).toBeGreaterThan(0);
    expect(typeof state.userId).toBe('string');
    expect(state.apiKey).toBe('');
  });

  it('setApiKey updates the apiKey', () => {
    const new_api_key = 'test-api-key-123';
    useIdentityStore.getState().setApiKey(new_api_key);
    expect(useIdentityStore.getState().apiKey).toBe(new_api_key);
  });

  it('clearApiKey resets apiKey to empty string', () => {
    useIdentityStore.getState().setApiKey('temporary-key');
    useIdentityStore.getState().clearApiKey();
    expect(useIdentityStore.getState().apiKey).toBe('');
  });

  it('userId persists across setApiKey/clearApiKey calls (does not change)', () => {
    const initial_user_id = useIdentityStore.getState().userId;
    useIdentityStore.getState().setApiKey('any-key');
    expect(useIdentityStore.getState().userId).toBe(initial_user_id);
    useIdentityStore.getState().clearApiKey();
    expect(useIdentityStore.getState().userId).toBe(initial_user_id);
  });
});
