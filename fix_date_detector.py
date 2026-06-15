import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

NEW_CODE = r"""
// Pure JS — no external modules
const msg = ($input.item.json.mesaj_icerigi || '').toLowerCase();

// Istanbul time (UTC+3)
const utcNow = new Date();
const IST_OFFSET_MS = 3 * 60 * 60 * 1000;
const istNow = new Date(utcNow.getTime() + IST_OFFSET_MS + utcNow.getTimezoneOffset() * 60000);

const toYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Monday-based week (0=Mon, 1=Tue, ..., 6=Sun)
const jsDay = istNow.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
const monBased = jsDay === 0 ? 6 : jsDay - 1;

const addDays = (base, n) => {
  const d = new Date(base);
  d.setDate(base.getDate() + n);
  return d;
};

const thisMonday = addDays(istNow, -monBased);

// Gun map: name → offset from Monday (0=Mon, ..., 4=Fri, 5=Sat, 6=Sun)
const gunMap = {
  'pazartesi': 0,
  'salı': 1, 'sali': 1,
  'çarşamba': 2, 'carsamba': 2,
  'perşembe': 3, 'persembe': 3,
  'cuma': 4,
  'cumartesi': 5,
  'pazar': 6
};

const isNextWeek = msg.includes('haftaya') || msg.includes('gelecek hafta');
const isCancel = msg.includes('iptal') || msg.includes('sil') ||
                 msg.includes('vazgeç') || msg.includes('vazgec');

let targetDate = null;

if (msg.includes('bugün') || msg.includes('bugun')) {
  targetDate = toYMD(istNow);
} else if (msg.includes('yarın') || msg.includes('yarin')) {
  targetDate = toYMD(addDays(istNow, 1));
} else {
  for (const [gun, offset] of Object.entries(gunMap)) {
    if (msg.includes(gun)) {
      let day = addDays(thisMonday, offset);
      // If that day is today or past, or "haftaya" → next week
      if (day <= istNow || isNextWeek) {
        day = addDays(day, 7);
      }
      targetDate = toYMD(day);
      break;
    }
  }
}

// Numeric date: "18 haziran"
if (!targetDate) {
  const aylar = {
    'ocak': 1, 'şubat': 2, 'subat': 2, 'mart': 3, 'nisan': 4,
    'mayıs': 5, 'mayis': 5, 'haziran': 6, 'temmuz': 7,
    'ağustos': 8, 'agustos': 8, 'eylül': 9, 'eylul': 9,
    'ekim': 10, 'kasım': 11, 'kasim': 11, 'aralık': 12, 'aralik': 12
  };
  for (const [ay, no] of Object.entries(aylar)) {
    const rx = new RegExp(`(\\d{1,2})\\s*${ay}`);
    const m2 = msg.match(rx);
    if (m2) {
      const dayNum = parseInt(m2[1]);
      const year = istNow.getMonth() + 1 > no ? istNow.getFullYear() + 1 : istNow.getFullYear();
      targetDate = `${year}-${String(no).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
      break;
    }
  }
}

const shouldPreFetch = !!targetDate && !isCancel;

return {
  ...$input.item.json,
  shouldPreFetch,
  targetDate
};
"""

for node in wf['nodes']:
    if node['name'] == 'Date Detector':
        node['parameters']['jsCode'] = NEW_CODE
        print("✅ Date Detector kodu güncellendi (pure JS, no luxon)")
        break

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)
