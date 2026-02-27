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
                    calc(var(--deg-chromatic) * -1) 0 0 rgba(255, 0, 0, 0.2),
                    var(--deg-chromatic) 0 0 rgba(0, 255, 255, 0.2);
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
                opacity: var(--deg-noise);
                mix-blend-mode: multiply;
            }

            /* 3. Rolling CRT Scanlines */
            #temporal-scanlines {
                /* 1. The tight, static 4px horizontal CRT lines stay put on the main div */
                background: linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.10) 50%);
                background-size: 100% 4px;
                opacity: var(--deg-scanline-opacity);

                /* Keep the moving band from creating scrollbars when it goes off-screen */
                overflow: hidden;
            }

            /* 2. The large, slow-rolling dark band gets its own layer */
            #temporal-scanlines::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;

                /* Set the size of the band */
                height: 15vh;
                background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 50%, transparent 100%);

                /* GPU-accelerated transform animation */
                animation: scanlineScroll 8s linear infinite;

                /* Tell the browser to prioritize this element for hardware acceleration */
                will-change: transform;
            }

            /* 3. Slide the element using the GPU instead of redrawing the background */
            @keyframes scanlineScroll {
                0%   { transform: translateY(-15vh); }
                100% { transform: translateY(100vh); }
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
            <div class="temporal-layer" id="temporal-noise">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <filter id="temporal-noise-filter">
                        <feTurbulence type="fractalNoise" baseFrequency="0.001" numOctaves="3"/>
                    </filter>
                    <rect width="100%" height="100%" filter="url(#temporal-noise-filter)"/>
                </svg>
            </div>
            <div class="temporal-layer" id="temporal-scanlines"></div>
        `;
        document.body.appendChild(overlay);
    }

    updateDegradation(visits)
}

function updateDegradation(visits) {
    applyTemporalMetrics(visits);
    startTemporalTextGlitches(visits);
}

function applyTemporalMetrics(visits) {
    const root = document.documentElement;

    const maxVisits = 100;
    const severity = Math.max(0, Math.min((visits - 10) / (maxVisits - 10), 1));

    // Static Grain & Sepia Overlay
    root.style.setProperty('--deg-noise', (severity * 0.15).toFixed(3));
    root.style.setProperty('--deg-sepia', (severity * 0.2).toFixed(3));

    // Brand Decay
    const newHue = 215 - (severity * 20.0);
    const newSat = 82 - (severity * 43);

    root.style.setProperty('--deg-hue', newHue.toFixed(0));
    root.style.setProperty('--deg-sat', `${newSat.toFixed(0)}%`);

    // Chromatic Aberration
    let chromaPx = 0;
    if (visits > 40) {
        const chromaSev = Math.min((visits - 40) / 100, 1);
        chromaPx = chromaSev * 3;
    }
    root.style.setProperty('--deg-chromatic', `${chromaPx.toFixed(2)}px`);

    // Scanlines
    let scanlineOp = 0;
    if (visits > 20) {
        const scanSev = Math.min((visits - 20) / 40, 1);
        scanlineOp = scanSev * 0.5;
    }
    root.style.setProperty('--deg-scanline-opacity', scanlineOp.toFixed(2));
}

function startTemporalTextGlitches(visits) {
    if (window._temporalGlitchInterval) {
        clearInterval(window._temporalGlitchInterval);
        window._temporalGlitchInterval = null;
    }

    if (visits < 50) return;

    // --- NEW: Global Epoch Tracking ---
    // This allows us to instantly invalidate all hanging timeouts when De-Gauss fires.
    window._glitchEpoch = (window._glitchEpoch || 0) + 1;
    const currentEpoch = window._glitchEpoch;

    const severity = Math.min((visits - 50) / 50, 2);
    const intervalTime = 50 + 7950 * Math.pow(1 - severity, 3);

    const glitchChars = ['‡', '¥', '§', '▓', '░', 'µ', '¢', 'ø', 'Ä', '¶', '¿', '✖', '█', '▄', '■', '▼'];

    window._temporalGlitchInterval = setInterval(() => {
        const allElements = document.querySelectorAll('h1, h2, h3, h4, .et-text, .transport-title, .ach-title, .stat-num, .ep-duration, span');

        const validTargets = Array.from(allElements).filter(el => {
            if (el.childElementCount > 0) return false;
            if (el.closest('.pc-share-card-container')) return false;
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

        const simultaneousGlitches = Math.floor(1 + (severity * 3));

        for (let i = 0; i < Math.min(simultaneousGlitches, validTargets.length); i++) {
            const target = validTargets[Math.floor(Math.random() * validTargets.length)];

            // --- NEW: Backup pristine text securely ---
            // Only captures the text the very first time the node is targeted
            if (!target.hasAttribute('data-true-text')) {
                target.setAttribute('data-true-text', target.textContent);
            }

            // Capture whatever the CURRENT text is (allowing glitches to stack and permanently corrupt!)
            const originalText = target.textContent;

            let charIdx;
            let attempts = 0;
            do {
                charIdx = Math.floor(Math.random() * originalText.length);
                attempts++;
            } while (originalText[charIdx] === ' ' && attempts < 10);

            const glitchLength = Math.floor(1 + (Math.random() * severity * 3));
            let weirdStr = '';
            for (let g = 0; g < glitchLength; g++) {
                weirdStr += glitchChars[Math.floor(Math.random() * glitchChars.length)];
            }

            target.textContent = originalText.substring(0, charIdx) + weirdStr + originalText.substring(charIdx + glitchLength);

            const holdDuration = 50 + Math.random() * 400;

            setTimeout(() => {
                // --- NEW: The Kill Switch ---
                // If a De-Gauss advanced the epoch while we were waiting, abort!
                if (window._glitchEpoch !== currentEpoch) return;

                if (target.textContent !== originalText) {
                    target.textContent = originalText;
                }
            }, holdDuration);
        }

    }, intervalTime);
}

window.repairTerminal = async function () {
    // 1. Create a blinding white flash element
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.inset = '0';
    flash.style.backgroundColor = '#ffffff';
    flash.style.zIndex = '99999999'; // Above absolutely everything
    flash.style.opacity = '0';
    flash.style.pointerEvents = 'none'; // Let clicks pass through while it fades
    flash.style.transition = 'opacity 0.1s ease-out'; // Fast, aggressive snap to white
    document.body.appendChild(flash);

    // 2. Force browser to register the element before animating
    void flash.offsetWidth;

    // 3. Trigger the visual flash
    flash.style.opacity = '1';

    // 4. Trigger the audio flash
    try {
        const buzz = new Audio('./poduser/Buzz-3.mp3');
        buzz.volume = 0.2;
        buzz.play().catch(e => console.warn('Audio play blocked:', e));
    } catch (e) {
        console.warn('Failed to load de-gauss audio:', e);
    }

    // 5. Wait a fraction of a second at peak brightness, then reset data and fade out
    setTimeout(async () => {


        // Advance the global epoch to neutralize all pending text glitch timeouts.
        window._glitchEpoch = (window._glitchEpoch || 0) + 1;

        // Safely sweep the live DOM and restore pristine text
        document.querySelectorAll('[data-true-text]').forEach(el => {
            el.textContent = el.getAttribute('data-true-text');
            el.removeAttribute('data-true-text');
        });

        // Reset the data behind the blinding flash
        PodUser.data.degradation = 0;
        await PodUser.save();
        updateDegradation(0);

        // Change to a slower, smoother transition for the fade-out
        flash.style.transition = 'opacity 1.5s ease-in';
        flash.style.opacity = '0';

        // 6. Remove the element from the DOM ONLY after the 1.5s fade finishes
        setTimeout(() => {
            if (document.body.contains(flash)) {
                document.body.removeChild(flash);
            }
        }, 1500);

    }, 150);
};