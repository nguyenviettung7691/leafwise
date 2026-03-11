# Changelog

All notable changes to LeafWise are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.4.0] - juvenile-tanuki - 2026-03-11

### Bug Fixes

- **Token Expiration** — Replaced direct `localStorage` token reads with `getValidIdToken()` across all API clients (Apollo, AI client, S3 utilities). Tokens are now proactively refreshed 5 minutes before expiry, preventing silent 401 failures mid-session.
- **Navigation Progress Bar** — Fixed stale-closure bugs in the progress bar; hash-link and same-page navigations no longer trigger the bar incorrectly.
- **Primary Photo Update** — Fixed an issue where selecting a new primary photo from the gallery did not persist after page refresh. Local plant state is now updated immediately after the `updatePlant` mutation resolves.
- **Main Photo Selection from Gallery** — Fixed the flow where promoting a gallery photo to the main photo failed silently; the mutation now runs correctly and the UI reflects the change.
- **Photo Gallery Operations** — Delete and edit operations on gallery photos were not reflecting in the UI. Mutations now invalidate and refetch the correct Apollo cache entries.
- **Care Plan Mutations** — Fixed a typo in the delete care-plan mutation, added missing cache refresh after updates, and resolved stale-cache issues on plan refresh queries.
- **Weekly Care Schedule Layout** — Replaced a fixed `h-14` height on calendar rows with `min-h-[3.5rem]` so tasks with long names no longer overflow or get clipped.
- **Deep-Linking on S3 + CloudFront** — The smart `not-found.tsx` page now renders page components directly (using `dynamic()` imports) instead of relying on `router.replace()`, which was unreliable from the 404 context. All static and dynamic routes deep-link correctly.
- **CloudFront Function Permissions** — CloudFront Function creation and distribution config updates are wrapped in `try/catch` so deployments succeed gracefully even when IAM permissions for CloudFront Functions are absent.
- **RouteGuard Open-Redirect** — The `from` query-parameter used when redirecting unauthenticated users is now validated to start with `/` and not `//`, preventing open-redirect attacks.
- **User Preferences Fetch on App Load** — Fixed a race condition where a failed user-preferences fetch blocked the authentication flow on startup.
- **React Error #300 on Logout** — Moved a `useEffect` call above the conditional early return in the profile page to satisfy the Rules of Hooks and prevent the "fewer hooks than expected" crash on logout.
- **Export Data S3 Credentials** — The data-export flow now uses `createS3ClientWithCredentials` (Cognito Identity credentials) instead of an unauthenticated client, fixing a missing-credentials error during export.
- **User Profile Name Not Persisting** — After updating the display name via Cognito `UpdateUserAttributesCommand`, the ID token is now refreshed so the new name is reflected immediately without a page reload.
- **Image Loading on Static Export** — Added `images.unoptimized: true` to `next.config.ts` (required for `output: 'export'`). Also added `target.onerror = null` guards in all `<Image>` `onError` handlers to prevent infinite fallback loops.
- **Frequency Parsing ("Every X Years")** — Fixed a regex that failed to parse "Every X Years" frequency strings in both the Diagnose page and Plant Detail page, causing incorrect care-task scheduling.
- **Missing DialogDescription Warning** — Added the missing `<DialogDescription>` to the plant thumbnail modal in `PlantHeaderCard`, resolving an accessibility console warning.

### Features & Improvements

- **Cancel AI Operations** — Users can now cancel in-flight AI operations (diagnosis, care plan generation, health comparison, proactive review). Each flow tracks an `AbortController`; cancellation sends an abort signal to the Lambda Function URL and resets the UI cleanly.
- **Deep-Linking Architecture** — Full client-side deep-linking for the S3 + CloudFront static deployment: CloudFront Function rewrites directory-style URIs to `index.html`; custom error responses serve `404.html` for 403/404; `not-found.tsx` handles both static and dynamic routes.
- **Connection Status Interval** — The connection-status indicator now refreshes `lastConnectedTime` every 30 seconds while the user is online, keeping the "last connected" timestamp accurate during long sessions.
- **S3 Image & Credential Caching** — Cognito Identity credentials and S3 clients are cached for 55 minutes with concurrent-request deduplication. Presigned URLs are cached for 50 minutes. Both caches are invalidated on logout via `clearTokens()`.
- **Missing Translations** — Added 31 missing translation keys to both `en.json` and `vi.json`, ensuring no UI strings fall back to raw keys.
- **Import/Export Fixes** — Stripped disallowed extra fields from `UpdateUserPreferencesInput` during import; `File` objects are now converted to `Uint8Array` before S3 upload, fixing import on browsers that do not support streaming uploads. Avatar `S3Key` is correctly applied during import.
- **Genkit Upgrade** — Upgraded Genkit to 1.29.0, migrated from `@genkit-ai/googleai` to the new `@genkit-ai/google-genai` package, and updated the default model to `gemini-2.5-flash`.

---

## [0.3.10] - sapling-kodama

Previous release. See repository history for details.
