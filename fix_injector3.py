import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

NEW_INJECTOR = r"""
// Date Detector convStatus'u zaten spread ederek geçiriyor
const convStatus = $('Date Detector').first().json;
const original   = $('Data Normalization').first().json;
const apiResult  = $input.item.json;
const slots      = apiResult.slots || [];
const targetDate = convStatus.targetDate || '';
const available  = apiResult.available;
const message    = apiResult.message || '';

let slotInfo;
if (slots.length === 0) {
  slotInfo = `${targetDate} tarihinde musait randevu yok.`;
} else if (available === false && message) {
  slotInfo = `${message} ${slots.join(', ')}`;
} else {
  slotInfo = `${targetDate} icin musait saatler: ${slots.join(', ')}`;
}

const enrichedMsg = (original.mesaj_icerigi || convStatus.combinedText || '') +
  `\n\n[SYSTEM_DATA — REAL_TIME — DO NOT QUERY AGAIN: ${slotInfo}]`;

return {
  ...convStatus,
  ...original,
  mesaj_icerigi: enrichedMsg,
  targetDate
};
"""

for node in wf['nodes']:
    if node['name'] == 'Context Injector':
        node['parameters']['jsCode'] = NEW_INJECTOR
        print("✅ Context Injector: $('Date Detector') kullanıyor (mode dahil tüm alanlar)")
        break

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)
