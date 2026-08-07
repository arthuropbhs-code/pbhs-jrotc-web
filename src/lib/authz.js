// Pure route-authorization decision, pulled out of App.jsx's ProtectedRoute
// so the highest-risk logic in the app (who gets into which /admin/* route)
// is unit-testable without rendering React Router or mocking Firebase auth.
// Behavior must stay identical to what ProtectedRoute does with it.
//
// - allowedRoles, when present, is checked INSTEAD of minLevel (not in
//   addition to it) - top command (userLevel >= adminLevel) always overrides.
// - minLevel, when present (and allowedRoles isn't), requires userLevel to
//   meet or exceed it.
// - With neither constraint, any signed-in user passes (the caller is
//   expected to have already handled the signed-out case separately).
export function canAccessRoute({ userLevel, role, minLevel, allowedRoles, adminLevel }) {
  if (allowedRoles) {
    return allowedRoles.includes(role) || userLevel >= adminLevel;
  }
  if (minLevel) {
    return userLevel >= minLevel;
  }
  return true;
}
