#!/usr/bin/env python3
"""
ABSOLUTE MINIMAL FLASK APP - CANNOT FAIL
Single endpoint, no dependencies beyond Flask
"""

import os
from flask import Flask

# Create Flask app with minimal config
app = Flask(__name__)

@app.route('/')
def home():
    return """
    <!DOCTYPE html>
    <html>
    <head><title>Frontier AI - LIVE</title></head>
    <body style="background:#000;color:#00ff00;font-family:monospace;padding:20px;">
        <h1>🔥 FRONTIER AI IS LIVE! 🔥</h1>
        <p>✅ System Status: OPERATIONAL</p>
        <p>✅ Port: """ + str(os.environ.get('PORT', 'Not Set')) + """</p>
        <p>✅ Environment: """ + str(os.environ.get('RAILWAY_ENVIRONMENT', 'Local')) + """</p>
        <p>🚀 Ultra minimal Flask app working perfectly!</p>
    </body>
    </html>
    """

@app.route('/health')
def health():
    return {"status": "healthy", "port": os.environ.get('PORT', 'unknown')}

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"🚀 Starting on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
