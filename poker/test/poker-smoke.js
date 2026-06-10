'use strict';
// Headless poker test: hand-evaluator unit checks, then 300 fully simulated
// bot-vs-bot hands verifying chip conservation and engine stability.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const files = ['cards.js', 'ai.js', 'engine.js'];
const src = files.map(f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8')).join('\n');
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'poker-bundle.js' });

const test = `
function assert(cond, msg){ if (!cond) throw new Error('ASSERT: ' + msg); }
// card helper: 'As' = ace of spades; suits s,h,d,c
function C(str){
  const R = {2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,T:10,J:11,Q:12,K:13,A:14};
  const S = { s:0, h:1, d:2, c:3 };
  return (R[str[0]] - 2) * 4 + S[str[1]];
}
function H(...ss){ return ss.map(C); }
const e5 = cs => Cards.eval5(cs), e7 = cs => Cards.eval7(cs);

// ---- evaluator unit checks ----
const royal = e5(H('As','Ks','Qs','Js','Ts'));
const quads = e5(H('9s','9h','9d','9c','As'));
const boat  = e5(H('9s','9h','9d','Kc','Ks'));
const flush = e5(H('2h','7h','9h','Jh','Ah'));
const strt  = e5(H('5s','6h','7d','8c','9s'));
const wheel = e5(H('As','2h','3d','4c','5s'));
const trips = e5(H('9s','9h','9d','Kc','2s'));
const twoP  = e5(H('9s','9h','Kd','Kc','2s'));
const pair  = e5(H('9s','9h','Kd','Qc','2s'));
const high  = e5(H('9s','7h','Kd','Qc','2s'));
assert(royal > quads && quads > boat && boat > flush && flush > strt &&
       strt > trips && trips > twoP && twoP > pair && pair > high, 'category ordering');
assert(wheel < strt, 'wheel is the lowest straight');
assert(Cards.handName(royal) === 'Royal Flush', 'royal flush name');
assert(Cards.handName(boat) === 'Full House', 'full house name');
// kickers
assert(e5(H('As','Ah','Kd','Qc','2s')) > e5(H('As','Ah','Kd','Jc','2s')), 'kicker compare');
assert(e5(H('Ks','Kh','Ad','Qc','2s')) < e5(H('As','Ah','3d','4c','2s')), 'pair rank beats kickers');
// split: same board plays for both
const board = H('As','Ks','Qd','Jc','Th');
assert(e7(board.concat(H('2h','3d'))) === e7(board.concat(H('4h','5d'))), 'board plays -> split');
// 7-card picks the best 5
assert(Cards.handName(e7(H('Ah','Kh','Qh','Jh','Th','9s','9d'))) === 'Royal Flush', '7-card best pick');

// ---- full-game simulation ----
Engine.auto = true;
Engine.hooks.sleep = () => Promise.resolve();
let preSum = 0, hands = 0, potsAwarded = 0;
Engine.hooks.handStart = () => { preSum = Engine.seats.reduce((a, p) => a + p.stack + p.total, 0); };
Engine.hooks.handEnd = () => {
  hands++;
  const post = Engine.seats.reduce((a, p) => a + p.stack + p.total, 0);
  if (post !== preSum) throw new Error('chips not conserved: ' + preSum + ' -> ' + post + ' at hand ' + hands);
  const won = Engine.seats.reduce((a, p) => a + p.winAmt, 0);
  if (won > 0) potsAwarded++;
  for (const p of Engine.seats) if (p.stack < 0) throw new Error('negative stack');
};
Engine.init(2000);

(async () => {
  const gen = ++Engine.gen;
  while (hands < 300){
    const res = await Engine.playHand(gen);
    if (res === 'aborted') throw new Error('unexpected abort');
    Engine.hooks.handEnd();
  }
  assert(potsAwarded === hands, 'every hand awarded a pot (' + potsAwarded + '/' + hands + ')');
  console.log('cash OK —', hands, 'hands, chips conserved');

  // ---- tournament simulation: run 20 full Sit & Gos to completion ----
  for (let t = 0; t < 20; t++){
    Engine.init(0, 'tourney');
    const tg = ++Engine.gen;
    let blindsRose = false, th = 0;
    while (Engine.seats.filter(p => !p.out).length > 1){
      const res = await Engine.playHand(tg);
      if (res === 'aborted') throw new Error('tourney abort');
      Engine.processEliminations();
      const sum = Engine.seats.reduce((a, p) => a + p.stack + p.total, 0);
      assert(sum === 5 * Engine.TOURNEY_STACK, 'tourney chips conserved, got ' + sum);
      if (Engine.cfg.BB > 20) blindsRose = true;
      if (++th > 2000) throw new Error('tournament never ended');
    }
    const champ = Engine.seats.filter(p => !p.out);
    assert(champ.length === 1, 'exactly one champion');
    assert(champ[0].stack === 5 * Engine.TOURNEY_STACK, 'champion holds all chips');
    const finishes = Engine.seats.filter(p => p.out).map(p => p.finish);
    assert(finishes.every(f => f >= 2 && f <= 5), 'eliminated players have placements 2..5');
    if (th > 6) assert(blindsRose, 'blinds escalated');
  }
  console.log('POKER SMOKE TEST PASSED — cash + 20 tournaments, chips conserved, evaluator OK');
})().catch(e => { console.error(e); process.exit(1); });
`;
vm.runInContext(test, sandbox, { filename: 'poker-test.js' });
