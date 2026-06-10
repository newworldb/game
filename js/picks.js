'use strict';
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
