import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

NEW_DETECTOR_CODE = r"""
const msg = ($input.item.json.mesaj_icerigi || $input.item.json.combinedText || '').toLowerCase();

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

const jsDay = istNow.getDay();
const monBased = jsDay === 0 ? 6 : jsDay - 1;
const addDays = (base, n) => { const d = new Date(base); d.setDate(base.getDate() + n); return d; };
const thisMonday = addDays(istNow, -monBased);

const gunMap = {
  'pazartesi': 0, 'salı': 1, 'sali': 1,
  'çarşamba': 2, 'carsamba': 2,
  'perşembe': 3, 'persembe': 3,
  'cuma': 4, 'cumartesi': 5, 'pazar': 6
};

const isNextWeek = msg.includes('haftaya') || msg.includes('gelecek hafta');
const isCancel   = msg.includes('iptal') || msg.includes('sil') ||
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
      if (day <= istNow || isNextWeek) day = addDays(day, 7);
      targetDate = toYMD(day);
      break;
    }
  }
}

// Numeric date: "18 haziran"
if (!targetDate) {
  const aylar = { 'ocak':1,'şubat':2,'subat':2,'mart':3,'nisan':4,
    'mayıs':5,'mayis':5,'haziran':6,'temmuz':7,
    'ağustos':8,'agustos':8,'eylül':9,'eylul':9,
    'ekim':10,'kasım':11,'kasim':11,'aralık':12,'aralik':12 };
  for (const [ay, no] of Object.entries(aylar)) {
    const m2 = msg.match(new RegExp(`(\\d{1,2})\\s*${ay}`));
    if (m2) {
      const dayNum = parseInt(m2[1]);
      const year = (istNow.getMonth() + 1) > no ? istNow.getFullYear() + 1 : istNow.getFullYear();
      targetDate = `${year}-${String(no).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
      break;
    }
  }
}

// ── Extract preferredTime ──
// "saat 14", "14:00", "14'e", "14 de", "14:30"
let preferredTime = null;
const timeMatch = msg.match(/(?:saat\s*)?(\d{1,2})(?::(\d{2}))?(?:\s*['']?[aedu]|\s*de|\s*da|:00|:30)?(?=\s|$)/);
if (timeMatch) {
  const h = parseInt(timeMatch[1]);
  const m2 = parseInt(timeMatch[2] || '0');
  // Sanity check: valid appointment hour (7-22)
  if (h >= 7 && h <= 22) {
    preferredTime = `${String(h).padStart(2,'0')}:${String(m2).padStart(2,'0')}`;
  }
}

const shouldPreFetch = !!targetDate && !isCancel;
// has specific time → go to AI after pre-fetch (for appointment creation)
const hasSpecificTime = !!preferredTime;

return {
  ...$input.item.json,
  shouldPreFetch,
  targetDate,
  preferredTime,
  hasSpecificTime
};
"""

for node in wf['nodes']:
    if node['name'] == 'Date Detector':
        node['parameters']['jsCode'] = NEW_DETECTOR_CODE
        print("✅ Date Detector: preferredTime + hasSpecificTime eklendi")
        break

# 2. Update Pre-Fetch HTTP node to send preferredTime when available
for node in wf['nodes']:
    if node['name'] == 'Pre-Fetch Musaitlik':
        params = node['parameters'].get('queryParameters', {}).get('parameters', [])
        # Add preferredTime if not already there
        names = [p['name'] for p in params]
        if 'preferredTime' not in names:
            params.append({
                "name": "preferredTime",
                "value": "={{ $json.preferredTime || '' }}"
            })
            node['parameters']['queryParameters']['parameters'] = params
            print("✅ Pre-Fetch Musaitlik: preferredTime query param eklendi")
        break

# 3. IF node: add second condition for routing
# We need: shouldPreFetch=true → sub-IF: hasSpecificTime?
#   TRUE (specific time) → Context Injector → AI Agent (create appointment)
#   FALSE (only day)     → Format → Send WA (bypass)

# Add a new IF node: "Specific Time?"
import uuid
specific_time_if = {
    "id": str(uuid.uuid4()),
    "name": "Specific Time?",
    "type": "n8n-nodes-base.if",
    "typeVersion": 2,
    "position": [48100, 19500],
    "parameters": {
        "conditions": {
            "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 2},
            "conditions": [{
                "id": "specific-time-check",
                "leftValue": "={{ $json.hasSpecificTime }}",
                "rightValue": True,
                "operator": {"type": "boolean", "operation": "true"}
            }],
            "combinator": "and"
        },
        "options": {}
    }
}

wf['nodes'].append(specific_time_if)

conns = wf['connections']
stn = specific_time_if['name']

# Pre-Fetch → Specific Time? (instead of Format directly)
conns['Pre-Fetch Musaitlik'] = {
    "main": [[{"node": stn, "type": "main", "index": 0}]]
}

# Specific Time? TRUE → Context Injector (→ If NOT Human Mode → AI Agent)
# Specific Time? FALSE → Format Availability Response → Send WA
conns[stn] = {
    "main": [
        [{"node": "Context Injector", "type": "main", "index": 0}],    # TRUE: has time → AI
        [{"node": "Format Availability Response", "type": "main", "index": 0}]  # FALSE: no time → bypass
    ]
}

# Context Injector → If NOT Human Mode (restore original connection)
conns['Context Injector'] = {
    "main": [[{"node": "If NOT Human Mode", "type": "main", "index": 0}]]
}

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print("✅ Specific Time? IF node eklendi")
print(f"\nFinal akış:")
print("  Gün + SAAT  → Pre-Fetch(preferredTime) → Specific Time? TRUE → Context Injector → AI (randevu oluşturur)")
print("  Gün (satsız)→ Pre-Fetch → Specific Time? FALSE → Format → Send WA (bypass)")
print(f"\nNode sayısı: {len(wf['nodes'])}")
