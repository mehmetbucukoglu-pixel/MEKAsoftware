import json

with open('n8n-workflow-v17-final.json', encoding='utf-8') as f:
    wf = json.load(f)

# Find AI Agent node and print full system prompt
for n in wf['nodes']:
    if n.get('type','') == 'n8n-nodes-langchain.agent' and n.get('name') == 'AI Agent':
        params = n.get('parameters', {})
        print('=== AI AGENT SYSTEM PROMPT ===')
        prompt = params.get('systemMessage', params.get('options', {}).get('systemMessage', ''))
        print(prompt)
        print()
        print('=== ALL AGENT PARAMS (keys) ===')
        for k,v in params.items():
            if k != 'systemMessage':
                print(f'  {k}: {str(v)[:120]}')

# Print all Set nodes (data transformations)
print()
print('=== SET NODES ===')
for n in wf['nodes']:
    if n.get('type','') == 'n8n-nodes-base.set':
        name = n.get('name','')
        params = n.get('parameters', {})
        print(f'  --- {name} ---')
        assignments = params.get('assignments', {}).get('assignments', [])
        for a in assignments:
            val = str(a.get('value',''))[:200]
            print(f'    {a.get("name")}: {val}')

# Print all IF nodes
print()
print('=== IF NODES (conditions) ===')
for n in wf['nodes']:
    if n.get('type','') == 'n8n-nodes-base.if':
        name = n.get('name','')
        params = n.get('parameters', {})
        conds = params.get('conditions', {})
        print(f'  --- {name} ---')
        print(f'    Conditions: {str(conds)[:300]}')

# Print WA send message nodes
print()
print('=== WHATSAPP SEND NODES ===')
for n in wf['nodes']:
    if 'whatsApp' in n.get('type','') or 'whatsapp' in n.get('type','').lower():
        name = n.get('name','')
        params = n.get('parameters', {})
        print(f'  --- {name} ---')
        for k,v in params.items():
            print(f'    {k}: {str(v)[:200]}')
