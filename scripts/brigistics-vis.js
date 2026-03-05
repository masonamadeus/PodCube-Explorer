/**
 * brigistics-viz.js
 * Unified Hardware Scanner (Quaternion Trackball Engine)
 * * This engine renders an interactive 3D sphere using HTML/CSS transforms driven
 * by a custom JavaScript quaternion mathematics engine. This completely prevents 
 * "gimbal lock" and allows for perfectly smooth panning.
 */

const BrigisticsViz = (function() {
    
    // --- MASSIVE GLOBE TUNING VARIABLES ---
    const SPHERE_RADIUS = 200;     // The physical size of the globe (pushes nodes far apart)
    const SPHERE_Z_OFFSET = -100;  // Pushes the giant globe deep into the monitor so it fits the porthole
    
    const LERP_SPEED = 0.05;         
    const DWELL_TIME_MS = 4000;      
    const INTERRUPT_DELAY_MS = 15000; 
    
    // Ultra-Precise Hitbox Tuning (Recalibrated for a massive 400px radius)
    const SNAP_THRESHOLD = 0.996;    // Magnetic pull: triggers if dropped within ~35px of a node
    const LOCK_THRESHOLD = 0.999;   // Crosshair engage: triggers when dead center (~10px)
    const UNLOCK_THRESHOLD = 0.9997; // Deadzone to prevent UI flickering on the edges
    
    // Dynamically calculate how fast the trackball should spin based on its massive size
    const DRAG_SPEED = 1 / SPHERE_RADIUS; 
    // ------------------------

    

    // --- QUATERNION MATHEMATICS ENGINE ---
    // Quaternions represent 3D rotations as 4D vectors [w, x, y, z].
    // They allow us to combine arbitrary dragging gestures into a perfectly stable state.

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

    // Spherical Linear Interpolation (SLERP)
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

    function getNodeColor(nanoId, history, verified, suppressed) {
        if (suppressed.has(nanoId)) return 'var(--danger)';   // Red for Suppressed
        if (verified.has(nanoId)) return 'var(--green)';    // Green for Elevated
        if (history.has(nanoId)) return 'var(--text-dim)'; // Dimmed Blue for Played
        return 'var(--primary)';                             // Bright Blue for Unplayed
    }

    // --- ENGINE STATE ---
    let currentQ = [1, 0, 0, 0]; 
    let targetQ = [1, 0, 0, 0];
    
    // Interaction Flags
    let isDragging = false;
    let isUserInteracting = false; 
    let lastMouseX = 0;
    let lastMouseY = 0;
    let dragDistance = 0; 

    // Visibility & Performance
    let isVisible = true;
    let observer = null;
    
    // Core Timers and Memory
    let autoSpinReq = null;
    let scannerTimeout = null;
    let currentTargetId = null;
    
    // Rich Data Array
    let sortedNodes = [];
    let currentScanIndex = 0;
    
    // UI Toggles
    let isPaused = false; 
    let isAutoScan = true; 
    
    let displayRotY = 0;
    let scanYear = 2024;
    let frameCounter = 0;

    // --- USER INTERFACE UPDATER ---
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

    // --- ANTI-WHIRL TRACKING ENGINE ---
    function steerSphereToNode(epId) {
        const node = sortedNodes.find(n => n.id === epId);
        if (!node) return;
        
        updateReadout(epId);

        // 1. Calculate where the node currently sits in 3D world space
        const w = currentQ[0], x = currentQ[1], y = currentQ[2], z = currentQ[3];
        const vx = node.vx, vy = node.vy, vz = node.vz;
        
        const ix =  w * vx + y * vz - z * vy;
        const iy =  w * vy + z * vx - x * vz;
        const iz =  w * vz + x * vy - y * vx;
        const iw = -x * vx - y * vy - z * vz;
        
        const worldX = ix * w + iw * -x + iy * -z - iz * -y;
        const worldY = iy * w + iw * -y + iz * -x - ix * -z;
        const worldZ = iz * w + iw * -z + ix * -y - iy * -x;

        // 2. Create a quaternion representing the shortest arc from its current spot to the camera [0, 0, 1]
        const dot = worldZ; 
        
        let qDiff;
        if (dot < -0.9999) {
            // Edge case: Node is exactly on the opposite side of the sphere (180 deg away)
            qDiff = [0, 0, 1, 0]; 
        } else {
            qDiff = qNormalize([1 + dot, worldY, -worldX, 0]);
        }

        // 3. Append the shortest arc to the current orientation
        targetQ = qNormalize(qMultiply(qDiff, currentQ));
        
        resetScannerTimer(INTERRUPT_DELAY_MS);
    }

    function resetScannerTimer(delay = DWELL_TIME_MS) {
        clearTimeout(scannerTimeout);
        if (isUserInteracting || isDragging || isPaused || !isAutoScan) return;
        scannerTimeout = setTimeout(scanNext, delay);
    }

    // Jumps to a random node
    function scanNext() {
        if (isUserInteracting || isDragging || sortedNodes.length === 0 || isPaused || !isAutoScan) {
            resetScannerTimer(DWELL_TIME_MS);
            return;
        }

        // Battery Saver: Only auto-hop if the sphere is actually visible on the user's screen
        if (!isVisible) {
            resetScannerTimer(DWELL_TIME_MS);
            return; 
        }

        let nextIndex;
        if (sortedNodes.length > 1) {
            do {
                nextIndex = Math.floor(Math.random() * sortedNodes.length);
            } while (nextIndex === currentScanIndex);
        } else {
            nextIndex = 0;
        }
        
        currentScanIndex = nextIndex;
        steerSphereToNode(sortedNodes[currentScanIndex].id);
    }

    // --- 3D VECTOR PROJECTION (Hit Detection) ---
    function getClosestNode() {
        let bestZ = -Infinity;
        let bestNode = null;

        // Deconstruct the current Quaternion into the 3rd row of its Rotation Matrix
        const w = currentQ[0], x = currentQ[1], y = currentQ[2], z = currentQ[3];
        const m31 = 2*x*z - 2*w*y;
        const m32 = 2*y*z + 2*w*x;
        const m33 = 1 - 2*x*x - 2*y*y;

        for (const node of sortedNodes) {
            const worldZ = m31 * node.vx + m32 * node.vy + m33 * node.vz;
            if (worldZ > bestZ) {
                bestZ = worldZ;
                bestNode = node;
            }
        }

        return { node: bestNode, dot: bestZ };
    }

    // --- INITIALIZATION ---
    function initSpheroid3D() {
        const scene = document.getElementById('bhs-scene');
        const sphere = document.getElementById('bhs-sphere');
        const crosshair = document.getElementById('bhs-crosshair');
        
        if (!scene || !sphere || !window.PodCube) return;
        
        Array.from(sphere.querySelectorAll('.bhs-node')).forEach(n => n.remove());
        Array.from(sphere.querySelectorAll('.bhs-wireframe-ring, .bhs-scanner-plane')).forEach(el => el.remove());

        // Physically scale the sphere container to the MASSIVE globe size
        // This forces the static XYZ rings in the HTML to expand naturally
        sphere.style.width = `${SPHERE_RADIUS * 2}px`;
        sphere.style.height = `${SPHERE_RADIUS * 2}px`;
        sphere.style.top = '50%';
        sphere.style.left = '50%';
        sphere.style.marginTop = `-${SPHERE_RADIUS}px`;
        sphere.style.marginLeft = `-${SPHERE_RADIUS}px`;

        // Inject math variables into CSS for the animated scanner
        sphere.style.setProperty('--r', `${SPHERE_RADIUS}px`);
        sphere.style.setProperty('--r-neg', `-${SPHERE_RADIUS}px`);
        sphere.style.setProperty('--r-sin45', `${SPHERE_RADIUS * 0.7071}px`);
        sphere.style.setProperty('--r-sin45-neg', `-${SPHERE_RADIUS * 0.7071}px`);

        // Dynamically generate Longitude rings (Vertical slices)
        // Every 15 degrees for a dense, high-tech grid
        const lonAngles = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165];
        lonAngles.forEach(angle => {
            const rib = document.createElement('div');
            rib.className = 'bhs-wireframe-ring';
            rib.style.width = '100%';
            rib.style.height = '100%';
            rib.style.position = 'absolute';
            rib.style.transform = `rotateY(${angle}deg)`;
            sphere.appendChild(rib);
        });

        // Dynamically generate Latitude rings (Horizontal slices)
        // Every 15 degrees (excluding 90/-90 because those are microscopic poles)
        const latAngles = [15, 30, 45, 60, 75, -15, -30, -45, -60, -75];
        latAngles.forEach(angle => {
            const rib = document.createElement('div');
            rib.className = 'bhs-wireframe-ring';
            rib.style.width = '100%';
            rib.style.height = '100%';
            rib.style.position = 'absolute';
            
            // Calculate exact Z-depth and Scale using Trigonometry
            const rad = angle * Math.PI / 180;
            const zOffset = SPHERE_RADIUS * Math.sin(rad);
            const scale = Math.cos(rad);
            
            rib.style.transform = `rotateX(90deg) translateZ(${zOffset}px) scale(${scale})`;
            sphere.appendChild(rib);
        });

        // Scale the scanning laser plane to match
        const scanner = document.createElement('div');
        scanner.className = 'bhs-scanner-plane';
        scanner.style.width = '110%';  // Slight overhang
        scanner.style.height = '110%';
        scanner.style.position = 'absolute';
        scanner.style.top = '-5%';
        scanner.style.left = '-5%';
        sphere.appendChild(scanner);

        const episodes = PodCube.getByChronologicalOrder().filter(ep => ep.date && typeof ep.date.month === 'number');
        sortedNodes = []; 

        const uData = (window.PodUser && window.PodUser.data) ? window.PodUser.data : { history: [], verified: [], suppressed: [] };
        const history = new Set(uData.history);
        const verified = new Set(uData.verified);
        const suppressed = new Set(uData.suppressed);

        episodes.forEach((ep, index) => {
            const doy = Math.floor((Date.UTC(2024, ep.date.month, ep.date.day) - Date.UTC(2024, 0, 0)) / 86400000);
            const angleY = (doy / 365) * 360; 
            const angleX = -80 + (160 * (index / Math.max(1, episodes.length - 1)));
            
            const node = document.createElement('div');
            node.className = 'bhs-node';
            node.dataset.epId = ep.nanoId; 
            node.style.setProperty('--ry', `${angleY}deg`);
            node.style.setProperty('--rx', `${angleX}deg`);
            
            // Color the nodes based on userdata
            node.style.backgroundColor = getNodeColor(ep.nanoId, history, verified, suppressed);
            
            // Push nodes out to the radius
            node.style.setProperty('--rz', `${SPHERE_RADIUS+2}px`);
            
            // Keep dots reasonably sized so they don't block the screen
            const size = Math.max(6, Math.min(14, 6 + ((ep.duration || 0) / 3600) * 8));
            node.style.width = `${size}px`;
            node.style.height = `${size}px`;
            
            node.onclick = (e) => {
                if (dragDistance > 10) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                steerSphereToNode(ep.nanoId);
            };

            sphere.appendChild(node);

            // Mathematical vector representation
            const radX = (angleX * Math.PI) / 180;
            const radY = (angleY * Math.PI) / 180;

            const vx = Math.sin(radY) * Math.cos(radX);
            const vy = -Math.sin(radX);
            const vz = Math.cos(radY) * Math.cos(radX);

            sortedNodes.push({
                element: node,
                id: ep.nanoId,
                rx: angleX,
                ry: angleY,
                vx: vx,
                vy: vy,
                vz: vz
            });
        });

        const toggleBtn = document.getElementById('bhs-scan-toggle');
        if (toggleBtn) {
            toggleBtn.replaceWith(toggleBtn.cloneNode(true));
            document.getElementById('bhs-scan-toggle').onclick = () => {
                isAutoScan = !isAutoScan;
                const b = document.getElementById('bhs-scan-toggle');
                b.textContent = isAutoScan ? 'AUTO-SCAN: ON' : 'AUTO-SCAN: OFF';
                b.style.color = isAutoScan ? 'var(--primary)' : 'var(--text-muted)';
                b.style.borderColor = isAutoScan ? 'var(--primary)' : 'var(--text-muted)';
                if (isAutoScan) resetScannerTimer(1000); else clearTimeout(scannerTimeout);
            };
        }

        // --- ANIMATION & LOGIC LOOP ---
        const spinLoop = () => {
            if (isPaused || !isVisible) return;
            
            currentQ = qSlerp(currentQ, targetQ, LERP_SPEED);
            
            // Push the massive sphere back into the porthole!
            sphere.style.transform = `translateZ(${SPHERE_Z_OFFSET}px) ${qToMatrix3d(currentQ)}`;

            // Push the background glow even deeper so it doesn't clip
            const backdrop = document.getElementById('bhs-backdrop');
            if (backdrop) {
                backdrop.style.transform = `translateZ(${SPHERE_Z_OFFSET - 400}px) scale(3)`;
            }
            
            const { node, dot } = getClosestNode();

            if (node && dot > LOCK_THRESHOLD) {
                updateReadout(node.id);
            } else if (dot < UNLOCK_THRESHOLD) {
                updateReadout(null);
            }

            // Sync decorative date scanner
            if (currentTargetId) {
                const activeNode = sortedNodes.find(n => n.id === currentTargetId);
                if (activeNode) {
                    let diff = -activeNode.ry - displayRotY;
                    diff = Math.atan2(Math.sin(diff * Math.PI/180), Math.cos(diff * Math.PI/180)) * 180 / Math.PI;
                    displayRotY += diff * LERP_SPEED;
                }
            }

            if (!currentTargetId) {
                frameCounter++;
                if (frameCounter % 8 === 0) scanYear = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                const dateEl = document.getElementById('bhs-scan-date');
                if (dateEl) {
                    let facingDoy = Math.floor((((-displayRotY % 360 + 360) % 360) / 360) * 365) + 1;
                    const d = new Date(2024, 0, facingDoy);
                    dateEl.textContent = `SCANNING: ${d.toLocaleString('default', { month: 'short' }).toUpperCase()} ${d.getDate().toString().padStart(2, '0')} ${scanYear}`;
                }
            }
            
            autoSpinReq = requestAnimationFrame(spinLoop);
        };

        // --- INPUT EVENT HANDLERS (DYNAMIC BINDING) ---
        
        // Define isolated wrappers so we can cleanly add/remove them by reference
        const onMouseMove = (e) => handleInteractionMove(e.clientX, e.clientY);
        const onTouchMove = (e) => handleInteractionMove(e.touches[0].clientX, e.touches[0].clientY);

        const handleInteractionMove = (x, y) => {
            if (!isDragging) return;
            const dx = x - lastMouseX; 
            const dy = y - lastMouseY;
            
            dragDistance += Math.abs(dx) + Math.abs(dy);
            
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 0) {
                const angle = dist * DRAG_SPEED;
                const ax = -dy / dist;
                const ay = dx / dist;
                const sinA = Math.sin(angle / 2);
                
                const qDrag = [Math.cos(angle / 2), ax * sinA, ay * sinA, 0];
                targetQ = qNormalize(qMultiply(qDrag, targetQ));
                displayRotY += (dx * DRAG_SPEED) * (180 / Math.PI);
            }
            
            lastMouseX = x; 
            lastMouseY = y;
        };

        const handleInteractionEnd = () => {
            if (!isUserInteracting) return; 
            
            isDragging = false;
            const didDrag = dragDistance > 10;

            // Instantly sever the global window listeners
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', handleInteractionEnd);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', handleInteractionEnd);
            
            setTimeout(() => {
                isUserInteracting = false;
                
                if (didDrag) {
                    const { node, dot } = getClosestNode();
                    if (node && dot > SNAP_THRESHOLD) {
                        steerSphereToNode(node.id);
                    } else {
                        resetScannerTimer(INTERRUPT_DELAY_MS);
                    }
                } else {
                    resetScannerTimer(INTERRUPT_DELAY_MS);
                }
            }, 50);
        };

        const handleInteractionStart = (x, y) => {
            isUserInteracting = true; 
            isDragging = true; 
            activeSteering = false; 
            dragDistance = 0; 
            lastMouseX = x; 
            lastMouseY = y; 
            clearTimeout(scannerTimeout); 

            // CAREFUL BINDING: We only listen to global window events *while* // the user is actively holding down on the sphere.
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', handleInteractionEnd);
            window.addEventListener('touchmove', onTouchMove, {passive: true});
            window.addEventListener('touchend', handleInteractionEnd);
        };

        // We only permanently bind the START triggers to the specific 3D scene element.
        // We use assignment (.onmousedown) instead of addEventListener so that if init() 
        // runs twice, we overwrite the old function rather than stacking duplicates.
        scene.onmousedown = (e) => handleInteractionStart(e.clientX, e.clientY);
        scene.ontouchstart = (e) => handleInteractionStart(e.touches[0].clientX, e.touches[0].clientY);

        if (sortedNodes.length > 0) {
            currentScanIndex = Math.floor(Math.random() * sortedNodes.length);
            const startNode = sortedNodes[currentScanIndex];
            
            steerSphereToNode(startNode.id);
            currentQ = [...targetQ]; 
        }

        if (observer) observer.disconnect();
        
        observer = new IntersectionObserver((entries) => {
            const wasVisible = isVisible;
            isVisible = entries[0].isIntersecting;
            
            // If it just scrolled back onto the screen, reboot the animation loop!
            if (isVisible && !wasVisible && !isPaused) {
                spinLoop();
            }
        }, { rootMargin: '100px' }); // 100px buffer so it boots up just before entering view
        
        observer.observe(scene);

        
        isPaused = false; 
        spinLoop(); 
        resetScannerTimer(2000);
    }

    // --- TIMELINE BAY RENDERING ---
    function renderTimeline() {
        const container = document.getElementById('spacetime-timeline');
        if (!container || !window.PodCube) return;
        
        container.innerHTML = '';

        const trackEl = document.createElement('div');
        trackEl.className = 'st-track';
        const today = new Date(); 
        let todayPlaced = false;

        const uData = (window.PodUser && window.PodUser.data) ? window.PodUser.data : { history: [], verified: [], suppressed: [] };
        const history = new Set(uData.history);
        const verified = new Set(uData.verified);
        const suppressed = new Set(uData.suppressed);

        PodCube.getByChronologicalOrder().forEach((ep, index) => {
            
            if (!todayPlaced && (ep.date.year > today.getFullYear() || (ep.date.year === today.getFullYear() && ep.date.month >= today.getMonth()))) {
                const t = document.createElement('div'); 
                t.className = 'st-today-marker';
                t.innerHTML = `<div class="st-today-tick"></div><div class="st-today-label">TODAY™</div>`;
                trackEl.appendChild(t); 
                todayPlaced = true;
            }
            
            const node = document.createElement('div'); 
            node.className = 'st-node';
            
            const spike = document.createElement('div'); 
            spike.className = 'st-spike';
            spike.dataset.epId = ep.nanoId; 
            
            spike.style.height = `${Math.max(8, Math.min(60, (ep.duration || 0) / 60 * 3))}px`;

            
            spike.style.backgroundColor = getNodeColor(ep.nanoId, history, verified, suppressed);
            
            spike.onclick = () => steerSphereToNode(ep.nanoId);
            
            node.appendChild(spike);
            
            if (ep.date.year !== null && (index % 10 === 0)) {
                const label = document.createElement('div'); 
                label.className = 'st-axis-label';
                if (index === 0) label.classList.add('st-label-first');
                label.textContent = ep.date.displayYear; 
                node.appendChild(label);
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
