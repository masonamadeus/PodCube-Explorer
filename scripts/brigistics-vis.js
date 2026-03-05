/**
 * brigistics-viz.js
 * Unified Hardware Scanner (Quaternion Trackball Engine)
 */

const BrigisticsViz = (function() {
    
    // --- TUNING VARIABLES ---
    const LERP_SPEED = 0.05;         
    const DWELL_TIME_MS = 6000;      
    const INTERRUPT_DELAY_MS = 15000; 
    // ------------------------

    // --- QUATERNION MATH ENGINE ---
    function qMultiply(q1, q2) {
        return [
            q1[0]*q2[0] - q1[1]*q2[1] - q1[2]*q2[2] - q1[3]*q2[3],
            q1[0]*q2[1] + q1[1]*q2[0] + q1[2]*q2[3] - q1[3]*q2[2],
            q1[0]*q2[2] - q1[1]*q2[3] + q1[2]*q2[0] + q1[3]*q2[1],
            q1[0]*q2[3] + q1[1]*q2[2] - q1[2]*q2[1] + q1[3]*q2[0]
        ];
    }

    function qNormalize(q) {
        let len = Math.sqrt(q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3]);
        if (len === 0) return [1,0,0,0];
        return [q[0]/len, q[1]/len, q[2]/len, q[3]/len];
    }

    function qSlerp(qa, qb, t) {
        let dot = qa[0]*qb[0] + qa[1]*qb[1] + qa[2]*qb[2] + qa[3]*qb[3];
        let qb2 = [...qb];
        
        if (dot < 0) {
            qb2 = [-qb[0], -qb[1], -qb[2], -qb[3]];
            dot = -dot;
        }
        
        if (dot > 0.9995) {
            return qNormalize([
                qa[0] + t*(qb2[0] - qa[0]), qa[1] + t*(qb2[1] - qa[1]),
                qa[2] + t*(qb2[2] - qa[2]), qa[3] + t*(qb2[3] - qa[3])
            ]);
        }
        
        let theta_0 = Math.acos(dot);
        let theta = theta_0 * t;
        let sin_theta = Math.sin(theta);
        let sin_theta_0 = Math.sin(theta_0);
        let s0 = Math.cos(theta) - dot * sin_theta / sin_theta_0;
        let s1 = sin_theta / sin_theta_0;
        
        return [
            qa[0]*s0 + qb2[0]*s1, qa[1]*s0 + qb2[1]*s1,
            qa[2]*s0 + qb2[2]*s1, qa[3]*s0 + qb2[3]*s1
        ];
    }

    function qToMatrix3d(q) {
        const w=q[0], x=q[1], y=q[2], z=q[3];
        return `matrix3d(
            ${1 - 2*y*y - 2*z*z}, ${2*x*y + 2*w*z}, ${2*x*z - 2*w*y}, 0,
            ${2*x*y - 2*w*z}, ${1 - 2*x*x - 2*z*z}, ${2*y*z + 2*w*x}, 0,
            ${2*x*z + 2*w*y}, ${2*y*z - 2*w*x}, ${1 - 2*x*x - 2*y*y}, 0,
            0, 0, 0, 1
        )`;
    }

    function getIntegrityColor(integrity) {
        if (integrity < 30) return 'var(--danger)';   
        if (integrity < 80) return 'var(--warning)';  
        return 'var(--primary)';                      
    }

    let currentQ = [1, 0, 0, 0]; 
    let targetQ = [1, 0, 0, 0];
    
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    
    let autoSpinReq = null;
    let scannerTimeout = null;
    let currentTargetId = null;
    let pendingTargetId = null; // TRACKS TARGET REGARDLESS OF VISIBILITY
    
    let sortedNodes = [];
    let currentScanIndex = 0;
    
    let isPaused = false; 
    let isAutoScan = true; 
    
    let displayRotY = 0;
    let scanYear = 2024;
    let frameCounter = 0;

    // --- REUSABLE UI UPDATER ---
    function updateReadout(epId) {
        if (currentTargetId === epId) return;

        if (currentTargetId) {
            const oldNode = document.querySelector(`.bhs-node[data-ep-id="${currentTargetId}"]`);
            if (oldNode) oldNode.classList.remove('targeted');
            const oldSpike = document.querySelector(`.st-spike[data-ep-id="${currentTargetId}"]`);
            if (oldSpike) oldSpike.classList.remove('active');
        }
        
        currentTargetId = epId;
        const crosshair = document.getElementById('bhs-crosshair');
        const readoutEmpty = document.querySelector('.bhs-readout-empty');
        const readoutContent = document.querySelector('.bhs-readout-content');
        
        if (epId) {
            const ep = PodCube.findEpisode(epId);
            if (ep) {
                document.getElementById('bhs-readout-title').textContent = ep.title;
                document.getElementById('bhs-readout-meta').textContent = `${ep.date.toString()} • Integrity: ${ep.integrityValue || 0}%`;
                document.getElementById('bhs-readout-desc').textContent = `Model: ${ep.model || "Unknown"} \nOrigin: ${ep.location || "Unknown"}`;
                
                const btnPlay = document.getElementById('bhs-btn-play');
                const btnInspect = document.getElementById('bhs-btn-inspect');
                btnPlay.onclick = () => { if (typeof run === 'function') run(`PodCube.play(PodCube.findEpisode('${ep.id}'))`); };
                btnInspect.onclick = () => {
                    if (typeof loadEpisodeInspector === 'function') loadEpisodeInspector(ep);
                    if (typeof switchTab === 'function') switchTab('inspector', true);
                };

                const targetNode = document.querySelector(`.bhs-node[data-ep-id="${epId}"]`);
                if (targetNode) targetNode.classList.add('targeted');
                const newSpike = document.querySelector(`.st-spike[data-ep-id="${epId}"]`);
                if (newSpike) {
                    newSpike.classList.add('active');
                    const container = document.getElementById('spacetime-timeline');
                    const nodeEl = newSpike.closest('.st-node');
                    if (container && nodeEl) {
                        const sRect = nodeEl.getBoundingClientRect();
                        const cRect = container.getBoundingClientRect();
                        const targetScroll = container.scrollLeft + (sRect.left - cRect.left) - (cRect.width / 2) + (sRect.width / 2);
                        container.scrollTo({ left: targetScroll, behavior: 'smooth' });
                    }
                }
                
                if (crosshair) crosshair.classList.add('locked');
                readoutEmpty.style.display = 'none';
                readoutContent.style.display = 'flex';
            }
        } else {
            if (crosshair) crosshair.classList.remove('locked');
            readoutEmpty.style.display = 'flex';
            readoutContent.style.display = 'none';
        }
    }

    function steerSphereToNode(epId, angleX, angleY) {
        pendingTargetId = epId; 
        
        updateReadout(null);

        const radX = (-angleX * Math.PI) / 180;
        const radY = (-angleY * Math.PI) / 180;
        
        const qX = [Math.cos(radX/2), Math.sin(radX/2), 0, 0];
        const qY = [Math.cos(radY/2), 0, Math.sin(radY/2), 0];
        
        targetQ = qNormalize(qMultiply(qX, qY));
        
        let diff = -angleY - displayRotY;
        diff = Math.atan2(Math.sin(diff * Math.PI/180), Math.cos(diff * Math.PI/180)) * 180 / Math.PI;
        displayRotY += diff;
        
        resetScannerTimer(INTERRUPT_DELAY_MS);
    }

    function resetScannerTimer(delay = DWELL_TIME_MS) {
        clearTimeout(scannerTimeout);
        if (!isPaused && isAutoScan) {
            scannerTimeout = setTimeout(scanNext, delay);
        }
    }

    function scanNext() {
        if (isDragging || sortedNodes.length === 0 || isPaused || !isAutoScan) {
            resetScannerTimer(DWELL_TIME_MS);
            return;
        }

        // AUTO-SCAN PAUSE: ONLY PAUSES THE AUTOMATIC HOPPING
        const scene = document.getElementById('bhs-scene');
        if (scene) {
            const rect = scene.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight) {
                resetScannerTimer(DWELL_TIME_MS);
                return; 
            }
        }

        currentScanIndex = (currentScanIndex + 1) % sortedNodes.length;
        const nextNode = sortedNodes[currentScanIndex];
        steerSphereToNode(nextNode.dataset.epId, parseFloat(nextNode.dataset.rx), parseFloat(nextNode.dataset.ry));
    }

    function initSpheroid3D() {
        const scene = document.getElementById('bhs-scene');
        const sphere = document.getElementById('bhs-sphere');
        const crosshair = document.getElementById('bhs-crosshair');
        
        if (!scene || !sphere || !window.PodCube) return;
        Array.from(sphere.querySelectorAll('.bhs-node')).forEach(n => n.remove());

        Array.from(sphere.querySelectorAll('.bhs-wireframe-ring, .bhs-scanner-plane')).forEach(el => el.remove());

        // Create the 8 equal-spaced grid lines
        const ribClasses = [
            'rib-lat-1', 'rib-lat-2', 'rib-lat-3', 'rib-lat-4',
            'rib-lon-1', 'rib-lon-2', 'rib-lon-3', 'rib-lon-4'
        ];

        ribClasses.forEach(cls => {
            const rib = document.createElement('div');
            rib.className = `bhs-wireframe-ring ${cls}`;
            sphere.appendChild(rib);
        });

        // Create the animated laser plane
        const scanner = document.createElement('div');
        scanner.className = 'bhs-scanner-plane';
        sphere.appendChild(scanner);

        const episodes = PodCube.getByChronologicalOrder().filter(ep => ep.date && typeof ep.date.month === 'number');
        episodes.forEach((ep, index) => {
            const doy = Math.floor((Date.UTC(2024, ep.date.month, ep.date.day) - Date.UTC(2024, 0, 0)) / 86400000);
            const angleY = (doy / 365) * 360; 
            const angleX = -80 + (160 * (index / Math.max(1, episodes.length - 1)));
            
            const node = document.createElement('div');
            node.className = 'bhs-node';
            node.dataset.epId = ep.nanoId; 
            node.dataset.rx = angleX;
            node.dataset.ry = angleY;
            node.style.setProperty('--ry', `${angleY}deg`);
            node.style.setProperty('--rx', `${angleX}deg`);
            node.style.setProperty('--rz', `125px`);
            node.style.backgroundColor = getIntegrityColor(ep.integrityValue || 0);
            
            const size = Math.max(4, Math.min(12, 4 + ((ep.duration || 0) / 3600) * 8));
            node.style.width = `${size}px`;
            node.style.height = `${size}px`;
            node.onclick = () => steerSphereToNode(ep.nanoId, angleX, angleY);
            sphere.appendChild(node);
        });

        sortedNodes = Array.from(sphere.querySelectorAll('.bhs-node')).sort((a, b) => parseFloat(a.dataset.ry) - parseFloat(b.dataset.ry));

        const toggleBtn = document.getElementById('bhs-scan-toggle');
        if (toggleBtn) {
            toggleBtn.replaceWith(toggleBtn.cloneNode(true));
            document.getElementById('bhs-scan-toggle').onclick = () => {
                isAutoScan = !isAutoScan;
                const b = document.getElementById('bhs-scan-toggle');
                b.textContent = isAutoScan ? 'AUTO-SCAN: ON' : 'AUTO-SCAN: OFF';
                b.style.color = isAutoScan ? 'var(--success)' : 'var(--text-muted)';
                b.style.borderColor = isAutoScan ? 'var(--success)' : 'var(--text-muted)';
                if (isAutoScan) resetScannerTimer(1000); else clearTimeout(scannerTimeout);
            };
        }

        const checkCrosshair = () => {
            const sceneRect = scene.getBoundingClientRect();
            const centerX = sceneRect.left + sceneRect.width / 2;
            const centerY = sceneRect.top + sceneRect.height / 2;
            
            // OFFSCREEN CHECK: Bypasses raycaster if sphere is not visible
            const isOffScreen = (centerX < 0 || centerX > window.innerWidth || centerY < 0 || centerY > window.innerHeight);
            
            // 1. ARRIVAL CHECK: If math engine finished its LERP, force the lock
            let dot = currentQ[0]*targetQ[0] + currentQ[1]*targetQ[1] + currentQ[2]*targetQ[2] + currentQ[3]*targetQ[3];
            if (Math.abs(dot) > 0.998 && pendingTargetId) {
                updateReadout(pendingTargetId);
                pendingTargetId = null;
            }

            // 2. RAYCASTER: Only runs if sphere is visible and not actively steering
            if (!isOffScreen && !pendingTargetId) {
                const elements = document.elementsFromPoint(centerX, centerY) || [];
                const target = Array.from(elements).find(el => el.classList && el.classList.contains('bhs-node'));
                if (target) updateReadout(target.dataset.epId);
                else if (Math.abs(dot) > 0.995) updateReadout(null);
            }
        };

        const spinLoop = () => {
            if (isPaused) return;
            currentQ = qSlerp(currentQ, targetQ, LERP_SPEED);
            sphere.style.transform = `translateZ(0px) ${qToMatrix3d(currentQ)}`;

            // FIX: Keep the backdrop stationary deep in the background.
            // This prevents the flat plane from swinging around and snapping.
            const backdrop = document.getElementById('bhs-backdrop');
            if (backdrop) {
                backdrop.style.transform = `translateZ(-200px)`;
            }
            
            if (!currentTargetId && !pendingTargetId) {
                frameCounter++;
                if (frameCounter % 8 === 0) scanYear = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                const dateEl = document.getElementById('bhs-scan-date');
                if (dateEl) {
                    let facingDoy = Math.floor((((-displayRotY % 360 + 360) % 360) / 360) * 365) + 1;
                    const d = new Date(2024, 0, facingDoy);
                    dateEl.textContent = `SCANNING: ${d.toLocaleString('default', { month: 'short' }).toUpperCase()} ${d.getDate().toString().padStart(2, '0')} ${scanYear}`;
                }
            }
            checkCrosshair(); 
            autoSpinReq = requestAnimationFrame(spinLoop);
        };

        scene.onmousedown = (e) => { isDragging = true; pendingTargetId = null; lastMouseX = e.clientX; lastMouseY = e.clientY; resetScannerTimer(INTERRUPT_DELAY_MS); };
        scene.ontouchstart = (e) => { isDragging = true; pendingTargetId = null; lastMouseX = e.touches[0].clientX; lastMouseY = e.touches[0].clientY; resetScannerTimer(INTERRUPT_DELAY_MS); };
        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - lastMouseX; 
            const dy = e.clientY - lastMouseY;
            
            // TRUE TRACKBALL MATH: Eliminates Pole Snapping
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 0) {
                const angle = dist * 0.008;
                // Determine the exact 2D axis perpendicular to the drag
                const ax = -dy / dist;
                const ay = dx / dist;
                const sinA = Math.sin(angle / 2);
                
                const qDrag = [Math.cos(angle / 2), ax * sinA, ay * sinA, 0];
                targetQ = qNormalize(qMultiply(qDrag, targetQ));
                displayRotY += (dx*0.008) * (180 / Math.PI);
            }
            
            lastMouseX = e.clientX; 
            lastMouseY = e.clientY;
        });

       
        window.addEventListener('mouseup', () => isDragging = false);

        window.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const dx = e.touches[0].clientX - lastMouseX; 
            const dy = e.touches[0].clientY - lastMouseY;
            
            // TRUE TRACKBALL MATH: Eliminates Pole Snapping
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 0) {
                const angle = dist * 0.008;
                const ax = -dy / dist;
                const ay = dx / dist;
                const sinA = Math.sin(angle / 2);
                
                const qDrag = [Math.cos(angle / 2), ax * sinA, ay * sinA, 0];
                targetQ = qNormalize(qMultiply(qDrag, targetQ));
                displayRotY += (dx*0.008) * (180 / Math.PI);
            }
            
            lastMouseX = e.touches[0].clientX; 
            lastMouseY = e.touches[0].clientY;
        }, {passive: true});

        window.addEventListener('touchend', () => isDragging = false);

        steerSphereToNode(episodes[0].nanoId, 0, 0);
        isPaused = false; spinLoop(); resetScannerTimer(2000); 
    }

    function renderTimeline() {
        const container = document.getElementById('spacetime-timeline');
        if (!container || !window.PodCube) return;
        container.innerHTML = '';
        const trackEl = document.createElement('div');
        trackEl.className = 'st-track';
        const today = new Date(); let todayPlaced = false;

        PodCube.getByChronologicalOrder().forEach((ep, index) => {
            if (!todayPlaced && (ep.date.year > today.getFullYear() || (ep.date.year === today.getFullYear() && ep.date.month >= today.getMonth()))) {
                const t = document.createElement('div'); t.className = 'st-today-marker';
                t.innerHTML = `<div class="st-today-tick"></div><div class="st-today-label">TODAY™</div>`;
                trackEl.appendChild(t); todayPlaced = true;
            }
            const node = document.createElement('div'); node.className = 'st-node';
            const spike = document.createElement('div'); spike.className = 'st-spike';
            spike.dataset.epId = ep.nanoId; spike.style.height = `${Math.max(8, Math.min(60, (ep.duration || 0) / 60 * 3))}px`;
            spike.style.backgroundColor = getIntegrityColor(ep.integrityValue || 0);
            spike.onclick = () => {
                const targetNode = document.querySelector(`.bhs-node[data-ep-id="${ep.nanoId}"]`);
                if (targetNode) steerSphereToNode(ep.nanoId, parseFloat(targetNode.dataset.rx), parseFloat(targetNode.dataset.ry));
            };
            node.appendChild(spike);
            if (ep.date.year !== null && (index % 10 === 0)) {
                const label = document.createElement('div'); label.className = 'st-axis-label';
                if (index === 0) {
                    label.classList.add('st-label-first');
                }
                label.textContent = ep.date.displayYear; node.appendChild(label);
            }
            trackEl.appendChild(node);
        });
        container.appendChild(trackEl);
        setTimeout(() => { container.scrollLeft = container.scrollWidth; }, 100);
    }

    return {
        init: function() { setTimeout(() => { initSpheroid3D(); renderTimeline(); }, 100); },
        refresh: function() { initSpheroid3D(); renderTimeline(); },
        pause: function() { isPaused = true; clearTimeout(scannerTimeout); },
        resume: function() { if (isPaused) { isPaused = false; initSpheroid3D(); } }
    };
})();
