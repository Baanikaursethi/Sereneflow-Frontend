# SereneFlow v7 Fix Plan

---

## 1. Per-File Diff Summary

### Frontend

#### `src/lib/types.ts`
No meaningful change between v6 and v7. Identical.

#### `src/lib/store.ts`
No change. Identical.

#### `src/lib/api.ts`
One change: the `API_BASE_URL` was changed from `"http://localhost:3000"` (v6) to the Firebase Cloud Functions URL (v7). This is intentional and correct. No bug.

#### `src/lib/auth.ts`
Two changes from v6 to v7:

1. **`signup()`**: v6 always called `setToken(token)`. v7 guards it: `if (user.isVerified) setToken(token); else setToken(null)`. This is correct behavior (don't set token for unverified signups), and is not a bug.

2. **`resetPassword()` DTO field name mismatch**: v6 sent `{ email, token, newPassword }`. v7 changed the field name to `{ email, code, newPassword }`. The v7 backend `ResetPasswordDto` expects `code`, and the v7 `auth.service.ts` reads `dto.code`. So v7 frontend and v7 backend are aligned on this. No bug here either.

**Conclusion:** `auth.ts` changes are benign. No fix needed.

#### `src/screens/SpacesPage.tsx`
Functionally almost identical between v6 and v7. One new feature added in v7 (anonymous reply toggle via `replyAnon` state). Permission logic (`isCeo`, `canManage`, `canEdit`, `isOwnReply`) is **identical** in both versions.

- `isCeo = user.email === CEO_EMAIL` — same in both.
- `canManage = isOwn(p) || isCeo` — same in both.
- `canEdit = isOwn(p)` — same in both (CEO cannot edit others' posts — correct).
- Reply menu: `(isOwnReply(r) || isCeo)` — same in both.

**Conclusion:** The SpacesPage frontend logic is correct in v7. The bugs are all in the **backend**.

---

### Backend

#### `src/spaces/spaces.service.ts` — THE ROOT CAUSE FILE

This is where all the bugs live. v7 rewrote `spaces.service.ts` away from v6's clean architecture and introduced four distinct bugs:

**Bug A — CEO delete posts: requires both email match AND `role === 'ceo'` (double condition)**

v6:
```typescript
// In deletePost():
const isCeo = isCeoEmail(email); // email match only
if (!viewer.isCeo && !this.isOwner(post, viewer)) { throw Forbidden }
```

v7:
```typescript
// In deletePost():
const isCeo = email === ceoEmail && userPayload.role === 'ceo';
// Requires BOTH email match AND role claim in token
if (!isCeo && !this.isSameOwner(...)) { throw Forbidden }
```

The v7 `auth.guard.ts` does set `role: decoded.email === ceoEmail ? 'ceo' : 'user'`, so for a fresh login this works. However, if the CEO's token was minted by an old code path that omitted or mismatched the role, this double check fails. More importantly, **see Bug B below** — the `authorIsCeo` field on posts also depends on this same `role` field in Firestore, creating a second failure mode.

**Bug B — CEO badge missing and `authorIsCeo` wrong on posts and replies (stale `role` in Firestore)**

v6 `shapePost()` / `shapeReply()`:
```typescript
authorIsCeo: !anonymous && isCeoEmail(email),
// Uses the hardcoded CEO_EMAIL utility — always correct regardless of stored data
```

v7 `decoratePost()` / `decorateReply()`:
```typescript
authorIsCeo: author.role === 'ceo' || post.authorEmail?.toLowerCase() === configService.get('CEO_EMAIL'),
// Reads `role` from the Firestore `users` document via findPublicAuthor()
```

The `findPublicAuthor()` function returns `role: user?.role || 'user'`. If the user document in Firestore was created before the role field existed, or the role field is stale/missing, `author.role` will be `'user'` even for the CEO. The OR fallback (`|| post.authorEmail === CEO_EMAIL`) only covers post-level checks, not reply-level (where the same pattern is repeated). However since both sides of the OR should cover it in theory, the deeper problem is:

**Bug C — `authorIsCeo` for replies: the OR fallback compares reply.authorEmail to CEO_EMAIL but can silently fail when `reply.authorEmail` is undefined or has a casing mismatch**

v7 `decorateReply()`:
```typescript
authorIsCeo: author.role === 'ceo' || reply.authorEmail?.toLowerCase() === (this.configService.get<string>('CEO_EMAIL') || 'sereneflow27@gmail.com'),
```

This is fragile: if `reply.authorEmail` is `undefined` (old reply written without storing authorEmail), the `.toLowerCase()` optional chain returns `undefined`, the comparison is `false`, and `author.role` may also be `'user'` if Firestore is stale → `authorIsCeo: false` for CEO's own replies.

**Bug D — CEO cannot delete replies (delete reply has no CEO override)**

v6 `deleteReply()`:
```typescript
if (!viewer.isCeo && !this.isOwner(replies[index], viewer)) {
  throw new ForbiddenException('Only the reply author or CEO/Admin can delete this reply');
}
```

v7 `deleteReply()`:
```typescript
if (!this.isSameOwner(userPayload, reply.authorEmail, reply.authorUid)) {
  throw new ForbiddenException('You are not authorized to delete another user\'s reply');
}
// ↑ NO CEO OVERRIDE AT ALL
```

The CEO gets a 403 trying to delete any reply they didn't author.

**Bug E — Previous CEO account shows "Remove Post" on the frontend**

This is a **frontend display bug**, not a backend permission bug. The frontend computes:
```typescript
const isCeo = user.email === CEO_EMAIL;
const canManage = isOwn(p) || isCeo;
```
If a previous CEO's user object in the app session still has `email === CEO_EMAIL`, the badge and buttons show. But that can only happen if the app somehow has the CEO email set as a different account — which points to the `CEO_EMAIL` constant being wrong. Since `CEO_EMAIL` is `"sereneflow27@gmail.com"` in both `src/data/content.ts` and the backend, the *real* scenario is: the previous CEO's **backend-returned posts** have `isOwner: true` (backend correctly sets `isOwner` based on JWT email match), but the *current* user who is NOT the CEO is seeing "Remove Post". 

Wait — re-reading the bug: "Previous CEO account shows 'Remove Post' but backend says only author or CEO/admin can remove." This means there IS a previous CEO user who is NOT the current CEO, and yet the frontend shows them "Remove Post." The only way this happens is:
- The frontend `isCeo` check passes for them, OR
- `canManage` returns true because `isOwn(p)` is true

Since `isCeo = user.email === CEO_EMAIL` and CEO_EMAIL is hardcoded, this can only be true for the *actual* CEO email. **Unless** — the v7 `auth.service.ts` still stores `role: 'ceo'` in the user's stored document for the old CEO, and the JWT token contains that stale role, and something in the frontend is checking role instead of email.

Looking at the frontend again: the frontend does NOT read `user.role` anywhere in SpacesPage — it only reads `user.email`. The `SFUser` type in v7 doesn't even have a `role` field. So the frontend's `isCeo` is always email-based. **The previous CEO's frontend won't show "Remove Post" unless their email IS `sereneflow27@gmail.com`** — which contradicts the bug report.

**Resolution**: The "previous CEO shows Remove Post" is actually a **backend bug**: the backend's `deletePost()` in v7 checks `userPayload.role === 'ceo'`, and the old CEO's JWT token still contains `role: 'ceo'` from when they were CEO. v6 fixed this by always recomputing role from email in `auth.guard.ts` using `roleForEmail()`, ignoring the token claim. v7 `auth.guard.ts` ALSO recomputes role from email (`role: decoded.email === ceoEmail ? 'ceo' : 'user'`), so a new login would have `role: 'user'` for the former CEO. BUT — the old CEO's previously stored JWT might still have `role: 'ceo'` and might still be valid (7-day expiry). When validated by the guard, the guard correctly sets `role: 'user'` (email mismatch). So the guard itself is fine.

Actually re-reading v7 `deletePost()` more carefully:
```typescript
const isCeo = email === ceoEmail && userPayload.role === 'ceo';
```
The `userPayload` is the guard-set request.user, which correctly sets `role` from the email. So for the former CEO with a different email, `role` will be `'user'`. The backend should correctly deny them. The frontend `canManage` check also won't show the menu for non-CEO users. So this bug may be more nuanced — the "previous CEO shows Remove Post" might refer to a **post they authored** (`isOwner: true`), which correctly shows Delete (not Remove) Post. This is correct behavior. The bug report may be a false alarm / misunderstanding.

**Summary of actual bugs and their root causes:**

| # | Bug | Root cause | File |
|---|-----|-----------|------|
| 1 | CEO badge missing | v7 `decoratePost()/decorateReply()` reads `author.role` from Firestore (may be stale/missing) instead of hardcoded email check | backend `spaces.service.ts` |
| 2 | CEO cannot delete own posts | Same double-condition `email && role === 'ceo'` in `deletePost()` is fragile; also CEO's own posts are correctly handled by `isOwner` — **but if `isOwner` is wrong** this fails | backend `spaces.service.ts` |
| 3 | CEO cannot remove other users' posts | `deletePost()` requires `role === 'ceo'` AND email; guard should set this correctly, but `isOwner` check uses `isSameOwner()` which compares by email AND uid — uid mismatch could fail it | backend `spaces.service.ts` |
| 4 | CEO cannot delete other users' replies | `deleteReply()` has NO CEO override whatsoever | backend `spaces.service.ts` |
| 5 | Reply Edit/Delete missing | Frontend code is correct (`isOwnReply(r) || isCeo`). Backend `decorateReply()` computes `isOwner` via `isSameOwner()` which needs uid to match — if uid is missing in old replies, owner detection fails | backend `spaces.service.ts` |
| 6 | CEO should delete but not edit replies | Edit is correctly owner-only in v7. Delete fix above covers this | backend `spaces.service.ts` |
| 7 | Spaces UI quality | Minor: v7 SpacesPage is identical to v6 in logic; the anon-reply toggle is a v7 addition that is good. No UI regression. |  — |

---

## 2. Root Cause Summary Per Reported Bug

### Bug 1: CEO badge missing for the current CEO account
**Root cause:** `decoratePost()` and `decorateReply()` in v7 `spaces.service.ts` compute `authorIsCeo` as `author.role === 'ceo' || authorEmail === CEO_EMAIL`. The `author.role` is read from the `users` Firestore collection via `findPublicAuthor()`. If the user document is missing the `role` field (created before it was added), the role defaults to `'user'`, making the first condition false. The fallback (`|| authorEmail === CEO_EMAIL`) should catch it, but for replies it uses `reply.authorEmail?.toLowerCase()` — if `reply.authorEmail` is not stored, it returns `undefined` and the OR fails. v6 used `isCeoEmail(email)` hardcoded — a pure email comparison that never depended on stored data.

**Fix:** Change `authorIsCeo` computation in both `decoratePost()` and `decorateReply()` to use pure email comparison: `authorIsCeo: !anonymous && email.toLowerCase() === CEO_EMAIL`.

### Bug 2: Current CEO cannot edit/delete their own posts
**Root cause:** The CEO's own posts have `isOwner: true` computed by `isSameOwner()`. If the `authorUid` in the post document doesn't match `userPayload.uid` (e.g., uid was stored differently, or is missing), and `authorEmail` also has a casing mismatch, `isSameOwner()` returns false. v6 used `isAuthoredBy()` from `content.util.ts` which handled this more robustly. Additionally, `updatePost()` only checks `isSameOwner()` — the CEO can only edit their own posts, which is correct — but `isSameOwner()` may fail.

**Fix:** Harden `isSameOwner()` to normalize email comparison, and ensure `authorEmail` is always lowercased when stored. The `createPost()` already lowercases: `email = userPayload.email.toLowerCase()` — that's fine. The issue is if old data has mixed case.

### Bug 3: Current CEO cannot remove other users' posts
**Root cause:** `deletePost()` in v7:
```typescript
const isCeo = email === ceoEmail && userPayload.role === 'ceo';
```
This requires `userPayload.role === 'ceo'`. The v7 `auth.guard.ts` does set `role` from email correctly. However, if for any reason the guard's role assignment is skipped (e.g., Firebase Auth path runs and the token doesn't carry email claims), `userPayload.role` could be undefined. More critically: this is an unnecessary and fragile double-check. v6 used email-only. 

**Fix:** Change `deletePost()` to compute isCeo from email only: `const isCeo = email === ceoEmail.toLowerCase()`.

### Bug 4: Previous CEO account shows "Remove Post"
**Root cause (clarified):** The previous CEO's own posts correctly show "Delete Post" (they are `isOwner: true`). The backend correctly denies the former CEO from deleting others' posts (their email no longer matches CEO_EMAIL in the guard). The frontend shows "Remove Post" label only when `isCeo && !isOwn(p)` — which requires `user.email === CEO_EMAIL`. For the former CEO, this is false. **The actual manifestation is likely:** the former CEO clicks the Delete button on their own post (correct), but the confirmation dialog text says "Remove this post for violating community guidelines?" instead of "Delete this post?" — because the `isCeo` check is true (the app session still had CEO_EMAIL as the user's email before switching accounts). This is a stale session issue, not a code bug.

**However**, if the reported bug is that the former CEO can *actually call* DELETE on other users' posts and it succeeds — that would be a backend bug. This is prevented by the guard recomputing role from email on every request, so the former CEO's request goes through with `role: 'user'`, and `isCeo` in `deletePost()` is false. **No backend fix needed here beyond Bug 3's fix.**

### Bug 5: Reply Edit/Delete options are missing when they should be available
**Root cause:** The frontend shows the reply menu when `isOwnReply(r) || isCeo`. `isOwnReply` checks `!!r.isOwner`. This `isOwner` field is set by the backend's `decorateReply()` via `isSameOwner()`. If `isSameOwner()` fails (uid mismatch, email mismatch), `isOwner` comes back `false` even for the reply's author. The same `isSameOwner()` robustness issue as Bug 2.

**Fix:** Same as Bug 2 — harden `isSameOwner()`.

### Bug 6: CEO should delete other users' replies but not edit them
**Root cause:** v7 `deleteReply()` has NO CEO override. Only `isSameOwner()` is checked. The CEO gets a 403 when deleting someone else's reply.

**Fix:** Add CEO override to `deleteReply()` matching v6's logic.

### Bug 7: v7 Spaces UI needs to match v6 quality/behavior
**Root cause:** Comparing the two SpacesPage files, the v7 UI is actually already identical to v6 in almost all respects. v7 added one extra feature: anonymous reply toggle. The layout, styles, permission rendering, CEO badge display, and all interaction patterns are the same. Once the backend bugs are fixed (so `isOwner` and `authorIsCeo` come back correctly), the UI will display correctly.

---

## 3. Ordered List of Specific Code Changes

Changes are backend-first (since most bugs are there), then verify frontend requires no changes.

---

### Change 1 — Backend: Fix `authorIsCeo` computation in `decoratePost()` and `decorateReply()`

**File:** `serene-flow-backend-fixed-v7/serene-flow-backend-fixed-v7/src/spaces/spaces.service.ts`

**Problem:** `authorIsCeo` depends on `author.role` read from Firestore (fragile/stale) instead of pure email comparison.

**In `decoratePost()`:**

Replace:
```typescript
    const author = await this.findPublicAuthor(post.authorEmail);
    return {
      id: post.id,
      text: post.text,
      time: post.time,
      anonymous: false,
      authorName: post.authorName || author.name,
      authorAvatar: post.authorAvatar ?? author.avatar,
      authorIsCeo: author.role === 'ceo' || post.authorEmail?.toLowerCase() === (this.configService.get<string>('CEO_EMAIL') || 'sereneflow27@gmail.com'),
```

With:
```typescript
    const CEO_EMAIL = (this.configService.get<string>('CEO_EMAIL') || 'sereneflow27@gmail.com').toLowerCase();
    const author = await this.findPublicAuthor(post.authorEmail);
    return {
      id: post.id,
      text: post.text,
      time: post.time,
      anonymous: false,
      authorName: post.authorName || author.name,
      authorAvatar: post.authorAvatar ?? author.avatar,
      authorIsCeo: !!(post.authorEmail?.toLowerCase() === CEO_EMAIL),
```

**In `decorateReply()`:**

Replace:
```typescript
      authorIsCeo: author.role === 'ceo' || reply.authorEmail?.toLowerCase() === (this.configService.get<string>('CEO_EMAIL') || 'sereneflow27@gmail.com'),
```

With:
```typescript
      authorIsCeo: !!(reply.authorEmail?.toLowerCase() === CEO_EMAIL),
```
where `CEO_EMAIL` is computed at the top of the `decorateReply()` function as:
```typescript
    const CEO_EMAIL = (this.configService.get<string>('CEO_EMAIL') || 'sereneflow27@gmail.com').toLowerCase();
```

Additionally, the `findPublicAuthor()` return value's `role` field is no longer needed for CEO detection, but keep it in case other code uses it.

---

### Change 2 — Backend: Fix `deletePost()` — remove `role === 'ceo'` requirement, use email only

**File:** `serene-flow-backend-fixed-v7/serene-flow-backend-fixed-v7/src/spaces/spaces.service.ts`

**Problem:** `const isCeo = email === ceoEmail && userPayload.role === 'ceo'` adds an unnecessary role check that can fail if the role claim is absent or stale.

Replace (both the Firestore path and the in-memory path):
```typescript
    const ceoEmail = (this.configService.get<string>('CEO_EMAIL') || 'sereneflow27@gmail.com').toLowerCase();
    const isCeo = email === ceoEmail && userPayload.role === 'ceo';
```

With:
```typescript
    const ceoEmail = (this.configService.get<string>('CEO_EMAIL') || 'sereneflow27@gmail.com').toLowerCase();
    const isCeo = email === ceoEmail;
```

---

### Change 3 — Backend: Add CEO override to `deleteReply()`

**File:** `serene-flow-backend-fixed-v7/serene-flow-backend-fixed-v7/src/spaces/spaces.service.ts`

**Problem:** v7 `deleteReply()` only allows the reply's owner to delete it; no CEO override exists.

In the Firestore path of `deleteReply()`, replace:
```typescript
      if (!this.isSameOwner(userPayload, reply.authorEmail, reply.authorUid)) {
        throw new ForbiddenException('You are not authorized to delete another user\'s reply');
      }
```

With:
```typescript
      const ceoEmail = (this.configService.get<string>('CEO_EMAIL') || 'sereneflow27@gmail.com').toLowerCase();
      const isCeo = userPayload.email?.toLowerCase() === ceoEmail;
      if (!isCeo && !this.isSameOwner(userPayload, reply.authorEmail, reply.authorUid)) {
        throw new ForbiddenException('Only the reply author or CEO/Admin can delete this reply');
      }
```

Apply the same change in the in-memory (non-Firestore) path of `deleteReply()`:

Replace:
```typescript
      if (!this.isSameOwner(userPayload, reply.authorEmail, reply.authorUid)) {
        throw new ForbiddenException('You are not authorized to delete another user\'s reply');
      }
```

With:
```typescript
      const ceoEmail = (this.configService.get<string>('CEO_EMAIL') || 'sereneflow27@gmail.com').toLowerCase();
      const isCeo = userPayload.email?.toLowerCase() === ceoEmail;
      if (!isCeo && !this.isSameOwner(userPayload, reply.authorEmail, reply.authorUid)) {
        throw new ForbiddenException('Only the reply author or CEO/Admin can delete this reply');
      }
```

To avoid repeating the ceoEmail computation, extract it as a private helper or compute once at the top of the method.

---

### Change 4 — Backend: Harden `isSameOwner()` for robust email comparison

**File:** `serene-flow-backend-fixed-v7/serene-flow-backend-fixed-v7/src/spaces/spaces.service.ts`

**Problem:** `isSameOwner()` does `authorEmail?.toLowerCase() === email` but `email` is already lowercased from `userPayload.email.toLowerCase()` only in some methods (e.g., `createPost`, `deletePost`). In `updatePost`, `addReply`, `updateReply`, the method receives the raw `userPayload` object, and `email` in `isSameOwner` is derived from `String(userPayload?.email || '').toLowerCase()` — that part is fine. However `authorEmail?.toLowerCase()` can still be undefined if `authorEmail` is missing from old data. Add a null guard.

Replace:
```typescript
  private isSameOwner(userPayload: any, authorEmail?: string, authorUid?: string) {
    const email = String(userPayload?.email || '').toLowerCase();
    return !!email && (authorEmail?.toLowerCase() === email || (!!authorUid && authorUid === userPayload?.uid));
  }
```

With:
```typescript
  private isSameOwner(userPayload: any, authorEmail?: string, authorUid?: string) {
    const email = String(userPayload?.email || '').toLowerCase();
    if (!email) return false;
    const storedEmail = typeof authorEmail === 'string' ? authorEmail.toLowerCase() : null;
    const emailMatch = storedEmail !== null && storedEmail === email;
    const uidMatch = !!authorUid && !!userPayload?.uid && String(authorUid) === String(userPayload.uid);
    return emailMatch || uidMatch;
  }
```

---

### Change 5 — Backend: Fix `updateReply()` signature mismatch (bonus correctness fix)

**File:** `serene-flow-backend-fixed-v7/serene-flow-backend-fixed-v7/src/spaces/spaces.service.ts` and `src/spaces/spaces.controller.ts`

**Problem:** v7 `spaces.controller.ts` calls `spacesService.updateReply(user, postId, replyId, text.trim())` (passing raw string as 4th arg), but `spaces.service.ts updateReply()` signature is `async updateReply(userPayload, postId, replyId, text: string)` — this actually matches. ✓ No change needed here. The v7 controller passes `text` directly while v6 passed a `dto` object; v7 service accepts the plain string. This is consistent within v7.

No change required.

---

### Change 6 — Frontend: No changes required to SpacesPage.tsx

The v7 frontend `SpacesPage.tsx` permission logic is correct and matches v6:
- `isCeo = user.email === CEO_EMAIL` ✓
- `canManage = isOwn(p) || isCeo` ✓
- `canEdit = isOwn(p)` (CEO cannot edit others' posts) ✓
- Reply menu: `isOwnReply(r) || isCeo` ✓
- Reply edit: only shows when `isOwnReply(r)` ✓ (CEO can delete but not edit others' replies)

Once the backend returns correct `isOwner` and `authorIsCeo` values, the UI will display correctly.

---

### Change 7 — Backend: Fix `decoratePost()` to also compute CEO_EMAIL consistently (refactor)

The CEO_EMAIL is computed inline in multiple places in v7. Extract it into a private getter to avoid repetition and ensure consistency:

**Add** the following private helper near the top of the class (after the constructor):
```typescript
  private get ceoEmail(): string {
    return (this.configService.get<string>('CEO_EMAIL') || 'sereneflow27@gmail.com').toLowerCase();
  }
```

Then replace all occurrences of:
```typescript
(this.configService.get<string>('CEO_EMAIL') || 'sereneflow27@gmail.com').toLowerCase()
```
and:
```typescript
(this.configService.get<string>('CEO_EMAIL') || 'sereneflow27@gmail.com')
```

with `this.ceoEmail` throughout `spaces.service.ts`.

---

## 4. Files That Need to Be Changed

### Backend (primary — all bugs are here)

| File | Changes |
|------|---------|
| `src/spaces/spaces.service.ts` | Change 1 (authorIsCeo), Change 2 (deletePost isCeo), Change 3 (deleteReply CEO override), Change 4 (isSameOwner hardening), Change 7 (ceoEmail helper) |

### Frontend (no changes needed)

| File | Status |
|------|--------|
| `src/screens/SpacesPage.tsx` | Already correct — no changes needed |
| `src/lib/auth.ts` | Already correct for v7 — no changes needed |
| `src/lib/api.ts` | Intentional change (new base URL) — no changes needed |
| `src/lib/types.ts` | No change from v6 |
| `src/lib/store.ts` | No change from v6 |

---

## 5. Ordered Implementation Checklist

- [ ] 1. Add `private get ceoEmail()` helper to `SpacesService` class in `spaces.service.ts`.
      Eliminates repeated inline `configService.get('CEO_EMAIL')` calls; replaces all three occurrences.
      Files: `src/spaces/spaces.service.ts`
      Verify: Backend compiles (`npm run build` in backend directory).

- [ ] 2. Fix `isSameOwner()` to guard against null/undefined `authorEmail` and normalize both sides.
      This fixes `isOwner` returning false for valid owners when `authorEmail` is missing or cased differently.
      Files: `src/spaces/spaces.service.ts`
      Verify: Backend compiles cleanly.

- [ ] 3. Fix `authorIsCeo` in `decoratePost()` — use pure email comparison instead of `author.role`.
      Replace `author.role === 'ceo' || post.authorEmail?.toLowerCase() === ...` with `post.authorEmail?.toLowerCase() === this.ceoEmail`.
      Files: `src/spaces/spaces.service.ts`
      Verify: CEO posts now return `authorIsCeo: true` when fetching `/api/spaces/posts`.

- [ ] 4. Fix `authorIsCeo` in `decorateReply()` — use pure email comparison instead of `author.role`.
      Replace fragile OR expression with `reply.authorEmail?.toLowerCase() === this.ceoEmail`.
      Files: `src/spaces/spaces.service.ts`
      Verify: CEO's replies return `authorIsCeo: true`.

- [ ] 5. Fix `deletePost()` — remove the `&& userPayload.role === 'ceo'` requirement.
      CEO override must be email-only to match v6 behavior and be immune to stale role data.
      Files: `src/spaces/spaces.service.ts`
      Verify: CEO can DELETE `/api/spaces/posts/:id` for posts they don't own (returns 200). Former CEO gets 403.

- [ ] 6. Fix `deleteReply()` — add CEO override in both Firestore and in-memory paths.
      CEO (by email) must be allowed to delete any reply, matching v6 behavior.
      Files: `src/spaces/spaces.service.ts`
      Verify: CEO can DELETE `/api/spaces/posts/:postId/replies/:replyId` for replies they don't own (returns 200). Regular users still get 403 for others' replies.

---

## 6. What Was Different Between v6 and v7 (Summary)

| Area | v6 | v7 | Impact |
|------|----|----|--------|
| `auth.guard.ts` | Uses `roleForEmail()` util (ignores token claim) | Inline `email === ceoEmail ? 'ceo' : 'user'` (same logic, slightly different impl) | None — functionally equivalent |
| `spaces.service.ts` — architecture | Clean `Viewer` struct, dedicated utils (`isCeoEmail`, `isAuthoredBy`), `mutatePost()` transaction helper | Inline helpers, no CEO util, no transaction helper | Fragile |
| `spaces.service.ts` — `authorIsCeo` | `isCeoEmail(email)` — pure email, never reads Firestore role | `author.role === 'ceo' \|\| email === CEO_EMAIL` — reads Firestore | **Bug 1: CEO badge missing if role field stale** |
| `spaces.service.ts` — `deletePost()` | Email-only CEO check | `email === ceoEmail && role === 'ceo'` double-check | **Bug 3: CEO delete blocked by extra role condition** |
| `spaces.service.ts` — `deleteReply()` | CEO override: `if (!viewer.isCeo && !isOwner)` | No CEO override: `if (!isSameOwner)` only | **Bug 4: CEO cannot delete any reply** |
| `spaces.service.ts` — `isOwner` computation | `isAuthoredBy()` with more robust logic | `isSameOwner()` — optional chaining can silently return false | **Bug 2/5: Edit/Delete on own posts/replies missing** |
| `auth.service.ts` — stale role cleanup | `roleForEmail()` always recomputes and patches DB on login | Inline, also corrects on login but less robustly | Minor |
| Frontend `auth.ts` — `signup()` | Always sets token after signup | Sets token only if verified | Intentional improvement, no bug |
| Frontend `auth.ts` — `resetPassword()` | Sends `{ token: code }` | Sends `{ code: code }` | Aligns with v7 backend DTO — no bug |
| Frontend `SpacesPage.tsx` | No anonymous reply toggle | Added anonymous reply toggle (`replyAnon` state) | New feature, correct |
