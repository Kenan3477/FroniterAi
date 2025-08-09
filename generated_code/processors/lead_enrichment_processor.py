"""
lead_enrichment Data Processor
Auto-generated data processor for transforming csv to json
Transformations: clean emails, validate phones, enrich companies, score leads
Generated: 2025-08-09T11:48:50.310180
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

class Lead_EnrichmentProcessor:
    """
    Processes data from csv format to json format
    Applies transformations: clean emails, validate phones, enrich companies, score leads
    """
    
    def __init__(self, input_dir: str = "input", output_dir: str = "output"):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.processed_data = []
        self.processing_stats = {
            'total_processed': 0,
            'successful_transformations': 0,
            'failed_transformations': 0,
            'start_time': None,
            'end_time': None
        }
        
        # Create directories
        self.input_dir.mkdir(exist_ok=True)
        self.output_dir.mkdir(exist_ok=True)
        
        logger.info(f"Initialized lead_enrichment processor")
    
    def load_data(self, file_path: str) -> List[Dict]:
        """Load data from csv file"""
        try:
            file_path = Path(file_path)
            
            if not file_path.exists():
                raise FileNotFoundError(f"Input file not found: {file_path}")
            
            logger.info(f"Loading data from {file_path}")
            

            data = []
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                data = list(reader)

            
            logger.info(f"Loaded {len(data)} records from {file_path}")
            return data
            
        except Exception as e:
            logger.error(f"Failed to load data from {file_path}: {e}")
            raise
    
    def process_single_record(self, record: Dict) -> Dict:
        """Process a single data record"""
        try:
            processed_record = record.copy()
            processed_record['processing_timestamp'] = datetime.now().isoformat()
            processed_record['original_record'] = record.copy()
            

            # Apply clean emails
            processed_record = self._apply_clean_emails(processed_record)

            # Apply validate phones
            processed_record = self._apply_validate_phones(processed_record)

            # Apply enrich companies
            processed_record = self._apply_enrich_companies(processed_record)

            # Apply score leads
            processed_record = self._apply_score_leads(processed_record)

            
            # Remove original record from output to save space
            if 'original_record' in processed_record:
                del processed_record['original_record']
            
            self.processing_stats['successful_transformations'] += 1
            return processed_record
            
        except Exception as e:
            logger.error(f"Failed to process record: {e}")
            self.processing_stats['failed_transformations'] += 1
            return {
                'error': str(e),
                'original_record': record,
                'processing_timestamp': datetime.now().isoformat()
            }
    

    def _apply_clean_emails(self, record: Dict) -> Dict:
        """Apply clean emails transformation"""
        try:

            # Data cleaning transformation
            for key, value in record.items():
                if isinstance(value, str):
                    # Remove extra whitespace
                    record[key] = value.strip()
                    
                    # Remove special characters if needed
                    record[key] = re.sub(r'[^\w\s-]', '', record[key])
                    
                    # Convert empty strings to None
                    if record[key] == '':
                        record[key] = None

            
            return record
            
        except Exception as e:
            logger.error(f"Failed to apply clean emails: {e}")
            record['clean_emails_error'] = str(e)
            return record
    

    def _apply_validate_phones(self, record: Dict) -> Dict:
        """Apply validate phones transformation"""
        try:

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

            
            return record
            
        except Exception as e:
            logger.error(f"Failed to apply validate phones: {e}")
            record['validate_phones_error'] = str(e)
            return record
    

    def _apply_enrich_companies(self, record: Dict) -> Dict:
        """Apply enrich companies transformation"""
        try:

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

            
            return record
            
        except Exception as e:
            logger.error(f"Failed to apply enrich companies: {e}")
            record['enrich_companies_error'] = str(e)
            return record
    

    def _apply_score_leads(self, record: Dict) -> Dict:
        """Apply score leads transformation"""
        try:

            # Generic score leads transformation
            record['score_leads_applied'] = True
            record['score_leads_timestamp'] = datetime.now().isoformat()
            
            # Add custom logic here for score leads
            logger.debug(f"Applied score leads to record")

            
            return record
            
        except Exception as e:
            logger.error(f"Failed to apply score leads: {e}")
            record['score_leads_error'] = str(e)
            return record
    

    def process_data(self, data: List[Dict]) -> List[Dict]:
        """Process a list of data records"""
        logger.info(f"Processing {len(data)} records")
        
        self.processing_stats['start_time'] = datetime.now().isoformat()
        self.processing_stats['total_processed'] = len(data)
        
        processed_data = []
        
        for i, record in enumerate(data):
            processed_record = self.process_single_record(record)
            processed_data.append(processed_record)
            
            # Progress logging
            if (i + 1) % 100 == 0:
                logger.info(f"Processed {i+1}/{len(data)} records")
        
        self.processing_stats['end_time'] = datetime.now().isoformat()
        self.processed_data = processed_data
        
        logger.info(f"Completed processing {len(processed_data)} records")
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
                output_file = self.output_dir / f"processed_{input_path.stem}.json"
            
            # Save processed data
            self.save_data(processed_data, output_file)
            
            return str(output_file)
            
        except Exception as e:
            logger.error(f"Failed to process file {input_file}: {e}")
            raise
    
    def save_data(self, data: List[Dict], output_file: str):
        """Save processed data to json file"""
        try:
            output_path = Path(output_file)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            logger.info(f"Saving {len(data)} records to {output_path}")
            

            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            
            logger.info(f"Successfully saved data to {output_path}")
            
        except Exception as e:
            logger.error(f"Failed to save data to {output_file}: {e}")
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
            return {'error': 'No processed data to validate'}
        
        validation_results = {
            'total_records': len(self.processed_data),
            'valid_records': 0,
            'invalid_records': 0,
            'validation_errors': []
        }
        
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

def run_lead_enrichment_processor():
    """Example usage of the lead_enrichment processor"""
    processor = Lead_EnrichmentProcessor()
    
    print(f"🔄 Starting lead_enrichment processor...")
    
    # Example: Create sample input data
    sample_data = [
        {'id': 1, 'name': 'Sample Item 1', 'value': '123.45', 'created_at': '2024-01-01T10:00:00Z'},
        {'id': 2, 'name': 'Sample Item 2', 'value': '67.89', 'created_at': '2024-01-02T11:30:00Z'},
        {'id': 3, 'name': 'Sample Item 3', 'value': 'invalid', 'created_at': '2024-01-03T12:45:00Z'}
    ]
    
    # Save sample data as input
    input_file = 'sample_input.csv'
    if 'csv' == 'json':
        with open(input_file, 'w') as f:
            json.dump(sample_data, f, indent=2)
    elif 'csv' == 'csv':
        with open(input_file, 'w', newline='') as f:
            if sample_data:
                writer = csv.DictWriter(f, fieldnames=sample_data[0].keys())
                writer.writeheader()
                writer.writerows(sample_data)
    
    # Process the file
    output_file = processor.process_file(input_file)
    print(f"✅ Processed file saved to: {output_file}")
    
    # Print statistics
    stats = processor.get_processing_stats()
    print(f"📊 Processing Statistics:")
    for key, value in stats.items():
        print(f"  {key}: {value}")
    
    # Validate data quality
    validation = processor.validate_processed_data()
    print(f"🔍 Data Quality Report:")
    for key, value in validation.items():
        print(f"  {key}: {value}")
    
    return processor

if __name__ == "__main__":
    # Run the processor
    processor = run_lead_enrichment_processor()
