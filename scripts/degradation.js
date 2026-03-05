/**
 * degradation.js
 * Handles the temporal fraying and physical degradation of the PodCube Explorer interface.
 */

// --- STATE ---
let smudgeCanvas = null;
let smudgeCtx = null;
let smudges = [];

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
                --global-grime: 0; /* Controls physical dirt accumulation */
                
                /* Base PodCube Blue: hsla(215, 81%, 47%, 1.00) */
                --deg-hue: 215;
                --deg-sat: 81%;
                --deg-light: 47%;
            }

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

            /* --- PHYSICAL PANEL GUNK --- */
            /* Simulates dirt gathering in the edges/corners of the plastic casing */
            .panel, .registry-sidebar, .inspector-report-body, .bhs-readout-panel {
                position: relative;
            }
            
            .panel::after, .registry-sidebar::after, .inspector-report-body::after, .bhs-readout-panel::after {
                content: '';
                position: absolute;
                inset: 0;
                pointer-events: none;
                border-radius: inherit;
                
                /* The dirt gathers heavier in the corners as grime increases */
                box-shadow: inset 0 0 calc(var(--global-grime) * 40px) calc(var(--global-grime) * 10px) rgba(35, 25, 10, calc(var(--global-grime) * 0.5));
                
                /* A raw SVG fractal noise texture injected as a data URI to give the grime physical grain */
                background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
                background-blend-mode: multiply;
                
                /* Only becomes visible as the terminal ages */
                opacity: calc(var(--global-grime) * 0.4);
                z-index: 50; 
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

            #temporal-sepia {
                background-color: #c4b687; 
                opacity: var(--deg-sepia);
                mix-blend-mode: multiply;
            }

            #temporal-noise {
                opacity: var(--deg-noise);
                mix-blend-mode: multiply;
            }

            #temporal-scanlines {
                background: linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.10) 50%);
                background-size: 100% 4px;
                opacity: var(--deg-scanline-opacity);
                overflow: hidden;
            }

            #temporal-scanlines::before {
                content: '';
                position: absolute;
                top: 0; left: 0; right: 0;
                height: 15vh;
                background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 50%, transparent 100%);
                animation: scanlineScroll 8s linear infinite;
                will-change: transform;
            }

            @keyframes scanlineScroll {
                0%   { transform: translateY(-15vh); }
                100% { transform: translateY(100vh); }
            }
        `;
        document.head.appendChild(style);
    }

    // 2. Inject Screen Overlays
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

    initScreenGrime();
    updateDegradation(visits);
}

function updateDegradation(visits) {
    applyTemporalMetrics(visits);
    startTemporalTextGlitches(visits);
}

function applyTemporalMetrics(visits) {
    const root = document.documentElement;

    const maxVisits = 100;
    const severity = Math.max(0, Math.min((visits - 10) / (maxVisits - 10), 1));

    // Map severity to the physical CSS variables
    root.style.setProperty('--global-grime', severity.toFixed(3));
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

// --- PHYSICAL FINGER GREASE SYSTEM ---
function initScreenGrime() {
    if (document.getElementById('grime-canvas')) return;

    smudgeCanvas = document.createElement('canvas');
    smudgeCanvas.id = 'grime-canvas';
    
    // Position exactly behind the temporal overlay, but above everything else
    Object.assign(smudgeCanvas.style, {
        position: 'fixed',
        inset: '0',
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: '999998', 
        mixBlendMode: 'multiply',
        // The smudges are always tracked, but only become visible as the screen degrades
        opacity: 'calc(var(--global-grime) * 0.65)' 
    });
    
    document.body.appendChild(smudgeCanvas);

    // Handle screen resizing
    const resize = () => {
        smudgeCanvas.width = window.innerWidth;
        smudgeCanvas.height = window.innerHeight;
        redrawSmudges();
    };
    window.addEventListener('resize', resize);
    resize();

    // Load existing smudges from local storage
    try {
        const stored = localStorage.getItem('podcube_smudges');
        if (stored) smudges = JSON.parse(stored);
    } catch(e) {}
    redrawSmudges();

    // Track every tap/click as a physical smudge
    const addSmudge = (clientX, clientY) => {
        // Save as screen percentages so the grease stays in the right spot when you resize the window!
        const x = clientX / window.innerWidth;
        const y = clientY / window.innerHeight;
        
        // Add micro-jitter so hitting the exact same pixel spreads the grease out over time
        const jx = x + (Math.random() * 0.015 - 0.0075);
        const jy = y + (Math.random() * 0.015 - 0.0075);

        smudges.push([jx, jy]);
        
        // Limit to 400 smudges to keep performance perfect
        if (smudges.length > 400) smudges.shift(); 

        drawSingleSmudge(jx, jy);
        
        // Debounce the save to prevent hammering localStorage
        clearTimeout(window._smudgeSave);
        window._smudgeSave = setTimeout(() => {
            localStorage.setItem('podcube_smudges', JSON.stringify(smudges));
        }, 1500);
    };

    document.addEventListener('mousedown', (e) => addSmudge(e.clientX, e.clientY), {passive: true});
    document.addEventListener('touchstart', (e) => addSmudge(e.touches[0].clientX, e.touches[0].clientY), {passive: true});
}

function drawSingleSmudge(xPct, yPct) {
    if (!smudgeCtx) smudgeCtx = smudgeCanvas.getContext('2d');
    
    const cx = xPct * smudgeCanvas.width;
    const cy = yPct * smudgeCanvas.height;
    const radius = Math.random() * 15 + 20; // Smudge is 20-35px wide
    
    // Create a sickly, yellowish-brown skin oil gradient
    const grad = smudgeCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, 'rgba(60, 45, 20, 0.04)');
    grad.addColorStop(0.5, 'rgba(60, 45, 20, 0.015)');
    grad.addColorStop(1, 'rgba(60, 45, 20, 0)');
    
    smudgeCtx.fillStyle = grad;
    smudgeCtx.beginPath();
    smudgeCtx.arc(cx, cy, radius, 0, Math.PI*2);
    smudgeCtx.fill();
}

function redrawSmudges() {
    if (!smudgeCtx) smudgeCtx = smudgeCanvas.getContext('2d');
    smudgeCtx.clearRect(0, 0, smudgeCanvas.width, smudgeCanvas.height);
    smudges.forEach(s => drawSingleSmudge(s[0], s[1]));
}


function startTemporalTextGlitches(visits) {
    if (window._temporalGlitchInterval) {
        clearInterval(window._temporalGlitchInterval);
        window._temporalGlitchInterval = null;
    }

    if (visits < 50) return;

    // Epoch tracking allows us to instantly invalidate hanging timeouts on De-Gauss
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

            if (!target.hasAttribute('data-true-text')) {
                target.setAttribute('data-true-text', target.textContent);
            }

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
                if (window._glitchEpoch !== currentEpoch) return;
                if (target.textContent !== originalText) {
                    target.textContent = originalText;
                }
            }, holdDuration);
        }
    }, intervalTime);
}

window.repairTerminal = async function () {
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.inset = '0';
    flash.style.backgroundColor = '#ffffff';
    flash.style.zIndex = '99999999'; 
    flash.style.opacity = '0';
    flash.style.pointerEvents = 'none'; 
    flash.style.transition = 'opacity 0.1s ease-out'; 
    document.body.appendChild(flash);

    void flash.offsetWidth;
    flash.style.opacity = '1';

    try {
        const buzz = new Audio('./poduser/Buzz-3.mp3');
        buzz.volume = 0.2;
        buzz.play().catch(e => console.warn('Audio play blocked:', e));
    } catch (e) {}

    setTimeout(async () => {
        window._glitchEpoch = (window._glitchEpoch || 0) + 1;

        document.querySelectorAll('[data-true-text]').forEach(el => {
            el.textContent = el.getAttribute('data-true-text');
            el.removeAttribute('data-true-text');
        });

        // 1. Reset Internal Degradation
        PodUser.data.degradation = 0;
        await PodUser.save();
        updateDegradation(0);
        
        // 2. Wipe the screen with a microfiber cloth!
        smudges = [];
        localStorage.removeItem('podcube_smudges');
        redrawSmudges();

        flash.style.transition = 'opacity 1.5s ease-in';
        flash.style.opacity = '0';

        setTimeout(() => {
            if (document.body.contains(flash)) {
                document.body.removeChild(flash);
            }
        }, 1500);

    }, 150);
};