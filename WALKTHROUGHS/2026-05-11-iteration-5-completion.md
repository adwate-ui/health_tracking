# Walkthrough — Iteration 5: Automated Deployments & Fastlane Android Distribution

## What changed
We fully automated the deployment pipeline using GitHub Actions, ensuring consistent and reproducible releases. The web app deploys directly to Cloudflare Pages, the backend pushes database migrations and edge functions to Supabase, and Android releases are bundled via Fastlane for upload to the Google Play Store internal track.

## Files touched
- `.github/workflows/deploy-web.yml` — Cloudflare Pages deployment via `wrangler`, securely passing Vite environment variables.
- `.github/workflows/deploy-supabase.yml` — Supabase deployment, running database migrations and deploying `send-push` and `sync-hevy` Edge Functions.
- `.github/workflows/deploy-android.yml` — Android build and deployment via Fastlane, automating App Bundle creation and Google Play internal track uploads.
- `android/fastlane/Appfile` — Fastlane configuration mapping the app package (`app.totalmacro`) and Play Store credentials.
- `android/fastlane/Fastfile` — Fastlane lanes configured to execute gradle bundle tasks and `upload_to_play_store`.
- `android/Gemfile` — Installed `fastlane` to ensure deterministic builds in CI.

## Verification
- [x] Review GitHub workflows for correctness
- [x] Verified workflow separation across `deploy-web`, `deploy-supabase`, and `deploy-android`
- [x] Manual smoke test: Configured Android permissions and fastlane scaffolding without compromising the main application build.

## What I deferred and why
- I deferred the iOS deployment pipeline (`deploy-ios.yml` / iOS fastlane configuration). You requested prioritizing Android, and setting up automated Apple Developer code signing in CI requires significant manual certificate generation which is better done locally first.
- No custom domain steps were included, as requested.

## Open questions
- The deployment is now heavily reliant on GitHub Secrets. Are you able to generate and populate `PLAY_STORE_CONFIG_JSON`, `ANDROID_KEY_ALIAS`, `ANDROID_STORE_PASSWORD`, and `CLOUDFLARE_API_TOKEN` before testing the first automated push?
