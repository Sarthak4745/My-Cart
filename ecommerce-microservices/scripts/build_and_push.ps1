$ErrorActionPreference = "Stop"

# Define your Docker Hub username here. Defaults to 'My cart' based on the existing k8s manifests.
$DOCKER_USERNAME = "team4devops"

# List of microservices to build and push
$microservices = @(
    "admin-service",
    "api-gateway",
    "authentication-service",
    "cart-service",
    "frontend-ui",
    "inventory-service",
    "invoice-service",
    "order-service",
    "payment-service",
    "product-service",
    "recommendation-service",
    "review-rating-service",
    "search-service",
    "shipping-service",
    "user-service",
    "wishlist-service"
)

Write-Host "Starting Docker Build and Push Process..." -ForegroundColor Cyan
Write-Host "Target Docker Registry Namespace: $DOCKER_USERNAME" -ForegroundColor Yellow

# Ensure the user is logged in
Write-Host "Make sure you are logged into Docker Hub (run 'docker login' if you haven't already)." -ForegroundColor Yellow
Start-Sleep -Seconds 2

foreach ($service in $microservices) {
    $imageName = "$DOCKER_USERNAME/ecommerce-$service:v1.0.0"
    $servicePath = Join-Path $PWD $service
    
    if (Test-Path $servicePath) {
        Write-Host "`n======================================================="
        Write-Host "Building $imageName from directory $servicePath..." -ForegroundColor Green
        
        # Build the docker image
        docker build -t $imageName $servicePath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully built $imageName. Pushing to Docker Hub..." -ForegroundColor darkyellow
            # Push the docker image
            docker push $imageName
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Successfully pushed $imageName!" -ForegroundColor Green
            } else {
                Write-Host "Failed to push $imageName. Exiting." -ForegroundColor Red
                exit 1
            }
        } else {
            Write-Host "Failed to build $imageName. Exiting." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Directory $servicePath does not exist. Skipping." -ForegroundColor Yellow
    }
}

Write-Host "`n======================================================="
Write-Host "All 16 microservices have been successfully built and pushed!" -ForegroundColor Green
