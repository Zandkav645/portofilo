function loadData() {
  const key = 'rivaldy_portfolio_db';
  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      const initial = JSON.parse(JSON.stringify(DEFAULT_DATA));
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Format data portofolio tidak valid');
    }
    const data = { ...JSON.parse(JSON.stringify(DEFAULT_DATA)), ...parsed };
    data.bio = { ...(DEFAULT_DATA.bio || {}), ...(parsed.bio || {}) };
    data.pageTexts = { ...(DEFAULT_DATA.pageTexts || {}), ...(parsed.pageTexts || {}) };
    ['swStories', 'schoolPhotos', 'achievements', 'gallery', 'historyLogs'].forEach(k => {
      if (!Array.isArray(data[k])) data[k] = Array.isArray(DEFAULT_DATA[k]) ? [...DEFAULT_DATA[k]] : [];
    });
    return data;
  } catch (err) {
    console.error('Gagal memuat data portofolio:', err);
    alert('Data portofolio tidak dapat dibaca. Data lama tidak dihapus. Periksa penyimpanan browser.');
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

// Memuat Firebase Storage secara dinamis agar cukup mengganti app.js.
let portfolioStorageSdkPromise = null;
function ensurePortfolioStorage() {
  if (window.firebase && typeof window.firebase.storage === 'function') return Promise.resolve(window.firebase.storage());
  if (!portfolioStorageSdkPromise) {
    portfolioStorageSdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js';
      script.onload = () => {
        if (window.firebase && typeof window.firebase.storage === 'function') resolve(window.firebase.storage());
        else reject(new Error('Firebase Storage SDK gagal dimuat.'));
      };
      script.onerror = () => reject(new Error('SDK Firebase Storage tidak dapat dimuat. Periksa koneksi internet.'));
      document.head.appendChild(script);
    });
  }
  return portfolioStorageSdkPromise;
}

// Foto data URL diunggah ke Storage; Firestore hanya menyimpan URL agar dokumen tidak terlalu besar.
async function replaceInlineImagesWithStorageUrls(value, storage, path = 'portfolio-images') {
  if (typeof value === 'string' && /^data:image\//i.test(value)) {
    const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    const contentType = match ? match[1] : 'image/jpeg';
    const extension = (contentType.split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace(/[^a-z0-9]/gi, '');
    const objectPath = `${path}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
    const ref = storage.ref().child(objectPath);
    await ref.putString(value, 'data_url', { contentType });
    return await ref.getDownloadURL();
  }
  if (Array.isArray(value)) {
    const result = [];
    for (const item of value) result.push(await replaceInlineImagesWithStorageUrls(item, storage, path));
    return result;
  }
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, item] of Object.entries(value)) result[key] = await replaceInlineImagesWithStorageUrls(item, storage, path);
    return result;
  }
  return value;
}

async function syncPortfolioDataOnline(data) {
  if (!(window.portfolioAuth && window.portfolioDb && window.portfolioDataRef)) return;
  const user = window.portfolioAuth.currentUser;
  if (!user || user.uid !== window.PORTFOLIO_ADMIN_UID) {
    throw new Error('Admin belum login dengan akun Firebase yang diizinkan. Keluar lalu login memakai email admin Firebase.');
  }
  const storage = await ensurePortfolioStorage();
  const cloudPayload = JSON.parse(JSON.stringify(data));
  cloudPayload.historyLogs = (cloudPayload.historyLogs || []).map(log => ({ ...log, ip: 'Tidak dicatat' }));
  const payloadWithUrls = await replaceInlineImagesWithStorageUrls(cloudPayload, storage);
  // Ganti data URL lokal dengan URL Storage agar gambar tidak diunggah ulang setiap kali menyimpan.
  localStorage.setItem('rivaldy_portfolio_db', JSON.stringify(payloadWithUrls));
  db = payloadWithUrls;
  renderAllContent();
  await window.portfolioDataRef.set(payloadWithUrls);
  console.info('Data portofolio berhasil disinkronkan ke Firestore.');
}

function saveData(data) {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem('rivaldy_portfolio_db', serialized);
    db = data;
    renderAllContent();
    if (isAdminLoggedIn) {
      renderAdminLists();
      renderAdminLogs();
    }

    // Simpan lokal langsung, lalu sinkronkan online secara asinkron.
    if (window.portfolioAuth && window.portfolioDb && window.portfolioAuth.currentUser &&
        window.portfolioAuth.currentUser.uid === window.PORTFOLIO_ADMIN_UID) {
      syncPortfolioDataOnline(data).catch((err) => {
        console.error('Gagal menyimpan ke Firebase:', err);
        const detail = err && (err.code || err.message) ? `${err.code || 'error'}: ${err.message || ''}` : 'Kesalahan tidak diketahui';
        alert(`Data tersimpan di browser, tetapi gagal online. Detail: ${detail}. Pastikan Firebase Storage aktif dan Rules Storage mengizinkan admin.`);
      });
    } else if (isAdminLoggedIn) {
      alert('Data tersimpan di browser, tetapi akun admin Firebase tidak terdeteksi. Keluar lalu login kembali dengan email Firebase admin.');
    }
    return true;
  } catch (err) {
    console.error('Gagal menyimpan data portofolio:', err);
    const message = err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      ? 'Penyimpanan browser penuh. Kurangi ukuran/jumlah foto lalu coba lagi.'
      : 'Perubahan gagal disimpan. Coba lagi dan periksa konsol browser.';
    alert(message);
    return false;
  }
}

let db = loadData();

// Fungsi untuk mencatat log ke folder history
function recordLog(actionType, description) {
  // Tidak mengambil alamat IP pengunjung untuk menjaga privasi.
  if (!db.historyLogs) db.historyLogs = [];
  saveLogEntry(actionType, description, 'Tidak dicatat');
}
function saveLogEntry(actionType, description, ipAddress) {
  const newLog = {
    id: Date.now(),
    type: actionType, // 'PENGUNJUNG' atau 'ADMIN_EDIT'
    ip: ipAddress,
    desc: description,
    time: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'medium' })
  };
  
  db.historyLogs.unshift(newLog);
  if (db.historyLogs.length > 50) db.historyLogs.pop();
  
  localStorage.setItem('rivaldy_portfolio_db', JSON.stringify(db));
  renderAdminLogs();
}

function renderAdminLogs() {
  const container = document.getElementById('admin-logs-container');
  if (!container) return;
  
  if (!db.historyLogs || db.historyLogs.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-500 italic text-center py-4">Belum ada riwayat aktivitas dalam folder log.</p>`;
    return;
  }
  
  container.innerHTML = '';
  db.historyLogs.forEach(log => {
    const badgeColor = log.type === 'ADMIN_EDIT' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    container.innerHTML += `
      <div class="p-3 bg-navy-900/90 border border-slate-700 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-full font-mono text-[10px] border ${badgeColor}">${log.type}</span>
            <span class="text-slate-400 font-mono"><i class="fa-solid fa-network-wired text-cyan-400 mr-1"></i> IP: ${log.ip}</span>
          </div>
          <p class="text-slate-200 font-medium">${log.desc}</p>
        </div>
        <span class="text-[10px] text-slate-500 font-mono whitespace-nowrap">${log.time}</span>
      </div>
    `;
  });
}

function clearHistoryLogs() {
  if (confirm('Yakin ingin menghapus seluruh riwayat log di folder ini?')) {
    db.historyLogs = [];
    saveData(db);
    renderAdminLogs();
  }
}

function getActiveSWStories() {
  const now = Date.now();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  return db.swStories.filter(story => (now - story.timestamp) < TWENTY_FOUR_HOURS);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

const routes = {
  '#/': 'page-home',
  '#/profil': 'page-profile',
  '#/sekolah': 'page-school',
  '#/prestasi': 'page-achievements',
  '#/galeri': 'page-gallery',
  '#/admin': 'page-admin'
};

function handleRouting() {
  let hash = window.location.hash || '#/';
  if (!routes[hash]) hash = '#/';

  document.querySelectorAll('.page-section').forEach(sec => {
    sec.classList.remove('active');
  });

  const targetId = routes[hash];
  const targetPage = document.getElementById(targetId);
  if (targetPage) {
    targetPage.classList.add('active');
  }

  document.getElementById('current-page-label').innerText = hash;

  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.getAttribute('data-hash') === hash) {
      btn.classList.add('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/40');
    } else {
      btn.classList.remove('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/40');
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('hashchange', handleRouting);
window.addEventListener('DOMContentLoaded', async () => {
  handleRouting();
  initParticles();
  // Data lokal tampil dulu; bila Firestore tersedia, data cloud menjadi sumber utama.
  renderAllContent();
  try {
    if (window.portfolioDataRef) {
      const snapshot = await window.portfolioDataRef.get();
      if (snapshot.exists) {
        const cloudData = snapshot.data();
        if (cloudData && typeof cloudData === 'object') {
          db = { ...db, ...cloudData };
          db.historyLogs = (db.historyLogs || []).map(log => ({ ...log, ip: 'Tidak dicatat' }));
          db.bio = { ...(DEFAULT_DATA.bio || {}), ...(db.bio || {}) };
          db.pageTexts = { ...(DEFAULT_DATA.pageTexts || {}), ...(db.pageTexts || {}) };
          ['swStories', 'schoolPhotos', 'achievements', 'gallery', 'historyLogs'].forEach(k => {
            if (!Array.isArray(db[k])) db[k] = [];
          });
          localStorage.setItem('rivaldy_portfolio_db', JSON.stringify(db));
          renderAllContent();
        }
      }
    }
  } catch (err) {
    console.warn('Data cloud belum dapat dimuat; menggunakan data lokal:', err);
  }
  recordLog('PENGUNJUNG', `Mengunjungi halaman portofolio (${window.location.hash || '#/'})`);
});

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar-drawer');
  const overlay = document.getElementById('sidebar-overlay');
  const isOpen = sidebar.classList.contains('open');

  if (isOpen) {
    sidebar.classList.remove('open');
    overlay.classList.add('hidden');
    overlay.classList.add('opacity-0');
  } else {
    sidebar.classList.add('open');
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.classList.remove('opacity-0'), 10);
  }
}

function renderAllContent() {
  document.getElementById('header-name').innerText = db.bio.name;
  document.getElementById('header-school').innerText = db.bio.school;
  document.getElementById('sidebar-footer-school').innerText = db.bio.school;
  document.getElementById('footer-name').innerText = db.bio.name;
  document.getElementById('footer-school').innerText = db.bio.school;
  document.getElementById('admin-banner-name').innerText = db.bio.name;

  document.getElementById('home-profile-name').innerText = db.bio.name;
  document.getElementById('home-profile-bio').innerText = db.bio.summary;
  document.getElementById('home-avatar-img').src = db.bio.avatar;
  document.getElementById('stat-school').innerText = db.bio.school;
  document.getElementById('stat-location').innerText = db.bio.location;
  
  document.getElementById('profile-page-avatar').src = db.bio.avatar;
  document.getElementById('profile-page-name').innerText = db.bio.name;
  document.getElementById('profile-page-sub').innerText = "Siswa TOI - " + db.bio.school;
  document.getElementById('profile-page-story-1').innerText = db.bio.story1;
  document.getElementById('profile-page-story-2').innerText = db.bio.story2;
  document.getElementById('profile-page-story-3').innerText = db.bio.story3;

  if(db.pageTexts) {
    document.getElementById('profile-title').innerText = db.pageTexts.profileTitle || "Profil Lengkap & Cerita Saya";
    document.getElementById('school-heading-title').innerText = db.pageTexts.schoolHeadingTitle || "SMK SMTI Pontianak";
    document.getElementById('school-heading-sub').innerText = db.pageTexts.schoolHeadingSub || "";
    document.getElementById('school-intro-text').innerText = db.pageTexts.schoolIntroText || "";
    document.getElementById('achievements-heading-title').innerText = db.pageTexts.achievementsHeadingTitle || "Prestasi & Sertifikasi";
    document.getElementById('achievements-heading-sub').innerText = db.pageTexts.achievementsHeadingSub || "";
    document.getElementById('gallery-heading-title').innerText = db.pageTexts.galleryHeadingTitle || "Galeri Karya & Kegiatan";
    document.getElementById('gallery-heading-sub').innerText = db.pageTexts.galleryHeadingSub || "";
  }

  const activeSWs = getActiveSWStories();
  const ring = document.getElementById('story-ring-container');
  const badge = document.getElementById('story-badge');
  if (activeSWs.length > 0) {
    ring.classList.add('story-ring-active');
    badge.classList.remove('hidden');
  } else {
    ring.classList.remove('story-ring-active');
    badge.classList.add('hidden');
  }

  const homeAchContainer = document.getElementById('home-achievements-preview');
  homeAchContainer.innerHTML = '';
  db.achievements.slice(0, 2).forEach(item => {
    homeAchContainer.innerHTML += `
      <div class="glass-card p-5 rounded-2xl border border-cyan-500/20 flex gap-4 items-center glass-card-hover">
        <img src="${item.image}" class="w-20 h-20 rounded-xl object-cover border border-cyan-500/30">
        <div>
          <span class="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">${item.badge}</span>
          <h4 class="font-bold text-white text-sm mt-1">${item.title}</h4>
          <p class="text-xs text-slate-400 line-clamp-2 mt-0.5">${item.description}</p>
        </div>
      </div>
    `;
  });

  const schoolContainer = document.getElementById('school-photos-container');
  schoolContainer.innerHTML = '';
  db.schoolPhotos.forEach(item => {
    schoolContainer.innerHTML += `
      <div class="glass-card rounded-2xl border border-slate-700/80 overflow-hidden glass-card-hover flex flex-col">
        <div class="h-56 sm:h-64 overflow-hidden relative">
          <img src="${item.image}" alt="${item.title}" class="w-full h-full object-cover transition transform duration-500 hover:scale-105">
        </div>
        <div class="p-5 flex-1 flex flex-col justify-between space-y-2 bg-navy-900/60">
          <h3 class="font-bold text-white text-base text-cyan-300">${item.title}</h3>
          <p class="text-xs text-slate-300 leading-relaxed">${item.description}</p>
        </div>
      </div>
    `;
  });

  const achContainer = document.getElementById('achievements-container');
  achContainer.innerHTML = '';
  db.achievements.forEach(item => {
    achContainer.innerHTML += `
      <div class="glass-card rounded-2xl border border-slate-700 overflow-hidden glass-card-hover flex flex-col justify-between">
        <div>
          <img src="${item.image}" class="w-full h-44 object-cover">
          <div class="p-5 space-y-2">
            <span class="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-500/30">${item.badge}</span>
            <h3 class="font-bold text-white text-base">${item.title}</h3>
            <p class="text-xs text-slate-300 leading-relaxed">${item.description}</p>
          </div>
        </div>
      </div>
    `;
  });

  const galContainer = document.getElementById('gallery-container');
  galContainer.innerHTML = '';
  db.gallery.forEach(item => {
    galContainer.innerHTML += `
      <div class="glass-card rounded-2xl border border-slate-700 overflow-hidden glass-card-hover">
        <img src="${item.image}" class="w-full h-48 object-cover">
        <div class="p-4 space-y-1">
          <h4 class="font-bold text-white text-sm">${item.title}</h4>
          <p class="text-xs text-slate-400">${item.description}</p>
        </div>
      </div>
    `;
  });

  renderAdminLists();
}

let currentStoryIndex = 0;
let storyTimer = null;
let storyProgressInterval = null;
let storyProgressPercent = 0;
let isPaused = false;

function openStoryViewer() {
  const activeSWs = getActiveSWStories();
  if (activeSWs.length === 0) {
    alert('Belum ada Status SW 24 jam yang diupload. Anda dapat menambahkan lewat Halaman Admin (/#/admin)!');
    return;
  }

  currentStoryIndex = 0;
  document.getElementById('story-modal').classList.remove('hidden');
  document.getElementById('story-modal').classList.add('flex');
  showStory(currentStoryIndex);
}

function closeStoryViewer() {
  document.getElementById('story-modal').classList.add('hidden');
  document.getElementById('story-modal').classList.remove('flex');
  clearTimeout(storyTimer);
  clearInterval(storyProgressInterval);
}

function showStory(index) {
  const activeSWs = getActiveSWStories();
  if (index < 0 || index >= activeSWs.length) {
    closeStoryViewer();
    return;
  }

  currentStoryIndex = index;
  const story = activeSWs[index];

  document.getElementById('story-header-avatar').src = db.bio.avatar;
  document.getElementById('story-header-name').innerText = db.bio.name;
  document.getElementById('story-viewer-img').src = story.image;
  document.getElementById('story-viewer-caption').innerText = story.caption;

  const hoursAgo = Math.floor((Date.now() - story.timestamp) / (1000 * 3600));
  document.getElementById('story-header-time').innerText = `${hoursAgo}j lalu`;

  const progressContainer = document.getElementById('story-progress-bar-list');
  progressContainer.innerHTML = '';
  activeSWs.forEach((_, i) => {
    progressContainer.innerHTML += `
      <div class="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
        <div id="story-progress-fill-${i}" class="h-full bg-cyan-400 transition-all duration-100" style="width: ${i < index ? '100%' : '0%'}"></div>
      </div>
    `;
  });

  storyProgressPercent = 0;
  clearInterval(storyProgressInterval);
  clearTimeout(storyTimer);

  storyProgressInterval = setInterval(() => {
    if (!isPaused) {
      storyProgressPercent += 2;
      const fill = document.getElementById(`story-progress-fill-${index}`);
      if (fill) fill.style.width = `${storyProgressPercent}%`;

      if (storyProgressPercent >= 100) {
        clearInterval(storyProgressInterval);
        nextStory();
      }
    }
  }, 100);
}

function nextStory(e) {
  if (e) e.stopPropagation();
  showStory(currentStoryIndex + 1);
}

function prevStory(e) {
  if (e) e.stopPropagation();
  showStory(currentStoryIndex - 1);
}

function pauseStory() { isPaused = true; }
function resumeStory() { isPaused = false; }

let isAdminLoggedIn = false;

async function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('admin-email-input').value.trim();
  const password = document.getElementById('admin-password-input').value;
  const button = document.getElementById('admin-login-button');
  if (!window.portfolioAuth) {
    alert('Firebase belum siap. Periksa koneksi internet lalu muat ulang halaman.');
    return;
  }
  button.disabled = true;
  button.textContent = 'Memeriksa akun...';
  try {
    const credential = await window.portfolioAuth.signInWithEmailAndPassword(email, password);
    if (credential.user.uid !== window.PORTFOLIO_ADMIN_UID) {
      await window.portfolioAuth.signOut();
      throw new Error('Akun ini bukan admin yang diizinkan.');
    }
    // Ambil data cloud terbaru setelah admin berhasil diautentikasi.
    const snapshot = await window.portfolioDataRef.get();
    if (snapshot.exists) {
      db = { ...db, ...snapshot.data() };
      db.historyLogs = (db.historyLogs || []).map(log => ({ ...log, ip: 'Tidak dicatat' }));
      db.bio = { ...(DEFAULT_DATA.bio || {}), ...(db.bio || {}) };
      db.pageTexts = { ...(DEFAULT_DATA.pageTexts || {}), ...(db.pageTexts || {}) };
      ['swStories', 'schoolPhotos', 'achievements', 'gallery', 'historyLogs'].forEach(k => {
        if (!Array.isArray(db[k])) db[k] = [];
      });
      localStorage.setItem('rivaldy_portfolio_db', JSON.stringify(db));
      renderAllContent();
    }
    isAdminLoggedIn = true;
    document.getElementById('admin-login-view').classList.add('hidden');
    document.getElementById('admin-dashboard-view').classList.remove('hidden');

    document.getElementById('edit-bio-name').value = db.bio.name;
    document.getElementById('edit-bio-avatar').value = db.bio.avatar;
    document.getElementById('edit-bio-summary').value = db.bio.summary;
    document.getElementById('edit-bio-story1').value = db.bio.story1;
    document.getElementById('edit-bio-story2').value = db.bio.story2;
    document.getElementById('edit-bio-story3').value = db.bio.story3;
    document.getElementById('edit-text-school').value = db.bio.school;
    document.getElementById('edit-text-location').value = db.bio.location;
    document.getElementById('edit-text-profile-title').value = db.pageTexts.profileTitle || '';
    document.getElementById('edit-text-school-heading-title').value = db.pageTexts.schoolHeadingTitle || '';
    document.getElementById('edit-text-school-heading-sub').value = db.pageTexts.schoolHeadingSub || '';
    document.getElementById('edit-text-school-intro').value = db.pageTexts.schoolIntroText || '';
    document.getElementById('edit-text-ach-heading-title').value = db.pageTexts.achievementsHeadingTitle || '';
    document.getElementById('edit-text-ach-heading-sub').value = db.pageTexts.achievementsHeadingSub || '';
    document.getElementById('edit-text-gal-heading-title').value = db.pageTexts.galleryHeadingTitle || '';
    document.getElementById('edit-text-gal-heading-sub').value = db.pageTexts.galleryHeadingSub || '';
    renderAdminLists();
    renderAdminLogs();
  } catch (err) {
    console.error('Login admin gagal:', err);
    const message = err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found'
      ? 'Email atau password Firebase salah.'
      : (err.message || 'Login gagal. Periksa akun Firebase dan Firestore Rules.');
    alert(message);
  } finally {
    button.disabled = false;
    button.textContent = 'Masuk Portal Admin';
  }
}

async function handleAdminLogout() {
  isAdminLoggedIn = false;
  if (window.portfolioAuth) await window.portfolioAuth.signOut().catch(() => {});
  document.getElementById('admin-login-view').classList.remove('hidden');
  document.getElementById('admin-dashboard-view').classList.add('hidden');
  document.getElementById('admin-password-input').value = '';
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

  document.querySelectorAll('.admin-tab-content').forEach(content => {
    content.classList.add('hidden');
  });
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
        <div class="flex gap-2">
          <button onclick="adminEditSW(${story.id})" class="flex-1 py-1 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 rounded text-[10px]">Edit</button>
          <button onclick="adminDeleteSW(${story.id})" class="flex-1 py-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded text-[10px]">Hapus</button>
        </div>
      </div>
    `;
  });

  const schoolList = document.getElementById('admin-school-list');
  schoolList.innerHTML = '';
  db.schoolPhotos.forEach(item => {
    schoolList.innerHTML += `
      <div class="p-4 bg-navy-900 border border-slate-700 rounded-xl flex items-center justify-between gap-4">
        <div class="flex items-center space-x-3">
          <img src="${item.image}" class="w-16 h-16 object-cover rounded-lg">
          <div>
            <h4 class="text-sm font-bold text-white">${item.title}</h4>
            <p class="text-xs text-slate-400 line-clamp-1">${item.description}</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button onclick="adminEditSchool(${item.id})" class="px-3 py-1.5 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 rounded text-xs">Edit</button>
          <button onclick="adminDeleteSchool(${item.id})" class="px-3 py-1.5 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded text-xs">Hapus</button>
        </div>
      </div>
    `;
  });

  const achList = document.getElementById('admin-ach-list');
  achList.innerHTML = '';
  db.achievements.forEach(item => {
    achList.innerHTML += `
      <div class="p-3 bg-navy-900 border border-slate-700 rounded-xl flex items-center justify-between">
        <span class="text-xs font-bold text-white">${item.title} (${item.badge})</span>
        <div class="flex gap-2">
          <button onclick="adminEditAch(${item.id})" class="px-3 py-1 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 rounded text-xs">Edit</button>
          <button onclick="adminDeleteAch(${item.id})" class="px-3 py-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded text-xs">Hapus</button>
        </div>
      </div>
    `;
  });

  const galList = document.getElementById('admin-gal-list');
  galList.innerHTML = '';
  db.gallery.forEach(item => {
    galList.innerHTML += `
      <div class="p-3 bg-navy-900 border border-slate-700 rounded-xl space-y-2">
        <img src="${item.image}" class="w-full h-24 object-cover rounded-lg">
        <p class="text-xs text-white truncate">${item.title}</p>
        <div class="flex gap-2">
          <button onclick="adminEditGal(${item.id})" class="flex-1 py-1 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 rounded text-[10px]">Edit</button>
          <button onclick="adminDeleteGal(${item.id})" class="flex-1 py-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded text-[10px]">Hapus</button>
        </div>
      </div>
    `;
  });
}

async function adminSaveSW(e) {
  e.preventDefault();
  const editId = document.getElementById('sw-edit-id').value;
  const fileInput = document.getElementById('sw-file-input');
  let imageUrl = document.getElementById('sw-image-url').value;

  if (fileInput.files && fileInput.files[0]) {
    imageUrl = await readFileAsDataURL(fileInput.files[0]);
  }

  if (!imageUrl) {
    alert("Harap pilih file foto atau masukkan URL Gambar!");
    return;
  }

  const caption = document.getElementById('sw-caption').value;

  if (editId) {
    const index = db.swStories.findIndex(s => s.id == editId);
    if (index !== -1) {
      db.swStories[index].image = imageUrl;
      db.swStories[index].caption = caption;
    }
    recordLog('ADMIN_EDIT', `Mengedit Status SW: "${caption}"`);
  } else {
    const newSW = {
      id: Date.now(),
      image: imageUrl,
      caption: caption,
      timestamp: Date.now()
    };
    db.swStories.unshift(newSW);
    recordLog('ADMIN_EDIT', `Menambahkan Status SW baru: "${caption}"`);
  }

  if (!saveData(db)) return;
  resetSWForm();
  alert('Status SW berhasil disimpan!');
}

function adminEditSW(id) {
  const story = db.swStories.find(s => s.id === id);
  if (!story) return;
  document.getElementById('sw-edit-id').value = story.id;
  document.getElementById('sw-image-url').value = story.image;
  document.getElementById('sw-caption').value = story.caption;
  document.getElementById('sw-form-title').innerText = "Edit Status SW 24 Jam";
  window.scrollTo({ top: document.getElementById('admin-tab-sw').offsetTop - 80, behavior: 'smooth' });
}

function resetSWForm() {
  document.getElementById('sw-edit-id').value = '';
  document.getElementById('sw-file-input').value = '';
  document.getElementById('sw-image-url').value = '';
  document.getElementById('sw-caption').value = '';
  document.getElementById('sw-form-title').innerText = "Tambah Status SW Baru (Aktif 24 Jam)";
}

function adminDeleteSW(id) {
  if(confirm('Yakin ingin menghapus story ini?')) {
    db.swStories = db.swStories.filter(s => s.id !== id);
    saveData(db);
    recordLog('ADMIN_EDIT', `Menghapus data Status SW ID: ${id}`);
  }
}

async function adminSaveSchoolPhoto(e) {
  e.preventDefault();
  const editId = document.getElementById('school-edit-id').value;
  const title = document.getElementById('school-title').value;
  const fileInput = document.getElementById('school-file-input');
  let imageUrl = document.getElementById('school-img-url').value;

  if (fileInput.files && fileInput.files[0]) {
    imageUrl = await readFileAsDataURL(fileInput.files[0]);
  }

  if (!imageUrl) {
    alert("Harap pilih file foto atau masukkan URL Gambar!");
    return;
  }

  const desc = document.getElementById('school-desc').value;

  if (editId) {
    const index = db.schoolPhotos.findIndex(s => s.id == editId);
    if (index !== -1) {
      db.schoolPhotos[index].title = title;
      db.schoolPhotos[index].image = imageUrl;
      db.schoolPhotos[index].description = desc;
    }
    recordLog('ADMIN_EDIT', `Mengedit Foto Sekolah: "${title}"`);
  } else {
    const newItem = {
      id: Date.now(),
      title: title,
      image: imageUrl,
      description: desc
    };
    db.schoolPhotos.push(newItem);
    recordLog('ADMIN_EDIT', `Menambahkan Foto Sekolah baru: "${title}"`);
  }

  if (!saveData(db)) return;
  resetSchoolForm();
  alert('Foto sekolah berhasil disimpan!');
}

function adminEditSchool(id) {
  const item = db.schoolPhotos.find(s => s.id === id);
  if (!item) return;
  document.getElementById('school-edit-id').value = item.id;
  document.getElementById('school-title').value = item.title;
  document.getElementById('school-img-url').value = item.image;
  document.getElementById('school-desc').value = item.description;
  document.getElementById('school-form-title').innerText = "Edit Foto Sekolah & Deskripsi";
  window.scrollTo({ top: document.getElementById('admin-tab-school').offsetTop - 80, behavior: 'smooth' });
}

function resetSchoolForm() {
  document.getElementById('school-edit-id').value = '';
  document.getElementById('school-title').value = '';
  document.getElementById('school-file-input').value = '';
  document.getElementById('school-img-url').value = '';
  document.getElementById('school-desc').value = '';
  document.getElementById('school-form-title').innerText = "Tambah Foto Sekolah & Deskripsi";
}

function adminDeleteSchool(id) {
  if(confirm('Yakin ingin menghapus foto sekolah ini?')) {
    db.schoolPhotos = db.schoolPhotos.filter(s => s.id !== id);
    saveData(db);
    recordLog('ADMIN_EDIT', `Menghapus Foto Sekolah ID: ${id}`);
  }
}

async function adminSaveAchievement(e) {
  e.preventDefault();
  const editId = document.getElementById('ach-edit-id').value;
  const title = document.getElementById('ach-title').value;
  const badge = document.getElementById('ach-badge').value;
  const fileInput = document.getElementById('ach-file-input');
  let imageUrl = document.getElementById('ach-img-url').value;

  if (fileInput.files && fileInput.files[0]) {
    imageUrl = await readFileAsDataURL(fileInput.files[0]);
  }

  if (!imageUrl) {
    alert("Harap pilih file foto atau masukkan URL Gambar!");
    return;
  }

  const desc = document.getElementById('ach-desc').value;

  if (editId) {
    const index = db.achievements.findIndex(s => s.id == editId);
    if (index !== -1) {
      db.achievements[index].title = title;
      db.achievements[index].badge = badge;
      db.achievements[index].image = imageUrl;
      db.achievements[index].description = desc;
    }
    recordLog('ADMIN_EDIT', `Mengedit Prestasi: "${title}"`);
  } else {
    const newItem = {
      id: Date.now(),
      title: title,
      badge: badge,
      image: imageUrl,
      description: desc
    };
    db.achievements.push(newItem);
    recordLog('ADMIN_EDIT', `Menambahkan Prestasi baru: "${title}"`);
  }

  if (!saveData(db)) return;
  resetAchForm();
  alert('Prestasi berhasil disimpan!');
}

function adminEditAch(id) {
  const item = db.achievements.find(s => s.id === id);
  if (!item) return;
  document.getElementById('ach-edit-id').value = item.id;
  document.getElementById('ach-title').value = item.title;
  document.getElementById('ach-badge').value = item.badge;
  document.getElementById('ach-img-url').value = item.image;
  document.getElementById('ach-desc').value = item.description;
  document.getElementById('ach-form-title').innerText = "Edit Prestasi / Penghargaan";
  window.scrollTo({ top: document.getElementById('admin-tab-achievements').offsetTop - 80, behavior: 'smooth' });
}

function resetAchForm() {
  document.getElementById('ach-edit-id').value = '';
  document.getElementById('ach-title').value = '';
  document.getElementById('ach-badge').value = '';
  document.getElementById('ach-file-input').value = '';
  document.getElementById('ach-img-url').value = '';
  document.getElementById('ach-desc').value = '';
  document.getElementById('ach-form-title').innerText = "Tambah Prestasi / Penghargaan";
}

function adminDeleteAch(id) {
  if(confirm('Yakin ingin menghapus prestasi ini?')) {
    db.achievements = db.achievements.filter(s => s.id !== id);
    saveData(db);
    recordLog('ADMIN_EDIT', `Menghapus Prestasi ID: ${id}`);
  }
}

async function adminSaveGallery(e) {
  e.preventDefault();
  const editId = document.getElementById('gal-edit-id').value;
  const title = document.getElementById('gal-title').value;
  const fileInput = document.getElementById('gal-file-input');
  let imageUrl = document.getElementById('gal-img-url').value;

  if (fileInput.files && fileInput.files[0]) {
    imageUrl = await readFileAsDataURL(fileInput.files[0]);
  }

  if (!imageUrl) {
    alert("Harap pilih file foto atau masukkan URL Gambar!");
    return;
  }

  const desc = document.getElementById('gal-desc').value;

  if (editId) {
    const index = db.gallery.findIndex(s => s.id == editId);
    if (index !== -1) {
      db.gallery[index].title = title;
      db.gallery[index].image = imageUrl;
      db.gallery[index].description = desc;
    }
    recordLog('ADMIN_EDIT', `Mengedit Galeri: "${title}"`);
  } else {
    const newItem = {
      id: Date.now(),
      title: title,
      image: imageUrl,
      description: desc
    };
    db.gallery.push(newItem);
    recordLog('ADMIN_EDIT', `Menambahkan Galeri baru: "${title}"`);
  }

  if (!saveData(db)) return;
  resetGalForm();
  alert('Galeri berhasil disimpan!');
}

function adminEditGal(id) {
  const item = db.gallery.find(s => s.id === id);
  if (!item) return;
  document.getElementById('gal-edit-id').value = item.id;
  document.getElementById('gal-title').value = item.title;
  document.getElementById('gal-img-url').value = item.image;
  document.getElementById('gal-desc').value = item.description;
  document.getElementById('gal-form-title').innerText = "Edit Galeri Media";
  window.scrollTo({ top: document.getElementById('admin-tab-gallery').offsetTop - 80, behavior: 'smooth' });
}

function resetGalForm() {
  document.getElementById('gal-edit-id').value = '';
  document.getElementById('gal-title').value = '';
  document.getElementById('gal-file-input').value = '';
  document.getElementById('gal-img-url').value = '';
  document.getElementById('gal-desc').value = '';
  document.getElementById('gal-form-title').innerText = "Tambah Galeri Media";
}

function adminDeleteGal(id) {
  if(confirm('Yakin ingin menghapus item galeri ini?')) {
    db.gallery = db.gallery.filter(s => s.id !== id);
    saveData(db);
    recordLog('ADMIN_EDIT', `Menghapus Galeri ID: ${id}`);
  }
}

async function adminSaveBio(e) {
  e.preventDefault();
  db.bio.name = document.getElementById('edit-bio-name').value;
  
  const fileInput = document.getElementById('bio-file-input');
  let avatarUrl = document.getElementById('edit-bio-avatar').value;

  if (fileInput.files && fileInput.files[0]) {
    avatarUrl = await readFileAsDataURL(fileInput.files[0]);
  }

  if (avatarUrl) {
    db.bio.avatar = avatarUrl;
  }

  db.bio.summary = document.getElementById('edit-bio-summary').value;
  db.bio.story1 = document.getElementById('edit-bio-story1').value;
  db.bio.story2 = document.getElementById('edit-bio-story2').value;
  db.bio.story3 = document.getElementById('edit-bio-story3').value;
  if (!saveData(db)) return;
  recordLog('ADMIN_EDIT', `Memperbarui biodata & profil utama`);
  alert('Biodata & Cerita berhasil diperbarui!');
}

function adminSaveTexts(e) {
  e.preventDefault();
  db.bio.school = document.getElementById('edit-text-school').value;
  db.bio.location = document.getElementById('edit-text-location').value;
  
  db.pageTexts = {
    profileTitle: document.getElementById('edit-text-profile-title').value,
    schoolHeadingTitle: document.getElementById('edit-text-school-heading-title').value,
    schoolHeadingSub: document.getElementById('edit-text-school-heading-sub').value,
    schoolIntroText: document.getElementById('edit-text-school-intro').value,
    achievementsHeadingTitle: document.getElementById('edit-text-ach-heading-title').value,
    achievementsHeadingSub: document.getElementById('edit-text-ach-heading-sub').value,
    galleryHeadingTitle: document.getElementById('edit-text-gal-heading-title').value,
    galleryHeadingSub: document.getElementById('edit-text-gal-heading-sub').value,
  };

  if (!saveData(db)) return;
  recordLog('ADMIN_EDIT', `Memperbarui teks & judul halaman web`);
  alert('Teks seluruh halaman web berhasil diperbarui!');
}

function initParticles() {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const particleCount = Math.floor(width / 25);

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      size: Math.random() * 2 + 1
    });
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0, 240, 255, ${0.15 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00f0ff';
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    requestAnimationFrame(animate);
  }

  animate();
}


// Penanganan error admin agar kegagalan tidak membuat tombol tampak diam.
window.addEventListener('unhandledrejection', function (event) {
  console.error('Operasi admin gagal:', event.reason);
  alert('Operasi gagal diproses. Periksa ukuran foto dan coba lagi.');
});
