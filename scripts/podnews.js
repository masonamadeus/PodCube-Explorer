/**
 * podnews.js
 * The Wexton Intranet Feed Engine
 */

const PodNews = (function () {

    const MANIFEST_URL = "./pages/intranet.json";

    // --- POPULATE THE HERO CARD (Unchanged) ---
    function populateHeroCard() {
        const nearestEps = PodCube.getNearestToToday();
        
        if (nearestEps && nearestEps.length > 0) {
            const ep = nearestEps[0];
            document.getElementById('news-hero-anniversary-distance').textContent = ep.anniversary;
            document.getElementById('news-hero-title').textContent = ep.title;
            document.getElementById('news-hero-meta').textContent = `${ep.date?.toString() || 'Unknown Date'} • ${ep.model || 'Unknown Model'}`;
            
            const playBtn = document.getElementById('news-hero-play');
            playBtn.onclick = () => {
                run(`PodCube.play(PodCube.findEpisode('${ep.id}'))`);
                toggleAutoplayMode(true); 
            };
        }
    }

    // --- TEMPORAL AVAILABILITY CHECKER ---
    function isSiteAvailable(availability) {
        if (!availability) return true; // If no rules, it's always live
        
        const now = new Date();
        const m = now.getMonth() + 1; // 1-12
        const d = now.getDate();
        const h = now.getHours();
        const mins = now.getMinutes();

        // 1. Month Check
        if (availability.months && availability.months.length === 2) {
            const [startM, endM] = availability.months;
            if (m < startM || m > endM) return false;
        }

        // 2. Day Check
        if (availability.days && availability.days.length === 2) {
            const [startD, endD] = availability.days;
            if (d < startD || d > endD) return false;
        }

        // 3. Time Check
        if (availability.times && availability.times.length === 2) {
            const currentMins = (h * 60) + mins;
            
            const [sH, sM] = availability.times[0].split(':').map(Number);
            const [eH, eM] = availability.times[1].split(':').map(Number);
            
            const startTotal = (sH * 60) + sM;
            const endTotal = (eH * 60) + eM;

            if (startTotal <= endTotal) {
                // Standard daytime range (e.g. 09:00 to 17:00)
                if (currentMins < startTotal || currentMins > endTotal) return false;
            } else {
                // Overnight range (e.g. 22:00 to 04:00)
                if (currentMins < startTotal && currentMins > endTotal) return false;
            }
        }

        return true;
    }

    async function fetchLiveFeed() {
        const loadingEl = document.getElementById('live-feed-loading');
        const contentEl = document.getElementById('live-feed-content');

        if (!loadingEl || !contentEl) return;

        try {
            if (typeof logCommand === 'function') logCommand("// INTRANET: Polling manifest for temporal availability...");

            // Fetch the compiled Intranet JSON
            const response = await fetch(`${MANIFEST_URL}?cachebust=${Date.now()}`);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            const allSites = await response.json();

            // Filter out sites that aren't available right now
            const liveSites = allSites.filter(site => isSiteAvailable(site.availability));

            // Randomize the array (Fisher-Yates Shuffle)
            for (let i = liveSites.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [liveSites[i], liveSites[j]] = [liveSites[j], liveSites[i]];
            }

            // Pick a random selection (e.g. top 3 sites) to populate the feed
            const displaySites = liveSites.slice(0, 3);
            
            renderLiveFeed(displaySites);

            loadingEl.style.display = 'none';
            contentEl.style.display = 'flex';
            
            if (typeof logCommand === 'function') {
                logCommand(`// INTRANET: Rendered ${displaySites.length} active nodes.`);
            }

        } catch (error) {
            loadingEl.textContent = "ERROR: UPLINK SEVERED.";
            loadingEl.style.color = "var(--danger)";
            console.error("PodNews Fetch Error:", error);
        }
    }

    function renderLiveFeed(records) {
        const contentEl = document.getElementById('live-feed-content');
        const template = document.getElementById('tmpl-news-card');
        
        if (!contentEl || !template) return;
        contentEl.innerHTML = ''; 

        if (records.length === 0) {
            contentEl.innerHTML = `<div style="text-align:center; padding: 20px; color: #888;">No Intranet nodes responding at your current ISWORM coordinates.</div>`;
            return;
        }

        records.forEach((rec) => {
            const clone = document.importNode(template.content, true);
            
            clone.querySelector('.news-headline').textContent = rec.headline || "Untitled Node";
            
            // Randomly generated REF ID for aesthetic flair
            const fakeId = `REF: WX-${Math.floor(Math.random() * 9000) + 1000}`;
            clone.querySelector('.news-id').textContent = fakeId;
            
            clone.querySelector('.news-content').textContent = rec.summary || "";

            // Link to launch PodBrowser!
            const linkContainer = clone.querySelector('.news-link-container');
            if (rec.id) {
                linkContainer.style.display = 'block';
                linkContainer.innerHTML = `
                    <button class="icon-btn" onclick="PodBrowser.open('${rec.id}')" style="border-color: var(--primary); color: var(--primary); font-weight: bold; font-family: 'Fustat', sans-serif;">
                        ACCESS INTRANET LINK ↗
                    </button>
                `;
            }

            contentEl.appendChild(clone);
        });
    }

    return {
        init: function () {
            populateHeroCard();
            fetchLiveFeed();
        },
        refresh: fetchLiveFeed
    };

})();

// Boot it up when the core engine is ready
window.addEventListener('PodCube:Ready', () => {
    PodNews.init();
});