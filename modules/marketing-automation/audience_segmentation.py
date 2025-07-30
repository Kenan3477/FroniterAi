"""
Audience Segmentation Component
Advanced audience segmentation using machine learning and behavioral analysis
"""

import asyncio
import json
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import logging
from collections import defaultdict
import statistics

logger = logging.getLogger(__name__)

@dataclass
class AudienceSegment:
    """Individual audience segment"""
    segment_id: str
    segment_name: str
    description: str
    size: int
    characteristics: Dict[str, Any]
    behavioral_patterns: Dict[str, Any]
    demographic_profile: Dict[str, Any]
    engagement_metrics: Dict[str, float]
    recommended_strategies: List[str]
    created_at: datetime

@dataclass
class SegmentationRule:
    """Rule-based segmentation criteria"""
    rule_id: str
    rule_name: str
    conditions: List[Dict[str, Any]]
    logic_operator: str  # AND, OR
    segment_assignment: str
    priority: int
    active: bool

@dataclass
class CustomerProfile:
    """Individual customer profile for segmentation"""
    customer_id: str
    demographic_data: Dict[str, Any]
    behavioral_data: Dict[str, Any]
    transaction_data: Dict[str, Any]
    engagement_data: Dict[str, Any]
    preferences: Dict[str, Any]
    segment_memberships: List[str]
    last_updated: datetime

class AudienceSegmentation:
    """
    Advanced audience segmentation system using machine learning
    and behavioral analysis for precise targeting
    """
    
    def __init__(self, parent_module):
        self.parent = parent_module
        self.segments = {}
        self.segmentation_rules = {}
        self.customer_profiles = {}
        self.ml_models = {}
        self.feature_processors = {}
        self.segmentation_config = self._load_segmentation_configuration()
        
        # Initialize ML components
        self._initialize_ml_components()
    
    def _load_segmentation_configuration(self) -> Dict[str, Any]:
        """Load segmentation configuration and parameters"""
        return {
            "segmentation_methods": {
                "demographic": {
                    "features": ["age", "gender", "income", "education", "location"],
                    "weight": 0.3
                },
                "behavioral": {
                    "features": ["purchase_frequency", "avg_order_value", "product_categories", "engagement_level"],
                    "weight": 0.4
                },
                "psychographic": {
                    "features": ["interests", "values", "lifestyle", "personality_traits"],
                    "weight": 0.2
                },
                "temporal": {
                    "features": ["recency", "frequency", "monetary", "seasonality"],
                    "weight": 0.1
                }
            },
            "ml_algorithms": {
                "kmeans": {
                    "min_clusters": 3,
                    "max_clusters": 12,
                    "random_state": 42
                },
                "dbscan": {
                    "eps": 0.5,
                    "min_samples": 5
                }
            },
            "segment_validation": {
                "min_segment_size": 100,
                "max_segments": 20,
                "silhouette_threshold": 0.3
            },
            "update_frequency": {
                "ml_segmentation": "weekly",
                "rule_based_segmentation": "daily",
                "profile_updates": "real_time"
            }
        }
    
    def _initialize_ml_components(self) -> None:
        """Initialize machine learning components for segmentation"""
        
        # Feature processors
        self.feature_processors = {
            "demographic": DemographicFeatureProcessor(),
            "behavioral": BehavioralFeatureProcessor(),
            "psychographic": PsychographicFeatureProcessor(),
            "temporal": TemporalFeatureProcessor()
        }
        
        # ML models
        self.ml_models = {
            "kmeans": None,  # Will be initialized during training
            "dbscan": None,
            "feature_scaler": StandardScaler(),
            "label_encoders": {}
        }
    
    async def create_audience_segments(
        self,
        segmentation_config: Dict[str, Any] = None
    ) -> Dict[str, AudienceSegment]:
        """Create comprehensive audience segments using multiple methods"""
        try:
            logger.info("Creating audience segments")
            
            # Use provided config or default
            config = segmentation_config or self.segmentation_config
            
            # Load customer data
            customer_data = await self._load_customer_data()
            
            # Create segments using different methods
            segments = {}
            
            # ML-based segmentation
            ml_segments = await self._create_ml_segments(customer_data, config)
            segments.update(ml_segments)
            
            # Rule-based segmentation
            rule_segments = await self._create_rule_based_segments(customer_data, config)
            segments.update(rule_segments)
            
            # Behavioral segmentation
            behavioral_segments = await self._create_behavioral_segments(customer_data, config)
            segments.update(behavioral_segments)
            
            # Value-based segmentation
            value_segments = await self._create_value_based_segments(customer_data, config)
            segments.update(value_segments)
            
            # Validate and optimize segments
            optimized_segments = await self._optimize_segments(segments, customer_data)
            
            # Store segments
            self.segments = optimized_segments
            
            # Generate targeting strategies for each segment
            for segment in optimized_segments.values():
                segment.recommended_strategies = await self._generate_targeting_strategies(segment)
            
            logger.info(f"Created {len(optimized_segments)} audience segments")
            return optimized_segments
            
        except Exception as e:
            logger.error(f"Error creating audience segments: {e}")
            raise
    
    async def _load_customer_data(self) -> pd.DataFrame:
        """Load customer data for segmentation analysis"""
        
        # In a real implementation, this would load from databases, APIs, etc.
        # For now, we'll create synthetic data
        
        np.random.seed(42)
        n_customers = 5000
        
        # Generate synthetic customer data
        customer_data = {
            "customer_id": [f"cust_{i:05d}" for i in range(n_customers)],
            
            # Demographics
            "age": np.random.normal(40, 15, n_customers).clip(18, 80),
            "gender": np.random.choice(["M", "F", "O"], n_customers, p=[0.48, 0.49, 0.03]),
            "income": np.random.lognormal(10.5, 0.8, n_customers).clip(20000, 200000),
            "education": np.random.choice(["High School", "Bachelor", "Master", "PhD"], n_customers, p=[0.3, 0.4, 0.2, 0.1]),
            "location": np.random.choice(["Urban", "Suburban", "Rural"], n_customers, p=[0.45, 0.4, 0.15]),
            
            # Behavioral
            "purchase_frequency": np.random.poisson(3, n_customers),
            "avg_order_value": np.random.exponential(75, n_customers).clip(10, 500),
            "total_spent": np.random.exponential(300, n_customers).clip(50, 5000),
            "days_since_last_purchase": np.random.exponential(30, n_customers).clip(0, 365),
            "product_categories": np.random.randint(1, 6, n_customers),
            
            # Engagement
            "email_open_rate": np.random.beta(2, 5, n_customers),
            "email_click_rate": np.random.beta(1, 10, n_customers),
            "website_sessions": np.random.poisson(5, n_customers),
            "social_media_engagement": np.random.beta(1.5, 8, n_customers),
            
            # Temporal
            "customer_lifetime_days": np.random.exponential(180, n_customers).clip(1, 1000),
            "seasonal_activity": np.random.choice(["Spring", "Summer", "Fall", "Winter"], n_customers)
        }
        
        df = pd.DataFrame(customer_data)
        
        # Calculate derived features
        df["clv"] = df["total_spent"] * (df["customer_lifetime_days"] / 365) * 1.2
        df["engagement_score"] = (
            df["email_open_rate"] * 0.3 +
            df["email_click_rate"] * 0.4 +
            df["social_media_engagement"] * 0.3
        )
        df["recency_score"] = 1 / (1 + df["days_since_last_purchase"] / 30)
        df["frequency_score"] = np.log1p(df["purchase_frequency"])
        df["monetary_score"] = np.log1p(df["total_spent"])
        
        return df
    
    async def _create_ml_segments(
        self,
        customer_data: pd.DataFrame,
        config: Dict[str, Any]
    ) -> Dict[str, AudienceSegment]:
        """Create segments using machine learning clustering"""
        
        # Prepare features for ML
        feature_data = await self._prepare_ml_features(customer_data, config)
        
        # Determine optimal number of clusters
        optimal_clusters = await self._find_optimal_clusters(feature_data, config)
        
        # Perform clustering
        cluster_labels = await self._perform_clustering(feature_data, optimal_clusters, config)
        
        # Create segments from clusters
        ml_segments = {}
        
        for cluster_id in np.unique(cluster_labels):
            if cluster_id == -1:  # Skip noise points in DBSCAN
                continue
            
            cluster_mask = cluster_labels == cluster_id
            cluster_customers = customer_data[cluster_mask]
            
            # Analyze cluster characteristics
            characteristics = await self._analyze_cluster_characteristics(cluster_customers)
            
            segment = AudienceSegment(
                segment_id=f"ml_cluster_{cluster_id}",
                segment_name=f"ML Segment {cluster_id + 1}",
                description=await self._generate_segment_description(characteristics),
                size=len(cluster_customers),
                characteristics=characteristics,
                behavioral_patterns=await self._analyze_behavioral_patterns(cluster_customers),
                demographic_profile=await self._analyze_demographic_profile(cluster_customers),
                engagement_metrics=await self._calculate_engagement_metrics(cluster_customers),
                recommended_strategies=[],  # Will be filled later
                created_at=datetime.now()
            )
            
            ml_segments[segment.segment_id] = segment
        
        return ml_segments
    
    async def _prepare_ml_features(
        self,
        customer_data: pd.DataFrame,
        config: Dict[str, Any]
    ) -> np.ndarray:
        """Prepare features for machine learning clustering"""
        
        feature_columns = []
        
        # Demographic features
        demographic_features = config["segmentation_methods"]["demographic"]["features"]
        for feature in demographic_features:
            if feature in customer_data.columns:
                if customer_data[feature].dtype == 'object':
                    # Encode categorical variables
                    if feature not in self.ml_models["label_encoders"]:
                        self.ml_models["label_encoders"][feature] = LabelEncoder()
                        encoded_values = self.ml_models["label_encoders"][feature].fit_transform(customer_data[feature])
                    else:
                        encoded_values = self.ml_models["label_encoders"][feature].transform(customer_data[feature])
                    feature_columns.append(encoded_values)
                else:
                    feature_columns.append(customer_data[feature].values)
        
        # Behavioral features
        behavioral_features = ["purchase_frequency", "avg_order_value", "total_spent", "recency_score", "frequency_score", "monetary_score"]
        for feature in behavioral_features:
            if feature in customer_data.columns:
                feature_columns.append(customer_data[feature].values)
        
        # Engagement features
        engagement_features = ["engagement_score", "email_open_rate", "email_click_rate", "website_sessions"]
        for feature in engagement_features:
            if feature in customer_data.columns:
                feature_columns.append(customer_data[feature].values)
        
        # Stack features
        feature_matrix = np.column_stack(feature_columns)
        
        # Scale features
        scaled_features = self.ml_models["feature_scaler"].fit_transform(feature_matrix)
        
        return scaled_features
    
    async def _find_optimal_clusters(
        self,
        feature_data: np.ndarray,
        config: Dict[str, Any]
    ) -> int:
        """Find optimal number of clusters using elbow method and silhouette analysis"""
        
        kmeans_config = config["ml_algorithms"]["kmeans"]
        min_clusters = kmeans_config["min_clusters"]
        max_clusters = kmeans_config["max_clusters"]
        
        inertias = []
        silhouette_scores = []
        
        for n_clusters in range(min_clusters, max_clusters + 1):
            kmeans = KMeans(
                n_clusters=n_clusters,
                random_state=kmeans_config["random_state"],
                n_init=10
            )
            cluster_labels = kmeans.fit_predict(feature_data)
            
            inertias.append(kmeans.inertia_)
            
            if n_clusters > 1:
                silhouette_avg = silhouette_score(feature_data, cluster_labels)
                silhouette_scores.append(silhouette_avg)
            else:
                silhouette_scores.append(0)
        
        # Find elbow point
        elbow_point = await self._find_elbow_point(inertias)
        
        # Find best silhouette score
        best_silhouette_idx = np.argmax(silhouette_scores)
        best_silhouette_clusters = min_clusters + best_silhouette_idx
        
        # Choose between elbow and silhouette methods
        if silhouette_scores[best_silhouette_idx] > config["segment_validation"]["silhouette_threshold"]:
            optimal_clusters = best_silhouette_clusters
        else:
            optimal_clusters = min_clusters + elbow_point
        
        return optimal_clusters
    
    async def _find_elbow_point(self, inertias: List[float]) -> int:
        """Find elbow point in inertia curve"""
        
        # Calculate second derivative to find elbow
        if len(inertias) < 3:
            return 0
        
        # Normalize inertias
        normalized_inertias = np.array(inertias) / max(inertias)
        
        # Calculate differences
        first_diff = np.diff(normalized_inertias)
        second_diff = np.diff(first_diff)
        
        # Find point with maximum curvature
        elbow_point = np.argmax(np.abs(second_diff))
        
        return elbow_point
    
    async def _perform_clustering(
        self,
        feature_data: np.ndarray,
        n_clusters: int,
        config: Dict[str, Any]
    ) -> np.ndarray:
        """Perform clustering using selected algorithm"""
        
        # Use K-means as primary clustering algorithm
        kmeans = KMeans(
            n_clusters=n_clusters,
            random_state=config["ml_algorithms"]["kmeans"]["random_state"],
            n_init=10
        )
        
        cluster_labels = kmeans.fit_predict(feature_data)
        
        # Store trained model
        self.ml_models["kmeans"] = kmeans
        
        return cluster_labels
    
    async def _analyze_cluster_characteristics(
        self,
        cluster_data: pd.DataFrame
    ) -> Dict[str, Any]:
        """Analyze characteristics of a customer cluster"""
        
        characteristics = {}
        
        # Demographic characteristics
        characteristics["demographics"] = {
            "avg_age": float(cluster_data["age"].mean()),
            "gender_distribution": cluster_data["gender"].value_counts().to_dict(),
            "avg_income": float(cluster_data["income"].mean()),
            "education_distribution": cluster_data["education"].value_counts().to_dict(),
            "location_distribution": cluster_data["location"].value_counts().to_dict()
        }
        
        # Behavioral characteristics
        characteristics["behavior"] = {
            "avg_purchase_frequency": float(cluster_data["purchase_frequency"].mean()),
            "avg_order_value": float(cluster_data["avg_order_value"].mean()),
            "avg_total_spent": float(cluster_data["total_spent"].mean()),
            "avg_clv": float(cluster_data["clv"].mean()),
            "avg_days_since_last_purchase": float(cluster_data["days_since_last_purchase"].mean())
        }
        
        # Engagement characteristics
        characteristics["engagement"] = {
            "avg_email_open_rate": float(cluster_data["email_open_rate"].mean()),
            "avg_email_click_rate": float(cluster_data["email_click_rate"].mean()),
            "avg_website_sessions": float(cluster_data["website_sessions"].mean()),
            "avg_engagement_score": float(cluster_data["engagement_score"].mean())
        }
        
        return characteristics
    
    async def _create_rule_based_segments(
        self,
        customer_data: pd.DataFrame,
        config: Dict[str, Any]
    ) -> Dict[str, AudienceSegment]:
        """Create segments using predefined business rules"""
        
        rule_segments = {}
        
        # High-value customers
        high_value_mask = (customer_data["clv"] > customer_data["clv"].quantile(0.8))
        high_value_customers = customer_data[high_value_mask]
        
        if len(high_value_customers) >= config["segment_validation"]["min_segment_size"]:
            segment = await self._create_segment_from_data(
                "high_value_customers",
                "High-Value Customers",
                "Customers with high CLV and purchase frequency",
                high_value_customers
            )
            rule_segments[segment.segment_id] = segment
        
        # New customers
        new_customer_mask = (customer_data["customer_lifetime_days"] <= 30)
        new_customers = customer_data[new_customer_mask]
        
        if len(new_customers) >= config["segment_validation"]["min_segment_size"]:
            segment = await self._create_segment_from_data(
                "new_customers",
                "New Customers",
                "Customers acquired within the last 30 days",
                new_customers
            )
            rule_segments[segment.segment_id] = segment
        
        # At-risk customers
        at_risk_mask = (
            (customer_data["days_since_last_purchase"] > 90) &
            (customer_data["total_spent"] > customer_data["total_spent"].median())
        )
        at_risk_customers = customer_data[at_risk_mask]
        
        if len(at_risk_customers) >= config["segment_validation"]["min_segment_size"]:
            segment = await self._create_segment_from_data(
                "at_risk_customers",
                "At-Risk Customers",
                "Previously valuable customers who haven't purchased recently",
                at_risk_customers
            )
            rule_segments[segment.segment_id] = segment
        
        # Highly engaged customers
        engaged_mask = (customer_data["engagement_score"] > customer_data["engagement_score"].quantile(0.75))
        engaged_customers = customer_data[engaged_mask]
        
        if len(engaged_customers) >= config["segment_validation"]["min_segment_size"]:
            segment = await self._create_segment_from_data(
                "highly_engaged",
                "Highly Engaged Customers",
                "Customers with high email and social media engagement",
                engaged_customers
            )
            rule_segments[segment.segment_id] = segment
        
        return rule_segments
    
    async def _create_behavioral_segments(
        self,
        customer_data: pd.DataFrame,
        config: Dict[str, Any]
    ) -> Dict[str, AudienceSegment]:
        """Create segments based on behavioral patterns"""
        
        behavioral_segments = {}
        
        # RFM segmentation (Recency, Frequency, Monetary)
        rfm_segments = await self._create_rfm_segments(customer_data, config)
        behavioral_segments.update(rfm_segments)
        
        # Purchase behavior segments
        purchase_segments = await self._create_purchase_behavior_segments(customer_data, config)
        behavioral_segments.update(purchase_segments)
        
        return behavioral_segments
    
    async def _create_rfm_segments(
        self,
        customer_data: pd.DataFrame,
        config: Dict[str, Any]
    ) -> Dict[str, AudienceSegment]:
        """Create RFM (Recency, Frequency, Monetary) segments"""
        
        # Calculate RFM scores
        customer_data = customer_data.copy()
        customer_data["R_score"] = pd.qcut(customer_data["recency_score"], 5, labels=[1, 2, 3, 4, 5])
        customer_data["F_score"] = pd.qcut(customer_data["frequency_score"], 5, labels=[1, 2, 3, 4, 5])
        customer_data["M_score"] = pd.qcut(customer_data["monetary_score"], 5, labels=[1, 2, 3, 4, 5])
        
        # Create RFM score
        customer_data["RFM_score"] = customer_data["R_score"].astype(str) + customer_data["F_score"].astype(str) + customer_data["M_score"].astype(str)
        
        # Define RFM segment rules
        rfm_rules = {
            "champions": ["555", "554", "544", "545", "454", "455", "445"],
            "loyal_customers": ["543", "444", "435", "355", "354", "345", "344", "335"],
            "potential_loyalists": ["512", "511", "422", "421", "412", "411", "311"],
            "new_customers": ["512", "511", "422", "421", "412", "411", "311"],
            "promising": ["413", "414", "313", "314", "315", "325", "324"],
            "need_attention": ["155", "154", "144", "214", "215", "115", "114"],
            "about_to_sleep": ["155", "254", "344", "335", "434", "343"],
            "at_risk": ["155", "254", "144", "214", "114", "124"],
            "cannot_lose_them": ["155", "154", "245", "144", "234", "235", "244"],
            "hibernating": ["155", "154", "245", "144", "234", "235", "244", "125", "115"]
        }
        
        rfm_segments = {}
        
        for segment_name, score_list in rfm_rules.items():
            segment_mask = customer_data["RFM_score"].isin(score_list)
            segment_customers = customer_data[segment_mask]
            
            if len(segment_customers) >= config["segment_validation"]["min_segment_size"]:
                segment = await self._create_segment_from_data(
                    f"rfm_{segment_name}",
                    f"RFM: {segment_name.replace('_', ' ').title()}",
                    f"RFM-based segment: {segment_name}",
                    segment_customers
                )
                rfm_segments[segment.segment_id] = segment
        
        return rfm_segments
    
    async def _create_purchase_behavior_segments(
        self,
        customer_data: pd.DataFrame,
        config: Dict[str, Any]
    ) -> Dict[str, AudienceSegment]:
        """Create segments based on purchase behavior patterns"""
        
        purchase_segments = {}
        
        # Frequent buyers
        frequent_mask = customer_data["purchase_frequency"] > customer_data["purchase_frequency"].quantile(0.8)
        frequent_buyers = customer_data[frequent_mask]
        
        if len(frequent_buyers) >= config["segment_validation"]["min_segment_size"]:
            segment = await self._create_segment_from_data(
                "frequent_buyers",
                "Frequent Buyers",
                "Customers with high purchase frequency",
                frequent_buyers
            )
            purchase_segments[segment.segment_id] = segment
        
        # Seasonal shoppers
        seasonal_mask = customer_data["seasonal_activity"].notna()
        seasonal_shoppers = customer_data[seasonal_mask]
        
        if len(seasonal_shoppers) >= config["segment_validation"]["min_segment_size"]:
            segment = await self._create_segment_from_data(
                "seasonal_shoppers",
                "Seasonal Shoppers",
                "Customers with strong seasonal purchase patterns",
                seasonal_shoppers
            )
            purchase_segments[segment.segment_id] = segment
        
        return purchase_segments
    
    async def _create_value_based_segments(
        self,
        customer_data: pd.DataFrame,
        config: Dict[str, Any]
    ) -> Dict[str, AudienceSegment]:
        """Create segments based on customer value"""
        
        value_segments = {}
        
        # CLV quartiles
        clv_quartiles = customer_data["clv"].quantile([0.25, 0.5, 0.75])
        
        # High CLV segment
        high_clv_mask = customer_data["clv"] > clv_quartiles[0.75]
        high_clv_customers = customer_data[high_clv_mask]
        
        if len(high_clv_customers) >= config["segment_validation"]["min_segment_size"]:
            segment = await self._create_segment_from_data(
                "high_clv",
                "High Customer Lifetime Value",
                "Top 25% customers by CLV",
                high_clv_customers
            )
            value_segments[segment.segment_id] = segment
        
        # Medium CLV segment
        medium_clv_mask = (customer_data["clv"] > clv_quartiles[0.25]) & (customer_data["clv"] <= clv_quartiles[0.75])
        medium_clv_customers = customer_data[medium_clv_mask]
        
        if len(medium_clv_customers) >= config["segment_validation"]["min_segment_size"]:
            segment = await self._create_segment_from_data(
                "medium_clv",
                "Medium Customer Lifetime Value",
                "Middle 50% customers by CLV",
                medium_clv_customers
            )
            value_segments[segment.segment_id] = segment
        
        return value_segments
    
    async def _create_segment_from_data(
        self,
        segment_id: str,
        segment_name: str,
        description: str,
        customer_data: pd.DataFrame
    ) -> AudienceSegment:
        """Create audience segment from customer data"""
        
        segment = AudienceSegment(
            segment_id=segment_id,
            segment_name=segment_name,
            description=description,
            size=len(customer_data),
            characteristics=await self._analyze_cluster_characteristics(customer_data),
            behavioral_patterns=await self._analyze_behavioral_patterns(customer_data),
            demographic_profile=await self._analyze_demographic_profile(customer_data),
            engagement_metrics=await self._calculate_engagement_metrics(customer_data),
            recommended_strategies=[],
            created_at=datetime.now()
        )
        
        return segment
    
    async def _analyze_behavioral_patterns(
        self,
        customer_data: pd.DataFrame
    ) -> Dict[str, Any]:
        """Analyze behavioral patterns of customer segment"""
        
        patterns = {
            "purchase_patterns": {
                "average_time_between_purchases": float(customer_data["days_since_last_purchase"].mean()),
                "purchase_frequency_distribution": customer_data["purchase_frequency"].describe().to_dict(),
                "order_value_distribution": customer_data["avg_order_value"].describe().to_dict()
            },
            "engagement_patterns": {
                "email_engagement": {
                    "avg_open_rate": float(customer_data["email_open_rate"].mean()),
                    "avg_click_rate": float(customer_data["email_click_rate"].mean())
                },
                "website_behavior": {
                    "avg_sessions": float(customer_data["website_sessions"].mean()),
                    "engagement_score": float(customer_data["engagement_score"].mean())
                }
            },
            "temporal_patterns": {
                "customer_lifecycle_stage": self._determine_lifecycle_stage(customer_data),
                "seasonal_preferences": customer_data["seasonal_activity"].value_counts().to_dict()
            }
        }
        
        return patterns
    
    async def _analyze_demographic_profile(
        self,
        customer_data: pd.DataFrame
    ) -> Dict[str, Any]:
        """Analyze demographic profile of customer segment"""
        
        profile = {
            "age_statistics": {
                "mean": float(customer_data["age"].mean()),
                "median": float(customer_data["age"].median()),
                "std": float(customer_data["age"].std())
            },
            "gender_distribution": customer_data["gender"].value_counts().to_dict(),
            "income_statistics": {
                "mean": float(customer_data["income"].mean()),
                "median": float(customer_data["income"].median()),
                "quartiles": customer_data["income"].quantile([0.25, 0.5, 0.75]).to_dict()
            },
            "education_distribution": customer_data["education"].value_counts().to_dict(),
            "location_distribution": customer_data["location"].value_counts().to_dict()
        }
        
        return profile
    
    async def _calculate_engagement_metrics(
        self,
        customer_data: pd.DataFrame
    ) -> Dict[str, float]:
        """Calculate engagement metrics for customer segment"""
        
        metrics = {
            "email_engagement_rate": float(customer_data["engagement_score"].mean()),
            "average_open_rate": float(customer_data["email_open_rate"].mean()),
            "average_click_rate": float(customer_data["email_click_rate"].mean()),
            "website_engagement": float(customer_data["website_sessions"].mean()),
            "social_engagement": float(customer_data["social_media_engagement"].mean()),
            "overall_engagement_score": float(customer_data["engagement_score"].mean())
        }
        
        return metrics
    
    def _determine_lifecycle_stage(self, customer_data: pd.DataFrame) -> str:
        """Determine the predominant customer lifecycle stage"""
        
        avg_lifetime = customer_data["customer_lifetime_days"].mean()
        avg_recency = customer_data["days_since_last_purchase"].mean()
        
        if avg_lifetime <= 30:
            return "new"
        elif avg_lifetime <= 90:
            return "growing"
        elif avg_recency <= 30:
            return "active"
        elif avg_recency <= 90:
            return "declining"
        else:
            return "dormant"
    
    async def _optimize_segments(
        self,
        segments: Dict[str, AudienceSegment],
        customer_data: pd.DataFrame
    ) -> Dict[str, AudienceSegment]:
        """Optimize segments by removing overlaps and ensuring quality"""
        
        optimized_segments = {}
        
        # Filter segments by minimum size
        min_size = self.segmentation_config["segment_validation"]["min_segment_size"]
        
        for segment_id, segment in segments.items():
            if segment.size >= min_size:
                optimized_segments[segment_id] = segment
        
        # Ensure maximum number of segments
        max_segments = self.segmentation_config["segment_validation"]["max_segments"]
        
        if len(optimized_segments) > max_segments:
            # Keep segments with highest engagement scores
            segment_scores = {
                seg_id: seg.engagement_metrics.get("overall_engagement_score", 0)
                for seg_id, seg in optimized_segments.items()
            }
            
            top_segments = sorted(segment_scores.items(), key=lambda x: x[1], reverse=True)[:max_segments]
            optimized_segments = {seg_id: optimized_segments[seg_id] for seg_id, _ in top_segments}
        
        return optimized_segments
    
    async def _generate_targeting_strategies(
        self,
        segment: AudienceSegment
    ) -> List[str]:
        """Generate recommended targeting strategies for segment"""
        
        strategies = []
        
        # Engagement-based strategies
        engagement_score = segment.engagement_metrics.get("overall_engagement_score", 0)
        
        if engagement_score > 0.5:
            strategies.append("High-engagement content and premium offers")
            strategies.append("Cross-sell and upsell campaigns")
        elif engagement_score > 0.3:
            strategies.append("Educational content and value-driven messaging")
            strategies.append("Retargeting campaigns with personalized offers")
        else:
            strategies.append("Re-engagement campaigns with incentives")
            strategies.append("Simplified messaging and clear value propositions")
        
        # Value-based strategies
        avg_clv = segment.characteristics.get("behavior", {}).get("avg_clv", 0)
        
        if avg_clv > 1000:
            strategies.append("VIP treatment and exclusive access")
            strategies.append("High-touch customer service")
        elif avg_clv > 500:
            strategies.append("Loyalty programs and rewards")
            strategies.append("Personalized product recommendations")
        else:
            strategies.append("Value-focused messaging and promotions")
            strategies.append("Educational content to increase engagement")
        
        # Behavioral strategies
        behavioral_patterns = segment.behavioral_patterns
        purchase_frequency = behavioral_patterns.get("purchase_patterns", {}).get("purchase_frequency_distribution", {}).get("mean", 0)
        
        if purchase_frequency > 5:
            strategies.append("Frequent buyer programs and bulk discounts")
        elif purchase_frequency > 2:
            strategies.append("Regular communication and product updates")
        else:
            strategies.append("Trigger-based campaigns for abandoned carts")
            strategies.append("Seasonal promotions and limited-time offers")
        
        return strategies[:5]  # Return top 5 strategies
    
    async def _generate_segment_description(
        self,
        characteristics: Dict[str, Any]
    ) -> str:
        """Generate human-readable segment description"""
        
        demographics = characteristics.get("demographics", {})
        behavior = characteristics.get("behavior", {})
        engagement = characteristics.get("engagement", {})
        
        # Extract key characteristics
        avg_age = demographics.get("avg_age", 0)
        avg_income = demographics.get("avg_income", 0)
        avg_clv = behavior.get("avg_clv", 0)
        engagement_score = engagement.get("avg_engagement_score", 0)
        
        # Generate description based on characteristics
        age_group = "young" if avg_age < 30 else "middle-aged" if avg_age < 50 else "mature"
        income_level = "high-income" if avg_income > 75000 else "middle-income" if avg_income > 40000 else "budget-conscious"
        value_level = "high-value" if avg_clv > 1000 else "medium-value" if avg_clv > 500 else "developing"
        engagement_level = "highly engaged" if engagement_score > 0.5 else "moderately engaged" if engagement_score > 0.3 else "low engagement"
        
        description = f"{age_group.title()} {income_level} customers with {value_level} potential and {engagement_level}"
        
        return description


# Feature processor classes
class DemographicFeatureProcessor:
    """Processes demographic features for segmentation"""
    
    def process_features(self, customer_data: pd.DataFrame) -> pd.DataFrame:
        """Process demographic features"""
        processed_data = customer_data.copy()
        
        # Age groups
        processed_data["age_group"] = pd.cut(
            processed_data["age"],
            bins=[0, 25, 35, 45, 55, 100],
            labels=["18-25", "26-35", "36-45", "46-55", "55+"]
        )
        
        # Income brackets
        processed_data["income_bracket"] = pd.qcut(
            processed_data["income"],
            q=5,
            labels=["Low", "Lower-Mid", "Middle", "Upper-Mid", "High"]
        )
        
        return processed_data


class BehavioralFeatureProcessor:
    """Processes behavioral features for segmentation"""
    
    def process_features(self, customer_data: pd.DataFrame) -> pd.DataFrame:
        """Process behavioral features"""
        processed_data = customer_data.copy()
        
        # Purchase behavior categories
        processed_data["purchase_behavior"] = pd.cut(
            processed_data["purchase_frequency"],
            bins=[0, 1, 3, 6, float('inf')],
            labels=["Rare", "Occasional", "Regular", "Frequent"]
        )
        
        # Spending behavior
        processed_data["spending_level"] = pd.qcut(
            processed_data["total_spent"],
            q=4,
            labels=["Low", "Medium", "High", "Premium"]
        )
        
        return processed_data


class PsychographicFeatureProcessor:
    """Processes psychographic features for segmentation"""
    
    def process_features(self, customer_data: pd.DataFrame) -> pd.DataFrame:
        """Process psychographic features"""
        processed_data = customer_data.copy()
        
        # Interest categories (would be derived from actual behavioral data)
        # For now, using synthetic categorization
        processed_data["interest_category"] = np.random.choice(
            ["Technology", "Fashion", "Home", "Travel", "Health"],
            size=len(processed_data)
        )
        
        return processed_data


class TemporalFeatureProcessor:
    """Processes temporal features for segmentation"""
    
    def process_features(self, customer_data: pd.DataFrame) -> pd.DataFrame:
        """Process temporal features"""
        processed_data = customer_data.copy()
        
        # Customer lifecycle stage
        processed_data["lifecycle_stage"] = processed_data.apply(
            lambda row: self._determine_lifecycle_stage(
                row["customer_lifetime_days"],
                row["days_since_last_purchase"]
            ),
            axis=1
        )
        
        return processed_data
    
    def _determine_lifecycle_stage(self, lifetime_days: float, days_since_purchase: float) -> str:
        """Determine customer lifecycle stage"""
        if lifetime_days <= 30:
            return "New"
        elif lifetime_days <= 90:
            return "Growing"
        elif days_since_purchase <= 30:
            return "Active"
        elif days_since_purchase <= 90:
            return "Declining"
        else:
            return "Dormant"
