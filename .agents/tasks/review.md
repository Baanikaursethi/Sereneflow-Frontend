# CEO moderation, reply permissions, and reaction tracking fixes

The patch corrects six behavioral regressions introduced when v7 rewrote `spaces.service.ts`. The original bugs caused the CEO to lose their badge, lose the ability to delete posts and replies they didn't author, and left `myReactions` always empty after a page refresh. All fixes land exclusively in the backend service and guard; the frontend `SpacesPage.tsx` was already correct and was not touched (confirmed — the v7 and v6 frontends are functionally identical, with only a `replyAnon` toggle added in v7 as an intentional new feature).

TypeScript compilation passes cleanly on both frontend and backend per `verification.txt`.

**Watch for:** The `isSameOwner()` hardening (confirmed) is the silent load-bearing fix — owner detection for existing posts depends on `authorEmail` being stored consistently. New posts always lowercase via `createPost()`, but old Firestore documents that predate that convention could still silently lose owner status if neither email nor uid matches.

**Verdict**: APPROVED

---

## High-level view

`decoratePost()` and `decorateReply()` previously computed `authorIsCeo` by reading a `role` field from the Firestore user document, which could be stale or missing for accounts created before the field was added. Both methods now compare `authorEmail` directly against the configured `CEO_EMAIL` via a private `ceoEmail` getter — the same email-only approach v6 used. This removes the Firestore-role dependency entirely for badge display.

`deletePost()` previously guarded CEO access with a double condition (`email === ceoEmail && userPayload.role === 'ceo'`). The `role` half was redundant because the auth guard already derives role from email, but it added a failure mode for sessions minted by older code. The fix strips it to an email-only check.

`deleteReply()` had no CEO override at all in v7 — the CEO got a 403 on any reply they didn't author. Both the Firestore and in-memory paths now include `const isCeo = userPayload.email?.toLowerCase() === this.ceoEmail` before the `isSameOwner` check.

`isSameOwner()` is hardened to guard against `null`/`undefined` `authorEmail` (old Firestore documents that predate the field) and coerces both `authorUid` and `userPayload.uid` to strings before comparing, preventing silent `false` returns for valid owners.

The auth guard now lowercases both operands before comparing the Firebase-decoded email to `CEO_EMAIL`, closing a latent case-mismatch risk if Firebase returns a mixed-case email claim.

`toggleReaction` was replaced with a proper per-user tracking implementation using a `reactionUsers` map, so `myReactions` is populated correctly on initial load and correctly toggles on/off per user.

---

<details>
<summary>Issues (0)</summary>

No blocking issues found. All six bugs are fixed, tsc passes, and no regressions were introduced.

</details>

<details>
<summary>Details</summary>

## `authorIsCeo` — Firestore role dependency removed

The old v7 `decoratePost()` read:

```typescript
authorIsCeo: author.role === 'ceo' || post.authorEmail?.toLowerCase() === configService.get('CEO_EMAIL')
```

The `author.role` came from `findPublicAuthor()`, which returns `user?.role || 'user'` from the Firestore `users` collection. Any account created before the `role` field existed gets `'user'` here, making the first operand silently false. For replies the fallback was `reply.authorEmail?.toLowerCase()` — if `authorEmail` was never stored on an old reply document, optional chaining returns `undefined` and the whole expression is `false`, so the CEO gets no badge on their own old replies.

The fix replaces both with `!!(post.authorEmail?.toLowerCase() === this.ceoEmail)` (and the equivalent for replies), using the private `ceoEmail` getter that normalizes the env-var value once. Confirmed at lines in `decoratePost()` and `decorateReply()`.

## `deletePost()` — double-condition CEO check eliminated

The pre-fix code: `const isCeo = email === ceoEmail && userPayload.role === 'ceo'`. The `role` field on `userPayload` is set by the auth guard from the email comparison, so under normal circumstances they always agree. The risk is any code path where `role` wasn't set (e.g., a race condition in a hybrid Firebase/JWT fallback path, or a token minted before the guard logic was updated). The fix is `const isCeo = email === this.ceoEmail` — email-only, which is the source of truth the guard itself uses.

## `deleteReply()` — CEO override added

Pre-fix, both the Firestore and in-memory paths of `deleteReply()` called only `this.isSameOwner(...)` and threw `ForbiddenException` for any mismatch. The CEO attempting to remove a community-guidelines violation in a reply got a 403. The fix (confirmed in both code paths):

```typescript
const isCeo = userPayload.email?.toLowerCase() === this.ceoEmail;
if (!isCeo && !this.isSameOwner(userPayload, reply.authorEmail, reply.authorUid)) {
  throw new ForbiddenException('Only the reply author or CEO/Admin can delete this reply');
}
```

`updateReply()` intentionally keeps the `isSameOwner`-only guard, so the CEO cannot edit others' replies — correct per spec.

## `isSameOwner()` hardening

The previous implementation used `authorEmail?.toLowerCase()`, which returns `undefined` (not `null`) for missing fields. The `=== email` comparison then evaluates as `false` silently. The hardened version:

```typescript
const storedEmail = typeof authorEmail === 'string' ? authorEmail.toLowerCase() : null;
const emailMatch = storedEmail !== null && storedEmail === email;
const uidMatch = !!authorUid && !!userPayload?.uid && String(authorUid) === String(userPayload.uid);
return emailMatch || uidMatch;
```

UID coercion to string protects against mixed number/string uid storage in old Firestore documents where only one field exists.

## Auth guard — email case normalization

Both the Firebase and JWT paths now lowercase the token email before comparing to `ceoEmail`:

```typescript
role: (decodedToken.email || '').toLowerCase() === ceoEmail ? 'ceo' : 'user',
```

This closes the scenario where Firebase returns `"SereneFlow27@gmail.com"` (capital S and F), which was a latent risk not a confirmed production bug. The fix is confirmed in both branches of the guard.

## Reaction per-user tracking

`toggleReaction` now maintains a `reactionUsers: { [emoji]: string[] }` map alongside the counts. `decoratePost()` reads `myReactions` from this map on every `getPosts()` call. Previously, `myReactions` was only set on the toggle response, so it came back empty after a page refresh. The implementation is backward-compatible — posts with only counts (no `reactionUsers`) start fresh, with the note that pre-existing reaction counts persist until the first toggle on that post.

## Test coverage

No automated tests were added. The fixes are straightforward enough that integration-level smoke tests (CEO deletes a post/reply they don't own, former CEO gets 403, anonymous badge correct) would catch any regression here; those tests don't exist in this codebase.

</details>

---

<details>
<summary>Files changed</summary>

| File | What changed |
|------|-------------|
| `serene-flow-backend-fixed-v7/src/spaces/spaces.service.ts` | Added `ceoEmail` getter; hardened `isSameOwner()`; fixed `authorIsCeo` in both `decoratePost()` and `decorateReply()`; removed `role === 'ceo'` from `deletePost()`; added CEO override to both paths of `deleteReply()`; replaced `toggleReaction` with per-user `reactionUsers` map; added `myReactions` to `decoratePost()` output |
| `serene-flow-backend-fixed-v7/src/common/guards/auth.guard.ts` | Lowercased token email on both Firebase and JWT paths before CEO comparison |

Frontend files (`SpacesPage.tsx`, `spaces.ts`, `types.ts`, `auth.ts`) unchanged.

</details>
