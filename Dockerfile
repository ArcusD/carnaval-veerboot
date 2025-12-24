# We beginnen met een lichte Python versie
FROM python:3.9-slim

# Werkmap aanmaken
WORKDIR /app

# Kopieer de requirements en installeer ze
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Kopieer de rest van je code (index.html, app.py, etc.)
COPY . .

# Vertel Docker dat poort 5000 open moet
EXPOSE 5000

# Start de app
CMD ["python", "app.py"]