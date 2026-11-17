# QR Check In — reuse existing AllTracks canisters

This feature reuses **existing** ICP storage, without creating or deploying a new canister.

## How it works

- An authenticated AllTracks user creates a location with the existing **Spots** feature (or opens an existing Spot).
- From the Spot detail page, select **Create / Share QR Check In**.
- The public address is \`/check-in/<spotId>\`; the page displays a printable QR code. The QR provider receives only this public URL.
- A visitor scans the QR and can read the Spot details and visitor log without signing in.
- **Currently, a visitor must sign in via AllTracks to submit a check-in.** The existing comment canister rejects anonymous \`addComment\`. The check-in is saved as a JSON-encoded message (optional display name + note) using the existing \`addComment\` method with \`comto = { other: "spot-checkin:<spotId>" }\`.
- Check-ins are read from the existing \`getComments\` method, which supplies author and timestamp. We do not add or migrate any canister storage.

## Important constraints

- This is a zero-new-canister first step. It **does not** yet meet a strict "no account required" requirement.
- To allow truly anonymous visitor submissions, add a narrowly scoped public method to the **existing** AllTracks backend (or extend an already deployed service), with rate-limiting, moderation, abuse prevention, and bounded note sizes. Do not bypass a backend authentication policy or store check-ins in localStorage pretending they are durable.
- QR possession does not prove physical presence; GPS verification could be offered later with clear consent.
- This version has no owner moderation or closure of a QR location. Moderation requires supported methods on the existing backend.
- Reuse the existing comment actor. Comments are public, so visitors should not submit private information.
- Existing \`spot:<spotId>\` regular comments are not mixed with \`spot-checkin:<spotId>\` QR check-ins.
- No changes to the existing ICP canister's IDL/Candid interface. No new deployment or migration of ICP data.

## Test checklist

1. Create a Spot while authenticated, open its detail and select "Create / Share QR Check In".
2. Open the copied URL in a private browser; QR/Spot details and visitor log display without login.
3. When signed out, clicking the Check In action opens the current AllTracks login dialog.
4. After signing in, submit a name and note and verify the entry appears and survives a hard reload.
5. Scan the printable QR on another device and verify it resolves to the same Spot.
6. Test invalid/missing Spot IDs and failed \`addComment\` writes; the UI must show an error and must not show a false success state.
7. Validate the page with a browser. CI checks build/type compilation but not deployment to the existing live canisters.
