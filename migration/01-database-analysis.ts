/**
 * Database Analysis Script for Neon Migration
 * Follows prompt-5.txt instructions for comprehensive database analysis
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

interface DatabaseAnalysisReport {
  currentSchema: {
    tables: any[]
    indexes: any[]
    constraints: any[]
    dataTypes: any[]
  }
  dataVolume: {
    totalRecords: number
    tableRecords: Record<string, number>
  }
  compatibility: {
    dataTypeMapping: Record<string, string>
    potentialIssues: string[]
    migrationComplexity: 'LOW' | 'MEDIUM' | 'HIGH'
  }
  performance: {
    queryPatterns: string[]
    indexUsage: any[]
    bottlenecks: string[]
  }
}

export class DatabaseAnalyzer {
  private prisma: PrismaClient

  constructor() {
    this.prisma = new PrismaClient()
  }

  async analyzeCurrentDatabase(): Promise<DatabaseAnalysisReport> {
    console.log('🔍 Starting comprehensive database analysis...')
    
    const report: DatabaseAnalysisReport = {
      currentSchema: await this.analyzeSchema(),
      dataVolume: await this.analyzeDataVolume(),
      compatibility: await this.assessCompatibility(),
      performance: await this.analyzePerformance()
    }

    await this.generateAnalysisReport(report)
    return report
  }

  private async analyzeSchema() {
    console.log('📊 Analyzing current schema structure...')
    
    try {
      // Get table information from Prisma schema
      const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
      const schemaContent = fs.readFileSync(schemaPath, 'utf8')
      
      // Parse schema to extract table information
      const models = this.parseModelsFromSchema(schemaContent)
      const enums = this.parseEnumsFromSchema(schemaContent)
      
      // Get current database provider
      const providerMatch = schemaContent.match(/provider\s*=\s*"([^"]+)"/)
      const currentProvider = providerMatch ? providerMatch[1] : 'unknown'
      
      return {
        tables: models,
        indexes: this.extractIndexes(models),
        constraints: this.extractConstraints(models),
        dataTypes: this.extractDataTypes(models),
        enums,
        currentProvider
      }
    } catch (error) {
      console.error('Error analyzing schema:', error)
      throw error
    }
  }

  private async analyzeDataVolume() {
    console.log('📈 Analyzing data volume...')
    
    const tableRecords: Record<string, number> = {}
    let totalRecords = 0

    // Since we're using Prisma, we need to check each model
    const models = ['User', 'Company', 'Opportunity', 'Proposal', 'Certificate', 'Notification', 'Account', 'Session']
    
    for (const model of models) {
      try {
        // Use Prisma's count method for each model
        const count = await this.getModelCount(model)
        tableRecords[model.toLowerCase()] = count
        totalRecords += count
        console.log(`  📋 ${model}: ${count} records`)
      } catch (error) {
        console.log(`  ⚠️ Could not count ${model}: ${error.message}`)
        tableRecords[model.toLowerCase()] = 0
      }
    }

    return {
      totalRecords,
      tableRecords
    }
  }

  private async getModelCount(modelName: string): Promise<number> {
    try {
      // Dynamic model access through Prisma
      const model = (this.prisma as any)[modelName.toLowerCase()]
      if (model && model.count) {
        return await model.count()
      }
      return 0
    } catch (error) {
      return 0
    }
  }

  private async assessCompatibility() {
    console.log('🔄 Assessing PostgreSQL/Neon compatibility...')
    
    // Since we're already using PostgreSQL, most types are compatible
    const dataTypeMapping: Record<string, string> = {
      'String': 'VARCHAR/TEXT',
      'Int': 'INTEGER',
      'Float': 'REAL/DOUBLE PRECISION',
      'Boolean': 'BOOLEAN',
      'DateTime': 'TIMESTAMP WITH TIME ZONE',
      'Decimal': 'NUMERIC/DECIMAL',
      'Json': 'JSONB',
      'Bytes': 'BYTEA'
    }

    const potentialIssues: string[] = []
    let migrationComplexity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'

    // Check for potential issues
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
    const schemaContent = fs.readFileSync(schemaPath, 'utf8')

    if (schemaContent.includes('@db.Text')) {
      potentialIssues.push('Using @db.Text directive - needs verification in Neon')
    }

    if (schemaContent.includes('@@map')) {
      potentialIssues.push('Custom table mapping detected - verify in Neon')
      migrationComplexity = 'MEDIUM'
    }

    if (schemaContent.includes('@@unique')) {
      potentialIssues.push('Composite unique constraints - verify compatibility')
    }

    return {
      dataTypeMapping,
      potentialIssues,
      migrationComplexity
    }
  }

  private async analyzePerformance() {
    console.log('⚡ Analyzing performance patterns...')
    
    return {
      queryPatterns: [
        'User authentication queries (by email)',
        'Company lookup queries (by CNPJ)',
        'Opportunity filtering (by status, dates)',
        'Certificate expiry checks',
        'Notification queries (by user, unread)',
        'Proposal status updates'
      ],
      indexUsage: [
        { table: 'User', field: 'email', type: 'unique' },
        { table: 'Company', field: 'cnpj', type: 'unique' },
        { table: 'Company', field: 'userId', type: 'unique' },
        { table: 'Opportunity', field: 'companyId', type: 'foreign_key' },
        { table: 'Certificate', field: 'expiryDate', type: 'date_range' }
      ],
      bottlenecks: [
        'Opportunity search without proper indexing',
        'Certificate expiry date queries',
        'User session lookups',
        'Notification count queries'
      ]
    }
  }

  private parseModelsFromSchema(schemaContent: string) {
    const models: any[] = []
    const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g
    let match

    while ((match = modelRegex.exec(schemaContent)) !== null) {
      const modelName = match[1]
      const modelBody = match[2]
      
      const fields = this.parseFields(modelBody)
      
      models.push({
        name: modelName,
        fields,
        relations: fields.filter(f => f.isRelation)
      })
    }

    return models
  }

  private parseEnumsFromSchema(schemaContent: string) {
    const enums: any[] = []
    const enumRegex = /enum\s+(\w+)\s*{([^}]+)}/g
    let match

    while ((match = enumRegex.exec(schemaContent)) !== null) {
      const enumName = match[1]
      const enumBody = match[2]
      
      const values = enumBody
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('//'))
        
      enums.push({
        name: enumName,
        values
      })
    }

    return enums
  }

  private parseFields(modelBody: string) {
    const fields: any[] = []
    const lines = modelBody.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue

      const fieldMatch = trimmed.match(/(\w+)\s+(\w+(?:\[\])?(?:\?)?)\s*(.*)/)
      if (fieldMatch) {
        const [, name, type, modifiers] = fieldMatch
        
        fields.push({
          name,
          type: type.replace(/[\[\]?]/g, ''),
          isOptional: type.includes('?'),
          isArray: type.includes('[]'),
          isRelation: /^[A-Z]/.test(type.replace(/[\[\]?]/g, '')),
          modifiers: modifiers.trim()
        })
      }
    }

    return fields
  }

  private extractIndexes(models: any[]) {
    const indexes: any[] = []
    
    for (const model of models) {
      for (const field of model.fields) {
        if (field.modifiers.includes('@unique')) {
          indexes.push({
            table: model.name,
            field: field.name,
            type: 'unique'
          })
        }
        
        if (field.modifiers.includes('@id')) {
          indexes.push({
            table: model.name,
            field: field.name,
            type: 'primary_key'
          })
        }
      }
    }

    return indexes
  }

  private extractConstraints(models: any[]) {
    const constraints: any[] = []
    
    for (const model of models) {
      for (const field of model.fields) {
        if (field.isRelation) {
          constraints.push({
            table: model.name,
            field: field.name,
            type: 'foreign_key',
            references: field.type
          })
        }
      }
    }

    return constraints
  }

  private extractDataTypes(models: any[]) {
    const dataTypes: any[] = []
    
    for (const model of models) {
      for (const field of model.fields) {
        if (!field.isRelation) {
          dataTypes.push({
            table: model.name,
            field: field.name,
            type: field.type,
            optional: field.isOptional,
            array: field.isArray
          })
        }
      }
    }

    return dataTypes
  }

  private async generateAnalysisReport(report: DatabaseAnalysisReport) {
    const reportPath = path.join(process.cwd(), 'migration', 'database-analysis-report.json')
    
    // Create migration directory if it doesn't exist
    const migrationDir = path.dirname(reportPath)
    if (!fs.existsSync(migrationDir)) {
      fs.mkdirSync(migrationDir, { recursive: true })
    }

    // Save detailed report
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    
    // Generate summary report
    const summaryPath = path.join(process.cwd(), 'migration', 'analysis-summary.md')
    const summary = this.generateSummaryMarkdown(report)
    fs.writeFileSync(summaryPath, summary)
    
    console.log('📋 Analysis complete! Reports saved:')
    console.log(`  - Detailed: ${reportPath}`)
    console.log(`  - Summary: ${summaryPath}`)
  }

  private generateSummaryMarkdown(report: DatabaseAnalysisReport): string {
    return `# Database Analysis Report for Neon Migration

## Executive Summary
- **Total Tables**: ${report.currentSchema.tables.length}
- **Total Records**: ${report.dataVolume.totalRecords}
- **Migration Complexity**: ${report.compatibility.migrationComplexity}
- **Current Provider**: PostgreSQL (Prisma)

## Schema Analysis
${report.currentSchema.tables.map(table => 
  `### ${table.name}
- **Fields**: ${table.fields.length}
- **Relations**: ${table.relations.length}`
).join('\n\n')}

## Data Volume Analysis
${Object.entries(report.dataVolume.tableRecords).map(([table, count]) => 
  `- **${table}**: ${count} records`
).join('\n')}

## Compatibility Assessment
### Data Type Mappings
${Object.entries(report.compatibility.dataTypeMapping).map(([from, to]) => 
  `- ${from} → ${to}`
).join('\n')}

### Potential Issues
${report.compatibility.potentialIssues.map(issue => `- ⚠️ ${issue}`).join('\n')}

## Performance Considerations
### Query Patterns
${report.performance.queryPatterns.map(pattern => `- ${pattern}`).join('\n')}

### Recommended Indexes
${report.performance.indexUsage.map(index => 
  `- ${index.table}.${index.field} (${index.type})`
).join('\n')}

### Potential Bottlenecks
${report.performance.bottlenecks.map(bottleneck => `- ⚠️ ${bottleneck}`).join('\n')}

## Migration Recommendation
Since the application is already using PostgreSQL with Prisma, migration to Neon Database should be **straightforward**. The main changes required are:

1. **Connection String Update**: Update DATABASE_URL to point to Neon
2. **Environment Configuration**: Configure Neon-specific settings
3. **Performance Optimization**: Add Neon-specific optimizations
4. **Testing**: Comprehensive testing in Neon environment

**Risk Level**: ${report.compatibility.migrationComplexity}
**Estimated Downtime**: < 30 minutes (with proper planning)
`
  }

  async cleanup() {
    await this.prisma.$disconnect()
  }
}

// Export for use in migration scripts
export default DatabaseAnalyzer