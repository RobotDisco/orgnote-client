import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { withDeferredFlagReset, withFlag } from './with-flag';

describe('withFlag', () => {
  it('sets flag while async action runs', async () => {
    const flag = ref(false);
    let observedDuringAction = false;

    const result = await withFlag(flag, async () => {
      observedDuringAction = flag.value;
      await Promise.resolve();
      return 123;
    });

    expect(observedDuringAction).toBe(true);
    expect(flag.value).toBe(false);
    expect(result).toBe(123);
  });

  it('resets flag even if action rejects', async () => {
    const flag = ref(false);

    await expect(
      withFlag(flag, async () => {
        await Promise.resolve();
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(flag.value).toBe(false);
  });
});

describe('withDeferredFlagReset', () => {
  it('keeps flag set until microtask', async () => {
    const flag = ref(false);

    const result = withDeferredFlagReset(flag, () => 7);

    expect(result).toBe(7);
    expect(flag.value).toBe(true);

    await Promise.resolve();

    expect(flag.value).toBe(false);
  });
});

