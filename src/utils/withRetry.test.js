import { describe, it, expect, vi } from 'vitest';
import { withRetry } from './withRetry';

describe('withRetry', () => {
  it('returns the result on first success without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { baseDelayMs: 0 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds within the attempt budget', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('flaky'))
      .mockResolvedValueOnce('ok');
    const result = await withRetry(fn, { attempts: 3, baseDelayMs: 0 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws the last error once attempts are exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(withRetry(fn, { attempts: 3, baseDelayMs: 0 })).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry when shouldRetry returns false', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('validation error'));
    await expect(
      withRetry(fn, { attempts: 3, baseDelayMs: 0, shouldRetry: () => false })
    ).rejects.toThrow('validation error');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
