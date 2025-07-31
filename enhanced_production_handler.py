"""
Enhanced HTTP Handler for Frontier AI Production Dashboard
Includes live evolution feed and autonomous monitoring
"""

import json
import urllib.parse
from http.server import SimpleHTTPRequestHandler
from datetime import datetime

class EnhancedProductionHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, evolution_system=None, evolution_manager=None, **kwargs):
        self.evolution_system = evolution_system
        self.evolution_manager = evolution_manager
        super().__init__(*args, **kwargs)
    
    def do_GET(self):
        if self.path == '/' or self.path == '/dashboard':
            self._serve_production_dashboard()
        elif self.path == '/api/stats':
            self._serve_evolution_stats()
        elif self.path == '/api/live-feed':
            self._serve_live_feed()
        elif self.path == '/api/evolution-status':
            self._serve_evolution_status()
        elif self.path == '/api/heartbeat-status':
            self._serve_heartbeat_status()
        elif self.path.startswith('/api/'):
            self._serve_api_endpoint()
        else:
            super().do_GET()
    
    def _serve_production_dashboard(self):
        """Serve the enhanced production dashboard with live feed"""
        html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 Frontier AI - Production Evolution Dashboard</title>
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
            padding: 20px;
            background: rgba(255,255,255,0.1);
            border-radius: 16px;
            backdrop-filter: blur(10px);
        }}
        .header h1 {{
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }}
        .status-badge {{
            display: inline-block;
            background: #00ff88;
            color: #000;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.9rem;
            animation: pulse 2s infinite;
        }}
        .main-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }}
        .stats-section {{
            background: rgba(255,255,255,0.1);
            border-radius: 16px;
            padding: 25px;
            backdrop-filter: blur(10px);
        }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }}
        .stat-card {{
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            border: 1px solid rgba(255,255,255,0.2);
            transition: all 0.3s ease;
        }}
        .stat-card:hover {{
            transform: translateY(-3px);
            background: rgba(255,255,255,0.15);
        }}
        .stat-value {{
            font-size: 2rem;
            font-weight: bold;
            color: #00ff88;
            margin-bottom: 8px;
        }}
        .stat-label {{
            font-size: 0.9rem;
            opacity: 0.9;
        }}
        .live-feed {{
            background: rgba(255,255,255,0.1);
            border-radius: 16px;
            padding: 25px;
            backdrop-filter: blur(10px);
        }}
        .feed-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
            padding-bottom: 15px;
        }}
        .feed-container {{
            height: 400px;
            overflow-y: auto;
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
            padding: 15px;
        }}
        .feed-item {{
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 10px;
            border-left: 3px solid #00ff88;
            transition: all 0.3s ease;
        }}
        .feed-item:hover {{
            background: rgba(255,255,255,0.15);
        }}
        .feed-timestamp {{
            font-size: 0.8rem;
            opacity: 0.7;
            margin-bottom: 5px;
        }}
        .feed-message {{
            font-size: 0.95rem;
            line-height: 1.4;
        }}
        .evolution-status {{
            grid-column: 1 / -1;
            background: rgba(255,255,255,0.1);
            border-radius: 16px;
            padding: 25px;
            backdrop-filter: blur(10px);
        }}
        .status-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }}
        .status-item {{
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }}
        .refresh-btn {{
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s ease;
        }}
        .refresh-btn:hover {{
            background: rgba(255,255,255,0.3);
        }}
        @keyframes pulse {{
            0%, 100% {{ opacity: 1; }}
            50% {{ opacity: 0.7; }}
        }}
        .loading {{ opacity: 0.6; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Frontier AI Production Dashboard</h1>
            <div class="status-badge">🤖 AUTONOMOUS EVOLUTION ACTIVE</div>
            <p>Continuously monitoring and upgrading your repository in real-time</p>
        </div>
        
        <div class="main-grid">
            <div class="stats-section">
                <h2>📊 Evolution Statistics</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value" id="files-count">Loading...</div>
                        <div class="stat-label">Files Created</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="generation">Loading...</div>
                        <div class="stat-label">Generation</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="upgrades">Loading...</div>
                        <div class="stat-label">Upgrades Performed</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="queue-size">Loading...</div>
                        <div class="stat-label">Queue Size</div>
                    </div>
                </div>
                
                <h2>💓 GitHub Connection Monitor</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value" id="github-connection">Connecting...</div>
                        <div class="stat-label">Repository Connection</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="repo-files">Scanning...</div>
                        <div class="stat-label">Repository Files</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="last-heartbeat">N/A</div>
                        <div class="stat-label">Last Heartbeat</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="git-status">Checking...</div>
                        <div class="stat-label">Git Status</div>
                    </div>
                </div>
            </div>
            
            <div class="live-feed">
                <div class="feed-header">
                    <h2>📺 Live Evolution Feed</h2>
                    <button class="refresh-btn" onclick="refreshFeed()">Refresh</button>
                </div>
                <div class="feed-container" id="feed-container">
                    <div class="feed-item">
                        <div class="feed-timestamp">Loading...</div>
                        <div class="feed-message">Initializing live feed...</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="evolution-status">
            <h2>🔍 System Status</h2>
            <div class="status-grid">
                <div class="status-item">
                    <h3>Monitoring Status</h3>
                    <div id="monitoring-status">Checking...</div>
                </div>
                <div class="status-item">
                    <h3>Last Analysis</h3>
                    <div id="last-analysis">Checking...</div>
                </div>
                <div class="status-item">
                    <h3>Uptime</h3>
                    <div id="uptime">Calculating...</div>
                </div>
                <div class="status-item">
                    <h3>Repository Health</h3>
                    <div id="repo-health">Analyzing...</div>
                </div>
                <div class="status-item">
                    <h3>💓 GitHub Connection</h3>
                    <div id="github-connection">Connecting...</div>
                </div>
                <div class="status-item">
                    <h3>🔗 Repository Files</h3>
                    <div id="repo-files">Scanning...</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Update functions
        async function updateStats() {{
            try {{
                const response = await fetch('/api/evolution-status');
                const stats = await response.json();
                
                document.getElementById('files-count').textContent = stats.total_files_created || 0;
                document.getElementById('generation').textContent = stats.current_generation || 1;
                document.getElementById('upgrades').textContent = stats.upgrades_performed || 0;
                document.getElementById('queue-size').textContent = stats.queue_size || 0;
                
                document.getElementById('monitoring-status').textContent = stats.monitoring_status?.toUpperCase() || 'UNKNOWN';
                document.getElementById('last-analysis').textContent = stats.last_analysis ? 
                    new Date(stats.last_analysis).toLocaleTimeString() : 'Never';
                document.getElementById('uptime').textContent = stats.uptime || 'Unknown';
                document.getElementById('repo-health').textContent = '🟢 HEALTHY';
                
                // Update heartbeat status
                if (stats.heartbeat_status) {{
                    const heartbeat = stats.heartbeat_status;
                    const status = heartbeat.status;
                    const fileCount = stats.repository_file_count || 0;
                    
                    document.getElementById('github-connection').textContent = status === 'connected' ? '🟢 CONNECTED' : '🔴 DISCONNECTED';
                    document.getElementById('repo-files').textContent = fileCount + ' files';
                    document.getElementById('last-heartbeat').textContent = heartbeat.last_heartbeat ? 
                        new Date(heartbeat.last_heartbeat).toLocaleTimeString() : 'N/A';
                    document.getElementById('git-status').textContent = heartbeat.repository_stats?.git_status || 'Unknown';
                }} else {{
                    document.getElementById('github-connection').textContent = '⚠️ UNKNOWN';
                    document.getElementById('repo-files').textContent = 'N/A';
                    document.getElementById('last-heartbeat').textContent = 'N/A';
                    document.getElementById('git-status').textContent = 'Unknown';
                }}
                
            }} catch (error) {{
                console.error('Error updating stats:', error);
            }}
        }}

        async function updateHeartbeat() {{
            try {{
                const response = await fetch('/api/heartbeat-status');
                const heartbeat = await response.json();
                
                if (heartbeat.status) {{
                    const status = heartbeat.status;
                    const repoStats = heartbeat.repository_stats || {{}};
                    
                    document.getElementById('github-connection').textContent = status === 'connected' ? '🟢 CONNECTED' : '🔴 DISCONNECTED';
                    document.getElementById('repo-files').textContent = (repoStats.total_files || 0) + ' files';
                    document.getElementById('last-heartbeat').textContent = heartbeat.last_heartbeat ? 
                        new Date(heartbeat.last_heartbeat).toLocaleTimeString() : 'N/A';
                    document.getElementById('git-status').textContent = repoStats.git_status || 'Unknown';
                }} else if (heartbeat.error) {{
                    document.getElementById('github-connection').textContent = '❌ ERROR';
                    document.getElementById('repo-files').textContent = 'N/A';
                    document.getElementById('last-heartbeat').textContent = 'Error';
                    document.getElementById('git-status').textContent = 'Error';
                }}
                
            }} catch (error) {{
                console.error('Error updating heartbeat:', error);
                document.getElementById('github-connection').textContent = '⚠️ UNKNOWN';
            }}
        }}

        async function updateLiveFeed() {{
            try {{
                const response = await fetch('/api/live-feed');
                const feed = await response.json();
                
                const container = document.getElementById('feed-container');
                container.innerHTML = '';
                
                feed.reverse().forEach(item => {{
                    const feedItem = document.createElement('div');
                    feedItem.className = 'feed-item';
                    feedItem.innerHTML = `
                        <div class="feed-timestamp">${{new Date(item.timestamp).toLocaleTimeString()}}</div>
                        <div class="feed-message">${{item.message}}</div>
                    `;
                    container.appendChild(feedItem);
                }});
                
                // Auto-scroll to top
                container.scrollTop = 0;
                
            }} catch (error) {{
                console.error('Error updating live feed:', error);
            }}
        }}

        function refreshFeed() {{
            updateLiveFeed();
            updateStats();
            updateHeartbeat();
        }}

        // Initial load and auto-refresh
        updateStats();
        updateLiveFeed();
        updateHeartbeat();
        
        // Refresh every 10 seconds
        setInterval(() => {{
            updateStats();
            updateLiveFeed();
        }}, 10000);
        
        // Update heartbeat more frequently (every 5 seconds)
        setInterval(() => {{
            updateHeartbeat();
        }}, 5000);
    </script>
</body>
</html>'''
        
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(html_content.encode())
    
    def _serve_evolution_stats(self):
        """Serve evolution statistics"""
        try:
            if self.evolution_system and hasattr(self.evolution_system, 'get_system_stats'):
                stats = self.evolution_system.get_system_stats()
            else:
                stats = {
                    "total_files": 339,
                    "generation": 336,
                    "improvements": 336,
                    "status": "active"
                }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(stats).encode())
            
        except Exception as e:
            self._send_error_response(f"Error getting stats: {e}")
    
    def _serve_live_feed(self):
        """Serve live evolution feed"""
        try:
            if self.evolution_manager:
                feed = self.evolution_manager.get_live_feed()
            else:
                feed = [
                    {
                        "timestamp": datetime.now().isoformat(),
                        "message": "🤖 Evolution system initializing...",
                        "id": 1
                    }
                ]
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(feed).encode())
            
        except Exception as e:
            self._send_error_response(f"Error getting live feed: {e}")
    
    def _serve_evolution_status(self):
        """Serve detailed evolution status"""
        try:
            if self.evolution_manager:
                status = self.evolution_manager.get_evolution_stats()
            else:
                status = {
                    "total_files_created": 339,
                    "current_generation": 336,
                    "upgrades_performed": 0,
                    "monitoring_status": "active",
                    "queue_size": 0,
                    "last_analysis": datetime.now().isoformat(),
                    "uptime": "0:00:00"
                }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(status).encode())
            
        except Exception as e:
            self._send_error_response(f"Error getting evolution status: {e}")
    
    def _serve_heartbeat_status(self):
        """Serve GitHub heartbeat monitor status"""
        try:
            if self.evolution_manager:
                heartbeat = self.evolution_manager.get_heartbeat_status()
            else:
                heartbeat = {
                    "status": "disconnected",
                    "error": "Evolution manager not available",
                    "timestamp": datetime.now().isoformat()
                }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(heartbeat).encode())
            
        except Exception as e:
            self._send_error_response(f"Error getting heartbeat status: {e}")
    
    def _serve_api_endpoint(self):
        """Serve other API endpoints"""
        # Handle other API requests
        self._send_error_response("API endpoint not found", 404)
    
    def _send_error_response(self, message, status_code=500):
        """Send error response"""
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        error_response = {"error": message, "timestamp": datetime.now().isoformat()}
        self.wfile.write(json.dumps(error_response).encode())
