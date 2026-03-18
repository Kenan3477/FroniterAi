#!/bin/bash

echo "Testing organizations endpoint..."

# Test organizations endpoint
response=$(curl -s -w "%{http_code}" http://localhost:3004/api/admin/business-settings/organizations)
http_code="${response: -3}"
body="${response%???}"

echo "HTTP Status: $http_code"
echo "Response Body: $body"

if [ "$http_code" = "200" ]; then
    echo "✅ API is working!"
else
    echo "❌ API failed with status $http_code"
fi