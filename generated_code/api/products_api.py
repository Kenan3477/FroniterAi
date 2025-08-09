"""
Products API Endpoint
Auto-generated functional REST API with CRUD operations
Generated: 2025-08-09T11:38:55.783969
"""

from flask import Flask, request, jsonify, Blueprint
from flask_cors import cross_origin
import logging
import json
from datetime import datetime
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

# Create Blueprint for products
products_bp = Blueprint('products', __name__, url_prefix='/api/products')

class ProductManager:
    """Manages Product data operations"""
    
    def __init__(self):
        self.data_store = []  # In-memory store (replace with database)
        self.next_id = 1
    
    def create_products(self, data: Dict) -> Dict:
        """Create new products record"""
        try:
            record = {
                'id': self.next_id,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                **data
            }
            
            self.data_store.append(record)
            self.next_id += 1
            
            logger.info(f"Created products with ID {record['id']}")
            return record
            
        except Exception as e:
            logger.error(f"Failed to create products: {e}")
            raise
    
    def get_products(self, record_id: int) -> Optional[Dict]:
        """Get products by ID"""
        for record in self.data_store:
            if record['id'] == record_id:
                return record
        return None
    
    def get_all_productss(self, limit: int = 100, offset: int = 0) -> List[Dict]:
        """Get all products records with pagination"""
        start = offset
        end = offset + limit
        return self.data_store[start:end]
    
    def update_products(self, record_id: int, data: Dict) -> Optional[Dict]:
        """Update products record"""
        for i, record in enumerate(self.data_store):
            if record['id'] == record_id:
                self.data_store[i].update(data)
                self.data_store[i]['updated_at'] = datetime.now().isoformat()
                logger.info(f"Updated products ID {record_id}")
                return self.data_store[i]
        return None
    
    def delete_products(self, record_id: int) -> bool:
        """Delete products record"""
        for i, record in enumerate(self.data_store):
            if record['id'] == record_id:
                deleted = self.data_store.pop(i)
                logger.info(f"Deleted products ID {record_id}")
                return True
        return False
    
    def search_productss(self, query: str) -> List[Dict]:
        """Search products records"""
        results = []
        query_lower = query.lower()
        
        for record in self.data_store:
            # Search in all string fields
            for key, value in record.items():
                if isinstance(value, str) and query_lower in value.lower():
                    results.append(record)
                    break
        
        return results
    
    def get_stats(self) -> Dict:
        """Get products statistics"""
        total_count = len(self.data_store)
        
        # Calculate date-based stats
        today = datetime.now().date()
        today_count = sum(
            1 for record in self.data_store 
            if datetime.fromisoformat(record['created_at']).date() == today
        )
        
        return {
            'total_count': total_count,
            'today_count': today_count,
            'last_updated': datetime.now().isoformat()
        }

# Initialize manager
products_manager = ProductManager()


@products_bp.route('', methods=['POST'])
@cross_origin()
def create_products():
    """Create new products"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        result = products_manager.create_products(data)
        return jsonify(result), 201
        
    except Exception as e:
        logger.error(f"Create products error: {e}")
        return jsonify({'error': str(e)}), 500


@products_bp.route('/<int:record_id>', methods=['GET'])
@cross_origin()
def get_products(record_id):
    """Get products by ID"""
    try:
        result = products_manager.get_products(record_id)
        
        if not result:
            return jsonify({'error': 'Products not found'}), 404
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Get products error: {e}")
        return jsonify({'error': str(e)}), 500

@products_bp.route('', methods=['GET'])
@cross_origin()
def get_all_productss():
    """Get all products records"""
    try:
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        search = request.args.get('search', '')
        
        if search:
            results = products_manager.search_productss(search)
        else:
            results = products_manager.get_all_productss(limit, offset)
        
        return jsonify({
            'data': results,
            'total': len(results),
            'limit': limit,
            'offset': offset
        }), 200
        
    except Exception as e:
        logger.error(f"Get all productss error: {e}")
        return jsonify({'error': str(e)}), 500


@products_bp.route('/<int:record_id>', methods=['PUT'])
@cross_origin()
def update_products(record_id):
    """Update products"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        result = products_manager.update_products(record_id, data)
        
        if not result:
            return jsonify({'error': 'Products not found'}), 404
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Update products error: {e}")
        return jsonify({'error': str(e)}), 500


@products_bp.route('/<int:record_id>', methods=['DELETE'])
@cross_origin()
def delete_products(record_id):
    """Delete products"""
    try:
        success = products_manager.delete_products(record_id)
        
        if not success:
            return jsonify({'error': 'Products not found'}), 404
        
        return jsonify({'message': 'Products deleted successfully'}), 200
        
    except Exception as e:
        logger.error(f"Delete products error: {e}")
        return jsonify({'error': str(e)}), 500


@products_bp.route('/stats', methods=['GET'])
@cross_origin()
def get_products_stats():
    """Get products statistics"""
    try:
        stats = products_manager.get_stats()
        return jsonify(stats), 200
        
    except Exception as e:
        logger.error(f"Get products stats error: {e}")
        return jsonify({'error': str(e)}), 500

# Health check endpoint
@products_bp.route('/health', methods=['GET'])
@cross_origin()
def products_health():
    """Health check for products API"""
    return jsonify({
        'status': 'healthy',
        'service': 'products_api',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    }), 200

# Export the blueprint
def get_products_blueprint():
    """Get the products API blueprint"""
    return products_bp

if __name__ == '__main__':
    # For testing the API directly
    app = Flask(__name__)
    app.register_blueprint(products_bp)
    app.run(debug=True, port=5000)
