"""
Crm_Data API Endpoint
Auto-generated functional REST API with CRUD operations
Generated: 2025-08-09T11:38:55.788185
"""

from flask import Flask, request, jsonify, Blueprint
from flask_cors import cross_origin
import logging
import json
from datetime import datetime
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

# Create Blueprint for crm_data
crm_data_bp = Blueprint('crm_data', __name__, url_prefix='/api/crm_data')

class CrmDataManager:
    """Manages CrmData data operations"""
    
    def __init__(self):
        self.data_store = []  # In-memory store (replace with database)
        self.next_id = 1
    
    def create_crm_data(self, data: Dict) -> Dict:
        """Create new crm_data record"""
        try:
            record = {
                'id': self.next_id,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                **data
            }
            
            self.data_store.append(record)
            self.next_id += 1
            
            logger.info(f"Created crm_data with ID {record['id']}")
            return record
            
        except Exception as e:
            logger.error(f"Failed to create crm_data: {e}")
            raise
    
    def get_crm_data(self, record_id: int) -> Optional[Dict]:
        """Get crm_data by ID"""
        for record in self.data_store:
            if record['id'] == record_id:
                return record
        return None
    
    def get_all_crm_datas(self, limit: int = 100, offset: int = 0) -> List[Dict]:
        """Get all crm_data records with pagination"""
        start = offset
        end = offset + limit
        return self.data_store[start:end]
    
    def update_crm_data(self, record_id: int, data: Dict) -> Optional[Dict]:
        """Update crm_data record"""
        for i, record in enumerate(self.data_store):
            if record['id'] == record_id:
                self.data_store[i].update(data)
                self.data_store[i]['updated_at'] = datetime.now().isoformat()
                logger.info(f"Updated crm_data ID {record_id}")
                return self.data_store[i]
        return None
    
    def delete_crm_data(self, record_id: int) -> bool:
        """Delete crm_data record"""
        for i, record in enumerate(self.data_store):
            if record['id'] == record_id:
                deleted = self.data_store.pop(i)
                logger.info(f"Deleted crm_data ID {record_id}")
                return True
        return False
    
    def search_crm_datas(self, query: str) -> List[Dict]:
        """Search crm_data records"""
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
        """Get crm_data statistics"""
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
crm_data_manager = CrmDataManager()


@crm_data_bp.route('', methods=['POST'])
@cross_origin()
def create_crm_data():
    """Create new crm_data"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        result = crm_data_manager.create_crm_data(data)
        return jsonify(result), 201
        
    except Exception as e:
        logger.error(f"Create crm_data error: {e}")
        return jsonify({'error': str(e)}), 500


@crm_data_bp.route('/<int:record_id>', methods=['GET'])
@cross_origin()
def get_crm_data(record_id):
    """Get crm_data by ID"""
    try:
        result = crm_data_manager.get_crm_data(record_id)
        
        if not result:
            return jsonify({'error': 'Crm_Data not found'}), 404
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Get crm_data error: {e}")
        return jsonify({'error': str(e)}), 500

@crm_data_bp.route('', methods=['GET'])
@cross_origin()
def get_all_crm_datas():
    """Get all crm_data records"""
    try:
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        search = request.args.get('search', '')
        
        if search:
            results = crm_data_manager.search_crm_datas(search)
        else:
            results = crm_data_manager.get_all_crm_datas(limit, offset)
        
        return jsonify({
            'data': results,
            'total': len(results),
            'limit': limit,
            'offset': offset
        }), 200
        
    except Exception as e:
        logger.error(f"Get all crm_datas error: {e}")
        return jsonify({'error': str(e)}), 500


@crm_data_bp.route('/<int:record_id>', methods=['PUT'])
@cross_origin()
def update_crm_data(record_id):
    """Update crm_data"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        result = crm_data_manager.update_crm_data(record_id, data)
        
        if not result:
            return jsonify({'error': 'Crm_Data not found'}), 404
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Update crm_data error: {e}")
        return jsonify({'error': str(e)}), 500


@crm_data_bp.route('/<int:record_id>', methods=['DELETE'])
@cross_origin()
def delete_crm_data(record_id):
    """Delete crm_data"""
    try:
        success = crm_data_manager.delete_crm_data(record_id)
        
        if not success:
            return jsonify({'error': 'Crm_Data not found'}), 404
        
        return jsonify({'message': 'Crm_Data deleted successfully'}), 200
        
    except Exception as e:
        logger.error(f"Delete crm_data error: {e}")
        return jsonify({'error': str(e)}), 500


@crm_data_bp.route('/stats', methods=['GET'])
@cross_origin()
def get_crm_data_stats():
    """Get crm_data statistics"""
    try:
        stats = crm_data_manager.get_stats()
        return jsonify(stats), 200
        
    except Exception as e:
        logger.error(f"Get crm_data stats error: {e}")
        return jsonify({'error': str(e)}), 500

# Health check endpoint
@crm_data_bp.route('/health', methods=['GET'])
@cross_origin()
def crm_data_health():
    """Health check for crm_data API"""
    return jsonify({
        'status': 'healthy',
        'service': 'crm_data_api',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    }), 200

# Export the blueprint
def get_crm_data_blueprint():
    """Get the crm_data API blueprint"""
    return crm_data_bp

if __name__ == '__main__':
    # For testing the API directly
    app = Flask(__name__)
    app.register_blueprint(crm_data_bp)
    app.run(debug=True, port=5000)
