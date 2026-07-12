// ==========================================
// AuraFit - Core Application & Routing Logic
// ==========================================

// Register Service Worker for offline PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (window.location.protocol === 'https:' || 
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1') {
      navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('[PWA] Service Worker registered scope:', reg.scope))
        .catch(err => console.error('[PWA] Service Worker registration failed:', err));
    }
  });
}

// PWA Install Prompt Logic
let deferredPrompt = null;
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

function updateInstallUI() {
  const sidebarBtn = document.getElementById('btn-sidebar-install');
  const headerBtn = document.getElementById('btn-header-install');
  const settingsBtn = document.getElementById('btn-settings-install');
  const statusText = document.getElementById('pwa-status-text');

  if (isStandalone) {
    if (sidebarBtn) sidebarBtn.classList.add('hidden');
    if (headerBtn) headerBtn.classList.add('hidden');
    if (settingsBtn) {
      settingsBtn.disabled = true;
      settingsBtn.innerHTML = '<i data-lucide="check"></i> Already Installed';
    }
    if (statusText) statusText.innerText = "AuraFit is already installed and running as a standalone app.";
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  if (window.location.protocol === 'file:') {
    if (sidebarBtn) sidebarBtn.classList.add('hidden');
    if (headerBtn) headerBtn.classList.add('hidden');
    if (settingsBtn) {
      settingsBtn.disabled = true;
      settingsBtn.innerHTML = '<i data-lucide="x-circle"></i> Local File Mode';
    }
    if (statusText) {
      statusText.innerHTML = "PWA installation is disabled over the local file protocol (<code>file://</code>). To install AuraFit, please run it using a local web server (e.g. <code>localhost</code>).";
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  if (deferredPrompt) {
    if (sidebarBtn) sidebarBtn.classList.remove('hidden');
    if (headerBtn) headerBtn.classList.remove('hidden');
    if (settingsBtn) {
      settingsBtn.disabled = false;
      settingsBtn.innerHTML = '<i data-lucide="download"></i> Install Application';
    }
    if (statusText) statusText.innerText = "AuraFit is ready to install! Install it for full screen mode and easy launch.";
  } else {
    if (sidebarBtn) sidebarBtn.classList.add('hidden');
    if (headerBtn) headerBtn.classList.add('hidden');
    if (settingsBtn) {
      settingsBtn.disabled = true;
      settingsBtn.innerHTML = '<i data-lucide="info"></i> Waiting for Browser';
    }
    if (isIOS) {
      if (statusText) statusText.innerHTML = "To install on iOS Safari, tap the <strong>Share</strong> button (action box) and select <strong>'Add to Home Screen'</strong>.";
    } else {
      if (statusText) statusText.innerText = "Running in browser. The install option will automatically become available once the browser validates the app manifest and service worker caching (usually requires a short interaction).";
    }
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  updateInstallUI();
});

window.addEventListener('appinstalled', (evt) => {
  console.log('[PWA] App installed');
  deferredPrompt = null;
  updateInstallUI();
});

function initPWAInstall() {
  const sidebarBtn = document.getElementById('btn-sidebar-install');
  const headerBtn = document.getElementById('btn-header-install');
  const settingsBtn = document.getElementById('btn-settings-install');

  const triggerInstall = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted the installation prompt');
      } else {
        console.log('[PWA] User dismissed the installation prompt');
      }
      deferredPrompt = null;
      updateInstallUI();
    });
  };

  if (sidebarBtn) sidebarBtn.addEventListener('click', triggerInstall);
  if (headerBtn) headerBtn.addEventListener('click', triggerInstall);
  if (settingsBtn) settingsBtn.addEventListener('click', triggerInstall);

  updateInstallUI();
}


// Global state container
let state = {
  bbsLogs: [],
  meditationLogs: [],
  pelotonLogs: [],
  bbsExercises: ["Chest Press", "Lat Pulldown", "Overhead Press", "Seated Row", "Leg Press"],
  cadenceUp: 5,
  cadenceDown: 5
};

// Database Key
const STORAGE_KEY = "aurafit_data_v1";

// Chart.js instances to destroy and rebuild on changes
let charts = {
  bbs: null,
  peloton: null,
  meditation: null
};

// Audio variables
let audioContext = null;

// Page Initialization
document.addEventListener("DOMContentLoaded", () => {
  checkStorageSupport();
  initDatabase();
  initRouting();
  initBBS();
  initMeditation();
  initPeloton();
  initSettings();
  initPWAInstall();
  
  // Initial render of Dashboard and Select elements
  updateDashboard();
  populateBBSSelects();
  
  // Set current date in header
  updateHeaderDate();
  
  // Initialize Lucide Icons
  lucide.createIcons();
});

// Update current date string in top header
function updateHeaderDate() {
  const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  document.getElementById("current-date-str").textContent = new Date().toLocaleDateString('en-US', options);
}

// Get local YYYY-MM-DD date string
function getLocalYYYYMMDD(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parse a "YYYY-MM-DD" string into a Date object representing midnight in local time
function parseLocalYYYYMMDD(dateStr) {
  const parts = dateStr.split('-');
  return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
}

// ==========================================
// 1. DATABASE CONTROLLER & STORAGE PERSISTENCE
// ==========================================

// --- 1A. INDEXEDDB HELPERS ---
const DB_NAME = "aurafit_db";
const DB_VERSION = 1;
const STORE_NAME = "state_store";
const STATE_ID = "current_state";

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB not supported by browser."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

function getIndexedDBData() {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(STATE_ID);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  });
}

function saveToIndexedDB(data) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, STATE_ID);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  });
}

// --- 1B. CORE STORAGE LIFE-CYCLE ---
function initDatabase() {
  // 1. Synchronously load from LocalStorage for instantaneous UI rendering
  let localState = null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      localState = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error reading from LocalStorage:", e);
  }

  if (localState) {
    applyState(localState);
  }

  // 2. Asynchronously load and sync with IndexedDB (backup storage layer)
  if (window.indexedDB) {
    getIndexedDBData().then(dbState => {
      if (dbState) {
        // Compare timestamps to find the most recent state
        const localTime = localState && localState.updatedAt ? new Date(localState.updatedAt).getTime() : 0;
        const dbTime = dbState.updatedAt ? new Date(dbState.updatedAt).getTime() : 0;
        
        // As a fallback, check the total number of records
        const localCount = localState ? 
          (localState.bbsLogs?.length || 0) + (localState.meditationLogs?.length || 0) + (localState.pelotonLogs?.length || 0) : 0;
        const dbCount = 
          (dbState.bbsLogs?.length || 0) + (dbState.meditationLogs?.length || 0) + (dbState.pelotonLogs?.length || 0);

        if (dbTime > localTime || (dbTime === localTime && dbCount > localCount) || (!localState && dbCount > 0)) {
          console.log("IndexedDB contains newer/more complete data. Restoring into LocalStorage.");
          applyState(dbState);
          // Sync LocalStorage
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          } catch (e) {
            console.error("LocalStorage write failed during sync:", e);
          }
          // Re-render UI views with restored data
          refreshAllViews();
        } else if (localState && (localTime > dbTime || localCount > dbCount)) {
          console.log("LocalStorage contains newer data. Syncing IndexedDB database.");
          saveToIndexedDB(state).catch(e => console.error("IndexedDB write failed during sync:", e));
        }
      } else if (localState) {
        // IndexedDB is empty but LocalStorage has records, sync to IndexedDB
        console.log("IndexedDB is empty. Seeding from LocalStorage.");
        saveToIndexedDB(state).catch(e => console.error("IndexedDB seeding failed:", e));
      } else {
        // First run on device - initialize with demo/historical logs
        console.log("First launch on this device. Seeding initial historical logs.");
        seedAppSheetData(true);
      }
    }).catch(err => {
      console.error("Error checking IndexedDB:", err);
      // Fallback: if localStorage is empty and IndexedDB errors out, seed to allow app to work
      if (!localState) {
        seedAppSheetData(true);
      }
    });
  } else {
    // IndexedDB unsupported - seed if local storage is blank
    if (!localState) {
      seedAppSheetData(true);
    }
  }

  // Request browser storage persistence to prevent auto-eviction
  requestDurableStorage();
}

function saveToStorage() {
  state.updatedAt = new Date().toISOString();
  
  // Write to LocalStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save to LocalStorage:", e);
  }
  
  // Write to IndexedDB
  if (window.indexedDB) {
    saveToIndexedDB(state).catch(err => {
      console.error("Failed to save to IndexedDB:", err);
    });
  }
}

function applyState(parsed) {
  state.bbsLogs = parsed.bbsLogs || [];
  state.meditationLogs = parsed.meditationLogs || [];
  state.pelotonLogs = parsed.pelotonLogs || [];
  state.bbsExercises = parsed.bbsExercises || ["Chest Press", "Lat Pulldown", "Overhead Press", "Seated Row", "Leg Press"];
  state.cadenceUp = parsed.cadenceUp !== undefined ? parsed.cadenceUp : 5;
  state.cadenceDown = parsed.cadenceDown !== undefined ? parsed.cadenceDown : 5;
  state.updatedAt = parsed.updatedAt || new Date().toISOString();
}

function refreshAllViews() {
  updateDashboard();
  populateBBSSelects();
  
  // Re-render whichever tab is currently active to reflect synchronized state
  const activeTab = document.querySelector(".nav-item.active, .bottom-nav-item.active");
  if (activeTab) {
    const tabId = activeTab.getAttribute("data-tab");
    switch(tabId) {
      case "dashboard":
        updateDashboard();
        break;
      case "bbs":
        updateBBSPage();
        break;
      case "meditation":
        updateMeditationPage();
        break;
      case "peloton":
        updatePelotonPage();
        break;
      case "analytics":
        renderSelectedChart();
        break;
      case "settings":
        renderBBSExercisesSettings();
        break;
    }
  }
  lucide.createIcons();
}

// --- 1C. PERSISTENCE PERSIST REQUESTS & CHECKS ---
function requestDurableStorage() {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().then(persistent => {
      if (persistent) {
        console.log("Durable storage granted. Browser will protect this data from eviction.");
      } else {
        console.warn("Durable storage denied. Storage may be cleared by browser in low memory environments.");
      }
    }).catch(err => {
      console.error("Failed to request persistent storage:", err);
    });
  }
}

function checkStorageSupport() {
  let localStorageSupported = false;
  try {
    localStorage.setItem("___test___", "1");
    localStorage.removeItem("___test___");
    localStorageSupported = true;
  } catch (e) {
    localStorageSupported = false;
  }

  if (!localStorageSupported) {
    showStorageWarning();
  }
}

function showStorageWarning() {
  if (document.getElementById("storage-warning-banner")) return;

  const banner = document.createElement("div");
  banner.id = "storage-warning-banner";
  banner.style.cssText = `
    background-color: #7f1d1d;
    color: #fca5a5;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 500;
    text-align: center;
    border-bottom: 1px solid #b91c1c;
    position: sticky;
    top: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  `;
  
  banner.innerHTML = `
    <span style="font-size: 16px;">⚠️</span>
    <span>
      <strong>Storage Warning:</strong> Browser storage is disabled/blocked in this context. 
      Your logs will be lost when you close this page. Please use the 
      <a href="#settings" onclick="document.querySelector('[data-tab=settings]').click()" style="color: #ffffff; text-decoration: underline; font-weight: 600;">Export Data</a> 
      button in Settings to backup your logs before leaving, or run this app from an HTTPS server.
    </span>
  `;
  
  document.body.insertBefore(banner, document.body.firstChild);
}

// ==========================================
// 2. ROUTING & TAB NAVIGATION
// ==========================================
function initRouting() {
  const navItems = document.querySelectorAll(".nav-item, .bottom-nav-item");
  const tabPanes = document.querySelectorAll(".tab-pane");

  function switchTab(tabId) {
    // Deactivate all nav links
    document.querySelectorAll(".nav-item, .bottom-nav-item").forEach(item => {
      if (item.getAttribute("data-tab") === tabId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Toggle panes
    tabPanes.forEach(pane => {
      if (pane.id === `tab-${tabId}`) {
        pane.classList.add("active");
      } else {
        pane.classList.remove("active");
      }
    });

    // Update Header title
    const headerTitle = document.getElementById("page-title");
    const headerSub = document.getElementById("page-subtitle");
    
    switch(tabId) {
      case "dashboard":
        headerTitle.textContent = "Dashboard";
        headerSub.textContent = "Welcome back. Here is your daily fitness & mind overview.";
        updateDashboard();
        break;
      case "bbs":
        headerTitle.textContent = "Body By Science Weights";
        headerSub.textContent = "Track Time Under Load (TUL) and trigger progressive overload.";
        updateBBSPage();
        break;
      case "meditation":
        headerTitle.textContent = "Mindfulness Space";
        headerSub.textContent = "Enter deep focus. Tap a timer or run custom box breathing.";
        updateMeditationPage();
        break;
      case "peloton":
        headerTitle.textContent = "Peloton Metrics";
        headerSub.textContent = "Log your ride/class metrics and track your personal records.";
        updatePelotonPage();
        break;
      case "analytics":
        headerTitle.textContent = "Quantified Progress";
        headerSub.textContent = "Visual analytics of strength, conditioning, and consistency trends.";
        // Trigger default chart render
        renderSelectedChart();
        break;
      case "settings":
        headerTitle.textContent = "System Settings";
        headerSub.textContent = "Import/export data, reset system records, or load simulation logs.";
        renderBBSExercisesSettings();
        document.getElementById("settings-cadence-up").value = state.cadenceUp !== undefined ? state.cadenceUp : 5;
        document.getElementById("settings-cadence-down").value = state.cadenceDown !== undefined ? state.cadenceDown : 5;
        break;
    }
    
    // Refresh Icons on dynamic DOM load
    lucide.createIcons();
  }

  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const tabId = item.getAttribute("data-tab");
      window.location.hash = tabId;
    });
  });

  window.addEventListener("hashchange", () => {
    const tabId = window.location.hash.replace("#", "") || "dashboard";
    const exists = document.getElementById(`tab-${tabId}`);
    if (exists) {
      switchTab(tabId);
    }
  });

  // Handle initial url hash
  const initialTab = window.location.hash.replace("#", "") || "dashboard";
  const exists = document.getElementById(`tab-${initialTab}`);
  if (exists) {
    switchTab(initialTab);
  } else {
    switchTab("dashboard");
  }
}

// ==========================================
// 3. DASHBOARD LOGIC & RECOMMENDATIONS
// ==========================================
function updateDashboard() {
  // 1. Calculate BBS Last Lift Info
  const bbsLast = document.getElementById("dash-bbs-last-lift");
  const bbsSub = document.getElementById("dash-bbs-subtext");
  if (state.bbsLogs.length > 0) {
    // Sort logs descending by date
    const sortedBbs = [...state.bbsLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastWorkoutDate = parseLocalYYYYMMDD(sortedBbs[0].date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today - lastWorkoutDate) / (1000 * 60 * 60 * 24));
    
    bbsLast.textContent = sortedBbs[0].date;
    bbsSub.textContent = `${diffDays === 0 ? "Today" : diffDays === 1 ? "Yesterday" : diffDays + " days ago"}: ${sortedBbs[0].exercise} (${sortedBbs[0].weight} lbs)`;
  } else {
    bbsLast.textContent = "-";
    bbsSub.textContent = "No lifting sessions recorded";
  }

  // 2. Calculate Meditation Streak & Total Time
  const medStreak = document.getElementById("dash-meditation-streak");
  const medSub = document.getElementById("dash-meditation-subtext");
  if (state.meditationLogs.length > 0) {
    const sortedMed = [...state.meditationLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Total Duration
    const totalMinutes = state.meditationLogs.reduce((sum, item) => sum + parseInt(item.duration), 0);
    medSub.textContent = `${totalMinutes} total minutes logged`;

    // Streak calculation
    let streak = 0;
    let checkDate = new Date();
    checkDate.setHours(0,0,0,0);
    
    // Extract dates and remove time component
    const loggedDates = new Set(state.meditationLogs.map(item => {
      const d = parseLocalYYYYMMDD(item.date);
      return d.getTime();
    }));

    // If today wasn't logged, check if yesterday was logged to maintain streak
    if (!loggedDates.has(checkDate.getTime())) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (loggedDates.has(checkDate.getTime())) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    medStreak.textContent = `${streak} ${streak === 1 ? 'day' : 'days'}`;
  } else {
    medStreak.textContent = "0 days";
    medSub.textContent = "0 total minutes";
  }

  // 3. Calculate Peloton Weekly Output
  const peloWeekly = document.getElementById("dash-peloton-weekly");
  const peloSub = document.getElementById("dash-dash-peloton-subtext"); // Note: DOM ID in HTML is dash-peloton-subtext
  const peloSubCorrect = document.getElementById("dash-peloton-subtext");
  
  if (state.pelotonLogs.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);
    
    const weeklyWorkouts = state.pelotonLogs.filter(log => {
      const logDate = parseLocalYYYYMMDD(log.date);
      return logDate >= oneWeekAgo;
    });
    const weeklyOutput = weeklyWorkouts.reduce((sum, log) => sum + parseFloat(log.output), 0);
    
    peloWeekly.textContent = `${weeklyOutput} kJ`;
    if (peloSubCorrect) {
      peloSubCorrect.textContent = `${weeklyWorkouts.length} classes in last 7 days`;
    }
  } else {
    peloWeekly.textContent = "0 kJ";
    if (peloSubCorrect) peloSubCorrect.textContent = "0 workouts this week";
  }

  // 4. Generate BBS progression recommendations
  const bbsRecsContainer = document.getElementById("bbs-recs-list");
  bbsRecsContainer.innerHTML = "";
  
  if (state.bbsExercises.length === 0) {
    bbsRecsContainer.innerHTML = `
      <div class="empty-state-mini">No exercises configured. Head to Settings.</div>
    `;
  } else {
    state.bbsExercises.forEach(exercise => {
      const rec = getBBSRecommendation(exercise);
      const card = document.createElement("div");
      card.className = `rec-card ${rec.class}`;
      
      let iconName = "arrow-up-circle";
      if (rec.type === "maintain") iconName = "refresh-cw";
      if (rec.type === "downgrade") iconName = "arrow-down-circle";
      
      card.innerHTML = `
        <div class="rec-card-info">
          <div class="rec-card-icon">
            <i data-lucide="${iconName}"></i>
          </div>
          <div>
            <div class="rec-card-title">${exercise}</div>
            <div class="rec-card-detail">${rec.desc}</div>
          </div>
        </div>
        <div class="rec-card-action">
          <div class="rec-action-value">${rec.nextWeight} lbs</div>
          <div class="rec-action-label">Target Weight</div>
        </div>
      `;
      bbsRecsContainer.appendChild(card);
    });
  }

  // 5. Populate Dashboard Peloton PR summary
  const peloPRContainer = document.getElementById("dash-peloton-prs");
  peloPRContainer.innerHTML = "";
  const durations = [15, 20, 30, 45];
  let hasPRs = false;
  
  durations.forEach(dur => {
    const pr = getPelotonPR(dur);
    if (pr) {
      hasPRs = true;
      const row = document.createElement("div");
      row.className = "pr-row";
      row.innerHTML = `
        <span class="pr-duration">${dur} min ride</span>
        <span class="pr-val">${pr.output} kJ <span class="text-secondary text-sm">(${pr.instructor})</span></span>
      `;
      peloPRContainer.appendChild(row);
    }
  });
  
  if (!hasPRs) {
    peloPRContainer.innerHTML = `<div class="empty-state-mini">No class logs to compute PR records.</div>`;
  }

  // Hook dashboard CTA button
  const startMedBtn = document.getElementById("btn-dash-start-meditation");
  if (startMedBtn) {
    // Remove previous listeners
    const clone = startMedBtn.cloneNode(true);
    startMedBtn.parentNode.replaceChild(clone, startMedBtn);
    clone.addEventListener("click", () => {
      window.location.hash = "meditation";
      document.querySelector('[data-tab="meditation"]').click();
    });
  }
}

// Progression Algorithm for Body By Science
function getBBSRecommendation(exercise) {
  const logs = state.bbsLogs.filter(log => log.exercise === exercise);
  if (logs.length === 0) {
    return {
      type: "new",
      class: "bbs-maintain",
      nextWeight: 100, // Default starting weight recommendation
      desc: "No workouts logged. Let's start with a comfortable weight and target 80-120s TUL.",
      targetTUL: "80-120s"
    };
  }

  // Sort logs by date to get the most recent one
  const sorted = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));
  const last = sorted[0];
  const lastWeight = parseFloat(last.weight);
  const lastTUL = parseFloat(last.tul);
  
  if (lastTUL > 120) {
    // Exceeded target TUL -> Increase weight by 5% (rounded to nearest 2.5 lbs)
    let nextWeight = Math.round((lastWeight * 1.05) / 2.5) * 2.5;
    if (nextWeight === lastWeight) nextWeight += 2.5; // Ensure it increases
    return {
      type: "upgrade",
      class: "bbs-upgrade",
      nextWeight: nextWeight,
      desc: `Last: ${lastWeight} lbs for ${lastTUL}s. Overload achieved! Weight increased +5%.`,
      targetTUL: "80-120s"
    };
  } else if (lastTUL < 80) {
    // Under minimum TUL -> Weight was too heavy, lower it by 5%
    let nextWeight = Math.round((lastWeight * 0.95) / 2.5) * 2.5;
    if (nextWeight === lastWeight && nextWeight > 2.5) nextWeight -= 2.5; // Ensure it decreases
    return {
      type: "downgrade",
      class: "bbs-downgrade",
      nextWeight: nextWeight,
      desc: `Last: ${lastWeight} lbs for ${lastTUL}s. Failed under 80s. Lower weight to match target range.`,
      targetTUL: "80-120s"
    };
  } else {
    // Inside the target zone -> Maintain weight and beat the previous time
    return {
      type: "maintain",
      class: "bbs-maintain",
      nextWeight: lastWeight,
      desc: `Last: ${lastWeight} lbs for ${lastTUL}s. Keep weight, target progression to ${Math.floor(lastTUL + 1)}+ seconds.`,
      targetTUL: `${Math.ceil(lastTUL + 1)}-120s`
    };
  }
}

// Compute Personal Record for Peloton
function getPelotonPR(duration) {
  const logs = state.pelotonLogs.filter(log => parseInt(log.duration) === duration && log.output);
  if (logs.length === 0) return null;
  
  const sortedByOutput = [...logs].sort((a, b) => parseFloat(b.output) - parseFloat(a.output));
  return sortedByOutput[0];
}

// ==========================================
// 4. BODY BY SCIENCE (BBS) TIMER & FORMS
// ==========================================
let timerInterval = null;
let timerStartMs = null;
let timerElapsedMs = 0;
let isTimerRunning = false;
let concentricPhase = true; // Concentric vs Eccentric state
let phaseElapsedMs = 0;

let wakeLock = null;

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Screen Wake Lock acquired.');
    }
  } catch (err) {
    console.warn(`Wake Lock failed: ${err.name}, ${err.message}`);
  }
}

function releaseWakeLock() {
  if (wakeLock !== null) {
    wakeLock.release().then(() => {
      wakeLock = null;
      console.log('Screen Wake Lock released.');
    });
  }
}

function initBBS() {
  const select = document.getElementById("bbs-exercise-select");
  const saveBtn = document.getElementById("btn-bbs-log-save");
  const timerToggle = document.getElementById("btn-bbs-timer-toggle");
  const timerReset = document.getElementById("btn-bbs-timer-reset");
  const addCustomBtn = document.getElementById("btn-bbs-add-custom");

  // Choose exercise changes targets and weight inputs
  select.addEventListener("change", () => {
    updateBBSTargets();
  });

  // Start / Stop Timer
  timerToggle.addEventListener("click", () => {
    if (isTimerRunning) {
      stopBBSTimer();
    } else {
      startBBSTimer();
    }
  });

  // Reset Timer
  timerReset.addEventListener("click", () => {
    resetBBSTimer();
  });

  // Save log
  saveBtn.addEventListener("click", () => {
    saveBBSLog();
  });

  // Setup modals for custom exercise creation
  addCustomBtn.addEventListener("click", () => {
    openModal("custom-exercise-modal");
  });
  
  initCustomExerciseModal();

  // Handle mobile screen locks and visibility switches (e.g. Spotify background switching)
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible") {
      if (isTimerRunning) {
        // Re-acquire screen wake lock since browser drops it in background
        await requestWakeLock();
        
        // Force immediate recalculation of elapsed time based on wall clock (resilient to sleep/throttling)
        const now = Date.now();
        timerElapsedMs = now - timerStartMs;
        const elapsedSeconds = timerElapsedMs / 1000;
        document.getElementById("bbs-timer-val").textContent = elapsedSeconds.toFixed(1);
        document.getElementById("bbs-log-tul").value = elapsedSeconds.toFixed(1);
      }
    }
  });
}

function updateBBSPage() {
  populateBBSSelects();
  updateBBSTargets();
  renderBBSTable();
}

function populateBBSSelects() {
  const select = document.getElementById("bbs-exercise-select");
  const chartSelect = document.getElementById("chart-bbs-exercise");
  
  const currentSelectVal = select.value;
  const currentChartVal = chartSelect ? chartSelect.value : "";
  
  select.innerHTML = "";
  if (chartSelect) chartSelect.innerHTML = "";
  
  state.bbsExercises.forEach(ex => {
    const opt = document.createElement("option");
    opt.value = ex;
    opt.textContent = ex;
    select.appendChild(opt);
    
    if (chartSelect) {
      const optChart = document.createElement("option");
      optChart.value = ex;
      optChart.textContent = ex;
      chartSelect.appendChild(optChart);
    }
  });
  
  // Restore selections
  if (state.bbsExercises.includes(currentSelectVal)) {
    select.value = currentSelectVal;
  }
  if (chartSelect && state.bbsExercises.includes(currentChartVal)) {
    chartSelect.value = currentChartVal;
  }
}

function updateBBSTargets() {
  const selectedEx = document.getElementById("bbs-exercise-select").value;
  if (!selectedEx) return;

  const rec = getBBSRecommendation(selectedEx);
  
  document.getElementById("bbs-timer-rec-weight").textContent = `Target: ${rec.nextWeight} lbs`;
  document.getElementById("bbs-timer-rec-tul").textContent = `Target TUL: ${rec.targetTUL}`;
  
  // Fill the input forms automatically
  document.getElementById("bbs-log-weight").value = rec.nextWeight;
  
  // Fill recommendation text
  document.getElementById("bbs-cadence-text").textContent = "Ready to start";
  document.getElementById("bbs-cadence-text").style.color = "var(--accent-cyan)";
}

// Audio synthesizer for gym pacing ticks using Web Audio API
function playClick(pitch = 500, dur = 0.05) {
  if (!document.getElementById("chk-bbs-sound").checked) return;
  
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume context if suspended (browser security autoplays)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.type = 'triangle'; // softer click sound
    osc.frequency.value = pitch;
    
    gain.gain.setValueAtTime(0.06, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + dur);
    
    osc.start();
    osc.stop(audioContext.currentTime + dur);
  } catch (e) {
    console.error("Audio trigger failed", e);
  }
}

function startBBSTimer() {
  if (isTimerRunning) return;
  
  isTimerRunning = true;
  timerStartMs = Date.now() - timerElapsedMs;
  concentricPhase = true;
  
  // Request screen wake lock
  requestWakeLock();
  
  // Update Buttons
  document.getElementById("bbs-timer-btn-text").textContent = "Stop TUL Timer";
  const timerIcon = document.getElementById("bbs-timer-icon");
  timerIcon.setAttribute("data-lucide", "square");
  lucide.createIcons();
  
  document.getElementById("btn-bbs-timer-toggle").className = "btn-timer btn-timer-stop";
  document.getElementById("btn-bbs-timer-reset").disabled = true;
  
  let lastSecondMark = 0;
  
  timerInterval = setInterval(() => {
    const now = Date.now();
    timerElapsedMs = now - timerStartMs;
    const elapsedSeconds = timerElapsedMs / 1000;
    
    // Display updates
    document.getElementById("bbs-timer-val").textContent = elapsedSeconds.toFixed(1);
    
    // Auto populate TUL input
    document.getElementById("bbs-log-tul").value = elapsedSeconds.toFixed(1);
    
    // Pacing Calculations using settings
    const visualizerEnabled = document.getElementById("chk-bbs-cadence").checked;
    
    if (visualizerEnabled) {
      const cadenceUp = state.cadenceUp !== undefined ? state.cadenceUp : 5;
      const cadenceDown = state.cadenceDown !== undefined ? state.cadenceDown : 5;
      const upMs = cadenceUp * 1000;
      const downMs = cadenceDown * 1000;
      const totalMs = upMs + downMs;
      const cycleMs = timerElapsedMs % totalMs;
      const ring = document.querySelector(".timer-progress-ring");
      const cadenceLabel = document.getElementById("bbs-cadence-text");
      
      let percent;
      if (cycleMs < upMs) {
        // Concentric Phase (0 to upMs)
        concentricPhase = true;
        percent = (cycleMs / upMs) * 100;
        
        ring.style.setProperty("--pacing-percent", `${percent}%`);
        ring.style.setProperty("--pacing-color", "var(--accent-cyan)");
        
        cadenceLabel.textContent = "PUSH / PULL (Concentric)";
        cadenceLabel.style.color = "var(--accent-cyan)";
      } else {
        // Eccentric Phase (upMs to totalMs)
        concentricPhase = false;
        percent = 100 - ((cycleMs - upMs) / downMs) * 100;
        
        ring.style.setProperty("--pacing-percent", `${percent}%`);
        ring.style.setProperty("--pacing-color", "var(--accent-emerald)");
        
        cadenceLabel.textContent = "LOWER / RETURN (Eccentric)";
        cadenceLabel.style.color = "var(--accent-emerald)";
      }
      
      // Sound Ticks logic:
      const currentSec = Math.floor(elapsedSeconds);
      if (currentSec > lastSecondMark) {
        lastSecondMark = currentSec;
        // Play distinct high/low pitches on phase changes
        const cycleSec = currentSec % (cadenceUp + cadenceDown);
        if (cycleSec === 0 || cycleSec === cadenceUp) {
          playClick(800, 0.15); // Higher pitch for phase switch
        } else {
          playClick(440, 0.04); // Regular tick
        }
      }
    } else {
      // If pacing disabled, reset bar styles
      const ring = document.querySelector(".timer-progress-ring");
      ring.style.setProperty("--pacing-percent", "0%");
      document.getElementById("bbs-cadence-text").textContent = "Lifting under load";
    }
  }, 50);
}

function stopBBSTimer() {
  if (!isTimerRunning) return;
  
  isTimerRunning = false;
  clearInterval(timerInterval);
  
  // Release screen wake lock
  releaseWakeLock();
  
  // Update Buttons
  document.getElementById("bbs-timer-btn-text").textContent = "Start TUL Timer";
  const timerIcon = document.getElementById("bbs-timer-icon");
  timerIcon.setAttribute("data-lucide", "play");
  lucide.createIcons();
  
  document.getElementById("btn-bbs-timer-toggle").className = "btn-timer btn-timer-start";
  document.getElementById("btn-bbs-timer-reset").disabled = false;
  
  // Final chime beep
  playClick(600, 0.25);
}

function resetBBSTimer() {
  stopBBSTimer();
  timerElapsedMs = 0;
  // Ensure wake lock is released
  releaseWakeLock();
  
  document.getElementById("bbs-timer-val").textContent = "00.0";
  document.getElementById("bbs-log-tul").value = "";
  document.getElementById("btn-bbs-timer-reset").disabled = true;
  
  const ring = document.querySelector(".timer-progress-ring");
  ring.style.setProperty("--pacing-percent", "0%");
  document.getElementById("bbs-cadence-text").textContent = "Ready to start";
  document.getElementById("bbs-cadence-text").style.color = "var(--accent-cyan)";
}

function saveBBSLog() {
  const exercise = document.getElementById("bbs-exercise-select").value;
  const weight = parseFloat(document.getElementById("bbs-log-weight").value);
  const tul = parseFloat(document.getElementById("bbs-log-tul").value);
  const reps = parseInt(document.getElementById("bbs-log-reps").value) || null;
  const feeling = document.getElementById("bbs-log-feeling").value || null;
  const notes = document.getElementById("bbs-log-notes").value.trim() || null;
  
  if (!exercise || isNaN(weight) || isNaN(tul) || weight <= 0 || tul <= 0) {
    alert("Please enter a valid weight and Time Under Load duration.");
    return;
  }
  
  const dateStr = getLocalYYYYMMDD();
  
  // Apply progression insight description so it saves inside log
  const rec = getBBSRecommendation(exercise);
  
  const newLog = {
    id: "bbs_" + Date.now(),
    date: dateStr,
    exercise,
    weight,
    tul,
    reps,
    feeling,
    notes,
    recommendation: rec.desc
  };
  
  state.bbsLogs.push(newLog);
  saveToStorage();
  
  // Reset timer
  resetBBSTimer();
  
  // Clear inputs
  document.getElementById("bbs-log-reps").value = "";
  document.getElementById("bbs-log-feeling").value = "";
  document.getElementById("bbs-log-notes").value = "";
  
  // Update view
  updateBBSPage();
  
  // Flash Success
  alert(`Lifting set saved! TUL: ${tul}s at ${weight} lbs.`);
}

function deleteBBSLog(id) {
  if (confirm("Are you sure you want to delete this weightlifting log?")) {
    state.bbsLogs = state.bbsLogs.filter(log => log.id !== id);
    saveToStorage();
    renderBBSTable();
  }
}

function renderBBSTable() {
  const tbody = document.getElementById("bbs-history-tbody");
  tbody.innerHTML = "";
  
  if (state.bbsLogs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-secondary">No lifts recorded yet. Run a session above!</td>
      </tr>
    `;
    return;
  }
  
  // Sort reverse chronological
  const sorted = [...state.bbsLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  sorted.forEach(log => {
    const repsStr = log.reps ? ` (${log.reps} reps)` : '';
    const feelingStr = log.feeling ? ` ${log.feeling}` : '';
    const notesStr = log.notes ? `<br><span class="text-muted" style="font-size:0.75rem;">📝 ${log.notes}</span>` : '';
    
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${log.date}</td>
      <td><strong>${log.exercise}</strong>${feelingStr}</td>
      <td>${log.weight} lbs</td>
      <td>${log.tul}s${repsStr}</td>
      <td>
        <span class="text-secondary text-sm">${log.recommendation || '-'}</span>
        ${notesStr}
      </td>
      <td class="text-center">
        <button class="btn-delete-row" onclick="deleteBBSLog('${log.id}')">
          <i data-lucide="trash-2"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  lucide.createIcons();
}

// Modal helper controls
function openModal(id) {
  document.getElementById(id).classList.add("active");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("active");
}

function initCustomExerciseModal() {
  const cancel = document.getElementById("btn-close-modal-cancel");
  const closeX = document.getElementById("btn-close-modal-x");
  const save = document.getElementById("btn-close-modal-save");
  
  const closeAll = () => closeModal("custom-exercise-modal");
  
  cancel.addEventListener("click", closeAll);
  closeX.addEventListener("click", closeAll);
  
  save.addEventListener("click", () => {
    const input = document.getElementById("modal-exercise-name");
    const name = input.value.trim();
    
    if (name) {
      if (state.bbsExercises.includes(name)) {
        alert("This exercise already exists in the catalog.");
        return;
      }
      
      state.bbsExercises.push(name);
      saveToStorage();
      populateBBSSelects();
      updateBBSTargets();
      
      input.value = "";
      closeAll();
      alert(`"${name}" added to BBS catalog successfully.`);
    }
  });
}

// ==========================================
// 5. MEDITATION LOGIC
// ==========================================
let medTimerInterval = null;
let medSecondsTotal = 300; // Default 5 mins
let medSecondsLeft = 300;
let isMedRunning = false;
let breathingInterval = null;

function initMeditation() {
  const durationBtns = document.querySelectorAll("[data-med-duration]");
  const timerToggle = document.getElementById("btn-med-timer-toggle");
  const timerReset = document.getElementById("btn-med-timer-reset");
  const stars = document.querySelectorAll("#med-log-focus-stars .star");
  const saveBtn = document.getElementById("btn-med-log-save");

  // Duration select
  durationBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      durationBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const dur = btn.getAttribute("data-med-duration");
      stopMedTimer();
      
      if (dur === "open") {
        medSecondsTotal = 0; // Open ended counts up
        medSecondsLeft = 0;
        document.getElementById("med-timer-val").textContent = "00:00";
      } else {
        const mins = parseInt(dur);
        medSecondsTotal = mins * 60;
        medSecondsLeft = mins * 60;
        document.getElementById("med-timer-val").textContent = formatMedTime(medSecondsLeft);
      }
      
      document.getElementById("med-log-duration").value = dur === "open" ? 10 : dur;
    });
  });

  // Timer play / pause
  timerToggle.addEventListener("click", () => {
    if (isMedRunning) {
      stopMedTimer();
    } else {
      startMedTimer();
    }
  });

  // Reset
  timerReset.addEventListener("click", () => {
    resetMedTimer();
  });

  // Stars Hover/Selection
  stars.forEach(star => {
    star.addEventListener("click", () => {
      const rating = parseInt(star.getAttribute("data-rating"));
      document.getElementById("med-log-focus").value = rating;
      
      stars.forEach(s => {
        if (parseInt(s.getAttribute("data-rating")) <= rating) {
          s.classList.add("active");
        } else {
          s.classList.remove("active");
        }
      });
    });
  });

  // Save session log
  saveBtn.addEventListener("click", () => {
    saveMeditationLog();
  });
}

function updateMeditationPage() {
  renderMeditationTable();
}

function startMedTimer() {
  if (isMedRunning) return;
  isMedRunning = true;
  
  // UI States
  document.getElementById("btn-med-timer-toggle").innerHTML = `<i data-lucide="pause"></i> Pause Session`;
  document.getElementById("btn-med-timer-toggle").className = "btn btn-secondary btn-lg";
  document.getElementById("btn-med-timer-reset").disabled = true;
  lucide.createIcons();
  
  // Breathing loop class controls
  const visualizer = document.querySelector(".breath-visualizer-container");
  const guideText = document.getElementById("breath-guide-text");
  
  const runBreathingCycle = () => {
    if (!document.getElementById("chk-med-pacer").checked) {
      visualizer.className = "breath-visualizer-container";
      guideText.textContent = "Breathe naturally";
      return;
    }
    
    // Box Breathing: 4s inhale, 4s hold, 4s exhale, 4s hold (16s cycle)
    const timeInCycle = (medSecondsTotal > 0 ? (medSecondsTotal - medSecondsLeft) : Math.abs(medSecondsLeft)) % 16;
    
    if (timeInCycle < 4) {
      visualizer.className = "breath-visualizer-container inhale";
      guideText.textContent = "Inhale slowly";
    } else if (timeInCycle < 8) {
      visualizer.className = "breath-visualizer-container hold";
      guideText.textContent = "Hold breath";
    } else if (timeInCycle < 12) {
      visualizer.className = "breath-visualizer-container exhale";
      guideText.textContent = "Exhale slowly";
    } else {
      visualizer.className = "breath-visualizer-container hold";
      guideText.textContent = "Hold breath";
    }
  };
  
  runBreathingCycle(); // immediate run

  // Timer Tick Interval
  medTimerInterval = setInterval(() => {
    const isOpenEnded = medSecondsTotal === 0;
    
    if (isOpenEnded) {
      medSecondsLeft++; // Count up
      document.getElementById("med-timer-val").textContent = formatMedTime(medSecondsLeft);
    } else {
      medSecondsLeft--; // Count down
      document.getElementById("med-timer-val").textContent = formatMedTime(medSecondsLeft);
      
      if (medSecondsLeft <= 0) {
        stopMedTimer();
        playChime();
        // Set log form complete mins
        document.getElementById("med-log-duration").value = Math.ceil(medSecondsTotal / 60);
        alert("Meditation session complete! Feel the calm.");
        resetMedTimer();
        return;
      }
    }
    
    runBreathingCycle();
  }, 1000);
}

function stopMedTimer() {
  if (!isMedRunning) return;
  isMedRunning = false;
  clearInterval(medTimerInterval);
  
  // UI states
  document.getElementById("btn-med-timer-toggle").innerHTML = `<i data-lucide="play"></i> Resume Session`;
  document.getElementById("btn-med-timer-toggle").className = "btn btn-emerald btn-lg";
  document.getElementById("btn-med-timer-reset").disabled = false;
  lucide.createIcons();
  
  // Reset breathing states
  const visualizer = document.querySelector(".breath-visualizer-container");
  visualizer.className = "breath-visualizer-container";
  document.getElementById("breath-guide-text").textContent = "Breathing paused";
}

function resetMedTimer() {
  stopMedTimer();
  
  const activeBtn = document.querySelector("[data-med-duration].active");
  const dur = activeBtn ? activeBtn.getAttribute("data-med-duration") : "5";
  
  if (dur === "open") {
    medSecondsTotal = 0;
    medSecondsLeft = 0;
    document.getElementById("med-timer-val").textContent = "00:00";
  } else {
    const mins = parseInt(dur);
    medSecondsTotal = mins * 60;
    medSecondsLeft = mins * 60;
    document.getElementById("med-timer-val").textContent = formatMedTime(medSecondsLeft);
  }
  
  document.getElementById("btn-med-timer-reset").disabled = true;
  document.getElementById("btn-med-timer-toggle").innerHTML = `<i data-lucide="play"></i> Start Session`;
  lucide.createIcons();
}

function formatMedTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Relaxing completed chords via Web Audio synthesizer
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (freq, delay, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + delay + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + dur);
      
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + dur);
    };
    // Calming major arpeggio
    playTone(261.63, 0, 1.5); // C4
    playTone(329.63, 0.25, 1.5); // E4
    playTone(392.00, 0.5, 1.5); // G4
    playTone(523.25, 0.75, 2.5); // C5
  } catch (e) {
    console.error("Chime audio failed", e);
  }
}

function saveMeditationLog() {
  const duration = parseInt(document.getElementById("med-log-duration").value);
  const rating = parseInt(document.getElementById("med-log-focus").value);
  const notes = document.getElementById("med-log-notes").value.trim();
  
  if (isNaN(duration) || duration <= 0) {
    alert("Please enter a valid duration.");
    return;
  }
  
  const dateStr = getLocalYYYYMMDD();
  
  const newLog = {
    id: "med_" + Date.now(),
    date: dateStr,
    duration,
    rating,
    notes
  };
  
  state.meditationLogs.push(newLog);
  saveToStorage();
  
  // Clear inputs
  document.getElementById("med-log-notes").value = "";
  // Reset star ratings back to 3
  document.getElementById("med-log-focus").value = 3;
  document.querySelectorAll("#med-log-focus-stars .star").forEach(s => {
    const r = parseInt(s.getAttribute("data-rating"));
    if (r <= 3) s.classList.add("active");
    else s.classList.remove("active");
  });
  
  updateMeditationPage();
  alert(`Meditation logged! ${duration} mins saved.`);
}

function deleteMeditationLog(id) {
  if (confirm("Are you sure you want to delete this meditation log?")) {
    state.meditationLogs = state.meditationLogs.filter(log => log.id !== id);
    saveToStorage();
    renderMeditationTable();
  }
}

function renderMeditationTable() {
  const tbody = document.getElementById("med-history-tbody");
  tbody.innerHTML = "";
  
  if (state.meditationLogs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-secondary">No meditation logs saved yet.</td>
      </tr>
    `;
    return;
  }
  
  const sorted = [...state.meditationLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  sorted.forEach(log => {
    // build rating stars string
    let starsStr = "";
    for(let i=1; i<=5; i++) {
      starsStr += i <= log.rating ? "★" : "☆";
    }
    
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${log.date}</td>
      <td>${log.duration} mins</td>
      <td><span class="rating-display">${starsStr}</span></td>
      <td><span class="text-secondary text-sm">${log.notes || '-'}</span></td>
      <td class="text-center">
        <button class="btn-delete-row" onclick="deleteMeditationLog('${log.id}')">
          <i data-lucide="trash-2"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  lucide.createIcons();
}

// ==========================================
// 6. PELOTON LOGIC
// ==========================================
function initPeloton() {
  const form = document.getElementById("peloton-log-form");
  
  // Set default date to today
  document.getElementById("pelo-date").value = getLocalYYYYMMDD();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    savePelotonLog();
  });
}

function updatePelotonPage() {
  // Set date to today in case it was empty
  document.getElementById("pelo-date").value = getLocalYYYYMMDD();
  renderPelotonTable();
  renderPelotonFullPRGrid();
}

function savePelotonLog() {
  const classType = document.getElementById("pelo-class-type").value;
  const instructor = document.getElementById("pelo-instructor").value.trim();
  const duration = parseInt(document.getElementById("pelo-duration").value);
  const output = parseFloat(document.getElementById("pelo-output").value);
  const avgOutput = parseFloat(document.getElementById("pelo-avg-output").value) || null;
  const avgCadence = parseFloat(document.getElementById("pelo-avg-cadence").value) || null;
  const avgRes = parseFloat(document.getElementById("pelo-avg-res").value) || null;
  const date = document.getElementById("pelo-date").value;
  const notes = document.getElementById("pelo-notes").value.trim();

  if (!classType || !instructor || isNaN(duration) || isNaN(output)) {
    alert("Please fill out all required fields.");
    return;
  }

  const newLog = {
    id: "pelo_" + Date.now(),
    date,
    classType,
    instructor,
    duration,
    output,
    avgOutput,
    avgCadence,
    avgRes,
    notes
  };

  // Check if this sets a new PR
  const currentPR = getPelotonPR(duration);
  let isPR = false;
  if (!currentPR || output > parseFloat(currentPR.output)) {
    isPR = true;
  }

  state.pelotonLogs.push(newLog);
  saveToStorage();

  // Clear inputs
  document.getElementById("pelo-output").value = "";
  document.getElementById("pelo-avg-output").value = "";
  document.getElementById("pelo-avg-cadence").value = "";
  document.getElementById("pelo-avg-res").value = "";
  document.getElementById("pelo-notes").value = "";

  updatePelotonPage();

  if (isPR) {
    alert(`🏆 New PR Saved! ${output} kJ for ${duration} min class. Awesome work!`);
  } else {
    alert(`Peloton class logged! Output: ${output} kJ.`);
  }
}

function deletePelotonLog(id) {
  if (confirm("Are you sure you want to delete this Peloton log?")) {
    state.pelotonLogs = state.pelotonLogs.filter(log => log.id !== id);
    saveToStorage();
    updatePelotonPage();
  }
}

function renderPelotonFullPRGrid() {
  const grid = document.getElementById("peloton-full-pr-grid");
  grid.innerHTML = "";

  const durations = [10, 15, 20, 30, 45, 60];
  let prFound = false;

  durations.forEach(dur => {
    const pr = getPelotonPR(dur);
    if (pr) {
      prFound = true;
      const card = document.createElement("div");
      card.className = "pr-card";
      card.innerHTML = `
        <div class="pr-card-dur">${dur} min Class</div>
        <div class="pr-card-val">${pr.output} kJ</div>
        <div class="pr-card-inst">${pr.instructor}</div>
        <div class="text-secondary text-sm" style="font-size: 0.7rem; margin-top:0.25rem;">${pr.date}</div>
      `;
      grid.appendChild(card);
    }
  });

  if (!prFound) {
    grid.innerHTML = `<div class="empty-state-mini">No classes recorded yet. Log classes to populate PR blocks.</div>`;
  }
}

function renderPelotonTable() {
  const tbody = document.getElementById("pelo-history-tbody");
  tbody.innerHTML = "";

  if (state.pelotonLogs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-secondary">No classes logged yet.</td>
      </tr>
    `;
    return;
  }

  const sorted = [...state.pelotonLogs].sort((a, b) => new Date(b.date) - new Date(a.date));

  sorted.forEach(log => {
    // Format avg metrics nicely
    const metricsArr = [];
    if (log.avgOutput) metricsArr.push(`${log.avgOutput}W`);
    if (log.avgCadence) metricsArr.push(`${log.avgCadence}RPM`);
    if (log.avgRes) metricsArr.push(`${log.avgRes}%`);
    const metricsStr = metricsArr.join(" / ") || "-";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${log.date}</td>
      <td><strong>${log.classType}</strong><br><span class="text-secondary text-sm">with ${log.instructor}</span></td>
      <td>${log.duration} min</td>
      <td><span class="text-rose" style="font-weight:700;">${log.output} kJ</span></td>
      <td>${metricsStr}</td>
      <td><span class="text-secondary text-sm">${log.notes || '-'}</span></td>
      <td class="text-center">
        <button class="btn-delete-row" onclick="deletePelotonLog('${log.id}')">
          <i data-lucide="trash-2"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });

  lucide.createIcons();
}

// ==========================================
// 7. ANALYTICS & CHART CONTROLLER
// ==========================================
function renderSelectedChart() {
  const activeSubTab = document.querySelector(".analytics-tab-btn.active");
  if (!activeSubTab) return;
  
  const view = activeSubTab.getAttribute("data-chart-view");
  
  // Hide all chart containers
  document.getElementById("chart-panel-bbs").classList.add("hidden");
  document.getElementById("chart-panel-peloton").classList.add("hidden");
  document.getElementById("chart-panel-meditation").classList.add("hidden");
  
  // Show active and render
  const activePanel = document.getElementById(`chart-panel-${view}`);
  activePanel.classList.remove("hidden");
  
  if (view === "bbs") {
    renderBBSChart();
  } else if (view === "peloton") {
    renderPelotonChart();
  } else if (view === "meditation") {
    renderMeditationChart();
  }
}

// Setup sub-tabs inside Analytics page
document.querySelectorAll(".analytics-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".analytics-tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderSelectedChart();
  });
});

// Watch selector events in charts
const chartBbsEx = document.getElementById("chart-bbs-exercise");
if (chartBbsEx) {
  chartBbsEx.addEventListener("change", () => {
    renderBBSChart();
  });
}
const chartPeloDur = document.getElementById("chart-pelo-duration");
if (chartPeloDur) {
  chartPeloDur.addEventListener("change", () => {
    renderPelotonChart();
  });
}

function renderBBSChart() {
  const canvas = document.getElementById("bbsChart");
  if (!canvas) return;
  
  const exercise = document.getElementById("chart-bbs-exercise").value;
  const logs = state.bbsLogs
    .filter(log => log.exercise === exercise)
    .sort((a, b) => new Date(a.date) - new Date(b.date)); // chronological order
  
  if (charts.bbs) {
    charts.bbs.destroy();
  }
  
  if (logs.length === 0) {
    // Clear context if no logs
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  
  const dates = logs.map(l => l.date);
  const weights = logs.map(l => l.weight);
  const tuls = logs.map(l => l.tul);
  
  charts.bbs = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: dates,
      datasets: [
        {
          label: 'Time Under Load (seconds)',
          data: tuls,
          type: 'bar',
          backgroundColor: 'rgba(6, 182, 212, 0.4)',
          borderColor: 'rgba(6, 182, 212, 0.8)',
          borderWidth: 1.5,
          yAxisID: 'y1',
        },
        {
          label: 'Weight (lbs)',
          data: weights,
          type: 'line',
          backgroundColor: 'transparent',
          borderColor: '#06b6d4',
          borderWidth: 3,
          pointBackgroundColor: '#06b6d4',
          pointHoverRadius: 6,
          yAxisID: 'y',
          tension: 0.15
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' }
        },
        y: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Weight (lbs)', color: '#06b6d4' },
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' }
        },
        y1: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'TUL (sec)', color: 'rgba(6, 182, 212, 0.8)' },
          grid: { drawOnChartArea: false },
          ticks: { color: '#94a3b8' },
          min: 0,
          max: Math.max(100, Math.max(...tuls) + 10)
        }
      },
      plugins: {
        legend: { labels: { color: '#f8fafc' } }
      }
    }
  });
}

function renderPelotonChart() {
  const canvas = document.getElementById("pelotonChart");
  if (!canvas) return;
  
  const durFilter = document.getElementById("chart-pelo-duration").value;
  
  let logs = state.pelotonLogs;
  if (durFilter !== "all") {
    logs = logs.filter(l => parseInt(l.duration) === parseInt(durFilter));
  }
  
  logs = logs.sort((a, b) => new Date(a.date) - new Date(b.date)); // chronological
  
  if (charts.peloton) {
    charts.peloton.destroy();
  }
  
  if (logs.length === 0) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  
  const dates = logs.map(l => l.date);
  const outputs = logs.map(l => l.output);
  
  // Calculate PR for current filter
  let prVal = 0;
  if (durFilter !== "all") {
    const prLog = getPelotonPR(parseInt(durFilter));
    if (prLog) prVal = parseFloat(prLog.output);
  }
  
  const datasets = [
    {
      label: 'Output (kJ)',
      data: outputs,
      borderColor: '#f43f5e',
      backgroundColor: 'rgba(244, 63, 94, 0.15)',
      fill: true,
      borderWidth: 3,
      tension: 0.2,
      pointBackgroundColor: '#f43f5e',
      pointHoverRadius: 6
    }
  ];
  
  // Draw PR Reference line if duration is filtered
  if (prVal > 0) {
    datasets.push({
      label: `Personal Record (${prVal} kJ)`,
      data: Array(dates.length).fill(prVal),
      borderColor: 'rgba(244, 63, 94, 0.4)',
      borderWidth: 1.5,
      borderDash: [6, 4],
      fill: false,
      pointRadius: 0,
      pointHoverRadius: 0
    });
  }
  
  charts.peloton = new Chart(canvas, {
    type: 'line',
    data: {
      labels: dates,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' }
        },
        y: {
          title: { display: true, text: 'Total Output (kJ)', color: '#f43f5e' },
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' }
        }
      },
      plugins: {
        legend: { labels: { color: '#f8fafc' } }
      }
    }
  });
}

function renderMeditationChart() {
  const canvas = document.getElementById("meditationChart");
  if (!canvas) return;
  
  // Chronological logs
  const logs = [...state.meditationLogs].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  if (charts.meditation) {
    charts.meditation.destroy();
  }
  
  if (logs.length === 0) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  
  // Group by date to sum minutes per day
  const grouped = {};
  logs.forEach(log => {
    grouped[log.date] = (grouped[log.date] || 0) + parseInt(log.duration);
  });
  
  const dates = Object.keys(grouped).sort();
  const dailyMins = dates.map(d => grouped[d]);
  
  // Calculate cumulative minutes
  let cumulative = 0;
  const cumulativeMins = dailyMins.map(val => {
    cumulative += val;
    return cumulative;
  });
  
  charts.meditation = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: dates,
      datasets: [
        {
          label: 'Daily Session (minutes)',
          data: dailyMins,
          backgroundColor: 'rgba(16, 185, 129, 0.4)',
          borderColor: 'rgba(16, 185, 129, 0.8)',
          borderWidth: 1.5,
          yAxisID: 'y1'
        },
        {
          label: 'Total Accumulated Time (mins)',
          data: cumulativeMins,
          type: 'line',
          borderColor: '#10b981',
          backgroundColor: 'transparent',
          borderWidth: 3,
          pointBackgroundColor: '#10b981',
          pointHoverRadius: 6,
          yAxisID: 'y',
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' }
        },
        y: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Total Mind Time (mins)', color: '#10b981' },
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' }
        },
        y1: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'Daily Mins', color: 'rgba(16, 185, 129, 0.8)' },
          grid: { drawOnChartArea: false },
          ticks: { color: '#94a3b8' },
          min: 0
        }
      },
      plugins: {
        legend: { labels: { color: '#f8fafc' } }
      }
    }
  });
}

// ==========================================
// 8. SETTINGS LOGIC & BACKUP CONTROLS
// ==========================================
function initSettings() {
  const exportBtn = document.getElementById("btn-export-data");
  const fileInput = document.getElementById("import-file");
  const clearBtn = document.getElementById("btn-clear-db");
  const loadSampleBtn = document.getElementById("btn-load-sample");
  const loadAppSheetBtn = document.getElementById("btn-load-appsheet");
  
  // Custom catalog elements
  const addCatalogBtn = document.getElementById("btn-add-bbs-catalog-item");
  const saveCadenceBtn = document.getElementById("btn-save-cadence");

  exportBtn.addEventListener("click", () => {
    exportDatabaseJSON();
  });

  fileInput.addEventListener("change", (e) => {
    importDatabaseJSON(e);
  });

  clearBtn.addEventListener("click", () => {
    clearDatabase();
  });

  loadSampleBtn.addEventListener("click", () => {
    loadSampleData();
  });

  if (loadAppSheetBtn) {
    loadAppSheetBtn.addEventListener("click", () => {
      loadAppSheetHistoricalLogs();
    });
  }
  
  addCatalogBtn.addEventListener("click", () => {
    addExerciseFromSettings();
  });

  if (saveCadenceBtn) {
    saveCadenceBtn.addEventListener("click", () => {
      const upVal = parseInt(document.getElementById("settings-cadence-up").value);
      const downVal = parseInt(document.getElementById("settings-cadence-down").value);
      if (isNaN(upVal) || upVal <= 0 || isNaN(downVal) || downVal <= 0) {
        alert("Please enter valid positive numbers for Concentric and Eccentric cadence.");
        return;
      }
      state.cadenceUp = upVal;
      state.cadenceDown = downVal;
      saveToStorage();
      alert(`Cadence settings saved! Pacing is now set to ${upVal}s up and ${downVal}s down.`);
    });
  }
}

function renderBBSExercisesSettings() {
  const list = document.getElementById("bbs-exercise-custom-list");
  list.innerHTML = "";
  
  state.bbsExercises.forEach((ex, index) => {
    const item = document.createElement("li");
    item.className = "exercise-list-item";
    item.innerHTML = `
      <span class="exercise-list-item-name">${ex}</span>
      <button class="btn-remove-exercise" onclick="deleteExerciseFromSettings(${index})">
        <i data-lucide="trash-2"></i>
      </button>
    `;
    list.appendChild(item);
  });
  
  lucide.createIcons();
}

function addExerciseFromSettings() {
  const input = document.getElementById("new-bbs-exercise-name");
  const name = input.value.trim();
  
  if (name) {
    if (state.bbsExercises.includes(name)) {
      alert("This exercise is already in the list.");
      return;
    }
    state.bbsExercises.push(name);
    saveToStorage();
    renderBBSExercisesSettings();
    input.value = "";
    populateBBSSelects();
    alert(`"${name}" added successfully.`);
  }
}

function deleteExerciseFromSettings(index) {
  const exName = state.bbsExercises[index];
  if (confirm(`Are you sure you want to remove "${exName}"? Historical logs will not be deleted, but the exercise won't show in options.`)) {
    state.bbsExercises.splice(index, 1);
    saveToStorage();
    renderBBSExercisesSettings();
    populateBBSSelects();
  }
}

function exportDatabaseJSON() {
  try {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", url);
    dlAnchorElem.setAttribute("download", `aurafit_backup_${getLocalYYYYMMDD()}.json`);
    dlAnchorElem.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  } catch (e) {
    console.error("Blob export failed, falling back to data URI:", e);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href",     dataStr     );
    dlAnchorElem.setAttribute("download", `aurafit_backup_${getLocalYYYYMMDD()}.json`);
    dlAnchorElem.click();
  }
}

function importDatabaseJSON(e) {
  const files = e.target.files;
  if (files.length <= 0) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      
      // Basic validation
      if (parsed && (parsed.bbsLogs || parsed.meditationLogs || parsed.pelotonLogs)) {
        state.bbsLogs = parsed.bbsLogs || [];
        state.meditationLogs = parsed.meditationLogs || [];
        state.pelotonLogs = parsed.pelotonLogs || [];
        state.bbsExercises = parsed.bbsExercises || ["Chest Press", "Lat Pulldown", "Overhead Press", "Seated Row", "Leg Press"];
        
        saveToStorage();
        alert("Database imported and restored successfully!");
        window.location.hash = "dashboard";
        refreshAllViews();
      } else {
        alert("Invalid file format. Ensure it's a valid AuraFit backup.");
      }
    } catch (err) {
      alert("Failed to parse JSON file.");
      console.error(err);
    }
  };
  reader.readAsText(files[0]);
}

function clearDatabase() {
  if (confirm("⚠️ WARNING: This will completely delete all your meditation, weightlifting, and Peloton logs permanently. Do you wish to continue?")) {
    state = {
      bbsLogs: [],
      meditationLogs: [],
      pelotonLogs: [],
      bbsExercises: ["Chest Press", "Lat Pulldown", "Overhead Press", "Seated Row", "Leg Press"]
    };
    saveToStorage();
    alert("Database has been reset.");
    refreshAllViews();
  }
}

// ==========================================
// 9. 60-DAY PROGRESSIVE SAMPLE DATA GENERATOR
// ==========================================
function loadSampleData() {
  if (state.bbsLogs.length > 0 || state.meditationLogs.length > 0 || state.pelotonLogs.length > 0) {
    if (!confirm("This will overwrite your existing data with a 60-day demo simulation. Do you want to proceed?")) {
      return;
    }
  }

  const sampleState = {
    bbsExercises: ["Chest Press", "Lat Pulldown", "Overhead Press", "Seated Row", "Leg Press"],
    bbsLogs: [],
    meditationLogs: [],
    pelotonLogs: []
  };

  const today = new Date();
  
  // 1. Generate BBS Weightlifting logs (Once every 4-5 days, 13-14 sessions total)
  // Progressive overload increases:
  // Starts low, pushes TUL to >120s, weight goes up, TUL drops, then builds up again.
  const exercisesBase = {
    "Chest Press": { startW: 130, incr: 5 },
    "Lat Pulldown": { startW: 110, incr: 5 },
    "Overhead Press": { startW: 80, incr: 2.5 },
    "Seated Row": { startW: 120, incr: 5 },
    "Leg Press": { startW: 240, incr: 10 }
  };
  
  // Track weights and TUL states for progression modeling
  const currentWeights = { "Chest Press": 130, "Lat Pulldown": 110, "Overhead Press": 80, "Seated Row": 120, "Leg Press": 240 };
  const currentTUL = { "Chest Press": 88, "Lat Pulldown": 92, "Overhead Press": 80, "Seated Row": 90, "Leg Press": 85 };

  for (let i = 60; i >= 1; i -= 4) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = getLocalYYYYMMDD(d);
    
    sampleState.bbsExercises.forEach(ex => {
      let weight = currentWeights[ex];
      let tul = currentTUL[ex];
      
      // Simulate natural progression:
      // TUL grows by 3-7s per session
      tul += Math.floor(Math.random() * 5) + 3;
      
      let recText = "";
      if (tul > 120) {
        // Achievement trigger!
        const oldWeight = weight;
        weight += exercisesBase[ex].incr;
        currentWeights[ex] = weight;
        
        // Next time TUL resets back down due to higher weight
        currentTUL[ex] = Math.floor(Math.random() * 10) + 81; // Resets to ~81-90s
        
        recText = `Last: ${oldWeight} lbs for ${tul}s. Overload achieved! Weight increased +5%.`;
      } else {
        currentTUL[ex] = tul;
        recText = `Last: ${weight} lbs for ${tul}s. Keep weight, target progression to ${Math.floor(tul + 1)}+ seconds.`;
      }

      sampleState.bbsLogs.push({
        id: `bbs_sample_${ex}_${d.getTime()}`,
        date: dateStr,
        exercise: ex,
        weight: weight,
        tul: parseFloat(tul.toFixed(1)),
        recommendation: recText
      });
    });
  }

  // 2. Generate Meditation logs (~42 sessions out of 60 days, showing good habit consistency)
  for (let i = 60; i >= 0; i--) {
    // 70% probability of meditating
    if (Math.random() > 0.3) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = getLocalYYYYMMDD(d);
      
      // Alternate durations: 5, 10, 15, 20
      const durs = [5, 10, 10, 15, 15, 20];
      const duration = durs[Math.floor(Math.random() * durs.length)];
      
      // Qualities
      const ratings = [3, 4, 4, 4, 5];
      const rating = ratings[Math.floor(Math.random() * ratings.length)];
      
      const notesOptions = [
        "Calm and centered. Breathing was easy.",
        "Mind wandered a bit in the middle, brought it back.",
        "Deep focus, felt very relaxed.",
        "Quick session before starting work. Good pacing.",
        "Felt a bit restless today but completed the time.",
        "Wonderful release of tension in shoulders."
      ];
      const notes = notesOptions[Math.floor(Math.random() * notesOptions.length)];

      sampleState.meditationLogs.push({
        id: `med_sample_${d.getTime()}`,
        date: dateStr,
        duration: duration,
        rating: rating,
        notes: notes
      });
    }
  }

  // 3. Generate Peloton classes (~18 classes over 60 days)
  const instructors = ["Robin Arzon", "Cody Rigsby", "Alex Toussaint", "Jess King", "Emma Lovewell", "Denis Morton"];
  const rideTypes = ["PR Ride", "HIIT & Hills", "Sweat Steady", "Power Zone", "Climb Ride", "Tabata"];
  let base20mOutput = 155;
  let base30mOutput = 240;

  for (let i = 58; i >= 2; i -= 3) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = getLocalYYYYMMDD(d);
    
    // Choose duration: 20m, 30m or 45m
    const durChoice = [20, 20, 30, 30, 45][Math.floor(Math.random() * 5)];
    const inst = instructors[Math.floor(Math.random() * instructors.length)];
    const type = rideTypes[Math.floor(Math.random() * rideTypes.length)];
    
    let output = 0;
    let avgOut = 0;
    
    if (durChoice === 20) {
      base20mOutput += Math.floor(Math.random() * 3) + 1; // gradual PR growth
      output = base20mOutput;
      avgOut = Math.round((output * 1000) / 1200); // output in kJ = Avg Output in Watts * minutes * 60 / 1000
    } else if (durChoice === 30) {
      base30mOutput += Math.floor(Math.random() * 4) + 1;
      output = base30mOutput;
      avgOut = Math.round((output * 1000) / 1800);
    } else {
      output = Math.floor(Math.random() * 20) + 380;
      avgOut = Math.round((output * 1000) / 2700);
    }
    
    const avgCadence = Math.floor(Math.random() * 15) + 78; // 78-93
    const avgRes = Math.floor(Math.random() * 10) + 42; // 42-52%

    sampleState.pelotonLogs.push({
      id: `pelo_sample_${d.getTime()}`,
      date: dateStr,
      classType: "Cycling",
      instructor: inst,
      duration: durChoice,
      output: output,
      avgOutput: avgOut,
      avgCadence: avgCadence,
      avgRes: avgRes,
      notes: `${type} - felt strong, pushed hard at the final sprints!`
    });
  }

  // Save and replace
  state = sampleState;
  saveToStorage();
  
  alert("60-Day Sample Data loaded successfully! Go to the Dashboard or Analytics page to check your progression curves.");
  
  // Redirect to Dashboard and reload view
  window.location.hash = "dashboard";
  refreshAllViews();
}

function seedAppSheetData(overwrite = false) {
  const appSheetLogs = [
    {
      id: "bbs_appsheet_1",
      date: "2026-02-16",
      exercise: "Seated Row",
      weight: 130,
      reps: 6,
      tul: 40,
      feeling: "😀",
      notes: "3 holes showing on chest. Bottom on butt.",
      recommendation: "First workout logged. Weight is in the target zone (40s). Maintain 130 lbs and aim for 45-90s TUL."
    },
    {
      id: "bbs_appsheet_2",
      date: "2026-02-16",
      exercise: "Leg Press",
      weight: 260,
      reps: 6,
      tul: 42,
      feeling: "🙂",
      notes: "",
      recommendation: "First workout logged. Weight is close to target zone (42s). Maintain 260 lbs and aim for 45-90s TUL."
    },
    {
      id: "bbs_appsheet_3",
      date: "2026-02-16",
      exercise: "Chest Press",
      weight: 110,
      reps: 8,
      tul: 40,
      feeling: "😀",
      notes: "",
      recommendation: "First workout logged. Weight is in the target zone (40s). Maintain 110 lbs and aim for 45-90s TUL."
    },
    {
      id: "bbs_appsheet_4",
      date: "2026-02-16",
      exercise: "Overhead Press",
      weight: 80,
      reps: 10,
      tul: 50,
      feeling: "🙂",
      notes: "",
      recommendation: "First workout logged. Weight is in target zone (50s). Maintain 80 lbs and aim for overload."
    },
    {
      id: "bbs_appsheet_5",
      date: "2026-02-16",
      exercise: "Lat Pulldown",
      weight: 55,
      reps: 10,
      tul: 55,
      feeling: "🙂",
      notes: "",
      recommendation: "First workout logged. Weight is in target zone (55s). Maintain 55 lbs and aim for overload."
    },
    {
      id: "bbs_appsheet_6",
      date: "2026-02-21",
      exercise: "Overhead Press",
      weight: 100,
      reps: 6,
      tul: 60,
      feeling: "😐",
      notes: "",
      recommendation: "Last: 80 lbs for 50s. Overload progression applied. Weight increased to 100 lbs. Target 45-90s TUL."
    },
    {
      id: "bbs_appsheet_7",
      date: "2026-02-21",
      exercise: "Seated Row",
      weight: 170,
      reps: 6,
      tul: 48,
      feeling: "😐",
      notes: "",
      recommendation: "Last: 130 lbs for 40s. Overload progression applied. Weight increased to 170 lbs. Target 45-90s TUL."
    },
    {
      id: "bbs_appsheet_8",
      date: "2026-02-21",
      exercise: "Chest Press",
      weight: 135,
      reps: 6,
      tul: 42,
      feeling: "😐",
      notes: "",
      recommendation: "Last: 110 lbs for 40s. Overload progression applied. Weight increased to 135 lbs. Target 45-90s TUL."
    },
    {
      id: "bbs_appsheet_9",
      date: "2026-02-21",
      exercise: "Leg Press",
      weight: 280,
      reps: 4,
      tul: 33,
      feeling: "🙁",
      notes: "",
      recommendation: "Last: 260 lbs for 42s. Overload progression applied. Weight increased to 280 lbs. Failed under 45s. Lower weight to match target range."
    },
    {
      id: "bbs_appsheet_10",
      date: "2026-04-19",
      exercise: "Overhead Press",
      weight: 105,
      reps: 7,
      tul: 65,
      feeling: "🙂",
      notes: "Can do more/longer next time",
      recommendation: "Last: 100 lbs for 60s. Overload progression applied. Weight increased to 105 lbs (+5%). Target 45-90s TUL."
    },
    {
      id: "bbs_appsheet_11",
      date: "2026-04-19",
      exercise: "Chest Press",
      weight: 135,
      reps: 6,
      tul: 52,
      feeling: "😐",
      notes: "",
      recommendation: "Last: 135 lbs for 42s. Keep weight, target progression to 53+ seconds."
    },
    {
      id: "bbs_appsheet_12",
      date: "2026-04-19",
      exercise: "Seated Row",
      weight: 170,
      reps: 6,
      tul: 51,
      feeling: "😐",
      notes: "",
      recommendation: "Last: 170 lbs for 48s. Keep weight, target progression to 49+ seconds."
    },
    {
      id: "bbs_appsheet_13",
      date: "2026-04-19",
      exercise: "Leg Press",
      weight: 280,
      reps: 6,
      tul: 35,
      feeling: "😐",
      notes: "",
      recommendation: "Last: 280 lbs for 33s. Failed under 45s. Keep weight, build TUL up or slightly lower load."
    },
    {
      id: "bbs_appsheet_14",
      date: "2026-04-19",
      exercise: "Lat Pulldown",
      weight: 55,
      reps: 10,
      tul: 75,
      feeling: "😐",
      notes: "",
      recommendation: "Last: 55 lbs for 55s. Keep weight, target progression to 56+ seconds."
    }
  ];

  if (overwrite) {
    state.bbsLogs = appSheetLogs;
  } else {
    appSheetLogs.forEach(log => {
      if (!state.bbsLogs.some(item => item.id === log.id || (item.date === log.date && item.exercise === log.exercise))) {
        state.bbsLogs.push(log);
      }
    });
  }

  saveToStorage();
}

function loadAppSheetHistoricalLogs() {
  if (state.bbsLogs.length > 0) {
    if (!confirm("This will overwrite your existing weightlifting logs with your AppSheet historical data. Do you want to proceed?")) {
      return;
    }
  }
  
  seedAppSheetData(true);
  
  alert("AppSheet historical logs loaded successfully! Go to the Dashboard or BBS Lifting page to check your progression targets.");
  
  // Redirect to Dashboard and reload view
  window.location.hash = "dashboard";
  refreshAllViews();
}

// Global functions accessible from HTML elements
window.deleteBBSLog = deleteBBSLog;
window.deleteMeditationLog = deleteMeditationLog;
window.deletePelotonLog = deletePelotonLog;
window.deleteExerciseFromSettings = deleteExerciseFromSettings;
