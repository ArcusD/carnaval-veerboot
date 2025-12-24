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
    with open(DATA_FILE, 'r') as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=4)

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