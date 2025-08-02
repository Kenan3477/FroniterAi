#!/usr/bin/env python3
"""
Market-Integrated Frontier Dashboard
Shows real-time market insights and AI industry trends integrated with evolution system
"""

import asyncio
import json
import time
from datetime import datetime
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import webbrowser
import os

# Import our modules
try:
    from comprehensive_evolution_system import ComprehensiveEvolutionSystem
    from market_analysis import MarketAnalyzer
    MODULES_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Module import error: {e}")
    MODULES_AVAILABLE = False

class MarketDashboardHandler(BaseHTTPRequestHandler):
    """HTTP handler with market analysis integration"""
    
    def __init__(self, *args, evolution_system=None, **kwargs):
        self.evolution_system = evolution_system
        super().__init__(*args, **kwargs)
    
    def do_GET(self):
        """Handle GET requests for the market-integrated dashboard"""
        if self.path == '/':
            self.serve_main_dashboard()
        elif self.path == '/api/stats':
            self.serve_api_stats()
        elif self.path == '/api/market':
            self.serve_market_data()
        else:
            self.send_error(404, "Not Found")
    
    def serve_main_dashboard(self):
        """Serve the market-integrated dashboard"""
        try:
            # Get system stats
            stats = {}
            market_data = {'status': 'unavailable', 'insights': {}}
            
            if self.evolution_system:
                stats = self.evolution_system.get_system_stats()
                market_stats = stats.get('market_analysis', {})
                
                if market_stats.get('status') == 'Available':
                    market_data = {
                        'status': 'available',
                        'insights': {
                            'technologies': market_stats.get('trending_technologies', []),
                            'recommendations': market_stats.get('recommendations', []),
                            'confidence': market_stats.get('confidence_score', 0.0)
                        },
                        'last_analysis': market_stats.get('last_analysis', 'Never'),
                        'market_driven_improvements': market_stats.get('market_driven_improvements', 0)
                    }
            
            html_content = self.generate_market_dashboard_html(stats, market_data)
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(html_content.encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"Dashboard error: {e}")
    
    def serve_api_stats(self):
        """Serve system statistics as JSON"""
        try:
            stats = {}
            if self.evolution_system:
                stats = self.evolution_system.get_system_stats()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(stats).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"API error: {e}")
    
    def serve_market_data(self):
        """Serve market analysis data as JSON"""
        try:
            market_data = {'status': 'unavailable'}
            
            if self.evolution_system:
                stats = self.evolution_system.get_system_stats()
                market_stats = stats.get('market_analysis', {})
                
                if market_stats.get('status') == 'Available':
                    market_data = {
                        'status': 'available',
                        'last_update': datetime.now().isoformat(),
                        'trending_technologies': market_stats.get('trending_technologies', []),
                        'market_confidence': market_stats.get('confidence_score', 0.0),
                        'recommendations': market_stats.get('recommendations', []),
                        'market_driven_improvements': market_stats.get('market_driven_improvements', 0)
                    }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(market_data).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"Market API error: {e}")
    
    def generate_market_dashboard_html(self, stats, market_data):
        """Generate market-integrated dashboard HTML"""
        market_status_class = "available" if market_data.get('status') == 'available' else "unavailable"
        market_status_text = market_data.get('status', 'Unknown').title()
        
        return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔍 Market-Integrated Frontier AI Dashboard</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            color: #ffffff;
            min-height: 100vh;
            overflow-x: hidden;
        }}
        
        .container {{
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }}
        
        .header {{
            text-align: center;
            margin-bottom: 40px;
        }}
        
        .header h1 {{
            font-size: 2.8rem;
            font-weight: 700;
            background: linear-gradient(45deg, #00ff88, #00d4ff, #ff00d4);
            background-size: 300% 300%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: gradientShift 4s ease-in-out infinite;
            margin-bottom: 10px;
        }}
        
        .subtitle {{
            font-size: 1.1rem;
            color: #a0a0ff;
            margin-bottom: 30px;
        }}
        
        .status-bar {{
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }}
        
        .status-item {{
            background: rgba(255, 255, 255, 0.1);
            padding: 12px 20px;
            border-radius: 25px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            display: flex;
            align-items: center;
            gap: 10px;
        }}
        
        .status-dot {{
            width: 10px;
            height: 10px;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }}
        
        .dot-online {{ background-color: #00ff88; }}
        .dot-market-available {{ background-color: #00d4ff; }}
        .dot-market-unavailable {{ background-color: #ff8800; }}
        
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }}
        
        .metric-card {{
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 25px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: all 0.3s ease;
        }}
        
        .metric-card:hover {{
            transform: translateY(-5px);
            box-shadow: 0 15px 30px rgba(0, 212, 255, 0.2);
        }}
        
        .metric-header {{
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 15px;
        }}
        
        .metric-icon {{
            font-size: 1.8rem;
        }}
        
        .metric-title {{
            font-size: 1.1rem;
            font-weight: 600;
            color: #e0e0ff;
        }}
        
        .metric-value {{
            font-size: 2.2rem;
            font-weight: 700;
            color: #00d4ff;
            margin-bottom: 8px;
        }}
        
        .metric-desc {{
            color: #a0a0ff;
            font-size: 0.9rem;
        }}
        
        .market-section {{
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 30px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(0, 212, 255, 0.3);
        }}
        
        .market-header {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 25px;
            flex-wrap: wrap;
            gap: 15px;
        }}
        
        .market-title {{
            font-size: 1.5rem;
            font-weight: 600;
            color: #00d4ff;
        }}
        
        .market-status {{
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
        }}
        
        .status-available {{
            background: rgba(0, 255, 136, 0.2);
            color: #00ff88;
            border: 1px solid #00ff88;
        }}
        
        .status-unavailable {{
            background: rgba(255, 136, 0, 0.2);
            color: #ff8800;
            border: 1px solid #ff8800;
        }}
        
        .market-content {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
        }}
        
        .tech-trends, .recommendations {{
            background: rgba(0, 0, 0, 0.2);
            padding: 20px;
            border-radius: 15px;
        }}
        
        .section-title {{
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 15px;
            color: #00ff88;
        }}
        
        .tech-list {{
            display: flex;
            flex-direction: column;
            gap: 10px;
        }}
        
        .tech-item {{
            background: rgba(0, 212, 255, 0.1);
            padding: 12px 16px;
            border-radius: 8px;
            border-left: 3px solid #00d4ff;
            transition: all 0.3s ease;
        }}
        
        .tech-item:hover {{
            background: rgba(0, 212, 255, 0.2);
            transform: translateX(5px);
        }}
        
        .rec-item {{
            background: rgba(255, 0, 212, 0.1);
            padding: 12px 16px;
            border-radius: 8px;
            border-left: 3px solid #ff00d4;
            margin-bottom: 10px;
            transition: all 0.3s ease;
        }}
        
        .rec-item:hover {{
            background: rgba(255, 0, 212, 0.2);
            transform: translateX(5px);
        }}
        
        .unavailable-content {{
            text-align: center;
            padding: 40px;
            color: #a0a0ff;
        }}
        
        .refresh-btn {{
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(45deg, #00d4ff, #ff00d4);
            border: none;
            border-radius: 50px;
            padding: 15px 25px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 10px 30px rgba(0, 212, 255, 0.3);
        }}
        
        .refresh-btn:hover {{
            transform: scale(1.1);
            box-shadow: 0 15px 40px rgba(0, 212, 255, 0.5);
        }}
        
        @keyframes gradientShift {{
            0%, 100% {{ background-position: 0% 50%; }}
            50% {{ background-position: 100% 50%; }}
        }}
        
        @keyframes pulse {{
            0%, 100% {{ opacity: 1; }}
            50% {{ opacity: 0.6; }}
        }}
        
        @media (max-width: 768px) {{
            .market-content {{
                grid-template-columns: 1fr;
            }}
            
            .metrics-grid {{
                grid-template-columns: 1fr;
            }}
            
            .status-bar {{
                flex-direction: column;
                align-items: center;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Market-Integrated Frontier AI Dashboard</h1>
            <p class="subtitle">Real-time AI Industry Intelligence & Evolution System Monitor</p>
            
            <div class="status-bar">
                <div class="status-item">
                    <div class="status-dot dot-online"></div>
                    <span>System Online</span>
                </div>
                <div class="status-item">
                    <div class="status-dot dot-market-{market_status_class}"></div>
                    <span>Market Analysis: {market_status_text}</span>
                </div>
                <div class="status-item">
                    <div class="status-dot dot-online"></div>
                    <span>Evolution: Active</span>
                </div>
            </div>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-header">
                    <span class="metric-icon">📁</span>
                    <span class="metric-title">Files Created</span>
                </div>
                <div class="metric-value">{stats.get('files_created', 0)}</div>
                <div class="metric-desc">Total files generated</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <span class="metric-icon">🔧</span>
                    <span class="metric-title">Components Built</span>
                </div>
                <div class="metric-value">{stats.get('components_built', 0)}</div>
                <div class="metric-desc">Complete implementations</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <span class="metric-icon">⏱️</span>
                    <span class="metric-title">System Uptime</span>
                </div>
                <div class="metric-value">{stats.get('uptime_hours', 0):.1f}h</div>
                <div class="metric-desc">Operational time</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <span class="metric-icon">📊</span>
                    <span class="metric-title">Market-Driven</span>
                </div>
                <div class="metric-value">{market_data.get('market_driven_improvements', 0)}</div>
                <div class="metric-desc">AI trend-based improvements</div>
            </div>
        </div>
        
        <div class="market-section">
            <div class="market-header">
                <h2 class="market-title">🔍 AI Market Intelligence</h2>
                <span class="market-status status-{market_status_class}">
                    {market_status_text}
                </span>
            </div>
            
            {self.generate_market_content_section(market_data)}
        </div>
    </div>
    
    <button class="refresh-btn" onclick="location.reload()">
        🔄 Refresh
    </button>
    
    <script>
        // Auto-refresh stats every 30 seconds
        setInterval(() => {{
            fetch('/api/stats')
                .then(response => response.json())
                .then(data => {{
                    console.log('📊 Stats updated:', data);
                }})
                .catch(error => console.error('❌ Error:', error));
        }}, 30000);
        
        console.log('🔍 Market-Integrated Dashboard Loaded');
        console.log('📊 Market Status: {market_status_text}');
    </script>
</body>
</html>'''
    
    def generate_market_content_section(self, market_data):
        """Generate the market insights content section"""
        if market_data.get('status') == 'available':
            insights = market_data.get('insights', {})
            technologies = insights.get('technologies', [])
            recommendations = insights.get('recommendations', [])
            confidence = insights.get('confidence', 0.0)
            
            tech_html = ""
            if technologies:
                for tech in technologies[:5]:  # Show top 5
                    tech_html += f'<div class="tech-item">🚀 {tech}</div>'
            else:
                tech_html = '<div class="tech-item">No trending technologies available</div>'
            
            rec_html = ""
            if recommendations:
                for rec in recommendations[:4]:  # Show top 4
                    rec_html += f'<div class="rec-item">💡 {rec}</div>'
            else:
                rec_html = '<div class="rec-item">No recommendations available</div>'
            
            return f'''
            <div class="market-content">
                <div class="tech-trends">
                    <h3 class="section-title">🔥 Trending Technologies</h3>
                    <div class="tech-list">
                        {tech_html}
                    </div>
                    <div style="margin-top: 15px; color: #a0a0ff; font-size: 0.9rem;">
                        Confidence: {confidence*100:.0f}%
                    </div>
                </div>
                
                <div class="recommendations">
                    <h3 class="section-title">🎯 Evolution Recommendations</h3>
                    <div>
                        {rec_html}
                    </div>
                    <div style="margin-top: 15px; color: #a0a0ff; font-size: 0.9rem;">
                        Last Analysis: {market_data.get('last_analysis', 'Never')}
                    </div>
                </div>
            </div>
            '''
        else:
            return '''
            <div class="unavailable-content">
                <h3>⚠️ Market Analysis Unavailable</h3>
                <p>Market analysis module is not available or not configured.</p>
                <p>Install dependencies and configure API access to enable market intelligence.</p>
            </div>
            '''


class MarketIntegratedDashboard:
    """Market-integrated Frontier Dashboard"""
    
    def __init__(self, workspace_path=".", port=8891):
        self.workspace_path = Path(workspace_path)
        self.port = port
        self.evolution_system = None
        self.server = None
        self.server_thread = None
        
        # Initialize evolution system if available
        if MODULES_AVAILABLE:
            try:
                self.evolution_system = ComprehensiveEvolutionSystem(workspace_path)
                print("✅ Evolution system with market analysis initialized")
            except Exception as e:
                print(f"⚠️ Could not initialize evolution system: {e}")
    
    def start(self):
        """Start the market-integrated dashboard server"""
        print("🔍 Starting Market-Integrated Frontier AI Dashboard...")
        
        market_status = "Available" if (self.evolution_system and 
                                      self.evolution_system.market_analyzer) else "Unavailable"
        print(f"📊 Market Analysis: {market_status}")
        
        # Create custom handler
        def create_handler(*args, **kwargs):
            return MarketDashboardHandler(*args, evolution_system=self.evolution_system, **kwargs)
        
        try:
            self.server = HTTPServer(('0.0.0.0', self.port), create_handler)
            self.server_thread = threading.Thread(target=self.server.serve_forever)
            self.server_thread.daemon = True
            self.server_thread.start()
            
            print(f"✅ Market Dashboard running at http://localhost:{self.port}")
            print("🔍 Features:")
            print("  - Real-time system metrics")
            print("  - AI market trend analysis")
            print("  - Evolution recommendations")
            print("  - Market-driven improvements tracking")
            
            # Open browser (only in development)
            if not os.environ.get('RAILWAY_ENVIRONMENT'):
                time.sleep(2)
                webbrowser.open(f'http://localhost:{self.port}')
            
            return True
            
        except Exception as e:
            print(f"❌ Failed to start dashboard: {e}")
            return False
    
    def stop(self):
        """Stop the dashboard server"""
        if self.server:
            self.server.shutdown()
            print("🛑 Market Dashboard stopped")


if __name__ == "__main__":
    # Launch the market-integrated dashboard
    dashboard = MarketIntegratedDashboard()
    
    if dashboard.start():
        try:
            print("\n🔍 Market-Integrated Frontier AI Dashboard is running!")
            print("Press Ctrl+C to stop...")
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Shutting down...")
            dashboard.stop()
    else:
        print("❌ Failed to start Market-Integrated Dashboard")
