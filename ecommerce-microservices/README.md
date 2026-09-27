# My cart — Premium E-Commerce Microservices Platform

A complete, production-ready full-stack e-commerce application built with a **Microservices Architecture**. Designed for cloud-native deployment with **Docker** and **Kubernetes**.

## 🚀 Key Features

- **Microservices Architecture**: 15 completely independent backend services.
- **Modern Frontend UI**: Stunning, premium React + TailwindCSS frontend with glassmorphism and smooth animations.
- **RESTful API Gateway**: Centralized routing proxy with JWT authentication middleware.
- **Containerized**: `docker-compose.yml` for 16 containers (15 Node.js + MongoDB backend + React/Nginx frontend).
- **Kubernetes Ready**: Complete suite of Kubernetes deployments, services, and configmaps. Use ClusterIP for internal service communication and NodePort to expose the React web app.

## 🏗️ Architecture Stack

- **Frontend**: React 18, TailwindCSS, React Context API, React Router v6, Vite
- **Backend API**: Node.js, Express.js (15 services)
- **Database**: MongoDB (One dedicated database per service)
- **DevOps**: Docker, Docker Compose, Kubernetes

## 📦 Microservices Breakdown

1. `user-service`: User registration & profile management
2. `authentication-service`: JWT generation and validation
3. `api-gateway`: Aggregates APIs and serves as the single entry point
4. `product-service`: Manages product catalogs and categories
5. `search-service`: Full-text product search engine
6. `inventory-service`: Real-time stock levels
7. `cart-service`: Shopping cart management
8. `wishlist-service`: User favorites
9. `order-service`: Order placements and lifecycle
10. `payment-service`: Payment processor integration (mocked)
11. `invoice-service`: Generates digital receipts
12. `shipping-service`: Order tracking and logistics 
13. `review-rating-service`: Star ratings and customer reviews
14. `recommendation-service`: AI-based (mocked) personalized product suggestions
15. `admin-service`: Unified dashboard proxy for site administrators

## 🛠️ Quick Start (Docker Compose)

The easiest way to spin up the entire cluster locally is via Docker Compose:

```bash
cd ecommerce-microservices
docker-compose up --build
```

**Access Points:**
- **Frontend UI**: `http://localhost:5173` (If running locally via `npm run dev` inside `frontend-ui`) or port 80 if via Docker.
- **API Gateway**: `http://localhost:3000`

**Pre-seeded Admin User**:
- **Email**: `admin@example.com`
- **Password**: `123`

## ☸️ Kubernetes Deployment

To deploy the cluster to a local or cloud-native Kubernetes environment (e.g. Minikube):

```bash
cd ecommerce-microservices
kubectl apply -f kubernetes/configmaps/MyCart-config.yaml
kubectl apply -f kubernetes/deployments/all-deployments.yaml
kubectl apply -f kubernetes/services/all-services.yaml
```

Wait a few moments, then access the frontend service via the NodePort `30080`:
```bash
minikube service frontend-ui
# or access `http://<Node_IP>:30080`
```

## 📖 Development Approach
- **Internal APIs**: Services communicate directly with each other via internal URLs via Axios.
- **Database Isolation**: Rather than a single massive database, `mongo:6.0` acts as a cluster where *each service automatically creates its own logical database* (e.g. `productdb`, `userdb`).
- **State Management**: Frontend handles state management fully in custom React Contexts (`AuthContext` & `CartContext`).
