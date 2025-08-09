"""
REAL Autonomous Code Generator
Generates actual functional code files with specific purposes and working implementations
"""

import os
import logging
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
import inspect
import ast

logger = logging.getLogger(__name__)

class FunctionalCodeGenerator:
    """
    Generates real, working code files with specific functions and purposes
    """
    
    def __init__(self, output_dir: str = "generated_code"):
        self.output_dir = output_dir
        self.generated_files = {}
        self.templates = {}
        self.ensure_output_directory()
        self.load_code_templates()
    
    def ensure_output_directory(self):
        """Create output directory structure"""
        directories = [
            self.output_dir,
            f"{self.output_dir}/api",
            f"{self.output_dir}/database",
            f"{self.output_dir}/utils",
            f"{self.output_dir}/analytics",
            f"{self.output_dir}/integrations",
            f"{self.output_dir}/scrapers",
            f"{self.output_dir}/processors"
        ]
        
        for dir_path in directories:
            os.makedirs(dir_path, exist_ok=True)
            
        logger.info(f"Code generation directory structure created: {self.output_dir}")
    
    def load_code_templates(self):
        """Load code templates for different functionalities"""
        self.templates = {
            'api_endpoint': self.get_api_endpoint_template(),
            'database_model': self.get_database_model_template(),
            'scraper_class': self.get_scraper_class_template(),
            'data_processor': self.get_data_processor_template(),
            'analytics_module': self.get_analytics_module_template(),
            'integration_client': self.get_integration_client_template(),
            'utility_functions': self.get_utility_functions_template(),
            'config_manager': self.get_config_manager_template()
        }
    
    def generate_api_endpoint(self, endpoint_name: str, data_model: str, operations: List[str]) -> str:
        """Generate a functional REST API endpoint"""
        filename = f"api/{endpoint_name}_api.py"
        
        code = f'''"""
{endpoint_name.title()} API Endpoint
Auto-generated functional REST API with CRUD operations
Generated: {datetime.now().isoformat()}
"""

from flask import Flask, request, jsonify, Blueprint
from flask_cors import cross_origin
import logging
import json
from datetime import datetime
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

# Create Blueprint for {endpoint_name}
{endpoint_name}_bp = Blueprint('{endpoint_name}', __name__, url_prefix='/api/{endpoint_name}')

class {data_model}Manager:
    """Manages {data_model} data operations"""
    
    def __init__(self):
        self.data_store = []  # In-memory store (replace with database)
        self.next_id = 1
    
    def create_{endpoint_name}(self, data: Dict) -> Dict:
        """Create new {endpoint_name} record"""
        try:
            record = {{
                'id': self.next_id,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                **data
            }}
            
            self.data_store.append(record)
            self.next_id += 1
            
            logger.info(f"Created {endpoint_name} with ID {{record['id']}}")
            return record
            
        except Exception as e:
            logger.error(f"Failed to create {endpoint_name}: {{e}}")
            raise
    
    def get_{endpoint_name}(self, record_id: int) -> Optional[Dict]:
        """Get {endpoint_name} by ID"""
        for record in self.data_store:
            if record['id'] == record_id:
                return record
        return None
    
    def get_all_{endpoint_name}s(self, limit: int = 100, offset: int = 0) -> List[Dict]:
        """Get all {endpoint_name} records with pagination"""
        start = offset
        end = offset + limit
        return self.data_store[start:end]
    
    def update_{endpoint_name}(self, record_id: int, data: Dict) -> Optional[Dict]:
        """Update {endpoint_name} record"""
        for i, record in enumerate(self.data_store):
            if record['id'] == record_id:
                self.data_store[i].update(data)
                self.data_store[i]['updated_at'] = datetime.now().isoformat()
                logger.info(f"Updated {endpoint_name} ID {{record_id}}")
                return self.data_store[i]
        return None
    
    def delete_{endpoint_name}(self, record_id: int) -> bool:
        """Delete {endpoint_name} record"""
        for i, record in enumerate(self.data_store):
            if record['id'] == record_id:
                deleted = self.data_store.pop(i)
                logger.info(f"Deleted {endpoint_name} ID {{record_id}}")
                return True
        return False
    
    def search_{endpoint_name}s(self, query: str) -> List[Dict]:
        """Search {endpoint_name} records"""
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
        """Get {endpoint_name} statistics"""
        total_count = len(self.data_store)
        
        # Calculate date-based stats
        today = datetime.now().date()
        today_count = sum(
            1 for record in self.data_store 
            if datetime.fromisoformat(record['created_at']).date() == today
        )
        
        return {{
            'total_count': total_count,
            'today_count': today_count,
            'last_updated': datetime.now().isoformat()
        }}

# Initialize manager
{endpoint_name}_manager = {data_model}Manager()

'''

        # Add route definitions based on requested operations
        if 'create' in operations:
            code += f'''
@{endpoint_name}_bp.route('', methods=['POST'])
@cross_origin()
def create_{endpoint_name}():
    """Create new {endpoint_name}"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({{'error': 'No data provided'}}), 400
        
        result = {endpoint_name}_manager.create_{endpoint_name}(data)
        return jsonify(result), 201
        
    except Exception as e:
        logger.error(f"Create {endpoint_name} error: {{e}}")
        return jsonify({{'error': str(e)}}), 500

'''

        if 'read' in operations:
            code += f'''
@{endpoint_name}_bp.route('/<int:record_id>', methods=['GET'])
@cross_origin()
def get_{endpoint_name}(record_id):
    """Get {endpoint_name} by ID"""
    try:
        result = {endpoint_name}_manager.get_{endpoint_name}(record_id)
        
        if not result:
            return jsonify({{'error': '{endpoint_name.title()} not found'}}), 404
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Get {endpoint_name} error: {{e}}")
        return jsonify({{'error': str(e)}}), 500

@{endpoint_name}_bp.route('', methods=['GET'])
@cross_origin()
def get_all_{endpoint_name}s():
    """Get all {endpoint_name} records"""
    try:
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        search = request.args.get('search', '')
        
        if search:
            results = {endpoint_name}_manager.search_{endpoint_name}s(search)
        else:
            results = {endpoint_name}_manager.get_all_{endpoint_name}s(limit, offset)
        
        return jsonify({{
            'data': results,
            'total': len(results),
            'limit': limit,
            'offset': offset
        }}), 200
        
    except Exception as e:
        logger.error(f"Get all {endpoint_name}s error: {{e}}")
        return jsonify({{'error': str(e)}}), 500

'''

        if 'update' in operations:
            code += f'''
@{endpoint_name}_bp.route('/<int:record_id>', methods=['PUT'])
@cross_origin()
def update_{endpoint_name}(record_id):
    """Update {endpoint_name}"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({{'error': 'No data provided'}}), 400
        
        result = {endpoint_name}_manager.update_{endpoint_name}(record_id, data)
        
        if not result:
            return jsonify({{'error': '{endpoint_name.title()} not found'}}), 404
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Update {endpoint_name} error: {{e}}")
        return jsonify({{'error': str(e)}}), 500

'''

        if 'delete' in operations:
            code += f'''
@{endpoint_name}_bp.route('/<int:record_id>', methods=['DELETE'])
@cross_origin()
def delete_{endpoint_name}(record_id):
    """Delete {endpoint_name}"""
    try:
        success = {endpoint_name}_manager.delete_{endpoint_name}(record_id)
        
        if not success:
            return jsonify({{'error': '{endpoint_name.title()} not found'}}), 404
        
        return jsonify({{'message': '{endpoint_name.title()} deleted successfully'}}), 200
        
    except Exception as e:
        logger.error(f"Delete {endpoint_name} error: {{e}}")
        return jsonify({{'error': str(e)}}), 500

'''

        # Add stats endpoint
        code += f'''
@{endpoint_name}_bp.route('/stats', methods=['GET'])
@cross_origin()
def get_{endpoint_name}_stats():
    """Get {endpoint_name} statistics"""
    try:
        stats = {endpoint_name}_manager.get_stats()
        return jsonify(stats), 200
        
    except Exception as e:
        logger.error(f"Get {endpoint_name} stats error: {{e}}")
        return jsonify({{'error': str(e)}}), 500

# Health check endpoint
@{endpoint_name}_bp.route('/health', methods=['GET'])
@cross_origin()
def {endpoint_name}_health():
    """Health check for {endpoint_name} API"""
    return jsonify({{
        'status': 'healthy',
        'service': '{endpoint_name}_api',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    }}), 200

# Export the blueprint
def get_{endpoint_name}_blueprint():
    """Get the {endpoint_name} API blueprint"""
    return {endpoint_name}_bp

if __name__ == '__main__':
    # For testing the API directly
    app = Flask(__name__)
    app.register_blueprint({endpoint_name}_bp)
    app.run(debug=True, port=5000)
'''

        self.save_generated_file(filename, code)
        return filename
    
    def generate_scraper_class(self, target_name: str, target_url: str, data_fields: List[str]) -> str:
        """Generate a functional web scraper class"""
        filename = f"scrapers/{target_name.lower()}_scraper.py"
        
        code = f'''"""
{target_name} Web Scraper
Auto-generated web scraper for extracting data from {target_url}
Generated: {datetime.now().isoformat()}
"""

import requests
import json
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from bs4 import BeautifulSoup
import re
import csv
import os

logger = logging.getLogger(__name__)

class {target_name.title()}Scraper:
    """
    Functional web scraper for {target_name}
    Extracts: {', '.join(data_fields)}
    """
    
    def __init__(self, base_url: str = "{target_url}", rate_limit: float = 1.0):
        self.base_url = base_url
        self.rate_limit = rate_limit  # Seconds between requests
        self.session = requests.Session()
        self.session.headers.update({{
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }})
        self.scraped_data = []
        self.last_request_time = 0
        
        logger.info(f"Initialized {target_name} scraper for {{self.base_url}}")
    
    def _respect_rate_limit(self):
        """Ensure rate limiting between requests"""
        time_since_last = time.time() - self.last_request_time
        if time_since_last < self.rate_limit:
            time.sleep(self.rate_limit - time_since_last)
        self.last_request_time = time.time()
    
    def _make_request(self, url: str, method: str = 'GET', **kwargs) -> Optional[requests.Response]:
        """Make HTTP request with rate limiting and error handling"""
        try:
            self._respect_rate_limit()
            
            response = self.session.request(method, url, timeout=30, **kwargs)
            response.raise_for_status()
            
            logger.debug(f"Successfully fetched {{url}}")
            return response
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed for {{url}}: {{e}}")
            return None
    
    def _parse_page(self, response: requests.Response) -> Dict:
        """Parse a single page and extract data"""
        try:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract data based on specified fields
            extracted_data = {{
                'url': response.url,
                'scraped_at': datetime.now().isoformat(),
                'status_code': response.status_code
            }}
            
'''

        # Generate extraction logic for each field
        for field in data_fields:
            code += f'''
            # Extract {field}
            {field}_value = self._extract_{field.lower().replace(' ', '_')}(soup)
            if {field}_value:
                extracted_data['{field.lower().replace(' ', '_')}'] = {field}_value
'''

        code += f'''
            
            logger.debug(f"Extracted data: {{extracted_data}}")
            return extracted_data
            
        except Exception as e:
            logger.error(f"Failed to parse page {{response.url}}: {{e}}")
            return {{'error': str(e), 'url': response.url}}
    
'''

        # Generate extraction methods for each field
        for field in data_fields:
            method_name = field.lower().replace(' ', '_')
            code += f'''
    def _extract_{method_name}(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract {field} from the page"""
        try:
            # Generic extraction logic - customize as needed
            
            # Try common selectors for {field}
            selectors = [
                'h1',  # Main heading
                '.{method_name}',  # Class name
                '#{method_name}',  # ID
                '[data-{method_name}]',  # Data attribute
                'meta[name="{method_name}"]',  # Meta tag
                'meta[property="og:{method_name}"]'  # Open Graph
            ]
            
            for selector in selectors:
                element = soup.select_one(selector)
                if element:
                    if element.name == 'meta':
                        return element.get('content', '').strip()
                    else:
                        return element.get_text().strip()
            
            # Fallback: search for text patterns
            text_content = soup.get_text()
            
            # Look for common patterns
            if '{field.lower()}' in text_content.lower():
                # Extract surrounding text
                pattern = rf'\\b{field.lower()}\\b[:\\s]+([^\\n\\r{{50}}]*)'
                match = re.search(pattern, text_content, re.IGNORECASE)
                if match:
                    return match.group(1).strip()
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to extract {field}: {{e}}")
            return None
    
'''

        # Add main scraping methods
        code += f'''
    def scrape_single_page(self, url: str = None) -> Dict:
        """Scrape a single page"""
        url = url or self.base_url
        
        logger.info(f"Scraping single page: {{url}}")
        
        response = self._make_request(url)
        if not response:
            return {{'error': 'Failed to fetch page', 'url': url}}
        
        data = self._parse_page(response)
        self.scraped_data.append(data)
        
        return data
    
    def scrape_multiple_pages(self, urls: List[str]) -> List[Dict]:
        """Scrape multiple pages"""
        logger.info(f"Scraping {{len(urls)}} pages")
        
        results = []
        for i, url in enumerate(urls):
            logger.info(f"Scraping page {{i+1}}/{{len(urls)}}: {{url}}")
            
            data = self.scrape_single_page(url)
            results.append(data)
            
            # Progress logging
            if (i + 1) % 10 == 0:
                logger.info(f"Completed {{i+1}}/{{len(urls)}} pages")
        
        return results
    
    def discover_pages(self, start_url: str = None, max_pages: int = 50) -> List[str]:
        """Discover pages to scrape by following links"""
        start_url = start_url or self.base_url
        discovered_urls = set([start_url])
        to_visit = [start_url]
        visited = set()
        
        logger.info(f"Discovering pages starting from {{start_url}}")
        
        while to_visit and len(discovered_urls) < max_pages:
            current_url = to_visit.pop(0)
            
            if current_url in visited:
                continue
            
            visited.add(current_url)
            
            response = self._make_request(current_url)
            if not response:
                continue
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find links on the page
            links = soup.find_all('a', href=True)
            for link in links:
                href = link['href']
                
                # Convert relative URLs to absolute
                if href.startswith('/'):
                    full_url = self.base_url.rstrip('/') + href
                elif href.startswith('http'):
                    full_url = href
                else:
                    continue
                
                # Only include URLs from the same domain
                if self.base_url in full_url and full_url not in discovered_urls:
                    discovered_urls.add(full_url)
                    to_visit.append(full_url)
        
        logger.info(f"Discovered {{len(discovered_urls)}} pages")
        return list(discovered_urls)
    
    def save_data(self, filename: str, format: str = 'json'):
        """Save scraped data to file"""
        if not self.scraped_data:
            logger.warning("No data to save")
            return
        
        os.makedirs(os.path.dirname(filename) if os.path.dirname(filename) else '.', exist_ok=True)
        
        if format.lower() == 'json':
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.scraped_data, f, indent=2, ensure_ascii=False)
        
        elif format.lower() == 'csv':
            if self.scraped_data:
                # Get all unique keys from all records
                all_keys = set()
                for item in self.scraped_data:
                    all_keys.update(item.keys())
                
                with open(filename, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.DictWriter(f, fieldnames=list(all_keys))
                    writer.writeheader()
                    writer.writerows(self.scraped_data)
        
        logger.info(f"Saved {{len(self.scraped_data)}} records to {{filename}}")
    
    def get_statistics(self) -> Dict:
        """Get scraping statistics"""
        total_records = len(self.scraped_data)
        successful_records = len([d for d in self.scraped_data if 'error' not in d])
        error_records = total_records - successful_records
        
        return {{
            'total_records': total_records,
            'successful_records': successful_records,
            'error_records': error_records,
            'success_rate': (successful_records / total_records * 100) if total_records > 0 else 0,
            'fields_extracted': {data_fields},
            'last_scraped': self.scraped_data[-1]['scraped_at'] if self.scraped_data else None
        }}
    
    def clear_data(self):
        """Clear scraped data"""
        self.scraped_data = []
        logger.info("Cleared scraped data")

def run_{target_name.lower()}_scraper():
    """Example usage of the {target_name} scraper"""
    scraper = {target_name.title()}Scraper()
    
    print(f"🕷️  Starting {target_name} scraper...")
    
    # Scrape the main page
    result = scraper.scrape_single_page()
    print(f"✅ Scraped main page: {{result}}")
    
    # Discover additional pages
    pages = scraper.discover_pages(max_pages=10)
    print(f"🔍 Discovered {{len(pages)}} pages")
    
    # Scrape multiple pages
    if len(pages) > 1:
        results = scraper.scrape_multiple_pages(pages[:5])  # Limit to 5 pages
        print(f"✅ Scraped {{len(results)}} pages")
    
    # Save results
    scraper.save_data(f'{target_name.lower()}_data.json', 'json')
    scraper.save_data(f'{target_name.lower()}_data.csv', 'csv')
    
    # Print statistics
    stats = scraper.get_statistics()
    print(f"📊 Scraping Statistics:")
    for key, value in stats.items():
        print(f"  {{key}}: {{value}}")
    
    return scraper

if __name__ == "__main__":
    # Run the scraper
    scraper = run_{target_name.lower()}_scraper()
'''

        self.save_generated_file(filename, code)
        return filename
    
    def generate_data_processor(self, processor_name: str, input_format: str, output_format: str, transformations: List[str]) -> str:
        """Generate a data processing module"""
        filename = f"processors/{processor_name.lower()}_processor.py"
        
        code = f'''"""
{processor_name} Data Processor
Auto-generated data processor for transforming {input_format} to {output_format}
Transformations: {', '.join(transformations)}
Generated: {datetime.now().isoformat()}
"""

import json
import csv
import pandas as pd
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union
import re
import os
from pathlib import Path

logger = logging.getLogger(__name__)

class {processor_name.title()}Processor:
    """
    Processes data from {input_format} format to {output_format} format
    Applies transformations: {', '.join(transformations)}
    """
    
    def __init__(self, input_dir: str = "input", output_dir: str = "output"):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.processed_data = []
        self.processing_stats = {{
            'total_processed': 0,
            'successful_transformations': 0,
            'failed_transformations': 0,
            'start_time': None,
            'end_time': None
        }}
        
        # Create directories
        self.input_dir.mkdir(exist_ok=True)
        self.output_dir.mkdir(exist_ok=True)
        
        logger.info(f"Initialized {processor_name} processor")
    
    def load_data(self, file_path: str) -> List[Dict]:
        """Load data from {input_format} file"""
        try:
            file_path = Path(file_path)
            
            if not file_path.exists():
                raise FileNotFoundError(f"Input file not found: {{file_path}}")
            
            logger.info(f"Loading data from {{file_path}}")
            
'''
        
        # Add input format specific loading
        if input_format.lower() == 'json':
            code += '''
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Ensure data is a list
            if isinstance(data, dict):
                data = [data]
            elif not isinstance(data, list):
                raise ValueError("JSON data must be a list or dict")
'''
        elif input_format.lower() == 'csv':
            code += '''
            data = []
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                data = list(reader)
'''
        
        code += f'''
            
            logger.info(f"Loaded {{len(data)}} records from {{file_path}}")
            return data
            
        except Exception as e:
            logger.error(f"Failed to load data from {{file_path}}: {{e}}")
            raise
    
    def process_single_record(self, record: Dict) -> Dict:
        """Process a single data record"""
        try:
            processed_record = record.copy()
            processed_record['processing_timestamp'] = datetime.now().isoformat()
            processed_record['original_record'] = record.copy()
            
'''

        # Add transformation logic for each specified transformation
        for transformation in transformations:
            trans_name = transformation.lower().replace(' ', '_')
            code += f'''
            # Apply {transformation}
            processed_record = self._apply_{trans_name}(processed_record)
'''

        code += f'''
            
            # Remove original record from output to save space
            if 'original_record' in processed_record:
                del processed_record['original_record']
            
            self.processing_stats['successful_transformations'] += 1
            return processed_record
            
        except Exception as e:
            logger.error(f"Failed to process record: {{e}}")
            self.processing_stats['failed_transformations'] += 1
            return {{
                'error': str(e),
                'original_record': record,
                'processing_timestamp': datetime.now().isoformat()
            }}
    
'''

        # Generate transformation methods
        for transformation in transformations:
            trans_name = transformation.lower().replace(' ', '_')
            code += f'''
    def _apply_{trans_name}(self, record: Dict) -> Dict:
        """Apply {transformation} transformation"""
        try:
'''
            
            # Add specific transformation logic based on type
            if 'clean' in transformation.lower():
                code += '''
            # Data cleaning transformation
            for key, value in record.items():
                if isinstance(value, str):
                    # Remove extra whitespace
                    record[key] = value.strip()
                    
                    # Remove special characters if needed
                    record[key] = re.sub(r'[^\\w\\s-]', '', record[key])
                    
                    # Convert empty strings to None
                    if record[key] == '':
                        record[key] = None
'''
            
            elif 'normalize' in transformation.lower():
                code += '''
            # Data normalization transformation
            for key, value in record.items():
                if isinstance(value, str):
                    # Convert to lowercase
                    record[key] = value.lower()
                    
                    # Standardize spacing
                    record[key] = ' '.join(record[key].split())
                    
                elif isinstance(value, (int, float)):
                    # Ensure numeric values are properly typed
                    record[key] = float(value) if '.' in str(value) else int(value)
'''
            
            elif 'validate' in transformation.lower():
                code += '''
            # Data validation transformation
            validation_errors = []
            
            # Check for required fields
            required_fields = ['id', 'name']  # Customize as needed
            for field in required_fields:
                if field not in record or record[field] is None:
                    validation_errors.append(f"Missing required field: {field}")
            
            # Add validation results
            record['validation_errors'] = validation_errors
            record['is_valid'] = len(validation_errors) == 0
'''
            
            elif 'enrich' in transformation.lower():
                code += '''
            # Data enrichment transformation
            
            # Add computed fields
            if 'created_at' in record:
                try:
                    created_date = datetime.fromisoformat(record['created_at'].replace('Z', '+00:00'))
                    record['days_since_created'] = (datetime.now() - created_date).days
                    record['created_year'] = created_date.year
                    record['created_month'] = created_date.month
                except:
                    pass
            
            # Add metadata
            record['enriched_at'] = datetime.now().isoformat()
            record['processor_version'] = '1.0.0'
'''
            
            else:
                # Generic transformation
                code += f'''
            # Generic {transformation} transformation
            record['{trans_name}_applied'] = True
            record['{trans_name}_timestamp'] = datetime.now().isoformat()
            
            # Add custom logic here for {transformation}
            logger.debug(f"Applied {transformation} to record")
'''
            
            code += f'''
            
            return record
            
        except Exception as e:
            logger.error(f"Failed to apply {transformation}: {{e}}")
            record['{trans_name}_error'] = str(e)
            return record
    
'''

        # Add main processing methods
        code += f'''
    def process_data(self, data: List[Dict]) -> List[Dict]:
        """Process a list of data records"""
        logger.info(f"Processing {{len(data)}} records")
        
        self.processing_stats['start_time'] = datetime.now().isoformat()
        self.processing_stats['total_processed'] = len(data)
        
        processed_data = []
        
        for i, record in enumerate(data):
            processed_record = self.process_single_record(record)
            processed_data.append(processed_record)
            
            # Progress logging
            if (i + 1) % 100 == 0:
                logger.info(f"Processed {{i+1}}/{{len(data)}} records")
        
        self.processing_stats['end_time'] = datetime.now().isoformat()
        self.processed_data = processed_data
        
        logger.info(f"Completed processing {{len(processed_data)}} records")
        return processed_data
    
    def process_file(self, input_file: str, output_file: str = None) -> str:
        """Process a complete file"""
        try:
            # Load data
            data = self.load_data(input_file)
            
            # Process data
            processed_data = self.process_data(data)
            
            # Generate output filename if not provided
            if output_file is None:
                input_path = Path(input_file)
                output_file = self.output_dir / f"processed_{{input_path.stem}}.{output_format.lower()}"
            
            # Save processed data
            self.save_data(processed_data, output_file)
            
            return str(output_file)
            
        except Exception as e:
            logger.error(f"Failed to process file {{input_file}}: {{e}}")
            raise
    
    def save_data(self, data: List[Dict], output_file: str):
        """Save processed data to {output_format} file"""
        try:
            output_path = Path(output_file)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            logger.info(f"Saving {{len(data)}} records to {{output_path}}")
            
'''
        
        # Add output format specific saving
        if output_format.lower() == 'json':
            code += '''
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
'''
        elif output_format.lower() == 'csv':
            code += '''
            if data:
                # Get all unique keys from all records
                all_keys = set()
                for item in data:
                    all_keys.update(item.keys())
                
                with open(output_path, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.DictWriter(f, fieldnames=list(all_keys))
                    writer.writeheader()
                    writer.writerows(data)
'''
        
        code += f'''
            
            logger.info(f"Successfully saved data to {{output_path}}")
            
        except Exception as e:
            logger.error(f"Failed to save data to {{output_file}}: {{e}}")
            raise
    
    def get_processing_stats(self) -> Dict:
        """Get processing statistics"""
        stats = self.processing_stats.copy()
        
        if stats['start_time'] and stats['end_time']:
            start = datetime.fromisoformat(stats['start_time'])
            end = datetime.fromisoformat(stats['end_time'])
            stats['processing_duration_seconds'] = (end - start).total_seconds()
        
        if stats['total_processed'] > 0:
            stats['success_rate'] = (stats['successful_transformations'] / stats['total_processed']) * 100
        
        return stats
    
    def validate_processed_data(self) -> Dict:
        """Validate the processed data quality"""
        if not self.processed_data:
            return {{'error': 'No processed data to validate'}}
        
        validation_results = {{
            'total_records': len(self.processed_data),
            'valid_records': 0,
            'invalid_records': 0,
            'validation_errors': []
        }}
        
        for record in self.processed_data:
            if record.get('is_valid', True) and 'error' not in record:
                validation_results['valid_records'] += 1
            else:
                validation_results['invalid_records'] += 1
                if 'validation_errors' in record:
                    validation_results['validation_errors'].extend(record['validation_errors'])
        
        validation_results['data_quality_score'] = (
            validation_results['valid_records'] / validation_results['total_records'] * 100
        ) if validation_results['total_records'] > 0 else 0
        
        return validation_results

def run_{processor_name.lower()}_processor():
    """Example usage of the {processor_name} processor"""
    processor = {processor_name.title()}Processor()
    
    print(f"🔄 Starting {processor_name} processor...")
    
    # Example: Create sample input data
    sample_data = [
        {{'id': 1, 'name': 'Sample Item 1', 'value': '123.45', 'created_at': '2024-01-01T10:00:00Z'}},
        {{'id': 2, 'name': 'Sample Item 2', 'value': '67.89', 'created_at': '2024-01-02T11:30:00Z'}},
        {{'id': 3, 'name': 'Sample Item 3', 'value': 'invalid', 'created_at': '2024-01-03T12:45:00Z'}}
    ]
    
    # Save sample data as input
    input_file = 'sample_input.{input_format.lower()}'
    if '{input_format.lower()}' == 'json':
        with open(input_file, 'w') as f:
            json.dump(sample_data, f, indent=2)
    elif '{input_format.lower()}' == 'csv':
        with open(input_file, 'w', newline='') as f:
            if sample_data:
                writer = csv.DictWriter(f, fieldnames=sample_data[0].keys())
                writer.writeheader()
                writer.writerows(sample_data)
    
    # Process the file
    output_file = processor.process_file(input_file)
    print(f"✅ Processed file saved to: {{output_file}}")
    
    # Print statistics
    stats = processor.get_processing_stats()
    print(f"📊 Processing Statistics:")
    for key, value in stats.items():
        print(f"  {{key}}: {{value}}")
    
    # Validate data quality
    validation = processor.validate_processed_data()
    print(f"🔍 Data Quality Report:")
    for key, value in validation.items():
        print(f"  {{key}}: {{value}}")
    
    return processor

if __name__ == "__main__":
    # Run the processor
    processor = run_{processor_name.lower()}_processor()
'''

        self.save_generated_file(filename, code)
        return filename
    
    def save_generated_file(self, filename: str, content: str):
        """Save generated code to file"""
        full_path = os.path.join(self.output_dir, filename)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        self.generated_files[filename] = {
            'path': full_path,
            'size': len(content),
            'lines': len(content.splitlines()),
            'generated_at': datetime.now().isoformat()
        }
        
        logger.info(f"Generated functional code file: {full_path} ({len(content.splitlines())} lines)")
    
    def generate_complete_system(self, system_name: str, components: List[str]) -> Dict[str, str]:
        """Generate a complete functional system with multiple components"""
        logger.info(f"Generating complete {system_name} system with components: {components}")
        
        generated_files = {}
        
        # Generate API endpoints
        if 'api' in components:
            api_file = self.generate_api_endpoint(
                f"{system_name}_data",
                f"{system_name.title()}Data",
                ['create', 'read', 'update', 'delete']
            )
            generated_files['api'] = api_file
        
        # Generate scraper
        if 'scraper' in components:
            scraper_file = self.generate_scraper_class(
                system_name,
                f"https://example.com/{system_name}",
                ['title', 'description', 'price', 'date', 'category']
            )
            generated_files['scraper'] = scraper_file
        
        # Generate data processor
        if 'processor' in components:
            processor_file = self.generate_data_processor(
                f"{system_name}_data",
                'json',
                'csv',
                ['clean data', 'normalize values', 'validate records', 'enrich data']
            )
            generated_files['processor'] = processor_file
        
        return generated_files
    
    def get_generation_summary(self) -> Dict:
        """Get summary of all generated files"""
        total_files = len(self.generated_files)
        total_lines = sum(file_info['lines'] for file_info in self.generated_files.values())
        total_size = sum(file_info['size'] for file_info in self.generated_files.values())
        
        return {
            'total_files_generated': total_files,
            'total_lines_of_code': total_lines,
            'total_size_bytes': total_size,
            'average_file_size': total_size / total_files if total_files > 0 else 0,
            'files': self.generated_files,
            'generation_complete': True,
            'timestamp': datetime.now().isoformat()
        }
    
    # Template methods (simplified for brevity)
    def get_api_endpoint_template(self): return "API Template"
    def get_database_model_template(self): return "Database Template"  
    def get_scraper_class_template(self): return "Scraper Template"
    def get_data_processor_template(self): return "Processor Template"
    def get_analytics_module_template(self): return "Analytics Template"
    def get_integration_client_template(self): return "Integration Template"
    def get_utility_functions_template(self): return "Utility Template"
    def get_config_manager_template(self): return "Config Template"

def demonstrate_real_code_generation():
    """Demonstrate actual functional code generation"""
    generator = FunctionalCodeGenerator()
    
    print("🔧 Generating REAL functional code files...")
    
    # Generate specific functional components
    print("\n1. Generating E-commerce API endpoint...")
    api_file = generator.generate_api_endpoint(
        "products", 
        "Product", 
        ['create', 'read', 'update', 'delete']
    )
    print(f"✅ Generated: {api_file}")
    
    print("\n2. Generating competitor analysis scraper...")
    scraper_file = generator.generate_scraper_class(
        "CompetitorAnalysis",
        "https://example-competitor.com",
        ['company_name', 'revenue', 'employees', 'technologies', 'pricing']
    )
    print(f"✅ Generated: {scraper_file}")
    
    print("\n3. Generating data processor...")
    processor_file = generator.generate_data_processor(
        "sales_data",
        'json',
        'csv', 
        ['clean data', 'normalize currency', 'validate sales', 'enrich customer data']
    )
    print(f"✅ Generated: {processor_file}")
    
    print("\n4. Generating complete CRM system...")
    crm_files = generator.generate_complete_system(
        "crm",
        ['api', 'scraper', 'processor']
    )
    print(f"✅ Generated CRM system: {list(crm_files.keys())}")
    
    # Get generation summary
    summary = generator.get_generation_summary()
    print(f"\n📊 Code Generation Summary:")
    print(f"  Total files: {summary['total_files_generated']}")
    print(f"  Total lines: {summary['total_lines_of_code']:,}")
    print(f"  Total size: {summary['total_size_bytes']:,} bytes")
    print(f"  Average file size: {summary['average_file_size']:.0f} bytes")
    
    return generator

if __name__ == "__main__":
    # Demonstrate real code generation
    generator = demonstrate_real_code_generation()
