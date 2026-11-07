# Serene Flow — Backend Security Handoff

**Status: sections 1–12 were written before backend access and describe what the server
must guarantee. The server-side audit has since been carried out against the
`serene_flow-backend` NestJS repository — see Appendix D for the fixes applied, the
verified behaviour, and the deployment prerequisites.** Sections 1–12 are kept as the
requirements baseline.

Frontend protection alone cannot prevent cross-user data access. The app is a native
client: anyone can call the API directly with `curl` and any token or ID, so every rule
that matters must be enforced server-side.

---

## 1. Endpoint inventory (observed in the frontend)

| Method & path | Called from | Auth sent | What the frontend expects |
| --- | --- | --- | --- |
| `POST /auth/signup` | `lib/auth.ts` | no | `{ user, token }` or `{ user }`; `user.isVerified` decides whether a session starts |
| `POST /auth/login` | `lib/auth.ts` | no | `{ user, token }`, `user.isVerified` |
| `POST /auth/logout` | `lib/auth.ts` | Bearer | 2xx; used best-effort only |
| `POST /auth/forgot-password` | `lib/auth.ts` | no | 2xx, no user-enumeration signal |
| `POST /auth/reset-password` | `lib/auth.ts` | no | 2xx; `{ email, code, newPassword }` |
| `POST /auth/verify-email` | `lib/auth.ts` | no | **must** return `{ user, token }` — the client throws without them |
| `POST /auth/resend-verification` | `lib/auth.ts` | no | 2xx |
| `GET /users/me` | `lib/profile.ts` | Bearer | current user profile; used to validate a stored token at launch |
| `PATCH /users/me` | `lib/profile.ts` | Bearer | `{ name }` → updated user |
| `PATCH /users/me/avatar` | `lib/profile.ts` | Bearer | `{ avatar: dataURI }` (JPEG base64, resized to 640px client-side) |
| `POST /users/me/activity` | `lib/profile.ts` | Bearer | 2xx; stamps lastActive |
| `DELETE /users/me` | `lib/profile.ts` | Bearer | 2xx; full account deletion |
| `GET /moods` | `lib/mood.ts` | Bearer | array of mood entries for the caller |
| `POST /moods` | `lib/mood.ts` | Bearer | `{ rating: 1-5, moodLabel }` → created entry |
| `GET /moods/latest` | `lib/mood.ts` | Bearer | latest entry or empty |
| `GET /moods/trends` | `lib/mood.ts` | Bearer | aggregate trends |
| `GET /spaces/posts` | `lib/spaces.ts` | Bearer | posts with `isOwner`, `authorIsCeo`, `reactions`, `myReactions`, `replies[]` |
| `POST /spaces/posts` | `lib/spaces.ts` | Bearer | `{ text, anonymous }` → created post |
| `PATCH /spaces/posts/:id` | `lib/spaces.ts` | Bearer | `{ text }` |
| `DELETE /spaces/posts/:id` | `lib/spaces.ts` | Bearer | 2xx |
| `POST /spaces/posts/:id/replies` | `lib/spaces.ts` | Bearer | `{ text, anonymous? }` |
| `PATCH /spaces/posts/:id/replies/:replyId` | `lib/spaces.ts` | Bearer | `{ text }` |
| `DELETE /spaces/posts/:id/replies/:replyId` | `lib/spaces.ts` | Bearer | 2xx |
| `POST /spaces/posts/:id/reactions` | `lib/spaces.ts` | Bearer | `{ reactionType }` → `{ reactions, myReactions }` (authoritative) |
| `GET /admin/stats` | `lib/admin.ts` | Bearer | aggregate counts for the CEO dashboard. **Confirmed to exist** (see Appendix C) |
| `GET /admin/users` | `lib/admin.ts` | Bearer | user list used only to derive counts; the client never renders emails/names from it. **Confirmed to exist** |
| `GET /admin/logs` | `lib/admin.ts` | Bearer | recent account events (`login` / `signup` / `auto` / `deletion`). **Confirmed to exist** |

Frontend base URL: `EXPO_PUBLIC_API_BASE_URL` or `https://api-ysdoljkngq-uc.a.run.app`.

### Contract requirements the new frontend depends on

1. **Expired/invalid tokens must return `401`**, not `403`, `404` or `500`. The client now
   signs the user out and wipes cached private data on `401`; a `403` would be treated as a
   generic error and could leave a stale screen populated.
2. `GET /users/me` must never return another user's profile and must be cheap (it is called
   on every app launch to validate the stored token).
3. `isOwner` / `authorIsCeo` / `myReactions` must be computed per viewer. The client renders
   edit/delete/moderation buttons purely from these flags and no longer compares emails —
   if the backend ever returns `isOwner: true` incorrectly, the UI will offer another user's
   post for editing (the API must still reject the request, which is the control that matters).
4. `verify-email` must return a usable session, otherwise the verified user is stuck.
5. Anonymous posts/replies must not include author email, uid, avatar or any stable
   per-user identifier that would let a client correlate posts to a person.

---

## 2. IDOR / BOLA (highest priority)

The frontend exposes **no user-controlled ID** in GET paths (`/users/me`, `/moods`), which
removes the easiest IDOR surface. The remaining object references are post and reply IDs.

| Check | Required behaviour | How to test |
| --- | --- | --- |
| `GET/PATCH/DELETE /users/me` | Subject always from the verified JWT; no `id`/`email` accepted from body or query | Call with A's token and body `{"email":"b@example.com"}`; only A's record may change |
| `/moods*` | Filter by JWT subject; ignore `?userEmail=`/`?userId=` | A's token + `?userEmail=b@example.com` → only A's data |
| `PATCH/DELETE /spaces/posts/:id` | Load post, compare author to JWT subject (or CEO role), else `403` | A edits/deletes B's post → `403`, no state change |
| `PATCH/DELETE .../replies/:replyId` | Same, plus verify `replyId` actually belongs to `:id` | A deletes B's reply; also pass a reply ID from a different post → `404/403` |
| `POST .../reactions` | Upsert keyed by `(postId, subject, reactionType)`; counts derived, never client-supplied | A reacts twice → count 1 for A; A and B react → 2 |
| `DELETE /users/me` | Cascades: moods, posts (anonymised or removed), replies, reactions, avatar, sessions | Delete A, then call every endpoint with A's old token → `401` everywhere |
| Mass assignment | `PATCH /users/me` must whitelist `{ name }` only | Send `{"name":"x","isCeo":true,"role":"admin","email":"..."}` → extra fields rejected or ignored |
| Sequential-ID enumeration | Prefer UUID/random IDs; never expose an incrementing ID in a way that suggests valid neighbours | Probe `POST /spaces/posts/<random-uuid>` → `404` with no data leak |

Use a DTO whitelist (`class-validator` + `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`)
so unexpected fields are stripped or rejected rather than written.

---

## 3. CEO / admin authorization

The frontend only decides **which controls to show**, via `src/lib/ceo.ts`: it prefers the
server-issued `role`/`isCeo` on the profile and otherwise compares the signed-in email with
`sereneflow27@gmail.com` case-insensitively. That is **presentation only**: the local user
cache can be tampered with on a rooted device, and the API can be called directly.

The Admin screen (since the frontend fix) calls the real `GET /admin/stats`,
`/admin/users` and `/admin/logs` endpoints, so those three are now the authority surface for
aggregate account data: they must be `ceo`-only, must return counts/event types only, and
must never include journal or Spaces content. The moderation actions in Spaces remain the
other privileged surface.

Required backend work:

- Store the role server-side (`role: "ceo"` or an allow-listed email) and never trust a
  client-sent flag.
- Enforce `ceo` on any endpoint that lets one user modify or remove another user's content.
- Ensure the CEO email cannot be registered by anyone else: signup on that address must
  require control of the inbox (email verification), and a pre-existing account must not be
  able to change its email to it without re-verification.
- Keep the CEO email out of JWT claims that the client can edit; if it is in the token, the
  token must be signed and validated correctly.
- Log every moderation action (actor, target, timestamp, reason) for abuse review.

---

## 4. JWT, refresh tokens and sessions

Frontend facts: the token is a bearer JWT stored in Keystore/Keychain (`expo-secure-store`),
sent only in the `Authorization` header, never in a URL, never logged. There is **no refresh
flow**: when the token expires the user is signed out and must log in again.

Backend requirements:

- Sign with a fixed algorithm (`HS256` or `RS256`) and explicitly reject `alg: none` and
  algorithm confusion; validate `exp`, `iat`, `iss`, `aud`.
- Short-lived access tokens (15–60 min). If you add refresh tokens: rotate on every use,
  detect reuse (revoke the family), bind to device/session, store hashed, and expose a
  revoke endpoint.
- Revocation must be real: `POST /auth/logout` and account deletion must invalidate the
  token server-side (session/jti denylist or token version), otherwise a stolen token stays
  valid until expiry.
- Do not put PII beyond what is needed in the payload, and never put journal content or
  mood notes in a JWT.
- Rate-limit token endpoints and return `401` (not 500) for malformed tokens.
- Rotate the JWT signing secret on a schedule and after any suspected leak.

---

## 5. Firestore and storage permissions

The frontend does **not** use the Firebase SDK at all — `firebase.json`/`.firebaserc` only
configure Firebase Hosting for the web build. There is no client-side Firestore access and
no Firebase Storage access, and no service credentials are shipped in the app.

If the NestJS API persists to Firestore/Storage:

- Firestore rules: default deny; allow nothing from clients. Access only through the Admin
  SDK on the server (rules do not apply to Admin SDK, so the server must do the checks).
- Never ship a service-account JSON to the client or into the repo.
- Storage: bucket not public; signed URLs short-lived; avatars served through the API with
  ownership checks; strip EXIF/GPS from uploaded images.
- If any client-side Firestore is introduced later, rules must scope every read/write to
  `request.auth.uid` and validate field types/lengths — the app's current design avoids this
  surface and should keep avoiding it.

---

## 6. Rate limiting and brute force

| Endpoint | Risk | Suggested control |
| --- | --- | --- |
| `/auth/login` | Credential stuffing | Per-IP + per-account limits, progressive delay, alerting, optional CAPTCHA after N failures |
| `/auth/signup` | Account/email bombing | Per-IP limits, email verification required before any session |
| `/auth/forgot-password`, `/auth/resend-verification` | Enumeration + mail flooding | Always return the same response, per-email cooldown (e.g. 1/min, 5/hour) |
| `/auth/verify-email`, `/auth/reset-password` | Code brute force | 6-digit codes: ≤5 attempts, 10–15 min TTL, single use, invalidate on new request |
| `/spaces/posts` + replies | Spam | Per-user rate limit + server-side moderation |
| `/spaces/posts/:id/reactions` | Inflation | One reaction per user/type, idempotent toggle |
| `/users/me/avatar` | Storage abuse | Size cap (~2 MB), MIME sniffing, per-user upload quota |
| Global | Scraping | Reasonable per-IP limits; ensure `429` responses do not leak data |

---

## 7. Input validation (server-side)

Client-side checks (`isValidEmail`, `maxLength` 2000 for Spaces, 20000 for journals,
name ≤ 60) are UX only — `curl` bypasses them. Enforce:

- `email`: trimmed, lowercased, ≤254 chars, RFC-sane; unique case-insensitively.
- `name`: trimmed, 1–60 chars, no control characters.
- `password`: minimum length (12+ recommended), reject breached passwords if possible.
- `moods`: `rating` integer 1–5; `moodLabel` from the fixed enum
  (`Sad, Anxious, Angry, Tired, Calm, Happy, Lonely, Overwhelmed`); `emotions[]` bounded;
  `notes` length-capped.
- `spaces`: `text` trimmed, non-empty, ≤2000 chars; `anonymous` boolean strict.
- `reactions`: `reactionType` from the fixed 5-emoji allow-list.
- `avatar`: validate the data-URI prefix (`data:image/jpeg;base64,`), decode size, re-encode
  server-side, reject SVG/HTML.
- Reject unknown fields (mass assignment) and unexpected content types.
- **The Spaces moderation filter currently runs only in the client**
  (`src/lib/moderation.ts`). It must be re-implemented/enforced server-side, otherwise the
  API accepts self-harm, PII, harassment and explicit content directly. The client copy only
  helps the UX (instant feedback with crisis resources).

---

## 8. CORS, CSRF, SSRF

- CORS: allow only the real web origins (`https://sereneflow.app` and the Firebase Hosting
  domains). No `*` with credentials. Native apps do not send `Origin`, so keep bearer auth —
  do not switch to cookies (that would reintroduce CSRF).
- If cookies are ever introduced: `SameSite=Lax/Strict`, `Secure`, and CSRF tokens for
  state-changing requests.
- SSRF: if any feature fetches a URL (avatar-by-URL, link previews, email images), block
  private/link-local/metadata IP ranges, re-resolve after redirects, and allow-list schemes.

---

## 9. XSS and injection

- React Native does not render HTML from user content, and the app contains no
  `dangerouslySetInnerHTML`/`innerHTML` usage, so the app itself has no XSS sink. The risk is
  server-rendered surfaces: the future web backend, admin tooling, and especially **email
  templates** that embed a user's `name` (verification/verification-resend mail).
  Escape/encode all interpolated values and avoid HTML in emails where possible.
- Use parameterised queries/ORM bindings; reject object-shaped payloads that could inject
  query operators into MongoDB/Firestore queries (`{"$ne": null}`).
- Sanitise on output, not only on input; store the raw text but escape when rendering.

---

## 10. Secrets, encryption, logging, backups

- No secrets belong in the frontend; the app ships none. Keep backend secrets in a secret
  manager/Cloud Run env vars, rotate them, and never log them.
- **The repository currently contains `release-upload-key.keystore` and
  `upload_certificate.pem`.** Treat that upload key as compromised: generate a new upload
  key and request a Play App Signing upload-key reset. See the release notes in the audit
  report.
- Password hashing: Argon2id (or bcrypt cost ≥ 12). Never store or log plaintext passwords.
- Transport: TLS 1.2+, HSTS; reject plain HTTP. At rest: encrypted database/disk, encrypted
  backups.
- Logging: never log tokens, passwords, reset codes, journal text or mood notes. Log
  authentication failures, authorization denials and moderation actions with actor/ip/ua.
  Scrub request bodies for `/auth/*` and `/users/me/avatar`.
- Monitoring: alert on spikes of 401/403/429, on sequential-ID probing, and on CEO
  moderation volume.
- Backups: encrypted, access-controlled, restore tested; define how long deleted accounts
  persist in backups (and document it, so the Privacy Policy stays true).

---

## 11. Privacy operations the backend must support

| Obligation | Where the app claims it | Backend work |
| --- | --- | --- |
| Account deletion removes user data | Privacy §6–7, in-app "Delete Account" | Cascade delete or anonymise all records, revoke sessions, purge avatar, propagate to backups; return success only after it is durable |
| Data deletion/copy requests by email | Privacy §10 (`sereneflow27@gmail.com`) | A documented, verifiable process with an SLA |
| Journal entries are private to the user | Privacy §4 | True today because journals never leave the device — keep it that way; do not add journal sync without updating the policy |
| Anonymous posting hides identity | Privacy §5 | Never return author identity to clients for anonymous content; keep identity server-side for moderation only |
| Transactional email | Verify/reset flows | Add `List-Unsubscribe`/preferences if marketing email is ever introduced; transactional mail needs no unsubscribe UI |

---

## 12. Verification recipes

Run against a staging deployment with two test accounts (A and B). Replace `$A`/`$B` with
each account's token.

```bash
API=https://api-ysdoljkngq-uc.a.run.app

# 1. Own-profile only
curl -s -H "Authorization: Bearer $A" $API/users/me
curl -s -H "Authorization: Bearer $A" "$API/users/me?email=b@example.com"   # must not return B

# 2. Mass assignment must not change role/email
curl -s -X PATCH -H "Authorization: Bearer $A" -H 'Content-Type: application/json' \
  -d '{"name":"A","isCeo":true,"email":"b@example.com","role":"admin"}' $API/users/me

# 3. Cross-user content access (B's post id)
curl -s -X DELETE -H "Authorization: Bearer $A" $API/spaces/posts/$B_POST_ID        # expect 403
curl -s -X PATCH  -H "Authorization: Bearer $A" -H 'Content-Type: application/json' \
  -d '{"text":"x"}' $API/spaces/posts/$B_POST_ID                                    # expect 403

# 4. Moods are caller-scoped
curl -s -H "Authorization: Bearer $A" $API/moods

# 5. Expired/invalid token
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer invalid" $API/users/me   # expect 401

# 6. Logout really revokes
curl -s -X POST -H "Authorization: Bearer $A" $API/auth/logout
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $A" $API/users/me        # expect 401

# 7. Deletion cascades
curl -s -X DELETE -H "Authorization: Bearer $A" $API/users/me
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $A" $API/moods           # expect 401

# 8. Client-side moderation must not be the only filter
curl -s -X POST -H "Authorization: Bearer $A" -H 'Content-Type: application/json' \
  -d '{"text":"my number is 555-123-4567","anonymous":false}' $API/spaces/posts   # expect rejection
```

---

## 13. Android release prerequisites (for whoever builds the app)

1. Provide the Play upload key through `~/.gradle/gradle.properties`
   (`SF_UPLOAD_STORE_FILE`, `SF_UPLOAD_STORE_PASSWORD`, `SF_UPLOAD_KEY_ALIAS`,
   `SF_UPLOAD_KEY_PASSWORD`). Release builds now refuse to run without it instead of
   silently using the debug key.
2. Build with `./gradlew bundleRelease` (AGP 8.11, Gradle 8.14.3, NDK r27 via SDK 54).
3. Verify the artifact — do not assume:
   ```bash
   node scripts/verify-16kb.js android/app/build/outputs/bundle/release/app-release.aab
   ```
   Every 64-bit `lib/*.so` must report `p_align 0x4000` (16 KB).
4. Optionally confirm with Android's own tooling:
   `zipalign -c -P 16 -v 4 your.apk` and check the Play Console pre-launch report.


---

## Appendix A — Firestore rules that match this frontend

The app never talks to Firestore directly, so the only safe default is to deny
all client access and let the API (Admin SDK) do the work:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // No client may read or write anything. The NestJS API uses the Admin SDK
    // (which bypasses these rules), so authorization must live in the API.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

If client-side Firestore access is ever added (e.g. live Spaces updates), scope
every collection to the caller and validate the payload:

```
    match /journals/{entryId} {
      allow read, delete: if request.auth != null
                          && resource.data.ownerId == request.auth.uid;
      allow create: if request.auth != null
                    && request.resource.data.ownerId == request.auth.uid
                    && request.resource.data.content is string
                    && request.resource.data.content.size() <= 20000;
      allow update: if false;   // journal entries are immutable
    }
```

Storage likewise: bucket private by default, avatars readable only through the
API, uploads restricted by content type and size, EXIF stripped server-side.

## Appendix B — Cross-user access test matrix

Run every row with token A against data owned by B. Any row that returns B's
data with a `200`, or mutates B's data, is a release blocker.

| # | Request (as A) | Expected |
| --- | --- | --- |
| 1 | `GET /users/me` | A's profile only |
| 2 | `GET /users/me?email=<B>` | A's profile only (query ignored) |
| 3 | `PATCH /users/me {"name":"x","role":"ceo"}` | role unchanged / 400 |
| 4 | `GET /moods`, `GET /moods/latest`, `GET /moods/trends` | A's moods only |
| 5 | `PATCH /spaces/posts/<B post>` | 403 |
| 6 | `DELETE /spaces/posts/<B post>` | 403 |
| 7 | `PATCH /spaces/posts/<B post>/replies/<B reply>` | 403 |
| 8 | `DELETE /spaces/posts/<B post>/replies/<B reply>` | 403 |
| 9 | `PATCH /spaces/posts/<A post>/replies/<B reply from another post>` | 403/404 (reply/post mismatch) |
| 10 | `POST /spaces/posts/<B post>/reactions` | may react; counts stay consistent, B's `myReactions` never includes A |
| 11 | `GET /spaces/posts` as a reader | no author identity on anonymous content |
| 12 | `DELETE /users/me`, then reuse A's token | 401 everywhere |
| 13 | CEO-only moderation as a non-CEO | 403 even though the client hides the button |
| 14 | Login/reset with a mixed-case email variant | same account, no lockout |
| 15 | `POST /auth/verify-email` with a used/expired code | 400, no session issued |

---

## Appendix C — Live endpoint probe (unauthenticated, read-only)

Recorded during the frontend audit. **No credentials, accounts or production data were
used, and no request modified state**: only GETs and POSTs with an empty `{}` body (which the
API rejects at validation before touching anything). The backend *source* is still not
available, so this is behavioural evidence only — it proves which routes exist and what
they validate, not how they are implemented.

Base URL: `https://api-ysdoljkngq-uc.a.run.app`

| Probe | Result | What it proves |
| --- | --- | --- |
| `GET /` and `GET /api` | `200 "Hello World!"` | no global path prefix; the client's verbatim paths are correct |
| `GET /health` | `404` | there is no catch-all/unmatched-route guard, so a `401` below is a real guarded route |
| `GET /admin/stats`, `/admin/users`, `/admin/logs` | `401 Missing or invalid Authorization header` | these routes exist and are JWT-guarded |
| same three with `Bearer not-a-real-token` | `401 Invalid or expired authentication token` | the guard parses and validates the token (distinct message) |
| `GET /admin/dashboard`, `/admin/analytics`, `/admin/activity`, `/admin/metrics`, `/admin/stats/overview` | `404` | those routes do **not** exist; do not build against them |
| `GET /users/me`, `/moods`, `/moods/latest`, `/moods/trends`, `/spaces/posts` | `401` | guarded and present |
| `POST /auth/login {}` | `400` — `email` + `password` required | DTO matches the client |
| `POST /auth/signup {}` | `400` — `email`, `name`, `password` (min 6) required | DTO matches the client |
| `POST /auth/verify-email {}` | `400` — `email`, `code` required | DTO matches the client |
| `POST /auth/resend-verification {}`, `/auth/forgot-password {}` | `400` — `email` required | DTOs match the client |
| `POST /auth/reset-password {}` | `400` — `email`, `code` (**exactly 6 digits**), `newPassword` (min 6) | the client now validates the 6-digit shape before sending |
| `POST /auth/refresh` | `404` | **no refresh endpoint**; a long-lived session is not available |
| `POST /auth/logout` | `401` unauthenticated | logout requires a valid token, as the client sends |
| `GET /docs`, `/docs-json` | `401` | API docs are behind auth (cannot be read from here — keep it that way in production) |

### Consequences for the remaining backend work

1. `GET /admin/stats|users|logs` must be **`ceo`-only**, not merely authenticated. A `401`
   for an anonymous caller says nothing about what a normal logged-in user gets; verify a
   non-CEO token returns `403` (row 13 of Appendix B).
2. Those three responses must contain **aggregates and event types only** — no journal,
   Spaces or per-user identity fields. The dashboard was changed to render counts only and
   deliberately never displays emails from the user list.
3. There is no refresh endpoint, so token lifetime is the entire session lifetime. Keep the
   expiry reasonable and make sure `POST /auth/logout` revokes server-side.
4. `PATCH /spaces/posts/:id` and `.../replies/:replyId` should return the **full** updated
   object. The client now merges partial responses safely, but a full body keeps other
   viewers' data accurate.
5. `DELETE .../replies/:replyId` must include the same CEO override as post deletion;
   the client shows the control to the CEO, so a missing server-side override surfaces as a
   `403` in the UI.

### Still unverified (cannot be settled without backend source or an account)

- Response **bodies/shapes** of the admin endpoints (the client resolves fields through an
  alias list and falls back to computing totals from `/admin/users` + `/admin/logs`).
- Whether the verification code from `/auth/verify-email` is 6 digits or alphanumeric.
- Whether login is case-insensitive for the stored address (the client sends the address
  trimmed, never lowercased, and compares locally case-insensitively).
- Whether Spaces text is moderated **server-side**; the regex in `src/lib/moderation.ts` is
  a client-side guard only and is trivially bypassed with `curl`.
- Whether account deletion cascades to moods, posts, replies and reactions.
---

## Appendix D — Backend audit and fixes (applied)

**Source audited:** `Baanikaursethi/serene_flow-backend` (NestJS 11, Firebase Admin 14),
commit `82dd886` (2026-10-27). Its `src/` tree is identical to
`serene-flow-backend-fixed-v7 2.zip` in that repository (line endings aside), so v7 is the
current source. The older `serene-flow-backend-fixed-v6.zip` found in this frontend's
history is **not** the same tree (it contains `common/utils/ceo.util.ts`,
`normalized-email.decorator.ts`, `spaces/content.util.ts`, which do not exist in v7) and
was not used.

The applied changes are in `backend/backend-security-fixes.patch` (29 files, applies to a
clean checkout of that repository with `patch -p1`).

### Critical issues fixed

1. **Forgeable authentication tokens.** `auth.guard.ts` verified local JWTs against
   `JWT_SECRET` **or the literal `'super-secret-serene-flow-jwt-key'`**, which is committed
   in `src/`, `.env.example` and `README.md`. A deployment missing that environment
   variable accepted tokens anyone could mint for any address — including the CEO. The
   secret now fails closed: production refuses to start without `JWT_SECRET`, and the guard
   will not verify with a default. Verification is restricted to `HS256`.
2. **CEO check bypassable by casing.** `CeoRoleGuard` compared `user.email === ceoEmail`
   without normalising either side, so a stored `SereneFlow27@gmail.com` lost admin access,
   and `CEO_EMAIL` casing in the environment changed the outcome. CEO detection now lives
   in `common/utils/email.ts` (`normalizeEmail`, `isCeoEmail`) and is used by the admin
   guard, admin stats, auth (role assignment) and Spaces moderation. The guard ignores the
   `role` claim and decides from the authenticated address only.
3. **Unlimited reset-code guessing.** A six-digit reset code with a one-hour expiry and no
   attempt limit is brute-forceable. Codes are now generated with `crypto.randomInt`
   (not `Math.random`), compared in constant time, and **burned after five wrong attempts**;
   verification codes get the same treatment plus a 24-hour expiry.
4. **Account enumeration.** `forgot-password` returned `500` when SMTP failed for a real
   account and `200` for an unknown one, and `resend-verification` / `verify-email` /
   `reset-password` returned distinct `404`s. All now answer with one generic message and
   `2xx`/`400` regardless of account existence, expiry or delivery failure.
5. **Logout and deletion did not revoke tokens.** `POST /auth/logout` was a no-op and JWTs
   lived seven days, so a stolen or signed-out token kept working. Tokens now carry a `jti`;
   logout writes a `revoked_tokens/{jti}` marker, password reset and account deletion write
   `revoked_tokens/uid:{uid}` (invalidating every token issued before that moment), and the
   guard rejects both.
6. **Deletion left personal data in other users' posts.** Account deletion removed the
   user's own posts, journals and moods, but their **replies** and **reaction entries**
   (which store email addresses) stayed embedded in other people's posts forever. Deletion
   now scrubs those too, recomputes reaction counts, and commits in chunks so large accounts
   cannot exceed Firestore's 500-operation batch limit.
7. **`GET /admin/users` returned live credential material** — `resetCode`,
   `resetCodeExpiresAt` and `verificationCode` — to the dashboard. Responses are now passed
   through `sanitizeUserRecord`, which also strips the password hash.
8. **`/admin/stats` crashed on timestamp-typed data.** `lastActive` was assumed to be a
   string and had `.startsWith()` called on it; Firestore `Timestamp` values (written from
   the console or an older client) raised a `TypeError`. Timestamps are now read through
   `common/utils/time.ts`, which handles ISO strings, epoch seconds/millis, `Date`,
   `{seconds}`/`{_seconds}` and `toDate()`. Admin counts use `count()` aggregates.
9. **No rate limiting anywhere.** `RateLimitGuard` + `@RateLimit()` now bound login
   (10 per 15 min per address+email), signup (5), forgot-password (5), reset-password (10),
   verify-email (10) and resend-verification (3). `main.ts` sets `trust proxy` so Cloud Run
   supplies the real client address, and `x-powered-by` is disabled.
10. **Swagger used public default credentials.** `/docs` was protected by `admin` /
    `adminpass` when `SWAGGER_PASSWORD` was unset. Production now serves the docs only when
    a password is configured.
11. **Email HTML injection.** The signup email interpolated `dto.name` unescaped; it is now
    escaped. Verification email failures on signup no longer abort account creation.

### Verified behaviour

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | exit 0 |
| `npx jest` (unit) | **50 passed**, 9 suites |
| `npx jest --config test/jest-e2e.json` (HTTP) | **14 passed**, 2 suites |
| `npm run build` (`nest build`) | exit 0 |
| Patch applies to a clean clone | `patch -p1 --dry-run` clean, 29 files |

The HTTP suite boots the real controllers, guards, validation pipe and services over
supertest and asserts: no-token and forged-token `401`; logout then reuse `401`; login
`429` after repeated failures; non-CEO `403` on all three admin routes while the CEO gets
`200`; credential fields absent from `/admin/users`; author-only and CEO post deletion;
CEO reply deletion vs `403` for a fellow user; cross-user post/journal edit `403`; mood
history isolation; account deletion + token revocation.

### Deployment prerequisites (breaking — do these before deploying)

1. **Set `JWT_SECRET`** to a long random value. Without it the service now refuses to start
   in production. Existing sessions signed with the old default become invalid, so users
   will be asked to sign in once more.
2. **Set `SWAGGER_PASSWORD`** if the docs should stay reachable in production.
3. **Set `SMTP_PASS`**; delivery failures are now logged rather than surfaced as `500`, so
   a misconfigured mailbox silently stops verification/reset emails.
4. Optional: `USE_IN_MEMORY_DB=true` for a credential-free local run or demo. This is the
   only way to get the advertised in-memory store; previously `initializeApp({projectId})`
   succeeded without credentials, so the fallback never engaged.

### Deployment revision does not match this source

The live API answers **both** `/moods` and `/api/moods` (`401` each) while `/api/bogus`
and `/moods/abc` are `404`. This repository sets `app.setGlobalPrefix('api')`, so only
`/api/*` should resolve. The running revision is therefore **not** built from this tree
(or has an extra proxy/route alias). Confirm which revision serves
`api-ysdoljkngq-uc.a.run.app` before treating any backend fix here as live.

### Still open (not changed)

- **CORS reflects any origin** (`origin: true`) together with `credentials: true`. Bearer
  auth limits the impact, but the allow-list should be the app's real origins.
- **Moderation is a two-regex deny list**; it is not a content-safety system and is easy to
  evade. It is applied server-side on create/edit, which is the important part.
- **Admin logs are derived from user records**, so `deletion`/`auto` event types never
  appear; there is no audit log of privileged actions.
- **No pagination** on `/journal`, `/moods`, `/spaces/posts` or `/admin/users` (capped at
  2000 users).
- **No refresh tokens**; session lifetime is still the seven-day JWT.
- Verification codes issued before this change carry no expiry and are still accepted once
  (enforcing it would lock out users mid-onboarding).
- Rate-limit counters are per process, so a scaled-out Cloud Run deployment multiplies the
  effective budget; a shared store is needed for a hard global limit.
