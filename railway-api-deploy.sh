#!/bin/bash

# Railway API Deployment Script
# Automates service creation and configuration using Railway's GraphQL API

set -e

# Configuration
PROJECT_ID="0decb717-6737-481d-abc8-1d80fb6746d6"
ENVIRONMENT_ID="0652123b-9c74-48b3-8e46-0eb76fad1ee1"
RAILWAY_TOKEN="rw_Fe26.2**6178a746aa9c3cbdd451d12b4f0fe603804c773bc5ace693ac3141cc9ee4ea81*DOlIwqxTYM4H6rvtK89uWw*Cc71Gpg2m2BVFinEsmpvUxIVTjyoOB9rP4UTFT0Duu7yk8zYAZMC-IFpXYdjYHRJ-P9GcuBgaCXcOHz1vAlE-w*1775145576812*35390c9f17bd119e1bd14dcd91dc007dad8f111e5bf2082be5649de15c05bd52*xRy4dU6G7jtd93gxufHtfUy3GP5J9RVs0aBm5LHXC94"
API_URL="https://backboard.railway.app/graphql/v2"

echo "🚀 Deploying to Railway via GraphQL API"
echo "========================================"
echo ""

# Function to make GraphQL requests
graphql_query() {
    local query="$1"
    curl -s -X POST "$API_URL" \
        -H "Authorization: Bearer $RAILWAY_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$query\"}"
}

echo "📦 Step 1: Adding Redis Plugin..."
REDIS_QUERY='mutation { pluginCreate(input: { projectId: \"'$PROJECT_ID'\", plugin: REDIS }) { id name } }'
REDIS_RESULT=$(graphql_query "$REDIS_QUERY")
echo "Redis Result: $REDIS_RESULT"
echo ""

echo "📦 Step 2: Creating API Service..."
API_SERVICE_QUERY='mutation { serviceCreate(input: { projectId: \"'$PROJECT_ID'\", name: \"api\", source: { repo: \"bendervintimilla/neuroforge-complete\", rootDirectory: \"apps/api\" } }) { id name } }'
API_RESULT=$(graphql_query "$API_SERVICE_QUERY")
echo "API Service Result: $API_RESULT"
echo ""

echo "📦 Step 3: Creating Web Service..."
WEB_SERVICE_QUERY='mutation { serviceCreate(input: { projectId: \"'$PROJECT_ID'\", name: \"web\", source: { repo: \"bendervintimilla/neuroforge-complete\", rootDirectory: \"apps/web\" } }) { id name } }'
WEB_RESULT=$(graphql_query "$WEB_SERVICE_QUERY")
echo "Web Service Result: $WEB_RESULT"
echo ""

echo "📦 Step 4: Creating Worker Service..."
WORKER_SERVICE_QUERY='mutation { serviceCreate(input: { projectId: \"'$PROJECT_ID'\", name: \"worker\", source: { repo: \"bendervintimilla/neuroforge-complete\", rootDirectory: \"apps/worker\" } }) { id name } }'
WORKER_RESULT=$(graphql_query "$WORKER_SERVICE_QUERY")
echo "Worker Service Result: $WORKER_RESULT"
echo ""

echo "✅ All services created!"
echo ""
echo "Next: Configure build commands via Railway dashboard or continue with API calls"
