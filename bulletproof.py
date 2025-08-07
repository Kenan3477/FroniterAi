#!/usr/bin/env python3
"""
BULLETPROOF RAILWAY APP
Maximum logging, error handling, guaranteed startup
"""

import os
import sys
import traceback
from datetime import datetime

def log(message):
    """Log with timestamp"""
    timestamp = datetime.now().strftime('%H:%M:%S')
    print(f"[{timestamp}] {message}")
    sys.stdout.flush()

def main():
    """Main application with comprehensive error handling"""
    log("🚀 BULLETPROOF APP STARTING")
    log(f"Python version: {sys.version}")
    log(f"Working directory: {os.getcwd()}")
    log(f"PORT environment: {os.environ.get('PORT', 'NOT SET')}")
    
    try:
        log("📦 Importing Flask...")
        from flask import Flask
        log("✅ Flask imported successfully")
        
        log("🔧 Creating Flask app...")
        app = Flask(__name__)
        log("✅ Flask app created")
        
        @app.route('/')
        def home():
            return """
            <html>
            <body style="background:#000;color:#00ff00;font-family:monospace;padding:20px;">
                <h1>🔥 BULLETPROOF RAILWAY APP IS LIVE! 🔥</h1>
                <p>✅ Flask is working</p>
                <p>✅ Routes are responding</p>
                <p>✅ Environment: """ + str(os.environ.get('RAILWAY_ENVIRONMENT', 'Unknown')) + """</p>
                <p>✅ Port: """ + str(os.environ.get('PORT', 'Unknown')) + """</p>
                <p>🎯 This proves Railway deployment is working!</p>
            </body>
            </html>
            """
        
        @app.route('/health')
        def health():
            return {"status": "healthy", "app": "bulletproof"}
        
        log("✅ Routes registered")
        
        # Get port with fallback
        port = int(os.environ.get('PORT', 5000))
        log(f"🌐 Starting server on port {port}")
        
        # Start the app
        app.run(
            host='0.0.0.0',
            port=port,
            debug=False,
            use_reloader=False,
            threaded=True
        )
        
    except Exception as e:
        log(f"💥 ERROR: {type(e).__name__}: {e}")
        log(f"📍 Traceback: {traceback.format_exc()}")
        sys.exit(1)

if __name__ == '__main__':
    main()
