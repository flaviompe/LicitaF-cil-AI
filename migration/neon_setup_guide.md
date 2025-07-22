# Neon Database Setup Guide

## Overview

This guide walks you through setting up Neon Database for the Licitações Platform migration from SQLite to PostgreSQL.

## Prerequisites

- Active Neon account (sign up at [neon.tech](https://neon.tech))
- Command line access
- Basic understanding of database concepts

## Quick Setup

### Option 1: Automated Setup (Recommended)

Run the automated setup script:

```bash
chmod +x migration/neon_setup.sh
./migration/neon_setup.sh
```

This script will:
- Install Neon CLI if needed
- Authenticate with your Neon account
- Create a new project
- Set up development, staging, and production databases
- Generate connection strings
- Create sample configuration files

### Option 2: Manual Setup

If you prefer manual setup or need custom configuration:

#### Step 1: Install Neon CLI

**Linux/WSL:**
```bash
curl -fsSL https://neon.tech/install.sh | bash
export PATH="$PATH:$HOME/.neon/bin"
```

**macOS:**
```bash
brew install neon
```

**Windows:**
Download from [GitHub releases](https://github.com/neondatabase/neon/releases)

#### Step 2: Authenticate

```bash
neon auth
```

Visit [console.neon.tech/app/settings/api-keys](https://console.neon.tech/app/settings/api-keys) to create an API key.

#### Step 3: Create Project

```bash
neon projects create \
  --name "licitacoes-platform" \
  --region "us-east-2"
```

Save the project ID returned by this command.

#### Step 4: Create Databases

```bash
# Replace YOUR_PROJECT_ID with actual project ID
neon databases create --project-id YOUR_PROJECT_ID --name licitacoes_dev
neon databases create --project-id YOUR_PROJECT_ID --name licitacoes_staging  
neon databases create --project-id YOUR_PROJECT_ID --name licitacoes_prod
```

#### Step 5: Get Connection Strings

```bash
# Development
neon connection-string \
  --project-id YOUR_PROJECT_ID \
  --database-name licitacoes_dev

# Staging  
neon connection-string \
  --project-id YOUR_PROJECT_ID \
  --database-name licitacoes_staging

# Production
neon connection-string \
  --project-id YOUR_PROJECT_ID \
  --database-name licitacoes_prod
```

## Configuration

### Environment Files

Copy the example environment file:

```bash
cp .env.neon.example .env
```

Update the following variables with your actual Neon credentials:

```env
# Replace with your actual connection strings
DATABASE_URL="postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"
DIRECT_URL="postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"

# Update project information
NEON_PROJECT_ID="your-project-id"
NEON_API_KEY="your-api-key"
```

### Database Configuration

The migration includes optimized database configurations:

#### Connection Pooling
- **Pool Size**: 20 connections
- **Max Overflow**: 30 additional connections
- **Pool Timeout**: 30 seconds
- **Pool Recycle**: 300 seconds (5 minutes)

#### Performance Settings
- **SSL Mode**: Required for security
- **Connection Pre-ping**: Enabled for reliability
- **Query Logging**: Configurable for debugging

#### Monitoring
- **Slow Query Threshold**: 1000ms
- **Performance Monitoring**: Enabled
- **Health Checks**: Automated

## Testing Connection

### Python Test

Run the connection test script:

```bash
python migration/scripts/test_connection.py
```

### Manual Test

Using psql:
```bash
psql "postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"
```

Using Python:
```python
import asyncpg
import asyncio

async def test_connection():
    conn = await asyncpg.connect("your-connection-string")
    result = await conn.fetchval("SELECT NOW()")
    print(f"Connection successful! Time: {result}")
    await conn.close()

asyncio.run(test_connection())
```

Using Node.js:
```javascript
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const result = await sql`SELECT NOW() as current_time`;
console.log('Connection successful!', result[0]);
```

## Database Features

### Enabled Extensions

The setup automatically enables:

- **uuid-ossp**: UUID generation
- **unaccent**: Text search without accents
- **pg_trgm**: Trigram matching for fuzzy search

### Custom Functions

Several utility functions are created:

- `validate_cnpj(text)`: Brazilian CNPJ validation
- `validate_email(text)`: Email format validation
- `update_updated_at_column()`: Automatic timestamp updates

### Search Configuration

Portuguese text search with unaccent support:
```sql
CREATE TEXT SEARCH CONFIGURATION portuguese_unaccent (COPY = portuguese);
```

## Security Best Practices

### Connection Security

- ✅ SSL/TLS encryption enforced
- ✅ Connection pooling configured
- ✅ Timeout settings optimized
- ✅ IP allowlisting (configure in Neon console)

### Access Control

- ✅ Role-based database access
- ✅ Separate credentials per environment
- ✅ API key rotation recommended monthly

### Data Protection

- ✅ Encryption at rest (automatic)
- ✅ Encryption in transit (SSL)
- ✅ Automated backups enabled
- ✅ Point-in-time recovery available

## Environment-Specific Setup

### Development Environment

```env
NODE_ENV=development
DATABASE_URL="connection-string-for-dev-db"
ENABLE_QUERY_LOGGING=true
DEBUG_MODE=true
```

### Staging Environment

```env
NODE_ENV=staging
DATABASE_URL="connection-string-for-staging-db"
ENABLE_QUERY_LOGGING=false
DEBUG_MODE=false
```

### Production Environment

```env
NODE_ENV=production
DATABASE_URL="connection-string-for-prod-db"
ENABLE_QUERY_LOGGING=false
DEBUG_MODE=false
SSL_MODE=require
```

## Monitoring Setup

### Neon Console Monitoring

Access monitoring at: [console.neon.tech](https://console.neon.tech)

Key metrics to monitor:
- Connection count
- Query performance
- Storage usage
- CPU and memory utilization

### Application-Level Monitoring

Configure these monitoring endpoints:

```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await sql`SELECT 1`;
    res.json({ status: 'healthy', timestamp: new Date() });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  const metrics = await sql`
    SELECT schemaname, tablename, n_live_tup 
    FROM pg_stat_user_tables 
    ORDER BY n_live_tup DESC
  `;
  res.json({ tables: metrics, timestamp: new Date() });
});
```

### Alerting

Set up alerts for:
- Connection failures
- Slow queries (>1000ms)
- High connection count (>80% of pool)
- Storage usage (>80%)

## Backup Strategy

### Automatic Backups

Neon provides automatic backups with:
- Point-in-time recovery (up to 30 days)
- Daily automated snapshots
- Cross-region backup replication

### Manual Backups

Create manual backups:
```bash
# Using pg_dump
pg_dump "connection-string" > backup_$(date +%Y%m%d).sql

# Using Neon CLI
neon branches create --project-id YOUR_PROJECT_ID --name backup-$(date +%Y%m%d)
```

## Scaling Configuration

### Auto-scaling Settings

Configure compute auto-scaling:

```bash
# Set auto-scaling limits
neon set-context --compute-size 0.25 --min-cu 0.25 --max-cu 4
```

### Connection Scaling

For high-traffic applications:

```python
# Increase connection pool for production
engine = create_engine(
    DATABASE_URL,
    pool_size=50,
    max_overflow=100,
    pool_timeout=30,
    pool_recycle=300
)
```

## Troubleshooting

### Common Issues

**Connection Timeout:**
```
Error: connection timeout
```
Solution: Check firewall settings and increase timeout values.

**SSL Certificate Error:**
```
Error: certificate verify failed
```
Solution: Ensure SSL mode is set to `require` and certificates are valid.

**Pool Exhaustion:**
```
Error: QueuePool limit exceeded
```
Solution: Increase pool size or check for connection leaks.

### Debug Mode

Enable debug mode for troubleshooting:

```python
# Enable SQL echo for debugging
engine = create_engine(DATABASE_URL, echo=True)

# Enable connection pool logging
logging.getLogger('sqlalchemy.pool').setLevel(logging.DEBUG)
```

### Connection Diagnostics

Use the diagnostic script:
```bash
python migration/scripts/test_connection.py --verbose
```

## Performance Optimization

### Query Optimization

- Use prepared statements
- Implement proper indexing
- Monitor slow query log
- Use EXPLAIN ANALYZE for query planning

### Connection Optimization

- Configure appropriate pool sizes
- Use connection pooling
- Implement connection retry logic
- Monitor connection metrics

### Caching Strategy

- Redis for session caching
- Query result caching
- Application-level caching
- CDN for static content

## Migration Checklist

### Pre-Migration
- [ ] Neon project created
- [ ] Databases provisioned
- [ ] Connection strings configured
- [ ] Environment files updated
- [ ] Connection tests passed

### Post-Migration
- [ ] Schema migration completed
- [ ] Data integrity verified
- [ ] Performance benchmarks met
- [ ] Monitoring configured
- [ ] Backup strategy implemented

## Support and Resources

### Documentation
- [Neon Documentation](https://neon.tech/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)

### Support Channels
- Neon Support: [support@neon.tech](mailto:support@neon.tech)
- Community Forum: [community.neon.tech](https://community.neon.tech)
- Discord: [Neon Discord Server](https://discord.gg/92vNTzKDGp)

### Emergency Contacts
- Database issues: Check Neon status page
- Application issues: Review application logs
- Performance issues: Check monitoring dashboard

This completes the Neon Database setup guide. Follow the next steps in the migration process to implement the schema migration.