'use strict';
// GENERATED FILE — edit js/*.js and run: node tools/build.js
/* ===== config.js ===== */
// Affiliate configuration — put your partner IDs here. Links work without
// them (no tracking); with them, bookings earn your commission.
const AFF = {
  agoda_cid: '',        // Agoda partner CID, e.g. '1844104'
  booking_aid: '',      // Booking.com affiliate aid
  klook_aid: '',        // Klook affiliate id (aid)
  t12go_z: '',          // 12Go Asia partner ?z= id
  trip_allianceid: '',  // Trip.com Allianceid
  trip_sid: '',         // Trip.com SID
  eatigo_ref: '',       // Eatigo via involve.asia — your tracking ref
  hungryhub_ref: '',    // Hungry Hub partner ref
};

const Links = {
  enc: s => encodeURIComponent(s),

  hotelAgoda(trip){
    const d = Core.dest(trip);
    let u = 'https://www.agoda.com/search?textSearch=' + Links.enc(d.en + ', Thailand') +
      '&adults=' + trip.people + '&rooms=' + Core.rooms(trip.people) + '&los=' + trip.nights;
    if (trip.start) u += '&checkIn=' + trip.start;
    if (AFF.agoda_cid) u += '&cid=' + AFF.agoda_cid;
    return u;
  },

  hotelBooking(trip){
    const d = Core.dest(trip);
    let u = 'https://www.booking.com/searchresults.html?ss=' + Links.enc(d.en + ', Thailand') +
      '&group_adults=' + trip.people + '&no_rooms=' + Core.rooms(trip.people);
    if (trip.start){
      u += '&checkin=' + trip.start + '&checkout=' + Core.addDays(trip.start, trip.nights);
    }
    if (AFF.booking_aid) u += '&aid=' + AFF.booking_aid;
    return u;
  },

  activities(trip){
    const d = Core.dest(trip);
    let u = 'https://www.klook.com/search/result/?query=' + Links.enc(d.en);
    if (AFF.klook_aid) u += '&aid=' + AFF.klook_aid;
    return u;
  },

  ground(trip){
    const d = Core.dest(trip);
    let u = d.slug12go
      ? 'https://12go.asia/en/travel/bangkok/' + d.slug12go
      : 'https://12go.asia/en';
    if (AFF.t12go_z) u += (u.includes('?') ? '&' : '?') + 'z=' + AFF.t12go_z;
    return u;
  },

  flights(){
    let u = 'https://www.trip.com/flights/';
    const q = [];
    if (AFF.trip_allianceid) q.push('Allianceid=' + AFF.trip_allianceid);
    if (AFF.trip_sid) q.push('SID=' + AFF.trip_sid);
    if (q.length) u += '?' + q.join('&');
    return u;
  },

  // restaurant deals — Eatigo covers BKK / Pattaya / Phuket / Chiang Mai
  EATIGO_CITIES: { bangkok: 'bangkok', pattaya: 'pattaya', phuket: 'phuket', chiangmai: 'chiang-mai' },
  foodEatigo(trip){
    const city = Links.EATIGO_CITIES[trip.dest] || 'bangkok';
    let u = 'https://eatigo.com/th/' + city + '/en';
    if (AFF.eatigo_ref) u += '?ref=' + AFF.eatigo_ref;
    return u;
  },
  foodHungryHub(){
    let u = 'https://web.hungryhub.com/';
    if (AFF.hungryhub_ref) u += '?ref=' + AFF.hungryhub_ref;
    return u;
  },
  foodKlook(trip){
    const d = Core.dest(trip);
    let u = 'https://www.klook.com/search/result/?query=' + Links.enc(d.en + ' food');
    if (AFF.klook_aid) u += '&aid=' + AFF.klook_aid;
    return u;
  },

  // deep links to a specific named place
  hotelByName(trip, name){
    let u = 'https://www.agoda.com/search?textSearch=' + Links.enc(name) +
      '&adults=' + trip.people + '&rooms=' + Core.rooms(trip.people) + '&los=' + trip.nights;
    if (trip.start) u += '&checkIn=' + trip.start;
    if (AFF.agoda_cid) u += '&cid=' + AFF.agoda_cid;
    return u;
  },
  actByName(name){
    let u = 'https://www.klook.com/search/result/?query=' + Links.enc(name);
    if (AFF.klook_aid) u += '&aid=' + AFF.klook_aid;
    return u;
  },
  placeMap(name, trip){
    const d = Core.dest(trip);
    return 'https://www.google.com/maps/search/' + Links.enc(name + ' ' + d.en + ' Thailand');
  },

  // best affiliate for a budget category, with trip context
  forCategory(cat, trip){
    if (cat === 'accom') return Links.hotelAgoda(trip);
    if (cat === 'flights') return Links.flights();
    if (cat === 'transport') return Links.ground(trip);
    if (cat === 'act') return Links.activities(trip);
    if (cat === 'food') return Links.foodEatigo(trip);
    return null;
  },
};

/* ===== data.js ===== */
// Destination cost data: accom = THB per room per night;
// food / transport / act = THB per person per day.
// flight = rough round-trip from Bangkok per person (0 = no airport / overland).
const DESTS = {
  bangkok:      { en: 'Bangkok', th: 'กรุงเทพฯ', emoji: '🏙️', flight: 0, slug12go: '',
    costs: { budget: [450, 250, 120, 150], mid: [1300, 550, 250, 400], comfort: [3500, 1400, 600, 900] } },
  chiangmai:    { en: 'Chiang Mai', th: 'เชียงใหม่', emoji: '⛰️', flight: 1900, slug12go: 'chiang-mai',
    costs: { budget: [350, 200, 100, 150], mid: [1000, 450, 200, 400], comfort: [2800, 1100, 500, 800] } },
  chiangrai:    { en: 'Chiang Rai', th: 'เชียงราย', emoji: '🛕', flight: 2000, slug12go: 'chiang-rai',
    costs: { budget: [300, 200, 100, 150], mid: [900, 400, 200, 350], comfort: [2500, 1000, 450, 700] } },
  phuket:       { en: 'Phuket', th: 'ภูเก็ต', emoji: '🏝️', flight: 2300, slug12go: 'phuket',
    costs: { budget: [500, 300, 180, 250], mid: [1600, 650, 350, 600], comfort: [4500, 1600, 700, 1200] } },
  krabi:        { en: 'Krabi', th: 'กระบี่', emoji: '🚤', flight: 2200, slug12go: 'krabi',
    costs: { budget: [450, 280, 150, 250], mid: [1400, 600, 300, 600], comfort: [4000, 1400, 600, 1100] } },
  kohsamui:     { en: 'Koh Samui', th: 'เกาะสมุย', emoji: '🥥', flight: 4200, slug12go: 'koh-samui',
    costs: { budget: [600, 320, 180, 250], mid: [1800, 700, 350, 600], comfort: [5000, 1700, 700, 1200] } },
  kohtao:       { en: 'Koh Tao', th: 'เกาะเต่า', emoji: '🤿', flight: 0, slug12go: 'koh-tao',
    costs: { budget: [500, 300, 150, 300], mid: [1500, 650, 300, 700], comfort: [3800, 1400, 600, 1300] } },
  pattaya:      { en: 'Pattaya', th: 'พัทยา', emoji: '🎡', flight: 0, slug12go: 'pattaya',
    costs: { budget: [450, 280, 150, 200], mid: [1300, 600, 300, 500], comfort: [3500, 1400, 600, 900] } },
  huahin:       { en: 'Hua Hin', th: 'หัวหิน', emoji: '🏖️', flight: 0, slug12go: 'hua-hin',
    costs: { budget: [450, 270, 130, 180], mid: [1300, 550, 250, 450], comfort: [3500, 1300, 550, 800] } },
  kanchanaburi: { en: 'Kanchanaburi', th: 'กาญจนบุรี', emoji: '🌉', flight: 0, slug12go: 'kanchanaburi',
    costs: { budget: [350, 220, 120, 180], mid: [900, 450, 250, 400], comfort: [2500, 1000, 500, 700] } },
  pai:          { en: 'Pai', th: 'ปาย', emoji: '🌄', flight: 0, slug12go: 'pai',
    costs: { budget: [300, 220, 100, 180], mid: [900, 450, 220, 400], comfort: [2200, 1000, 450, 700] } },
  kohchang:     { en: 'Koh Chang', th: 'เกาะช้าง', emoji: '🐘', flight: 0, slug12go: 'koh-chang',
    costs: { budget: [450, 280, 150, 220], mid: [1300, 600, 300, 500], comfort: [3500, 1300, 600, 900] } },
};

const CATS = [
  { id: 'accom', emoji: '🏨' },
  { id: 'food', emoji: '🍜' },
  { id: 'transport', emoji: '🛵' },
  { id: 'act', emoji: '🎟️' },
  { id: 'flights', emoji: '✈️' },
  { id: 'shopping', emoji: '🛍️' },
  { id: 'misc', emoji: '💸' },
];

const I18N = {
  en: {
    tagline: 'Plan your Thai trip budget in 30 seconds',
    newTrip: '+ New Trip', myTrips: 'My trips', noTrips: 'No trips yet — plan your first one!',
    where: 'Where to?', nights: 'Nights', people: 'Travelers', style: 'Travel style',
    sBudget: 'Backpacker', sMid: 'Comfortable', sComfort: 'Premium',
    startDate: 'Start date (optional)', inclFlights: 'Include flights from Bangkok',
    create: 'Create trip & estimate budget',
    budget: 'Budget', expenses: 'Expenses', book: 'Book',
    total: 'Total budget', spent: 'Spent', remaining: 'Remaining', perPerson: 'per person',
    accom: 'Accommodation', food: 'Food & drinks', transport: 'Local transport',
    act: 'Activities', flights: 'Flights', shopping: 'Shopping', misc: 'Buffer / misc',
    addExpense: 'Add', amount: 'Amount (฿)', note: 'Note (optional)', noExpenses: 'No expenses yet — add your first one above.',
    reestimate: '↻ Re-estimate from averages', tapToEdit: 'Tap a number to edit it',
    bookTitle: 'Book your trip', bookHotelA: 'Hotels on Agoda', bookHotelB: 'Hotels on Booking.com',
    bookFlights: 'Flights on Trip.com', bookGround: 'Bus · Train · Ferry (12Go)', bookAct: 'Tours & tickets on Klook',
    bookHotelDesc: 'Best coverage in Thailand, pay at hotel options',
    bookFlightsDesc: 'Compare domestic and international fares',
    bookGroundDesc: 'Every route from Bangkok, book seats online',
    bookActDesc: 'Skip-the-line tickets, day trips, cooking classes',
    disclosure: 'Some links are affiliate links — booking through them may earn us a commission at no extra cost to you.',
    share: 'Share', deleteTrip: 'Delete trip', confirm: 'Tap again to confirm',
    over: 'over budget', daysLeft: 'nights', open: 'Open',
    sharedWith: 'planned with BudgetTrip',
    planBtn: '💰 I have a budget — plan for me',
    planTitle: 'How much do you have?',
    yourBudget: 'Your budget (฿)',
    planResults: 'With this budget you can go…',
    noFit: 'Budget too small for these settings — add more or switch style.',
    pickPlan: 'Pick this plan',
    left: 'left over',
    deal: 'Best deal',
    bestPicks: 'Best picks for your plan',
    bestBadge: 'TOP PICK',
    bookFood: 'Restaurant deals (Eatigo)',
    bookFoodDesc: 'Up to 50% off when you book a table ahead',
    bookFood2: 'Restaurant packages (Hungry Hub)',
    bookFood2Desc: 'Set menus & all-you-can-eat at fixed net prices',
    sortedNote: 'Sorted by where your money goes in this plan',
    recHotels: 'Recommended hotels', topActs: 'Top things to do', mustEat: 'Where locals eat',
    perNight: '/night', approxFrom: 'approx from', fitsPlan: 'fits your plan', freeEntry: 'free',
    mapBtn: 'Map', bookBtn: 'Book', morePartners: 'Search everything yourself',
  },
  th: {
    tagline: 'วางแผนงบเที่ยวไทยใน 30 วินาที',
    newTrip: '+ ทริปใหม่', myTrips: 'ทริปของฉัน', noTrips: 'ยังไม่มีทริป — เริ่มวางแผนกันเลย!',
    where: 'ไปเที่ยวที่ไหน?', nights: 'จำนวนคืน', people: 'ผู้เดินทาง', style: 'สไตล์การเที่ยว',
    sBudget: 'ประหยัด', sMid: 'มาตรฐาน', sComfort: 'พรีเมียม',
    startDate: 'วันออกเดินทาง (ไม่บังคับ)', inclFlights: 'รวมตั๋วเครื่องบินจากกรุงเทพฯ',
    create: 'สร้างทริปและคำนวณงบ',
    budget: 'งบประมาณ', expenses: 'ค่าใช้จ่าย', book: 'จองเลย',
    total: 'งบทั้งหมด', spent: 'ใช้ไปแล้ว', remaining: 'คงเหลือ', perPerson: 'ต่อคน',
    accom: 'ที่พัก', food: 'อาหารและเครื่องดื่ม', transport: 'เดินทางในพื้นที่',
    act: 'กิจกรรม', flights: 'ตั๋วเครื่องบิน', shopping: 'ช้อปปิ้ง', misc: 'เผื่อฉุกเฉิน',
    addExpense: 'เพิ่ม', amount: 'จำนวนเงิน (฿)', note: 'บันทึก (ไม่บังคับ)', noExpenses: 'ยังไม่มีรายการ — เพิ่มรายการแรกด้านบนเลย',
    reestimate: '↻ คำนวณใหม่จากค่าเฉลี่ย', tapToEdit: 'แตะตัวเลขเพื่อแก้ไข',
    bookTitle: 'จองทริปของคุณ', bookHotelA: 'จองที่พักผ่าน Agoda', bookHotelB: 'ที่พักบน Booking.com',
    bookFlights: 'ตั๋วเครื่องบิน Trip.com', bookGround: 'รถทัวร์ · รถไฟ · เรือ (12Go)', bookAct: 'ทัวร์และตั๋วบน Klook',
    bookHotelDesc: 'ที่พักเยอะสุดในไทย มีแบบจ่ายที่โรงแรม',
    bookFlightsDesc: 'เทียบราคาตั๋วในประเทศและต่างประเทศ',
    bookGroundDesc: 'ทุกเส้นทางจากกรุงเทพฯ จองที่นั่งออนไลน์',
    bookActDesc: 'ตั๋วเข้าชม ทริปรายวัน คลาสทำอาหาร',
    disclosure: 'บางลิงก์เป็นลิงก์พันธมิตร — การจองผ่านลิงก์อาจทำให้เราได้รับค่าคอมมิชชั่น โดยคุณไม่เสียค่าใช้จ่ายเพิ่ม',
    share: 'แชร์', deleteTrip: 'ลบทริป', confirm: 'แตะอีกครั้งเพื่อยืนยัน',
    over: 'เกินงบ', daysLeft: 'คืน', open: 'เปิด',
    sharedWith: 'วางแผนด้วย BudgetTrip',
    planBtn: '💰 มีตังเท่านี้ ให้แอพวางแผน',
    planTitle: 'มีงบเท่าไหร่?',
    yourBudget: 'งบของคุณ (฿)',
    planResults: 'งบนี้ไปได้เลย…',
    noFit: 'งบยังไม่พอสำหรับเงื่อนไขนี้ — ลองเพิ่มงบหรือเปลี่ยนสไตล์ดูนะ',
    pickPlan: 'เลือกแผนนี้',
    left: 'เหลือ',
    deal: 'ดีลเด็ด',
    bestPicks: 'ดีลที่ดีที่สุดสำหรับแผนนี้',
    bestBadge: 'แนะนำ',
    bookFood: 'จองร้านอาหารลดสูงสุด 50% (Eatigo)',
    bookFoodDesc: 'จองโต๊ะล่วงหน้า รับส่วนลดทันที',
    bookFood2: 'แพ็กเกจร้านอาหาร (Hungry Hub)',
    bookFood2Desc: 'เซ็ตเมนู / บุฟเฟ่ต์ ราคาเหมาจ่ายชัดเจน',
    sortedNote: 'เรียงตามหมวดที่ใช้เงินเยอะสุดในแผนของคุณ',
    recHotels: 'โรงแรมแนะนำ', topActs: 'กิจกรรมยอดฮิต', mustEat: 'ร้านเด็ดต้องลอง',
    perNight: '/คืน', approxFrom: 'เริ่ม ~', fitsPlan: 'เหมาะกับแผนคุณ', freeEntry: 'ฟรี',
    mapBtn: 'แผนที่', bookBtn: 'จอง', morePartners: 'ค้นหาเองทั้งหมด',
  },
};

/* ===== picks.js ===== */
// Curated real places per destination — shown in-app with approx prices,
// each deep-linking to the matching affiliate (Agoda / Klook) or maps.
// h: hotels {n: search name, th: Thai display, tier, p: ฿/night, area}
// a: activities {n, th, p: ฿/person}
// e: restaurants {n, th, area, p: ฿ price level 1-3}
const PICKS = {
  bangkok: {
    h: [
      { n: 'Lub d Bangkok Siam', th: 'ลับแล แบงค็อก สยาม', tier: 'budget', p: 700, area: 'สยาม' },
      { n: 'Novotel Bangkok Sukhumvit 20', th: 'โนโวเทล สุขุมวิท 20', tier: 'mid', p: 1900, area: 'สุขุมวิท' },
      { n: 'Chatrium Hotel Riverside Bangkok', th: 'ชาเทรียม ริเวอร์ไซด์', tier: 'comfort', p: 4200, area: 'ริมแม่น้ำ' },
    ],
    a: [
      { n: 'Grand Palace and Wat Phra Kaew Bangkok', th: 'พระบรมมหาราชวัง & วัดพระแก้ว', p: 500 },
      { n: 'Chao Phraya dinner cruise Bangkok', th: 'ล่องเรือดินเนอร์เจ้าพระยา', p: 1200 },
      { n: 'Damnoen Saduak floating market tour', th: 'ทัวร์ตลาดน้ำดำเนินสะดวก', p: 900 },
    ],
    e: [
      { n: 'Thipsamai Pad Thai Bangkok', th: 'ทิพย์สมัย ผัดไทยประตูผี', area: 'เสาชิงช้า', p: 1 },
      { n: 'Somtum Der Bangkok', th: 'ส้มตำเด้อ', area: 'สีลม', p: 2 },
      { n: 'Jay Fai Bangkok', th: 'เจ๊ไฝ (มิชลิน 1 ดาว)', area: 'ประตูผี', p: 3 },
    ],
  },
  chiangmai: {
    h: [
      { n: 'ibis Styles Chiang Mai', th: 'ไอบิส สไตล์ เชียงใหม่', tier: 'budget', p: 900, area: 'ช้างคลาน' },
      { n: 'Duangtawan Hotel Chiang Mai', th: 'ดวงตะวัน เชียงใหม่', tier: 'mid', p: 1400, area: 'ไนท์บาซาร์' },
      { n: '137 Pillars House Chiang Mai', th: '137 พิลลาร์ส เฮาส์', tier: 'comfort', p: 12000, area: 'วัดเกต' },
    ],
    a: [
      { n: 'Doi Suthep temple tour Chiang Mai', th: 'ทัวร์ดอยสุเทพ & วัดผาลาด', p: 800 },
      { n: 'Elephant Nature Park Chiang Mai', th: 'ศูนย์อนุรักษ์ช้าง Elephant Nature Park', p: 2500 },
      { n: 'Thai cooking class Chiang Mai', th: 'คลาสทำอาหารไทย', p: 1200 },
    ],
    e: [
      { n: 'Khao Soi Khun Yai Chiang Mai', th: 'ข้าวซอยคุณยาย', area: 'ศรีภูมิ', p: 1 },
      { n: 'Huen Phen Chiang Mai', th: 'เฮือนเพ็ญ', area: 'พระสิงห์', p: 2 },
      { n: 'The Riverside Bar and Restaurant Chiang Mai', th: 'เดอะ ริเวอร์ไซด์', area: 'ริมปิง', p: 2 },
    ],
  },
  chiangrai: {
    h: [
      { n: 'Mercy Hostel Chiang Rai', th: 'เมอร์ซี่ โฮสเทล', tier: 'budget', p: 450, area: 'ตัวเมือง' },
      { n: 'Nak Nakara Hotel Chiang Rai', th: 'นาคนคร', tier: 'mid', p: 1400, area: 'ตัวเมือง' },
      { n: 'The Riverie by Katathani Chiang Rai', th: 'เดอะ ริเวอร์รี บาย กะตะธานี', tier: 'comfort', p: 3200, area: 'ริมแม่น้ำกก' },
    ],
    a: [
      { n: 'Wat Rong Khun White Temple', th: 'วัดร่องขุ่น (วัดขาว)', p: 100 },
      { n: 'Golden Triangle day tour Chiang Rai', th: 'ทัวร์สามเหลี่ยมทองคำ', p: 1200 },
      { n: 'Singha Park Chiang Rai', th: 'สิงห์ปาร์ค', p: 150 },
    ],
    e: [
      { n: 'Lung Eed chicken larb Chiang Rai', th: 'ลาบไก่ลุงอี๊ด', area: 'ตัวเมือง', p: 1 },
      { n: 'Chivit Thamma Da Chiang Rai', th: 'ชีวิตธรรมดา', area: 'ริมน้ำกก', p: 3 },
      { n: 'Chiang Rai Night Bazaar', th: 'ไนท์บาซาร์เชียงราย', area: 'ตัวเมือง', p: 1 },
    ],
  },
  phuket: {
    h: [
      { n: 'Lub d Phuket Patong', th: 'ลับแล ภูเก็ต ป่าตอง', tier: 'budget', p: 800, area: 'ป่าตอง' },
      { n: 'Novotel Phuket City Phokeethra', th: 'โนโวเทล ภูเก็ตซิตี้', tier: 'mid', p: 1800, area: 'ตัวเมือง' },
      { n: 'The Shore at Katathani Phuket', th: 'เดอะ ชอร์ แอท กะตะธานี', tier: 'comfort', p: 9500, area: 'หาดกะตะน้อย' },
    ],
    a: [
      { n: 'Phi Phi islands speedboat tour Phuket', th: 'ทัวร์เกาะพีพี สปีดโบ๊ท', p: 1400 },
      { n: 'Phuket FantaSea show', th: 'โชว์ภูเก็ตแฟนตาซี', p: 1800 },
      { n: 'Phuket old town food tour', th: 'ฟู้ดทัวร์เมืองเก่าภูเก็ต', p: 900 },
    ],
    e: [
      { n: 'Kopitiam by Wilai Phuket', th: 'โกปี๊เตี่ยม บาย วิไล', area: 'เมืองเก่า', p: 1 },
      { n: 'One Chun Cafe Phuket', th: 'วันจันทร์', area: 'เมืองเก่า', p: 2 },
      { n: 'Raya Restaurant Phuket', th: 'ระย้า', area: 'เมืองเก่า', p: 3 },
    ],
  },
  krabi: {
    h: [
      { n: 'Pak-Up Hostel Krabi', th: 'พักอัพ โฮสเทล', tier: 'budget', p: 450, area: 'กระบี่ทาวน์' },
      { n: 'Aonang Cliff Beach Resort', th: 'อ่าวนาง คลิฟ บีช รีสอร์ท', tier: 'mid', p: 2000, area: 'อ่าวนาง' },
      { n: 'Rayavadee Krabi', th: 'รายาวดี', tier: 'comfort', p: 16000, area: 'ไร่เลย์' },
    ],
    a: [
      { n: '4 islands speedboat tour Krabi', th: 'ทัวร์ 4 เกาะ สปีดโบ๊ท', p: 1100 },
      { n: 'Railay rock climbing Krabi', th: 'ปีนผาไร่เลย์ (เริ่มต้น)', p: 1500 },
      { n: 'Emerald pool hot springs tour Krabi', th: 'สระมรกต & น้ำพุร้อน', p: 1000 },
    ],
    e: [
      { n: 'Krua Thara Seafood Krabi', th: 'ครัวธารา ซีฟู้ด', area: 'อ่าวน้ำเมา', p: 2 },
      { n: 'Kotung Restaurant Krabi', th: 'โกตุง', area: 'กระบี่ทาวน์', p: 2 },
      { n: 'Ao Nang Landmark Night Market', th: 'ตลาดกลางคืนอ่าวนาง', area: 'อ่าวนาง', p: 1 },
    ],
  },
  kohsamui: {
    h: [
      { n: 'Lub d Koh Samui Chaweng Beach', th: 'ลับแล สมุย เฉวง', tier: 'budget', p: 900, area: 'เฉวง' },
      { n: 'ibis Samui Bophut', th: 'ไอบิส สมุย บ่อผุด', tier: 'mid', p: 1700, area: 'บ่อผุด' },
      { n: 'Six Senses Samui', th: 'ซิกซ์เซนส์ สมุย', tier: 'comfort', p: 15000, area: 'แหลมสมรง' },
    ],
    a: [
      { n: 'Ang Thong marine park tour Samui', th: 'ทัวร์หมู่เกาะอ่างทอง', p: 1800 },
      { n: 'Pig island tour Koh Samui', th: 'ทัวร์เกาะหมู (เกาะมัดสุม)', p: 1300 },
      { n: 'Samui 4WD jungle safari', th: 'จังเกิ้ลซาฟารี 4WD', p: 1200 },
    ],
    e: [
      { n: 'Krua Chao Baan Samui', th: 'ครัวชาวบ้าน', area: 'แม่น้ำ', p: 2 },
      { n: 'Fishermans Village night market Samui', th: 'ถนนคนเดินหมู่บ้านชาวประมง', area: 'บ่อผุด', p: 1 },
      { n: 'The Jungle Club Samui', th: 'เดอะ จังเกิ้ล คลับ', area: 'เฉวงโน้ย', p: 3 },
    ],
  },
  kohtao: {
    h: [
      { n: 'Savage Hostel Koh Tao', th: 'ซาเวจ โฮสเทล', tier: 'budget', p: 500, area: 'แม่หาด' },
      { n: 'Sairee Cottage Resort Koh Tao', th: 'ทรายรี คอทเทจ', tier: 'mid', p: 1300, area: 'หาดทรายรี' },
      { n: 'Jamahkiri Resort Koh Tao', th: 'จามาคีรี รีสอร์ท & สปา', tier: 'comfort', p: 3800, area: 'อ่าวโฉลกบ้านเก่า' },
    ],
    a: [
      { n: 'PADI Open Water course Koh Tao', th: 'คอร์สดำน้ำ PADI Open Water', p: 11000 },
      { n: 'Koh Tao snorkeling boat trip', th: 'ทริปเรือดำน้ำตื้นรอบเกาะ', p: 750 },
      { n: 'Koh Nang Yuan day trip', th: 'เกาะนางยวน', p: 600 },
    ],
    e: [
      { n: '995 Roasted Duck Koh Tao', th: 'เป็ดย่าง 995', area: 'แม่หาด', p: 1 },
      { n: 'Su Chili Koh Tao', th: 'สุชิลี', area: 'ทรายรี', p: 2 },
      { n: 'Barracuda Restaurant Koh Tao', th: 'บาราคูด้า', area: 'ทรายรี', p: 3 },
    ],
  },
  pattaya: {
    h: [
      { n: 'Red Planet Pattaya', th: 'เรด แพลนเน็ต พัทยา', tier: 'budget', p: 800, area: 'พัทยากลาง' },
      { n: 'Holiday Inn Pattaya', th: 'ฮอลิเดย์ อินน์ พัทยา', tier: 'mid', p: 2600, area: 'ริมหาด' },
      { n: 'InterContinental Pattaya Resort', th: 'อินเตอร์คอนติเนนตัล พัทยา', tier: 'comfort', p: 6500, area: 'พระตำหนัก' },
    ],
    a: [
      { n: 'Nong Nooch tropical garden Pattaya', th: 'สวนนงนุช', p: 600 },
      { n: 'Coral island Koh Larn speedboat Pattaya', th: 'เกาะล้าน สปีดโบ๊ท', p: 900 },
      { n: 'Sanctuary of Truth Pattaya', th: 'ปราสาทสัจธรรม', p: 500 },
    ],
    e: [
      { n: 'Mum Aroi Naklua Pattaya', th: 'มุมอร่อย นาเกลือ', area: 'นาเกลือ', p: 2 },
      { n: 'The Glass House Pattaya', th: 'เดอะ กลาส เฮาส์', area: 'จอมเทียน', p: 3 },
      { n: 'Thepprasit night market Pattaya', th: 'ตลาดนัดเทพประสิทธิ์', area: 'เทพประสิทธิ์', p: 1 },
    ],
  },
  huahin: {
    h: [
      { n: 'ibis Hua Hin', th: 'ไอบิส หัวหิน', tier: 'budget', p: 1000, area: 'เขาตะเกียบ' },
      { n: 'Amari Hua Hin', th: 'อมารี หัวหิน', tier: 'mid', p: 2500, area: 'เขาตะเกียบ' },
      { n: 'Centara Grand Beach Resort Hua Hin', th: 'เซ็นทาราแกรนด์ หัวหิน', tier: 'comfort', p: 5500, area: 'ใจกลางหัวหิน' },
    ],
    a: [
      { n: 'Vana Nava water jungle Hua Hin', th: 'สวนน้ำวานา นาวา', p: 1000 },
      { n: 'Hua Hin Hills vineyard tour', th: 'ไร่องุ่นหัวหินฮิลส์', p: 900 },
      { n: 'Cicada market Hua Hin', th: 'ตลาดจักจั่น', p: 0 },
    ],
    e: [
      { n: 'Jek Pia coffeeshop Hua Hin', th: 'เจ๊กเปี๊ยะ', area: 'ตัวเมือง', p: 1 },
      { n: 'Baan Itsara Hua Hin', th: 'บ้านอิสระ', area: 'ริมทะเล', p: 3 },
      { n: 'Chatchai night market Hua Hin', th: 'ตลาดโต้รุ่งฉัตรไชย', area: 'ตัวเมือง', p: 1 },
    ],
  },
  kanchanaburi: {
    h: [
      { n: 'VN Guesthouse Kanchanaburi', th: 'วีเอ็น เกสต์เฮาส์ (แพริมน้ำ)', tier: 'budget', p: 450, area: 'ริมแคว' },
      { n: 'U Inchantree Kanchanaburi', th: 'ยู อินจันทรี', tier: 'mid', p: 1900, area: 'ริมแคว' },
      { n: 'X2 River Kwai Resort', th: 'ครอสทู ริเวอร์แคว', tier: 'comfort', p: 4500, area: 'ริมแม่น้ำแคว' },
    ],
    a: [
      { n: 'Erawan falls day trip Kanchanaburi', th: 'น้ำตกเอราวัณ', p: 800 },
      { n: 'Death railway train Kanchanaburi', th: 'นั่งรถไฟสายมรณะ', p: 300 },
      { n: 'Bridge over the River Kwai', th: 'สะพานข้ามแม่น้ำแคว', p: 0 },
    ],
    e: [
      { n: 'Keeree Tara Kanchanaburi', th: 'คีรีธารา', area: 'ริมแคว', p: 3 },
      { n: 'Blue Rice Restaurant Kanchanaburi', th: 'บลูไรซ์', area: 'ริมแคว', p: 2 },
      { n: 'JJ Night Market Kanchanaburi', th: 'ตลาดกลางคืน JJ', area: 'ตัวเมือง', p: 1 },
    ],
  },
  pai: {
    h: [
      { n: 'Common Grounds Pai', th: 'คอมมอน กราวด์ ปาย', tier: 'budget', p: 350, area: 'ถนนคนเดิน' },
      { n: 'Pai Village Boutique Resort', th: 'ปายวิลเลจ บูทีค', tier: 'mid', p: 1600, area: 'ใจกลางปาย' },
      { n: 'Reverie Siam Resort Pai', th: 'เรเวอรี สยาม', tier: 'comfort', p: 3000, area: 'แม่ฮี้' },
    ],
    a: [
      { n: 'Pai canyon sunset', th: 'ปายแคนยอน ชมพระอาทิตย์ตก', p: 0 },
      { n: 'Tha Pai hot springs', th: 'บ่อน้ำร้อนท่าปาย', p: 300 },
      { n: 'Yun Lai viewpoint Pai', th: 'จุดชมวิวหยุนไหล + หมู่บ้านสันติชล', p: 200 },
    ],
    e: [
      { n: 'Nas Kitchen Pai', th: "ครัวน้า (Na's Kitchen)", area: 'ตัวเมืองปาย', p: 1 },
      { n: 'Om Garden Cafe Pai', th: 'โอม การ์เด้น คาเฟ่', area: 'ตัวเมืองปาย', p: 2 },
      { n: 'Pai walking street', th: 'ถนนคนเดินปาย', area: 'ใจกลางปาย', p: 1 },
    ],
  },
  kohchang: {
    h: [
      { n: 'Paradise Cottage Koh Chang', th: 'พาราไดซ์ คอทเทจ', tier: 'budget', p: 650, area: 'หาดโลนลี่บีช' },
      { n: 'KC Grande Resort Koh Chang', th: 'เคซี แกรนด์ รีสอร์ท', tier: 'mid', p: 3200, area: 'หาดทรายขาว' },
      { n: 'The Dewa Koh Chang', th: 'เดอะ เดวา เกาะช้าง', tier: 'comfort', p: 4500, area: 'หาดคลองพร้าว' },
    ],
    a: [
      { n: 'Koh Chang 4 islands snorkeling tour', th: 'ทัวร์ดำน้ำตื้น 4 เกาะ', p: 900 },
      { n: 'Klong Plu waterfall Koh Chang', th: 'น้ำตกคลองพลู', p: 200 },
      { n: 'Kayaking Bang Bao Koh Chang', th: 'พายคายัคอ่าวบางเบ้า', p: 500 },
    ],
    e: [
      { n: 'Phu-Talay Seafood Koh Chang', th: 'ภูทะเล ซีฟู้ด', area: 'คลองพร้าว', p: 2 },
      { n: 'Bang Bao pier seafood Koh Chang', th: 'ซีฟู้ดสะพานปลาบางเบ้า', area: 'บางเบ้า', p: 2 },
      { n: 'Saffron on the Sea Koh Chang', th: 'แซฟฟรอน ออน เดอะ ซี', area: 'หาดไก่แบ้', p: 3 },
    ],
  },
};

/* ===== core.js ===== */
// DOM-free app core: budget math, trip model, persistence.
const Core = {
  KEY: 'budgettrip-v1',
  state: { lang: 'th', trips: [], nextId: 1 },

  load(){
    try {
      const raw = localStorage.getItem(Core.KEY);
      if (raw){
        const d = JSON.parse(raw);
        if (d && Array.isArray(d.trips)) Core.state = d;
        return true;
      }
    } catch (e) { /* fresh */ }
    return false;
  },
  save(){
    try { localStorage.setItem(Core.KEY, JSON.stringify(Core.state)); } catch (e) { /* private mode */ }
  },

  dest(trip){ return DESTS[trip.dest] || DESTS.bangkok; },
  rooms(people){ return Math.max(1, Math.ceil(people / 2)); },

  addDays(iso, n){
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  },

  // budget estimate in THB by destination averages
  estimate(destKey, style, nights, people, inclFlights){
    const d = DESTS[destKey] || DESTS.bangkok;
    const [accomRate, foodRate, transRate, actRate] = d.costs[style] || d.costs.mid;
    const rooms = Core.rooms(people);
    const b = {
      accom: accomRate * nights * rooms,
      food: foodRate * nights * people,
      transport: transRate * nights * people,
      act: actRate * nights * people,
      flights: (inclFlights && d.flight) ? d.flight * people : 0,
      shopping: 300 * people,
    };
    b.misc = Math.round(0.08 * (b.accom + b.food + b.transport + b.act));
    return b;
  },

  // longest affordable stay at a destination for a given budget
  maxNightsFor(destKey, style, people, budgetTHB, inclFlights){
    let best = null;
    for (let n = 1; n <= 21; n++){
      const est = Core.estimate(destKey, style, n, people, inclFlights);
      const t = Core.total(est);
      if (t <= budgetTHB) best = { nights: n, total: t };
      else break; // totals grow with nights
    }
    return best;
  },

  // "I have ฿X — where can I go?": best option per destination, sorted
  planOptions(budgetTHB, people, style, inclFlights){
    const opts = [];
    for (const k in DESTS){
      const fl = !!(inclFlights && DESTS[k].flight);
      const r = Core.maxNightsFor(k, style, people, budgetTHB, fl);
      if (r) opts.push({ dest: k, style, nights: r.nights, total: r.total, left: budgetTHB - r.total, inclFlights: fl });
    }
    opts.sort((a, b) => b.nights - a.nights || a.total - b.total);
    return opts;
  },

  total(budget){
    let t = 0;
    for (const c of CATS) t += budget[c.id] || 0;
    return t;
  },

  newTrip(opts){
    const trip = {
      id: Core.state.nextId++,
      dest: opts.dest,
      style: opts.style,
      nights: opts.nights,
      people: opts.people,
      start: opts.start || '',
      inclFlights: !!opts.inclFlights,
      budget: Core.estimate(opts.dest, opts.style, opts.nights, opts.people, opts.inclFlights),
      expenses: [],
      created: Date.now(),
    };
    Core.state.trips.unshift(trip);
    Core.save();
    return trip;
  },

  trip(id){ return Core.state.trips.find(t => t.id === id); },

  deleteTrip(id){
    Core.state.trips = Core.state.trips.filter(t => t.id !== id);
    Core.save();
  },

  addExpense(trip, cat, amount, note){
    trip.expenses.unshift({ id: Date.now() + Math.random(), cat, amount: Math.round(amount), note: (note || '').slice(0, 60), ts: Date.now() });
    Core.save();
  },

  removeExpense(trip, id){
    trip.expenses = trip.expenses.filter(e => e.id !== id);
    Core.save();
  },

  spent(trip){
    const by = {};
    let total = 0;
    for (const c of CATS) by[c.id] = 0;
    for (const e of trip.expenses){
      by[e.cat] = (by[e.cat] || 0) + e.amount;
      total += e.amount;
    }
    return { by, total };
  },

  fmt(n){
    return '฿' + Math.round(n).toLocaleString('en-US');
  },
};

/* ===== app.js ===== */
// BudgetTrip UI: hash-routed single-page app.
// #home | #new | #trip-<id> (+ App.tab for the trip sub-tab)
const App = {
  tab: 'budget',
  form: { dest: 'chiangmai', style: 'mid', nights: 3, people: 2, start: '', inclFlights: false },

  t(k){ return (I18N[Core.state.lang] || I18N.en)[k] || k; },
  img(key){ return 'assets/dest/' + key + '.jpg'; },
  dname(d){ return Core.state.lang === 'th' ? d.th : d.en; },

  init(){
    Core.load();
    document.getElementById('langBtn').onclick = () => {
      Core.state.lang = Core.state.lang === 'th' ? 'en' : 'th';
      Core.save();
      App.render();
    };
    window.addEventListener('hashchange', () => App.render());
    App.render();
  },

  go(h){ location.hash = h; },

  route(){
    const h = (location.hash || '#home').slice(1);
    const m = h.match(/^trip-(\d+)$/);
    if (m) return { view: 'trip', id: +m[1] };
    if (h === 'new') return { view: 'new' };
    if (h === 'plan') return { view: 'plan' };
    return { view: 'home' };
  },

  el(html){
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.firstElementChild;
  },

  toast(m){
    const t = document.getElementById('toast');
    t.textContent = m;
    t.classList.remove('hidden');
    t.style.opacity = 1;
    clearTimeout(App._tt);
    App._tt = setTimeout(() => {
      t.style.opacity = 0;
      setTimeout(() => t.classList.add('hidden'), 300);
    }, 2400);
  },

  render(){
    document.getElementById('langBtn').textContent = Core.state.lang === 'th' ? 'EN' : 'ไทย';
    document.getElementById('tagline').textContent = App.t('tagline');
    const r = App.route();
    const root = document.getElementById('view');
    root.innerHTML = '';
    if (r.view === 'new') root.appendChild(App.viewNew());
    else if (r.view === 'plan') root.appendChild(App.viewPlan());
    else if (r.view === 'trip'){
      const trip = Core.trip(r.id);
      if (trip) root.appendChild(App.viewTrip(trip));
      else { App.go('home'); return; }
    } else root.appendChild(App.viewHome());
    window.scrollTo(0, 0);
  },

  // ---------- home ----------
  viewHome(){
    const w = App.el('<div></div>');
    const nb = App.el('<button class="bigbtn">' + App.t('newTrip') + '</button>');
    nb.onclick = () => App.go('new');
    w.appendChild(nb);
    const pb = App.el('<button class="bigbtn plan">' + App.t('planBtn') + '</button>');
    pb.onclick = () => App.go('plan');
    w.appendChild(pb);
    w.appendChild(App.el('<h2 class="sect">' + App.t('myTrips') + '</h2>'));
    if (!Core.state.trips.length){
      w.appendChild(App.el('<div class="empty">🧳<br>' + App.t('noTrips') + '</div>'));
    }
    for (const trip of Core.state.trips){
      const d = Core.dest(trip);
      const total = Core.total(trip.budget);
      const sp = Core.spent(trip).total;
      const pct = total > 0 ? Math.min(100, Math.round(sp / total * 100)) : 0;
      const card = App.el(
        '<div class="tripcard photo">' +
        '<div class="tc-photo" style="background-image:url(' + App.img(trip.dest) + ')">' +
        '<div class="tc-overlay"><div class="tc-name">' + App.dname(d) + '</div>' +
        '<div class="tc-osub">' + trip.nights + ' ' + App.t('daysLeft') + ' · ' + trip.people + ' ' + (Core.state.lang === 'th' ? 'คน' : 'pax') + ' · ' + App.t(trip.style === 'budget' ? 'sBudget' : trip.style === 'comfort' ? 'sComfort' : 'sMid') + '</div></div>' +
        '<div class="tc-amt">' + Core.fmt(total) + '</div></div>' +
        '<div class="tc-body"><div class="bar"><div class="fill' + (sp > total ? ' over' : '') + '" style="width:' + pct + '%"></div></div>' +
        '<div class="tc-sub">' + App.t('spent') + ' ' + Core.fmt(sp) + ' · ' + App.t('remaining') + ' ' + Core.fmt(total - sp) + '</div></div>' +
        '</div>');
      card.onclick = () => App.go('trip-' + trip.id);
      w.appendChild(card);
    }
    return w;
  },

  // ---------- new trip ----------
  viewNew(){
    const f = App.form;
    const w = App.el('<div></div>');
    w.appendChild(App.el('<h2 class="sect">' + App.t('where') + '</h2>'));
    const grid = App.el('<div class="destgrid"></div>');
    for (const key in DESTS){
      const d = DESTS[key];
      const b = App.el('<button class="pdest' + (f.dest === key ? ' on' : '') + '" style="background-image:url(' + App.img(key) + ')">' +
        '<span class="pd-name">' + App.dname(d) + '</span>' +
        (f.dest === key ? '<span class="pd-check">✓</span>' : '') + '</button>');
      b.onclick = () => { f.dest = key; App.render(); };
      grid.appendChild(b);
    }
    w.appendChild(grid);

    const stepRow = (label, val, set, min, max) => {
      const r = App.el('<div class="row"><div class="grow">' + label + '</div>' +
        '<button class="step">−</button><b class="stepval">' + val + '</b><button class="step">＋</button></div>');
      const [minus, plus] = r.querySelectorAll('.step');
      minus.onclick = () => { set(Math.max(min, val - 1)); App.render(); };
      plus.onclick = () => { set(Math.min(max, val + 1)); App.render(); };
      return r;
    };
    w.appendChild(stepRow(App.t('nights'), f.nights, v => f.nights = v, 1, 30));
    w.appendChild(stepRow(App.t('people'), f.people, v => f.people = v, 1, 10));

    w.appendChild(App.el('<h2 class="sect">' + App.t('style') + '</h2>'));
    const seg = App.el('<div class="seg"></div>');
    [['budget', 'sBudget', '🎒'], ['mid', 'sMid', '🧢'], ['comfort', 'sComfort', '🥂']].forEach(([k, lk, em]) => {
      const b = App.el('<button class="' + (f.style === k ? 'on' : '') + '">' + em + ' ' + App.t(lk) + '</button>');
      b.onclick = () => { f.style = k; App.render(); };
      seg.appendChild(b);
    });
    w.appendChild(seg);

    const dr = App.el('<div class="row"><div class="grow">' + App.t('startDate') + '</div><input type="date" id="fStart" value="' + f.start + '"></div>');
    dr.querySelector('input').onchange = e => { f.start = e.target.value; };
    w.appendChild(dr);

    const d = DESTS[f.dest];
    if (d.flight){
      const fr = App.el('<div class="row"><div class="grow">' + App.t('inclFlights') + ' <span class="sub">(~' + Core.fmt(d.flight) + '/🧍)</span></div>' +
        '<input type="checkbox" class="chk" ' + (f.inclFlights ? 'checked' : '') + '></div>');
      fr.querySelector('input').onchange = e => { f.inclFlights = e.target.checked; };
      w.appendChild(fr);
    }

    // live preview
    const est = Core.estimate(f.dest, f.style, f.nights, f.people, f.inclFlights && !!d.flight);
    const tot = Core.total(est);
    w.appendChild(App.el('<div class="preview">' + Core.fmt(tot) + ' <span class="sub">· ' + Core.fmt(tot / f.people) + ' ' + App.t('perPerson') + '</span></div>'));

    const cb = App.el('<button class="bigbtn">' + App.t('create') + '</button>');
    cb.onclick = () => {
      const trip = Core.newTrip({ dest: f.dest, style: f.style, nights: f.nights, people: f.people, start: f.start, inclFlights: f.inclFlights && !!d.flight });
      App.tab = 'budget';
      App.go('trip-' + trip.id);
    };
    w.appendChild(cb);
    return w;
  },

  // ---------- budget-first planner ----------
  planForm: { budget: 10000, people: 2, style: 'mid', inclFlights: false },

  viewPlan(){
    const f = App.planForm;
    const w = App.el('<div></div>');
    w.appendChild(App.el('<h2 class="sect">' + App.t('planTitle') + '</h2>'));

    const br = App.el('<div class="row"><div class="grow">' + App.t('yourBudget') + '</div>' +
      '<input class="amt" id="planAmt" inputmode="numeric" value="' + f.budget + '"></div>');
    br.querySelector('input').onchange = e => {
      f.budget = Math.max(0, parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0);
      App.render();
    };
    w.appendChild(br);

    const chips = App.el('<div class="catchips"></div>');
    for (const v of [3000, 5000, 10000, 20000, 30000, 50000]){
      const c = App.el('<button class="chip' + (f.budget === v ? ' on' : '') + '">฿' + (v / 1000) + 'k</button>');
      c.onclick = () => { f.budget = v; App.render(); };
      chips.appendChild(c);
    }
    w.appendChild(chips);

    const pr = App.el('<div class="row"><div class="grow">' + App.t('people') + '</div>' +
      '<button class="step">−</button><b class="stepval">' + f.people + '</b><button class="step">＋</button></div>');
    const [mi, pl] = pr.querySelectorAll('.step');
    mi.onclick = () => { f.people = Math.max(1, f.people - 1); App.render(); };
    pl.onclick = () => { f.people = Math.min(10, f.people + 1); App.render(); };
    w.appendChild(pr);

    const seg = App.el('<div class="seg"></div>');
    [['budget', 'sBudget', '🎒'], ['mid', 'sMid', '🧢'], ['comfort', 'sComfort', '🥂']].forEach(([k, lk, em]) => {
      const b = App.el('<button class="' + (f.style === k ? 'on' : '') + '">' + em + ' ' + App.t(lk) + '</button>');
      b.onclick = () => { f.style = k; App.render(); };
      seg.appendChild(b);
    });
    w.appendChild(seg);

    const fr = App.el('<div class="row"><div class="grow">' + App.t('inclFlights') + '</div>' +
      '<input type="checkbox" class="chk" ' + (f.inclFlights ? 'checked' : '') + '></div>');
    fr.querySelector('input').onchange = e => { f.inclFlights = e.target.checked; App.render(); };
    w.appendChild(fr);

    w.appendChild(App.el('<h2 class="sect">' + App.t('planResults') + '</h2>'));
    const opts = f.budget > 0 ? Core.planOptions(f.budget, f.people, f.style, f.inclFlights) : [];
    if (!opts.length){
      w.appendChild(App.el('<div class="empty">🙈<br>' + App.t('noFit') + '</div>'));
    }
    for (const o of opts.slice(0, 10)){
      const d = DESTS[o.dest];
      const card = App.el(
        '<div class="plancard2"><div class="pl-thumb" style="background-image:url(' + App.img(o.dest) + ')"></div>' +
        '<div class="grow"><div class="tc-name">' + App.dname(d) + '</div>' +
        '<div class="pl-n">' + o.nights + ' ' + App.t('daysLeft') + '</div>' +
        '<div class="tc-sub">' + Core.fmt(o.total) + ' · ' + App.t('left') + ' <b style="color:#1f9d61">' + Core.fmt(o.left) + '</b>' +
        (o.inclFlights ? ' · ✈️' : '') + '</div></div>' +
        '<span class="bk-go">' + App.t('pickPlan') + ' →</span></div>');
      card.onclick = () => {
        const trip = Core.newTrip({ dest: o.dest, style: o.style, nights: o.nights, people: f.people, start: '', inclFlights: o.inclFlights });
        App.tab = 'budget';
        App.toast(App.t('left') + ' ' + Core.fmt(o.left) + ' 🎉');
        App.go('trip-' + trip.id);
      };
      w.appendChild(card);
    }
    const back = App.el('<button class="ghostb">←</button>');
    back.onclick = () => App.go('home');
    w.appendChild(back);
    return w;
  },

  // ---------- trip ----------
  viewTrip(trip){
    const d = Core.dest(trip);
    const total = Core.total(trip.budget);
    const sp = Core.spent(trip);
    const w = App.el('<div></div>');

    const head = App.el(
      '<div class="hero" style="background-image:url(' + App.img(trip.dest) + ')">' +
      '<button class="back hbtn">←</button><button class="hbtn share" id="shareB">📤</button>' +
      '<div class="hero-txt"><div class="hero-name">' + App.dname(d) + '</div>' +
      '<div class="hero-sub">' + trip.nights + ' ' + App.t('daysLeft') + ' · ' + trip.people + ' ' + (Core.state.lang === 'th' ? 'คน' : 'pax') + (trip.start ? ' · ' + trip.start : '') + '</div></div></div>');
    head.querySelector('.back').onclick = () => App.go('home');
    head.querySelector('#shareB').onclick = () => App.shareTrip(trip);
    w.appendChild(head);

    const remaining = total - sp.total;
    w.appendChild(App.el(
      '<div class="bignums"><div><div class="bn-l">' + App.t('total') + '</div><div class="bn-v">' + Core.fmt(total) + '</div><div class="sub">' + Core.fmt(total / trip.people) + ' ' + App.t('perPerson') + '</div></div>' +
      '<div><div class="bn-l">' + App.t('spent') + '</div><div class="bn-v">' + Core.fmt(sp.total) + '</div></div>' +
      '<div><div class="bn-l">' + App.t('remaining') + '</div><div class="bn-v" style="color:' + (remaining < 0 ? '#e25555' : '#1f9d61') + '">' + Core.fmt(remaining) + '</div></div></div>'));

    const tabs = App.el('<div class="tabs"></div>');
    [['budget', 'budget'], ['expenses', 'expenses'], ['book', 'book']].forEach(([k, lk]) => {
      const b = App.el('<button class="' + (App.tab === k ? 'on' : '') + '">' + App.t(lk) + '</button>');
      b.onclick = () => { App.tab = k; App.render(); };
      tabs.appendChild(b);
    });
    w.appendChild(tabs);

    if (App.tab === 'expenses') w.appendChild(App.tabExpenses(trip));
    else if (App.tab === 'book') w.appendChild(App.tabBook(trip));
    else w.appendChild(App.tabBudget(trip));

    const del = App.el('<button class="dangerb">' + App.t('deleteTrip') + '</button>');
    del.onclick = () => {
      if (del.dataset.armed){ Core.deleteTrip(trip.id); App.go('home'); }
      else { del.dataset.armed = '1'; del.textContent = App.t('confirm'); }
    };
    w.appendChild(del);
    return w;
  },

  tabBudget(trip){
    const w = App.el('<div></div>');
    const sp = Core.spent(trip).by;
    w.appendChild(App.el('<div class="sub" style="margin:6px 2px">' + App.t('tapToEdit') + '</div>'));
    for (const c of CATS){
      const amt = trip.budget[c.id] || 0;
      if (!amt && c.id === 'flights') continue;
      const used = sp[c.id] || 0;
      const pct = amt > 0 ? Math.min(100, Math.round(used / amt * 100)) : (used > 0 ? 100 : 0);
      const dealUrl = Links.forCategory(c.id, trip);
      const r = App.el(
        '<div class="catrow"><div class="cr-top"><span>' + c.emoji + ' ' + App.t(c.id) + '</span>' +
        '<input class="amt" inputmode="numeric" value="' + amt + '"></div>' +
        '<div class="bar"><div class="fill' + (used > amt ? ' over' : '') + '" style="width:' + pct + '%"></div></div>' +
        '<div class="cr-foot"><span class="sub">' + Core.fmt(used) + ' / ' + Core.fmt(amt) + '</span>' +
        (dealUrl ? '<a class="dealb" target="_blank" rel="noopener sponsored" href="' + dealUrl + '">🔥 ' + App.t('deal') + ' ↗</a>' : '') +
        '</div></div>');
      const inp = r.querySelector('.amt');
      inp.onchange = () => {
        trip.budget[c.id] = Math.max(0, parseInt(inp.value.replace(/[^0-9]/g, ''), 10) || 0);
        Core.save();
        App.render();
      };
      w.appendChild(r);
    }
    const re = App.el('<button class="ghostb">' + App.t('reestimate') + '</button>');
    re.onclick = () => {
      trip.budget = Core.estimate(trip.dest, trip.style, trip.nights, trip.people, trip.inclFlights);
      Core.save();
      App.render();
    };
    w.appendChild(re);
    return w;
  },

  tabExpenses(trip){
    const w = App.el('<div></div>');
    const add = App.el(
      '<div class="addbox"><div class="catchips"></div>' +
      '<div class="addrow"><input class="amt2" inputmode="numeric" placeholder="' + App.t('amount') + '">' +
      '<input class="note" placeholder="' + App.t('note') + '">' +
      '<button class="addb">' + App.t('addExpense') + '</button></div></div>');
    const chips = add.querySelector('.catchips');
    App._expCat = App._expCat || 'food';
    for (const c of CATS){
      const b = App.el('<button class="chip' + (App._expCat === c.id ? ' on' : '') + '">' + c.emoji + ' ' + App.t(c.id) + '</button>');
      b.onclick = () => { App._expCat = c.id; App.render(); };
      chips.appendChild(b);
    }
    add.querySelector('.addb').onclick = () => {
      const v = parseInt(add.querySelector('.amt2').value.replace(/[^0-9]/g, ''), 10);
      if (!v || v <= 0){ App.toast(App.t('amount')); return; }
      Core.addExpense(trip, App._expCat, v, add.querySelector('.note').value);
      App.render();
    };
    w.appendChild(add);

    if (!trip.expenses.length){
      w.appendChild(App.el('<div class="empty">🧾<br>' + App.t('noExpenses') + '</div>'));
      return w;
    }
    for (const e of trip.expenses){
      const c = CATS.find(q => q.id === e.cat) || CATS[6];
      const r = App.el('<div class="exprow"><span>' + c.emoji + '</span>' +
        '<div class="grow"><b>' + Core.fmt(e.amount) + '</b>' + (e.note ? ' <span class="sub">' + e.note.replace(/</g, '&lt;') + '</span>' : '') +
        '<div class="sub">' + new Date(e.ts).toLocaleDateString() + ' · ' + App.t(e.cat) + '</div></div>' +
        '<button class="xb">✕</button></div>');
      r.querySelector('.xb').onclick = () => { Core.removeExpense(trip, e.id); App.render(); };
      w.appendChild(r);
    }
    return w;
  },

  pickName(x){ return Core.state.lang === 'th' ? (x.th || x.n) : x.n; },

  tabBook(trip){
    const w = App.el('<div></div>');
    const picks = PICKS[trip.dest];
    if (picks){
      // hotels: the tier matching this trip's style first
      const tierRank = t => (t === trip.style ? 0 : 1);
      const hotels = picks.h.slice().sort((a, b) => tierRank(a.tier) - tierRank(b.tier));
      w.appendChild(App.el('<h2 class="sect">🏨 ' + App.t('recHotels') + '</h2>'));
      for (const h of hotels){
        const fits = h.tier === trip.style;
        const r = App.el('<a class="pickrow" target="_blank" rel="noopener sponsored" href="' + Links.hotelByName(trip, h.n) + '">' +
          '<div class="grow"><b>' + App.pickName(h) + '</b>' + (fits ? ' <span class="bestbadge">★ ' + App.t('fitsPlan') + '</span>' : '') +
          '<div class="sub">' + h.area + ' · ' + App.t('approxFrom') + ' ' + Core.fmt(h.p) + App.t('perNight') + '</div></div>' +
          '<span class="pk-btn agoda">' + App.t('bookBtn') + ' ↗</span></a>');
        w.appendChild(r);
      }
      w.appendChild(App.el('<h2 class="sect">🎟️ ' + App.t('topActs') + '</h2>'));
      for (const a of picks.a){
        const r = App.el('<a class="pickrow" target="_blank" rel="noopener sponsored" href="' + Links.actByName(a.n) + '">' +
          '<div class="grow"><b>' + App.pickName(a) + '</b>' +
          '<div class="sub">' + (a.p > 0 ? App.t('approxFrom') + ' ' + Core.fmt(a.p) + '/' + (Core.state.lang === 'th' ? 'คน' : 'pax') : App.t('freeEntry')) + '</div></div>' +
          '<span class="pk-btn klook">' + App.t('bookBtn') + ' ↗</span></a>');
        w.appendChild(r);
      }
      w.appendChild(App.el('<h2 class="sect">🍜 ' + App.t('mustEat') + '</h2>'));
      for (const e2 of picks.e){
        const r = App.el('<a class="pickrow" target="_blank" rel="noopener" href="' + Links.placeMap(e2.n, trip) + '">' +
          '<div class="grow"><b>' + App.pickName(e2) + '</b>' +
          '<div class="sub">' + e2.area + ' · ' + '฿'.repeat(e2.p) + '</div></div>' +
          '<span class="pk-btn map">' + App.t('mapBtn') + ' ↗</span></a>');
        w.appendChild(r);
      }
    }
    w.appendChild(App.el('<h2 class="sect">' + App.t('morePartners') + '</h2>'));
    w.appendChild(App.el('<div class="sub" style="margin:-4px 2px 10px">' + App.t('sortedNote') + '</div>'));

    // one offer group per category, ranked by this trip's budget weight
    const groups = [
      { cat: 'accom', cards: [
        ['🏨', App.t('bookHotelA'), App.t('bookHotelDesc'), Links.hotelAgoda(trip), 'agoda'],
        ['🛏️', App.t('bookHotelB'), App.t('bookHotelDesc'), Links.hotelBooking(trip), 'booking'],
      ] },
      { cat: 'food', cards: [
        ['🍜', App.t('bookFood'), App.t('bookFoodDesc'), Links.foodEatigo(trip), 'eatigo'],
        ['🍱', App.t('bookFood2'), App.t('bookFood2Desc'), Links.foodHungryHub(), 'hungryhub'],
      ] },
      { cat: 'act', cards: [
        ['🎟️', App.t('bookAct'), App.t('bookActDesc'), Links.activities(trip), 'klook'],
      ] },
      { cat: 'transport', cards: [
        ['🚌', App.t('bookGround'), App.t('bookGroundDesc'), Links.ground(trip), 'ground'],
      ] },
    ];
    if (Core.dest(trip).flight || trip.inclFlights){
      groups.push({ cat: 'flights', cards: [
        ['✈️', App.t('bookFlights'), App.t('bookFlightsDesc'), Links.flights(), 'flights'],
      ] });
    }
    groups.sort((a, b) => (trip.budget[b.cat] || 0) - (trip.budget[a.cat] || 0));

    groups.forEach((g, gi) => {
      g.cards.forEach(([emoji, title, desc, url, cls], ci) => {
        const top = gi === 0 && ci === 0;
        const c = App.el('<a class="bookcard ' + cls + '" target="_blank" rel="noopener sponsored" href="' + url + '">' +
          '<span class="bk-e">' + emoji + '</span><div class="grow"><b>' + title + '</b>' +
          (top ? ' <span class="bestbadge">★ ' + App.t('bestBadge') + '</span>' : '') +
          '<div class="sub">' + desc + ' · ' + App.t(g.cat) + ' ' + Core.fmt(trip.budget[g.cat] || 0) + '</div></div>' +
          '<span class="bk-go">' + App.t('open') + ' ↗</span></a>');
        w.appendChild(c);
      });
    });
    w.appendChild(App.el('<div class="disclosure">ⓘ ' + App.t('disclosure') + '</div>'));
    return w;
  },

  shareTrip(trip){
    const d = Core.dest(trip);
    const total = Core.total(trip.budget);
    const text = d.emoji + ' ' + App.dname(d) + ' · ' + trip.nights + ' ' + App.t('daysLeft') + ' · ' + trip.people + ' 🧍\n' +
      App.t('total') + ': ' + Core.fmt(total) + ' (' + Core.fmt(total / trip.people) + ' ' + App.t('perPerson') + ')\n— ' + App.t('sharedWith');
    if (navigator.share){
      navigator.share({ title: 'BudgetTrip', text }).catch(() => {});
    } else if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(() => App.toast('Copied!')).catch(() => App.toast(text));
    } else {
      App.toast(text);
    }
  },
};

window.addEventListener('load', () => App.init());
