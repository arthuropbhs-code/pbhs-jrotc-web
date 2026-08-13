// Pure route-authorization decision, pulled out of App.jsx's ProtectedRoute
// so the highest-risk logic in the app (who gets into which /admin/* route)
// is unit-testable without rendering React Router or mocking Firebase auth.
// Behavior must stay identical to what ProtectedRoute does with it.
//
// - allowedRoles + minLevel together: role must be in allowedRoles OR meet
//   minLevel OR be admin (useful when you need to add one role below the
//   usual level threshold, e.g. company_s1_assistant on /admin/roster).
// - allowedRoles alone: checked INSTEAD of minLevel — top command
//   (userLevel >= adminLevel) always overrides.
// - minLevel alone: requires userLevel to meet or exceed it.
// - With neither constraint, any signed-in user passes (the caller is
//   expected to have already handled the signed-out case separately).
export function canAccessRoute({ userLevel, role, minLevel, allowedRoles, adminLevel, excludedRoles }) {
  // Explicit deny list wins before any other check — used to carve out specific
  // roles that sit at or above an otherwise-qualifying level threshold (e.g.
  // SGM/BC/CSM at ADMIN_LEVEL but excluded from admin-portal-management pages).
  if (excludedRoles?.includes(role)) return false;

  if (allowedRoles && minLevel) {
    // Both specified: allowedRoles extends the minLevel tier by adding
    // specific roles below the threshold (OR condition).
    return allowedRoles.includes(role) || userLevel >= minLevel;
  }
  if (allowedRoles) {
    return allowedRoles.includes(role) || userLevel >= adminLevel;
  }
  if (minLevel) {
    return userLevel >= minLevel;
  }
  return true;
}
