/**
 * podbrowser.js
 * In-Universe Intranet Browser Module
 */
const PodBrowser = (function() {

    function open(target) {
        const overlay = document.getElementById('in-universe-browser');
        const iframe = document.getElementById('iu-iframe');
        
        if (overlay && iframe && target) {
            // Clean the payload (e.g., "slowtaco")
            const siteId = target.toLowerCase().trim();
            
            // Point to the index.html inside the site's subfolder!
            const url = `./pages/${siteId}/index.html`;

            iframe.src = url;
            overlay.style.display = 'block';
            
            if (typeof logCommand === 'function') {
                logCommand(`// INTRANET: Routing connection to ${siteId}...`);
            }
        }
    }

    function close() {
        const overlay = document.getElementById('in-universe-browser');
        const iframe = document.getElementById('iu-iframe');
        if (overlay && iframe) {
            overlay.style.display = 'none';
            iframe.src = ''; // Clear memory
            if (typeof logCommand === 'function') {
                logCommand(`// INTRANET: Connection severed. Returning to Explorer.`);
            }
        }
    }

    function toggleBadge() {
        const badge = document.getElementById('iu-badge');
        if (badge) badge.classList.toggle('collapsed');
    }

    // --- EXPOSE PUBLIC API ---
    return {
        init: function() {
            console.log("PodBrowser module initialized.");
        },
        open: open,
        close: close,
        toggleBadge: toggleBadge
    };

})();

// Boot it up when the core engine is ready
window.addEventListener('PodCube:Ready', () => {
    PodBrowser.init();
});