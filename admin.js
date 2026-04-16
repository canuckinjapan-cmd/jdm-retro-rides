import { 
  auth, 
  db, 
  storage, 
  login, 
  logout, 
  checkIsAdmin, 
  handleFirestoreError,
  onAuthStateChanged,
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  serverTimestamp, 
  getDocs, 
  getDocsFromServer,
  setDoc,
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  initializeFirestore,
  getApp,
  disableNetwork,
  enableNetwork,
  terminate,
  firebaseConfig
} from './firebase.js';
import { initialVehicles } from './initialData.js';

let currentVehicleImages = [];
let isEditing = false;

// UI Elements
const authOverlay = document.getElementById('auth-overlay');
const adminContent = document.getElementById('admin-content');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const restoreDataBtn = document.getElementById('restore-data-btn');
const checkDefaultDbBtn = document.getElementById('check-default-db-btn');
const migrateDataBtn = document.getElementById('migrate-data-btn');
const clearCacheBtn = document.getElementById('clear-cache-btn');
const clearAllDataBtn = document.getElementById('clear-all-data-btn');
const hardResetBtn = document.getElementById('hard-reset-btn');
const forceSyncBtn = document.getElementById('force-sync-btn');
const debugInfoBtn = document.getElementById('debug-info-btn');
const connectionStatus = document.getElementById('connection-status');
const userEmailSpan = document.getElementById('user-email');
const authError = document.getElementById('auth-error');

const vehicleList = document.getElementById('vehicle-list');
const addVehicleBtn = document.getElementById('add-vehicle-btn');
const vehicleModal = document.getElementById('vehicle-modal');
const vehicleForm = document.getElementById('vehicle-form');
const closeModalBtn = document.getElementById('close-modal');
const cancelModalBtn = document.getElementById('cancel-modal');
const saveVehicleBtn = document.getElementById('save-vehicle-btn');
const saveBtnText = document.getElementById('save-btn-text');
const saveLoader = document.getElementById('save-loader');

const photoInput = document.getElementById('photo-input');
const photoUploadArea = document.getElementById('photo-upload-area');
const photoPreviewGrid = document.getElementById('photo-preview-grid');
const uploadStatus = document.getElementById('upload-status');

const adminSort = document.getElementById('admin-sort');

// Tab Switching
const tabInventory = document.getElementById('tab-inventory');
const tabLanding = document.getElementById('tab-landing');
const inventorySection = document.getElementById('inventory-section');
const landingSection = document.getElementById('landing-section');

tabInventory.addEventListener('click', () => {
  tabInventory.classList.add('border-secondary', 'text-secondary');
  tabInventory.classList.remove('border-transparent', 'text-slate-500');
  tabLanding.classList.remove('border-secondary', 'text-secondary');
  tabLanding.classList.add('border-transparent', 'text-slate-500');
  inventorySection.classList.remove('hidden');
  landingSection.classList.add('hidden');
});

tabLanding.addEventListener('click', () => {
  tabLanding.classList.add('border-secondary', 'text-secondary');
  tabLanding.classList.remove('border-transparent', 'text-slate-500');
  tabInventory.classList.remove('border-secondary', 'text-secondary');
  tabInventory.classList.add('border-transparent', 'text-slate-500');
  landingSection.classList.remove('hidden');
  inventorySection.classList.add('hidden');
  loadLandingConfig();
});

// Landing Page Management
const mainFeaturedId = document.getElementById('main-featured-id');
const mainPhotoSelection = document.getElementById('main-photo-selection');
const mainPhotoGrid = document.getElementById('main-photo-grid');
const mainFeaturedPhoto = document.getElementById('main-featured-photo');
const mainFeaturedDesc = document.getElementById('main-featured-desc');
const saveLandingBtn = document.getElementById('save-landing-btn');
const landingSaveLoader = document.getElementById('landing-save-loader');

async function loadLandingConfig() {
  // Populate vehicle selects
  const selects = [mainFeaturedId, ...document.querySelectorAll('.secondary-vehicle-id')];
  selects.forEach(s => {
    const currentVal = s.value;
    s.innerHTML = '<option value="">Select a vehicle...</option>';
    allVehiclesAdmin.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = `${v.title} (${v.stockNumber})`;
      s.appendChild(opt);
    });
    s.value = currentVal;
  });

  // Load existing config
  try {
    const docSnap = await getDoc(doc(db, 'settings', 'landingPage'));
    if (docSnap.exists()) {
      const config = docSnap.data();
      if (config.mainFeatured) {
        mainFeaturedId.value = config.mainFeatured.vehicleId || '';
        mainFeaturedDesc.value = config.mainFeatured.description || '';
        mainFeaturedPhoto.value = config.mainFeatured.photoUrl || '';
        updatePhotoGrid(mainFeaturedId.value, mainPhotoGrid, mainFeaturedPhoto, mainPhotoSelection);
      }
      if (config.secondaryFeatured) {
        config.secondaryFeatured.forEach((item, index) => {
          const slotSelect = document.querySelector(`.secondary-vehicle-id[data-slot="${index}"]`);
          if (!slotSelect) return;
          const slot = slotSelect.closest('.secondary-slot');
          const slotPhoto = slot.querySelector('.secondary-vehicle-photo');
          const slotGrid = slot.querySelector('.secondary-photo-grid');
          const slotSelection = slot.querySelector('.secondary-photo-selection');
          
          slotSelect.value = item.vehicleId;
          slotPhoto.value = item.photoUrl;
          updatePhotoGrid(item.vehicleId, slotGrid, slotPhoto, slotSelection);
        });
      }
    }
  } catch (err) {
    console.error("Error loading landing config:", err);
  }
}

function updatePhotoGrid(vehicleId, gridElement, hiddenInput, container) {
  if (!vehicleId) {
    container.classList.add('hidden');
    return;
  }

  const vehicle = allVehiclesAdmin.find(v => v.id === vehicleId);
  if (!vehicle) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  gridElement.innerHTML = '';
  
  vehicle.images.forEach(url => {
    const img = document.createElement('img');
    img.src = url;
    img.className = `w-full aspect-square object-cover rounded-lg cursor-pointer border-4 transition-all ${hiddenInput.value === url ? 'border-secondary' : 'border-transparent'}`;
    img.onclick = () => {
      hiddenInput.value = url;
      Array.from(gridElement.children).forEach(child => child.classList.replace('border-secondary', 'border-transparent'));
      img.classList.replace('border-transparent', 'border-secondary');
    };
    gridElement.appendChild(img);
  });
}

mainFeaturedId.addEventListener('change', (e) => {
  updatePhotoGrid(e.target.value, mainPhotoGrid, mainFeaturedPhoto, mainPhotoSelection);
});

document.querySelectorAll('.secondary-vehicle-id').forEach(select => {
  select.addEventListener('change', (e) => {
    const slot = e.target.closest('.secondary-slot');
    const grid = slot.querySelector('.secondary-photo-grid');
    const input = slot.querySelector('.secondary-vehicle-photo');
    const container = slot.querySelector('.secondary-photo-selection');
    updatePhotoGrid(e.target.value, grid, input, container);
  });
});

saveLandingBtn.addEventListener('click', async () => {
  saveLandingBtn.disabled = true;
  landingSaveLoader.classList.remove('hidden');

  const secondaryFeatured = [];
  document.querySelectorAll('.secondary-slot').forEach(slot => {
    const vehicleId = slot.querySelector('.secondary-vehicle-id').value;
    const photoUrl = slot.querySelector('.secondary-vehicle-photo').value;
    if (vehicleId && photoUrl) {
      secondaryFeatured.push({ vehicleId, photoUrl });
    }
  });

  const config = {
    mainFeatured: {
      vehicleId: mainFeaturedId.value,
      photoUrl: mainFeaturedPhoto.value,
      description: mainFeaturedDesc.value
    },
    secondaryFeatured,
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, 'settings', 'landingPage'), config);
    alert('Landing page configuration saved successfully!');
  } catch (e) {
    handleFirestoreError(e, 'WRITE', 'settings/landingPage');
  } finally {
    saveLandingBtn.disabled = false;
    landingSaveLoader.classList.add('hidden');
  }
});

let allVehiclesAdmin = [];

// Auth Listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    updateStatus(true);
    const isAdmin = await checkIsAdmin(user);
    if (isAdmin) {
      authOverlay.classList.add('hidden');
      adminContent.classList.remove('hidden');
      userEmailSpan.textContent = user.email;
      loadVehicles();
    } else {
      authError.textContent = "Access Denied: You do not have admin privileges.";
      authError.classList.remove('hidden');
      await logout();
    }
  } else {
    authOverlay.classList.remove('hidden');
    adminContent.classList.add('hidden');
  }
});

loginBtn.addEventListener('click', async () => {
  console.log("Login button clicked");
  if (window.logDebug) window.logDebug("Attempting Google Login...");
  try {
    const result = await login();
    if (window.logDebug) window.logDebug(`Login successful: ${result.user.email}`);
  } catch (e) {
    console.error("Login error:", e);
    if (window.logDebug) window.logDebug(`Login failed: ${e.message}`, true);
    authError.textContent = e.message;
    authError.classList.remove('hidden');
  }
});

logoutBtn.addEventListener('click', () => logout());

// Load Vehicles
async function loadVehicles(forceServer = false) {
  vehicleList.innerHTML = '<tr><td colspan="6" class="px-6 py-12 text-center text-slate-400 font-bold">Loading inventory...</td></tr>';
  
  try {
    if (forceServer) {
      updateStatus(false, 'Fetching from Cloud...');
      try {
        // Try a simple getDocs first to see if we can reach the collection
        const snapshot = await getDocsFromServer(collection(db, 'vehicles'));
        allVehiclesAdmin = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), metadata: doc.metadata }));
        renderAdminList();
        updateStatus(true);
        if (window.logDebug) window.logDebug(`✅ Cloud Sync Successful: Found ${snapshot.size} vehicles`);
        return;
      } catch (serverErr) {
        console.warn("Server fetch failed, falling back to cache:", serverErr);
        if (window.logDebug) window.logDebug(`⚠️ Cloud fetch failed: ${serverErr.message}. Trying cache...`, true);
        const snapshot = await getDocs(collection(db, 'vehicles'));
        allVehiclesAdmin = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), metadata: doc.metadata }));
        renderAdminList();
        updateStatus(true, 'Loaded (Cache)');
        if (window.logDebug) window.logDebug(`📦 Cache Load: Found ${snapshot.size} vehicles`);
        return;
      }
    }

    // Use a simpler query for the real-time listener to avoid index issues
    const q = collection(db, 'vehicles');
    onSnapshot(q, (snapshot) => {
      if (snapshot.empty && allVehiclesAdmin.length === 0) {
        vehicleList.innerHTML = '<tr><td colspan="6" class="px-6 py-12 text-center text-slate-400 font-bold">No vehicles found. Add your first listing!</td></tr>';
        return;
      }
      allVehiclesAdmin = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), metadata: doc.metadata }));
      if (window.logDebug) window.logDebug(`🔄 Snapshot Update: ${snapshot.size} vehicles (Source: ${snapshot.metadata.fromCache ? 'Cache' : 'Server'})`);
      renderAdminList();
    }, (err) => {
      console.error("Snapshot error:", err);
      updateStatus(false, 'Sync Error');
      if (window.logDebug) window.logDebug(`Snapshot Error: ${err.message}`, true);
    });
  } catch (err) {
    console.error("Load error:", err);
    updateStatus(false, 'Load Error');
    if (window.logDebug) window.logDebug(`Load Error: ${err.message}`, true);
  }
}

function renderAdminList() {
  try {
    const sortVal = adminSort.value;
    let sorted = [...allVehiclesAdmin];

    sorted.sort((a, b) => {
      const timeA = (a.createdAt && typeof a.createdAt.toMillis === 'function') ? a.createdAt.toMillis() : 0;
      const timeB = (b.createdAt && typeof b.createdAt.toMillis === 'function') ? b.createdAt.toMillis() : 0;
      
      if (sortVal === 'date-new') return timeB - timeA;
      if (sortVal === 'date-old') return timeA - timeB;
      
      const stockA = a.stockNumber || '';
      const stockB = b.stockNumber || '';
      if (sortVal === 'stock-asc') return stockA.localeCompare(stockB);
      if (sortVal === 'stock-desc') return stockB.localeCompare(stockA);
      return 0;
    });

    vehicleList.innerHTML = '';
    sorted.forEach((data) => {
      const isPending = (data.metadata && data.metadata.hasPendingWrites) || !data.createdAt;
      const dateStr = data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString().split('T')[0] : new Date(data.createdAt).toISOString().split('T')[0]) : '<span class="text-amber-500 italic">Pending...</span>';
      
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 transition-colors block md:table-row border-b md:border-none';
      const firstImage = (data.images && data.images.length > 0) ? data.images[0] : 'https://picsum.photos/seed/car/200/200';
      
      tr.innerHTML = `
        <td class="px-4 py-4 md:px-6 block md:table-cell">
          <div class="flex items-center gap-3">
            <img src="${firstImage}" class="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0">
            <div class="min-w-0 flex-1">
              <div class="font-bold text-sm truncate flex items-center gap-1" title="${data.title || 'Untitled'}">
                ${data.title || 'Untitled'}
                ${isPending ? '<span class="material-symbols-outlined text-[14px] text-amber-500 animate-spin" title="Syncing to Cloud...">sync</span>' : '<span class="material-symbols-outlined text-[14px] text-emerald-500" title="Synced to Cloud">cloud_done</span>'}
              </div>
              <div class="text-xs text-slate-400">${data.year || 'N/A'} • ${data.transmission || 'N/A'}</div>
            </div>
          </div>
        </td>
        <td class="px-4 py-2 md:px-6 md:py-4 text-xs md:text-sm text-slate-500 font-medium block md:table-cell">
          <span class="md:hidden text-slate-400 font-bold uppercase mr-2">Added:</span>${dateStr}
        </td>
        <td class="px-4 py-2 md:px-6 md:py-4 text-xs md:text-sm font-medium text-slate-500 block md:table-cell">
          <span class="md:hidden text-slate-400 font-bold uppercase mr-2">Stock:</span>${data.stockNumber || 'N/A'}
        </td>
        <td class="px-4 py-2 md:px-6 md:py-4 block md:table-cell">
          <span class="md:hidden text-slate-400 font-bold uppercase mr-2">Status:</span>
          <span class="px-2 py-1 rounded text-[10px] font-black tracking-widest ${
            data.status === 'IN STOCK' ? 'bg-green-100 text-green-700' : 
            data.status === 'RESERVED' ? 'bg-amber-100 text-amber-700' : 
            'bg-blue-100 text-blue-700'
          }">${data.status || 'UNKNOWN'}</span>
        </td>
        <td class="px-4 py-2 md:px-6 md:py-4 text-sm font-bold block md:table-cell">
          <span class="md:hidden text-slate-400 font-bold uppercase mr-2">Price:</span>
          <span class="text-secondary">¥${parseInt(data.price || 0).toLocaleString()}</span>
        </td>
        <td class="px-4 py-4 md:px-6 md:py-4 text-right block md:table-cell">
          <div class="flex items-center justify-end gap-4 md:gap-2">
            <button id="edit-${data.id}" class="flex items-center gap-1 px-3 py-2 md:p-2 bg-slate-100 md:bg-transparent rounded-lg text-slate-600 md:text-slate-400 hover:text-secondary transition-colors">
              <span class="material-symbols-outlined text-xl">edit</span>
              <span class="md:hidden text-xs font-bold">Edit</span>
            </button>
            <button id="delete-${data.id}" class="flex items-center gap-1 px-3 py-2 md:p-2 bg-red-50 md:bg-transparent rounded-lg text-red-600 md:text-slate-400 hover:text-red-600 transition-colors">
              <span class="material-symbols-outlined text-xl">delete</span>
              <span class="md:hidden text-xs font-bold">Delete</span>
            </button>
          </div>
        </td>
      `;
      vehicleList.appendChild(tr);
      
      document.getElementById(`edit-${data.id}`).addEventListener('click', () => editVehicle(data.id));
      document.getElementById(`delete-${data.id}`).addEventListener('click', () => deleteVehicle(data.id));
    });
  } catch (err) {
    console.error("Render error:", err);
    if (window.logDebug) window.logDebug(`Render Error: ${err.message}`, true);
  }
}

adminSort.addEventListener('change', renderAdminList);

// Modal Logic
addVehicleBtn.addEventListener('click', () => {
  isEditing = false;
  document.getElementById('modal-title').textContent = 'Add New Vehicle';
  vehicleForm.reset();
  document.getElementById('vehicle-id').value = '';
  currentVehicleImages = [];
  renderPhotoPreviews();
  vehicleModal.classList.remove('hidden');
});

async function editVehicle(id) {
  isEditing = true;
  document.getElementById('modal-title').textContent = 'Edit Vehicle';
  const docSnap = await getDoc(doc(db, 'vehicles', id));
  if (docSnap.exists()) {
    const data = docSnap.data();
    document.getElementById('vehicle-id').value = id;
    document.getElementById('v-title').value = data.title;
    document.getElementById('v-stock').value = data.stockNumber;
    document.getElementById('v-status').value = data.status;
    document.getElementById('v-price').value = data.price;
    document.getElementById('v-year').value = data.year;
    document.getElementById('v-mileage').value = data.mileage || '';
    document.getElementById('v-displacement').value = data.displacement || '';
    document.getElementById('v-transmission').value = data.transmission || 'MT';
    document.getElementById('v-color').value = data.color || '';
    document.getElementById('v-drive').value = data.driveSystem || 'RWD';
    document.getElementById('v-repaired').value = data.repaired || 'No repair history';
    document.getElementById('v-seating').value = data.seatingCapacity || '';
    document.getElementById('v-grade').value = data.grade || '';
    document.getElementById('v-description').value = data.description || '';
    document.getElementById('v-featured').value = data.featured || '';
    currentVehicleImages = data.images || [];
    renderPhotoPreviews();
    vehicleModal.classList.remove('hidden');
  }
}

async function deleteVehicle(id) {
  if (confirm('Are you sure you want to delete this vehicle? This action cannot be undone.')) {
    try {
      await deleteDoc(doc(db, 'vehicles', id));
    } catch (e) {
      handleFirestoreError(e, 'DELETE', `vehicles/${id}`);
    }
  }
}

const closeModal = () => {
  if (isUploading) {
    if (confirm('An upload is in progress. Are you sure you want to cancel and close?')) {
      uploadAbortController.abort();
    } else {
      return;
    }
  }
  vehicleModal.classList.add('hidden');
};

closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);

// Photo Upload
photoUploadArea.addEventListener('click', () => photoInput.click());

// Drag and drop support
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  photoUploadArea.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
  }, false);
});

photoUploadArea.addEventListener('dragover', () => {
  photoUploadArea.classList.add('border-secondary');
});

photoUploadArea.addEventListener('dragleave', () => {
  photoUploadArea.classList.remove('border-secondary');
});

photoUploadArea.addEventListener('drop', (e) => {
  photoUploadArea.classList.remove('border-secondary');
  const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
  handleFiles(files);
});

photoInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  handleFiles(files);
});

let isUploading = false;
let uploadAbortController = new AbortController();

async function handleFiles(files) {
  if (files.length === 0) {
    console.log("⚠️ No files selected");
    return;
  }

  // Reset abort controller for new upload batch
  uploadAbortController = new AbortController();
  
  console.log(`📸 Selected ${files.length} files for upload`);
  isUploading = true;
  saveVehicleBtn.disabled = true;
  saveBtnText.textContent = 'Uploading Photos...';
  photoUploadArea.classList.add('opacity-50', 'pointer-events-none');
  
  const uploadProgressBar = document.getElementById('upload-progress-bar');
  const uploadProgressContainer = document.getElementById('upload-progress-container');

  if (uploadStatus) {
    uploadStatus.textContent = `Starting upload of ${files.length} photos...`;
    uploadStatus.classList.remove('hidden');
    uploadProgressContainer.classList.remove('hidden');
    uploadProgressBar.style.width = '0%';
  }

  let count = 0;
  for (const file of files) {
    if (uploadAbortController.signal.aborted) {
      console.log("🛑 Upload aborted by user");
      break;
    }
    
    count++;
    if (uploadStatus) uploadStatus.textContent = `Uploading ${count} of ${files.length}: ${file.name}...`;
    
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageRef = ref(storage, `vehicles/${fileName}`);
    
    try {
      console.log(`📤 Starting resumable upload: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      window.logDebug(`📤 Starting upload: ${file.name}`);
      
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type || 'image/jpeg'
      });

      // Handle abort
      uploadAbortController.signal.addEventListener('abort', () => {
        uploadTask.cancel();
      });

      const url = await new Promise((resolve, reject) => {
        console.log(`🚀 Task created for ${file.name}`);
        if (uploadStatus) uploadStatus.textContent = `Uploading ${count} of ${files.length}: 0%`;

        // Set a 300-second timeout per file for better reliability
        const timeout = setTimeout(() => {
          console.error(`⏰ Timeout for ${file.name}`);
          window.logDebug(`⏰ Timeout for ${file.name}`, true);
          uploadTask.cancel();
          reject(new Error('Upload timed out. Please check your connection.'));
        }, 300000);

        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`📊 ${file.name}: ${progress.toFixed(1)}% done (${snapshot.state})`);
            window.logDebug(`📊 ${file.name}: ${progress.toFixed(1)}% (${snapshot.state})`);
            if (uploadStatus) uploadStatus.textContent = `Uploading ${count} of ${files.length}: ${progress.toFixed(0)}%`;
            if (uploadProgressBar) uploadProgressBar.style.width = `${progress}%`;
          }, 
          (error) => {
            clearTimeout(timeout);
            console.error(`❌ Upload task error for ${file.name}:`, error);
            window.logDebug(`❌ Upload error: ${file.name} - ${error.message}`, true);
            reject(error);
          }, 
          async () => {
            clearTimeout(timeout);
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          }
        );
      });
      
      console.log(`✅ Upload complete: ${file.name}`);
      currentVehicleImages.push(url);
      renderPhotoPreviews();
    } catch (err) {
      if (err.code === 'storage/canceled') {
        console.log(`🚫 Upload canceled for ${file.name}`);
      } else {
        console.error(`❌ Upload failed for ${file.name}:`, err);
        alert(`Failed to upload ${file.name}: ${err.message}`);
      }
    }
  }
  
  if (uploadAbortController.signal.aborted) {
    if (uploadStatus) uploadStatus.textContent = "Upload canceled.";
  } else {
    if (uploadStatus) uploadStatus.textContent = "All photos processed.";
  }
  
  isUploading = false;
  saveVehicleBtn.disabled = false;
  saveBtnText.textContent = isEditing ? 'Update Vehicle' : 'Save Vehicle';
  photoUploadArea.classList.remove('opacity-50', 'pointer-events-none');
  photoInput.value = ''; // Reset input
  
  setTimeout(() => {
    if (uploadStatus) uploadStatus.classList.add('hidden');
    if (uploadProgressContainer) uploadProgressContainer.classList.add('hidden');
  }, 3000);
}

function renderPhotoPreviews() {
  photoPreviewGrid.innerHTML = '';
  currentVehicleImages.forEach((url, index) => {
    const div = document.createElement('div');
    div.className = 'relative aspect-square rounded-xl overflow-hidden border border-slate-200 group';
    div.innerHTML = `
      <img src="${url}" class="w-full h-full object-cover">
      <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button type="button" id="remove-photo-${index}" class="p-1 bg-white rounded-full text-red-600 shadow-lg">
          <span class="material-symbols-outlined text-sm">delete</span>
        </button>
        ${index > 0 ? `<button type="button" id="make-featured-${index}" class="p-1 bg-white rounded-full text-secondary shadow-lg">
          <span class="material-symbols-outlined text-sm">star</span>
        </button>` : '<span class="bg-secondary text-white text-[8px] px-2 py-0.5 rounded-full absolute top-2 left-2 font-black">FEATURED</span>'}
      </div>
    `;
    photoPreviewGrid.appendChild(div);
    
    document.getElementById(`remove-photo-${index}`).addEventListener('click', () => removePhoto(index));
    if (index > 0) {
      document.getElementById(`make-featured-${index}`).addEventListener('click', () => makeFeatured(index));
    }
  });
}

function removePhoto(index) {
  currentVehicleImages.splice(index, 1);
  renderPhotoPreviews();
}

function makeFeatured(index) {
  const item = currentVehicleImages.splice(index, 1)[0];
  currentVehicleImages.unshift(item);
  renderPhotoPreviews();
}

// Connection Status Logic
function updateStatus(connected, message) {
  if (!connectionStatus) return;
  const dot = connectionStatus.querySelector('div');
  const text = connectionStatus.querySelector('span');
  
  if (connected) {
    dot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-500';
    text.textContent = 'Connected';
    connectionStatus.className = 'flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold';
  } else {
    dot.className = 'w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse';
    text.textContent = message || 'Retrying...';
    connectionStatus.className = 'flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold';
  }
}

// Helper for Firestore with Timeout and Retry
async function withTimeoutAndRetry(operation, label, maxRetries = 3, timeoutMs = 120000) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const attemptLabel = i > 0 ? `${label} (Retry ${i}/${maxRetries})` : label;
      console.log(`🚀 ${attemptLabel} starting...`);
      updateStatus(false, attemptLabel);
      
      const result = await Promise.race([
        operation(),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} Timeout`)), timeoutMs))
      ]);
      
      console.log(`✅ ${label} success!`);
      return result;
    } catch (err) {
      lastError = err;
      console.warn(`❌ Attempt ${i + 1} failed for ${label}:`, err);
      
      // If it's a timeout, try resetting the network
      if (err.message.includes('Timeout')) {
        console.log("🔄 Timeout detected, resetting network...");
        try {
          await disableNetwork(db);
          await new Promise(r => setTimeout(r, 1000));
          await enableNetwork(db);
        } catch (netErr) {
          console.error("Failed to reset network:", netErr);
        }
      }

      updateStatus(false, `Retrying ${label}...`);
      await new Promise(resolve => setTimeout(resolve, 3000 * (i + 1))); 
    }
  }
  throw lastError;
}

// Restore Initial Data
restoreDataBtn.addEventListener('click', async () => {
  if (!confirm('This will CLEAR ALL existing listings and restore the 4 initial vehicle listings. Continue?')) return;
  
  restoreDataBtn.disabled = true;
  restoreDataBtn.textContent = 'Restoring...';

  try {
    if (window.logDebug) window.logDebug("🚀 Starting inventory restore...");
    
    updateStatus(false, 'Connecting...');
    const snapshot = await withTimeoutAndRetry(() => getDocs(collection(db, 'vehicles')), 'Fetch Inventory');
    
    if (!snapshot.empty) {
      updateStatus(false, 'Clearing Old Data...');
      for (const vDoc of snapshot.docs) {
        await withTimeoutAndRetry(() => deleteDoc(doc(db, 'vehicles', vDoc.id)), `Deleting ${vDoc.id}`);
      }
    }
    console.log('Cleared existing inventory');

    updateStatus(false, 'Seeding New Data...');
    const reversedVehicles = [...initialVehicles].reverse();
    const batch = writeBatch(db);
    
    for (const v of reversedVehicles) {
      const docId = v.stockNumber.replace(/[^a-zA-Z0-9]/g, '_');
      const vehicleData = {
        ...v,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      batch.set(doc(db, 'vehicles', docId), vehicleData);
      if (window.logDebug) window.logDebug(`📝 Added to batch: ${v.title}`);
    }

    if (window.logDebug) window.logDebug("📤 Committing batch to cloud...");
    await withTimeoutAndRetry(() => batch.commit(), 'Batch Commit');
    
    updateStatus(true);
    if (window.logDebug) window.logDebug("✅ Inventory restore complete!");
    alert('Inventory reset and initial data restored successfully!');
    location.reload();
  } catch (e) {
    console.error('Error during restore:', e);
    updateStatus(false, 'Restore Failed');
    const errorMsg = e.message || String(e);
    if (window.logDebug) window.logDebug(`❌ Restore Failed: ${errorMsg}`, true);
    alert('Error restoring data: ' + errorMsg + '\n\nPlease check the Debug Console for details.');
  } finally {
    restoreDataBtn.disabled = false;
    restoreDataBtn.innerHTML = '<span class="material-symbols-outlined text-sm">history</span> Restore Initial Data';
  }
});

// Diagnostic: Check Default Database
checkDefaultDbBtn.addEventListener('click', async () => {
  if (!confirm('This will check the "(default)" database for any existing vehicle listings. Continue?')) return;
  
  checkDefaultDbBtn.disabled = true;
  checkDefaultDbBtn.textContent = 'Checking...';
  
  try {
    const app = getApp();
    const projId = firebaseConfig.projectId;
    console.log(`Checking Default DB for Project: ${projId}`);
    
    // Use a unique name for the diagnostic instance to avoid conflicts
    const diagDb = initializeFirestore(app, { 
      databaseId: '(default)',
      experimentalForceLongPolling: true 
    }, `diag-${Date.now()}`);
    
    const snapshot = await getDocs(collection(diagDb, 'vehicles'));
    
    if (snapshot.empty) {
      alert('The "(default)" database is also empty. No vehicles found there.');
      migrateDataBtn.classList.add('hidden');
    } else {
      const titles = snapshot.docs.map(d => d.data().title).join(', ');
      alert(`Found ${snapshot.size} vehicles in Default DB: ${titles}\n\nIf your Suzuki Jimny is in this list, it means it was saved to the wrong database. You can now use the "Migrate from Default DB" button to move them!`);
      migrateDataBtn.classList.remove('hidden');
    }
  } catch (e) {
    console.error('Error checking default DB:', e);
    alert('Error checking default DB: ' + e.message);
  } finally {
    checkDefaultDbBtn.disabled = false;
    checkDefaultDbBtn.innerHTML = '<span class="material-symbols-outlined text-xs">search</span> Check Default DB';
  }
});

// Emergency Cache Reset
clearCacheBtn.addEventListener('click', async () => {
  if (confirm('This will clear your browser\'s local database cache and reload the page. This can fix "Pending" or duplicate items. Continue?')) {
    try {
      await terminate(db);
    } catch (e) {
      console.error('Error terminating DB:', e);
    }
    window.location.reload();
  }
});

// Hard Reset (Clear IndexedDB and Cache)
hardResetBtn.addEventListener('click', async () => {
  if (!confirm('DANGER: This will completely wipe your local browser database and reload. This is the "nuclear option" for fixing sync issues. Continue?')) return;
  
  try {
    if (window.logDebug) window.logDebug("☢️ Performing Hard Reset...");
    await terminate(db);
    // Clear IndexedDB
    const dbName = `firestore/[post-storage]/${firebaseConfig.projectId}/${firebaseConfig.firestoreDatabaseId || '(default)'}/main`;
    const deleteRequest = indexedDB.deleteDatabase(dbName);
    deleteRequest.onsuccess = () => {
      if (window.logDebug) window.logDebug("✅ Local DB Deleted. Reloading...");
      window.location.reload();
    };
    deleteRequest.onerror = () => {
      if (window.logDebug) window.logDebug("❌ Failed to delete local DB. Reloading anyway...");
      window.location.reload();
    };
    deleteRequest.onblocked = () => {
      if (window.logDebug) window.logDebug("⚠️ DB Delete Blocked. Reloading...");
      window.location.reload();
    };
  } catch (e) {
    console.error("Hard reset error:", e);
    window.location.reload();
  }
});

// Clear All Cloud Data
clearAllDataBtn.addEventListener('click', async () => {
  if (!confirm('⚠️ DANGER: This will PERMANENTLY DELETE ALL vehicles from the cloud database. This cannot be undone. Are you absolutely sure?')) return;
  
  clearAllDataBtn.disabled = true;
  clearAllDataBtn.textContent = 'Deleting...';
  
  try {
    const snapshot = await getDocs(collection(db, 'vehicles'));
    let count = 0;
    for (const vDoc of snapshot.docs) {
      await deleteDoc(doc(db, 'vehicles', vDoc.id));
      count++;
    }
    alert(`Successfully deleted ${count} vehicles from the cloud.`);
    if (window.logDebug) window.logDebug(`🗑️ Deleted ${count} vehicles from cloud`);
  } catch (e) {
    console.error('Error clearing data:', e);
    alert('Failed to clear data: ' + e.message);
  } finally {
    clearAllDataBtn.disabled = false;
    clearAllDataBtn.innerHTML = '<span class="material-symbols-outlined text-xs">delete_sweep</span> Clear All Cloud Data';
  }
});

// Force Cloud Sync
forceSyncBtn.addEventListener('click', () => loadVehicles(true));

// Debug Info
debugInfoBtn.addEventListener('click', async () => {
  if (window.showDebug) window.showDebug();
  
  if (window.logDebug) window.logDebug("🔍 Running connection diagnostics...");
  
  const info = {
    auth: auth.currentUser ? { uid: auth.currentUser.uid, email: auth.currentUser.email, verified: auth.currentUser.emailVerified } : 'Not Logged In',
    dbId: firebaseConfig.firestoreDatabaseId,
    projectId: firebaseConfig.projectId,
    online: navigator.onLine,
    userAgent: navigator.userAgent.substring(0, 50) + '...'
  };
  
  if (window.logDebug) window.logDebug(`🛠️ Environment: ${JSON.stringify(info)}`);

  // Network Ping Test
  try {
    if (window.logDebug) window.logDebug("🌐 Testing Internet Access (Ping)...");
    const start = Date.now();
    await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-store' });
    if (window.logDebug) window.logDebug(`✅ Internet Reachable (${Date.now() - start}ms)`);
  } catch (e) {
    if (window.logDebug) window.logDebug(`⚠️ Internet Ping Failed (This is normal in some restricted environments)`, true);
  }

  // Test Write
  if (auth.currentUser) {
    try {
      if (window.logDebug) window.logDebug(`📡 Testing Cloud Write (DB: ${firebaseConfig.firestoreDatabaseId})...`);
      const testDoc = doc(db, '_debug', auth.currentUser.uid);
      await withTimeoutAndRetry(() => setDoc(testDoc, { 
        lastTest: serverTimestamp(),
        email: auth.currentUser.email 
      }), 'Connection Test Write', 1, 20000);
      if (window.logDebug) window.logDebug("✅ Cloud Write Successful!");
    } catch (e) {
      if (window.logDebug) window.logDebug(`❌ Cloud Write Failed: ${e.message}`, true);
    }
  } else {
    if (window.logDebug) window.logDebug("⚠️ Cannot test write: Not logged in.");
  }
});

// Migration Logic
migrateDataBtn.addEventListener('click', async () => {
  if (!confirm('This will COPY all vehicles from the "(default)" database to the current database. Existing vehicles with the same stock number will be updated. Continue?')) return;
  
  migrateDataBtn.disabled = true;
  migrateDataBtn.textContent = 'Migrating...';
  
  try {
    const app = getApp();
    const diagDb = initializeFirestore(app, { databaseId: '(default)' }, `migrate-${Date.now()}`);
    const snapshot = await getDocs(collection(diagDb, 'vehicles'));
    
    if (snapshot.empty) {
      alert('No vehicles found to migrate.');
      return;
    }

    let count = 0;
    for (const vDoc of snapshot.docs) {
      const data = vDoc.data();
      // Check if it already exists in current DB by stock number
      const currentSnapshot = await getDocs(collection(db, 'vehicles'));
      const existing = currentSnapshot.docs.find(d => d.data().stockNumber === data.stockNumber);
      
      if (existing) {
        await updateDoc(doc(db, 'vehicles', existing.id), { ...data, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'vehicles'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
      count++;
    }
    
    alert(`Successfully migrated ${count} vehicles!`);
    migrateDataBtn.classList.add('hidden');
  } catch (e) {
    console.error('Migration error:', e);
    alert('Migration failed: ' + e.message);
  } finally {
    migrateDataBtn.disabled = false;
    migrateDataBtn.innerHTML = '<span class="material-symbols-outlined text-xs">move_down</span> Migrate from Default DB';
  }
});

// Save Logic
saveVehicleBtn.addEventListener('click', async () => {
  if (isUploading) {
    alert('Please wait for photos to finish uploading.');
    return;
  }

  if (!vehicleForm.checkValidity()) {
    vehicleForm.reportValidity();
    return;
  }

  if (currentVehicleImages.length === 0) {
    alert('Please upload at least one photo.');
    return;
  }

  saveBtnText.classList.add('hidden');
  saveLoader.classList.remove('hidden');
  saveVehicleBtn.disabled = true;

  const vehicleData = {
    title: document.getElementById('v-title').value,
    stockNumber: document.getElementById('v-stock').value,
    status: document.getElementById('v-status').value,
    price: Number(document.getElementById('v-price').value),
    year: Number(document.getElementById('v-year').value),
    mileage: Number(document.getElementById('v-mileage').value),
    displacement: Number(document.getElementById('v-displacement').value),
    transmission: document.getElementById('v-transmission').value,
    color: document.getElementById('v-color').value,
    driveSystem: document.getElementById('v-drive').value,
    repaired: document.getElementById('v-repaired').value,
    seatingCapacity: Number(document.getElementById('v-seating').value),
    grade: document.getElementById('v-grade').value,
    description: document.getElementById('v-description').value,
    featured: Number(document.getElementById('v-featured').value) || 99,
    images: currentVehicleImages,
    updatedAt: serverTimestamp()
  };

  try {
    const id = document.getElementById('vehicle-id').value;
    if (isEditing && id) {
      await updateDoc(doc(db, 'vehicles', id), vehicleData);
    } else {
      vehicleData.createdAt = serverTimestamp();
      await addDoc(collection(db, 'vehicles'), vehicleData);
    }
    closeModal();
  } catch (e) {
    handleFirestoreError(e, isEditing ? 'UPDATE' : 'CREATE', 'vehicles');
  } finally {
    saveBtnText.classList.remove('hidden');
    saveLoader.classList.add('hidden');
    saveVehicleBtn.disabled = false;
  }
});
