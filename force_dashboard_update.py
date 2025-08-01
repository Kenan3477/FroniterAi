#!/usr/bin/env python3
"""
Force Railway Dashboard Update
Force the new dashboard with heartbeat monitoring to load
"""

import subprocess
import sys
from datetime import datetime

def force_dashboard_update():
    """Force Railway to serve the new dashboard"""
    print("🔄 FORCING RAILWAY DASHBOARD UPDATE")
    print("=" * 40)
    
    # Create a timestamp to force cache busting
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    print("🎯 Creating cache-busting update...")
    
    # Update the enhanced_production_handler to force reload
    handler_update = f'''
    def _serve_production_dashboard(self):
        """Serve the enhanced production dashboard with live feed"""
        # Cache buster: {timestamp}
        html_content = f\'\'\'<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 Frontier AI - Production Evolution Dashboard</title>
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            min-height: 100vh;
            padding: 20px;
        }}
        .container {{
            max-width: 1400px;
            margin: 0 auto;
        }}
        .header {{
            text-align: center;
            margin-bottom: 30px;
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        .stat-card {{
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }}
        .heartbeat-monitor {{
            background: rgba(220,38,127,0.2);
            border: 2px solid #dc267f;
        }}
        .heartbeat-status {{
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0;
        }}
        .live-indicator {{
            display: inline-block;
            width: 12px;
            height: 12px;
            background: #00ff00;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }}
        @keyframes pulse {{
            0% {{ opacity: 1; }}
            50% {{ opacity: 0.5; }}
            100% {{ opacity: 1; }}
        }}
        .evolution-feed {{
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 20px;
            max-height: 300px;
            overflow-y: auto;
        }}
        .feed-item {{
            padding: 10px;
            margin: 5px 0;
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
            border-left: 4px solid #00ff00;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Frontier AI Evolution Dashboard</h1>
            <p>🤖 Autonomous Evolution System - Live Monitoring</p>
            <p>🕐 Last Updated: {timestamp}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card heartbeat-monitor">
                <h2>💓 GitHub Connection Monitor</h2>
                <div class="heartbeat-status">
                    <span class="live-indicator"></span>
                    <span id="connection-status">Connecting...</span>
                </div>
                <div id="repo-stats">
                    <p>📁 Repository Files: <span id="file-count">Loading...</span></p>
                    <p>🐍 Python Files: <span id="python-count">Loading...</span></p>
                    <p>🔗 Repository: github.com/Kenan3477/FroniterAi</p>
                </div>
            </div>
            
            <div class="stat-card">
                <h2>📊 Evolution Stats</h2>
                <div id="evolution-stats">
                    <p>🔄 Generation: <span id="generation">Loading...</span></p>
                    <p>📈 Improvements: <span id="improvements">Loading...</span></p>
                    <p>⚡ Status: <span id="evolution-status">Active</span></p>
                </div>
            </div>
            
            <div class="stat-card">
                <h2>🎯 Implementation Opportunities</h2>
                <div id="opportunities">
                    <p>💡 Detected: <span id="opportunity-count">Scanning...</span></p>
                    <p>🚀 Priority: <span id="priority-items">Analyzing...</span></p>
                </div>
            </div>
        </div>
        
        <div class="evolution-feed">
            <h2>📺 Live Evolution Feed</h2>
            <div id="live-feed">
                <div class="feed-item">🚀 System initialized with GitHub monitoring</div>
                <div class="feed-item">💓 Heartbeat monitoring active</div>
                <div class="feed-item">🔍 Scanning repository for opportunities...</div>
            </div>
        </div>
    </div>
    
    <script>
        // Update heartbeat status
        function updateHeartbeat() {{
            fetch('/api/heartbeat-status')
                .then(response => response.json())
                .then(data => {{
                    document.getElementById('connection-status').textContent = 
                        data.status === 'connected' ? 'Connected' : 
                        data.status === 'initializing' ? 'Initializing...' : 'Disconnected';
                    
                    const stats = data.repository_stats || {{}};
                    document.getElementById('file-count').textContent = stats.total_files || 0;
                    document.getElementById('python-count').textContent = stats.python_files || 0;
                }})
                .catch(err => {{
                    document.getElementById('connection-status').textContent = 'Error';
                    console.error('Heartbeat error:', err);
                }});
        }}
        
        // Update evolution stats
        function updateEvolution() {{
            fetch('/api/evolution-status')
                .then(response => response.json())
                .then(data => {{
                    document.getElementById('generation').textContent = data.current_generation || 0;
                    document.getElementById('improvements').textContent = data.upgrades_performed || 0;
                }})
                .catch(err => console.error('Evolution error:', err));
        }}
        
        // Update live feed
        function updateFeed() {{
            fetch('/api/live-feed')
                .then(response => response.json())
                .then(data => {{
                    const feedContainer = document.getElementById('live-feed');
                    if (data && data.length > 0) {{
                        feedContainer.innerHTML = data.map(item => 
                            `<div class="feed-item">${{item.message}}</div>`
                        ).join('');
                    }}
                }})
                .catch(err => console.error('Feed error:', err));
        }}
        
        // Initialize
        updateHeartbeat();
        updateEvolution();
        updateFeed();
        
        // Update every 5 seconds
        setInterval(() => {{
            updateHeartbeat();
            updateEvolution();
            updateFeed();
        }}, 5000);
    </script>
</body>
</html>\'\'\'
        
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache') 
        self.send_header('Expires', '0')
        self.end_headers()
        self.wfile.write(html_content.encode())
    '''
    
    print("📝 The issue is that Railway is serving cached content.")
    print("🎯 Solutions:")
    print()
    print("1. 🌐 **Try Different URLs**:")
    print("   - https://web-production-3ef05.up.railway.app/dashboard")
    print("   - https://web-production-3ef05.up.railway.app/ (with slash)")
    print()
    print("2. 💓 **Test Heartbeat API Directly**:")
    print("   - https://web-production-3ef05.up.railway.app/api/heartbeat-status")
    print("   - Should return JSON with GitHub data")
    print()
    print("3. 🔄 **Force Browser Refresh**:")
    print("   - Press Ctrl+Shift+R (hard refresh)")
    print("   - Clear all browser cache")
    print("   - Try incognito/private window")
    print()
    print("4. ⚡ **Railway Console Commands**:")
    print("   - Go to Railway dashboard")
    print("   - Find 'Restart' button in deployments")
    print("   - Force restart the service")
    print()
    print("5. 🆕 **Alternative**: Create New Railway Service")
    print("   - Deploy fresh from GitHub")
    print("   - Set GITHUB_TOKEN variable")
    print("   - Get new clean URL")

if __name__ == "__main__":
    force_dashboard_update()
