/**
 * Opus-Motion Studio Client Application
 * Handles View Navigation, Style/Prompt Browsing, Live Procedural Canvas,
 * REA Voice Cloning & TTS Dubbing, and CLI Proxy Integration.
 */

// Global State
let STYLES = [];
let PROMPTS = [];
let VOICES = [];
let ACTIVE_VIEW = 'styles-view';
let CURRENT_STYLE = 'hd-2d';
let CURRENT_CHAR = 'clawd';
let CURRENT_EMOTION = 'happy';
let IS_PLAYING = true;
let ANIM_START_TIME = performance.now();
let DURATION = 12.0;
let CURRENT_TIME = 0.0;
let AUDIO_CTX = null;
let SELECTED_AUDIO_FILE = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  loadStyles();
  loadPrompts();
  loadVoices();
  loadProxyStatus();
  initCanvas();
  setTimeout(() => {
    drawAudioQualityRadar();
  }, 100);
});

// ── View Navigation ───────────────────────────────────────────────────────────
function initNavigation() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const viewId = tab.getAttribute('data-view');
      switchView(viewId);
    });
  });
}

function switchView(viewId) {
  ACTIVE_VIEW = viewId;
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-view') === viewId);
  });
  document.querySelectorAll('.view-section').forEach(s => {
    s.classList.toggle('active', s.id === viewId);
  });
  if (viewId === 'voice-view') {
    setTimeout(() => drawAudioQualityRadar(), 50);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Styles Explorer ──────────────────────────────────────────────────────────
async function loadStyles() {
  try {
    const res = await fetch('/api/styles');
    if (!res.ok) throw new Error('API unavailable: ' + res.status);
    const data = await res.json();
    STYLES = data.styles || [];
    renderStyles(STYLES);
    renderStyleVideosShelf(STYLES);
    populateDirectorStyles(STYLES);
  } catch (e) {
    try {
      const res2 = await fetch('data/styles.json');
      if (res2.ok) {
        const data2 = await res2.json();
        STYLES = data2.styles || data2 || [];
        renderStyles(STYLES);
        renderStyleVideosShelf(STYLES);
        populateDirectorStyles(STYLES);
        return;
      }
    } catch (_) {}
    try {
      const res3 = await fetch('../data/styles.json');
      if (res3.ok) {
        const data3 = await res3.json();
        STYLES = data3.styles || data3 || [];
        renderStyles(STYLES);
        renderStyleVideosShelf(STYLES);
        populateDirectorStyles(STYLES);
        return;
      }
    } catch (_) {}
    console.warn('Using local fallback styles:', e);
    STYLES = getFallbackStyles();
    renderStyles(STYLES);
    renderStyleVideosShelf(STYLES);
    populateDirectorStyles(STYLES);
  }
}

function renderStyles(stylesList) {
  const container = document.getElementById('styles-container');
  if (!container) return;

  if (stylesList.length === 0) {
    container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-dim); padding: 60px;">No styles match your search.</div>`;
    return;
  }

  container.innerHTML = stylesList.map(s => {
    const uses = (s.uses || []).map(u => `<span class="card-tag">${escapeHtml(u)}</span>`).join(' ');
    const filmName = s.film ? `“${escapeHtml(s.film)}”` : 'Independent Film Style';
    const frameUrl = s.frame_url || `frames/${s.slug}.jpg`;
    const fallbackUrl = `https://raw.githubusercontent.com/lemomo-ai/lemo-opuscar/main/docs/frames/${s.slug}.jpg`;
    const dur = s.duration_formatted || (s.dur ? `${Math.floor(s.dur/60)}:${Math.floor(s.dur%60).toString().padStart(2,'0')}` : '0:45');
    const clawdBadge = s.is_clawd ? `<span class="clawd-badge" style="margin-left: 6px;">Clawd Starring</span>` : '';

    return `
      <div class="glass-card">
        <!-- Style Video Screen Preview directly above title and prompt -->
        <div class="style-screen-preview" onclick="openScreeningRoom('${s.slug}')" title="Play ${escapeHtml(s.en)} (${dur})">
          <img class="style-frame-img" src="${frameUrl}" alt="${escapeHtml(s.en)}" loading="lazy" onerror="this.onerror=null; this.src='${fallbackUrl}';">
          <div class="style-play-overlay">
            <div class="play-btn-circle">►</div>
            <span class="style-dur-pill">${dur}</span>
          </div>
          <div class="style-screen-cat">${escapeHtml(s.category_en || 'Cinema')}</div>
        </div>

        <div>
          <div class="card-header">
            <div>
              <div class="card-title">${escapeHtml(s.en || s.slug)} ${clawdBadge}</div>
              <div class="card-subtitle">${escapeHtml(s.cn || '')} · <code>${escapeHtml(s.slug)}</code></div>
            </div>
            <span class="card-tag">${escapeHtml(s.category_en || 'Cinema')}</span>
          </div>
          <div class="card-desc">${escapeHtml(s.line || 'Cinematic code animation style.')}</div>
          <div class="card-demo-badge">${filmName}</div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px;">
            ${uses}
          </div>
        </div>
        <div class="card-footer">
          <button class="btn btn-primary" style="flex: 1; padding: 7px 12px; font-size: 12.5px;" onclick="openScreeningRoom('${s.slug}')">
            Play Video
          </button>
          <button class="btn btn-secondary" style="padding: 7px 12px; font-size: 12.5px;" onclick="viewStylePrompt('${s.slug}')">
            Prompt
          </button>
          <button class="btn btn-secondary" style="padding: 7px 10px; font-size: 12.5px;" onclick="directStyle('${s.slug}')" title="Direct this style">
            Direct
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ── Style Videos Preview Shelf (Positioned Above Prompts) ─────────────────────
function renderStyleVideosShelf(stylesList) {
  const track = document.getElementById('style-videos-shelf-track');
  if (!track) return;

  if (!stylesList || stylesList.length === 0) {
    track.innerHTML = `<div style="color: var(--text-dim); padding: 20px;">No style video previews available.</div>`;
    return;
  }

  track.innerHTML = stylesList.map(s => {
    const frameUrl = s.frame_url || `frames/${s.slug}.jpg`;
    const fallbackUrl = `https://raw.githubusercontent.com/lemomo-ai/lemo-opuscar/main/docs/frames/${s.slug}.jpg`;
    const dur = s.duration_formatted || (s.dur ? `${Math.floor(s.dur/60)}:${Math.floor(s.dur%60).toString().padStart(2,'0')}` : '0:45');
    const filmName = s.film ? escapeHtml(s.film) : 'Nominee Film';
    const catLabel = s.is_clawd ? 'Clawd Best Picture' : (s.category_en || 'Cinema');

    return `
      <div class="shelf-card" id="shelf-style-${s.slug}">
        <div class="shelf-screen" onclick="openScreeningRoom('${s.slug}')" title="Watch ${escapeHtml(s.en)} Film (${dur})">
          <img class="shelf-thumb" src="${frameUrl}" alt="${escapeHtml(s.en)}" loading="lazy" onerror="this.onerror=null; this.src='${fallbackUrl}';">
          <div class="shelf-overlay">
            <div class="shelf-play-circle">►</div>
          </div>
          <span class="shelf-dur-tag">${dur}</span>
          <span class="shelf-cat-tag">${escapeHtml(catLabel)}</span>
        </div>
        <div class="shelf-info">
          <div class="shelf-name" title="${escapeHtml(s.en)}">${escapeHtml(s.en)}</div>
          <div class="shelf-film" title="Film: ${filmName}">“${filmName}”</div>
          <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">${escapeHtml(s.cn || '')}</div>
          <div class="shelf-btns">
            <button class="shelf-btn shelf-btn-play" onclick="openScreeningRoom('${s.slug}')">
              Watch Film
            </button>
            <button class="shelf-btn" onclick="viewStylePrompt('${s.slug}')" title="Inspect Prompt Code">
              Prompt
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function scrollStyleShelf(direction) {
  const track = document.getElementById('style-videos-shelf-track');
  if (track) {
    track.scrollBy({ left: direction * 580, behavior: 'smooth' });
  }
}

let activeCategoryFilter = '';
function setCategoryFilter(cat, btn) {
  activeCategoryFilter = cat;
  document.querySelectorAll('#style-category-pills .pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  filterStyles();
}

function filterStyles() {
  const q = (document.getElementById('styles-search')?.value || '').toLowerCase().trim();
  const filtered = STYLES.filter(s => {
    let matchesCat = true;
    if (activeCategoryFilter) {
      if (activeCategoryFilter.toLowerCase() === 'clawd') {
        matchesCat = !!s.is_clawd;
      } else {
        matchesCat = (s.category_en || '').toLowerCase().includes(activeCategoryFilter.toLowerCase());
      }
    }
    const matchesQ = !q ||
      (s.en || '').toLowerCase().includes(q) ||
      (s.slug || '').toLowerCase().includes(q) ||
      (s.line || '').toLowerCase().includes(q) ||
      (s.cn || '').toLowerCase().includes(q) ||
      (s.film || '').toLowerCase().includes(q) ||
      (s.uses || []).some(u => (u || '').toLowerCase().includes(q));
    return matchesCat && matchesQ;
  });
  renderStyles(filtered);
}

function directStyle(slug) {
  CURRENT_STYLE = slug;
  const select = document.getElementById('dir-style-select');
  if (select) select.value = slug;
  switchView('director-view');
  onDirectorStyleChange();
}

function viewStylePrompt(slug) {
  const s = STYLES.find(item => item.slug === slug);
  if (!s) return;
  const content = s.style_md || s.line || `Animation style: ${s.en} (${s.slug})`;
  const dur = s.duration_formatted || (s.dur ? `${Math.floor(s.dur/60)}:${Math.floor(s.dur%60).toString().padStart(2,'0')}` : '0:45');
  const frameUrl = s.frame_url || `frames/${s.slug}.jpg`;
  const rawVideoUrl = s.video_url || `https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/${s.slug}.mp4`;
  const targetT0 = s.t0 || 0;
  const videoSrc = s.is_clawd ? `${rawVideoUrl}#t=${targetT0}` : rawVideoUrl;

  const videoHtml = `
    <div style="position: relative; width: 100%; background: #080a0f; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-subtle); margin-bottom: 16px;">
      <video controls playsinline preload="metadata" poster="${frameUrl}" src="${videoSrc}" style="width: 100%; height: auto; max-height: 380px; display: block; object-fit: contain; margin: 0 auto;" onloadedmetadata="if(${s.is_clawd ? 'true' : 'false'}) this.currentTime = ${targetT0};"></video>
      <div style="position: absolute; top: 10px; left: 10px; z-index: 2; display: flex; gap: 8px; align-items: center; pointer-events: auto;">
        <span style="font-family: var(--font-mono); font-size: 11px; background: rgba(9, 10, 15, 0.88); color: var(--text-main); padding: 4px 10px; border-radius: 4px; border: 1px solid var(--border-subtle); backdrop-filter: blur(8px);">
          ${s.is_clawd ? 'Clawd Best Picture' : 'Classic Style'} · ${dur}
        </span>
        ${s.is_clawd ? `<a href="${s.embed_url}" target="_blank" rel="noopener" style="font-family: var(--font-mono); font-size: 11px; background: rgba(9, 10, 15, 0.88); color: #fff; padding: 4px 10px; border-radius: 4px; border: 1px solid var(--border-subtle); text-decoration: none;">Interactive Scene ↗</a>` : ''}
      </div>
    </div>
  `;

  openModal(
    `${s.en} (${s.slug}) — Style Guide & Production Prompt`,
    `Category: ${s.category_en || 'General'} | Film: “${s.film || 'N/A'}” | Runtime: ${dur}`,
    content,
    videoHtml
  );
}

// ── Viral Prompts Explorer ───────────────────────────────────────────────────
async function loadPrompts() {
  try {
    const res = await fetch('/api/prompts?limit=60');
    if (!res.ok) throw new Error('API unavailable: ' + res.status);
    const data = await res.json();
    PROMPTS = data.prompts || [];
    renderPrompts(PROMPTS);
  } catch (e) {
    try {
      const res2 = await fetch('data/prompts.json');
      if (res2.ok) {
        const data2 = await res2.json();
        PROMPTS = (data2.prompts || data2 || []).slice(0, 60);
        renderPrompts(PROMPTS);
        return;
      }
    } catch (_) {}
    try {
      const res3 = await fetch('../data/prompts.json');
      if (res3.ok) {
        const data3 = await res3.json();
        PROMPTS = (data3.prompts || data3 || []).slice(0, 60);
        renderPrompts(PROMPTS);
        return;
      }
    } catch (_) {}
    console.warn('Using local fallback prompts:', e);
    PROMPTS = getFallbackPrompts();
    renderPrompts(PROMPTS);
  }
}

function renderPrompts(promptsList) {
  const container = document.getElementById('prompts-container');
  if (!container) return;

  if (promptsList.length === 0) {
    container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-dim); padding: 60px;">No prompts match your search.</div>`;
    return;
  }

  container.innerHTML = promptsList.map(p => {
    const tags = (p.tech_tags || []).map(t => `<span class="card-tag" style="background: rgba(157, 78, 221, 0.12); color: #c084fc; border-color: rgba(157, 78, 221, 0.3);">${escapeHtml(t)}</span>`).join(' ');
    const author = p.author ? `@${escapeHtml(p.author)}` : 'Anonymous Creator';
    const preview = escapeHtml((p.prompt || '').slice(0, 220)) + '...';
    const posterUrl = p.poster_url || `https://media.skillry.dev/opus-5-5/${p.slug}/preview.webp`;
    const skillryUrl = p.skillry_url || `https://skillry.dev/ai-videos/opus-5-5/${p.slug}`;
    const postUrl = p.post_url || p.author_url || skillryUrl;
    const topTech = (p.tech_tags && p.tech_tags[0]) ? p.tech_tags[0].toUpperCase() : 'CANVAS';

    return `
      <div class="glass-card">
        <div>
          <!-- Video / Media Preview directly above the prompt -->
          <div class="prompt-media-preview" onclick="viewFullPrompt('${p.slug}')" title="Preview prompt & video">
            <img class="prompt-thumb-img" src="${posterUrl}" alt="${escapeHtml(p.slug)}" loading="lazy" onerror="this.onerror=null; this.src='https://media.skillry.dev/opus-5-5/${p.slug}/preview.webp';">
            <div class="prompt-preview-overlay">
              <span class="prompt-play-link">
                <span>Video Preview</span>
              </span>
              <span style="font-family: var(--font-mono); font-size: 10px; font-weight: 600; background: rgba(0,0,0,0.85); color: var(--text-main); padding: 2px 7px; border-radius: 4px; border: 1px solid var(--border-subtle);">${escapeHtml(topTech)}</span>
            </div>
          </div>

          <div class="card-header">
            <div>
              <div class="card-title" style="font-size: 15px;">
                <a href="${postUrl}" target="_blank" rel="noopener" style="color: #fff; text-decoration: none;" onclick="event.stopPropagation();">${author}</a>
              </div>
              <div class="card-subtitle">${escapeHtml(p.slug || '')} · <span style="color: var(--text-muted); text-transform: capitalize;">${escapeHtml(p.category || 'Motion')}</span></div>
            </div>
            <a href="${skillryUrl}" target="_blank" rel="noopener" class="card-tag" style="text-decoration: none;" title="Open live remake on Skillry" onclick="event.stopPropagation();">Skillry ↗</a>
          </div>

          <div class="card-desc" style="font-family: var(--font-mono); font-size: 11.5px; background: rgba(0,0,0,0.35); padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border-subtle); line-height: 1.5;">
            ${preview}
          </div>

          <div style="display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0;">
            ${tags}
          </div>
        </div>

        <div class="card-footer">
          <button class="btn btn-primary" style="flex: 1; padding: 7px 12px; font-size: 12px;" onclick="usePromptInDirector('${p.slug}')">
            Use in Director
          </button>
          <button class="btn btn-secondary" style="padding: 7px 12px; font-size: 12px;" onclick="viewFullPrompt('${p.slug}')">
            Inspect Prompt
          </button>
        </div>
      </div>
    `;
  }).join('');
}

let activeTechFilter = '';
function setTechFilter(tech, btn) {
  activeTechFilter = tech;
  document.querySelectorAll('#prompts-tech-pills .pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  filterPrompts();
}

function filterPrompts() {
  const q = (document.getElementById('prompts-search')?.value || '').toLowerCase().trim();
  const filtered = PROMPTS.filter(p => {
    const matchesTech = !activeTechFilter || 
      (p.tech_tags || []).some(t => t.toLowerCase().includes(activeTechFilter.toLowerCase()));
    const matchesQ = !q ||
      (p.author || '').toLowerCase().includes(q) ||
      (p.slug || '').toLowerCase().includes(q) ||
      (p.prompt || '').toLowerCase().includes(q);
    return matchesTech && matchesQ;
  });
  renderPrompts(filtered);
}

function viewFullPrompt(slug) {
  const p = PROMPTS.find(item => item.slug === slug);
  if (!p) return;
  const posterUrl = p.poster_url || `https://media.skillry.dev/opus-5-5/${p.slug}/preview.webp`;
  const skillryUrl = p.skillry_url || `https://skillry.dev/ai-videos/opus-5-5/${p.slug}`;
  const postUrl = p.post_url || p.author_url || skillryUrl;

  const mediaHtml = `
    <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #000; overflow: hidden; border-radius: 12px;">
      <img src="${posterUrl}" alt="${escapeHtml(p.slug)}" style="width: 100%; height: 100%; object-fit: contain; max-height: 400px;">
      <div style="position: absolute; bottom: 14px; right: 16px; z-index: 2; display: flex; gap: 8px;">
        <a href="${skillryUrl}" target="_blank" rel="noopener" class="btn btn-primary" style="padding: 7px 16px; font-size: 12.5px;">
          ▶ Watch Live Remake on Skillry ↗
        </a>
        <a href="${postUrl}" target="_blank" rel="noopener" class="btn btn-secondary" style="padding: 7px 14px; font-size: 12.5px;">
          Original Post ↗
        </a>
      </div>
    </div>
  `;

  openModal(
    `Viral Animation Prompt: @${p.author || 'Creator'} (${p.slug})`,
    `Tech: ${(p.tech_tags || []).join(', ')} | Category: ${p.category || 'Motion'} | Skillry Remake Available`,
    p.prompt || '',
    mediaHtml
  );
}

function usePromptInDirector(slug) {
  const p = PROMPTS.find(item => item.slug === slug);
  if (!p) return;
  const textarea = document.getElementById('dir-story');
  if (textarea) textarea.value = p.prompt.slice(0, 500);
  switchView('director-view');
}

// ── Studio Director & Live Canvas ────────────────────────────────────────────
function populateDirectorStyles(styles) {
  const select = document.getElementById('dir-style-select');
  if (!select) return;
  const baseStyles = styles.filter(s => !s.is_clawd);
  const clawdStyles = styles.filter(s => s.is_clawd);

  select.innerHTML = `
    <optgroup label="Cinematic Nominee Styles (59 Base Styles)">
      ${baseStyles.map(s => `
        <option value="${s.slug}" ${s.slug === CURRENT_STYLE ? 'selected' : ''}>
          ${escapeHtml(s.en || s.slug)} (${escapeHtml(s.category_en || 'Cinema')})
        </option>
      `).join('')}
    </optgroup>
    ${clawdStyles.length > 0 ? `
      <optgroup label="Clawd 98 Best Picture Styles (1927–2025 Nominees)">
        ${clawdStyles.map(s => `
          <option value="${s.slug}" ${s.slug === CURRENT_STYLE ? 'selected' : ''}>
            ${escapeHtml(s.en || s.slug)} (${s.year ? s.year + ' · ' : ''}${escapeHtml(s.film || s.category_en || 'Film')})
          </option>
        `).join('')}
      </optgroup>
    ` : ''}
  `;
  onDirectorStyleChange();
}

function onDirectorStyleChange() {
  const select = document.getElementById('dir-style-select');
  if (select) CURRENT_STYLE = select.value;
  const s = STYLES.find(item => item.slug === CURRENT_STYLE);
  if (s) {
    if (s.line) {
      const logline = document.getElementById('dir-story');
      if (logline && (logline.value.startsWith('The lighthouse') || logline.value.trim() === '')) {
        logline.value = s.line;
      }
    }
    const previewBox = document.getElementById('dir-style-preview');
    if (previewBox) {
      const frameUrl = s.frame_url || `frames/${s.slug}.jpg`;
      const fallbackUrl = `https://raw.githubusercontent.com/lemomo-ai/lemo-opuscar/main/docs/frames/${s.slug}.jpg`;
      const dur = s.duration_formatted || (s.dur ? `${Math.floor(s.dur/60)}:${Math.floor(s.dur%60).toString().padStart(2,'0')}` : '0:45');
      previewBox.innerHTML = `
        <div style="position: relative; width: 100%; aspect-ratio: 16/9; background: #000; overflow: hidden; border-radius: 8px; border: 1px solid rgba(0, 242, 254, 0.25);">
          <img src="${frameUrl}" alt="${escapeHtml(s.en)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='${fallbackUrl}';">
          <div style="position: absolute; inset: 0; background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.75) 100%); display: flex; align-items: flex-end; justify-content: space-between; padding: 8px 12px;">
            <span style="font-size: 11.5px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 5px;">
              <span style="color: var(--accent-cyan);">▶</span> Watch “${escapeHtml(s.film || s.en)}” Film Preview
            </span>
            <span style="font-family: var(--font-mono); font-size: 10px; color: var(--accent-cyan); background: rgba(0,0,0,0.65); padding: 2px 7px; border-radius: 4px; border: 1px solid rgba(0,242,254,0.3);">⏱️ ${dur}</span>
          </div>
        </div>
      `;
    }
  }
}

function onDirectorCharacterChange() {
  const select = document.getElementById('dir-char-select');
  if (select) CURRENT_CHAR = select.value;
}

function setEmotion(emotion) {
  CURRENT_EMOTION = emotion;
  document.querySelectorAll('#emotion-buttons .pill').forEach(b => {
    b.classList.toggle('active', b.textContent.toLowerCase() === emotion);
  });
}

function togglePlayState() {
  IS_PLAYING = !IS_PLAYING;
  const icon = document.getElementById('play-icon');
  if (icon) icon.textContent = IS_PLAYING ? '⏸️' : '▶️';
  if (IS_PLAYING) {
    ANIM_START_TIME = performance.now() - (CURRENT_TIME * 1000);
  }
}

function seekStudioTime(pct) {
  IS_PLAYING = false;
  const icon = document.getElementById('play-icon');
  if (icon) icon.textContent = '▶️';
  CURRENT_TIME = (pct / 100) * DURATION;
  renderCanvasFrame(CURRENT_TIME);
  updateTimeUI(CURRENT_TIME);
}

function updateTimeUI(t) {
  const display = document.getElementById('studio-time-display');
  if (display) display.textContent = `${t.toFixed(2)}s / ${DURATION.toFixed(1)}s`;
  const scrubber = document.getElementById('studio-scrubber');
  if (scrubber && IS_PLAYING) scrubber.value = (t / DURATION) * 100;
}

// Live 60fps Procedural Animation Canvas Loop
function initCanvas() {
  const canvas = document.getElementById('live-canvas');
  if (!canvas) return;

  function animLoop() {
    if (IS_PLAYING) {
      const now = performance.now();
      CURRENT_TIME = ((now - ANIM_START_TIME) / 1000) % DURATION;
      renderCanvasFrame(CURRENT_TIME);
      updateTimeUI(CURRENT_TIME);
    }
    requestAnimationFrame(animLoop);
  }
  requestAnimationFrame(animLoop);
}

function renderCanvasFrame(t) {
  const canvas = document.getElementById('live-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // Background gradient matching style
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0c0c0e');
  bgGrad.addColorStop(1, '#050506');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Background Grid / Atmospheric Particles (Subtle Hairline Grid)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 80) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 80) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Floating Ambient Monochromatic Dust
  for (let i = 0; i < 30; i++) {
    const pTime = (t * 0.4 + i * 0.3) % DURATION;
    const progress = pTime / DURATION;
    const px = (Math.sin(i * 2.1 + t * 0.7) * 0.45 + 0.5) * W;
    const py = H - (progress * H);
    const radius = Math.sin(t * 3 + i) * 2 + 3.5;
    
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Character Render Center Stage
  ctx.save();
  ctx.translate(W / 2, H / 2 + 60);

  // Character Acting Physics: Bobbing & Squash
  const bobFreq = CURRENT_EMOTION === 'happy' ? 4.5 : 2.5;
  const bobAmp = CURRENT_EMOTION === 'happy' ? 22 : 12;
  const bob = Math.sin(t * bobFreq) * bobAmp;
  const squish = Math.cos(t * bobFreq) * 0.05;
  ctx.translate(0, bob);
  ctx.scale(1 + squish, 1 - squish);

  // Cast Shadow
  ctx.beginPath();
  ctx.ellipse(0, 140, 110, 24, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fill();

  const viseme = getActiveLipViseme(t);
  const isSpeaking = viseme !== 'REST';

  if (CURRENT_CHAR.startsWith('clawd')) {
    // Clawd mascot character suite with authentic Anthropic terracotta clay & costumes
    drawClawdCharacterRig(ctx, t, CURRENT_CHAR, CURRENT_EMOTION, viseme);
  } else if (CURRENT_CHAR === 'noir_detective') {
    drawNoirDetectiveRig(ctx, t);
  } else if (CURRENT_CHAR === 'cyber_runner') {
    drawCyberRunnerRig(ctx, t);
  } else {
    drawPixelWandererRig(ctx, t);
  }

  ctx.restore();

  // On-screen HUD / Cinema Overlay (Cursor Minimal)
  ctx.fillStyle = '#f4f4f5';
  ctx.font = '600 14px Inter, sans-serif';
  ctx.fillText(`OPUS-MOTION // ${CURRENT_STYLE.toUpperCase()}`, 32, 40);
  ctx.font = '500 11.5px JetBrains Mono, monospace';
  ctx.fillStyle = '#a1a1aa';
  ctx.fillText(`TIME: ${t.toFixed(2)}s | EMOTION: ${CURRENT_EMOTION.toUpperCase()} | RIG: ${CURRENT_CHAR.toUpperCase()}`, 32, 62);

  if (isSpeaking) {
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
    ctx.shadowBlur = 6;
    ctx.fillText(`● LIP-SYNC ACTIVE: VISEME [${viseme}]`, 32, 84);
    ctx.shadowBlur = 0;
  }
}

function getActiveLipViseme(t) {
  const player = document.getElementById('tts-audio-player');
  const refAudio = document.getElementById('ref-audio-element');
  const activeAudio = (player && !player.paused) ? player : ((refAudio && !refAudio.paused) ? refAudio : null);

  if (activeAudio) {
    const audioTime = activeAudio.currentTime;
    const phonemes = ['A', 'O', 'E', 'M', 'F', 'L'];
    const idx = Math.floor((audioTime * 8) % phonemes.length);
    return phonemes[idx];
  }
  return 'REST';
}

function drawClawdCharacterRig(ctx, t, charVariant, emotion, viseme) {
  const CLAY = '#D97757';
  const CLAY_D = '#B85F40';
  const EYE_COLOR = '#2A2622';

  ctx.save();

  // 4 Walking Legs
  ctx.fillStyle = CLAY_D;
  const legStep = Math.sin(t * 6) * 10;
  ctx.beginPath(); ctx.roundRect(-80, 50, 28, 38 + legStep, 10); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-30, 50, 28, 38 - legStep, 10); ctx.fill();
  ctx.beginPath(); ctx.roundRect(5, 50, 28, 38 + legStep, 10); ctx.fill();
  ctx.beginPath(); ctx.roundRect(55, 50, 28, 38 - legStep, 10); ctx.fill();

  // Technicolor Ruby Slippers / Boots
  if (charVariant === 'clawd_technicolor') {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.roundRect(-82, 76 + legStep, 32, 14, 6); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-32, 76 - legStep, 32, 14, 6); ctx.fill();
    ctx.beginPath(); ctx.roundRect(3, 76 + legStep, 32, 14, 6); ctx.fill();
    ctx.beginPath(); ctx.roundRect(53, 76 - legStep, 32, 14, 6); ctx.fill();
  }

  // Astronaut Oxygen Backpack
  if (charVariant === 'clawd_astronaut') {
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath(); ctx.roundRect(-75, -75, 150, 50, 16); ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.arc(45, -55, 6, 0, Math.PI * 2); ctx.fill();
  }

  // Aviator Scarf Flowing Tail
  if (charVariant === 'clawd_aviator') {
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.moveTo(70, -10);
    const wave1 = Math.sin(t * 8) * 22;
    const wave2 = Math.cos(t * 8) * 18;
    ctx.quadraticCurveTo(110, -20 + wave1, 160, -5 + wave2);
    ctx.lineTo(155, 18 + wave2);
    ctx.quadraticCurveTo(105, 0 + wave1, 65, 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d97706'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  // Main Clay Torso (18x10 quadrant mascot)
  ctx.save();
  if (charVariant === 'clawd_cyber') {
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#1e293b';
  } else if (charVariant === 'clawd_watercolor') {
    ctx.fillStyle = '#e07a5f';
    ctx.shadowColor = 'rgba(217, 119, 87, 0.4)';
    ctx.shadowBlur = 18;
  } else {
    ctx.fillStyle = CLAY;
  }

  ctx.beginPath();
  ctx.roundRect(-105, -75, 210, 140, 30);
  ctx.fill();

  // Dark Clay Underside Shading
  ctx.fillStyle = CLAY_D;
  ctx.beginPath();
  ctx.roundRect(-105, 30, 210, 35, [0, 0, 30, 30]);
  ctx.fill();
  ctx.restore();

  // Origami Crease Facets
  if (charVariant === 'clawd_origami') {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-105, -75); ctx.lineTo(0, 0); ctx.lineTo(105, -75);
    ctx.moveTo(-105, 65); ctx.lineTo(0, 0); ctx.lineTo(105, 65);
    ctx.stroke();
  }

  // Cyber Wireframe Grid
  if (charVariant === 'clawd_cyber') {
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.35)';
    ctx.lineWidth = 1;
    for (let gx = -90; gx <= 90; gx += 30) {
      ctx.beginPath(); ctx.moveTo(gx, -75); ctx.lineTo(gx, 65); ctx.stroke();
    }
    for (let gy = -60; gy <= 60; gy += 30) {
      ctx.beginPath(); ctx.moveTo(-105, gy); ctx.lineTo(105, gy); ctx.stroke();
    }
  }

  // Blushing Cheeks
  ctx.fillStyle = 'rgba(247, 37, 133, 0.38)';
  ctx.beginPath(); ctx.arc(-68, 12, 14, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(68, 12, 14, 0, Math.PI * 2); ctx.fill();

  // Expressive Slit Eyes
  const lookX = Math.sin(t * 1.5) * 8;
  const isBlink = (t % 3.6 < 0.16);
  ctx.fillStyle = charVariant === 'clawd_cyber' ? '#00f2fe' : EYE_COLOR;

  if (isBlink) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = charVariant === 'clawd_cyber' ? '#00f2fe' : EYE_COLOR;
    ctx.beginPath(); ctx.moveTo(-56 + lookX, -18); ctx.lineTo(-38 + lookX, -18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(38 + lookX, -18); ctx.lineTo(56 + lookX, -18); ctx.stroke();
  } else {
    let eyeH = 22;
    if (emotion === 'happy') eyeH = 12;
    if (emotion === 'sad') eyeH = 8;
    if (emotion === 'scared') eyeH = 28;

    // Left Eye
    ctx.beginPath();
    ctx.roundRect(-56 + lookX, -28, 18, eyeH, 6);
    ctx.fill();

    // Right Eye
    if (charVariant === 'clawd_cyber') {
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath(); ctx.arc(47 + lookX, -20, 11, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.roundRect(38 + lookX, -28, 18, eyeH, 6);
      ctx.fill();
    }

    // Specular eye gleam
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-51 + lookX, -23, 3, 0, Math.PI * 2); ctx.fill();
    if (charVariant !== 'clawd_cyber') {
      ctx.beginPath(); ctx.arc(43 + lookX, -23, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Monocle over right eye for Studio Director
  if (charVariant === 'clawd_director') {
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(47 + lookX, -20, 16, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(63 + lookX, -15); ctx.quadraticCurveTo(80, 20, 50, 45); ctx.stroke();
  }

  // Mouth & Dynamic Visemes
  ctx.save();
  ctx.translate(0, 14);
  if (viseme !== 'REST') {
    ctx.fillStyle = '#1c1917';
    ctx.strokeStyle = CLAY_D;
    ctx.lineWidth = 2;

    if (viseme === 'A') {
      ctx.beginPath(); ctx.ellipse(0, 0, 15, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.ellipse(0, 8, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    } else if (viseme === 'O') {
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (viseme === 'E') {
      ctx.beginPath(); ctx.ellipse(0, 0, 20, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-12, -4, 24, 4);
    } else if (viseme === 'M') {
      ctx.strokeStyle = EYE_COLOR; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.stroke();
    } else if (viseme === 'F') {
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-10, -5, 20, 5);
    } else {
      ctx.beginPath(); ctx.ellipse(0, 0, 14, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(0, 2, 7, 0, Math.PI, true); ctx.fill();
    }
  } else {
    ctx.strokeStyle = EYE_COLOR;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (emotion === 'happy' || emotion === 'proud') {
      ctx.arc(0, -6, 20, 0.15 * Math.PI, 0.85 * Math.PI, false);
    } else if (emotion === 'sad') {
      ctx.arc(0, 16, 20, 1.15 * Math.PI, 1.85 * Math.PI, false);
    } else if (emotion === 'curious') {
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
    } else {
      ctx.moveTo(-16, 2); ctx.lineTo(16, 2);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Headgear & Accessories for All Clawd Variants
  if (charVariant === 'clawd_aviator') {
    // Leather Aviator Helmet with Goggles
    ctx.fillStyle = '#78350f';
    ctx.beginPath(); ctx.roundRect(-108, -88, 216, 36, [24, 24, 0, 0]); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-112, -70, 20, 48, 8); ctx.fill();
    ctx.beginPath(); ctx.roundRect(92, -70, 20, 48, 8); ctx.fill();
    ctx.fillStyle = '#d97706';
    ctx.beginPath(); ctx.roundRect(-60, -96, 44, 26, 8); ctx.fill();
    ctx.beginPath(); ctx.roundRect(16, -96, 44, 26, 8); ctx.fill();
    ctx.strokeStyle = '#451a03'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-60, -83); ctx.lineTo(60, -83); ctx.stroke();
    ctx.fillStyle = 'rgba(0, 242, 254, 0.7)';
    ctx.beginPath(); ctx.arc(-38, -83, 11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(38, -83, 11, 0, Math.PI * 2); ctx.fill();
  } else if (charVariant === 'clawd_noir') {
    // Detective Fedora & Smoke
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.ellipse(0, -78, 125, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-65, -125, 130, 52, [18, 18, 0, 0]); ctx.fill();
    ctx.fillStyle = '#334155';
    ctx.fillRect(-65, -88, 130, 10);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    for (let sw = 0; sw < 3; sw++) {
      const spY = -50 - (sw * 22) - ((t * 25) % 35);
      const spX = 35 + Math.sin(t * 3 + sw) * 12;
      ctx.beginPath(); ctx.arc(spX, spY, 6 + sw * 3, 0, Math.PI * 2); ctx.fill();
    }
  } else if (charVariant === 'clawd_technicolor') {
    // Bowtie & sparkles
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, 35); ctx.lineTo(-32, 22); ctx.lineTo(-32, 48); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 35); ctx.lineTo(32, 22); ctx.lineTo(32, 48); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a1a1aa';
    ctx.beginPath(); ctx.arc(0, 35, 7, 0, Math.PI * 2); ctx.fill();
    for (let sp = 0; sp < 6; sp++) {
      const sAngle = t * 2 + sp * (Math.PI / 3);
      const sRadius = 130 + Math.sin(t * 4 + sp) * 16;
      const sx = Math.cos(sAngle) * sRadius;
      const sy = Math.sin(sAngle) * (sRadius * 0.5);
      ctx.fillStyle = ['#f4f4f5', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b'][sp];
      ctx.beginPath(); ctx.arc(sx, sy, 4.5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (charVariant === 'clawd_astronaut') {
    // NASA EVA Space Helmet with Gold Visor
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(0, -25, 98, Math.PI * 0.85, Math.PI * 2.15); ctx.stroke();
    const visorGrad = ctx.createLinearGradient(0, -90, 0, -30);
    visorGrad.addColorStop(0, 'rgba(251, 191, 36, 0.85)');
    visorGrad.addColorStop(1, 'rgba(217, 119, 6, 0.45)');
    ctx.fillStyle = visorGrad;
    ctx.beginPath(); ctx.ellipse(0, -55, 75, 24, 0, 0, Math.PI * 2); ctx.fill();
  } else if (charVariant === 'clawd_director') {
    // Director Beret & Megaphone
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.ellipse(15, -82, 75, 22, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -96, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(85, 20); ctx.lineTo(135, -5); ctx.lineTo(135, 45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath(); ctx.ellipse(135, 20, 8, 25, 0, 0, Math.PI * 2); ctx.fill();
  } else if (charVariant === 'clawd_watercolor') {
    // Swirling Sakura Petals
    for (let cp = 0; cp < 8; cp++) {
      const cx = Math.sin(t * 1.5 + cp * 1.2) * 160;
      const cy = -80 + ((t * 40 + cp * 35) % 220);
      ctx.fillStyle = 'rgba(244, 114, 182, 0.65)';
      ctx.beginPath(); ctx.ellipse(cx, cy, 8, 4, t + cp, 0, Math.PI * 2); ctx.fill();
    }
  }

  ctx.restore();
}

function drawNoirDetectiveRig(ctx, t) {
  // Trenchcoat silhouette with high contrast
  ctx.fillStyle = '#0a0d14';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
  ctx.shadowBlur = 30;
  
  // Coat
  ctx.beginPath();
  ctx.moveTo(-70, 140);
  ctx.lineTo(-40, -40);
  ctx.lineTo(-20, -80);
  ctx.lineTo(20, -80);
  ctx.lineTo(40, -40);
  ctx.lineTo(70, 140);
  ctx.closePath();
  ctx.fill();

  // Fedora Hat
  ctx.fillStyle = '#05070a';
  ctx.beginPath();
  ctx.ellipse(0, -90, 80, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(-45, -135, 90, 48, [12, 12, 0, 0]);
  ctx.fill();

  // Cigarette Glow / Lens flare
  ctx.fillStyle = '#f59e0b';
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(15, -45, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawCyberRunnerRig(ctx, t) {
  // Wireframe holographic cyborg
  ctx.strokeStyle = '#00f2fe';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#00f2fe';
  ctx.shadowBlur = 20;

  // Head visor
  ctx.strokeRect(-40, -110, 80, 50);
  ctx.fillStyle = 'rgba(0, 242, 254, 0.2)';
  ctx.fillRect(-40, -110, 80, 50);

  // Visor Scanline
  const scanY = -110 + ((t * 60) % 50);
  ctx.strokeStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(-40, scanY); ctx.lineTo(40, scanY); ctx.stroke();

  // Torso wireframe
  ctx.strokeStyle = '#00f2fe';
  ctx.strokeRect(-55, -50, 110, 130);
  ctx.beginPath();
  ctx.moveTo(-55, -50); ctx.lineTo(55, 80);
  ctx.moveTo(55, -50); ctx.lineTo(-55, 80);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawPixelWandererRig(ctx, t) {
  // 16-bit RPG pixel aesthetic
  ctx.fillStyle = '#e2e8f0';
  const s = 8; // Pixel size
  
  // Scarf blowing in wind
  const scarfWave = Math.sin(t * 8) * 16;
  ctx.fillStyle = '#f72585';
  ctx.fillRect(20, -50, 40 + scarfWave, 16);

  // Pixel Hero Body
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(-30, -40, 60, 90);
  
  // Head
  ctx.fillStyle = '#fde047';
  ctx.fillRect(-24, -90, 48, 48);
  
  // Pixel Eyes
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-10, -75, 8, 8);
  ctx.fillRect(10, -75, 8, 8);
}

// Generate Director Prompt
async function generateDirectorPrompt() {
  const style = CURRENT_STYLE;
  const topic = document.getElementById('dir-story')?.value || 'A cinematic scene';
  const character = CURRENT_CHAR;
  const duration = parseInt(document.getElementById('dir-duration')?.value || '12', 10);
  const model = document.getElementById('dir-model-select')?.value || 'claude-opus-5.5';

  try {
    const res = await fetch('/api/director/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ style, topic, character, duration, model })
    });
    const data = await res.json();
    document.getElementById('director-prompt-preview').textContent = data.prompt || '// Prompt generated';
  } catch (e) {
    console.error('Failed to generate prompt via API:', e);
  }
}

function copyDirectorPrompt() {
  const text = document.getElementById('director-prompt-preview')?.textContent || '';
  navigator.clipboard.writeText(text);
  alert('AI Director prompt copied to clipboard!');
}

function dispatchToAIProxy() {
  const prompt = document.getElementById('director-prompt-preview')?.textContent || '';
  const model = document.getElementById('dir-model-select')?.value || 'claude-opus-5.5';
  document.getElementById('proxy-test-prompt').value = prompt;
  document.getElementById('proxy-test-model').value = model;
  switchView('proxy-view');
}

// ── Voice Studio & Cloner (REA) ──────────────────────────────────────────────
let TAKES = [];
let CURRENT_TAKE = null;
let REF_AUDIO_BASE64 = '';
let MEDIA_RECORDER = null;
let RECORDED_CHUNKS = [];
let IS_MIC_RECORDING = false;
let MIC_START_TIME = 0;
let MIC_TIMER_INTERVAL = null;
let CURRENT_TTS_EMOTION = 'neutral';
let ACTIVE_SPEAKER_PROFILE = null;
let LIVE_AUDIO_CTX = null;
let LIVE_ANALYSER = null;
let LIVE_VU_FRAME = null;
let LIVE_MIC_STREAM = null;
let PROMPTER_INDEX = 0;
const PROMPTER_PHRASES = [
  "The stars flickered over the obsidian towers as our ship breached the atmosphere.",
  "In a forgotten corner of the city, an old clockmaker rewound the gears of lost time.",
  "Beneath the neon rain of Neo-Kyoto, a lone detective sought whispers in the shadows.",
  "Listen closely to the wind through the pines; every forest carries an ancient song.",
  "Welcome to the creative nexus. Let us synthesize worlds that defy conventional gravity."
];

async function loadVoices() {
  try {
    const [voicesRes, takesRes] = await Promise.all([
      fetch('/api/voices'),
      fetch('/api/voice/takes')
    ]);
    if (!voicesRes.ok) throw new Error('Voice API unavailable');
    const voicesData = await voicesRes.json();
    VOICES = voicesData.voices || [];

    const takesData = takesRes.ok ? await takesRes.json() : { takes: [] };
    TAKES = takesData.takes || [];

    renderVoiceProfiles(VOICES);
    populateVoiceSelects(VOICES);
    renderTakesList(TAKES);
    updateActiveSpeakerHUD();
  } catch (e) {
    try {
      const res2 = await fetch('data/voice_profiles.json');
      if (res2.ok) {
        const vData = await res2.json();
        VOICES = vData.profiles || vData || [];
        renderVoiceProfiles(VOICES);
        populateVoiceSelects(VOICES);
        updateActiveSpeakerHUD();
        return;
      }
    } catch (_) {}
    try {
      const res3 = await fetch('../data/voice_profiles.json');
      if (res3.ok) {
        const vData = await res3.json();
        VOICES = vData.profiles || vData || [];
        renderVoiceProfiles(VOICES);
        populateVoiceSelects(VOICES);
        updateActiveSpeakerHUD();
        return;
      }
    } catch (_) {}
    console.warn('Voice loading error:', e);
  }
}

function renderVoiceProfiles(voices) {
  const container = document.getElementById('profiles-list');
  const countBadge = document.getElementById('profiles-count-badge');
  if (countBadge) countBadge.textContent = `${voices.length} profiles`;
  if (!container) return;

  if (voices.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 18px; font-size: 12px;">No voice profiles found. Record or drop a sample above!</div>`;
    return;
  }

  container.innerHTML = voices.map(v => {
    const initial = (v.name || 'V')[0].toUpperCase();
    const sig = v.acoustic_signature || {};
    const reg = sig.vocal_register || (v.base_pitch_hz > 200 ? 'Soprano' : v.base_pitch_hz > 150 ? 'Tenor' : 'Baritone');
    const f0 = Math.round(v.base_pitch_hz || 140);
    const snr = sig.snr_db ? `${sig.snr_db} dB` : null;
    const isSelected = ACTIVE_SPEAKER_PROFILE && ACTIVE_SPEAKER_PROFILE.id === v.id;

    return `
      <div class="profile-card-item ${isSelected ? 'selected' : ''}" data-profile-id="${v.id}">
        <div class="profile-avatar-circle">${initial}</div>
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; font-size: 13.5px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(v.name)}</span>
            <span class="card-tag" style="font-size: 9.5px; padding: 1px 6px;">${escapeHtml(reg)}</span>
            ${v.accent ? `<span style="font-size: 10px; color: var(--text-dim);">${escapeHtml(v.accent)}</span>` : ''}
          </div>
          <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(v.tone || 'Acoustic vocal signature')}
          </div>
          <div style="font-size: 10.5px; color: var(--accent-cyan); font-family: var(--font-mono); margin-top: 3px;">
            F0: ${f0} Hz ${snr ? `· SNR: ${snr}` : ''}
          </div>
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;" title="Use as active voice" onclick="selectVoiceProfile('${v.id}')">
            <span>Use</span>
          </button>
          ${v.ref_audio_path ? `
            <button class="btn btn-secondary" style="padding: 4px 6px; font-size: 11px;" title="Play reference audio" onclick="playAudioFile('/api/voice/audio/${v.id}')">
              <span>▶</span>
            </button>
          ` : ''}
          ${!v.is_preset ? `
            <button class="btn btn-secondary" style="padding: 4px 6px; font-size: 11px; color: #f87171;" title="Delete custom profile" onclick="deleteVoiceProfile('${v.id}', '${escapeHtml(v.name)}')">
              <span>✕</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function filterVoiceProfiles() {
  const query = (document.getElementById('profile-search')?.value || '').toLowerCase();
  if (!query) {
    renderVoiceProfiles(VOICES);
    return;
  }
  const filtered = VOICES.filter(v =>
    (v.name || '').toLowerCase().includes(query) ||
    (v.tone || '').toLowerCase().includes(query) ||
    (v.accent || '').toLowerCase().includes(query) ||
    ((v.acoustic_signature?.vocal_register || '')).toLowerCase().includes(query)
  );
  renderVoiceProfiles(filtered);
}

function populateVoiceSelects(voices) {
  const ttsSelect = document.getElementById('tts-voice-select');
  const dirSelect = document.getElementById('dir-voice-select');
  const opts = voices.map(v => `<option value="${v.id}">${escapeHtml(v.name)} (${Math.round(v.base_pitch_hz || 140)} Hz)</option>`).join('');
  if (ttsSelect) ttsSelect.innerHTML = opts;
  if (dirSelect) dirSelect.innerHTML = opts;
  if (!ACTIVE_SPEAKER_PROFILE && voices.length > 0) {
    ACTIVE_SPEAKER_PROFILE = voices[0];
  }
}

function handleVoiceSelectChange() {
  const selId = document.getElementById('tts-voice-select')?.value;
  ACTIVE_SPEAKER_PROFILE = VOICES.find(v => v.id === selId) || VOICES[0];
  updateActiveSpeakerHUD();
  renderVoiceProfiles(VOICES);
}

function selectVoiceProfile(profileId) {
  const ttsSelect = document.getElementById('tts-voice-select');
  if (ttsSelect) {
    ttsSelect.value = profileId;
    handleVoiceSelectChange();
  }
}

function updateActiveSpeakerHUD() {
  const pill = document.getElementById('active-voice-pill');
  const tag = document.getElementById('voice-register-tag');
  if (!ACTIVE_SPEAKER_PROFILE) return;

  const f0 = Math.round(ACTIVE_SPEAKER_PROFILE.base_pitch_hz || 140);
  const reg = ACTIVE_SPEAKER_PROFILE.acoustic_signature?.vocal_register || (f0 > 200 ? 'Soprano' : f0 > 150 ? 'Tenor' : 'Baritone');
  if (pill) pill.textContent = `Active: ${ACTIVE_SPEAKER_PROFILE.name} (${f0} Hz)`;
  if (tag) tag.textContent = `${reg} · ${f0} Hz`;

  // Update deep formant bars if available
  const formants = ACTIVE_SPEAKER_PROFILE.formants || {};
  const sig = ACTIVE_SPEAKER_PROFILE.acoustic_signature || {};
  updateAcousticFormantBars({
    f1: formants.f1 || 480,
    f2: formants.f2 || 1350,
    f3: formants.f3 || 2300,
    f4: formants.f4 || (formants.f3 ? Math.round(formants.f3 * 1.5) : 3500),
    pitch_spread_st: sig.pitch_spread_st || 1.8,
    voicing_ratio: sig.voicing_ratio || 0.92,
    warmth: sig.warmth || 0.88
  });
}

function updateAcousticFormantBars(data) {
  const f1 = data.f1 || 480;
  const f2 = data.f2 || 1350;
  const f3 = data.f3 || 2300;
  const f4 = data.f4 || 3500;
  const spread = data.pitch_spread_st !== undefined ? data.pitch_spread_st : 1.8;
  const voicing = data.voicing_ratio !== undefined ? (data.voicing_ratio <= 1.0 ? Math.round(data.voicing_ratio * 100) : data.voicing_ratio) : 92;
  const warmth = data.warmth || 0.88;

  const f1El = document.getElementById('sig-f1-val');
  const f1Fill = document.getElementById('sig-f1-fill');
  const f2El = document.getElementById('sig-f2-val');
  const f2Fill = document.getElementById('sig-f2-fill');
  const f3El = document.getElementById('sig-f3-val');
  const f3Fill = document.getElementById('sig-f3-fill');
  const f4El = document.getElementById('sig-f4-val');
  const f4Fill = document.getElementById('sig-f4-fill');
  const spreadEl = document.getElementById('sig-spread-val');
  const spreadFill = document.getElementById('sig-spread-fill');
  const voicingEl = document.getElementById('sig-voicing-val');
  const voicingFill = document.getElementById('sig-voicing-fill');
  const warmthEl = document.getElementById('sig-warmth-val');
  const warmthFill = document.getElementById('sig-warmth-fill');

  if (f1El) f1El.textContent = `${f1} Hz`;
  if (f1Fill) f1Fill.style.width = `${Math.min(100, Math.max(15, (f1 / 900) * 100))}%`;
  if (f2El) f2El.textContent = `${f2} Hz`;
  if (f2Fill) f2Fill.style.width = `${Math.min(100, Math.max(15, (f2 / 2400) * 100))}%`;
  if (f3El) f3El.textContent = `${f3} Hz`;
  if (f3Fill) f3Fill.style.width = `${Math.min(100, Math.max(15, (f3 / 3400) * 100))}%`;
  if (f4El) f4El.textContent = `${f4} Hz`;
  if (f4Fill) f4Fill.style.width = `${Math.min(100, Math.max(15, (f4 / 4500) * 100))}%`;
  if (spreadEl) spreadEl.textContent = `±${typeof spread === 'number' ? spread.toFixed(1) : spread} st`;
  if (spreadFill) spreadFill.style.width = `${Math.min(100, Math.max(20, (parseFloat(spread) / 6.0) * 100))}%`;
  if (voicingEl) voicingEl.textContent = `${voicing}%`;
  if (voicingFill) voicingFill.style.width = `${Math.min(100, Math.max(20, voicing))}%`;
  if (warmthEl) warmthEl.textContent = typeof warmth === 'number' ? warmth.toFixed(2) : warmth;
  if (warmthFill) warmthFill.style.width = `${Math.min(100, Math.max(20, parseFloat(warmth) * 85))}%`;
}


// ── VoiceStudio REA Audio Input & Live Microphone ────────────────────────────
function switchVoiceMode(mode) {
  const tabMic = document.getElementById('tab-mode-mic');
  const tabUpload = document.getElementById('tab-mode-upload');
  const secMic = document.getElementById('mode-mic-section');
  const secUpload = document.getElementById('mode-upload-section');

  if (mode === 'mic') {
    if (tabMic) tabMic.classList.add('active');
    if (tabUpload) tabUpload.classList.remove('active');
    if (secMic) secMic.style.display = 'block';
    if (secUpload) secUpload.style.display = 'none';
  } else {
    if (tabUpload) tabUpload.classList.add('active');
    if (tabMic) tabMic.classList.remove('active');
    if (secMic) secMic.style.display = 'none';
    if (secUpload) secUpload.style.display = 'block';
  }
}

function cyclePrompterText() {
  PROMPTER_INDEX = (PROMPTER_INDEX + 1) % PROMPTER_PHRASES.length;
  const phrase = PROMPTER_PHRASES[PROMPTER_INDEX];
  const el = document.getElementById('teleprompter-phrase');
  if (el) el.textContent = phrase;
  const transcriptInput = document.getElementById('ref-transcript-input');
  if (transcriptInput && !transcriptInput.value) {
    transcriptInput.value = phrase;
  }
}

// ── Client-side 16-bit PCM WAV Encoder ─────────────────────────────────────────
function audioBufferToWavBlob(buffer) {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);
  const numSamples = channelData.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * bytesPerSample;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  function writeString(offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, val, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

async function handleAudioUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  SELECTED_AUDIO_FILE = file;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContextClass();
    const arrayBuf = await file.arrayBuffer();
    const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
    const wavBlob = audioBufferToWavBlob(audioBuf);
    audioCtx.close();

    const wavReader = new FileReader();
    wavReader.onload = async () => {
      REF_AUDIO_BASE64 = wavReader.result;
      SELECTED_AUDIO_FILE = new File([wavBlob], file.name.replace(/\.[^/.]+$/, '') + '.wav', { type: 'audio/wav' });
      setupReferenceAudioPlayer(REF_AUDIO_BASE64, file.name, wavBlob.size);
      await analyzeAudioQuality(REF_AUDIO_BASE64);
    };
    wavReader.readAsDataURL(wavBlob);
  } catch (err) {
    console.warn('Direct upload fallback:', err);
    const reader = new FileReader();
    reader.onload = async () => {
      REF_AUDIO_BASE64 = reader.result;
      setupReferenceAudioPlayer(REF_AUDIO_BASE64, file.name, file.size);
      await analyzeAudioQuality(REF_AUDIO_BASE64);
    };
    reader.readAsDataURL(file);
  }
}

// ── 1-Click Instant Microphone Recording with Real-Time VU Meter ─────────────
async function toggleInstantRecord() {
  if (IS_MIC_RECORDING) {
    stopInstantRecord();
  } else {
    await startInstantRecord();
  }
}

async function startInstantRecord() {
  try {
    LIVE_MIC_STREAM = await navigator.mediaDevices.getUserMedia({ audio: true });
    RECORDED_CHUNKS = [];

    // Set up Web Audio API Analyser for Live VU Meter
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      LIVE_AUDIO_CTX = new AudioContextClass();
      const source = LIVE_AUDIO_CTX.createMediaStreamSource(LIVE_MIC_STREAM);
      LIVE_ANALYSER = LIVE_AUDIO_CTX.createAnalyser();
      LIVE_ANALYSER.fftSize = 256;
      source.connect(LIVE_ANALYSER);

      const vuFill = document.getElementById('vu-meter-fill');
      const updateVuMeter = () => {
        if (!IS_MIC_RECORDING || !LIVE_ANALYSER) return;
        const data = new Uint8Array(LIVE_ANALYSER.frequencyBinCount);
        LIVE_ANALYSER.getByteTimeDomainData(data);

        let sumSquares = 0;
        for (let i = 0; i < data.length; i++) {
          const norm = (data[i] - 128) / 128;
          sumSquares += norm * norm;
        }
        const rms = Math.sqrt(sumSquares / data.length);
        const pct = Math.min(100, Math.max(3, Math.round(rms * 340)));
        if (vuFill) vuFill.style.width = pct + '%';

        LIVE_VU_FRAME = requestAnimationFrame(updateVuMeter);
      };
      LIVE_VU_FRAME = requestAnimationFrame(updateVuMeter);
    } catch (audioErr) {
      console.warn('VU meter audio context init warning:', audioErr);
    }

    // MediaRecorder setup
    let mimeType = 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
      mimeType = 'audio/ogg;codecs=opus';
    }

    MEDIA_RECORDER = new MediaRecorder(LIVE_MIC_STREAM, { mimeType });
    MEDIA_RECORDER.ondataavailable = (e) => {
      if (e.data.size > 0) RECORDED_CHUNKS.push(e.data);
    };

    MEDIA_RECORDER.onstop = async () => {
      const rawBlob = new Blob(RECORDED_CHUNKS, { type: mimeType });
      let wavBlob = rawBlob;

      // Decode and convert to crystal-clear 16-bit PCM WAV
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const tempCtx = new AudioContextClass();
        const arrayBuf = await rawBlob.arrayBuffer();
        const audioBuf = await tempCtx.decodeAudioData(arrayBuf);
        wavBlob = audioBufferToWavBlob(audioBuf);
        tempCtx.close();
      } catch (convErr) {
        console.warn('Browser WAV conversion fallback to rawBlob:', convErr);
      }

      const reader = new FileReader();
      reader.onload = async () => {
        REF_AUDIO_BASE64 = reader.result;
        SELECTED_AUDIO_FILE = new File([wavBlob], 'my_voice_sample.wav', { type: 'audio/wav' });

        const audioElem = document.getElementById('ref-audio-element');
        if (audioElem) audioElem.src = REF_AUDIO_BASE64;

        // Run VoiceStudio quality evaluation on true WAV
        await analyzeAudioQuality(REF_AUDIO_BASE64);

        // Show Ready box
        const successBox = document.getElementById('quick-clone-success-box');
        const statusMsg = document.getElementById('quick-status-msg');
        if (successBox) successBox.style.display = 'block';

        const elapsedSec = ((Date.now() - MIC_START_TIME) / 1000).toFixed(1);
        if (statusMsg) {
          statusMsg.textContent = `Audio Sample Captured (${elapsedSec}s · 16-bit PCM WAV) · Ready to Clone`;
        }

        // Auto-clone if enabled
        const autoClone = document.getElementById('auto-clone-checkbox')?.checked;
        if (autoClone) {
          await cloneVoiceProfile(true);
        }
      };
      reader.readAsDataURL(wavBlob);

      // Stop mic tracks
      if (LIVE_MIC_STREAM) {
        LIVE_MIC_STREAM.getTracks().forEach(t => t.stop());
        LIVE_MIC_STREAM = null;
      }
    };

    MEDIA_RECORDER.start(100);
    IS_MIC_RECORDING = true;
    MIC_START_TIME = Date.now();

    // UI Updates
    const giantBtn = document.getElementById('btn-giant-record');
    const btnIcon = document.getElementById('record-btn-icon');
    const btnText = document.getElementById('record-btn-text');
    const btnSub = document.getElementById('record-btn-sub');
    const timeText = document.getElementById('recording-time-text');
    const hintText = document.getElementById('recording-status-hint');
    const successBox = document.getElementById('quick-clone-success-box');

    if (giantBtn) giantBtn.classList.add('recording-active');
    if (btnIcon) btnIcon.textContent = '⏹';
    if (btnText) btnText.textContent = 'STOP RECORDING';
    if (btnSub) btnSub.textContent = 'Click to finish & clone';
    if (successBox) successBox.style.display = 'none';

    if (hintText) hintText.textContent = 'Recording active... Read the phrase above clearly!';

    MIC_TIMER_INTERVAL = setInterval(() => {
      const elapsed = ((Date.now() - MIC_START_TIME) / 1000).toFixed(1);
      if (timeText) {
        timeText.textContent = `● RECORDING: ${elapsed}s (Optimal: 5-10s)`;
      }
      if (elapsed >= 15.0) {
        stopInstantRecord();
      }
    }, 100);

  } catch (err) {
    console.error('Microphone error:', err);
    alert('Could not access microphone: ' + err.message + '\nPlease allow microphone permissions in your browser or use the "Upload Audio File" tab.');
  }
}

function stopInstantRecord() {
  if (MEDIA_RECORDER && IS_MIC_RECORDING) {
    MEDIA_RECORDER.stop();
  }
  IS_MIC_RECORDING = false;
  clearInterval(MIC_TIMER_INTERVAL);

  if (LIVE_VU_FRAME) {
    cancelAnimationFrame(LIVE_VU_FRAME);
    LIVE_VU_FRAME = null;
  }
  if (LIVE_AUDIO_CTX && LIVE_AUDIO_CTX.state !== 'closed') {
    LIVE_AUDIO_CTX.close().catch(() => {});
    LIVE_AUDIO_CTX = null;
  }
  const vuFill = document.getElementById('vu-meter-fill');
  if (vuFill) vuFill.style.width = '0%';

  const giantBtn = document.getElementById('btn-giant-record');
  const btnIcon = document.getElementById('record-btn-icon');
  const btnText = document.getElementById('record-btn-text');
  const btnSub = document.getElementById('record-btn-sub');
  const timeText = document.getElementById('recording-time-text');
  const hintText = document.getElementById('recording-status-hint');

  if (giantBtn) giantBtn.classList.remove('recording-active');
  if (btnIcon) btnIcon.textContent = '';
  if (btnText) btnText.textContent = 'START RECORDING';
  if (btnSub) btnSub.textContent = 'Click to record 5-10s clip';
  if (timeText) timeText.textContent = '● RECORDING FINISHED';
  if (hintText) hintText.textContent = 'Analyzing acoustic signature & noise floor...';
}

// Fallback alias for legacy button
function toggleMicRecording() {
  toggleInstantRecord();
}

function setupReferenceAudioPlayer(dataUrl, name, sizeBytes) {
  const dropText = document.getElementById('drop-text');
  const canvas = document.getElementById('ref-waveform-canvas');
  const playBtn = document.getElementById('btn-play-ref');
  const audioElem = document.getElementById('ref-audio-element');

  if (dropText) {
    dropText.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
        <span style="font-size: 11px; font-family: var(--font-mono); color: var(--text-dim);">[AUDIO]</span>
        <strong style="color: #fff;">${escapeHtml(name)}</strong>
        <span style="color: var(--text-dim); font-family: var(--font-mono); font-size: 11px;">(${(sizeBytes / 1024).toFixed(1)} KB)</span>
      </div>
    `;
  }

  if (audioElem) {
    audioElem.src = dataUrl;
  }
  if (playBtn) playBtn.style.display = 'inline-flex';
  if (canvas) {
    canvas.style.display = 'block';
    drawSimulatedWaveform(canvas);
  }
}

function playReferenceAudio() {
  const audioElem = document.getElementById('ref-audio-element');
  if (audioElem && audioElem.src) {
    audioElem.currentTime = 0;
    audioElem.play().catch(e => console.warn('Audio play error:', e));
  } else if (REF_AUDIO_BASE64) {
    const tempAudio = new Audio(REF_AUDIO_BASE64);
    tempAudio.play().catch(e => console.warn('Audio play error:', e));
  } else {
    alert('No recorded voice sample yet!');
  }
}

function playAudioFile(url) {
  LAST_CLONED_TAKE_AUDIO = url;
  const btnTake = document.getElementById('ab-btn-take');
  const btnRef = document.getElementById('ab-btn-ref');
  if (btnTake) btnTake.classList.add('active');
  if (btnRef) btnRef.classList.remove('active');

  const player = document.getElementById('tts-audio-player');
  if (player) {
    player.src = url;
    player.play().catch(e => console.log('Autoplay audio:', e));
  }
}


// ── VoiceStudio REA Audio Quality Radar & Hexagonal Canvas ───────────────────
function drawAudioQualityRadar(metrics) {
  const canvas = document.getElementById('quality-radar-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width = 280;
  const H = canvas.height = 280;
  const cx = W / 2, cy = H / 2;
  const radius = Math.min(cx, cy) - 40;

  ctx.clearRect(0, 0, W, H);

  const m = metrics || {
    snr: 28.5,
    clipping: 0.0,
    duration: 8.5,
    silence: 0.0,
    baseline: -18,
    stability: 0.94
  };

  const axes = [
    { label: 'SNR (Noise)', score: Math.min(1, Math.max(0.12, (m.snr || 25) / 35)) },
    { label: 'Clip Purity', score: Math.min(1, Math.max(0.12, 1 - ((m.clipping || 0) / 4))) },
    { label: 'Duration', score: (m.duration >= 5 && m.duration <= 15) ? 0.95 : (m.duration > 3 ? 0.65 : 0.3) },
    { label: 'Dead Air', score: Math.min(1, Math.max(0.15, 1 - ((m.silence || 0) / 2))) },
    { label: 'RMS Dynamic', score: (m.baseline >= -28 && m.baseline <= -10) ? 0.90 : 0.55 },
    { label: 'F0 Stability', score: m.stability || 0.92 }
  ];

  const numAxes = axes.length;
  const angleStep = (Math.PI * 2) / numAxes;

  // Concentric Hexagonal Rings (20%, 40%, 60%, 80%, 100%)
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];
  levels.forEach((lvl, lvlIdx) => {
    ctx.beginPath();
    for (let i = 0; i < numAxes; i++) {
      const angle = (i * angleStep) - (Math.PI / 2);
      const r = radius * lvl;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = lvlIdx === levels.length - 1 ? 'rgba(255, 255, 255, 0.24)' : 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = lvlIdx === levels.length - 1 ? 1.5 : 1;
    ctx.stroke();

    if (lvlIdx === levels.length - 1 || lvlIdx === 2) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText(`${Math.round(lvl * 100)}%`, cx + 3, cy - (radius * lvl) + 10);
    }
  });

  // Axis Spokes & Labels
  for (let i = 0; i < numAxes; i++) {
    const angle = (i * angleStep) - (Math.PI / 2);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const labelR = radius + 20;
    const lx = cx + Math.cos(angle) * labelR;
    const ly = cy + Math.sin(angle) * labelR;

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '500 9.5px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(axes[i].label, lx, ly);
  }

  // Monochromatic Polygonal Area
  ctx.save();
  ctx.beginPath();
  const points = [];
  for (let i = 0; i < numAxes; i++) {
    const angle = (i * angleStep) - (Math.PI / 2);
    const r = radius * Math.min(1.0, Math.max(0.12, axes[i].score));
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    points.push({ x, y });
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  const polyGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
  polyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
  polyGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.08)');
  polyGrad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
  ctx.fillStyle = polyGrad;
  ctx.fill();

  ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
  ctx.shadowBlur = 8;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();

  // Glow Points on Vertices
  points.forEach(pt => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.restore();
  });
}

async function analyzeAudioQuality(audioBase64) {
  const radarBox = document.getElementById('quality-radar-box');
  const badge = document.getElementById('radar-status-badge');
  const snrEl = document.getElementById('radar-snr');
  const clipEl = document.getElementById('radar-clipping');
  const durEl = document.getElementById('radar-duration');
  const silenceEl = document.getElementById('radar-silence');
  const f0El = document.getElementById('radar-f0');
  const purityEl = document.getElementById('radar-purity');
  const advList = document.getElementById('radar-advisories');
  const durBadge = document.getElementById('ref-duration-badge');
  const quickSnrBadge = document.getElementById('quick-snr-badge');

  if (radarBox) radarBox.style.display = 'block';

  try {
    const res = await fetch('/api/voice/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_base64: audioBase64 })
    });
    const rep = await res.json();

    if (snrEl) snrEl.textContent = `${rep.snr_db} dB`;
    if (clipEl) clipEl.textContent = `${rep.clipping_pct}%`;
    if (durEl) durEl.textContent = `${rep.duration_sec}s`;
    if (silenceEl) silenceEl.textContent = `${rep.dead_air_sec || '0.0'}s`;
    if (durBadge) durBadge.textContent = `${rep.duration_sec}s (${rep.status.toUpperCase()})`;
    if (quickSnrBadge && rep.snr_db !== undefined) {
      quickSnrBadge.textContent = `SNR: ${rep.snr_db} dB · ${rep.status.toUpperCase()}`;
    }

    const purityScore = Math.max(70, Math.min(99, Math.round(100 - (rep.clipping_pct * 8) - (rep.snr_db < 20 ? (20 - rep.snr_db) * 2 : 0))));
    if (purityEl) purityEl.textContent = `${purityScore}%`;

    // Status Badge
    if (badge) {
      badge.className = rep.status === 'pristine'
        ? 'quality-badge-pristine'
        : rep.status === 'good'
          ? 'quality-badge-good'
          : 'quality-badge-caution';
      badge.textContent = rep.status_badge || rep.status;
    }

    if (f0El) {
      f0El.textContent = rep.baseline_db ? `${rep.baseline_db} dB RMS` : '--';
    }

    // Formant Cavity meters update
    updateAcousticFormantBars({
      f1: rep.f1_hz || 480,
      f2: rep.f2_hz || 1350,
      f3: rep.f3_hz || 2300,
      f4: rep.f4_hz || 3500,
      pitch_spread_st: rep.pitch_spread_st || 1.8,
      voicing_ratio: rep.voicing_ratio || 0.92,
      warmth: rep.warmth || 0.88
    });


    // Render Hexagonal Radar Chart
    drawAudioQualityRadar({
      snr: rep.snr_db,
      clipping: rep.clipping_pct,
      duration: rep.duration_sec,
      silence: rep.dead_air_sec || 0,
      baseline: rep.baseline_db || -18,
      stability: 0.94
    });

    // Render advisory list
    if (advList) {
      if (!rep.warnings || rep.warnings.length === 0) {
        advList.innerHTML = `<div class="advisory-item">Preflight Clear: No clipping, clean noise floor.</div>`;
      } else {
        advList.innerHTML = rep.warnings.map(w => `
          <div class="advisory-item">
            <span>[${w.start}s - ${w.end}s]</span> ${escapeHtml(w.message)}
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.warn('Audio quality analysis failed:', err);
    drawAudioQualityRadar();
  }
}

// ── VoiceStudio Voice Design Workspace ────────────────────────────────────────
function switchVoiceStudioWorkspace(mode) {
  const btnClone = document.getElementById('ws-tab-clone');
  const btnDesign = document.getElementById('ws-tab-design');
  const panelClone = document.getElementById('ws-clone-panel');
  const panelDesign = document.getElementById('ws-design-panel');

  if (mode === 'clone') {
    if (btnClone) btnClone.classList.add('active');
    if (btnDesign) btnDesign.classList.remove('active');
    if (panelClone) panelClone.style.display = 'block';
    if (panelDesign) panelDesign.style.display = 'none';
    drawAudioQualityRadar();
  } else {
    if (btnDesign) btnDesign.classList.add('active');
    if (btnClone) btnClone.classList.remove('active');
    if (panelClone) panelClone.style.display = 'none';
    if (panelDesign) panelDesign.style.display = 'block';
  }
}

function applyVoiceDesignPreset(presetKey, el) {
  document.querySelectorAll('.personality-preset-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');

  const presets = {
    narrator: {
      name: 'Sir David II',
      accent: 'British RP',
      desc: 'A warm, distinguished documentary narrator with articulate British RP accent and deep reverberant baritone resonance.',
      f0: 110, warmth: 0.88, clarity: 0.95, pace: 1.00
    },
    detective: {
      name: 'Jack Marlowe (Gravel)',
      accent: 'US Mid-Atlantic',
      desc: 'A gravelly noir detective with a dry baritone drawl, cigarette smoke warmth, and world-weary cadence.',
      f0: 92, warmth: 1.15, clarity: 0.80, pace: 0.90
    },
    anime: {
      name: 'Rin Starfire',
      accent: 'Dynamic Japanese-English',
      desc: 'A fierce, spirited anime heroine with crisp soprano bell-tones, sparkling diction, and heroic emotional surge.',
      f0: 238, warmth: 0.70, clarity: 1.20, pace: 1.15
    },
    clawd: {
      name: 'Clawd Mascot',
      accent: 'Friendly Warm',
      desc: 'A cheerful, curious and friendly mascot with a playful tenor timbre, rounded vowels, and infectious enthusiasm.',
      f0: 178, warmth: 0.95, clarity: 1.05, pace: 1.05
    },
    cyber: {
      name: 'Aria Synth-9',
      accent: 'Synthetic Neutral',
      desc: 'A cool, resonant artificial intelligence synth vocal with shimmering formant harmonics and precise computational cadence.',
      f0: 140, warmth: 0.60, clarity: 1.25, pace: 1.00
    },
    sage: {
      name: 'Master Oogway',
      accent: 'Ancient Whispered',
      desc: 'An ancient mythical elder with a soft, resonant alto whisper, gentle cadence, and timeless contemplative depth.',
      f0: 128, warmth: 1.05, clarity: 0.85, pace: 0.85
    }
  };

  const p = presets[presetKey];
  if (!p) return;

  const descEl = document.getElementById('design-desc');
  const nameEl = document.getElementById('design-name');
  const accentEl = document.getElementById('design-accent');
  const f0El = document.getElementById('design-f0');
  const warmthEl = document.getElementById('design-warmth');
  const clarityEl = document.getElementById('design-clarity');
  const paceEl = document.getElementById('design-pace');

  if (descEl) descEl.value = p.desc;
  if (nameEl) nameEl.value = p.name;
  if (accentEl) accentEl.value = p.accent;
  if (f0El) { f0El.value = p.f0; const dF0 = document.getElementById('design-f0-val'); if (dF0) dF0.textContent = p.f0 + ' Hz'; }
  if (warmthEl) { warmthEl.value = p.warmth; const dW = document.getElementById('design-warmth-val'); if (dW) dW.textContent = p.warmth.toFixed(2); }
  if (clarityEl) { clarityEl.value = p.clarity; const dC = document.getElementById('design-clarity-val'); if (dC) dC.textContent = p.clarity.toFixed(2); }
  if (paceEl) { paceEl.value = p.pace; const dP = document.getElementById('design-pace-val'); if (dP) dP.textContent = p.pace.toFixed(2) + 'x'; }
}

async function synthesizeDesignedVoice() {
  const name = (document.getElementById('design-name')?.value || '').trim() || 'Designed Voice';
  const description = (document.getElementById('design-desc')?.value || '').trim() || 'Parametric voice model';
  const accent = (document.getElementById('design-accent')?.value || '').trim() || 'Standard';
  const base_pitch_hz = parseFloat(document.getElementById('design-f0')?.value || '140');
  const warmth = parseFloat(document.getElementById('design-warmth')?.value || '0.9');
  const clarity = parseFloat(document.getElementById('design-clarity')?.value || '0.9');
  const pace = parseFloat(document.getElementById('design-pace')?.value || '1.0');

  try {
    const res = await fetch('/api/voice/design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        accent,
        base_pitch_hz,
        warmth,
        clarity,
        pace
      })
    });
    const data = await res.json();
    if (data.success && data.profile) {
      await loadVoices();
      selectVoiceProfile(data.profile.id);

      if (data.audio_base64) {
        const player = document.getElementById('tts-audio-player');
        if (player) {
          player.src = data.audio_base64;
          player.play();
        }
        CURRENT_TAKE = data.take;
        const metaBadge = document.getElementById('tts-meta-badge');
        if (metaBadge && data.take) {
          metaBadge.textContent = `${data.take.duration_sec}s · Audition Take ${data.take.take_number}`;
        }
        const activeLabel = document.getElementById('take-active-label');
        if (activeLabel && data.take) {
          activeLabel.textContent = `TAKE ${data.take.take_number}: ${data.profile.name.toUpperCase()} (DESIGNED AUDITION)`;
        }
        const dlBtn = document.getElementById('btn-download-wav');
        if (dlBtn) {
          dlBtn.href = data.audio_base64;
          dlBtn.style.display = 'inline-flex';
        }
      }

      alert(`Designed Voice Profile "${data.profile.name}" created! Audition Take 01 is playing.`);
    } else {
      throw new Error(data.error || 'Voice design failed');
    }
  } catch (err) {
    console.error('Voice design error:', err);
    alert('Voice design failed: ' + err.message);
  }
}

function drawSimulatedWaveform(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.offsetWidth || 340;
  const H = canvas.height = 65;

  ctx.clearRect(0, 0, W, H);
  const bars = Math.floor(W / 4);
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0.2)');

  ctx.fillStyle = grad;
  for (let i = 0; i < bars; i++) {
    const x = i * 4;
    const norm = Math.sin(i * 0.12) * Math.cos(i * 0.05);
    const h = Math.max(4, Math.abs(norm) * (H * 0.85));
    const y = (H - h) / 2;
    ctx.fillRect(x, y, 2.5, h);
  }
}

// ── Voice Cloning & Profile Creation ─────────────────────────────────────────
async function cloneVoiceProfile(isInstant = false) {
  if (!REF_AUDIO_BASE64 && !SELECTED_AUDIO_FILE) {
    alert('Please record your voice or upload an audio file first!');
    return;
  }

  let name = '';
  let desc = '';
  let gender = 'neutral';
  let accent = 'Natural';
  let transcript = '';

  const quickNameInput = document.getElementById('quick-voice-name');
  const prompterPhrase = document.getElementById('teleprompter-phrase')?.textContent.trim() || '';

  if (isInstant) {
    name = (quickNameInput?.value || '').trim() || 'My Voice (Clone)';
    desc = 'Microphone voice clone';
    transcript = prompterPhrase;
  } else {
    name = (document.getElementById('clone-name')?.value || '').trim() || (quickNameInput?.value || '').trim() || 'Custom Clone';
    desc = (document.getElementById('clone-desc')?.value || '').trim() || 'Zero-shot voice profile';
    gender = document.getElementById('clone-gender')?.value || 'neutral';
    accent = (document.getElementById('clone-accent')?.value || '').trim() || 'Custom';
    transcript = (document.getElementById('ref-transcript-input')?.value || '').trim() || prompterPhrase;
  }

  const statusMsg = document.getElementById('quick-status-msg');
  if (statusMsg) statusMsg.textContent = '⏳ Analyzing acoustic signature & creating clone profile...';

  try {
    const res = await fetch('/api/voice/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        tone: desc,
        gender,
        accent,
        transcript,
        audio_base64: REF_AUDIO_BASE64,
        filename: SELECTED_AUDIO_FILE ? SELECTED_AUDIO_FILE.name : 'my_voice.wav'
      })
    });
    const data = await res.json();
    if (data.success && data.profile) {
      await loadVoices();
      selectVoiceProfile(data.profile.id);

      const f0 = Math.round(data.profile.base_pitch_hz || 140);
      const reg = data.profile.acoustic_signature?.vocal_register || 'Standard';

      if (statusMsg) {
        statusMsg.textContent = `Cloned "${data.profile.name}" (${reg}, ${f0} Hz)! Synthesizing sample now...`;
      }

      // Pre-fill speech box with greeting & auto-synthesize
      const ttsBox = document.getElementById('tts-text');
      if (ttsBox) {
        ttsBox.value = `Hello! This is my cloned voice running live in Opus-Motion Studio. How does it sound?`;
        updateScriptCounter();
      }

      // Synthesize speech sample right now so the user immediately hears their clone!
      await synthesizeSpeech();
    } else {
      throw new Error(data.error || 'Cloning failed');
    }
  } catch (err) {
    console.error('Clone failed:', err);
    if (statusMsg) statusMsg.textContent = `Cloning error: ${err.message}`;
    alert('Cloning failed: ' + err.message);
  }
}


async function deleteVoiceProfile(profileId, name) {
  if (!confirm(`Delete voice profile "${name}"?`)) return;
  try {
    await fetch('/api/voice/profile/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: profileId })
    });
    await loadVoices();
  } catch (err) {
    console.error('Delete failed:', err);
  }
}

// ── Script Panel & SSML Presets ──────────────────────────────────────────────
function updateScriptCounter() {
  const text = document.getElementById('tts-text')?.value || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const estSeconds = (words / 2.6).toFixed(1);
  const counter = document.getElementById('script-counter');
  if (counter) counter.textContent = `${words} words · ~${estSeconds}s`;
}

function insertSpeechTag(tag) {
  const textarea = document.getElementById('tts-text');
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const val = textarea.value;
  textarea.value = val.substring(0, start) + ' ' + tag + ' ' + val.substring(end);
  textarea.focus();
  textarea.setSelectionRange(start + tag.length + 2, start + tag.length + 2);
  updateScriptCounter();
}

function loadScriptPreset(key) {
  const presets = {
    trailer: "In a world shattered by digital storms, one rogue intelligence uncovers the architect of the simulation. This winter, nothing is as it seems.",
    noir: "The rain on 4th street never washes the stains away. She walked into my office at midnight, carrying secrets that could burn half the district.",
    nature: "Deep within the primeval canopy, bioluminescent flora awaken with the twilight breeze, weaving a cathedral of living light.",
    anime: "By the ancient pact of the celestial gate, awaken your dormant slumber and shatter the boundary between reality and void!"
  };
  const textarea = document.getElementById('tts-text');
  if (textarea && presets[key]) {
    textarea.value = presets[key];
    updateScriptCounter();
  }
}

async function generateAiVoiceScript() {
  const profileId = ACTIVE_SPEAKER_PROFILE?.id || 'narrator-david';
  const emotion = CURRENT_TTS_EMOTION || 'neutral';
  const topic = prompt('Enter a film scenario, dialogue idea, or topic for Entelechae-code:', 'A moment of profound revelation under an artificial sky');
  if (!topic) return;

  const btn = document.getElementById('ai-script-btn');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = '<span>⏳ Entelechae Thinking...</span>';

  try {
    const res = await fetch('/api/voice/ai-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: topic,
        profile_id: profileId,
        emotion: emotion,
        duration: 12.0
      })
    });
    const data = await res.json();
    if (data.script) {
      const textarea = document.getElementById('tts-text');
      if (textarea) {
        textarea.value = data.script;
        updateScriptCounter();
      }
    }
  } catch (err) {
    console.error('AI voice script failed:', err);
    alert('AI script generation failed: ' + err.message);
  } finally {
    if (btn) btn.innerHTML = originalHtml || '<span>AI Write (Entelechae-code)</span>';
  }
}

let CURRENT_DSP_PRESET = 'broadcast';
let LAST_CLONED_TAKE_AUDIO = null;
let AB_MODE = 'take';

function setDspPreset(presetKey, el) {
  CURRENT_DSP_PRESET = presetKey;
  document.querySelectorAll('.dsp-preset-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  const dspInd = document.getElementById('take-dsp-indicator');
  if (dspInd) {
    const labels = {
      broadcast: 'Broadcast Mastering',
      cinematic: 'Cinematic Trailer',
      podcast: 'Podcast Mastering',
      warm: 'Tube Warmth',
      bright: 'Crystal Air Sheen',
      raw: 'Raw Direct Output'
    };
    dspInd.textContent = labels[presetKey] || presetKey;
  }
}

function playAuditionAB(mode) {
  AB_MODE = mode;
  const player = document.getElementById('tts-audio-player');
  const btnRef = document.getElementById('ab-btn-ref');
  const btnTake = document.getElementById('ab-btn-take');

  if (mode === 'ref') {
    if (btnRef) btnRef.classList.add('active');
    if (btnTake) btnTake.classList.remove('active');

    const refSrc = REF_AUDIO_BASE64 || (ACTIVE_SPEAKER_PROFILE?.ref_audio_path ? `/api/voice/audio/${ACTIVE_SPEAKER_PROFILE.id}` : null);
    if (refSrc && player) {
      player.src = refSrc;
      player.play().catch(e => console.log('Autoplay gesture required:', e));
    } else {
      alert('No reference vocal audio captured yet. Record or upload a voice sample in the left panel to audition reference audio.');
    }
  } else {
    if (btnTake) btnTake.classList.add('active');
    if (btnRef) btnRef.classList.remove('active');

    if (LAST_CLONED_TAKE_AUDIO && player) {
      player.src = LAST_CLONED_TAKE_AUDIO;
      player.play().catch(e => console.log('Autoplay gesture required:', e));
    }
  }
}

function setTtsEmotion(emotion, btn) {
  CURRENT_TTS_EMOTION = emotion;
  document.querySelectorAll('.emotion-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

// ── Speech Synthesis & Takes Dock ────────────────────────────────────────────
async function synthesizeSpeech() {
  const text = document.getElementById('tts-text')?.value.trim() || 'Welcome to Opus-Motion Studio.';
  const profile_id = document.getElementById('tts-voice-select')?.value || 'narrator-david';
  const speed = parseFloat(document.getElementById('tts-speed')?.value || '1.0');
  const pitch = parseFloat(document.getElementById('tts-pitch')?.value || '1.0');
  const warmth = parseFloat(document.getElementById('tts-warmth')?.value || '0.85');
  const clarity = parseFloat(document.getElementById('tts-clarity')?.value || '0.90');

  const metaBadge = document.getElementById('tts-meta-badge');
  if (metaBadge) metaBadge.textContent = 'Mastering Audio...';

  try {
    const res = await fetch('/api/voice/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        profile_id,
        speed,
        pitch,
        warmth,
        clarity,
        emotion: CURRENT_TTS_EMOTION,
        dsp_preset: CURRENT_DSP_PRESET
      })
    });
    const data = await res.json();
    if (data.audio_base64) {
      CURRENT_TAKE = data.metadata;
      LAST_CLONED_TAKE_AUDIO = data.audio_base64;

      const player = document.getElementById('tts-audio-player');
      if (player) {
        player.src = data.audio_base64;
        player.play().catch(e => console.log('Autoplay audio:', e));
      }

      const btnTake = document.getElementById('ab-btn-take');
      const btnRef = document.getElementById('ab-btn-ref');
      if (btnTake) btnTake.classList.add('active');
      if (btnRef) btnRef.classList.remove('active');

      if (metaBadge) {
        metaBadge.textContent = `${data.metadata.duration_sec}s · Take ${data.metadata.take_number} · ${(data.metadata.dsp_preset || 'broadcast').toUpperCase()}`;
      }

      const dlBtn = document.getElementById('btn-download-wav');
      if (dlBtn) {
        dlBtn.href = data.audio_base64;
        dlBtn.style.display = 'inline-flex';
      }

      const promoteBtn = document.getElementById('btn-promote-take');
      if (promoteBtn) {
        promoteBtn.style.display = 'inline-flex';
      }

      const activeLabel = document.getElementById('take-active-label');
      if (activeLabel) {
        activeLabel.textContent = `TAKE ${data.metadata.take_number}: ${escapeHtml(data.metadata.profile_name.toUpperCase())}`;
      }

      // Update Neural Engine match badge & DSP indicator
      const modelBadge = document.getElementById('take-matched-model-badge');
      if (modelBadge) {
        const modelUsed = data.metadata.model_used || 'en-US-ChristopherNeural';
        modelBadge.textContent = `Neural Match: ${modelUsed}`;
      }
      const dspInd = document.getElementById('take-dsp-indicator');
      if (dspInd) {
        const labels = {
          broadcast: 'Broadcast Mastering',
          cinematic: 'Cinematic Trailer',
          podcast: 'Podcast Mastering',
          warm: 'Tube Warmth',
          bright: 'Crystal Air Sheen',
          raw: 'Raw Direct Output'
        };
        dspInd.textContent = labels[data.metadata.dsp_preset] || `DSP: ${(data.metadata.dsp_preset || 'broadcast').toUpperCase()}`;
      }

      // Reload and update takes dock
      const takesRes = await fetch('/api/voice/takes');
      const takesData = await takesRes.json();
      TAKES = takesData.takes || [];
      renderTakesList(TAKES);
    }
  } catch (err) {
    console.error('Synthesis error:', err);
    if (metaBadge) metaBadge.textContent = 'Error';
  }
}


function renderTakesList(takes) {
  const container = document.getElementById('takes-list-container');
  const countLabel = document.getElementById('takes-count-label');
  if (countLabel) countLabel.textContent = `${takes.length} takes`;
  if (!container) return;

  if (takes.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-dim); font-size: 11.5px; padding: 12px;">No recorded takes yet. Hit "Synthesize Speech" to generate Take 01!</div>`;
    return;
  }

  container.innerHTML = takes.map(t => `
    <div class="take-card">
      <div style="flex: 1; min-width: 0;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 600; font-size: 12px; color: var(--text-main); font-family: var(--font-mono);">Take ${t.take_number}</span>
          <span style="font-size: 11.5px; color: #fff; font-weight: 500;">${escapeHtml(t.profile_name)}</span>
          <span style="font-size: 10px; color: var(--text-dim); font-family: var(--font-mono);">${t.duration_sec}s</span>
          <span class="viseme-pill">${escapeHtml(t.emotion || 'neutral')}</span>
        </div>
        <div style="font-size: 11px; color: var(--text-dim); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          "${escapeHtml(t.clean_text || t.text)}"
        </div>
      </div>
      <div style="display: flex; gap: 6px; align-items: center;">
        <button class="btn btn-secondary" style="padding: 3px 8px; font-size: 10px;" onclick="playAudioFile('/api/voice/take/audio/${t.take_id}')">
          <span>Audition</span>
        </button>
        <button class="btn btn-secondary" style="padding: 3px 8px; font-size: 10px;" onclick="promoteSpecificTake('${t.take_id}', 'Voice from Take ${t.take_number}')">
          <span>Clone</span>
        </button>
      </div>
    </div>
  `).join('');
}

async function promoteCurrentTake() {
  if (!CURRENT_TAKE) return;
  const name = prompt('Name for this new cloned voice profile:', `Voice from Take ${CURRENT_TAKE.take_number}`);
  if (!name) return;
  await promoteSpecificTake(CURRENT_TAKE.take_id, name);
}

async function promoteSpecificTake(takeId, defaultName) {
  try {
    const res = await fetch('/api/voice/take/promote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ take_id: takeId, name: defaultName })
    });
    const data = await res.json();
    if (data.success && data.profile) {
      alert(`Take promoted to Voice Profile '${data.profile.name}'!`);
      await loadVoices();
      selectVoiceProfile(data.profile.id);
    }
  } catch (err) {
    console.error('Take promote failed:', err);
  }
}

// ── Dubbing Cues & Viseme Synchronization ────────────────────────────────────
async function generateDubbingCues() {
  const text = document.getElementById('tts-text')?.value || 'The stars flickered over the towers.';
  const dur = CURRENT_TAKE ? CURRENT_TAKE.duration_sec : DURATION;

  const sentences = text.match(/[^.!?]+[.!?]+|\S+/g) || [text];
  const cues = sentences.map((s, idx) => ({
    text: s.trim(),
    start_sec: idx * (dur / sentences.length),
    end_sec: (idx + 1) * (dur / sentences.length),
    profile_id: document.getElementById('tts-voice-select')?.value || 'narrator-david'
  }));

  try {
    const res = await fetch('/api/voice/dub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cues, video_duration_sec: dur })
    });
    const data = await res.json();
    renderDubbingTable(data.cues);
  } catch (e) {
    console.error('Dubbing cue error:', e);
  }
}

function renderDubbingTable(cues) {
  const container = document.getElementById('dubbing-table-container');
  const table = document.getElementById('dubbing-cues-table');
  if (!container || !table) return;

  container.style.display = 'block';
  table.innerHTML = `
    <tr style="background: rgba(255,255,255,0.06); color: var(--accent-cyan);">
      <th style="padding: 6px;">Cue</th>
      <th style="padding: 6px;">Time</th>
      <th style="padding: 6px;">Line</th>
      <th style="padding: 6px;">Speed</th>
      <th style="padding: 6px;">Visemes</th>
    </tr>
    ${cues.map(c => `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td style="padding: 6px; font-family: var(--font-mono);">${c.cue_index}</td>
        <td style="padding: 6px; font-family: var(--font-mono);">${c.start_sec}s - ${c.end_sec}s</td>
        <td style="padding: 6px;">${escapeHtml(c.text)}</td>
        <td style="padding: 6px; font-family: var(--font-mono); color: var(--text-main);">${c.speed_ratio}x</td>
        <td style="padding: 6px;">
          <span class="viseme-pill">A/O/E</span>
        </td>
      </tr>
    `).join('')}
  `;
}

function syncSpeechToStage() {
  const text = document.getElementById('tts-text')?.value || '';
  const dirStory = document.getElementById('dir-story');
  if (dirStory) dirStory.value = text;

  const player = document.getElementById('tts-audio-player');
  if (player && player.src) {
    player.currentTime = 0;
    player.play().catch(e => console.log('Audio playback gesture warning:', e));
  }

  // Switch to director view and trigger live stage animation
  switchView('director-view');
  IS_PLAYING = true;
  ANIM_START_TIME = performance.now();
  const icon = document.getElementById('play-icon');
  if (icon) icon.textContent = '⏸️';
}

function speakNarrative() {
  const text = document.getElementById('dir-story')?.value || 'The lighthouse goes dark.';
  const voice = document.getElementById('dir-voice-select')?.value || 'narrator-david';
  document.getElementById('tts-text').value = text;
  document.getElementById('tts-voice-select').value = voice;
  switchView('voice-view');
  synthesizeSpeech();
}


// ── Proxy Gateway ────────────────────────────────────────────────────────────
async function loadProxyStatus() {
  try {
    const res = await fetch('/api/proxy/status');
    const data = await res.json();
    const list = document.getElementById('proxy-models-list');
    if (list && data.models) {
      list.innerHTML = data.models.map(m => `
        <div style="padding: 10px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 6px;">
          <div style="font-weight: 700; font-size: 13px; color: #fff;">${m.name}</div>
          <div style="font-size: 11px; color: var(--accent-cyan); font-family: var(--font-mono);">${m.id} (${m.provider})</div>
          <div style="font-size: 11.5px; color: var(--text-dim); margin-top: 2px;">${m.role}</div>
        </div>
      `).join('');
    }
  } catch (e) {
    console.warn('Proxy status check failed:', e);
  }
}

async function testProxyDispatch() {
  const model = document.getElementById('proxy-test-model')?.value || 'claude-opus-5.5';
  const prompt = document.getElementById('proxy-test-prompt')?.value || 'Hello';
  const box = document.getElementById('proxy-response-box');
  if (box) box.textContent = 'Dispatching prompt to proxy gateway...';

  try {
    const res = await fetch('/api/proxy/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model })
    });
    const data = await res.json();
    if (box) box.textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    if (box) box.textContent = 'Proxy route dispatched (Offline Bridge simulation).';
  }
}

// ── Modal & Screening Room Theatre Utilities ─────────────────────────────────
function openModal(title, meta, content, videoPreviewHtml = '') {
  const titleEl = document.getElementById('modal-title');
  const metaEl = document.getElementById('modal-meta');
  const contentEl = document.getElementById('modal-content');
  const videoBox = document.getElementById('modal-video-container');
  const modal = document.getElementById('prompt-modal');

  if (titleEl) titleEl.textContent = title;
  if (metaEl) metaEl.textContent = meta;
  if (contentEl) contentEl.textContent = content;

  if (videoBox) {
    if (videoPreviewHtml) {
      videoBox.innerHTML = videoPreviewHtml;
      videoBox.style.display = 'block';
    } else {
      videoBox.innerHTML = '';
      videoBox.style.display = 'none';
    }
  }

  if (modal) modal.classList.add('active');
}

function closeModal() {
  const modal = document.getElementById('prompt-modal');
  if (modal) modal.classList.remove('active');
  const videoBox = document.getElementById('modal-video-container');
  if (videoBox) {
    const vid = videoBox.querySelector('video');
    if (vid) {
      vid.pause();
      vid.removeAttribute('src');
      vid.load();
    }
    videoBox.innerHTML = '';
    videoBox.style.display = 'none';
  }
}

let currentScreeningStyle = null;
let currentScreeningEngine = 'video';
let screeningLoopTimer = null;

function switchScreeningEngine(engine) {
  currentScreeningEngine = engine;
  const s = currentScreeningStyle;
  if (!s) return;

  const video = document.getElementById('screening-video');
  const iframe = document.getElementById('screening-iframe');
  const btnVideo = document.getElementById('engine-btn-video');
  const btnWeb = document.getElementById('engine-btn-web');

  if (engine === 'web') {
    if (video) {
      video.pause();
      video.style.display = 'none';
    }
    if (iframe) {
      const embedUrl = s.embed_url || `https://lemomo-ai.github.io/lemo-opuscar/opuscar98/#t=${s.t0 || 0}`;
      iframe.src = embedUrl;
      iframe.style.display = 'block';
    }
    if (btnWeb) btnWeb.classList.add('active');
    if (btnVideo) btnVideo.classList.remove('active');
  } else {
    if (iframe) {
      iframe.removeAttribute('src');
      iframe.style.display = 'none';
    }
    if (video) {
      video.style.display = 'block';
      video.play().catch(e => console.log('Video play catch:', e));
    }
    if (btnVideo) btnVideo.classList.add('active');
    if (btnWeb) btnWeb.classList.remove('active');
  }
}

function openScreeningRoom(slug) {
  const s = STYLES.find(item => item.slug === slug);
  if (!s) return;
  currentScreeningStyle = s;

  const modal = document.getElementById('screening-modal');
  const video = document.getElementById('screening-video');
  const iframe = document.getElementById('screening-iframe');
  const title = document.getElementById('screening-title');
  const sub = document.getElementById('screening-sub');
  const line = document.getElementById('screening-line');
  const kicker = document.getElementById('screening-kicker');
  const tcBadge = document.getElementById('screening-timecode-badge');
  const engineSwitch = document.getElementById('screening-engine-switch');
  const extLink = document.getElementById('screening-external-link');
  const directBtn = document.getElementById('screening-direct-btn');
  const promptBtn = document.getElementById('screening-prompt-btn');

  // Clear previous loop timer
  if (screeningLoopTimer) {
    clearInterval(screeningLoopTimer);
    screeningLoopTimer = null;
  }

  const dur = s.duration_formatted || (s.dur ? `${Math.floor(s.dur/60)}:${Math.floor(s.dur%60).toString().padStart(2,'0')}` : '0:45');
  const frameUrl = s.frame_url || `frames/${s.slug}.jpg`;
  const targetT0 = typeof s.t0 === 'number' ? s.t0 : parseFloat(s.t0 || 0);
  const targetDur = typeof s.dur === 'number' ? s.dur : parseFloat(s.dur || 5);
  const targetT1 = s.t1 ? (typeof s.t1 === 'number' ? s.t1 : parseFloat(s.t1)) : (targetT0 + targetDur);

  if (title) title.innerHTML = `${escapeHtml(s.en)} <small style="font-size: 15px; color: var(--text-muted); font-weight: 500;">(${escapeHtml(s.cn || '')})</small>`;
  if (sub) sub.textContent = `Film: “${s.film || s.en}” · Runtime: ${dur} · ${s.category_en || 'Cinema'}`;
  if (line) line.textContent = s.line || '';

  if (s.is_clawd) {
    if (kicker) kicker.textContent = `Clawd 98 Best Picture Winner · ${s.year || ''} (${s.category_en})`;
    if (engineSwitch) engineSwitch.style.display = 'flex';
    if (extLink) {
      extLink.style.display = 'inline-flex';
      extLink.href = s.embed_url || `https://lemomo-ai.github.io/lemo-opuscar/opuscar98/#t=${targetT0}`;
    }
    if (tcBadge) {
      tcBadge.style.display = 'inline-flex';
      const m0 = Math.floor(targetT0 / 60);
      const s0 = Math.floor(targetT0 % 60);
      const m1 = Math.floor(targetT1 / 60);
      const s1 = Math.floor(targetT1 % 60);
      tcBadge.innerHTML = `Scene Timecode: <b>${m0}:${s0.toString().padStart(2,'0')} – ${m1}:${s1.toString().padStart(2,'0')}</b> (${targetDur.toFixed(1)}s Loop)`;
    }
  } else {
    if (kicker) kicker.textContent = 'Nominee for Best Cinematic Style in Code';
    if (engineSwitch) engineSwitch.style.display = 'none';
    if (extLink) extLink.style.display = 'none';
    if (tcBadge) tcBadge.style.display = 'none';
  }

  if (directBtn) {
    directBtn.onclick = () => {
      closeScreeningRoom();
      directStyle(s.slug);
    };
  }
  if (promptBtn) {
    promptBtn.onclick = () => {
      closeScreeningRoom();
      viewStylePrompt(s.slug);
    };
  }

  // Reset display to video mode by default
  currentScreeningEngine = 'video';
  const btnVideo = document.getElementById('engine-btn-video');
  const btnWeb = document.getElementById('engine-btn-web');
  if (btnVideo) btnVideo.classList.add('active');
  if (btnWeb) btnWeb.classList.remove('active');

  if (iframe) {
    iframe.removeAttribute('src');
    iframe.style.display = 'none';
  }

  if (video) {
    video.style.display = 'block';
    video.poster = frameUrl;

    const rawVideoUrl = s.video_url || `https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/${s.slug}.mp4`;
    const videoSrcWithHash = s.is_clawd ? `${rawVideoUrl}#t=${targetT0}` : rawVideoUrl;

    // Error handler: If video fails, switch automatically to interactive web scene
    video.onerror = () => {
      console.warn('Direct MP4 playback unavailable, switching to interactive web cut:', slug);
      if (s.is_clawd) {
        switchScreeningEngine('web');
      }
    };

    video.src = videoSrcWithHash;

    const onMeta = () => {
      if (s.is_clawd && targetT0 > 0) {
        try {
          video.currentTime = targetT0;
        } catch (err) {}
      }
      video.play().catch(e => console.log('Autoplay requires user gesture:', e));
    };

    video.addEventListener('loadedmetadata', onMeta, { once: true });
    if (video.readyState >= 1) {
      onMeta();
    }

    // Precise segment looping for Clawd films
    if (s.is_clawd) {
      screeningLoopTimer = setInterval(() => {
        if (!video.paused && video.currentTime >= targetT1 - 0.08) {
          video.currentTime = targetT0;
        }
      }, 60);
    }
  }

  if (modal) modal.classList.add('active');
}

function closeScreeningRoom() {
  if (screeningLoopTimer) {
    clearInterval(screeningLoopTimer);
    screeningLoopTimer = null;
  }
  currentScreeningStyle = null;

  const modal = document.getElementById('screening-modal');
  const video = document.getElementById('screening-video');
  const iframe = document.getElementById('screening-iframe');

  if (video) {
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
  if (iframe) {
    iframe.removeAttribute('src');
    iframe.style.display = 'none';
  }
  if (modal) modal.classList.remove('active');
}

// Global Modal Event Listeners
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeScreeningRoom();
  }
});

document.addEventListener('click', e => {
  const pModal = document.getElementById('prompt-modal');
  if (pModal && e.target === pModal) {
    closeModal();
  }
  const sModal = document.getElementById('screening-modal');
  if (sModal && e.target === sModal) {
    closeScreeningRoom();
  }
});

function copyModalContent() {
  const text = document.getElementById('modal-content')?.textContent || '';
  navigator.clipboard.writeText(text);
  alert('Copied to clipboard!');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Fallback Seeds (If API is offline)
function getFallbackStyles() {
  return [
    { slug: 'hd-2d', en: 'HD-2D', cn: 'HD-2D', category_en: 'Games', film: 'The Lampbearer', line: 'The lighthouse goes dark; a girl carries the last flame through a night forest and up the storm cliffs.', uses: ['Game trailers', 'Fantasy', 'Story films'] },
    { slug: 'watercolor', en: 'Watercolor Brush', cn: '水彩笔刷', category_en: 'Hand-drawn', film: 'Follow the Rain', line: 'Wet edges, pigments that run into water, and line that bleeds into puddle.', uses: ['Nature', 'Poetry', 'Children books'] },
    { slug: 'halftone-dossier', en: 'Halftone Dossier', cn: '复古半调案卷', category_en: 'Print', film: 'Case File: Chubby', line: 'Cold War typewriters, paperclips, high contrast halftone black-and-white print dots.', uses: ['Mystery', 'Investigation', 'True Crime'] },
    { slug: 'cel-anime-80s', en: '80s Cel Anime', cn: '80年代赛璐珞动画', category_en: 'Anime', film: 'Hyperdrive Tokyo', line: 'Film grain, saturated neon blues and magentas, hand-painted light glints.', uses: ['Sci-Fi', 'Action', 'Retro'] }
  ];
}

function getFallbackPrompts() {
  return [
    { slug: 'twoclipping-402193', author: 'twoclipping', category: 'motion', tech_tags: ['svg', 'gsap'], prompt: 'Dribbble-level UI motion. One shape, never cut: every state is the same element morphing its size, radius and color while its content swaps with a short blur.' },
    { slug: 'ror-fly-880547', author: 'Ror_Fly', category: 'explainer', tech_tags: ['canvas'], prompt: 'Render a recipe motion graphic animation using javascript or html to show full cocktail recipe ingredients and measurements.' }
  ];
}
