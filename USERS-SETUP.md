# Users administration — v1.0.45

Publish this branch’s complete `firestore.rules` before deploying. Existing payment administrators gain access to registered user profiles and the per-user administrator status required to display correct exemptions. Ordinary users and report reviewers do not gain this access. No new role or manual collection setup is needed if `paymentAdmins/{uid}.active` is already true.

Account → Administration → Users shows 25 Firestore user profiles per page, with display name, email, UID, profile creation time, trial end, approved subscription end and current status. Next page and exact-email search are supported without composite indexes. Authentication-only records without a Firestore profile are not listed. Manage offers app-access suspension/reactivation, separate free-access and trial-access modes, restored subscription mode, and private inbox messages. It does not edit credentials, delete accounts, grant subscriptions or disable Firebase Authentication logins. A clearly labelled Firebase console link is provided for the last action. Financial administrator accounts cannot be changed here.

Status is based on the saved profile’s creation date. The current user’s reader additionally considers Firebase Auth creation metadata; an inconsistent legacy profile can therefore need investigation. Financial administrators are shown as exempt. Each page reads subscriptions and administrator status for the displayed profiles.

FAQ and user guide now cover current trials, manual payments, administrator setup, result sync, backups and offline access; outdated promises of unlimited free access and header trash-button repair have been removed. The reader’s public-file limitation remains unchanged.


Account management uses owner-readable `accountControls/{uid}` documents, writable only by payment administrators for non-administrator targets. Controls take effect in connected app sessions through a live listener. Previously cached offline access cannot receive a suspension until reconnecting; the public EPUB/old-build limitation is unchanged. Trial-only mode ignores a paid expiry but preserves payment records. Reactivation preserves access mode; use Restore subscription access separately when needed.

Private messages use `users/{uid}/adminMessages`, are visible only in that account’s inbox, and are removed during account deletion. The owner must confirm sending; no messages are sent as part of setup or testing. App suspension still allows account settings, payments, backups and inbox access. Disabling sign-in itself is managed through the Firebase console.


## v1.0.46: separate free and trial access
Publish the updated rules to allow accessMode = free. Grant free access exempts the user from subscription payment. Set to trial access uses the original seven-day trial and never resets it. Restore subscription access removes the free/trial override and checks the existing approved subscription normally. Suspension overrides all non-administrator modes. Free-access verification is cached for seven offline days, then needs an online check, without requiring payment. Existing trial-only records remain trial-only; no automatic free grants are made.
