'use strict';
(function(){
  let last = 0;

  function frame(t){
    const dt = Math.min(0.1, (t - last) / 1000) || 0;
    last = t;
    Game.tick(dt, G.speed);
    Render.draw();
    UI.hud();
    requestAnimationFrame(frame);
  }

  window.addEventListener('load', () => {
    try {
      Render.init();
    } catch (e) {
      console.error(e);
      document.body.innerHTML = '<p style="padding:40px;text-align:center">This game needs WebGL — please use a modern browser.</p>';
      return;
    }
    UI.init();
    const loaded = Save.load();
    if (!loaded) Game.newGame((Math.random() * 1e9) | 0);
    Input.init();
    Save.initAuto();
    requestAnimationFrame(frame);
    if (!loaded) UI.showHelp();
  });
})();
