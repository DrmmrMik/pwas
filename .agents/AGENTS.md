# Workspace Agent Rules

Always refer to the custom skills [pwa-standards](file:///home/gallabot/Documents/Gemini/PWA-Publisher/.agents/skills/pwa-standards/SKILL.md) and [pwa-publishing](file:///home/gallabot/Documents/Gemini/PWA-Publisher/.agents/skills/pwa-publishing/SKILL.md), along with the project guide [PWA_STANDARDS.md](file:///home/gallabot/Documents/Gemini/PWA-Publisher/PWA_STANDARDS.md) whenever you are creating, refactoring, optimizing, or deploying a Progressive Web App (PWA) in this workspace.

## Rules for PWA Creation
1. **Always Use Best-in-Class Structure**: Every PWA must include a properly configured `manifest.json` and a service worker `sw.js` that implements dynamic stale-while-revalidate and offline fallbacks.
2. **Never Omit iOS Compatibility**: Safari still requires vendor-specific meta-tags and icons (e.g. `apple-touch-icon`, status bar translucency, viewport safe-area compatibility). Always ensure these are written.
3. **Ensure Native UX Feel in CSS**:
   - Prevent elastic scroll/rubber-banding on the root page body using `overscroll-behavior: none` and `overflow: hidden`.
   - Implement native safe areas using CSS variables `env(safe-area-inset-*)`.
   - Prevent default grey tap highlight and text selections on buttons and controls.
4. **Graceful Offline support**: Always provide an offline status indicator banner that triggers when the user loses connection.

## Rules for PWA Publishing & Deploying
5. **Re-Build Source Projects**: When asked to republish/update a project, always find the project's source directory (typically in `/home/gallabot/Documents/Gemini/<ProjectName>`), identify and run its build command (e.g. `npm run build`), and then execute `node publish.js <folder> <dist_path>` from the workspace root.
6. **Bypass Jekyll**: Always ensure that a `.nojekyll` file exists in the repository root to prevent GitHub Pages from blocking dotfiles or JS assets.
7. **Handle Push Failures Gracefully**: Expect standalone repo pushes in `publish.js` to fail if they do not exist on GitHub. Proceed with committing and pushing to the central `pwas` monorepo.
8. **Token-Efficiency First**: Avoid directory listing commands (`list_dir`) and file reads of complete sub-projects. Inspect only configuration files (`package.json`, `manifest.json`) and specific modified files. Do not run background loop tasks to check commands; let the system trigger wake-ups.

## Rules for Git Transactions
9. **Authenticate with GITHUB_TOKEN**: When performing remote git pushes, always read the `.env` file first. If a `GITHUB_TOKEN` is defined, execute the push using the authenticated HTTPS format:
   `git push https://<token>@github.com/<owner>/<repo>.git <branch>`
   This avoids interactive authentication prompts that cause hangs or require manual input. Never run generic `git push` without verifying authentication or token availability.
