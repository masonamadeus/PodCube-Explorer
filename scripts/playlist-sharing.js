const PlaylistSharing = {

    /**
     * Helper to build the invisible DOM element for the card.
     */
    createCardElement: function(exportData) {
        const card = document.createElement('div');
        card.className = 'pc-share-card-container';
        
        // FIX: Use absolute positioning at 0,0 with deep negative z-index
        // This prevents viewport clipping issues common with 'fixed' off-screen elements
        card.style.position = 'absolute';
        card.style.left = '-9999px'; 
        card.style.top = '-9999px';
        card.style.zIndex = '-9999px'; 
        
        // Force width to match CSS
        card.style.width = '400px'; 
        
        card.innerHTML = `
            <div class="pc-share-card-bg"></div>
            <div class="pc-share-header">PodCube™</div>
            <div class="pc-share-body">
                <div class="pc-share-title">${escapeHtml(exportData.name)}</div>
                <div class="pc-share-meta">${exportData.episodes.length} Transmissions</div>
                <div class="pc-share-meta">Duration: ${formatTime(exportData.totalDuration)}</div>
                <div class="pc-share-qr-frame">
                    <div class="cardQrTarget"></div>
                </div>
            </div>
            <div class="pc-share-footer">
                <span class="pc-share-label">COPY/PASTE THIS CARD INTO POWEREDBYPODCUBE.COM</span>
                <div class="pc-share-code-box">${exportData.code}</div>
            </div>
        `;

        if (window.QRCode) {
            const qrDiv = card.querySelector('.cardQrTarget');
            new QRCode(qrDiv, {
                text: exportData.url,
                width: 200,
                height: 200,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M
            });
        }
        
        return card;
    },

    /**
     * ROBUST PUNCH: Creates a new canvas and clips the image to the specific shape.
     * CSS Reference: clip-path: polygon(0 0, calc(100% - 100px) 0, 100% 125px, 100% 100%, 0 100%);
     */
    reshapeCanvas: function(sourceCanvas) {
        // Config
        const padding = 40; 
        const shadowBlur = 25;
        
        // 1. Setup Destination Canvas
        const canvas = document.createElement('canvas');
        canvas.width = sourceCanvas.width + (padding * 2);
        canvas.height = sourceCanvas.height + (padding * 2);
        const ctx = canvas.getContext('2d');

        const x = padding;
        const y = padding;
        const w = sourceCanvas.width;
        const h = sourceCanvas.height;
        
        // Cut Size (Scale 2x)
        const cutW = 125 * 2; 
        const cutH = 125 * 2; 

        // 2. DEFINE THE SHAPE PATH
        // We reuse this path for both the shadow and the clip
        ctx.beginPath();
        ctx.moveTo(x, y);                   // Top Left
        ctx.lineTo(x + w - cutW, y);        // Top Edge (Start of Cut)
        ctx.lineTo(x + w, y + cutH);        // Right Edge (End of Cut)
        ctx.lineTo(x + w, y + h);           // Bottom Right
        ctx.lineTo(x, y + h);               // Bottom Left
        ctx.closePath();

        // 3. DRAW SHADOW (Before Clipping)
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetX = 12;
        ctx.shadowOffsetY = 12;
        ctx.fillStyle = "#ffffff";
        ctx.fill(); // Draws the white shape + shadow
        ctx.restore();

        // 4. CLIP & DRAW CONTENT
        // Anything drawn after this will be confined to the shape
        ctx.save();
        ctx.clip(); 
        ctx.drawImage(sourceCanvas, x, y);
        ctx.restore(); // Release the clip so we can draw the border on top

        // 5. DRAW BORDER
        // We redraw the path just to stroke the line
        ctx.beginPath();
        ctx.moveTo(x + w - cutW, y+4);      // Start of cut
        ctx.lineTo(x + w-4, y + cutH);      // End of cut
        
        ctx.lineWidth = 8;               // 16px (matches CSS 8px visual at 2x scale)
        ctx.strokeStyle = "#1768da";
        ctx.lineCap = "round";
        ctx.stroke();

        return canvas;
    },

    open: function(playlistName) {
        const exportData = PodCube.exportPlaylist(playlistName);
        if (!exportData) {
            alert("Could not export playlist. It may be empty or invalid.");
            return;
        }

        const panel = document.getElementById('sharingSectionPanel');
        const content = document.getElementById('sharingContent');
        if (!panel || !content) return;

        content.innerHTML = `
            <div class="sharing-diagnostic-wrapper">
                <div class="card-preview-area">
                     <div class="pc-share-card-container active-preview">
                        <div class="pc-share-header">PodCube™ PUNCHCARD</div>
                        <div class="pc-share-body">
                            <div class="pc-share-title">${escapeHtml(exportData.name)}</div>
                            <div id="qrPreviewContainer"></div>
                        </div>
                        <div class="pc-share-footer" onclick="copyToClipboard('shareCodeTarget')">
                            <span class="pc-share-label">CLICK TO COPY NANO-GUID</span>
                            <div class="pc-share-code-box" id="shareCodeTarget">${exportData.code}</div>
                        </div>
                     </div>
                </div>
                <div class="sharing-controls">
                    <button class="hero-btn" onclick="PlaylistSharing.exportToClipboard('${escapeForAttribute(playlistName)}')">
                        <strong>EXPORT PUNCHCARD</strong>
                        <span>Copy Link & Card Image</span>
                    </button>
                    <button class="hero-btn" onclick="renamePlaylistUI('${escapeForAttribute(playlistName)}')">
                        <strong>RECLASSIFY RECORD</strong>
                        <span>Rename Punchcard</span>
                    </button>
                </div>
            </div>
        `;

        setTimeout(() => {
            const container = document.getElementById('qrPreviewContainer');
            if (container && window.QRCode) {
                container.innerHTML = '';
                new QRCode(container, {
                    text: exportData.url,
                    width: 200,
                    height: 200,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.M
                });
            }
        }, 50);

        panel.style.display = 'block';
        panel.scrollIntoView({ behavior: 'smooth' });
    },

    exportToClipboard: async function(playlistName) {
        // 1. We ONLY abort if the rendering engine is missing entirely.
        if (!window.html2canvas) {
             alert("Visualization library missing. Falling back to direct download.");
             this.downloadImage(playlistName);
             return;
        }

        const exportData = PodCube.exportPlaylist(playlistName);
        if (!exportData) return;

        const cards = document.querySelectorAll('.pc-share-card-container');
        let targetCard = null;
        cards.forEach(c => {
            if (c.querySelector('.pc-share-title')?.textContent.trim() === playlistName) targetCard = c;
        });

        const btn = typeof event !== 'undefined' ? event?.currentTarget : null;
        const originalBtnText = btn ? btn.textContent : 'EXPORT';
        
        if (btn) {
            btn.classList.add('is-exporting');
            btn.textContent = '...';
        }

        // Determine device type and capabilities
        const isDesktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
        const canUseClipboard = window.navigator && window.navigator.clipboard && typeof window.navigator.clipboard.write === 'function';

        const cardElement = this.createCardElement(exportData);
        document.body.appendChild(cardElement);

        // Helper: Heavy lifting generation
        const makeImagePromise = async () => {
            const rawCanvas = await html2canvas(cardElement, { 
                scale: 2, backgroundColor: null, useCORS: true, logging: false, scrollX: 0, scrollY: 0
            });
            const finalCanvas = this.reshapeCanvas(rawCanvas);
            return new Promise(res => finalCanvas.toBlob(res, 'image/png'));
        };

        if (isDesktop && canUseClipboard) {
            // ==========================================
            // DESKTOP FLOW: In-Card Scanner Overlay
            // ==========================================
            let overlay = document.createElement('div');
            overlay.className = 'pc-exporting-overlay';
            overlay.innerHTML = `
                <div class="pc-export-scanner-line"></div>
                <div class="pc-export-status-text">GENERATING PHYSICAL RECORD...</div>
            `;
            if (targetCard) targetCard.appendChild(overlay);

            // Execute rendering in background but resolve it later
            const imagePromise = makeImagePromise().then(blob => {
                if (cardElement.parentNode) cardElement.parentNode.removeChild(cardElement);
                return blob;
            });

            const successFeedback = () => {
                if (window.PodUser) window.PodUser.logPunchcardExport();
                if (typeof logCommand !== 'undefined') logCommand(`// EXPORT SUCCESS: PUNCHCARD ADDED TO CLIPBOARD.`);
                if (btn) btn.textContent = 'COPIED!';
                
                overlay.querySelector('.pc-export-scanner-line').style.display = 'none';
                overlay.querySelector('.pc-export-status-text').innerHTML = `
                    COPIED TO CLIPBOARD.<br>
                    PASTE ANYWHERE TO SHARE.<br>
                    PASTE INTO PUNCH CARD READER TO UPLOAD.
                `;
                overlay.style.background = 'rgba(23, 104, 218, 0.9)';
                
                setTimeout(() => {
                    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    if (btn) { btn.classList.remove('is-exporting'); btn.textContent = originalBtnText; }
                }, 3500);
            };

            try {
                // Primary Method: Synchronous Promise assignment (Required for Desktop Safari)
                const clipboardItem = new ClipboardItem({
                    "image/png": imagePromise,
                    "text/plain": Promise.resolve(new Blob([exportData.url], {type: 'text/plain'}))
                });
                await navigator.clipboard.write([clipboardItem]);
                successFeedback();

            } catch (err) {
                // Fallback: Older versions of Chrome/Firefox reject Promises in ClipboardItems.
                if (err.name === 'TypeError') {
                    try {
                        const blob = await imagePromise; // Await the generation here
                        const textBlob = new Blob([exportData.url], {type: 'text/plain'});
                        const fallbackItem = new ClipboardItem({ "image/png": blob, "text/plain": textBlob });
                        await navigator.clipboard.write([fallbackItem]);
                        successFeedback();
                    } catch (fallbackErr) {
                        console.error("Desktop copy failed", fallbackErr);
                        if (btn) btn.textContent = 'FAILED';
                        this.downloadImage(playlistName);
                        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    }
                } else {
                    console.error("Desktop copy failed", err);
                    if (btn) btn.textContent = 'FAILED';
                    this.downloadImage(playlistName);
                    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
                }
            }

        } else {
            // ==========================================
            // MOBILE FLOW: Full-Screen Modal
            // ==========================================
            const overlay = document.createElement('div');
            Object.assign(overlay.style, {
                position: 'fixed', inset: '0', zIndex: '9999999',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(15, 20, 30, 0.85)', backdropFilter: 'blur(6px)',
                pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none',
                opacity: '0', transition: 'opacity 0.3s ease'
            });

            overlay.innerHTML = `
                <div style="width: 250px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; position: relative;">
                    <div style="position: absolute; top: 0; left: 0; height: 100%; width: 40%; background: var(--primary); animation: splashLoad 1s infinite linear;"></div>
                </div>
                <div style="color: #fff; font-family: 'Fustat', sans-serif; font-size: 14px; font-weight: bold; letter-spacing: 0.05em; text-transform: uppercase; margin-top: 20px;">
                    GENERATING PUNCHCARD...
                </div>
            `;
            document.body.appendChild(overlay);

            void overlay.offsetWidth;
            overlay.style.opacity = '1';

            try {
                const imageBlob = await makeImagePromise();
                const textBlob = new Blob([exportData.url], {type: 'text/plain'});
                if (cardElement.parentNode) cardElement.parentNode.removeChild(cardElement);

                const cleanup = () => {
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                        if (btn) { btn.classList.remove('is-exporting'); btn.textContent = originalBtnText; }
                    }, 300); 
                };

                const successFeedback = () => {
                    if (window.PodUser) window.PodUser.logPunchcardExport();
                    if (typeof logCommand !== 'undefined') logCommand(`// EXPORT SUCCESS: PUNCHCARD ADDED TO CLIPBOARD.`);
                    if (btn) btn.textContent = 'COPIED!';
                    overlay.innerHTML = `
                        <div style="color:#fff; text-shadow: 0 2px 4px rgba(0,0,0,0.5); font-family: 'Fustat', sans-serif; font-size: 16px; font-weight: bold; text-align: center; text-transform: uppercase; letter-spacing: 0.05em;">
                            COPIED TO CLIPBOARD.<br><br>PASTE ANYWHERE TO SHARE.
                        </div>
                    `;
                    setTimeout(cleanup, 2500);
                };

                const imgUrl = URL.createObjectURL(imageBlob);
                overlay.style.pointerEvents = 'auto'; 
                
                overlay.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; padding: 20px; box-sizing: border-box;">
                        <img src="${imgUrl}" style="
                            max-width: 90%; max-height: 55vh; object-fit: contain;
                            border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;
                            box-shadow: 0 20px 50px rgba(0,0,0,0.6); margin-bottom: 30px; display: block;
                            pointer-events: auto; -webkit-touch-callout: default; 
                        " alt="Punchcard Preview" />
                        
                        ${canUseClipboard ? `
                            <button id="pc-sync-copy-btn" class="hero-btn" style="width: auto; padding: 12px 30px; box-shadow: 0 5px 20px rgba(0,0,0,0.5); border-radius: 4px; border-color: var(--primary);">

                                <span class="hero-btn-text" style="text-align: left;">
                                    <strong style="font-size: 14px; font-family: 'Libertinus Math';">COPY PUNCHCARD</strong>
                                </span>
                            </button>
                        ` : ''}

                        <div style="margin-top: 25px; font-family: 'Fustat'; font-size: 11px; font-weight: bold; color: #aaa; text-transform: uppercase; letter-spacing: 0.05em; text-align: center; line-height: 1.8;">
                            LONG-PRESS IMAGE TO SAVE/SHARE<br>
                            <button id="pc-close-overlay-btn" style="background: transparent; color: var(--danger); border: 1px solid var(--danger); padding: 8px 20px; font-family: 'Fustat', sans-serif; font-weight: bold; font-size: 11px; cursor: pointer; border-radius: 4px; margin-top: 15px; text-transform: uppercase; transition: background 0.2s;">CLOSE</button>
                        </div>
                    </div>
                `;

                overlay.querySelector('#pc-close-overlay-btn').addEventListener('click', () => {
                    URL.revokeObjectURL(imgUrl);
                    cleanup();
                });

                if (canUseClipboard) {
                    const copyBtn = overlay.querySelector('#pc-sync-copy-btn');
                    copyBtn.addEventListener('click', async () => {
                        try {
                            const item = new ClipboardItem({ "image/png": imageBlob, "text/plain": textBlob });
                            await navigator.clipboard.write([item]);
                            URL.revokeObjectURL(imgUrl);
                            successFeedback();
                        } catch (copyErr) {
                            console.error("Sync copy failed", copyErr);
                            copyBtn.querySelector('strong').textContent = "ERROR: DOWNLOADING...";
                            setTimeout(() => {
                                PlaylistSharing.downloadImage(playlistName);
                                URL.revokeObjectURL(imgUrl);
                                cleanup();
                            }, 1500);
                        }
                    });
                }

            } catch (e) {
                console.error("Mobile generation failed", e);
                if (btn) btn.textContent = 'FAILED';
                this.downloadImage(playlistName);
                if (cardElement && cardElement.parentNode) cardElement.parentNode.removeChild(cardElement);
                if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }
        }
    },

    downloadImage: async function(playlistName) {
        if (!window.html2canvas) {
             alert("Visualization library missing (html2canvas).");
             return;
        }
        const exportData = PodCube.exportPlaylist(playlistName);
        if (!exportData) return;

        const card = this.createCardElement(exportData);
        document.body.appendChild(card);
        
        await new Promise(r => setTimeout(r, 150));

        try {
            const rawCanvas = await html2canvas(card, { 
                scale: 2, 
                backgroundColor: null, 
                useCORS: true,
                scrollX: 0,
                scrollY: 0
            });

            // Apply Punch
            const finalCanvas = this.reshapeCanvas(rawCanvas);
            
            const link = document.createElement('a');
            link.download = `PodCube_Card_${playlistName.replace(/\s+/g, '_')}.png`;
            link.href = finalCanvas.toDataURL("image/png");
            link.click();

            // Track punchcard export for achievements
            if (window.PodUser) PodUser.logPunchcardExport();
        } catch (e) {
            console.error("Download failed", e);
        } finally {
            if (card.parentNode) card.parentNode.removeChild(card);
        }
    }
};

window.showPlaylistSharing = PlaylistSharing.open;