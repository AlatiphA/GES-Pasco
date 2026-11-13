# Protected library setup — v1.0.51

## Access model

- Free accounts can read `MoE/GES/DD/2020`, `MoE/GES/AD I/2020`, and `MoE/GES/AD II/2020`, including their sections and linked explanations. This access continues after the three-day sample trial.
- An active subscription unlocks every chapter and practice set.
- Payment and question-review administrators, plus explicit full-access grants, retain full access.
- Existing administrator-issued `free` control records are preserved as legacy full-access grants. Ordinary accounts with no grant stay sample-only.
- Suspended accounts remain blocked according to the existing account controls.

## Publish order

1. In Firebase Console, open **Firestore Database → Rules** and publish this branch’s complete `firestore.rules` file. These rules allow free users to fetch only the three sample question sets and require full access for the protected library and other question sets.
2. Deploy the app release. The public EPUB and `practice-bank.json` now contain only sample content. The full library is no longer part of the deployed app shell.
3. Sign in as a payment administrator. Open **Account → Administration → Manage protected library**.
4. Select the local ignored files `library/full-library.source.epub` and `premium-practice-bank.source.json`, then choose **Upload protected library**. The app splits the EPUB across Firestore documents, verifies the book checksum, and publishes the protected manifest last.
5. A free account should see the three sample exams and locked chapters. A subscriber, administrator, or account with a full-access grant should see the complete book and all practice sets.

The project remains on Firebase Spark by storing protected book parts in Firestore rather than Firebase Storage. Firestore quotas still apply. Do not add either local source file to Git or the public site.

## Existing public copies

Earlier public releases and Git history already exposed the original EPUB and question bank. This release removes premium text from the current public files and enforces access for future app requests, but it cannot recall previously downloaded or publicly cached copies. Removing those old public Git objects would require a separate repository-history rewrite and would invalidate existing clones.
