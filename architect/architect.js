/**
 * Wexton Builder v15.2 — Page Deletion & Full Page Scrolling
 */
const Architect = (function () {
    const CONFIG = { gridCols: 60, gridV: 10, deskWidth: 1000 };
    
    function getColWidth() {
        if (document.getElementById('canvas')?.classList.contains('mobile-mode')) return 375 / CONFIG.gridCols;
        if (getActivePage() && getActivePage().type === 'popup') return 600 / CONFIG.gridCols;
        return CONFIG.deskWidth / CONFIG.gridCols;
    }
    
    function pxToCols(px) { return Math.round(px / getColWidth()); }
    function snapY(px) { return Math.round(px / CONFIG.gridV) * CONFIG.gridV; }
    let idCounter = 1;
    function generateId() { return `wx-blk-${idCounter++}`; }

    let assetFiles = new Map(); let assetUrls = new Map();
    let panelDragged = false;

    const LAST_ACTIVE_KEY = 'wexton_last_id';
    const LIBRARY_KEY = 'wexton_library';

    // ── FONT CATEGORIES ──────────────────────────────────────────────
    const FONT_CATEGORIES = [
        { label: 'Geometric Sans', fonts: ['Nunito', 'Poppins', 'Montserrat', 'Outfit', 'Fredoka', 'Jost', 'Quicksand', 'Comfortaa', 'Varela Round', 'Exo 2'] },
        { label: 'Neutral Sans', fonts: ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Source Sans 3', 'Work Sans', 'DM Sans', 'Plus Jakarta Sans', 'Mulish', 'Manrope'] },
        { label: 'Condensed & Display', fonts: ['Oswald', 'Barlow Condensed', 'Bebas Neue', 'Anton', 'Fjalla One', 'Squada One', 'Yanone Kaffeesatz', 'Black Han Sans', 'Big Shoulders Display', 'Teko'] },
        { label: 'Serif', fonts: ['Playfair Display', 'Lora', 'Merriweather', 'EB Garamond', 'Libre Baskerville', 'Cormorant Garamond', 'DM Serif Display', 'Spectral', 'Crimson Text', 'Bitter'] },
        { label: 'Slab Serif', fonts: ['Zilla Slab', 'Roboto Slab', 'Arvo', 'Crete Round', 'Alfa Slab One', 'Slabo 27px', 'Glegoo', 'Neuton', 'Copse', 'Taviraj'] },
        { label: 'Handwriting & Script', fonts: ['Pacifico', 'Dancing Script', 'Satisfy', 'Caveat', 'Sacramento', 'Great Vibes', 'Allura', 'Kaushan Script', 'Lobster', 'Parisienne'] },
        { label: 'Decorative & Quirky', fonts: ['Abril Fatface', 'Righteous', 'Boogaloo', 'Titan One', 'Bangers', 'Lilita One', 'Passion One', 'Russo One', 'Ultra', 'Permanent Marker'] },
        { label: 'Monospace', fonts: ['Fira Code', 'JetBrains Mono', 'Space Mono', 'IBM Plex Mono', 'Inconsolata', 'Source Code Pro', 'Courier Prime', 'Share Tech Mono', 'Cutive Mono', 'VT323'] }
    ];

    // ── INDEXEDDB ────────────────────────────────────────────────────
    var _db = null;
    function _openDB() {
        return new Promise((resolve, reject) => {
            if (_db) return resolve(_db);
            var req = indexedDB.open('wexton_assets', 1);
            req.onupgradeneeded = e => e.target.result.createObjectStore('files');
            req.onsuccess = e => { _db = e.target.result; resolve(_db); };
            req.onerror = reject;
        });
    }
    function _saveAsset(name, file) {
        return _openDB().then(db => new Promise((resolve, reject) => {
            var tx = db.transaction('files', 'readwrite');
            tx.objectStore('files').put(file, name);
            tx.oncomplete = resolve; tx.onerror = reject;
        }));
    }
    function _loadAsset(name) {
        return _openDB().then(db => new Promise((resolve, reject) => {
            var tx = db.transaction('files', 'readonly');
            var req = tx.objectStore('files').get(name);
            req.onsuccess = e => resolve(e.target.result || null);
            req.onerror = reject;
        }));
    }

    // ── ASSET LIBRARY ────────────────────────────────────────────────
    let _stockAssets = { images: [], videos: [], sounds: [] };
    let _assetLibMode = 'media';
    let _assetLibCallback = null;

    function loadStockManifest() {
        return fetch('./assets/manifest.json')
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) _stockAssets = { images: data.images || [], videos: data.videos || [], sounds: data.sounds || [] }; })
            .catch(() => {});
    }

    function openAssetLibrary(mode, callback) {
        _assetLibMode = mode; _assetLibCallback = callback || null;
        _buildAssetLibraryModal(); _populateAssetLibrary();
        document.getElementById('asset-library-modal').style.display = 'flex';
    }

    function _buildAssetLibraryModal() {
        if (document.getElementById('asset-library-modal')) return;
        const modal = document.createElement('div'); modal.id = 'asset-library-modal';
        modal.innerHTML = `
            <div class="lib-backdrop" id="alib-backdrop"></div>
            <div class="alib-dialog">
                <div class="lib-header">
                    <span class="lib-title" id="alib-title">Media Library</span>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <button class="lib-btn" id="alib-upload-btn" style="display:flex;align-items:center;gap:5px;">⬆ Upload</button>
                        <button class="lib-close" id="alib-close-btn">✕</button>
                    </div>
                </div>
                <div class="alib-body" id="alib-body"></div>
            </div>`;
        document.body.appendChild(modal);
        document.getElementById('alib-backdrop').addEventListener('click', () => modal.style.display = 'none');
        document.getElementById('alib-close-btn').addEventListener('click', () => modal.style.display = 'none');
        document.getElementById('alib-upload-btn').addEventListener('click', () => {
            if (_assetLibMode === 'sound') document.getElementById('sound-upload').click();
            else document.getElementById('media-upload').click();
        });
    }

    function _populateAssetLibrary() {
        const modal = document.getElementById('asset-library-modal'); if (!modal) return;
        const isSound = _assetLibMode === 'sound';
        document.getElementById('alib-title').textContent = isSound ? 'Sound Library' : 'Media Library';
        const stockItems = isSound ? (_stockAssets.sounds || []) : [...(_stockAssets.images || []), ...(_stockAssets.videos || [])];
        const uploadedItems = [];
        assetFiles.forEach((_, name) => {
            const isAud = /\.(mp3|wav|ogg|aac|m4a)$/i.test(name);
            if (isSound === isAud) uploadedItems.push(name);
        });
        let html = '';
        if (stockItems.length) {
            html += `<div class="alib-section-title">Stock Assets</div><div class="${isSound ? 'alib-audio-grid' : 'alib-grid'}">`;
            stockItems.forEach(n => { html += isSound ? _renderAudioCard(n, true) : _renderMediaCard(n, true); });
            html += '</div>';
        }
        html += `<div class="alib-section-title">My Uploads${!uploadedItems.length ? '<span class="alib-empty-note"> — click Upload to add files</span>' : ''}</div>`;
        if (uploadedItems.length) {
            html += `<div class="${isSound ? 'alib-audio-grid' : 'alib-grid'}">`;
            uploadedItems.forEach(n => { html += isSound ? _renderAudioCard(n, false) : _renderMediaCard(n, false); });
            html += '</div>';
        }
        document.getElementById('alib-body').innerHTML = html;
        document.querySelectorAll('#alib-body .alib-card').forEach(card => {
            card.addEventListener('click', e => { if (!e.target.classList.contains('alib-audio-play')) _selectAsset(card.dataset.name, card.dataset.stock === 'true'); });
        });
        document.querySelectorAll('#alib-body .alib-audio-play').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const card = btn.closest('.alib-card'); const name = card.dataset.name; const isStock = card.dataset.stock === 'true';
                new Audio(isStock ? `./assets/${name}` : (assetUrls.get(name) || '')).play().catch(() => {});
            });
        });
    }

    function _renderMediaCard(name, isStock) {
        const src = isStock ? `./assets/${name}` : (assetUrls.get(name) || '');
        const isVid = /\.(mp4|webm|ogg)$/i.test(name);
        const thumb = isVid ? `<div class="alib-card-vid">▶</div>` : `<img class="alib-card-img" src="${src}" alt="" loading="lazy">`;
        const label = name.length > 18 ? name.slice(0,16) + '…' : name;
        return `<div class="alib-card" data-name="${name}" data-stock="${isStock}" title="${name}">${thumb}<div class="alib-card-label">${label}</div></div>`;
    }

    function _renderAudioCard(name, isStock) {
        const label = name.length > 24 ? name.slice(0,22) + '…' : name;
        return `<div class="alib-card alib-card-audio" data-name="${name}" data-stock="${isStock}" title="${name}">
            <div class="alib-audio-icon">🔊</div>
            <div class="alib-card-label">${label}</div>
            <button class="alib-audio-play" title="Preview">▶</button>
        </div>`;
    }

    function _selectAsset(name, isStock) {
        const modal = document.getElementById('asset-library-modal');
        if (_assetLibMode === 'sound') {
            if (_assetLibCallback) _assetLibCallback(name, isStock);
            if (modal) modal.style.display = 'none';
            return;
        }
        if (isStock && !assetFiles.has(name)) {
            fetch(`./assets/${name}`).then(r => r.blob()).then(blob => {
                const file = new File([blob], name, { type: blob.type });
                assetFiles.set(name, file); assetUrls.set(name, URL.createObjectURL(blob)); _saveAsset(name, file);
                addBlock('media', { filename: name });
            }).catch(() => {
                assetUrls.set(name, `./assets/${name}`);
                addBlock('media', { filename: name });
            });
        } else {
            addBlock('media', { filename: name });
        }
        if (modal) modal.style.display = 'none';
    }

    function handleSoundUpload(event) {
        const files = event.target.files; if (!files.length) return;
        Array.from(files).forEach(file => {
            const name = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            assetFiles.set(name, file); assetUrls.set(name, URL.createObjectURL(file)); _saveAsset(name, file);
        });
        if (document.getElementById('asset-library-modal') && document.getElementById('asset-library-modal').style.display === 'flex') _populateAssetLibrary();
        event.target.value = '';
    }

    // ── STATE ────────────────────────────────────────────────────────
    let history = []; let historyIndex = -1;
    let state = {
        settings: { pageId: 'my-site', title: 'Wexton Site', bgHex: '#f5f5f7' },
        pages: { 'pg-index': { id: 'pg-index', name: 'Home', type: 'page', blocks: {}, layerOrder: [] } },
        activePageId: 'pg-index', activeId: null
    };

    function getActivePage() { return state.pages[state.activePageId]; }

    function saveState() {
        history = history.slice(0, historyIndex + 1); history.push(JSON.stringify(state));
        if (history.length > 40) history.shift();
        historyIndex = history.length - 1;
        updateHistoryButtons(); autoSaveToLibrary();
    }

    function loadState(index) {
        if (index < 0 || index >= history.length) return;
        state = JSON.parse(history[index]); historyIndex = index;
        const bg = document.getElementById('inp-pageBg'); if (bg) bg.value = state.settings.bgHex;
        setActive(null); renderPageDropdowns(); renderCanvas(); updateHistoryButtons();
    }

    function updateHistoryButtons() {
        const u = document.getElementById('btn-undo'), r = document.getElementById('btn-redo');
        if (u) u.disabled = historyIndex <= 0;
        if (r) r.disabled = historyIndex >= history.length - 1;
    }

    // ── LIBRARY ──────────────────────────────────────────────────────
    function getLibrary() { try { return JSON.parse(localStorage.getItem(LIBRARY_KEY) || '{}'); } catch(e) { return {}; } }

    function autoSaveToLibrary() {
        const id = state.settings.pageId; if (!id) return;
        const lib = getLibrary();
        lib[id] = { id, title: state.settings.title || id, bgHex: state.settings.bgHex, savedAt: Date.now(), stateData: state };
        try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib)); localStorage.setItem(LAST_ACTIVE_KEY, id); } catch(e) {}
    }

    function loadFromLibrary(id) {
        const entry = getLibrary()[id]; if (!entry) return;
        history = []; historyIndex = -1;
        if (entry.blocks && !entry.stateData) {
            state.pages = { 'pg-index': { id: 'pg-index', name: 'Home', type: 'page', blocks: entry.blocks, layerOrder: entry.layerOrder } };
            state.activePageId = 'pg-index'; state.settings = entry.settings;
        } else { state = entry.stateData; }
        idCounter = 1; let mediaToLoad = new Set();
        Object.values(state.pages).forEach(p => p.layerOrder.forEach(bid => {
            const num = parseInt(bid.replace('wx-blk-',''), 10);
            if (num >= idCounter) idCounter = num + 1;
            const b = p.blocks[bid];
            if (b && b.type === 'media' && b.filename && !assetUrls.has(b.filename)) mediaToLoad.add(b.filename);
        }));
        setActive(null); renderPageDropdowns(); closeLibraryModal();
        if (mediaToLoad.size > 0) {
            let loaded = 0;
            mediaToLoad.forEach(fname => {
                _loadAsset(fname).then(blob => {
                    if (blob) { assetFiles.set(fname, blob); assetUrls.set(fname, URL.createObjectURL(blob)); }
                    loaded++; if (loaded === mediaToLoad.size) { renderCanvas(); saveState(); }
                }).catch(() => { loaded++; if (loaded === mediaToLoad.size) { renderCanvas(); saveState(); } });
            });
        } else { renderCanvas(); saveState(); }
    }

    function deleteFromLibrary(id) {
        if (!confirm('Are you sure you want to delete this site?')) return;
        const lib = getLibrary(); delete lib[id];
        try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib)); } catch(e) {}
        if (state.settings.pageId === id) { localStorage.removeItem(LAST_ACTIVE_KEY); createNewSite(); } else { openLibraryModal(); }
    }

    function createNewSite() {
        if (Object.keys(getActivePage().blocks).length > 0 && !confirm("Start a new site? Unsaved work will be lost if you haven't given it a Site ID.")) return;
        state = {
            settings: { pageId: 'new-site-' + Date.now().toString().slice(-4), title: 'Untitled Site', bgHex: '#f5f5f7' },
            pages: { 'pg-index': { id: 'pg-index', name: 'Home', type: 'page', blocks: {}, layerOrder: [] } },
            activePageId: 'pg-index', activeId: null
        };
        history = []; historyIndex = -1; renderPageDropdowns(); renderCanvas(); saveState(); closeLibraryModal();
    }

    function openLibraryModal() {
        var modal = document.getElementById('library-modal');
        if (!modal) {
            modal = document.createElement('div'); modal.id = 'library-modal';
            modal.innerHTML = '<div class="lib-backdrop"></div><div class="lib-dialog"><div class="lib-header"><span class="lib-title">My Sites</span><button class="lib-close" id="lib-close-btn">✕</button></div><div id="lib-list" class="lib-list"></div></div>';
            document.body.appendChild(modal);
            modal.querySelector('.lib-backdrop').addEventListener('click', () => modal.style.display = 'none');
            document.getElementById('lib-close-btn').addEventListener('click', () => modal.style.display = 'none');
        }
        const list = document.getElementById('lib-list');
        const entries = Object.values(getLibrary()).sort((a,b) => b.savedAt - a.savedAt);
        list.innerHTML = entries.length ? entries.map(e =>
            `<div class="lib-item"><div class="lib-item-swatch" style="background:${e.bgHex}"></div><div class="lib-item-info"><div class="lib-item-title">${e.title}</div><div class="lib-item-meta"><code>${e.id}</code></div></div><div class="lib-item-actions"><button class="lib-btn" onclick="Architect.loadFromLibrary('${e.id}')">Load</button><button class="lib-btn danger" onclick="Architect.deleteFromLibrary('${e.id}')">Delete</button></div></div>`
        ).join('') : '<div class="lib-empty">No saved sites yet.</div>';
        modal.style.display = 'flex';
    }
    function closeLibraryModal() { const m = document.getElementById('library-modal'); if(m) m.style.display = 'none'; }

    // ── PAGE MANAGEMENT ──────────────────────────────────────────────
    function createPage(isPopup) {
        const name = prompt(`Enter a name for the new ${isPopup ? 'Popup' : 'Page'}:`, isPopup ? 'Newsletter' : 'About');
        if (!name) return; saveState();
        const pid = `pg-${name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}-${Date.now().toString().slice(-3)}`;
        state.pages[pid] = { id: pid, name, type: isPopup ? 'popup' : 'page', blocks: {}, layerOrder: [] };
        switchPage(pid);
    }

    function renamePage(pid, newName) {
        if (!state.pages[pid] || !newName.trim()) return;
        state.pages[pid].name = newName.trim(); saveState(); renderPageDropdowns();
    }
    
    function deletePage(pid) {
        if (Object.keys(state.pages).length <= 1) {
            alert("You must have at least one page in your site.");
            return;
        }
        if (!confirm(`Are you sure you want to delete "${state.pages[pid].name}"? This cannot be undone.`)) return;

        delete state.pages[pid];
        saveState();

        if (state.activePageId === pid) {
            state.activePageId = Object.keys(state.pages)[0];
            setActive(null);
            renderCanvas();
        }
        
        renderPageDropdowns();
        
        const list = document.getElementById('set-pages-list');
        if (list && document.getElementById('settings-modal').style.display !== 'none') {
            Architect.openSettings(); 
        }
    }

    function switchPage(pid) {
        if (!state.pages[pid]) return; saveState(); state.activePageId = pid;
        setActive(null); renderPageDropdowns(); renderCanvas();
    }

    function renderPageDropdowns() {
        const ps = document.getElementById('page-selector'); const ls = document.getElementById('inp-linkPage');
        if (ps) { ps.innerHTML = Object.values(state.pages).map(p => `<option value="${p.id}">${p.type==='popup'?'⚡ Popup':'📄 Page'}: ${p.name}</option>`).join(''); ps.value = state.activePageId; }
        if (ls) { ls.innerHTML = Object.values(state.pages).map(p => `<option value="${p.id}">${p.name} (${p.type})</option>`).join(''); }
    }

    // ── GOOGLE FONTS ─────────────────────────────────────────────────
    function loadGoogleFont(fontName) {
        if (!fontName || fontName === 'Nunito') return;
        const id = 'font-' + fontName.replace(/\s+/g, '-').toLowerCase();
        if (document.getElementById(id)) return;
        const link = document.createElement('link'); link.id = id; link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName).replace(/%20/g,'+')}:wght@400;700&display=swap`;
        document.head.appendChild(link);
    }

    // ── SHADOW HELPERS ───────────────────────────────────────────────
    function buildShadowCSS(s, forText) {
        if (!s.shadowOn) return 'none';
        const hex = s.shadowColor || '#000000';
        const alpha = (s.shadowAlpha !== undefined ? s.shadowAlpha : 20) / 100;
        const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
        const color = `rgba(${r},${g},${b},${alpha})`;
        const angleDeg = s.shadowAngle !== undefined ? s.shadowAngle : 135;
        const dist = s.shadowDist !== undefined ? s.shadowDist : 8;
        const blur = s.shadowBlur !== undefined ? s.shadowBlur : 16;
        const spread = s.shadowSpread !== undefined ? s.shadowSpread : 0;
        const rad = (angleDeg - 90) * Math.PI / 180;
        const ox = +(Math.cos(rad) * Math.abs(dist)).toFixed(1);
        const oy = +(Math.sin(rad) * Math.abs(dist)).toFixed(1);
        const inset = dist < 0;
        if (forText) {
            return `${ox}px ${oy}px ${blur}px ${color}`;
        } else {
            return `${inset ? 'inset ' : ''}${ox}px ${oy}px ${blur}px ${spread}px ${color}`;
        }
    }

    // ── CORE BUILDER ENGINE ──────────────────────────────────────────
    function defaultStyle(type) {
        return {
            bgHex: type === 'shape' ? '#f0f0f5' : 'transparent',
            opacity: 100,
            textHex: '#1d1d1f',
            fontFamily: 'Nunito', fontSize: 16, textAlign: 'left',
            padding: type === 'shape' ? 0 : 12,
            radiusTL: 8, radiusTR: 8, radiusBL: 8, radiusBR: 8,
            shadowOn: false, shadowColor: '#000000', shadowAlpha: 20,
            shadowAngle: 135, shadowDist: 8, shadowBlur: 16, shadowSpread: 0,
            borderW: 0, borderStyle: 'solid', borderHex: '#000000',
            overflow: 'hidden',
            letterSpacing: 0, lineHeight: 1.4
        };
    }

    function addBlock(type, initialData = {}) {
        saveState(); const id = generateId(); const page = getActivePage();
        
        // Smart Spawning: Calculate the visual center of the canvas based on current scroll position
        const canvasEl = document.getElementById('canvas');
        const wsEl = document.getElementById('workspace');
        let defaultY = 80;
        if (canvasEl && wsEl) {
            const cRect = canvasEl.getBoundingClientRect();
            const wRect = wsEl.getBoundingClientRect();
            const centerY = (wRect.height / 2) - cRect.top;
            defaultY = snapY(Math.max(20, centerY - 40));
        }

        const block = {
            id, type, parentId: initialData.parentId || null,
            content: initialData.content || (type === 'text' ? '<p>Double-click to edit text</p>' : ''),
            filename: initialData.filename || null,
            link: initialData.link || { type: 'none', value: '' },
            layout: { x: initialData.x !== undefined ? initialData.x : 15, y: initialData.y !== undefined ? initialData.y : defaultY, w: initialData.w || (type === 'shape' ? 30 : 20), h: initialData.h || (type === 'shape' ? 240 : 80) },
            style: Object.assign({}, defaultStyle(type), initialData.style || {})
        };
        if (block.style.fontFamily) loadGoogleFont(block.style.fontFamily);
        page.blocks[id] = block; page.layerOrder.push(id);
        renderCanvas(); setActive(id); return id;
    }

    function updateBlock(id, updates) {
        const page = getActivePage(); if (!page.blocks[id]) return;
        const b = page.blocks[id];
        if (updates.parentId !== undefined) b.parentId = updates.parentId;
        if (updates.layout) b.layout = Object.assign({}, b.layout, updates.layout);
        if (updates.style) { b.style = Object.assign({}, b.style, updates.style); if (updates.style.fontFamily) loadGoogleFont(updates.style.fontFamily); }
        if (updates.content !== undefined) b.content = updates.content;
        if (updates.link !== undefined) b.link = updates.link;
        renderBlockNode(id);
        if (state.activeId === id) { renderSelectionBox(); syncContextPanel(true); }
    }

    function setActive(id) {
        if (state.activeId !== id && state.activeId) {
            const oldNode = document.getElementById(state.activeId);
            if (oldNode) {
                const oldCa = oldNode.querySelector('.content-area[contenteditable="true"]');
                if (oldCa) { oldCa.contentEditable = false; saveState(); updateBlock(state.activeId, { content: oldCa.innerHTML }); }
            }
        }
        if (state.activeId !== id) panelDragged = false;
        state.activeId = id; renderSelectionBox(); syncContextPanel();
    }

    function deleteActive() {
        if (!state.activeId) return; saveState();
        const page = getActivePage(); const toDelete = [state.activeId];
        page.layerOrder.forEach(id => { if (page.blocks[id] && page.blocks[id].parentId === state.activeId) toDelete.push(id); });
        toDelete.forEach(id => { delete page.blocks[id]; page.layerOrder = page.layerOrder.filter(i => i !== id); });
        setActive(null); renderCanvas();
    }

    function duplicateActive() {
        if (!state.activeId) return; saveState();
        const copy = JSON.parse(JSON.stringify(getActivePage().blocks[state.activeId]));
        copy.id = undefined; copy.layout.x += 2; copy.layout.y += 20;
        addBlock(copy.type, copy);
    }

    function changeZIndex(dir) {
        if (!state.activeId) return; saveState();
        const page = getActivePage();
        const idx = page.layerOrder.indexOf(state.activeId); if (idx === -1) return;
        const ni = Math.max(0, Math.min(page.layerOrder.length - 1, idx + dir));
        page.layerOrder.splice(idx, 1); page.layerOrder.splice(ni, 0, state.activeId); renderCanvas();
    }

    let canvas;

    function applyStyles(node, block) {
        const page = getActivePage(); const s = block.style;
        const parentBlock = block.parentId && page.blocks[block.parentId];
        const parentCols = parentBlock ? parentBlock.layout.w : CONFIG.gridCols;
        const isText = block.type === 'text';

        node.style.left = (block.layout.x / parentCols * 100) + '%';
        node.style.top = block.layout.y + 'px';
        node.style.width = (block.layout.w / parentCols * 100) + '%';
        node.style.height = block.layout.h + 'px';
        node.style.setProperty('--y-index', Math.round(block.layout.y));
        node.style.setProperty('--h', block.layout.h + 'px');
        node.style.setProperty('--pad', s.padding + 'px');
        node.style.setProperty('--fs', s.fontSize + 'px');
        node.style.setProperty('--ff', `'${s.fontFamily || 'Nunito'}', sans-serif`);
        node.style.setProperty('--align', s.textAlign || 'left');
        node.style.setProperty('--lsp', (s.letterSpacing || 0) + 'px');
        node.style.setProperty('--lh', s.lineHeight || 1.4);
        
        if (isText) {
            node.style.setProperty('--text-shadow', buildShadowCSS(s, true));
            node.style.boxShadow = 'none';
        } else {
            node.style.setProperty('--text-shadow', 'none');
            node.style.boxShadow = buildShadowCSS(s, false);
        }

        node.style.backgroundColor = s.bgHex === 'transparent' ? 'transparent' : s.bgHex;
        node.style.opacity = (s.opacity !== undefined ? s.opacity : 100) / 100;
        node.style.color = s.textHex;
        node.style.borderRadius = `${s.radiusTL}px ${s.radiusTR}px ${s.radiusBR}px ${s.radiusBL}px`;
        node.style.border = s.borderW > 0 ? `${s.borderW}px ${s.borderStyle} ${s.borderHex}` : 'none';
        node.style.overflow = s.overflow || 'hidden';
    }

    function createOrUpdateDOMNode(id) {
        const block = getActivePage().blocks[id];
        let node = document.getElementById(id);
        const isNew = !node;
        if (isNew) { node = document.createElement('div'); node.id = id; node.className = 'builder-block type-' + block.type; }
        applyStyles(node, block);
        if (isNew) {
            if (block.type === 'shape') {
                node.innerHTML = '<div class="content-area"></div>';
            } else if (block.type === 'text') {
                node.innerHTML = `<div class="content-area">${block.content}</div>`;
                node.ondblclick = () => {
                    if (canvas.classList.contains('mobile-mode')) return;
                    const ca = node.querySelector('.content-area');
                    ca.contentEditable = true; ca.focus(); document.execCommand('selectAll', false, null);
                    ca.onblur = (e) => {
                        if (e.relatedTarget && (e.relatedTarget.closest('#text-toolbar') || e.relatedTarget.closest('#context-panel') || e.relatedTarget.closest('.topbar'))) return;
                        ca.contentEditable = false; saveState(); updateBlock(id, { content: ca.innerHTML });
                    };
                };
            } else if (block.type === 'media' && block.filename) {
                const url = assetUrls.get(block.filename) || `./assets/${block.filename}`;
                const isVid = /\.(mp4|webm|ogg)$/i.test(block.filename);
                node.innerHTML = isVid
                    ? `<video src="${url}" controls style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;"></video>`
                    : `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;">`;
            }
        } else if (block.type === 'text') {
            const ca = node.querySelector('.content-area');
            if (ca && ca.contentEditable !== 'true' && ca.innerHTML !== block.content) ca.innerHTML = block.content;
        }
        return node;
    }

    function renderBlockNode(id) { createOrUpdateDOMNode(id); }

    function renderCanvas() {
        if (!canvas) return; const page = getActivePage();
        if (page.type === 'popup') { document.body.classList.add('editing-popup'); canvas.style.backgroundColor = '#ffffff'; }
        else { document.body.classList.remove('editing-popup'); canvas.style.backgroundColor = state.settings.bgHex; }
        page.layerOrder.forEach(id => { const n = document.getElementById(id); if (n) n.remove(); });
        Array.from(canvas.children).forEach(c => { if (c.id !== 'selection-box') c.remove(); });
        const allNodes = {};
        page.layerOrder.forEach(id => {
            if (page.blocks[id].style.fontFamily) loadGoogleFont(page.blocks[id].style.fontFamily);
            allNodes[id] = createOrUpdateDOMNode(id);
        });
        page.layerOrder.forEach((id, index) => {
            const block = page.blocks[id]; const node = allNodes[id]; node.style.zIndex = index + 1;
            if (block.parentId && allNodes[block.parentId]) {
                const pc = allNodes[block.parentId].querySelector('.content-area'); (pc || canvas).appendChild(node);
            } else { canvas.appendChild(node); }
        });
        renderSelectionBox();
    }

    function renderSelectionBox() {
        let box = document.getElementById('selection-box');
        const page = getActivePage();
        if (!state.activeId || !page.blocks[state.activeId] || canvas.classList.contains('mobile-mode')) {
            if (box) box.style.display = 'none'; hideTextToolbar(); return;
        }
        if (!box) {
            box = document.createElement('div'); box.id = 'selection-box';
            box.innerHTML = `
                <div class="resize-handle nw" data-action="resize" data-dir="nw"></div>
                <div class="resize-handle n"  data-action="resize" data-dir="n"></div>
                <div class="resize-handle ne" data-action="resize" data-dir="ne"></div>
                <div class="resize-handle w"  data-action="resize" data-dir="w"></div>
                <div class="resize-handle e"  data-action="resize" data-dir="e"></div>
                <div class="resize-handle sw" data-action="resize" data-dir="sw"></div>
                <div class="resize-handle s"  data-action="resize" data-dir="s"></div>
                <div class="resize-handle se" data-action="resize" data-dir="se"></div>
                <div class="radius-handle tl" data-action="radius" data-corner="radiusTL"></div>
                <div class="radius-handle tr" data-action="radius" data-corner="radiusTR"></div>
                <div class="radius-handle bl" data-action="radius" data-corner="radiusBL"></div>
                <div class="radius-handle br" data-action="radius" data-corner="radiusBR"></div>`;
            canvas.appendChild(box);
        }
        const an = document.getElementById(state.activeId); if (!an) return;
        const cr = canvas.getBoundingClientRect(), nr = an.getBoundingClientRect();
        box.style.display = 'block';
        box.style.left = (nr.left - cr.left + canvas.scrollLeft) + 'px';
        box.style.top  = (nr.top  - cr.top  + canvas.scrollTop) + 'px';
        box.style.width  = nr.width + 'px'; box.style.height = nr.height + 'px';
        if (page.blocks[state.activeId].type === 'text') { showTextToolbar(an); } else { hideTextToolbar(); }
    }

    function showTextToolbar(node) {
        const t = document.getElementById('text-toolbar'); if (!t || !node) return;
        const r = node.getBoundingClientRect(); t.style.display = 'flex';
        t.style.top = Math.max(60, r.top - 48) + 'px';
        const tw = t.offsetWidth || 700;
        t.style.left = Math.max(8, Math.min(r.left, window.innerWidth - tw - 8)) + 'px';
        syncTextToolbarFormat();
    }

    function syncTextToolbarFormat() {
        if (!state.activeId) return;
        const b = getActivePage().blocks[state.activeId]; if (!b || b.type !== 'text') return;
        const html = b.content;
        document.getElementById('tt-bold')?.classList.toggle('tt-active',      /<(b|strong)\b/i.test(html));
        document.getElementById('tt-italic')?.classList.toggle('tt-active',    /<(i|em)\b/i.test(html));
        document.getElementById('tt-underline')?.classList.toggle('tt-active', /<u\b/i.test(html));
    }

    function hideTextToolbar() { const t = document.getElementById('text-toolbar'); if (t) t.style.display = 'none'; }

    // ── UI SYNC ──────────────────────────────────────────────────────
    function syncContextPanel(positionOnly) {
        const panel = document.getElementById('context-panel');
        const block = getActivePage().blocks[state.activeId];
        if (!block) { panel.style.display = 'none'; return; }
        panel.style.display = 'block';
        if (positionOnly && !canvas.classList.contains('mobile-mode')) { positionContextPanel(); return; }

        const get = id => document.getElementById(id);
        const set = (id, val) => { const e = get(id); if (e) e.value = val; };
        const txt = (id, val) => { const e = get(id); if (e) e.textContent = val; };
        const s = block.style;

        if (get('ctx-title')) get('ctx-title').textContent = block.type;

        // Appearance
        const isTrans = s.bgHex === 'transparent';
        set('inp-bgHex', isTrans ? '#ffffff' : s.bgHex);
        if (get('inp-bgTransparent')) get('inp-bgTransparent').checked = isTrans;
        set('inp-radius', s.radiusTL || 0); txt('val-radius', s.radiusTL || 0);
        set('inp-opacity', s.opacity !== undefined ? s.opacity : 100); txt('val-opacity', s.opacity !== undefined ? s.opacity : 100);
        get('row-overflow').style.display = block.type === 'shape' ? 'flex' : 'none';
        set('inp-overflow', s.overflow || 'hidden');

        // Shadow
        const shadowOn = !!s.shadowOn;
        if (get('inp-shadowOn')) get('inp-shadowOn').checked = shadowOn;
        if (get('shadow-controls')) get('shadow-controls').style.display = shadowOn ? 'block' : 'none';
        set('inp-shadowColor', s.shadowColor || '#000000');
        const sAlpha = s.shadowAlpha !== undefined ? s.shadowAlpha : 20;
        set('inp-shadowAlpha', sAlpha); txt('val-shadowAlpha', sAlpha);
        const sAngle = s.shadowAngle !== undefined ? s.shadowAngle : 135;
        txt('val-shadowAngle', sAngle); _updateAngleKnob(sAngle);
        set('inp-shadowDist', s.shadowDist !== undefined ? s.shadowDist : 8); txt('val-shadowDist', s.shadowDist !== undefined ? s.shadowDist : 8);
        set('inp-shadowBlur', s.shadowBlur !== undefined ? s.shadowBlur : 16); txt('val-shadowBlur', s.shadowBlur !== undefined ? s.shadowBlur : 16);
        set('inp-shadowSpread', s.shadowSpread !== undefined ? s.shadowSpread : 0); txt('val-shadowSpread', s.shadowSpread !== undefined ? s.shadowSpread : 0);

        // Border
        set('inp-borderW', s.borderW || 0); txt('val-borderW', s.borderW || 0);
        set('inp-borderHex', s.borderHex || '#000000'); set('inp-borderStyle', s.borderStyle || 'solid');

        if (block.type === 'text') {
            set('tt-fontFamily', s.fontFamily || 'Nunito');
            set('tt-textHex', s.textHex || '#1d1d1f');
            set('tt-fontSize', s.fontSize || 16);
        }

        // Link
        const link = block.link || { type: 'none', value: '' };
        set('inp-linkType', link.type); toggleLinkInput();
        if (link.type === 'url') set('inp-linkUrl', link.value);
        if (link.type === 'page' || link.type === 'popup') set('inp-linkPage', link.value);
        if (link.type === 'sound') { const btn = get('inp-soundFile'); if (btn) btn.textContent = link.value ? `🔊 ${link.value}` : 'Choose Sound…'; }

        if (!canvas.classList.contains('mobile-mode')) positionContextPanel();
    }

    function _updateAngleKnob(angle) {
        const ind = document.getElementById('shadow-angle-indicator');
        if (ind) ind.style.transform = `rotate(${angle}deg)`;
    }

    function toggleLinkInput() {
        const type = document.getElementById('inp-linkType').value;
        const row = document.getElementById('row-linkValue');
        const urlInp = document.getElementById('inp-linkUrl');
        const pageSel = document.getElementById('inp-linkPage');
        const soundRow = document.getElementById('row-soundValue');
        const isPageOrPopup = type === 'page' || type === 'popup';
        row.style.display = (type === 'url' || isPageOrPopup) ? 'flex' : 'none';
        if (soundRow) soundRow.style.display = type === 'sound' ? 'flex' : 'none';
        urlInp.style.display = type === 'url' ? 'block' : 'none';
        pageSel.style.display = isPageOrPopup ? 'block' : 'none';
        if (isPageOrPopup) pageSel.innerHTML = Object.values(state.pages).filter(p => p.type === type).map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    }

    function positionContextPanel() {
        if (panelDragged) return;
        const panel = document.getElementById('context-panel'), node = document.getElementById(state.activeId);
        if (!panel || panel.style.display === 'none' || !node) return;
        const rect = node.getBoundingClientRect(), pw = panel.offsetWidth || 258;
        let x = rect.right + 14; if (x + pw > window.innerWidth - 8) x = rect.left - pw - 14;
        panel.style.left = Math.max(8, x) + 'px';
        panel.style.top = Math.max(64, Math.min(rect.top, window.innerHeight - panel.offsetHeight - 8)) + 'px';
    }

    // ── FORMAT COMMANDS ──────────────────────────────────────────────
    function toggleFormat(cmd) {
        if (!state.activeId) return;
        const block = getActivePage().blocks[state.activeId];
        if (!block || block.type !== 'text') return;

        const node = document.getElementById(state.activeId);
        const ca = node && node.querySelector('.content-area');
        const isEditing = ca && ca.contentEditable === 'true';

        if (isEditing) {
            document.execCommand(cmd, false, null);
            saveState(); updateBlock(state.activeId, { content: ca.innerHTML });
        } else {
            const tag = { bold: 'strong', italic: 'em', underline: 'u' }[cmd];
            if (!tag) return;
            const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'gi');
            const wrapRe = new RegExp(`^\\s*<${tag}>[\\s\\S]*</${tag}>\\s*$`, 'i');
            let html = block.content;
            if (wrapRe.test(html.trim())) { html = html.replace(re, '$1'); } 
            else { html = `<${tag}>${html}</${tag}>`; }
            saveState(); updateBlock(state.activeId, { content: html });
            syncTextToolbarFormat();
        }
    }

    const TEXT_PRESETS = {
        h1:   { fontSize: 52, fontFamily: 'Nunito', letterSpacing: -1, lineHeight: 1.1 },
        h2:   { fontSize: 36, fontFamily: 'Nunito', letterSpacing: -0.5, lineHeight: 1.15 },
        h3:   { fontSize: 24, fontFamily: 'Nunito', letterSpacing: 0, lineHeight: 1.25 },
        body: { fontSize: 16, fontFamily: 'Nunito', letterSpacing: 0, lineHeight: 1.5 },
        sub:  { fontSize: 12, fontFamily: 'Nunito', letterSpacing: 0.2, lineHeight: 1.5 }
    };

    function applyTextPreset(key) {
        if (!state.activeId) return;
        const preset = TEXT_PRESETS[key]; if (!preset) return;
        saveState(); updateBlock(state.activeId, { style: preset });
        const e = document.getElementById('tt-fontSize'); if (e) e.value = preset.fontSize;
    }

    // ── ANGLE KNOB INTERACTION ───────────────────────────────────────
    function initAngleKnob() {
        const knob = document.getElementById('shadow-angle-knob'); if (!knob) return;
        let draggingKnob = false;
        const getAngleFromEvent = (e) => {
            const r = knob.getBoundingClientRect();
            const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            const dx = e.clientX - cx, dy = e.clientY - cy;
            let angle = Math.round(Math.atan2(dy, dx) * 180 / Math.PI) + 90;
            if (angle < 0) angle += 360; if (angle >= 360) angle -= 360;
            return angle;
        };
        knob.addEventListener('mousedown', e => { e.preventDefault(); draggingKnob = true; });
        document.addEventListener('mousemove', e => {
            if (!draggingKnob || !state.activeId) return;
            const angle = getAngleFromEvent(e);
            _updateAngleKnob(angle);
            document.getElementById('val-shadowAngle').textContent = angle;
            updateBlock(state.activeId, { style: { shadowAngle: angle } });
        });
        document.addEventListener('mouseup', () => { if (draggingKnob) { draggingKnob = false; saveState(); } });
    }

    // ── CONTEXT LISTENERS ────────────────────────────────────────────
    function initContextListeners() {
        const fsel = document.getElementById('tt-fontFamily');
        if (fsel) {
            FONT_CATEGORIES.forEach(cat => {
                const grp = document.createElement('optgroup'); grp.label = cat.label;
                cat.fonts.forEach(f => {
                    const opt = document.createElement('option'); opt.value = f; opt.textContent = f; grp.appendChild(opt);
                });
                fsel.appendChild(grp);
            });
        }

        const fsInput = document.getElementById('tt-fontSize');
        const applyFontSize = val => {
            const v = Math.max(8, Math.min(300, Math.round(val)));
            if (fsInput) fsInput.value = v;
            if (state.activeId) updateBlock(state.activeId, { style: { fontSize: v } });
        };
        const stepFontSize = delta => applyFontSize((parseInt(fsInput && fsInput.value) || 16) + delta);
        const decBtn = document.getElementById('tt-fontSize-dec');
        const incBtn = document.getElementById('tt-fontSize-inc');
        if (decBtn) decBtn.addEventListener('click', () => { stepFontSize(-1); saveState(); });
        if (incBtn) incBtn.addEventListener('click', () => { stepFontSize(+1); saveState(); });
        if (fsInput) {
            fsInput.addEventListener('wheel', e => { e.preventDefault(); stepFontSize(e.deltaY < 0 ? 1 : -1); saveState(); }, { passive: false });
            fsInput.addEventListener('input', e => { const v = parseInt(e.target.value); if (!isNaN(v) && state.activeId) updateBlock(state.activeId, { style: { fontSize: Math.max(8, Math.min(300, v)) } }); });
            fsInput.addEventListener('change', () => saveState());
        }

        const bindStyle = (id, prop, transform) => {
            const el = document.getElementById(id); if (!el) return;
            el.addEventListener('input', ev => {
                if (!state.activeId) return;
                let val = (ev.target.type === 'number' || ev.target.type === 'range') ? parseFloat(ev.target.value) : ev.target.value;
                if (transform) val = transform(val);
                updateBlock(state.activeId, { style: { [prop]: val } });
                const span = document.getElementById('val-' + id.replace(/^inp-/,'').replace(/^tt-/,''));
                if (span) span.textContent = ev.target.value;
            });
            el.addEventListener('change', saveState);
        };

        bindStyle('inp-bgHex', 'bgHex');
        const bgTransToggle = document.getElementById('inp-bgTransparent');
        if (bgTransToggle) bgTransToggle.addEventListener('change', e => {
            if (!state.activeId) return;
            const s = getActivePage().blocks[state.activeId].style;
            updateBlock(state.activeId, { style: { bgHex: e.target.checked ? 'transparent' : (s._lastBgHex || '#ffffff') } });
            if (!e.target.checked) s._lastBgHex = s.bgHex;
            saveState();
        });
        bindStyle('inp-radius', 'radiusTL', Number);
        document.getElementById('inp-radius')?.addEventListener('input', ev => {
            if (!state.activeId) return;
            const v = parseInt(ev.target.value);
            updateBlock(state.activeId, { style: { radiusTL: v, radiusTR: v, radiusBL: v, radiusBR: v } });
            const span = document.getElementById('val-radius'); if (span) span.textContent = v;
        });
        bindStyle('inp-opacity', 'opacity', Number);
        bindStyle('inp-overflow', 'overflow');

        const shadowOnEl = document.getElementById('inp-shadowOn');
        if (shadowOnEl) shadowOnEl.addEventListener('change', e => {
            if (!state.activeId) return;
            updateBlock(state.activeId, { style: { shadowOn: e.target.checked } });
            document.getElementById('shadow-controls').style.display = e.target.checked ? 'block' : 'none';
            saveState();
        });
        bindStyle('inp-shadowColor', 'shadowColor');
        bindStyle('inp-shadowAlpha', 'shadowAlpha', Number);
        bindStyle('inp-shadowDist',  'shadowDist',  Number);
        bindStyle('inp-shadowBlur',  'shadowBlur',  Number);
        bindStyle('inp-shadowSpread','shadowSpread', Number);

        bindStyle('inp-borderW', 'borderW', Number); bindStyle('inp-borderHex', 'borderHex'); bindStyle('inp-borderStyle', 'borderStyle');

        bindStyle('tt-fontFamily', 'fontFamily', v => { loadGoogleFont(v); return v; });
        bindStyle('tt-textHex', 'textHex');

        document.getElementById('inp-linkType').addEventListener('change', e => {
            if (!state.activeId) return;
            const link = getActivePage().blocks[state.activeId].link || { type: 'none', value: '' };
            link.type = e.target.value; link.value = ''; updateBlock(state.activeId, { link }); toggleLinkInput();
        });
        document.getElementById('inp-linkUrl').addEventListener('input', e => { if (!state.activeId) return; const link = getActivePage().blocks[state.activeId].link; link.value = e.target.value; updateBlock(state.activeId, { link }); });
        document.getElementById('inp-linkPage').addEventListener('change', e => { if (!state.activeId) return; const link = getActivePage().blocks[state.activeId].link; link.value = e.target.value; updateBlock(state.activeId, { link }); });

        document.getElementById('set-title').addEventListener('change', e => { state.settings.title = e.target.value; saveState(); });
        document.getElementById('set-id').addEventListener('change', e => {
            let newId = e.target.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'); if (!newId) newId = 'my-site';
            const oldId = state.settings.pageId;
            if (oldId !== newId) {
                const lib = getLibrary();
                if (lib[oldId]) { lib[newId] = lib[oldId]; lib[newId].id = newId; delete lib[oldId]; try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib)); } catch(err){} }
                state.settings.pageId = newId; try { localStorage.setItem(LAST_ACTIVE_KEY, newId); } catch(err){} saveState();
            }
            e.target.value = newId;
        });
        document.getElementById('set-bg').addEventListener('input', e => {
            state.settings.bgHex = e.target.value;
            document.getElementById('set-bg-val').textContent = e.target.value;
            if (getActivePage() && getActivePage().type !== 'popup') canvas.style.backgroundColor = e.target.value;
        });
        document.getElementById('set-bg').addEventListener('change', () => saveState());

        let dragging = false, ds = {};
        const header = document.getElementById('ctx-header');
        if (header) header.addEventListener('mousedown', e => { dragging = true; panelDragged = true; const p = document.getElementById('context-panel'); ds = { mx: e.clientX, my: e.clientY, pl: p.offsetLeft, pt: p.offsetTop }; });
        document.addEventListener('mousemove', e => { if (!dragging) return; const p = document.getElementById('context-panel'); p.style.left = (ds.pl + e.clientX - ds.mx) + 'px'; p.style.top = (ds.pt + e.clientY - ds.my) + 'px'; });
        document.addEventListener('mouseup', () => dragging = false);

        document.querySelectorAll('.ctx-section-header').forEach(h => h.addEventListener('click', () => h.closest('.ctx-section').classList.toggle('collapsed')));
        initAngleKnob();
    }

    // ── INTERACTION ENGINE ───────────────────────────────────────────
    function initInteractions() {
        let isInteracting = false, action = null, startParams = {};

        document.getElementById('workspace').addEventListener('mousedown', e => {
            if (e.target.closest('#text-toolbar') || e.target.closest('#context-panel') || e.target.closest('.topbar')) return;
            if (e.target.id === 'workspace' || e.target.id === 'viewport') setActive(null);
        });

        canvas.addEventListener('mousedown', e => {
            if (canvas.classList.contains('mobile-mode') || e.target.isContentEditable) return;
            const page = getActivePage();

            if (e.target.classList.contains('resize-handle') || e.target.classList.contains('radius-handle')) {
                saveState(); isInteracting = true; action = e.target.dataset.action;
                const b = page.blocks[state.activeId];
                startParams = { startX: e.clientX, startY: e.clientY, dir: e.target.dataset.dir, corner: e.target.dataset.corner, startLayout: Object.assign({}, b.layout), startRadius: b.style[e.target.dataset.corner] || 0 };
                return;
            }

            const blockNode = e.target.closest('.builder-block');
            if (blockNode) {
                e.stopPropagation();
                if (state.activeId !== blockNode.id) setActive(blockNode.id);
                saveState();
                startParams = { startX: e.clientX, startY: e.clientY, startLayout: Object.assign({}, page.blocks[blockNode.id].layout), hoveredShape: null, hasMoved: false };
                isInteracting = true; action = 'move'; return;
            }
            setActive(null);
        });

        document.addEventListener('mousemove', e => {
            if (!isInteracting || !state.activeId) return;
            const page = getActivePage(); const block = page.blocks[state.activeId];
            const dx = e.clientX - startParams.startX, dy = e.clientY - startParams.startY;
            let newLayout = Object.assign({}, startParams.startLayout);

            if (action === 'move') {
                if (!startParams.hasMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
                    startParams.hasMoved = true;
                    if (block.parentId) {
                        const blockNode = document.getElementById(state.activeId);
                        const cr = canvas.getBoundingClientRect(), nr = blockNode.getBoundingClientRect();
                        block.parentId = null;
                        block.layout.x = pxToCols(nr.left - cr.left + canvas.scrollLeft);
                        block.layout.y = snapY(nr.top - cr.top + canvas.scrollTop);
                        renderCanvas(); setActive(blockNode.id);
                        startParams.startLayout = Object.assign({}, block.layout);
                    }
                    const tn = document.getElementById(state.activeId); if (tn) tn.classList.add('is-dragging');
                }
                if (startParams.hasMoved) {
                    newLayout.x = startParams.startLayout.x + pxToCols(dx);
                    newLayout.y = startParams.startLayout.y + snapY(dy);
                    if (!block.parentId) {
                        if (newLayout.x < 0) newLayout.x = 0;
                        if (newLayout.x + newLayout.w > CONFIG.gridCols) newLayout.x = CONFIG.gridCols - newLayout.w;
                    }
                    const an = document.getElementById(state.activeId); if (an) an.style.visibility = 'hidden';
                    const dt = document.elementFromPoint(e.clientX, e.clientY);
                    if (an) an.style.visibility = '';
                    document.querySelectorAll('.drop-highlight').forEach(el => el.classList.remove('drop-highlight'));
                    startParams.hoveredShape = null;
                    const shape = dt && dt.closest('.builder-block.type-shape');
                    if (shape && shape.id !== state.activeId) { shape.classList.add('drop-highlight'); startParams.hoveredShape = shape.id; }
                }
            } else if (action === 'resize') {
                const dir = startParams.dir;
                if (dir.length === 2) {
                    const startVisW = startParams.startLayout.w * getColWidth();
                    const startVisH = startParams.startLayout.h;
                    const visRatio = startVisW / startVisH;
                    let newVisW = startVisW + (dir.includes('e') ? dx : -dx);
                    newVisW = Math.max(newVisW, 2 * getColWidth());
                    let newVisH = Math.max(newVisW / visRatio, 20);
                    newVisW = newVisH * visRatio;
                    newLayout.w = pxToCols(newVisW); newLayout.h = snapY(newVisH);
                    if (dir.includes('w')) newLayout.x = startParams.startLayout.x + (startParams.startLayout.w - newLayout.w);
                    if (dir.includes('n')) newLayout.y = startParams.startLayout.y + (startParams.startLayout.h - newLayout.h);
                } else {
                    if (dir.includes('e')) newLayout.w = startParams.startLayout.w + pxToCols(dx);
                    if (dir.includes('w')) { const c = pxToCols(dx); newLayout.w = startParams.startLayout.w - c; newLayout.x = startParams.startLayout.x + c; }
                    if (dir.includes('s')) newLayout.h = startParams.startLayout.h + snapY(dy);
                    if (dir.includes('n')) { const p = snapY(dy); newLayout.h = startParams.startLayout.h - p; newLayout.y = startParams.startLayout.y + p; }
                }
                if (newLayout.w < 2) { if (dir.includes('w')) newLayout.x = startParams.startLayout.x + startParams.startLayout.w - 2; newLayout.w = 2; }
                if (newLayout.h < 20) { if (dir.includes('n')) newLayout.y = startParams.startLayout.y + startParams.startLayout.h - 20; newLayout.h = 20; }
                if (!block.parentId) {
                    if (newLayout.x < 0) { newLayout.x = 0; if (dir.includes('w')) { newLayout.w = startParams.startLayout.w + startParams.startLayout.x; if (dir.length === 2) { newLayout.h = snapY((newLayout.w * getColWidth()) / (startParams.startLayout.w * getColWidth() / startParams.startLayout.h)); if (dir.includes('n')) newLayout.y = startParams.startLayout.y + (startParams.startLayout.h - newLayout.h); } } }
                    if (newLayout.x + newLayout.w > CONFIG.gridCols) { if (dir.includes('e') || dir.length === 2) { newLayout.w = CONFIG.gridCols - newLayout.x; if (dir.length === 2) { newLayout.h = snapY((newLayout.w * getColWidth()) / (startParams.startLayout.w * getColWidth() / startParams.startLayout.h)); if (dir.includes('n')) newLayout.y = startParams.startLayout.y + (startParams.startLayout.h - newLayout.h); } } else if (dir.includes('w')) { newLayout.x = CONFIG.gridCols - newLayout.w; } }
                }
            } else if (action === 'radius') {
                const corner = startParams.corner; let delta = 0;
                if (corner === 'radiusTL') delta = (dx + dy) / 2; if (corner === 'radiusTR') delta = (-dx + dy) / 2;
                if (corner === 'radiusBL') delta = (dx - dy) / 2; if (corner === 'radiusBR') delta = (-dx - dy) / 2;
                updateBlock(state.activeId, { style: { [corner]: Math.max(0, startParams.startRadius + delta) } }); return;
            }
            if (startParams.hasMoved || action === 'resize' || action === 'radius') updateBlock(state.activeId, { layout: newLayout });
        });

        document.addEventListener('mouseup', () => {
            document.querySelectorAll('.is-dragging').forEach(el => el.classList.remove('is-dragging'));
            document.querySelectorAll('.drop-highlight').forEach(el => el.classList.remove('drop-highlight'));
            const page = getActivePage();
            if (isInteracting && action === 'move' && state.activeId && startParams.hoveredShape) {
                const an = document.getElementById(state.activeId), shapeEl = document.getElementById(startParams.hoveredShape);
                const pc = shapeEl && shapeEl.querySelector('.content-area');
                if (an && pc) {
                    const br = an.getBoundingClientRect(), pr = pc.getBoundingClientRect();
                    const nw = Object.assign({}, page.blocks[state.activeId].layout, { x: pxToCols(br.left - pr.left + pc.scrollLeft), y: snapY(br.top - pr.top + pc.scrollTop) });
                    updateBlock(state.activeId, { parentId: startParams.hoveredShape, layout: nw }); renderCanvas();
                }
            }
            isInteracting = false; action = null;
        });

        document.addEventListener('keydown', e => {
            if (document.activeElement.isContentEditable || ['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)) return;
            if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.shiftKey ? loadState(historyIndex + 1) : loadState(historyIndex - 1); return; }
            if ((e.key === 'd' || e.key === 'D') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); duplicateActive(); return; }
            if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteActive(); return; }
        });
    }

    // ── MEDIA UPLOAD ─────────────────────────────────────────────────
    function handleMediaUpload(event) {
        const files = event.target.files; if (!files.length) return;
        const fromLibrary = document.getElementById('asset-library-modal') && document.getElementById('asset-library-modal').style.display === 'flex';
        Array.from(files).forEach(file => {
            const name = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            assetFiles.set(name, file); assetUrls.set(name, URL.createObjectURL(file)); _saveAsset(name, file);
            if (!fromLibrary) addBlock('media', { filename: name, x: 10, w: 24, h: file.type.startsWith('video/') ? 200 : 280 });
        });
        if (fromLibrary) _populateAssetLibrary();
        event.target.value = '';
    }

    // ── EXPORT ───────────────────────────────────────────────────────
    function generateExport() {
        var zip = new JSZip();
        var assetsFolder = zip.folder('assets'); assetFiles.forEach((f, n) => assetsFolder.file(n, f));

        let popupHTML = ''; let popupCSS = '';
        Object.values(state.pages).forEach(page => {
            if (page.type !== 'popup') return;
            
            let maxPopupH = 600;
            page.layerOrder.forEach(id => {
                const b = page.blocks[id];
                if (!b.parentId) maxPopupH = Math.max(maxPopupH, b.layout.y + b.layout.h + 40);
            });

            page.layerOrder.forEach((id, index) => {
                const b = page.blocks[id]; const s = b.style;
                const parentCols = b.parentId && page.blocks[b.parentId] ? page.blocks[b.parentId].layout.w : CONFIG.gridCols;
                const isText = b.type === 'text';
                const boxSh = isText ? 'none' : buildShadowCSS(s, false);
                const txtSh = isText ? buildShadowCSS(s, true) : 'none';
                popupCSS += `#${id}{position:absolute;z-index:${index+1};box-sizing:border-box;left:${(b.layout.x/parentCols*100)}%;top:${b.layout.y}px;width:${(b.layout.w/parentCols*100)}%;height:${b.layout.h}px;background-color:${s.bgHex==='transparent'?'transparent':s.bgHex};color:${s.textHex};border-radius:${s.radiusTL}px ${s.radiusTR}px ${s.radiusBR}px ${s.radiusBL}px;border:${s.borderW>0?s.borderW+'px '+s.borderStyle+' '+s.borderHex:'none'};box-shadow:${boxSh};opacity:${(s.opacity||100)/100};overflow:${s.overflow||'hidden'};}\n`;
                popupCSS += `#${id} .content-area{padding:${s.padding}px;font-size:${s.fontSize}px;font-family:'${s.fontFamily||'Nunito'}',sans-serif;text-align:${s.textAlign||'left'};justify-content:center;display:flex;flex-direction:column;letter-spacing:${s.letterSpacing||0}px;line-height:${s.lineHeight||1.4};text-shadow:${txtSh};width:100%;height:100%;box-sizing:border-box;overflow-wrap:break-word;word-break:break-word;}\n`;
            });
            
            popupHTML += `<div id="overlay-${page.id}" class="wx-popup-overlay">
                <div class="wx-popup-window" style="min-height:${maxPopupH}px; width:100%; max-width:600px; background:#ffffff; border-radius:16px; position:relative; margin:40px auto; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                    <div class="wx-popup-close">✕</div>
                    ${buildPageHTML(null, page)}
                </div>
            </div>\n`;
        });

        function buildPageHTML(parentId, page) {
            let html = '';
            page.layerOrder.filter(id => page.blocks[id].parentId === parentId).forEach(id => {
                const b = page.blocks[id]; let inner = '';
                if (b.type === 'text') inner = `<div class="content-area">${b.content}</div>`;
                else if (b.type === 'shape') inner = `<div class="content-area">${buildPageHTML(id, page)}</div>`;
                else if (b.type === 'media' && b.filename) {
                    const isVid = /\.(mp4|webm|ogg)$/i.test(b.filename);
                    inner = isVid ? `<video src="./assets/${b.filename}" controls style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;"></video>` : `<img src="./assets/${b.filename}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;">`;
                }
                let wOpen = '', wClose = '', blockAttrs = `id="${id}" class="wx-block type-${b.type}"`;
                if (b.link && b.link.type !== 'none' && b.link.value) {
                    if (b.link.type === 'url') { wOpen = `<a href="${b.link.value}" style="text-decoration:none;color:inherit;display:contents;">`; wClose = '</a>'; }
                    else if (b.link.type === 'page') { const target = state.pages[b.link.value]?.id === 'pg-index' ? 'index.html' : `${b.link.value}.html`; wOpen = `<a href="${target}" style="text-decoration:none;color:inherit;display:contents;">`; wClose = '</a>'; }
                    else if (b.link.type === 'popup') { blockAttrs += ` data-popup-trigger="${b.link.value}"`; }
                    else if (b.link.type === 'sound') { blockAttrs += ` data-sound-src="./assets/${b.link.value}" style="cursor:pointer;"`; }
                }
                html += `${wOpen}<div ${blockAttrs}>${inner}</div>${wClose}\n`;
            });
            return html;
        }

        Object.values(state.pages).forEach(page => {
            if (page.type === 'popup') return;
            
            let maxDeskH = 1000;
            let css = ''; let fontImports = new Set(['Nunito']);
            page.layerOrder.forEach((id, index) => {
                const b = page.blocks[id]; const s = b.style;
                if (!b.parentId) maxDeskH = Math.max(maxDeskH, b.layout.y + b.layout.h + 100);
                
                if (s.fontFamily) fontImports.add(s.fontFamily);
                const parentCols = b.parentId && page.blocks[b.parentId] ? page.blocks[b.parentId].layout.w : CONFIG.gridCols;
                const isText = b.type === 'text';
                const boxSh = isText ? 'none' : buildShadowCSS(s, false);
                const txtSh = isText ? buildShadowCSS(s, true) : 'none';
                css += `#${id}{position:absolute;z-index:${index+1};box-sizing:border-box;--y-index:${Math.round(b.layout.y)};--h:${b.layout.h}px;left:${(b.layout.x/parentCols*100)}%;top:${b.layout.y}px;width:${(b.layout.w/parentCols*100)}%;height:${b.layout.h}px;background-color:${s.bgHex==='transparent'?'transparent':s.bgHex};color:${s.textHex};border-radius:${s.radiusTL}px ${s.radiusTR}px ${s.radiusBR}px ${s.radiusBL}px;border:${s.borderW>0?s.borderW+'px '+s.borderStyle+' '+s.borderHex:'none'};box-shadow:${boxSh};opacity:${(s.opacity||100)/100};overflow:${s.overflow||'hidden'};}\n`;
                css += `#${id} .content-area{padding:${s.padding}px;font-size:${s.fontSize}px;font-family:'${s.fontFamily||'Nunito'}',sans-serif;text-align:${s.textAlign||'left'};justify-content:center;display:flex;flex-direction:column;letter-spacing:${s.letterSpacing||0}px;line-height:${s.lineHeight||1.4};text-shadow:${txtSh};width:100%;height:100%;box-sizing:border-box;overflow-wrap:break-word;word-break:break-word;}\n`;
            });
            const fontLinks = Array.from(fontImports).map(f => `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g,'+')}:wght@400;700&display=swap" rel="stylesheet">`).join('\n    ');
            
            const runtimeScript = `<script>
document.querySelectorAll('[data-popup-trigger]').forEach(b=>{b.style.cursor='pointer';b.addEventListener('click',e=>{e.preventDefault();const p=document.getElementById('overlay-'+b.getAttribute('data-popup-trigger'));if(p)p.classList.add('active');});});
document.querySelectorAll('.wx-popup-close,.wx-popup-overlay').forEach(el=>{el.addEventListener('click',e=>{if(e.target===el)el.closest('.wx-popup-overlay').classList.remove('active');});});
document.querySelectorAll('[data-sound-src]').forEach(b=>{const a=new Audio(b.getAttribute('data-sound-src'));b.addEventListener('click',()=>{a.currentTime=0;a.play();});});
<\/script>`;
            
            const mobileCss = `@media(max-width:768px){.site-canvas{display:flex!important;flex-direction:column!important;padding:20px!important;gap:20px!important;height:auto!important}.wx-block{position:relative!important;left:0!important;top:0!important;width:100%!important;height:auto!important;min-height:var(--h)!important;order:var(--y-index)!important;overflow-wrap:break-word!important;word-break:break-word!important}.wx-block.type-text .content-area{font-size: var(--fs)!important;height:auto!important;white-space:normal!important}.wx-block.type-shape>.content-area{display:flex!important;flex-direction:column!important;gap:16px!important;padding:20px!important}}`;
            
            const htmlOut = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${state.settings.title} | ${page.name}</title>\n    ${fontLinks}\n<style>*{box-sizing:border-box;margin:0;padding:0}body{background:${state.settings.bgHex};font-family:'Nunito',sans-serif;overflow-x:hidden}.site-canvas{width:100%;max-width:1000px;margin:0 auto;position:relative;min-height:${maxDeskH}px;overflow:visible}.wx-popup-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:none;z-index:10000;overflow-y:auto;padding:20px;}.wx-popup-overlay.active{display:block;}.wx-popup-close{position:absolute;top:16px;right:16px;color:#000;font-size:24px;cursor:pointer;line-height:1;z-index:99999;background:rgba(0,0,0,0.05);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;}${css}${popupCSS}${mobileCss}</style></head><body><div class="site-canvas">${buildPageHTML(null, page)}</div>${popupHTML}${runtimeScript}</body></html>`;
            const filename = page.id === 'pg-index' ? 'index.html' : `${page.id}.html`;
            zip.file(filename, htmlOut);
        });
        zip.generateAsync({ type: 'blob' }).then(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (state.settings.pageId || 'site') + '_package.zip'; a.click(); });
    }

    // ── PUBLIC API ───────────────────────────────────────────────────
    return {
        init: () => {
            canvas = document.getElementById('canvas');
            initInteractions(); initContextListeners(); loadStockManifest();
            const lastId = localStorage.getItem(LAST_ACTIVE_KEY);
            if (lastId && getLibrary()[lastId]) { loadFromLibrary(lastId); } else { createNewSite(); }
        },

        addBlock, handleMediaUpload, handleSoundUpload,
        changeZIndex, deleteActive, duplicateActive,
        loadFromLibrary, deleteFromLibrary, openLibrary: openLibraryModal, createNewSite,
        openAssetLibrary, renamePage,
        pickSound: () => {
            if (!state.activeId) return;
            openAssetLibrary('sound', name => {
                updateBlock(state.activeId, { link: { type: 'sound', value: name } }); saveState();
                const btn = document.getElementById('inp-soundFile'); if (btn) btn.textContent = `🔊 ${name}`;
            });
        },

        openSettings: () => {
            document.getElementById('set-title').value = state.settings.title || '';
            document.getElementById('set-id').value = state.settings.pageId || '';
            document.getElementById('set-bg').value = state.settings.bgHex || '#ffffff';
            document.getElementById('set-bg-val').textContent = state.settings.bgHex || '#ffffff';
            const list = document.getElementById('set-pages-list');
            if (list) {
                list.innerHTML = Object.values(state.pages).map(p => `
                    <div class="set-page-row">
                        <span class="set-page-type">${p.type === 'popup' ? '⚡' : '📄'}</span>
                        <input class="ctx-input set-page-name" data-pid="${p.id}" value="${p.name.replace(/"/g,'&quot;')}" placeholder="Page name">
                        <span style="font-size:10px;color:var(--text-muted);font-family:monospace;flex-shrink:0;">${p.type}</span>
                        <button class="ctx-icon-btn danger" onclick="Architect.deletePage('${p.id}')" title="Delete" style="width:24px;height:24px;font-size:12px;flex-shrink:0;margin-left:4px;">🗑</button>
                    </div>`).join('');
                list.querySelectorAll('.set-page-name').forEach(inp => {
                    inp.addEventListener('change', e => {
                        renamePage(e.target.dataset.pid, e.target.value);
                        renderPageDropdowns();
                    });
                });
            }
            document.getElementById('settings-modal').style.display = 'flex';
        },

        createPage, switchPage, toggleLinkInput, deletePage,
        updateTextAlign: val => { if (state.activeId) { updateBlock(state.activeId, { style: { textAlign: val } }); saveState(); } },
        toggleFormat,
        execFormat: (cmd, val) => document.execCommand(cmd, false, val || null),
        applyTextPreset,
        generateExport: () => { state.settings.pageId = state.settings.pageId || 'my-site'; state.settings.title = state.settings.title || state.settings.pageId; generateExport(); },
        setPreview: m => {
            const isMob = m === 'mobile';
            isMob ? canvas.classList.add('mobile-mode') : canvas.classList.remove('mobile-mode');
            document.getElementById('btn-desktop').classList.toggle('active', !isMob);
            document.getElementById('btn-mobile').classList.toggle('active', isMob);
            document.getElementById('mobile-hint').style.display = isMob ? 'flex' : 'none';
            if (isMob) { setActive(null); document.getElementById('context-panel').style.display = 'none'; }
            renderCanvas();
        }
    };
})();
document.addEventListener('DOMContentLoaded', Architect.init);