# PII Handling

What personal data this app collects, where it lives, and who can see it. Written to
cross-check against the Firestore rules already in place, not as a substitute for them -
this document doesn't enforce anything by itself.

## What's collected, and why

| Field | Collection | Why it's needed |
|---|---|---|
| Full name (`LASTNAME, FIRSTNAME`) | `users` | Roster identity, required by the JROTC naming convention |
| Login email | Firebase Auth + `users` | Account identity, password reset, notifications |
| Phone number | `users` (optional, self-entered) | Staff contact convenience - never required |
| Rank, position, company, platoon, squad, LET level | `users` | Chain-of-command structure the whole app is built around |
| Gender | `users` | Drives uniform-sizing options in Uniform Requests |
| Bio, practice days | `users` (`dossier`, team leads only) | Shown on the public Teams page for team leadership |
| Uniform request history (cadet name, item, size, notes) | `uniform_requests` | Uniform issuance workflow |
| Camp attendance (name, rank, company) | `camps.attendees` | Battalion Stats / attendance record |
| Task/order assignment | `tasks`, `orders` | Chain-of-command messaging |

Not collected: SSN, date of birth, home address, payment info, government ID. There's no
e-commerce or payment flow anywhere in this app.

## Who can see what

Enforced by Firestore rules (published separately from this repo, in the Firebase console)
using the same `ROLE_HIERARCHY` levels as [src/constants.js](../src/constants.js):

- **A signed-in cadet** can read/write their own `users` doc, and read (not write) the
  public collections (`leadership`, `announcements`, `pageContent`, `documents`).
- **STAFF_LEVEL (70) and above** can read the full roster (`AdminUsers.jsx`), all uniform
  requests, camp attendance, and manage announcements/content.
- **Company leadership** (levels 45-55) sees uniform requests scoped to their own company
  only - not the full roster (`UniformRequests.jsx`'s query is scoped server-side, not
  filtered client-side, so this is a real boundary, not just a hidden UI element).
- **Public/unauthenticated visitors** see only what's explicitly public-facing: the
  Leadership page, Teams page bios, published Announcements, and Documents - no roster,
  no contact info, no uniform data.

## Retention & deletion

- **Self-service deletion**: any cadet can permanently delete their own account (Auth
  user + Firestore record) from [My Profile](../src/pages/MyProfile.jsx) - built this
  session, see the "Danger Zone" section.
- **Admin deletion/suspension**: EMAIL_MANAGER_ROLES (battalion command, S1, S6) can
  suspend or delete an account strictly below their own rank, via
  [api/admin-update-account.js](../api/admin-update-account.js).
- **No automatic retention policy**: accounts persist indefinitely until someone
  explicitly deletes them. There's no batch/scheduled purge of stale or graduated
  cadets' data. Worth a manual roster review at the end of each school year.

## Gaps / open items

- **No Firestore backups configured** - if the database is lost or corrupted, there's no
  restore path today. Tracked separately.
- **No 2FA on staff/admin accounts** - accounts with delete/suspend/broadcast power
  aren't required to use multi-factor auth. Tracked separately.
- **Cookie consent** - Firebase Analytics runs without a consent banner. Tracked
  separately.

These three are queued as their own tasks rather than folded into this doc, since they're
each a real implementation project, not just a documentation gap.
