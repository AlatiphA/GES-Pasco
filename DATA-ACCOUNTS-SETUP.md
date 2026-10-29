# Data and Accounts — v1.0.34

The reader header's trash button becomes a Notifications bell with the same unread badge and inbox as the Account entry. Data and Accounts is an Account menu item; no destructive action remains in the reader header.

## Activate

1. Publish this release branch's complete `firestore.rules` after its checks pass. Deletion is intentionally blocked until these rules are installed.
2. Merge/deploy v1.0.34. No Firebase billing upgrade, Functions deployment, or new administrator setup is required. Push notifications remain paused.
3. Install the update and check Account → Data and Accounts.

## Two separate actions

**Clear this device's data** requires typing CLEAR. It clears the current account's local reader/preferences, practice results, pending reports, cached inbox/publications, synchronization queue, legacy data assigned to this account, and this app's downloaded caches. It does not delete Firebase Auth or cloud records. Other accounts' per-user local records and unrelated sites/apps are preserved. Downloads and interface appearance are browser-wide for GES Pasco; cloud reading data can return after reopening.

**Delete account permanently** requires typing DELETE, being online, and reauthenticating with the current password or Google popup. It first creates an immutable per-UID deletion marker protected by a recent-auth check. Active app writes/admin access are then blocked. Cleanup removes personal reading documents, bookmarks, inbox messages/read receipts, reports submitted by the user, reviewer-role registration and profile, then local app data and Firebase Auth. Shared study content, review audit records and the deletion marker are retained. The Google account itself and copies previously saved on other devices are not deleted.

There is no single cross-service transaction for Firestore and Firebase Auth. Once started, deletion cannot be undone. If any step fails, the Auth account is kept until cloud cleanup has completed; a local/server marker supports resuming after sign-in. The login flow checks this marker before recreating a profile or starting the reader. If Auth deletion needs another recent login, repeat confirmation to finish. Do not manually remove the marker to 'restore' an account whose data has already been removed.

No real account deletion is part of automated tests. Use test accounts for acceptance.

## Acceptance checks

- Bell opens Notifications; badge updates in both header and Account. Header has no trash action.
- Clear a test account's device data. Cloud account/reading records and another account's local records remain; local-only practice history/pending reports disappear. Reopen to restore cloud reading data.
- Wrong password, lowercase confirmation, Google cancellation, or offline deletion must not start deletion.
- With a test account, create bookmarks, reports and an inbox. Delete the account; verify personal cloud paths and Firebase Authentication user are removed. Shared question sets remain.
- Interrupt a test deletion after the marker is created. Reopen online: the app presents completion/sign-out rather than restoring a normal profile. Retry finishes cleanup.
- The same UID with an old token cannot recreate a profile, book position, report, or admin write after its marker exists. Another UID cannot read the marker or delete its data.
- Confirm both dialogs work on phone/desktop and match interface appearance.

Validation: npm test; npm run test:rules (demo emulator).
