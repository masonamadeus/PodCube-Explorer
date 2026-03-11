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
    let selectedIds = new Set(); // Tracks multi-selected block IDs

    const LAST_ACTIVE_KEY = 'wexton_last_id';
    const LIBRARY_KEY = 'wexton_library';

    // ── FONT CATEGORIES ──────────────────────────────────────────────
    const FONT_CATEGORIES = [
        { label: 'Geometric', fonts: ['Nunito', 'Poppins', 'Montserrat', 'Outfit', 'Fredoka', 'Jost', 'Quicksand', 'Comfortaa', 'Varela Round', 'Exo 2', 'League Spartan', 'Lexend', 'Syne', 'Sen'] },
        { label: 'Neutral', fonts: ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Source Sans 3', 'Work Sans', 'DM Sans', 'Plus Jakarta Sans', 'Mulish', 'Manrope', 'Public Sans', 'Rubik', 'Karla'] },
        { label: 'Condensed', fonts: ['Oswald', 'Barlow Condensed', 'Bebas Neue', 'Anton', 'Fjalla One', 'Squada One', 'Yanone Kaffeesatz', 'Teko', 'Impact', 'Six Caps', 'Francois One'] },
        { label: 'Serif', fonts: ['Playfair Display', 'Lora', 'Merriweather', 'EB Garamond', 'Libre Baskerville', 'Cormorant Garamond', 'DM Serif Display', 'Spectral', 'Crimson Text', 'Bitter', 'PT Serif'] },
        { label: 'Slab Serif', fonts: ['Zilla Slab', 'Roboto Slab', 'Arvo', 'Crete Round', 'Alfa Slab One', 'Glegoo', 'Copse', 'Josefin Slab', 'Patua One', 'Sanchez'] },
        { label: 'Script', fonts: ['Pacifico', 'Dancing Script', 'Satisfy', 'Caveat', 'Sacramento', 'Great Vibes', 'Allura', 'Kaushan Script', 'Lobster', 'Parisienne', 'Yellowtail', 'Cookie', 'Handlee'] },
        { label: 'Decorative', fonts: ['Abril Fatface', 'Righteous', 'Boogaloo', 'Titan One', 'Bangers', 'Lilita One', 'Passion One', 'Russo One', 'Ultra', 'Permanent Marker', 'Carter One', 'Creepster', 'Sigmar One'] },
        { label: 'Monospace', fonts: ['Fira Code', 'JetBrains Mono', 'Space Mono', 'IBM Plex Mono', 'Inconsolata', 'Source Code Pro', 'Courier Prime', 'Share Tech Mono', 'VT323', 'Roboto Mono', 'Ubuntu Mono'] }
    ];

    function preloadAllFonts() {
        let allFonts = [];
        FONT_CATEGORIES.forEach(cat => allFonts.push(...cat.fonts));
        
        // Inject Google Fonts stylesheets in chunks and collect a load-promise per link.
        // The links are async — @font-face rules don't exist until each one is parsed.
        const linkPromises = [];
        for (let i = 0; i < allFonts.length; i += 15) {
            const chunk = allFonts.slice(i, i + 15);
            const params = chunk.map(f => `family=${encodeURIComponent(f).replace(/%20/g,'+')}:wght@400;700`).join('&');
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?${params}&display=swap`;
            linkPromises.push(new Promise(res => { link.onload = res; link.onerror = res; }));
            document.head.appendChild(link);
        }

        // Only AFTER all stylesheets are parsed do we append the hidden stage.
        // If we do it before, the browser sees font-family values on the spans but
        // finds no matching @font-face rule yet, falls back, and never re-checks —
        // meaning the fonts never get downloaded until something else triggers them.
        Promise.all(linkPromises).then(() => {
            const stage = document.createElement('div');
            stage.setAttribute('aria-hidden', 'true');
            stage.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
            allFonts.forEach(f => {
                const span = document.createElement('span');
                span.style.fontFamily = `'${f}', sans-serif`;
                span.textContent = 'Aa';
                stage.appendChild(span);
            });
            document.body.appendChild(stage);
        });
    }

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
        
        if (isStock) {
            assetUrls.set(name, `./assets/${name}`);
        }
        addBlock('media', { filename: name });
        
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
        if (Object.keys(getActivePage()?.blocks || {}).length > 0 && !confirm("Start a new site? Unsaved work will be lost if you haven't given it a Site ID.")) return;
        
        const pId = 'pg-home-' + Date.now().toString().slice(-4);
        state = {
            settings: { pageId: 'new-site-' + Date.now().toString().slice(-4), title: 'Wexton Masterclass', bgHex: '#e2e2e7', indexPageId: pId },
            pages: { [pId]: { id: pId, name: 'Home', type: 'page', blocks: {}, layerOrder: [] } },
            activePageId: pId, activeId: null
        };
        
        const p = state.pages[pId];

         p.blocks['wx-blk-1'] = { id: 'wx-blk-1', type: 'shape', parentId: null, content: ``, filename: null, link: undefined, layout: {"x":0,"y":-20,"w":60,"h":200}, style: {"bgHex":"#0066ff","opacity":100,"textHex":"#1d1d1f","fontFamily":"Nunito","fontSize":16,"textAlign":"left","padding":0,"radiusTL":0,"radiusTR":0,"radiusBL":173.5,"radiusBR":207.5,"shadowOn":false,"shadowColor":"#000000","shadowAlpha":20,"shadowAngle":135,"shadowDist":8,"shadowBlur":16,"shadowSpread":0,"borderW":0,"borderStyle":"solid","borderHex":"#000000","overflow":"hidden","letterSpacing":0,"lineHeight":1.4,"rotation":0} };
        p.layerOrder.push('wx-blk-1');

        p.blocks['wx-blk-2'] = { id: 'wx-blk-2', type: 'text', parentId: 'wx-blk-1', content: `<h1 style="color:#ffffff; text-align:center;">Wexton Builder</h1>`, filename: null, link: undefined, layout: {"x":0,"y":10,"w":60,"h":20}, style: {"bgHex":"transparent","opacity":100,"textHex":"#ffffff","fontFamily":"Nunito","fontSize":48,"textAlign":"center","padding":12,"radiusTL":8,"radiusTR":8,"radiusBL":8,"radiusBR":8,"shadowOn":false,"shadowColor":"#000000","shadowAlpha":20,"shadowAngle":135,"shadowDist":8,"shadowBlur":16,"shadowSpread":0,"borderW":0,"borderStyle":"solid","borderHex":"#000000","overflow":"hidden","letterSpacing":0,"lineHeight":1.4,"rotation":0} };
        p.layerOrder.push('wx-blk-2');

        p.blocks['wx-blk-3'] = { id: 'wx-blk-3', type: 'text', parentId: 'wx-blk-1', content: `<p style="text-align:center;">Everything you need to build interactive Intranet nodes.</p>`, filename: null, link: undefined, layout: {"x":10,"y":140,"w":40,"h":40}, style: {"bgHex":"transparent","opacity":100,"textHex":"#e8e8ed","fontFamily":"Fustat","fontSize":18,"textAlign":"center","padding":12,"radiusTL":8,"radiusTR":8,"radiusBL":8,"radiusBR":8,"shadowOn":false,"shadowColor":"#000000","shadowAlpha":20,"shadowAngle":135,"shadowDist":8,"shadowBlur":16,"shadowSpread":0,"borderW":0,"borderStyle":"solid","borderHex":"#000000","overflow":"hidden","letterSpacing":0,"lineHeight":1.4,"rotation":0} };
        p.layerOrder.push('wx-blk-3');

        p.blocks['wx-blk-4'] = { id: 'wx-blk-4', type: 'shape', parentId: null, content: ``, filename: null, link: undefined, layout: {"x":2,"y":240,"w":17,"h":260}, style: {"bgHex":"#ffffff","opacity":100,"textHex":"#1d1d1f","fontFamily":"Nunito","fontSize":16,"textAlign":"left","padding":0,"radiusTL":16,"radiusTR":16,"radiusBL":16,"radiusBR":61.5,"shadowOn":true,"shadowColor":"#000000","shadowAlpha":6,"shadowAngle":135,"shadowDist":8,"shadowBlur":24,"shadowSpread":0,"borderW":0,"borderStyle":"solid","borderHex":"#000000","overflow":"hidden","letterSpacing":0,"lineHeight":1.4,"rotation":0} };
        p.layerOrder.push('wx-blk-4');

        p.blocks['wx-blk-5'] = { id: 'wx-blk-5', type: 'text', parentId: null, content: `<h3 style="color:#0066ff; margin-bottom: 12px;">1. The Basics</h3><p style="margin-bottom: 8px;"><strong>Double-click</strong> any text to edit it inline.</p><p style="margin-bottom: 8px;"><strong>Drag elements</strong> to move them freely.</p><p>Use the <strong>Arrow Keys</strong> to nudge elements precisely along the grid.</p>`, filename: null, link: undefined, layout: {"x":3,"y":250,"w":15,"h":220}, style: {"bgHex":"transparent","opacity":100,"textHex":"#1d1d1f","fontFamily":"Nunito","fontSize":15,"textAlign":"left","padding":12,"radiusTL":8,"radiusTR":8,"radiusBL":8,"radiusBR":8,"shadowOn":false,"shadowColor":"#000000","shadowAlpha":20,"shadowAngle":135,"shadowDist":8,"shadowBlur":16,"shadowSpread":0,"borderW":0,"borderStyle":"solid","borderHex":"#000000","overflow":"hidden","letterSpacing":0,"lineHeight":1.4,"rotation":0} };
        p.layerOrder.push('wx-blk-5');

        p.blocks['wx-blk-6'] = { id: 'wx-blk-6', type: 'shape', parentId: null, content: ``, filename: null, link: undefined, layout: {"x":21,"y":240,"w":18,"h":260}, style: {"bgHex":"#ffffff","opacity":100,"textHex":"#1d1d1f","fontFamily":"Nunito","fontSize":16,"textAlign":"left","padding":0,"radiusTL":16,"radiusTR":131.5,"radiusBL":16,"radiusBR":16,"shadowOn":true,"shadowColor":"#000000","shadowAlpha":6,"shadowAngle":135,"shadowDist":8,"shadowBlur":24,"shadowSpread":0,"borderW":0,"borderStyle":"solid","borderHex":"#000000","overflow":"hidden","letterSpacing":0,"lineHeight":1.4,"rotation":0} };
        p.layerOrder.push('wx-blk-6');

        p.blocks['wx-blk-7'] = { id: 'wx-blk-7', type: 'text', parentId: 'wx-blk-6', content: `<h3 style="color:#0066ff; margin-bottom: 12px;">2. Properties</h3><p style="margin-bottom: 8px;">Select a block to open its <strong>Properties Panel</strong>.</p><p style="margin-bottom: 8px;">Change colors, borders, opacity, and rotation.</p><p>Use the orange corner handles to adjust the <strong>Border Radius</strong> dynamically.</p>`, filename: null, link: undefined, layout: {"x":1,"y":10,"w":16,"h":220}, style: {"bgHex":"transparent","opacity":100,"textHex":"#1d1d1f","fontFamily":"Nunito","fontSize":15,"textAlign":"left","padding":12,"radiusTL":8,"radiusTR":62,"radiusBL":8,"radiusBR":8,"shadowOn":false,"shadowColor":"#000000","shadowAlpha":20,"shadowAngle":135,"shadowDist":8,"shadowBlur":16,"shadowSpread":0,"borderW":0,"borderStyle":"solid","borderHex":"#000000","overflow":"hidden","letterSpacing":0,"lineHeight":1.4,"rotation":0} };
        p.layerOrder.push('wx-blk-7');

        p.blocks['wx-blk-8'] = { id: 'wx-blk-8', type: 'shape', parentId: null, content: ``, filename: null, link: undefined, layout: {"x":41,"y":240,"w":17,"h":260}, style: {"bgHex":"#ffffff","opacity":100,"textHex":"#1d1d1f","fontFamily":"Nunito","fontSize":16,"textAlign":"left","padding":0,"radiusTL":16,"radiusTR":16,"radiusBL":88.5,"radiusBR":16,"shadowOn":true,"shadowColor":"#000000","shadowAlpha":6,"shadowAngle":135,"shadowDist":8,"shadowBlur":24,"shadowSpread":0,"borderW":0,"borderStyle":"solid","borderHex":"#000000","overflow":"hidden","letterSpacing":0,"lineHeight":1.4,"rotation":0} };
        p.layerOrder.push('wx-blk-8');

        p.blocks['wx-blk-9'] = { id: 'wx-blk-9', type: 'text', parentId: 'wx-blk-8', content: `<h3 style="color:#0066ff; margin-bottom: 12px;">3. Actions & Links</h3><p style="margin-bottom: 16px;">Blocks can be interactive! Check the <strong>Action</strong> tab to link URLs, open Popups, or trigger Sounds.</p>`, filename: null, link: undefined, layout: {"x":1,"y":10,"w":15,"h":140}, style: {"bgHex":"transparent","opacity":100,"textHex":"#1d1d1f","fontFamily":"Nunito","fontSize":15,"textAlign":"left","padding":12,"radiusTL":8,"radiusTR":8,"radiusBL":8,"radiusBR":8,"shadowOn":false,"shadowColor":"#000000","shadowAlpha":20,"shadowAngle":135,"shadowDist":8,"shadowBlur":16,"shadowSpread":0,"borderW":0,"borderStyle":"solid","borderHex":"#000000","overflow":"hidden","letterSpacing":0,"lineHeight":1.4,"rotation":0} };
        p.layerOrder.push('wx-blk-9');

        p.blocks['wx-blk-10'] = { id: 'wx-blk-10', type: 'text', parentId: 'wx-blk-8', content: `<div style="text-align:center; font-weight:bold; cursor:pointer;">Test Sound</div>`, filename: null, link: {"type":"sound","value":"Bonk-1.mp3"}, layout: {"x":2,"y":170,"w":13,"h":50}, style: {"bgHex":"#0066ff","opacity":100,"textHex":"#ffffff","fontFamily":"Nunito","fontSize":16,"textAlign":"center","padding":12,"radiusTL":13,"radiusTR":13,"radiusBL":116.5,"radiusBR":13,"shadowOn":true,"shadowColor":"#000000","shadowAlpha":20,"shadowAngle":135,"shadowDist":8,"shadowBlur":14,"shadowSpread":0,"borderW":0,"borderStyle":"solid","borderHex":"#000000","overflow":"hidden","letterSpacing":0,"lineHeight":1.4,"rotation":0} };
        p.layerOrder.push('wx-blk-10');

        p.blocks['wx-blk-11'] = { id: 'wx-blk-11', type: 'shape', parentId: null, content: ``, filename: null, link: undefined, layout: {"x":2,"y":530,"w":38,"h":280}, style: {"bgHex":"#f0f0f5","opacity":100,"textHex":"#1d1d1f","fontFamily":"Nunito","fontSize":16,"textAlign":"left","padding":0,"radiusTL":16,"radiusTR":16,"radiusBL":16,"radiusBR":16,"shadowOn":false,"shadowColor":"#000000","shadowAlpha":20,"shadowAngle":135,"shadowDist":8,"shadowBlur":16,"shadowSpread":0,"borderW":3,"borderStyle":"dashed","borderHex":"#0066ff","overflow":"hidden","letterSpacing":0,"lineHeight":1.4,"rotation":0} };
        p.layerOrder.push('wx-blk-11');

        p.blocks['wx-blk-12'] = { id: 'wx-blk-12', type: 'text', parentId: 'wx-blk-11', content: `<h3 style="color:#0066ff; margin-bottom: 8px;">4. Nesting (Shapes as Containers)</h3><p>Shapes act as containers. If you drag an element completely inside a Shape, it becomes <strong>grouped</strong> and moves with it. The 📚 Layers panel (top right) will show the relationship.</p>`, filename: null, link: undefined, layout: {"x":2,"y":20,"w":34,"h":100}, style: {"bgHex":"transparent","opacity":100,"textHex":"#1d1d1f","fontFamily":"Nunito","fontSize":16,"textAlign":"left","padding":12,"radiusTL":8,"radiusTR":8,"radiusBL":8,"radiusBR":8,"shadowOn":false,"shadowColor":"#000000","shadowAlpha":20,"shadowAngle":135,"shadowDist":8,"shadowBlur":16,"shadowSpread":0,"borderW":0,"borderStyle":"solid","borderHex":"#000000","overflow":"hidden","letterSpacing":0,"lineHeight":1.4,"rotation":0} };
        p.layerOrder.push('wx-blk-12');

        p.blocks['wx-blk-13'] = { id: 'wx-blk-13', type: 'shape', parentId: null, content: ``, filename: null, link: undefined, layout: {"x":44,"y":580,"w":14,"h":140}, style: {"bgHex":"#f18701","opacity":100,"textHex":"#1d1d1f","fontFamily":"Nunito","fontSize":16,"textAlign":"left","padding":0,"radiusTL":12,"radiusTR":12,"radiusBL":12,"radiusBR":12,"shadowOn":true,"shadowColor":"#000000","shadowAlpha":20,"shadowAngle":135,"shadowDist":8,"shadowBlur":30,"shadowSpread":0,"borderW":0,"borderStyle":"solid","borderHex":"#000000","overflow":"hidden","letterSpacing":0,"lineHeight":1.4,"rotation":-8} };
        p.layerOrder.push('wx-blk-13');

        p.blocks['wx-blk-14'] = { id: 'wx-blk-14', type: 'text', parentId: 'wx-blk-13', content: `<div style="text-align:center; font-weight:bold;">Drag me into the dashed box!</div>`, filename: null, link: undefined, layout: {"x":1,"y":30,"w":12,"h":80}, style: {"bgHex":"transparent","opacity":100,"textHex":"#ffffff","fontFamily":"Nunito","fontSize":16,"textAlign":"center","padding":12,"radiusTL":8,"radiusTR":8,"radiusBL":8,"radiusBR":8,"shadowOn":false,"shadowColor":"#000000","shadowAlpha":20,"shadowAngle":135,"shadowDist":8,"shadowBlur":16,"shadowSpread":0,"borderW":0,"borderStyle":"solid","borderHex":"#000000","overflow":"hidden","letterSpacing":0,"lineHeight":1.4,"rotation":0} };
        p.layerOrder.push('wx-blk-14');

        p.blocks['wx-blk-15'] = { id: 'wx-blk-15', type: 'shape', parentId: null, content: ``, filename: null, link: undefined, layout: {"x":2,"y":840,"w":27,"h":320}, style: {"bgHex":"#ffffff","opacity":100,"textHex":"#1d1d1f","fontFamily":"Nunito","fontSize":16,"textAlign":"left","padding":0,"radiusTL":16,"radiusTR":16,"radiusBL":16,"radiusBR":16,"shadowOn":true,"shadowColor":"#000000","shadowAlpha":6,"shadowAngle":135,"shadowDist":8,"shadowBlur":24,"shadowSpread":0,"borderW":0,"borderStyle":"solid","borderHex":"#000000","overflow":"hidden","letterSpacing":0,"lineHeight":1.4,"rotation":0} };
        p.layerOrder.push('wx-blk-15');

        p.blocks['wx-blk-16'] = { id: 'wx-blk-16', type: 'text', parentId: 'wx-blk-15', content: `<h3 style="color:#0066ff; margin-bottom: 8px;">5. Media & Assets</h3><p>Click "Image" in the floating dock below to upload assets or browse the stock library. Wexton automatically bundles your assets when you export!</p>`, filename: null, link: undefined, layout: {"x":2,"y":20,"w":23,"h":120}, style: {"bgHex":"transparent","opacity":100,"textHex":"#1d1d1f","fontFamily":"Nunito","fontSize":15,"textAlign":"left","padding":12,"radiusTL":8,"radiusTR":8,"radiusBL":8,"radiusBR":8,"shadowOn":false,"shadowColor":"#000000","shadowAlpha":20,"shadowAngle":135,"shadowDist":8,"shadowBlur":16,"shadowSpread":0,"borderW":0,"borderStyle":"solid","borderHex":"#000000","overflow":"hidden","letterSpacing":0,"lineHeight":1.4,"rotation":0} };
        p.layerOrder.push('wx-blk-16');

        p.blocks['wx-blk-17'] = { id: 'wx-blk-17', type: 'media', parentId: 'wx-blk-15', content: ``, filename: 'Wexton Industries.jpg', link: undefined, layout: {"x":2,"y":150,"w":23,"h":150}, style: {"bgHex":"transparent","opacity":100,"textHex":"#1d1d1f","fontFamily":"Nunito","fontSize":16,"textAlign":"left","padding":12,"radiusTL":8,"radiusTR":8,"radiusBL":8,"radiusBR":8,"shadowOn":false,"shadowColor":"#000000","shadowAlpha":20,"shadowAngle":135,"shadowDist":8,"shadowBlur":16,"shadowSpread":0,"borderW":0,"borderStyle":"solid","borderHex":"#000000","overflow":"hidden","letterSpacing":0,"lineHeight":1.4,"rotation":0} };
        p.layerOrder.push('wx-blk-17');

        p.blocks['wx-blk-18'] = { id: 'wx-blk-18', type: 'shape', parentId: null, content: ``, filename: null, link: undefined, layout: {"x":31,"y":840,"w":27,"h":320}, style: {"bgHex":"#ffffff","opacity":100,"textHex":"#1d1d1f","fontFamily":"Nunito","fontSize":16,"textAlign":"left","padding":0,"radiusTL":16,"radiusTR":16,"radiusBL":16,"radiusBR":16,"shadowOn":true,"shadowColor":"#000000","shadowAlpha":6,"shadowAngle":135,"shadowDist":8,"shadowBlur":24,"shadowSpread":0,"borderW":0,"borderStyle":"solid","borderHex":"#000000","overflow":"hidden","letterSpacing":0,"lineHeight":1.4,"rotation":0} };
        p.layerOrder.push('wx-blk-18');

        p.blocks['wx-blk-19'] = { id: 'wx-blk-19', type: 'text', parentId: 'wx-blk-18', content: `<h3 style="color:#0066ff; margin-bottom: 12px;">6. Availability &amp; Export</h3><p style="margin-bottom:12px;">Click <strong>⚙️ Settings</strong> at the top.</p><p style="margin-bottom:12px;">Here you can define <strong>Temporal Availability</strong> rules to dictate exactly what times, days, or months this site will appear on the Intranet.</p><p style="margin-bottom:12px;">Click <b>Preview</b> to test your site's buttons and stuff.</p><p>When ready, click <strong>⬇ Export ZIP</strong> and send the bundle to the administrator.</p>`, filename: null, link: undefined, layout: {"x":2,"y":20,"w":23,"h":280}, style: {"bgHex":"transparent","opacity":100,"textHex":"#1d1d1f","fontFamily":"Nunito","fontSize":15,"textAlign":"left","padding":12,"radiusTL":8,"radiusTR":8,"radiusBL":8,"radiusBR":8,"shadowOn":false,"shadowColor":"#000000","shadowAlpha":20,"shadowAngle":135,"shadowDist":8,"shadowBlur":16,"shadowSpread":0,"borderW":0,"borderStyle":"solid","borderHex":"#000000","overflow":"hidden","letterSpacing":0,"lineHeight":1.4,"rotation":0} };
        p.layerOrder.push('wx-blk-19');

        p.blocks['wx-blk-20'] = { id: 'wx-blk-20', type: 'shape', parentId: null, content: ``, filename: null, link: {"type":"none","value":""}, layout: {"x":5,"y":1240,"w":18,"h":240}, style: {"bgHex":"#fafafa","opacity":100,"textHex":"#1d1d1f","fontFamily":"Nunito","fontSize":16,"textAlign":"left","padding":0,"radiusTL":34,"radiusTR":34,"radiusBL":34,"radiusBR":34,"shadowOn":false,"shadowColor":"#000000","shadowAlpha":20,"shadowAngle":135,"shadowDist":8,"shadowBlur":16,"shadowSpread":0,"borderW":0,"borderStyle":"solid","borderHex":"#000000","overflow":"hidden","letterSpacing":0,"lineHeight":1.4,"rotation":0} };
        p.layerOrder.push('wx-blk-20');

        p.blocks['wx-blk-21'] = { id: 'wx-blk-21', type: 'text', parentId: 'wx-blk-20', content: `<p><font style="font-size: 18px; color: rgb(0, 102, 255); font-weight: bold;">7. Pages &amp; Popups</font></p>`, filename: null, link: {"type":"none","value":""}, layout: {"x":1,"y":-10,"w":16,"h":80}, style: {"bgHex":"transparent","opacity":100,"textHex":"#1d1d1f","fontFamily":"Nunito","fontSize":16,"textAlign":"left","padding":12,"radiusTL":8,"radiusTR":8,"radiusBL":8,"radiusBR":8,"shadowOn":false,"shadowColor":"#000000","shadowAlpha":20,"shadowAngle":135,"shadowDist":8,"shadowBlur":16,"shadowSpread":0,"borderW":0,"borderStyle":"solid","borderHex":"#000000","overflow":"hidden","letterSpacing":0,"lineHeight":1.4,"rotation":0} };
        p.layerOrder.push('wx-blk-21');

        p.blocks['wx-blk-22'] = { id: 'wx-blk-22', type: 'text', parentId: null, content: `<p>You can make more pages, and navigate to them using <b>Action</b>s!</p><p><br></p><p>You can also make <b>Popups</b>, which are like little pages that you can pop up using Actions anywhere on your site!</p>`, filename: null, link: {"type":"none","value":""}, layout: {"x":6,"y":1280,"w":16,"h":80}, style: {"bgHex":"transparent","opacity":100,"textHex":"#1d1d1f","fontFamily":"Nunito","fontSize":16,"textAlign":"left","padding":12,"radiusTL":8,"radiusTR":8,"radiusBL":8,"radiusBR":8,"shadowOn":false,"shadowColor":"#000000","shadowAlpha":20,"shadowAngle":135,"shadowDist":8,"shadowBlur":16,"shadowSpread":0,"borderW":0,"borderStyle":"solid","borderHex":"#000000","overflow":"hidden","letterSpacing":0,"lineHeight":1.4,"rotation":0} };
        p.layerOrder.push('wx-blk-22');


        idCounter = 23;

        history = []; historyIndex = -1; renderPageDropdowns(); renderCanvas(); saveState(); closeLibraryModal(); Architect.openSettings();
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

    // ── LAYERS PANEL ──────────────────────────────────────────────────
    function renderLayers() {
        const list = document.getElementById('layers-list');
        if (!list) return;
        const page = getActivePage();
        if (!page) { list.innerHTML = ''; return; }

        let html = '';
        // Reverse order so the top-most layers render at the top of the list
        [...page.layerOrder].reverse().forEach(id => {
            const b = page.blocks[id];
            const isSelected = state.activeId === id || (selectedIds.size > 1 && selectedIds.has(id));
            
            // Determine Icon and Name
            const icon = b.type === 'text' ? '📝' : b.type === 'shape' ? '⬛' : '🖼️';
            let name = b.type;
            if (b.type === 'text') {
                // Strip HTML tags to show a clean text preview
                const tmp = document.createElement('div');
                tmp.innerHTML = b.content;
                name = tmp.textContent.trim().substring(0, 16) || 'Empty Text';
            } else if (b.filename) {
                name = b.filename.substring(0, 16);
            }
            
            html += `
            <div class="layer-item" onclick="Architect.selectLayer('${id}')" style="padding:8px 10px; font-size:12px; border:1px solid ${isSelected ? 'var(--primary)' : 'transparent'}; border-radius:6px; cursor:pointer; background:${isSelected ? 'var(--primary-dim)' : 'transparent'}; color:${isSelected ? 'var(--primary)' : 'var(--text-main)'}; display:flex; justify-content:space-between; align-items:center; transition:background 0.1s;">
                <div style="display:flex; gap:8px; align-items:center; overflow:hidden; white-space:nowrap;">
                    <span style="opacity:0.7;">${icon}</span>
                    <span style="overflow:hidden; text-overflow:ellipsis; font-weight:${isSelected ? '700' : '600'};">${name}</span>
                </div>
            </div>`;
        });
        list.innerHTML = html;
    }

    // ── DYNAMIC CANVAS HEIGHT ─────────────────────────────────────────
    function updateCanvasHeight() {
        if (!canvas) return;
        const page = getActivePage();

        if (!page || page.type === 'popup') {
            canvas.style.minHeight = ''
            return
        }; 
        
        let maxBottom = 400; // minimum guarantee
        page.layerOrder.forEach(id => {
            const b = page.blocks[id];
            if (!b.parentId) {
                // Grab the actual DOM node to measure true text-wrap height
                const node = document.getElementById(id);
                const actualH = node ? node.offsetHeight : b.layout.h;
                
                const bottom = b.layout.y + actualH;
                if (bottom > maxBottom) maxBottom = bottom;
            }
        });
        // Give 400px of extra breathing room to drag new elements below the current content
        canvas.style.minHeight = (maxBottom + 100) + 'px';
    }


    // ── CORE BUILDER ENGINE ──────────────────────────────────────────    

    function defaultStyle(type) {
        return {
            bgHex: type === 'shape' ? '#c0c0c0' : 'transparent',
            opacity: 100,
            textHex: '#1d1d1f',
            fontFamily: 'Nunito', fontSize: 16, textAlign: 'left',
            padding: type === 'shape' ? 0 : 12,
            radiusTL: 8, radiusTR: 8, radiusBL: 8, radiusBR: 8,
            shadowOn: false, shadowColor: '#000000', shadowAlpha: 20,
            shadowAngle: 135, shadowDist: 8, shadowBlur: 16, shadowSpread: 0,
            borderW: 0, borderStyle: 'solid', borderHex: '#000000',
            overflow: 'hidden',
            letterSpacing: 0, lineHeight: 1.4,
            rotation: 0,
            preserveLayout: type === 'shape',
            flipH: false, flipV: false
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

    function updateBlock(id, updates, skipUI = false) {
        const page = getActivePage(); if (!page.blocks[id]) return;
        const b = page.blocks[id];
        if (updates.parentId !== undefined) b.parentId = updates.parentId;
        if (updates.layout) b.layout = Object.assign({}, b.layout, updates.layout);
        if (updates.style) { b.style = Object.assign({}, b.style, updates.style); if (updates.style.fontFamily) loadGoogleFont(updates.style.fontFamily); }
        if (updates.content !== undefined) b.content = updates.content;
        if (updates.link !== undefined) b.link = updates.link;
        renderBlockNode(id);
        
        if (!skipUI) {
            updateCanvasHeight();
            if (state.activeId === id || selectedIds.has(id)) { renderSelectionBox(); syncContextPanel(true); }
            renderLayers();
        }
    }

    function setActive(id, additive = false) {
        if (!additive) {
            selectedIds.clear();
            if (id) selectedIds.add(id);
        } else if (id) {
            if (selectedIds.has(id)) {
                selectedIds.delete(id);
                id = selectedIds.size > 0 ? [...selectedIds].at(-1) : null;
            } else {
                selectedIds.add(id);
            }
        }

        if (state.activeId !== id && state.activeId) {
            const oldNode = document.getElementById(state.activeId);
            if (oldNode) {
                const oldCa = oldNode.querySelector('.content-area[contenteditable="true"]');
                if (oldCa) {
                    // Nullify onblur BEFORE setting contentEditable=false to prevent the blur
                    // event from firing the handler a second time (double-save race condition).
                    oldCa.onblur = null;
                    oldCa.contentEditable = false;
                    updateBlock(state.activeId, { content: oldCa.innerHTML });
                    saveState();
                }
            }
        }
        if (state.activeId !== id) panelDragged = false;
        state.activeId = id; renderSelectionHighlights(); renderSelectionBox(); syncContextPanel(); renderLayers();
    }

    // Applies / removes the .multi-selected highlight class on all selected blocks.
    function renderSelectionHighlights() {
        document.querySelectorAll('.multi-selected').forEach(el => el.classList.remove('multi-selected'));
        if (selectedIds.size > 1) {
            selectedIds.forEach(sid => {
                const el = document.getElementById(sid);
                if (el) el.classList.add('multi-selected');
            });
        }
    }

    function deleteActive() {
        const idsToDelete = selectedIds.size > 0 ? new Set([...selectedIds]) : (state.activeId ? new Set([state.activeId]) : null);
        if (!idsToDelete || idsToDelete.size === 0) return;
        saveState();
        const page = getActivePage(); const toDelete = [];
        idsToDelete.forEach(id => {
            toDelete.push(id);
            page.layerOrder.forEach(lid => { if (page.blocks[lid] && page.blocks[lid].parentId === id) toDelete.push(lid); });
        });
        toDelete.forEach(id => { delete page.blocks[id]; page.layerOrder = page.layerOrder.filter(i => i !== id); });
        selectedIds.clear();
        setActive(null); renderCanvas();
    }

    function duplicateActive() {
        const idsToDuplicate = selectedIds.size > 1 ? Array.from(selectedIds) : (state.activeId ? [state.activeId] : []);
        if (idsToDuplicate.length === 0) return;
        
        saveState();
        const page = getActivePage();
        const newIds = [];
        
        idsToDuplicate.forEach(id => {
            const b = page.blocks[id]; 
            if (!b) return;
            
            // Perfectly clone the element's exact properties
            const copy = JSON.parse(JSON.stringify(b));
            copy.id = generateId(); 
            copy.layout.x += 2; 
            copy.layout.y += 20;
            
            // Bypass addBlock() and inject directly into state
            page.blocks[copy.id] = copy;
            page.layerOrder.push(copy.id);
            newIds.push(copy.id);
        });
        
        // Target all newly created blocks as the active selection
        selectedIds.clear();
        newIds.forEach(id => selectedIds.add(id));
        state.activeId = newIds[newIds.length - 1];
        
        // Refresh the UI once for all items
        renderCanvas();
        syncContextPanel();
        saveState();
    }

    function changeZIndex(dir) {
        if (!state.activeId) return; saveState();
        const page = getActivePage();
        const idx = page.layerOrder.indexOf(state.activeId); if (idx === -1) return;
        const ni = Math.max(0, Math.min(page.layerOrder.length - 1, idx + dir));
        page.layerOrder.splice(idx, 1); page.layerOrder.splice(ni, 0, state.activeId); renderCanvas();
    }

    let canvas;

    // Returns the total visual rotation for a block including all ancestor rotations.
    // Used to align the selection-box overlay and to project drag deltas into local space.
    function getAccumulatedRotation(blockId) {
        const page = getActivePage();
        let rot = 0;
        let b = page.blocks[blockId];
        while (b) {
            rot += (b.style && b.style.rotation) || 0;
            b = b.parentId ? page.blocks[b.parentId] : null;
        }
        return rot;
    }

    // Rotates a 2-D vector by `deg` degrees (counter-clockwise positive).
    // Use a negative angle to project screen-space deltas into an element's local frame.
    function rotateVec(dx, dy, deg) {
        const r = deg * Math.PI / 180;
        return { x: dx * Math.cos(r) - dy * Math.sin(r),
                 y: dx * Math.sin(r) + dy * Math.cos(r) };
    }

    function applyStyles(node, block) {
        const page = getActivePage(); const s = block.style;
        const parentBlock = block.parentId && page.blocks[block.parentId];
        const parentCols = parentBlock ? parentBlock.layout.w : CONFIG.gridCols;
        const isText = block.type === 'text';

        node.style.left = (block.layout.x / parentCols * 100) + '%';
        node.style.top = block.layout.y + 'px';
        node.style.width = (block.layout.w / parentCols * 100) + '%';
        node.style.height = block.layout.h + 'px';

        if (isText) {
            node.style.height = 'auto'; // Let text push the height down
            node.style.minHeight = block.layout.h + 'px'; // Obey user's dragged height
            node.style.overflow = 'visible'; // Never clip text!
            node.style.display = 'flex';
            node.style.flexDirection = 'column';
        } else {
            node.style.height = block.layout.h + 'px';
            node.style.overflow = s.overflow || 'hidden';
            node.style.display = 'block';
        }

        node.style.setProperty('--y-index', Math.round(block.layout.y));
        node.style.setProperty('--h', block.layout.h + 'px');
        node.style.setProperty('--pad', s.padding + 'px');
        node.style.setProperty('--pad-num', s.padding);
        node.style.setProperty('--fs', s.fontSize + 'px');
        node.style.setProperty('--fs-num', s.fontSize);
        node.style.setProperty('--ff', `'${s.fontFamily || 'Nunito'}', sans-serif`);
        node.style.setProperty('--align', s.textAlign || 'left');
        node.style.setProperty('--lsp', (s.letterSpacing || 0) + 'px');
        node.style.setProperty('--lsp-num', s.letterSpacing || 0);
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
        // Text blocks must stay 'visible' — do NOT overwrite the value set in the isText branch above
        if (!isText) node.style.overflow = s.overflow || 'hidden';

        // Chain rotation and flip transforms
        let transforms = [];
        if (s.rotation) transforms.push(`rotate(${s.rotation}deg)`);
        if (s.flipH) transforms.push(`scaleX(-1)`);
        if (s.flipV) transforms.push(`scaleY(-1)`);
        node.style.transform = transforms.join(' ');
        node.style.transformOrigin = '50% 50%';

        // Smarter Mobile Margins
        const isRoot = !block.parentId;
        const isLeftEdge = block.layout.x === 0;
        const isRightEdge = (block.layout.x + block.layout.w) >= parentCols;
        
        // Check Top Edge
        const isTopEdge = isRoot && block.layout.y <= 0;
        
        // Find Absolute Bottom Edge
        let maxBottom = 0;
        if (isRoot) {
            Object.values(page.blocks).forEach(b => {
                if (!b.parentId && (b.layout.y + b.layout.h > maxBottom)) {
                    maxBottom = b.layout.y + b.layout.h;
                }
            });
        }
        const isBottomEdge = isRoot && maxBottom > 0 && (block.layout.y + block.layout.h) >= maxBottom;
        
        node.style.setProperty('--mob-mt', isTopEdge ? '-20px' : '0px');
        node.style.setProperty('--mob-mb', isBottomEdge ? '-20px' : '0px');
        node.style.setProperty('--mob-ml', isLeftEdge ? '0px' : '20px');
        node.style.setProperty('--mob-mr', isRightEdge ? '0px' : '20px');
        node.style.setProperty('--mob-w', `calc(100% - ${isLeftEdge ? 0 : 20}px - ${isRightEdge ? 0 : 20}px)`);

        const parentH = parentBlock ? parentBlock.layout.h : 1;
        node.style.setProperty('--top-pct', (block.layout.y / parentH * 100) + '%');
        node.style.setProperty('--h-pct', (block.layout.h / parentH * 100) + '%');
        node.style.setProperty('--w-pct', (block.layout.w / parentCols * 100) + '%');
        node.style.setProperty('--left-pct', (block.layout.x / parentCols * 100) + '%');
        
        const deskW = block.layout.w * (1000 / 60);
        node.style.setProperty('--desk-w', deskW);
        node.style.setProperty('--desk-h', block.layout.h);
        
        if (s.preserveLayout) {
            node.classList.add('preserve-layout');
            node.style.setProperty('--root-desk-w', deskW);
        } else {
            node.classList.remove('preserve-layout');
            node.style.removeProperty('--root-desk-w');
        }
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
                const ca = node.querySelector('.content-area');
                
                // PASTE INTERCEPTOR (Strips weird Word/Web formatting) ---
                ca.addEventListener('paste', (e) => {
                    e.preventDefault();
                    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
                    document.execCommand('insertText', false, text);
                });

                node.ondblclick = () => {
                    if (canvas.classList.contains('mobile-mode')) return;
                    ca.contentEditable = true; 
                    ca.focus(); 
                    document.execCommand('selectAll', false, null); // Canva-style auto-highlight
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
        updateCanvasHeight();
        renderSelectionHighlights();
        renderSelectionBox();
        renderLayers();
    }

    function renderSelectionBox() {
        let box = document.getElementById('selection-box');
        const page = getActivePage();
        if ((!state.activeId && selectedIds.size === 0) || canvas.classList.contains('mobile-mode')) {
            if (box) box.style.display = 'none'; return;
        }
        if (!box) {
            box = document.createElement('div'); box.id = 'selection-box';
            box.innerHTML = `
                <div class="rotate-handle" data-action="rotate"></div>
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

        if (selectedIds.size > 1) {
            // MULTI-SELECTION: Virtual Group Bounding Box
            box.querySelectorAll('.rotate-handle, .radius-handle').forEach(h => h.style.display = 'none'); // Hide rotation for groups
            const cr = canvas.getBoundingClientRect();
            let minL = Infinity, minT = Infinity, maxR = -Infinity, maxB = -Infinity;
            
            selectedIds.forEach(id => {
                const node = document.getElementById(id);
                if (node) {
                    const nr = node.getBoundingClientRect();
                    const l = nr.left - cr.left + canvas.scrollLeft; 
                    const t = nr.top - cr.top + canvas.scrollTop;
                    if (l < minL) minL = l; if (t < minT) minT = t;
                    if (l + nr.width > maxR) maxR = l + nr.width; if (t + nr.height > maxB) maxB = t + nr.height;
                }
            });
            if (minL === Infinity) { box.style.display = 'none'; return; }
            box.style.display = 'block'; 
            box.style.width = (maxR - minL) + 'px'; 
            box.style.height = (maxB - minT) + 'px';
            box.style.left = minL + 'px'; 
            box.style.top = minT + 'px'; 
            box.style.transform = `rotate(0deg)`;
        } else {
            // SINGLE SELECTION
            box.querySelectorAll('.rotate-handle, .radius-handle').forEach(h => h.style.display = 'block');
            const an = document.getElementById(state.activeId); if (!an) return;
            const rotation = getAccumulatedRotation(state.activeId);
            const cr = canvas.getBoundingClientRect(); 
            const nr = an.getBoundingClientRect();
            const boxW = an.offsetWidth;
            const boxH = an.offsetHeight;
            const centerX = nr.left - cr.left + canvas.scrollLeft + nr.width  / 2;
            const centerY = nr.top  - cr.top  + canvas.scrollTop  + nr.height / 2;

            box.style.display = 'block';
            box.style.width  = boxW + 'px';
            box.style.height = boxH + 'px';
            box.style.left   = (centerX - boxW / 2) + 'px';
            box.style.top    = (centerY - boxH / 2) + 'px';
            box.style.transform = `rotate(${rotation}deg)`;
        }
    }

    function syncTextToolbarFormat() {
        if (!state.activeId) return;
        const b = getActivePage().blocks[state.activeId]; if (!b || b.type !== 'text') return;
        const html = b.content;
        // Fallback checks for the entire block if no text is actively highlighted
        document.getElementById('tt-bold')?.classList.toggle('active',      /<(b|strong)\b/i.test(html));
        document.getElementById('tt-italic')?.classList.toggle('active',    /<(i|em)\b/i.test(html));
        document.getElementById('tt-underline')?.classList.toggle('active', /<u\b/i.test(html));
    }


    function syncContextPanel(positionOnly) {
        const panel = document.getElementById('context-panel');

        
        if (positionOnly && !canvas.classList.contains('mobile-mode')) { positionContextPanel(); return; }

        // Always restore section visibility first (handles returning from multi-select)
        panel.querySelectorAll('.ctx-section').forEach(s => s.style.display = '');

        // Multi-select mode: show a simplified panel header with count
        if (selectedIds.size > 1) {
            panel.style.display = 'block';
            const ctxTitle = document.getElementById('ctx-title');
            if (ctxTitle) ctxTitle.textContent = `${selectedIds.size} selected`;
            panel.querySelectorAll('.ctx-section').forEach(s => s.style.display = 'none');
            if (!canvas.classList.contains('mobile-mode')) positionContextPanel();
            return;
        }

        const block = getActivePage().blocks[state.activeId];
        if (!block) { panel.style.display = 'none'; return; }
        panel.style.display = 'block';

        const get = id => document.getElementById(id);
        const set = (id, val) => { const e = get(id); if (e) e.value = val; };
        const txt = (id, val) => { const e = get(id); if (e) e.textContent = val; };
        const s = block.style;

        if (get('ctx-title')) get('ctx-title').textContent = block.type;

        const unparentBtn = get('btn-unparent');
        if (unparentBtn) unparentBtn.style.display = block.parentId ? 'flex' : 'none';

        // Appearance
        const isTrans = s.bgHex === 'transparent';
        set('inp-bgHex', isTrans ? '#ffffff' : s.bgHex);
        if (get('inp-bgTransparent')) get('inp-bgTransparent').checked = isTrans;
        set('inp-radius', s.radiusTL || 0); txt('val-radius', s.radiusTL || 0);
        set('inp-opacity', s.opacity !== undefined ? s.opacity : 100); txt('val-opacity', s.opacity !== undefined ? s.opacity : 100);
        const rot = Math.round(s.rotation || 0);
        set('inp-rotation', rot); txt('val-rotation', rot);
        get('row-flip').style.display = (block.type === 'media' || block.type === 'shape') ? 'flex' : 'none';
        get('btn-flip-h')?.classList.toggle('active', !!s.flipH);
        get('btn-flip-v')?.classList.toggle('active', !!s.flipV);
        get('row-overflow').style.display = block.type === 'shape' ? 'flex' : 'none';
        get('row-preserve').style.display = block.type === 'shape' ? 'flex' : 'none';
        set('inp-overflow', s.overflow || 'hidden');
        if (get('inp-preserveLayout')) get('inp-preserveLayout').checked = !!s.preserveLayout;

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

        // Show the Text Panel only if a Text Block is selected
        const isText = block.type === 'text';
        const txtSec = get('section-text');
        if (txtSec) txtSec.style.display = isText ? 'block' : 'none';

        if (isText) {
            const font = s.fontFamily || 'Nunito';
            
            const catSel = get('tt-cat-selected');
            if (catSel) {
                let catName = FONT_CATEGORIES[0].label;
                for(let cat of FONT_CATEGORIES) { if(cat.fonts.includes(font)) { catName = cat.label; break; } }
                catSel.textContent = catName;
                renderFontList(catName); 
            }
            
            const fpSel = get('tt-fp-selected');
            if (fpSel) {
                fpSel.textContent = font;
                fpSel.style.fontFamily = `'${font}', sans-serif`;
            }
            
            // Sync Font Size && Color
            set('tt-textHex', s.textHex || '#1d1d1f');
            set('tt-fontSize', s.fontSize || 16);

            // Sync Letter Spacing
            set('inp-letterSpacing', s.letterSpacing || 0);
            txt('val-letterSpacing', s.letterSpacing || 0);

            // Sync Alignment Buttons
            get('tt-align-left')?.classList.toggle('active', s.textAlign === 'left');
            get('tt-align-center')?.classList.toggle('active', s.textAlign === 'center');
            get('tt-align-right')?.classList.toggle('active', s.textAlign === 'right');

            syncTextToolbarFormat();
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
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {

                if (panelDragged) return;
                const panel = document.getElementById('context-panel');
                const node = document.getElementById(state.activeId);
                if (!panel || panel.style.display === 'none' || !node) return;

                // First call often happens before the panel has been laid out (offsetHeight === 0).
                // Defer one frame so the browser can measure it, then position.
                if (!panel.offsetHeight) { requestAnimationFrame(positionContextPanel); return; }

                const margin = 8;
                const topClear = 64;          // stay below topbar
                const pw = panel.offsetWidth || 258;
                const ph = panel.offsetHeight;

                // Use the element's AABB center so rotated blocks stay sane.
                const rect = node.getBoundingClientRect();
                const elCx = rect.left + rect.width / 2;
                const elCy = rect.top + rect.height / 2;

                // Prefer right of element; flip left if it overflows; clamp to viewport.
                let x = rect.right + 14;
                if (x + pw > window.innerWidth - margin) x = rect.left - pw - 14;
                x = Math.max(margin, Math.min(x, window.innerWidth - pw - margin));

                // Align to element mid-point, clamped so the panel never leaves the viewport.
                let y = elCy - ph / 2;
                y = Math.max(topClear, Math.min(y, window.innerHeight - ph - margin));

                panel.style.left = x + 'px';
                panel.style.top = y + 'px';

            }) // frame 1
        }); //frame 2

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
            // Sync live DOM content into state BEFORE snapshotting, so the undo
            // checkpoint captures everything the user has typed since the last save.
            updateBlock(state.activeId, { content: ca.innerHTML });
            saveState();
            document.execCommand(cmd, false, null);
            updateBlock(state.activeId, { content: ca.innerHTML });
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

    // ── INLINE RICH TEXT ENGINE ──────────────────────────────────────
    let savedSelection = null;
    
    document.addEventListener('selectionchange', () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && state.activeId) {
            const node = document.getElementById(state.activeId);
            const ca = node && node.querySelector('.content-area[contenteditable="true"]');
            if (ca && ca.contains(sel.anchorNode)) {
                savedSelection = sel.getRangeAt(0);
                
                // REACTIVE UI: Read the actual styling of the text the cursor is currently inside!
                let target = sel.anchorNode;
                if (target.nodeType === 3) target = target.parentNode; // if it's a text node, grab its parent span/font tag
                const comp = window.getComputedStyle(target);
                
                // Update Format Buttons
                const isB = parseInt(comp.fontWeight) >= 600 || document.queryCommandState('bold');
                const isI = comp.fontStyle === 'italic' || document.queryCommandState('italic');
                const isU = comp.textDecorationLine.includes('underline') || document.queryCommandState('underline');
                
                document.getElementById('tt-bold')?.classList.toggle('active', isB);
                document.getElementById('tt-italic')?.classList.toggle('active', isI);
                document.getElementById('tt-underline')?.classList.toggle('active', isU);
                
                // Update Font Dropdowns
                let ff = comp.fontFamily.split(',')[0].replace(/['"]/g, '');
                const fpSel = document.getElementById('tt-fp-selected');
                const catSel = document.getElementById('tt-cat-selected');
                if (fpSel && ff) {
                    fpSel.textContent = ff;
                    fpSel.style.fontFamily = `'${ff}', sans-serif`;
                    if (catSel) {
                        let catName = FONT_CATEGORIES[0].label;
                        for(let cat of FONT_CATEGORIES) { if(cat.fonts.includes(ff)) { catName = cat.label; break; } }
                        catSel.textContent = catName;
                        renderFontList(catName);
                    }
                }
                
                // Update Size
                const fs = parseInt(comp.fontSize);
                if (!isNaN(fs)) {
                    const fsInput = document.getElementById('tt-fontSize');
                    if (fsInput && document.activeElement !== fsInput) fsInput.value = fs;
                }
                
                // Update Color
                const col = comp.color;
                const rgb = col.match(/\d+/g);
                if (rgb && rgb.length >= 3) {
                    const hex = "#" + ((1 << 24) + (parseInt(rgb[0]) << 16) + (parseInt(rgb[1]) << 8) + parseInt(rgb[2])).toString(16).slice(1);
                    const cp = document.getElementById('tt-textHex');
                    if (cp) cp.value = hex;
                }
            }
        }
    });

    function applyInlineOrBlockStyle(prop, value) {
        if (!state.activeId) return;
        const node = document.getElementById(state.activeId);
        const ca = node && node.querySelector('.content-area');
        const isEditing = ca && ca.contentEditable === 'true';

        if (isEditing) {
            // Forcefully restore the text highlight if an input box stole focus
            if (savedSelection) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(savedSelection);
            }

            if (prop === 'textHex') {
                document.execCommand('styleWithCSS', false, true);
                document.execCommand('foreColor', false, value);
            } else if (prop === 'fontFamily') {
                document.execCommand('styleWithCSS', false, true);
                document.execCommand('fontName', false, value);
            } else if (prop === 'fontSize') {
                // The classic "font size 7" hack for inline span sizing
                document.execCommand('styleWithCSS', false, false); 
                document.execCommand('fontSize', false, "7");
                const fonts = ca.querySelectorAll('font[size="7"]');
                const baseSize = getActivePage().blocks[state.activeId].style.fontSize || 16;
                fonts.forEach(f => {
                    f.removeAttribute('size');
                    // Write size in relative 'em' so it perfectly shrinks down with the container!
                    f.style.fontSize = (value / baseSize) + 'em'; 
                });
            }
            
            // Re-grab the selection in case it shifted during formatting
            if (window.getSelection().rangeCount > 0) savedSelection = window.getSelection().getRangeAt(0);
            
            saveState();
            updateBlock(state.activeId, { content: ca.innerHTML });
        } else {
            // Apply to the entire block if no text is actively selected
            saveState();
            updateBlock(state.activeId, { style: { [prop]: value } });
        }
    }

    // ── DUAL FONT PICKER ─────────────────────────────────────────────
    function renderFontList(categoryLabel) {
        const dropdown = document.getElementById('tt-fp-dropdown');
        if (!dropdown) return;
        const cat = FONT_CATEGORIES.find(c => c.label === categoryLabel) || FONT_CATEGORIES[0];

        dropdown.innerHTML = cat.fonts.map(f =>
            `<div class="tt-fp-item" data-font="${f}" style="font-family: '${f}', sans-serif;">${f}</div>`
        ).join('');

        // Trigger on-demand loading for this category's fonts.
        // If the hidden preload stage hasn't finished downloading yet (e.g. slow
        // network), this ensures fonts for the currently-visible list arrive ASAP.
        // We re-stamp font-family on each item after load to guarantee a repaint.
        cat.fonts.forEach(f => {
            if (document.fonts && document.fonts.load) {
                document.fonts.load(`400 16px '${f}'`).then(() => {
                    const item = dropdown.querySelector(`.tt-fp-item[data-font="${CSS.escape(f)}"]`);
                    if (item) item.style.fontFamily = `'${f}', sans-serif`;
                }).catch(() => {});
            }
        });
    }

    function initFontPicker() {
        const catPicker = document.getElementById('tt-catPicker'), catSel = document.getElementById('tt-cat-selected'), catDrop = document.getElementById('tt-cat-dropdown');
        const fontPicker = document.getElementById('tt-fontPicker'), fontSel = document.getElementById('tt-fp-selected'), fontDrop = document.getElementById('tt-fp-dropdown');
        if (!catPicker || !fontPicker) return;

        catDrop.innerHTML = FONT_CATEGORIES.map(c => `<div class="tt-fp-item" data-cat="${c.label}">${c.label}</div>`).join('');

        const closeAll = () => { catDrop.classList.remove('active'); fontDrop.classList.remove('active'); };

        catSel.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); const act = catDrop.classList.contains('active'); closeAll(); if(!act) catDrop.classList.add('active'); });
        fontSel.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); const act = fontDrop.classList.contains('active'); closeAll(); if(!act) fontDrop.classList.add('active'); });

        catDrop.addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation();
            const item = e.target.closest('.tt-fp-item');
            if (item) {
                catSel.textContent = item.dataset.cat;
                renderFontList(item.dataset.cat);
                catDrop.classList.remove('active');
                fontSel.textContent = 'Select...';
            }
        });

        fontDrop.addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation();
            const item = e.target.closest('.tt-fp-item');
            if (item) {
                const font = item.dataset.font;
                fontSel.textContent = font; fontSel.style.fontFamily = `'${font}', sans-serif`;
                fontDrop.classList.remove('active');
                applyInlineOrBlockStyle('fontFamily', font);
            }
        });

        document.addEventListener('mousedown', (e) => { if (!catPicker.contains(e.target) && !fontPicker.contains(e.target)) closeAll(); });
        renderFontList(FONT_CATEGORIES[0].label);
    }

    // ── CONTEXT LISTENERS ────────────────────────────────────────────
    function initContextListeners() {
        initFontPicker();

        const fsInput = document.getElementById('tt-fontSize');
        const stepFontSize = delta => {
            const v = Math.max(8, Math.min(300, (parseInt(fsInput && fsInput.value) || 16) + delta));
            if (fsInput) fsInput.value = v;
            applyInlineOrBlockStyle('fontSize', v);
        };
        document.getElementById('tt-fontSize-dec')?.addEventListener('mousedown', (e) => { e.preventDefault(); stepFontSize(-1); });
        document.getElementById('tt-fontSize-inc')?.addEventListener('mousedown', (e) => { e.preventDefault(); stepFontSize(+1); });
        if (fsInput) {
            fsInput.addEventListener('wheel', e => { e.preventDefault(); stepFontSize(e.deltaY < 0 ? 1 : -1); }, { passive: false });
            fsInput.addEventListener('input', e => { const v = parseInt(e.target.value); if (!isNaN(v)) applyInlineOrBlockStyle('fontSize', Math.max(8, Math.min(300, v))); });
        }
        
        document.getElementById('tt-textHex')?.addEventListener('input', e => applyInlineOrBlockStyle('textHex', e.target.value));

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

        bindStyle('inp-letterSpacing', 'letterSpacing', Number);
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
        bindStyle('inp-rotation', 'rotation', Number);
        bindStyle('inp-overflow', 'overflow');

        document.getElementById('btn-flip-h')?.addEventListener('click', () => {
            if (!state.activeId) return;
            const s = getActivePage().blocks[state.activeId].style;
            updateBlock(state.activeId, { style: { flipH: !s.flipH } }); saveState();
        });
        document.getElementById('btn-flip-v')?.addEventListener('click', () => {
            if (!state.activeId) return;
            const s = getActivePage().blocks[state.activeId].style;
            updateBlock(state.activeId, { style: { flipV: !s.flipV } }); saveState();
        });

        const preserveToggle = document.getElementById('inp-preserveLayout');
        if (preserveToggle) preserveToggle.addEventListener('change', e => {
            if (!state.activeId) return;
            updateBlock(state.activeId, { style: { preserveLayout: e.target.checked } });
            saveState();
        });

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

        // Availability settings
        const settingsProps = ['headline', 'summary', 'avail_m1', 'avail_m2', 'avail_d1', 'avail_d2', 'avail_t1', 'avail_t2'];
        settingsProps.forEach(prop => {
            const el = document.getElementById(`set-${prop.replace('_', '-')}`);
            if (el) el.addEventListener('change', e => { state.settings[prop] = e.target.value; saveState(); });
        });

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

        const workspace = document.getElementById('workspace');
        workspace.addEventListener('dragover', e => {
            e.preventDefault(); // Required to allow dropping
            e.dataTransfer.dropEffect = 'copy';
        });

        workspace.addEventListener('drop', e => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (!files || !files.length) return;

            const cr = canvas.getBoundingClientRect();
            // Calculate exact canvas-relative drop position using Wexton's internal math
            const dropX = e.clientX - cr.left + canvas.scrollLeft;
            const dropY = e.clientY - cr.top + canvas.scrollTop;

            let colX = pxToCols(dropX);
            let snappedY = snapY(dropY);

            Array.from(files).forEach(file => {
                if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return;
                
                const name = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                
                // Save to IndexedDB and memory
                assetFiles.set(name, file); 
                assetUrls.set(name, URL.createObjectURL(file)); 
                _saveAsset(name, file);
                
                // Spawn the block instantly under the mouse!
                addBlock('media', { 
                    filename: name, 
                    x: Math.max(0, Math.min(colX - 12, CONFIG.gridCols - 24)), // Offset by half width to center on cursor
                    y: Math.max(0, snappedY), 
                    w: 24, 
                    h: file.type.startsWith('video/') ? 200 : 280 
                });
                
                // Offset the next file slightly if they dropped a batch of images at once
                colX += 2; snappedY += 20;
            });
            
            // Update the Library UI if it happens to be open
            if (document.getElementById('asset-library-modal') && document.getElementById('asset-library-modal').style.display === 'flex') {
                _populateAssetLibrary();
            }
        });

        canvas.addEventListener('mousedown', e => {
            if (canvas.classList.contains('mobile-mode') || e.target.isContentEditable) return;
            const page = getActivePage();

            if (e.target.classList.contains('resize-handle') || e.target.classList.contains('radius-handle') || e.target.classList.contains('rotate-handle')) {
                saveState(); isInteracting = true; action = e.target.dataset.action;
                const b = page.blocks[state.activeId];
                if (action === 'rotate') {
                    const blockNode = document.getElementById(state.activeId);
                    const nr = blockNode.getBoundingClientRect();
                    const cx = nr.left + nr.width / 2;
                    const cy = nr.top + nr.height / 2;
                    startParams = {
                        startRotation: b.style.rotation || 0,
                        startMouseAngle: Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI
                    };
                } else {
                    const startLayouts = {};
                    let minX = Infinity, minY = Infinity, maxR = -Infinity, maxB = -Infinity;
                    const idsToScale = selectedIds.size > 1 ? Array.from(selectedIds) : [state.activeId];
                    
                    idsToScale.forEach(id => {
                        const blk = page.blocks[id]; if(!blk) return;
                        startLayouts[id] = Object.assign({}, blk.layout);
                        const pxX = blk.layout.x * getColWidth(); const pxY = blk.layout.y;
                        const pxW = blk.layout.w * getColWidth(); const pxH = blk.layout.h;
                        if (pxX < minX) minX = pxX; if (pxY < minY) minY = pxY;
                        if (pxX + pxW > maxR) maxR = pxX + pxW; if (pxY + pxH > maxB) maxB = pxY + pxH;
                    });

                    // Cache children layouts for scaling if preserveLayout is enabled
                    const startChildData = {};
                    page.layerOrder.forEach(cid => {
                        const cb = page.blocks[cid];
                        if (cb && cb.parentId && idsToScale.includes(cb.parentId)) {
                            const pblk = page.blocks[cb.parentId];
                            if (pblk.style.preserveLayout) {
                                startChildData[cid] = { layout: Object.assign({}, cb.layout), style: Object.assign({}, cb.style) };
                            }
                        }
                    });

                    startParams = {
                        startX: e.clientX, startY: e.clientY,
                        dir: e.target.dataset.dir, corner: e.target.dataset.corner,
                        startLayout: Object.assign({}, b ? b.layout : {}),
                        startLayouts, groupRect: { x: minX, y: minY, w: maxR - minX, h: maxB - minY },
                        startChildData,
                        startRadius: b ? (b.style[e.target.dataset.corner] || 0) : 0,
                        accRotation: b ? getAccumulatedRotation(state.activeId) : 0
                    };
                }
                return;
            }

            const blockNode = e.target.closest('.builder-block');
            if (blockNode) {
                e.stopPropagation();

                // Shift+click: toggle block in/out of multi-selection (no drag)
                if (e.shiftKey) {
                    setActive(blockNode.id, true);
                    return;
                }

                // If clicked block is NOT in the current selection, switch to it alone
                if (!selectedIds.has(blockNode.id)) {
                    setActive(blockNode.id);
                } else if (state.activeId !== blockNode.id) {
                    state.activeId = blockNode.id;
                    syncContextPanel();
                }

                saveState();
                const b = page.blocks[blockNode.id];
                const parentAccRot = b.parentId ? getAccumulatedRotation(b.parentId) : 0;
                
                // Calculate precise local mouse offset to prevent jumping when reparenting
                const rect = blockNode.getBoundingClientRect();
                const accRot = getAccumulatedRotation(blockNode.id);
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const localOffset = accRot ? rotateVec(e.clientX - cx, e.clientY - cy, -accRot) : { x: e.clientX - cx, y: e.clientY - cy };
                const mouseLocalX = (blockNode.offsetWidth / 2) + localOffset.x;
                const mouseLocalY = (blockNode.offsetHeight / 2) + localOffset.y;

                const isMultiSelect = selectedIds.size > 1;
                startParams = {
                    startX: e.clientX, startY: e.clientY,
                    startLayout: Object.assign({}, b.layout),
                    hoveredShape: null, hasMoved: false,
                    parentAccRot, mouseLocalX, mouseLocalY,
                    isMultiSelect
                };

                // Capture starting layouts for all selected blocks for group move
                if (isMultiSelect) {
                    startParams.multiStartLayouts = {};
                    selectedIds.forEach(sid => {
                        if (page.blocks[sid]) startParams.multiStartLayouts[sid] = Object.assign({}, page.blocks[sid].layout);
                    });
                }

                isInteracting = true; action = 'move'; return;
            }

            // No block hit — start a marquee (rubber-band) selection on empty canvas
            if (e.target === canvas || e.target.id === 'canvas') {
                setActive(null);
                isInteracting = true; action = 'marquee';
                const cr = canvas.getBoundingClientRect();
                startParams = {
                    startX: e.clientX, startY: e.clientY,
                    canvasLeft: cr.left, canvasTop: cr.top
                };
                let marquee = document.getElementById('marquee-select');
                if (!marquee) {
                    marquee = document.createElement('div');
                    marquee.id = 'marquee-select';
                    canvas.appendChild(marquee);
                }
                const mx = e.clientX - cr.left + canvas.scrollLeft;
                const my = e.clientY - cr.top + canvas.scrollTop;
                marquee.style.left = mx + 'px'; marquee.style.top = my + 'px';
                marquee.style.width = '0'; marquee.style.height = '0';
                marquee.style.display = 'block';
                return;
            }

            setActive(null);
        });

        document.addEventListener('mousemove', e => {
            if (!isInteracting) return;
            if (action !== 'marquee' && !state.activeId) return;
            const page = getActivePage(); const block = page.blocks[state.activeId];
            // Raw screen-space deltas from the drag start point
            const rawDx = e.clientX - startParams.startX;
            const rawDy = e.clientY - startParams.startY;
            let newLayout = Object.assign({}, startParams.startLayout);

            if (action === 'move') {
                // Recompute projection after any possible parent-detach so dx/dy are in the correct frame:
                const pRot2 = startParams.parentAccRot || 0;
                const local2 = pRot2 ? rotateVec(rawDx, rawDy, -pRot2) : { x: rawDx, y: rawDy };
                const dx = local2.x, dy = local2.y;

                if (!startParams.hasMoved && (Math.abs(rawDx) > 3 || Math.abs(rawDy) > 3)) {
                    
                    if (!startParams.isMultiSelect && block.parentId) {
                        const blockNode = document.getElementById(state.activeId);
                        const cr = canvas.getBoundingClientRect();
                        block.parentId = null; // Detach from parent
                        
                        // Use the intrinsic, unrotated dimensions of the element (offsetWidth/Height)
                        // instead of the bounding box (rect.width/height) which gets distorted by rotation!
                        const w = blockNode.offsetWidth;
                        const h = blockNode.offsetHeight;
                        
                        const selfRot = Number(block.style.rotation) || 0;
                        
                        let newGlobalRot = (selfRot + (startParams.parentAccRot || 0)) % 360;
                        if (newGlobalRot < 0) newGlobalRot += 360;
                        block.style.rotation = newGlobalRot;
                        
                        // 1. Vector from block center to mouse in local space
                        const cxOffset = startParams.mouseLocalX - w / 2;
                        const cyOffset = startParams.mouseLocalY - h / 2;
                        
                        // 2. Rotate vector to global screen space (using the new combined global rotation)
                        const rotOffset = block.style.rotation ? rotateVec(cxOffset, cyOffset, block.style.rotation) : { x: cxOffset, y: cyOffset };
                        
                        // 3. Mouse position in canvas space
                        const centerCanvasX = (e.clientX - cr.left + canvas.scrollLeft) - rotOffset.x;
                        const centerCanvasY = (e.clientY - cr.top + canvas.scrollTop) - rotOffset.y;
                        
                        // 4. Absolute top-left of unrotated element
                        const exactLeft = centerCanvasX - w / 2;
                        const exactTop = centerCanvasY - h / 2;

                        // 5. Snap to grid
                        block.layout.x = pxToCols(exactLeft);
                        block.layout.y = snapY(exactTop);
                        
                        // 6. Calculate sub-grid snap error to prevent momentum loss
                        const snappedLeft = block.layout.x * getColWidth();
                        const snappedTop = block.layout.y;
                        const errX = snappedLeft - exactLeft;
                        const errY = snappedTop - exactTop;

                        requestAnimationFrame(() => {
                            renderCanvas();
                            setActive(blockNode.id);

                            // Set mouse-origin AND startLayout after detach so drag continues seamlessly,
                            // applying the sub-grid error so the mouse stays glued to the same local pixel
                            startParams.startX = e.clientX + errX;
                            startParams.startY = e.clientY + errY;
                            startParams.startLayout = Object.assign({}, block.layout);
                            startParams.parentAccRot = 0;
                        });
                        
                        const tn = document.getElementById(state.activeId); if (tn) tn.classList.add('is-dragging');
                        return; // Skip applying standard movement this frame to prevent a double-jump
                    }
                    
                    startParams.hasMoved = true;
                    const tn = document.getElementById(state.activeId); 
                    if (tn) tn.classList.add('is-dragging');
                    if (startParams.isMultiSelect) {
                        selectedIds.forEach(sid => { const el = document.getElementById(sid); if (el) el.classList.add('is-dragging'); });
                    }
                }
                if (startParams.hasMoved) {
                    // ── MULTI-MOVE: translate all selected root blocks together ──
                    if (startParams.isMultiSelect) {
                        selectedIds.forEach(sid => {
                            const sb = page.blocks[sid]; if (!sb || sb.parentId) return;
                            const sl = startParams.multiStartLayouts[sid]; if (!sl) return;
                            sb.layout = Object.assign({}, sb.layout, {
                                x: Math.max(0, Math.min(sl.x + pxToCols(dx), CONFIG.gridCols - sb.layout.w)),
                                y: Math.max(0, snapY(sl.y + dy))
                            });
                            const node = document.getElementById(sid);
                            if (node) applyStyles(node, sb);
                        });
                        updateCanvasHeight();
                        renderSelectionBox(); // Force the box to track the moving group
                        return; // skip single-block move logic
                    }

                    newLayout.x = startParams.startLayout.x + pxToCols(dx);
                    newLayout.y = snapY(startParams.startLayout.y + dy)
                    if (!block.parentId) {
                        if (newLayout.x < 0) newLayout.x = 0;
                        if (newLayout.x + newLayout.w > CONFIG.gridCols) newLayout.x = CONFIG.gridCols - newLayout.w;
                    }
                    const an = document.getElementById(state.activeId); if (an) an.style.visibility = 'hidden';
                    const dt = document.elementFromPoint(e.clientX, e.clientY);
                    if (an) an.style.visibility = '';
                    document.querySelectorAll('.drop-highlight').forEach(el => el.classList.remove('drop-highlight'));
                    startParams.hoveredShape = null;
                    
                    // Hold Shift while dragging to prevent auto-parenting into shapes
                    if (!e.shiftKey) {
                        const shape = dt && dt.closest('.builder-block.type-shape');
                        if (shape && shape.id !== state.activeId) { shape.classList.add('drop-highlight'); startParams.hoveredShape = shape.id; }
                    }
                }
            } else if (action === 'marquee') {
                const cr = canvas.getBoundingClientRect();
                const mx = e.clientX - cr.left + canvas.scrollLeft;
                const my = e.clientY - cr.top + canvas.scrollTop;
                const sx = startParams.startX - cr.left + canvas.scrollLeft;
                const sy = startParams.startY - cr.top + canvas.scrollTop;
                const marquee = document.getElementById('marquee-select');
                if (marquee) {
                    marquee.style.left = Math.min(mx, sx) + 'px';
                    marquee.style.top = Math.min(my, sy) + 'px';
                    marquee.style.width = Math.abs(mx - sx) + 'px';
                    marquee.style.height = Math.abs(my - sy) + 'px';
                }
            } else if (action === 'resize') {
                const accRot = startParams.accRotation || 0;
                const local  = accRot ? rotateVec(rawDx, rawDy, -accRot) : { x: rawDx, y: rawDy };
                const dx = local.x, dy = local.y;
                const dir = startParams.dir;

                // Helper to scale inner elements mathematically so it accurately reflects what the Mobile export will do!
                function applyPreserveLayoutToChildren(parentId, scaleX, scaleY, startChildData) {
                    page.layerOrder.forEach(cid => {
                        const cb = page.blocks[cid];
                        if (cb && cb.parentId === parentId && startChildData[cid]) {
                            const sd = startChildData[cid];
                            const nx = sd.layout.x * scaleX;
                            const ny = sd.layout.y * scaleY;
                            const nw = sd.layout.w * scaleX;
                            const nh = sd.layout.h * scaleY;
                            const nFs = sd.style.fontSize * scaleX;
                            const nPad = sd.style.padding * scaleX;
                            const nLsp = (sd.style.letterSpacing || 0) * scaleX;
                            updateBlock(cid, { 
                                layout: { x: nx, y: ny, w: Math.max(1, nw), h: Math.max(10, nh) },
                                style: { fontSize: Math.max(1, nFs), padding: Math.max(0, nPad), letterSpacing: nLsp }
                            }, true);
                        }
                    });
                }

                if (selectedIds.size > 1) {
                    // MULTI-SCALE ENGINE
                    let newGw = startParams.groupRect.w; let newGh = startParams.groupRect.h;
                    if (dir.includes('e')) newGw += dx;
                    if (dir.includes('w')) newGw -= dx; 
                    if (dir.includes('s')) newGh += dy;
                    if (dir.includes('n')) newGh -= dy;
                    
                    const scaleX = Math.max(0.1, newGw / startParams.groupRect.w);
                    const scaleY = Math.max(0.1, newGh / startParams.groupRect.h);

                    selectedIds.forEach(id => {
                        const sl = startParams.startLayouts[id]; if (!sl) return;
                        const oldPxX = sl.x * getColWidth();
                        
                        let newPxX = startParams.groupRect.x + (oldPxX - startParams.groupRect.x) * scaleX;
                        let newY = startParams.groupRect.y + (sl.y - startParams.groupRect.y) * scaleY;
                        
                        if (dir.includes('w')) newPxX += dx;
                        if (dir.includes('n')) newY += dy;

                        const newW = pxToCols((sl.w * getColWidth()) * scaleX);
                        const newH = snapY(sl.h * scaleY);
                        
                        updateBlock(id, { layout: { ...sl, x: pxToCols(newPxX), y: snapY(newY), w: newW, h: newH } }, true);
                        
                        if (page.blocks[id] && page.blocks[id].style.preserveLayout) {
                            applyPreserveLayoutToChildren(id, newW / sl.w, newH / sl.h, startParams.startChildData);
                        }
                    });
                    renderSelectionBox(); return;
                }
                
                // SINGLE ELEMENT RESIZE
                if (dir.length === 2) {
                    const startVisW = startParams.startLayout.w * getColWidth(); const startVisH = startParams.startLayout.h;
                    const visRatio = startVisW / startVisH;
                    let newVisW = Math.max(startVisW + (dir.includes('e') ? dx : -dx), 2 * getColWidth());
                    let newVisH = Math.max(newVisW / visRatio, 20); newVisW = newVisH * visRatio;
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

                if (block.style.preserveLayout) {
                    const scaleX = newLayout.w / startParams.startLayout.w;
                    const scaleY = newLayout.h / startParams.startLayout.h;
                    applyPreserveLayoutToChildren(state.activeId, scaleX, scaleY, startParams.startChildData);
                }
            } else if (action === 'radius') {
                // Project into element's local frame for correct diagonal tracking
                const accRot = startParams.accRotation || 0;
                const local  = accRot ? rotateVec(rawDx, rawDy, -accRot) : { x: rawDx, y: rawDy };
                const dx = local.x, dy = local.y;
                const corner = startParams.corner; let delta = 0;
                if (corner === 'radiusTL') delta = (dx + dy) / 2; if (corner === 'radiusTR') delta = (-dx + dy) / 2;
                if (corner === 'radiusBL') delta = (dx - dy) / 2; if (corner === 'radiusBR') delta = (-dx - dy) / 2;
                updateBlock(state.activeId, { style: { [corner]: Math.max(0, startParams.startRadius + delta) } }); return;
            } else if (action === 'rotate') {
                // Use the live bounding-rect center (stable under rotation) for angle calculation.
                const blockNode = document.getElementById(state.activeId);
                const nr = blockNode.getBoundingClientRect();
                const cx = nr.left + nr.width / 2;
                const cy = nr.top + nr.height / 2;
                const currentMouseAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
                let angle = startParams.startRotation + (currentMouseAngle - startParams.startMouseAngle);
                if (e.shiftKey) angle = Math.round(angle / 15) * 15; // Snap to 15° with Shift
                angle = ((angle % 360) + 360) % 360;
                updateBlock(state.activeId, { style: { rotation: angle } });
                // Keep the panel slider live during drag without a full re-sync
                const ri = document.getElementById('inp-rotation'), rv = document.getElementById('val-rotation');
                if (ri) ri.value = Math.round(angle);
                if (rv) rv.textContent = Math.round(angle);
                return;
            }
            if (startParams.hasMoved || action === 'resize' || action === 'radius') updateBlock(state.activeId, { layout: newLayout });
        });

        document.addEventListener('mouseup', e => {
            document.querySelectorAll('.is-dragging').forEach(el => el.classList.remove('is-dragging'));
            document.querySelectorAll('.drop-highlight').forEach(el => el.classList.remove('drop-highlight'));
            const page = getActivePage();

            // ── MARQUEE: resolve selection from rubber-band rect ──
            if (isInteracting && action === 'marquee') {
                const marquee = document.getElementById('marquee-select');
                if (marquee) {
                    const mr = marquee.getBoundingClientRect();
                    const minArea = 4; // ignore accidental micro-drags
                    if (mr.width * mr.height > minArea) {
                        const newSelected = [];
                        page.layerOrder.forEach(id => {
                            const b = page.blocks[id]; if (b.parentId) return; // root blocks only
                            const el = document.getElementById(id); if (!el) return;
                            const er = el.getBoundingClientRect();
                            if (er.right > mr.left && er.left < mr.right && er.bottom > mr.top && er.top < mr.bottom) {
                                newSelected.push(id);
                            }
                        });
                        if (newSelected.length > 1) {
                            selectedIds = new Set(newSelected);
                            state.activeId = newSelected[newSelected.length - 1];
                            renderSelectionHighlights(); renderSelectionBox(); syncContextPanel(); renderLayers();
                        } else if (newSelected.length === 1) {
                            setActive(newSelected[0]);
                        }
                    }
                    marquee.style.display = 'none';
                }
                isInteracting = false; action = null;
                return;
            }

            // ── MULTI-MOVE: save state after group drag ──
            if (isInteracting && action === 'move' && startParams.isMultiSelect) {
                if (startParams.hasMoved) { saveState(); renderSelectionHighlights(); }
                isInteracting = false; action = null;
                return;
            }
            
            if (isInteracting && action === 'move' && state.activeId && startParams.hoveredShape) {
                const an = document.getElementById(state.activeId), shapeEl = document.getElementById(startParams.hoveredShape);
                const pc = shapeEl && shapeEl.querySelector('.content-area');
                if (an && pc) {
                    // Map the element's visual center perfectly into the rotated container's local space
                    const br = an.getBoundingClientRect(), pr = pc.getBoundingClientRect();
                    const pRot = getAccumulatedRotation(startParams.hoveredShape);
                    
                    const cx = br.left + br.width / 2;
                    const cy = br.top + br.height / 2;
                    const pcCx = pr.left + pr.width / 2;
                    const pcCy = pr.top + pr.height / 2;
                    
                    const localOffset = rotateVec(cx - pcCx, cy - pcCy, -pRot);
                    const localX = (pc.offsetWidth / 2) + localOffset.x - (an.offsetWidth / 2) + pc.scrollLeft;
                    const localY = (pc.offsetHeight / 2) + localOffset.y - (an.offsetHeight / 2) + pc.scrollTop;

                    const parentCols = page.blocks[startParams.hoveredShape].layout.w;
                    const colWidth = pc.offsetWidth / parentCols;

                    
                    const nw = Object.assign({}, page.blocks[state.activeId].layout, { 
                        x: Math.round(localX / colWidth),
                        y: snapY(localY) 
                    });
                    
                    // FIX: Counter-rotate the element so it visually stays exactly where it was
                    const currentAbsoluteRot = getAccumulatedRotation(state.activeId);
                    let newRelativeRot = (currentAbsoluteRot - pRot) % 360;
                    if (newRelativeRot < 0) newRelativeRot += 360;

                    updateBlock(state.activeId, { 
                        parentId: startParams.hoveredShape, 
                        layout: nw,
                        style: { rotation: newRelativeRot }
                    }); 
                    renderCanvas();
                }
            }

            if (isInteracting && (startParams.hasMoved || action === 'resize' || action === 'radius' || action === 'rotate')) {
                updateCanvasHeight();
                renderLayers();
                syncContextPanel();
                renderSelectionBox();
            }

            isInteracting = false; action = null;
        });

        document.addEventListener('keydown', e => {
            // Ignore keystrokes if the user is typing in a text box or input field
            if (document.activeElement.isContentEditable || ['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)) return;
            
            if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.shiftKey ? loadState(historyIndex + 1) : loadState(historyIndex - 1); return; }
            if ((e.key === 'd' || e.key === 'D') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); duplicateActive(); return; }
            if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteActive(); return; }

            // ── ARROW KEY NUDGING ──
            if (selectedIds.size > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                saveState();
                const page = getActivePage();
                const stepX = e.shiftKey ? 5 : 1; 
                const stepY = e.shiftKey ? (CONFIG.gridV * 5) : CONFIG.gridV;

                // Nudge every selected block (falls through to single-block case too)
                const nudgeIds = selectedIds.size > 1 ? [...selectedIds] : (state.activeId ? [state.activeId] : []);
                nudgeIds.forEach(nid => {
                    const b = page.blocks[nid]; if (!b) return;
                    let nx = b.layout.x, ny = b.layout.y;
                    if (e.key === 'ArrowUp') ny -= stepY;
                    if (e.key === 'ArrowDown') ny += stepY;
                    if (e.key === 'ArrowLeft') nx -= stepX;
                    if (e.key === 'ArrowRight') nx += stepX;
                    if (!b.parentId) {
                        if (nx < 0) nx = 0;
                        if (nx + b.layout.w > CONFIG.gridCols) nx = CONFIG.gridCols - b.layout.w;
                        if (ny < 0) ny = 0;
                    }
                    updateBlock(nid, { layout: { ...b.layout, x: nx, y: ny } });
                });
            }
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

    // ── COMPILER ENGINE (SHARED BY EXPORT & PREVIEW) ─────────────────
    
    function compileSiteCSS() {
        const siteTitle = state.settings.title || 'Untitled Site';
        let css = `/* ${siteTitle} - Auto-Generated Styles */\n* { box-sizing: border-box; margin: 0; padding: 0; }\nbody { background: ${state.settings.bgHex}; font-family: 'Nunito', sans-serif; overflow-x: hidden; }\n.site-canvas { width: 100%; max-width: 1000px; margin: 0 auto; position: relative; min-height: 100vh; overflow: visible; }\n`;
        
       // Global Popups
        css += `.wx-popup-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: none; z-index: 10000; overflow-y: auto; padding: 20px; }\n.wx-popup-overlay.active { display: block; }\n.wx-popup-window { background: #fff; border-radius: 16px; position: relative; margin: 40px auto; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); width: 100%; max-width: 600px; min-height: 400px; }\n.wx-popup-close { position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; background: rgba(0,0,0,0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 20px; z-index: 99999; transition: background 0.2s; }\n.wx-popup-close:hover { background: rgba(0,0,0,0.15); }\n`;
        
        // Standard Mobile Media Queries & Preserve Layout
        css += `@media(max-width:768px) {\n  .site-canvas { display: flex !important; flex-direction: column !important; padding: 20px 0 !important; gap: 20px !important; height: auto !important; }\n  .wx-block { position: relative !important; left: 0 !important; top: 0 !important; width: var(--mob-w, calc(100% - 40px)) !important; margin: var(--mob-mt, 0px) var(--mob-mr, 20px) var(--mob-mb, 0px) var(--mob-ml, 20px) !important; height: auto !important; min-height: var(--h) !important; order: var(--y-index) !important; overflow-wrap: break-word !important; word-break: break-word !important; }\n  .wx-block.type-text { min-height: auto !important; }\n  .wx-block.type-text > .content-area { font-size: max(16px, calc(var(--fs) * 0.8)) !important; height: auto !important; white-space: normal !important; }\n  .wx-block.type-shape > .content-area { display: flex !important; flex-direction: column !important; gap: 16px !important; padding: 20px !important; }\n  .preserve-layout { height: auto !important; min-height: 0 !important; aspect-ratio: var(--desk-w) / var(--desk-h) !important; container-type: inline-size; }\n  .preserve-layout.type-shape > .content-area { display: block !important; padding: 0 !important; }\n  .preserve-layout .wx-block { position: absolute !important; top: var(--top-pct) !important; left: var(--left-pct) !important; width: var(--w-pct) !important; height: var(--h-pct) !important; min-height: 0 !important; margin: 0 !important; }\n  .preserve-layout .wx-block > .content-area { padding: calc(var(--pad-num) / var(--root-desk-w) * 100cqw) !important; }\n  .preserve-layout .wx-block.type-text > .content-area { font-size: calc(var(--fs-num) / var(--root-desk-w) * 100cqw) !important; letter-spacing: calc(var(--lsp-num) / var(--root-desk-w) * 100cqw) !important; line-height: var(--lh) !important; }\n}\n`;
        
        let fontImports = new Set(['Nunito']);

        Object.values(state.pages).forEach(page => {
            // Pre-calculate max bottom for the page ONCE (O(N) instead of O(N^2))
            let maxBottom = 0;
            Object.values(page.blocks).forEach(blk => {
                if (!blk.parentId && (blk.layout.y + blk.layout.h > maxBottom)) maxBottom = blk.layout.y + blk.layout.h;
            });

            page.layerOrder.forEach((id, index) => {
                const b = page.blocks[id]; const s = b.style;
                if (s.fontFamily) fontImports.add(s.fontFamily);
                
                const inlineFonts = b.content.match(/font-family:\s*['"]?([^'",;]+)['"]?/g);
                if (inlineFonts) inlineFonts.forEach(m => { const f = m.split(':')[1].replace(/['";]/g, '').trim(); if (f && f !== 'sans-serif') fontImports.add(f); });
                
                const parentCols = b.parentId && page.blocks[b.parentId] ? page.blocks[b.parentId].layout.w : CONFIG.gridCols;
                const isText = b.type === 'text';
                const boxSh = isText ? 'none' : buildShadowCSS(s, false);
                const txtSh = isText ? buildShadowCSS(s, true) : 'none';
                const hRule = isText ? `height: auto; min-height: ${b.layout.h}px; display: flex; flex-direction: column;` : `height: ${b.layout.h}px;`;
                const overflowRule = isText ? `overflow: visible;` : `overflow: ${s.overflow||'hidden'};`;

                const isRoot = !b.parentId;
                const isLeftEdge = b.layout.x === 0;
                const isRightEdge = (b.layout.x + b.layout.w) >= parentCols;
                const mt = (isRoot && b.layout.y <= 0) ? '-20px' : '0px';
                const mb = (isRoot && maxBottom > 0 && (b.layout.y + b.layout.h) >= maxBottom) ? '-20px' : '0px';
                const ml = isLeftEdge ? '0px' : '20px';
                const mr = isRightEdge ? '0px' : '20px';
                const mobW = `calc(100% - ${isLeftEdge ? 0 : 20}px - ${isRightEdge ? 0 : 20}px)`;

                css += `\n/* ${id} */\n`;
                const parentH = b.parentId && page.blocks[b.parentId] ? page.blocks[b.parentId].layout.h : 1;
                const topPct = (b.layout.y / parentH * 100) + '%';
                const hPct = (b.layout.h / parentH * 100) + '%';
                const wPct = (b.layout.w / parentCols * 100) + '%';
                const leftPct = (b.layout.x / parentCols * 100) + '%';
                const deskW = b.layout.w * (1000 / 60);
                const deskH = b.layout.h;
                const rootDeskW = s.preserveLayout ? `--root-desk-w: ${deskW};` : '';

                css += `\n/* ${id} */\n`;
                let transforms = [];
                if (s.rotation) transforms.push(`rotate(${s.rotation}deg)`);
                if (s.flipH) transforms.push(`scaleX(-1)`);
                if (s.flipV) transforms.push(`scaleY(-1)`);
                const transformRule = transforms.length > 0 ? `transform: ${transforms.join(' ')}; transform-origin: 50% 50%;` : '';
                
                css += `#${id} { position: absolute; z-index: ${index+1}; box-sizing: border-box; --y-index: ${Math.round(b.layout.y)}; --h: ${b.layout.h}px; --fs: ${s.fontSize}px; --fs-num: ${s.fontSize}; --pad: ${s.padding}px; --pad-num: ${s.padding}; --lsp-num: ${s.letterSpacing || 0}; --mob-mt: ${mt}; --mob-mb: ${mb}; --mob-ml: ${ml}; --mob-mr: ${mr}; --mob-w: ${mobW}; --top-pct: ${topPct}; --h-pct: ${hPct}; --w-pct: ${wPct}; --left-pct: ${leftPct}; --desk-w: ${deskW}; --desk-h: ${deskH}; ${rootDeskW} left: ${(b.layout.x/parentCols*100)}%; top: ${b.layout.y}px; width: ${(b.layout.w/parentCols*100)}%; ${hRule} background-color: ${s.bgHex==='transparent'?'transparent':s.bgHex}; color: ${s.textHex}; border-radius: ${s.radiusTL}px ${s.radiusTR}px ${s.radiusBR}px ${s.radiusBL}px; border: ${s.borderW>0?s.borderW+'px '+s.borderStyle+' '+s.borderHex:'none'}; box-shadow: ${boxSh}; opacity: ${(s.opacity||100)/100}; ${overflowRule} ${transformRule} }\n`;
                css += `#${id} > .content-area { flex-grow: 1; padding: ${s.padding}px; font-size: ${s.fontSize}px; font-family: '${s.fontFamily||'Nunito'}', sans-serif; text-align: ${s.textAlign||'left'}; justify-content: center; display: flex; flex-direction: column; letter-spacing: ${s.letterSpacing||0}px; line-height: ${s.lineHeight||1.4}; text-shadow: ${txtSh}; width: 100%; height: 100%; box-sizing: border-box; overflow-wrap: break-word; word-break: break-word; }\n`;
            });
        });

        const fontStr = Array.from(fontImports).map(f => `@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g,'+')}:wght@400;700&display=swap');`).join('\n');
        return { css, fontStr };
    }

    function compileNodeHTML(parentId, targetPage, isPreview = false) {
        let html = '';
        const baseUrl = isPreview ? window.location.href.split('/').slice(0,-1).join('/') + '/assets/' : './assets/';
        const allStockNames = [...(_stockAssets.images || []), ...(_stockAssets.videos || []), ...(_stockAssets.sounds || [])];

        const resolveAsset = (filename) => {
            if (!filename) return '';
            if (isPreview) {
                return assetUrls.has(filename) ? assetUrls.get(filename) : (baseUrl + filename);
            }
            // In Export ZIP: Route stock assets to the Intranet's root folder, keep custom assets local to the ZIP
            return allStockNames.includes(filename) ? `/builder/assets/${filename}` : `./assets/${filename}`;
        };

        targetPage.layerOrder.filter(id => targetPage.blocks[id].parentId === parentId).forEach(id => {
            const b = targetPage.blocks[id]; let inner = '';
            
            if (b.type === 'text') inner = `<div class="content-area">${b.content}</div>`;
            else if (b.type === 'shape') inner = `<div class="content-area">\n${compileNodeHTML(id, targetPage, isPreview)}        </div>`;
            else if (b.type === 'media' && b.filename) {
                const isVid = /\\.(mp4|webm|ogg)$/i.test(b.filename);
                inner = isVid ? `<video src="${resolveAsset(b.filename)}" controls style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;"></video>` 
                              : `<img src="${resolveAsset(b.filename)}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;">`;
            }
            
            let wOpen = '', wClose = ''; let blockAttrs = `id="${id}" class="wx-block type-${b.type}${b.style.preserveLayout ? ' preserve-layout' : ''}"`;
            if (b.link && b.link.type !== 'none' && b.link.value) {
                if (b.link.type === 'url') { 
                    wOpen = `<a href="${b.link.value}" ${isPreview ? 'target="_blank"' : ''} style="text-decoration:none;color:inherit;display:contents;">`; wClose = '</a>'; 
                } else if (b.link.type === 'page') { 
                    const target = state.settings.indexPageId === b.link.value ? 'index.html' : `${b.link.value}.html`; 
                    // Tell the parent builder window to seamlessly swap the iframe to the new page!
                    wOpen = isPreview ? `<a href="#" onclick="window.parent.Architect.previewSite('${b.link.value}'); return false;" style="text-decoration:none;color:inherit;display:contents;">` : `<a href="${target}" style="text-decoration:none;color:inherit;display:contents;">`; 
                    wClose = '</a>'; 
                } else if (b.link.type === 'popup') {
                    blockAttrs += ` data-popup-trigger="${b.link.value}" style="cursor:pointer;"`; 
                } else if (b.link.type === 'sound') { 
                    blockAttrs += ` data-sound-src="${resolveAsset(b.link.value)}" style="cursor:pointer;"`; 
                }
            }
            html += `${wOpen}    <div ${blockAttrs}>\n        ${inner}\n    </div>\n${wClose}`;
        });
        return html;
    }

    function getAppJS() {
        return `// Wexton Interactive Runtime\ndocument.addEventListener('DOMContentLoaded', () => { document.querySelectorAll('[data-popup-trigger]').forEach(btn => { btn.addEventListener('click', (e) => { e.preventDefault(); const popup = document.getElementById('overlay-' + btn.getAttribute('data-popup-trigger')); if(popup) popup.classList.add('active'); }); }); document.querySelectorAll('.wx-popup-close, .wx-popup-overlay').forEach(el => { el.addEventListener('click', (e) => { if(e.target === el) el.closest('.wx-popup-overlay').classList.remove('active'); }); }); document.querySelectorAll('[data-sound-src]').forEach(btn => { btn.addEventListener('click', () => { const audio = new Audio(btn.getAttribute('data-sound-src')); audio.currentTime = 0; audio.play(); }); }); });`;
    }

    // ── LIVE PREVIEW ENGINE ──────────────────────────────────────────
    function previewSite(overridePageId) {
        // Allow the iframe to request a specific page, otherwise default to the active editor page
        const targetPage = overridePageId && state.pages[overridePageId] ? state.pages[overridePageId] : getActivePage();
        
        const { css, fontStr } = compileSiteCSS();
        let popupsHTML = '';
        Object.values(state.pages).filter(p => p.type === 'popup').forEach(popupPage => {
            popupsHTML += `\n<div id="overlay-${popupPage.id}" class="wx-popup-overlay">\n    <div class="wx-popup-window">\n        <div class="wx-popup-close">✕</div>\n${compileNodeHTML(null, popupPage, true)}    </div>\n</div>\n`;
        });

        const htmlOut = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Preview</title>\n<style>${fontStr}\n\n${css}</style>\n<script>${getAppJS()}</script>\n</head>\n<body>\n<div class="site-canvas">\n${compileNodeHTML(null, targetPage, true)}\n</div>\n${popupsHTML}\n</body>\n</html>`;

        const blob = new Blob([htmlOut], { type: 'text/html' });
        document.getElementById('preview-iframe').src = URL.createObjectURL(blob);
        document.getElementById('preview-overlay').style.display = 'block';
    }


    // ── UNIFIED EXPORT ENGINE (.wex) ─────────────────────────────────
    function exportProject() {
        saveState();
        const siteId = state.settings.pageId || 'my-site';
        const siteTitle = state.settings.title || 'Untitled Site';
        const zip = new JSZip();
        
        // 1. Save the editor's internal state (Allows importing back into Wexton later)
        zip.file("project.wex", JSON.stringify(state));
        
        // 2. Smart Sweep: Package ONLY custom assets (skip stock files)
        const assetsFolder = zip.folder("assets"); 
        const requiredCustomAssets = new Set();
        const allStockNames = [...(_stockAssets.images || []), ...(_stockAssets.videos || []), ...(_stockAssets.sounds || [])];

        Object.values(state.pages).forEach(p => {
            Object.values(p.blocks).forEach(b => {
                if (b.type === 'media' && b.filename && !allStockNames.includes(b.filename)) requiredCustomAssets.add(b.filename);
                if (b.link && b.link.type === 'sound' && b.link.value && !allStockNames.includes(b.link.value)) requiredCustomAssets.add(b.link.value);
            });
        });

        requiredCustomAssets.forEach(name => {
            if (assetFiles.has(name)) assetsFolder.file(name, assetFiles.get(name));
        });

        // 3. Compile CSS & JS for the Live Site
        const { css, fontStr } = compileSiteCSS();
        zip.folder('css').file('styles.css', fontStr + '\n\n' + css);
        zip.folder('scripts').file('app.js', getAppJS());

        // 4. Compile HTML (Popups & Pages)
        let popupsHTML = '';
        Object.values(state.pages).filter(p => p.type === 'popup').forEach(popupPage => {
            popupsHTML += `\n\n<div id="overlay-${popupPage.id}" class="wx-popup-overlay">\n    <div class="wx-popup-window">\n        <div class="wx-popup-close">✕</div>\n${compileNodeHTML(null, popupPage, false)}    </div>\n</div>\n`;
        });

        const targetIndex = state.settings.indexPageId || Object.keys(state.pages)[0];
        Object.values(state.pages).filter(p => p.type !== 'popup').forEach(page => {
            const isIndex = page.id === targetIndex;
            const filename = isIndex ? 'index.html' : `${page.id}.html`;
            const tabTitle = isIndex ? siteTitle : `${siteTitle} - ${page.name}`;
            
            const htmlOut = `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>${tabTitle}</title>\n    <link rel="stylesheet" href="./css/styles.css">\n    <script src="./scripts/app.js" defer></script>\n</head>\n<body>\n    <div class="site-canvas">\n${compileNodeHTML(null, page, false)}\n    </div>\n    ${popupsHTML}\n</body>\n</html>`;
            zip.file(filename, htmlOut);
        });

        // 5. Build Intranet Manifest
        const s = state.settings;
        zip.file('manifest-snippet.json', JSON.stringify({
            id: siteId, headline: s.headline || `${siteTitle} Launches on Intranet`, summary: s.summary || `Access the new portal for ${siteTitle} via your local Brigistics terminal today.`,
            availability: {
                months: s.avail_m1 && s.avail_m2 ? [parseInt(s.avail_m1), parseInt(s.avail_m2)] : null,
                days: s.avail_d1 && s.avail_d2 ? [parseInt(s.avail_d1), parseInt(s.avail_d2)] : null,
                times: s.avail_t1 && s.avail_t2 ? [s.avail_t1, s.avail_t2] : null
            }
        }, null, 4));

        // 6. Download the Unified Archive
        zip.generateAsync({ type: 'blob' }).then(blob => { 
            const a = document.createElement('a'); 
            a.href = URL.createObjectURL(blob); 
            a.download = siteId + '.wex'; 
            a.click(); 
        });
    }

    // ── PUBLIC API EXPORTS ───────────────────────────────────────────
    
    function init() {
        canvas = document.getElementById('canvas');
        preloadAllFonts(); 
        initInteractions(); 
        initContextListeners(); 
        loadStockManifest(); 
        const lastId = localStorage.getItem(LAST_ACTIVE_KEY);
        if (lastId && getLibrary()[lastId]) { loadFromLibrary(lastId); } else { createNewSite(); }
    }

    function unparentActive() {
        if (!state.activeId) return;
        const page = getActivePage();
        const b = page.blocks[state.activeId];
        if (!b || !b.parentId) return;
        
        const node = document.getElementById(state.activeId);
        const cr = canvas.getBoundingClientRect();
        const rect = node.getBoundingClientRect();
        
        const centerX = rect.left + rect.width / 2 - cr.left + canvas.scrollLeft;
        const centerY = rect.top + rect.height / 2 - cr.top + canvas.scrollTop;
        
        const currentAbsoluteRot = getAccumulatedRotation(state.activeId);
        b.style.rotation = currentAbsoluteRot % 360;
        if (b.style.rotation < 0) b.style.rotation += 360;
        
        b.parentId = null;
        b.layout.x = pxToCols(centerX - node.offsetWidth / 2);
        b.layout.y = snapY(centerY - node.offsetHeight / 2);
        
        saveState();
        renderCanvas();
    }

    function pickSound() {
        if (!state.activeId) return;
        openAssetLibrary('sound', name => {
            updateBlock(state.activeId, { link: { type: 'sound', value: name } }); saveState();
            const btn = document.getElementById('inp-soundFile'); if (btn) btn.textContent = `🔊 ${name}`;
        });
    }

    function openSettings() {
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        
        setVal('set-title', state.settings.title);
        setVal('set-id', state.settings.pageId);
        setVal('set-bg', state.settings.bgHex || '#ffffff');
        document.getElementById('set-bg-val').textContent = state.settings.bgHex || '#ffffff';
        
        setVal('set-headline', state.settings.headline);
        setVal('set-summary', state.settings.summary);
        setVal('set-avail-m1', state.settings.avail_m1);
        setVal('set-avail-m2', state.settings.avail_m2);
        setVal('set-avail-d1', state.settings.avail_d1);
        setVal('set-avail-d2', state.settings.avail_d2);
        setVal('set-avail-t1', state.settings.avail_t1);
        setVal('set-avail-t2', state.settings.avail_t2);

        const list = document.getElementById('set-pages-list');
        if (list) {
            list.innerHTML = Object.values(state.pages).map(p => `
                <div class="set-page-row">
                    <button class="ctx-icon-btn danger" onclick="Architect.deletePage('${p.id}')" title="Delete" style="width:24px;height:24px;font-size:12px;flex-shrink:0;margin:0px 4px;color:red;">X</button>
                    
                    <span class="set-page-type" style="margin-left:8px;">${p.type === 'popup' ? '⚡' : '📄'}</span>
                    <span style="font-size:10px;color:var(--text-muted);font-family:monospace;flex-shrink:0;">${p.type}</span>
                    <input class="ctx-input set-page-name" data-pid="${p.id}" value="${p.name.replace(/"/g,'&quot;')}" placeholder="Page name">
                    
                    <input type="radio" name="indexPage" value="${p.id}" ${state.settings.indexPageId === p.id ? 'checked' : ''} onchange="Architect.setIndexPage('${p.id}')" title="Set as Home Page (index.html)" style="margin:0; width:auto;">
                </div>`).join('');
            list.querySelectorAll('.set-page-name').forEach(inp => {
                inp.addEventListener('change', e => { renamePage(e.target.dataset.pid, e.target.value); renderPageDropdowns(); });
            });
        }
        document.getElementById('settings-modal').style.display = 'flex';
    }

    function setIndexPage(id) { 
        state.settings.indexPageId = id; 
        saveState(); 
    }

    function updateTextAlign(val) { 
        if (state.activeId) { 
            updateBlock(state.activeId, { style: { textAlign: val } }); 
            saveState(); 
        } 
    }

    function execFormat(cmd, val) { 
        document.execCommand(cmd, false, val || null); 
    }

    function setPreview(m) {
        const isMob = m === 'mobile';
        isMob ? canvas.classList.add('mobile-mode') : canvas.classList.remove('mobile-mode');
        document.getElementById('btn-desktop').classList.toggle('active', !isMob);
        document.getElementById('btn-mobile').classList.toggle('active', isMob);
        document.getElementById('mobile-hint').style.display = isMob ? 'flex' : 'none';
        if (isMob) { setActive(null); document.getElementById('context-panel').style.display = 'none'; }
        renderCanvas();
    }

    function generateTemplate() {
        var lib = JSON.parse(localStorage.getItem('wexton_library') || '{}');
        var activeId = localStorage.getItem('wexton_last_id');
        var site = lib[activeId];
        if (!site || !site.stateData) return console.error("No active site found.");

        var page = site.stateData.pages[site.stateData.activePageId];
        var out = "        // AUTO-GENERATED TEMPLATE\n";
        var idMap = {};
        var counter = 1;

        page.layerOrder.forEach(oldId => { idMap[oldId] = `wx-blk-${counter++}`; });

        page.layerOrder.forEach(oldId => {
            var b = page.blocks[oldId];
            var newId = idMap[oldId];
            var pid = b.parentId ? `'${idMap[b.parentId]}'` : 'null';
            var safeContent = b.content.replace(/`/g, '\\`');

            out += `        p.blocks['${newId}'] = { id: '${newId}', type: '${b.type}', parentId: ${pid}, content: \`${safeContent}\`, filename: ${b.filename ? `'${b.filename}'` : 'null'}, link: ${JSON.stringify(b.link)}, layout: ${JSON.stringify(b.layout)}, style: ${JSON.stringify(b.style)} };\n`;
            out += `        p.layerOrder.push('${newId}');\n\n`;
        });

        out += `        idCounter = ${counter};\n`;

        var blob = new Blob([out], { type: 'text/plain' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'wexton_custom_template.txt';
        a.click();
    }

   
    function importProject(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const zip = new JSZip();
        zip.loadAsync(file).then(async (contents) => {
            if (!contents.files["project.wex"]) {
                alert("Invalid or corrupted project file. Make sure it is a valid .wex file.");
                return;
            }
            const stateStr = await contents.file("project.wex").async("string");
            const importedState = JSON.parse(stateStr);
            
            if (contents.folder("assets")) {
                const assetPromises = [];
                contents.folder("assets").forEach((relativePath, zipEntry) => {
                    if (!zipEntry.dir) {
                        assetPromises.push(zipEntry.async("blob").then(blob => {
                            let type = blob.type;
                            if (!type) {
                                if (relativePath.endsWith('.mp3')) type = 'audio/mpeg';
                                else if (relativePath.endsWith('.png')) type = 'image/png';
                                else if (relativePath.endsWith('.jpg') || relativePath.endsWith('.jpeg')) type = 'image/jpeg';
                            }
                            const f = new File([blob], relativePath, { type });
                            assetFiles.set(relativePath, f);
                            assetUrls.set(relativePath, URL.createObjectURL(f));
                            _saveAsset(relativePath, f);
                        }));
                    }
                });
                await Promise.all(assetPromises);
            }
            
            state = importedState;
            history = []; historyIndex = -1;
            
            idCounter = 1;
            Object.values(state.pages).forEach(p => p.layerOrder.forEach(bid => {
                const num = parseInt(bid.replace('wx-blk-',''), 10);
                if (num >= idCounter) idCounter = num + 1;
            }));
            
            setActive(null);
            renderPageDropdowns();
            renderCanvas();
            saveState();
            
        }).catch(err => alert("Failed to load project: " + err.message));
        event.target.value = '';
    }
    
    // ── PUBLIC API ───────────────────────────────────────────────────
    return {
        init,
        addBlock, 
        handleMediaUpload, 
        handleSoundUpload,
        changeZIndex, 
        deleteActive, 
        duplicateActive,
        unparentActive,
        selectLayer: (id) => setActive(id), 
        renderLayers, 
        loadFromLibrary, 
        deleteFromLibrary, 
        openLibrary: openLibraryModal, 
        createNewSite,
        openAssetLibrary, 
        renamePage,
        pickSound,
        openSettings,
        setIndexPage,
        createPage, 
        switchPage, 
        toggleLinkInput, 
        deletePage,
        updateTextAlign,
        toggleFormat,
        execFormat,
        applyTextPreset,
        previewSite,
        setPreview,
        generateTemplate,
        exportProject,
        importProject
    };
})();
document.addEventListener('DOMContentLoaded', Architect.init);
window.Architect = Architect;