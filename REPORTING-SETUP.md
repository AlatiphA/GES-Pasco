# Question reporting — v1.0.22 rollout

This branch adds reporting after practice-test answer review, an account-scoped offline outbox, My question reports, and a private reviewer screen. Reports do not modify the book, answer bank, scores, or revision results.

## Before activating the release

1. Test the additive `firestore.rules` with the local emulator (`npm install`, Java 21+, then `npm run test:rules`). The original account, bookmark and reader rules remain in place. On the development Windows machine the emulator failed to start due to a Java loopback socket error; its rule tests have NOT passed there. Run them on a working machine or CI before merging.
2. In Firebase Console for **alatipha-ges-pasco**, open Firestore Database → Rules, replace the editor with this branch's complete `firestore.rules`, and Publish. Publishing confirms compilation, but does not replace the access tests.
3. In Firebase Authentication → Users, copy the UID of your chosen reviewer. In Firestore Data create collection `reportAdmins`, document ID exactly that UID, and a field `active` of type **boolean**, value `true`. Do this only through the trusted Console. Do not add a reviewer UID or credentials to this public repository. Setting `active` to false revokes access on subsequent server requests.
4. Merge this branch and wait for the GitHub Pages deployment. Install v1.0.22 through About → Check for updates. Reopen the app online after granting reviewer access.

## Acceptance checks

- Finish a practice test, expand an answer, choose **Report this question**, choose an issue and provide a description. Verify Submitted.
- Open Account → My question reports. The report includes the question, shuffled options, book answer and source automatically; it does not include your selected test answer or score.
- Submit offline: verify Pending on this device, reconnect with the same account, then open My question reports and verify submission. Retry is idempotent. Pending reports are lost if browser data is cleared; at most 50 may be queued.
- Reviewer: Account → Review question reports. Save Under review and a response, then confirm the reporter can see that response. Responses are shared with the reporter, not internal notes.
- Another ordinary account must not read or alter the report. Users cannot give themselves reviewer access. Only reviewers can change review status/response; no client can delete a report or rewrite its question snapshot.
- Mark Corrected only after the answer/book correction is separately reviewed and published. Mark Closed for reports requiring no content change. Reports never automatically change answers.

Report lists load 50 at a time with Load more, in document order. They are not a newest-first inbox. My question reports requires a connection for submitted records; pending reports remain visible locally. No email or push notifications are sent.

## Development

`npm test` covers existing behavior and the report core/DOM interactions. `npm run test:rules` runs six Firestore access tests on the demo project, without using the live Firebase database. The optional `GES_REPORT_TEST_PACKAGE` environment variable points to a package.json in an external test dependency directory.
