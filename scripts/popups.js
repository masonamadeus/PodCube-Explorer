const PodAds = (function() {
    
    // --- AD CONFIGURATION ---
    const AD_INVENTORY = [
        { src: './ads/SLOWTACO (1).jpg', payload: 'slowtaco' },
        { src: './ads/SLOWTACO (2).jpg', payload: 'slowtaco' },
        { src: './ads/SLOWTACO (3).jpg', payload: 'slowtaco' },
        { src: './ads/SLOWTACO (4).jpg', payload: 'slowtaco' },
        { src: './ads/SLOWTACO (5).jpg', payload: 'slowtaco' },
        { src: './ads/SLOWTACO (6).jpg', payload: 'slowtaco' },
        { src: './ads/SLOWTACO (7).jpg', payload: 'slowtaco' },
        { src: './ads/SLOWTACO (8).jpg', payload: 'slowtaco' },
        { src: './ads/SLOWTACO (9).jpg', payload: 'slowtaco' },
        { src: './ads/SLOWTACO (10).jpg', payload: 'slowtaco' },
        { src: './ads/DUSTYS (1).jpg', payload: 'dustys' },
        { src: './ads/DUSTYS (2).jpg', payload: 'dustys' },
        { src: './ads/DUSTYS (3).jpg', payload: 'dustys' },
        { src: './ads/DUSTYS (4).jpg', payload: 'dustys' },
        { src: './ads/DUSTYS (5).jpg', payload: 'dustys' },
        { src: './ads/DUSTYS (6).jpg', payload: 'dustys' },
        { src: './ads/DUSTYS (7).jpg', payload: 'dustys' },
        { src: './ads/DUSTYS (8).jpg', payload: 'dustys' },
    ];

    const MIN_LISTENS_REQUIRED = 5;      // Must have listened to X transmissions before ads start
    const CHECK_INTERVAL_MS = 120000;     // Evaluates whether to show an ad every X minutes
    const AD_PROBABILITY = .01;         // % chance to trigger an ad during an evaluation
    const COOLDOWN_MS = 30 * 60 * 1000;  // Minimum of 15 minutes between ads so it isn't obnoxious

    // --- STATE ---
    let lastAdTime = 0;
    let isAdActive = false;
    let engineInterval = null;

    // --- INJECT IN-UNIVERSE CSS ---
    function injectAdStyles() {
        if (document.getElementById('podcube-ad-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'podcube-ad-styles';
        style.textContent = `
            .pric-ad-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.25);
                backdrop-filter: blur(4px);
                z-index: 9999999;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease-out;
            }

            .pric-ad-overlay.visible { opacity: 1; }

            /* --- POLISHED HARDWARE CASE --- */
            .pric-ad-window {
                background: #d4d0c8; 
                border: 1px solid rgba(0,0,0,0.15);
                border-radius: 6px;
                /* High-polish 3D shadows */
                box-shadow: 
                    0 20px 50px rgba(0,0,0,0.3), 
                    inset 1px 1px 0px rgba(255,255,255,0.9), 
                    inset -1px -1px 0px rgba(0,0,0,0.1);
                max-width: 500px;
                width: 90%;
                padding: 20px;
                display: flex;
                flex-direction: column;
                position: relative;
                transform: scale(0.95) translateY(10px);
                transition: transform 0.4s cubic-bezier(0.2, 1, 0.3, 1);
            }

            .pric-ad-overlay.visible .pric-ad-window {
                transform: scale(1) translateY(0);
            }

            /* --- RECESSED "SCREEN" WITH SCANLINES --- */
            .pric-ad-screen-well {
                background: #fdfdfc; /* Brighter screen background */
                border-radius: 4px;
                border: 1px solid rgba(0,0,0,0.1);
                box-shadow: inset 0 2px 8px rgba(0,0,0,0.15);
                display: flex;
                justify-content: center;
                align-items: center;
                margin-bottom: 15px;
                position: relative;
                overflow: hidden;
            }

            /* The Scanline Overlay */
            .pric-ad-screen-well::after {
                content: '';
                position: absolute;
                inset: 0;
                pointer-events: none;
                /* 4px repeating scanline pattern */
                background: repeating-linear-gradient(
                    to bottom,
                    transparent 0,
                    transparent 2px,
                    rgba(0, 0, 0, 0.03) 2px,
                    rgba(0, 0, 0, 0.03) 4px
                );
                z-index: 5;
            }

            .pric-ad-image {
                max-width: 100%;
                max-height: 55vh;
                object-fit: contain;
                border: 1px solid #ddd;
                z-index: 2;
                background: #fff;
            }

            /* --- REFINED CONTROLS --- */
            .pric-ad-controls {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-top: 10px;
                border-top: 1px solid rgba(0,0,0,0.05);
            }

            .pric-ad-label {
                font-family: 'Fustat', sans-serif;
                font-size: 11px;
                font-weight: 700;
                color: #8c8881;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }

            .pric-ad-close-btn {
                background: var(--primary, #1768da);
                color: #fff;
                border: none;
                padding: 6px 20px;
                font-family: 'Fustat', sans-serif;
                font-weight: 700;
                font-size: 12px;
                border-radius: 4px;
                cursor: pointer;
                text-transform: uppercase;
                /* Clean hardware depth */
                box-shadow: 
                    0 3px 0px #0b4a9e,
                    0 4px 10px rgba(0,0,0,0.15);
                transition: all 0.1s;
            }

            .pric-ad-close-btn:active {
                transform: translateY(2px);
                box-shadow: 0 1px 0px #0b4a9e;
            }
            
            .pric-ad-status-light {
                width: 7px; height: 7px;
                background: #ff4400;
                border-radius: 50%;
                display: inline-block;
                margin-right: 6px;
                box-shadow: 0 0 4px rgba(255, 68, 0, 0.6);
                animation: adPulse 0.8s infinite alternate;
            }

            @keyframes adPulse { from { opacity: 0.5; } to { opacity: 1; } }
        `;
        document.head.appendChild(style);
    }

    function triggerAd() {
        if (AD_INVENTORY.length === 0) return;
        
        isAdActive = true;
        lastAdTime = Date.now();
        const targetAd = AD_INVENTORY[Math.floor(Math.random() * AD_INVENTORY.length)];

        const overlay = document.createElement('div');
        overlay.className = 'pric-ad-overlay';
        
        overlay.innerHTML = `
            <div class="pric-ad-window" onclick="event.stopPropagation()">
                <div class="pric-ad-label" style="margin-bottom:12px; display:flex; align-items:center;">
                    <span class="pric-ad-status-light"></span> 
                    PodCube™ Sponsored Product
                </div>

                <div class="pric-ad-screen-well">
                    <img src="${targetAd.src}" class="pric-ad-image" alt="Sponsored Content" style="cursor: pointer;" />
                </div>

                <div class="pric-ad-controls">
                    <div class="pric-ad-label" style="opacity:0.6;">BRIGISTICS AD-SERV V4.2</div>
                    <button class="pric-ad-close-btn">Acknowledge</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        void overlay.offsetWidth;
        overlay.classList.add('visible');

        const closeAd = () => {
            overlay.classList.remove('visible');
            setTimeout(() => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                isAdActive = false;
            }, 300);
        };

        const adImage = overlay.querySelector('.pric-ad-image');
        adImage.addEventListener('click', () => {
            closeAd(); // Dismiss the popup
            // openAd(targetAd.payload); // Fire the payload action!
        });

        overlay.querySelector('.pric-ad-close-btn').addEventListener('click', closeAd);
        overlay.addEventListener('click', closeAd);
    }

    function evaluateAdTrigger() {
        if (isAdActive) return;
        const listenCount = (window.PodUser && window.PodUser.data?.history) ? window.PodUser.data.history.length : 0;
        if (listenCount < MIN_LISTENS_REQUIRED) return;
        if (Date.now() - lastAdTime < COOLDOWN_MS) return;

        // Protection check: Do not show if interactive module is active
        const interactiveTab = document.getElementById('interactive');
        if (interactiveTab && interactiveTab.classList.contains('active')) return;

        if (Math.random() < AD_PROBABILITY) triggerAd();
    }

    function openAd(payload) {
        if (!payload) return; // Do nothing if it's just a generic image
        
        if (typeof logCommand === 'function') {
            logCommand(`// AD-SERV: Executing redirect payload [${payload.toUpperCase()}]...`);
        }

        if (PodBrowser){
            PodBrowser.open(payload);
        }
    }

    return {
        init: function() {
            injectAdStyles();
            if (engineInterval) clearInterval(engineInterval);
            engineInterval = setInterval(evaluateAdTrigger, CHECK_INTERVAL_MS);
        },
        test: triggerAd 
    };



})();
// Boot it up when the core engine is ready
window.addEventListener('PodCube:Ready', () => {
    PodAds.init();
});