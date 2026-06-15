import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

for node in wf['nodes']:
    if node.get('name') == 'musaitlik_kontrol':
        params = node['parameters']
        query_vals = params.get('parametersQuery', {}).get('values', [])
        
        # Check if preferredTime already exists
        has_preferred = any(p.get('name') == 'preferredTime' for p in query_vals)
        
        if not has_preferred:
            query_vals.append({
                'name': 'preferredTime',
                'description': 'Kullanıcının tercih ettiği saat (HH:MM formatında, örn: 17:00). Kullanıcı belirli bir saat söylediyse bu parametreyi doldur, söylemediyse boş bırak.'
            })
            params['parametersQuery']['values'] = query_vals
            print("✅ musaitlik_kontrol: preferredTime query param eklendi")
        else:
            print("ℹ️  preferredTime zaten mevcut")

        # Also update tool description
        old_desc = params.get('toolDescription', '')
        if 'preferredTime' not in old_desc:
            params['toolDescription'] = (
                old_desc.rstrip('.') +
                ". Kullanıcı belirli bir saat söylediyse preferredTime parametresini "
                "doldurun (örn: '17:00'). Söylemezse boş bırakın."
            )
            print("✅ toolDescription güncellendi")

        print(f"   Mevcut query params: {[p['name'] for p in query_vals]}")
        break

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print("\nDone. Import et ve '17:00 randevu' diye test et.")
