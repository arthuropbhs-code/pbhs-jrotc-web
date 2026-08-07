import { describe, it, expect } from 'vitest';
import { canAccessRoute } from './authz';
import { ROLE_HIERARCHY, ROLE_LABELS, ADMIN_LEVEL, STAFF_LEVEL, COMMAND_LEVEL } from '../constants';

// This is the exact decision App.jsx's ProtectedRoute makes for every
// /admin/* route in the app - it's the actual security boundary between a
// plain cadet account and battalion staff/command tooling, so it's worth
// pinning down in tests even though the rest of the routing (React Router
// itself, Firebase auth state) isn't covered here.
describe('canAccessRoute', () => {
  it('lets anyone through when neither minLevel nor allowedRoles is set', () => {
    expect(canAccessRoute({ userLevel: 0, role: 'cadet' })).toBe(true);
  });

  describe('minLevel gating', () => {
    it('blocks a cadet below the threshold', () => {
      expect(canAccessRoute({ userLevel: ROLE_HIERARCHY.cadet, role: 'cadet', minLevel: STAFF_LEVEL })).toBe(false);
    });

    it('allows a role exactly at the threshold', () => {
      expect(canAccessRoute({ userLevel: STAFF_LEVEL, role: 's1_adjutant', minLevel: STAFF_LEVEL })).toBe(true);
    });

    it('allows a role above the threshold', () => {
      expect(canAccessRoute({ userLevel: ROLE_HIERARCHY.battalion_commander, role: 'battalion_commander', minLevel: COMMAND_LEVEL })).toBe(true);
    });
  });

  describe('allowedRoles gating', () => {
    it('allows an explicitly listed role even at low level', () => {
      expect(canAccessRoute({ userLevel: STAFF_LEVEL, role: 's6_technology', allowedRoles: ['s6_technology'] })).toBe(true);
    });

    it('blocks a role not in the list and below admin override level', () => {
      expect(canAccessRoute({ userLevel: STAFF_LEVEL, role: 's1_adjutant', allowedRoles: ['s6_technology'], adminLevel: ADMIN_LEVEL })).toBe(false);
    });

    it('top command always overrides an allowedRoles list it is not on', () => {
      expect(canAccessRoute({ userLevel: ROLE_HIERARCHY.sergeant_major, role: 'sergeant_major', allowedRoles: ['s6_technology'], adminLevel: ADMIN_LEVEL })).toBe(true);
    });

    it('ignores minLevel entirely once allowedRoles is set', () => {
      // A role on the allowedRoles list but below minLevel still gets in -
      // this mirrors the exact branch structure in ProtectedRoute (allowedRoles
      // takes over completely, it does not layer on top of minLevel).
      expect(canAccessRoute({ userLevel: 1, role: 's6_technology', minLevel: 999, allowedRoles: ['s6_technology'], adminLevel: ADMIN_LEVEL })).toBe(true);
    });
  });
});

// The role table itself is the other half of the security boundary - a typo
// or a level that silently regressed would open or close doors without
// anyone noticing until a cadet reported the wrong thing. These checks catch
// that class of mistake, they're not really about canAccessRoute anymore.
describe('ROLE_HIERARCHY integrity', () => {
  it('has a matching label for every role and no orphaned labels', () => {
    const hierarchyRoles = Object.keys(ROLE_HIERARCHY).sort();
    const labelRoles = Object.keys(ROLE_LABELS).sort();
    expect(labelRoles).toEqual(hierarchyRoles);
  });

  it('keeps every level a positive integer', () => {
    for (const [role, level] of Object.entries(ROLE_HIERARCHY)) {
      expect(Number.isInteger(level), `${role} level should be an integer`).toBe(true);
      expect(level, `${role} level should be positive`).toBeGreaterThan(0);
    }
  });

  it('keeps the named tier thresholds in their intended order', () => {
    // Baseline cadet must sit below staff, which must sit below command -
    // if this ever inverts, minLevel checks across the app silently break.
    expect(ROLE_HIERARCHY.cadet).toBeLessThan(COMMAND_LEVEL);
    expect(COMMAND_LEVEL).toBeLessThanOrEqual(STAFF_LEVEL);
    expect(STAFF_LEVEL).toBeLessThanOrEqual(ADMIN_LEVEL);
  });

  it('keeps every battalion staff (S1-S7) role tied at STAFF_LEVEL', () => {
    const staffRoles = ['s1_adjutant', 's2_intelligence', 's3_operations', 's4_logistics', 's5_public_affairs', 's6_technology', 's7_special_projects'];
    for (const role of staffRoles) {
      expect(ROLE_HIERARCHY[role]).toBe(STAFF_LEVEL);
    }
  });
});
