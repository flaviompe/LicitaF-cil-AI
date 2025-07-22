/**
 * Neon Database Environment Setup
 * Following prompt-5.txt Step 4: Neon Database Setup
 */

import { neon } from '@neondatabase/serverless'
import fs from 'fs'
import path from 'path'

interface NeonConfig {
  projectName: string
  databaseName: string
  region: string
  connectionString: string
  branchName?: string
  computeSettings?: {
    minCu: number
    maxCu: number
    suspendTimeoutSeconds: number
  }
}

interface NeonSetupResult {
  success: boolean
  connectionString: string
  projectId?: string
  errors: string[]
  configFiles: string[]
}

export class NeonDatabaseSetup {
  private config: NeonConfig
  
  constructor(config: NeonConfig) {
    this.config = config
  }

  async setupNeonEnvironment(): Promise<NeonSetupResult> {
    console.log('🚀 Setting up Neon Database environment...')
    
    const result: NeonSetupResult = {
      success: false,
      connectionString: '',
      errors: [],
      configFiles: []
    }

    try {
      // Step 1: Validate connection string
      await this.validateConnection()
      
      // Step 2: Create environment configuration
      await this.createEnvironmentConfig()
      result.configFiles.push('.env.neon')
      
      // Step 3: Create Neon-specific Prisma configuration
      await this.createNeonPrismaConfig()
      result.configFiles.push('prisma/schema.neon.prisma')
      
      // Step 4: Create migration scripts
      await this.createMigrationScripts()
      result.configFiles.push('migration/run-migration.ts')
      
      // Step 5: Create monitoring setup
      await this.createMonitoringSetup()
      result.configFiles.push('migration/monitoring.ts')
      
      // Step 6: Test connection and basic operations
      await this.testNeonConnection()
      
      result.success = true
      result.connectionString = this.config.connectionString
      
      console.log('✅ Neon environment setup complete!')
      
    } catch (error) {
      console.error('❌ Neon setup failed:', error)
      result.errors.push(error.message)
      result.success = false
    }

    await this.generateSetupReport(result)
    return result
  }

  private async validateConnection(): Promise<void> {
    console.log('🔍 Validating Neon connection...')
    
    if (!this.config.connectionString) {
      throw new Error('Neon connection string not provided')
    }

    // Validate connection string format
    const urlPattern = /^postgresql:\/\/[^:]+:[^@]+@[^\/]+\/[^?]+(\?.*)?$/
    if (!urlPattern.test(this.config.connectionString)) {
      throw new Error('Invalid Neon connection string format')
    }

    try {
      const sql = neon(this.config.connectionString)
      const result = await sql`SELECT NOW() as current_time, version() as pg_version`
      
      console.log(`✅ Connection successful to PostgreSQL ${result[0].pg_version.split(' ')[1]}`)
      console.log(`   Server time: ${result[0].current_time}`)
    } catch (error) {
      throw new Error(`Failed to connect to Neon: ${error.message}`)
    }
  }

  private async createEnvironmentConfig(): Promise<void> {
    console.log('⚙️ Creating environment configuration...')
    
    const envContent = `# Neon Database Configuration
# Generated on ${new Date().toISOString()}

# Primary Neon Database Connection
DATABASE_URL="${this.config.connectionString}"
NEON_DATABASE_URL="${this.config.connectionString}"

# Neon Project Configuration
NEON_PROJECT_NAME="${this.config.projectName}"
NEON_DATABASE_NAME="${this.config.databaseName}"
NEON_REGION="${this.config.region}"
${this.config.branchName ? `NEON_BRANCH="${this.config.branchName}"` : ''}

# Connection Pool Configuration
NEON_POOL_SIZE=20
NEON_IDLE_TIMEOUT=30000
NEON_CONNECTION_TIMEOUT=10000

# Performance Configuration
NEON_STATEMENT_TIMEOUT=30000
NEON_QUERY_TIMEOUT=15000

# Monitoring Configuration
ENABLE_NEON_MONITORING=true
LOG_QUERIES=false
LOG_SLOW_QUERIES=true
SLOW_QUERY_THRESHOLD=1000

# Migration Configuration
MIGRATION_BATCH_SIZE=100
ENABLE_MIGRATION_VALIDATION=true
CREATE_BACKUP_BEFORE_MIGRATION=true

# Environment
NODE_ENV=production
NEXT_PUBLIC_ENVIRONMENT=neon

# Application URLs (update these for your deployment)
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key-here

# Email Configuration (update for production)
EMAIL_PROVIDER=resend
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@your-domain.com

# Optional: Neon-specific optimizations
NEON_ENABLE_POOLING=true
NEON_MAX_CONNECTIONS=100
NEON_SSL_MODE=require
`

    const envPath = path.join(process.cwd(), '.env.neon')
    fs.writeFileSync(envPath, envContent)
    
    console.log(`✅ Environment config created: ${envPath}`)
  }

  private async createNeonPrismaConfig(): Promise<void> {
    console.log('🔧 Creating Neon-specific Prisma configuration...')
    
    // Read existing schema
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
    let schemaContent = fs.readFileSync(schemaPath, 'utf8')
    
    // Update datasource for Neon
    schemaContent = schemaContent.replace(
      /datasource db \{[\s\S]*?\}/,
      `datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL")
}`
    )

    // Add Neon-specific optimizations
    const neonOptimizations = `
// Neon Database Optimizations
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

// Add connection pooling configuration
// Use with @prisma/adapter-neon for optimal performance
`

    schemaContent = neonOptimizations + '\n' + schemaContent

    const neonSchemaPath = path.join(process.cwd(), 'prisma', 'schema.neon.prisma')
    fs.writeFileSync(neonSchemaPath, schemaContent)
    
    console.log(`✅ Neon Prisma config created: ${neonSchemaPath}`)
  }

  private async createMigrationScripts(): Promise<void> {
    console.log('📝 Creating migration execution scripts...')
    
    const migrationScript = `#!/usr/bin/env tsx
/**
 * Neon Database Migration Execution Script
 * Run with: npx tsx migration/run-migration.ts
 */

import DatabaseAnalyzer from './01-database-analysis'
import NeonMigrationManager from './02-neon-migration-strategy'
import dotenv from 'dotenv'

// Load Neon environment configuration
dotenv.config({ path: '.env.neon' })

async function main() {
  console.log('🚀 Starting Neon Database Migration Process...')
  
  try {
    // Step 1: Analyze current database
    console.log('\\n📊 Step 1: Database Analysis')
    const analyzer = new DatabaseAnalyzer()
    const analysisReport = await analyzer.analyzeCurrentDatabase()
    await analyzer.cleanup()
    
    console.log(\`Analysis complete: \${analysisReport.currentSchema.tables.length} tables, \${analysisReport.dataVolume.totalRecords} total records\`)
    
    // Step 2: Execute migration
    console.log('\\n🔄 Step 2: Database Migration')
    const migrationConfig = {
      sourceDatabase: process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL!,
      targetDatabase: process.env.NEON_DATABASE_URL!,
      migrationStrategy: 'DIRECT_COPY' as const,
      batchSize: parseInt(process.env.MIGRATION_BATCH_SIZE || '100'),
      validateData: process.env.ENABLE_MIGRATION_VALIDATION === 'true',
      createBackup: process.env.CREATE_BACKUP_BEFORE_MIGRATION === 'true'
    }
    
    const migrationManager = new NeonMigrationManager(migrationConfig)
    const migrationResult = await migrationManager.executeMigration()
    await migrationManager.cleanup()
    
    // Step 3: Update environment
    if (migrationResult.success) {
      console.log('\\n✅ Migration completed successfully!')
      console.log(\`Migrated \${migrationResult.recordsMigrated} records from \${migrationResult.tablesProcessed.length} tables\`)
      
      // Update primary DATABASE_URL to point to Neon
      console.log('\\n⚙️ Updating primary database configuration...')
      await updatePrimaryDatabaseConfig()
      
      console.log('\\n🎉 Migration process complete! Your application is now using Neon Database.')
      console.log('\\nNext steps:')
      console.log('1. Test your application thoroughly')
      console.log('2. Monitor performance and optimize if needed')
      console.log('3. Update your deployment configuration')
      console.log('4. Archive the source database backup')
    } else {
      console.error('\\n❌ Migration failed!')
      console.error('Check the migration report for details.')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('\\n💥 Migration process failed:', error)
    process.exit(1)
  }
}

async function updatePrimaryDatabaseConfig() {
  const fs = await import('fs')
  const path = await import('path')
  
  // Update .env file to use Neon as primary database
  const envPath = path.join(process.cwd(), '.env')
  let envContent = ''
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8')
  }
  
  // Update or add DATABASE_URL
  const neonUrl = process.env.NEON_DATABASE_URL!
  
  if (envContent.includes('DATABASE_URL=')) {
    envContent = envContent.replace(
      /DATABASE_URL=.*/,
      \`DATABASE_URL=\${neonUrl}\`
    )
  } else {
    envContent += \`\\nDATABASE_URL=\${neonUrl}\\n\`
  }
  
  // Add migration timestamp
  envContent += \`\\n# Migrated to Neon Database on \${new Date().toISOString()}\\n\`
  
  fs.writeFileSync(envPath, envContent)
  console.log('✅ Primary database configuration updated')
}

if (require.main === module) {
  main().catch(console.error)
}
`

    const migrationScriptPath = path.join(process.cwd(), 'migration', 'run-migration.ts')
    fs.writeFileSync(migrationScriptPath, migrationScript)
    
    // Make script executable
    try {
      fs.chmodSync(migrationScriptPath, '755')
    } catch (error) {
      // Ignore chmod errors on Windows
    }
    
    console.log(`✅ Migration script created: ${migrationScriptPath}`)
  }

  private async createMonitoringSetup(): Promise<void> {
    console.log('📊 Creating monitoring setup...')
    
    const monitoringScript = `/**
 * Neon Database Monitoring and Performance Tools
 */

import { neon } from '@neondatabase/serverless'

interface PerformanceMetrics {
  queryCount: number
  avgResponseTime: number
  slowQueries: any[]
  connectionStats: any
  cacheHitRatio: number
}

export class NeonMonitoring {
  private sql: any

  constructor(connectionString: string) {
    this.sql = neon(connectionString)
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      // Get query statistics
      const queryStats = await this.sql\`
        SELECT 
          count(*) as query_count,
          avg(mean_exec_time) as avg_response_time
        FROM pg_stat_statements 
        WHERE calls > 0
      \`

      // Get slow queries
      const slowQueries = await this.sql\`
        SELECT 
          query,
          calls,
          total_exec_time,
          mean_exec_time,
          rows
        FROM pg_stat_statements 
        WHERE mean_exec_time > 100
        ORDER BY mean_exec_time DESC 
        LIMIT 10
      \`

      // Get connection stats
      const connectionStats = await this.sql\`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity
      \`

      // Get cache hit ratio
      const cacheStats = await this.sql\`
        SELECT 
          sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 as cache_hit_ratio
        FROM pg_statio_user_tables
      \`

      return {
        queryCount: queryStats[0]?.query_count || 0,
        avgResponseTime: queryStats[0]?.avg_response_time || 0,
        slowQueries: slowQueries || [],
        connectionStats: connectionStats[0] || {},
        cacheHitRatio: cacheStats[0]?.cache_hit_ratio || 0
      }
    } catch (error) {
      console.error('Error getting performance metrics:', error)
      throw error
    }
  }

  async checkDatabaseHealth(): Promise<boolean> {
    try {
      const result = await this.sql\`SELECT 1 as health_check\`
      return result[0]?.health_check === 1
    } catch (error) {
      console.error('Health check failed:', error)
      return false
    }
  }

  async optimizeDatabase(): Promise<void> {
    console.log('🔧 Running database optimization...')
    
    try {
      // Analyze all tables
      await this.sql\`ANALYZE\`
      
      // Update table statistics
      await this.sql\`
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
      \`
      
      console.log('✅ Database optimization complete')
    } catch (error) {
      console.error('Optimization failed:', error)
      throw error
    }
  }

  async generatePerformanceReport(): Promise<string> {
    const metrics = await this.getPerformanceMetrics()
    
    return \`# Neon Database Performance Report
Generated: \${new Date().toISOString()}

## Overview
- Total Queries: \${metrics.queryCount}
- Average Response Time: \${metrics.avgResponseTime}ms
- Cache Hit Ratio: \${metrics.cacheHitRatio}%

## Connection Stats
- Total Connections: \${metrics.connectionStats.total_connections}
- Active Connections: \${metrics.connectionStats.active_connections}
- Idle Connections: \${metrics.connectionStats.idle_connections}

## Slow Queries (\${metrics.slowQueries.length})
\${metrics.slowQueries.map(q => 
  \`- \${q.query.substring(0, 100)}... (\${q.mean_exec_time}ms avg, \${q.calls} calls)\`
).join('\\n')}

## Recommendations
\${metrics.avgResponseTime > 100 ? '- ⚠️ Average response time is high - consider query optimization' : '- ✅ Response times are good'}
\${metrics.cacheHitRatio < 90 ? '- ⚠️ Cache hit ratio is low - consider increasing shared_buffers' : '- ✅ Cache performance is good'}
\${metrics.slowQueries.length > 5 ? '- ⚠️ Many slow queries detected - review and optimize' : '- ✅ Query performance is acceptable'}
\`
  }
}

export default NeonMonitoring
`

    const monitoringPath = path.join(process.cwd(), 'migration', 'monitoring.ts')
    fs.writeFileSync(monitoringPath, monitoringScript)
    
    console.log(`✅ Monitoring setup created: ${monitoringPath}`)
  }

  private async testNeonConnection(): Promise<void> {
    console.log('🧪 Testing Neon connection and basic operations...')
    
    const sql = neon(this.config.connectionString)
    
    try {
      // Test basic connectivity
      const connectResult = await sql`SELECT NOW() as timestamp, 'Neon connection test' as message`
      console.log(`✅ Basic connectivity: ${connectResult[0].message}`)
      
      // Test transaction capability
      await sql.begin(async (sql) => {
        await sql`SELECT 1 as test_transaction`
        console.log('✅ Transaction support verified')
      })
      
      // Test table creation
      await sql`
        CREATE TABLE IF NOT EXISTS neon_test (
          id SERIAL PRIMARY KEY,
          test_data TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `
      console.log('✅ Table creation capability verified')
      
      // Test insert/select
      await sql`INSERT INTO neon_test (test_data) VALUES ('Migration test successful')`
      const testResult = await sql`SELECT test_data FROM neon_test ORDER BY id DESC LIMIT 1`
      console.log(`✅ Data operations: ${testResult[0].test_data}`)
      
      // Cleanup test table
      await sql`DROP TABLE IF EXISTS neon_test`
      console.log('✅ Test cleanup completed')
      
    } catch (error) {
      throw new Error(`Neon connection test failed: ${error.message}`)
    }
  }

  private async generateSetupReport(result: NeonSetupResult): Promise<void> {
    const reportPath = path.join(process.cwd(), 'migration', 'neon-setup-report.json')
    const summaryPath = path.join(process.cwd(), 'migration', 'neon-setup-summary.md')
    
    // Save detailed report
    fs.writeFileSync(reportPath, JSON.stringify({
      ...result,
      config: {
        ...this.config,
        connectionString: '[REDACTED]' // Don't save credentials
      }
    }, null, 2))
    
    // Generate summary
    const summary = `# Neon Database Setup Report

## Setup Summary
- **Status**: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}
- **Project**: ${this.config.projectName}
- **Database**: ${this.config.databaseName}
- **Region**: ${this.config.region}

## Configuration Files Created
${result.configFiles.map(file => `- ✅ ${file}`).join('\n')}

## Connection Details
- **Provider**: PostgreSQL (Neon)
- **SSL Mode**: Required
- **Connection Pooling**: Enabled

## Next Steps
${result.success ? `
1. Run migration: \`npx tsx migration/run-migration.ts\`
2. Test application functionality
3. Monitor performance with \`migration/monitoring.ts\`
4. Update deployment configuration
` : `
1. Review setup errors and resolve issues
2. Verify Neon connection string
3. Check database permissions
4. Re-run setup process
`}

## Errors
${result.errors.length > 0 ? result.errors.map(error => `- ❌ ${error}`).join('\n') : '- No errors encountered'}

## Configuration
- **Batch Size**: ${process.env.MIGRATION_BATCH_SIZE || '100'}
- **Validation**: ${process.env.ENABLE_MIGRATION_VALIDATION || 'true'}
- **Backup**: ${process.env.CREATE_BACKUP_BEFORE_MIGRATION || 'true'}
`
    
    fs.writeFileSync(summaryPath, summary)
    
    console.log('📋 Setup report generated:')
    console.log(`  - Detailed: ${reportPath}`)
    console.log(`  - Summary: ${summaryPath}`)
  }
}

export default NeonDatabaseSetup