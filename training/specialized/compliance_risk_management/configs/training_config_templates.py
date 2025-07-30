"""
Configuration Templates for Compliance Risk Management Training

Provides pre-configured training setups for different compliance scenarios,
regulations, and jurisdictions with optimized hyperparameters.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from pathlib import Path
import json

# Import base configurations and enums
import sys
project_root = Path(__file__).parent.parent.parent.parent
sys.path.append(str(project_root))

from training.specialized.compliance_risk_management.models.compliance_specialized_trainer import ComplianceTrainingConfig
from training.specialized.compliance_risk_management.data_preparation.compliance_data_generator import (
    RegulationType, Jurisdiction, ComplianceArea
)

@dataclass
class ComplianceConfigTemplate:
    """Template for compliance training configurations"""
    name: str
    description: str
    config: ComplianceTrainingConfig
    recommended_dataset_size: int
    training_duration_estimate: str
    gpu_memory_requirement: str
    use_cases: List[str]

class ComplianceConfigurationFactory:
    """Factory for creating compliance training configurations"""
    
    @staticmethod
    def create_sox_compliance_config(
        output_dir: str = "training/output/sox_compliance",
        model_size: str = "small"
    ) -> ComplianceConfigTemplate:
        """Create configuration for SOX compliance training"""
        
        if model_size == "small":
            model_name = "microsoft/DialoGPT-small"
            batch_size = 4
            max_length = 512
            epochs = 3
            lr = 5e-5
        elif model_size == "medium":
            model_name = "microsoft/DialoGPT-medium"
            batch_size = 2
            max_length = 1024
            epochs = 5
            lr = 3e-5
        else:  # large
            model_name = "microsoft/DialoGPT-large"
            batch_size = 1
            max_length = 2048
            epochs = 8
            lr = 2e-5
        
        config = ComplianceTrainingConfig(
            model_name=model_name,
            output_dir=output_dir,
            
            # Training parameters optimized for SOX
            num_train_epochs=epochs,
            per_device_train_batch_size=batch_size,
            per_device_eval_batch_size=batch_size,
            learning_rate=lr,
            warmup_steps=500,
            max_length=max_length,
            
            # SOX-specific parameters
            regulation_types=[RegulationType.SOX],
            jurisdictions=[Jurisdiction.US_FEDERAL, Jurisdiction.US_STATE],
            compliance_tasks=[
                'compliance_analysis', 'risk_assessment', 
                'policy_generation', 'internal_controls_assessment'
            ],
            
            # Transfer learning for financial compliance
            use_transfer_learning=True,
            freeze_base_layers=True,
            use_lora=True,
            lora_rank=16,
            lora_alpha=32,
            lora_dropout=0.05,
            
            # Multi-task learning with SOX focus
            use_multi_task_learning=True,
            task_weights={
                'compliance_analysis': 0.35,
                'risk_assessment': 0.25,
                'policy_generation': 0.2,
                'internal_controls_assessment': 0.2
            },
            
            # Evaluation strategy
            evaluation_strategy="steps",
            eval_steps=200,
            save_strategy="steps",
            save_steps=200,
            logging_steps=50,
            save_total_limit=3,
            
            # Additional SOX-specific settings
            gradient_accumulation_steps=2,
            dataloader_num_workers=2,
            remove_unused_columns=False,
            load_best_model_at_end=True,
            metric_for_best_model="compliance_accuracy"
        )
        
        return ComplianceConfigTemplate(
            name="SOX Compliance Training",
            description="Specialized training for Sarbanes-Oxley Act compliance including internal controls, financial reporting, and management assessments",
            config=config,
            recommended_dataset_size=5000 if model_size == "small" else 10000,
            training_duration_estimate="2-4 hours" if model_size == "small" else "6-12 hours",
            gpu_memory_requirement="8GB" if model_size == "small" else "16GB+",
            use_cases=[
                "Internal controls assessment",
                "Financial reporting compliance",
                "Management certification support",
                "Audit preparation",
                "SOX 404 compliance documentation"
            ]
        )
    
    @staticmethod
    def create_gdpr_compliance_config(
        output_dir: str = "training/output/gdpr_compliance",
        multi_language: bool = True
    ) -> ComplianceConfigTemplate:
        """Create configuration for GDPR compliance training"""
        
        # Multi-language support for EU jurisdictions
        model_name = "microsoft/DialoGPT-medium" if multi_language else "microsoft/DialoGPT-small"
        jurisdictions = [Jurisdiction.EU, Jurisdiction.UK] if multi_language else [Jurisdiction.EU]
        
        config = ComplianceTrainingConfig(
            model_name=model_name,
            output_dir=output_dir,
            
            # Training parameters optimized for GDPR
            num_train_epochs=4,
            per_device_train_batch_size=3,
            per_device_eval_batch_size=3,
            learning_rate=4e-5,
            warmup_steps=300,
            max_length=1024,
            
            # GDPR-specific parameters
            regulation_types=[RegulationType.GDPR],
            jurisdictions=jurisdictions,
            compliance_tasks=[
                'compliance_analysis', 'privacy_impact_assessment',
                'policy_generation', 'data_breach_response'
            ],
            
            # Transfer learning for privacy compliance
            use_transfer_learning=True,
            freeze_base_layers=True,
            use_lora=True,
            lora_rank=12,
            lora_alpha=24,
            lora_dropout=0.1,
            
            # Multi-task learning with privacy focus
            use_multi_task_learning=True,
            task_weights={
                'compliance_analysis': 0.3,
                'privacy_impact_assessment': 0.3,
                'policy_generation': 0.25,
                'data_breach_response': 0.15
            },
            
            # Evaluation strategy
            evaluation_strategy="epoch",
            save_strategy="epoch",
            logging_steps=100,
            save_total_limit=2,
            
            # GDPR-specific settings
            gradient_accumulation_steps=4,
            fp16=True,  # Memory optimization
            dataloader_num_workers=1,
            remove_unused_columns=False,
            load_best_model_at_end=True,
            metric_for_best_model="privacy_compliance_score"
        )
        
        return ComplianceConfigTemplate(
            name="GDPR Compliance Training",
            description="Specialized training for General Data Protection Regulation compliance including privacy rights, data processing, and breach notifications",
            config=config,
            recommended_dataset_size=7500,
            training_duration_estimate="4-8 hours",
            gpu_memory_requirement="12GB",
            use_cases=[
                "Privacy policy generation",
                "Data protection impact assessments",
                "Consent management",
                "Data breach notification procedures",
                "Data subject rights handling"
            ]
        )
    
    @staticmethod
    def create_basel_iii_config(
        output_dir: str = "training/output/basel_iii",
        focus_area: str = "capital_adequacy"
    ) -> ComplianceConfigTemplate:
        """Create configuration for Basel III banking compliance training"""
        
        # Adjust task weights based on focus area
        if focus_area == "capital_adequacy":
            task_weights = {
                'compliance_analysis': 0.4,
                'risk_assessment': 0.35,
                'capital_calculation': 0.15,
                'regulatory_reporting': 0.1
            }
        elif focus_area == "liquidity":
            task_weights = {
                'compliance_analysis': 0.3,
                'risk_assessment': 0.3,
                'liquidity_assessment': 0.25,
                'regulatory_reporting': 0.15
            }
        else:  # comprehensive
            task_weights = {
                'compliance_analysis': 0.25,
                'risk_assessment': 0.25,
                'capital_calculation': 0.2,
                'liquidity_assessment': 0.2,
                'regulatory_reporting': 0.1
            }
        
        config = ComplianceTrainingConfig(
            model_name="microsoft/DialoGPT-medium",
            output_dir=output_dir,
            
            # Training parameters optimized for Basel III
            num_train_epochs=6,
            per_device_train_batch_size=2,
            per_device_eval_batch_size=2,
            learning_rate=3e-5,
            warmup_steps=400,
            max_length=1536,
            
            # Basel III-specific parameters
            regulation_types=[RegulationType.BASEL_III],
            jurisdictions=[
                Jurisdiction.US_FEDERAL, Jurisdiction.EU, 
                Jurisdiction.UK, Jurisdiction.SINGAPORE
            ],
            compliance_tasks=list(task_weights.keys()),
            
            # Transfer learning for banking compliance
            use_transfer_learning=True,
            freeze_base_layers=True,
            use_lora=True,
            lora_rank=20,
            lora_alpha=40,
            lora_dropout=0.05,
            
            # Multi-task learning with banking focus
            use_multi_task_learning=True,
            task_weights=task_weights,
            
            # Evaluation strategy
            evaluation_strategy="steps",
            eval_steps=250,
            save_strategy="steps",
            save_steps=250,
            logging_steps=50,
            save_total_limit=4,
            
            # Basel III-specific settings
            gradient_accumulation_steps=8,
            fp16=True,
            dataloader_num_workers=2,
            remove_unused_columns=False,
            load_best_model_at_end=True,
            metric_for_best_model="risk_assessment_accuracy"
        )
        
        return ComplianceConfigTemplate(
            name=f"Basel III Compliance Training ({focus_area})",
            description=f"Specialized training for Basel III banking regulations with focus on {focus_area}",
            config=config,
            recommended_dataset_size=12000,
            training_duration_estimate="8-16 hours",
            gpu_memory_requirement="16GB+",
            use_cases=[
                "Capital adequacy assessment",
                "Risk-weighted asset calculation",
                "Liquidity coverage ratio analysis",
                "Leverage ratio monitoring",
                "Regulatory capital reporting"
            ]
        )
    
    @staticmethod
    def create_multi_regulation_config(
        output_dir: str = "training/output/multi_regulation",
        regulations: List[RegulationType] = None
    ) -> ComplianceConfigTemplate:
        """Create configuration for multi-regulation compliance training"""
        
        if regulations is None:
            regulations = [
                RegulationType.SOX, RegulationType.GDPR, 
                RegulationType.BASEL_III, RegulationType.HIPAA
            ]
        
        # Balanced task weights for multi-regulation training
        task_weights = {
            'compliance_analysis': 0.25,
            'risk_assessment': 0.25,
            'policy_generation': 0.2,
            'regulatory_change_detection': 0.15,
            'cross_regulation_analysis': 0.15
        }
        
        config = ComplianceTrainingConfig(
            model_name="microsoft/DialoGPT-large",  # Larger model for complexity
            output_dir=output_dir,
            
            # Training parameters for multi-regulation complexity
            num_train_epochs=8,
            per_device_train_batch_size=1,
            per_device_eval_batch_size=1,
            learning_rate=2e-5,
            warmup_steps=800,
            max_length=2048,
            
            # Multi-regulation parameters
            regulation_types=regulations,
            jurisdictions=[
                Jurisdiction.US_FEDERAL, Jurisdiction.US_STATE,
                Jurisdiction.EU, Jurisdiction.UK, Jurisdiction.SINGAPORE
            ],
            compliance_tasks=list(task_weights.keys()),
            
            # Transfer learning with regulation adapters
            use_transfer_learning=True,
            freeze_base_layers=True,
            use_lora=True,
            lora_rank=32,
            lora_alpha=64,
            lora_dropout=0.1,
            
            # Multi-task learning across regulations
            use_multi_task_learning=True,
            task_weights=task_weights,
            
            # Evaluation strategy
            evaluation_strategy="steps",
            eval_steps=500,
            save_strategy="steps",
            save_steps=500,
            logging_steps=100,
            save_total_limit=5,
            
            # Multi-regulation specific settings
            gradient_accumulation_steps=16,
            fp16=True,
            dataloader_num_workers=4,
            remove_unused_columns=False,
            load_best_model_at_end=True,
            metric_for_best_model="overall_compliance_score",
            
            # Advanced settings for complex training
            weight_decay=0.01,
            adam_epsilon=1e-6,
            max_grad_norm=1.0
        )
        
        return ComplianceConfigTemplate(
            name="Multi-Regulation Compliance Training",
            description="Comprehensive training across multiple regulatory frameworks with cross-regulation analysis capabilities",
            config=config,
            recommended_dataset_size=25000,
            training_duration_estimate="16-32 hours",
            gpu_memory_requirement="32GB+",
            use_cases=[
                "Cross-regulation compliance analysis",
                "Regulatory conflict identification",
                "Comprehensive risk assessment",
                "Multi-jurisdiction compliance",
                "Regulatory harmonization analysis"
            ]
        )
    
    @staticmethod
    def create_quick_prototype_config(
        output_dir: str = "training/output/quick_prototype"
    ) -> ComplianceConfigTemplate:
        """Create configuration for quick prototyping and testing"""
        
        config = ComplianceTrainingConfig(
            model_name="microsoft/DialoGPT-small",
            output_dir=output_dir,
            
            # Minimal training parameters for quick testing
            num_train_epochs=1,
            per_device_train_batch_size=8,
            per_device_eval_batch_size=8,
            learning_rate=1e-4,
            warmup_steps=50,
            max_length=256,
            
            # Basic compliance parameters
            regulation_types=[RegulationType.SOX],
            jurisdictions=[Jurisdiction.US_FEDERAL],
            compliance_tasks=['compliance_analysis', 'risk_assessment'],
            
            # Minimal transfer learning
            use_transfer_learning=True,
            freeze_base_layers=True,
            use_lora=True,
            lora_rank=4,
            lora_alpha=8,
            lora_dropout=0.1,
            
            # Simple multi-task learning
            use_multi_task_learning=True,
            task_weights={
                'compliance_analysis': 0.6,
                'risk_assessment': 0.4
            },
            
            # Minimal evaluation
            evaluation_strategy="epoch",
            save_strategy="epoch",
            logging_steps=10,
            save_total_limit=1,
            
            # Quick training settings
            gradient_accumulation_steps=1,
            dataloader_num_workers=0,
            remove_unused_columns=False
        )
        
        return ComplianceConfigTemplate(
            name="Quick Prototype Training",
            description="Minimal configuration for rapid prototyping and testing of compliance training procedures",
            config=config,
            recommended_dataset_size=500,
            training_duration_estimate="15-30 minutes",
            gpu_memory_requirement="4GB",
            use_cases=[
                "Algorithm validation",
                "Pipeline testing",
                "Configuration debugging",
                "Quick demos",
                "Development iteration"
            ]
        )

class ConfigurationManager:
    """Manager for saving, loading, and organizing compliance configurations"""
    
    def __init__(self, config_dir: str = "training/specialized/compliance_risk_management/configs"):
        self.config_dir = Path(config_dir)
        self.config_dir.mkdir(parents=True, exist_ok=True)
    
    def save_template(self, template: ComplianceConfigTemplate, filename: str = None) -> Path:
        """Save configuration template to file"""
        if filename is None:
            filename = f"{template.name.lower().replace(' ', '_')}.json"
        
        config_file = self.config_dir / filename
        
        # Convert template to serializable format
        template_dict = {
            'name': template.name,
            'description': template.description,
            'config': template.config.__dict__,
            'recommended_dataset_size': template.recommended_dataset_size,
            'training_duration_estimate': template.training_duration_estimate,
            'gpu_memory_requirement': template.gpu_memory_requirement,
            'use_cases': template.use_cases
        }
        
        with open(config_file, 'w') as f:
            json.dump(template_dict, f, indent=2, default=str)
        
        return config_file
    
    def load_template(self, filename: str) -> ComplianceConfigTemplate:
        """Load configuration template from file"""
        config_file = self.config_dir / filename
        
        with open(config_file, 'r') as f:
            template_dict = json.load(f)
        
        # Reconstruct configuration
        config = ComplianceTrainingConfig(**template_dict['config'])
        
        return ComplianceConfigTemplate(
            name=template_dict['name'],
            description=template_dict['description'],
            config=config,
            recommended_dataset_size=template_dict['recommended_dataset_size'],
            training_duration_estimate=template_dict['training_duration_estimate'],
            gpu_memory_requirement=template_dict['gpu_memory_requirement'],
            use_cases=template_dict['use_cases']
        )
    
    def list_templates(self) -> List[str]:
        """List available configuration templates"""
        return [f.name for f in self.config_dir.glob("*.json")]
    
    def create_all_standard_templates(self) -> List[Path]:
        """Create and save all standard configuration templates"""
        factory = ComplianceConfigurationFactory()
        saved_files = []
        
        # SOX configurations
        sox_small = factory.create_sox_compliance_config(model_size="small")
        saved_files.append(self.save_template(sox_small, "sox_compliance_small.json"))
        
        sox_medium = factory.create_sox_compliance_config(model_size="medium")
        saved_files.append(self.save_template(sox_medium, "sox_compliance_medium.json"))
        
        # GDPR configurations
        gdpr_single = factory.create_gdpr_compliance_config(multi_language=False)
        saved_files.append(self.save_template(gdpr_single, "gdpr_compliance_single_language.json"))
        
        gdpr_multi = factory.create_gdpr_compliance_config(multi_language=True)
        saved_files.append(self.save_template(gdpr_multi, "gdpr_compliance_multi_language.json"))
        
        # Basel III configurations
        basel_capital = factory.create_basel_iii_config(focus_area="capital_adequacy")
        saved_files.append(self.save_template(basel_capital, "basel_iii_capital_adequacy.json"))
        
        basel_liquidity = factory.create_basel_iii_config(focus_area="liquidity")
        saved_files.append(self.save_template(basel_liquidity, "basel_iii_liquidity.json"))
        
        basel_comprehensive = factory.create_basel_iii_config(focus_area="comprehensive")
        saved_files.append(self.save_template(basel_comprehensive, "basel_iii_comprehensive.json"))
        
        # Multi-regulation configuration
        multi_reg = factory.create_multi_regulation_config()
        saved_files.append(self.save_template(multi_reg, "multi_regulation_comprehensive.json"))
        
        # Quick prototype configuration
        prototype = factory.create_quick_prototype_config()
        saved_files.append(self.save_template(prototype, "quick_prototype.json"))
        
        return saved_files

def main():
    """Demonstrate configuration templates"""
    
    # Initialize configuration manager
    config_manager = ConfigurationManager()
    
    # Create all standard templates
    print("Creating standard compliance training configuration templates...")
    saved_files = config_manager.create_all_standard_templates()
    
    print(f"\nCreated {len(saved_files)} configuration templates:")
    for file_path in saved_files:
        print(f"  - {file_path.name}")
    
    # Demonstrate template usage
    print("\nDemonstrating template usage:")
    
    # Load and show SOX configuration
    sox_template = config_manager.load_template("sox_compliance_small.json")
    print(f"\n📋 {sox_template.name}")
    print(f"   Description: {sox_template.description}")
    print(f"   Dataset size: {sox_template.recommended_dataset_size}")
    print(f"   Duration: {sox_template.training_duration_estimate}")
    print(f"   GPU requirement: {sox_template.gpu_memory_requirement}")
    print(f"   Model: {sox_template.config.model_name}")
    print(f"   Epochs: {sox_template.config.num_train_epochs}")
    print(f"   Batch size: {sox_template.config.per_device_train_batch_size}")
    
    # Show quick prototype for comparison
    prototype_template = config_manager.load_template("quick_prototype.json")
    print(f"\n🚀 {prototype_template.name}")
    print(f"   Description: {prototype_template.description}")
    print(f"   Dataset size: {prototype_template.recommended_dataset_size}")
    print(f"   Duration: {prototype_template.training_duration_estimate}")
    print(f"   GPU requirement: {prototype_template.gpu_memory_requirement}")
    
    print(f"\n✅ All configuration templates ready for use!")
    print(f"📁 Templates saved in: {config_manager.config_dir}")

if __name__ == "__main__":
    main()
