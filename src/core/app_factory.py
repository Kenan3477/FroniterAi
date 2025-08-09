"""
FrontierAI Core Application Factory
Creates and configures the main Flask application with all components
"""

from flask import Flask, render_template, request, jsonify
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

def create_app(db_manager=None, evolution_engine=None, config_name='default'):
    """
    Application factory pattern - creates and configures Flask app
    
    Args:
        db_manager: Database manager instance
        evolution_engine: Evolution engine instance  
        config_name: Configuration environment name
        
    Returns:
        Configured Flask application
    """
    app = Flask(__name__)
    
    # Configure app
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
    app.config['DATABASE_PATH'] = os.environ.get('DATABASE_PATH', 'frontier_ai.db')
    
    # Store core components in app context
    app.db_manager = db_manager
    app.evolution_engine = evolution_engine
    
    # Register blueprints
    register_blueprints(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    logger.info("FrontierAI application factory: app created successfully")
    return app

def register_blueprints(app):
    """Register all route blueprints"""
    
    @app.route('/')
    def dashboard():
        """Main dashboard"""
        return render_template('dashboard.html')
    
    @app.route('/api/health')
    def health_check():
        """Health check endpoint"""
        return jsonify({
            "status": "healthy",
            "service": "FrontierAI",
            "version": "1.0.0",
            "database": "connected" if app.db_manager else "not_initialized",
            "evolution": "active" if app.evolution_engine and app.evolution_engine.running else "inactive"
        })
    
    @app.route('/api/evolution/status')
    def evolution_status():
        """Get evolution engine status"""
        if not app.evolution_engine:
            return jsonify({"error": "Evolution engine not initialized"}), 500
        
        return jsonify(app.evolution_engine.get_status())
    
    @app.route('/api/evolution/start', methods=['POST'])
    def start_evolution():
        """Start evolution engine"""
        if not app.evolution_engine:
            return jsonify({"error": "Evolution engine not initialized"}), 500
        
        success = app.evolution_engine.start()
        return jsonify({"success": success})
    
    @app.route('/api/evolution/stop', methods=['POST'])  
    def stop_evolution():
        """Stop evolution engine"""
        if not app.evolution_engine:
            return jsonify({"error": "Evolution engine not initialized"}), 500
        
        app.evolution_engine.stop()
        return jsonify({"success": True})
    
    @app.route('/api/analyze', methods=['POST'])
    def analyze_repository():
        """Analyze a GitHub repository"""
        try:
            from ..analysis.github_analyzer import GitHubAnalyzer
            
            data = request.get_json()
            repo_url = data.get('repository_url')
            
            if not repo_url:
                return jsonify({"error": "Repository URL required"}), 400
            
            analyzer = GitHubAnalyzer(app.db_manager)
            results = analyzer.analyze_repository(repo_url)
            
            return jsonify(results)
            
        except Exception as e:
            logger.error(f"Analysis error: {e}")
            return jsonify({"error": str(e)}), 500

def register_error_handlers(app):
    """Register error handlers"""
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Not found"}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal error: {error}")
        return jsonify({"error": "Internal server error"}), 500
