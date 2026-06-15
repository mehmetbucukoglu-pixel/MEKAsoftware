import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

# Print all node positions to understand the layout
nodes_pos = [(n['name'], n.get('position', [0,0])) for n in wf['nodes']]
nodes_pos.sort(key=lambda x: (x[1][1], x[1][0]))

print("=== Node pozisyonları (y, x sıralı) ===")
for name, pos in nodes_pos:
    print(f"  x={pos[0]:6d}  y={pos[1]:6d}  [{name}]")
