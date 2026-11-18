# Session recovery QA checklist

This PR changes Internet Identity delegation monitoring and session error reporting.

## Automated checks
- [ ] Vercel deployment/build succeeds for the latest PR head.
- [ ] Run `yarn build` and `yarn lint` in a local checkout (if available).

## Browser checks (two tabs, same origin)
- [ ] Fresh anonymous visit: public Object Journey and anonymous check-in remain usable.
- [ ] Sign in with Internet Identity: modal closes only after success; principal and private data load.
- [ ] Cancel the identity provider: modal remains available; no false authenticated state.
- [ ] Sign out from the navbar: both tabs lose authenticated state; public pages still work.
- [ ] Sign in again: actors are rebuilt; previously viewed page remains selected.
- [ ] Expire or invalidate a delegation: visible expiry warning and sign-in recovery, not an empty list.
- [ ] Return to a tab after sleep: expiry is checked promptly.
- [ ] Disconnect the network: show network failure without clearing existing Spots/Object data or signing out.
- [ ] Reconnect and retry: successful responses clear the page-specific error.
- [ ] Deny access to a protected resource: authorization error is not treated as session expiry.
- [ ] Offline check-in: pending local records survive session expiry and are not submitted twice.

## Known limitations
- `unhandledrejection` catches only uncaught rejected promises; caught-and-swallowed API errors still require call-site fixes.
- The session notification currently monitors AuthClient/II, not wallet-specific provider lifetimes.
- Cross-tab storage events are best-effort; private browsing or blocked storage can prevent synchronization.
- This checklist is not evidence that manual tests have been run.
