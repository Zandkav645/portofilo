let isAdminLoggedIn = false;

function handleAdminLogin(e) {
  e.preventDefault();
  const pin = document.getElementById('admin-pin-input').value;
  if (pin === '080311') {
    isAdminLoggedIn = true;
    document.getElementById('admin-login-view').classList.add('hidden');
    document.getElementById('admin-dashboard-view').classList.remove('hidden');
    document.getElementById('edit-bio-name').value = db.bio.name;
    document.getElementById('edit-bio-avatar').value = db.bio.avatar;
    document.getElementById('edit-bio-summary').value = db.bio.summary;
    renderAdminLists();
  } else {
    alert('PIN Admin Salah! Gunakan PIN default: kontolodon');
  }
}

function handleAdminLogout() {
  isAdminLoggedIn = false;
  document.getElementById('admin-login-view').classList.remove('hidden');
  document.getElementById('admin-dashboard-view').classList.add('hidden');
  document.getElementById('admin-pin-input').value = '';
}

function switchAdminTab(tabName) {
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('bg-cyan-500', 'text-navy-900');
      btn.classList.remove('text-slate-400');
    } else {
      btn.classList.remove('bg-cyan-500', 'text-navy-900');
      btn.classList.add('text-slate-400');
    }
  });
  document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
  document.getElementById(`admin-tab-${tabName}`).classList.remove('hidden');
}

function renderAdminLists() {
  if (!isAdminLoggedIn) return;

  const swList = document.getElementById('admin-sw-list');
  swList.innerHTML = '';
  db.swStories.forEach(story => {
    swList.innerHTML += `
      <div class="p-3 bg-navy-900 border border-slate-700 rounded-xl space-y-2">
        <img src="${story.image}" class="w-full h-24 object-cover rounded-lg">
        <p class="text-xs text-white truncate font-medium">${story.caption}</p>
        <button onclick="adminDeleteSW(${story.id})" class="w-full py-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded text-[10px]">Hapus Story</button>
      </div>`;
  });

  const schoolList = document.getElementById('admin-school-list');
  schoolList.innerHTML = '';
  db.schoolPhotos.forEach(item => {
    schoolList.innerHTML += `
      <div class="p-4 bg-navy-900 border border-slate-700 rounded-xl flex items-center justify-between gap-4">
        <div class="flex items-center space-x-3">
          <img src="${item.image}" class="w-16 h-16 object-cover rounded-lg">
          <div><h4 class="text-sm font-bold text-white">${item.title}</h4><p class="text-xs text-slate-400 line-clamp-1">${item.description}</p></div>
        </div>
        <button onclick="adminDeleteSchool(${item.id})" class="px-3 py-1.5 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded text-xs">Hapus</button>
      </div>`;
  });

  const achList = document.getElementById('admin-ach-list');
  achList.innerHTML = '';
  db.achievements.forEach(item => {
    achList.innerHTML += `
      <div class="p-3 bg-navy-900 border border-slate-700 rounded-xl flex items-center justify-between">
        <span class="text-xs font-bold text-white">${item.title} (${item.badge})</span>
        <button onclick="adminDeleteAch(${item.id})" class="px-3 py-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded text-xs">Hapus</button>
      </div>`;
  });

  const galList = document.getElementById('admin-gal-list');
  galList.innerHTML = '';
  db.gallery.forEach(item => {
    galList.innerHTML += `
      <div class="p-3 bg-navy-900 border border-slate-700 rounded-xl space-y-2">
        <img src="${item.image}" class="w-full h-24 object-cover rounded-lg">
        <p class="text-xs text-white truncate">${item.title}</p>
        <button onclick="adminDeleteGal(${item.id})" class="w-full py-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded text-[10px]">Hapus</button>
      </div>`;
  });
}

/* ==== CRUD: UPLOAD DARI FILE ==== */

async function adminAddSW(e) {
  e.preventDefault();
  const file = document.getElementById('sw-image-file').files[0];
  if (!file) return alert('Pilih foto terlebih dahulu!');
  const imageData = await readFileAsDataURL(file);
  db.swStories.unshift({
    id: Date.now(),
    image: imageData,
    caption: document.getElementById('sw-caption').value,
    timestamp: Date.now()
  });
  saveData(db);
  e.target.reset();
  document.getElementById('sw-preview').classList.add('hidden');
  alert('Status SW berhasil ditambahkan!');
}

async function adminAddSchoolPhoto(e) {
  e.preventDefault();
  const file = document.getElementById('school-image-file').files[0];
  if (!file) return alert('Pilih foto terlebih dahulu!');
  const imageData = await readFileAsDataURL(file);
  db.schoolPhotos.push({
    id: Date.now(),
    title: document.getElementById('school-title').value,
    image: imageData,
    description: document.getElementById('school-desc').value
  });
  saveData(db);
  e.target.reset();
  document.getElementById('school-preview').classList.add('hidden');
  alert('Foto sekolah berhasil ditambahkan!');
}

async function adminAddAchievement(e) {
  e.preventDefault();
  const file = document.getElementById('ach-image-file').files[0];
  if (!file) return alert('Pilih foto terlebih dahulu!');
  const imageData = await readFileAsDataURL(file);
  db.achievements.push({
    id: Date.now(),
    title: document.getElementById('ach-title').value,
    badge: document.getElementById('ach-badge').value,
    image: imageData,
    description: document.getElementById('ach-desc').value
  });
  saveData(db);
  e.target.reset();
  document.getElementById('ach-preview').classList.add('hidden');
  alert('Prestasi berhasil ditambahkan!');
}

async function adminAddGallery(e) {
  e.preventDefault();
  const file = document.getElementById('gal-image-file').files[0];
  if (!file) return alert('Pilih foto terlebih dahulu!');
  const imageData = await readFileAsDataURL(file);
  db.gallery.push({
    id: Date.now(),
    title: document.getElementById('gal-title').value,
    image: imageData,
    description: document.getElementById('gal-desc').value
  });
  saveData(db);
  e.target.reset();
  document.getElementById('gal-preview').classList.add('hidden');
  alert('Galeri berhasil ditambahkan!');
}

function adminDeleteSW(id) { db.swStories = db.swStories.filter(s => s.id !== id); saveData(db); }
function adminDeleteSchool(id) { db.schoolPhotos = db.schoolPhotos.filter(s => s.id !== id); saveData(db); }
function adminDeleteAch(id) { db.achievements = db.achievements.filter(s => s.id !== id); saveData(db); }
function adminDeleteGal(id) { db.gallery = db.gallery.filter(s => s.id !== id); saveData(db); }

function adminSaveBio(e) {
  e.preventDefault();
  db.bio.name = document.getElementById('edit-bio-name').value;
  db.bio.avatar = document.getElementById('edit-bio-avatar').value;
  db.bio.summary = document.getElementById('edit-bio-summary').value;
  saveData(db);
  alert('Biodata berhasil diperbarui!');
}
