"use strict";
debugger;
import { toPng } from '<REPLACE WITH PATH>';
console.log('screenshot-esm.js loaded');
function displayPreview(dataUrl) {
    // Create a new image element to display the screenshot preview
    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.position = 'fixed';
    img.style.top = '10px';
    img.style.right = '10px';
    img.style.width = '200px';
    img.style.height = 'auto';
    img.style.border = '2px solid #000';
    img.style.zIndex = '9999';
    img.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    
    // Append the image to the body
    document.body.appendChild(img);

    // Remove the preview after 5 seconds
    setTimeout(() => {
        document.body.removeChild(img);
    }, 5000);
}

window.protectedGlobals = window.protectedGlobals || {};
window.protectedGlobals.takeScreenshot = async () => {
    try {
        const dataUrl = await toPng(document.documentElement);
        const previewDataUrl = dataUrl;
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');

        // convert base64 to Uint8Array
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

        const a = new Date();
        let fileName = `Screenshot ${a.toLocaleDateString().replace(/\//g, '-')} ${String(a.getHours()).padStart(2,'0')}:${String(a.getMinutes()).padStart(2,'0')}.png`;
        if (await window.protectedGlobals.FileExists('/systemfiles/screenshot/' + fileName)) {
            let counter = 1;
            let newFileName;
            do {
                newFileName = `Screenshot ${a.toLocaleDateString().replace(/\//g, '-')} ${String(a.getHours()).padStart(2,'0')}:${String(a.getMinutes()).padStart(2,'0')} (${counter}).png`;
                counter++;
            } while (await window.protectedGlobals.FileExists('/systemfiles/screenshot/' + newFileName));
            fileName = newFileName;
        }
        if (typeof window.protectedGlobals.WriteFile === 'function') {
            await window.protectedGlobals.WriteFile('/systemfiles/screenshot/' + fileName, bytes, { replace: true });
        } else {
            console.warn('WriteFile not available on protectedGlobals');
        }

        displayPreview(previewDataUrl);
    } catch (err) {
        console.error('takeScreenshot error:', err);
    }
};

window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (window.protectedGlobals && typeof window.protectedGlobals.takeScreenshot === 'function') {
            window.protectedGlobals.takeScreenshot();
        }
    }
});