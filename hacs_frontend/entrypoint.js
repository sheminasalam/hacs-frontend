(function () {
  function loadES5(src) {
    var el = document.createElement("script");
    el.src = src;
    document.body.appendChild(el);
  }
  if (/.*Version\/(?:11|12)(?:\.\d+)*.*Safari\//.test(navigator.userAgent)) {
    
      loadES5("/hacsfiles/frontend/frontend_es5/entrypoint.js");
    
  } else {
    try {
        
          new Function("import('/hacsfiles/frontend/frontend_latest/entrypoint.js')")();
        
    } catch (err) {
      
        loadES5("/hacsfiles/frontend/frontend_es5/entrypoint.js");
      
  }
  }
})();
