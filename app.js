// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        console.log('[Portal] Service Worker registered successfully scope:', reg.scope);
        
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateNotification();
            }
          });
        });
      })
      .catch((err) => console.error('[Portal] Service Worker registration failed:', err));
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      window.location.reload();
      refreshing = true;
    }
  });
}

function showUpdateNotification() {
  const updateAlert = document.createElement('div');
  updateAlert.style.position = 'fixed';
  updateAlert.style.bottom = '20px';
  updateAlert.style.right = '20px';
  updateAlert.style.background = 'var(--bg-card)';
  updateAlert.style.border = '1px solid var(--neon-cyan)';
  updateAlert.style.boxShadow = '0 0 15px var(--neon-cyan-glow)';
  updateAlert.style.padding = '16px';
  updateAlert.style.borderRadius = 'var(--radius-lg)';
  updateAlert.style.zIndex = '3000';
  updateAlert.style.display = 'flex';
  updateAlert.style.alignItems = 'center';
  updateAlert.style.gap = '12px';
  
  updateAlert.innerHTML = `
    <span style="font-size: 0.85rem; font-weight:600;">Update Available!</span>
    <button id="btn-update-refresh" class="btn-install" style="height:32px; padding:0 12px;">Refresh</button>
  `;
  document.body.appendChild(updateAlert);
  
  document.getElementById('btn-update-refresh').addEventListener('click', () => {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg.waiting) {
        reg.waiting.postMessage({ action: 'skipWaiting' });
      } else {
        window.location.reload();
      }
    });
  });
}

// Connection Monitor
const offlineIndicator = document.getElementById('offline-indicator');
function updateOnlineStatus() {
  if (navigator.onLine) {
    offlineIndicator.classList.add('hidden');
  } else {
    offlineIndicator.classList.remove('hidden');
  }
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// Install Banner Flow
let deferredPrompt;
const installBtn = document.getElementById('btn-portal-install');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) {
    installBtn.classList.remove('hidden');
  }
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[Portal] Install prompt outcome: ${outcome}`);
    deferredPrompt = null;
    installBtn.classList.add('hidden');
  });
}

// Dynamic PWA Loader
const pwaGrid = document.getElementById('pwa-grid');
const searchInput = document.getElementById('search-input');
let appList = [];

// Helper to convert hex color to translucent glow
function getGlowColor(colorHex) {
  if (colorHex && colorHex.startsWith('#')) {
    if (colorHex.length === 4) {
      return colorHex + '5';
    }
    return colorHex + '59';
  }
  return 'rgba(168, 85, 247, 0.35)'; // Fallback to purple glow
}

async function loadProjects() {
  try {
    const res = await fetch('./projects.json');
    if (!res.ok) throw new Error('Could not load projects.json registry');
    const folders = await res.json();
    
    pwaGrid.innerHTML = '';
    appList = [];

    for (const folder of folders) {
      try {
        const manifestRes = await fetch(`./${folder}/manifest.json`);
        if (!manifestRes.ok) {
          // If manifest is missing, check if index.html exists to avoid showing non-existent projects
          try {
            const indexRes = await fetch(`./${folder}/index.html`);
            if (!indexRes.ok) {
              console.warn(`[Portal] Skipping "${folder}" - directory is missing or empty.`);
              continue;
            }
          } catch (e) {
            console.warn(`[Portal] Skipping "${folder}" - inaccessible.`);
            continue;
          }
          throw new Error(`Could not load manifest for ${folder}`);
        }
        const manifest = await manifestRes.json();
        
        // Resolve icon source path
        let iconUrl = 'icons/icon.svg'; // fallback
        if (manifest.icons && manifest.icons.length > 0) {
          // Try to find the 192 icon or take the first one
          const iconObj = manifest.icons.find(i => i.sizes.includes('192')) || manifest.icons[0];
          iconUrl = `./${folder}/${iconObj.src.replace(/^\//, '')}`;
        }

        const appData = {
          folder: folder,
          name: manifest.name || folder,
          shortName: manifest.short_name || folder,
          description: manifest.description || 'No description provided.',
          themeColor: manifest.theme_color || '#a855f7',
          icon: iconUrl,
          categories: manifest.categories || ['utility'],
          startUrl: `./${folder}/${(manifest.start_url || 'index.html').replace(/^\.\//, '').replace(/^\//, '')}`
        };

        appList.push(appData);
        renderCard(appData);
      } catch (err) {
        console.error(`[Portal] Skipping folder "${folder}":`, err.message);
        // Render fallback card if it exists locally but manifest failed
        const appData = {
          folder: folder,
          name: folder.charAt(0).toUpperCase() + folder.slice(1),
          shortName: folder,
          description: 'Local project (failed to parse manifest).',
          themeColor: '#64748b',
          icon: 'icons/icon.svg',
          categories: ['local'],
          startUrl: `./${folder}/index.html`
        };
        appList.push(appData);
        renderCard(appData);
      }
    }
  } catch (err) {
    console.error('[Portal] Initialization failed:', err);
    pwaGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; color: var(--neon-rose); margin-bottom: 16px;"></i>
        <p>Failed to initialize PWA registry. Please ensure projects.json exists and is valid.</p>
      </div>
    `;
  }
}

function renderCard(app) {
  const card = document.createElement('div');
  card.className = 'pwa-card';
  card.dataset.name = app.name.toLowerCase();
  card.dataset.desc = app.description.toLowerCase();
  
  // Set dynamic CSS properties for the card
  card.style.setProperty('--theme-accent', app.themeColor);
  card.style.setProperty('--theme-accent-glow', getGlowColor(app.themeColor));
  
  card.innerHTML = `
    <div class="card-header">
      <div class="app-icon-wrapper">
        <img class="app-icon" src="${app.icon}" alt="${app.name} icon" onerror="this.src='icons/icon.svg'">
      </div>
      <div class="app-title-group">
        <h2>${app.shortName}</h2>
        <span class="app-category">${app.categories[0]}</span>
      </div>
    </div>
    <p class="app-desc">${app.description}</p>
    <div class="card-actions">
      <button class="btn-open" onclick="window.location.href='${app.startUrl}'">
        <i class="fa-solid fa-rocket"></i> Open App
      </button>
      <button class="btn-secondary-card btn-info" title="Application Details">
        <i class="fa-solid fa-circle-info"></i>
      </button>
    </div>
  `;

  // Attach event listener for info button
  card.querySelector('.btn-info').addEventListener('click', (e) => {
    e.stopPropagation();
    openDetailsDrawer(app);
  });

  // Card clicking opens the app too
  card.addEventListener('click', () => {
    window.location.href = app.startUrl;
  });

  pwaGrid.appendChild(card);
}

// Drawer functionality
const drawer = document.getElementById('details-drawer');
const closeDrawerBtn = document.getElementById('btn-close-drawer');

function openDetailsDrawer(app) {
  document.getElementById('drawer-app-title').textContent = app.name;
  document.getElementById('info-folder').textContent = app.folder + '/';
  document.getElementById('info-start-url').textContent = app.startUrl;
  document.getElementById('info-theme-color').innerHTML = `<span class="tech-tag" style="color: ${app.themeColor}; background: ${app.themeColor}15">${app.themeColor}</span>`;
  document.getElementById('info-categories').textContent = app.categories.join(', ');
  document.getElementById('info-description').textContent = app.description;
  
  // Custom button to clear specific project cache
  const clearBtn = document.getElementById('btn-clear-cache');
  clearBtn.onclick = () => clearSubAppCache(app);
  
  drawer.classList.add('open');
}

function closeDetailsDrawer() {
  drawer.classList.remove('open');
}

if (closeDrawerBtn) {
  closeDrawerBtn.addEventListener('click', closeDetailsDrawer);
}

// Close drawer on clicking outside
document.addEventListener('click', (e) => {
  if (drawer.classList.contains('open') && !drawer.contains(e.target) && !e.target.closest('.btn-info')) {
    closeDetailsDrawer();
  }
});

// Clear Sub-App Cache Utility
async function clearSubAppCache(app) {
  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      let cleared = false;
      for (const key of keys) {
        // Match cache names containing project folder or identifier, ignoring hyphens/underscores
        const cleanKey = key.toLowerCase().replace(/[-_]/g, '');
        const cleanFolder = app.folder.toLowerCase().replace(/[-_]/g, '');
        if (cleanKey.includes(cleanFolder) || cleanFolder.includes(cleanKey)) {
          await caches.delete(key);
          cleared = true;
          console.log(`[Portal] Cleared cache partition: ${key}`);
        }
      }
      if (cleared) {
        alert(`Successfully cleared cache partition for ${app.shortName}.`);
        closeDetailsDrawer();
      } else {
        alert(`No separate cache partition found for ${app.shortName}. It may share the main cache or hasn't pre-cached yet.`);
      }
    } catch (err) {
      console.error('[Portal] Cache clearance failed:', err);
      alert('Failed to clear application cache.');
    }
  }
}

// Search Filter Logic
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const cards = pwaGrid.getElementsByClassName('pwa-card');
    
    Array.from(cards).forEach((card) => {
      const name = card.dataset.name;
      const desc = card.dataset.desc;
      if (name.includes(q) || desc.includes(q)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  });
}

// Load on start
loadProjects();
