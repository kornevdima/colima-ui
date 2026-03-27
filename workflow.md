# Istio POC with Colima

A proof-of-concept project for running Istio locally with Colima, demonstrating authorization policies with ext-authz for different services.

## Overview

This POC includes:
- **2 Node.js services** (service-1 and service-2)
- Each service exposes **2 GET endpoints**
- **Helm charts** for each service with Istio configuration
- **Authorization policies** using ext-authz for protected paths
- **Colima setup** for local Kubernetes cluster

## Project Structure

```
.
├── services/
│   ├── service-1/          # First Node.js service
│   │   ├── app.js
│   │   ├── package.json
│   │   └── Dockerfile
│   └── service-2/          # Second Node.js service
│       ├── app.js
│       ├── package.json
│       └── Dockerfile
├── helm/
│   ├── service-1/          # Helm chart for service-1
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   └── templates/
│   │       ├── deployment.yaml
│   │       ├── service.yaml
│   │       ├── authorization-policy.yaml
│   │       ├── gateway.yaml
│   │       ├── virtualservice.yaml
│   │       └── envoyfilter.yaml
│   └── service-2/          # Helm chart for service-2
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
│           ├── deployment.yaml
│           ├── service.yaml
│           ├── authorization-policy.yaml  # Primary access control
│           ├── gateway.yaml
│           ├── virtualservice.yaml
│           └── envoyfilter.yaml  # Optional/demonstration only
├── scripts/
│   ├── setup.sh                    # Automated setup script
│   ├── install-kiali.sh            # Install Kiali
│   ├── install-addons-simple.sh    # Install Istio addons
│   ├── update-kiali-config.sh      # Configure Kiali
│   ├── check-istio-addons.sh       # Check addon status
│   └── check-authz-policy.sh       # Check authz policy
└── README.md

```

## Services

### Service-1
- Endpoint 1: `GET /endpoint-1` (public - allowed)
- Endpoint 2: `GET /endpoint-2` (protected - blocked by AuthorizationPolicy)
- Endpoint 3: `GET /endpoint-3` (public in AuthorizationPolicy, but blocked by ext-authz/EnvoyFilter)

### Service-2
- Endpoint 1: `GET /endpoint-1` (public - allowed)
- Endpoint 2: `GET /endpoint-2` (protected - blocked by AuthorizationPolicy)
- Endpoint 3: `GET /endpoint-3` (public in AuthorizationPolicy, but blocked by ext-authz/EnvoyFilter)

## Prerequisites

- Docker
- Colima
- kubectl
- Helm 3.x
- Istio CLI (istioctl)

## Colima UI (optional desktop helper)

This repository also includes a small **Electron / Node.js** desktop POC that wraps the **Colima** and **Docker** CLIs (start/stop, list/status, Docker summary and container list). It is **optional**: everything below still works from the terminal alone.

- **Purpose:** Same Colima/Docker operations as in this guide, with a **Refresh** button instead of realtime updates.
- **Where it fits:** Use it for **§1. Start Colima with Kubernetes** (or plain start), then continue here from **§2. Install Istio** onward. It does **not** install or drive Istio, Helm, or `kubectl`.

See **[README.md](./README.md)** for install (`npm install` / `npm start`) and CLI mapping. Formal **FR/NFR** and **architecture** live in **[docs/REQUIREMENTS.md](./docs/REQUIREMENTS.md)** and **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)**.

## Setup Instructions

### 1. Start Colima with Kubernetes

```bash
# Start Colima with Kubernetes enabled
colima start --cpu 4 --memory 8 --kubernetes

# Verify kubectl can connect to the cluster
kubectl get nodes
```

If `kubectl get nodes` fails, you may need to configure kubectl to use Colima's context:
```bash
# Set kubectl context to Colima
kubectl config use-context colima
# Or if the context has a different name:
kubectl config get-contexts  # List available contexts
```

### 2. Install Istio

```bash
# Install Istio with demo profile
istioctl install --set profile=demo -y

# Enable Istio injection for default namespace
kubectl label namespace default istio-injection=enabled
```

**Note**: If you installed `istioctl` via Homebrew, you don't need to download it separately. The command should be available directly.

### 3. Install Istio Addons (Prometheus, Grafana, Jaeger)

```bash
# Install addons from Istio samples
./scripts/install-istio-addons.sh

# Or install manually:
# kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.28/samples/addons/prometheus.yaml
# kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.28/samples/addons/grafana.yaml
# kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.28/samples/addons/jaeger.yaml
```

### 4. Install Kiali (Optional but Recommended)

```bash
# Install Kiali operator and instance
./scripts/install-kiali.sh

# Configure Kiali to use Prometheus, Grafana, and Tracing
./scripts/update-kiali-config.sh
```

**Note**: Kiali requires Prometheus for traffic metrics. Make sure Prometheus is installed before installing Kiali.

### 5. Deploy Services

```bash
# Deploy service-1
helm install service-1 ./helm/service-1

# Deploy service-2
helm install service-2 ./helm/service-2
```

### 6. Verify Deployment

```bash
# Check pods (should show 2/2 ready - app + istio-proxy)
kubectl get pods

# Check services
kubectl get svc

# Check Istio Gateway
kubectl get gateway
kubectl get virtualservice
```

### 7. Access Services via Ingress Gateway

The services are accessible through the Istio Ingress Gateway. Get the gateway address:

```bash
# Get the Ingress Gateway URL (automatically detects Colima and uses localhost)
./scripts/get-gateway-url.sh

# Or manually set for Colima (LoadBalancer IPs may not be routable)
export INGRESS_HOST=localhost
export INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}')

echo "Gateway: http://$INGRESS_HOST:$INGRESS_PORT"
```

**Note**: In Colima, the LoadBalancer IP (e.g., 192.168.5.1) is assigned but may not be routable from your host machine. The script automatically uses `localhost` with NodePort for Colima setups, which is the recommended approach.

**Access services:**
```bash
# Service-1
curl -H "Host: service-1.local" http://$INGRESS_HOST:$INGRESS_PORT/endpoint-1
curl -H "Host: service-1.local" http://$INGRESS_HOST:$INGRESS_PORT/endpoint-2

# Service-2
curl -H "Host: service-2.local" http://$INGRESS_HOST:$INGRESS_PORT/endpoint-1
curl -H "Host: service-2.local" http://$INGRESS_HOST:$INGRESS_PORT/endpoint-2
```

**Alternative: Port Forward** (if gateway access doesn't work)
```bash
# Terminal 1:
kubectl port-forward svc/service-1 8080:8080

# Terminal 2:
kubectl port-forward svc/service-2 8081:8080
```

**Important**: `kubectl port-forward` must be running in a separate terminal or as a background process. If you get "connection refused" errors, make sure port-forward is active. See `TROUBLESHOOTING.md` for detailed help.

## Testing

### Option 1: Via Ingress Gateway (Recommended)

Get the gateway URL:
```bash
./scripts/get-gateway-url.sh
```

Or manually:
```bash
export INGRESS_HOST=localhost
export INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}')
```

**Test Public Endpoints:**
```bash
# Service-1 endpoint-1 (public)
curl -H "Host: service-1.local" http://$INGRESS_HOST:$INGRESS_PORT/endpoint-1
# Expected: {"service":"service-1","endpoint":"endpoint-1","status":"OK"}

# Service-2 endpoint-1 (public)
curl -H "Host: service-2.local" http://$INGRESS_HOST:$INGRESS_PORT/endpoint-1
# Expected: {"service":"service-2","endpoint":"endpoint-1","status":"OK"}
```

**Test Protected Endpoints:**
```bash
# Service-1 endpoint-2 (blocked by AuthorizationPolicy)
curl -H "Host: service-1.local" http://$INGRESS_HOST:$INGRESS_PORT/endpoint-2
# Expected: "RBAC: access denied" (blocked by AuthorizationPolicy DENY)

# Service-1 endpoint-3 (blocked by ext-authz/EnvoyFilter)
curl -H "Host: service-1.local" http://$INGRESS_HOST:$INGRESS_PORT/endpoint-3
# Expected: "Access denied by ext-authz" (blocked by EnvoyFilter Lua script)

# Service-2 endpoint-2 (blocked by AuthorizationPolicy)
curl -H "Host: service-2.local" http://$INGRESS_HOST:$INGRESS_PORT/endpoint-2
# Expected: "RBAC: access denied" (blocked by AuthorizationPolicy DENY)

# Service-2 endpoint-3 (blocked by ext-authz/EnvoyFilter)
curl -H "Host: service-2.local" http://$INGRESS_HOST:$INGRESS_PORT/endpoint-3
# Expected: "Access denied by ext-authz" (blocked by EnvoyFilter Lua script)
```

### Option 2: Via Port Forward

```bash
# Terminal 1:
kubectl port-forward svc/service-1 8080:8080

# Terminal 2:
kubectl port-forward svc/service-2 8081:8080
```

**Test Public Endpoints:**
```bash
curl http://localhost:8080/endpoint-1
curl http://localhost:8081/endpoint-1
```

**Test Protected Endpoints:**
```bash
# Blocked by AuthorizationPolicy
curl http://localhost:8080/endpoint-2  # Should return "RBAC: access denied"
curl http://localhost:8081/endpoint-2  # Should return "RBAC: access denied"

# Blocked by ext-authz (EnvoyFilter)
curl http://localhost:8080/endpoint-3  # Should return "Access denied by ext-authz"
curl http://localhost:8081/endpoint-3  # Should return "Access denied by ext-authz"
```

## Authorization Configuration

Each service uses **Istio AuthorizationPolicy** to control access:

- **AuthorizationPolicy**: Uses `DENY` action to block protected paths (`/endpoint-2`)
- **EnvoyFilter**: Included in the Helm chart but **not actively used** - the AuthorizationPolicy handles all blocking

### How It Works

This POC demonstrates **two different authorization mechanisms**:

#### 1. AuthorizationPolicy (blocks `/endpoint-2`)

```yaml
spec:
  action: DENY
  rules:
  - to:
    - operation:
        paths: ["/endpoint-2"]
```

- **Protected paths** (`/endpoint-2`) are explicitly denied → Returns "RBAC: access denied"
- Evaluated by Istio before the request reaches the application

#### 2. EnvoyFilter with ext-authz simulation (blocks `/endpoint-3`)

The **EnvoyFilter** uses a Lua script to simulate ext-authz behavior:

```yaml
extAuthz:
  allowedPaths: ["/endpoint-1", "/health"]
  blockedPaths: ["/endpoint-3"]
```

- **Endpoint-3** is in `publicPaths` (allowed by AuthorizationPolicy)
- But it's in `extAuthz.blockedPaths` → Blocked by EnvoyFilter Lua script → Returns "Access denied by ext-authz"
- This demonstrates how ext-authz can add additional filtering even for paths allowed by AuthorizationPolicy

### Endpoint Summary

| Endpoint | AuthorizationPolicy | EnvoyFilter (ext-authz) | Result |
|----------|---------------------|------------------------|--------|
| `/endpoint-1` | Allowed (public) | Allowed | ✅ **Accessible** |
| `/endpoint-2` | **DENY** | N/A | ❌ **Blocked** - "RBAC: access denied" |
| `/endpoint-3` | Allowed (public) | **Blocked** | ❌ **Blocked** - "Access denied by ext-authz" |
| `/health` | Allowed (public) | Allowed | ✅ **Accessible** |

### Configuration

Path configuration is defined in each service's `values.yaml`:

```yaml
istio:
  protectedPaths:  # Blocked by AuthorizationPolicy (DENY action)
    - /endpoint-2
  publicPaths:     # Allowed by AuthorizationPolicy
    - /endpoint-1
    - /endpoint-3  # Public in AuthorizationPolicy, but blocked by ext-authz
    - /health

extAuthz:
  allowedPaths:    # Allowed by ext-authz (EnvoyFilter)
    - /endpoint-1
    - /health
  blockedPaths:    # Blocked by ext-authz (EnvoyFilter)
    - /endpoint-3  # Even though public in AuthorizationPolicy
```

**Note**: 
- `/endpoint-2` is blocked by **AuthorizationPolicy** (DENY action)
- `/endpoint-3` demonstrates **ext-authz** behavior - it's public in AuthorizationPolicy but blocked by the EnvoyFilter Lua script
- In production, you would use AuthorizationPolicy with `action: CUSTOM` and configure an external authorization service

## Cleanup

```bash
# Uninstall services
helm uninstall service-1
helm uninstall service-2

# Uninstall Istio
istioctl uninstall --purge -y

# Stop Colima
colima stop
```

## Available Scripts

The `scripts/` directory contains helpful automation scripts:

- `setup.sh` - Automated setup script for Colima and Istio deployment
- `install-kiali.sh` - Install Kiali operator and instance
- `install-istio-addons.sh` - Install Istio addons (Prometheus, Grafana, Jaeger)
- `update-kiali-config.sh` - Configure Kiali to use installed addons
- `check-istio-addons.sh` - Check status of Istio addons
- `check-authz-policy.sh` - Check authorization policy status
- `get-gateway-url.sh` - Get Ingress Gateway URL and access information

## Additional Documentation

- `DEPLOYMENT.md` - Detailed deployment guide with troubleshooting steps
- `TROUBLESHOOTING.md` - Common issues and solutions
- `KIALI.md` - Kiali installation and usage guide for Istio monitoring

## Monitoring with Kiali

Kiali provides a web-based UI for monitoring your Istio service mesh. After installation (see step 4 above), access it:

```bash
# Port-forward Kiali service
kubectl port-forward -n istio-system svc/kiali 20001:20001

# Open in browser
# http://localhost:20001/kiali
```

**Features:**
- **Service Graph**: Visual representation of service mesh topology
- **Traffic Metrics**: Request rates, error rates, response times
- **Authorization Policies**: View and validate Istio authorization policies
- **Workload Details**: Pod status, logs, and Envoy configuration

**Configuration:**
- After installing addons, run `./scripts/update-kiali-config.sh` to configure Kiali to use Prometheus, Grafana, and Tracing
- Kiali uses anonymous authentication by default (no login required)

See `KIALI.md` for detailed usage instructions.

## Quick Troubleshooting

**Connection refused?** Make sure `kubectl port-forward` is running in a separate terminal. See `TROUBLESHOOTING.md` for detailed help.

**Authorization policy not working?** After updating the policy, restart the pods:
```bash
kubectl delete pod -l app=service-1
kubectl delete pod -l app=service-2
```
