(function(){
  // Ensure window properties exist
  if (typeof window.dragstartwindow === 'undefined') window.dragstartwindow = null;
  if (typeof window.tabisDragging === 'undefined') window.tabisDragging = false;
  if (typeof window.draggedtab === 'undefined') window.draggedtab = 0;

  // Create global aliases in the global scope so unprefixed identifiers work
  try {
    new Function(
      'if (typeof dragstartwindow === "undefined") dragstartwindow = window.dragstartwindow;\n' +
      'if (typeof tabisDragging === "undefined") tabisDragging = window.tabisDragging;\n' +
      'if (typeof draggedtab === "undefined") draggedtab = window.draggedtab;'
    )();
  } catch (e) {
    console.warn('browser-fix: failed to create global aliases', e);
  }
})();

// Prevent root-level pointerdown handlers from hiding resize handles
(function(){
  function isLikelyResizeHandle(el){
    try{
      if (!el || !el.style) return false;
      return el.style.position === 'absolute' && el.style.backgroundColor === 'gray' && el.style.width === '5%' && el.style.height === '3%';
    }catch(e){return false}
  }

  document.addEventListener('pointerdown', function(ev){
    let el = ev.target;
    while(el && el !== document.body){
      if (isLikelyResizeHandle(el)){
        ev.stopPropagation();
        return;
      }
      el = el.parentElement;
    }
  }, true);
})();
