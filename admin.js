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
  setDoc,
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject
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
  try {
    await login();
  } catch (e) {
    console.error("Login error:", e);
    authError.textContent = e.message;
    authError.classList.remove('hidden');
  }
});

logoutBtn.addEventListener('click', () => logout());

// Load Vehicles
function loadVehicles() {
  vehicleList.innerHTML = '<tr><td colspan="6" class="px-6 py-12 text-center text-slate-400 font-bold">Loading inventory...</td></tr>';
  const q = query(collection(db, 'vehicles'), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      vehicleList.innerHTML = '<tr><td colspan="6" class="px-6 py-12 text-center text-slate-400 font-bold">No vehicles found. Add your first listing!</td></tr>';
      return;
    }
    allVehiclesAdmin = [];
    snapshot.forEach(doc => allVehiclesAdmin.push({ id: doc.id, ...doc.data() }));
    renderAdminList();
  }, (err) => handleFirestoreError(err, 'LIST', 'vehicles'));
}

function renderAdminList() {
  const sortVal = adminSort.value;
  let sorted = [...allVehiclesAdmin];

  sorted.sort((a, b) => {
    const timeA = (a.createdAt && typeof a.createdAt.toMillis === 'function') ? a.createdAt.toMillis() : 0;
    const timeB = (b.createdAt && typeof b.createdAt.toMillis === 'function') ? b.createdAt.toMillis() : 0;
    
    if (sortVal === 'date-new') return timeB - timeA;
    if (sortVal === 'date-old') return timeA - timeB;
    if (sortVal === 'stock-asc') return a.stockNumber.localeCompare(b.stockNumber);
    if (sortVal === 'stock-desc') return b.stockNumber.localeCompare(a.stockNumber);
    return 0;
  });

  vehicleList.innerHTML = '';
  sorted.forEach((data) => {
    const dateStr = data.createdAt ? data.createdAt.toDate().toISOString().split('T')[0] : 'Pending...';
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition-colors block md:table-row border-b md:border-none';
    tr.innerHTML = `
      <td class="px-4 py-4 md:px-6 block md:table-cell">
        <div class="flex items-center gap-3">
          <img src="${data.images[0]}" class="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0">
          <div class="min-w-0 flex-1">
            <div class="font-bold text-sm truncate" title="${data.title}">${data.title}</div>
            <div class="text-xs text-slate-400">${data.year} • ${data.transmission}</div>
          </div>
        </div>
      </td>
      <td class="px-4 py-2 md:px-6 md:py-4 text-xs md:text-sm text-slate-500 font-medium block md:table-cell">
        <span class="md:hidden text-slate-400 font-bold uppercase mr-2">Added:</span>${dateStr}
      </td>
      <td class="px-4 py-2 md:px-6 md:py-4 text-xs md:text-sm font-medium text-slate-500 block md:table-cell">
        <span class="md:hidden text-slate-400 font-bold uppercase mr-2">Stock:</span>${data.stockNumber}
      </td>
      <td class="px-4 py-2 md:px-6 md:py-4 block md:table-cell">
        <span class="md:hidden text-slate-400 font-bold uppercase mr-2">Status:</span>
        <span class="px-2 py-1 rounded text-[10px] font-black tracking-widest ${
          data.status === 'IN STOCK' ? 'bg-green-100 text-green-700' : 
          data.status === 'RESERVED' ? 'bg-amber-100 text-amber-700' : 
          'bg-blue-100 text-blue-700'
        }">${data.status}</span>
      </td>
      <td class="px-4 py-2 md:px-6 md:py-4 text-sm font-bold block md:table-cell">
        <span class="md:hidden text-slate-400 font-bold uppercase mr-2">Price:</span>
        <span class="text-secondary">¥${parseInt(data.price).toLocaleString()}</span>
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

        // Set a 120-second timeout per file for better reliability
        const timeout = setTimeout(() => {
          console.error(`⏰ Timeout for ${file.name}`);
          uploadTask.cancel();
          reject(new Error('Upload timed out. Please check your connection.'));
        }, 120000);

        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`📊 ${file.name}: ${progress.toFixed(1)}% done (${snapshot.state})`);
            if (uploadStatus) uploadStatus.textContent = `Uploading ${count} of ${files.length}: ${progress.toFixed(0)}%`;
            if (uploadProgressBar) uploadProgressBar.style.width = `${progress}%`;
          }, 
          (error) => {
            clearTimeout(timeout);
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

// Restore Initial Data
restoreDataBtn.addEventListener('click', async () => {
  if (!confirm('This will CLEAR ALL existing listings and restore the 4 initial vehicle listings. Continue?')) return;
  
  restoreDataBtn.disabled = true;
  restoreDataBtn.textContent = 'Restoring...';

  try {
    const snapshot = await getDocs(collection(db, 'vehicles'));
    const deletePromises = snapshot.docs.map(vDoc => deleteDoc(doc(db, 'vehicles', vDoc.id)));
    await Promise.all(deletePromises);
    console.log('Cleared existing inventory');

    const reversedVehicles = [...initialVehicles].reverse();
    for (const v of reversedVehicles) {
      v.createdAt = serverTimestamp();
      v.updatedAt = serverTimestamp();
      await addDoc(collection(db, 'vehicles'), v);
      // Small delay to ensure distinct timestamps for ordering
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    alert('Inventory reset and initial data restored successfully!');
    
    // Also seed a default landing page config
    const firstFour = reversedVehicles.slice(0, 4);
    const landingConfig = {
      mainFeatured: {
        vehicleId: '', // Will be filled below
        photoUrl: firstFour[0].images[0],
        description: firstFour[0].description.substring(0, 150) + '...'
      },
      secondaryFeatured: firstFour.slice(1).map(v => ({
        vehicleId: '', // Will be filled below
        photoUrl: v.images[0]
      })),
      updatedAt: serverTimestamp()
    };

    // We need the actual IDs from the newly created docs
    const newSnapshot = await getDocs(collection(db, 'vehicles'));
    const newDocs = newSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Match by stock number
    const mainDoc = newDocs.find(d => d.stockNumber === firstFour[0].stockNumber);
    if (mainDoc) landingConfig.mainFeatured.vehicleId = mainDoc.id;
    
    landingConfig.secondaryFeatured = firstFour.slice(1).map(v => {
      const d = newDocs.find(doc => doc.stockNumber === v.stockNumber);
      return { vehicleId: d ? d.id : '', photoUrl: v.images[0] };
    });

    await setDoc(doc(db, 'settings', 'landingPage'), landingConfig);
    console.log('Default landing page config seeded');

  } catch (e) {
    console.error('Error during restore:', e);
    alert('Error restoring data: ' + e.message);
  } finally {
    restoreDataBtn.disabled = false;
    restoreDataBtn.innerHTML = '<span class="material-symbols-outlined text-sm">history</span> Restore Initial Data';
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
