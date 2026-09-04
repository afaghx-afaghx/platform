import { rotateOnce, SingleUseStore } from '../../src/core/security/single-use-rotation';

describe('refresh rotation concurrency', () => {
  it('allows exactly one concurrent consumer of a single-use refresh credential', async () => {
    let consumed = false;
    const store: SingleUseStore = {
      consumeIfActive: async () => {
        await new Promise((resolve) => setImmediate(resolve));
        if (consumed) return false;
        consumed = true;
        return true;
      },
    };

    const results = await Promise.allSettled([
      rotateOnce(store, 'same-hash', async () => 'new-access-a'),
      rotateOnce(store, 'same-hash', async () => 'new-access-b'),
      rotateOnce(store, 'same-hash', async () => 'new-access-c'),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(2);
  });
});
