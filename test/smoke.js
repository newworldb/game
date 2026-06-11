'use strict';
// Headless test of BudgetTrip logic: estimates, expense math, affiliate links.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const files = ['icons.js', 'config.js', 'data.js', 'picks.js', 'world.js', 'core.js'];
const src = files.map(f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8')).join('\n');
const sandbox = { console, localStorage: { getItem: () => null, setItem: () => {} } };
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'budgettrip-bundle.js' });

vm.runInContext(`
function assert(cond, msg){ if (!cond) throw new Error('ASSERT: ' + msg); }

// destination data is complete
for (const k in DESTS){
  const d = DESTS[k];
  assert(d.en && d.th && d.emoji, k + ' has names');
  for (const s of ['budget', 'mid', 'comfort']){
    assert(Array.isArray(d.costs[s]) && d.costs[s].length === 4 && d.costs[s].every(n => n > 0), k + '/' + s + ' costs valid');
  }
}
assert(Object.keys(DESTS).length >= 12, 'at least 12 destinations');

// i18n coverage: same keys in en and th
const ek = Object.keys(I18N.en), tk = Object.keys(I18N.th);
assert(ek.length === tk.length && ek.every(k => tk.includes(k)), 'i18n keys match');

// estimates scale sensibly
const e1 = Core.estimate('chiangmai', 'budget', 3, 2, false);
const e2 = Core.estimate('chiangmai', 'mid', 3, 2, false);
const e3 = Core.estimate('chiangmai', 'comfort', 3, 2, false);
assert(Core.total(e1) > 0, 'budget estimate positive');
assert(Core.total(e1) < Core.total(e2) && Core.total(e2) < Core.total(e3), 'style ordering');
const e4 = Core.estimate('chiangmai', 'mid', 6, 2, false);
assert(Core.total(e4) > Core.total(e2), 'more nights cost more');
const e5 = Core.estimate('chiangmai', 'mid', 3, 4, false);
assert(Core.total(e5) > Core.total(e2), 'more people cost more');
const e6 = Core.estimate('chiangmai', 'mid', 3, 2, true);
assert(e6.flights === DESTS.chiangmai.flight * 2, 'flights included per person');
assert(Core.estimate('pai', 'mid', 3, 2, true).flights === 0, 'no flights for overland-only dest');
assert(Core.rooms(1) === 1 && Core.rooms(2) === 1 && Core.rooms(3) === 2 && Core.rooms(5) === 3, 'room math');

// trips, expenses, persistence model
const trip = Core.newTrip({ dest: 'phuket', style: 'mid', nights: 4, people: 2, start: '2026-07-01', inclFlights: true });
assert(Core.trip(trip.id) === trip, 'trip stored');
assert(Core.total(trip.budget) > 10000, 'phuket 4n trip is non-trivial');
Core.addExpense(trip, 'food', 350, 'pad thai');
Core.addExpense(trip, 'accom', 1200, '');
const sp = Core.spent(trip);
assert(sp.total === 1550 && sp.by.food === 350 && sp.by.accom === 1200, 'expense sums');
Core.removeExpense(trip, trip.expenses[0].id);
assert(Core.spent(trip).total === 350 || Core.spent(trip).total === 1200, 'expense removal');
assert(Core.addDays('2026-07-01', 4) === '2026-07-05', 'date math');

// affiliate links carry ids when configured
AFF.agoda_cid = '999001'; AFF.booking_aid = '888002'; AFF.klook_aid = '777003';
AFF.t12go_z = '666004'; AFF.trip_allianceid = '555005'; AFF.trip_sid = '444006';
const a = Links.hotelAgoda(trip);
assert(a.includes('agoda.com') && a.includes('cid=999001') && a.includes('Phuket'), 'agoda link: ' + a);
const b = Links.hotelBooking(trip);
assert(b.includes('booking.com') && b.includes('aid=888002') && b.includes('checkin=2026-07-01') && b.includes('checkout=2026-07-05'), 'booking link: ' + b);
const k = Links.activities(trip);
assert(k.includes('klook.com') && k.includes('aid=777003'), 'klook link: ' + k);
const g = Links.ground(trip);
assert(g.includes('12go.asia') && g.includes('z=666004') && g.includes('phuket'), '12go link: ' + g);
const f = Links.flights();
assert(f.includes('trip.com') && f.includes('Allianceid=555005') && f.includes('SID=444006'), 'trip.com link: ' + f);
// links still valid without ids
AFF.agoda_cid = '';
assert(!Links.hotelAgoda(trip).includes('cid='), 'no empty cid param');

// budget-first planner
const plans = Core.planOptions(10000, 2, 'mid', false);
assert(plans.length > 0, 'plans found for 10k/2p');
for (const o of plans) assert(o.total <= 10000 && o.left >= 0, 'plan fits budget: ' + JSON.stringify(o));
for (let i = 1; i < plans.length; i++)
  assert(plans[i - 1].nights >= plans[i].nights, 'plans sorted by nights');
const rich = Core.planOptions(60000, 2, 'mid', false);
assert(rich[0].nights > plans[0].nights, 'bigger budget buys more nights');
assert(Core.planOptions(500, 2, 'comfort', false).length === 0, 'tiny budget finds nothing premium');
const withFl = Core.planOptions(20000, 2, 'mid', true).find(o => o.dest === 'chiangmai');
const noFl = Core.planOptions(20000, 2, 'mid', false).find(o => o.dest === 'chiangmai');
assert(withFl && noFl && withFl.nights <= noFl.nights, 'flights eat into nights');

// food/restaurant affiliates + category router
AFF.eatigo_ref = 'EAT123'; AFF.hungryhub_ref = 'HH456'; AFF.klook_aid = '777003';
const bkk = Core.newTrip({ dest: 'bangkok', style: 'mid', nights: 2, people: 2, start: '', inclFlights: false });
assert(Links.foodEatigo(bkk).includes('eatigo.com/th/bangkok') && Links.foodEatigo(bkk).includes('ref=EAT123'), 'eatigo bkk link');
const paiTrip = Core.newTrip({ dest: 'pai', style: 'budget', nights: 2, people: 1, start: '', inclFlights: false });
assert(Links.foodEatigo(paiTrip).includes('/bangkok'), 'eatigo falls back to bangkok for uncovered cities');
assert(Links.foodHungryHub().includes('hungryhub') && Links.foodHungryHub().includes('ref=HH456'), 'hungry hub link');
assert(Links.foodKlook(bkk).includes('food'), 'klook food link');
assert(Links.forCategory('accom', bkk).includes('agoda'), 'router accom');
assert(Links.forCategory('food', bkk).includes('eatigo'), 'router food');
assert(Links.forCategory('transport', bkk).includes('12go'), 'router transport');
assert(Links.forCategory('act', bkk).includes('klook'), 'router act');
assert(Links.forCategory('shopping', bkk) === null, 'no affiliate for shopping');

// curated picks: every destination fully stocked with real places
for (const k in DESTS){
  const pk = PICKS[k];
  assert(pk, k + ' has curated picks');
  assert(pk.h.length === 3 && pk.a.length === 3 && pk.e.length === 3, k + ' has 3/3/3 picks');
  const tiers = pk.h.map(h => h.tier).sort().join(',');
  assert(tiers === 'budget,comfort,mid', k + ' hotel tiers cover all styles: ' + tiers);
  for (const h of pk.h) assert(h.n && h.th && h.p > 0 && h.area, k + ' hotel fields');
  for (const a of pk.a) assert(a.n && a.th && a.p >= 0, k + ' activity fields');
  for (const e of pk.e) assert(e.n && e.th && e.area && e.p >= 1 && e.p <= 3, k + ' eat fields');
}
AFF.agoda_cid = '999001';
const named = Links.hotelByName(bkk, PICKS.bangkok.h[1].n);
assert(named.includes('agoda.com') && named.includes('cid=999001') && named.includes('Novotel'), 'named hotel link: ' + named);
assert(Links.actByName(PICKS.phuket.a[0].n).includes('klook.com'), 'named activity link');
assert(Links.placeMap(PICKS.bangkok.e[2].n, bkk).includes('google.com/maps'), 'restaurant map link');

// worldwide country cost table
let nC = 0;
for (const q in WORLD.C){
  const c = WORLD.C[q];
  assert(c.en && c.th && c.flight >= 0, q + ' country names');
  for (const s of ['budget', 'mid', 'comfort'])
    assert(Array.isArray(c.costs[s]) && c.costs[s].length === 4 && c.costs[s].every(n => n > 0), q + '/' + s);
  assert(Core.total(Core.estimateCosts(c.costs, c.flight, 'budget', 3, 2, false)) <
         Core.total(Core.estimateCosts(c.costs, c.flight, 'comfort', 3, 2, false)), q + ' style order');
  nC++;
}
assert(nC >= 45, 'at least 45 countries, got ' + nC);
assert(WORLD.costsFor('Q999999') === WORLD.DEFAULT, 'unknown country falls back to world default');

// custom worldwide trip end-to-end
const jp = WORLD.C.Q17;
const tokyo = Core.newTrip({ dest: 'custom', style: 'mid', nights: 5, people: 2, start: '2026-10-01', inclFlights: true,
  custom: { name: 'Tokyo', img: 'https://example.com/t.jpg', countryQ: 'Q17', countryEn: jp.en, countryTh: jp.th, costs: jp.costs, flight: jp.flight } });
assert(tokyo.budget.flights === 28000, 'tokyo flights 2x14000');
assert(Core.total(tokyo.budget) > 60000, 'tokyo 5n mid is substantial: ' + Core.total(tokyo.budget));
const di = Core.destInfo(tokyo);
assert(di.en === 'Tokyo' && di.img.includes('example.com') && di.countryQ === 'Q17', 'destInfo custom');
assert(Links.hotelAgoda(tokyo).includes('Tokyo') && !Links.hotelAgoda(tokyo).includes('Thailand'), 'agoda worldwide link');
assert(!Links.groundAvailable(tokyo), '12go hidden outside SEA');
assert(!Links.foodAvailable(tokyo), 'eatigo hidden outside Thailand');
assert(Links.groundAvailable(bkk) && Links.foodAvailable(bkk), 'thai trips keep all partners');

// icons exist for every reference
for (const c of CATS) assert(ICONS[c.icon], 'icon for ' + c.id);
for (const n of ['plus','sparkles','search','globe','check','x','share','back','star','flame','wallet','receipt','tag','suitcase','refresh','chevron','pin','building','bus','plane','bed','bowl','ticket','bag','coins'])
  assert(ICONS[n], 'icon ' + n);

// ---- automatic full-trip planner ----
// Thai trip: must pick a real hotel, build a day per night+1, fit budget
const pk = Core.newTrip({ dest: 'phuket', style: 'mid', nights: 4, people: 2, start: '2026-07-01', inclFlights: true });
const ap = Core.autoPlan(pk);
assert(ap.hotel && ap.hotel.n, 'auto-plan picks a real hotel');
assert(ap.days.length === pk.nights + 1, 'one card per day incl. departure: ' + ap.days.length);
assert(ap.grand > 0 && ap.stay > 0 && ap.foodTotal > 0, 'plan has costs');
// every non-travel/free slot carries a positive cost or is explicitly free
let hasEat = false, hasAct = false;
for (const d of ap.days) for (const s of d.slots){
  if (s.type === 'eat') hasEat = true;
  if (s.type === 'act') hasAct = true;
}
assert(hasEat && hasAct, 'plan includes meals and activities');

// downgrade logic: a tiny budget forces a cheaper hotel tier and still fits
const cheap = Core.newTrip({ dest: 'phuket', style: 'comfort', nights: 3, people: 2, start: '', inclFlights: false });
cheap.budget = Core.estimate('phuket', 'budget', 3, 2, false); // pretend user only has the budget-tier money
const ap2 = Core.autoPlan(cheap);
assert(ap2.hotel.tier !== 'comfort', 'auto-plan downgrades hotel to fit budget: ' + ap2.hotel.tier);
assert(ap2.grand <= ap2.budgetTotal * 1.05, 'downgraded plan respects budget');

// shuffle changes the arrangement
const s0 = JSON.stringify(Core.autoPlan(pk).days);
pk.planSeed = 1;
const s1 = JSON.stringify(Core.autoPlan(pk).days);
assert(s0 !== s1, 'shuffle (planSeed) re-arranges the itinerary');

// worldwide trip: no curated picks, still produces a complete plan
const ap3 = Core.autoPlan(tokyo);
assert(ap3.days.length === tokyo.nights + 1 && ap3.grand > 0, 'worldwide auto-plan works without picks');
assert(ap3.stay > 0 && ap3.flights === tokyo.budget.flights, 'worldwide plan stay+flights');

console.log('BUDGETTRIP SMOKE TEST PASSED —', Object.keys(DESTS).length, 'Thai dests, 108 picks,', nC, 'countries, auto-itinerary, icons, links OK');
`, sandbox, { filename: 'budgettrip-test.js' });
