#!/bin/bash

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
IMAGE_NAME="${IMAGE_NAME:-chatbot-app}"
REGISTRY="${REGISTRY:-}"
ENVIRONMENT="${ENVIRONMENT:-staging}"
PLATFORM="${PLATFORM:-cloud-run}"

print_step() {
    echo -e "${GREEN}==>${NC} $1"
}

print_error() {
    echo -e "${RED}ERROR${NC}: $1"
    exit 1
}

print_warning() {
    echo -e "${YELLOW}WARNING${NC}: $1"
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."

    command -v docker >/dev/null 2>&1 || print_error "Docker not installed"
    command -v git >/dev/null 2>&1 || print_error "Git not installed"

    if [ -z "$REGISTRY" ] && [ "$PLATFORM" != "vercel" ]; then
        print_error "REGISTRY environment variable not set"
    fi

    print_step "All prerequisites met"
}

# Build Docker image
build_image() {
    print_step "Building Docker image: $IMAGE_NAME:latest"

    docker build -t "$IMAGE_NAME:latest" .

    if [ -n "$REGISTRY" ]; then
        docker tag "$IMAGE_NAME:latest" "$REGISTRY/$IMAGE_NAME:latest"
        docker tag "$IMAGE_NAME:latest" "$REGISTRY/$IMAGE_NAME:$(date +%s)"
    fi

    print_step "Image built successfully"
}

# Push to registry
push_image() {
    if [ -z "$REGISTRY" ]; then
        print_warning "No registry specified, skipping push"
        return
    fi

    print_step "Pushing image to $REGISTRY"
    docker push "$REGISTRY/$IMAGE_NAME:latest"
    docker push "$REGISTRY/$IMAGE_NAME:$(date +%s)"
    print_step "Image pushed successfully"
}

# Deploy to Cloud Run
deploy_cloud_run() {
    print_step "Deploying to Cloud Run..."

    if [ -z "$GCP_PROJECT_ID" ]; then
        print_error "GCP_PROJECT_ID not set"
    fi

    SERVICE_NAME="${IMAGE_NAME}-${ENVIRONMENT}"
    REGION="${GCP_REGION:-us-central1}"

    gcloud run deploy "$SERVICE_NAME" \
        --image "$REGISTRY/$IMAGE_NAME:latest" \
        --platform managed \
        --region "$REGION" \
        --allow-unauthenticated \
        --port 3000 \
        --memory 512Mi \
        --cpu 1 \
        --max-instances 100 \
        --project "$GCP_PROJECT_ID"

    print_step "Deployment to Cloud Run complete"

    # Get service URL
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
        --region "$REGION" \
        --format='value(status.url)' \
        --project "$GCP_PROJECT_ID")

    echo -e "${GREEN}Service URL: $SERVICE_URL${NC}"
}

# Deploy to ECS
deploy_ecs() {
    print_step "Deploying to ECS..."

    if [ -z "$AWS_REGION" ] || [ -z "$ECS_CLUSTER" ] || [ -z "$ECS_SERVICE" ]; then
        print_error "AWS_REGION, ECS_CLUSTER, or ECS_SERVICE not set"
    fi

    aws ecs update-service \
        --cluster "$ECS_CLUSTER" \
        --service "$ECS_SERVICE" \
        --force-new-deployment \
        --region "$AWS_REGION"

    print_step "Deployment to ECS initiated"

    # Wait for deployment
    aws ecs wait services-stable \
        --cluster "$ECS_CLUSTER" \
        --services "$ECS_SERVICE" \
        --region "$AWS_REGION"

    print_step "ECS deployment complete"
}

# Deploy to Vercel
deploy_vercel() {
    print_step "Deploying to Vercel..."

    command -v vercel >/dev/null 2>&1 || print_error "Vercel CLI not installed"

    if [ "$ENVIRONMENT" = "production" ]; then
        vercel --prod
    else
        vercel
    fi

    print_step "Vercel deployment complete"
}

# Test deployment
test_deployment() {
    print_step "Testing deployment..."

    local url="$1"
    local max_retries=30
    local retry_count=0

    while [ $retry_count -lt $max_retries ]; do
        if curl -sf "$url" >/dev/null 2>&1; then
            print_step "Health check passed"
            return 0
        fi

        retry_count=$((retry_count + 1))
        echo "Waiting for service to be ready... ($retry_count/$max_retries)"
        sleep 2
    done

    print_error "Health check failed after $max_retries attempts"
}

# Main
main() {
    echo -e "${YELLOW}Chatbot Deployment Script${NC}"
    echo "Environment: $ENVIRONMENT"
    echo "Platform: $PLATFORM"
    echo ""

    check_prerequisites
    build_image
    push_image

    case "$PLATFORM" in
        cloud-run)
            deploy_cloud_run
            ;;
        ecs)
            deploy_ecs
            ;;
        vercel)
            deploy_vercel
            ;;
        *)
            print_error "Unknown platform: $PLATFORM"
            ;;
    esac

    print_step "Deployment completed successfully"
}

# Run
main "$@"
