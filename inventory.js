import { initialVehicles } from './initialData.js';
import { 
  db, 
  handleFirestoreError, 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  getDocs, 
  getDocsFromServer,
  addDoc,
  serverTimestamp,
  doc,
  getDoc
} from './firebase.js';

console.log("📦 inventory.js loaded");

const vehicleContainer = document.getElementById('vehicle-container');

let allVehicles = [];

// Load Inventory
async function initInventory() {
  const VERSION = "1.6";
  console.log(`🚀 Initializing inventory v${VERSION}...`);
  const q = query(collection(db, 'vehicles'), orderBy('featured', 'asc'));
  let snapshotReceived = false;

  const loaderFallback = document.getElementById('loader-fallback');
  const forceFetchBtn = document.getElementById('force-fetch-btn');
  const inventoryLoader = document.getElementById('inventory-loader');

  // Add a connection status indicator to the UI
  const statusIndicator = document.createElement('div');
  statusIndicator.id = 'db-status';
  statusIndicator.className = 'fixed bottom-4 right-4 z-[100] bg-black/80 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-2';
  statusIndicator.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Connecting to Cloud...';
  document.body.appendChild(statusIndicator);

  const logToUI = (msg, isError = false) => {
    const time = new Date().toLocaleTimeString();
    const fullMsg = `[${time}] ${msg}`;
    console.log(fullMsg);
    if (inventoryLoader) {
      const logLine = document.createElement('p');
      logLine.className = `text-[10px] mt-1 ${isError ? 'text-red-500' : 'text-slate-400'}`;
      logLine.textContent = `> ${fullMsg}`;
      inventoryLoader.appendChild(logLine);
    }
    if (window.logDebug) window.logDebug(fullMsg, isError);
  };

  const updateStatus = (connected, msg) => {
    if (statusIndicator) {
      statusIndicator.innerHTML = `
        <span class="w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}"></span> 
        <span>${msg}</span>
        <button id="manual-sync-btn" class="ml-2 bg-white/20 hover:bg-white/40 px-2 py-0.5 rounded text-[8px] transition-colors">Sync Now</button>
      `;
      
      const syncBtn = document.getElementById('manual-sync-btn');
      if (syncBtn) {
        syncBtn.onclick = (e) => {
          e.stopPropagation();
          logToUI("Manual sync requested...");
          attemptFetch(1);
        };
      }

      if (connected) {
        setTimeout(() => {
          if (statusIndicator) statusIndicator.classList.add('opacity-0');
        }, 5000);
      } else {
        statusIndicator.classList.remove('opacity-0');
      }
    }
  };

  const renderData = (snapshot) => {
    const count = snapshot.size;
    const source = snapshot.metadata.fromCache ? 'Cache' : 'Server';
    logToUI(`✅ Data received. Count: ${count}, Source: ${source}`);
    
    snapshotReceived = true;
    updateStatus(true, "Cloud Connected");
    if (loaderFallback) loaderFallback.classList.add('hidden');
    
    if (snapshot.empty) {
      if (allVehicles.length > 4) {
        logToUI("Snapshot empty but we have data, ignoring empty update.");
        return;
      } else {
        logToUI("Cloud is empty. Keeping initial demo data.");
        return;
      }
    }

    const newVehicles = [];
    snapshot.forEach(doc => {
      newVehicles.push({ id: doc.id, ...doc.data() });
    });
    
    allVehicles = newVehicles;
    logToUI(`Titles: ${allVehicles.map(v => v.title).join(', ')}`);
    
    setTimeout(() => {
      renderInventory();
    }, 0);
  };

  const attemptFetch = async (attempt = 1) => {
    if (snapshotReceived && attempt === 1) return;
    logToUI(`Direct fetch attempt ${attempt}...`);
    updateStatus(false, `Retrying Cloud... (${attempt})`);
    
    const fetchWithTimeout = async (queryObj, label, timeoutMs = 8000) => {
      logToUI(`Trying ${label}...`);
      return Promise.race([
        getDocs(queryObj),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} Timeout`)), timeoutMs))
      ]);
    };

    try {
      let snapshot = await fetchWithTimeout(q, "getDocs (ordered)");
      
      if (snapshot.empty) {
        logToUI("Ordered query empty, trying unordered...");
        snapshot = await fetchWithTimeout(collection(db, 'vehicles'), "getDocs (unordered)");
      }

      if (snapshot.size > 0) {
        renderData(snapshot);
        return;
      }
      
      logToUI("getDocs empty, trying Server fetch...");
      let serverSnapshot = await fetchWithTimeout(getDocsFromServer(q), "getDocsFromServer (ordered)");
      
      if (serverSnapshot.empty) {
        serverSnapshot = await fetchWithTimeout(getDocsFromServer(collection(db, 'vehicles')), "getDocsFromServer (unordered)");
      }

      if (serverSnapshot.size > 0) {
        renderData(serverSnapshot);
      } else {
        logToUI("No vehicles found in Cloud.");
      }
    } catch (err) {
      logToUI(`Fetch failed: ${err.message}`, true);
      if (attempt < 3) {
        logToUI(`Retrying in 2s...`);
        setTimeout(() => attemptFetch(attempt + 1), 2000);
      }
    }
  };

  logToUI(`v${VERSION} Initializing... Host: ${window.location.hostname}`);
  logToUI(`Initial vehicles count: ${initialVehicles.length}`);
  
  // Diagnostic: Log the database ID and check connectivity
  import('./firebase-config.js').then(async config => {
    const dbId = config.default.firestoreDatabaseId || '(default)';
    logToUI(`Using Database: ${dbId}`);
    
    // Test connection by trying to fetch a non-existent doc
    try {
      const testRef = doc(db, '_internal_', 'connection_test');
      await getDoc(testRef);
      logToUI("Cloud connectivity verified.");
    } catch (e) {
      logToUI(`Connectivity Test Failed: ${e.message}`, true);
    }
  }).catch(err => {
    logToUI(`Config Load Error: ${err.message}`, true);
  });

  allVehicles = [...initialVehicles];
  renderInventory();

  // 2. Try real-time listener
  logToUI("Starting real-time listener...");
  try {
    onSnapshot(q, (snapshot) => {
      logToUI(`Snapshot received (${snapshot.size} items)`);
      renderData(snapshot);
    }, (err) => {
      logToUI(`onSnapshot Error: ${err.message}`, true);
      updateStatus(false, `Cloud Error: ${err.message}`);
      if (!snapshotReceived) attemptFetch(1);
    });
  } catch (e) {
    logToUI(`onSnapshot setup failed: ${e.message}`, true);
    attemptFetch(1);
  }

  if (forceFetchBtn) {
    forceFetchBtn.addEventListener('click', () => {
      console.log("🖱️ Force fetch button clicked");
      forceFetchBtn.disabled = true;
      forceFetchBtn.textContent = 'Fetching...';
      attemptFetch(1);
      setTimeout(() => {
        if (!snapshotReceived) {
          forceFetchBtn.disabled = false;
          forceFetchBtn.textContent = 'Try Again';
        }
      }, 5000);
    });
  }

  // Also try a direct fetch after a short delay regardless
  setTimeout(() => {
    if (!snapshotReceived) {
      console.log("🕒 Delayed direct fetch trigger...");
      attemptFetch(1);
    }
  }, 2000);
}

function renderInventory() {
  console.log(`🎨 renderInventory called. allVehicles count: ${allVehicles.length}`);
  if (window.logDebug) window.logDebug(`Rendering inventory (${allVehicles.length} vehicles)`);
  
  const sortYearSelect = document.getElementById('sort-year');
  const sortPriceSelect = document.getElementById('sort-price');
  const sortDisplacementSelect = document.getElementById('sort-displacement');
  const filterStockInput = document.getElementById('filter-stock');
  
  if (!sortYearSelect || !sortPriceSelect || !sortDisplacementSelect || !filterStockInput) {
    console.warn("⚠️ Some filter elements not found, skipping render.");
    return;
  }

  const sortYear = sortYearSelect.value;
  const sortPrice = sortPriceSelect.value;
  const sortDisplacement = sortDisplacementSelect.value;
  const filterStock = filterStockInput.checked;

  let filtered = [...allVehicles];

  if (filterStock) {
    filtered = filtered.filter(v => v.status === 'IN STOCK');
  }

  filtered.sort((a, b) => {
    // Priority: Price -> Year -> Displacement
    if (sortPrice === 'high-low') return Number(b.price) - Number(a.price);
    if (sortPrice === 'low-high') return Number(a.price) - Number(b.price);
    if (sortYear === 'newest') return Number(b.year) - Number(a.year);
    if (sortYear === 'oldest') return Number(a.year) - Number(b.year);
    if (sortDisplacement === 'high-low') return (Number(b.displacement) || 0) - (Number(a.displacement) || 0);
    if (sortDisplacement === 'low-high') return (Number(a.displacement) || 0) - (Number(b.displacement) || 0);
    
    // Default: Featured rank (1, 2, 3, 4...)
    return (Number(a.featured) || 99) - (Number(b.featured) || 99);
  });

  vehicleContainer.innerHTML = '';
  if (filtered.length === 0) {
    const debugInfo = allVehicles.length === 0 ? ' (Database appears empty)' : ' (Try adjusting your filters)';
    vehicleContainer.innerHTML = `
      <div class="text-center py-20 space-y-4">
        <div class="text-slate-500 font-bold text-xl">No vehicles found matching your criteria.${debugInfo}</div>
        <button id="refresh-btn" class="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2 rounded-lg font-bold transition-colors">
          Refresh Page
        </button>
      </div>
    `;
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => location.reload());
    return;
  }

  filtered.forEach(v => {
    const card = document.createElement('div');
    card.className = 'vehicle-card flex flex-col lg:flex-row bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden hover:shadow-md transition-shadow scroll-mt-32 relative';
    
    // Ensure stockNumber is used as the ID for anchor links
    const cardId = v.stockNumber ? v.stockNumber.trim() : v.id;
    card.id = cardId;
    card.setAttribute('name', cardId);
    
    const statusClass = v.status === 'IN STOCK' ? 'bg-green-100 text-green-700' : 
                        v.status === 'RESERVED' ? 'bg-amber-100 text-amber-700' : 
                        'bg-blue-100 text-blue-700';

    card.innerHTML = `
      <div class="lg:w-2/5 p-4 space-y-3 bg-gray-50/50 group">
        <div class="aspect-[16/10] overflow-hidden rounded-lg cursor-pointer group/main relative" id="main-img-container-${v.id}">
          <img id="${v.id}-main-img" class="w-full h-full object-cover transition-transform duration-500 group-hover/main:scale-105" alt="${v.title}" src="${v.images[0]}" referrerPolicy="no-referrer">
          <div class="absolute inset-0 pointer-events-none">
            <span class="zoom-icon material-symbols-outlined text-white opacity-0 group-hover:opacity-100 text-3xl transition-opacity absolute bottom-4 right-4">zoom_in</span>
          </div>
        </div>
        <div class="grid grid-cols-4 gap-2">
          ${v.images.slice(1, 4).map((img, idx) => `
            <div class="aspect-square rounded border border-outline-variant overflow-hidden cursor-pointer" id="thumb-${v.id}-${idx}">
              <img class="w-full h-full object-cover" src="${img}" referrerPolicy="no-referrer">
            </div>
          `).join('')}
          ${v.images.length > 4 ? `
            <div class="aspect-square rounded border border-outline-variant overflow-hidden cursor-pointer bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors" id="more-imgs-${v.id}">
              <span class="text-sm font-black text-slate-500">+${v.images.length - 4}</span>
            </div>
          ` : ''}
        </div>
      </div>
      <div class="lg:w-3/5 p-6 md:p-8 flex flex-col relative">
        <!-- Details Overlay (Card Local) -->
        <div id="card-overlay-${v.id}" class="hidden absolute inset-0 bg-white z-20 p-6 md:p-8 flex flex-col overflow-y-auto border-2 border-secondary shadow-[0_20px_50px_rgba(59,130,246,0.3)] rounded-xl">
          <div class="flex items-start justify-between gap-4 mb-4">
            <div class="space-y-1">
              <h2 class="text-2xl md:text-3xl font-black tracking-tight text-primary">
                ${v.title} <span class="text-slate-400 font-normal text-sm ml-1">(${v.stockNumber})</span>
              </h2>
              <div class="flex items-center gap-3">
                <span class="px-2 py-1 rounded text-[10px] font-black tracking-widest ${statusClass}">${v.status}</span>
                <span class="text-xl font-black text-secondary">¥${parseInt(v.price).toLocaleString()}</span>
              </div>
            </div>
            <button id="close-overlay-${v.id}" class="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <span class="material-symbols-outlined text-slate-400">close</span>
            </button>
          </div>
          <div class="prose prose-slate max-w-none flex-1">
            <p class="text-slate-600 leading-relaxed whitespace-pre-wrap text-base">${v.description || 'No additional description provided.'}</p>
          </div>
          <div class="mt-6 pt-4 border-t border-slate-100 text-center">
            <p class="text-[10px] font-bold text-secondary uppercase tracking-widest">Click [X] or hit ESC to close details</p>
          </div>
        </div>

        <div class="flex items-start justify-between gap-4 mb-6">
          <h2 class="text-2xl md:text-3xl font-black tracking-tight text-primary">
            ${v.title} <span class="text-slate-400 font-normal text-sm ml-2">Stock: ${v.stockNumber}</span>
          </h2>
          <span class="px-2 py-1 rounded text-[10px] font-black tracking-widest shrink-0 ${statusClass}">${v.status}</span>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 mb-8">
          <div class="flex justify-between border-b border-slate-100 pb-2">
            <span class="text-slate-500 text-sm">Price</span>
            <span class="font-bold text-secondary text-lg">¥${parseInt(v.price).toLocaleString()}</span>
          </div>
          <div class="flex justify-between border-b border-slate-100 pb-2">
            <span class="text-slate-500 text-sm">Year</span>
            <span class="font-bold text-sm">${v.year}</span>
          </div>
          <div class="flex justify-between border-b border-slate-100 pb-2">
            <span class="text-slate-500 text-sm">Mileage</span>
            <span class="font-bold text-sm">${v.mileage ? v.mileage.toLocaleString() + ' km' : 'N/A'}</span>
          </div>
          <div class="flex justify-between border-b border-slate-100 pb-2">
            <span class="text-slate-500 text-sm">Displacement</span>
            <span class="font-bold text-sm">${v.displacement ? v.displacement.toLocaleString() + ' cc' : 'N/A'}</span>
          </div>
          <div class="flex justify-between border-b border-slate-100 pb-2">
            <span class="text-slate-500 text-sm">Transmission</span>
            <span class="font-bold text-sm">${v.transmission}</span>
          </div>
          <div class="flex justify-between border-b border-slate-100 pb-2">
            <span class="text-slate-500 text-sm">Color</span>
            <span class="font-bold text-sm">${v.color || 'N/A'}</span>
          </div>
          <div class="flex justify-between border-b border-slate-100 pb-2">
            <span class="text-slate-500 text-sm">Repaired</span>
            <span class="font-bold text-sm">${v.repaired || 'No repair history'}</span>
          </div>
          <div class="flex justify-between border-b border-slate-100 pb-2">
            <span class="text-slate-500 text-sm">Seating capacity</span>
            <span class="font-bold text-sm">${v.seatingCapacity || 'N/A'}</span>
          </div>
          <div class="flex justify-between border-b border-slate-100 pb-2">
            <span class="text-slate-500 text-sm">Grade</span>
            <span class="font-bold text-sm">${v.grade || 'N/A'}</span>
          </div>
          <div class="flex justify-between border-b border-slate-100 pb-2">
            <span class="text-slate-500 text-sm">Drive system</span>
            <span class="font-bold text-sm">${v.driveSystem || 'N/A'}</span>
          </div>
        </div>

        <div class="mt-auto flex flex-wrap gap-4 pt-6 border-t border-outline-variant/30">
          <button id="view-details-${v.id}" class="flex-1 bg-primary text-white px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 group">View Details <span class="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">info</span></button>
          ${/* NOTE: When status is SOLD, the INQUIRE button is disabled to prevent needless inquiries */
            v.status !== 'SOLD' ? `
            <a href="index.html?vehicle=${encodeURIComponent(v.title + ' (' + v.stockNumber + ')') }#contact" class="flex-1 bg-secondary text-white px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 group">Inquire <span class="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">mail</span></a>
          ` : `
            <button disabled class="flex-1 bg-slate-200 text-slate-400 px-6 py-3 rounded-lg font-bold cursor-not-allowed flex items-center justify-center gap-2">SOLD OUT</button>
          `}
        </div>
      </div>
    `;
    vehicleContainer.appendChild(card);

    // Event Listeners
    document.getElementById(`main-img-container-${v.id}`).addEventListener('click', () => openSlideshow(v.id, 0));
    v.images.slice(1, 4).forEach((img, idx) => {
      const thumb = document.getElementById(`thumb-${v.id}-${idx}`);
      thumb.addEventListener('mouseenter', () => updateMainImage(v.id, img));
      thumb.addEventListener('mouseleave', () => updateMainImage(v.id, v.images[0]));
    });
    if (v.images.length > 4) {
      document.getElementById(`more-imgs-${v.id}`).addEventListener('click', () => openSlideshow(v.id, 0));
    }
    document.getElementById(`view-details-${v.id}`).addEventListener('click', () => {
      document.getElementById(`card-overlay-${v.id}`).classList.remove('hidden');
    });
    document.getElementById(`close-overlay-${v.id}`).addEventListener('click', () => {
      document.getElementById(`card-overlay-${v.id}`).classList.add('hidden');
    });
  });

  const countSpan = document.querySelector('.text-on-surface.font-bold');
  if (countSpan) countSpan.textContent = filtered.length.toString();

  // Check for hash in URL to scroll to vehicle
  const hash = decodeURIComponent(window.location.hash.substring(1));
  if (hash && !window.hasAutoScrolled) {
    // Wait for a short delay to ensure DOM is stable and layout is finished
    setTimeout(() => {
      const card = document.getElementById(hash);
      if (card) {
        console.log("🎯 Scrolling to vehicle:", hash);
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.hasAutoScrolled = true;
      } else {
        console.warn(`⚠️ Could not find vehicle card with ID: ${hash}`);
      }
    }, 800);
  }
}

function updateMainImage(id, src) {
  const img = document.getElementById(`${id}-main-img`);
  if (img) img.src = src;
}

// Filters
document.getElementById('sort-year').addEventListener('change', (e) => {
  if (e.target.value !== 'featured') {
    document.getElementById('sort-price').value = '';
    document.getElementById('sort-displacement').value = '';
  }
  renderInventory();
});

document.getElementById('sort-price').addEventListener('change', (e) => {
  if (e.target.value !== '') {
    document.getElementById('sort-year').value = 'featured';
    document.getElementById('sort-displacement').value = '';
  }
  renderInventory();
});

document.getElementById('sort-displacement').addEventListener('change', (e) => {
  if (e.target.value !== '') {
    document.getElementById('sort-year').value = 'featured';
    document.getElementById('sort-price').value = '';
  }
  renderInventory();
});

document.getElementById('filter-stock').addEventListener('change', renderInventory);

// Scroll listener to close overlays
window.addEventListener('scroll', () => {
  const overlays = document.querySelectorAll('[id^="card-overlay-"]');
  overlays.forEach(overlay => {
    if (!overlay.classList.contains('hidden')) {
      overlay.classList.add('hidden');
    }
  });
}, { passive: true });

// Slideshow
let currentCarKey = '';
let currentSlideIndex = 0;
const carData = {};

const modal = document.getElementById('slideshow-modal');
const modalImg = document.getElementById('slideshow-img');
const counter = document.getElementById('slideshow-counter');

function openSlideshow(id, index) {
  const v = allVehicles.find(item => item.id === id);
  if (!v) return;
  
  currentCarKey = id;
  currentSlideIndex = index;
  carData[id] = { images: v.images };
  
  modalImg.src = v.images[index];
  counter.textContent = `${index + 1} / ${v.images.length}`;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeSlideshow() {
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

function updateSlideshow() {
  const images = carData[currentCarKey].images;
  modalImg.style.opacity = '0';
  setTimeout(() => {
    modalImg.src = images[currentSlideIndex];
    counter.textContent = `${currentSlideIndex + 1} / ${images.length}`;
    modalImg.style.opacity = '1';
  }, 150);
}

function nextSlide() {
  const images = carData[currentCarKey].images;
  currentSlideIndex = (currentSlideIndex + 1) % images.length;
  updateSlideshow();
}

function prevSlide() {
  const images = carData[currentCarKey].images;
  currentSlideIndex = (currentSlideIndex - 1 + images.length) % images.length;
  updateSlideshow();
}

document.getElementById('close-slideshow').addEventListener('click', closeSlideshow);
document.getElementById('next-slide').addEventListener('click', nextSlide);
document.getElementById('prev-slide').addEventListener('click', prevSlide);

document.addEventListener('keydown', (e) => {
  if (modal.classList.contains('hidden')) return;
  if (e.key === 'ArrowRight') nextSlide();
  if (e.key === 'ArrowLeft') prevSlide();
  if (e.key === 'Escape') closeSlideshow();
});

// ESC key to close all overlays
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const overlays = document.querySelectorAll('[id^="card-overlay-"]');
    overlays.forEach(overlay => overlay.classList.add('hidden'));
  }
});

initInventory();
