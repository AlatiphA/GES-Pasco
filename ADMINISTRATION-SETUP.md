# Administration overview and audit — v1.0.60

Publish the complete `firestore.rules` from this release in the existing **alatipha-ges-pasco** Firestore database before deploying the app. Existing payment-administrator roles are reused. No new roles, indexes, Cloud Functions, or Blaze upgrade are required.

## Overview

Open **Account → Open Administration → Overview**. Refresh after changes.

- Current subscriptions are counted from dated subscription records for registered, active, non-administrator accounts. Sample-only overrides are excluded. Firebase Authentication's disabled/verified flags are not mirrored here; sign-in administration remains in Firebase Authentication.
- Verified subscription totals use immutable `momoReceipts`, including renewals and retained receipts for deleted profiles. Optional support has its own total and purpose label. Pending/rejected submissions are excluded. These totals are not a live MoMo wallet balance.
- Invalid or future-dated receipts are excluded and flagged. No historical receipts are manufactured or modified.
- CSV exports cover overview summary, active/expiring subscriptions, pending submissions and approved receipts. Approved receipts can be restricted to this calendar month in Ghana time. Preview tables show at most 20 rows; exports include all matching loaded rows.
- Reads use the existing payment-administrator permissions and server records, with pagination and bounded waits. A failed read displays an error, not misleading zero totals. Reporting does not change payments or account access.

## Users

Search part of a name or email. Filter by account status and reading access. Pagination has Previous/Next buttons. **Export users CSV** includes every matching profile across pages.

**Suspend** changes to **Activate** after a successful server write; no sliding switch is used. Activation restores the saved access policy and does not renew payment. Reading grants, sample-only overrides and paid subscriptions remain separate. **Remove paid access** appears only for an unexpired subscription and preserves reading grants and receipts. Existing administrators are protected.

## Recent audit

The latest 50 app-recorded events show the account, administrator, action and Ghana time; **Export audit CSV** exports those 50 events.

New `adminAudit` entries are written in the same transaction/batch as account suspension/activation, reading-policy changes, paid-access removal, payment approval/rejection or a private message. Rules require an existing payment administrator, correct actor and timestamp, and the corresponding actual source mutation. Entries cannot be edited or deleted by the app. Message bodies are not copied into the audit.

Logging starts in v1.0.60. Earlier actions, old app clients and edits made directly in Firebase Console are not retroactively logged. Existing clients remain compatible. Published quiz/report tools retain their existing review records.

## Verification

Use local mock profiles and the Firestore emulator for mutation tests. Do not suspend a real reader, remove a paid entitlement, approve a real payment, or send a test message just to verify deployment. Live verification can read Overview, Users and the empty/recent audit.

CSV files include personal account/payment data. Keep them private. User-controlled cells are escaped to prevent spreadsheet formulas from executing on open.
