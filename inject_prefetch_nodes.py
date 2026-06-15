import json
import uuid

NGROK = "https://rebuff-husband-legibly.ngrok-free.dev"
SECRET = "klinikapp-n8n-secret-2024"

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

conns = wf['connections']

# ── Positions (relative to Check Conversation Status at [48048, 18672]) ──
POS_DETECTOR  = [48048, 18900]   # below Check Conversation Status
POS_IF        = [48288, 18900]
POS_HTTP      = [48528, 18820]
POS_INJECTOR  = [48768, 18820]

# ─────────────────────────────────────────────
# 1. Date Detector — Code Node
# ─────────────────────────────────────────────
date_detector = {
    "id": str(uuid.uuid4()),
    "name": "Date Detector",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": POS_DETECTOR,
    "parameters": {
        "mode": "runOnceForEachItem",
        "jsCode": r"""
const msg = ($input.item.json.mesaj_icerigi || '').toLowerCase();
const DateTime = require('luxon').DateTime;
const now = DateTime.now().setZone('Europe/Istanbul');

const gunMap = {
  'pazartesi': 0, 'salı': 1, 'sali': 1,
  'çarşamba': 2, 'carsamba': 2,
  'perşembe': 3, 'persembe': 3,
  'cuma': 4, 'cumartesi': 5, 'pazar': 6
};

const isNextWeek = msg.includes('haftaya') || msg.includes('gelecek hafta');
const isCancel   = msg.includes('iptal') || msg.includes('sil') || msg.includes('vazgeç') || msg.includes('vazgec');

let targetDate = null;

if (msg.includes('bugün') || msg.includes('bugun')) {
  targetDate = now.toFormat('yyyy-MM-dd');
} else if (msg.includes('yarın') || msg.includes('yarin')) {
  targetDate = now.plus({ days: 1 }).toFormat('yyyy-MM-dd');
} else {
  for (const [gun, offset] of Object.entries(gunMap)) {
    if (msg.includes(gun)) {
      let day = now.startOf('week').plus({ days: offset });
      if (day <= now || isNextWeek) day = day.plus({ days: 7 });
      targetDate = day.toFormat('yyyy-MM-dd');
      break;
    }
  }
}

// Sayısal tarih: "18 haziran"
if (!targetDate) {
  const aylar = { ocak:1, şubat:2, mart:3, nisan:4, mayıs:5, haziran:6,
                  temmuz:7, ağustos:8, eylül:9, ekim:10, kasım:11, aralık:12 };
  for (const [ay, no] of Object.entries(aylar)) {
    const m = msg.match(new RegExp(`(\\d{1,2})\\s*${ay}`));
    if (m) {
      const d = parseInt(m[1]);
      const dt = now.set({ month: no, day: d });
      targetDate = (dt < now ? dt.plus({ years: 1 }) : dt).toFormat('yyyy-MM-dd');
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
    }
}

# ─────────────────────────────────────────────
# 2. IF Node — Müsaitlik Sorgusu mu?
# ─────────────────────────────────────────────
if_prefetch = {
    "id": str(uuid.uuid4()),
    "name": "Musaitlik Sorgusu mu?",
    "type": "n8n-nodes-base.if",
    "typeVersion": 2,
    "position": POS_IF,
    "parameters": {
        "conditions": {
            "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 2},
            "conditions": [{
                "id": "prefetch-check",
                "leftValue": "={{ $json.shouldPreFetch }}",
                "rightValue": True,
                "operator": {"type": "boolean", "operation": "true"}
            }],
            "combinator": "and"
        },
        "options": {}
    }
}

# ─────────────────────────────────────────────
# 3. HTTP Request — Pre-Fetch musaitlik_kontrol
# ─────────────────────────────────────────────
http_prefetch = {
    "id": str(uuid.uuid4()),
    "name": "Pre-Fetch Musaitlik",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.2,
    "position": POS_HTTP,
    "parameters": {
        "method": "GET",
        "url": f"{NGROK}/api/v1/whatsapp/appointments/availability",
        "sendQuery": True,
        "queryParameters": {
            "parameters": [
                {"name": "token", "value": SECRET},
                {"name": "doctorName", "value": "={{ $('Check Conversation Status').first().json.doctorName }}"},
                {"name": "date", "value": "={{ $json.targetDate }}"},
                {"name": "ngrok-skip-browser-warning", "value": "1"}
            ]
        },
        "options": {"response": {"response": {"responseFormat": "json"}}},
        "onError": "continueRegularOutput"
    }
}

# ─────────────────────────────────────────────
# 4. Context Injector — Code Node
# ─────────────────────────────────────────────
context_injector = {
    "id": str(uuid.uuid4()),
    "name": "Context Injector",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": POS_INJECTOR,
    "parameters": {
        "mode": "runOnceForEachItem",
        "jsCode": r"""
const original = $('Data Normalization').first().json;
const apiResult = $input.item.json;
const slots = apiResult.slots || [];
const date  = apiResult.targetDate || original.targetDate || '';
const available = apiResult.available;
const message = apiResult.message || '';

let slotInfo;
if (slots.length === 0) {
  slotInfo = `${date} tarihinde musait randevu yok.`;
} else if (available === false && message) {
  slotInfo = `${message} ${slots.join(', ')}`;
} else {
  slotInfo = `${date} icin musait saatler: ${slots.join(', ')}`;
}

const enrichedMsg = original.mesaj_icerigi +
  `\n\n[SYSTEM_DATA — REAL_TIME — DO NOT QUERY AGAIN: ${slotInfo}]`;

return {
  ...original,
  mesaj_icerigi: enrichedMsg,
  targetDate: date
};
"""
    }
}

# ── Add nodes ──
wf['nodes'].extend([date_detector, if_prefetch, http_prefetch, context_injector])

# ─────────────────────────────────────────────
# Update Connections
# ─────────────────────────────────────────────
dd  = date_detector['name']
ifn = if_prefetch['name']
htp = http_prefetch['name']
inj = context_injector['name']

# Check Conversation Status → Date Detector (instead of → If NOT Human Mode directly? No — keep existing)
# Date Detector runs AFTER Check Conversation Status, BEFORE If NOT Human Mode
# Current: Check Conversation Status → If NOT Human Mode
# New:     Check Conversation Status → Date Detector → Musaitlik Sorgusu mu?
#            TRUE → Pre-Fetch → Context Injector → If NOT Human Mode
#            FALSE → If NOT Human Mode

# Rewire: Check Conversation Status → Date Detector
conns['Check Conversation Status'] = {
    "main": [[{"node": dd, "type": "main", "index": 0}]]
}

# Date Detector → Musaitlik Sorgusu mu?
conns[dd] = {
    "main": [[{"node": ifn, "type": "main", "index": 0}]]
}

# Musaitlik Sorgusu mu? → TRUE → Pre-Fetch, FALSE → If NOT Human Mode
conns[ifn] = {
    "main": [
        [{"node": htp, "type": "main", "index": 0}],   # TRUE
        [{"node": "If NOT Human Mode", "type": "main", "index": 0}]  # FALSE
    ]
}

# Pre-Fetch → Context Injector
conns[htp] = {
    "main": [[{"node": inj, "type": "main", "index": 0}]]
}

# Context Injector → If NOT Human Mode (same as FALSE branch)
conns[inj] = {
    "main": [[{"node": "If NOT Human Mode", "type": "main", "index": 0}]]
}

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print("✅ 4 node eklendi ve bağlantılar güncellendi:")
print(f"   Check Conversation Status → {dd} → {ifn}")
print(f"   {ifn} [TRUE]  → {htp} → {inj} → If NOT Human Mode")
print(f"   {ifn} [FALSE] → If NOT Human Mode")
print(f"\nWorkflow node sayısı: {len(wf['nodes'])}")
