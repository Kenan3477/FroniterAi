"""
Business Formation Module Test Suite
"""

import asyncio
import pytest
import json
from datetime import datetime, date, timedelta
from unittest.mock import Mock, patch, AsyncMock

# Import module components
from formation_engine import (
    FormationRequest, BusinessDetails, Person, Address, EntityType, Jurisdiction,
    DynamicQuestionnaire, DocumentGenerator, JurisdictionManager
)
from government_apis import APIManager, DelawareAPIIntegration, NameAvailabilityResult
from compliance_calendar import ComplianceCalendarGenerator, ComplianceTracker
from __init__ import BusinessFormationModule

class TestFormationEngine:
    """Test core formation engine functionality"""
    
    def test_address_creation(self):
        """Test address object creation"""
        address = Address(
            street_line1="123 Test St",
            city="Dover",
            state_province="DE", 
            postal_code="19901"
        )
        
        assert address.street_line1 == "123 Test St"
        assert address.city == "Dover"
        assert address.country == "US"
        assert "Dover, DE 19901" in str(address)
    
    def test_person_creation(self):
        """Test person object creation"""
        address = Address("123 Test St", None, "Dover", "DE", "19901")
        person = Person(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            phone="555-123-4567",
            address=address
        )
        
        assert person.full_name == "John Doe"
        assert person.email == "john@example.com"
    
    def test_business_details_creation(self):
        """Test business details object creation"""
        address = Address("123 Business St", None, "Dover", "DE", "19901")
        
        business = BusinessDetails(
            proposed_name="Test LLC",
            entity_type=EntityType.LLC,
            jurisdiction=Jurisdiction.DELAWARE,
            business_purpose="Technology consulting",
            industry="Technology",
            registered_address=address
        )
        
        assert business.proposed_name == "Test LLC"
        assert business.entity_type == EntityType.LLC
        assert business.jurisdiction == Jurisdiction.DELAWARE
    
    def test_formation_request_creation(self):
        """Test formation request creation"""
        address = Address("123 Test St", None, "Dover", "DE", "19901")
        person = Person("John", "Doe", "john@example.com", "555-123-4567", address)
        business = BusinessDetails(
            "Test LLC", EntityType.LLC, Jurisdiction.DELAWARE,
            "Testing", "Technology", address
        )
        
        formation = FormationRequest(
            business_details=business,
            owners=[person]
        )
        
        assert len(formation.owners) == 1
        assert formation.business_details.proposed_name == "Test LLC"
        assert formation.request_id is not None

class TestDynamicQuestionnaire:
    """Test dynamic questionnaire generation"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.questionnaire = DynamicQuestionnaire()
    
    def test_basic_questionnaire_generation(self):
        """Test basic questionnaire generation"""
        questionnaire = self.questionnaire.generate_questionnaire(
            Jurisdiction.DELAWARE, EntityType.LLC
        )
        
        assert "sections" in questionnaire
        assert len(questionnaire["sections"]) > 0
        assert questionnaire["current_step"] >= 1
    
    def test_jurisdiction_specific_questions(self):
        """Test jurisdiction-specific question generation"""
        # Delaware questionnaire
        de_questionnaire = self.questionnaire.generate_questionnaire(
            Jurisdiction.DELAWARE, EntityType.LLC
        )
        
        # California questionnaire  
        ca_questionnaire = self.questionnaire.generate_questionnaire(
            Jurisdiction.CALIFORNIA, EntityType.LLC
        )
        
        # Should have different sections or questions
        assert de_questionnaire != ca_questionnaire
    
    def test_entity_type_customization(self):
        """Test entity type specific customization"""
        llc_questionnaire = self.questionnaire.generate_questionnaire(
            Jurisdiction.DELAWARE, EntityType.LLC
        )
        
        corp_questionnaire = self.questionnaire.generate_questionnaire(
            Jurisdiction.DELAWARE, EntityType.CORPORATION
        )
        
        # Corporation should have additional questions
        assert len(corp_questionnaire["sections"]) >= len(llc_questionnaire["sections"])
    
    def test_response_validation(self):
        """Test questionnaire response validation"""
        # Valid email
        result = self.questionnaire.validate_response("email", "test@example.com")
        assert result["valid"] is True
        
        # Invalid email
        result = self.questionnaire.validate_response("email", "invalid-email")
        assert result["valid"] is False
        assert len(result["errors"]) > 0
        
        # Valid phone number
        result = self.questionnaire.validate_response("phone", "555-123-4567")
        assert result["valid"] is True
        
        # Invalid phone number
        result = self.questionnaire.validate_response("phone", "123")
        assert result["valid"] is False

class TestJurisdictionManager:
    """Test jurisdiction management functionality"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.manager = JurisdictionManager()
    
    def test_delaware_requirements(self):
        """Test Delaware requirements loading"""
        requirements = self.manager.get_requirements(Jurisdiction.DELAWARE)
        
        assert requirements is not None
        assert EntityType.LLC in requirements.entity_types_supported
        assert EntityType.CORPORATION in requirements.entity_types_supported
        assert requirements.filing_fee[EntityType.LLC] > 0
    
    def test_fee_calculation(self):
        """Test fee calculation"""
        fees = self.manager.calculate_fees(Jurisdiction.DELAWARE, EntityType.LLC)
        
        assert "state_filing_fee" in fees
        assert "total" in fees
        assert fees["total"] >= fees["state_filing_fee"]
        
        # Test expedited fees
        expedited_fees = self.manager.calculate_fees(
            Jurisdiction.DELAWARE, EntityType.LLC, expedited=True
        )
        assert expedited_fees["total"] > fees["total"]
    
    def test_timeline_estimation(self):
        """Test timeline estimation"""
        timeline = self.manager.estimate_timeline(Jurisdiction.DELAWARE, EntityType.LLC)
        
        assert "total_business_days" in timeline
        assert "estimated_completion" in timeline
        assert timeline["total_business_days"] > 0
        
        # Expedited should be faster
        expedited_timeline = self.manager.estimate_timeline(
            Jurisdiction.DELAWARE, EntityType.LLC, expedited=True
        )
        assert expedited_timeline["total_business_days"] <= timeline["total_business_days"]
    
    def test_supported_entity_types(self):
        """Test supported entity types by jurisdiction"""
        de_entities = self.manager.get_supported_entity_types(Jurisdiction.DELAWARE)
        ca_entities = self.manager.get_supported_entity_types(Jurisdiction.CALIFORNIA)
        
        assert EntityType.LLC in de_entities
        assert EntityType.CORPORATION in de_entities
        assert len(de_entities) > 0
        assert len(ca_entities) > 0

class TestAPIManager:
    """Test government API integration"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.api_manager = APIManager()
    
    @pytest.mark.asyncio
    async def test_delaware_integration_creation(self):
        """Test Delaware API integration creation"""
        integration = self.api_manager.get_integration(Jurisdiction.DELAWARE)
        assert integration is not None
        assert hasattr(integration, 'check_name_availability')
    
    @pytest.mark.asyncio
    async def test_name_availability_check(self):
        """Test name availability checking"""
        # Mock the API response
        with patch.object(self.api_manager, 'check_name_availability') as mock_check:
            mock_result = NameAvailabilityResult(
                name="Test LLC",
                available=True,
                similar_names=[],
                restrictions=[],
                suggestions=[]
            )
            mock_check.return_value = mock_result
            
            result = await self.api_manager.check_name_availability(
                "Test LLC", EntityType.LLC, Jurisdiction.DELAWARE
            )
            
            assert result.name == "Test LLC"
            assert result.available is True
    
    @pytest.mark.asyncio
    async def test_bulk_name_check(self):
        """Test bulk name availability checking"""
        names = ["Test LLC", "Another Corp"]
        jurisdictions = [Jurisdiction.DELAWARE, Jurisdiction.NEVADA]
        
        with patch.object(self.api_manager, 'check_name_availability') as mock_check:
            mock_result = NameAvailabilityResult(
                name="Test",
                available=True,
                similar_names=[],
                restrictions=[],
                suggestions=[]
            )
            mock_check.return_value = mock_result
            
            results = await self.api_manager.bulk_name_check(
                names, EntityType.LLC, jurisdictions
            )
            
            assert len(results) == 2
            assert "Test LLC" in results
            assert "Another Corp" in results

class TestComplianceCalendar:
    """Test compliance calendar functionality"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.generator = ComplianceCalendarGenerator()
        self.tracker = ComplianceTracker()
    
    def test_calendar_generation(self):
        """Test compliance calendar generation"""
        # Create sample formation request
        address = Address("123 Test St", None, "Dover", "DE", "19901")
        person = Person("John", "Doe", "john@example.com", "555-123-4567", address)
        business = BusinessDetails(
            "Test LLC", EntityType.LLC, Jurisdiction.DELAWARE,
            "Testing", "Technology", address
        )
        formation = FormationRequest(business_details=business, owners=[person])
        
        calendar = self.generator.generate_compliance_calendar(formation)
        
        assert calendar.entity_name == "Test LLC"
        assert calendar.entity_type == EntityType.LLC
        assert calendar.jurisdiction == Jurisdiction.DELAWARE
        assert len(calendar.compliance_items) > 0
    
    def test_due_date_calculation(self):
        """Test due date calculation from patterns"""
        formation_date = date(2025, 1, 15)
        
        # Test specific date pattern
        due_date = self.generator._calculate_due_date("June 1", formation_date)
        assert due_date.month == 6
        assert due_date.day == 1
        
        # Test anniversary pattern
        due_date = self.generator._calculate_due_date("Anniversary of incorporation", formation_date)
        assert due_date.month == formation_date.month
        assert due_date.day == formation_date.day
        assert due_date.year == formation_date.year + 1
    
    def test_compliance_tracking(self):
        """Test compliance tracking functionality"""
        # Create and add calendar
        address = Address("123 Test St", None, "Dover", "DE", "19901")
        person = Person("John", "Doe", "john@example.com", "555-123-4567", address)
        business = BusinessDetails(
            "Test LLC", EntityType.LLC, Jurisdiction.DELAWARE,
            "Testing", "Technology", address
        )
        formation = FormationRequest(business_details=business, owners=[person])
        
        calendar = self.generator.generate_compliance_calendar(formation)
        self.tracker.add_calendar(calendar)
        
        # Test upcoming compliance
        upcoming = self.tracker.get_upcoming_compliance(calendar.entity_id, days_ahead=365)
        assert len(upcoming) >= 0
        
        # Test compliance summary
        summary = self.tracker.get_compliance_summary(calendar.entity_id)
        assert "entity_name" in summary
        assert "total_items" in summary

class TestBusinessFormationModule:
    """Test main business formation module"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.module = BusinessFormationModule()
    
    @pytest.mark.asyncio
    async def test_formation_start_query(self):
        """Test formation start query processing"""
        response = await self.module.process_query("I want to start an LLC")
        
        assert response["action"] == "start_formation"
        assert "next_steps" in response
        assert response.get("questionnaire_available") is True
    
    @pytest.mark.asyncio
    async def test_entity_type_extraction(self):
        """Test entity type extraction from queries"""
        llc_type = self.module._extract_entity_type("I want to form an LLC")
        assert llc_type == EntityType.LLC
        
        corp_type = self.module._extract_entity_type("Create a corporation")
        assert corp_type == EntityType.CORPORATION
        
        s_corp_type = self.module._extract_entity_type("S-Corp formation")
        assert s_corp_type == EntityType.S_CORPORATION
    
    @pytest.mark.asyncio
    async def test_jurisdiction_extraction(self):
        """Test jurisdiction extraction from queries"""
        de_jurisdiction = self.module._extract_jurisdiction("Incorporate in Delaware")
        assert de_jurisdiction == Jurisdiction.DELAWARE
        
        ca_jurisdiction = self.module._extract_jurisdiction("California LLC formation")
        assert ca_jurisdiction == Jurisdiction.CALIFORNIA
        
        nv_jurisdiction = self.module._extract_jurisdiction("Nevada corporation")
        assert nv_jurisdiction == Jurisdiction.NEVADA
    
    @pytest.mark.asyncio
    async def test_name_availability_query(self):
        """Test name availability query processing"""
        with patch.object(self.module.api_manager, 'check_name_availability') as mock_check:
            mock_result = NameAvailabilityResult(
                name="Test Company LLC",
                available=True,
                similar_names=[],
                restrictions=[],
                suggestions=[]
            )
            mock_check.return_value = mock_result
            
            response = await self.module.process_query(
                "Check if 'Test Company LLC' is available"
            )
            
            assert response["action"] == "name_availability_result"
            assert response["available"] is True
            assert response["business_name"] == "Test Company LLC"
    
    @pytest.mark.asyncio
    async def test_information_request_query(self):
        """Test information request query processing"""
        response = await self.module.process_query(
            "What are the fees for forming an LLC in Delaware?"
        )
        
        assert response["action"] == "formation_information"
        assert "fees" in response
        assert "timeline" in response
    
    @pytest.mark.asyncio
    async def test_general_inquiry_query(self):
        """Test general inquiry query processing"""
        response = await self.module.process_query("Tell me about business formation")
        
        assert response["action"] == "general_guidance"
        assert "services" in response
        assert len(response["services"]) > 0
    
    def test_module_info(self):
        """Test module information retrieval"""
        info = self.module.get_module_info()
        
        assert info["module_id"] == "business_formation"
        assert "capabilities" in info
        assert "supported_entities" in info
        assert "supported_jurisdictions" in info
        assert "confidence_factors" in info
    
    @pytest.mark.asyncio
    async def test_questionnaire_response_processing(self):
        """Test questionnaire response processing"""
        responses = {
            "business_name": "Test LLC",
            "entity_type": "llc",
            "formation_state": "US_DE",
            "business_purpose": "Technology consulting",
            "industry": "Technology",
            "street_address": "123 Test St",
            "city": "Dover",
            "state": "DE",
            "zip_code": "19901",
            "owners": [{
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
                "phone": "555-123-4567",
                "street_address": "123 Test St",
                "city": "Dover",
                "state": "DE",
                "zip_code": "19901"
            }]
        }
        
        context = {"responses": responses}
        response = await self.module.process_query("Submit questionnaire", context)
        
        assert response["action"] == "formation_ready"
        assert "formation_id" in response
        assert "business_summary" in response

# Integration tests
class TestIntegration:
    """Test end-to-end integration scenarios"""
    
    @pytest.mark.asyncio
    async def test_full_formation_workflow(self):
        """Test complete formation workflow"""
        module = BusinessFormationModule()
        
        # Step 1: Start formation
        start_response = await module.process_query("Start LLC formation in Delaware")
        assert start_response["action"] == "start_formation"
        
        # Step 2: Check name availability
        with patch.object(module.api_manager, 'check_name_availability') as mock_check:
            mock_result = NameAvailabilityResult(
                name="Integration Test LLC",
                available=True,
                similar_names=[],
                restrictions=[],
                suggestions=[]
            )
            mock_check.return_value = mock_result
            
            name_response = await module.process_query(
                "Check if Integration Test LLC is available"
            )
            assert name_response["available"] is True
        
        # Step 3: Submit questionnaire responses
        responses = {
            "business_name": "Integration Test LLC",
            "entity_type": "llc",
            "formation_state": "US_DE",
            "business_purpose": "Integration testing",
            "industry": "Technology",
            "street_address": "123 Integration St",
            "city": "Dover",
            "state": "DE",
            "zip_code": "19901",
            "owners": [{
                "first_name": "Test",
                "last_name": "User",
                "email": "test@example.com",
                "phone": "555-123-4567",
                "street_address": "123 Integration St",
                "city": "Dover",
                "state": "DE",
                "zip_code": "19901"
            }]
        }
        
        questionnaire_response = await module.process_query(
            "Submit questionnaire", {"responses": responses}
        )
        assert questionnaire_response["action"] == "formation_ready"
        formation_id = questionnaire_response["formation_id"]
        
        # Step 4: Generate documents
        doc_response = await module.process_query(
            "Generate documents", {"formation_id": formation_id}
        )
        assert doc_response["action"] == "documents_generated"
        
        # Step 5: Check status
        status_response = await module.process_query(
            "Check formation status", {"formation_id": formation_id}
        )
        assert status_response["action"] == "formation_status"
        assert status_response["formation_id"] == formation_id

# Performance tests
class TestPerformance:
    """Test module performance characteristics"""
    
    @pytest.mark.asyncio
    async def test_concurrent_name_checks(self):
        """Test concurrent name availability checks"""
        module = BusinessFormationModule()
        
        with patch.object(module.api_manager, 'check_name_availability') as mock_check:
            mock_result = NameAvailabilityResult(
                name="Test",
                available=True,
                similar_names=[],
                restrictions=[],
                suggestions=[]
            )
            mock_check.return_value = mock_result
            
            # Run multiple concurrent name checks
            tasks = []
            for i in range(10):
                task = module.process_query(f"Check if Test Company {i} LLC is available")
                tasks.append(task)
            
            results = await asyncio.gather(*tasks)
            
            # All should succeed
            for result in results:
                assert result["action"] == "name_availability_result"
                assert result["available"] is True
    
    def test_questionnaire_generation_speed(self):
        """Test questionnaire generation performance"""
        questionnaire = DynamicQuestionnaire()
        
        start_time = datetime.utcnow()
        
        # Generate multiple questionnaires
        for _ in range(50):
            questionnaire.generate_questionnaire(
                Jurisdiction.DELAWARE, EntityType.LLC
            )
        
        end_time = datetime.utcnow()
        duration = (end_time - start_time).total_seconds()
        
        # Should generate 50 questionnaires in under 1 second
        assert duration < 1.0

if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
