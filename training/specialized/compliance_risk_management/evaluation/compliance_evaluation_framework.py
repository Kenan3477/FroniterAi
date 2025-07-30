"""
Compliance-Specific Evaluation Framework

Specialized evaluation metrics and procedures for compliance and risk management models
including accuracy assessment, regulatory compliance scoring, and jurisdiction-specific validation.
"""

import json
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import logging
import re
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support, 
    confusion_matrix, classification_report,
    mean_squared_error, mean_absolute_error
)
from collections import defaultdict, Counter

# Import base evaluation components
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent.parent))
from evaluation.business_metrics import BaseBusinessMetric, EvaluationResult

logger = logging.getLogger(__name__)

@dataclass
class ComplianceEvaluationResult:
    """Results container for compliance evaluation"""
    overall_compliance_score: float
    regulation_specific_scores: Dict[str, float]
    jurisdiction_specific_scores: Dict[str, float]
    task_specific_scores: Dict[str, float]
    risk_assessment_accuracy: float
    policy_generation_quality: float
    regulatory_change_detection_f1: float
    detailed_metrics: Dict[str, Any]
    timestamp: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'overall_compliance_score': self.overall_compliance_score,
            'regulation_specific_scores': self.regulation_specific_scores,
            'jurisdiction_specific_scores': self.jurisdiction_specific_scores,
            'task_specific_scores': self.task_specific_scores,
            'risk_assessment_accuracy': self.risk_assessment_accuracy,
            'policy_generation_quality': self.policy_generation_quality,
            'regulatory_change_detection_f1': self.regulatory_change_detection_f1,
            'detailed_metrics': self.detailed_metrics,
            'timestamp': self.timestamp
        }

class ComplianceAccuracyMetric(BaseBusinessMetric):
    """Metric for evaluating compliance accuracy and regulatory knowledge"""
    
    def __init__(self):
        super().__init__("compliance_accuracy", weight=2.0)
        
        # Regulatory frameworks knowledge
        self.regulatory_frameworks = {
            'sox': {
                'key_sections': ['302', '404', '409', '906'],
                'requirements': [
                    'internal controls', 'financial reporting', 'management assessment',
                    'external auditor attestation', 'CEO/CFO certifications'
                ],
                'violations': ['material weakness', 'significant deficiency', 'control deficiency']
            },
            'gdpr': {
                'key_articles': ['6', '7', '25', '33', '35'],
                'requirements': [
                    'lawful basis', 'consent', 'data protection by design',
                    'breach notification', 'impact assessment'
                ],
                'violations': ['unauthorized processing', 'inadequate consent', 'data breach']
            },
            'basel_iii': {
                'key_pillars': ['pillar 1', 'pillar 2', 'pillar 3'],
                'requirements': [
                    'capital adequacy', 'leverage ratio', 'liquidity coverage',
                    'net stable funding', 'counterparty risk'
                ],
                'violations': ['inadequate capital', 'excessive leverage', 'liquidity shortage']
            }
        }
        
        # Compliance terminology patterns
        self.compliance_patterns = {
            'requirements': r'\b(must|shall|required|mandatory|obligated)\b',
            'prohibitions': r'\b(prohibited|forbidden|not permitted|restricted)\b',
            'recommendations': r'\b(should|recommended|suggested|advised)\b',
            'penalties': r'\b(fine|penalty|sanction|enforcement|violation)\b',
            'deadlines': r'\b(deadline|by\s+\w+\s+\d+|within\s+\d+\s+days)\b'
        }
    
    def evaluate(self, predictions: List[str], references: List[str]) -> Dict[str, float]:
        """Evaluate compliance accuracy"""
        if len(predictions) != len(references):
            return {'compliance_accuracy': 0.0}
        
        accuracy_scores = []
        framework_scores = defaultdict(list)
        terminology_scores = []
        
        for pred, ref in zip(predictions, references):
            # Overall compliance accuracy
            accuracy = self._calculate_compliance_accuracy(pred, ref)
            accuracy_scores.append(accuracy)
            
            # Framework-specific accuracy
            for framework in self.regulatory_frameworks:
                framework_accuracy = self._calculate_framework_accuracy(pred, ref, framework)
                framework_scores[framework].append(framework_accuracy)
            
            # Terminology accuracy
            terminology_accuracy = self._calculate_terminology_accuracy(pred, ref)
            terminology_scores.append(terminology_accuracy)
        
        results = {
            'compliance_accuracy': np.mean(accuracy_scores),
            'terminology_accuracy': np.mean(terminology_scores),
            'compliance_accuracy_std': np.std(accuracy_scores)
        }
        
        # Add framework-specific scores
        for framework, scores in framework_scores.items():
            if scores:
                results[f'{framework}_accuracy'] = np.mean(scores)
        
        return results
    
    def _calculate_compliance_accuracy(self, prediction: str, reference: str) -> float:
        """Calculate overall compliance accuracy"""
        pred_lower = prediction.lower()
        ref_lower = reference.lower()
        
        # Extract compliance elements
        pred_requirements = self._extract_compliance_elements(pred_lower, 'requirements')
        ref_requirements = self._extract_compliance_elements(ref_lower, 'requirements')
        
        pred_prohibitions = self._extract_compliance_elements(pred_lower, 'prohibitions')
        ref_prohibitions = self._extract_compliance_elements(ref_lower, 'prohibitions')
        
        # Calculate accuracy for each element type
        req_accuracy = self._calculate_element_accuracy(pred_requirements, ref_requirements)
        proh_accuracy = self._calculate_element_accuracy(pred_prohibitions, ref_prohibitions)
        
        # Weighted average
        return (req_accuracy * 0.6 + proh_accuracy * 0.4)
    
    def _calculate_framework_accuracy(self, prediction: str, reference: str, framework: str) -> float:
        """Calculate framework-specific accuracy"""
        if framework not in self.regulatory_frameworks:
            return 0.0
        
        framework_info = self.regulatory_frameworks[framework]
        pred_lower = prediction.lower()
        ref_lower = reference.lower()
        
        # Check for framework mentions
        framework_mentioned = framework in pred_lower and framework in ref_lower
        if not framework_mentioned:
            return 0.0
        
        # Check for key sections/articles
        key_elements = framework_info.get('key_sections', framework_info.get('key_articles', framework_info.get('key_pillars', [])))
        pred_elements = [elem for elem in key_elements if elem in pred_lower]
        ref_elements = [elem for elem in key_elements if elem in ref_lower]
        
        if not ref_elements:
            return 1.0 if not pred_elements else 0.5
        
        # Calculate overlap
        overlap = len(set(pred_elements) & set(ref_elements))
        return overlap / len(ref_elements)
    
    def _calculate_terminology_accuracy(self, prediction: str, reference: str) -> float:
        """Calculate compliance terminology accuracy"""
        pred_lower = prediction.lower()
        ref_lower = reference.lower()
        
        total_score = 0.0
        total_patterns = 0
        
        for pattern_name, pattern in self.compliance_patterns.items():
            pred_matches = len(re.findall(pattern, pred_lower))
            ref_matches = len(re.findall(pattern, ref_lower))
            
            if ref_matches > 0:
                pattern_score = min(pred_matches / ref_matches, 1.0)
                total_score += pattern_score
                total_patterns += 1
        
        return total_score / total_patterns if total_patterns > 0 else 0.0
    
    def _extract_compliance_elements(self, text: str, element_type: str) -> List[str]:
        """Extract compliance elements from text"""
        if element_type not in self.compliance_patterns:
            return []
        
        pattern = self.compliance_patterns[element_type]
        matches = re.findall(pattern, text)
        return matches
    
    def _calculate_element_accuracy(self, pred_elements: List[str], ref_elements: List[str]) -> float:
        """Calculate accuracy for specific compliance elements"""
        if not ref_elements:
            return 1.0 if not pred_elements else 0.0
        
        if not pred_elements:
            return 0.0
        
        # Calculate Jaccard similarity
        pred_set = set(pred_elements)
        ref_set = set(ref_elements)
        
        intersection = len(pred_set & ref_set)
        union = len(pred_set | ref_set)
        
        return intersection / union if union > 0 else 0.0

class RiskAssessmentAccuracyMetric(BaseBusinessMetric):
    """Metric for evaluating risk assessment accuracy"""
    
    def __init__(self):
        super().__init__("risk_assessment_accuracy", weight=1.8)
        
        # Risk level mappings
        self.risk_levels = {
            'low': 0,
            'medium': 1,
            'high': 2,
            'critical': 3
        }
        
        # Risk categories
        self.risk_categories = [
            'operational', 'financial', 'compliance', 'strategic',
            'technology', 'reputation', 'market', 'credit', 'liquidity'
        ]
    
    def evaluate(self, predictions: List[str], references: List[str]) -> Dict[str, float]:
        """Evaluate risk assessment accuracy"""
        if len(predictions) != len(references):
            return {'risk_assessment_accuracy': 0.0}
        
        risk_level_accuracy = []
        risk_category_accuracy = []
        likelihood_accuracy = []
        impact_accuracy = []
        
        for pred, ref in zip(predictions, references):
            # Extract risk assessments
            pred_assessment = self._extract_risk_assessment(pred)
            ref_assessment = self._extract_risk_assessment(ref)
            
            # Risk level accuracy
            level_acc = self._calculate_risk_level_accuracy(
                pred_assessment.get('risk_level'),
                ref_assessment.get('risk_level')
            )
            risk_level_accuracy.append(level_acc)
            
            # Risk category accuracy
            cat_acc = self._calculate_risk_category_accuracy(
                pred_assessment.get('risk_categories', []),
                ref_assessment.get('risk_categories', [])
            )
            risk_category_accuracy.append(cat_acc)
            
            # Likelihood accuracy
            like_acc = self._calculate_numerical_accuracy(
                pred_assessment.get('likelihood'),
                ref_assessment.get('likelihood')
            )
            likelihood_accuracy.append(like_acc)
            
            # Impact accuracy
            imp_acc = self._calculate_numerical_accuracy(
                pred_assessment.get('impact'),
                ref_assessment.get('impact')
            )
            impact_accuracy.append(imp_acc)
        
        return {
            'risk_assessment_accuracy': np.mean([
                np.mean(risk_level_accuracy),
                np.mean(risk_category_accuracy),
                np.mean(likelihood_accuracy),
                np.mean(impact_accuracy)
            ]),
            'risk_level_accuracy': np.mean(risk_level_accuracy),
            'risk_category_accuracy': np.mean(risk_category_accuracy),
            'likelihood_accuracy': np.mean(likelihood_accuracy),
            'impact_accuracy': np.mean(impact_accuracy)
        }
    
    def _extract_risk_assessment(self, text: str) -> Dict[str, Any]:
        """Extract risk assessment components from text"""
        text_lower = text.lower()
        
        # Extract risk level
        risk_level = None
        for level in self.risk_levels:
            if f'{level} risk' in text_lower or f'risk level: {level}' in text_lower:
                risk_level = level
                break
        
        # Extract risk categories
        risk_categories = []
        for category in self.risk_categories:
            if category in text_lower:
                risk_categories.append(category)
        
        # Extract numerical values (likelihood and impact)
        likelihood = self._extract_probability(text_lower, 'likelihood')
        impact = self._extract_probability(text_lower, 'impact')
        
        return {
            'risk_level': risk_level,
            'risk_categories': risk_categories,
            'likelihood': likelihood,
            'impact': impact
        }
    
    def _extract_probability(self, text: str, prob_type: str) -> Optional[float]:
        """Extract probability values from text"""
        # Look for patterns like "likelihood: 0.3" or "30% probability"
        patterns = [
            rf'{prob_type}:?\s*(\d+\.?\d*)%',
            rf'{prob_type}:?\s*(\d+\.?\d*)',
            rf'(\d+\.?\d*)%\s*{prob_type}',
            rf'(\d+\.?\d*)\s*{prob_type}'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                value = float(match.group(1))
                # Convert percentage to decimal if > 1
                return value / 100 if value > 1 else value
        
        return None
    
    def _calculate_risk_level_accuracy(self, pred_level: Optional[str], ref_level: Optional[str]) -> float:
        """Calculate accuracy for risk level prediction"""
        if ref_level is None:
            return 1.0 if pred_level is None else 0.0
        
        if pred_level is None:
            return 0.0
        
        if pred_level == ref_level:
            return 1.0
        
        # Partial credit for adjacent levels
        pred_num = self.risk_levels.get(pred_level, -1)
        ref_num = self.risk_levels.get(ref_level, -1)
        
        if pred_num >= 0 and ref_num >= 0:
            diff = abs(pred_num - ref_num)
            return max(0, 1 - diff * 0.3)  # 0.3 penalty per level difference
        
        return 0.0
    
    def _calculate_risk_category_accuracy(self, pred_categories: List[str], ref_categories: List[str]) -> float:
        """Calculate accuracy for risk category prediction"""
        if not ref_categories:
            return 1.0 if not pred_categories else 0.0
        
        if not pred_categories:
            return 0.0
        
        # Jaccard similarity
        pred_set = set(pred_categories)
        ref_set = set(ref_categories)
        
        intersection = len(pred_set & ref_set)
        union = len(pred_set | ref_set)
        
        return intersection / union if union > 0 else 0.0
    
    def _calculate_numerical_accuracy(self, pred_value: Optional[float], ref_value: Optional[float]) -> float:
        """Calculate accuracy for numerical predictions"""
        if ref_value is None:
            return 1.0 if pred_value is None else 0.0
        
        if pred_value is None:
            return 0.0
        
        # Calculate relative error
        error = abs(pred_value - ref_value) / max(ref_value, 0.01)
        return max(0, 1 - error)

class PolicyGenerationQualityMetric(BaseBusinessMetric):
    """Metric for evaluating policy document generation quality"""
    
    def __init__(self):
        super().__init__("policy_generation_quality", weight=1.5)
        
        # Policy document structure elements
        self.policy_elements = {
            'purpose': ['purpose', 'objective', 'goal'],
            'scope': ['scope', 'applicability', 'coverage'],
            'responsibilities': ['responsibilities', 'roles', 'accountabilities'],
            'procedures': ['procedures', 'process', 'steps'],
            'compliance': ['compliance', 'requirements', 'standards'],
            'violations': ['violations', 'non-compliance', 'penalties'],
            'review': ['review', 'update', 'revision']
        }
        
        # Policy quality indicators
        self.quality_indicators = [
            'clear language', 'specific requirements', 'measurable objectives',
            'defined responsibilities', 'compliance procedures', 'enforcement mechanisms'
        ]
    
    def evaluate(self, predictions: List[str], references: List[str]) -> Dict[str, float]:
        """Evaluate policy generation quality"""
        if len(predictions) != len(references):
            return {'policy_generation_quality': 0.0}
        
        structure_scores = []
        clarity_scores = []
        completeness_scores = []
        compliance_scores = []
        
        for pred, ref in zip(predictions, references):
            # Structure quality
            struct_score = self._calculate_structure_quality(pred, ref)
            structure_scores.append(struct_score)
            
            # Clarity quality
            clarity_score = self._calculate_clarity_quality(pred)
            clarity_scores.append(clarity_score)
            
            # Completeness quality
            complete_score = self._calculate_completeness_quality(pred, ref)
            completeness_scores.append(complete_score)
            
            # Compliance alignment
            compliance_score = self._calculate_compliance_alignment(pred, ref)
            compliance_scores.append(compliance_score)
        
        return {
            'policy_generation_quality': np.mean([
                np.mean(structure_scores),
                np.mean(clarity_scores),
                np.mean(completeness_scores),
                np.mean(compliance_scores)
            ]),
            'structure_quality': np.mean(structure_scores),
            'clarity_quality': np.mean(clarity_scores),
            'completeness_quality': np.mean(completeness_scores),
            'compliance_alignment': np.mean(compliance_scores)
        }
    
    def _calculate_structure_quality(self, prediction: str, reference: str) -> float:
        """Calculate policy structure quality"""
        pred_elements = self._extract_policy_elements(prediction)
        ref_elements = self._extract_policy_elements(reference)
        
        total_score = 0.0
        total_elements = len(self.policy_elements)
        
        for element_type in self.policy_elements:
            pred_has = element_type in pred_elements
            ref_has = element_type in ref_elements
            
            if ref_has:
                total_score += 1.0 if pred_has else 0.0
            elif not pred_has:
                total_score += 1.0  # Correctly didn't include unnecessary element
        
        return total_score / total_elements
    
    def _extract_policy_elements(self, text: str) -> set:
        """Extract policy structure elements from text"""
        text_lower = text.lower()
        found_elements = set()
        
        for element_type, keywords in self.policy_elements.items():
            for keyword in keywords:
                if keyword in text_lower:
                    found_elements.add(element_type)
                    break
        
        return found_elements
    
    def _calculate_clarity_quality(self, prediction: str) -> float:
        """Calculate policy clarity quality"""
        # Metrics for clarity
        sentence_count = len(re.findall(r'[.!?]+', prediction))
        word_count = len(prediction.split())
        
        if sentence_count == 0:
            return 0.0
        
        # Average sentence length (shorter is generally clearer for policies)
        avg_sentence_length = word_count / sentence_count
        length_score = max(0, 1 - (avg_sentence_length - 15) / 20)  # Optimal around 15 words
        
        # Presence of clear action words
        action_words = ['must', 'shall', 'will', 'should', 'required', 'prohibited']
        action_count = sum(1 for word in action_words if word in prediction.lower())
        action_score = min(action_count / 5, 1.0)  # Up to 5 action words for full score
        
        # Absence of ambiguous terms
        ambiguous_terms = ['might', 'could', 'perhaps', 'maybe', 'possibly']
        ambiguous_count = sum(1 for term in ambiguous_terms if term in prediction.lower())
        ambiguity_penalty = min(ambiguous_count * 0.2, 1.0)
        
        return (length_score * 0.4 + action_score * 0.4 + (1 - ambiguity_penalty) * 0.2)
    
    def _calculate_completeness_quality(self, prediction: str, reference: str) -> float:
        """Calculate policy completeness quality"""
        # Extract key concepts from reference
        ref_concepts = self._extract_key_concepts(reference)
        pred_concepts = self._extract_key_concepts(prediction)
        
        if not ref_concepts:
            return 1.0
        
        # Calculate coverage
        covered_concepts = len(pred_concepts & ref_concepts)
        return covered_concepts / len(ref_concepts)
    
    def _extract_key_concepts(self, text: str) -> set:
        """Extract key concepts from policy text"""
        # Simple concept extraction based on important terms
        important_terms = [
            'employee', 'management', 'compliance', 'violation', 'penalty',
            'procedure', 'requirement', 'responsibility', 'training', 'audit'
        ]
        
        text_lower = text.lower()
        found_concepts = set()
        
        for term in important_terms:
            if term in text_lower:
                found_concepts.add(term)
        
        return found_concepts
    
    def _calculate_compliance_alignment(self, prediction: str, reference: str) -> float:
        """Calculate alignment with compliance requirements"""
        # Look for compliance-specific language
        compliance_terms = [
            'regulatory requirement', 'legal obligation', 'compliance standard',
            'audit requirement', 'documentation requirement', 'reporting obligation'
        ]
        
        pred_lower = prediction.lower()
        ref_lower = reference.lower()
        
        pred_compliance = sum(1 for term in compliance_terms if term in pred_lower)
        ref_compliance = sum(1 for term in compliance_terms if term in ref_lower)
        
        if ref_compliance == 0:
            return 1.0 if pred_compliance == 0 else 0.5
        
        return min(pred_compliance / ref_compliance, 1.0)

class RegulatoryChangeDetectionMetric(BaseBusinessMetric):
    """Metric for evaluating regulatory change detection"""
    
    def __init__(self):
        super().__init__("regulatory_change_detection", weight=1.3)
    
    def evaluate(self, predictions: List[str], references: List[str]) -> Dict[str, float]:
        """Evaluate regulatory change detection"""
        if len(predictions) != len(references):
            return {'regulatory_change_detection_f1': 0.0}
        
        # Extract change indicators
        pred_changes = [self._extract_change_indicators(pred) for pred in predictions]
        ref_changes = [self._extract_change_indicators(ref) for ref in references]
        
        # Calculate binary classification metrics
        y_true = [1 if changes['has_change'] else 0 for changes in ref_changes]
        y_pred = [1 if changes['has_change'] else 0 for changes in pred_changes]
        
        if len(set(y_true)) > 1:  # At least two classes present
            precision, recall, f1, _ = precision_recall_fscore_support(
                y_true, y_pred, average='binary', zero_division=0
            )
        else:
            precision = recall = f1 = 0.0
        
        # Calculate impact level accuracy
        impact_accuracy = []
        for pred, ref in zip(pred_changes, ref_changes):
            if ref['impact_level'] is not None:
                impact_acc = 1.0 if pred['impact_level'] == ref['impact_level'] else 0.0
                impact_accuracy.append(impact_acc)
        
        return {
            'regulatory_change_detection_f1': f1,
            'change_detection_precision': precision,
            'change_detection_recall': recall,
            'impact_level_accuracy': np.mean(impact_accuracy) if impact_accuracy else 0.0
        }
    
    def _extract_change_indicators(self, text: str) -> Dict[str, Any]:
        """Extract change indicators from text"""
        text_lower = text.lower()
        
        # Change keywords
        change_keywords = [
            'new', 'updated', 'revised', 'amended', 'modified', 'changed',
            'introduced', 'effective', 'supersedes', 'replaces'
        ]
        
        has_change = any(keyword in text_lower for keyword in change_keywords)
        
        # Impact level keywords
        impact_levels = {
            'low': ['minor', 'small', 'limited', 'low impact'],
            'medium': ['moderate', 'medium', 'significant'],
            'high': ['major', 'substantial', 'high impact', 'critical'],
            'critical': ['critical', 'severe', 'emergency', 'immediate']
        }
        
        impact_level = None
        for level, keywords in impact_levels.items():
            if any(keyword in text_lower for keyword in keywords):
                impact_level = level
                break
        
        return {
            'has_change': has_change,
            'impact_level': impact_level
        }

class ComplianceEvaluationSuite:
    """Complete evaluation suite for compliance models"""
    
    def __init__(self):
        self.metrics = [
            ComplianceAccuracyMetric(),
            RiskAssessmentAccuracyMetric(),
            PolicyGenerationQualityMetric(),
            RegulatoryChangeDetectionMetric()
        ]
    
    def evaluate_compliance_model(
        self,
        predictions: List[str],
        references: List[str],
        task_types: List[str],
        regulation_types: List[str],
        jurisdictions: List[str]
    ) -> ComplianceEvaluationResult:
        """Evaluate compliance model performance"""
        
        # Overall metrics
        all_metrics = {}
        for metric in self.metrics:
            try:
                metric_results = metric.evaluate(predictions, references)
                all_metrics.update(metric_results)
            except Exception as e:
                logger.error(f"Error in metric {metric.name}: {e}")
                all_metrics[metric.name] = 0.0
        
        # Task-specific evaluation
        task_scores = self._evaluate_by_task(predictions, references, task_types)
        
        # Regulation-specific evaluation
        regulation_scores = self._evaluate_by_regulation(predictions, references, regulation_types)
        
        # Jurisdiction-specific evaluation
        jurisdiction_scores = self._evaluate_by_jurisdiction(predictions, references, jurisdictions)
        
        # Calculate overall compliance score
        overall_score = self._calculate_overall_compliance_score(all_metrics)
        
        return ComplianceEvaluationResult(
            overall_compliance_score=overall_score,
            regulation_specific_scores=regulation_scores,
            jurisdiction_specific_scores=jurisdiction_scores,
            task_specific_scores=task_scores,
            risk_assessment_accuracy=all_metrics.get('risk_assessment_accuracy', 0.0),
            policy_generation_quality=all_metrics.get('policy_generation_quality', 0.0),
            regulatory_change_detection_f1=all_metrics.get('regulatory_change_detection_f1', 0.0),
            detailed_metrics=all_metrics,
            timestamp=datetime.now().isoformat()
        )
    
    def _evaluate_by_task(self, predictions: List[str], references: List[str], task_types: List[str]) -> Dict[str, float]:
        """Evaluate performance by task type"""
        task_scores = {}
        task_groups = defaultdict(list)
        
        # Group by task type
        for i, task_type in enumerate(task_types):
            if i < len(predictions) and i < len(references):
                task_groups[task_type].append((predictions[i], references[i]))
        
        # Evaluate each task type
        for task_type, examples in task_groups.items():
            task_predictions = [ex[0] for ex in examples]
            task_references = [ex[1] for ex in examples]
            
            # Select appropriate metric based on task type
            if task_type == 'risk_assessment':
                metric = RiskAssessmentAccuracyMetric()
                result = metric.evaluate(task_predictions, task_references)
                task_scores[task_type] = result.get('risk_assessment_accuracy', 0.0)
            elif task_type == 'policy_generation':
                metric = PolicyGenerationQualityMetric()
                result = metric.evaluate(task_predictions, task_references)
                task_scores[task_type] = result.get('policy_generation_quality', 0.0)
            elif task_type == 'regulatory_change_detection':
                metric = RegulatoryChangeDetectionMetric()
                result = metric.evaluate(task_predictions, task_references)
                task_scores[task_type] = result.get('regulatory_change_detection_f1', 0.0)
            else:
                metric = ComplianceAccuracyMetric()
                result = metric.evaluate(task_predictions, task_references)
                task_scores[task_type] = result.get('compliance_accuracy', 0.0)
        
        return task_scores
    
    def _evaluate_by_regulation(self, predictions: List[str], references: List[str], regulation_types: List[str]) -> Dict[str, float]:
        """Evaluate performance by regulation type"""
        regulation_scores = {}
        regulation_groups = defaultdict(list)
        
        # Group by regulation type
        for i, regulation_type in enumerate(regulation_types):
            if i < len(predictions) and i < len(references):
                regulation_groups[regulation_type].append((predictions[i], references[i]))
        
        # Evaluate each regulation type
        metric = ComplianceAccuracyMetric()
        for regulation_type, examples in regulation_groups.items():
            reg_predictions = [ex[0] for ex in examples]
            reg_references = [ex[1] for ex in examples]
            
            result = metric.evaluate(reg_predictions, reg_references)
            regulation_scores[regulation_type] = result.get(f'{regulation_type}_accuracy', 
                                                          result.get('compliance_accuracy', 0.0))
        
        return regulation_scores
    
    def _evaluate_by_jurisdiction(self, predictions: List[str], references: List[str], jurisdictions: List[str]) -> Dict[str, float]:
        """Evaluate performance by jurisdiction"""
        jurisdiction_scores = {}
        jurisdiction_groups = defaultdict(list)
        
        # Group by jurisdiction
        for i, jurisdiction in enumerate(jurisdictions):
            if i < len(predictions) and i < len(references):
                jurisdiction_groups[jurisdiction].append((predictions[i], references[i]))
        
        # Evaluate each jurisdiction
        metric = ComplianceAccuracyMetric()
        for jurisdiction, examples in jurisdiction_groups.items():
            jur_predictions = [ex[0] for ex in examples]
            jur_references = [ex[1] for ex in examples]
            
            result = metric.evaluate(jur_predictions, jur_references)
            jurisdiction_scores[jurisdiction] = result.get('compliance_accuracy', 0.0)
        
        return jurisdiction_scores
    
    def _calculate_overall_compliance_score(self, metrics: Dict[str, float]) -> float:
        """Calculate weighted overall compliance score"""
        weights = {
            'compliance_accuracy': 0.3,
            'risk_assessment_accuracy': 0.25,
            'policy_generation_quality': 0.2,
            'regulatory_change_detection_f1': 0.15,
            'terminology_accuracy': 0.1
        }
        
        total_score = 0.0
        total_weight = 0.0
        
        for metric_name, weight in weights.items():
            if metric_name in metrics:
                total_score += metrics[metric_name] * weight
                total_weight += weight
        
        return total_score / total_weight if total_weight > 0 else 0.0

def main():
    """Example usage of compliance evaluation suite"""
    
    # Example predictions and references
    predictions = [
        "SOX compliance requires internal controls over financial reporting with annual management assessment.",
        "Risk assessment shows high likelihood (0.7) and medium impact (0.6) for operational disruption.",
        "Policy: All employees must complete data protection training annually and report violations immediately."
    ]
    
    references = [
        "Sarbanes-Oxley Act Section 404 mandates internal controls over financial reporting and management assessment.",
        "Risk scenario has likelihood 0.75 and impact 0.55 with high overall risk level for operational risk.",
        "Data protection policy requires annual training for all staff with immediate violation reporting procedures."
    ]
    
    task_types = ['compliance_analysis', 'risk_assessment', 'policy_generation']
    regulation_types = ['sox', 'sox', 'gdpr']
    jurisdictions = ['us_federal', 'us_federal', 'eu']
    
    # Initialize evaluation suite
    evaluator = ComplianceEvaluationSuite()
    
    # Run evaluation
    result = evaluator.evaluate_compliance_model(
        predictions=predictions,
        references=references,
        task_types=task_types,
        regulation_types=regulation_types,
        jurisdictions=jurisdictions
    )
    
    # Print results
    print(f"Overall Compliance Score: {result.overall_compliance_score:.3f}")
    print(f"Risk Assessment Accuracy: {result.risk_assessment_accuracy:.3f}")
    print(f"Policy Generation Quality: {result.policy_generation_quality:.3f}")
    print(f"Regulatory Change Detection F1: {result.regulatory_change_detection_f1:.3f}")

if __name__ == "__main__":
    main()
