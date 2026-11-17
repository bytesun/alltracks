# Track Me Down — the wandering cup experiment

A volunteer-led object journey inside AllTracks. One public QR code links to one physical object's journey. This feature **does not track people** and does not record locations without explicit action and permission.

## Pilot object

- ID: `cup-7h9m4k`
- Link after deployment: `https://alltracks.icevent.app/object/cup-7h9m4k`
- Suggested sticker text: "TRACK ME DOWN ☕ — A wandering cup experiment. Found me? Scan, choose what happened, and check me in. You can pass me on or leave me at a permitted handoff spot. No app or account needed."
- The QR must point to the URL above, not directly to the API.
- Do not distribute the sticker until the branch is deployed and the backend is verified.

## How it works

1. A person scans the QR code and opens the object's public journey page.
2. They choose **I found the cup**, **I brought it here**, or **I left it for the next explorer**.
3. Clicking **Get my GPS location** asks the browser for one-time location permission. No background tracking is requested.
4. They can add an optional note and must explicitly check the public-sharing consent box.
5. **Add this stop** sends a single POST to the AllTracks API. The server records the time and rounds coordinates to 3 decimal places (~100 m); exact GPS is not saved. No account or phone identity is required.
6. All visitors can see the public map and previous stops.

The dashed map segments join submitted points and **do not** represent a continuous GPS trail. Distances are straight-line totals between submitted points.

## Required shared storage (not configured by the code)

Vercel serverless functions are stateless, so durable storage is required. This MVP uses Upstash Redis REST:

1. Provision an Upstash Redis database for this experiment.
2. Configure the AllTracks Vercel project with environment variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. Deploy the feature branch to a preview environment for testing, then merge/deploy only after verification.
4. Verify the QR base URL resolves to the React page and `GET /api/objects/cup-7h9m4k` returns `{ "objectId": "cup-7h9m4k", "checkins": [] }` on an empty database.
5. Test a one-time GPS submission on a phone over HTTPS, confirm HTTP 201 and a reloaded public map on another phone.
6. Verify denied permissions, delayed GPS, poor network, duplicate submissions (HTTP 429), malformed requests, unconfigured storage (HTTP 503), and mobile map layout.

The API is implemented by `api/objects/[id].ts` (GET for history, POST for check-in); the React page is `src/pages/ObjectJourney.tsx`.

## Privacy and abuse safeguards

- Consent before posting; GPS is retrieved only after tapping the button.
- No login, names, email, personal accounts, background location or local device ID.
- Approximate coordinates are public. The server rounds before storage.
- Raw IP addresses are not persisted. A salted hash with a 60-second Redis TTL limits repetitive check-ins from one network.
- Text notes are capped at 280 characters. The server validates IDs, locations, accuracy and status.
- Up to 500 recent records are retained per object; the UI shows the latest 200.
- This is a small, open pilot, **not a tamper-proof location system**. Anyone knowing the link can submit false data. The rate limiter is not a full spam defense.
- Do not publish precise locations of sensitive sites, residences, shelters, wildlife nests, or restricted areas. Add moderation and data deletion before wider rollout.
- Use a robust, clean, lightweight object only at an **authorized location**, or hand it directly to a willing participant. Do not abandon a cup as litter on trails or in protected areas. Do not remove somebody else's belongings.
- This system is a *check-in journal*, not a device tracker or proof of custody.

## Next iteration (optional)

A reusable Object Journey abstraction can serve other items, with creator-managed QR codes, signed custody transfers, moderation, and export to ICEvent Activity. For this MVP, avoid installing an app or requiring Internet Identity from passers-by.
