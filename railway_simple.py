#!/usr/bin/env python3
"""
RAILWAY SPECIFIC - Minimal Flask for Railway platform
"""

import os

print("STARTING RAILWAY FLASK APP")
print(f"PORT: {os.environ.get('PORT', 'NOT SET')}")

try:
    from flask import Flask
    print("Flask imported OK")
    
    app = Flask(__name__)
    print("Flask app created")
    
    @app.route('/')
    def home():
        return f"<h1>RAILWAY FLASK WORKING</h1><p>Port: {os.environ.get('PORT')}</p>"
    
    print("Route added")
    
    if __name__ == '__main__':
        port = int(os.environ.get('PORT', 8080))
        print(f"Starting on 0.0.0.0:{port}")
        app.run(host='0.0.0.0', port=port)

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
