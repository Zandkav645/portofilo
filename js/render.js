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

  document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
  const targetPage = document.getElementById(routes[hash]);
  if (targetPage) targetPage.classList.add('active');

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
window.addEventListener('DOMContentLoaded', () => {
  handleRouting();
  if (typeof initParticles === 'function') initParticles();
  if (typeof renderAllContent === 'function') renderAllContent();
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
