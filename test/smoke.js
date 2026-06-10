'use strict';
// Headless test of BudgetTrip logic: estimates, expense math, affiliate links.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const files = ['config.js', 'data.js', 'core.js'];
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

console.log('BUDGETTRIP SMOKE TEST PASSED —', Object.keys(DESTS).length, 'destinations, estimates, expenses, planner, affiliate links OK');
`, sandbox, { filename: 'budgettrip-test.js' });
