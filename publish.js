#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function log(msg) {
  console.log(`[PWA Publisher] ${msg}`);
}

function logError(msg) {
  console.error(`[PWA Publisher] ERROR: ${msg}`);
}

// Helper to load token from .env without dependencies
function loadToken() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*GITHUB_TOKEN\s*=\s*(.*?)\s*$/);
      if (match) {
        // Strip optional surrounding quotes
        let val = match[1];
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        return val;
      }
    }
  }
  return null;
}

// 1. Argument parsing and validation
const targetFolder = process.argv[2];
const srcDir = process.argv[3];

if (!targetFolder || !srcDir) {
  logError("Missing arguments.");
  console.log("Usage: node publish.js <target-folder-name> <source-directory-path>");
  console.log("Example: node publish.js climascape /home/gallabot/Documents/Gemini/WeatherHome/dist");
  process.exit(1);
}

// Sanitize targetFolder name (only permit basic directory name, no path traversal)
if (!/^[a-zA-Z0-9-_]+$/.test(targetFolder)) {
  logError(`Invalid target folder name: "${targetFolder}". Use alphanumeric, dashes, and underscores only.`);
  process.exit(1);
}

const repoDir = __dirname;
const targetDir = path.resolve(repoDir, targetFolder);

// Check path traversal just in case
const relative = path.relative(repoDir, targetDir);
if (relative.startsWith('..') || !relative || path.isAbsolute(relative)) {
  logError("Invalid target folder destination (must be directly under the workspace root).");
  process.exit(1);
}

// 2. Validate source directory
const resolvedSrcDir = path.resolve(srcDir);
if (!fs.existsSync(resolvedSrcDir)) {
  logError(`Source directory does not exist: "${resolvedSrcDir}"`);
  process.exit(1);
}

const srcStat = fs.statSync(resolvedSrcDir);
if (!srcStat.isDirectory()) {
  logError(`Source path is not a directory: "${resolvedSrcDir}"`);
  process.exit(1);
}

// Load token
const token = loadToken();

try {
  // 3. Clean target directory
  log(`Cleaning target folder: "${targetDir}"...`);
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });

  // 4. Copy assets from source to target
  log(`Copying compiled assets from "${resolvedSrcDir}" to "${targetDir}"...`);
  fs.cpSync(resolvedSrcDir, targetDir, { recursive: true });
  log("Assets copied successfully.");

  // 4b. PWA COMPLIANCE GATE — validate before publish. Blocks deploy if the
  // built PWA would fail modern Android install (e.g. missing maskable icon,
  // broken SW precache, no SW registration).
  const validator = path.join(repoDir, 'validate_pwa.py');
  if (fs.existsSync(validator) && /pwa|nova|fitnesstracker|climascape|penandpaper|ginnycrunchers/.test(targetFolder)) {
    log("Running PWA compliance gate (validate_pwa.py)...");
    try {
      const vr = execSync(`python3 ${JSON.stringify(validator)} ${JSON.stringify(targetDir)}`, { cwd: repoDir, stdio: 'pipe' });
      process.stdout.write(vr.toString());
    } catch (ve) {
      const out = ve.stdout ? ve.stdout.toString() : '';
      const errOut = ve.stderr ? ve.stderr.toString() : '';
      process.stdout.write(out);
      process.stderr.write(errOut);
      throw new Error("PWA compliance gate FAILED — aborted publish. Fix errors in validate_pwa.py output above.");
    }
    log("PWA compliance gate PASSED.");
  }

  // Update projects.json registry if targetFolder is not already listed
  const projectsJsonPath = path.join(repoDir, 'projects.json');
  try {
    let projects = [];
    if (fs.existsSync(projectsJsonPath)) {
      projects = JSON.parse(fs.readFileSync(projectsJsonPath, 'utf8'));
    }
    if (!projects.includes(targetFolder)) {
      projects.push(targetFolder);
      projects.sort();
      fs.writeFileSync(projectsJsonPath, JSON.stringify(projects, null, 2) + '\n', 'utf8');
      log(`Added "${targetFolder}" to projects.json registry.`);
    }
  } catch (err) {
    logError(`Failed to update projects.json registry: ${err.message}`);
  }

  // 5. Automate Git workflow
  log("Starting Git deployment workflow...");
  
  // Secure runner to prevent token leak
  const runGitSecure = (cmdStr, cwd = repoDir) => {
    // Determine if token is in command and replace it in printed logs
    let printCmd = cmdStr;
    if (token) {
      printCmd = cmdStr.replace(new RegExp(token, 'g'), '[REDACTED]');
    }
    log(`Running: ${printCmd}`);

    try {
      const output = execSync(cmdStr, { cwd, stdio: 'pipe' });
      const outputStr = output.toString();
      if (outputStr.trim()) {
        console.log(token ? outputStr.replace(new RegExp(token, 'g'), '[REDACTED]') : outputStr);
      }
    } catch (err) {
      let errMsg = err.message;
      if (err.stderr) {
        errMsg += '\n' + err.stderr.toString();
      }
      if (token) {
        errMsg = errMsg.replace(new RegExp(token, 'g'), '[REDACTED]');
      }
      throw new Error(errMsg);
    }
  };

  // Add the changes to the monorepo to check status
  runGitSecure(`git add "${targetFolder}"`);
  runGitSecure('git add "projects.json"');

  // Check if there are any changes to commit in the target folder or projects.json
  const statusCheck = execSync(`git status --porcelain "${targetFolder}" projects.json`, { cwd: repoDir }).toString().trim();

  // Determine matching repository name for the individual project
  const repoMapping = {
    'climascape': 'climascape',
    'penandpaper': 'penandpaper',
    'fitnesstracker': 'fitness_tracker',
    'photoscavengerhunt': 'photo_scavenger_hunt'
  };
  const repoName = repoMapping[targetFolder] || targetFolder;
  log(`Target repository name mapped to: "${repoName}"`);

  // Define individual push URL
  let individualPushUrl;
  if (token && token !== 'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN_HERE') {
    individualPushUrl = `https://${token}@github.com/DrmmrMik/${repoName}.git`;
  } else {
    individualPushUrl = `git@github.com:DrmmrMik/${repoName}.git`;
  }

  // A. Publish to the individual target repository
  log(`Deploying directly to individual repository: "DrmmrMik/${repoName}"...`);
  try {
    runGitSecure('git init', targetDir);
    runGitSecure('git config user.name "PWA Publisher"', targetDir);
    runGitSecure('git config user.email "publisher@pwa.local"', targetDir);
    runGitSecure('git checkout -B main', targetDir);
    runGitSecure('git add -A', targetDir);
    runGitSecure(`git commit -m "deploy: update ${targetFolder} PWA assets"`, targetDir);
    runGitSecure(`git push -f ${individualPushUrl} main`, targetDir);
    log(`Successfully deployed to individual repository "DrmmrMik/${repoName}".`);
  } catch (err) {
    logError(`Could not deploy to individual repository "DrmmrMik/${repoName}": ${err.message}`);
    log("Continuing with central monorepo publication...");
  } finally {
    // Clean up target directory's .git directory to keep the monorepo clean
    const gitDir = path.join(targetDir, '.git');
    if (fs.existsSync(gitDir)) {
      fs.rmSync(gitDir, { recursive: true, force: true });
      log("Cleaned up temporary .git metadata from target folder.");
    }
  }

  // B. Commit and push the monorepo changes to the central 'pwas' repository if any changes exist
  if (statusCheck) {
    log("Syncing changes with central monorepo...");
    runGitSecure(`git commit -m "deploy: update ${targetFolder} PWA assets"`);
    if (token && token !== 'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN_HERE') {
      runGitSecure(`git push https://${token}@github.com/DrmmrMik/pwas.git main`);
    } else {
      log("No GITHUB_TOKEN configured in .env. Attempting standard git push for monorepo...");
      runGitSecure("git push origin main");
    }
  } else {
    log(`No changes detected in monorepo for "${targetFolder}". Skipping monorepo commit and push.`);
  }

  // 6. DEPLOY VERIFICATION — confirm the app is actually served on the web.
  // A successful git push means NOTHING if GitHub Pages isn't serving it (this
  // is exactly why installs failed: files were pushed but Pages was off, so the
  // URL 404'd). We force-trigger a Pages rebuild via API, then HTTP-check the
  // live URL and FAIL the publish if it's dead.
  const liveBase = `https://drmrmik.github.io/${repoName}/`;
  log(`Verifying live deployment at ${liveBase} ...`);
  
  // Force-trigger Pages rebuild (much faster than waiting for the automatic one)
  if (token && token !== 'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN_HERE') {
    try {
      const rebuildCmd = `curl -s -X PUT -H "Authorization: Bearer ${token}" -H "Accept: application/vnd.github+json" -H "Content-Type: application/json" -d '{"source":{"branch":"main","path":"/"}}' https://api.github.com/repos/DrmmrMik/${repoName}/pages -w "%{http_code}" 2>/dev/null`;
      const rebuildRes = execSync(rebuildCmd, { stdio: 'pipe' }).toString().trim();
      log(`Pages rebuild trigger: HTTP ${rebuildRes.slice(-3)}`);
    } catch (e) {
      log(`Pages rebuild trigger attempt: ${e.message.split('\\n')[0]}`);
    }
  } else {
    log('No token available, waiting for automatic Pages rebuild...');
  }
  
  let deployOk = false;
  for (let attempt = 1; attempt <= 18 && !deployOk; attempt++) {
    try {
      const res = execSync(`curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${liveBase}"`, { stdio: 'pipe' }).toString().trim();
      if (res === '200') {
        deployOk = true;
        log(`Live check (attempt ${attempt}): HTTP 200 — app is served.`);
      } else {
        log(`Live check (attempt ${attempt}): HTTP ${res} — not served yet (Pages may be rebuilding), waiting 10s...`);
        execSync('sleep 10');
      }
    } catch (e) {
      log(`Live check (attempt ${attempt}): fetch error, waiting 10s...`);
      execSync('sleep 10');
    }
  }
  if (!deployOk) {
    throw new Error(
      `DEPLOY VERIFICATION FAILED: ${liveBase} did not return HTTP 200 after 18 attempts (~3 min).\n` +
      `The files were pushed to git but the app is NOT being served by GitHub Pages.\n` +
      `Likely cause: GitHub Pages is disabled/turned off for the "${repoName}" repo.\n` +
      `Fix: GitHub repo → Settings → Pages → Source = "Deploy from a branch" → branch "main" → /root.\n` +
      `Then re-run publish. Do NOT tell the user it's live until this passes.`
    );
  }

  log(`Successfully deployed "${targetFolder}" to both its individual repository and the central monorepo!`);
  log(`BUILD INDICATOR: installed app will show build stamp from manifest.json x-build-stamp.`);
} catch (err) {
  logError(`An error occurred during publication: ${err.message}`);
  process.exit(1);
}
