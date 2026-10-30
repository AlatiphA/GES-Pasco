# Completed practice result synchronization — v1.0.40

Before deploying this release, replace the complete Cloud Firestore Rules editor with this branch’s `firestore.rules`, then Publish. No billing upgrade or Cloud Functions are needed.

The new private collection is `users/{uid}/practiceResults/{encodedAttemptId}`. Owners can read/create their own bounded records and repeat identical writes. Original results are immutable. Account deletion removes these records and prevents recreation using the existing deletion marker.

Existing local completed results upload on sign-in and new results queue after completion. Failed uploads remain in the account-scoped sync outbox and retry after reconnecting or Account → Account → Retry sync. Device histories merge by attempt ID; original scores remain separate from mistake revisions. The latest 20 completed results populate revision progress. Older cloud records remain until account deletion. Unfinished tests remain local.

After deployment:
1. Install v1.0.40 on both devices and sign into the same account.
2. Complete a test on device A and wait for Account → Cloud sync to show Synced.
3. On device B use Account → Account → Retry sync, then open Revision dashboard. Confirm the original result appears once.
4. Revise a missed question on B; sync both devices and check Currently correct improves while the original test score stays unchanged.
5. Repeat offline, reconnect and retry sync. Existing results must remain. A different account must see none of these results.

Device cleanup clears the local copy; synced completed results return after signing in and refreshing sync. No real account deletion is needed to test this release.
