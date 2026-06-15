import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

# Find "Is Registered?" node (for continuing conversations) and its connections
# Currently: Is New Conversation? FALSE -> Is Registered? -> YES: AI Agent, NO: Unregistered Reply
# Fix: Is New Conversation? FALSE -> Is Registered? -> YES: AI Agent, NO: eskalasyon (direct escalate)

# Also update Unregistered Reply text to be more helpful
for node in wf['nodes']:
    name = node.get('name', '')
    params = node.get('parameters', {})

    # Fix 1: Update Unregistered Reply for NEW contact - keep static msg but better text
    if name == 'Unregistered Reply':
        assignments = params.get('assignments', {}).get('assignments', [])
        for a in assignments:
            if a.get('name') == 'output':
                a['value'] = (
                    "Merhaba! 👋\n\n"
                    "Sistemimizde bu numaraya kayıtlı bir hasta bulunamadı.\n\n"
                    "Randevu alabilmek için kliniğimize kayıt yaptırmanız gerekmektedir. "
                    "Sizi en kısa sürede arayacağız veya kliniğimizi arayabilirsiniz.\n\n"
                    "📞 Kayıt ve bilgi için kliniğimizle iletişime geçin."
                )
                print("✅ Unregistered Reply text updated")

print()
print("=== CONNECTIONS (Is Registered? - devam konuşma) ===")
conns = wf.get('connections', {})

# Show current connections from "Is Registered?"
reg_conns = conns.get('Is Registered?', {})
print(f"Is Registered? outputs: {reg_conns}")

# Show current connections from "Is New Conversation?"  
new_conv_conns = conns.get('Is New Conversation?', {})
print(f"Is New Conversation? outputs: {new_conv_conns}")

print()
print("Current flow for non-new conversation (isNewConversation=false):")
print("  Is New Conversation? [false/output1] -> ?")
# output index 0 = true, output index 1 = false
if 'main' in new_conv_conns:
    for i, output in enumerate(new_conv_conns['main']):
        label = 'TRUE' if i == 0 else 'FALSE'
        for conn in output:
            print(f"  [{label}] -> {conn['node']}")

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print()
print("File saved. Now need to manually check if false path needs redirect.")
print("The key insight: 'Is New Conversation? FALSE' goes to 'Is Registered?'")
print("'Is Registered? FALSE' goes to 'Unregistered Reply' -> sends static msg -> DONE")
print("This means repeat messages from unregistered users always get static reply!")
print()
print("SOLUTION: Unregistered Reply should also trigger escalation via eskalasyon tool")
print("OR: Add direct connection from Unregistered Reply -> eskalasyon HTTP node")
