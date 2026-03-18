#!/bin/bash
echo "🚀 Testing Advanced Audit API Endpoints"
echo "========================================="
echo ""

echo "1. Health Check:"
curl -s http://localhost:3004/health | jq '.'
echo ""

echo "2. Test Activity Tracking:"
curl -s -X POST http://localhost:3004/api/admin/advanced-audit/track \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "test-org-001",
    "sessionId": "test-session-001",
    "activityType": "page_view",
    "pagePath": "/test-dashboard",
    "pageTitle": "Test Dashboard"
  }' | jq '.'
echo ""

echo "✅ API Tests Complete!"