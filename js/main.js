'use strict';
(function(){
  window.addEventListener('load', () => {
    const first = !Save.load();
    UI.init();
    Engine.init(Save.data.bank);
    Engine.hooks.update = UI.update;
    Engine.hooks.log = m => UI.log(m);
    Engine.hooks.human = ctx => UI.human(ctx);
    Engine.hooks.handStart = () => {
      Save.data.stats.hands++;
    };
    Engine.hooks.handEnd = () => {
      const hero = Engine.human();
      if (hero.winAmt > 0){
        Save.data.stats.wins++;
        if (hero.winAmt > Save.data.stats.biggest) Save.data.stats.biggest = hero.winAmt;
      }
      Save.data.bank = hero.stack;
      Save.save();
    };
    window.addEventListener('resize', () => UI.update());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') Save.save();
    });
    Engine.start();
    if (first) UI.showHelp();
  });
})();
