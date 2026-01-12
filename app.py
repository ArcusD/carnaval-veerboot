from flask import Flask, render_template, jsonify, request
import json
import os
import subprocess
import socket

app = Flask(__name__)
DATA_FILE = 'haltes.json'
CONFIG_FILE = 'config.json'
DEFAULT_CONFIG = {"rotate_ms": 5500}

# --- NIEUW: STATUS VOOR HET BIER ALARM ---
# We bewaren dit gewoon in het geheugen. Bij een reboot is het alarm uit.
systeem_status = {
    "bier_modus": False,
    "bier_haalder": ""
}

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                cfg = json.load(f)
        except Exception:
            cfg = {}
    else:
        cfg = {}

    # defaults aanvulle
    for k, v in DEFAULT_CONFIG.items():
        cfg.setdefault(k, v)
    return cfg

def save_config(cfg):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)


# --- BESTAANDE CODE (Haltes laden/opslaan) ---
def load_haltes():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return ["Start Optocht", "Einde"]

def save_haltes(haltes):
    with open(DATA_FILE, 'w') as f:
        json.dump(haltes, f)

# --- ROUTES ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin')
def admin():
    return render_template('admin.html')

@app.route('/api/haltes', methods=['GET', 'POST'])
def api_haltes():
    if request.method == 'POST':
        haltes = request.json
        save_haltes(haltes)
        return jsonify({"status": "success"})
    return jsonify(load_haltes())

@app.route('/api/config', methods=['GET', 'POST'])
def api_config():
    cfg = load_config()

    if request.method == 'POST':
        data = request.json or {}
        if 'rotate_ms' in data:
            try:
                ms = int(data['rotate_ms'])
                # veilige grenzen: 1s t/m 60s
                if 1000 <= ms <= 60000:
                    cfg['rotate_ms'] = ms
                    save_config(cfg)
            except Exception:
                pass

    return jsonify(cfg)


# --- NIEUW: BIER ROUTES ---

@app.route('/api/bier_status', methods=['GET'])
def get_bier_status():
    # Het scherm vraagt dit elke paar seconden op
    return jsonify(systeem_status)

@app.route('/api/set_bier', methods=['POST'])
def set_bier():
    data = request.json
    systeem_status["bier_modus"] = data.get("actief", False)
    systeem_status["bier_haalder"] = data.get("naam", "")
    return jsonify({"status": "success", "huidige_status": systeem_status})

# --- SYSTEM ROUTES (Update/Reboot/Shutdown/IP) ---

@app.route('/api/update', methods=['POST'])
def git_pull():
    try:
        result = subprocess.check_output(['git', 'pull'], text=True)
        return jsonify({"status": "success", "message": result})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/reboot', methods=['POST'])
def reboot():
    subprocess.Popen(['sudo', 'reboot'])
    return jsonify({"status": "success"})

@app.route('/api/shutdown', methods=['POST'])
def shutdown():
    subprocess.Popen(['sudo', 'poweroff'])
    return jsonify({"status": "success"})

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

@app.route('/api/ip')
def api_ip():
    return jsonify({"ip": get_ip()})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)