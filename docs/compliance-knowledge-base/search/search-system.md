# Compliance Knowledge Base Search System

## Overview

This document describes the advanced search functionality and version tracking system for the Frontier Compliance Knowledge Base. The system provides intelligent search capabilities, content discovery, cross-referencing, and comprehensive version management for regulatory updates and knowledge assets.

## 🔍 Search Architecture

### Multi-Modal Search System

#### Search Components
```yaml
search_architecture:
  search_engines:
    elasticsearch:
      purpose: "Full-text search and analytics"
      features:
        - multi_language_support: "Search in multiple languages"
        - fuzzy_matching: "Approximate string matching"
        - auto_complete: "Real-time search suggestions"
        - faceted_search: "Filter by multiple attributes"
      
      indices:
        - regulations: "Regulatory documents and updates"
        - policies: "Policy templates and procedures"
        - risk_assessments: "Risk methodologies and frameworks"
        - workflows: "Compliance workflows and processes"
        - industry_guides: "Industry-specific guidance"
    
    vector_search:
      purpose: "Semantic similarity search"
      technology: "Sentence transformers and embeddings"
      features:
        - semantic_search: "Meaning-based search beyond keywords"
        - concept_matching: "Find related concepts and topics"
        - cross_reference: "Identify related content across domains"
        - recommendation_engine: "Suggest relevant content"
    
    knowledge_graph:
      purpose: "Relationship-based search and discovery"
      features:
        - entity_relationships: "Map relationships between entities"
        - regulatory_connections: "Link regulations to requirements"
        - impact_analysis: "Trace regulatory change impacts"
        - dependency_mapping: "Identify compliance dependencies"
```

#### Search Implementation
```python
# Advanced Search System Implementation
from elasticsearch import Elasticsearch
from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Dict, Optional, Tuple
import json
from datetime import datetime
import logging

class ComplianceSearchEngine:
    def __init__(self, elasticsearch_host: str = "localhost:9200"):
        self.es = Elasticsearch([elasticsearch_host])
        self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.knowledge_graph = ComplianceKnowledgeGraph()
        
        # Initialize indices
        self._setup_indices()
    
    def _setup_indices(self):
        """Setup Elasticsearch indices with proper mappings"""
        indices = {
            'regulations': {
                'mappings': {
                    'properties': {
                        'title': {'type': 'text', 'analyzer': 'standard'},
                        'content': {'type': 'text', 'analyzer': 'standard'},
                        'regulation_type': {'type': 'keyword'},
                        'jurisdiction': {'type': 'keyword'},
                        'effective_date': {'type': 'date'},
                        'last_updated': {'type': 'date'},
                        'version': {'type': 'keyword'},
                        'impact_level': {'type': 'integer'},
                        'business_areas': {'type': 'keyword'},
                        'embedding': {'type': 'dense_vector', 'dims': 384}
                    }
                }
            },
            'policies': {
                'mappings': {
                    'properties': {
                        'title': {'type': 'text', 'analyzer': 'standard'},
                        'content': {'type': 'text', 'analyzer': 'standard'},
                        'policy_type': {'type': 'keyword'},
                        'industry': {'type': 'keyword'},
                        'compliance_framework': {'type': 'keyword'},
                        'created_date': {'type': 'date'},
                        'last_modified': {'type': 'date'},
                        'version': {'type': 'keyword'},
                        'approval_status': {'type': 'keyword'},
                        'embedding': {'type': 'dense_vector', 'dims': 384}
                    }
                }
            }
        }
        
        for index_name, config in indices.items():
            if not self.es.indices.exists(index=index_name):
                self.es.indices.create(index=index_name, body=config)
    
    def index_document(self, index: str, doc_id: str, document: Dict):
        """Index a document with embedding generation"""
        # Generate embedding for semantic search
        text_content = f"{document.get('title', '')} {document.get('content', '')}"
        embedding = self.sentence_model.encode(text_content).tolist()
        document['embedding'] = embedding
        
        # Index document
        self.es.index(index=index, id=doc_id, body=document)
        
        # Update knowledge graph
        self.knowledge_graph.add_document(doc_id, document)
    
    def search(self, query: str, indices: List[str] = None, 
               filters: Dict = None, search_type: str = "hybrid") -> Dict:
        """
        Perform advanced search across compliance knowledge base
        
        Args:
            query: Search query string
            indices: List of indices to search (default: all)
            filters: Additional filters to apply
            search_type: Type of search (text, semantic, hybrid)
        """
        if indices is None:
            indices = ['regulations', 'policies', 'risk_assessments', 'workflows']
        
        results = {
            'total_hits': 0,
            'results': [],
            'facets': {},
            'suggestions': [],
            'related_content': []
        }
        
        if search_type in ['text', 'hybrid']:
            text_results = self._text_search(query, indices, filters)
            results['results'].extend(text_results['hits'])
            results['facets'] = text_results.get('facets', {})
        
        if search_type in ['semantic', 'hybrid']:
            semantic_results = self._semantic_search(query, indices, filters)
            results['results'].extend(semantic_results['hits'])
        
        # Remove duplicates and merge scores for hybrid search
        if search_type == 'hybrid':
            results['results'] = self._merge_search_results(results['results'])
        
        # Add related content and suggestions
        results['related_content'] = self._get_related_content(query, results['results'])
        results['suggestions'] = self._get_search_suggestions(query)
        results['total_hits'] = len(results['results'])
        
        return results
    
    def _text_search(self, query: str, indices: List[str], 
                    filters: Dict = None) -> Dict:
        """Perform full-text search"""
        search_body = {
            'query': {
                'bool': {
                    'must': [
                        {
                            'multi_match': {
                                'query': query,
                                'fields': ['title^2', 'content'],
                                'type': 'best_fields',
                                'fuzziness': 'AUTO'
                            }
                        }
                    ]
                }
            },
            'highlight': {
                'fields': {
                    'title': {},
                    'content': {'fragment_size': 150, 'number_of_fragments': 3}
                }
            },
            'size': 50,
            'aggs': {
                'regulation_types': {'terms': {'field': 'regulation_type'}},
                'jurisdictions': {'terms': {'field': 'jurisdiction'}},
                'business_areas': {'terms': {'field': 'business_areas'}}
            }
        }
        
        # Add filters
        if filters:
            search_body['query']['bool']['filter'] = []
            for field, value in filters.items():
                search_body['query']['bool']['filter'].append({
                    'term': {field: value}
                })
        
        response = self.es.search(index=indices, body=search_body)
        
        return {
            'hits': [self._format_search_hit(hit) for hit in response['hits']['hits']],
            'facets': response.get('aggregations', {})
        }
    
    def _semantic_search(self, query: str, indices: List[str], 
                        filters: Dict = None) -> Dict:
        """Perform semantic similarity search"""
        query_embedding = self.sentence_model.encode(query).tolist()
        
        search_body = {
            'query': {
                'script_score': {
                    'query': {'match_all': {}},
                    'script': {
                        'source': "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                        'params': {'query_vector': query_embedding}
                    }
                }
            },
            'size': 50
        }
        
        # Add filters
        if filters:
            search_body['query']['script_score']['query'] = {
                'bool': {
                    'must': [{'match_all': {}}],
                    'filter': [{'term': {field: value}} for field, value in filters.items()]
                }
            }
        
        response = self.es.search(index=indices, body=search_body)
        
        return {
            'hits': [self._format_search_hit(hit, semantic=True) 
                    for hit in response['hits']['hits']]
        }
    
    def _format_search_hit(self, hit: Dict, semantic: bool = False) -> Dict:
        """Format search hit for consistent output"""
        source = hit['_source']
        
        result = {
            'id': hit['_id'],
            'index': hit['_index'],
            'score': hit['_score'],
            'title': source.get('title', ''),
            'content_preview': source.get('content', '')[:300] + '...',
            'metadata': {
                'type': source.get('regulation_type') or source.get('policy_type'),
                'jurisdiction': source.get('jurisdiction'),
                'industry': source.get('industry'),
                'last_updated': source.get('last_updated'),
                'version': source.get('version')
            }
        }
        
        if 'highlight' in hit:
            result['highlights'] = hit['highlight']
        
        if semantic:
            result['similarity_score'] = hit['_score'] - 1.0  # Normalize cosine similarity
        
        return result
    
    def advanced_search(self, search_criteria: Dict) -> Dict:
        """Advanced search with multiple criteria and filters"""
        query_parts = []
        
        # Text query
        if search_criteria.get('text_query'):
            query_parts.append({
                'multi_match': {
                    'query': search_criteria['text_query'],
                    'fields': ['title^2', 'content'],
                    'type': 'best_fields'
                }
            })
        
        # Date range filter
        if search_criteria.get('date_range'):
            date_range = search_criteria['date_range']
            query_parts.append({
                'range': {
                    'last_updated': {
                        'gte': date_range.get('start'),
                        'lte': date_range.get('end')
                    }
                }
            })
        
        # Regulation type filter
        if search_criteria.get('regulation_types'):
            query_parts.append({
                'terms': {
                    'regulation_type': search_criteria['regulation_types']
                }
            })
        
        # Jurisdiction filter
        if search_criteria.get('jurisdictions'):
            query_parts.append({
                'terms': {
                    'jurisdiction': search_criteria['jurisdictions']
                }
            })
        
        # Business area filter
        if search_criteria.get('business_areas'):
            query_parts.append({
                'terms': {
                    'business_areas': search_criteria['business_areas']
                }
            })
        
        search_body = {
            'query': {
                'bool': {
                    'must': query_parts
                }
            },
            'sort': search_criteria.get('sort', [{'_score': {'order': 'desc'}}]),
            'size': search_criteria.get('size', 20),
            'from': search_criteria.get('from', 0)
        }
        
        indices = search_criteria.get('indices', ['regulations', 'policies'])
        response = self.es.search(index=indices, body=search_body)
        
        return {
            'total_hits': response['hits']['total']['value'],
            'results': [self._format_search_hit(hit) for hit in response['hits']['hits']]
        }
    
    def get_related_documents(self, doc_id: str, index: str, 
                            num_results: int = 10) -> List[Dict]:
        """Find documents related to a specific document"""
        # Get source document
        source_doc = self.es.get(index=index, id=doc_id)['_source']
        
        # Use embedding for similarity search
        if 'embedding' in source_doc:
            return self._semantic_search_by_embedding(
                source_doc['embedding'], [index], num_results
            )
        
        # Fallback to more-like-this query
        search_body = {
            'query': {
                'more_like_this': {
                    'fields': ['title', 'content'],
                    'like': [{'_index': index, '_id': doc_id}],
                    'min_term_freq': 1,
                    'max_query_terms': 12
                }
            },
            'size': num_results
        }
        
        response = self.es.search(index=index, body=search_body)
        return [self._format_search_hit(hit) for hit in response['hits']['hits']]
    
    def auto_complete(self, partial_query: str, field: str = 'title') -> List[str]:
        """Provide auto-complete suggestions"""
        search_body = {
            'suggest': {
                'auto_complete': {
                    'prefix': partial_query,
                    'completion': {
                        'field': f'{field}.suggest',
                        'size': 10
                    }
                }
            }
        }
        
        response = self.es.search(body=search_body)
        suggestions = response['suggest']['auto_complete'][0]['options']
        
        return [suggestion['text'] for suggestion in suggestions]
    
    def search_analytics(self) -> Dict:
        """Generate search analytics and insights"""
        # Most searched terms
        search_body = {
            'size': 0,
            'aggs': {
                'popular_terms': {
                    'significant_text': {
                        'field': 'content',
                        'size': 20
                    }
                },
                'search_trends': {
                    'date_histogram': {
                        'field': 'last_updated',
                        'calendar_interval': 'month'
                    }
                }
            }
        }
        
        response = self.es.search(index='_all', body=search_body)
        
        return {
            'popular_terms': response['aggregations']['popular_terms']['buckets'],
            'search_trends': response['aggregations']['search_trends']['buckets'],
            'total_documents': response['hits']['total']['value']
        }

class ComplianceKnowledgeGraph:
    """Knowledge graph for compliance relationships"""
    
    def __init__(self):
        self.entities = {}
        self.relationships = {}
    
    def add_document(self, doc_id: str, document: Dict):
        """Add document to knowledge graph"""
        # Extract entities and relationships
        entities = self._extract_entities(document)
        relationships = self._extract_relationships(document, entities)
        
        self.entities[doc_id] = entities
        self.relationships[doc_id] = relationships
    
    def _extract_entities(self, document: Dict) -> List[Dict]:
        """Extract entities from document"""
        # This would use NER (Named Entity Recognition) in practice
        entities = []
        
        # Extract regulation names
        regulation_patterns = [
            'GDPR', 'HIPAA', 'SOX', 'PCI DSS', 'Basel III', 'MiFID II'
        ]
        
        content = document.get('content', '')
        for pattern in regulation_patterns:
            if pattern in content:
                entities.append({
                    'type': 'regulation',
                    'name': pattern,
                    'mentions': content.count(pattern)
                })
        
        return entities
    
    def _extract_relationships(self, document: Dict, entities: List[Dict]) -> List[Dict]:
        """Extract relationships between entities"""
        relationships = []
        
        # Example: if document mentions multiple regulations, they're related
        regulations = [e for e in entities if e['type'] == 'regulation']
        for i, reg1 in enumerate(regulations):
            for reg2 in regulations[i+1:]:
                relationships.append({
                    'type': 'co_occurrence',
                    'source': reg1['name'],
                    'target': reg2['name'],
                    'strength': min(reg1['mentions'], reg2['mentions'])
                })
        
        return relationships
    
    def find_related_entities(self, entity_name: str) -> List[Dict]:
        """Find entities related to a given entity"""
        related = []
        
        for doc_id, relationships in self.relationships.items():
            for rel in relationships:
                if rel['source'] == entity_name or rel['target'] == entity_name:
                    related.append({
                        'entity': rel['target'] if rel['source'] == entity_name else rel['source'],
                        'relationship_type': rel['type'],
                        'strength': rel['strength'],
                        'source_document': doc_id
                    })
        
        return related

# Example usage and search interface
class SearchInterface:
    def __init__(self):
        self.search_engine = ComplianceSearchEngine()
    
    def search_regulations(self, query: str, jurisdiction: str = None, 
                          regulation_type: str = None) -> Dict:
        """Search specifically for regulations"""
        filters = {}
        if jurisdiction:
            filters['jurisdiction'] = jurisdiction
        if regulation_type:
            filters['regulation_type'] = regulation_type
        
        return self.search_engine.search(
            query=query,
            indices=['regulations'],
            filters=filters,
            search_type='hybrid'
        )
    
    def search_policies(self, query: str, industry: str = None, 
                       policy_type: str = None) -> Dict:
        """Search specifically for policy templates"""
        filters = {}
        if industry:
            filters['industry'] = industry
        if policy_type:
            filters['policy_type'] = policy_type
        
        return self.search_engine.search(
            query=query,
            indices=['policies'],
            filters=filters,
            search_type='hybrid'
        )
    
    def regulatory_impact_search(self, regulation_name: str) -> Dict:
        """Find all content related to a specific regulation"""
        search_criteria = {
            'text_query': regulation_name,
            'indices': ['regulations', 'policies', 'risk_assessments', 'workflows'],
            'sort': [{'last_updated': {'order': 'desc'}}],
            'size': 50
        }
        
        results = self.search_engine.advanced_search(search_criteria)
        
        # Add impact analysis
        results['impact_analysis'] = self._analyze_regulatory_impact(
            regulation_name, results['results']
        )
        
        return results
    
    def _analyze_regulatory_impact(self, regulation_name: str, 
                                  documents: List[Dict]) -> Dict:
        """Analyze the impact of a regulation across documents"""
        business_areas = set()
        policy_types = set()
        jurisdictions = set()
        
        for doc in documents:
            metadata = doc.get('metadata', {})
            if metadata.get('business_areas'):
                business_areas.update(metadata['business_areas'])
            if metadata.get('type'):
                policy_types.add(metadata['type'])
            if metadata.get('jurisdiction'):
                jurisdictions.add(metadata['jurisdiction'])
        
        return {
            'affected_business_areas': list(business_areas),
            'related_policy_types': list(policy_types),
            'applicable_jurisdictions': list(jurisdictions),
            'total_related_documents': len(documents)
        }

# Initialize search system
search_interface = SearchInterface()

# Example searches
gdpr_results = search_interface.search_regulations("data protection", jurisdiction="EU")
policy_results = search_interface.search_policies("privacy policy template", industry="healthcare")
impact_analysis = search_interface.regulatory_impact_search("GDPR")
```

## 📊 Search Features and Capabilities

### Advanced Search Features
```yaml
search_features:
  query_processing:
    natural_language:
      - intent_recognition: "Understand user search intent"
      - entity_extraction: "Extract key entities from queries"
      - query_expansion: "Expand queries with synonyms and related terms"
      - spell_correction: "Automatic spelling correction"
    
    structured_queries:
      - boolean_operators: "AND, OR, NOT operators"
      - field_specific: "Search specific fields (title, content, metadata)"
      - wildcards: "Wildcard and pattern matching"
      - proximity_search: "Search for terms within proximity"
  
  filtering_faceting:
    faceted_search:
      - regulation_type: "Filter by regulation type"
      - jurisdiction: "Filter by geographic jurisdiction"
      - industry: "Filter by industry sector"
      - business_area: "Filter by business function"
      - date_range: "Filter by date ranges"
      - document_type: "Filter by document type"
    
    dynamic_filtering:
      - auto_suggest_filters: "Suggest relevant filters based on search"
      - hierarchical_filters: "Nested filter categories"
      - multi_select_filters: "Multiple filter selection"
      - filter_dependencies: "Smart filter dependencies"
  
  result_presentation:
    ranking_relevance:
      - relevance_scoring: "Multi-factor relevance scoring"
      - personalization: "Personalized search results"
      - freshness_boost: "Boost recent content"
      - authority_scoring: "Content authority and credibility scoring"
    
    result_formatting:
      - highlighted_snippets: "Highlighted search term matches"
      - structured_snippets: "Structured result snippets"
      - rich_previews: "Rich content previews"
      - related_suggestions: "Related content suggestions"
```

### Search Analytics and Insights
```yaml
search_analytics:
  usage_analytics:
    search_patterns:
      - popular_queries: "Most frequently searched terms"
      - query_trends: "Search trend analysis over time"
      - zero_results: "Queries returning no results"
      - click_through_rates: "Result click-through analysis"
    
    user_behavior:
      - search_sessions: "User search session analysis"
      - refinement_patterns: "Query refinement analysis"
      - abandonment_rates: "Search abandonment analysis"
      - conversion_tracking: "Search to action conversion"
  
  content_analytics:
    content_performance:
      - content_popularity: "Most accessed content"
      - content_gaps: "Identified content gaps"
      - outdated_content: "Content requiring updates"
      - orphaned_content: "Rarely accessed content"
    
    search_optimization:
      - search_effectiveness: "Search result quality metrics"
      - content_discoverability: "Content discovery analysis"
      - search_satisfaction: "User satisfaction with search results"
      - optimization_recommendations: "Search improvement recommendations"
```

## 🔄 Version Tracking System

### Comprehensive Version Management

#### Version Control Architecture
```yaml
version_control_system:
  versioning_strategy:
    semantic_versioning:
      - major_version: "Breaking changes or significant updates"
      - minor_version: "New features or enhancements"
      - patch_version: "Bug fixes and minor corrections"
      - build_metadata: "Build information and timestamps"
    
    content_versioning:
      - document_versions: "Complete document version history"
      - section_versions: "Granular section-level versioning"
      - change_tracking: "Track all changes with metadata"
      - approval_workflow: "Version approval and publishing workflow"
  
  change_management:
    change_detection:
      - content_comparison: "Automated content comparison"
      - change_classification: "Classify types of changes"
      - impact_assessment: "Assess change impact"
      - notification_system: "Alert stakeholders of changes"
    
    change_approval:
      - review_workflow: "Multi-stage review process"
      - approval_matrix: "Role-based approval requirements"
      - change_documentation: "Document change rationale"
      - rollback_capability: "Ability to rollback changes"
  
  regulatory_tracking:
    regulation_lifecycle:
      - draft_versions: "Track regulation drafts and proposals"
      - comment_periods: "Track public comment periods"
      - final_rules: "Track final rule publications"
      - implementation_dates: "Track effective dates and deadlines"
    
    compliance_mapping:
      - requirement_mapping: "Map regulations to requirements"
      - control_mapping: "Map requirements to controls"
      - policy_mapping: "Map controls to policies"
      - change_propagation: "Track change propagation"
```

#### Version Control Implementation
```python
# Version Control and Change Tracking System
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum
import hashlib
import json
import difflib

class ChangeType(Enum):
    CREATED = "created"
    MODIFIED = "modified"
    DELETED = "deleted"
    APPROVED = "approved"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class VersionStatus(Enum):
    DRAFT = "draft"
    REVIEW = "review"
    APPROVED = "approved"
    PUBLISHED = "published"
    ARCHIVED = "archived"

@dataclass
class VersionMetadata:
    version_number: str
    created_date: datetime
    created_by: str
    status: VersionStatus
    change_type: ChangeType
    change_summary: str
    change_details: str
    approval_history: List[Dict] = field(default_factory=list)
    effective_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None

@dataclass
class ContentVersion:
    document_id: str
    version_metadata: VersionMetadata
    content: str
    content_hash: str
    parent_version: Optional[str] = None
    child_versions: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    regulatory_references: List[str] = field(default_factory=list)

class ComplianceVersionControl:
    def __init__(self):
        self.documents = {}
        self.versions = {}
        self.change_log = []
        self.approval_workflows = {}
    
    def create_document(self, document_id: str, content: str, 
                       created_by: str, metadata: Dict = None) -> str:
        """Create a new document with initial version"""
        version_number = "1.0.0"
        content_hash = self._calculate_hash(content)
        
        version_metadata = VersionMetadata(
            version_number=version_number,
            created_date=datetime.now(),
            created_by=created_by,
            status=VersionStatus.DRAFT,
            change_type=ChangeType.CREATED,
            change_summary="Initial document creation",
            change_details="Document created"
        )
        
        if metadata:
            version_metadata.effective_date = metadata.get('effective_date')
            version_metadata.expiration_date = metadata.get('expiration_date')
        
        version = ContentVersion(
            document_id=document_id,
            version_metadata=version_metadata,
            content=content,
            content_hash=content_hash
        )
        
        version_id = f"{document_id}:{version_number}"
        self.versions[version_id] = version
        
        if document_id not in self.documents:
            self.documents[document_id] = {
                'current_version': version_number,
                'all_versions': [version_number],
                'created_date': datetime.now(),
                'created_by': created_by
            }
        
        self._log_change(document_id, version_number, ChangeType.CREATED, created_by)
        return version_id
    
    def create_version(self, document_id: str, content: str, 
                      modified_by: str, change_summary: str,
                      change_details: str = "") -> str:
        """Create a new version of an existing document"""
        if document_id not in self.documents:
            raise ValueError(f"Document {document_id} does not exist")
        
        current_version = self.documents[document_id]['current_version']
        new_version = self._increment_version(current_version, content)
        content_hash = self._calculate_hash(content)
        
        version_metadata = VersionMetadata(
            version_number=new_version,
            created_date=datetime.now(),
            created_by=modified_by,
            status=VersionStatus.DRAFT,
            change_type=ChangeType.MODIFIED,
            change_summary=change_summary,
            change_details=change_details
        )
        
        version = ContentVersion(
            document_id=document_id,
            version_metadata=version_metadata,
            content=content,
            content_hash=content_hash,
            parent_version=current_version
        )
        
        version_id = f"{document_id}:{new_version}"
        self.versions[version_id] = version
        
        # Update parent version with child reference
        parent_version_id = f"{document_id}:{current_version}"
        if parent_version_id in self.versions:
            self.versions[parent_version_id].child_versions.append(new_version)
        
        # Update document metadata
        self.documents[document_id]['all_versions'].append(new_version)
        
        self._log_change(document_id, new_version, ChangeType.MODIFIED, modified_by)
        return version_id
    
    def _increment_version(self, current_version: str, content: str) -> str:
        """Determine new version number based on change magnitude"""
        # Simple versioning logic - in practice, this would be more sophisticated
        parts = current_version.split('.')
        major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])
        
        # For now, increment minor version for all changes
        # In practice, this would analyze the type and magnitude of changes
        minor += 1
        return f"{major}.{minor}.{patch}"
    
    def get_version(self, document_id: str, version_number: str = None) -> ContentVersion:
        """Get a specific version of a document"""
        if version_number is None:
            version_number = self.documents[document_id]['current_version']
        
        version_id = f"{document_id}:{version_number}"
        if version_id not in self.versions:
            raise ValueError(f"Version {version_id} does not exist")
        
        return self.versions[version_id]
    
    def get_version_history(self, document_id: str) -> List[ContentVersion]:
        """Get complete version history for a document"""
        if document_id not in self.documents:
            raise ValueError(f"Document {document_id} does not exist")
        
        versions = []
        for version_number in self.documents[document_id]['all_versions']:
            version_id = f"{document_id}:{version_number}"
            if version_id in self.versions:
                versions.append(self.versions[version_id])
        
        return sorted(versions, key=lambda v: v.version_metadata.created_date, reverse=True)
    
    def compare_versions(self, document_id: str, version1: str, 
                        version2: str) -> Dict:
        """Compare two versions of a document"""
        v1 = self.get_version(document_id, version1)
        v2 = self.get_version(document_id, version2)
        
        # Generate unified diff
        diff = list(difflib.unified_diff(
            v1.content.splitlines(keepends=True),
            v2.content.splitlines(keepends=True),
            fromfile=f"Version {version1}",
            tofile=f"Version {version2}"
        ))
        
        # Count changes
        additions = sum(1 for line in diff if line.startswith('+') and not line.startswith('+++'))
        deletions = sum(1 for line in diff if line.startswith('-') and not line.startswith('---'))
        
        return {
            'document_id': document_id,
            'version1': version1,
            'version2': version2,
            'diff': ''.join(diff),
            'additions': additions,
            'deletions': deletions,
            'total_changes': additions + deletions,
            'version1_metadata': v1.version_metadata,
            'version2_metadata': v2.version_metadata
        }
    
    def approve_version(self, document_id: str, version_number: str,
                       approved_by: str, approval_comments: str = "") -> bool:
        """Approve a version for publication"""
        version_id = f"{document_id}:{version_number}"
        if version_id not in self.versions:
            raise ValueError(f"Version {version_id} does not exist")
        
        version = self.versions[version_id]
        
        # Add approval to history
        approval_record = {
            'approved_by': approved_by,
            'approval_date': datetime.now(),
            'comments': approval_comments
        }
        version.version_metadata.approval_history.append(approval_record)
        version.version_metadata.status = VersionStatus.APPROVED
        
        self._log_change(document_id, version_number, ChangeType.APPROVED, approved_by)
        return True
    
    def publish_version(self, document_id: str, version_number: str,
                       published_by: str) -> bool:
        """Publish an approved version"""
        version_id = f"{document_id}:{version_number}"
        if version_id not in self.versions:
            raise ValueError(f"Version {version_id} does not exist")
        
        version = self.versions[version_id]
        
        if version.version_metadata.status != VersionStatus.APPROVED:
            raise ValueError("Version must be approved before publishing")
        
        version.version_metadata.status = VersionStatus.PUBLISHED
        self.documents[document_id]['current_version'] = version_number
        
        self._log_change(document_id, version_number, ChangeType.PUBLISHED, published_by)
        return True
    
    def track_regulatory_changes(self, regulation_id: str, 
                               change_description: str, 
                               effective_date: datetime,
                               impact_assessment: Dict) -> str:
        """Track regulatory changes and their impact"""
        change_id = f"REG-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        regulatory_change = {
            'change_id': change_id,
            'regulation_id': regulation_id,
            'description': change_description,
            'effective_date': effective_date,
            'detected_date': datetime.now(),
            'impact_assessment': impact_assessment,
            'affected_documents': self._find_affected_documents(regulation_id),
            'implementation_status': 'pending'
        }
        
        # Store regulatory change
        if not hasattr(self, 'regulatory_changes'):
            self.regulatory_changes = {}
        self.regulatory_changes[change_id] = regulatory_change
        
        # Trigger impact analysis
        self._analyze_change_impact(regulatory_change)
        
        return change_id
    
    def _find_affected_documents(self, regulation_id: str) -> List[str]:
        """Find documents affected by regulatory change"""
        affected_documents = []
        
        for doc_id, doc_info in self.documents.items():
            current_version = doc_info['current_version']
            version_id = f"{doc_id}:{current_version}"
            version = self.versions.get(version_id)
            
            if version and regulation_id in version.regulatory_references:
                affected_documents.append(doc_id)
            elif version and regulation_id.lower() in version.content.lower():
                affected_documents.append(doc_id)
        
        return affected_documents
    
    def _analyze_change_impact(self, regulatory_change: Dict):
        """Analyze the impact of regulatory changes"""
        impact_analysis = {
            'affected_document_count': len(regulatory_change['affected_documents']),
            'estimated_effort_hours': len(regulatory_change['affected_documents']) * 8,
            'priority_level': self._determine_priority(regulatory_change),
            'recommended_actions': self._generate_recommendations(regulatory_change)
        }
        
        regulatory_change['detailed_impact_analysis'] = impact_analysis
    
    def _determine_priority(self, regulatory_change: Dict) -> str:
        """Determine priority level for regulatory change"""
        days_until_effective = (regulatory_change['effective_date'] - datetime.now()).days
        affected_count = len(regulatory_change['affected_documents'])
        
        if days_until_effective < 30 or affected_count > 10:
            return "HIGH"
        elif days_until_effective < 90 or affected_count > 5:
            return "MEDIUM"
        else:
            return "LOW"
    
    def _generate_recommendations(self, regulatory_change: Dict) -> List[str]:
        """Generate recommendations for handling regulatory change"""
        recommendations = []
        
        affected_count = len(regulatory_change['affected_documents'])
        
        if affected_count > 0:
            recommendations.append(f"Review and update {affected_count} affected documents")
        
        recommendations.append("Conduct gap analysis against new requirements")
        recommendations.append("Update compliance training materials")
        recommendations.append("Review and test compliance controls")
        
        return recommendations
    
    def _calculate_hash(self, content: str) -> str:
        """Calculate SHA-256 hash of content"""
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
    
    def _log_change(self, document_id: str, version_number: str, 
                   change_type: ChangeType, user: str):
        """Log change to audit trail"""
        change_record = {
            'timestamp': datetime.now(),
            'document_id': document_id,
            'version_number': version_number,
            'change_type': change_type.value,
            'user': user
        }
        self.change_log.append(change_record)
    
    def get_change_report(self, start_date: datetime = None, 
                         end_date: datetime = None) -> Dict:
        """Generate change report for specified period"""
        if start_date is None:
            start_date = datetime.now().replace(day=1)  # Start of current month
        if end_date is None:
            end_date = datetime.now()
        
        relevant_changes = [
            change for change in self.change_log
            if start_date <= change['timestamp'] <= end_date
        ]
        
        # Aggregate statistics
        change_counts = {}
        user_activity = {}
        document_activity = {}
        
        for change in relevant_changes:
            change_type = change['change_type']
            user = change['user']
            doc_id = change['document_id']
            
            change_counts[change_type] = change_counts.get(change_type, 0) + 1
            user_activity[user] = user_activity.get(user, 0) + 1
            document_activity[doc_id] = document_activity.get(doc_id, 0) + 1
        
        return {
            'report_period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'total_changes': len(relevant_changes),
            'changes_by_type': change_counts,
            'user_activity': user_activity,
            'document_activity': document_activity,
            'most_active_documents': sorted(
                document_activity.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:10]
        }

# Example usage
version_control = ComplianceVersionControl()

# Create initial document
doc_id = version_control.create_document(
    document_id="GDPR-001",
    content="Initial GDPR compliance policy...",
    created_by="compliance@company.com",
    metadata={'effective_date': datetime(2024, 1, 1)}
)

# Create new version
new_version_id = version_control.create_version(
    document_id="GDPR-001",
    content="Updated GDPR compliance policy with new requirements...",
    modified_by="compliance@company.com",
    change_summary="Updated for new GDPR guidance",
    change_details="Added sections on data minimization and consent management"
)

# Approve and publish
version_control.approve_version("GDPR-001", "1.1.0", "manager@company.com")
version_control.publish_version("GDPR-001", "1.1.0", "compliance@company.com")

# Track regulatory change
reg_change_id = version_control.track_regulatory_changes(
    regulation_id="GDPR",
    change_description="New guidance on international data transfers",
    effective_date=datetime(2024, 6, 1),
    impact_assessment={'severity': 'medium', 'scope': 'international_operations'}
)
```

## 📈 Search and Version Analytics

### Performance Monitoring
```yaml
performance_metrics:
  search_performance:
    response_times:
      - average_response_time: "Average search response time"
      - 95th_percentile: "95th percentile response time"
      - search_throughput: "Searches per second"
      - index_size: "Total index size and growth"
    
    quality_metrics:
      - precision_recall: "Search precision and recall metrics"
      - click_through_rate: "Result click-through rates"
      - user_satisfaction: "User satisfaction with search results"
      - zero_result_rate: "Percentage of searches with no results"
  
  version_control_metrics:
    change_velocity:
      - documents_per_month: "Documents created/modified per month"
      - average_version_lifetime: "Average time between versions"
      - approval_cycle_time: "Time from draft to published"
      - regulatory_response_time: "Time to respond to regulatory changes"
    
    quality_indicators:
      - rollback_rate: "Percentage of versions rolled back"
      - approval_success_rate: "Percentage of versions approved"
      - compliance_coverage: "Percentage of regulations covered"
      - content_freshness: "Average age of published content"
```

---

*This search and version tracking system provides comprehensive capabilities for managing and discovering compliance knowledge. The system supports both traditional and semantic search while maintaining complete audit trails and version control for all regulatory content.*
