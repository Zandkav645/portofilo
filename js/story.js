let currentStoryIndex = 0;
let storyTimer = null;
let storyProgressInterval = null;
let storyProgressPercent = 0;
let isPaused = false;

function openStoryViewer() {
  const activeSWs = getActiveSWStories();
  if (activeSWs.length === 0) {
    alert('Belum ada Status SW 24 jam yang diupload. Tambahkan lewat Halaman Admin (/#/admin)!');
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
  if (index < 0 || index >= activeSWs.length) { closeStoryViewer(); return; }
  currentStoryIndex = index;
  const story = activeSWs[index];

  document.getElementById('story-header-avatar').src = db.bio.avatar;
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
      </div>`;
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

function nextStory(e) { if (e) e.stopPropagation(); showStory(currentStoryIndex + 1); }
function prevStory(e) { if (e) e.stopPropagation(); showStory(currentStoryIndex - 1); }
function pauseStory() { isPaused = true; }
function resumeStory() { isPaused = false; }
