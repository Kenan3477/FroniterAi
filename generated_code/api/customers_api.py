"""
Customers API Endpoint
Auto-generated functional REST API with CRUD operations
Generated: 2025-08-09T11:48:50.306542
"""

from flask import Flask, request, jsonify, Blueprint
from flask_cors import cross_origin
import logging
import json
from datetime import datetime
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

# Create Blueprint for customers
customers_bp = Blueprint('customers', __name__, url_prefix='/api/customers')

class CustomerManager:
    """Manages Customer data operations"""
    
    def __init__(self):
        self.data_store = []  # In-memory store (replace with database)
        self.next_id = 1
    
    def create_customers(self, data: Dict) -> Dict:
        """Create new customers record"""
        try:
            record = {
                'id': self.next_id,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                **data
            }
            
            self.data_store.append(record)
            self.next_id += 1
            
            logger.info(f"Created customers with ID {record['id']}")
            return record
            
        except Exception as e:
            logger.error(f"Failed to create customers: {e}")
            raise
    
    def get_customers(self, record_id: int) -> Optional[Dict]:
        """Get customers by ID"""
        for record in self.data_store:
            if record['id'] == record_id:
                return record
        return None
    
    def get_all_customerss(self, limit: int = 100, offset: int = 0) -> List[Dict]:
        """Get all customers records with pagination"""
        start = offset
        end = offset + limit
        return self.data_store[start:end]
    
    def update_customers(self, record_id: int, data: Dict) -> Optional[Dict]:
        """Update customers record"""
        for i, record in enumerate(self.data_store):
            if record['id'] == record_id:
                self.data_store[i].update(data)
                self.data_store[i]['updated_at'] = datetime.now().isoformat()
                logger.info(f"Updated customers ID {record_id}")
                return self.data_store[i]
        return None
    
    def delete_customers(self, record_id: int) -> bool:
        """Delete customers record"""
        for i, record in enumerate(self.data_store):
            if record['id'] == record_id:
                deleted = self.data_store.pop(i)
                logger.info(f"Deleted customers ID {record_id}")
                return True
        return False
    
    def search_customerss(self, query: str) -> List[Dict]:
        """Search customers records"""
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
        """Get customers statistics"""
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
customers_manager = CustomerManager()


@customers_bp.route('', methods=['POST'])
@cross_origin()
def create_customers():
    """Create new customers"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        result = customers_manager.create_customers(data)
        return jsonify(result), 201
        
    except Exception as e:
        logger.error(f"Create customers error: {e}")
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<int:record_id>', methods=['GET'])
@cross_origin()
def get_customers(record_id):
    """Get customers by ID"""
    try:
        result = customers_manager.get_customers(record_id)
        
        if not result:
            return jsonify({'error': 'Customers not found'}), 404
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Get customers error: {e}")
        return jsonify({'error': str(e)}), 500

@customers_bp.route('', methods=['GET'])
@cross_origin()
def get_all_customerss():
    """Get all customers records"""
    try:
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        search = request.args.get('search', '')
        
        if search:
            results = customers_manager.search_customerss(search)
        else:
            results = customers_manager.get_all_customerss(limit, offset)
        
        return jsonify({
            'data': results,
            'total': len(results),
            'limit': limit,
            'offset': offset
        }), 200
        
    except Exception as e:
        logger.error(f"Get all customerss error: {e}")
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<int:record_id>', methods=['PUT'])
@cross_origin()
def update_customers(record_id):
    """Update customers"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        result = customers_manager.update_customers(record_id, data)
        
        if not result:
            return jsonify({'error': 'Customers not found'}), 404
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Update customers error: {e}")
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<int:record_id>', methods=['DELETE'])
@cross_origin()
def delete_customers(record_id):
    """Delete customers"""
    try:
        success = customers_manager.delete_customers(record_id)
        
        if not success:
            return jsonify({'error': 'Customers not found'}), 404
        
        return jsonify({'message': 'Customers deleted successfully'}), 200
        
    except Exception as e:
        logger.error(f"Delete customers error: {e}")
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/stats', methods=['GET'])
@cross_origin()
def get_customers_stats():
    """Get customers statistics"""
    try:
        stats = customers_manager.get_stats()
        return jsonify(stats), 200
        
    except Exception as e:
        logger.error(f"Get customers stats error: {e}")
        return jsonify({'error': str(e)}), 500

# Health check endpoint
@customers_bp.route('/health', methods=['GET'])
@cross_origin()
def customers_health():
    """Health check for customers API"""
    return jsonify({
        'status': 'healthy',
        'service': 'customers_api',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    }), 200

# Export the blueprint
def get_customers_blueprint():
    """Get the customers API blueprint"""
    return customers_bp

if __name__ == '__main__':
    # For testing the API directly
    app = Flask(__name__)
    app.register_blueprint(customers_bp)
    app.run(debug=True, port=5000)
