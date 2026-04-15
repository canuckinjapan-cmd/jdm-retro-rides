import { db, handleFirestoreError } from './firebase.js';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';

async function initLanding() {
  const loader = document.getElementById('featured-loader');
  const mainContainer = document.getElementById('main-featured-container');
  const secondaryContainer = document.getElementById('secondary-featured-container');

  const showContent = () => {
    if (loader) loader.classList.add('opacity-0');
    setTimeout(() => {
      if (loader) loader.remove();
      if (mainContainer) {
        mainContainer.dataset.loaded = "true";
        mainContainer.classList.remove('opacity-0');
        mainContainer.classList.add('active');
      }
      if (secondaryContainer) {
        secondaryContainer.dataset.loaded = "true";
        secondaryContainer.classList.remove('opacity-0');
        secondaryContainer.classList.add('active');
      }
      // Trigger a scroll event to catch any elements that should now reveal
      window.dispatchEvent(new Event('scroll'));
    }, 500);
  };

  // Fallback timeout: if data doesn't load in 4 seconds, show whatever we have
  const fallbackTimeout = setTimeout(() => {
    console.warn("Landing page data fetch timed out. Showing fallback content.");
    showContent();
  }, 4000);

  try {
    const configSnap = await getDoc(doc(db, 'settings', 'landingPage'));
    if (window.logDebug) window.logDebug(`Landing config fetched: ${configSnap.exists() ? 'Found' : 'Not found'}`);
    if (!configSnap.exists()) {
      showContent();
      return;
    }

    const config = configSnap.data();
    const vehicleIds = [];
    if (config.mainFeatured?.vehicleId) vehicleIds.push(config.mainFeatured.vehicleId);
    if (config.secondaryFeatured) {
      config.secondaryFeatured.forEach(item => {
        if (item.vehicleId) vehicleIds.push(item.vehicleId);
      });
    }

    if (vehicleIds.length === 0) {
      showContent();
      return;
    }

    // Fetch all needed vehicles
    const vehiclesData = {};
    const vehiclePromises = vehicleIds.map(id => getDoc(doc(db, 'vehicles', id)));
    const vehicleSnaps = await Promise.all(vehiclePromises);
    
    vehicleSnaps.forEach(snap => {
      if (snap.exists()) {
        vehiclesData[snap.id] = snap.data();
      }
    });

    // Render Main Featured
    if (config.mainFeatured?.vehicleId && vehiclesData[config.mainFeatured.vehicleId]) {
      const v = vehiclesData[config.mainFeatured.vehicleId];
      const img = document.getElementById('main-featured-img');
      const title = document.getElementById('main-featured-title');
      const titleMobile = document.getElementById('main-featured-title-mobile');
      const desc = document.getElementById('main-featured-desc-text');
      const linkMobile = document.getElementById('main-featured-link-mobile');

      if (img) img.src = config.mainFeatured.photoUrl || v.images[0];
      if (title) title.textContent = v.title;
      if (titleMobile) titleMobile.textContent = v.title;
      
      if (desc) {
        desc.innerHTML = `${config.mainFeatured.description || ''} <a id="main-featured-link" class="text-white no-underline hover:underline decoration-2 font-bold" href="inventory.html#${v.stockNumber}">Details</a>`;
        // Update font weight for the description text
        desc.classList.remove('font-light', 'text-white/70');
        desc.classList.add('font-medium', 'text-white');
        
        // Ensure parent has drop shadow
        const container = desc.closest('.md\\:block');
        if (container) container.classList.add('hero-text-shadow');
      }
      if (linkMobile) {
        linkMobile.href = `inventory.html#${v.stockNumber}`;
        linkMobile.classList.add('font-bold');
      }
    }

    // Render Secondary Featured
    if (secondaryContainer && config.secondaryFeatured) {
      // Clear existing slots if we have data
      secondaryContainer.innerHTML = '';
      
      config.secondaryFeatured.forEach(item => {
        const v = vehiclesData[item.vehicleId];
        if (!v) return;

        const slot = document.createElement('div');
        slot.className = 'md:col-span-4 reveal active'; // Add active class so they display immediately
        slot.innerHTML = `
          <div class="group relative aspect-video overflow-hidden rounded-xl shadow-sm mb-3">
            <img alt="${v.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="${item.photoUrl || v.images[0]}" referrerPolicy="no-referrer">
          </div>
          <p class="text-on-surface font-bold text-lg">${v.title} - <a class="text-secondary hover:underline decoration-2" href="inventory.html#${v.stockNumber}">Details</a></p>
        `;
        secondaryContainer.appendChild(slot);
      });
    }

    clearTimeout(fallbackTimeout);
    showContent();

  } catch (err) {
    console.error("Error initializing landing page:", err);
    showContent();
  }
}

document.addEventListener('DOMContentLoaded', initLanding);
