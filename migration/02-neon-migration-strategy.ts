/**
 * Neon Database Migration Strategy
 * Comprehensive migration plan following prompt-5.txt guidelines
 */

import { neon } from '@neondatabase/serverless'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { performance } from 'perf_hooks'

interface MigrationConfig {
  sourceDatabase: string
  targetDatabase: string
  migrationStrategy: 'DIRECT_COPY' | 'INCREMENTAL' | 'DUAL_WRITE'
  batchSize: number
  validateData: boolean
  createBackup: boolean
}

interface MigrationResult {
  success: boolean
  tablesProcessed: string[]
  recordsMigrated: number
  duration: number
  errors: string[]
  validationResults: ValidationResult[]
}

interface ValidationResult {
  table: string
  sourceCount: number
  targetCount: number
  match: boolean
  sampleValidation: boolean
}

export class NeonMigrationManager {
  private sourceDb: PrismaClient
  private targetDb: any
  private config: MigrationConfig
  
  constructor(config: MigrationConfig) {
    this.config = config
    this.sourceDb = new PrismaClient()
    
    // Initialize Neon connection
    if (config.targetDatabase) {
      this.targetDb = neon(config.targetDatabase)
    }
  }

  async executeMigration(): Promise<MigrationResult> {
    console.log('🚀 Starting Neon Database Migration...')
    const startTime = performance.now()
    
    const result: MigrationResult = {
      success: false,
      tablesProcessed: [],
      recordsMigrated: 0,
      duration: 0,
      errors: [],
      validationResults: []
    }

    try {
      // Step 1: Backup source database
      if (this.config.createBackup) {
        await this.createBackup()
      }

      // Step 2: Setup Neon database schema
      await this.setupNeonSchema()
      
      // Step 3: Migrate data based on strategy
      const migrationResults = await this.migrateData()
      result.tablesProcessed = migrationResults.tablesProcessed
      result.recordsMigrated = migrationResults.recordsMigrated
      
      // Step 4: Validate migration
      if (this.config.validateData) {
        result.validationResults = await this.validateMigration()
      }
      
      // Step 5: Optimize Neon database
      await this.optimizeNeonDatabase()
      
      result.success = true
      console.log('✅ Migration completed successfully!')
      
    } catch (error) {
      console.error('❌ Migration failed:', error)
      result.errors.push(error.message)
      result.success = false
    } finally {
      result.duration = performance.now() - startTime
      await this.generateMigrationReport(result)
    }

    return result
  }

  private async createBackup(): Promise<void> {
    console.log('💾 Creating database backup...')
    
    const backupDir = path.join(process.cwd(), 'migration', 'backups')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(backupDir, `database-backup-${timestamp}.json`)
    
    try {
      // Export all data from current database
      const backup = await this.exportAllData()
      fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2))
      console.log(`✅ Backup created: ${backupFile}`)
    } catch (error) {
      console.error('❌ Backup failed:', error)
      throw new Error(`Backup creation failed: ${error.message}`)
    }
  }

  private async exportAllData(): Promise<any> {
    const data: any = {}
    
    // Export all models
    const models = ['User', 'Company', 'Opportunity', 'Proposal', 'Certificate', 'Notification', 'Account', 'Session']
    
    for (const modelName of models) {
      try {
        const model = (this.sourceDb as any)[modelName.toLowerCase()]
        if (model && model.findMany) {
          data[modelName] = await model.findMany()
          console.log(`  📄 Exported ${data[modelName].length} records from ${modelName}`)
        }
      } catch (error) {
        console.log(`  ⚠️ Could not export ${modelName}: ${error.message}`)
        data[modelName] = []
      }
    }
    
    return data
  }

  private async setupNeonSchema(): Promise<void> {
    console.log('🏗️ Setting up Neon database schema...')
    
    if (!this.targetDb) {
      throw new Error('Target database connection not configured')
    }

    try {
      // Read and execute Prisma migration files
      const migrationDir = path.join(process.cwd(), 'prisma', 'migrations')
      
      if (fs.existsSync(migrationDir)) {
        await this.executePrismaMigrations(migrationDir)
      } else {
        // Generate schema from Prisma schema file
        await this.generateSchemaFromPrisma()
      }
      
      console.log('✅ Schema setup complete')
    } catch (error) {
      console.error('❌ Schema setup failed:', error)
      throw new Error(`Schema setup failed: ${error.message}`)
    }
  }

  private async executePrismaMigrations(migrationDir: string): Promise<void> {
    const migrations = fs.readdirSync(migrationDir)
      .filter(dir => fs.statSync(path.join(migrationDir, dir)).isDirectory())
      .sort()

    for (const migration of migrations) {
      const migrationFile = path.join(migrationDir, migration, 'migration.sql')
      
      if (fs.existsSync(migrationFile)) {
        const sql = fs.readFileSync(migrationFile, 'utf8')
        
        try {
          await this.targetDb(sql)
          console.log(`  ✅ Applied migration: ${migration}`)
        } catch (error) {
          console.log(`  ⚠️ Migration ${migration} failed: ${error.message}`)
          // Continue with other migrations
        }
      }
    }
  }

  private async generateSchemaFromPrisma(): Promise<void> {
    // This would typically use Prisma's introspection or generate SQL from schema
    console.log('📋 Generating schema from Prisma definition...')
    
    // For now, we'll create the essential tables manually
    const createTablesSQL = `
      -- Create essential tables for LicitaFácil AI
      
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      
      -- Users table
      CREATE TABLE IF NOT EXISTS "User" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        "emailVerified" TIMESTAMP WITH TIME ZONE,
        image TEXT,
        password TEXT,
        role TEXT NOT NULL DEFAULT 'USER',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      
      -- Companies table
      CREATE TABLE IF NOT EXISTS "Company" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        cnpj TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        "fantasyName" TEXT,
        email TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        "zipCode" TEXT,
        "businessType" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "userId" TEXT UNIQUE NOT NULL,
        FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
      );
      
      -- Opportunities table
      CREATE TABLE IF NOT EXISTS "Opportunity" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        "editalNumber" TEXT NOT NULL,
        organ TEXT NOT NULL,
        "publishDate" TIMESTAMP WITH TIME ZONE NOT NULL,
        "openingDate" TIMESTAMP WITH TIME ZONE NOT NULL,
        "closingDate" TIMESTAMP WITH TIME ZONE,
        "bidType" TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN',
        "editalLink" TEXT,
        "estimatedValue" DOUBLE PRECISION,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "companyId" TEXT NOT NULL,
        FOREIGN KEY ("companyId") REFERENCES "Company"(id) ON DELETE CASCADE
      );
      
      -- Proposals table
      CREATE TABLE IF NOT EXISTS "Proposal" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "proposalDate" TIMESTAMP WITH TIME ZONE NOT NULL,
        "proposedValue" DOUBLE PRECISION NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        result TEXT,
        observations TEXT,
        documents TEXT[],
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "opportunityId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "companyId" TEXT NOT NULL,
        FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"(id) ON DELETE CASCADE,
        FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
        FOREIGN KEY ("companyId") REFERENCES "Company"(id) ON DELETE CASCADE
      );
      
      -- Certificates table
      CREATE TABLE IF NOT EXISTS "Certificate" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        type TEXT NOT NULL,
        issuer TEXT NOT NULL,
        "issueDate" TIMESTAMP WITH TIME ZONE NOT NULL,
        "expiryDate" TIMESTAMP WITH TIME ZONE NOT NULL,
        status TEXT NOT NULL DEFAULT 'VALID',
        "documentUrl" TEXT,
        observations TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "userId" TEXT NOT NULL,
        "companyId" TEXT NOT NULL,
        FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
        FOREIGN KEY ("companyId") REFERENCES "Company"(id) ON DELETE CASCADE
      );
      
      -- Notifications table
      CREATE TABLE IF NOT EXISTS "Notification" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "userId" TEXT NOT NULL,
        FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
      );
      
      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"(email);
      CREATE INDEX IF NOT EXISTS "Company_cnpj_idx" ON "Company"(cnpj);
      CREATE INDEX IF NOT EXISTS "Company_userId_idx" ON "Company"("userId");
      CREATE INDEX IF NOT EXISTS "Opportunity_companyId_idx" ON "Opportunity"("companyId");
      CREATE INDEX IF NOT EXISTS "Opportunity_status_idx" ON "Opportunity"(status);
      CREATE INDEX IF NOT EXISTS "Proposal_opportunityId_idx" ON "Proposal"("opportunityId");
      CREATE INDEX IF NOT EXISTS "Certificate_expiryDate_idx" ON "Certificate"("expiryDate");
      CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
    `
    
    await this.targetDb(createTablesSQL)
    console.log('✅ Essential tables created in Neon')
  }

  private async migrateData(): Promise<{ tablesProcessed: string[], recordsMigrated: number }> {
    console.log('📊 Starting data migration...')
    
    const tablesProcessed: string[] = []
    let recordsMigrated = 0
    
    // Define migration order (respecting foreign key dependencies)
    const migrationOrder = ['User', 'Company', 'Opportunity', 'Proposal', 'Certificate', 'Notification']
    
    for (const tableName of migrationOrder) {
      try {
        const migratedCount = await this.migrateTable(tableName)
        tablesProcessed.push(tableName)
        recordsMigrated += migratedCount
        console.log(`  ✅ Migrated ${migratedCount} records from ${tableName}`)
      } catch (error) {
        console.error(`  ❌ Failed to migrate ${tableName}: ${error.message}`)
        throw error
      }
    }
    
    return { tablesProcessed, recordsMigrated }
  }

  private async migrateTable(tableName: string): Promise<number> {
    const model = (this.sourceDb as any)[tableName.toLowerCase()]
    if (!model || !model.findMany) {
      console.log(`  ⚠️ Model ${tableName} not found, skipping...`)
      return 0
    }

    // Get all records from source
    const records = await model.findMany()
    if (records.length === 0) {
      console.log(`  📋 Table ${tableName} is empty, skipping...`)
      return 0
    }

    // Insert records in batches
    const batchSize = this.config.batchSize || 100
    let insertedCount = 0

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      
      try {
        await this.insertBatch(tableName, batch)
        insertedCount += batch.length
        console.log(`    📦 Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`)
      } catch (error) {
        console.error(`    ❌ Batch insertion failed for ${tableName}: ${error.message}`)
        throw error
      }
    }

    return insertedCount
  }

  private async insertBatch(tableName: string, records: any[]): Promise<void> {
    // Create parameterized insert query
    const fields = Object.keys(records[0])
    const placeholders = records.map((_, index) => 
      `(${fields.map((_, fieldIndex) => `$${index * fields.length + fieldIndex + 1}`).join(', ')})`
    ).join(', ')
    
    const values = records.flatMap(record => fields.map(field => record[field]))
    
    const insertSQL = `
      INSERT INTO "${tableName}" (${fields.map(f => `"${f}"`).join(', ')})
      VALUES ${placeholders}
      ON CONFLICT (id) DO NOTHING
    `
    
    await this.targetDb(insertSQL, values)
  }

  private async validateMigration(): Promise<ValidationResult[]> {
    console.log('🔍 Validating migration...')
    
    const validationResults: ValidationResult[] = []
    const tables = ['User', 'Company', 'Opportunity', 'Proposal', 'Certificate', 'Notification']
    
    for (const table of tables) {
      try {
        const result = await this.validateTable(table)
        validationResults.push(result)
        
        if (result.match) {
          console.log(`  ✅ ${table}: ${result.sourceCount} = ${result.targetCount} ✓`)
        } else {
          console.log(`  ❌ ${table}: ${result.sourceCount} ≠ ${result.targetCount} ✗`)
        }
      } catch (error) {
        console.error(`  ❌ Validation failed for ${table}: ${error.message}`)
        validationResults.push({
          table,
          sourceCount: 0,
          targetCount: 0,
          match: false,
          sampleValidation: false
        })
      }
    }
    
    return validationResults
  }

  private async validateTable(tableName: string): Promise<ValidationResult> {
    // Count records in source
    const sourceModel = (this.sourceDb as any)[tableName.toLowerCase()]
    const sourceCount = sourceModel ? await sourceModel.count() : 0
    
    // Count records in target
    const targetResult = await this.targetDb(`SELECT COUNT(*) FROM "${tableName}"`)
    const targetCount = parseInt(targetResult[0].count)
    
    // Sample validation (check a few random records)
    const sampleValidation = await this.validateSample(tableName)
    
    return {
      table: tableName,
      sourceCount,
      targetCount,
      match: sourceCount === targetCount,
      sampleValidation
    }
  }

  private async validateSample(tableName: string): Promise<boolean> {
    try {
      // Get a sample of 5 records from source
      const sourceModel = (this.sourceDb as any)[tableName.toLowerCase()]
      if (!sourceModel) return true
      
      const sampleRecords = await sourceModel.findMany({ take: 5 })
      if (sampleRecords.length === 0) return true
      
      // Check if these records exist in target
      for (const record of sampleRecords) {
        const targetRecord = await this.targetDb(`SELECT * FROM "${tableName}" WHERE id = $1`, [record.id])
        if (targetRecord.length === 0) {
          return false
        }
      }
      
      return true
    } catch (error) {
      console.error(`Sample validation failed for ${tableName}: ${error.message}`)
      return false
    }
  }

  private async optimizeNeonDatabase(): Promise<void> {
    console.log('⚡ Optimizing Neon database...')
    
    try {
      // Analyze tables for better query planning
      const analyzeSQL = `
        ANALYZE "User";
        ANALYZE "Company";
        ANALYZE "Opportunity";
        ANALYZE "Proposal";
        ANALYZE "Certificate";
        ANALYZE "Notification";
      `
      
      await this.targetDb(analyzeSQL)
      
      // Create additional performance indexes
      const optimizationSQL = `
        -- Additional performance indexes
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "Opportunity_publishDate_idx" ON "Opportunity"("publishDate");
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "Opportunity_closingDate_idx" ON "Opportunity"("closingDate");
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "Certificate_status_expiryDate_idx" ON "Certificate"(status, "expiryDate");
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "Proposal_userId_status_idx" ON "Proposal"("userId", status);
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");
      `
      
      await this.targetDb(optimizationSQL)
      console.log('✅ Database optimization complete')
    } catch (error) {
      console.error('❌ Optimization failed:', error.message)
      // Don't throw - optimization failure shouldn't stop migration
    }
  }

  private async generateMigrationReport(result: MigrationResult): Promise<void> {
    const reportPath = path.join(process.cwd(), 'migration', 'migration-report.json')
    const summaryPath = path.join(process.cwd(), 'migration', 'migration-summary.md')
    
    // Save detailed report
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2))
    
    // Generate summary
    const summary = `# Neon Database Migration Report

## Migration Summary
- **Status**: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}
- **Duration**: ${Math.round(result.duration / 1000)}s
- **Tables Processed**: ${result.tablesProcessed.length}
- **Records Migrated**: ${result.recordsMigrated}

## Tables Processed
${result.tablesProcessed.map(table => `- ✅ ${table}`).join('\n')}

## Validation Results
${result.validationResults.map(v => 
  `- **${v.table}**: ${v.sourceCount} → ${v.targetCount} ${v.match ? '✅' : '❌'}`
).join('\n')}

## Errors
${result.errors.length > 0 ? result.errors.map(error => `- ❌ ${error}`).join('\n') : '- No errors encountered'}

## Next Steps
${result.success ? `
1. Update application configuration to use Neon database
2. Test application functionality thoroughly
3. Monitor performance in production
4. Archive source database backup
` : `
1. Review errors and resolve issues
2. Re-run migration process
3. Consider rollback if necessary
`}
`
    
    fs.writeFileSync(summaryPath, summary)
    
    console.log('📋 Migration report generated:')
    console.log(`  - Detailed: ${reportPath}`)
    console.log(`  - Summary: ${summaryPath}`)
  }

  async cleanup(): Promise<void> {
    await this.sourceDb.$disconnect()
  }
}

export default NeonMigrationManager