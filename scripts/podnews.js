/**
 * podnews.js
 * The Brigistics Live Intranet Feed (Google Sheets TSV Backend)
 */

const PodNews = (function () {

    const SHEET_TSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTYkZkmYBH3CYJT95LsneNg6QjCJMGtOuQvsTIsH5Nq1pfMroDVym0lJX3AxHAEBe-xUuisLIErrIBz/pub?output=tsv";

    // --- POPULATE THE HERO CARD ---
    function populateHeroCard() {
        // Grab the closest episode using the core engine API
        const nearestEps = PodCube.getNearestToToday();

        console.log(nearestEps);
        
        if (nearestEps && nearestEps.length > 0) {
            const ep = nearestEps[0];
            
            // Populate text
            document.getElementById('news-hero-anniversary-distance').textContent = ep.anniversary;
            document.getElementById('news-hero-title').textContent = ep.title;
            document.getElementById('news-hero-meta').textContent = `${ep.date?.toString() || 'Unknown Date'} • ${ep.model || 'Unknown Model'}`;
            
            // Wire up the Play button
            const playBtn = document.getElementById('news-hero-play');
            playBtn.onclick = () => {
                run(`PodCube.play(PodCube.findEpisode('${ep.id}'))`);
                toggleAutoplayMode(true); // Optional: turn on radio mode so it keeps playing after
            };
        }
    }

    async function fetchLiveFeed() {
        const loadingEl = document.getElementById('live-feed-loading');
        const contentEl = document.getElementById('live-feed-content');

        if (!loadingEl || !contentEl) return;

        try {
            if (typeof logCommand === 'function') {
                logCommand("// INTRANET: Polling mainframe for updates...");
            }

            const response = await fetch(`${SHEET_TSV_URL}&cachebust=${Date.now()}`);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            const tsvText = await response.text();
            const data = parseTSV(tsvText);

            const validData = data.filter(row => {
                // Check if VISIBLE exists and equals 'true' (case-insensitive)
                const isVisible = row.VISIBLE && row.VISIBLE.trim().toLowerCase() === 'true';
                const hasHeadline = row.HEADLINE && row.HEADLINE.trim() !== '';
                return isVisible && hasHeadline;
            });
            renderLiveFeed(validData);

            loadingEl.style.display = 'none';
            contentEl.style.display = 'flex';
            
            if (typeof logCommand === 'function') {
                logCommand(`// INTRANET: Successfully retrieved ${validData.length} records.`);
            }

        } catch (error) {
            loadingEl.textContent = "ERROR: UPLINK SEVERED.";
            loadingEl.style.color = "var(--danger)";
            console.error("PodNews Fetch Error:", error);
        }
    }

    function parseTSV(str) {
        const rows = str.trim().split('\n');
        if (rows.length < 2) return []; 

        const headers = rows[0].split('\t').map(h => h.trim().toUpperCase());
        const result = [];

        for (let i = 1; i < rows.length; i++) {
            const currentLine = rows[i].split('\t');
            const obj = {};
            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = currentLine[j] ? currentLine[j].trim() : "";
            }
            result.push(obj);
        }
        return result;
    }

function renderLiveFeed(records) {
        const contentEl = document.getElementById('live-feed-content');
        const template = document.getElementById('tmpl-news-card');
        
        if (!contentEl || !template) return;
        contentEl.innerHTML = ''; 
        
        // Reverse array so newest are on top
        const reversedRecords = [...records].reverse();

        reversedRecords.forEach((rec, index) => {
            const clone = document.importNode(template.content, true);
            
            clone.querySelector('.news-headline').textContent = rec.HEADLINE || "Untitled";
            
            // AUTO-GENERATE A FAKE ID based on the total records and current index
            // Results in something like "REF: PN-0014"
            const fakeId = `PN-${(records.length - index).toString().padStart(4, '0')}`;
            clone.querySelector('.news-id').textContent = `REF: ${fakeId}`;
            
            clone.querySelector('.news-content').textContent = rec.CONTENT || "";

            // --- MEDIA HANDLING ---
            const mediaContainer = clone.querySelector('.news-media-container');
            const mediaData = formatMediaUrl(rec.FILE); // Pass the raw string through our formatter
            
            if (mediaData.url) {
                mediaContainer.style.display = 'block';
                const lowerUrl = mediaData.url.toLowerCase();
                
                // If it's a Drive file, we assume it's an image. 
                // Otherwise, check standard file extensions.
                if (mediaData.isDriveFile || lowerUrl.match(/\.(jpeg|jpg|gif|png|webp)$/)) {
                    mediaContainer.innerHTML = `<img src="${mediaData.url}" style="width: 100%; height: auto; display: block;" alt="Attached Image">`;
                } 
                else if (lowerUrl.match(/\.(mp3|wav|ogg)$/)) {
                    mediaContainer.innerHTML = `
                        <audio controls style="width: 100%; height: 40px; margin: 10px 0;">
                            <source src="${mediaData.url}" type="audio/mpeg">
                        </audio>`;
                } 
                else if (lowerUrl.match(/\.(mp4|webm)$/)) {
                    mediaContainer.innerHTML = `
                        <video controls style="width: 100%; height: auto; display: block;">
                            <source src="${mediaData.url}" type="video/mp4">
                        </video>`;
                } 
                else {
                    mediaContainer.innerHTML = `
                        <div style="padding: 10px; text-align: center;">
                            <a href="${mediaData.url}" target="_blank" class="hero-btn" style="text-decoration:none; display:inline-block;">
                                <strong>VIEW ATTACHMENT</strong>
                            </a>
                        </div>`;
                }
            }

            // LINK HANDLING
            const linkContainer = clone.querySelector('.news-link-container');
            const linkPayload = rec.LINK; // From your new sheet column!
            if (linkPayload) {
                linkContainer.style.display = 'block';
                // Uses the refactored openBrowser function
                linkContainer.innerHTML = `
                    <button class="icon-btn" onclick="PodBrowser.open('${linkPayload}')" style="border-color: var(--primary); color: var(--primary); font-weight: bold; font-family: 'Fustat', sans-serif;">
                        ACCESS INTRANET LINK ↗
                    </button>
                `;
            }

            contentEl.appendChild(clone);
        });
    }


    /**
     * Automatically converts standard Google Drive viewer links into raw image streams.
     * Returns an object with the corrected URL and a flag if it's a Drive file.
     */
    function formatMediaUrl(rawUrl) {
        if (!rawUrl) return { url: null, isDriveFile: false };
        
        let url = rawUrl.trim();
        let isDriveFile = false;

        // RegEx looks for "file/d/ID" or "open?id=ID" inside a drive.google.com link
        const driveMatch = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
        
        if (driveMatch && driveMatch[1]) {
            const fileId = driveMatch[1];
            // Convert to Google's undocumented direct-download endpoint
            url = `https://drive.google.com/uc?export=view&id=${fileId}`;
            isDriveFile = true;
        }

        return { url, isDriveFile };
    }

    return {
        init: function () {
            // Populate the static UI elements first
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