#!/bin/bash
echo "Testing Business Settings API..."
echo ""

echo "1. Testing Organizations Endpoint:"
timeout 5 curl -s "http://localhost:3004/api/admin/business-settings/organizations" 2>/dev/null || echo "Timeout or error"
echo ""
echo ""

echo "2. Testing Dashboard Endpoint:"
timeout 5 curl -s "http://localhost:3004/api/admin/business-settings/dashboard" 2>/dev/null || echo "Timeout or error"
echo ""
echo ""
echo ""

echo "✅ API Tests Complete!"