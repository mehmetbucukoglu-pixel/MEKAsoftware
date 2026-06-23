"""
KlinikApp — Interactive Clinic Onboarding Wizard
==================================================
Adım adım clinic config alır, clinic ID üretir,
ardından n8n workflow JSON ve seed SQL dosyalarını oluşturur.

Usage:
    python tools/onboard_clinic.py
"""

import json
import uuid
import subprocess
import sys
import os
import re
from datetime import datetime, timezone

# Force UTF-8 output on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
BACKEND_DIR = os.path.join(PROJECT_DIR, "backend")
TEMPLATE    = os.path.join(PROJECT_DIR, "Feneryolu - Production Workflow.json")
OUTPUT_DIR  = os.path.join(PROJECT_DIR, "output")
REGISTRY_PATH = os.path.join(OUTPUT_DIR, "clinic_registry.json")

# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────

def hr(char="─", width=60):
    print(char * width)

def ask(prompt, default=None, required=True):
    """Prompt user for input. Shows default if provided."""
    hint = f" [{default}]" if default is not None else ""
    while True:
        val = input(f"  {prompt}{hint}: ").strip()
        if val == "" and default is not None:
            return default
        if val == "" and required:
            print("  ⚠️  Bu alan zorunludur.")
            continue
        return val if val else default

def ask_int(prompt, default=None, min_val=None, max_val=None):
    while True:
        raw = ask(prompt, default=str(default) if default is not None else None)
        try:
            val = int(raw)
            if min_val is not None and val < min_val:
                print(f"  ⚠️  Minimum değer: {min_val}")
                continue
            if max_val is not None and val > max_val:
                print(f"  ⚠️  Maksimum değer: {max_val}")
                continue
            return val
        except ValueError:
            print("  ⚠️  Lütfen bir sayı girin.")

def ask_days(prompt, default="0,1,2,3,4"):
    """Ask for comma-separated day numbers (0=Mon…6=Sun)."""
    DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]
    print(f"  {prompt}")
    print("    0=Pzt  1=Sal  2=Çar  3=Per  4=Cum  5=Cmt  6=Paz")
    while True:
        raw = ask("Günler (virgülle ayırın)", default=default)
        try:
            days = [int(d.strip()) for d in raw.split(",")]
            if all(0 <= d <= 6 for d in days):
                day_str = ", ".join(DAY_NAMES[d] for d in days)
                print(f"  ✔  Seçilen: {day_str}")
                return days
        except ValueError:
            pass
        print("  ⚠️  Geçersiz giriş. Örnek: 0,1,2,3,4")

def confirm(prompt):
    val = input(f"  {prompt} (e/h): ").strip().lower()
    return val in ("e", "evet", "y", "yes")


# ─────────────────────────────────────────────────────────────
# STEP 1 — COLLECT CLINIC CONFIG
# ─────────────────────────────────────────────────────────────

def collect_config() -> dict:
    print()
    hr("═")
    print("  KlinikApp — Yeni Klinik Onboarding Sihirbazı")
    hr("═")
    print()

    # ── Clinic identity ─────────────────────────────────────
    print("▶  ADIM 1/4  —  Klinik Bilgileri")
    hr()
    clinic_name    = ask("Klinik adı (örn: Feneryolu Psikiyatri)")
    clinic_slug    = ask(
        "Slug (URL-safe, boşluksuz, örn: feneryolu-psikiyatri)",
        default=clinic_name.lower().replace(" ", "-").replace("ı","i").replace("ş","s")
                          .replace("ğ","g").replace("ç","c").replace("ö","o").replace("ü","u")
    )
    clinic_phone   = ask("Klinik telefonu (örn: +905551234567)")
    clinic_address = ask("Adres (örn: Ankara, Çankaya)")
    clinic_tz      = ask("Timezone", default="Europe/Istanbul")

    print()
    print("▶  ADIM 2/4  —  WhatsApp & Sistem Ayarları")
    hr()
    wa_phone_number_id = ask("WhatsApp Phone Number ID (Meta Dashboard'dan)")
    waba_id            = ask("WhatsApp Business Account ID (WABA ID)")
    wa_access_token    = ask("WhatsApp Access Token (EAA... ile başlar)")
    wa_pin             = ask("WhatsApp 2FA PIN (6 rakam, kendin belirle)", default="123456")
    api_url            = ask("Backend API URL", default="https://api.mekapanel.com")
    n8n_secret         = ask("n8n Secret", default="klinikapp-n8n-secret-2024")
    outbound_webhook_url = ask(
        "Human Mode Outbound Webhook URL (n8n per-clinic webhook, :5678 olmadan)\n  örn: https://n8n.themovieecho.com/webhook/UUID"
    )
    cron_hour          = ask_int("Günlük hatırlatıcı saati (0-23)", default=11, min_val=0, max_val=23)
    openai_model       = ask("OpenAI model", default="gpt-4o-mini")

    # ── Doctors ─────────────────────────────────────────────
    print()
    print("▶  ADIM 3/4  —  Doktorlar")
    hr()
    doctors = []
    while True:
        d_num = len(doctors) + 1
        print(f"\n  Doktor #{d_num}")
        first_name = ask("  Ad")
        last_name  = ask("  Soyad")
        email      = ask("  E-posta")
        password   = ask("  Şifre", default="Doctor2024!")
        phone      = ask("  Telefon (örn: +905559876543)")
        days       = ask_days("  Çalışma günleri")
        start_time = ask("  Mesai başlangıcı", default="09:00")
        end_time   = ask("  Mesai bitişi", default="18:00")
        slot_min   = ask_int("  Randevu süresi (dakika)", default=60)

        doctors.append({
            "first_name": first_name,
            "last_name":  last_name,
            "email":      email,
            "password":   password,
            "phone":      phone,
            "schedule": {
                "days":       days,
                "start_time": start_time,
                "end_time":   end_time,
                "slot_min":   slot_min,
            }
        })
        print(f"  ✅ Doktor eklendi: {first_name} {last_name}")
        if not confirm("  Başka doktor eklensin mi?"):
            break

    # ── Secretaries ─────────────────────────────────────────
    print()
    print("▶  ADIM 4/4  —  Sekreterler (opsiyonel)")
    hr()
    secretaries = []
    if confirm("Sekreter eklensin mi?"):
        while True:
            s_num = len(secretaries) + 1
            print(f"\n  Sekreter #{s_num}")
            first_name = ask("  Ad")
            last_name  = ask("  Soyad")
            email      = ask("  E-posta")
            password   = ask("  Şifre", default="Secretary2024!")
            phone      = ask("  Telefon")
            secretaries.append({
                "first_name": first_name,
                "last_name":  last_name,
                "email":      email,
                "password":   password,
                "phone":      phone,
            })
            print(f"  ✅ Sekreter eklendi: {first_name} {last_name}")
            if not confirm("  Başka sekreter eklensin mi?"):
                break

    # ── Existing clinic override ─────────────────────────────
    print()
    clinic_id_override = None
    if confirm("Bu klinik zaten DB'de kayıtlı mı? (clinic_id_override girmek için)"):
        clinic_id_override = ask("Mevcut Clinic ID (UUID)")

    return {
        "clinic_name":         clinic_name,
        "clinic_slug":         clinic_slug,
        "clinic_phone":        clinic_phone,
        "clinic_address":      clinic_address,
        "clinic_timezone":     clinic_tz,
        "doctors":             doctors,
        "secretaries":         secretaries,
        "api_url":             api_url,
        "n8n_secret":          n8n_secret,
        "outbound_webhook_url": outbound_webhook_url,
        "cron_hour":           cron_hour,
        "openai_model":        openai_model,
        "wa_phone_number_id":  wa_phone_number_id,
        "waba_id":             waba_id,
        "wa_access_token":     wa_access_token,
        "wa_pin":              wa_pin,
        "clinic_id_override":  clinic_id_override,
    }


# ─────────────────────────────────────────────────────────────
# STEP 2 — GENERATE CLINIC ID
# ─────────────────────────────────────────────────────────────

def resolve_clinic_id(config: dict) -> str:
    override = config.get("clinic_id_override")
    if override:
        print(f"\n  ℹ️  Mevcut Clinic ID kullanılıyor: {override}")
        return override

    clinic_id = str(uuid.uuid4())
    print()
    hr("═")
    print("  ✅ Clinic ID üretildi!")
    hr("═")
    print(f"\n  Clinic ID: {clinic_id}\n")
    hr()
    print("  Bu ID'yi kaydedin. SQL ve workflow'a otomatik ekleniyor.")
    hr()
    return clinic_id


# ─────────────────────────────────────────────────────────────
# STEP 2b — REGISTER PHONE NUMBER WITH META
# ─────────────────────────────────────────────────────────────

def register_phone_number(config: dict):
    """Meta WhatsApp Cloud API'ye numarayı kaydeder (Beklemede → Bağlı)."""
    import urllib.request

    phone_number_id = str(config["wa_phone_number_id"])
    token           = config["wa_access_token"]
    pin             = config["wa_pin"]

    print("\n  Meta'ya numara kaydediliyor...")
    url  = f"https://graph.facebook.com/v18.0/{phone_number_id}/register"
    data = json.dumps({"messaging_product": "whatsapp", "pin": pin}).encode()
    req  = urllib.request.Request(url, data=data, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type":  "application/json"
    })
    try:
        with urllib.request.urlopen(req) as r:
            resp = json.loads(r.read().decode())
            if resp.get("success"):
                print("  ✅ Numara Meta'ya kaydedildi (Beklemede → Bağlı)")
            else:
                print(f"  ⚠️  Yanıt: {resp}")
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        if "already registered" in err or "136024" in err:
            print("  ℹ️  Numara zaten kayıtlı — atlanıyor")
        else:
            print(f"  ❌  Meta kayıt hatası: {err}")
    except Exception as e:
        print(f"  ❌  Beklenmeyen hata: {e}")


def ensure_waba_subscription(config: dict):
    """WABA'nın App'e subscribe olduğunu kontrol eder, yoksa subscribe eder.
    Tek WABA mimarisinde bir kez yeterli; her çalışmada idempotent."""
    import urllib.request

    token   = config["wa_access_token"]
    waba_id = config.get("waba_id", "")
    if not waba_id:
        print("  ℹ️  waba_id config'de yok — WABA subscription atlanıyor")
        print("      (İlk kurulumda check_waba_subscription.py ile manuel yap)")
        return

    check_url = f"https://graph.facebook.com/v18.0/{waba_id}/subscribed_apps"
    req = urllib.request.Request(
        check_url,
        headers={"Authorization": f"Bearer {token}"}
    )
    try:
        with urllib.request.urlopen(req) as r:
            data = json.loads(r.read().decode())
            if data.get("data"):
                print("  ℹ️  WABA zaten subscribe edilmiş — atlanıyor")
                return
    except Exception:
        pass  # hata alırsak subscribe etmeyi dene

    # Subscribe et
    sub_req = urllib.request.Request(
        check_url, data=b"", method="POST",
        headers={"Authorization": f"Bearer {token}"}
    )
    try:
        with urllib.request.urlopen(sub_req) as r:
            result = json.loads(r.read().decode())
            if result.get("success"):
                print("  ✅ WABA App'e subscribe edildi — webhook aktif")
            else:
                print(f"  ⚠️  WABA subscription yanıtı: {result}")
    except urllib.error.HTTPError as e:
        print(f"  ❌  WABA subscription hatası: {e.read().decode()}")


# ─────────────────────────────────────────────────────────────
# STEP 3 — BUILD SEED SQL
# ─────────────────────────────────────────────────────────────

def bcrypt_hash(password: str) -> str:
    result = subprocess.run(
        ["node", "-e", f"require('bcrypt').hash('{password}', 12).then(h => process.stdout.write(h))"],
        capture_output=True, text=True, cwd=BACKEND_DIR
    )
    if result.returncode != 0 or not result.stdout.strip():
        print(f"    ⚠️  bcrypt başarısız: {result.stderr}")
        return "HASH_FAILED_replace_manually"
    return result.stdout.strip()


def build_seed_sql(config: dict, clinic_id: str) -> str:
    lines = []
    lines.append("-- ============================================================")
    lines.append(f"-- KlinikApp Onboarding: {config['clinic_name']}")
    lines.append(f"-- Generated: {datetime.now().isoformat()}")
    lines.append("-- ============================================================")
    lines.append("")
    lines.append("-- Run: psql $DATABASE_URL < this_file.sql")
    lines.append("")

    # Clinic
    lines.append(f"""INSERT INTO clinics (id, name, slug, phone, address, timezone, created_at, updated_at)
VALUES (
  '{clinic_id}',
  '{config["clinic_name"]}',
  '{config["clinic_slug"]}',
  '{config["clinic_phone"]}',
  '{config["clinic_address"]}',
  '{config["clinic_timezone"]}',
  NOW(), NOW()
) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
""")

    # Clinic settings — outbound webhook URL
    outbound_url = config.get("outbound_webhook_url", "")
    if outbound_url:
        lines.append(f"""UPDATE clinics
SET settings = COALESCE(settings, '{{}}'::jsonb) || '{{"outboundWebhookUrl": "{outbound_url}"}}'::jsonb
WHERE id = '{clinic_id}';
""")

    def user_sql(uid, cid, email, first, last, phone, role, password):
        pw_hash = bcrypt_hash(password)
        print(f"    Hashing {email}...")
        return f"""-- {role}: {email}
INSERT INTO users (id, clinic_id, email, password_hash, first_name, last_name, phone, role, created_at, updated_at)
VALUES (
  '{uid}', '{cid}', '{email}', '{pw_hash}',
  '{first}', '{last}', '{phone}', '{role}',
  NOW(), NOW()
) ON CONFLICT (clinic_id, email) DO NOTHING;
"""

    print("\n  Bcrypt hash'leri üretiliyor (~3s / kullanıcı)...")

    doctor_ids = []
    for doc in config["doctors"]:
        doc_id = str(uuid.uuid4())
        doctor_ids.append((doc_id, doc))
        lines.append(user_sql(doc_id, clinic_id,
                              doc["email"], doc["first_name"], doc["last_name"],
                              doc["phone"], "DOCTOR", doc["password"]))

    for sec in config.get("secretaries", []):
        sec_id = str(uuid.uuid4())
        lines.append(user_sql(sec_id, clinic_id,
                              sec["email"], sec["first_name"], sec["last_name"],
                              sec["phone"], "ASSISTANT", sec["password"]))

    # Schedules — tek INSERT, tüm günler tek VALUES bloğu
    for doc_id, doc in doctor_ids:
        sched = doc["schedule"]
        rows = []
        for day in sched["days"]:
            rows.append(
                f"  ('{uuid.uuid4()}', '{clinic_id}', '{doc_id}', "
                f"{day}, '{sched['start_time']}', '{sched['end_time']}', "
                f"{sched['slot_min']}, true)"
            )
        lines.append(
            "INSERT INTO doctor_schedules "
            "(id, clinic_id, doctor_id, day_of_week, start_time, end_time, slot_duration, is_active)\n"
            "VALUES\n" + ",\n".join(rows) + "\n"
            "ON CONFLICT (clinic_id, doctor_id, day_of_week) DO NOTHING;\n"
        )

    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────
# STEP 4 — GENERATE N8N WORKFLOW JSON
# ─────────────────────────────────────────────────────────────

ROUTER_REMOVED_NODES = {
    "Webhook (POST Messages)",
    "Webhook (GET Handshake)",
    "Check Handshake",
    "Respond Challenge",
}


def convert_to_execute_workflow_trigger(wf: dict) -> dict:
    trigger_pos = [-1088, 8656]
    post_connections_to = []

    for n in wf["nodes"]:
        if n["name"] == "Webhook (POST Messages)":
            trigger_pos = n["position"]

    conns = wf.get("connections", {})
    post_outputs = conns.get("Webhook (POST Messages)", {}).get("main", [])
    for output_list in post_outputs:
        for target in output_list:
            post_connections_to.append(target["node"])

    wf["nodes"] = [n for n in wf["nodes"] if n["name"] not in ROUTER_REMOVED_NODES]
    for removed in ROUTER_REMOVED_NODES:
        conns.pop(removed, None)
    for src_name, src_data in conns.items():
        for i, output_list in enumerate(src_data.get("main", [])):
            src_data["main"][i] = [t for t in output_list if t["node"] not in ROUTER_REMOVED_NODES]

    trigger_node = {
        "parameters": {},
        "type": "n8n-nodes-base.executeWorkflowTrigger",
        "typeVersion": 1,
        "position": trigger_pos,
        "id": str(uuid.uuid4()),
        "name": "Execute Workflow Trigger",
    }
    wf["nodes"].insert(0, trigger_node)

    targets = post_connections_to or ["Filter Messages Only"]
    conns["Execute Workflow Trigger"] = {
        "main": [[{"node": t, "type": "main", "index": 0} for t in targets]]
    }
    wf["connections"] = conns
    print("  ✅ Execute Workflow Trigger'a dönüştürüldü (router uyumlu)")
    return wf


def generate_n8n_workflow(config: dict, clinic_id: str) -> dict:
    if not os.path.exists(TEMPLATE):
        print(f"  ❌ Template bulunamadı: {TEMPLATE}")
        sys.exit(1)

    with open(TEMPLATE, encoding="utf-8") as f:
        wf = json.load(f)

    api_base    = config["api_url"].rstrip("/")
    secret      = config["n8n_secret"]
    cron_hour   = config["cron_hour"]
    model       = config["openai_model"]
    wa_phone_id = str(config["wa_phone_number_id"])

    NGROK_PAT  = re.compile(r"https?://[a-z0-9\-]+\.ngrok(?:-free)?\.(?:dev|app|io)")
    NGROK_QS   = re.compile(r"[&?]ngrok-skip-browser-warning=[^&'\"\s}]*")
    OLD_CID    = re.compile(r'clinicId=[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}')
    NGROK_HDR  = "ngrok-skip-browser-warning"

    wf["name"] = f"KlinikApp — {config['clinic_name']}"
    changes = []

    for node in wf["nodes"]:
        ntype  = node.get("type", "")
        nname  = node.get("name", "")
        params = node.get("parameters", {})

        if ntype == "n8n-nodes-base.whatsApp" and "phoneNumberId" in params:
            params["phoneNumberId"] = wa_phone_id
            changes.append(f"Phone Number ID → {wa_phone_id}: {nname}")

        is_http = ntype == "n8n-nodes-base.httpRequest"
        is_tool = ntype == "@n8n/n8n-nodes-langchain.toolHttpRequest"
        if is_http or is_tool:
            url = params.get("url", "")
            if NGROK_PAT.search(url) or "localhost" in url:
                url = NGROK_PAT.sub(api_base, url)
                url = re.sub(r"https?://localhost:\d+", api_base, url)
                params["url"] = url
                changes.append(f"URL → production: {nname}")
            if NGROK_QS.search(params.get("url", "")):
                params["url"] = NGROK_QS.sub("", params["url"])
                changes.append(f"Stripped ngrok-skip: {nname}")
            if OLD_CID.search(params.get("url", "")):
                params["url"] = OLD_CID.sub(f"clinicId={clinic_id}", params["url"])
                changes.append(f"Clinic ID injected: {nname}")
            for hkey in ("parametersHeaders", "headerParameters"):
                hblock = params.get(hkey, {})
                for vkey in ("values", "parameters"):
                    vals = hblock.get(vkey, [])
                    filtered = [v for v in vals if v.get("name") != NGROK_HDR]
                    if len(filtered) < len(vals):
                        hblock[vkey] = filtered
                        changes.append(f"Removed ngrok header: {nname}")
                    # Update x-n8n-secret header value
                    for v in filtered:
                        if v.get("name") == "x-n8n-secret":
                            v["value"] = secret
                            changes.append(f"x-n8n-secret updated: {nname}")
            opts = params.get("options", {})
            if opts.pop("allowUnauthorizedCerts", None) is not None:
                changes.append(f"Removed allowUnauthorizedCerts: {nname}")
            qblock = params.get("queryParameters", {})
            for vkey in ("values", "parameters"):
                for p in qblock.get(vkey, []):
                    if p.get("name") == "token":
                        p["value"] = secret
                        changes.append(f"Token updated: {nname}")
                    if p.get("name") == "clinicId":
                        p["value"] = clinic_id
                        changes.append(f"Query clinicId injected: {nname}")
            # ── Body params: inject clinicId ─────────────────────────
            for bkey in ("bodyParameters", "parametersBody"):
                bblock = params.get(bkey, {})
                for vkey in ("values", "parameters"):
                    for p in bblock.get(vkey, []):
                        if p.get("name") == "clinicId":
                            p["value"] = clinic_id
                            changes.append(f"Body clinicId injected: {nname}")

        if "scheduleTrigger" in ntype or "CRON" in nname.upper():
            for iv in params.get("rule", {}).get("interval", []):
                if "hour" in iv:
                    iv["hour"] = cron_hour
                    changes.append(f"CRON hour → {cron_hour}: {nname}")

        if "openai" in ntype.lower() or "lmChatOpenAi" in ntype:
            if "model" in params:
                params["model"] = model
                changes.append(f"Model → {model}: {nname}")
            model_val = params.get("model")
            if isinstance(model_val, dict) and model_val.get("__rl"):
                model_val["value"] = model
                changes.append(f"Model rl → {model}: {nname}")

    print(f"  ✅ Workflow yamalandı — {len(changes)} değişiklik")
    for c in changes:
        print(f"     • {c}")

    # Router kurulunca bu satırı aktifleştir:
    # wf = convert_to_execute_workflow_trigger(wf)
    print("  ℹ️  Webhook node'ları korundu (router henüz kurulmadı)")
    return wf


# ─────────────────────────────────────────────────────────────
# REGISTRY
# ─────────────────────────────────────────────────────────────

def save_to_registry(config: dict, clinic_id: str, n8n_workflow_id: str = "PENDING"):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    registry = []
    if os.path.exists(REGISTRY_PATH):
        with open(REGISTRY_PATH, encoding="utf-8") as f:
            try:
                registry = json.load(f)
            except json.JSONDecodeError:
                registry = []

    entry = {
        "clinic_name":        config["clinic_name"],
        "clinic_slug":        config["clinic_slug"],
        "clinic_id":          clinic_id,
        "wa_phone_number_id": str(config["wa_phone_number_id"]),
        "n8n_workflow_id":    n8n_workflow_id,
        "onboarded_at":       datetime.now(timezone.utc).isoformat(),
    }

    updated = False
    for i, r in enumerate(registry):
        if r.get("clinic_slug") == config["clinic_slug"]:
            registry[i] = entry
            updated = True
            break
    if not updated:
        registry.append(entry)

    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(registry, f, ensure_ascii=False, indent=2)
    print(f"  ✅ Registry güncellendi: {REGISTRY_PATH}")


# ─────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────

def print_summary(config: dict, clinic_id: str, sql_path: str, wf_path: str):
    n8n_ui = "https://n8n.themovieecho.com"
    print()
    hr("═")
    print(f"  ✅ Onboarding Tamamlandı: {config['clinic_name']}")
    hr("═")
    print(f"""
  Clinic ID : {clinic_id}
  Slug      : {config["clinic_slug"]}
  WhatsApp  : {config["wa_phone_number_id"]}

  Doktorlar:""")
    for doc in config["doctors"]:
        print(f"    • {doc['first_name']} {doc['last_name']}  |  {doc['email']}")

    print(f"""
  Çıktı dosyaları:
    SQL  → {sql_path}
    JSON → {wf_path}

  Sonraki Adımlar:
    1. SQL'i DB'ye uygula:
         psql $DATABASE_URL < {sql_path}

    2. n8n'e import et:
         {n8n_ui} → Workflows → Import from File → {wf_path}

    3. Workflow'da credential'ları ata:
         WhatsApp nodes → 'KlinikApp WhatsApp'
         OpenAI nodes   → 'KlinikApp OpenAI'
       Kaydet & Aktifleştir.

    4. (Router kurulunca) Router'ı yeniden oluştur:
         python tools/generate_router_workflow.py
""")
    hr("═")


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────

def main():
    # ── AŞAMA 1: Config al ───────────────────────────────────
    config = collect_config()
    slug = config["clinic_slug"].replace("-", "_")

    # ── Config özeti göster ─────────────────────────────────
    print()
    hr("═")
    print("  Config Özeti — Devam edilsin mi?")
    hr("═")
    print(f"  Klinik   : {config['clinic_name']} ({config['clinic_slug']})")
    print(f"  Telefon  : {config['clinic_phone']}")
    print(f"  WA ID    : {config['wa_phone_number_id']}")
    print(f"  API URL  : {config['api_url']}")
    print(f"  Doktor   : {len(config['doctors'])} kişi")
    print(f"  Sekreter : {len(config.get('secretaries', []))} kişi")
    hr()

    if not confirm("Her şey doğru mu? Devam edilsin mi?"):
        print("  ❌ İptal edildi. Script yeniden çalıştırılabilir.")
        sys.exit(0)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # ── AŞAMA 2: Clinic ID üret ──────────────────────────────
    clinic_id = resolve_clinic_id(config)

    # ── AŞAMA 3: JSON workflow oluştur ───────────────────────
    print()
    hr("─")
    print("  Workflow JSON oluşturuluyor...")
    hr("─")
    wf = generate_n8n_workflow(config, clinic_id)
    wf_path = os.path.join(OUTPUT_DIR, f"n8n_workflow_{slug}.json")
    with open(wf_path, "w", encoding="utf-8") as f:
        json.dump(wf, f, ensure_ascii=False, indent=2)
    print(f"  ✅ JSON yazıldı: {wf_path}")

    # ── AŞAMA 4: Seed SQL oluştur ────────────────────────────
    print()
    hr("─")
    override = config.get("clinic_id_override")
    if override:
        print("  ℹ️  clinic_id_override set — SQL atlanıyor (klinik zaten DB'de)")
        sql_path = os.path.join(OUTPUT_DIR, f"seed_{slug}.sql")
    else:
        print("  Seed SQL oluşturuluyor...")
        hr("─")
        sql = build_seed_sql(config, clinic_id)
        sql_path = os.path.join(OUTPUT_DIR, f"seed_{slug}.sql")
        with open(sql_path, "w", encoding="utf-8") as f:
            f.write(sql)
        print(f"  ✅ SQL yazıldı: {sql_path}")

    # ── AŞAMA 5: Meta'ya numara kaydet + WABA subscribe ─────
    print()
    hr("─")
    print("  Meta WhatsApp aktifleştirme...")
    hr("─")
    register_phone_number(config)
    ensure_waba_subscription(config)

    # ── Registry güncelle ────────────────────────────────────
    save_to_registry(config, clinic_id)

    # ── Özet ─────────────────────────────────────────────────
    print_summary(config, clinic_id, sql_path, wf_path)


if __name__ == "__main__":
    main()
