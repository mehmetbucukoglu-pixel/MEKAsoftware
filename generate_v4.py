import json

def main():
    with open('n8n-workflow-v3-final.json', 'r', encoding='utf-8') as f:
        workflow = json.load(f)
        
    for node in workflow['nodes']:
        if node['name'] == 'AI Agent':
            # Append instructions to systemMessage
            system_msg = node['parameters']['options']['systemMessage']
            instruction = "\n\n# ÖNEMLİ: ARAÇ KULLANIM KURALLARI\n- `randevu_olustur` aracını kullanırken, BAĞLAMDAKİ müşteri telefon numarasını `patientPhone` parametresi olarak EKSİKSİZ ver.\n- Parametreleri (patientName, patientPhone, doctorName, startTime) kesinlikle json olarak ayırarak ver, asla tek bir `query` nesnesi içine gömme.\n- `randevu_guncelle` yaparken `durationMin` veya `clinicId` gönderme."
            if "ARAÇ KULLANIM KURALLARI" not in system_msg:
                node['parameters']['options']['systemMessage'] = system_msg + instruction
                
        elif node['name'] == 'randevu_olustur':
            node['parameters']['toolDescription'] = "Yeni bir randevu oluşturur. 'patientPhone' için her zaman bağlamdaki Müşteri Telefonu bilgisini kullan. Tüm parametreleri eksiksiz ver."
            
            schema = {
              "type": "object",
              "properties": {
                "patientName": {
                  "type": "string",
                  "description": "Tam ad ve soyad (mutlaka isteyin)"
                },
                "patientPhone": {
                  "type": "string",
                  "description": "Uluslararası formatta telefon (örn: +905...)"
                },
                "doctorName": {
                  "type": "string",
                  "description": "Doktor adı (örn: Dr. Ayşe Pınar Vural)"
                },
                "startTime": {
                  "type": "string",
                  "description": "ISO 8601 formatında randevu başlangıç zamanı"
                }
              },
              "required": ["patientName", "patientPhone", "doctorName", "startTime"]
            }
            node['parameters']['jsonSchema'] = json.dumps(schema, indent=2)
            
            # Update parametersBody
            node['parameters']['parametersBody']['values'] = [
                { "name": "clinicId", "value": "135460d3-f612-457f-89e8-8ead3181c562" },
                { "name": "patientName", "value": "={{ $fromAI('patientName') }}" },
                { "name": "patientPhone", "value": "={{ $fromAI('patientPhone') }}" },
                { "name": "doctorName", "value": "={{ $fromAI('doctorName') }}" },
                { "name": "startTime", "value": "={{ $fromAI('startTime') }}" },
                { "name": "durationMin", "value": "60" }
            ]
            
        elif node['name'] == 'randevu_guncelle':
            schema = {
              "type": "object",
              "properties": {
                "appointmentId": {
                  "type": "string",
                  "description": "Güncellenecek veya iptal edilecek randevunun ID'si"
                },
                "action": {
                  "type": "string",
                  "description": "İptal için '/cancel' yaz, güncelleme için boş bırak ''"
                },
                "startTime": {
                  "type": "string",
                  "description": "Yeni zaman (ISO 8601), iptal ediliyorsa gönderme"
                }
              },
              "required": ["appointmentId", "action"]
            }
            node['parameters']['jsonSchema'] = json.dumps(schema, indent=2)
            
            node['parameters']['parametersBody']['values'] = [
                { "name": "startTime", "value": "={{ $fromAI('startTime') }}" },
                { "name": "durationMin", "value": "60" }
            ]

    workflow['name'] = "KlinikApp WhatsApp Bot v8 - Simplified Schemas"
    workflow['versionId'] = "v8-schemas"

    with open('n8n-workflow-v4.json', 'w', encoding='utf-8') as f:
        json.dump(workflow, f, indent=4, ensure_ascii=False)

if __name__ == '__main__':
    main()
