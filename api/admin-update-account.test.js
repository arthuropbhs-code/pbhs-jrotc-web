import { describe, it, expect } from 'vitest';
import { canManageAccount } from './admin-update-account.js';

// This gates every "act on someone else's account" path in the endpoint
// (email change, suspend, delete, password reset) - it's the actual
// authorization boundary for admin account actions, so it's worth covering
// directly rather than only through the handler's network-heavy code path.
describe('canManageAccount', () => {
  it('denies a caller who is not an email-manager role', () => {
    const result = canManageAccount('company_commander', 'cadet');
    expect(result.allowed).toBe(false);
  });

  it('denies acting on a peer of equal rank', () => {
    // Two S1 adjutants are tied at the same level - "strictly below your
    // own rank" must reject ties, not just outranked-or-above targets.
    const result = canManageAccount('s1_adjutant', 's1_adjutant');
    expect(result.allowed).toBe(false);
  });

  it('denies acting on someone who outranks the caller', () => {
    const result = canManageAccount('s1_adjutant', 'battalion_commander');
    expect(result.allowed).toBe(false);
  });

  it('allows an email-manager role acting on someone strictly below them', () => {
    const result = canManageAccount('s1_adjutant', 'cadet');
    expect(result.allowed).toBe(true);
  });

  it('allows the senior army instructor to manage anyone below them', () => {
    const result = canManageAccount('senior_army_instructor', 'battalion_commander');
    expect(result.allowed).toBe(true);
  });

  it('treats an unknown/blank role as level 0, not a crash', () => {
    const result = canManageAccount('s1_adjutant', '');
    expect(result.allowed).toBe(true);
    const deniedCaller = canManageAccount('', 'cadet');
    expect(deniedCaller.allowed).toBe(false);
  });
});
