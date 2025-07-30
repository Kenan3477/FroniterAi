"""
Business Evaluation Metrics

Comprehensive evaluation suite for business operations models
with domain-specific metrics for financial, regulatory, and strategic tasks.
"""

import json
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
import re
from datetime import datetime
import logging

# NLP evaluation libraries
from rouge_score import rouge_scorer
from bert_score import score as bert_score
import nltk
from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction
from nltk.translate.meteor_score import meteor_score

# Financial evaluation
import yfinance as yf
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.metrics.pairwise import cosine_similarity

# Custom evaluation metrics
import torch
from transformers import AutoTokenizer, AutoModel

logger = logging.getLogger(__name__)

@dataclass
class EvaluationResult:
    """Container for evaluation results"""
    overall_score: float
    metric_scores: Dict[str, float]
    detailed_results: Dict[str, Any]
    timestamp: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'overall_score': self.overall_score,
            'metric_scores': self.metric_scores,
            'detailed_results': self.detailed_results,
            'timestamp': self.timestamp
        }

class BaseBusinessMetric:
    """Base class for business evaluation metrics"""
    
    def __init__(self, name: str, weight: float = 1.0):
        self.name = name
        self.weight = weight
    
    def evaluate(self, predictions: List[str], references: List[str]) -> Dict[str, float]:
        """Evaluate predictions against references"""
        raise NotImplementedError
    
    def aggregate_scores(self, scores: List[float]) -> float:
        """Aggregate individual scores"""
        return np.mean(scores) if scores else 0.0

class FinancialAccuracyMetric(BaseBusinessMetric):
    """Metric for evaluating financial calculation accuracy"""
    
    def __init__(self):
        super().__init__("financial_accuracy", weight=1.5)
        self.financial_patterns = {
            'currency': r'\$?[\d,]+\.?\d*',
            'percentage': r'\d+\.?\d*%',
            'ratio': r'\d+\.?\d*:\d+\.?\d*',
            'multiple': r'\d+\.?\d*x'
        }
    
    def evaluate(self, predictions: List[str], references: List[str]) -> Dict[str, float]:
        """Evaluate financial calculation accuracy"""
        if len(predictions) != len(references):
            return {'financial_accuracy': 0.0}
        
        accuracy_scores = []
        
        for pred, ref in zip(predictions, references):
            score = self._calculate_financial_accuracy(pred, ref)
            accuracy_scores.append(score)
        
        return {
            'financial_accuracy': self.aggregate_scores(accuracy_scores),
            'financial_accuracy_std': np.std(accuracy_scores) if accuracy_scores else 0.0
        }
    
    def _calculate_financial_accuracy(self, prediction: str, reference: str) -> float:
        """Calculate accuracy of financial numbers in text"""
        pred_numbers = self._extract_financial_numbers(prediction)
        ref_numbers = self._extract_financial_numbers(reference)
        
        if not ref_numbers:
            return 1.0 if not pred_numbers else 0.0
        
        if not pred_numbers:
            return 0.0
        
        # Calculate accuracy based on numerical closeness
        total_score = 0.0
        matched_refs = set()
        
        for pred_num in pred_numbers:
            best_match_score = 0.0
            best_match_idx = None
            
            for idx, ref_num in enumerate(ref_numbers):
                if idx in matched_refs:
                    continue
                
                # Calculate relative error
                if ref_num != 0:
                    relative_error = abs(pred_num - ref_num) / abs(ref_num)
                    score = max(0, 1 - relative_error)
                else:
                    score = 1.0 if pred_num == 0 else 0.0
                
                if score > best_match_score:
                    best_match_score = score
                    best_match_idx = idx
            
            if best_match_idx is not None:
                total_score += best_match_score
                matched_refs.add(best_match_idx)
        
        return total_score / len(ref_numbers)
    
    def _extract_financial_numbers(self, text: str) -> List[float]:
        """Extract financial numbers from text"""
        numbers = []
        
        for pattern_name, pattern in self.financial_patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            
            for match in matches:
                try:
                    # Clean and convert to float
                    clean_match = re.sub(r'[\$,%]', '', match)
                    if clean_match.endswith('x'):
                        clean_match = clean_match[:-1]
                    
                    if 'M' in match.upper():
                        clean_match = clean_match.replace('M', '').replace('m', '')
                        number = float(clean_match) * 1_000_000
                    elif 'B' in match.upper():
                        clean_match = clean_match.replace('B', '').replace('b', '')
                        number = float(clean_match) * 1_000_000_000
                    elif 'T' in match.upper():
                        clean_match = clean_match.replace('T', '').replace('t', '')
                        number = float(clean_match) * 1_000_000_000_000
                    else:
                        number = float(clean_match)
                    
                    numbers.append(number)
                
                except ValueError:
                    continue
        
        return numbers

class BusinessConceptCoherenceMetric(BaseBusinessMetric):
    """Metric for evaluating business concept coherence"""
    
    def __init__(self):
        super().__init__("business_coherence", weight=1.2)
        
        # Load business concept embeddings
        self.tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
        self.model = AutoModel.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
        
        # Business concept keywords
        self.business_concepts = {
            'financial': [
                'revenue', 'profit', 'loss', 'assets', 'liabilities', 'equity',
                'cash flow', 'ebitda', 'roi', 'margin', 'ratio', 'valuation'
            ],
            'strategic': [
                'market', 'competition', 'strategy', 'growth', 'expansion',
                'objectives', 'goals', 'planning', 'analysis', 'opportunities'
            ],
            'operational': [
                'efficiency', 'productivity', 'processes', 'operations',
                'management', 'resources', 'optimization', 'performance'
            ],
            'regulatory': [
                'compliance', 'regulations', 'legal', 'audit', 'standards',
                'requirements', 'policies', 'governance', 'risk'
            ]
        }
    
    def evaluate(self, predictions: List[str], references: List[str]) -> Dict[str, float]:
        """Evaluate business concept coherence"""
        if len(predictions) != len(references):
            return {'business_coherence': 0.0}
        
        coherence_scores = []
        concept_alignment_scores = []
        
        for pred, ref in zip(predictions, references):
            # Calculate semantic coherence
            coherence = self._calculate_semantic_coherence(pred, ref)
            coherence_scores.append(coherence)
            
            # Calculate concept alignment
            alignment = self._calculate_concept_alignment(pred, ref)
            concept_alignment_scores.append(alignment)
        
        return {
            'business_coherence': self.aggregate_scores(coherence_scores),
            'concept_alignment': self.aggregate_scores(concept_alignment_scores),
            'coherence_std': np.std(coherence_scores) if coherence_scores else 0.0
        }
    
    def _calculate_semantic_coherence(self, prediction: str, reference: str) -> float:
        """Calculate semantic coherence using sentence embeddings"""
        try:
            # Encode texts
            pred_embedding = self._encode_text(prediction)
            ref_embedding = self._encode_text(reference)
            
            # Calculate cosine similarity
            similarity = cosine_similarity(
                pred_embedding.reshape(1, -1), 
                ref_embedding.reshape(1, -1)
            )[0, 0]
            
            return max(0, similarity)
        
        except Exception as e:
            logger.warning(f"Error calculating semantic coherence: {e}")
            return 0.0
    
    def _encode_text(self, text: str) -> np.ndarray:
        """Encode text using sentence transformer"""
        inputs = self.tokenizer(text, return_tensors='pt', truncation=True, padding=True)
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            # Mean pooling
            embeddings = outputs.last_hidden_state.mean(dim=1)
        
        return embeddings.squeeze().numpy()
    
    def _calculate_concept_alignment(self, prediction: str, reference: str) -> float:
        """Calculate alignment of business concepts"""
        pred_concepts = self._extract_business_concepts(prediction)
        ref_concepts = self._extract_business_concepts(reference)
        
        if not ref_concepts:
            return 1.0 if not pred_concepts else 0.0
        
        if not pred_concepts:
            return 0.0
        
        # Calculate Jaccard similarity
        intersection = len(pred_concepts.intersection(ref_concepts))
        union = len(pred_concepts.union(ref_concepts))
        
        return intersection / union if union > 0 else 0.0
    
    def _extract_business_concepts(self, text: str) -> set:
        """Extract business concepts from text"""
        text_lower = text.lower()
        concepts = set()
        
        for category, keywords in self.business_concepts.items():
            for keyword in keywords:
                if keyword in text_lower:
                    concepts.add(keyword)
        
        return concepts

class RegulatoryComplianceMetric(BaseBusinessMetric):
    """Metric for evaluating regulatory compliance accuracy"""
    
    def __init__(self):
        super().__init__("regulatory_compliance", weight=2.0)
        
        # Regulatory frameworks and requirements
        self.compliance_frameworks = {
            'SOX': ['internal controls', 'financial reporting', 'audit'],
            'GDPR': ['data protection', 'privacy', 'consent'],
            'IFRS': ['international standards', 'financial statements'],
            'GAAP': ['accounting principles', 'revenue recognition'],
            'Basel': ['capital requirements', 'risk management']
        }
    
    def evaluate(self, predictions: List[str], references: List[str]) -> Dict[str, float]:
        """Evaluate regulatory compliance accuracy"""
        if len(predictions) != len(references):
            return {'regulatory_compliance': 0.0}
        
        compliance_scores = []
        framework_accuracy_scores = []
        
        for pred, ref in zip(predictions, references):
            # Calculate compliance accuracy
            compliance = self._calculate_compliance_accuracy(pred, ref)
            compliance_scores.append(compliance)
            
            # Calculate framework identification accuracy
            framework_acc = self._calculate_framework_accuracy(pred, ref)
            framework_accuracy_scores.append(framework_acc)
        
        return {
            'regulatory_compliance': self.aggregate_scores(compliance_scores),
            'framework_accuracy': self.aggregate_scores(framework_accuracy_scores),
            'compliance_std': np.std(compliance_scores) if compliance_scores else 0.0
        }
    
    def _calculate_compliance_accuracy(self, prediction: str, reference: str) -> float:
        """Calculate compliance accuracy"""
        pred_requirements = self._extract_compliance_requirements(prediction)
        ref_requirements = self._extract_compliance_requirements(reference)
        
        if not ref_requirements:
            return 1.0 if not pred_requirements else 0.0
        
        if not pred_requirements:
            return 0.0
        
        # Calculate overlap
        intersection = len(pred_requirements.intersection(ref_requirements))
        return intersection / len(ref_requirements)
    
    def _calculate_framework_accuracy(self, prediction: str, reference: str) -> float:
        """Calculate framework identification accuracy"""
        pred_frameworks = self._identify_frameworks(prediction)
        ref_frameworks = self._identify_frameworks(reference)
        
        if not ref_frameworks:
            return 1.0 if not pred_frameworks else 0.0
        
        if not pred_frameworks:
            return 0.0
        
        # Calculate accuracy
        correct = len(pred_frameworks.intersection(ref_frameworks))
        return correct / len(ref_frameworks)
    
    def _extract_compliance_requirements(self, text: str) -> set:
        """Extract compliance requirements from text"""
        text_lower = text.lower()
        requirements = set()
        
        requirement_keywords = [
            'disclosure', 'reporting', 'audit', 'control', 'assessment',
            'monitoring', 'documentation', 'review', 'certification'
        ]
        
        for keyword in requirement_keywords:
            if keyword in text_lower:
                requirements.add(keyword)
        
        return requirements
    
    def _identify_frameworks(self, text: str) -> set:
        """Identify regulatory frameworks mentioned in text"""
        text_upper = text.upper()
        frameworks = set()
        
        for framework in self.compliance_frameworks:
            if framework in text_upper:
                frameworks.add(framework)
        
        return frameworks

class StrategicInsightMetric(BaseBusinessMetric):
    """Metric for evaluating strategic business insights"""
    
    def __init__(self):
        super().__init__("strategic_insight", weight=1.3)
        
        # Strategic insight indicators
        self.insight_indicators = {
            'market_analysis': ['market size', 'market share', 'competition', 'trends'],
            'swot_analysis': ['strengths', 'weaknesses', 'opportunities', 'threats'],
            'financial_analysis': ['profitability', 'liquidity', 'leverage', 'efficiency'],
            'risk_assessment': ['risk factors', 'mitigation', 'probability', 'impact'],
            'recommendations': ['recommend', 'suggest', 'should', 'strategy']
        }
    
    def evaluate(self, predictions: List[str], references: List[str]) -> Dict[str, float]:
        """Evaluate strategic insight quality"""
        if len(predictions) != len(references):
            return {'strategic_insight': 0.0}
        
        insight_scores = []
        depth_scores = []
        actionability_scores = []
        
        for pred, ref in zip(predictions, references):
            # Calculate insight coverage
            insight_score = self._calculate_insight_coverage(pred, ref)
            insight_scores.append(insight_score)
            
            # Calculate analysis depth
            depth_score = self._calculate_analysis_depth(pred)
            depth_scores.append(depth_score)
            
            # Calculate actionability
            actionability_score = self._calculate_actionability(pred)
            actionability_scores.append(actionability_score)
        
        return {
            'strategic_insight': self.aggregate_scores(insight_scores),
            'analysis_depth': self.aggregate_scores(depth_scores),
            'actionability': self.aggregate_scores(actionability_scores)
        }
    
    def _calculate_insight_coverage(self, prediction: str, reference: str) -> float:
        """Calculate coverage of strategic insights"""
        pred_insights = self._extract_strategic_insights(prediction)
        ref_insights = self._extract_strategic_insights(reference)
        
        if not ref_insights:
            return 1.0 if not pred_insights else 0.0
        
        if not pred_insights:
            return 0.0
        
        # Calculate coverage
        intersection = len(pred_insights.intersection(ref_insights))
        return intersection / len(ref_insights)
    
    def _calculate_analysis_depth(self, text: str) -> float:
        """Calculate depth of analysis"""
        depth_indicators = [
            'because', 'due to', 'resulted in', 'caused by', 'leading to',
            'analysis shows', 'data indicates', 'evidence suggests',
            'correlation', 'trend', 'pattern', 'implication'
        ]
        
        text_lower = text.lower()
        depth_score = sum(1 for indicator in depth_indicators if indicator in text_lower)
        
        # Normalize by text length
        words = len(text.split())
        normalized_score = depth_score / max(words / 100, 1)  # Per 100 words
        
        return min(normalized_score, 1.0)
    
    def _calculate_actionability(self, text: str) -> float:
        """Calculate actionability of recommendations"""
        actionable_indicators = [
            'recommend', 'suggest', 'should', 'must', 'need to',
            'action plan', 'next steps', 'implement', 'execute',
            'strategy', 'initiative', 'program', 'project'
        ]
        
        text_lower = text.lower()
        actionability_score = sum(1 for indicator in actionable_indicators if indicator in text_lower)
        
        # Normalize
        return min(actionability_score / 5, 1.0)  # Max 5 indicators for full score
    
    def _extract_strategic_insights(self, text: str) -> set:
        """Extract strategic insights from text"""
        text_lower = text.lower()
        insights = set()
        
        for insight_type, keywords in self.insight_indicators.items():
            for keyword in keywords:
                if keyword in text_lower:
                    insights.add(insight_type)
        
        return insights

class BusinessEvaluationSuite:
    """Complete evaluation suite for business models"""
    
    def __init__(self):
        self.metrics = [
            FinancialAccuracyMetric(),
            BusinessConceptCoherenceMetric(),
            RegulatoryComplianceMetric(),
            StrategicInsightMetric()
        ]
        
        # Standard NLP metrics
        self.rouge_scorer = rouge_scorer.RougeScorer(['rouge1', 'rouge2', 'rougeL'], use_stemmer=True)
        
        # Download NLTK data if needed
        try:
            nltk.download('wordnet', quiet=True)
            nltk.download('omw-1.4', quiet=True)
        except:
            pass
    
    def evaluate_predictions(self, predictions: List[str], references: List[str]) -> Dict[str, float]:
        """Evaluate predictions using all metrics"""
        results = {}
        
        # Business-specific metrics
        for metric in self.metrics:
            try:
                metric_results = metric.evaluate(predictions, references)
                for key, value in metric_results.items():
                    results[key] = value
            except Exception as e:
                logger.error(f"Error in metric {metric.name}: {e}")
                results[metric.name] = 0.0
        
        # Standard NLP metrics
        nlp_results = self._evaluate_nlp_metrics(predictions, references)
        results.update(nlp_results)
        
        # Calculate overall score
        overall_score = self._calculate_overall_score(results)
        results['overall_score'] = overall_score
        
        return results
    
    def _evaluate_nlp_metrics(self, predictions: List[str], references: List[str]) -> Dict[str, float]:
        """Evaluate standard NLP metrics"""
        if len(predictions) != len(references):
            return {}
        
        # ROUGE scores
        rouge_scores = {'rouge1': [], 'rouge2': [], 'rougeL': []}
        
        # BLEU scores
        bleu_scores = []
        
        # METEOR scores
        meteor_scores = []
        
        for pred, ref in zip(predictions, references):
            # ROUGE
            rouge_result = self.rouge_scorer.score(ref, pred)
            rouge_scores['rouge1'].append(rouge_result['rouge1'].fmeasure)
            rouge_scores['rouge2'].append(rouge_result['rouge2'].fmeasure)
            rouge_scores['rougeL'].append(rouge_result['rougeL'].fmeasure)
            
            # BLEU
            ref_tokens = ref.split()
            pred_tokens = pred.split()
            smoothie = SmoothingFunction().method4
            bleu = sentence_bleu([ref_tokens], pred_tokens, smoothing_function=smoothie)
            bleu_scores.append(bleu)
            
            # METEOR
            try:
                meteor = meteor_score([ref], pred)
                meteor_scores.append(meteor)
            except:
                meteor_scores.append(0.0)
        
        # BERTScore
        try:
            P, R, F1 = bert_score(predictions, references, lang='en', verbose=False)
            bert_f1 = F1.mean().item()
        except:
            bert_f1 = 0.0
        
        return {
            'rouge1': np.mean(rouge_scores['rouge1']),
            'rouge2': np.mean(rouge_scores['rouge2']),
            'rougeL': np.mean(rouge_scores['rougeL']),
            'bleu': np.mean(bleu_scores),
            'meteor': np.mean(meteor_scores),
            'bert_f1': bert_f1
        }
    
    def _calculate_overall_score(self, results: Dict[str, float]) -> float:
        """Calculate weighted overall score"""
        # Weight mapping for different metrics
        weights = {
            'financial_accuracy': 0.25,
            'business_coherence': 0.20,
            'regulatory_compliance': 0.20,
            'strategic_insight': 0.15,
            'rouge1': 0.10,
            'bleu': 0.05,
            'bert_f1': 0.05
        }
        
        total_score = 0.0
        total_weight = 0.0
        
        for metric, weight in weights.items():
            if metric in results:
                total_score += results[metric] * weight
                total_weight += weight
        
        return total_score / total_weight if total_weight > 0 else 0.0
    
    def generate_evaluation_report(
        self, 
        predictions: List[str], 
        references: List[str],
        output_file: Optional[str] = None
    ) -> EvaluationResult:
        """Generate comprehensive evaluation report"""
        
        # Evaluate all metrics
        metric_scores = self.evaluate_predictions(predictions, references)
        
        # Calculate detailed statistics
        detailed_results = {
            'sample_count': len(predictions),
            'evaluation_timestamp': datetime.now().isoformat(),
            'metric_breakdown': metric_scores,
            'performance_analysis': self._analyze_performance(metric_scores)
        }
        
        # Create evaluation result
        result = EvaluationResult(
            overall_score=metric_scores.get('overall_score', 0.0),
            metric_scores=metric_scores,
            detailed_results=detailed_results,
            timestamp=datetime.now().isoformat()
        )
        
        # Save report if output file specified
        if output_file:
            with open(output_file, 'w') as f:
                json.dump(result.to_dict(), f, indent=2)
            
            logger.info(f"Evaluation report saved to {output_file}")
        
        return result
    
    def _analyze_performance(self, scores: Dict[str, float]) -> Dict[str, str]:
        """Analyze performance and provide insights"""
        analysis = {}
        
        # Overall performance
        overall = scores.get('overall_score', 0.0)
        if overall >= 0.8:
            analysis['overall'] = "Excellent performance across all metrics"
        elif overall >= 0.6:
            analysis['overall'] = "Good performance with room for improvement"
        elif overall >= 0.4:
            analysis['overall'] = "Moderate performance, significant improvement needed"
        else:
            analysis['overall'] = "Poor performance, major improvements required"
        
        # Specific metric analysis
        if scores.get('financial_accuracy', 0) < 0.6:
            analysis['financial'] = "Financial calculation accuracy needs improvement"
        
        if scores.get('regulatory_compliance', 0) < 0.7:
            analysis['regulatory'] = "Regulatory compliance understanding requires enhancement"
        
        if scores.get('strategic_insight', 0) < 0.6:
            analysis['strategic'] = "Strategic analysis depth and actionability need work"
        
        return analysis

def main():
    """Example usage of evaluation suite"""
    
    # Example predictions and references
    predictions = [
        "The company's revenue increased by 15% to $2.5 million, resulting in improved profitability.",
        "Based on SOX requirements, we recommend implementing stronger internal controls.",
        "Market analysis suggests expanding into Asia-Pacific region to capture growth opportunities."
    ]
    
    references = [
        "Revenue grew 15% to $2.5M with higher profit margins due to cost optimization.",
        "SOX compliance requires enhanced internal controls and financial reporting procedures.",
        "Strategic recommendation: expand to Asia-Pacific markets for 20% growth potential."
    ]
    
    # Initialize evaluation suite
    evaluator = BusinessEvaluationSuite()
    
    # Generate evaluation report
    result = evaluator.generate_evaluation_report(
        predictions=predictions,
        references=references,
        output_file="evaluation_report.json"
    )
    
    # Print results
    print(f"Overall Score: {result.overall_score:.3f}")
    print("\nMetric Breakdown:")
    for metric, score in result.metric_scores.items():
        print(f"  {metric}: {score:.3f}")

if __name__ == "__main__":
    main()
