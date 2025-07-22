# Estratégia de Otimização de Performance - SQLite para Neon PostgreSQL

## Visão Geral

Esta estratégia abrangente de otimização de performance é projetada para maximizar o desempenho do sistema após a migração de SQLite para Neon PostgreSQL, aproveitando as capacidades avançadas do PostgreSQL e otimizações específicas para a nuvem.

## 🎯 Objetivos de Performance

### Metas Específicas
- **Tempo de resposta**: < 100ms para 95% das consultas
- **Throughput**: > 1000 requests/segundo
- **Conexões simultâneas**: 500+ conexões ativas
- **Full-text search**: < 50ms para buscas complexas
- **Consultas analíticas**: < 2 segundos para aggregations
- **Uso de memória**: < 80% da RAM disponível
- **CPU**: < 70% utilização média

## 📊 Análise de Performance Atual

### Pontos de Otimização Identificados

1. **Query Performance**
   - Otimização de índices específicos
   - Query plan analysis e tuning
   - Materialização de views complexas

2. **Connection Management**
   - Pool de conexões otimizado
   - Connection multiplexing
   - Prepared statements caching

3. **Database Configuration**
   - Parâmetros PostgreSQL otimizados
   - Memory allocation tuning
   - Vacuum e maintenance automation

4. **Application Level**
   - Eager loading strategies
   - Caching layers implementation
   - Async operations optimization

## 🏗️ Estratégias de Otimização

### 1. Otimização de Índices

#### Índices Específicos de Performance
```sql
-- Índices compostos para consultas frequentes
CREATE INDEX CONCURRENTLY idx_opportunities_perf_search 
ON opportunities (status, estimated_value, publish_date) 
WHERE status IN ('PUBLISHED', 'OPEN', 'BIDDING');

-- Índices parciais para dados ativos
CREATE INDEX CONCURRENTLY idx_users_active_premium 
ON users (created_at, subscription_tier) 
WHERE is_active = true AND subscription_tier != 'FREE';

-- Índices para ordenação frequente
CREATE INDEX CONCURRENTLY idx_opportunities_value_desc 
ON opportunities (estimated_value DESC, created_at DESC);
```

#### Índices GIN para Arrays e JSONB
```sql
-- Full-text search otimizado
CREATE INDEX CONCURRENTLY idx_opportunities_fts_portuguese 
ON opportunities USING gin(to_tsvector('portuguese', title || ' ' || COALESCE(description, '')));

-- JSONB queries otimizadas
CREATE INDEX CONCURRENTLY idx_opportunities_ai_analysis_gin 
ON opportunities USING gin((ai_analysis -> 'complexity'), (ai_analysis -> 'success_probability'));
```

### 2. Query Optimization

#### Materialized Views
```sql
-- View materializada para dashboard analytics
CREATE MATERIALIZED VIEW mv_opportunity_dashboard AS
SELECT 
    DATE_TRUNC('month', publish_date) as month,
    modality,
    state,
    COUNT(*) as opportunity_count,
    SUM(estimated_value) as total_value,
    AVG(estimated_value) as avg_value,
    COUNT(DISTINCT organ) as unique_organs
FROM opportunities 
WHERE publish_date >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY DATE_TRUNC('month', publish_date), modality, state;

CREATE UNIQUE INDEX ON mv_opportunity_dashboard (month, modality, state);
```

#### Query Rewriting Rules
```sql
-- Rule para otimizar consultas de propostas recentes
CREATE OR REPLACE VIEW recent_proposals AS
SELECT p.*, o.title as opportunity_title, c.legal_name as company_name
FROM proposals p
JOIN opportunities o ON p.opportunity_id = o.id
JOIN companies c ON p.company_id = c.id
WHERE p.created_at > CURRENT_DATE - INTERVAL '30 days';
```

### 3. Database Configuration Tuning

#### PostgreSQL Configuration Otimizada
```ini
# postgresql.conf otimizado para Neon
max_connections = 500
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 64MB
default_statistics_target = 250
random_page_cost = 1.1
effective_io_concurrency = 300
work_mem = 32MB
max_worker_processes = 16
max_parallel_workers_per_gather = 8
max_parallel_workers = 16
max_parallel_maintenance_workers = 8
```

#### Auto-vacuum Tuning
```sql
-- Configuração de auto-vacuum para tabelas críticas
ALTER TABLE opportunities SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05,
    autovacuum_vacuum_cost_delay = 10
);

ALTER TABLE proposals SET (
    autovacuum_vacuum_scale_factor = 0.2,
    autovacuum_analyze_scale_factor = 0.1
);
```

### 4. Connection Pool Optimization

#### Configuração Avançada de Pool
```python
# Configuração otimizada do pool de conexões
NEON_POOL_CONFIG = {
    "pool_size": 25,
    "max_overflow": 75,
    "pool_timeout": 30,
    "pool_recycle": 3600,
    "pool_pre_ping": True,
    "pool_reset_on_return": "commit",
    "echo_pool": False
}

# Connection multiplexing configuration
PGBOUNCER_CONFIG = {
    "pool_mode": "transaction",
    "max_client_conn": 1000,
    "default_pool_size": 25,
    "max_db_connections": 100,
    "server_reset_query": "DISCARD ALL"
}
```

## 🔄 Caching Strategy

### 1. Application-Level Caching

#### Redis Cache Implementation
```python
import redis
from functools import wraps
import json
import hashlib

class CacheManager:
    def __init__(self, redis_url: str):
        self.redis = redis.from_url(redis_url, decode_responses=True)
    
    def cache_key(self, func_name: str, args, kwargs):
        """Generate cache key from function name and parameters"""
        key_data = {
            'func': func_name,
            'args': args,
            'kwargs': sorted(kwargs.items())
        }
        key_str = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def cached_query(self, ttl: int = 300):
        """Decorator for caching database queries"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                cache_key = self.cache_key(func.__name__, args, kwargs)
                
                # Try to get from cache first
                cached_result = self.redis.get(cache_key)
                if cached_result:
                    return json.loads(cached_result)
                
                # Execute function and cache result
                result = func(*args, **kwargs)
                self.redis.setex(
                    cache_key, 
                    ttl, 
                    json.dumps(result, default=str)
                )
                return result
            return wrapper
        return decorator

# Usage example
cache_manager = CacheManager("redis://localhost:6379")

@cache_manager.cached_query(ttl=600)  # Cache for 10 minutes
def get_opportunity_statistics():
    # Expensive aggregation query
    pass
```

### 2. Query Result Caching

#### Smart Caching Strategy
```python
class SmartCache:
    def __init__(self):
        self.cache_layers = {
            'hot': 60,    # 1 minute for frequently accessed data
            'warm': 300,  # 5 minutes for moderate access
            'cold': 3600  # 1 hour for rarely accessed data
        }
    
    def get_cache_ttl(self, query_type: str, params: dict) -> int:
        """Determine appropriate cache TTL based on query characteristics"""
        if query_type == 'dashboard':
            return self.cache_layers['hot']
        elif query_type == 'search':
            return self.cache_layers['warm']
        else:
            return self.cache_layers['cold']
```

## 📈 Monitoring e Performance Tracking

### 1. Métricas de Performance

#### Key Performance Indicators (KPIs)
```python
from dataclasses import dataclass
from datetime import datetime

@dataclass
class PerformanceMetrics:
    timestamp: datetime
    avg_response_time: float
    p95_response_time: float
    p99_response_time: float
    queries_per_second: float
    active_connections: int
    cache_hit_ratio: float
    cpu_usage: float
    memory_usage: float
    disk_io: float
    
class PerformanceMonitor:
    def collect_metrics(self) -> PerformanceMetrics:
        """Collect comprehensive performance metrics"""
        # Implementation for collecting metrics
        pass
    
    def alert_on_thresholds(self, metrics: PerformanceMetrics):
        """Alert when performance thresholds are exceeded"""
        alerts = []
        
        if metrics.avg_response_time > 100:
            alerts.append("Average response time exceeded 100ms")
        
        if metrics.cache_hit_ratio < 0.8:
            alerts.append("Cache hit ratio below 80%")
        
        if metrics.active_connections > 400:
            alerts.append("High connection count detected")
        
        return alerts
```

### 2. Automated Performance Optimization

#### Dynamic Query Plan Analysis
```sql
-- Function para análise automática de query plans
CREATE OR REPLACE FUNCTION analyze_slow_queries(
    min_duration_ms INTEGER DEFAULT 1000
)
RETURNS TABLE(
    query TEXT,
    avg_time_ms NUMERIC,
    calls INTEGER,
    optimization_suggestion TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pss.query,
        pss.mean_exec_time,
        pss.calls::INTEGER,
        CASE 
            WHEN pss.mean_exec_time > 2000 THEN 'Consider adding indexes'
            WHEN pss.calls > 1000 AND pss.mean_exec_time > 500 THEN 'High-frequency slow query - prioritize optimization'
            ELSE 'Monitor performance'
        END as optimization_suggestion
    FROM pg_stat_statements pss
    WHERE pss.mean_exec_time > min_duration_ms
    ORDER BY pss.mean_exec_time DESC;
END;
$$ LANGUAGE plpgsql;
```

## 🎛️ Advanced Performance Features

### 1. Connection Multiplexing com PgBouncer

#### PgBouncer Configuration
```ini
[databases]
licitacoes_prod = host=neon-host port=5432 dbname=licitacoes
licitacoes_readonly = host=neon-readonly-host port=5432 dbname=licitacoes

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
max_db_connections = 100
server_reset_query = DISCARD ALL
server_check_delay = 30
server_check_query = SELECT 1
auth_type = scram-sha-256
```

### 2. Read Replicas e Load Balancing

#### Database Routing Strategy
```python
class DatabaseRouter:
    def __init__(self, write_db_url: str, read_db_urls: list):
        self.write_db = create_engine(write_db_url)
        self.read_dbs = [create_engine(url) for url in read_db_urls]
        self.current_read_index = 0
    
    def get_write_connection(self):
        """Get connection for write operations"""
        return self.write_db.connect()
    
    def get_read_connection(self):
        """Get connection for read operations with load balancing"""
        db = self.read_dbs[self.current_read_index]
        self.current_read_index = (self.current_read_index + 1) % len(self.read_dbs)
        return db.connect()
    
    def execute_read_query(self, query: str, params: dict = None):
        """Execute read query on read replica"""
        with self.get_read_connection() as conn:
            return conn.execute(query, params or {})
    
    def execute_write_query(self, query: str, params: dict = None):
        """Execute write query on primary database"""
        with self.get_write_connection() as conn:
            return conn.execute(query, params or {})
```

### 3. Async Operations Optimization

#### Asyncio Performance Patterns
```python
import asyncio
import aioredis
from sqlalchemy.ext.asyncio import create_async_engine

class AsyncPerformanceOptimizer:
    def __init__(self):
        self.async_db = create_async_engine("postgresql+asyncpg://...")
        self.redis = None
    
    async def batch_operations(self, operations: list):
        """Execute multiple operations concurrently"""
        semaphore = asyncio.Semaphore(10)  # Limit concurrency
        
        async def limited_operation(op):
            async with semaphore:
                return await op
        
        tasks = [limited_operation(op) for op in operations]
        return await asyncio.gather(*tasks, return_exceptions=True)
    
    async def prefetch_related_data(self, opportunity_ids: list):
        """Prefetch related data to avoid N+1 queries"""
        async with self.async_db.begin() as conn:
            # Fetch opportunities
            opportunities = await conn.execute(
                select(Opportunity).where(Opportunity.id.in_(opportunity_ids))
            )
            
            # Fetch related proposals in parallel
            proposals = await conn.execute(
                select(Proposal).where(Proposal.opportunity_id.in_(opportunity_ids))
            )
            
            return opportunities, proposals
```

## 🔧 Performance Testing e Validation

### 1. Load Testing Framework

#### Comprehensive Load Tests
```python
import asyncio
import aiohttp
import time
from concurrent.futures import ThreadPoolExecutor

class LoadTester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.results = []
    
    async def single_request(self, session, endpoint: str):
        """Execute single HTTP request"""
        start_time = time.time()
        try:
            async with session.get(f"{self.base_url}{endpoint}") as response:
                await response.text()
                return {
                    'endpoint': endpoint,
                    'status': response.status,
                    'response_time': time.time() - start_time,
                    'success': response.status == 200
                }
        except Exception as e:
            return {
                'endpoint': endpoint,
                'status': 0,
                'response_time': time.time() - start_time,
                'success': False,
                'error': str(e)
            }
    
    async def load_test(self, endpoint: str, concurrent_requests: int, duration_seconds: int):
        """Execute load test for specified duration"""
        async with aiohttp.ClientSession() as session:
            start_time = time.time()
            tasks = []
            
            while time.time() - start_time < duration_seconds:
                # Create batch of concurrent requests
                batch_tasks = [
                    self.single_request(session, endpoint) 
                    for _ in range(concurrent_requests)
                ]
                
                batch_results = await asyncio.gather(*batch_tasks)
                self.results.extend(batch_results)
                
                # Small delay between batches
                await asyncio.sleep(0.1)
    
    def analyze_results(self):
        """Analyze load test results"""
        if not self.results:
            return {}
        
        success_count = sum(1 for r in self.results if r['success'])
        total_requests = len(self.results)
        response_times = [r['response_time'] for r in self.results if r['success']]
        
        return {
            'total_requests': total_requests,
            'successful_requests': success_count,
            'success_rate': success_count / total_requests * 100,
            'avg_response_time': sum(response_times) / len(response_times) if response_times else 0,
            'min_response_time': min(response_times) if response_times else 0,
            'max_response_time': max(response_times) if response_times else 0,
            'p95_response_time': sorted(response_times)[int(len(response_times) * 0.95)] if response_times else 0
        }
```

### 2. Database Performance Benchmarks

#### Query Performance Testing
```python
class DatabaseBenchmark:
    def __init__(self, db_manager):
        self.db_manager = db_manager
        self.benchmark_results = {}
    
    def benchmark_query(self, query_name: str, query: str, params: dict = None, iterations: int = 100):
        """Benchmark specific query performance"""
        execution_times = []
        
        with self.db_manager.get_session() as session:
            for _ in range(iterations):
                start_time = time.time()
                result = session.execute(text(query), params or {})
                result.fetchall()  # Ensure results are fetched
                execution_times.append(time.time() - start_time)
        
        self.benchmark_results[query_name] = {
            'avg_time': sum(execution_times) / len(execution_times),
            'min_time': min(execution_times),
            'max_time': max(execution_times),
            'p95_time': sorted(execution_times)[int(len(execution_times) * 0.95)],
            'iterations': iterations
        }
    
    def run_comprehensive_benchmarks(self):
        """Run comprehensive database benchmarks"""
        benchmarks = {
            'simple_select': "SELECT COUNT(*) FROM users",
            'indexed_lookup': "SELECT * FROM opportunities WHERE id = %(id)s",
            'complex_join': """
                SELECT u.email, c.legal_name, COUNT(p.id) as proposal_count
                FROM users u
                JOIN companies c ON u.id = c.user_id
                LEFT JOIN proposals p ON c.id = p.company_id
                GROUP BY u.id, u.email, c.legal_name
                LIMIT 100
            """,
            'full_text_search': """
                SELECT * FROM opportunities 
                WHERE to_tsvector('portuguese', title || ' ' || COALESCE(description, ''))
                @@ to_tsquery('portuguese', %(search_term)s)
                LIMIT 20
            """
        }
        
        for name, query in benchmarks.items():
            params = {}
            if 'id' in query:
                params['id'] = 'some-uuid-here'
            if 'search_term' in query:
                params['search_term'] = 'software & desenvolvimento'
            
            self.benchmark_query(name, query, params)
        
        return self.benchmark_results
```

## 📋 Implementation Checklist

### Fase 1: Database Optimization (Semana 1)
- [ ] Implementar índices de performance específicos
- [ ] Configurar materialized views para analytics
- [ ] Otimizar configurações PostgreSQL
- [ ] Implementar auto-vacuum tuning
- [ ] Configurar query plan monitoring

### Fase 2: Application Optimization (Semana 2)
- [ ] Implementar sistema de cache Redis
- [ ] Otimizar connection pooling
- [ ] Implementar read replica routing
- [ ] Configurar PgBouncer connection multiplexing
- [ ] Otimizar operações assíncronas

### Fase 3: Monitoring e Testing (Semana 3)
- [ ] Implementar performance monitoring
- [ ] Configurar alertas de performance
- [ ] Executar load testing comprehensive
- [ ] Benchmarking de queries críticas
- [ ] Validação de métricas de performance

### Fase 4: Fine-tuning (Semana 4)
- [ ] Análise de resultados de performance
- [ ] Ajustes finos baseados em métricas
- [ ] Otimizações específicas identificadas
- [ ] Documentação de otimizações
- [ ] Treinamento da equipe

## 📊 Expected Performance Improvements

### Comparação SQLite vs PostgreSQL Otimizado

| Métrica | SQLite | PostgreSQL Base | PostgreSQL Otimizado | Melhoria |
|---------|---------|-----------------|---------------------|----------|
| Query simples | 5ms | 3ms | 1ms | 5x |
| Full-text search | 200ms | 50ms | 15ms | 13x |
| Complex joins | 500ms | 100ms | 25ms | 20x |
| Concurrent users | 10 | 100 | 500+ | 50x+ |
| Cache hit ratio | N/A | 60% | 90%+ | - |
| Throughput (req/s) | 50 | 500 | 1000+ | 20x+ |

### ROI da Otimização
- **Redução de custos**: 40% menos recursos necessários
- **Melhor experiência do usuário**: 80% redução no tempo de resposta
- **Escalabilidade**: Suporte a 50x mais usuários simultâneos
- **Disponibilidade**: 99.9% uptime com failover automático

Esta estratégia de otimização garante que o sistema migrado não apenas funcione, mas opere com performance excepcional, aproveitando todo o potencial do Neon PostgreSQL.