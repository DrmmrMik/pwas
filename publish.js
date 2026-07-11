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
    'fitnesstracker': 'fitness_tracker'
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

  log(`Successfully deployed "${targetFolder}" to both its individual repository and the central monorepo!`);
} catch (err) {
  logError(`An error occurred during publication: ${err.message}`);
  process.exit(1);
}
