from flask import Flask, render_template, request, jsonify
import json
import os

app = Flask(__name__)

# Bepaal de map waar app.py staat
basedir = os.path.abspath(os.path.dirname(__file__))
# Plak daar de bestandsnaam achteraan
DATA_FILE = os.path.join(basedir, 'haltes.json')

# --- HULP FUNCTIES (Om het bestand te lezen/schrijven) ---

def load_data():
    # Als het bestand niet bestaat, geven we een lege lijst terug
    if not os.path.exists(DATA_FILE):
        return []
    
    # Hier voegen we encoding='utf-8' toe om 'ö' goed te lezen
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError:
        # Als het bestand leeg of kapot is, geven we een lege lijst terug
        return []

def save_data(data):
    # Hier voegen we encoding='utf-8' toe EN ensure_ascii=False
    # ensure_ascii=False zorgt dat hij 'ö' opslaat als 'ö' en niet als code
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

# --- ROUTES (De pagina's) ---

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/admin')
def admin():
    return render_template('admin.html')

# --- API (De achterkant die data stuurt) ---

# 1. Geef de haltes aan de browser
@app.route('/api/haltes', methods=['GET'])
def get_haltes():
    return jsonify(load_data())

# 2. Sla nieuwe haltes op die we ontvangen
@app.route('/api/haltes', methods=['POST'])
def update_haltes():
    nieuwe_lijst = request.json
    save_data(nieuwe_lijst)
    return jsonify({"status": "gelukt"})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)