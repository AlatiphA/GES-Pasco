# Notifications — v1.0.23 setup

This release adds Account → Notifications: personal report-review responses, shared announcements, unread counts, read receipts synced across devices, and previously loaded messages offline. Reviewers can publish/remove announcements in the inbox. No push or email alerts are sent.

## Activate

1. Publish this branch's complete **firestore.rules** in Firebase Console → alatipha-ges-pasco → Firestore Database → Rules. The new notification and announcement permissions are additive. Existing reportAdmins access remains valid; no new reviewer document or composite index is needed.
2. Merge/deploy this branch only after its GitHub checks pass and the rules have been published.
3. Install v1.0.23 from Account → About → Check for updates. Reviewers reopen the app online to refresh their access.

## Check

- Save a review of a real submitted report. The review and personal notification save together in one batch; a failed batch must not claim the review succeeded.
- Sign in as its reporter: Account → Notifications shows Question report updated, status and response. View my reports opens the report list. Mark read removes the unread badge; a later review makes it unread again.
- As a reviewer, open Notifications → Publish announcement. Supply title and message and publish. All signed-in users receive it. Remove announcement retracts it when clients next connect.
- Reopen on another device with the same account: read state follows. Offline, previously loaded messages remain available; read changes require a connection.
- Switch accounts: the old account's messages must disappear. Ordinary users cannot publish announcements or forge report notifications.

The inbox retains the most recent 100 report notifications and 50 announcements. Each report has one notification showing its latest review, not an event-by-event audit log. Existing reviews are not backfilled; saving a review after this update creates its notification. Removed announcements can remain in offline caches until reconnecting. Administrators' responses are visible to reporters.

Validation: npm test; npm run test:rules. All tests use mocks or the local demo Firestore emulator, never the live database.
