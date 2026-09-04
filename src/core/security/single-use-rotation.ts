export interface SingleUseStore {
  consumeIfActive(tokenHash: string): Promise<boolean>;
}

/**
 * Shared application-level contract for refresh rotation: the persistence adapter
 * must implement consumeIfActive as one atomic conditional write/transaction.
 */
export async function rotateOnce<T>(store: SingleUseStore, tokenHash: string, mint: () => Promise<T>): Promise<T> {
  const claimed = await store.consumeIfActive(tokenHash);
  if (!claimed) throw new Error('refresh_token_replay_or_race');
  return mint();
}
