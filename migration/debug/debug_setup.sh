#!/bin/bash
# ==================================================================
# DEBUG INFRASTRUCTURE SETUP SCRIPT
# Comprehensive debug environment setup for production monitoring
# ==================================================================

set -euo pipefail

# ==================================================================
# CONFIGURATION
# ==================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEBUG_LOG="/var/log/licitacoes/debug_setup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==================================================================
# UTILITY FUNCTIONS
# ==================================================================

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "INFO")  echo -e "${GREEN}[INFO]${NC} $timestamp $message" | tee -a "$DEBUG_LOG" ;;
        "WARN")  echo -e "${YELLOW}[WARN]${NC} $timestamp $message" | tee -a "$DEBUG_LOG" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $timestamp $message" | tee -a "$DEBUG_LOG" ;;
        "DEBUG") echo -e "${BLUE}[DEBUG]${NC} $timestamp $message" | tee -a "$DEBUG_LOG" ;;
    esac
}

check_requirements() {
    log "INFO" "🔍 Checking system requirements..."
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        log "ERROR" "This script must be run as root"
        exit 1
    fi
    
    # Check required commands
    local required_commands=("curl" "docker" "docker-compose" "python3" "pip3" "systemctl")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log "ERROR" "Required command not found: $cmd"
            exit 1
        fi
    done
    
    # Check disk space (at least 5GB free)
    local available_space=$(df / | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 5242880 ]]; then  # 5GB in KB
        log "ERROR" "Insufficient disk space. At least 5GB required."
        exit 1
    fi
    
    log "INFO" "✅ System requirements check passed"
}

create_directories() {
    log "INFO" "📁 Creating debug infrastructure directories..."
    
    local directories=(
        "/var/log/licitacoes"
        "/var/lib/licitacoes/debug"
        "/etc/licitacoes/debug"
        "/opt/licitacoes/debug"
        "/opt/licitacoes/monitoring"
    )
    
    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
        chown -R licitacoes:licitacoes "$dir" 2>/dev/null || true
        log "DEBUG" "Created directory: $dir"
    done
    
    log "INFO" "✅ Directories created successfully"
}

install_python_dependencies() {
    log "INFO" "🐍 Installing Python dependencies for debug tools..."
    
    # Install system packages
    apt-get update
    apt-get install -y \
        python3-pip \
        python3-venv \
        python3-dev \
        build-essential \
        libpq-dev \
        redis-tools \
        postgresql-client \
        htop \
        iotop \
        nethogs \
        jq
    
    # Create virtual environment for debug tools
    python3 -m venv /opt/licitacoes/debug/venv
    source /opt/licitacoes/debug/venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install debug dependencies
    pip install \
        fastapi \
        uvicorn \
        websockets \
        psycopg2-binary \
        redis \
        elasticsearch \
        prometheus-client \
        structlog \
        python-json-logger \
        psutil \
        aiofiles \
        aioredis \
        requests \
        click \
        rich \
        sqlalchemy \
        jinja2 \
        python-multipart \
        opentelemetry-api \
        opentelemetry-sdk \
        opentelemetry-instrumentation-fastapi \
        opentelemetry-instrumentation-sqlalchemy \
        opentelemetry-instrumentation-redis \
        opentelemetry-exporter-jaeger-thrift \
        sentry-sdk[fastapi,sqlalchemy]
    
    deactivate
    
    log "INFO" "✅ Python dependencies installed successfully"
}

setup_elasticsearch_stack() {
    log "INFO" "📊 Setting up ELK Stack (Elasticsearch, Logstash, Kibana)..."
    
    # Create ELK stack docker-compose file
    cat > /opt/licitacoes/monitoring/elk-stack.yml << 'EOF'
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.10.0
    container_name: licitacoes-elasticsearch
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
      - xpack.security.enabled=false
      - xpack.security.enrollment.enabled=false
    ports:
      - "9200:9200"
      - "9300:9300"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - elk
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3

  logstash:
    image: docker.elastic.co/logstash/logstash:8.10.0
    container_name: licitacoes-logstash
    ports:
      - "5044:5044"
      - "9600:9600"
    volumes:
      - ./logstash/config:/usr/share/logstash/config
      - ./logstash/pipeline:/usr/share/logstash/pipeline
      - /var/log/licitacoes:/var/log/licitacoes:ro
    networks:
      - elk
    depends_on:
      elasticsearch:
        condition: service_healthy
    restart: unless-stopped

  kibana:
    image: docker.elastic.co/kibana/kibana:8.10.0
    container_name: licitacoes-kibana
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
      - SERVER_NAME=licitacoes-kibana
      - SERVER_HOST=0.0.0.0
    networks:
      - elk
    depends_on:
      elasticsearch:
        condition: service_healthy
    restart: unless-stopped

volumes:
  elasticsearch_data:
    driver: local

networks:
  elk:
    driver: bridge
EOF

    # Create Logstash configuration
    mkdir -p /opt/licitacoes/monitoring/logstash/{config,pipeline}
    
    cat > /opt/licitacoes/monitoring/logstash/config/logstash.yml << 'EOF'
http.host: "0.0.0.0"
xpack.monitoring.elasticsearch.hosts: [ "http://elasticsearch:9200" ]
path.config: /usr/share/logstash/pipeline
EOF

    cat > /opt/licitacoes/monitoring/logstash/pipeline/licitacoes.conf << 'EOF'
input {
  file {
    path => "/var/log/licitacoes/*.log"
    start_position => "beginning"
    codec => json
    type => "application"
  }
  
  beats {
    port => 5044
  }
}

filter {
  if [type] == "application" {
    date {
      match => [ "@timestamp", "ISO8601" ]
    }
    
    # Parse log levels
    if [level] {
      mutate {
        uppercase => [ "level" ]
      }
    }
    
    # Extract request ID for correlation
    if [request_id] {
      mutate {
        add_tag => [ "request_correlated" ]
      }
    }
    
    # Parse error events
    if [event_type] == "error_event" {
      mutate {
        add_tag => [ "error" ]
      }
    }
    
    # Parse performance events
    if [duration_ms] {
      mutate {
        convert => { "duration_ms" => "float" }
        add_tag => [ "performance" ]
      }
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "licitacoes-logs-%{+YYYY.MM.dd}"
  }
  
  # Debug output (remove in production)
  stdout {
    codec => rubydebug
  }
}
EOF

    log "INFO" "✅ ELK Stack configuration created"
}

setup_jaeger_tracing() {
    log "INFO" "🔍 Setting up Jaeger distributed tracing..."
    
    cat > /opt/licitacoes/monitoring/jaeger.yml << 'EOF'
version: '3.8'

services:
  jaeger-all-in-one:
    image: jaegertracing/all-in-one:1.50
    container_name: licitacoes-jaeger
    environment:
      - COLLECTOR_ZIPKIN_HOST_PORT=:9411
      - COLLECTOR_OTLP_ENABLED=true
    ports:
      - "16686:16686"  # Jaeger UI
      - "14268:14268"  # HTTP collector
      - "6831:6831/udp"  # Agent
      - "6832:6832/udp"  # Agent
      - "5778:5778"   # Agent configs
      - "14250:14250"  # gRPC collector
      - "9411:9411"   # Zipkin collector
    networks:
      - monitoring
    restart: unless-stopped

networks:
  monitoring:
    driver: bridge
EOF

    log "INFO" "✅ Jaeger tracing configuration created"
}

setup_prometheus_grafana() {
    log "INFO" "📈 Setting up Prometheus and Grafana monitoring..."
    
    # Create Prometheus configuration
    mkdir -p /opt/licitacoes/monitoring/prometheus/rules
    
    cat > /opt/licitacoes/monitoring/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 30s
  evaluation_interval: 30s

rule_files:
  - "rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'licitacoes-app'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
    scrape_interval: 30s
  
  - job_name: 'postgresql'
    static_configs:
      - targets: ['localhost:9187']
    scrape_interval: 30s
  
  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']
    scrape_interval: 30s
  
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']
    scrape_interval: 30s
  
  - job_name: 'diagnostic-dashboard'
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/api/metrics'
    scrape_interval: 60s
EOF

    # Create alert rules
    cat > /opt/licitacoes/monitoring/prometheus/rules/licitacoes.yml << 'EOF'
groups:
  - name: licitacoes.rules
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"
      
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"
      
      - alert: DatabaseConnectionsHigh
        expr: pg_stat_activity_count > 80
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High database connection count"
          description: "Database has {{ $value }} active connections"
      
      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Redis memory usage high"
          description: "Redis memory usage is {{ $value }}%"
      
      - alert: SystemCPUHigh
        expr: 100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is {{ $value }}%"
      
      - alert: SystemMemoryHigh
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}%"
EOF

    # Create Grafana dashboards directory
    mkdir -p /opt/licitacoes/monitoring/grafana/{dashboards,datasources}
    
    cat > /opt/licitacoes/monitoring/grafana/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

    # Create comprehensive monitoring docker-compose
    cat > /opt/licitacoes/monitoring/monitoring-stack.yml << 'EOF'
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:v2.45.0
    container_name: licitacoes-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/rules:/etc/prometheus/rules
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
      - '--web.enable-admin-api'
    networks:
      - monitoring
    restart: unless-stopped

  grafana:
    image: grafana/grafana:10.0.0
    container_name: licitacoes-grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_INSTALL_PLUGINS=redis-datasource,postgres-datasource
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
    networks:
      - monitoring
    depends_on:
      - prometheus
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:v1.6.0
    container_name: licitacoes-node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - monitoring
    restart: unless-stopped

  redis-exporter:
    image: oliver006/redis_exporter:v1.52.0
    container_name: licitacoes-redis-exporter
    ports:
      - "9121:9121"
    environment:
      - REDIS_ADDR=redis://redis:6379
    networks:
      - monitoring
    restart: unless-stopped

  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:v0.13.2
    container_name: licitacoes-postgres-exporter
    ports:
      - "9187:9187"
    environment:
      - DATA_SOURCE_NAME=postgresql://monitoring_user:monitoring_pass@postgres:5432/licitacoes?sslmode=disable
    networks:
      - monitoring
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:

networks:
  monitoring:
    driver: bridge
EOF

    log "INFO" "✅ Prometheus and Grafana configuration created"
}

setup_systemd_services() {
    log "INFO" "⚙️ Setting up systemd services..."
    
    # Debug dashboard service
    cat > /etc/systemd/system/licitacoes-debug-dashboard.service << EOF
[Unit]
Description=Licitações Debug Dashboard
After=network.target
Requires=network.target

[Service]
Type=simple
User=licitacoes
Group=licitacoes
WorkingDirectory=/opt/licitacoes/debug
Environment=PATH=/opt/licitacoes/debug/venv/bin
ExecStart=/opt/licitacoes/debug/venv/bin/python diagnostic_dashboard.py --host 0.0.0.0 --port 8080
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Log aggregation service
    cat > /etc/systemd/system/licitacoes-log-aggregator.service << EOF
[Unit]
Description=Licitações Log Aggregator
After=network.target
Requires=network.target

[Service]
Type=simple
User=licitacoes
Group=licitacoes
WorkingDirectory=/opt/licitacoes/debug
Environment=PATH=/opt/licitacoes/debug/venv/bin
ExecStart=/opt/licitacoes/debug/venv/bin/python -c "
from advanced_logging_system import create_logging_manager
import asyncio

async def main():
    config = {
        'level': 'INFO',
        'log_dir': '/var/log/licitacoes',
        'console_logging': False,
        'file_logging': True,
        'elasticsearch_url': 'http://localhost:9200'
    }
    manager = create_logging_manager(config)
    logger = manager.get_logger('aggregator')
    logger.info('Log aggregator started')
    
    # Keep service running
    while True:
        await asyncio.sleep(60)

if __name__ == '__main__':
    asyncio.run(main())
"
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Troubleshooting monitor service
    cat > /etc/systemd/system/licitacoes-troubleshoot-monitor.service << EOF
[Unit]
Description=Licitações Troubleshooting Monitor
After=network.target
Requires=network.target

[Service]
Type=simple
User=licitacoes
Group=licitacoes
WorkingDirectory=/opt/licitacoes/debug
Environment=PATH=/opt/licitacoes/debug/venv/bin
ExecStart=/opt/licitacoes/debug/venv/bin/python -c "
from troubleshooting_toolkit import create_troubleshooting_toolkit
import asyncio

async def main():
    toolkit = create_troubleshooting_toolkit()
    toolkit.start_monitoring(interval_seconds=60)
    
    # Keep service running
    while True:
        await asyncio.sleep(60)

if __name__ == '__main__':
    asyncio.run(main())
"
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable services
    systemctl daemon-reload
    systemctl enable licitacoes-debug-dashboard
    systemctl enable licitacoes-log-aggregator
    systemctl enable licitacoes-troubleshoot-monitor
    
    log "INFO" "✅ Systemd services configured"
}

copy_debug_files() {
    log "INFO" "📋 Copying debug infrastructure files..."
    
    # Copy Python files
    cp "$SCRIPT_DIR"/*.py /opt/licitacoes/debug/
    
    # Set permissions
    chown -R licitacoes:licitacoes /opt/licitacoes/debug/
    chmod +x /opt/licitacoes/debug/*.py
    
    log "INFO" "✅ Debug files copied successfully"
}

setup_logrotate() {
    log "INFO" "🔄 Setting up log rotation..."
    
    cat > /etc/logrotate.d/licitacoes << 'EOF'
/var/log/licitacoes/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 licitacoes licitacoes
    postrotate
        systemctl reload licitacoes-* || true
    endscript
}
EOF

    log "INFO" "✅ Log rotation configured"
}

start_services() {
    log "INFO" "🚀 Starting debug infrastructure services..."
    
    # Start monitoring stack
    cd /opt/licitacoes/monitoring
    
    # Start ELK stack
    if command -v docker-compose &> /dev/null; then
        docker-compose -f elk-stack.yml up -d
        docker-compose -f jaeger.yml up -d
        docker-compose -f monitoring-stack.yml up -d
    else
        log "WARN" "docker-compose not found, skipping container services"
    fi
    
    # Start systemd services
    systemctl start licitacoes-debug-dashboard
    systemctl start licitacoes-log-aggregator
    systemctl start licitacoes-troubleshoot-monitor
    
    # Check service status
    sleep 10
    for service in licitacoes-debug-dashboard licitacoes-log-aggregator licitacoes-troubleshoot-monitor; do
        if systemctl is-active --quiet "$service"; then
            log "INFO" "✅ $service is running"
        else
            log "ERROR" "❌ $service failed to start"
        fi
    done
    
    log "INFO" "✅ Debug infrastructure services started"
}

create_monitoring_user() {
    log "INFO" "👤 Creating monitoring database user..."
    
    # This would create a monitoring user in PostgreSQL
    # For now, just log the SQL commands needed
    cat > /tmp/create_monitoring_user.sql << 'EOF'
-- Create monitoring user for PostgreSQL exporter
CREATE USER monitoring_user WITH PASSWORD 'monitoring_pass';
GRANT CONNECT ON DATABASE licitacoes TO monitoring_user;
GRANT USAGE ON SCHEMA public TO monitoring_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring_user;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO monitoring_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO monitoring_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO monitoring_user;

-- Grant access to pg_stat views
GRANT SELECT ON pg_stat_database TO monitoring_user;
GRANT SELECT ON pg_stat_user_tables TO monitoring_user;
GRANT SELECT ON pg_stat_user_indexes TO monitoring_user;
GRANT SELECT ON pg_statio_user_tables TO monitoring_user;
GRANT SELECT ON pg_stat_activity TO monitoring_user;
EOF

    log "INFO" "📝 Monitoring user SQL script created at /tmp/create_monitoring_user.sql"
    log "INFO" "Please run this script on your PostgreSQL database"
}

display_summary() {
    log "INFO" "📊 Debug Infrastructure Setup Summary"
    echo
    echo -e "${GREEN}=== SETUP COMPLETE ===${NC}"
    echo
    echo "🔍 Debug Infrastructure Services:"
    echo "  • Diagnostic Dashboard: http://localhost:8080"
    echo "  • Kibana (Logs): http://localhost:5601"
    echo "  • Grafana (Metrics): http://localhost:3000 (admin/admin123)"
    echo "  • Prometheus: http://localhost:9090"
    echo "  • Jaeger Tracing: http://localhost:16686"
    echo
    echo "📁 Important Directories:"
    echo "  • Logs: /var/log/licitacoes/"
    echo "  • Debug Tools: /opt/licitacoes/debug/"
    echo "  • Monitoring Config: /opt/licitacoes/monitoring/"
    echo
    echo "⚙️ Systemd Services:"
    echo "  • licitacoes-debug-dashboard"
    echo "  • licitacoes-log-aggregator"
    echo "  • licitacoes-troubleshoot-monitor"
    echo
    echo "🔧 Next Steps:"
    echo "  1. Configure your application to use structured logging"
    echo "  2. Set up Sentry DSN in your application"
    echo "  3. Run the monitoring database user script"
    echo "  4. Configure alert notification webhooks"
    echo "  5. Import Grafana dashboards for your specific metrics"
    echo
    echo -e "${BLUE}Debug infrastructure is now ready for production monitoring!${NC}"
}

# ==================================================================
# MAIN EXECUTION
# ==================================================================

main() {
    log "INFO" "🚀 Starting debug infrastructure setup..."
    
    # Ensure log directory exists
    mkdir -p "$(dirname "$DEBUG_LOG")"
    
    # Run setup steps
    check_requirements
    create_directories
    install_python_dependencies
    setup_elasticsearch_stack
    setup_jaeger_tracing
    setup_prometheus_grafana
    copy_debug_files
    setup_systemd_services
    setup_logrotate
    create_monitoring_user
    start_services
    display_summary
    
    log "INFO" "✅ Debug infrastructure setup completed successfully!"
}

# Run main function
main "$@"