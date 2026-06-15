import json

with open('n8n-workflow-v17-final.json', encoding='utf-8') as f:
    wf = json.load(f)

print('=== WORKFLOW NODES ===')
for n in wf['nodes']:
    ntype = n.get('type','')
    nname = n.get('name','')
    params = n.get('parameters', {})
    url = params.get('url', params.get('path', ''))
    method = params.get('method', params.get('httpMethod', ''))
    short_type = ntype.split('.')[-1][:22]
    print(f'  [{short_type}] {nname}')
    if url:
        print(f'     URL/Path: {url}')
    if method:
        print(f'     Method: {method}')
    # Show AI model if present
    model = params.get('model','') or params.get('options', {}).get('model','')
    if model:
        print(f'     Model: {model}')
    # Show message/prompt snippets
    msg = params.get('systemMessage','') or params.get('text','') or params.get('prompt','')
    if msg and len(str(msg)) > 0:
        snippet = str(msg)[:80].replace('\n',' ')
        print(f'     Prompt/Msg: {snippet}...')

print()
print('=== HTTP REQUEST NODES (URLs) ===')
for n in wf['nodes']:
    if 'httpRequest' in n.get('type','').lower():
        name = n.get('name','')
        url = n.get('parameters',{}).get('url','')
        method = n.get('parameters',{}).get('method','GET')
        body = n.get('parameters',{}).get('body','') or n.get('parameters',{}).get('bodyParameters','')
        print(f'  Node: {name}')
        print(f'    Method: {method}')
        print(f'    URL: {url}')

print()
print('=== CONNECTIONS ===')
conns = wf.get('connections', {})
for src, targets in conns.items():
    for output_idx, output_list in enumerate(targets.get('main',[])):
        for conn in output_list:
            print(f'  {src} -> {conn["node"]}')
