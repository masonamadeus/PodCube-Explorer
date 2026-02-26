/**
 * profile-ui.js — Profile Tab Rendering
 */


// ─────────────────────────────────────────────────────────────────
// MODULE STATE
// ─────────────────────────────────────────────────────────────────

let _achFilter = 'all';
let _loginCodeVisible = false;
let _lastNotifCount = 0;


// ─────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────

function renderUserUI(userData) {
    _renderHeaderBadge(userData);
    _renderProfileHero(userData);
    _renderProfileStats(userData);
    _renderAchievements(userData);
    _renderNotifications(userData);
    _refreshLoginCode();
}

/** Switch achievement gallery filter. Called by filter bar buttons. */
function setAchFilter(filter) {
    _achFilter = filter;
    _renderAchievements(PodUser.data);
}


// --- NEW MEMORY CARD LOGIC ---

function _refreshLoginCode() {
    const container = document.getElementById('prof-qr-container');
    if (!container) return;

    // Generate the URL payload
    const payload = PodUser.exportCode();
    let baseUrl = (window.location.hostname === "bodgelab.com") 
        ? "https://bodgelab.com/s/podcube/" 
        : window.location.origin + window.location.pathname;

    const url = new URL(baseUrl);
    url.searchParams.set('memory', payload);

    if (window.QRCode) {
        try {
            container.innerHTML = '';
            new QRCode(container, {
                text: url.toString(),
                width: 134,
                height: 134,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.L // L allows massive payloads (up to ~2900 bytes)
            });
        } catch (e) {
            console.warn("Payload too large for QR Code. Falling back to text.", e);
            container.innerHTML = `<textarea readonly style="width:100%; height:100%; font-size:8px; border:none; resize:none; font-family:monospace;" onclick="this.select(); document.execCommand('copy'); alert('Copied!');">${url.toString()}</textarea>`;
        }
    }
}

window.handleMemoryCardUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // We reuse the exact same image scanner from explorer.js
    if (typeof scanPastedImage === 'function') {
        scanPastedImage(file);
    }
    event.target.value = ''; // Reset input
};

window.downloadMemoryCard = async function() {
    if (!window.html2canvas) { alert("Missing html2canvas library."); return; }
    
    // Build an off-screen, beautifully formatted card
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    wrapper.style.width = '300px';
    wrapper.style.background = '#fdfdfc';
    wrapper.style.border = '4px double #1768da';
    wrapper.style.fontFamily = '"Fustat", sans-serif';
    wrapper.style.color = '#1a1a1a';
    wrapper.style.textAlign = 'center';
    
    const qrUrl = new URL(window.location.origin + window.location.pathname);
    qrUrl.searchParams.set('memory', PodUser.exportCode());
    
    wrapper.innerHTML = `
        <h2 style="font-family:'Libertinus Math'; background-color:#1768da; color:#fff; padding: 10px; margin:0 0 5px 0;">PodCube™</h2>
        <div style="font-weight:bold; font-size:12px; text-transform:uppercase; padding:15px; letter-spacing:0.05em;">Authorized Personnel Memory Card</div>
        <div id="dl-qr-target" style="display:flex; justify-content:center; margin:auto; padding:10px; background:#fff; border:1px solid #1768da; max-width:fit-content"></div>
        <div style="font-size:10px; color:#666; padding:10px;">USER: ${escapeHtml(PodUser.data.username)}</div>
    `;
    
    document.body.appendChild(wrapper);
    
    if (window.QRCode) {
        new QRCode(wrapper.querySelector('#dl-qr-target'), {
            text: qrUrl.toString(),
            width: 200, height: 200,
            correctLevel: QRCode.CorrectLevel.L
        });
    }
    
    await new Promise(r => setTimeout(r, 150)); // Allow QR to render
    
    try {
        const canvas = await html2canvas(wrapper, { scale: 2 });
        const link = document.createElement('a');
        link.download = `PodCube_MemoryCard_${PodUser.data.username.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    } catch (e) {
        console.error("Failed to download memory card", e);
    } finally {
        wrapper.remove();
    }
};

// Initialize Drag & Drop for the new reader
setTimeout(() => {
    const reader = document.getElementById('memCardReader');
    if (!reader) return;
    
    ['dragenter', 'dragover'].forEach(eventName => {
        reader.addEventListener(eventName, e => { e.preventDefault(); reader.classList.add('drag-active'); });
    });
    
    ['dragleave', 'dragend', 'drop'].forEach(eventName => {
        reader.addEventListener(eventName, e => { e.preventDefault(); reader.classList.remove('drag-active'); });
    });
    
    reader.addEventListener('drop', async e => {
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            if (typeof scanPastedImage === 'function') scanPastedImage(file);
        } else {
            const text = e.dataTransfer.getData('text');
            if (text && text.includes('memory=')) handlePastedCode(text);
        }
    });
}, 1000); // Small delay to ensure DOM is ready

/** Open the Achievement Fullscreen Lightbox */
window.openAchLightbox = function(type, url, caption) {
    let overlay = document.getElementById('ach-lightbox');
    
    // Construct Lightbox if it doesn't exist yet
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'ach-lightbox';
        overlay.className = 'ach-lightbox-overlay';
        overlay.innerHTML = `
            <button class="ach-lightbox-close" onclick="closeAchLightbox()">×</button>
            <div id="ach-lightbox-body" style="display:flex; flex-direction:column; align-items:center;"></div>
        `;
        document.body.appendChild(overlay);
        
        // Click outside media to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target === document.getElementById('ach-lightbox-body')) {
                closeAchLightbox();
            }
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('ach-lightbox')?.classList.contains('active')) {
                closeAchLightbox();
            }
        });
    }

    const body = document.getElementById('ach-lightbox-body');
    body.innerHTML = ''; // Clear previous content

    // Populate Media
    if (type === 'image') {
        body.innerHTML = `<img src="${url}" class="ach-lightbox-content" style="object-fit:contain;">`;
    } else if (type === 'video') {
        body.innerHTML = `<video src="${url}" class="ach-lightbox-content" controls autoplay style="object-fit:contain;"></video>`;
    }

    // Populate Caption
    if (caption && caption !== 'undefined' && caption.trim() !== '') {
        body.innerHTML += `<div class="ach-lightbox-caption">${escapeHtml(caption)}</div>`;
    }

    // Force CSS reflow to ensure the transition animates smoothly
    void overlay.offsetWidth;
    overlay.classList.add('active');
};

/** Close Lightbox and pause video */
window.closeAchLightbox = function() {
    const overlay = document.getElementById('ach-lightbox');
    if (overlay) {
        overlay.classList.remove('active');
        const vid = overlay.querySelector('video');
        if (vid) vid.pause();
    }
};

// ─────────────────────────────────────────────────────────────────
// PRIVATE: SUB-RENDERERS
// ─────────────────────────────────────────────────────────────────

function _renderHeaderBadge(userData) {
    const name = document.getElementById('ub-name');
    if (name) name.textContent = userData.username;

    const badge = document.getElementById('ub-notif');
    if (!badge) return;
    const n = PodUser.unreadCount;
    badge.textContent = n;
    badge.style.display = n > 0 ? 'inline-block' : 'none';
}

function _renderProfileHero(userData) {
    const el = document.getElementById('prof-username');
    if (el) {
        el.innerHTML = `
            <span id="prof-name-text" spellcheck="false" style="outline: none; border-bottom: 2px solid transparent; transition: border-color 0.2s;">
                ${escapeHtml(userData.username)}
            </span>
            <button onclick="renameUser()" title="Change Designation" 
                    style="background:none; border:none; color:var(--primary); cursor:pointer; font-size:0.5em; vertical-align:middle; padding:4px;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
            </button>
        `;
    }
}

window.renameUser = function() {
    const nameEl = document.getElementById('prof-name-text');
    if (!nameEl) return;

    // Bail if already in edit mode — prevents listener stacking on double-click
    if (nameEl.contentEditable === 'true') return;
    
    nameEl.contentEditable = "true";
    nameEl.style.borderBottomColor = "var(--primary)";
    nameEl.focus();
    
    const range = document.createRange();
    range.selectNodeContents(nameEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const saveRename = () => {
        nameEl.contentEditable = "false";
        nameEl.style.borderBottomColor = "transparent";
        const newName = nameEl.textContent.trim();
        
        if (newName && newName !== PodUser.data.username) {
            PodUser.data.username = newName;
            PodUser.save(); 
        } else {
            nameEl.textContent = PodUser.data.username; 
        }
        
        nameEl.removeEventListener('blur', saveRename);
        nameEl.removeEventListener('keydown', keydownHandler);
    };

    const keydownHandler = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            nameEl.blur();      
        } else if (e.key === 'Escape') {
            e.preventDefault();
            nameEl.textContent = PodUser.data.username; 
            nameEl.blur(); 
        }
    };

    // Overwrite to prevent leaks??
    nameEl.onblur = saveRename;
    nameEl.onkeydown = keydownHandler;
};

function _renderProfileStats(userData) {
    const grid = document.getElementById('prof-stats-grid');
    if (!grid) return;

    const total    = PodUser.achievements.length;
    const unlocked = userData.achievements.length;

    // Calculate total listening time from the history array
    let totalSeconds = 0;
    if (window.PodCube && typeof window.PodCube.findEpisode === 'function') {
        userData.history.forEach(id => {
            const ep = window.PodCube.findEpisode(id);
            if (ep && ep.duration) {
                totalSeconds += ep.duration;
            }
        });
    }
    
    let timeString = '0H 0M';
    if (totalSeconds > 0) {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        timeString = `${h}H ${m}M`;
    }

    // Calculate Productivity Score 
    const prodScore = Object.values(userData.games || {}).reduce((sum, val) => sum + val, 0);

    grid.innerHTML = `
        <div class="stat-box">
            <label>Logins</label>
            <div class="stat-num">${userData.visits}</div>
        </div>
        <div class="stat-box">
            <label>Listens</label>
            <div class="stat-num">${userData.history.length}</div>
        </div>
        
        <div class="stat-box">
            <label>Cards Printed</label>
            <div class="stat-num">${userData.punchcards}</div>
        </div>
        <div class="stat-box">
            <label>Cards Shared</label>
            <div class="stat-num">${userData.punchcardExport || 0}</div>
        </div>
        <div class="stat-box">
            <label>Time Logged</label>
            <div class="stat-num" style="font-size: 1.3em;" title="${totalSeconds} seconds">${timeString}</div>
        </div>
        <div class="stat-box">
            <label>Perks</label>
            <div class="stat-num">${unlocked}<span style="font-size:0.45em;color:var(--text-dim);"> /${total}</span></div>
        </div>
    `;
}

function _renderAchievements(userData) {
    const container = document.getElementById('prof-achievements');
    if (!container) return;

    document.querySelectorAll('.ach-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === _achFilter);
    });

    let list = [...PodUser.achievements].sort((a, b) => (a.order || 0) - (b.order || 0));
    if (_achFilter === 'unlocked') list = list.filter(a =>  userData.achievements.includes(a.id));
    if (_achFilter === 'locked')   list = list.filter(a => !userData.achievements.includes(a.id));

    if (list.length === 0) {
        container.innerHTML = `
            <p style="text-align:center; padding:30px; font-family:'Fustat'; font-size:11px;
                      text-transform:uppercase; color:var(--text-muted); letter-spacing:0.05em;">
                ${_achFilter === 'locked'
                    ? 'All Perks unlocked. Remarkable.'
                    : 'No Perks registered.'}
            </p>`;
        return;
    }

    const gallery = document.createElement('div');
    gallery.className = 'achievement-gallery';

    list.forEach(ach => {
        const unlocked = userData.achievements.includes(ach.id);
        const isHidden = !unlocked && ach.hiddenGoal;
        
        // Icon rules: hidden-goal locked → ❓, unlocked → custom or 🏆, locked → 🔒 always
        const icon     = isHidden ? '❓' : (unlocked ? (ach.icon || '🏆') : '🔒');
        const title    = isHidden ? '???' : escapeHtml(ach.title);
        const desc     = isHidden ? 'This P.O.O.P. is encrypted.' : escapeHtml(ach.desc);

        const card = document.createElement('div');
        card.id = `ach-card-${ach.id}`; 
        card.className = `ach-card ${unlocked ? 'unlocked' : 'locked'} ${isHidden ? 'hidden-goal' : ''}`;

        let rewardHtml = '';
        if (unlocked && ach.reward) {
            rewardHtml = _buildRewardHtml(ach);
        } else if (!unlocked) {
            rewardHtml = _buildLockedRewardPlaceholder(ach);
        }

        card.innerHTML = `
            <span class="ach-status-badge ${unlocked ? 'is-unlocked' : 'is-locked'}">
                ${unlocked ? '✓ Unlocked' : '🔒 Locked'}
            </span>
            <div class="ach-card-header">
                <div class="ach-icon">${icon}</div>
                <div class="ach-meta">
                    <h4 class="ach-title">${title}</h4>
                    <p class="ach-desc">${desc}</p>
                </div>
            </div>
            ${rewardHtml ? `<div class="ach-reward">${rewardHtml}</div>` : ''}
        `;

        gallery.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(gallery);
}

function _renderNotifications(userData) {
    const container = document.getElementById('prof-notifications');
    if (!container) return;

    if (!userData.notifications.length) {
        container.innerHTML = `<p style="text-align:center; padding:20px; font-family:'Fustat'; font-size:11px; text-transform:uppercase; color:var(--text-dim)">No alerts at this time.</p>`;
        _lastNotifCount = 0;
        return;
    }

    // Sort: Unread first, then chronological (newest first)
    const sortedNotifs = [...userData.notifications].sort((a, b) => {
        if (a.read === b.read) {
            // If both are read or both are unread, sort by timestamp
            return b.timestamp - a.timestamp;
        }
        // If 'a' is read and 'b' is unread, 'a' gets pushed down (1)
        return a.read ? 1 : -1;
    });

    container.innerHTML = sortedNotifs.map(n => {
        const isRead     = !!n.read;
        const hasPayload = !!n.payload;
        // Read notifications with no payload are history — no click action needed
        const clickable  = !isRead || hasPayload;

        return `
        <div class="notification-card ${isRead ? 'read' : 'unread'}"
             ${clickable ? `onclick="handleNotificationClick('${n.id}')" style="cursor:pointer;" title="${hasPayload ? 'View Record' : 'Click to dismiss'}"` : ''}>
            <div style="font-size:10px; color:var(--text-dim); font-family:'Fustat'; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:4px;">
                ${new Date(n.timestamp).toLocaleString()}${isRead ? ' · READ' : ''}
            </div>
            <strong style="display:block; margin-bottom:4px; font-family:'Libertinus Math'; font-size:16px;">
                ${escapeHtml(n.title)}
            </strong>
            <p style="font-size:12px; color:var(--text-muted); margin:0; line-height:1.5; font-family:'Fustat';">
                ${escapeHtml(n.body)}
            </p>
        </div>
        `;
    }).join('');

   const newCount = userData.notifications.length;

    // Only scroll if this isn't the initial load AND the count went up
    if (_lastNotifCount > 0 && newCount > _lastNotifCount) {
        // Give the browser 50ms to paint the new HTML before calculating the scroll
        setTimeout(() => {
            container.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
    }
    
    // Update the tracker for the next render
    _lastNotifCount = newCount;
}


function _buildLockedRewardPlaceholder(ach) {
    // Determine the lock icon hint based on reward type, without revealing what it is
    const rewardTypeHint = {
        'audio': '📡',
        'video': '📽️',
        'image': '🖼',
        'game':  '🎮',
        'text':  '💬',
    }[ach.reward?.type] || '🔒';

    // For hidden-goal achievements, don't even hint at the reward type
    const icon = ach.hiddenGoal ? '🔒' : rewardTypeHint;

    return `
        <div class="ach-reward-section-label">Encrypted Perk</div>
        <div class="ach-reward-locked-wrapper">
            <div class="ach-reward-lock-icon">${icon}</div>
            <div class="ach-reward-lock-label">Unlock to Reveal</div>
            <div class="ach-reward-lock-sublabel">Content Encrypted</div>
        </div>
    `;
}

function _buildRewardHtml(ach) {
    if (!ach.reward) return '';
    const sectionLabel = `<div class="ach-reward-section-label">Unlocked Perk</div>`;
    
    // Wraps the media block and sets up Lightbox clicks if enabled
    const mkWrapper = (content, isClickable = false, onclick = '', extraStyles = '') => `
        <div class="ach-reward-media-wrapper" 
             ${isClickable ? `onclick="${onclick}" style="cursor: zoom-in; ${extraStyles}" title="View Fullscreen"` : `style="${extraStyles}"`}>
            ${content}
        </div>
    `;

    switch (ach.reward.type) {
        case 'image':
            return sectionLabel + `
                ${mkWrapper(`
                    <img src="${escapeForAttribute(ach.reward.url)}" 
                         alt="Unlocked: ${escapeForAttribute(ach.title)}"
                         style="width: 100%; height: 100%; object-fit: cover;">
                    <div class="ach-hover-overlay"><span style="font-size: 24px; color:transparent; text-shadow: 0 0 var(--primary);">🔍</span></div>
                `, true, `openAchLightbox('image', '${escapeForAttribute(ach.reward.url)}', '${escapeForAttribute(ach.reward.caption || '')}')`)}
                ${ach.reward.caption ? `<p class="ach-reward-caption">${escapeHtml(ach.reward.caption)}</p>` : ''}
            `;
        case 'video':
            return sectionLabel + `
                ${mkWrapper(`
                    <video src="${escapeForAttribute(ach.reward.url)}" 
                           style="width: 100%; height: 100%; object-fit: cover;" muted playsinline></video>
                    <div class="ach-video-overlay">
                        <svg viewBox="0 0 24 24" width="40" height="40" fill="var(--bg-panel)" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </div>
                `, true, `openAchLightbox('video', '${escapeForAttribute(ach.reward.url)}', '')`, 'background: #000;')}
            `;
        case 'audio':
            return sectionLabel + `
                ${mkWrapper(`
                <button class="hero-btn" style="width: 85%; padding: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 0;"
                        onclick="PodUser.playRewardAudio('${escapeForAttribute(ach.id)}')">
                    <span class="hero-btn-icon" style="font-size: 1.2em;">▶</span>
                    <span class="hero-btn-text">
                        <strong style="font-size: 12px; font-family: 'Libertinus Math';">${escapeHtml(ach.reward.meta?.title || 'Encrypted')}</strong>
                        <span style="font-size: 9px; text-transform: uppercase; font-family: 'Fustat';">Supplementary Audio File</span>
                    </span>
                </button>
                `, false, '', 'background: repeating-linear-gradient(45deg, var(--primary-dim), var(--primary-dim) 10px, var(--bg-panel) 10px, var(--bg-panel) 20px);')}
            `;
        case 'game':
            return sectionLabel + `
                ${mkWrapper(`
                <button class="hero-btn" style="width: 85%; padding: 12px; border-color: var(--orange); box-shadow: 0 4px 12px rgba(0,0,0,0.4); border-radius: 0;"
                        onclick="switchTab('interactive', true); window.Interactive?.load?.('${escapeForAttribute(ach.reward.gameId)}')">
                    <span class="hero-btn-icon" style="font-size: 1.2em; color: var(--orange);">🎮</span>
                    <span class="hero-btn-text">
                        <strong style="font-size: 12px; font-family: 'Libertinus Math';">${escapeHtml(ach.reward.buttonText || 'Launch Module')}</strong>
                        <span style="font-size: 9px; color: var(--text-muted); text-transform: uppercase; font-family: 'Fustat';">Productivity Task</span>
                    </span>
                </button>
                `, false, '', '')}
            `;
        case 'text':
            return sectionLabel + `
            <div style="position: relative; background: var(--bg-panel); border: 1px solid var(--primary-dim); border-radius: 4px; padding: 16px; margin-top: 8px; height: 140px; display: flex; flex-direction: column;">
                <div style="white-space:pre-wrap; flex: 1; overflow-y: auto; font-size: 11px; font-family: monospace; color: var(--text);">${escapeHtml(ach.reward.content)}</div>
                <button onclick="navigator.clipboard.writeText('${escapeForAttribute(ach.reward.content)}'); this.textContent='COPIED!'; setTimeout(()=>this.textContent='COPY TEXT', 1500);" 
                        style="position: absolute; top: 6px; right: 6px; font-size: 8px; font-weight: bold; font-family: 'Fustat'; padding: 4px 8px; background: var(--primary); color: var(--bg-body); border: none; border-radius: 2px; cursor: pointer; text-transform: uppercase; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    COPY TEXT
                </button>
            </div>`;
        default:
            return '';
    }
}


// CLICK HANDLER FOR NOTIFICATIONS
window.handleNotificationClick = function(id) {
    const n = PodUser.data.notifications.find(x => x.id === id);
    if (!n) return;

    // Read notifications with no payload have no action
    if (n.read && !n.payload) return;

    const payload = n.payload;

    // Mark as read
    PodUser.markNotificationRead(id);

    // --- SCENARIO A: ACHIEVEMENT CLICK ---
    if (payload && payload.type === 'achievement') {
        if (typeof switchTab !== 'undefined') switchTab('profile', true);
        
        _achFilter = 'all';
        renderUserUI(PodUser.data);

        setTimeout(() => {
            const card = document.getElementById(`ach-card-${payload.id}`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                card.style.transition = 'box-shadow 0.4s ease, transform 0.4s ease';
                card.style.boxShadow = '0 0 20px rgba(23, 104, 218, 0.8)';
                card.style.transform = 'scale(1.03)';
                card.style.zIndex = '10';
                
                setTimeout(() => {
                    card.style.boxShadow = 'none';
                    card.style.transform = 'none';
                    setTimeout(() => card.style.zIndex = '', 400);
                }, 2000);
            }
        }, 100);
    } 
    // --- SCENARIO B: MAINTENANCE (DE-GAUSS) CLICK ---
    else if (payload && payload.type === 'maintenance') {
        if (typeof switchTab !== 'undefined') switchTab('profile', true);
        renderUserUI(PodUser.data);

        setTimeout(() => {
            const btn = document.getElementById(payload.target);
            if (btn) {
                // Scroll to the bottom of the page
                btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Flash the button red to draw their eye
                btn.style.transition = 'box-shadow 0.4s ease, transform 0.4s ease, background-color 0.4s ease, color 0.4s ease';
                btn.style.boxShadow = '0 0 25px var(--danger)';
                btn.style.transform = 'scale(1.05)';
                btn.style.backgroundColor = 'var(--danger)';
                btn.style.color = '#fff';
                
                // Snap it back to normal after 2 seconds
                setTimeout(() => {
                    btn.style.boxShadow = 'none';
                    btn.style.transform = 'none';
                    btn.style.backgroundColor = 'transparent';
                    btn.style.color = 'var(--danger)';
                }, 2000);
            }
        }, 100);
    // --- SCENARIO C: NEW TRANSMISSION CLICK ---
    } else if (payload && payload.type === 'new_episode') {
        const ep = window.PodCube.findEpisode(payload.id);
        if (ep) {
            // Load the episode into the inspector
            if (typeof loadEpisodeInspector !== 'undefined') {
                loadEpisodeInspector(ep);
            }
            // Switch to the inspector tab
            if (typeof switchTab !== 'undefined') {
                switchTab('inspector', true);
            }
        }
        renderUserUI(PodUser.data);
    }
    // --- SCENARIO D: STANDARD ALERT ---
    else {
        renderUserUI(PodUser.data);
    }
};