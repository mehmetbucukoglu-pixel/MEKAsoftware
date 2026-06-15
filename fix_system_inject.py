import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

# 1. Context Injector — system_inject ayrı field, mesaj_icerigi temiz
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

const systemInject = `

=== GERCEK ZAMANLI MUSAITLIK VERISI (su an backend'den alindi) ===
${slotInfo}
Bu veriye gore cevap ver. musaitlik_kontrol CAGIRMA.
======================================================`;

return {
  ...convStatus,
  ...original,
  mesaj_icerigi: original.mesaj_icerigi || convStatus.combinedText || '',
  system_inject: systemInject,
  targetDate
};
"""

for node in wf['nodes']:
    if node['name'] == 'Context Injector':
        node['parameters']['jsCode'] = NEW_INJECTOR
        print("✅ Context Injector: system_inject ayrı field")

# 2. Isolate AI Input — system_inject de geçir
for node in wf['nodes']:
    if node['name'] == 'Isolate AI Input':
        node['parameters']['assignments']['assignments'] = [
            {
                "id": "set-mesaj-icerigi-isolation",
                "name": "mesaj_icerigi",
                "value": "={{ $json.mesaj_icerigi }}",
                "type": "string"
            },
            {
                "id": "set-system-inject",
                "name": "system_inject",
                "value": "={{ $json.system_inject || '' }}",
                "type": "string"
            }
        ]
        print("✅ Isolate AI Input: system_inject field eklendi")

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print("""
✅ JSON güncellendi. 

SON ADIM — n8n UI'da manuel:
AI Agent node → System Message → EN SONA ekle:
{{ $('Isolate AI Input').first().json.system_inject }}

Bu sayede availability data system prompt'a girer,
memory'deki eski tool sonuçlarını geçersiz kılar.
""")
