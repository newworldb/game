'use strict';
(function(){
  window.addEventListener('load', () => {
    const first = !Save.load();
    const mq = new URLSearchParams(location.search).get('mode');
    const mode = (mq === 'tourney' || mq === 'super' || mq === 'online') ? mq : 'cash';
    UI.init();

    if (mode !== 'cash' && mode !== 'online'){
      const buyin = mode === 'super' ? Engine.SUPER_BUYIN : Engine.BUYIN;
      if (Save.data.bank < buyin) Save.data.bank = buyin; // never lock the player out
      Save.data.bank -= buyin;
      Save.data.stats.tourneys = (Save.data.stats.tourneys || 0) + 1;
      Save.save();
    }
    Engine.init(Save.data.bank, mode === 'online' ? 'cash' : mode);

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
      if (Engine.mode === 'cash' && !Engine.online) Save.data.bank = hero.stack;
      Save.save();
    };
    Engine.hooks.tourneyEnd = (place, prize) => {
      Save.data.bank += prize;
      if (place === 1) Save.data.stats.titles = (Save.data.stats.titles || 0) + 1;
      Save.save();
      UI.tourneyEnd(place, prize);
    };

    window.addEventListener('resize', () => UI.update());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') Save.save();
    });
    if (mode === 'online'){
      Net.setupMode = true;
      UI.showOnlineSetup();
    } else {
      Engine.start();
      if (mode === 'tourney') UI.toast('Sit & Go started — $' + Engine.BUYIN + ' buy-in, top 3 paid');
      if (mode === 'super') UI.toast('⚡ SUPER TURBO — 3s to act, all cards face up, blinds fly!');
      if (first) UI.showHelp();
    }
  });
})();
