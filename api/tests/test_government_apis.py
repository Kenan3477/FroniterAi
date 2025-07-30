"""
Government API Integration Tests

Comprehensive test suite for all government API integrations with mock responses
"""

import pytest
import asyncio
import json
from unittest.mock import AsyncMock, patch, MagicMock
from typing import Dict, Any
from datetime import datetime, timedelta

# Import API classes
from api.integrations.delaware_api import DelawareAPI
from api.integrations.california_api import CaliforniaAPI
from api.integrations.uk_api import UKCompaniesHouseAPI
from api.integrations.wyoming_api import WyomingAPI
from api.integrations.new_york_api import NewYorkAPI
from api.integrations.irs_api import IRSAPI
from api.integrations.base_api import APIResponse

class TestMockResponses:
    """Mock response data for testing"""
    
    @staticmethod
    def delaware_name_search_available():
        return {
            "available": True,
            "search_date": "2024-07-24T10:00:00Z",
            "similar_names": [],
            "message": "Name is available for registration"
        }
    
    @staticmethod
    def delaware_name_search_unavailable():
        return {
            "available": False,
            "search_date": "2024-07-24T10:00:00Z",
            "similar_names": [
                {"name": "Test Corp", "entity_id": "5555555"},
                {"name": "Test Corporation Inc.", "entity_id": "6666666"}
            ],
            "message": "Name is not available"
        }
    
    @staticmethod
    def delaware_formation_success():
        return {
            "filing_id": "DE123456789",
            "entity_number": "7777777",
            "status": "pending",
            "filing_date": "2024-07-24",
            "total_fees": "$139.00",
            "estimated_completion": "3-5 business days",
            "tracking_number": "TRK-DE-2024-001"
        }
    
    @staticmethod
    def california_name_search():
        return {
            "available": True,
            "search_timestamp": "2024-07-24T10:00:00Z",
            "similar_entities": [],
            "name_restrictions": []
        }
    
    @staticmethod
    def california_formation_success():
        return {
            "filing_number": "CA-2024-001234",
            "entity_number": "C5555555",
            "filing_status": "pending",
            "filing_date": "2024-07-24",
            "total_fees": "$100.00",
            "processing_time": "10-15 business days",
            "tracking_id": "TRK-CA-001234"
        }
    
    @staticmethod
    def uk_company_search():
        return {
            "items": [
                {
                    "company_name": "Similar Company Ltd",
                    "company_number": "12345678",
                    "company_status": "active"
                }
            ],
            "total_results": 1
        }
    
    @staticmethod
    def uk_incorporation_success():
        return {
            "transaction_id": "UK-2024-001234",
            "company_number": "12345678",
            "status": "pending",
            "submission_date": "2024-07-24",
            "total_fees": "£12.00",
            "estimated_completion": "24 hours",
            "barcode": "BC-UK-001234"
        }
    
    @staticmethod
    def wyoming_formation_success():
        return {
            "filing_number": "WY-2024-001234",
            "entity_id": "2024-001234567",
            "status": "pending",
            "filing_date": "2024-07-24",
            "total_fees": "$100.00",
            "processing_time": "3-5 business days",
            "tracking_id": "TRK-WY-001234"
        }
    
    @staticmethod
    def new_york_formation_success():
        return {
            "filing_receipt_number": "NY-2024-001234",
            "dos_id": "5555555",
            "filing_status": "pending",
            "filing_date": "2024-07-24",
            "total_fees": "$125.00",
            "processing_time": "7-10 business days",
            "tracking_id": "TRK-NY-001234",
            "effective_date": "2024-07-24"
        }
    
    @staticmethod
    def irs_ein_success():
        return {
            "application_id": "IRS-2024-001234",
            "ein": "12-3456789",
            "status": "approved",
            "submission_date": "2024-07-24",
            "confirmation_number": "CONF-IRS-001234",
            "processing_time": "4-6 weeks",
            "cp575_notice_date": "2024-08-15"
        }


class TestBaseAPIFunctionality:
    """Test base API functionality"""
    
    @pytest.fixture
    def base_api(self):
        """Create base API instance for testing"""
        return DelawareAPI()  # Use Delaware as example of base functionality
    
    @pytest.mark.asyncio
    async def test_rate_limiting(self, base_api):
        """Test rate limiting functionality"""
        # Simulate rapid requests
        for i in range(5):
            can_make_request = await base_api._check_rate_limit()
            assert can_make_request is True
            base_api.request_history.append(datetime.now())
        
        # Should still be within limits
        can_make_request = await base_api._check_rate_limit()
        assert can_make_request is True
    
    @pytest.mark.asyncio
    async def test_rate_limit_exceeded(self, base_api):
        """Test behavior when rate limit is exceeded"""
        # Fill request history to exceed limits
        now = datetime.now()
        base_api.request_history = [now for _ in range(35)]  # Exceed 30/minute limit
        
        can_make_request = await base_api._check_rate_limit()
        assert can_make_request is False
    
    def test_headers_with_api_key(self):
        """Test header generation with API key"""
        api = DelawareAPI(api_key="test_api_key")
        headers = api.get_base_headers()
        
        assert "Authorization" in headers
        assert headers["Authorization"] == "Bearer test_api_key"
    
    def test_headers_without_api_key(self):
        """Test header generation without API key"""
        api = DelawareAPI()
        headers = api.get_base_headers()
        
        assert "Authorization" not in headers
        assert headers["Content-Type"] == "application/json"


class TestDelawareAPI:
    """Test Delaware Division of Corporations API"""
    
    @pytest.fixture
    def delaware_api(self):
        return DelawareAPI(api_key="test_delaware_key")
    
    @pytest.mark.asyncio
    async def test_name_availability_success(self, delaware_api):
        """Test successful name availability check"""
        with patch.object(delaware_api, '_make_request') as mock_request:
            mock_request.return_value = APIResponse(
                success=True,
                data=TestMockResponses.delaware_name_search_available(),
                status_code=200,
                response_time=0.5
            )
            
            response = await delaware_api.check_name_availability("Test Corp", "corporation")
            
            assert response.success is True
            assert response.data["available"] is True
            assert response.data["jurisdiction"] == "Delaware"
            assert response.data["reservation_period"] == "120 days"
    
    @pytest.mark.asyncio
    async def test_name_availability_unavailable(self, delaware_api):
        """Test name availability check when name is unavailable"""
        with patch.object(delaware_api, '_make_request') as mock_request:
            mock_request.return_value = APIResponse(
                success=True,
                data=TestMockResponses.delaware_name_search_unavailable(),
                status_code=200,
                response_time=0.5
            )
            
            response = await delaware_api.check_name_availability("Test Corp", "corporation")
            
            assert response.success is True
            assert response.data["available"] is False
            assert len(response.data["similar_names"]) > 0
    
    @pytest.mark.asyncio
    async def test_formation_submission(self, delaware_api):
        """Test formation document submission"""
        with patch.object(delaware_api, '_make_request') as mock_request:
            mock_request.return_value = APIResponse(
                success=True,
                data=TestMockResponses.delaware_formation_success(),
                status_code=200,
                response_time=1.2
            )
            
            formation_data = {
                "name": "Test Delaware Corp",
                "entity_type": "corporation",
                "registered_agent": {
                    "name": "Test Agent",
                    "address": "123 Main St, Wilmington, DE 19801"
                },
                "incorporators": [
                    {"name": "John Doe", "address": "456 Oak St, Dover, DE 19901"}
                ],
                "authorized_shares": 1500,
                "par_value": 0.001
            }
            
            response = await delaware_api.submit_formation_documents(formation_data)
            
            assert response.success is True
            assert "filing_id" in response.data
            assert response.data["status"] == "pending"
    
    @pytest.mark.asyncio
    async def test_fee_calculation(self, delaware_api):
        """Test Delaware fee calculation"""
        response = await delaware_api.calculate_fees("corporation", {"expedited": True})
        
        assert response.success is True
        assert response.data["total_fee"] == 139.00  # Base $89 + Expedited $50
        assert len(response.data["fee_breakdown"]) == 2


class TestCaliforniaAPI:
    """Test California Secretary of State API"""
    
    @pytest.fixture
    def california_api(self):
        return CaliforniaAPI(api_key="test_california_key")
    
    @pytest.mark.asyncio
    async def test_name_availability(self, california_api):
        """Test California name availability check"""
        with patch.object(california_api, '_make_request') as mock_request:
            mock_request.return_value = APIResponse(
                success=True,
                data=TestMockResponses.california_name_search(),
                status_code=200,
                response_time=0.8
            )
            
            response = await california_api.check_name_availability("Test California Corp", "corporation")
            
            assert response.success is True
            assert response.data["available"] is True
            assert response.data["jurisdiction"] == "California"
            assert response.data["reservation_period"] == "60 days"
    
    @pytest.mark.asyncio
    async def test_formation_submission(self, california_api):
        """Test California formation submission"""
        with patch.object(california_api, '_make_request') as mock_request:
            mock_request.return_value = APIResponse(
                success=True,
                data=TestMockResponses.california_formation_success(),
                status_code=200,
                response_time=1.5
            )
            
            formation_data = {
                "name": "Test California Corp",
                "entity_type": "corporation",
                "registered_agent": {
                    "name": "Test Agent CA",
                    "address": "123 California St, Los Angeles, CA 90210"
                },
                "purpose": "General business purposes"
            }
            
            response = await california_api.submit_formation_documents(formation_data)
            
            assert response.success is True
            assert response.data["filing_id"] == "CA-2024-001234"
    
    @pytest.mark.asyncio
    async def test_fee_calculation_with_publication(self, california_api):
        """Test California fee calculation including publication"""
        response = await california_api.calculate_fees("llc")
        
        assert response.success is True
        assert response.data["total_fee"] == 1070.00  # Base $70 + Publication $1000
        
    def test_entity_type_mapping(self, california_api):
        """Test entity type mapping"""
        assert california_api._map_entity_type("corporation") == "CORP"
        assert california_api._map_entity_type("llc") == "LLC"
        assert california_api._map_entity_type("limited_liability_company") == "LLC"


class TestUKCompaniesHouseAPI:
    """Test UK Companies House API"""
    
    @pytest.fixture
    def uk_api(self):
        return UKCompaniesHouseAPI(api_key="test_uk_key")
    
    def test_uk_headers_basic_auth(self, uk_api):
        """Test UK API uses basic authentication"""
        headers = uk_api.get_base_headers()
        
        assert "Authorization" in headers
        assert headers["Authorization"].startswith("Basic ")
    
    @pytest.mark.asyncio
    async def test_name_availability(self, uk_api):
        """Test UK name availability check"""
        with patch.object(uk_api, '_make_request') as mock_request:
            mock_request.return_value = APIResponse(
                success=True,
                data=TestMockResponses.uk_company_search(),
                status_code=200,
                response_time=0.6
            )
            
            response = await uk_api.check_name_availability("Test UK Ltd", "ltd")
            
            assert response.success is True
            assert response.data["jurisdiction"] == "United Kingdom"
            assert len(response.data["similar_names"]) > 0
    
    @pytest.mark.asyncio
    async def test_incorporation_submission(self, uk_api):
        """Test UK incorporation submission"""
        with patch.object(uk_api, '_make_request') as mock_request:
            mock_request.return_value = APIResponse(
                success=True,
                data=TestMockResponses.uk_incorporation_success(),
                status_code=200,
                response_time=1.1
            )
            
            formation_data = {
                "name": "Test UK Ltd",
                "entity_type": "ltd",
                "registered_office": {
                    "address_line_1": "123 London Road",
                    "city": "London",
                    "postal_code": "SW1A 1AA"
                },
                "officers": [
                    {
                        "first_name": "John",
                        "last_name": "Smith",
                        "role": "director"
                    }
                ]
            }
            
            response = await uk_api.submit_formation_documents(formation_data)
            
            assert response.success is True
            assert response.data["company_number"] == "12345678"
    
    @pytest.mark.asyncio
    async def test_name_reservation_not_supported(self, uk_api):
        """Test that UK doesn't support separate name reservation"""
        response = await uk_api.reserve_name("Test Ltd", "ltd", {})
        
        assert response.success is False
        assert "doesn't support separate name reservation" in response.error


class TestWyomingAPI:
    """Test Wyoming Secretary of State API"""
    
    @pytest.fixture
    def wyoming_api(self):
        return WyomingAPI(api_key="test_wyoming_key")
    
    @pytest.mark.asyncio
    async def test_formation_submission(self, wyoming_api):
        """Test Wyoming formation submission"""
        with patch.object(wyoming_api, '_make_request') as mock_request:
            mock_request.return_value = APIResponse(
                success=True,
                data=TestMockResponses.wyoming_formation_success(),
                status_code=200,
                response_time=0.9
            )
            
            formation_data = {
                "name": "Test Wyoming LLC",
                "entity_type": "llc",
                "registered_agent": {
                    "name": "Test Agent WY",
                    "address": "123 Wyoming Ave, Cheyenne, WY 82001"
                },
                "purpose": "General business purposes"
            }
            
            response = await wyoming_api.submit_formation_documents(formation_data)
            
            assert response.success is True
            assert response.data["entity_id"] == "2024-001234567"
    
    @pytest.mark.asyncio
    async def test_fee_calculation_with_expediting(self, wyoming_api):
        """Test Wyoming fee calculation with expedited processing"""
        response = await wyoming_api.calculate_fees("llc", {"expedited_24hr": True})
        
        assert response.success is True
        assert response.data["total_fee"] == 150.00  # Base $100 + Expedited $50
    
    def test_entity_type_mapping(self, wyoming_api):
        """Test Wyoming entity type mapping"""
        assert wyoming_api._map_entity_type("corporation") == "CORP"
        assert wyoming_api._map_entity_type("llc") == "LLC"
        assert wyoming_api._map_entity_type("nonprofit") == "NONPROFIT"


class TestNewYorkAPI:
    """Test New York Department of State API"""
    
    @pytest.fixture
    def new_york_api(self):
        return NewYorkAPI(api_key="test_ny_key")
    
    @pytest.mark.asyncio
    async def test_formation_submission(self, new_york_api):
        """Test New York formation submission"""
        with patch.object(new_york_api, '_make_request') as mock_request:
            mock_request.return_value = APIResponse(
                success=True,
                data=TestMockResponses.new_york_formation_success(),
                status_code=200,
                response_time=1.3
            )
            
            formation_data = {
                "name": "Test New York Corp",
                "entity_type": "corporation",
                "registered_agent": {
                    "name": "Test Agent NY",
                    "address": "123 Broadway, New York, NY 10001"
                },
                "incorporators": [
                    {"name": "Jane Doe", "address": "456 Park Ave, New York, NY 10001"}
                ]
            }
            
            response = await new_york_api.submit_formation_documents(formation_data)
            
            assert response.success is True
            assert response.data["dos_id"] == "5555555"
    
    @pytest.mark.asyncio
    async def test_fee_calculation_with_publication(self, new_york_api):
        """Test New York fee calculation with publication requirement"""
        response = await new_york_api.calculate_fees("llc")
        
        assert response.success is True
        # Should include publication cost for LLC
        assert response.data["total_fee"] > 200.00
        
        # Check that publication is mentioned in breakdown
        publication_items = [
            item for item in response.data["fee_breakdown"] 
            if "publication" in item["item"].lower()
        ]
        assert len(publication_items) > 0
    
    def test_entity_type_mapping(self, new_york_api):
        """Test New York entity type mapping"""
        assert new_york_api._map_entity_type("corporation") == "DOMESTIC BUSINESS CORPORATION"
        assert new_york_api._map_entity_type("llc") == "LIMITED LIABILITY COMPANY"


class TestIRSAPI:
    """Test IRS API for EIN applications"""
    
    @pytest.fixture
    def irs_api(self):
        return IRSAPI(api_key="test_irs_key")
    
    @pytest.mark.asyncio
    async def test_ein_application(self, irs_api):
        """Test EIN application submission"""
        with patch.object(irs_api, '_make_request') as mock_request:
            mock_request.return_value = APIResponse(
                success=True,
                data=TestMockResponses.irs_ein_success(),
                status_code=200,
                response_time=2.1
            )
            
            business_data = {
                "name": "Test Business Inc",
                "entity_type": "corporation",
                "responsible_party": {
                    "name": "John Doe",
                    "ssn": "123-45-6789",
                    "title": "President"
                },
                "business_start_date": "2024-07-24",
                "principal_activity": "Software development",
                "state_of_incorporation": "Delaware"
            }
            
            response = await irs_api.apply_for_ein(business_data)
            
            assert response.success is True
            assert response.data["ein"] == "12-3456789"
            assert response.data["status"] == "approved"
    
    @pytest.mark.asyncio
    async def test_name_availability_always_true(self, irs_api):
        """Test that IRS always returns name as available"""
        response = await irs_api.check_name_availability("Any Business Name", "corporation")
        
        assert response.success is True
        assert response.data["available"] is True
        assert "IRS does not validate" in response.data["note"]
    
    @pytest.mark.asyncio
    async def test_name_reservation_not_supported(self, irs_api):
        """Test that IRS doesn't support name reservation"""
        response = await irs_api.reserve_name("Test Name", "corporation", {})
        
        assert response.success is False
        assert "does not support name reservation" in response.error
    
    @pytest.mark.asyncio
    async def test_fee_calculation_free(self, irs_api):
        """Test that EIN applications are free"""
        response = await irs_api.calculate_fees("corporation")
        
        assert response.success is True
        assert response.data["total_fee"] == 0.00
        assert "free when filed directly" in response.data["notes"][0]
    
    def test_entity_type_mapping(self, irs_api):
        """Test IRS entity type mapping"""
        assert irs_api._map_entity_type("corporation") == "Corporation"
        assert irs_api._map_entity_type("llc") == "LLC"
        assert irs_api._map_entity_type("sole_proprietorship") == "Sole proprietorship"


class TestIntegrationWorkflows:
    """Test complete integration workflows"""
    
    @pytest.mark.asyncio
    async def test_complete_delaware_formation_workflow(self):
        """Test complete Delaware formation workflow"""
        api = DelawareAPI(api_key="test_key")
        
        # Mock all API calls
        with patch.object(api, '_make_request') as mock_request:
            # Step 1: Check name availability
            mock_request.return_value = APIResponse(
                success=True,
                data=TestMockResponses.delaware_name_search_available(),
                status_code=200
            )
            
            name_response = await api.check_name_availability("Test Complete Corp", "corporation")
            assert name_response.success is True
            assert name_response.data["available"] is True
            
            # Step 2: Submit formation documents
            mock_request.return_value = APIResponse(
                success=True,
                data=TestMockResponses.delaware_formation_success(),
                status_code=200
            )
            
            formation_data = {
                "name": "Test Complete Corp",
                "entity_type": "corporation",
                "registered_agent": {
                    "name": "Test Agent",
                    "address": "123 Main St, Wilmington, DE 19801"
                }
            }
            
            formation_response = await api.submit_formation_documents(formation_data)
            assert formation_response.success is True
            assert "filing_id" in formation_response.data
    
    @pytest.mark.asyncio
    async def test_multi_jurisdiction_name_check(self):
        """Test checking name availability across multiple jurisdictions"""
        name = "Test Multi Jurisdiction Corp"
        entity_type = "corporation"
        
        apis = [
            DelawareAPI(),
            CaliforniaAPI(),
            WyomingAPI(),
            NewYorkAPI()
        ]
        
        results = []
        
        for api in apis:
            with patch.object(api, '_make_request') as mock_request:
                mock_request.return_value = APIResponse(
                    success=True,
                    data={"available": True, "search_date": "2024-07-24"},
                    status_code=200
                )
                
                response = await api.check_name_availability(name, entity_type)
                results.append({
                    "jurisdiction": response.data.get("jurisdiction", api.__class__.__name__),
                    "available": response.data["available"]
                })
        
        # All should be available in this test
        assert all(result["available"] for result in results)
        assert len(results) == 4


class TestErrorHandling:
    """Test error handling across all APIs"""
    
    @pytest.mark.asyncio
    async def test_api_timeout_handling(self):
        """Test handling of API timeouts"""
        api = DelawareAPI()
        
        with patch.object(api, '_make_request') as mock_request:
            mock_request.return_value = APIResponse(
                success=False,
                error="Request timeout",
                status_code=408
            )
            
            response = await api.check_name_availability("Test Timeout Corp", "corporation")
            
            assert response.success is False
            assert "timeout" in response.error.lower()
    
    @pytest.mark.asyncio
    async def test_rate_limit_error_handling(self):
        """Test handling of rate limit errors"""
        api = CaliforniaAPI()
        
        with patch.object(api, '_make_request') as mock_request:
            mock_request.return_value = APIResponse(
                success=False,
                error="Rate limit exceeded",
                status_code=429
            )
            
            response = await api.check_name_availability("Test Rate Limit Corp", "corporation")
            
            assert response.success is False
            assert response.status_code == 429
    
    @pytest.mark.asyncio
    async def test_invalid_data_handling(self):
        """Test handling of invalid data"""
        api = UKCompaniesHouseAPI()
        
        with patch.object(api, '_make_request') as mock_request:
            mock_request.return_value = APIResponse(
                success=False,
                error="Invalid data provided",
                status_code=400
            )
            
            # Try to submit formation with missing required data
            response = await api.submit_formation_documents({})
            
            assert response.success is False
            assert response.status_code == 400


# Utility functions for running tests
def run_government_api_tests():
    """Run all government API integration tests"""
    pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "--asyncio-mode=auto"
    ])


def run_specific_jurisdiction_tests(jurisdiction: str):
    """Run tests for a specific jurisdiction"""
    test_mapping = {
        "delaware": "TestDelawareAPI",
        "california": "TestCaliforniaAPI", 
        "uk": "TestUKCompaniesHouseAPI",
        "wyoming": "TestWyomingAPI",
        "new_york": "TestNewYorkAPI",
        "irs": "TestIRSAPI"
    }
    
    test_class = test_mapping.get(jurisdiction.lower())
    if test_class:
        pytest.main([
            f"{__file__}::{test_class}",
            "-v",
            "--tb=short",
            "--asyncio-mode=auto"
        ])
    else:
        print(f"Unknown jurisdiction: {jurisdiction}")
        print(f"Available jurisdictions: {list(test_mapping.keys())}")


if __name__ == "__main__":
    # Run all tests when script is executed directly
    run_government_api_tests()
