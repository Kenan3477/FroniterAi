"""
Strategic Planning Capability for Frontier Business Operations Module

Advanced strategic planning system that provides:
- SWOT analysis and competitive intelligence
- Market analysis and opportunity assessment
- Strategic roadmapping and scenario planning
- Business model design and optimization
- Risk assessment and contingency planning
- Performance measurement and KPI frameworks
"""

from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import numpy as np
import json
from collections import defaultdict

class StrategicFramework(Enum):
    """Strategic planning frameworks and methodologies"""
    SWOT = "swot_analysis"
    PORTER_FIVE_FORCES = "porter_five_forces"
    PESTEL = "pestel_analysis"
    BLUE_OCEAN = "blue_ocean_strategy"
    BALANCED_SCORECARD = "balanced_scorecard"
    OKR = "objectives_key_results"
    VALUE_CHAIN = "value_chain_analysis"
    BUSINESS_MODEL_CANVAS = "business_model_canvas"

class CompetitivePosition(Enum):
    """Competitive positioning assessment"""
    MARKET_LEADER = "market_leader"
    CHALLENGER = "challenger"
    FOLLOWER = "follower"
    NICHE_PLAYER = "niche_player"

class StrategicPriority(Enum):
    """Strategic priority levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class TimeHorizon(Enum):
    """Strategic planning time horizons"""
    SHORT_TERM = "short_term"  # 0-1 years
    MEDIUM_TERM = "medium_term"  # 1-3 years
    LONG_TERM = "long_term"  # 3-5+ years

@dataclass
class SWOTAnalysis:
    """SWOT analysis results"""
    strengths: List[Dict[str, Any]]
    weaknesses: List[Dict[str, Any]]
    opportunities: List[Dict[str, Any]]
    threats: List[Dict[str, Any]]
    strategic_implications: Dict[str, Any]
    confidence_score: float

@dataclass
class MarketAnalysis:
    """Market analysis and assessment"""
    market_size: Dict[str, float]
    growth_rate: float
    market_segments: List[Dict[str, Any]]
    competitive_landscape: Dict[str, Any]
    market_trends: List[str]
    barriers_to_entry: List[str]
    customer_needs: List[Dict[str, Any]]

@dataclass
class CompetitiveIntelligence:
    """Competitive intelligence analysis"""
    competitors: List[Dict[str, Any]]
    competitive_position: CompetitivePosition
    competitive_advantages: List[str]
    competitive_threats: List[str]
    market_share_analysis: Dict[str, float]
    benchmarking_results: Dict[str, Any]

@dataclass
class StrategicObjective:
    """Strategic objective definition"""
    objective_id: str
    title: str
    description: str
    priority: StrategicPriority
    time_horizon: TimeHorizon
    success_metrics: List[Dict[str, Any]]
    resource_requirements: Dict[str, Any]
    dependencies: List[str]
    risk_factors: List[str]

@dataclass
class StrategicRoadmap:
    """Strategic roadmap and implementation plan"""
    objectives: List[StrategicObjective]
    milestones: List[Dict[str, Any]]
    resource_allocation: Dict[str, Any]
    timeline: Dict[str, datetime]
    dependencies: Dict[str, List[str]]
    risk_mitigation: Dict[str, Any]

@dataclass
class ScenarioAnalysis:
    """Scenario planning and analysis"""
    scenarios: List[Dict[str, Any]]
    probability_assessments: Dict[str, float]
    impact_analysis: Dict[str, Any]
    contingency_plans: Dict[str, Any]
    recommended_strategies: List[str]

class StrategicPlanningCapability:
    """
    Advanced strategic planning capability providing comprehensive
    strategic analysis, planning, and roadmap development
    """
    
    def __init__(self):
        self.name = "strategic_planning"
        self.version = "1.0.0"
        self.frameworks = {
            framework.value: self._load_framework_template(framework)
            for framework in StrategicFramework
        }
        self.industry_benchmarks = self._load_industry_benchmarks()
        self.strategic_templates = self._load_strategic_templates()
        
    def analyze_strategic_position(
        self,
        business_context: Dict[str, Any],
        market_data: Optional[Dict[str, Any]] = None,
        competitive_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Comprehensive strategic position analysis
        
        Args:
            business_context: Current business context and information
            market_data: Market analysis data
            competitive_data: Competitive intelligence data
            
        Returns:
            Strategic position analysis with recommendations
        """
        try:
            # Perform SWOT analysis
            swot_analysis = self._conduct_swot_analysis(business_context, market_data)
            
            # Analyze market position
            market_analysis = self._analyze_market_position(business_context, market_data)
            
            # Competitive intelligence analysis
            competitive_intelligence = self._analyze_competitive_position(
                business_context, competitive_data
            )
            
            # Strategic assessment
            strategic_assessment = self._assess_strategic_position(
                swot_analysis, market_analysis, competitive_intelligence
            )
            
            # Generate strategic recommendations
            recommendations = self._generate_strategic_recommendations(
                strategic_assessment, business_context
            )
            
            return {
                'strategic_position': {
                    'overall_assessment': strategic_assessment,
                    'competitive_position': competitive_intelligence.competitive_position.value,
                    'market_position': market_analysis,
                    'strategic_health_score': self._calculate_strategic_health_score(
                        swot_analysis, market_analysis, competitive_intelligence
                    )
                },
                'swot_analysis': swot_analysis,
                'market_analysis': market_analysis,
                'competitive_intelligence': competitive_intelligence,
                'strategic_recommendations': recommendations,
                'next_steps': self._identify_next_steps(recommendations),
                'analysis_metadata': {
                    'analysis_date': datetime.now(),
                    'frameworks_used': [StrategicFramework.SWOT.value, 'market_analysis', 'competitive_intelligence'],
                    'confidence_level': 'high',
                    'data_quality_score': self._assess_data_quality(business_context, market_data)
                }
            }
            
        except Exception as e:
            return {
                'error': f"Strategic position analysis failed: {str(e)}",
                'recommendations': ['Gather more comprehensive business data for analysis']
            }
    
    def develop_strategic_roadmap(
        self,
        business_context: Dict[str, Any],
        strategic_objectives: List[Dict[str, Any]],
        time_horizon: str = "medium_term"
    ) -> StrategicRoadmap:
        """
        Develop comprehensive strategic roadmap
        
        Args:
            business_context: Business context and current state
            strategic_objectives: List of strategic objectives
            time_horizon: Planning time horizon
            
        Returns:
            Detailed strategic roadmap
        """
        try:
            # Process strategic objectives
            processed_objectives = [
                self._process_strategic_objective(obj, business_context)
                for obj in strategic_objectives
            ]
            
            # Develop timeline and milestones
            timeline = self._develop_strategic_timeline(processed_objectives, time_horizon)
            milestones = self._identify_strategic_milestones(processed_objectives, timeline)
            
            # Resource allocation planning
            resource_allocation = self._plan_resource_allocation(processed_objectives)
            
            # Dependency analysis
            dependencies = self._analyze_objective_dependencies(processed_objectives)
            
            # Risk assessment and mitigation
            risk_mitigation = self._develop_risk_mitigation_strategies(processed_objectives)
            
            return StrategicRoadmap(
                objectives=processed_objectives,
                milestones=milestones,
                resource_allocation=resource_allocation,
                timeline=timeline,
                dependencies=dependencies,
                risk_mitigation=risk_mitigation
            )
            
        except Exception as e:
            # Return basic roadmap structure on error
            return StrategicRoadmap(
                objectives=[],
                milestones=[],
                resource_allocation={},
                timeline={},
                dependencies={},
                risk_mitigation={'error': str(e)}
            )
    
    def conduct_scenario_planning(
        self,
        business_context: Dict[str, Any],
        scenarios: List[Dict[str, Any]],
        planning_horizon: str = "medium_term"
    ) -> ScenarioAnalysis:
        """
        Conduct comprehensive scenario planning analysis
        
        Args:
            business_context: Current business context
            scenarios: List of scenarios to analyze
            planning_horizon: Planning time horizon
            
        Returns:
            Scenario analysis with recommendations
        """
        try:
            # Process and validate scenarios
            processed_scenarios = [
                self._process_scenario(scenario, business_context)
                for scenario in scenarios
            ]
            
            # Assess scenario probabilities
            probability_assessments = self._assess_scenario_probabilities(
                processed_scenarios, business_context
            )
            
            # Impact analysis
            impact_analysis = self._analyze_scenario_impacts(
                processed_scenarios, business_context
            )
            
            # Develop contingency plans
            contingency_plans = self._develop_contingency_plans(
                processed_scenarios, impact_analysis
            )
            
            # Strategic recommendations
            recommended_strategies = self._recommend_scenario_strategies(
                processed_scenarios, impact_analysis, probability_assessments
            )
            
            return ScenarioAnalysis(
                scenarios=processed_scenarios,
                probability_assessments=probability_assessments,
                impact_analysis=impact_analysis,
                contingency_plans=contingency_plans,
                recommended_strategies=recommended_strategies
            )
            
        except Exception as e:
            return ScenarioAnalysis(
                scenarios=[],
                probability_assessments={},
                impact_analysis={'error': str(e)},
                contingency_plans={},
                recommended_strategies=[]
            )
    
    def _conduct_swot_analysis(
        self,
        business_context: Dict[str, Any],
        market_data: Optional[Dict[str, Any]] = None
    ) -> SWOTAnalysis:
        """Conduct comprehensive SWOT analysis"""
        try:
            # Identify strengths
            strengths = self._identify_strengths(business_context)
            
            # Identify weaknesses
            weaknesses = self._identify_weaknesses(business_context)
            
            # Identify opportunities
            opportunities = self._identify_opportunities(business_context, market_data)
            
            # Identify threats
            threats = self._identify_threats(business_context, market_data)
            
            # Strategic implications
            strategic_implications = self._analyze_swot_implications(
                strengths, weaknesses, opportunities, threats
            )
            
            # Calculate confidence score
            confidence_score = self._calculate_swot_confidence(
                strengths, weaknesses, opportunities, threats, business_context
            )
            
            return SWOTAnalysis(
                strengths=strengths,
                weaknesses=weaknesses,
                opportunities=opportunities,
                threats=threats,
                strategic_implications=strategic_implications,
                confidence_score=confidence_score
            )
            
        except Exception as e:
            return SWOTAnalysis(
                strengths=[], weaknesses=[], opportunities=[], threats=[],
                strategic_implications={'error': str(e)}, confidence_score=0.0
            )
    
    def _identify_strengths(self, business_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify organizational strengths"""
        strengths = []
        
        # Financial strengths
        if business_context.get('financial_health', 'unknown') == 'strong':
            strengths.append({
                'category': 'financial',
                'strength': 'Strong financial position',
                'description': 'Solid financial foundation enabling growth investments',
                'impact': 'high',
                'evidence': ['Strong cash flow', 'Low debt levels', 'Profitable operations']
            })
        
        # Market position strengths
        market_position = business_context.get('market_position', {})
        if market_position.get('market_share', 0) > 0.15:  # >15% market share
            strengths.append({
                'category': 'market',
                'strength': 'Strong market position',
                'description': 'Significant market presence and brand recognition',
                'impact': 'high',
                'evidence': ['High market share', 'Brand recognition', 'Customer loyalty']
            })
        
        # Operational strengths
        if business_context.get('operational_efficiency', 'unknown') == 'high':
            strengths.append({
                'category': 'operational',
                'strength': 'Operational excellence',
                'description': 'Efficient operations and process optimization',
                'impact': 'medium',
                'evidence': ['Process efficiency', 'Cost management', 'Quality systems']
            })
        
        # Technology strengths
        if business_context.get('technology_capability', 'unknown') == 'advanced':
            strengths.append({
                'category': 'technology',
                'strength': 'Advanced technology capabilities',
                'description': 'Strong technology infrastructure and innovation',
                'impact': 'high',
                'evidence': ['Technology stack', 'Innovation capacity', 'Digital capabilities']
            })
        
        # Human capital strengths
        if business_context.get('employee_satisfaction', 0) > 0.8:
            strengths.append({
                'category': 'human_capital',
                'strength': 'Strong organizational culture',
                'description': 'Engaged workforce and strong company culture',
                'impact': 'medium',
                'evidence': ['Employee satisfaction', 'Low turnover', 'Skills diversity']
            })
        
        return strengths
    
    def _identify_weaknesses(self, business_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify organizational weaknesses"""
        weaknesses = []
        
        # Financial weaknesses
        if business_context.get('financial_health', 'unknown') in ['poor', 'weak']:
            weaknesses.append({
                'category': 'financial',
                'weakness': 'Financial constraints',
                'description': 'Limited financial resources constraining growth',
                'impact': 'high',
                'improvement_areas': ['Cash flow management', 'Cost reduction', 'Revenue growth']
            })
        
        # Market position weaknesses
        market_position = business_context.get('market_position', {})
        if market_position.get('market_share', 0) < 0.05:  # <5% market share
            weaknesses.append({
                'category': 'market',
                'weakness': 'Limited market presence',
                'description': 'Small market share limiting competitive advantage',
                'impact': 'medium',
                'improvement_areas': ['Market expansion', 'Brand building', 'Customer acquisition']
            })
        
        # Operational weaknesses
        if business_context.get('operational_efficiency', 'unknown') == 'low':
            weaknesses.append({
                'category': 'operational',
                'weakness': 'Operational inefficiencies',
                'description': 'Process inefficiencies increasing costs',
                'impact': 'medium',
                'improvement_areas': ['Process optimization', 'Automation', 'Quality improvement']
            })
        
        # Technology weaknesses
        if business_context.get('technology_capability', 'unknown') in ['outdated', 'limited']:
            weaknesses.append({
                'category': 'technology',
                'weakness': 'Technology limitations',
                'description': 'Outdated technology hindering competitiveness',
                'impact': 'high',
                'improvement_areas': ['Technology upgrade', 'Digital transformation', 'Innovation']
            })
        
        return weaknesses
    
    def _identify_opportunities(
        self,
        business_context: Dict[str, Any],
        market_data: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Identify market and strategic opportunities"""
        opportunities = []
        
        # Market growth opportunities
        if market_data and market_data.get('growth_rate', 0) > 0.1:  # >10% growth
            opportunities.append({
                'category': 'market_growth',
                'opportunity': 'Market expansion',
                'description': 'Growing market presents expansion opportunities',
                'impact': 'high',
                'time_to_realize': 'medium_term',
                'requirements': ['Market research', 'Investment', 'Strategic planning']
            })
        
        # Digital transformation opportunities
        if business_context.get('digital_maturity', 'low') in ['low', 'medium']:
            opportunities.append({
                'category': 'digital',
                'opportunity': 'Digital transformation',
                'description': 'Digitization can improve efficiency and reach',
                'impact': 'high',
                'time_to_realize': 'long_term',
                'requirements': ['Technology investment', 'Skill development', 'Change management']
            })
        
        # International expansion
        if not business_context.get('international_presence', False):
            opportunities.append({
                'category': 'expansion',
                'opportunity': 'International expansion',
                'description': 'Enter new geographic markets',
                'impact': 'medium',
                'time_to_realize': 'long_term',
                'requirements': ['Market research', 'Regulatory compliance', 'Local partnerships']
            })
        
        # Partnership opportunities
        opportunities.append({
            'category': 'partnerships',
            'opportunity': 'Strategic partnerships',
            'description': 'Form alliances to access new capabilities',
            'impact': 'medium',
            'time_to_realize': 'short_term',
            'requirements': ['Partner identification', 'Due diligence', 'Agreement negotiation']
        })
        
        return opportunities
    
    def _identify_threats(
        self,
        business_context: Dict[str, Any],
        market_data: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Identify external threats and risks"""
        threats = []
        
        # Competitive threats
        if market_data and market_data.get('competitive_intensity', 'medium') == 'high':
            threats.append({
                'category': 'competitive',
                'threat': 'Intense competition',
                'description': 'High competitive pressure affecting margins',
                'impact': 'high',
                'likelihood': 'high',
                'mitigation_strategies': ['Differentiation', 'Cost leadership', 'Innovation']
            })
        
        # Technology disruption
        threats.append({
            'category': 'technology',
            'threat': 'Technology disruption',
            'description': 'New technologies could disrupt business model',
            'impact': 'high',
            'likelihood': 'medium',
            'mitigation_strategies': ['Innovation investment', 'Technology monitoring', 'Adaptation']
        })
        
        # Regulatory changes
        if business_context.get('regulatory_environment') == 'changing':
            threats.append({
                'category': 'regulatory',
                'threat': 'Regulatory changes',
                'description': 'Changing regulations could increase compliance costs',
                'impact': 'medium',
                'likelihood': 'medium',
                'mitigation_strategies': ['Compliance monitoring', 'Advocacy', 'Adaptation planning']
            })
        
        # Economic downturn
        threats.append({
            'category': 'economic',
            'threat': 'Economic uncertainty',
            'description': 'Economic downturns could reduce demand',
            'impact': 'high',
            'likelihood': 'medium',
            'mitigation_strategies': ['Diversification', 'Cost flexibility', 'Financial reserves']
        })
        
        return threats
    
    def _analyze_market_position(
        self,
        business_context: Dict[str, Any],
        market_data: Optional[Dict[str, Any]] = None
    ) -> MarketAnalysis:
        """Analyze market position and dynamics"""
        try:
            # Market size analysis
            market_size = self._analyze_market_size(business_context, market_data)
            
            # Growth rate assessment
            growth_rate = market_data.get('growth_rate', 0.05) if market_data else 0.05
            
            # Market segmentation
            market_segments = self._identify_market_segments(business_context, market_data)
            
            # Competitive landscape
            competitive_landscape = self._analyze_competitive_landscape(market_data)
            
            # Market trends
            market_trends = self._identify_market_trends(market_data)
            
            # Barriers to entry
            barriers_to_entry = self._identify_barriers_to_entry(business_context, market_data)
            
            # Customer needs analysis
            customer_needs = self._analyze_customer_needs(business_context)
            
            return MarketAnalysis(
                market_size=market_size,
                growth_rate=growth_rate,
                market_segments=market_segments,
                competitive_landscape=competitive_landscape,
                market_trends=market_trends,
                barriers_to_entry=barriers_to_entry,
                customer_needs=customer_needs
            )
            
        except Exception as e:
            return MarketAnalysis(
                market_size={}, growth_rate=0.0, market_segments=[],
                competitive_landscape={}, market_trends=[], barriers_to_entry=[],
                customer_needs=[]
            )
    
    def _analyze_competitive_position(
        self,
        business_context: Dict[str, Any],
        competitive_data: Optional[Dict[str, Any]] = None
    ) -> CompetitiveIntelligence:
        """Analyze competitive position and intelligence"""
        try:
            # Identify competitors
            competitors = self._identify_competitors(business_context, competitive_data)
            
            # Assess competitive position
            competitive_position = self._assess_competitive_position(business_context, competitors)
            
            # Identify competitive advantages
            competitive_advantages = self._identify_competitive_advantages(business_context)
            
            # Identify competitive threats
            competitive_threats = self._identify_competitive_threats(competitors)
            
            # Market share analysis
            market_share_analysis = self._analyze_market_share(business_context, competitors)
            
            # Benchmarking
            benchmarking_results = self._conduct_competitive_benchmarking(
                business_context, competitors
            )
            
            return CompetitiveIntelligence(
                competitors=competitors,
                competitive_position=competitive_position,
                competitive_advantages=competitive_advantages,
                competitive_threats=competitive_threats,
                market_share_analysis=market_share_analysis,
                benchmarking_results=benchmarking_results
            )
            
        except Exception as e:
            return CompetitiveIntelligence(
                competitors=[], competitive_position=CompetitivePosition.FOLLOWER,
                competitive_advantages=[], competitive_threats=[],
                market_share_analysis={}, benchmarking_results={}
            )
    
    def _load_framework_template(self, framework: StrategicFramework) -> Dict[str, Any]:
        """Load framework-specific templates and methodologies"""
        templates = {
            StrategicFramework.SWOT: {
                'categories': ['strengths', 'weaknesses', 'opportunities', 'threats'],
                'analysis_methods': ['internal_analysis', 'external_analysis', 'strategic_matching'],
                'output_format': 'matrix'
            },
            StrategicFramework.PORTER_FIVE_FORCES: {
                'forces': ['competitive_rivalry', 'supplier_power', 'buyer_power', 
                          'threat_of_substitutes', 'threat_of_new_entrants'],
                'analysis_methods': ['force_assessment', 'industry_structure'],
                'output_format': 'force_diagram'
            },
            StrategicFramework.PESTEL: {
                'factors': ['political', 'economic', 'social', 'technological', 'environmental', 'legal'],
                'analysis_methods': ['factor_assessment', 'impact_analysis'],
                'output_format': 'factor_matrix'
            }
        }
        
        return templates.get(framework, {})
    
    def _load_industry_benchmarks(self) -> Dict[str, Any]:
        """Load industry-specific strategic benchmarks"""
        return {
            'technology': {
                'average_growth_rate': 0.15,
                'typical_margins': 0.20,
                'innovation_investment': 0.12,
                'market_concentration': 'medium'
            },
            'healthcare': {
                'average_growth_rate': 0.08,
                'typical_margins': 0.15,
                'innovation_investment': 0.10,
                'market_concentration': 'high'
            },
            'manufacturing': {
                'average_growth_rate': 0.05,
                'typical_margins': 0.10,
                'innovation_investment': 0.06,
                'market_concentration': 'medium'
            },
            'financial_services': {
                'average_growth_rate': 0.06,
                'typical_margins': 0.25,
                'innovation_investment': 0.08,
                'market_concentration': 'high'
            }
        }
    
    def _load_strategic_templates(self) -> Dict[str, Any]:
        """Load strategic planning templates and best practices"""
        return {
            'objectives': {
                'smart_criteria': ['specific', 'measurable', 'achievable', 'relevant', 'time_bound'],
                'categories': ['financial', 'customer', 'operational', 'learning_growth'],
                'success_metrics': ['quantitative', 'qualitative', 'leading', 'lagging']
            },
            'roadmap': {
                'phases': ['planning', 'execution', 'monitoring', 'adjustment'],
                'time_horizons': ['short_term', 'medium_term', 'long_term'],
                'review_cycles': ['monthly', 'quarterly', 'annually']
            }
        }
    
    def _calculate_strategic_health_score(
        self,
        swot: SWOTAnalysis,
        market: MarketAnalysis,
        competitive: CompetitiveIntelligence
    ) -> float:
        """Calculate overall strategic health score"""
        try:
            # SWOT component (40% weight)
            swot_score = (
                len(swot.strengths) * 0.3 - len(swot.weaknesses) * 0.2 +
                len(swot.opportunities) * 0.25 - len(swot.threats) * 0.15
            ) / 10.0
            
            # Market component (30% weight)
            market_score = min(market.growth_rate * 5.0, 1.0)  # Cap at 1.0
            
            # Competitive component (30% weight)
            competitive_positions = {
                CompetitivePosition.MARKET_LEADER: 1.0,
                CompetitivePosition.CHALLENGER: 0.8,
                CompetitivePosition.FOLLOWER: 0.6,
                CompetitivePosition.NICHE_PLAYER: 0.7
            }
            competitive_score = competitive_positions.get(competitive.competitive_position, 0.5)
            
            # Weighted total
            total_score = (swot_score * 0.4 + market_score * 0.3 + competitive_score * 0.3)
            
            # Normalize to 0-1 range
            return max(0.0, min(1.0, total_score))
            
        except Exception:
            return 0.5  # Default moderate score
    
    def _assess_data_quality(
        self,
        business_context: Dict[str, Any],
        market_data: Optional[Dict[str, Any]] = None
    ) -> float:
        """Assess quality of input data for analysis"""
        quality_factors = []
        
        # Business context completeness
        required_fields = ['company_name', 'industry', 'company_size']
        context_completeness = sum(
            1 for field in required_fields if business_context.get(field)
        ) / len(required_fields)
        quality_factors.append(context_completeness)
        
        # Market data availability
        if market_data:
            market_fields = ['growth_rate', 'market_size', 'competitive_intensity']
            market_completeness = sum(
                1 for field in market_fields if market_data.get(field)
            ) / len(market_fields)
            quality_factors.append(market_completeness)
        else:
            quality_factors.append(0.3)  # Penalty for missing market data
        
        return sum(quality_factors) / len(quality_factors)

    def get_capability_info(self) -> Dict[str, Any]:
        """Return capability information and metadata"""
        return {
            'name': self.name,
            'version': self.version,
            'description': 'Advanced strategic planning and analysis capability',
            'supported_frameworks': [f.value for f in StrategicFramework],
            'capabilities': [
                'SWOT Analysis',
                'Market Position Analysis',
                'Competitive Intelligence',
                'Strategic Roadmapping',
                'Scenario Planning',
                'Strategic Objective Setting',
                'Performance Measurement Framework'
            ],
            'analysis_types': [
                'strategic_position_analysis',
                'strategic_roadmap_development',
                'scenario_planning_analysis',
                'competitive_intelligence',
                'market_opportunity_assessment'
            ]
        }
