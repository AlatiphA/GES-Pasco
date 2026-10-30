# MoMo setup — v1.0.43

This release prepares manual support/subscription payments on Spark, without Cloud Functions or a billing upgrade. It does not debit wallets, automatically verify transfers, enforce a paywall, or start the trial. Existing readers keep access. Do not announce paid-only access yet.

## Required before deployment
1. Publish this branch’s complete `firestore.rules` in Firebase → Firestore → Rules.
2. Create the root collection `paymentAdmins`. Use the intended financial administrator’s Firebase Authentication UID as the document ID, and add `active` (boolean) = `true`. Existing `reportAdmins` access does not confer payment authority. Only grant this to someone authorized to verify actual received funds.
3. Tell us when the rules and payment-administrator document are ready, then deploy this release.

## Workflow
Account → MoMo and subscriptions shows recipient MTN MoMo **0243443688, Abdul-Latif Ahmed**. Plans: GH₵20/1 month, GH₵50/3 months, GH₵80/6 months, GH₵100/12 months. Optional support accepts GH₵1–10,000 and never grants a subscription.

Users transfer money separately, then submit their receipt transaction ID. A submission is pending and is not proof of receipt. Administration → Review MoMo payments lists up to 50 pending submissions. Verify the received MoMo transaction, sender, amount and account correspondence; enter the exact received amount and confirm before approval. Wrong submissions can be rejected. Do not approve test or fictional transactions on production.

Approval atomically records an immutable receipt and approved request; subscriptions extend from the later of current expiry and approval time by calendar months. A transaction ID can be applied once across support and subscriptions. Ordinary users and question reviewers cannot approve payments. Payment history loads up to 100 records for the signed-in account. Payment records contain account IDs, not copied email/name fields; retain these financial records after account deletion for reconciliation and disputes. No additional Firestore composite index is required.

## Access-control launch is a separate step
The confirmed 7-day trial is configured as policy metadata but not started. Choose the launch date and the treatment of existing users before enabling paid access. The current EPUB is publicly served on GitHub Pages: a browser paywall cannot make that file private. Enforcing paid book access requires moving protected content behind an authenticated delivery service and specifying offline entitlement behavior. This release deliberately does not claim to provide that protection.

## Checks
Test privacy and financial approval rules in the emulator. For live verification use a genuine received transfer and the rightful signed-in payer; never manufacture a payment success. Confirm optional support does not create a subscription, duplicate receipts cannot be reused, and reviewing a subscription preserves the original receipt. Payment administrators must refresh after each review to see the remaining pending submissions.
