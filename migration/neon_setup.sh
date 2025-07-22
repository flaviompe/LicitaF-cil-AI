#!/bin/bash
# Neon Database Setup Script
# This script guides through Neon database creation and configuration

echo "🚀 NEON DATABASE SETUP FOR LICITAÇÕES PLATFORM"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if neon CLI is installed
check_neon_cli() {
    print_step "Checking Neon CLI installation..."
    
    if ! command -v neon &> /dev/null; then
        print_warning "Neon CLI not found. Installing..."
        
        # Install Neon CLI
        case "$(uname -s)" in
            Linux*)     
                curl -fsSL https://neon.tech/install.sh | bash
                export PATH="$PATH:$HOME/.neon/bin"
                ;;
            Darwin*)    
                brew install neon
                ;;
            *)
                print_error "Unsupported operating system. Please install Neon CLI manually from https://neon.tech/docs/reference/neon-cli"
                exit 1
                ;;
        esac
    fi
    
    print_success "Neon CLI is available"
}

# Authenticate with Neon
authenticate_neon() {
    print_step "Authenticating with Neon..."
    
    echo "Please authenticate with your Neon account:"
    echo "1. Visit https://console.neon.tech/app/settings/api-keys"
    echo "2. Create a new API key"
    echo "3. Enter the API key when prompted"
    
    neon auth
    
    if [ $? -eq 0 ]; then
        print_success "Successfully authenticated with Neon"
    else
        print_error "Authentication failed. Please try again."
        exit 1
    fi
}

# Create Neon project
create_project() {
    print_step "Creating Neon project..."
    
    PROJECT_NAME="licitacoes-platform"
    REGION="us-east-2"
    
    echo "Creating project: $PROJECT_NAME in region: $REGION"
    
    # Create the project
    PROJECT_OUTPUT=$(neon projects create \
        --name "$PROJECT_NAME" \
        --region "$REGION" \
        --output json 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        PROJECT_ID=$(echo "$PROJECT_OUTPUT" | jq -r '.id')
        print_success "Project created successfully"
        print_success "Project ID: $PROJECT_ID"
        
        # Save project ID to file for later use
        echo "$PROJECT_ID" > migration/.neon_project_id
        
        # Get project details
        neon projects list --output table
        
    else
        print_warning "Project creation failed or project already exists"
        echo "Listing existing projects..."
        neon projects list --output table
        
        echo ""
        read -p "Enter your existing project ID: " PROJECT_ID
        echo "$PROJECT_ID" > migration/.neon_project_id
    fi
}

# Create multiple databases for different environments
create_databases() {
    print_step "Creating databases for different environments..."
    
    if [ -f migration/.neon_project_id ]; then
        PROJECT_ID=$(cat migration/.neon_project_id)
    else
        print_error "Project ID not found. Please run the setup again."
        exit 1
    fi
    
    # Array of databases to create
    declare -a databases=("licitacoes_dev" "licitacoes_staging" "licitacoes_prod")
    
    for db in "${databases[@]}"; do
        print_step "Creating database: $db"
        
        neon databases create \
            --project-id "$PROJECT_ID" \
            --name "$db" \
            --output table
        
        if [ $? -eq 0 ]; then
            print_success "Database $db created successfully"
        else
            print_warning "Database $db may already exist or creation failed"
        fi
    done
    
    # List all databases
    print_step "Listing all databases in project..."
    neon databases list --project-id "$PROJECT_ID" --output table
}

# Generate connection strings
generate_connection_strings() {
    print_step "Generating connection strings..."
    
    if [ -f migration/.neon_project_id ]; then
        PROJECT_ID=$(cat migration/.neon_project_id)
    else
        print_error "Project ID not found. Please run the setup again."
        exit 1
    fi
    
    # Create environment files directory
    mkdir -p config/environments
    
    # Array of environments
    declare -a environments=("dev" "staging" "prod")
    
    for env in "${environments[@]}"; do
        print_step "Generating connection string for $env environment..."
        
        # Get connection string
        CONNECTION_STRING=$(neon connection-string \
            --project-id "$PROJECT_ID" \
            --database-name "licitacoes_$env" \
            --role-name "neondb_owner" \
            --output raw 2>/dev/null)
        
        if [ $? -eq 0 ]; then
            # Create environment file
            cat > "config/environments/.env.$env" << EOF
# Neon Database Configuration - $env Environment
# Generated on $(date)

# Primary connection (with connection pooling)
DATABASE_URL="$CONNECTION_STRING"

# Direct connection (for migrations and admin tasks)
DIRECT_URL="$CONNECTION_STRING"

# Environment
NODE_ENV="$env"
DATABASE_ENV="$env"

# Connection Pool Settings
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=300

# Backup Settings
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30

# Monitoring
ENABLE_QUERY_LOGGING=false
SLOW_QUERY_THRESHOLD=1000
ENABLE_PERFORMANCE_MONITORING=true

# Security
SSL_MODE=require
SSL_CERT_VERIFICATION=true
EOF
            
            print_success "Environment file created: config/environments/.env.$env"
        else
            print_error "Failed to get connection string for $env environment"
        fi
    done
}

# Create sample configuration
create_sample_config() {
    print_step "Creating sample database configuration..."
    
    # Python configuration
    cat > "migration/database_config.py" << 'EOF'
"""
Neon Database Configuration for Licitações Platform
"""
import os
from typing import Optional
from pydantic import BaseSettings, validator
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.pool import QueuePool

class DatabaseSettings(BaseSettings):
    """Database configuration settings"""
    
    # Connection strings
    database_url: str
    direct_url: Optional[str] = None
    
    # Pool settings
    pool_size: int = 20
    max_overflow: int = 30
    pool_timeout: int = 30
    pool_recycle: int = 300
    
    # Performance settings
    enable_query_logging: bool = False
    slow_query_threshold: int = 1000
    
    # Environment
    environment: str = "development"
    
    @validator('direct_url', always=True)
    def set_direct_url(cls, v, values):
        if v is None:
            return values.get('database_url')
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = False

class DatabaseManager:
    """Database connection manager"""
    
    def __init__(self, settings: DatabaseSettings):
        self.settings = settings
        self._engine: Optional[Engine] = None
        self._direct_engine: Optional[Engine] = None
    
    def get_engine(self, direct: bool = False) -> Engine:
        """Get database engine"""
        if direct:
            if self._direct_engine is None:
                self._direct_engine = create_engine(
                    self.settings.direct_url,
                    poolclass=QueuePool,
                    pool_size=5,
                    max_overflow=10,
                    pool_pre_ping=True,
                    pool_recycle=self.settings.pool_recycle,
                    echo=self.settings.enable_query_logging
                )
            return self._direct_engine
        else:
            if self._engine is None:
                self._engine = create_engine(
                    self.settings.database_url,
                    poolclass=QueuePool,
                    pool_size=self.settings.pool_size,
                    max_overflow=self.settings.max_overflow,
                    pool_timeout=self.settings.pool_timeout,
                    pool_pre_ping=True,
                    pool_recycle=self.settings.pool_recycle,
                    echo=self.settings.enable_query_logging
                )
            return self._engine
    
    def test_connection(self) -> bool:
        """Test database connection"""
        try:
            engine = self.get_engine()
            with engine.connect() as conn:
                conn.execute("SELECT 1")
            return True
        except Exception as e:
            print(f"Connection test failed: {e}")
            return False
    
    def close_connections(self):
        """Close all database connections"""
        if self._engine:
            self._engine.dispose()
        if self._direct_engine:
            self._direct_engine.dispose()

# Usage example
if __name__ == "__main__":
    settings = DatabaseSettings()
    db_manager = DatabaseManager(settings)
    
    if db_manager.test_connection():
        print("✅ Database connection successful!")
    else:
        print("❌ Database connection failed!")
EOF

    # TypeScript/Node.js configuration
    cat > "migration/database.config.ts" << 'EOF'
/**
 * Neon Database Configuration for Node.js/TypeScript
 */
import { neon } from '@neondatabase/serverless';
import { Pool } from '@neondatabase/serverless';

export interface DatabaseConfig {
  connectionString: string;
  directUrl?: string;
  poolSize?: number;
  maxConnections?: number;
  idleTimeout?: number;
  connectionTimeout?: number;
}

export class NeonDatabaseManager {
  private config: DatabaseConfig;
  private pool: Pool;
  private sql: any;

  constructor(config: DatabaseConfig) {
    this.config = {
      poolSize: 20,
      maxConnections: 30,
      idleTimeout: 30000,
      connectionTimeout: 10000,
      ...config
    };

    // Initialize connection pool
    this.pool = new Pool({
      connectionString: this.config.connectionString,
      max: this.config.maxConnections,
      idleTimeoutMillis: this.config.idleTimeout,
      connectionTimeoutMillis: this.config.connectionTimeout,
    });

    // Initialize serverless SQL client
    this.sql = neon(this.config.connectionString);
  }

  /**
   * Get SQL client for serverless usage
   */
  getSQL() {
    return this.sql;
  }

  /**
   * Get connection pool for traditional usage
   */
  getPool() {
    return this.pool;
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.sql`SELECT NOW() as current_time`;
      console.log('✅ Database connection successful!', result[0]);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  /**
   * Execute health check
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      await this.sql`SELECT 1 as health_check`;
      const endTime = Date.now();
      
      return {
        status: 'healthy',
        responseTime: endTime - startTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Close all connections
   */
  async close() {
    await this.pool.end();
  }
}

// Usage example
export const createDatabaseManager = () => {
  const config: DatabaseConfig = {
    connectionString: process.env.DATABASE_URL!,
    directUrl: process.env.DIRECT_URL,
  };
  
  return new NeonDatabaseManager(config);
};
EOF

    print_success "Sample configuration files created"
}

# Create migration utilities
create_migration_utilities() {
    print_step "Creating migration utilities..."
    
    cat > "migration/scripts/setup_schema.sql" << 'EOF'
-- Schema Setup Script for Neon Database Migration
-- This script prepares the database for the licitacoes platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create search configuration for Portuguese
CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS portuguese_unaccent (COPY = portuguese);
ALTER TEXT SEARCH CONFIGURATION portuguese_unaccent
    ALTER MAPPING FOR hword, hword_part, word
    WITH unaccent, portuguese_stem;

-- Create utility functions for CNPJ validation
CREATE OR REPLACE FUNCTION validate_cnpj(cnpj TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Basic format check (14 digits)
    IF cnpj !~ '^[0-9]{14}$' THEN
        RETURN FALSE;
    END IF;
    
    -- Additional CNPJ validation logic can be added here
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create utility function for email validation
CREATE OR REPLACE FUNCTION validate_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_cnpj(TEXT) IS 'Validates Brazilian CNPJ format';
COMMENT ON FUNCTION validate_email(TEXT) IS 'Validates email address format';
COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to update updated_at timestamp';
EOF

    cat > "migration/scripts/test_connection.py" << 'EOF'
#!/usr/bin/env python3
"""
Neon Database Connection Test Script
"""
import os
import sys
import asyncio
import asyncpg
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

async def test_asyncpg_connection():
    """Test connection using asyncpg"""
    print("Testing asyncpg connection...")
    
    try:
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            print("❌ DATABASE_URL not set")
            return False
        
        conn = await asyncpg.connect(database_url)
        
        # Test basic query
        result = await conn.fetchval('SELECT NOW()')
        print(f"✅ asyncpg connection successful! Current time: {result}")
        
        # Test transaction
        async with conn.transaction():
            await conn.execute('SELECT 1')
        print("✅ Transaction test successful")
        
        await conn.close()
        return True
        
    except Exception as e:
        print(f"❌ asyncpg connection failed: {e}")
        return False

def test_sqlalchemy_connection():
    """Test connection using SQLAlchemy"""
    print("\nTesting SQLAlchemy connection...")
    
    try:
        database_url = os.getenv('DIRECT_URL') or os.getenv('DATABASE_URL')
        if not database_url:
            print("❌ DATABASE_URL not set")
            return False
        
        engine = create_engine(database_url, echo=False)
        
        with engine.connect() as conn:
            result = conn.execute(text('SELECT NOW() as current_time'))
            current_time = result.fetchone()
            print(f"✅ SQLAlchemy connection successful! Current time: {current_time[0]}")
        
        # Test connection pool
        with engine.begin() as conn:
            conn.execute(text('SELECT 1'))
        print("✅ Transaction test successful")
        
        engine.dispose()
        return True
        
    except SQLAlchemyError as e:
        print(f"❌ SQLAlchemy connection failed: {e}")
        return False

async def main():
    """Main test function"""
    print("🧪 NEON DATABASE CONNECTION TESTS")
    print("================================")
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Test both connection methods
    asyncpg_success = await test_asyncpg_connection()
    sqlalchemy_success = test_sqlalchemy_connection()
    
    print("\n📊 TEST RESULTS")
    print("===============")
    print(f"asyncpg: {'✅ PASS' if asyncpg_success else '❌ FAIL'}")
    print(f"SQLAlchemy: {'✅ PASS' if sqlalchemy_success else '❌ FAIL'}")
    
    if asyncpg_success and sqlalchemy_success:
        print("\n🎉 All connection tests passed!")
        return 0
    else:
        print("\n⚠️  Some connection tests failed. Check your configuration.")
        return 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
EOF

    chmod +x migration/scripts/test_connection.py
    
    print_success "Migration utilities created"
}

# Main execution
main() {
    print_step "Starting Neon Database Setup..."
    
    # Create necessary directories
    mkdir -p config/environments
    mkdir -p migration/scripts
    
    # Execute setup steps
    check_neon_cli
    authenticate_neon
    create_project
    create_databases
    generate_connection_strings
    create_sample_config
    create_migration_utilities
    
    print_success "Neon Database setup completed successfully!"
    
    echo ""
    echo "📋 NEXT STEPS:"
    echo "=============="
    echo "1. Review the generated environment files in config/environments/"
    echo "2. Copy the appropriate .env file to your project root"
    echo "3. Install required dependencies:"
    echo "   - Python: pip install asyncpg sqlalchemy python-dotenv"
    echo "   - Node.js: npm install @neondatabase/serverless"
    echo "4. Test connections using: python migration/scripts/test_connection.py"
    echo "5. Run schema migrations (next step in the process)"
    echo ""
    echo "🔐 SECURITY NOTES:"
    echo "=================="
    echo "- Keep your database credentials secure"
    echo "- Use environment variables for sensitive data"
    echo "- Enable SSL connections in production"
    echo "- Regularly rotate database passwords"
    echo ""
}

# Run main function
main "$@"
EOF