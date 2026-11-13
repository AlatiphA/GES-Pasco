# Reading and devices — v1.0.62

This adapts PromoHub's two browser registrations and one online reading device to GES Pasco's Spark project. It does not require Cloud Functions or a Blaze upgrade. It preserves email/Google login, free samples, administrator exemptions, explicit full-access grants and existing saved study data.

## Activation order

1. Publish the complete tested `firestore.rules`. These add the registry/device lease rules and isolate anonymous device identities from ordinary user and administration permissions. The feature stays inactive until the policy below is enabled.
2. In **Authentication → Sign-in method**, enable **Anonymous** sign-in for device identities. This is a security-sensitive settings change and requires the owner's explicit approval. Do not change the existing Email/Password or Google providers. These anonymous identities do not create `users` app profiles and are not guest trials.
3. Deploy/install v1.0.62, verify administrator/sample reading and the new Manage devices UI, then activate the policy. Existing subscribers should install the update before activation; old clients cannot fetch premium content after enforcement is enabled.
4. As an existing payment administrator, set root document **readerDevicePolicy/current** to `{enabled: true, updatedBy: <administrator UID>, updatedAt: <server timestamp>}`. The timestamp and actor must pass the rules; use the administration activation control. No account grants, subscriptions or payments are changed.

To roll back enforcement, an existing payment administrator can set the same policy to `enabled: false` with their UID and a fresh server timestamp. Device records remain; the existing subscription check then authorizes server reads again.

## How enforcement works

- Each primary account has a separate named Firebase app for its browser-device identity, using persistent anonymous authentication. It does not replace the normal account login. Tabs and the PWA sharing one browser profile/origin share this identity. Different profiles/origins register independently; these are browser registrations, not hardware fingerprints.
- The account can atomically bind at most two device identities in `readerRegistrations/{accountUid}` and immutable `readerDevices/{deviceUid}` records. Rules reject extra slots, overwrites, self-binding to the main login, and replacing an occupied slot without recent-owner removal.
- The device's own authenticated connection, not the main account connection, claims `readerLeases/{accountUid}`. Its server timestamp grants a 120-second online lease; a competing registered device must wait. Foreground readers renew every 40 seconds. Tabs sharing that authenticated device may renew the same lease. Explicit Release pauses all same-origin tabs; otherwise a closed/disconnected reader expires within two minutes.
- Protected book/quiz reads require the admitted device's Firebase identity and a current server lease, active subscription and unsuspended account. Knowing a local device ID or sharing only the account password does not satisfy that read check. The main account cannot impersonate an anonymous device or steal an active lease.
- Device removal requires owner reauthentication within five minutes, updates the registry and deletes the binding atomically. Connected readers notice revocation. Removal frees the slot, but that person may register again if they still know the account credentials and a slot is available. Change compromised passwords separately.
- Account deletion revokes server reading immediately and removes its registry, lease and device bindings. Unbound anonymous Authentication identities have no remaining access; deletion of other browsers' Firebase identities requires the Firebase Console/Admin SDK and is not claimed by the app.

## Offline and security limits

Previously verified, account/device-bound saved permission can open downloaded content while account hydration runs or the network is unavailable. It never extends beyond the saved subscription expiry and rejects clock rollback. New/unverified devices wait for online admission. Explicit permission, registration-limit and device-in-use failures do not fall back to offline permission.

Offline copies cannot receive immediate revocation or prove that no other offline reader exists. A browser owner can inspect/download content already delivered to that browser. This reduces ordinary account sharing; it is not DRM or protection against copied credentials/browser profiles/files. Firebase rules enforce future server reads.

Connection failures back off from 30 seconds to five minutes. Manual Register / retry runs immediately. Network failures keep an eligible saved permission; explicit denials clear it. Samples, account settings and renewal remain usable, with no logout or blank paywall. Device blocks direct active subscribers to Manage devices rather than requesting another payment.

## Verification

Use emulator identities for slot races, concurrent claims, forged/copied IDs, expired leases, subscription expiry, suspended accounts and deletion. Do not remove real users' registrations, alter subscriptions or create fake payments for production testing. Browser previews use isolated example records. Live administrator access can verify the exempt UI without registering an anonymous identity.
