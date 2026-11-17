# QR Location Check In (ICP)

An AllTracks location is a stable ICP record with a publicly shareable `/check-in/:locationId` URL. Signed-in users create locations; visitors can scan and check in **without creating an account or sharing device GPS**. Visitors may leave a public display name and a note. The canister stores an ICP timestamp and optional caller principal, never device geolocation or IP.

## Deploy

This feature has a **new Motoko canister**; the existing Spots and Comment canisters are not modified. The public QR service only renders the image; QR image requests contain the public check-in URL, not private keys or notes. The actual locations and check-ins are stored on ICP by `src/checkin/main.mo`.

1. Install dfx, ensure the deploy identity has ICP cycles, and run `dfx deploy checkin --network ic` from the repository root.
2. Get the canister principal with `dfx canister id checkin --network ic`.
3. Configure `VITE_CHECKIN_CANISTER_ID` as that principal in the web deployment (e.g. Vercel), then rebuild/redeploy the frontend. In local development set it in `.env.local`.
4. Open `/check-ins`, sign in, enter a name and coordinates (or use browser location with permission) and create a QR location.
5. Print the QR from its detail page. Visitors open `/check-in/<id>`, enter an optional name/note and submit without authentication.

To initialize locally: `dfx start --background`, then `dfx deploy checkin` and point the frontend at the local network with an appropriately configured HttpAgent (the current frontend default agent is mainnet, so test via mainnet or adapt the agent for local use).

## Data / safety model

- Stable Motoko arrays persist across upgrades (provided the stable types remain compatible). This is an experiment-scale MVP; migrate to stable B-trees/indexes before substantial adoption.
- Public, open check-ins are not evidence that a visitor was physically at the trail. The page never requests the visitor's GPS.
- New location creation is authenticated; only its creator can close/reopen it and moderate individual notes.
- Notes are public; do not put contact information or sensitive data in them.
- A 2-second per-location global cooldown and bounded inputs offer basic spam protection but **do not** prevent determined spam; add a more robust anti-abuse system before a large public launch. A very busy location may see temporary cooldown errors.
- Location and check-in capacity limits (10,000 locations and 100,000 check-ins total) are explicit safeguards, not infinite-scale capacity.
- Current UI lists the latest 100 locations and check-ins; API supports pagination.
- A location is a distinct QR destination, optionally prefilled from an existing Spot using `/check-ins?spotId=<spot_id>`. This does not modify or duplicate the existing Spot backend record.
- This feature is **not live** until the new canister is deployed and the frontend is configured.

## Acceptance tests

1. Logged-out user cannot create a location; signed-in creator can create it.
2. Detail page works in a private/incognito browser; unsigned visitor can check in and see note after refreshing.
3. Blank name/note check-in works; oversized fields are rejected.
4. Invalid/closed location rejects check-in; owner can reopen.
5. Owner can remove an abusive entry; other users cannot.
6. Scan printed QR on a phone; verify route works on a fresh browser session.
7. Upgrade the canister without data changes and verify prior entries remain.
8. Submit twice within two seconds; ensure spam throttle returns a visible error and does not create a duplicate.
