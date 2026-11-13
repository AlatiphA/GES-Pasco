# Full-page administration — v1.0.58

Publish this release's complete `firestore.rules` before deploying the app. The new rule permits an existing payment administrator to end an active paid subscription by setting its expiry to zero. It cannot change the plan, account ID or payment reference, extend a subscription, remove administrator access, or delete payment history. No new collections, indexes, paid Firebase plan or administrator roles are required.

Open the centred **Open Administration** link above the other profile options. The page uses the existing Firebase sign-in and verifies administrator access online. Payment administrators see Users, subscription payments and protected-library tools. Question reviewers see reports and quiz administration. Ordinary accounts cannot read the user directory.

**Users** searches part of a name or email without matching case. It scans registered profiles beyond the first page and shows up to 25 matches per page. Very large searches can take longer because this Spark-compatible release searches server profile batches without a separate search service. Accounts that exist only in Firebase Authentication and have no app profile are not included.

Each card distinguishes current reading access from the saved access policy and paid-subscription expiry. Access uses the reader's existing evaluator. **Suspend/Activate** is one switch. Activation preserves the saved access policy and does not renew payment. Policy actions mark the currently selected setting, and successful changes reload server records. Concurrent changes are rejected for a fresh review; failed writes do not flip controls. Private-message drafts survive a card refresh.

**Remove paid access** appears only for an unexpired paid subscription on a manageable account. It sets only that subscription's expiry to zero and records the acting administrator and time. Any `full-access` or legacy `free` reading grant remains intact. Approved requests and immutable MoMo receipts remain unchanged; no refund or wallet transaction is performed. Connected readers listen for entitlement changes. Offline devices keep their previously verified access until reconnecting or reaching its existing expiry.

Validate actions using the emulator and example accounts. Live verification should load/search the directory and inspect controls without changing a real user's access or sending a message.
