"""
Advanced Search System for Compliance Knowledge Base

Provides comprehensive search functionality across regulations, policies, 
risk assessments, workflows, and industry guides with filtering, 
ranking, and faceted search capabilities.
"""

import json
import re
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum
import sqlite3
from pathlib import Path


class ContentType(Enum):
    REGULATION = "regulation"
    POLICY = "policy"
    RISK_ASSESSMENT = "risk_assessment"
    WORKFLOW = "workflow"
    INDUSTRY_GUIDE = "industry_guide"
    UPDATE = "update"


class SearchScope(Enum):
    ALL = "all"
    TITLE = "title"
    CONTENT = "content"
    METADATA = "metadata"
    TAGS = "tags"


@dataclass
class SearchResult:
    """Represents a single search result"""
    id: str
    title: str
    content_type: ContentType
    summary: str
    file_path: str
    relevance_score: float
    jurisdiction: List[str] = field(default_factory=list)
    industry: List[str] = field(default_factory=list)
    regulation_tags: List[str] = field(default_factory=list)
    last_updated: Optional[datetime] = None
    version: Optional[str] = None
    highlight_snippet: Optional[str] = None


@dataclass
class SearchFilters:
    """Search filtering criteria"""
    content_types: List[ContentType] = field(default_factory=list)
    jurisdictions: List[str] = field(default_factory=list)
    industries: List[str] = field(default_factory=list)
    regulations: List[str] = field(default_factory=list)
    date_range: Optional[Tuple[datetime, datetime]] = None
    min_relevance: float = 0.0
    language: Optional[str] = None


class ComplianceSearchEngine:
    """
    Advanced search engine for compliance knowledge base
    """
    
    def __init__(self, knowledge_base_path: str):
        self.kb_path = Path(knowledge_base_path)
        self.db_path = self.kb_path / "search_index.db"
        self.initialize_database()
        self.load_search_index()
    
    def initialize_database(self):
        """Initialize SQLite database for search indexing"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create main content index table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS content_index (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content_type TEXT NOT NULL,
                file_path TEXT NOT NULL,
                content TEXT NOT NULL,
                summary TEXT,
                jurisdictions TEXT,
                industries TEXT,
                regulation_tags TEXT,
                last_updated TIMESTAMP,
                version TEXT,
                created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(file_path)
            )
        """)
        
        # Create search terms table for autocomplete
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS search_terms (
                term TEXT PRIMARY KEY,
                frequency INTEGER DEFAULT 1,
                content_types TEXT,
                last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create search history table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS search_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query TEXT NOT NULL,
                filters TEXT,
                result_count INTEGER,
                search_time REAL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create full-text search index
        cursor.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS content_fts USING fts5(
                id,
                title,
                content,
                summary,
                regulation_tags,
                content='content_index',
                content_rowid='rowid'
            )
        """)
        
        conn.commit()
        conn.close()
    
    def index_content(self, content_id: str, title: str, content_type: ContentType,
                     file_path: str, content: str, metadata: Dict[str, Any]):
        """Add or update content in search index"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Prepare metadata
        jurisdictions = json.dumps(metadata.get('jurisdictions', []))
        industries = json.dumps(metadata.get('industries', []))
        regulation_tags = json.dumps(metadata.get('regulation_tags', []))
        summary = metadata.get('summary', '')
        version = metadata.get('version', '1.0')
        last_updated = datetime.now()
        
        # Insert or update main index
        cursor.execute("""
            INSERT OR REPLACE INTO content_index 
            (id, title, content_type, file_path, content, summary, 
             jurisdictions, industries, regulation_tags, last_updated, version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (content_id, title, content_type.value, file_path, content,
              summary, jurisdictions, industries, regulation_tags, 
              last_updated, version))
        
        # Update FTS index
        cursor.execute("""
            INSERT OR REPLACE INTO content_fts 
            (id, title, content, summary, regulation_tags)
            VALUES (?, ?, ?, ?, ?)
        """, (content_id, title, content, summary, 
              ' '.join(metadata.get('regulation_tags', []))))
        
        # Extract and index search terms
        self.extract_search_terms(content + ' ' + title, content_type)
        
        conn.commit()
        conn.close()
    
    def search(self, query: str, filters: Optional[SearchFilters] = None,
               scope: SearchScope = SearchScope.ALL, limit: int = 50) -> List[SearchResult]:
        """
        Perform comprehensive search across knowledge base
        """
        start_time = datetime.now()
        
        if not filters:
            filters = SearchFilters()
        
        # Build search query based on scope
        if scope == SearchScope.ALL:
            search_query = self.build_fts_query(query)
        elif scope == SearchScope.TITLE:
            search_query = f"title:{query}"
        elif scope == SearchScope.CONTENT:
            search_query = f"content:{query}"
        elif scope == SearchScope.TAGS:
            search_query = f"regulation_tags:{query}"
        else:
            search_query = query
        
        # Execute search
        results = self.execute_search(search_query, filters, limit)
        
        # Calculate relevance scores and rank results
        scored_results = self.calculate_relevance_scores(results, query)
        
        # Filter by minimum relevance
        filtered_results = [r for r in scored_results 
                          if r.relevance_score >= filters.min_relevance]
        
        # Sort by relevance score
        filtered_results.sort(key=lambda x: x.relevance_score, reverse=True)
        
        # Log search
        search_time = (datetime.now() - start_time).total_seconds()
        self.log_search(query, filters, len(filtered_results), search_time)
        
        return filtered_results[:limit]
    
    def build_fts_query(self, query: str) -> str:
        """Build FTS5 query with proper syntax"""
        # Handle quoted phrases
        if '"' in query:
            return query
        
        # Split query into terms and add wildcards
        terms = query.split()
        fts_terms = []
        
        for term in terms:
            if len(term) > 2:
                fts_terms.append(f"{term}*")
            else:
                fts_terms.append(term)
        
        return ' '.join(fts_terms)
    
    def execute_search(self, query: str, filters: SearchFilters, 
                      limit: int) -> List[Dict[str, Any]]:
        """Execute search query against database"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Build WHERE clauses for filters
        where_clauses = []
        params = []
        
        if filters.content_types:
            placeholders = ','.join(['?' for _ in filters.content_types])
            where_clauses.append(f"ci.content_type IN ({placeholders})")
            params.extend([ct.value for ct in filters.content_types])
        
        if filters.jurisdictions:
            jurisdiction_conditions = []
            for jurisdiction in filters.jurisdictions:
                jurisdiction_conditions.append("ci.jurisdictions LIKE ?")
                params.append(f'%"{jurisdiction}"%')
            where_clauses.append(f"({' OR '.join(jurisdiction_conditions)})")
        
        if filters.industries:
            industry_conditions = []
            for industry in filters.industries:
                industry_conditions.append("ci.industries LIKE ?")
                params.append(f'%"{industry}"%')
            where_clauses.append(f"({' OR '.join(industry_conditions)})")
        
        if filters.regulations:
            regulation_conditions = []
            for regulation in filters.regulations:
                regulation_conditions.append("ci.regulation_tags LIKE ?")
                params.append(f'%"{regulation}"%')
            where_clauses.append(f"({' OR '.join(regulation_conditions)})")
        
        if filters.date_range:
            where_clauses.append("ci.last_updated BETWEEN ? AND ?")
            params.extend([filters.date_range[0], filters.date_range[1]])
        
        # Build final query
        where_clause = ""
        if where_clauses:
            where_clause = f"WHERE {' AND '.join(where_clauses)}"
        
        sql_query = f"""
            SELECT ci.*, fts.rank
            FROM content_fts fts
            JOIN content_index ci ON ci.id = fts.id
            {where_clause}
            AND content_fts MATCH ?
            ORDER BY fts.rank
            LIMIT ?
        """
        
        params.append(query)
        params.append(limit)
        
        cursor.execute(sql_query, params)
        results = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        return results
    
    def calculate_relevance_scores(self, results: List[Dict[str, Any]], 
                                 query: str) -> List[SearchResult]:
        """Calculate relevance scores for search results"""
        search_results = []
        query_terms = query.lower().split()
        
        for result in results:
            # Base score from FTS ranking
            base_score = float(result.get('rank', 1.0))
            
            # Title matching bonus
            title_score = self.calculate_text_score(
                result['title'].lower(), query_terms
            )
            
            # Content matching score
            content_score = self.calculate_text_score(
                result['content'].lower(), query_terms
            )
            
            # Recency bonus (newer content gets higher score)
            recency_score = self.calculate_recency_score(
                result.get('last_updated')
            )
            
            # Content type relevance
            type_score = self.get_content_type_score(
                ContentType(result['content_type'])
            )
            
            # Calculate final relevance score
            relevance_score = (
                base_score * 0.3 +
                title_score * 0.25 +
                content_score * 0.2 +
                recency_score * 0.15 +
                type_score * 0.1
            )
            
            # Generate highlight snippet
            highlight = self.generate_highlight_snippet(
                result['content'], query_terms
            )
            
            # Parse JSON fields
            jurisdictions = json.loads(result.get('jurisdictions', '[]'))
            industries = json.loads(result.get('industries', '[]'))
            regulation_tags = json.loads(result.get('regulation_tags', '[]'))
            
            search_result = SearchResult(
                id=result['id'],
                title=result['title'],
                content_type=ContentType(result['content_type']),
                summary=result.get('summary', ''),
                file_path=result['file_path'],
                relevance_score=relevance_score,
                jurisdiction=jurisdictions,
                industry=industries,
                regulation_tags=regulation_tags,
                last_updated=result.get('last_updated'),
                version=result.get('version'),
                highlight_snippet=highlight
            )
            
            search_results.append(search_result)
        
        return search_results
    
    def calculate_text_score(self, text: str, query_terms: List[str]) -> float:
        """Calculate text matching score"""
        if not text or not query_terms:
            return 0.0
        
        words = text.split()
        word_count = len(words)
        
        if word_count == 0:
            return 0.0
        
        matches = 0
        for term in query_terms:
            term_matches = sum(1 for word in words if term in word)
            matches += term_matches
        
        return min(matches / word_count, 1.0)
    
    def calculate_recency_score(self, last_updated: Optional[str]) -> float:
        """Calculate recency-based score"""
        if not last_updated:
            return 0.5
        
        try:
            update_date = datetime.fromisoformat(last_updated.replace('Z', '+00:00'))
            days_old = (datetime.now() - update_date).days
            
            # Score decreases with age, but levels off after 365 days
            if days_old <= 30:
                return 1.0
            elif days_old <= 90:
                return 0.8
            elif days_old <= 365:
                return 0.6
            else:
                return 0.4
        except:
            return 0.5
    
    def get_content_type_score(self, content_type: ContentType) -> float:
        """Get relevance score based on content type"""
        type_scores = {
            ContentType.REGULATION: 1.0,
            ContentType.POLICY: 0.9,
            ContentType.WORKFLOW: 0.8,
            ContentType.RISK_ASSESSMENT: 0.8,
            ContentType.INDUSTRY_GUIDE: 0.7,
            ContentType.UPDATE: 0.9
        }
        return type_scores.get(content_type, 0.5)
    
    def generate_highlight_snippet(self, content: str, 
                                 query_terms: List[str], 
                                 snippet_length: int = 200) -> str:
        """Generate highlighted snippet showing query context"""
        if not content or not query_terms:
            return content[:snippet_length] + "..." if len(content) > snippet_length else content
        
        # Find first occurrence of any query term
        content_lower = content.lower()
        first_match_pos = len(content)
        
        for term in query_terms:
            pos = content_lower.find(term.lower())
            if pos != -1 and pos < first_match_pos:
                first_match_pos = pos
        
        if first_match_pos == len(content):
            # No matches found, return beginning of content
            return content[:snippet_length] + "..." if len(content) > snippet_length else content
        
        # Extract snippet around the match
        start_pos = max(0, first_match_pos - snippet_length // 2)
        end_pos = min(len(content), start_pos + snippet_length)
        
        snippet = content[start_pos:end_pos]
        
        # Add ellipsis if truncated
        if start_pos > 0:
            snippet = "..." + snippet
        if end_pos < len(content):
            snippet = snippet + "..."
        
        return snippet
    
    def get_search_suggestions(self, partial_query: str, limit: int = 10) -> List[str]:
        """Get search suggestions based on partial query"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT term FROM search_terms 
            WHERE term LIKE ? 
            ORDER BY frequency DESC, last_used DESC 
            LIMIT ?
        """, (f"{partial_query}%", limit))
        
        suggestions = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        return suggestions
    
    def get_faceted_search_options(self) -> Dict[str, List[str]]:
        """Get available options for faceted search"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get all unique values for faceted search
        cursor.execute("""
            SELECT DISTINCT content_type, jurisdictions, industries, regulation_tags
            FROM content_index
        """)
        
        facets = {
            'content_types': [],
            'jurisdictions': set(),
            'industries': set(),
            'regulations': set()
        }
        
        for row in cursor.fetchall():
            content_type, jurisdictions, industries, regulation_tags = row
            
            # Add content type
            if content_type not in facets['content_types']:
                facets['content_types'].append(content_type)
            
            # Parse and add jurisdictions
            try:
                juris_list = json.loads(jurisdictions or '[]')
                facets['jurisdictions'].update(juris_list)
            except:
                pass
            
            # Parse and add industries
            try:
                ind_list = json.loads(industries or '[]')
                facets['industries'].update(ind_list)
            except:
                pass
            
            # Parse and add regulations
            try:
                reg_list = json.loads(regulation_tags or '[]')
                facets['regulations'].update(reg_list)
            except:
                pass
        
        # Convert sets to sorted lists
        facets['jurisdictions'] = sorted(list(facets['jurisdictions']))
        facets['industries'] = sorted(list(facets['industries']))
        facets['regulations'] = sorted(list(facets['regulations']))
        
        conn.close()
        return facets
    
    def extract_search_terms(self, text: str, content_type: ContentType):
        """Extract and index search terms from content"""
        # Clean and tokenize text
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        
        # Filter common words
        stop_words = {
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
            'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
            'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
            'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
        }
        
        terms = [word for word in words if word not in stop_words]
        
        # Update search terms table
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for term in set(terms):  # Use set to avoid duplicates
            cursor.execute("""
                INSERT OR IGNORE INTO search_terms (term, content_types)
                VALUES (?, ?)
            """, (term, content_type.value))
            
            cursor.execute("""
                UPDATE search_terms 
                SET frequency = frequency + 1, last_used = CURRENT_TIMESTAMP
                WHERE term = ?
            """, (term,))
        
        conn.commit()
        conn.close()
    
    def log_search(self, query: str, filters: SearchFilters, 
                   result_count: int, search_time: float):
        """Log search query for analytics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        filters_json = json.dumps({
            'content_types': [ct.value for ct in filters.content_types],
            'jurisdictions': filters.jurisdictions,
            'industries': filters.industries,
            'regulations': filters.regulations,
            'min_relevance': filters.min_relevance
        })
        
        cursor.execute("""
            INSERT INTO search_history 
            (query, filters, result_count, search_time)
            VALUES (?, ?, ?, ?)
        """, (query, filters_json, result_count, search_time))
        
        conn.commit()
        conn.close()
    
    def get_search_analytics(self, days: int = 30) -> Dict[str, Any]:
        """Get search analytics for specified period"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        since_date = datetime.now() - datetime.timedelta(days=days)
        
        # Get search volume
        cursor.execute("""
            SELECT COUNT(*) as total_searches
            FROM search_history 
            WHERE timestamp >= ?
        """, (since_date,))
        total_searches = cursor.fetchone()[0]
        
        # Get average search time
        cursor.execute("""
            SELECT AVG(search_time) as avg_time
            FROM search_history 
            WHERE timestamp >= ?
        """, (since_date,))
        avg_search_time = cursor.fetchone()[0] or 0
        
        # Get top queries
        cursor.execute("""
            SELECT query, COUNT(*) as frequency
            FROM search_history 
            WHERE timestamp >= ?
            GROUP BY query
            ORDER BY frequency DESC
            LIMIT 10
        """, (since_date,))
        top_queries = [{'query': row[0], 'frequency': row[1]} 
                      for row in cursor.fetchall()]
        
        # Get search result distribution
        cursor.execute("""
            SELECT 
                CASE 
                    WHEN result_count = 0 THEN '0'
                    WHEN result_count <= 5 THEN '1-5'
                    WHEN result_count <= 20 THEN '6-20'
                    ELSE '20+'
                END as result_range,
                COUNT(*) as count
            FROM search_history 
            WHERE timestamp >= ?
            GROUP BY result_range
            ORDER BY result_range
        """, (since_date,))
        result_distribution = [{'range': row[0], 'count': row[1]} 
                             for row in cursor.fetchall()]
        
        conn.close()
        
        return {
            'period_days': days,
            'total_searches': total_searches,
            'avg_search_time': round(avg_search_time, 3),
            'top_queries': top_queries,
            'result_distribution': result_distribution
        }
    
    def load_search_index(self):
        """Load all knowledge base content into search index"""
        # This would typically scan the knowledge base directory
        # and index all markdown and other content files
        pass


# Example usage and API functions
def search_regulations(query: str, jurisdiction: str = None, 
                      industry: str = None) -> List[SearchResult]:
    """
    Convenient function to search regulations
    """
    search_engine = ComplianceSearchEngine("./knowledge_base/compliance")
    
    filters = SearchFilters()
    filters.content_types = [ContentType.REGULATION]
    
    if jurisdiction:
        filters.jurisdictions = [jurisdiction]
    
    if industry:
        filters.industries = [industry]
    
    return search_engine.search(query, filters)


def search_policies(query: str, regulation: str = None) -> List[SearchResult]:
    """
    Convenient function to search policy templates
    """
    search_engine = ComplianceSearchEngine("./knowledge_base/compliance")
    
    filters = SearchFilters()
    filters.content_types = [ContentType.POLICY]
    
    if regulation:
        filters.regulations = [regulation]
    
    return search_engine.search(query, filters)


def search_workflows(query: str, process_type: str = None) -> List[SearchResult]:
    """
    Convenient function to search workflows
    """
    search_engine = ComplianceSearchEngine("./knowledge_base/compliance")
    
    filters = SearchFilters()
    filters.content_types = [ContentType.WORKFLOW]
    
    return search_engine.search(query, filters)


if __name__ == "__main__":
    # Example usage
    search_engine = ComplianceSearchEngine("./knowledge_base/compliance")
    
    # Search for GDPR-related content
    results = search_engine.search(
        "data protection GDPR",
        SearchFilters(jurisdictions=["EU"])
    )
    
    for result in results[:5]:
        print(f"Title: {result.title}")
        print(f"Type: {result.content_type.value}")
        print(f"Relevance: {result.relevance_score:.3f}")
        print(f"Snippet: {result.highlight_snippet}")
        print("-" * 50)
