# Quiz administration — v1.0.31

## Activate after the branch checks pass

1. Publish this branch's complete `firestore.rules` in Firebase Console → alatipha-ges-pasco → Firestore Database → Rules. The quiz rules are additive; existing reading/reporting/inbox rules remain.
2. Existing accounts with `reportAdmins/{uid}.active = true` are trusted quiz editors too. No new UID setup, Functions deployment, or composite index is required. Grant this access only to trusted reviewers: rules restrict writes and validate document structure/version metadata; every question is validated by the client before saving or using it.
3. Merge/deploy the release, install v1.0.31, and reopen online. Go to Account → Quiz administration.

## Workflow

- Open a bundled or cloud question set, or choose New question set / Import JSON. The JSON format is the same per-bank shape as `practice-bank.json`: schema, id, title, questions; each question has id, topic, prompt, options, zero-based answer index, explanation, and source. The editor's correct-option field is **one-based** for human use.
- Edit questions, add or remove them, and Save draft. Drafts are private; saved drafts survive reload. Unsaved edits do not. Up to 100 questions and 350,000 JSON characters are allowed per set. Manage at most 100 cloud sets.
- Check every correct answer, explanation and source. Tick the review confirmation, then Publish reviewed set. Publication saves a separate snapshot; further draft changes do not affect it.
- Disable published set stops new online question refreshes from including the set, including a matching bundled set. Previously saved attempts remain usable. Devices retain their last validated published copies offline, and during network/rules failures, until a successful refresh. Disabling is not remote erasure.
- Concurrent edits use version checks in a transaction. If another reviewer changes the draft or publication, reopen the set before saving again. Closing while a save is in flight is blocked. Credential/account changes clear the editor.

## What changes for practice

Opening Practice tests refreshes published sets online, with an eight-second bound, then merges them by stable bank ID with the bundled book sets. Published sets replace matching bundled sets; new IDs add sets. Offline uses validated per-account cached publications. Ordinary users cannot read drafts or publish.

Saved attempts contain their own questions/answers and are never rewritten or regraded by publication. New attempts use the currently loaded version. Book-answer review labels distinguish published reviewed answers. Revision history retains the original result. Publishing practice corrections does not edit the EPUB itself, auto-close reports, or send an announcement. Use the existing reports and announcements screens separately when a correction is ready.

## Acceptance checks

1. Save a draft change to one bundled set. An ordinary account must not see the draft, and its practice answer remains unchanged.
2. Publish after confirming review. Reopen Practice tests on a second online account; the corrected set should be used. Resume an older attempt and verify its original answer/score remains.
3. Open on a previously prepared offline device; its last validated publications remain available. Reconnect and reopen practice to refresh.
4. Two reviewer windows editing the same draft: save in one, then verify the second refuses to overwrite it.
5. Disable the published set; a successful online question refresh removes it. Re-enable by publishing the reviewed draft again.
6. Check phone/desktop, light/dark, long questions, option numbering, and importing invalid JSON. No unsafe HTML is rendered.

Validation: `npm test` and `npm run test:rules` (local demo emulator, no live database writes).
