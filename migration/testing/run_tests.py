#!/usr/bin/env python3
"""
Test runner script for SQLite to Neon migration testing
Provides different test execution modes and reporting
"""

import sys
import os
import argparse
import subprocess
from pathlib import Path
import logging
from typing import List, Optional

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MigrationTestRunner:
    """Test runner for migration testing with different modes and options"""
    
    def __init__(self, test_dir: Path = None):
        self.test_dir = test_dir or Path(__file__).parent
        self.base_cmd = ["python", "-m", "pytest"]
    
    def run_unit_tests(self, verbose: bool = True, coverage: bool = False) -> int:
        """Run unit tests"""
        logger.info("🧪 Running unit tests...")
        
        cmd = self.base_cmd.copy()
        cmd.extend([
            str(self.test_dir / "test_database_schema.py"),
            "-m", "not integration and not performance and not slow"
        ])
        
        if verbose:
            cmd.append("-v")
        
        if coverage:
            cmd.extend(["--cov=migration", "--cov-report=term-missing"])
        
        return subprocess.run(cmd).returncode
    
    def run_integration_tests(self, verbose: bool = True) -> int:
        """Run integration tests"""
        logger.info("🔗 Running integration tests...")
        
        cmd = self.base_cmd.copy()
        cmd.extend([
            str(self.test_dir / "test_integration.py"),
            "-m", "integration"
        ])
        
        if verbose:
            cmd.append("-v")
        
        return subprocess.run(cmd).returncode
    
    def run_performance_tests(self, verbose: bool = True, slow: bool = False) -> int:
        """Run performance tests"""
        logger.info("⚡ Running performance tests...")
        
        cmd = self.base_cmd.copy()
        cmd.extend([
            str(self.test_dir / "test_performance.py"),
            "-m", "performance"
        ])
        
        if not slow:
            cmd.extend(["-m", "performance and not slow"])
        else:
            cmd.append("--runslow")
        
        if verbose:
            cmd.append("-v")
        
        return subprocess.run(cmd).returncode
    
    def run_database_tests(self, verbose: bool = True) -> int:
        """Run all database-related tests"""
        logger.info("🗄️ Running database tests...")
        
        cmd = self.base_cmd.copy()
        cmd.extend([
            str(self.test_dir / "test_database_schema.py"),
            "-m", "database"
        ])
        
        if verbose:
            cmd.append("-v")
        
        return subprocess.run(cmd).returncode
    
    def run_all_tests(self, verbose: bool = True, coverage: bool = False, 
                     parallel: bool = False, slow: bool = False) -> int:
        """Run all tests"""
        logger.info("🚀 Running all tests...")
        
        cmd = self.base_cmd.copy()
        cmd.append(str(self.test_dir))
        
        if not slow:
            cmd.extend(["-m", "not slow"])
        else:
            cmd.append("--runslow")
        
        if verbose:
            cmd.append("-v")
        
        if coverage:
            cmd.extend([
                "--cov=migration", 
                "--cov-report=html",
                "--cov-report=term-missing",
                "--cov-fail-under=80"
            ])
        
        if parallel:
            cmd.extend(["-n", "auto"])  # Use pytest-xdist
        
        return subprocess.run(cmd).returncode
    
    def run_smoke_tests(self) -> int:
        """Run quick smoke tests to verify basic functionality"""
        logger.info("💨 Running smoke tests...")
        
        cmd = self.base_cmd.copy()
        cmd.extend([
            str(self.test_dir / "test_database_schema.py::TestDatabaseSchema::test_all_required_tables_exist"),
            str(self.test_dir / "test_database_schema.py::TestDatabaseSchema::test_enum_types_created"),
            str(self.test_dir / "test_performance.py::TestDatabasePerformance::test_connection_establishment_time"),
            "-v"
        ])
        
        return subprocess.run(cmd).returncode
    
    def run_migration_verification(self) -> int:
        """Run migration-specific verification tests"""
        logger.info("📋 Running migration verification tests...")
        
        # Run key migration verification tests
        test_cases = [
            "test_database_schema.py::TestDatabaseSchema::test_all_required_tables_exist",
            "test_database_schema.py::TestDatabaseSchema::test_enum_types_created",
            "test_database_schema.py::TestDatabaseSchema::test_critical_indexes_exist",
            "test_database_schema.py::TestDataTypes::test_uuid_primary_keys",
            "test_database_schema.py::TestDataTypes::test_jsonb_columns",
            "test_performance.py::TestDatabasePerformance::test_connection_establishment_time",
        ]
        
        cmd = self.base_cmd.copy()
        for test_case in test_cases:
            cmd.append(str(self.test_dir / test_case))
        
        cmd.extend(["-v", "--tb=short"])
        
        return subprocess.run(cmd).returncode
    
    def generate_test_report(self, output_dir: Path = None) -> int:
        """Generate comprehensive test report"""
        output_dir = output_dir or Path("test_reports")
        output_dir.mkdir(exist_ok=True)
        
        logger.info(f"📊 Generating test report in {output_dir}...")
        
        cmd = self.base_cmd.copy()
        cmd.extend([
            str(self.test_dir),
            "-v",
            "--html=" + str(output_dir / "report.html"),
            "--self-contained-html",
            "--cov=migration",
            "--cov-report=html:" + str(output_dir / "coverage"),
            "--junit-xml=" + str(output_dir / "junit.xml"),
            "-m", "not slow"
        ])
        
        return subprocess.run(cmd).returncode

def setup_test_environment():
    """Setup test environment variables and dependencies"""
    logger.info("🔧 Setting up test environment...")
    
    # Set test environment variables
    os.environ["TESTING"] = "1"
    os.environ["LOG_LEVEL"] = "INFO"
    
    # Use test database URL if not set
    if "TEST_DATABASE_URL" not in os.environ:
        os.environ["TEST_DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/test_licitacoes"
    
    logger.info("Test environment configured")

def main():
    """Main test runner entry point"""
    parser = argparse.ArgumentParser(description="SQLite to Neon Migration Test Runner")
    
    # Test type selection
    parser.add_argument("--unit", action="store_true", help="Run unit tests only")
    parser.add_argument("--integration", action="store_true", help="Run integration tests only")
    parser.add_argument("--performance", action="store_true", help="Run performance tests only")
    parser.add_argument("--database", action="store_true", help="Run database tests only")
    parser.add_argument("--smoke", action="store_true", help="Run smoke tests only")
    parser.add_argument("--migration-verify", action="store_true", help="Run migration verification")
    parser.add_argument("--all", action="store_true", help="Run all tests (default)")
    
    # Test execution options
    parser.add_argument("-v", "--verbose", action="store_true", default=True, help="Verbose output")
    parser.add_argument("--coverage", action="store_true", help="Generate code coverage report")
    parser.add_argument("--parallel", action="store_true", help="Run tests in parallel")
    parser.add_argument("--slow", action="store_true", help="Include slow tests")
    parser.add_argument("--report", action="store_true", help="Generate HTML test report")
    
    # Test environment options
    parser.add_argument("--testcontainers", action="store_true", 
                       help="Use testcontainers for isolated testing")
    parser.add_argument("--test-db-url", help="Test database URL")
    
    args = parser.parse_args()
    
    # Setup environment
    setup_test_environment()
    
    if args.testcontainers:
        os.environ["USE_TESTCONTAINERS"] = "true"
    
    if args.test_db_url:
        os.environ["TEST_DATABASE_URL"] = args.test_db_url
    
    # Create test runner
    runner = MigrationTestRunner()
    
    # Determine which tests to run
    exit_code = 0
    
    if args.smoke:
        exit_code = runner.run_smoke_tests()
    elif args.unit:
        exit_code = runner.run_unit_tests(args.verbose, args.coverage)
    elif args.integration:
        exit_code = runner.run_integration_tests(args.verbose)
    elif args.performance:
        exit_code = runner.run_performance_tests(args.verbose, args.slow)
    elif args.database:
        exit_code = runner.run_database_tests(args.verbose)
    elif args.migration_verify:
        exit_code = runner.run_migration_verification()
    elif args.report:
        exit_code = runner.generate_test_report()
    else:
        # Run all tests by default
        exit_code = runner.run_all_tests(
            verbose=args.verbose,
            coverage=args.coverage,
            parallel=args.parallel,
            slow=args.slow
        )
    
    if exit_code == 0:
        logger.info("✅ All tests passed successfully!")
    else:
        logger.error(f"❌ Tests failed with exit code {exit_code}")
    
    return exit_code

if __name__ == "__main__":
    sys.exit(main())