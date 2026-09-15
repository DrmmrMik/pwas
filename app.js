// =========================================================================
// E-INK / E-READER COMPATIBILITY
// Single-version: auto-detect real e-ink panels (viwoods AiPaper, KOReader,
// Kindle) via standard media features and add `.eink-mode` to <html>. Also
// provides a manual header toggle and a "clear ghosting" full-repaint helper,
// all without a separate e-ink build.
// =========================================================================
const einkButton = document.getElementById('btn-eink-mode');

function isEinkDevice() {
  return (
    (window.matchMedia && (
      window.matchMedia('(monochrome)').matches ||
      window.matchMedia('(monochrome: 1)').matches ||
      window.matchMedia('(update: slow)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )) || false
  );
}

// 1) Auto-apply on a real e-ink panel (unless the user explicitly forced it off).
function applyEink() {
  document.documentElement.classList.add('eink-mode');
  try { localStorage.setItem('nova-eink', 'on'); } catch (e) {}
  if (einkButton) {
    einkButton.setAttribute('aria-pressed', 'true');
    einkButton.classList.add('active');
  }
}

function clearEink() {
  document.documentElement.classList.remove('eink-mode');
  try { localStorage.setItem('nova-eink', 'off'); } catch (e) {}
  if (einkButton) {
    einkButton.setAttribute('aria-pressed', 'false');
    einkButton.classList.remove('active');
  }
}

const storedEinkPref = (function () { try { return localStorage.getItem('nova-eink'); } catch (e) { return null; } })();

if (storedEinkPref === 'off') {
  // user turned it off - respect that (no auto-apply even on e-ink)
} else if (storedEinkPref === 'on' || isEinkDevice()) {
  applyEink();
}

// Manual toggle (works on any device).
if (einkButton) {
  einkButton.addEventListener('click', () => {
    const isOn = document.documentElement.classList.contains('eink-mode');
    if (isOn) { clearEink(); } else { applyEink(); }
  });
}

// "Clear ghosting": force a full-page repaint by flashing black then white.
// Wired to a header key (Alt+Shift+E) and exposed on window for the button.
function clearGhosting() {
  const html = document.documentElement;
  html.classList.add('eink-flash');
  window.setTimeout(() => html.classList.remove('eink-flash'), 1300);
}
window.clearGhosting = clearGhosting;
// Also re-apply e-ink styling after dynamically rendered cards so they inherit
// the monochrome border/background rules (cards are appended by loadProjects).
// (No extra work needed - the CSS class selectors cover the injected cards.)

// Service Worker registration + "New version available" update flow is handled
// in index.html (inline script) to avoid a duplicate registration and a second
// competing update banner. Do not register the SW again here.

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

// Dynamic PWA Loader & Filtering Engine
const pwaGrid = document.getElementById('pwa-grid');
const searchInput = document.getElementById('search-input');
const filterPills = document.querySelectorAll('.filter-pill[data-category]');
const einkFilterBtn = document.getElementById('btn-eink-filter');

let appList = [];
let currentCategoryFilter = 'all';
let einkFilterActive = false;

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

function normalizeCategory(rawCategories) {
  const cats = (rawCategories || []).map(c => String(c).toLowerCase());
  if (cats.includes('travel')) return 'travel';
  if (cats.includes('games') || cats.includes('game') || cats.includes('entertainment') || cats.includes('education') || cats.includes('kids')) return 'games';
  if (cats.includes('utilities') || cats.includes('utility') || cats.includes('tools') || cats.includes('fitness') || cats.includes('health') || cats.includes('lifestyle') || cats.includes('productivity')) return 'utilities';
  return 'utilities';
}

function detectIsEink(manifest, folder, name, shortName) {
  const cats = (manifest.categories || []).map(c => String(c).toLowerCase());
  if (cats.includes('e-ink') || cats.includes('eink')) return true;
  if (folder.toLowerCase().endsWith('-eink') || folder.toLowerCase().endsWith('_eink')) return true;
  if (manifest.eink === true || manifest.is_eink === true) return true;
  // Single-build apps with a runtime e-ink toggle (not a separate
  // dedicated e-ink folder) declare it this way -- see validate_pwa.py.
  if (manifest.eink_mode === 'toggle') return true;
  if ((name + ' ' + shortName).toLowerCase().includes('e-ink') || (name + ' ' + shortName).toLowerCase().includes('eink')) return true;
  return false;
}

async function fetchManifest(basePrefix, folder) {
  // Try manifest.json first
  try {
    const res = await fetch(`${basePrefix}${folder}/manifest.json`);
    if (res.ok) return await res.json();
  } catch (e) {}

  // Try manifest.webmanifest fallback
  try {
    const res = await fetch(`${basePrefix}${folder}/manifest.webmanifest`);
    if (res.ok) return await res.json();
  } catch (e) {}

  return null;
}

async function loadProjects() {
  try {
    const isSubdir = window.location.pathname.includes('/nova');
    const basePrefix = isSubdir ? '../' : './';
    const res = await fetch(`${basePrefix}projects.json`);
    if (!res.ok) throw new Error('Could not load projects.json registry');
    const folders = await res.json();
    
    pwaGrid.innerHTML = '';
    appList = [];
    const seenShortNames = new Map();

    for (const folder of folders) {
      if (isSubdir && folder === 'nova') continue;
      try {
        const manifest = await fetchManifest(basePrefix, folder);
        if (!manifest) {
          // If manifest is missing, check if index.html exists to avoid showing non-existent projects
          try {
            const indexRes = await fetch(`${basePrefix}${folder}/index.html`);
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
        
        // Resolve icon source path
        let iconUrl = isSubdir ? '../icons/icon.svg' : 'icons/icon.svg'; // fallback
        if (manifest.icons && manifest.icons.length > 0) {
          // Try to find the 192 icon or take the first one
          const iconObj = manifest.icons.find(i => i.sizes && i.sizes.includes('192')) || manifest.icons[0];
          if (iconObj && iconObj.src) {
            iconUrl = `${basePrefix}${folder}/${iconObj.src.replace(/^\//, '')}`;
          }
        }

        let rawStart = manifest.start_url || 'index.html';
        if (rawStart.startsWith(`/pwas/${folder}/`)) {
          rawStart = rawStart.slice(`/pwas/${folder}/`.length);
        } else if (rawStart.startsWith(`/${folder}/`)) {
          rawStart = rawStart.slice(`/${folder}/`.length);
        }
        rawStart = rawStart.replace(/^\.\//, '').replace(/^\//, '');
        if (!rawStart) rawStart = 'index.html';

        let name = manifest.name || folder;
        let shortName = manifest.short_name || folder;
        const isEink = detectIsEink(manifest, folder, name, shortName);
        const primaryCat = normalizeCategory(manifest.categories);

        // Title Disambiguation Guard:
        // 1. If it's an E-Ink app, ensure it has an explicit E-Ink differentiator
        if (isEink && !shortName.toLowerCase().includes('e-ink') && !shortName.toLowerCase().includes('eink')) {
          shortName = `${shortName} (E-Ink)`;
        }
        if (isEink && !name.toLowerCase().includes('e-ink') && !name.toLowerCase().includes('eink')) {
          name = `${name} (E-Ink)`;
        }

        // 2. Disambiguate against any existing title collisions in the catalog
        const lowerKey = shortName.toLowerCase();
        if (seenShortNames.has(lowerKey)) {
          console.warn(`[Portal] Duplicate title collision detected for "${shortName}". Disambiguating with folder identifier: ${folder}`);
          shortName = `${shortName} (${folder})`;
        }
        seenShortNames.set(lowerKey, folder);

        const appData = {
          folder: folder,
          name: name,
          shortName: shortName,
          description: manifest.description || 'No description provided.',
          themeColor: manifest.theme_color || '#a855f7',
          icon: iconUrl,
          categories: manifest.categories || [primaryCat],
          primaryCategory: primaryCat,
          isEink: isEink,
          startUrl: `${basePrefix}${folder}/${rawStart}`
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
          categories: ['utilities'],
          primaryCategory: 'utilities',
          isEink: folder.toLowerCase().includes('eink'),
          startUrl: `./${folder}/index.html`
        };
        appList.push(appData);
        renderCard(appData);
      }
    }

    updateFilterCounts();
    applyFilter();
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
  card.dataset.shortName = app.shortName.toLowerCase();
  card.dataset.desc = app.description.toLowerCase();
  card.dataset.category = app.primaryCategory;
  card.dataset.isEink = app.isEink ? 'true' : 'false';
  
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
        <div class="app-tags">
          <span class="app-category">${app.primaryCategory}</span>
          ${app.isEink ? '<span class="badge-eink"><i class="fa-solid fa-book-open"></i> E-Ink</span>' : ''}
        </div>
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
  const catsText = app.categories.join(', ') + (app.isEink ? ' (E-Ink Optimized)' : '');
  document.getElementById('info-categories').textContent = catsText;
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

// Filter engine: updates category counts
function updateFilterCounts() {
  const counts = {
    all: appList.length,
    travel: 0,
    games: 0,
    utilities: 0,
    eink: 0
  };

  appList.forEach(app => {
    if (app.primaryCategory in counts) {
      counts[app.primaryCategory]++;
    }
    if (app.isEink) {
      counts.eink++;
    }
  });

  const setElCount = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setElCount('count-all', counts.all);
  setElCount('count-travel', counts.travel);
  setElCount('count-games', counts.games);
  setElCount('count-utilities', counts.utilities);
  setElCount('count-eink', counts.eink);
}

// Filter engine: executes category, e-ink tag, and text search filter
function applyFilter() {
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const cards = pwaGrid.getElementsByClassName('pwa-card');
  let visibleCount = 0;

  Array.from(cards).forEach((card) => {
    const name = card.dataset.name || '';
    const shortName = card.dataset.shortName || '';
    const desc = card.dataset.desc || '';
    const cat = card.dataset.category || '';
    const isEink = card.dataset.isEink === 'true';

    const matchesCategory = currentCategoryFilter === 'all' || cat === currentCategoryFilter;
    const matchesEink = !einkFilterActive || isEink;
    const matchesSearch = !query || name.includes(query) || shortName.includes(query) || desc.includes(query);

    if (matchesCategory && matchesEink && matchesSearch) {
      card.style.display = 'flex';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  // Handle empty search / filter state
  let emptyNotice = document.getElementById('pwa-empty-notice');
  if (visibleCount === 0) {
    if (!emptyNotice) {
      emptyNotice = document.createElement('div');
      emptyNotice.id = 'pwa-empty-notice';
      emptyNotice.style.gridColumn = '1/-1';
      emptyNotice.style.textAlign = 'center';
      emptyNotice.style.padding = '40px 20px';
      emptyNotice.style.color = 'var(--text-secondary)';
      emptyNotice.innerHTML = `
        <i class="fa-solid fa-filter-circle-xmark" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 12px; display: block;"></i>
        <p style="margin: 0; font-size: 1rem; font-weight: 500;">No applications matched your filter criteria.</p>
        <button id="btn-reset-filters" style="margin-top: 14px; padding: 6px 16px; border-radius: 8px; background: var(--bg-card); border: 1px solid var(--border-glass); color: var(--text-primary); cursor: pointer; font-size: 0.85rem;">Reset Filters</button>
      `;
      pwaGrid.appendChild(emptyNotice);
      document.getElementById('btn-reset-filters')?.addEventListener('click', resetFilters);
    }
  } else if (emptyNotice) {
    emptyNotice.remove();
  }
}

function resetFilters() {
  currentCategoryFilter = 'all';
  einkFilterActive = false;
  if (searchInput) searchInput.value = '';

  filterPills.forEach(pill => {
    const isAll = pill.dataset.category === 'all';
    pill.classList.toggle('active', isAll);
    pill.setAttribute('aria-selected', isAll ? 'true' : 'false');
  });

  if (einkFilterBtn) {
    einkFilterBtn.classList.remove('active');
    einkFilterBtn.setAttribute('aria-pressed', 'false');
  }

  applyFilter();
}

// Filter pill click handlers
if (filterPills) {
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-selected', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-selected', 'true');
      currentCategoryFilter = pill.dataset.category || 'all';
      applyFilter();
    });
  });
}

// E-Ink filter toggle
if (einkFilterBtn) {
  einkFilterBtn.addEventListener('click', () => {
    einkFilterActive = !einkFilterActive;
    einkFilterBtn.classList.toggle('active', einkFilterActive);
    einkFilterBtn.setAttribute('aria-pressed', einkFilterActive ? 'true' : 'false');
    applyFilter();
  });
}

// Search Filter Logic
if (searchInput) {
  searchInput.addEventListener('input', applyFilter);
}

// Load on start
loadProjects();

