# Track Me Down — ICP Object Journey pilot

AllTracks' QR-powered **object journey** feature tracks a cup by voluntary, one-time check-ins. It does not track the person who scanned the sticker.

## Pilot

- Object ID: `cup-7h9m4k`
- Public QR URL once deployed: `https://alltracks.icevent.app/object/cup-7h9m4k`
- Suggested sticker: "TRACK ME DOWN ☕ — A wandering cup experiment. Found me? Scan the QR code and add a stop to my journey. No account needed."
- Never distribute the sticker until the backend has been deployed and tested.

## How recording works

1. Visitor scans the fixed QR code, which opens the `/object/:objectId` AllTracks page.
2. Visitor selects **found**, **carried**, or **left**.
3. Visitor taps **Get my GPS location** and grants a **single** browser geolocation request.
4. Visitor adds an optional note and explicitly consents to publication.
5. The browser **rounds to 3 decimal places before sending GPS coordinates**. The ICP canister rounds them again before storage.
6. The canister records an on-chain (server) timestamp in nanoseconds and appends the check-in to persistent canister state.
7. Anyone can load the latest 200 public check-ins through an anonymous ICP query; the most recent 500 check-ins are retained.

There is **no continuous location tracking, no web login, and no database outside ICP**. The map's dashed lines only connect voluntarily submitted locations; they are not measured travel paths.

## Architecture

- **Separate pilot canister:** `canisters/object_journey/main.mo`. Uses Motoko `persistent actor` storage; preserves check-ins across compatible canister upgrades.
- **Authoritative candid:** `canisters/object_journey/backend.did`
- **Generated-style frontend bindings:** `src/api/object-journey/backend.did.js` and `backend.did.d.ts`
- **Direct ICP client:** `src/api/object-journey/client.ts`
- **Public page:** `src/pages/ObjectJourney.tsx`
- **Deployment descriptor:** `dfx.json`

The existing AllTracks repository exposes the Candid for `r6cnt-kyaaa-aaaal-aab3a-cai` but does not include the production backend Motoko sources. The new canister is therefore **separate**, but follows the same ICP/Candid/Actor pattern as the existing tracking features. Do not upgrade or modify the production AllTracks canister to enable this pilot.

## Deploy and connect (not completed by this PR)

Install dfx with a compatible Motoko compiler and fund the new canister with cycles. Then, from the repo root:

```bash
dfx canister create object_journey --network ic
dfx canister build object_journey --network ic
dfx canister install object_journey --network ic
dfx canister id object_journey --network ic
```

Use `--mode upgrade` and review stable/Candid compatibility before **later** changes to an already-installed canister. The commands above are for an initial install only.

Set the resulting canister principal as the public Vite build environment variable:

```env
VITE_OBJECT_JOURNEY_CANISTER_ID=<deployed-canister-principal>
```

Do not include angle brackets in the actual value. On a local replica, set `VITE_ICP_HOST=http://127.0.0.1:4943` (adapt the port) and run `dfx start` before deploying. Production uses `https://ic0.app` by default.

Configure `VITE_OBJECT_JOURNEY_CANISTER_ID` in the AllTracks hosting environment, deploy a **preview** build, and test on two phones over HTTPS. Vite `VITE_` fields are public; the principal is **not a secret**.

There is **no need** to configure `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN`. The previous Vercel Redis API route has been removed.

## Smoke tests before publishing the QR

1. `dfx canister build object_journey` succeeds with no Motoko errors.
2. `getCheckins("cup-7h9m4k")` returns an empty vector on a fresh canister.
3. `addCheckin("cup-7h9m4k", { latitude=49.17; longitude=-122.65; accuracyMeters=opt 20; action=variant {found}; note="test" })` returns `ok` with rounded coordinates and a canister timestamp.
4. Refresh the public page on a **second phone**. The same point appears, proving it is not local browser storage.
5. Decline GPS permission and decline publication consent: neither produces an update.
6. Invalid ID, out-of-range coordinates, an overlong note, and excess accuracy are rejected.
7. A second submission within 15 seconds is rejected; a daily quota of 60 accepted submissions applies globally to the pilot.
8. Reload the app and verify the page still shows persistent data; verify canister upgrade persistence on a test deployment before upgrading production.
9. Inspect mobile map rendering and ensure the dashed segments are labelled **straight-line connections**, not actual trails.

CI Web and mobile builds alone **do not compile the Motoko backend**. A dfx build and live canister integration test are required before production.

## Privacy and safety

- User chooses whether to scan, locate and publish. The browser's exact GPS stays on the client; only 3-decimal-place coordinates are sent and saved.
- Timestamp is produced by the ICP canister, not supplied by a visitor.
- No name, IP address, Internet Identity, principal ID, or device identifier is stored in records.
- Notes are limited to 280 Unicode characters and location accuracy to 2000 m.
- Only the pilot ID is accepted; up to 500 recent points are retained.
- Public anonymous writes are **not proof of GPS accuracy or physical custody**. A malicious visitor can invent locations; cooldown and daily quota provide only basic spam resistance and could be abused to block legitimate submissions. Add stronger abuse controls/moderation and an owner-managed removal mechanism before scaling.
- Public locations are approximate but still sensitive. Do not submit residential, sensitive habitat, or restricted-area locations.
- Use an approved handoff point or a direct person-to-person handoff; do not abandon a physical object as trail litter.

## Future integrations

Define `ObjectJourney` as its own AllTracks domain. Later, reference the same object/check-in IDs from ICEvent Activity or publish proofs in OneBlock **without** copying sensitive user data. When the AllTracks production backend source is available, consider consolidating the data service after a compatible migration.
