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
  serverTimestamp
} from './firebase.js';

console.log("📦 inventory.js loaded");

const vehicleContainer = document.getElementById('vehicle-container');

let allVehicles = [];

// Load Inventory
async function initInventory() {
  console.log("🚀 Initializing inventory connection...");
  // Use 'featured' for sorting as it's guaranteed to be in the initial data
  const q = query(collection(db, 'vehicles'), orderBy('featured', 'asc'));
  let snapshotReceived = false;

  const loaderFallback = document.getElementById('loader-fallback');
  const forceFetchBtn = document.getElementById('force-fetch-btn');
  const inventoryLoader = document.getElementById('inventory-loader');

  const logToUI = (msg, isError = false) => {
    console.log(msg);
    if (inventoryLoader) {
      const logLine = document.createElement('p');
      logLine.className = `text-[10px] mt-1 ${isError ? 'text-red-500' : 'text-slate-400'}`;
      logLine.textContent = `> ${msg}`;
      inventoryLoader.appendChild(logLine);
    }
  };

  logToUI(`Initializing... Host: ${window.location.hostname}`);
  logToUI(`Iframe: ${window.self !== window.top}`);

  // Show fallback after 3 seconds
  const fallbackTimeout = setTimeout(() => {
    if (!snapshotReceived && loaderFallback) {
      console.warn("⚠️ Snapshot timeout reached. Showing manual fetch option.");
      loaderFallback.classList.remove('hidden');
      logToUI("Timeout reached. Please try 'Force Manual Fetch' or reload.");
    }
  }, 3000);

  const renderData = (snapshot) => {
    console.log(`✅ Data received. Count: ${snapshot.size}, Source: ${snapshot.metadata.fromCache ? 'Cache' : 'Server'}`);
    snapshotReceived = true;
    clearTimeout(fallbackTimeout);
    if (loaderFallback) loaderFallback.classList.add('hidden');
    
    // If we get a real empty snapshot from the server, but we already have fallback data, 
    // don't overwrite it unless we actually have new data.
    if (snapshot.empty && allVehicles.length > 0) {
      logToUI("Snapshot empty, preserving existing fallback data.");
      return;
    }

    allVehicles = [];
    snapshot.forEach(doc => allVehicles.push({ id: doc.id, ...doc.data() }));
    renderInventory();
  };

  // 1. Try real-time listener
  logToUI("Starting real-time listener...");
  try {
    const unsubscribe = onSnapshot(q, (snapshot) => {
      logToUI(`Snapshot received (${snapshot.size} items)`);
      renderData(snapshot);
    }, (err) => {
      logToUI(`onSnapshot Error: ${err.message}`, true);
      // If onSnapshot fails immediately, try a direct fetch
      if (!snapshotReceived) {
        logToUI("Attempting immediate direct fetch...");
        attemptFetch(1);
      }
    });
  } catch (e) {
    logToUI(`onSnapshot setup failed: ${e.message}`, true);
    attemptFetch(1);
  }

  const attemptFetch = async (attempt = 1) => {
    if (snapshotReceived) return;
    logToUI(`Direct fetch attempt ${attempt}...`);
    
    try {
      // Try getDocs first (allows cache)
      logToUI("Trying getDocs (cache-friendly)...");
      let snapshot = await getDocs(q);
      
      // If empty, try without orderBy (maybe some docs missing the field)
      if (snapshot.empty) {
        logToUI("Ordered query empty, trying unordered fetch...");
        snapshot = await getDocs(collection(db, 'vehicles'));
      }

      if (snapshot.size > 0) {
        logToUI(`getDocs success (${snapshot.size} items)`);
        renderData(snapshot);
        return;
      }
      
      // If getDocs returned empty, try getDocsFromServer
      logToUI("getDocs empty, trying getDocsFromServer...");
      let serverSnapshot = await getDocsFromServer(q);
      
      if (serverSnapshot.empty) {
        logToUI("Ordered server fetch empty, trying unordered server fetch...");
        serverSnapshot = await getDocsFromServer(collection(db, 'vehicles'));
      }

      if (snapshot.empty && serverSnapshot.empty) {
        logToUI("Database is empty. Using initial data as fallback.");
        allVehicles = [...initialVehicles];
        renderInventory();
        return;
      }

      logToUI(`Server fetch success (${serverSnapshot.size} items)`);
      renderData(serverSnapshot);
    } catch (err) {
      logToUI(`Direct fetch failed: ${err.message}`, true);
      
      // If it's a "permission-denied" or "unavailable", it might be the iframe
      if (err.message.includes("unavailable") || err.message.includes("network")) {
        logToUI("Network/Iframe restriction detected. Retrying with delay...");
      }

      if (attempt < 3) {
        setTimeout(() => attemptFetch(attempt + 1), 2000);
      } else {
        logToUI("All connection attempts failed. This is likely a browser security restriction on cross-origin iframes.", true);
        if (inventoryLoader) {
          const errorDiv = document.createElement('div');
          errorDiv.className = "mt-4 p-4 bg-red-50 rounded-lg border border-red-100 text-center";
          errorDiv.innerHTML = `
            <p class="text-red-700 font-bold text-sm">Connection Blocked</p>
            <p class="text-red-600 text-[10px] mt-1">The browser is blocking the database connection inside this preview.</p>
            <div class="flex flex-col gap-2 mt-3">
              <button onclick="window.open(window.location.href, '_blank')" class="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-xs">Open in New Tab</button>
              <button onclick="location.reload()" class="bg-white text-red-600 border border-red-600 px-4 py-2 rounded-lg font-bold text-xs">Reload Preview</button>
            </div>
            <p class="text-[8px] text-slate-400 mt-2">Error: ${err.message}</p>
          `;
          inventoryLoader.appendChild(errorDiv);
        }
      }
    }
  };

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
  const sortYearSelect = document.getElementById('sort-year');
  const sortPriceSelect = document.getElementById('sort-price');
  const sortDisplacementSelect = document.getElementById('sort-displacement');
  const filterStock = document.getElementById('filter-stock').checked;

  const sortYear = sortYearSelect.value;
  const sortPrice = sortPriceSelect.value;
  const sortDisplacement = sortDisplacementSelect.value;

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
