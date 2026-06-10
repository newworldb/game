'use strict';
// Worldwide destination search (Wikipedia + Wikidata, no API keys) and
// per-country daily cost data (THB) for trips outside the Thai presets.
// costs: { style: [hotel ฿/room/night, food ฿/person/day, local transport, activities] }
// flight: rough round-trip from Bangkok per person (THB).
const WORLD = {
  // Q-id -> country costs
  C: {
    Q869:  { en: 'Thailand', th: 'ไทย', flight: 2000,
      costs: { budget: [450, 250, 130, 200], mid: [1400, 600, 300, 500], comfort: [3800, 1400, 600, 1000] } },
    Q17:   { en: 'Japan', th: 'ญี่ปุ่น', flight: 14000,
      costs: { budget: [1800, 900, 450, 600], mid: [4200, 1800, 700, 1200], comfort: [9500, 3800, 1200, 2500] } },
    Q884:  { en: 'South Korea', th: 'เกาหลีใต้', flight: 11000,
      costs: { budget: [1500, 800, 400, 500], mid: [3500, 1500, 600, 1100], comfort: [8000, 3200, 1000, 2200] } },
    Q881:  { en: 'Vietnam', th: 'เวียดนาม', flight: 5000,
      costs: { budget: [500, 300, 150, 250], mid: [1300, 650, 300, 550], comfort: [3500, 1500, 600, 1100] } },
    Q819:  { en: 'Laos', th: 'ลาว', flight: 4500,
      costs: { budget: [450, 280, 150, 220], mid: [1100, 600, 300, 500], comfort: [3000, 1300, 550, 900] } },
    Q424:  { en: 'Cambodia', th: 'กัมพูชา', flight: 4500,
      costs: { budget: [450, 300, 150, 250], mid: [1200, 650, 300, 550], comfort: [3200, 1400, 600, 1000] } },
    Q836:  { en: 'Myanmar', th: 'เมียนมา', flight: 4500,
      costs: { budget: [500, 300, 150, 220], mid: [1300, 650, 300, 500], comfort: [3200, 1400, 600, 900] } },
    Q833:  { en: 'Malaysia', th: 'มาเลเซีย', flight: 4500,
      costs: { budget: [700, 400, 200, 300], mid: [1700, 800, 350, 650], comfort: [4200, 1700, 650, 1200] } },
    Q334:  { en: 'Singapore', th: 'สิงคโปร์', flight: 5500,
      costs: { budget: [1800, 800, 350, 600], mid: [4500, 1600, 550, 1200], comfort: [10000, 3500, 900, 2400] } },
    Q252:  { en: 'Indonesia', th: 'อินโดนีเซีย', flight: 7000,
      costs: { budget: [600, 350, 200, 300], mid: [1600, 750, 350, 650], comfort: [4200, 1600, 650, 1200] } },
    Q928:  { en: 'Philippines', th: 'ฟิลิปปินส์', flight: 7500,
      costs: { budget: [700, 400, 200, 300], mid: [1700, 800, 350, 650], comfort: [4200, 1700, 650, 1200] } },
    Q148:  { en: 'China', th: 'จีน', flight: 9000,
      costs: { budget: [1000, 500, 300, 400], mid: [2500, 1100, 500, 900], comfort: [6000, 2400, 900, 1800] } },
    Q865:  { en: 'Taiwan', th: 'ไต้หวัน', flight: 8500,
      costs: { budget: [1200, 600, 300, 450], mid: [2800, 1200, 500, 900], comfort: [6500, 2500, 800, 1800] } },
    Q8646: { en: 'Hong Kong', th: 'ฮ่องกง', flight: 7500,
      costs: { budget: [1800, 800, 350, 550], mid: [4200, 1600, 550, 1200], comfort: [9500, 3200, 900, 2400] } },
    Q14773:{ en: 'Macau', th: 'มาเก๊า', flight: 7500,
      costs: { budget: [1600, 700, 300, 500], mid: [3800, 1400, 500, 1100], comfort: [9000, 3000, 800, 2200] } },
    Q668:  { en: 'India', th: 'อินเดีย', flight: 9000,
      costs: { budget: [600, 350, 200, 300], mid: [1600, 750, 350, 650], comfort: [4200, 1600, 650, 1200] } },
    Q854:  { en: 'Sri Lanka', th: 'ศรีลังกา', flight: 9000,
      costs: { budget: [700, 400, 200, 300], mid: [1700, 800, 350, 650], comfort: [4200, 1700, 650, 1200] } },
    Q837:  { en: 'Nepal', th: 'เนปาล', flight: 9500,
      costs: { budget: [500, 350, 200, 350], mid: [1400, 700, 350, 700], comfort: [3800, 1500, 600, 1300] } },
    Q826:  { en: 'Maldives', th: 'มัลดีฟส์', flight: 12000,
      costs: { budget: [2200, 900, 400, 800], mid: [6500, 2000, 700, 1800], comfort: [20000, 4500, 1200, 3500] } },
    Q878:  { en: 'UAE', th: 'สหรัฐอาหรับเอมิเรตส์', flight: 14000,
      costs: { budget: [2000, 900, 400, 700], mid: [4500, 1800, 700, 1500], comfort: [11000, 3800, 1200, 3000] } },
    Q43:   { en: 'Turkey', th: 'ตุรกี', flight: 17000,
      costs: { budget: [1200, 600, 300, 500], mid: [2800, 1200, 500, 1000], comfort: [6500, 2500, 900, 2000] } },
    Q145:  { en: 'United Kingdom', th: 'อังกฤษ', flight: 26000,
      costs: { budget: [2800, 1200, 600, 800], mid: [6000, 2400, 900, 1600], comfort: [13000, 4500, 1400, 3200] } },
    Q142:  { en: 'France', th: 'ฝรั่งเศส', flight: 25000,
      costs: { budget: [2600, 1200, 550, 800], mid: [5500, 2400, 850, 1600], comfort: [12000, 4500, 1300, 3200] } },
    Q38:   { en: 'Italy', th: 'อิตาลี', flight: 25000,
      costs: { budget: [2400, 1100, 500, 800], mid: [5000, 2200, 800, 1600], comfort: [11000, 4200, 1200, 3000] } },
    Q29:   { en: 'Spain', th: 'สเปน', flight: 25000,
      costs: { budget: [2200, 1000, 500, 700], mid: [4500, 2000, 750, 1400], comfort: [10000, 3800, 1100, 2800] } },
    Q45:   { en: 'Portugal', th: 'โปรตุเกส', flight: 26000,
      costs: { budget: [2000, 900, 450, 650], mid: [4200, 1800, 700, 1300], comfort: [9000, 3500, 1000, 2600] } },
    Q183:  { en: 'Germany', th: 'เยอรมนี', flight: 25000,
      costs: { budget: [2400, 1100, 550, 700], mid: [5000, 2200, 850, 1400], comfort: [10500, 4000, 1300, 2800] } },
    Q55:   { en: 'Netherlands', th: 'เนเธอร์แลนด์', flight: 25000,
      costs: { budget: [2800, 1200, 600, 800], mid: [5800, 2400, 900, 1600], comfort: [12000, 4500, 1400, 3200] } },
    Q39:   { en: 'Switzerland', th: 'สวิตเซอร์แลนด์', flight: 27000,
      costs: { budget: [3800, 1600, 800, 1000], mid: [7500, 3200, 1200, 2000], comfort: [16000, 6000, 1800, 4000] } },
    Q40:   { en: 'Austria', th: 'ออสเตรีย', flight: 26000,
      costs: { budget: [2600, 1100, 550, 750], mid: [5200, 2200, 850, 1500], comfort: [11000, 4200, 1300, 3000] } },
    Q213:  { en: 'Czechia', th: 'เช็ก', flight: 25000,
      costs: { budget: [1800, 800, 400, 600], mid: [3800, 1600, 650, 1200], comfort: [8500, 3200, 1000, 2400] } },
    Q28:   { en: 'Hungary', th: 'ฮังการี', flight: 25000,
      costs: { budget: [1700, 800, 400, 550], mid: [3600, 1500, 600, 1100], comfort: [8000, 3000, 950, 2200] } },
    Q36:   { en: 'Poland', th: 'โปแลนด์', flight: 25000,
      costs: { budget: [1600, 750, 380, 550], mid: [3400, 1500, 600, 1100], comfort: [7500, 2800, 900, 2200] } },
    Q41:   { en: 'Greece', th: 'กรีซ', flight: 24000,
      costs: { budget: [2000, 950, 450, 650], mid: [4200, 1900, 700, 1300], comfort: [9500, 3600, 1100, 2600] } },
    Q20:   { en: 'Norway', th: 'นอร์เวย์', flight: 28000,
      costs: { budget: [3400, 1500, 750, 900], mid: [6800, 3000, 1100, 1800], comfort: [14000, 5500, 1700, 3600] } },
    Q34:   { en: 'Sweden', th: 'สวีเดน', flight: 27000,
      costs: { budget: [3000, 1300, 650, 850], mid: [6000, 2700, 1000, 1700], comfort: [12500, 5000, 1500, 3400] } },
    Q35:   { en: 'Denmark', th: 'เดนมาร์ก', flight: 27000,
      costs: { budget: [3200, 1400, 700, 850], mid: [6400, 2800, 1050, 1700], comfort: [13000, 5200, 1600, 3400] } },
    Q33:   { en: 'Finland', th: 'ฟินแลนด์', flight: 26000,
      costs: { budget: [2900, 1300, 650, 800], mid: [5800, 2600, 1000, 1600], comfort: [12000, 4800, 1500, 3200] } },
    Q189:  { en: 'Iceland', th: 'ไอซ์แลนด์', flight: 32000,
      costs: { budget: [3800, 1700, 850, 1100], mid: [7600, 3400, 1300, 2200], comfort: [15500, 6200, 2000, 4400] } },
    Q30:   { en: 'United States', th: 'สหรัฐอเมริกา', flight: 35000,
      costs: { budget: [3400, 1500, 750, 900], mid: [7000, 3000, 1100, 1800], comfort: [15000, 5800, 1700, 3600] } },
    Q16:   { en: 'Canada', th: 'แคนาดา', flight: 35000,
      costs: { budget: [3000, 1300, 650, 850], mid: [6200, 2700, 1000, 1700], comfort: [13000, 5200, 1500, 3400] } },
    Q96:   { en: 'Mexico', th: 'เม็กซิโก', flight: 38000,
      costs: { budget: [1400, 700, 350, 550], mid: [3200, 1400, 600, 1100], comfort: [7500, 2800, 950, 2200] } },
    Q155:  { en: 'Brazil', th: 'บราซิล', flight: 42000,
      costs: { budget: [1600, 800, 400, 600], mid: [3500, 1600, 650, 1200], comfort: [8000, 3000, 1000, 2400] } },
    Q414:  { en: 'Argentina', th: 'อาร์เจนตินา', flight: 45000,
      costs: { budget: [1500, 750, 380, 550], mid: [3300, 1500, 600, 1100], comfort: [7500, 2800, 950, 2200] } },
    Q419:  { en: 'Peru', th: 'เปรู', flight: 45000,
      costs: { budget: [1300, 650, 350, 550], mid: [3000, 1300, 550, 1100], comfort: [7000, 2600, 900, 2200] } },
    Q408:  { en: 'Australia', th: 'ออสเตรเลีย', flight: 18000,
      costs: { budget: [3000, 1300, 650, 850], mid: [6200, 2700, 1000, 1700], comfort: [13000, 5200, 1500, 3400] } },
    Q664:  { en: 'New Zealand', th: 'นิวซีแลนด์', flight: 22000,
      costs: { budget: [2800, 1200, 600, 850], mid: [5800, 2500, 950, 1700], comfort: [12000, 4800, 1450, 3400] } },
    Q79:   { en: 'Egypt', th: 'อียิปต์', flight: 16000,
      costs: { budget: [900, 500, 250, 450], mid: [2200, 1000, 450, 900], comfort: [5500, 2200, 750, 1800] } },
    Q1028: { en: 'Morocco', th: 'โมร็อกโก', flight: 22000,
      costs: { budget: [1100, 550, 300, 450], mid: [2600, 1100, 500, 950], comfort: [6000, 2400, 800, 1900] } },
    Q258:  { en: 'South Africa', th: 'แอฟริกาใต้', flight: 22000,
      costs: { budget: [1400, 700, 400, 600], mid: [3200, 1400, 650, 1200], comfort: [7500, 2800, 1000, 2400] } },
    Q801:  { en: 'Israel', th: 'อิสราเอล', flight: 18000,
      costs: { budget: [2600, 1200, 550, 750], mid: [5200, 2300, 850, 1500], comfort: [11000, 4200, 1300, 3000] } },
    Q230:  { en: 'Georgia', th: 'จอร์เจีย', flight: 15000,
      costs: { budget: [1100, 550, 280, 450], mid: [2500, 1100, 480, 900], comfort: [6000, 2300, 750, 1800] } },
  },
  DEFAULT: { en: 'World', th: 'ทั่วโลก', flight: 20000,
    costs: { budget: [1800, 900, 450, 600], mid: [4000, 1800, 700, 1300], comfort: [9000, 3500, 1100, 2600] } },
  SEA: ['Q869', 'Q881', 'Q819', 'Q424', 'Q836', 'Q833', 'Q334', 'Q252', 'Q928'],

  countryOf(qid){ return WORLD.C[qid] || null; },
  costsFor(qid){ return (WORLD.C[qid] || WORLD.DEFAULT); },

  // ---- live search (browser only) ----
  wikiLang(q){ return /[฀-๿]/.test(q) ? 'th' : 'en'; },

  async suggest(q){
    const lang = WORLD.wikiLang(q);
    const u = 'https://' + lang + '.wikipedia.org/w/api.php?action=opensearch&format=json&origin=*&limit=6&search=' + encodeURIComponent(q);
    const r = await fetch(u);
    const d = await r.json();
    return (d[1] || []).map((title, i) => ({ title, desc: (d[2] || [])[i] || '', lang }));
  },

  // resolve a wikipedia title to {name, img, qid, countryQ}
  async resolve(title, lang){
    const r = await fetch('https://' + lang + '.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title.replace(/ /g, '_')));
    const s = await r.json();
    const out = {
      name: s.title || title,
      desc: s.description || '',
      img: (s.thumbnail && s.thumbnail.source) ? s.thumbnail.source.replace(/\/(\d+)px-/, '/800px-') : '',
      qid: s.wikibase_item || '',
      countryQ: '',
    };
    if (out.qid){
      try {
        const cr = await fetch('https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&origin=*&property=P17&entity=' + out.qid);
        const cd = await cr.json();
        const claims = (cd.claims && cd.claims.P17) || [];
        if (claims.length) out.countryQ = 'Q' + claims[0].mainsnak.datavalue.value['numeric-id'];
      } catch (e) { /* country unknown -> world default */ }
    }
    return out;
  },
};
