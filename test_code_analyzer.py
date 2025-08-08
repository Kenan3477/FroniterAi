#!/usr/bin/env python3
"""
Test script for the Code Analyzer module
Analyzes the current repository and generates a report
"""
import os
import sys
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add parent directory to path to find code_analyzer
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the code analyzer
from code_analyzer import CodeAnalyzer, analyze_repository

def main():
    """Run the code analyzer on the repository"""
    repo_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    logger.info(f"Starting code analysis on repository: {repo_path}")
    
    start_time = time.time()
    
    # Create output paths
    output_dir = os.path.join(repo_path, 'analysis')
    os.makedirs(output_dir, exist_ok=True)
    output_md = os.path.join(output_dir, "code_analysis_report.md")
    output_json = os.path.join(output_dir, "code_analysis_data.json")
    
    # Run analysis
    analyzer = analyze_repository(repo_path, output_md, output_json)
    
    end_time = time.time()
    
    # Print summary
    logger.info(f"Analysis completed in {end_time - start_time:.2f} seconds")
    summary = analyzer.get_summary_stats()
    
    logger.info(f"Files analyzed: {summary['files_analyzed']}")
    logger.info(f"Total lines of code: {summary['total_lines']}")
    logger.info(f"Issues found: {summary['total_issues']}")
    logger.info(f"Improvement opportunities: {summary['total_opportunities']}")
    
    logger.info(f"Report saved to: {output_md}")
    logger.info(f"JSON data saved to: {output_json}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
