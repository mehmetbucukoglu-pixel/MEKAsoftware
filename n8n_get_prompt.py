import json, sys

sys.stdout = open('n8n_prompt.txt', 'w', encoding='utf-8')

with open('n8n-workflow-v17-final.json', encoding='utf-8') as f:
    wf = json.load(f)

for n in wf['nodes']:
    if n.get('name') == 'AI Agent':
        params = n.get('parameters', {})
        print('=== AI AGENT SYSTEM PROMPT ===')
        prompt = params.get('systemMessage', '')
        print(prompt)
        print()
        print('=== OTHER PARAMS ===')
        for k,v in params.items():
            if k != 'systemMessage':
                print(f'{k}: {str(v)[:300]}')

# Also get tool nodes
print()
print('=== TOOL NODES (AI Tools) ===')
for n in wf['nodes']:
    if 'toolHttpRequest' in n.get('type',''):
        name = n.get('name','')
        params = n.get('parameters', {})
        print(f'--- {name} ---')
        print(f'  URL: {params.get("url","")}')
        print(f'  Method: {params.get("method","GET")}')
        desc = params.get('toolDescription','')
        print(f'  Description: {desc[:400]}')
        body = params.get('body','') or params.get('bodyParameters','') 
        if body:
            print(f'  Body: {str(body)[:400]}')
        print()

sys.stdout.close()
print('Done -> n8n_prompt.txt')
