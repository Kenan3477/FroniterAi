"""
PriceMonitor Web Scraper
Auto-generated web scraper for extracting data from https://competitor-store.com
Generated: 2025-08-09T11:48:50.307965
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

class PricemonitorScraper:
    """
    Functional web scraper for PriceMonitor
    Extracts: product_name, price, discount, availability, reviews
    """
    
    def __init__(self, base_url: str = "https://competitor-store.com", rate_limit: float = 1.0):
        self.base_url = base_url
        self.rate_limit = rate_limit  # Seconds between requests
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.scraped_data = []
        self.last_request_time = 0
        
        logger.info(f"Initialized PriceMonitor scraper for {self.base_url}")
    
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
            
            logger.debug(f"Successfully fetched {url}")
            return response
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed for {url}: {e}")
            return None
    
    def _parse_page(self, response: requests.Response) -> Dict:
        """Parse a single page and extract data"""
        try:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract data based on specified fields
            extracted_data = {
                'url': response.url,
                'scraped_at': datetime.now().isoformat(),
                'status_code': response.status_code
            }
            

            # Extract product_name
            product_name_value = self._extract_product_name(soup)
            if product_name_value:
                extracted_data['product_name'] = product_name_value

            # Extract price
            price_value = self._extract_price(soup)
            if price_value:
                extracted_data['price'] = price_value

            # Extract discount
            discount_value = self._extract_discount(soup)
            if discount_value:
                extracted_data['discount'] = discount_value

            # Extract availability
            availability_value = self._extract_availability(soup)
            if availability_value:
                extracted_data['availability'] = availability_value

            # Extract reviews
            reviews_value = self._extract_reviews(soup)
            if reviews_value:
                extracted_data['reviews'] = reviews_value

            
            logger.debug(f"Extracted data: {extracted_data}")
            return extracted_data
            
        except Exception as e:
            logger.error(f"Failed to parse page {response.url}: {e}")
            return {'error': str(e), 'url': response.url}
    

    def _extract_product_name(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract product_name from the page"""
        try:
            # Generic extraction logic - customize as needed
            
            # Try common selectors for product_name
            selectors = [
                'h1',  # Main heading
                '.product_name',  # Class name
                '#product_name',  # ID
                '[data-product_name]',  # Data attribute
                'meta[name="product_name"]',  # Meta tag
                'meta[property="og:product_name"]'  # Open Graph
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
            if 'product_name' in text_content.lower():
                # Extract surrounding text
                pattern = rf'\bproduct_name\b[:\s]+([^\n\r{50}]*)'
                match = re.search(pattern, text_content, re.IGNORECASE)
                if match:
                    return match.group(1).strip()
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to extract product_name: {e}")
            return None
    

    def _extract_price(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract price from the page"""
        try:
            # Generic extraction logic - customize as needed
            
            # Try common selectors for price
            selectors = [
                'h1',  # Main heading
                '.price',  # Class name
                '#price',  # ID
                '[data-price]',  # Data attribute
                'meta[name="price"]',  # Meta tag
                'meta[property="og:price"]'  # Open Graph
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
            if 'price' in text_content.lower():
                # Extract surrounding text
                pattern = rf'\bprice\b[:\s]+([^\n\r{50}]*)'
                match = re.search(pattern, text_content, re.IGNORECASE)
                if match:
                    return match.group(1).strip()
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to extract price: {e}")
            return None
    

    def _extract_discount(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract discount from the page"""
        try:
            # Generic extraction logic - customize as needed
            
            # Try common selectors for discount
            selectors = [
                'h1',  # Main heading
                '.discount',  # Class name
                '#discount',  # ID
                '[data-discount]',  # Data attribute
                'meta[name="discount"]',  # Meta tag
                'meta[property="og:discount"]'  # Open Graph
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
            if 'discount' in text_content.lower():
                # Extract surrounding text
                pattern = rf'\bdiscount\b[:\s]+([^\n\r{50}]*)'
                match = re.search(pattern, text_content, re.IGNORECASE)
                if match:
                    return match.group(1).strip()
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to extract discount: {e}")
            return None
    

    def _extract_availability(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract availability from the page"""
        try:
            # Generic extraction logic - customize as needed
            
            # Try common selectors for availability
            selectors = [
                'h1',  # Main heading
                '.availability',  # Class name
                '#availability',  # ID
                '[data-availability]',  # Data attribute
                'meta[name="availability"]',  # Meta tag
                'meta[property="og:availability"]'  # Open Graph
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
            if 'availability' in text_content.lower():
                # Extract surrounding text
                pattern = rf'\bavailability\b[:\s]+([^\n\r{50}]*)'
                match = re.search(pattern, text_content, re.IGNORECASE)
                if match:
                    return match.group(1).strip()
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to extract availability: {e}")
            return None
    

    def _extract_reviews(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract reviews from the page"""
        try:
            # Generic extraction logic - customize as needed
            
            # Try common selectors for reviews
            selectors = [
                'h1',  # Main heading
                '.reviews',  # Class name
                '#reviews',  # ID
                '[data-reviews]',  # Data attribute
                'meta[name="reviews"]',  # Meta tag
                'meta[property="og:reviews"]'  # Open Graph
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
            if 'reviews' in text_content.lower():
                # Extract surrounding text
                pattern = rf'\breviews\b[:\s]+([^\n\r{50}]*)'
                match = re.search(pattern, text_content, re.IGNORECASE)
                if match:
                    return match.group(1).strip()
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to extract reviews: {e}")
            return None
    

    def scrape_single_page(self, url: str = None) -> Dict:
        """Scrape a single page"""
        url = url or self.base_url
        
        logger.info(f"Scraping single page: {url}")
        
        response = self._make_request(url)
        if not response:
            return {'error': 'Failed to fetch page', 'url': url}
        
        data = self._parse_page(response)
        self.scraped_data.append(data)
        
        return data
    
    def scrape_multiple_pages(self, urls: List[str]) -> List[Dict]:
        """Scrape multiple pages"""
        logger.info(f"Scraping {len(urls)} pages")
        
        results = []
        for i, url in enumerate(urls):
            logger.info(f"Scraping page {i+1}/{len(urls)}: {url}")
            
            data = self.scrape_single_page(url)
            results.append(data)
            
            # Progress logging
            if (i + 1) % 10 == 0:
                logger.info(f"Completed {i+1}/{len(urls)} pages")
        
        return results
    
    def discover_pages(self, start_url: str = None, max_pages: int = 50) -> List[str]:
        """Discover pages to scrape by following links"""
        start_url = start_url or self.base_url
        discovered_urls = set([start_url])
        to_visit = [start_url]
        visited = set()
        
        logger.info(f"Discovering pages starting from {start_url}")
        
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
        
        logger.info(f"Discovered {len(discovered_urls)} pages")
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
        
        logger.info(f"Saved {len(self.scraped_data)} records to {filename}")
    
    def get_statistics(self) -> Dict:
        """Get scraping statistics"""
        total_records = len(self.scraped_data)
        successful_records = len([d for d in self.scraped_data if 'error' not in d])
        error_records = total_records - successful_records
        
        return {
            'total_records': total_records,
            'successful_records': successful_records,
            'error_records': error_records,
            'success_rate': (successful_records / total_records * 100) if total_records > 0 else 0,
            'fields_extracted': ['product_name', 'price', 'discount', 'availability', 'reviews'],
            'last_scraped': self.scraped_data[-1]['scraped_at'] if self.scraped_data else None
        }
    
    def clear_data(self):
        """Clear scraped data"""
        self.scraped_data = []
        logger.info("Cleared scraped data")

def run_pricemonitor_scraper():
    """Example usage of the PriceMonitor scraper"""
    scraper = PricemonitorScraper()
    
    print(f"🕷️  Starting PriceMonitor scraper...")
    
    # Scrape the main page
    result = scraper.scrape_single_page()
    print(f"✅ Scraped main page: {result}")
    
    # Discover additional pages
    pages = scraper.discover_pages(max_pages=10)
    print(f"🔍 Discovered {len(pages)} pages")
    
    # Scrape multiple pages
    if len(pages) > 1:
        results = scraper.scrape_multiple_pages(pages[:5])  # Limit to 5 pages
        print(f"✅ Scraped {len(results)} pages")
    
    # Save results
    scraper.save_data(f'pricemonitor_data.json', 'json')
    scraper.save_data(f'pricemonitor_data.csv', 'csv')
    
    # Print statistics
    stats = scraper.get_statistics()
    print(f"📊 Scraping Statistics:")
    for key, value in stats.items():
        print(f"  {key}: {value}")
    
    return scraper

if __name__ == "__main__":
    # Run the scraper
    scraper = run_pricemonitor_scraper()
