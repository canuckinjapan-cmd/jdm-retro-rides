import { initialVehicles } from './initialData.js';
import { db, handleFirestoreError, doc, getDoc, getDocs, collection } from './firebase.js';

async function initLanding() {
  const loader = document.getElementById('featured-loader');
  const mainContainer = document.getElementById('main-featured-container');
  const secondaryContainer = document.getElementById('secondary-featured-container');

  const renderInitialLanding = () => {
    if (!initialVehicles || initialVehicles.length === 0) return;
    const vMain = initialVehicles[0];
    const vSecondary = initialVehicles.slice(1, 4);

    // Render Main
    const img = document.getElementById('main-featured-img');
    const title = document.getElementById('main-featured-title');
    const titleMobile = document.getElementById('main-featured-title-mobile');
    const desc = document.getElementById('main-featured-desc-text');
    const linkMobile = document.getElementById('main-featured-link-mobile');

    if (img) {
      img.src = vMain.images[0];
      img.referrerPolicy = "no-referrer";
    }
    if (title) title.textContent = vMain.title;
    if (titleMobile) titleMobile.textContent = vMain.title;
    if (desc) {
      desc.innerHTML = `${vMain.description.substring(0, 150)}... <a id="main-featured-link" class="text-white no-underline hover:underline decoration-2 font-bold" href="inventory.html#${vMain.stockNumber}">Details</a>`;
      desc.classList.remove('font-light', 'text-white/70');
      desc.classList.add('font-medium', 'text-white');
    }
    if (linkMobile) linkMobile.href = `inventory.html#${vMain.stockNumber}`;

    // Also update the container visibility
    if (mainContainer) {
      mainContainer.classList.remove('opacity-0');
      mainContainer.classList.add('active');
    }

    // Render Secondary
    if (secondaryContainer) {
      secondaryContainer.innerHTML = '';
      vSecondary.forEach(v => {
        const slot = document.createElement('div');
        slot.className = 'md:col-span-4 reveal active';
        slot.innerHTML = `
          <div class="group relative aspect-video overflow-hidden rounded-xl shadow-sm mb-3">
            <img alt="${v.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="${v.images[0]}" referrerPolicy="no-referrer">
          </div>
          <p class="text-on-surface font-bold text-lg">${v.title} - <a class="text-secondary hover:underline decoration-2" href="inventory.html#${v.stockNumber}">Details</a></p>
        `;
        secondaryContainer.appendChild(slot);
      });
    }
  };

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
      window.dispatchEvent(new Event('scroll'));
    }, 500);
  };

  // 1. Render fallback immediately so the user sees something
  renderInitialLanding();
  showContent();

  // 2. Try to fetch real data from Firestore
  try {
    const configSnap = await getDoc(doc(db, 'settings', 'landingPage'));
    if (!configSnap.exists()) {
      console.log("No landing page config found in Firestore, using fallback.");
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

    if (vehicleIds.length === 0) return;

    // Fetch all needed vehicles
    const vehiclesData = {};
    const vehiclePromises = vehicleIds.map(id => getDoc(doc(db, 'vehicles', id)));
    const vehicleSnaps = await Promise.all(vehiclePromises);
    
    vehicleSnaps.forEach(snap => {
      if (snap.exists()) {
        vehiclesData[snap.id] = snap.data();
      }
    });

    // Render Main Featured (Overwrite fallback)
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
      }
      if (linkMobile) linkMobile.href = `inventory.html#${v.stockNumber}`;
    }

    // Render Secondary Featured (Overwrite fallback)
    if (secondaryContainer && config.secondaryFeatured && config.secondaryFeatured.length > 0) {
      secondaryContainer.innerHTML = '';
      config.secondaryFeatured.forEach(item => {
        const v = vehiclesData[item.vehicleId];
        if (!v) return;

        const slot = document.createElement('div');
        slot.className = 'md:col-span-4 reveal active';
        slot.innerHTML = `
          <div class="group relative aspect-video overflow-hidden rounded-xl shadow-sm mb-3">
            <img alt="${v.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="${item.photoUrl || v.images[0]}" referrerPolicy="no-referrer">
          </div>
          <p class="text-on-surface font-bold text-lg">${v.title} - <a class="text-secondary hover:underline decoration-2" href="inventory.html#${v.stockNumber}">Details</a></p>
        `;
        secondaryContainer.appendChild(slot);
      });
    }

  } catch (err) {
    console.warn("Error fetching landing page data from Firestore:", err);
  }
}

// Initialize
initLanding();
