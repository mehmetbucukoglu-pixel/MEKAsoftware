import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

NEW_INJECTOR = r"""
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
  slotInfo = `${message} Alternatifler: ${slots.join(', ')}`;
} else {
  slotInfo = `${targetDate} tarihinde musait saatler (TUMU): ${slots.join(', ')}`;
}

// Put SYSTEM_DATA BEFORE user message so AI reads it first
const systemBlock = `[KRITIK SISTEM VERISI — AZ ONCE BACKEND'DEN ALINDI — ONCEKI VERILERI GECERSIZ KILAR]
${slotInfo}
[Bu veri icin musaitlik_kontrol CAGIRMA — veri zaten burada]

`;

const enrichedMsg = systemBlock + (original.mesaj_icerigi || convStatus.combinedText || '');

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
        print("✅ Context Injector: SYSTEM_DATA mesajın BAŞINA eklendi + güçlü override mesajı")
        break

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)
