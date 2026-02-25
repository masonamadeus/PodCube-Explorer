/**
 * degradation.js
 * Handles the temporal fraying of the PodCube Explorer interface.
 */

function initDegradation(visits) {
    // 1. Inject CSS if it doesn't exist
    if (!document.getElementById('temporal-css')) {
        const style = document.createElement('style');
        style.id = 'temporal-css';
        style.textContent = `
            :root {
                --deg-noise: 0;
                --deg-sepia: 0;
                --deg-chromatic: 0px;
                --deg-scanline-opacity: 0;
                /* Base PodCube Blue: hsl(215, 82%, 47%) */
                --deg-hue: 215;
                --deg-sat: 82%;
                --deg-light: 47%;
            }

            /* Override the base primary color with our dynamic HSL variables */
            body {
                --primary: hsl(var(--deg-hue), var(--deg-sat), var(--deg-light));
                --border: hsl(var(--deg-hue), var(--deg-sat), var(--deg-light));
            }

            /* Chromatic Aberration */
            h1, h2, h3, .ep-title, .hero-btn-text strong, .pc-share-title {
                text-shadow: 
                    calc(var(--deg-chromatic) * -1) 0 0 rgba(255, 0, 0, 0.4),
                    var(--deg-chromatic) 0 0 rgba(0, 255, 255, 0.4);
            }

            /* --- THE OVERLAY STACK --- */
            #temporal-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                pointer-events: none;
                z-index: 999999;
            }

            .temporal-layer {
                position: absolute;
                inset: 0;
                pointer-events: none;
            }

            /* 1. Yellowing/Sepia */
            #temporal-sepia {
                background-color: #c4b687; 
                opacity: var(--deg-sepia);
                mix-blend-mode: multiply;
            }

            /* 2. Grain */
            #temporal-noise {
                background-image: url('data:image/svg+xml;utf8,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noise)"/%3E%3C/svg%3E');
                opacity: var(--deg-noise);
                mix-blend-mode: multiply;
            }

            /* 3. Rolling CRT Scanlines */
            #temporal-scanlines {
                background: 
                    /* The large, slow-rolling dark band */
                    linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 50%, transparent 100%),
                    /* The tight, static 4px horizontal CRT lines */
                    linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.10) 50%);
                
                /* Size them independently: 15vh for the band, 4px for the lines */
                background-size: 100% 15vh, 100% 4px;
                
                /* KEY FIX: Do not repeat the large band to prevent snapping */
                background-repeat: no-repeat, repeat;
                
                opacity: var(--deg-scanline-opacity);
                animation: scanlineScroll 8s linear infinite;
            }

            @keyframes scanlineScroll {
                0% { background-position: 0 -15vh, 0 0; }
                100% { background-position: 0 100vh, 0 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // 2. Inject Overlay Divs (Separated layers for independent opacity)
    if (!document.getElementById('temporal-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'temporal-overlay';
        overlay.innerHTML = `
            <div class="temporal-layer" id="temporal-sepia"></div>
            <div class="temporal-layer" id="temporal-noise"></div>
            <div class="temporal-layer" id="temporal-scanlines"></div>
        `;
        document.body.appendChild(overlay);
    }

    updateDegradation(visits)
}

function updateDegradation(visits){
    applyTemporalMetrics(visits);
    startTemporalTextGlitches(visits);
}

function applyTemporalMetrics(visits) {
    const root = document.documentElement;

    const maxVisits = 100;
    const severity = Math.max(0, Math.min((visits - 10) / (maxVisits - 10), 1)); 

    // 1. Static Grain & Sepia Overlay
    root.style.setProperty('--deg-noise', (severity * 0.075).toFixed(3));
    root.style.setProperty('--deg-sepia', (severity * 0.15).toFixed(3)); 

    // 2. Brand Decay
    const newHue = 215 - (severity * 10.0);
    const newSat = 82 - (severity * 33);
    
    root.style.setProperty('--deg-hue', newHue.toFixed(0));
    root.style.setProperty('--deg-sat', `${newSat.toFixed(0)}%`);

    // 3. Chromatic Aberration
    let chromaPx = 0;
    if (visits > 30) {
        const chromaSev = Math.min((visits - 30) / 70, 1);
        chromaPx = chromaSev * 0.75;
    }
    root.style.setProperty('--deg-chromatic', `${chromaPx.toFixed(2)}px`);

    // 4. Scanlines
    let scanlineOp = 0;
    if (visits > 50) {
        const scanSev = Math.min((visits - 50) / 50, 1);
        scanlineOp = scanSev * 0.2;
    }
    root.style.setProperty('--deg-scanline-opacity', scanlineOp.toFixed(2));
}

function startTemporalTextGlitches(visits) {
    if (window._temporalGlitchInterval) {
        clearInterval(window._temporalGlitchInterval);
        window._temporalGlitchInterval = null;
    }

    if (visits < 40) return;

    const severity = Math.min((visits - 40) / 60, 1); 
    const curve = Math.pow(severity, 3);
    
    // 1. FASTER INTERVAL: Drops from 6000ms all the way down to a hyper-aggressive 50ms
    const intervalTime = 6000 - (curve * 5950); 

    // Added heavier, "structural" glitch blocks
    const glitchChars = ['‡', '¥', '§', '▓', '░', 'µ', '¢', 'ø', 'Ä', '¶', '¿', '✖', '█', '▄', '■', '▼'];

    window._temporalGlitchInterval = setInterval(() => {
        const allElements = document.querySelectorAll('h1, h2, h3, h4, .et-text, .transport-title, .ach-title, .pc-share-title, .stat-num, .ep-duration');
        
        const validTargets = Array.from(allElements).filter(el => {
            if (el.childElementCount > 0 || el.matches(':hover')) return false;
            const txt = el.textContent;
            if (!txt || txt.trim().length < 3) return false;

            const rect = el.getBoundingClientRect();
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
        });

        if (validTargets.length === 0) return;
        
        // 2. MULTIPLE TARGETS: At max severity, glitch up to 4 elements at the exact same time
        const simultaneousGlitches = Math.floor(1 + (curve * 3)); 

        for (let i = 0; i < Math.min(simultaneousGlitches, validTargets.length); i++) {
            const target = validTargets[Math.floor(Math.random() * validTargets.length)];
            const originalText = target.textContent;
            
            let charIdx;
            let attempts = 0;
            do {
                charIdx = Math.floor(Math.random() * originalText.length);
                attempts++;
            } while (originalText[charIdx] === ' ' && attempts < 10);

            // 3. MULTI-CHAR CORRUPTION: At high severity, replace chunks of text instead of just 1 character
            const glitchLength = Math.floor(1 + (Math.random() * severity * 3));
            let weirdStr = '';
            for(let g = 0; g < glitchLength; g++) {
                weirdStr += glitchChars[Math.floor(Math.random() * glitchChars.length)];
            }

            target.textContent = originalText.substring(0, charIdx) + weirdStr + originalText.substring(charIdx + glitchLength);

            // 4. CHAOTIC DURATIONS: Hold the glitch for a random amount of time (50ms to 450ms)
            const holdDuration = 50 + Math.random() * 400;
            
            setTimeout(() => {
                // Failsafe to ensure it snaps back correctly even if another glitch hit it
                if (target.textContent !== originalText) {
                    target.textContent = originalText;
                }
            }, holdDuration);
        }

    }, intervalTime);
}

window.repairTerminal = async function() {
    // 1. Create a blinding white flash element
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.inset = '0';
    flash.style.backgroundColor = '#ffffff';
    flash.style.zIndex = '99999999'; // Above absolutely everything
    flash.style.opacity = '0';
    flash.style.transition = 'opacity 0.1s ease-out'; // Fast, aggressive snap to white
    document.body.appendChild(flash);

    // 2. Force browser to register the element before animating
    void flash.offsetWidth;
    
    // 3. Trigger the flash
    flash.style.opacity = '1';

    // 4. Wait a tiny fraction of a second so the user feels the flash, then reset and reload
    setTimeout(async () => {
        PodUser.data.degradation = 0;
        
        await PodUser.save();
        window.location.reload();
    }, 150); // 150ms is just enough time to hide the page reloading behind the white screen
};