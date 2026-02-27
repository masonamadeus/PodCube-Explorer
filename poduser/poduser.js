/**
 * PodCube User Tracking & Achievement Engine
 * Manages IndexedDB "Memory Card", Notifications, and Progression.
 */

/**
 * PodCube User Tracking & Achievement Engine
 * Manages IndexedDB "Memory Card", Notifications, and Progression.
 */

class PodUserEngine {
    constructor() {
        this.dbName    = 'PodCube_MemoryCard';
        this.dbVersion = 1;
        this.db        = null;
        this._lastChimeTime = 0;

        // Initialize with defaults
        this.data = this._getDefaultData();

        this.achievements = [];
        this._listeners   = [];
    }

    /**
     * One source of truth for the user data schema.
     */
    _getDefaultData() {
        return {
            username:      this._generateUsername(),
            visits:        0,
            history:       [],   
            games:         {},   
            gamePlays:     {}, 
            punchcards:    0,    
            punchcardExport: 0, 
            punchcardImport: 0, 
            achievements:  [],   
            notifications: [],    
            degradation:   0,
            volume:        100, // default to max
        };
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (e) => {
                this.db = e.target.result;
                if (!this.db.objectStoreNames.contains('profile')) {
                    this.db.createObjectStore('profile', { keyPath: 'id' });
                }
            };

            request.onsuccess = async (e) => {
                this.db = e.target.result;
                await this._load();

                // Migrate IDs
                let migrated = false;
                this.data.history = this.data.history.map(id => {
                    if (id.length > 10) { 
                        migrated = true;
                        return window.PodCube.findEpisode(id)?.nanoId || id;
                    }
                    return id;
                });

                if (migrated) await this.save();

                // Session Logging
                if (!sessionStorage.getItem('podcube_session_logged')) {
                    this.data.visits += 1;
                    this.data.degradation = (this.data.degradation || 0) + 1;
                    sessionStorage.setItem('podcube_session_logged', 'true');
                    
                    if (this.data.visits === 1) {
                        this._pushNotification(
                            'System Initialization',
                            `Welcome, ${this.data.username}. Your activity is now being monitored by Brigistics...`
                        );
                    }
                }

                this._checkAchievements();
                await this.save();         
                this._emitUpdate();
                resolve();
            };

            request.onerror = (e) => reject(e);
        });
    }

    async _load() {
        return new Promise((resolve) => {
            const tx    = this.db.transaction('profile', 'readonly');
            const store = tx.objectStore('profile');
            const req   = store.get('main_user');

            req.onsuccess = () => {
                if (req.result) {
                    // Smart Merge: Defaults + Loaded Data
                    // This ensures new properties (like volume) exist even on old saves.
                    this.data = { ...this._getDefaultData(), ...req.result.data };
                }
                resolve();
            };
            req.onerror = () => resolve();
        });
    }

    async save() {
        return new Promise((resolve) => {
            if (!this.db) return resolve();
            const tx    = this.db.transaction('profile', 'readwrite');
            const store = tx.objectStore('profile');
            store.put({ id: 'main_user', data: this.data });
            tx.oncomplete = () => {
                this._emitUpdate();
                resolve();
            };
        });
    }


    // ─────────────────────────────────────────────────────────────
    // DATA PURGE
    // ─────────────────────────────────────────────────────────────

    async wipeData() {
        // Use central default generator
        this.data = this._getDefaultData();
        sessionStorage.removeItem('podcube_session_logged');

        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('pc_hi_') ||
                key.startsWith('pc_data_') ||
                key.startsWith('podcube_playlist_')) {
                localStorage.removeItem(key);
            }
        });

        if (window.PodCube){
            window.PodCube.clearQueue();
        }

        return new Promise((resolve) => {
            if (!this.db) {
                this._emitUpdate();
                resolve(true);
                return;
            }
            
            const tx = this.db.transaction('profile', 'readwrite');
            const store = tx.objectStore('profile');
            const req = store.clear(); 
            
            req.onsuccess = async () => {
                await this.save(); 
                this._emitUpdate();
                resolve(true);
            };
            
            req.onerror = () => resolve(false);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION HOOKS (Fixed Race Conditions)
    // ─────────────────────────────────────────────────────────────

    /**
     * Updates and persists user volume preference
     */
    async setVolume(val) {
        this.data.volume = parseInt(val, 10);
        await this.save();
    }

    /*
     * Log a finished episode
     */
    async logListen(nanoId) {
        if (!nanoId) return; // Prevent logging undefined DOM events

        this.addTemporalExposure(1);
        if (!this.data.history.includes(nanoId)) {
            this.data.history.push(nanoId);
            this._checkAchievements(); 
            await this.save(); 
        }
    }

    async logGamePlayed(gameId) {
        // Ensure the object exists for older saves migrating to this version
        if (!this.data.gamePlays) this.data.gamePlays = {};
        
        this.data.gamePlays[gameId] = (this.data.gamePlays[gameId] || 0) + 1;
        
        this.addTemporalExposure(1); 
        
        this._checkAchievements();
        await this.save();
    }

    async logGameScore(gameId, score) {
        const best = this.data.games[gameId] || 0;
        if (score > best) {
            this.data.games[gameId] = score;
            this._checkAchievements();
            await this.save();
        }
    }

    async logPunchcardPrinted() {
        this.addTemporalExposure(1);
        this.data.punchcards += 1;
        this._checkAchievements();
        await this.save();
    }

    async logPunchcardExport() {
        this.addTemporalExposure(1);
        this.data.punchcardExport += 1;
        this._checkAchievements();
        await this.save();
    }

    async logPunchcardImport(){
        this.addTemporalExposure(1);
        this.data.punchcardImport += 1;
        this._checkAchievements();
        await this.save();
    }


    // ─────────────────────────────────────────────────────────────
    // ACHIEVEMENT ENGINE
    // ─────────────────────────────────────────────────────────────

    registerAchievement(def) {
        this.achievements.push(def);
    }

    _checkAchievements() {
        if (!window.PodCube || !window.PodCube.isReady) return;
        // Create an evaluation context that includes our helper
        const evalContext = {
            ...this.data,
            hasListened: (id) => {
                const ep = window.PodCube.findEpisode(id);
                return ep ? this.data.history.includes(ep.nanoId) : false;
            }
        };

        for (const ach of this.achievements) {
            if (this.data.achievements.includes(ach.id)) continue;

            try {
                // Pass evalContext instead of this.data
                if (ach.condition(evalContext)) {
                    this.data.achievements.push(ach.id);
                    
                    this._pushNotification(
                        `NEW PERK: ${ach.title}`, 
                        ach.desc, 
                        { type: 'achievement', id: ach.id }
                    );
                    
                    this._triggerOSNotification(`NEW PERK: ${ach.title}`, ach.desc);
                }
            } catch (e) {
                console.warn(`[PodUser] Condition check skipped for "${ach.id}":`, e.message);
            }
        }
    }

    playRewardAudio(achievementId, metaOverrides = {}) {
        const ach = this.achievements.find(a => a.id === achievementId);
        if (!ach?.reward || ach.reward.type !== 'audio') return;

        const cfg = { ...ach.reward.meta, ...metaOverrides };

        const episode = new window.PodCube.Episode({
            id:          `internal_reward_${achievementId}`,
            title:       cfg.title       || 'CLASSIFIED TRANSMISSION',
            description: cfg.description || 'Internal Brigistics Recording.',
            episodeType: 'podcube_internal',
            audioUrl:    cfg.url,
            duration:    0,
            metadata: {
                model:     cfg.model     || 'PRIC Security Payload',
                origin:    cfg.origin    || 'PodCube HQ',
                locale:    cfg.locale,   // ADDED THIS
                region:    cfg.region,   // ADDED THIS
                zone:      cfg.zone,     // ADDED THIS
                planet:    cfg.planet,   // ADDED THIS
                date:      cfg.date      || 'Unknown',
                integrity: cfg.integrity || '100'
            }
        });

        episode._excludeFromExport = true;
        episode._internal          = true;

        window.PodCube.play(episode);

        if (typeof logCommand !== 'undefined') {
            logCommand(`// Executing Classified Payload: ${episode.title}`);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // NOTIFICATIONS
    // ─────────────────────────────────────────────────────────────

    async addNotification(title, body, payload = null) {
        this._pushNotification(title, body, payload);
        await this.save();
    }

    _pushNotification(title, body, payload = null) {
        this.data.notifications.unshift({
            id:        Date.now().toString(36) + Math.random().toString(36).substr(2),
            title,
            body,
            payload,
            timestamp: Date.now()
        });

        // Play the notification chime (debounced to avoid firing too many times on multiple perk unlocks)
        const now = Date.now();
        if (now - this._lastChimeTime > 1000) {
            this._lastChimeTime = now;
            try {
                const chime = new Audio('./poduser/bingbong_hilo-2.mp3');
                chime.volume = 0.6; 
                chime.play().catch(e => {
                    console.warn('[PodUser] Chime blocked by browser autoplay policy or missing file:', e.message);
                });
            } catch (e) {
                console.warn('[PodUser] Failed to play notification chime:', e);
            }
        }
    }

    async markNotificationRead(id) {
        const n = this.data.notifications.find(x => x.id === id);
        if (n && !n.read) {
            n.read = true;
            await this.save();
        }
    }

    async markAllNotificationsRead() {
        const anyUnread = this.data.notifications.some(n => !n.read);
        if (anyUnread) {
            this.data.notifications.forEach(n => { n.read = true; });
            await this.save();
        }
    }

    get unreadCount() {
        return this.data.notifications.filter(n => !n.read).length;
    }

    async requestOSNotifications() {
        if (!('Notification' in window)) return false;
        if (Notification.permission === 'granted') return true;
        return (await Notification.requestPermission()) === 'granted';
    }

    _triggerOSNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: './PODCUBE.png' });
        }
    }

    async addTemporalExposure(amount = 1) {
        const oldVal = this.data.degradation || 0;
        this.data.degradation = oldVal + amount;


        if (oldVal < 50 && this.data.degradation >= 50) {
            const title = 'MAINTENANCE REMINDER';
            const body = 'Terminal has reached standard maintenance interval. Please initiate a DE-GAUSS sequence to maintain connection integrity.';
            
            // 1. Use the synchronous push so it gets safely bundled into the save below
            this._pushNotification(title, body);
            
            // 2. Fire the OS-level notification so the user actually sees it happen
            this._triggerOSNotification(title, body);
        }

        // If they JUST crossed the critical threshold mid-session, alert them!
        if (oldVal < 100 && this.data.degradation >= 100) {
            const title = 'CRITICAL: TEMPORAL DESYNC';
            const body = 'Terminal has exceeded maximum safe exposure limits. Permanent interface corruption is imminent. Please click here and initiate a DE-GAUSS sequence immediately.';
            
            // 1. Use the synchronous push so it gets safely bundled into the save below
            this._pushNotification(title, body, { type: 'maintenance', target: 'btn-degauss' });
            
            // 2. Fire the OS-level notification so the user actually sees it happen
            this._triggerOSNotification(title, body);
        }

        // Single, safe database transaction
        await this.save();

        // Live-update the UI degradation without needing a page refresh!
        if (typeof updateDegradation === 'function') {
            updateDegradation(this.data.degradation);
        }

        console.log(`TERMINAL INTEGRITY: ${100-this.data.degradation}%`);
    }

    // ─────────────────────────────────────────────────────────────
    // DATA PORTABILITY
    // ─────────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────
    // DATA PORTABILITY (V2.1 Ultra-High Density)
    // ─────────────────────────────────────────────────────────────

    exportCode() {
        const playlists = [];
        if (window.PodCube && typeof window.PodCube.getPlaylists === 'function') {
            window.PodCube.getPlaylists().forEach(p => {
                const exp = window.PodCube.exportPlaylist(p.name);
                if (exp && exp.code) playlists.push(exp.code);
            });
        }

        let achBits = 0n;
        this.achievements.forEach(ach => {
            const bitIndex = ach.uid !== undefined ? ach.uid : ach.order; 
            if (this.data.achievements.includes(ach.id)) {
                achBits |= (1n << BigInt(bitIndex));
            }
        });

        const params = new URLSearchParams();
        params.set('u', this.data.username);
        
        // Stats: visits.punchcards.exports.imports.volume
        params.set('s', [
            this.data.visits || 0,
            this.data.punchcards || 0,
            this.data.punchcardExport || 0,
            this.data.punchcardImport || 0,
            this.data.volume ?? 100
        ].join('.'));

        params.set('h', this.data.history.join('')); 
        
        // Games: gameId_score_plays.gameId2_score_plays
        const combinedGames = [];
        const allGameKeys = new Set([...Object.keys(this.data.games || {}), ...Object.keys(this.data.gamePlays || {})]);
        
        allGameKeys.forEach(k => {
            const score = this.data.games[k] || 0;
            const plays = this.data.gamePlays[k] || 0;
            combinedGames.push(`${k}_${score}_${plays}`);
        });
        
        if (combinedGames.length > 0) params.set('g', combinedGames.join('.'));
        
        params.set('a', achBits.toString(16)); 
        
        const plStr = playlists.join('|');
        if (plStr) params.set('pl', plStr);
        
        return 'v2.' + params.toString();
    }

    async importCode(code) {
        if (!code?.trim()) return false;
        try {
            let clean = code.trim();
            
            // Extract from URL if necessary
            if (clean.includes('memory=')) {
                try {
                    const urlObj = new URL(clean);
                    clean = urlObj.searchParams.get('memory') || clean;
                } catch(e) {
                    clean = clean.split('memory=')[1].split('&')[0];
                }
            }

            // Reject legacy/invalid codes immediately
            if (!clean.startsWith('v2.')) {
                console.warn('[PodUser] Invalid or deprecated Memory Card format.');
                return false;
            }

            const params = new URLSearchParams(clean.substring(3));
            
            // STATS
            const stats = (params.get('s') || '').split('.');
            const v = parseInt(stats[0] || '0', 10);
            const p = parseInt(stats[1] || '0', 10);
            const e = parseInt(stats[2] || '0', 10);
            const i = parseInt(stats[3] || '0', 10);
            const vl = parseInt(stats[4] ?? '100', 10);

            // HISTORY
            const parsedHistory = [];
            const hStr = params.get('h') || '';
            for (let idx = 0; idx < hStr.length; idx += 5) {
                parsedHistory.push(hStr.substring(idx, idx + 5));
            }

            // GAMES
            const parsedGames = {};
            const parsedGamePlays = {};
            const gParam = params.get('g') || '';
            if (gParam) {
                gParam.split('.').forEach(chunk => {
                    const parts = chunk.split('_');
                    if (parts.length >= 3) {
                        const plays = parseInt(parts.pop(), 10);
                        const score = parseInt(parts.pop(), 10);
                        const gameId = parts.join('_'); 
                        if (gameId) {
                            parsedGames[gameId] = score;
                            parsedGamePlays[gameId] = plays;
                        }
                    }
                });
            }

            // ACHIEVEMENTS
            const parsedAchievements = [];
            const bits = BigInt('0x' + (params.get('a') || '0'));
            this.achievements.forEach(ach => {
                const bitIndex = ach.uid !== undefined ? ach.uid : ach.order;
                if ((bits & (1n << BigInt(bitIndex))) !== 0n) {
                    parsedAchievements.push(ach.id);
                }
            });

            // FINAL MERGE
            this.data = {
                ...this._getDefaultData(),
                username: params.get('u') || this.data.username,
                visits: v,
                history: parsedHistory,
                games: parsedGames,
                gamePlays: parsedGamePlays,
                punchcards: p,
                punchcardExport: e,
                punchcardImport: i,
                achievements: parsedAchievements,
                volume: vl,
            };

            // PLAYLISTS
            const plParam = params.get('pl') || '';
            const plArray = plParam ? plParam.split('|') : [];
            
            if (plArray.length > 0 && window.PodCube?.importPlaylist) {
                plArray.forEach(plCode => {
                    const res = window.PodCube.importPlaylist(plCode);
                    if (res?.episodes?.length > 0) {
                        let finalName = res.name;
                        let counter = 1;
                        while (window.PodCube.loadPlaylist(finalName)) {
                            finalName = `${res.name} (${counter++})`;
                        }
                        window.PodCube.savePlaylist(finalName, res.episodes);
                    }
                });
                if (typeof window.updatePlaylistsUI === 'function') window.updatePlaylistsUI();
            }

            this._checkAchievements();
            await this.save();
            this._emitUpdate();
            
            this.addNotification('System Restore', 'External personnel data successfully grafted into local memory.');
            return true;
        } catch (err) {
            console.error('[PodUser] Restore failed:', err);
            return false;
        }
    }

    _generateUsername() {
        const prefixes = [
            "Time-agnostic", "Adiabatic", "Spheroid", "Actualization", "Temporal",
            "Finite", "Linear", "Regenerative", "Ethical", "Kinetic",
            "Resonant", "Theoretical", "Molecular", "Pretentious", "Flashy",
            "Talkative", "Forgetful", "Unintrusive", "Spherical", "Maze-like",
            "Experimental", "Hallowed", "Intelligent", "Predictable", "Haunting",
            "Violent", "Family-friendly", "Chunky", "Rhinestone-studded", "Nasty",
            "Dazzling", "Sensory", "Pedestrian", "Concrete", "Imposing",
            "Foreboding", "Visceral", "Tangible", "Fragile", "Permanent",
            "Bionic", "Luxurious", "Fermented", "Synthetic", "Hypersynthetic",
            "Stimulating", "Useless", "Upcycled", "Repurposed", "Robust",
            "Glossy", "Floral", "Euphoric", "Amber-colored", "Crinkly",
            "Professional", "Condescending", "Thirsty", "Yummy", "Minimum",
            "Savory", "Stormy", "Picky", "Extravagant", "Discrete",
            "Iconic", "Authentic", "Shelf-stable", "Fossilized", "Silly",
            "Complex", "Refreshing", "Transparent", "Open", "Cozy",
            "Warm", "Humble", "Electronic", "Multiplex", "Sparky",
            "Cheesy", "Veiny", "Gritty", "Chalky", "Rare",
            "Vibrant", "Flappy", "4D", "High-Definition", "Literal",
            "Unbeatable", "Reasonably-Timed", "Slow", "Stinky", "Rapid-Drying",
            "Disciplinary", "Flabbergasted", "Non-operational", "Pseudo", "Posh"
        ];
        const names = [
            "PodCube", "Spheroid", "Anomaly", "ISWORM", "Tesseract",
            "Turd", "Timeline", "Drone", "Monopoly", "Beeswax",
            "Alligator", "Turbacco", "Sprot", "Condensation", "Flap",
            "Napkin", "Password", "AI", "CoverArt", "PRIC",
            "Hydroelectrics", "Founder", "Colonel", "Service", "QBit",
            "Bandwidth", "Teleporter", "LaserGun", "Statue", "Trinket",
            "Currency", "Haberdashery", "Hat", "Keycard", "Incense",
            "Tapestry", "Implant", "Spacetime", "Wormhole", "Pinch",
            "Caterpillar", "Nano-bot", "FuelCell", "CornCore", "Rope",
            "Fray", "Reactor", "Sauce", "Tiramisu", "Figurine",
            "Lettuce", "Medicine", "Hospital", "Motel", "Casting",
            "Ladyfinger", "Brittle", "Foodsperson", "Heist", "Tooth",
            "Parkour", "SamuraiSword", "Ninja", "Parachute", "Archaeologist",
            "Stonehenge", "Savannah", "Loincloth", "Cheetah", "Lentil",
            "Sandwich", "Bologna", "LaCroix", "Snowball", "Radiation",
            "Ink", "Pallet", "Sommelier", "Oenology", "SolarSystem",
            "Uvula", "Tartar", "FrenchFry", "OnionRing", "Aperture",
            "Goose", "Peacock", "Tuxedo", "Bargain", "Marimba",
            "Wizard", "Obsidian", "Chestnuts", "FootPasty", "Tube",
            "Jingle", "Beatbox", "KneePad", "Formaldehyde", "Dualoscope"
        ];
        return `${prefixes[Math.floor(Math.random() * prefixes.length)]}-${names[Math.floor(Math.random() * names.length)]}-${Math.floor(Math.random() * 9999)}`;
    }

    onUpdate(cb)    { this._listeners.push(cb); }
    _emitUpdate()   { this._listeners.forEach(cb => cb(this.data)); }
}

window.PodUser = new PodUserEngine();