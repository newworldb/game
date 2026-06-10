'use strict';
// Headless end-to-end test of the game logic (no DOM): generates a map,
// places stations and a depot on the starter road network, creates a bus
// line, buys a bus, and simulates ~1.5 game years checking that passengers
// are generated, transported and paid for.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const files = ['util.js', 'data.js', 'path.js', 'game.js', 'map.js', 'build.js', 'vehicles.js'];
const src = files.map(f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8')).join('\n');

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'game-bundle.js' });

const test = `
function assert(cond, msg){ if (!cond) throw new Error('ASSERT: ' + msg); }

Game.newGame(12345);
const s = G.state;
assert(s.towns.length >= 3, 'at least 3 towns, got ' + s.towns.length);
assert(s.inds.length >= 8, 'industries placed, got ' + s.inds.length);
let roadTiles = 0;
for (let i = 0; i < s.net.length; i++) if (s.net[i] & 1) roadTiles++;
assert(roadTiles > 30, 'starter roads exist, got ' + roadTiles + ' tiles');

// helper: a free road tile near a town center
function roadNear(tw, skip){
  for (let r = 0; r <= 4; r++)
    for (let y = tw.y - r; y <= tw.y + r; y++)
      for (let x = tw.x - r; x <= tw.x + r; x++){
        if (!Game.inb(x, y)) continue;
        const i = Game.idx(x, y);
        if ((s.net[i] & 1) && !G.occ.has(i) && !(skip && skip[0] === x && skip[1] === y)) return [x, y];
      }
  return null;
}

// town 0 and its nearest neighbor are connected by a starter road
const t0 = s.towns[0];
let t1 = null, bd = 1e9;
for (const b of s.towns){
  if (b === t0) continue;
  const d = Math.abs(b.x - t0.x) + Math.abs(b.y - t0.y);
  if (d < bd){ bd = d; t1 = b; }
}

const p0 = roadNear(t0), p1 = roadNear(t1);
assert(p0 && p1, 'road tiles near both towns');
Build.placeStation('bus', p0[0], p0[1]);
Build.placeStation('bus', p1[0], p1[1]);
assert(s.stations.length === 2, 'two stations built, got ' + s.stations.length);
const [stA, stB] = s.stations;
assert(stA._accepts.has('pax') && stB._accepts.has('pax'), 'both stations accept passengers');

const route = Path.find('road', stA.x, stA.y, stB.x, stB.y);
assert(route && route.length > 5, 'stations connected by road, path len ' + (route && route.length));

const pd = roadNear(t0, p0);
assert(pd, 'free road tile for depot');
Build.placeDepot('road', pd[0], pd[1]);
const dep = s.depots[0];
assert(dep, 'depot built');

const line = { id: Game.nid(), name: 'Line 1', color: '#f00', stops: [stA.id, stB.id] };
s.lines.push(line);

const moneyBefore = s.money;
const v = Veh.buy('bus50', dep.id, line.id);
assert(v, 'bus purchased');
assert(s.money < moneyBefore, 'money spent on bus');

let earned = 0;
const origIncome = Game.income;
Game.income = (t, a) => { earned += a; origIncome(t, a); };

let moved = false;
for (let i = 0; i < 12000; i++){
  Game.tick(0.05, 4);
  if (v.x !== dep.x || v.y !== dep.y) moved = true;
}
assert(moved, 'vehicle left the depot');
assert(s.day > 300, 'time advanced, day=' + s.day.toFixed(1));
assert(earned > 0, 'income earned from deliveries: ' + earned.toFixed(0));
assert(s.stats.last, 'monthly stats rolled over');

// industry production ran
let produced = false;
for (const ind of s.inds){ for (const t in ind.stock) if (ind.stock[t] > 20) produced = true; }
assert(produced, 'industries produced cargo');

// build + demolish round trip
const plan = Build.planNet('rail', 2, 2, 8, 2);
if (plan.ok && plan.cost <= s.money){
  Build.commitNet(plan);
  assert((s.net[Game.idx(5, 2)] & 2) !== 0, 'rail tile laid');
  Build.commitDoze(Build.planDoze(2, 2, 8, 2));
  assert((s.net[Game.idx(5, 2)] & 2) === 0, 'rail tile demolished');
}

console.log('SMOKE TEST PASSED — towns:', s.towns.length,
  'industries:', s.inds.length,
  'earned:', earned.toFixed(0),
  'pop t0:', s.towns[0].pop);
`;
vm.runInContext(test, sandbox, { filename: 'smoke-test.js' });
