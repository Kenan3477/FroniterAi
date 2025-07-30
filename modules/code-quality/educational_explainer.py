"""
Educational Explainer

Advanced educational system that:
- Provides detailed explanations of code improvements and refactorings
- Adapts explanations to different experience levels (beginner to expert)
- Includes examples, best practices, and learning resources
- Offers interactive learning paths for code quality improvement
- Creates personalized learning experiences based on code patterns
"""

import json
import logging
from typing import Dict, List, Any, Optional, Set, Tuple, Union
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
import re
import hashlib

class ExperienceLevel(Enum):
    """Experience levels for tailored explanations"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"

class ExplanationType(Enum):
    """Types of explanations provided"""
    CONCEPT_INTRODUCTION = "concept_introduction"
    PROBLEM_EXPLANATION = "problem_explanation"
    SOLUTION_WALKTHROUGH = "solution_walkthrough"
    BEST_PRACTICES = "best_practices"
    ANTI_PATTERNS = "anti_patterns"
    PERFORMANCE_IMPACT = "performance_impact"
    SECURITY_IMPLICATIONS = "security_implications"
    REFACTORING_BENEFITS = "refactoring_benefits"
    CODE_EXAMPLES = "code_examples"
    LEARNING_PATH = "learning_path"

class LearningGoal(Enum):
    """Learning goals for educational content"""
    UNDERSTAND_PATTERNS = "understand_patterns"
    IMPROVE_CODE_QUALITY = "improve_code_quality"
    LEARN_BEST_PRACTICES = "learn_best_practices"
    SECURITY_AWARENESS = "security_awareness"
    PERFORMANCE_OPTIMIZATION = "performance_optimization"
    ARCHITECTURAL_DESIGN = "architectural_design"
    TESTING_PRACTICES = "testing_practices"
    MAINTAINABILITY = "maintainability"

@dataclass
class LearningProfile:
    """User's learning profile and preferences"""
    user_id: str
    experience_level: ExperienceLevel
    preferred_learning_style: str  # visual, textual, example-based, hands-on
    language_expertise: Dict[str, ExperienceLevel]
    completed_topics: Set[str]
    learning_goals: List[LearningGoal]
    time_preference: str  # quick, detailed, comprehensive
    difficulty_preference: str  # easy, challenging, adaptive

@dataclass
class EducationalContent:
    """Educational content for code improvements"""
    content_id: str
    title: str
    explanation_type: ExplanationType
    experience_level: ExperienceLevel
    summary: str
    detailed_explanation: str
    code_examples: List[Dict[str, str]]
    visual_aids: List[str]
    best_practices: List[str]
    common_mistakes: List[str]
    further_reading: List[str]
    interactive_exercises: List[Dict[str, Any]]
    estimated_reading_time: str
    difficulty_level: str
    tags: List[str]

@dataclass
class LearningPath:
    """Structured learning path for code quality improvement"""
    path_id: str
    title: str
    description: str
    target_audience: ExperienceLevel
    estimated_duration: str
    modules: List[Dict[str, Any]]
    prerequisites: List[str]
    learning_outcomes: List[str]
    assessment_criteria: List[str]

class EducationalExplainer:
    """
    Advanced educational explainer that provides:
    
    1. Personalized explanations based on experience level
    2. Interactive learning content with examples
    3. Adaptive learning paths for continuous improvement
    4. Multi-modal explanations (text, code, visual)
    5. Progress tracking and learning analytics
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.learning_profiles = {}
        self.content_database = {}
        self.learning_paths = {}
        
        # Educational settings
        self.max_explanation_length = self.config.get("max_explanation_length", 2000)
        self.include_examples = self.config.get("include_examples", True)
        self.adaptive_difficulty = self.config.get("adaptive_difficulty", True)
        
        # Content preferences
        self.default_experience_level = ExperienceLevel.INTERMEDIATE
        self.include_visual_aids = self.config.get("include_visual_aids", True)
        self.interactive_mode = self.config.get("interactive_mode", True)
        
        # Setup logging
        self.logger = self._setup_logging()
    
    async def initialize(self):
        """Initialize the educational explainer"""
        
        self.logger.info("Initializing Educational Explainer...")
        
        # Load educational content database
        await self._load_content_database()
        
        # Load learning paths
        await self._load_learning_paths()
        
        # Initialize templates
        await self._load_explanation_templates()
        
        self.logger.info("Educational Explainer initialized successfully")
    
    async def explain_improvement(self, quality_issue: Any, user_profile: Optional[LearningProfile] = None) -> EducationalContent:
        """
        Generate educational explanation for a code quality issue
        
        Args:
            quality_issue: Quality issue that needs explanation
            user_profile: User's learning profile for personalization
            
        Returns:
            EducationalContent with tailored explanation
        """
        
        try:
            # Use default profile if none provided
            if user_profile is None:
                user_profile = self._create_default_profile()
            
            # Generate content based on issue type and user profile
            content = await self._generate_issue_explanation(quality_issue, user_profile)
            
            self.logger.info(f"Generated explanation for {quality_issue.issue_type} at {user_profile.experience_level.value} level")
            
            return content
            
        except Exception as e:
            self.logger.error(f"Error generating explanation: {str(e)}")
            return self._create_fallback_explanation(quality_issue)
    
    async def explain_refactoring(self, refactoring_action: Any, user_profile: Optional[LearningProfile] = None) -> EducationalContent:
        """
        Generate educational explanation for a refactoring action
        
        Args:
            refactoring_action: Refactoring action to explain
            user_profile: User's learning profile for personalization
            
        Returns:
            EducationalContent with refactoring explanation
        """
        
        try:
            if user_profile is None:
                user_profile = self._create_default_profile()
            
            content = await self._generate_refactoring_explanation(refactoring_action, user_profile)
            
            self.logger.info(f"Generated refactoring explanation for {refactoring_action.refactoring_type.value}")
            
            return content
            
        except Exception as e:
            self.logger.error(f"Error generating refactoring explanation: {str(e)}")
            return self._create_fallback_refactoring_explanation(refactoring_action)
    
    async def create_learning_path(self, quality_issues: List[Any], user_profile: LearningProfile) -> LearningPath:
        """
        Create personalized learning path based on code quality issues
        
        Args:
            quality_issues: List of quality issues found in code
            user_profile: User's learning profile
            
        Returns:
            LearningPath tailored to address the issues
        """
        
        try:
            # Analyze issues to identify learning topics
            learning_topics = await self._analyze_learning_needs(quality_issues, user_profile)
            
            # Create structured learning path
            learning_path = await self._build_learning_path(learning_topics, user_profile)
            
            self.logger.info(f"Created learning path with {len(learning_path.modules)} modules")
            
            return learning_path
            
        except Exception as e:
            self.logger.error(f"Error creating learning path: {str(e)}")
            return self._create_default_learning_path(user_profile)
    
    async def get_interactive_exercise(self, topic: str, user_profile: LearningProfile) -> Dict[str, Any]:
        """
        Generate interactive exercise for a specific topic
        
        Args:
            topic: Topic for the exercise
            user_profile: User's learning profile
            
        Returns:
            Interactive exercise definition
        """
        
        try:
            exercise = await self._create_interactive_exercise(topic, user_profile)
            
            self.logger.info(f"Generated interactive exercise for {topic}")
            
            return exercise
            
        except Exception as e:
            self.logger.error(f"Error creating interactive exercise: {str(e)}")
            return self._create_basic_exercise(topic)
    
    async def _generate_issue_explanation(self, quality_issue: Any, user_profile: LearningProfile) -> EducationalContent:
        """Generate explanation for a quality issue"""
        
        issue_type = quality_issue.issue_type
        experience_level = user_profile.experience_level
        
        # Get base explanation template
        explanation_template = self._get_explanation_template(issue_type, experience_level)
        
        # Customize based on specific issue details
        content = await self._customize_explanation(explanation_template, quality_issue, user_profile)
        
        return content
    
    async def _generate_refactoring_explanation(self, refactoring_action: Any, user_profile: LearningProfile) -> EducationalContent:
        """Generate explanation for a refactoring action"""
        
        refactoring_type = refactoring_action.refactoring_type.value
        experience_level = user_profile.experience_level
        
        # Create comprehensive refactoring explanation
        if refactoring_type == "extract_method":
            content = await self._explain_extract_method(refactoring_action, user_profile)
        elif refactoring_type == "split_large_class":
            content = await self._explain_split_class(refactoring_action, user_profile)
        elif refactoring_type == "reduce_parameter_list":
            content = await self._explain_reduce_parameters(refactoring_action, user_profile)
        else:
            content = await self._explain_generic_refactoring(refactoring_action, user_profile)
        
        return content
    
    async def _explain_extract_method(self, refactoring_action: Any, user_profile: LearningProfile) -> EducationalContent:
        """Explain extract method refactoring"""
        
        level = user_profile.experience_level
        
        if level == ExperienceLevel.BEGINNER:
            summary = "Breaking down a long method into smaller, focused methods improves code readability and maintainability."
            detailed_explanation = """
            When a method becomes too long (typically over 20-30 lines), it often means it's doing too many things. 
            The Extract Method refactoring helps by:
            
            1. **Identifying logical groups** of statements within the long method
            2. **Creating new methods** for each logical group
            3. **Replacing the original code** with method calls
            4. **Choosing descriptive names** that explain what each extracted method does
            
            This makes your code easier to:
            - Read and understand
            - Test (you can test each method separately)
            - Modify (changes are isolated to specific methods)
            - Reuse (extracted methods can be used elsewhere)
            """
        else:
            summary = "Extract Method refactoring addresses Single Responsibility Principle violations by decomposing complex methods into cohesive, reusable units."
            detailed_explanation = """
            Extract Method is a fundamental refactoring that addresses several code smells:
            
            **Long Method**: Methods exceeding cognitive complexity thresholds
            **Multiple Responsibilities**: Violating Single Responsibility Principle
            **Poor Cohesion**: Mixing different levels of abstraction
            
            **Refactoring Process**:
            1. Identify cohesive code segments with minimal data dependencies
            2. Analyze variable scope and parameter requirements
            3. Extract to new method with intention-revealing name
            4. Replace original code with method invocation
            5. Consider method accessibility and placement
            
            **Benefits**:
            - Improved readability through better abstraction levels
            - Enhanced testability via isolated functionality
            - Increased reusability across codebase
            - Better adherence to SOLID principles
            """
        
        code_examples = [
            {
                "title": "Before Refactoring",
                "language": "python",
                "code": """
def process_order(order):
    # Validate order
    if not order.items:
        raise ValueError("Order must have items")
    if order.total <= 0:
        raise ValueError("Order total must be positive")
    
    # Calculate discounts
    discount = 0
    if order.customer.is_premium:
        discount = order.total * 0.1
    if order.total > 100:
        discount += order.total * 0.05
    
    # Process payment
    payment_result = payment_gateway.charge(
        order.customer.payment_method,
        order.total - discount
    )
    
    # Send notifications
    email_service.send_confirmation(order.customer.email, order)
    sms_service.send_update(order.customer.phone, order.id)
    
    return payment_result
"""
            },
            {
                "title": "After Refactoring",
                "language": "python",
                "code": """
def process_order(order):
    validate_order(order)
    discount = calculate_discount(order)
    payment_result = process_payment(order, discount)
    send_notifications(order)
    return payment_result

def validate_order(order):
    if not order.items:
        raise ValueError("Order must have items")
    if order.total <= 0:
        raise ValueError("Order total must be positive")

def calculate_discount(order):
    discount = 0
    if order.customer.is_premium:
        discount = order.total * 0.1
    if order.total > 100:
        discount += order.total * 0.05
    return discount

def process_payment(order, discount):
    return payment_gateway.charge(
        order.customer.payment_method,
        order.total - discount
    )

def send_notifications(order):
    email_service.send_confirmation(order.customer.email, order)
    sms_service.send_update(order.customer.phone, order.id)
"""
            }
        ]
        
        best_practices = [
            "Choose descriptive method names that explain intent",
            "Keep extracted methods focused on a single responsibility",
            "Minimize parameter passing by grouping related data",
            "Consider method visibility (private vs public)",
            "Update related tests and documentation"
        ]
        
        common_mistakes = [
            "Extracting too small code fragments (over-extraction)",
            "Creating methods with too many parameters",
            "Choosing generic or unclear method names",
            "Not updating callers and tests",
            "Ignoring method cohesion and coupling"
        ]
        
        interactive_exercises = [
            {
                "type": "code_analysis",
                "title": "Identify Extract Method Opportunities",
                "description": "Analyze the following method and identify logical groups for extraction",
                "difficulty": "easy" if level == ExperienceLevel.BEGINNER else "medium"
            },
            {
                "type": "refactoring_practice",
                "title": "Practice Extract Method",
                "description": "Refactor a long method by extracting logical units",
                "difficulty": "medium" if level == ExperienceLevel.BEGINNER else "hard"
            }
        ]
        
        return EducationalContent(
            content_id=self._generate_content_id("extract_method", level),
            title="Extract Method Refactoring",
            explanation_type=ExplanationType.REFACTORING_BENEFITS,
            experience_level=level,
            summary=summary,
            detailed_explanation=detailed_explanation,
            code_examples=code_examples,
            visual_aids=["method_extraction_diagram.png"] if self.include_visual_aids else [],
            best_practices=best_practices,
            common_mistakes=common_mistakes,
            further_reading=[
                "Refactoring by Martin Fowler - Extract Method",
                "Clean Code by Robert Martin - Functions",
                "Single Responsibility Principle explanation"
            ],
            interactive_exercises=interactive_exercises,
            estimated_reading_time="5-8 minutes",
            difficulty_level="intermediate",
            tags=["refactoring", "method_extraction", "code_quality", "maintainability"]
        )
    
    async def _explain_split_class(self, refactoring_action: Any, user_profile: LearningProfile) -> EducationalContent:
        """Explain split large class refactoring"""
        
        level = user_profile.experience_level
        
        summary = "Large classes violate the Single Responsibility Principle and should be split into focused, cohesive classes."
        
        if level == ExperienceLevel.BEGINNER:
            detailed_explanation = """
            When a class becomes too large (many methods and responsibilities), it becomes hard to:
            - Understand what the class does
            - Make changes without breaking something
            - Test effectively
            - Reuse parts of the functionality
            
            **Signs of a class that needs splitting**:
            - More than 10-15 methods
            - Methods that don't use the same instance variables
            - Multiple reasons to change the class
            - Different groups of methods serving different purposes
            
            **How to split a class**:
            1. Group related methods and data together
            2. Create new classes for each group
            3. Use composition or delegation to connect classes
            4. Update code that uses the original class
            """
        else:
            detailed_explanation = """
            Large classes represent a violation of the Single Responsibility Principle and often exhibit:
            
            **Code Smells**:
            - God Object anti-pattern
            - Low cohesion, high coupling
            - Multiple reasons for change
            - Feature Envy between method groups
            
            **Refactoring Strategies**:
            1. **Extract Class**: Move related methods/fields to new class
            2. **Extract Subclass**: Create specialized versions
            3. **Extract Interface**: Define contracts for different responsibilities
            4. **Replace Inheritance with Delegation**: Favor composition
            
            **Analysis Techniques**:
            - Identify method clustering based on data usage
            - Analyze change patterns and modification reasons
            - Apply LCOM (Lack of Cohesion of Methods) metrics
            - Consider domain boundaries and business concepts
            """
        
        code_examples = [
            {
                "title": "Before: Large Class",
                "language": "python",
                "code": """
class OrderManager:
    def __init__(self):
        self.orders = []
        self.customers = []
        self.inventory = {}
        
    # Order operations
    def create_order(self, customer_id, items):
        pass
    
    def update_order(self, order_id, changes):
        pass
    
    def cancel_order(self, order_id):
        pass
    
    # Customer operations
    def add_customer(self, customer_data):
        pass
    
    def update_customer(self, customer_id, data):
        pass
    
    def get_customer_history(self, customer_id):
        pass
    
    # Inventory operations
    def check_availability(self, item_id):
        pass
    
    def update_stock(self, item_id, quantity):
        pass
    
    def reorder_item(self, item_id):
        pass
    
    # Reporting operations
    def generate_sales_report(self):
        pass
    
    def generate_inventory_report(self):
        pass
"""
            },
            {
                "title": "After: Split Classes",
                "language": "python",
                "code": """
class OrderService:
    def __init__(self, customer_service, inventory_service):
        self.orders = []
        self.customer_service = customer_service
        self.inventory_service = inventory_service
        
    def create_order(self, customer_id, items):
        pass
    
    def update_order(self, order_id, changes):
        pass
    
    def cancel_order(self, order_id):
        pass

class CustomerService:
    def __init__(self):
        self.customers = []
        
    def add_customer(self, customer_data):
        pass
    
    def update_customer(self, customer_id, data):
        pass
    
    def get_customer_history(self, customer_id):
        pass

class InventoryService:
    def __init__(self):
        self.inventory = {}
        
    def check_availability(self, item_id):
        pass
    
    def update_stock(self, item_id, quantity):
        pass
    
    def reorder_item(self, item_id):
        pass

class ReportingService:
    def __init__(self, order_service, inventory_service):
        self.order_service = order_service
        self.inventory_service = inventory_service
        
    def generate_sales_report(self):
        pass
    
    def generate_inventory_report(self):
        pass
"""
            }
        ]
        
        return EducationalContent(
            content_id=self._generate_content_id("split_class", level),
            title="Split Large Class Refactoring",
            explanation_type=ExplanationType.REFACTORING_BENEFITS,
            experience_level=level,
            summary=summary,
            detailed_explanation=detailed_explanation,
            code_examples=code_examples,
            visual_aids=["class_splitting_diagram.png"] if self.include_visual_aids else [],
            best_practices=[
                "Identify natural boundaries between responsibilities",
                "Maintain high cohesion within new classes",
                "Use composition over inheritance",
                "Consider dependency injection for class relationships",
                "Update tests to reflect new structure"
            ],
            common_mistakes=[
                "Creating too many small classes (over-decomposition)",
                "Introducing unnecessary complexity in relationships",
                "Breaking existing APIs without consideration",
                "Not maintaining clear contracts between classes"
            ],
            further_reading=[
                "Single Responsibility Principle (SOLID)",
                "Extract Class refactoring pattern",
                "God Object anti-pattern"
            ],
            interactive_exercises=[
                {
                    "type": "responsibility_analysis",
                    "title": "Identify Class Responsibilities",
                    "description": "Analyze a large class and identify distinct responsibilities"
                }
            ],
            estimated_reading_time="8-12 minutes",
            difficulty_level="advanced",
            tags=["refactoring", "class_design", "single_responsibility", "architecture"]
        )
    
    async def _explain_reduce_parameters(self, refactoring_action: Any, user_profile: LearningProfile) -> EducationalContent:
        """Explain reduce parameter list refactoring"""
        
        level = user_profile.experience_level
        
        summary = "Methods with too many parameters are hard to use and understand. Reducing parameters improves usability and maintainability."
        
        detailed_explanation = """
        Methods with many parameters (typically more than 3-5) create several problems:
        
        **Problems with Long Parameter Lists**:
        - Hard to remember parameter order
        - Easy to pass wrong values
        - Difficult to add new parameters
        - Reduces method reusability
        
        **Refactoring Techniques**:
        1. **Parameter Object**: Group related parameters into an object
        2. **Builder Pattern**: For optional parameters and complex construction
        3. **Method Overloading**: Provide simpler versions with defaults
        4. **Replace Parameter with Method Call**: Calculate values internally
        
        **When to Apply**:
        - More than 3-5 parameters
        - Parameters that are often passed together
        - Many optional parameters
        - Complex parameter validation logic
        """
        
        code_examples = [
            {
                "title": "Before: Long Parameter List",
                "language": "python",
                "code": """
def create_user_account(first_name, last_name, email, phone, 
                       address_line1, address_line2, city, 
                       state, zip_code, country, age, 
                       preferred_language, notification_preferences):
    # Account creation logic
    pass

# Usage - error-prone and hard to read
create_user_account("John", "Doe", "john@example.com", "555-1234",
                    "123 Main St", "Apt 4B", "Springfield", 
                    "IL", "62701", "USA", 25, "en", 
                    {"email": True, "sms": False})
"""
            },
            {
                "title": "After: Parameter Object",
                "language": "python",
                "code": """
@dataclass
class PersonalInfo:
    first_name: str
    last_name: str
    email: str
    phone: str
    age: int

@dataclass  
class Address:
    line1: str
    line2: str = ""
    city: str = ""
    state: str = ""
    zip_code: str = ""
    country: str = "USA"

@dataclass
class Preferences:
    language: str = "en"
    email_notifications: bool = True
    sms_notifications: bool = False

def create_user_account(personal_info: PersonalInfo, 
                       address: Address, 
                       preferences: Preferences = None):
    if preferences is None:
        preferences = Preferences()
    # Account creation logic
    pass

# Usage - clear and less error-prone
personal = PersonalInfo("John", "Doe", "john@example.com", "555-1234", 25)
address = Address("123 Main St", "Apt 4B", "Springfield", "IL", "62701")
preferences = Preferences(sms_notifications=True)

create_user_account(personal, address, preferences)
"""
            }
        ]
        
        return EducationalContent(
            content_id=self._generate_content_id("reduce_parameters", level),
            title="Reduce Parameter List Refactoring",
            explanation_type=ExplanationType.REFACTORING_BENEFITS,
            experience_level=level,
            summary=summary,
            detailed_explanation=detailed_explanation,
            code_examples=code_examples,
            visual_aids=[],
            best_practices=[
                "Group logically related parameters together",
                "Use meaningful names for parameter objects",
                "Consider default values for optional parameters",
                "Validate parameters at object creation time",
                "Use immutable parameter objects when possible"
            ],
            common_mistakes=[
                "Creating parameter objects that don't represent cohesive concepts",
                "Over-engineering simple method signatures",
                "Not considering backward compatibility",
                "Making parameter objects too complex"
            ],
            further_reading=[
                "Parameter Object pattern",
                "Builder pattern for complex objects",
                "Method signature design principles"
            ],
            interactive_exercises=[],
            estimated_reading_time="6-8 minutes",
            difficulty_level="intermediate",
            tags=["refactoring", "method_design", "parameters", "usability"]
        )
    
    async def _explain_generic_refactoring(self, refactoring_action: Any, user_profile: LearningProfile) -> EducationalContent:
        """Explain generic refactoring action"""
        
        level = user_profile.experience_level
        refactoring_type = refactoring_action.refactoring_type.value
        
        return EducationalContent(
            content_id=self._generate_content_id(refactoring_type, level),
            title=f"{refactoring_type.replace('_', ' ').title()} Refactoring",
            explanation_type=ExplanationType.REFACTORING_BENEFITS,
            experience_level=level,
            summary=refactoring_action.description,
            detailed_explanation=f"This refactoring addresses: {refactoring_action.description}\n\nBenefits: {', '.join(refactoring_action.benefits)}",
            code_examples=[],
            visual_aids=[],
            best_practices=refactoring_action.benefits,
            common_mistakes=refactoring_action.potential_issues,
            further_reading=[],
            interactive_exercises=[],
            estimated_reading_time=refactoring_action.estimated_time,
            difficulty_level=refactoring_action.complexity.value,
            tags=["refactoring", refactoring_type, "code_quality"]
        )
    
    # Helper methods
    def _create_default_profile(self) -> LearningProfile:
        """Create default learning profile"""
        
        return LearningProfile(
            user_id="default",
            experience_level=self.default_experience_level,
            preferred_learning_style="textual",
            language_expertise={},
            completed_topics=set(),
            learning_goals=[LearningGoal.IMPROVE_CODE_QUALITY],
            time_preference="detailed",
            difficulty_preference="adaptive"
        )
    
    def _create_fallback_explanation(self, quality_issue: Any) -> EducationalContent:
        """Create fallback explanation when generation fails"""
        
        return EducationalContent(
            content_id="fallback",
            title="Code Quality Issue",
            explanation_type=ExplanationType.PROBLEM_EXPLANATION,
            experience_level=ExperienceLevel.INTERMEDIATE,
            summary=f"Issue found: {quality_issue.issue_type}",
            detailed_explanation="A code quality issue was detected that should be addressed.",
            code_examples=[],
            visual_aids=[],
            best_practices=[],
            common_mistakes=[],
            further_reading=[],
            interactive_exercises=[],
            estimated_reading_time="2 minutes",
            difficulty_level="easy",
            tags=["code_quality"]
        )
    
    def _create_fallback_refactoring_explanation(self, refactoring_action: Any) -> EducationalContent:
        """Create fallback refactoring explanation"""
        
        return EducationalContent(
            content_id="fallback_refactoring",
            title="Refactoring Opportunity",
            explanation_type=ExplanationType.REFACTORING_BENEFITS,
            experience_level=ExperienceLevel.INTERMEDIATE,
            summary=refactoring_action.title,
            detailed_explanation=refactoring_action.description,
            code_examples=[],
            visual_aids=[],
            best_practices=[],
            common_mistakes=[],
            further_reading=[],
            interactive_exercises=[],
            estimated_reading_time="3 minutes",
            difficulty_level="medium",
            tags=["refactoring"]
        )
    
    async def _analyze_learning_needs(self, quality_issues: List[Any], user_profile: LearningProfile) -> List[str]:
        """Analyze quality issues to identify learning needs"""
        
        learning_topics = set()
        
        for issue in quality_issues:
            issue_type = issue.issue_type
            
            # Map issue types to learning topics
            topic_mapping = {
                "long_method": "method_design",
                "large_class": "class_design", 
                "high_complexity": "complexity_management",
                "code_duplication": "dry_principle",
                "security_vulnerability": "secure_coding",
                "performance_issue": "performance_optimization",
                "missing_docstring": "documentation_practices"
            }
            
            if issue_type in topic_mapping:
                learning_topics.add(topic_mapping[issue_type])
        
        return list(learning_topics)
    
    async def _build_learning_path(self, topics: List[str], user_profile: LearningProfile) -> LearningPath:
        """Build structured learning path from topics"""
        
        modules = []
        
        for i, topic in enumerate(topics):
            module = {
                "module_id": f"module_{i+1}",
                "title": topic.replace("_", " ").title(),
                "description": f"Learn about {topic.replace('_', ' ')}",
                "estimated_time": "30-45 minutes",
                "content_types": ["explanation", "examples", "exercises"],
                "difficulty": user_profile.experience_level.value
            }
            modules.append(module)
        
        return LearningPath(
            path_id=self._generate_path_id(topics, user_profile),
            title="Code Quality Improvement Path",
            description="Personalized learning path to improve code quality",
            target_audience=user_profile.experience_level,
            estimated_duration=f"{len(modules) * 45} minutes",
            modules=modules,
            prerequisites=[],
            learning_outcomes=[f"Understand {topic}" for topic in topics],
            assessment_criteria=["Apply concepts to real code", "Identify improvement opportunities"]
        )
    
    def _create_default_learning_path(self, user_profile: LearningProfile) -> LearningPath:
        """Create default learning path"""
        
        return LearningPath(
            path_id="default_path",
            title="Basic Code Quality",
            description="Introduction to code quality principles",
            target_audience=user_profile.experience_level,
            estimated_duration="2 hours",
            modules=[
                {
                    "module_id": "intro",
                    "title": "Code Quality Fundamentals",
                    "description": "Basic principles of clean code",
                    "estimated_time": "30 minutes"
                }
            ],
            prerequisites=[],
            learning_outcomes=["Understand code quality basics"],
            assessment_criteria=[]
        )
    
    async def _create_interactive_exercise(self, topic: str, user_profile: LearningProfile) -> Dict[str, Any]:
        """Create interactive exercise for topic"""
        
        exercises = {
            "method_design": {
                "type": "code_review",
                "title": "Method Design Practice",
                "description": "Review method signatures and identify improvements",
                "instructions": "Analyze the given methods and suggest improvements",
                "difficulty": user_profile.experience_level.value
            },
            "class_design": {
                "type": "refactoring",
                "title": "Class Responsibility Analysis", 
                "description": "Identify and separate class responsibilities",
                "instructions": "Break down the large class into focused classes",
                "difficulty": user_profile.experience_level.value
            }
        }
        
        return exercises.get(topic, self._create_basic_exercise(topic))
    
    def _create_basic_exercise(self, topic: str) -> Dict[str, Any]:
        """Create basic exercise for any topic"""
        
        return {
            "type": "reading",
            "title": f"{topic.replace('_', ' ').title()} Review",
            "description": f"Review concepts related to {topic}",
            "instructions": "Read the provided materials and answer questions",
            "difficulty": "easy"
        }
    
    # Configuration and setup methods
    async def _load_content_database(self):
        """Load educational content database"""
        # This would load from files or database in practice
        pass
    
    async def _load_learning_paths(self):
        """Load predefined learning paths"""
        # This would load from configuration
        pass
    
    async def _load_explanation_templates(self):
        """Load explanation templates"""
        # This would load templates for different explanation types
        pass
    
    def _get_explanation_template(self, issue_type: str, experience_level: ExperienceLevel) -> Dict[str, str]:
        """Get explanation template for issue type and experience level"""
        # This would return appropriate template
        return {
            "summary": f"Issue: {issue_type}",
            "explanation": f"Detailed explanation for {issue_type}",
            "examples": [],
            "best_practices": []
        }
    
    async def _customize_explanation(self, template: Dict[str, str], quality_issue: Any, user_profile: LearningProfile) -> EducationalContent:
        """Customize explanation template with specific issue details"""
        
        return EducationalContent(
            content_id=self._generate_content_id(quality_issue.issue_type, user_profile.experience_level),
            title=f"{quality_issue.issue_type.replace('_', ' ').title()} Explanation",
            explanation_type=ExplanationType.PROBLEM_EXPLANATION,
            experience_level=user_profile.experience_level,
            summary=template.get("summary", ""),
            detailed_explanation=template.get("explanation", ""),
            code_examples=template.get("examples", []),
            visual_aids=[],
            best_practices=template.get("best_practices", []),
            common_mistakes=[],
            further_reading=[],
            interactive_exercises=[],
            estimated_reading_time="5 minutes",
            difficulty_level="medium",
            tags=["explanation", quality_issue.issue_type]
        )
    
    def _generate_content_id(self, topic: str, level: ExperienceLevel) -> str:
        """Generate unique content ID"""
        
        content = f"{topic}_{level.value}"
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    def _generate_path_id(self, topics: List[str], user_profile: LearningProfile) -> str:
        """Generate unique learning path ID"""
        
        content = f"{'_'.join(topics)}_{user_profile.experience_level.value}"
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    def _setup_logging(self) -> logging.Logger:
        """Set up logging for the educational explainer"""
        
        logger = logging.getLogger("EducationalExplainer")
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
