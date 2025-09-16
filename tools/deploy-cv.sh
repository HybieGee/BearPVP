#!/bin/bash

# Deploy CV service to a container platform
# This script can be adapted for your preferred deployment target

set -e

echo "Building CV service Docker image..."

cd cv

# Build the Docker image
docker build -t purple-vs-yellow-cv:latest .

# Tag for your registry (replace with your actual registry)
docker tag purple-vs-yellow-cv:latest your-registry.com/purple-vs-yellow-cv:latest

echo "Pushing image to registry..."
docker push your-registry.com/purple-vs-yellow-cv:latest

echo "Deploying to your container platform..."

# Example for deploying to a simple container service
# Replace this with your actual deployment commands

# For Railway.app:
# railway deploy

# For Render.com:
# curl -X POST https://api.render.com/v1/services/YOUR_SERVICE_ID/deploys \
#   -H "Authorization: Bearer $RENDER_API_KEY"

# For Google Cloud Run:
# gcloud run deploy purple-vs-yellow-cv \
#   --image your-registry.com/purple-vs-yellow-cv:latest \
#   --platform managed \
#   --region us-central1 \
#   --allow-unauthenticated

# For AWS ECS/Fargate:
# aws ecs update-service --cluster purple-vs-yellow --service cv-service --force-new-deployment

echo "CV service deployment complete!"
echo "Update your CV_SERVICE_URL environment variable to point to the deployed service."