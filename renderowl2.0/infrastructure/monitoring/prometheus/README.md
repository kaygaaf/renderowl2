# Prometheus Monitoring for Renderowl 2.0

Complete Prometheus monitoring stack for the Renderowl 2.0 video rendering platform.

## 📁 Directory Structure

```
.
├── prometheus.yml           # Standalone Prometheus configuration
├── docker-compose.yml       # Local development stack
├── k8s-deployment.yaml      # Kubernetes deployment manifests
├── servicemonitors.yaml     # Prometheus Operator resources
└── README.md               # This file
```

## 🎯 Monitored Components

| Component | Endpoint | Port | Description |
|-----------|----------|------|-------------|
| Go Backend | `/metrics` | 8080 | Gin application metrics |
| Next.js Frontend | `/api/metrics` | 3000 | Frontend metrics (if exposed) |
| Node Exporter | `/metrics` | 9100 | System-level metrics |
| PostgreSQL Exporter | `/metrics` | 9187 | Database metrics |
| Redis Exporter | `/metrics` | 9121 | Cache metrics |

## 🚀 Quick Start

### Local Development (Docker Compose)

1. **Start the monitoring stack:**
   ```bash
   docker-compose up -d
   ```

2. **Access Prometheus UI:**
   - URL: http://localhost:9090
   - Targets: Status → Targets

3. **Access Grafana (optional):**
   - URL: http://localhost:3001
   - Default credentials: admin/admin

4. **Stop the stack:**
   ```bash
   docker-compose down
   ```

### Kubernetes Deployment

#### Option 1: Standard Kubernetes

1. **Create namespace and deploy:**
   ```bash
   kubectl apply -f k8s-deployment.yaml
   ```

2. **Verify deployment:**
   ```bash
   kubectl get pods -n monitoring
   kubectl logs -n monitoring -l app=prometheus
   ```

3. **Port forward for local access:**
   ```bash
   kubectl port-forward svc/prometheus 9090:9090 -n monitoring
   ```

4. **Access Prometheus:**
   - URL: http://localhost:9090

#### Option 2: Prometheus Operator

If your cluster uses Prometheus Operator:

1. **Deploy ServiceMonitors and rules:**
   ```bash
   kubectl apply -f servicemonitors.yaml
   ```

2. **Ensure your Prometheus resource selects these ServiceMonitors:**
   ```yaml
   serviceMonitorSelector:
     matchLabels:
       prometheus: renderowl
   ```

## ⚙️ Configuration

### Backend Application Metrics

The Go backend must expose metrics at `/metrics`. Using the Prometheus Go client:

```go
import (
    "github.com/gin-gonic/gin"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
    r := gin.Default()
    
    // Expose Prometheus metrics
    r.GET("/metrics", gin.WrapH(promhttp.Handler()))
    
    // Your application routes
    r.Run(":8080")
}
```

### Required Exporters

#### Node Exporter
```bash
# Kubernetes
kubectl apply -f https://github.com/prometheus/node_exporter/raw/master/deploy/kubernetes/node-exporter.yaml

# Docker Compose
# Included in docker-compose.yml
```

#### PostgreSQL Exporter
```bash
# Requires DATA_SOURCE_NAME env var
DATA_SOURCE_NAME="postgresql://user:password@postgres:5432/renderowl?sslmode=disable"
```

#### Redis Exporter
```bash
# Requires REDIS_ADDR env var
REDIS_ADDR="redis:6379"
# Optional: REDIS_PASSWORD for authenticated Redis
```

## 🔐 Security Considerations

### Network Policies

The Kubernetes deployment includes a NetworkPolicy that:
- Restricts ingress to Grafana, Alertmanager, and staging namespace
- Allows egress only to known ports (8080, 3000, 9100, 9187, 9121, 6443)

### Basic Authentication

To enable basic auth on Prometheus:

1. **Create password hash:**
   ```bash
   htpasswd -nBC 10 "" | tr -d ':\n'
   ```

2. **Create web config file:**
   ```yaml
   # web.yml
   basic_auth_users:
     admin: '$2y$10$...'
   ```

3. **Update deployment to mount secret and add arg:**
   ```yaml
   args:
     - '--web.config.file=/etc/prometheus/web.yml'
   ```

### TLS

For production, consider:
- Terminating TLS at ingress controller
- Using cert-manager for automatic certificate management
- Enabling mTLS between services with Istio/Linkerd

## 📊 Key Metrics

### Application Metrics (Go Backend)

| Metric | Type | Description |
|--------|------|-------------|
| `renderowl_http_requests_total` | Counter | Total HTTP requests |
| `renderowl_http_request_duration_seconds` | Histogram | Request duration |
| `renderowl_video_renders_total` | Counter | Total video renders |
| `renderowl_render_duration_seconds` | Histogram | Video render duration |
| `gin_gin_requests_total` | Counter | Gin framework requests |
| `gin_gin_request_duration_seconds` | Histogram | Gin request duration |
| `go_goroutines` | Gauge | Number of goroutines |
| `go_memstats_heap_inuse_bytes` | Gauge | Heap memory usage |

### Infrastructure Metrics

| Metric | Source | Description |
|--------|--------|-------------|
| `node_cpu_seconds_total` | Node Exporter | CPU usage |
| `node_memory_MemAvailable_bytes` | Node Exporter | Available memory |
| `node_filesystem_avail_bytes` | Node Exporter | Available disk space |
| `pg_up` | PostgreSQL Exporter | Database availability |
| `pg_stat_activity_count` | PostgreSQL Exporter | Active connections |
| `redis_up` | Redis Exporter | Redis availability |
| `redis_memory_used_bytes` | Redis Exporter | Redis memory usage |

## 🚨 Alerting Rules

Included alerts (in `servicemonitors.yaml`):

- **RenderowlBackendDown** - Backend unreachable (critical)
- **RenderowlBackendHighErrorRate** - Error rate > 10% (warning)
- **RenderowlBackendSlowRequests** - 95th percentile latency > 500ms (warning)
- **HighCPUUsage** - CPU > 80% (warning)
- **HighMemoryUsage** - Memory > 85% (warning)
- **DiskSpaceLow** - Disk > 80% (warning)
- **PostgreSQLDown** - Database unreachable (critical)
- **RedisDown** - Cache unreachable (critical)

## 🔧 Resource Limits

### Kubernetes

| Component | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-----------|-------------|-----------|----------------|--------------|
| Prometheus | 250m | 1000m | 512Mi | 2Gi |
| Node Exporter | 100m | 250m | 64Mi | 256Mi |
| PostgreSQL Exporter | 100m | 250m | 64Mi | 128Mi |
| Redis Exporter | 100m | 250m | 64Mi | 128Mi |

### Docker Compose

Similar limits are configured in `docker-compose.yml` using the `deploy.resources` directive.

## 📝 Maintenance

### Data Retention

Prometheus is configured with:
- Time-based retention: 15 days
- Size-based retention: 10GB (Kubernetes) / 5GB (Docker)

### Reload Configuration

To reload Prometheus configuration without restart:

```bash
# Kubernetes
kubectl exec -n monitoring deploy/prometheus -- kill -HUP 1

# Docker Compose
curl -X POST http://localhost:9090/-/reload
```

## 🐛 Troubleshooting

### Prometheus not scraping targets

1. Check target status: http://localhost:9090/targets
2. Verify network connectivity to exporters
3. Check Prometheus logs: `kubectl logs -n monitoring -l app=prometheus`

### Exporter not reachable

1. Verify exporter is running
2. Check service endpoints: `kubectl get endpoints -n monitoring`
3. Test metrics endpoint: `curl http://<exporter>:<port>/metrics`

### No data in Grafana

1. Verify Prometheus data source is configured
2. Check metric names match queries
3. Ensure time range includes recent data

## 📚 References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Prometheus Operator](https://prometheus-operator.dev/)
- [Go Client Library](https://github.com/prometheus/client_golang)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)

---

**Environment:** Staging  
**Last Updated:** 2026-02-27  
**Version:** 1.0.0
