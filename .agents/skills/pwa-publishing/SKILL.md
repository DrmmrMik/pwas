---
name: pwa-publishing
description: Workflows and guidelines for building, registering, and deploying PWAs to GitHub Pages and individual repositories using publish.js.
---

# PWA Publishing Workflows

Use this skill whenever you are asked to register, compile, publish, or update a sub-application within the PWA portal. This guide outlines standard workflows to keep executions token-efficient, robust, and fast.

## 1. Project Organization
The workspace is organized as a PWA launcher monorepo:
* **Root Portal:** Contains `index.html` (the dashboard), `app.js`, `style.css`, and `manifest.json`.
* **Projects Registry:** [projects.json](file:///home/gallabot/Documents/Gemini/PWA-Publisher/projects.json) registers active apps.
* **Subfolders:** Each compiled app sits in its own subdirectory (e.g. `climascape/`, `fitnesstracker/`, `ginnycrunchers/`).
* **Source Projects:** The raw source code of the apps resides in sibling directories inside the parent directory (e.g. `/home/gallabot/Documents/Gemini/Ginny_Crunchers`, `/home/gallabot/Documents/Gemini/WeatherHome`).

---

## 2. Publishing / Updating Workflow
To deploy or update a sub-app, follow this sequence exactly:

1. **Locate the Source Folder:** Look in the parent directory (`/home/gallabot/Documents/Gemini/`) for the corresponding project.
2. **Determine Build Commands:** Read `package.json` in the source folder to identify the build script (usually `npm run build` or `vite build`). Do not make assumptions or recursively inspect src files.
3. **Execute Build:** Run the build command inside the source project's root directory to generate the fresh assets (normally inside a `dist/` or `build/` folder).
4. **Publish to Monorepo & Git:** From the PWA-Publisher workspace root, run the deployment script:
   `node publish.js <target-folder-name> <source-dist-path>`
   * *Example:* `node publish.js ginnycrunchers /home/gallabot/Documents/Gemini/Ginny_Crunchers/dist`
5. **Verify Path Formatting:** Confirm that the output files in the target subfolder use **relative paths** (`./assets/...`, `./sw.js`) so that they don't return 404s when hosted under the `/pwas/` subdirectory.

---

## 3. Token-Efficiency Guidelines
To keep costs low and responses fast:
* **Avoid Recursive Directory Views:** Never call `list_dir` recursively or dump large file lists. Only target the build configurations (`package.json`) and final build outputs (`dist/index.html`).
* **Do Not Poll Task Statuses:** When running long builds, specify a high `WaitMsBeforeAsync` in the command or stop calling tools; let the system automatically wake you when the command completes.
* **Target Edits Precisely:** If fixing a path issue, only request and replace the exact lines containing the absolute paths rather than overwriting whole files.

---

## 4. Resilient Troubleshooting & Fallbacks
* **Standalone Repo Push Failures:** `publish.js` tries to push to standalone repositories (`DrmmrMik/<project_name>`). If that fails (e.g., repository does not exist on GitHub), the script catches the error and proceeds with committing and pushing to the central monorepo (`DrmmrMik/pwas`). This is expected behavior; the central push is what feeds the active GitHub Pages site.
* **Jekyll Bypass:** Ensure an empty or commented `.nojekyll` file always exists at the root of the portal repo. Without it, GitHub Pages will refuse to serve directories starting with a dot and may fail to load JS chunks.
* **Git Auth Prompts:** Always read `.env` to check if a `GITHUB_TOKEN` is defined, and push using the authenticated URL: `https://<token>@github.com/DrmmrMik/pwas.git main` to prevent interactive credential hangs.
