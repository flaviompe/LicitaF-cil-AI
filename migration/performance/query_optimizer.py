#!/usr/bin/env python3
"""
Advanced Query Optimizer for SQLite to Neon Migration
Intelligent query analysis, optimization, and performance monitoring
"""

import logging
import time
import asyncio
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict
import json
import re
from enum import Enum

from sqlalchemy import text, func, inspect
from sqlalchemy.orm import Session
from sqlalchemy.engine import Engine
from sqlalchemy.sql import Select
from sqlalchemy.dialects import postgresql

logger = logging.getLogger(__name__)

class QueryType(Enum):
    """Types of queries for optimization strategies"""
    SELECT = "SELECT"
    INSERT = "INSERT"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    AGGREGATE = "AGGREGATE"
    JOIN = "JOIN"
    SEARCH = "SEARCH"
    ANALYTICS = "ANALYTICS"

class OptimizationLevel(Enum):
    """Levels of query optimization"""
    BASIC = "basic"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERIMENTAL = "experimental"

@dataclass
class QueryAnalysis:
    """Results of query performance analysis"""
    query: str
    query_type: QueryType
    execution_time: float
    rows_examined: Optional[int]
    rows_returned: Optional[int]
    cost_estimate: Optional[float]
    index_usage: List[str]
    optimization_suggestions: List[str]
    explain_plan: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class OptimizationResult:
    """Results of query optimization"""
    original_query: str
    optimized_query: str
    improvement_factor: float
    optimization_techniques: List[str]
    before_analysis: QueryAnalysis
    after_analysis: Optional[QueryAnalysis] = None

class QueryPatternMatcher:
    """Match and classify query patterns for optimization"""
    
    def __init__(self):
        self.patterns = {
            # N+1 Query patterns
            'n_plus_one': [
                r'SELECT.*FROM.*WHERE.*id\s*=\s*\$\d+',
                r'SELECT.*FROM.*WHERE.*id\s*IN\s*\(\s*\$\d+\s*\)'
            ],
            
            # Inefficient JOIN patterns
            'inefficient_join': [
                r'SELECT.*FROM.*JOIN.*ON.*LIKE',
                r'SELECT.*FROM.*WHERE.*EXISTS.*SELECT.*FROM.*WHERE.*LIKE'
            ],
            
            # Full table scan indicators
            'full_scan': [
                r'SELECT.*FROM.*WHERE.*LIKE\s*\'%.*%\'',
                r'SELECT.*FROM.*WHERE.*UPPER\(',
                r'SELECT.*FROM.*WHERE.*LOWER\('
            ],
            
            # Unoptimized aggregations
            'inefficient_aggregation': [
                r'SELECT.*COUNT\(\*\).*GROUP BY.*ORDER BY.*',
                r'SELECT.*SUM\(.*\).*WHERE.*NOT.*INDEX'
            ],
            
            # Date range queries without indexes
            'date_range_unoptimized': [
                r'SELECT.*WHERE.*created_at.*BETWEEN',
                r'SELECT.*WHERE.*DATE\(',
                r'SELECT.*WHERE.*EXTRACT\('
            ]
        }
    
    def identify_pattern(self, query: str) -> List[str]:
        """Identify optimization patterns in query"""
        normalized_query = query.upper().strip()
        identified_patterns = []
        
        for pattern_name, regexes in self.patterns.items():
            for regex in regexes:
                if re.search(regex, normalized_query, re.IGNORECASE):
                    identified_patterns.append(pattern_name)
                    break
        
        return identified_patterns
    
    def classify_query_type(self, query: str) -> QueryType:
        """Classify query type for optimization strategy"""
        normalized_query = query.upper().strip()
        
        if normalized_query.startswith('SELECT'):
            if any(agg in normalized_query for agg in ['COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'GROUP BY']):
                return QueryType.AGGREGATE
            elif 'JOIN' in normalized_query:
                return QueryType.JOIN
            elif any(search in normalized_query for search in ['LIKE', 'ILIKE', 'MATCH', 'TSVECTOR']):
                return QueryType.SEARCH
            elif any(analytics in normalized_query for analytics in ['WINDOW', 'PARTITION', 'OVER']):
                return QueryType.ANALYTICS
            else:
                return QueryType.SELECT
        elif normalized_query.startswith('INSERT'):
            return QueryType.INSERT
        elif normalized_query.startswith('UPDATE'):
            return QueryType.UPDATE
        elif normalized_query.startswith('DELETE'):
            return QueryType.DELETE
        else:
            return QueryType.SELECT

class QueryAnalyzer:
    """Analyze query performance and structure"""
    
    def __init__(self, engine: Engine):
        self.engine = engine
        self.pattern_matcher = QueryPatternMatcher()
    
    def analyze_query(self, query: str, params: Optional[Dict] = None) -> QueryAnalysis:
        """Comprehensive query analysis"""
        start_time = time.time()
        
        # Execute EXPLAIN ANALYZE
        explain_plan = self._get_explain_plan(query, params)
        
        # Extract performance metrics
        execution_time = time.time() - start_time
        cost_estimate = self._extract_cost_estimate(explain_plan)
        rows_examined = self._extract_rows_examined(explain_plan)
        rows_returned = self._extract_rows_returned(explain_plan)
        index_usage = self._extract_index_usage(explain_plan)
        
        # Generate optimization suggestions
        query_type = self.pattern_matcher.classify_query_type(query)
        patterns = self.pattern_matcher.identify_pattern(query)
        optimization_suggestions = self._generate_suggestions(
            query, query_type, patterns, explain_plan
        )
        
        return QueryAnalysis(
            query=query,
            query_type=query_type,
            execution_time=execution_time,
            rows_examined=rows_examined,
            rows_returned=rows_returned,
            cost_estimate=cost_estimate,
            index_usage=index_usage,
            optimization_suggestions=optimization_suggestions,
            explain_plan=explain_plan
        )
    
    def _get_explain_plan(self, query: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Get EXPLAIN ANALYZE plan for query"""
        try:
            with self.engine.connect() as conn:
                # Use EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) for detailed info
                explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}"
                result = conn.execute(text(explain_query), params or {})
                plan_data = result.fetchone()[0]
                return plan_data[0] if isinstance(plan_data, list) else plan_data
        except Exception as e:
            logger.error(f"Failed to get explain plan: {e}")
            return {}
    
    def _extract_cost_estimate(self, explain_plan: Dict) -> Optional[float]:
        """Extract cost estimate from explain plan"""
        try:
            if 'Plan' in explain_plan:
                return explain_plan['Plan'].get('Total Cost', 0.0)
        except Exception:
            pass
        return None
    
    def _extract_rows_examined(self, explain_plan: Dict) -> Optional[int]:
        """Extract rows examined from explain plan"""
        try:
            if 'Plan' in explain_plan:
                return explain_plan['Plan'].get('Plan Rows', 0)
        except Exception:
            pass
        return None
    
    def _extract_rows_returned(self, explain_plan: Dict) -> Optional[int]:
        """Extract actual rows returned from explain plan"""
        try:
            if 'Plan' in explain_plan:
                return explain_plan['Plan'].get('Actual Rows', 0)
        except Exception:
            pass
        return None
    
    def _extract_index_usage(self, explain_plan: Dict) -> List[str]:
        """Extract index usage information from explain plan"""
        indexes = []
        try:
            def extract_from_node(node):
                if isinstance(node, dict):
                    if node.get('Node Type') == 'Index Scan':
                        index_name = node.get('Index Name')
                        if index_name:
                            indexes.append(index_name)
                    elif node.get('Node Type') == 'Index Only Scan':
                        index_name = node.get('Index Name')
                        if index_name:
                            indexes.append(f"{index_name} (index-only)")
                    
                    # Recursively check child plans
                    for key, value in node.items():
                        if key == 'Plans' and isinstance(value, list):
                            for plan in value:
                                extract_from_node(plan)
                        elif isinstance(value, dict):
                            extract_from_node(value)
            
            if 'Plan' in explain_plan:
                extract_from_node(explain_plan['Plan'])
                
        except Exception as e:
            logger.error(f"Failed to extract index usage: {e}")
        
        return indexes
    
    def _generate_suggestions(self, query: str, query_type: QueryType, 
                            patterns: List[str], explain_plan: Dict) -> List[str]:
        """Generate optimization suggestions based on analysis"""
        suggestions = []
        
        # Pattern-based suggestions
        if 'n_plus_one' in patterns:
            suggestions.append("Consider using JOIN or IN clause to avoid N+1 query pattern")
            suggestions.append("Use eager loading or batch fetching for related data")
        
        if 'inefficient_join' in patterns:
            suggestions.append("Optimize JOIN conditions - avoid LIKE in JOIN clauses")
            suggestions.append("Consider adding indexes on JOIN columns")
        
        if 'full_scan' in patterns:
            suggestions.append("Avoid leading wildcards in LIKE clauses")
            suggestions.append("Consider full-text search for text matching")
            suggestions.append("Add functional indexes for UPPER/LOWER operations")
        
        if 'inefficient_aggregation' in patterns:
            suggestions.append("Consider partial indexes for filtered aggregations")
            suggestions.append("Use materialized views for complex aggregations")
        
        if 'date_range_unoptimized' in patterns:
            suggestions.append("Add indexes on date columns used in range queries")
            suggestions.append("Consider partitioning for large date-based tables")
        
        # Explain plan based suggestions
        if explain_plan:
            plan = explain_plan.get('Plan', {})
            node_type = plan.get('Node Type', '')
            
            if 'Seq Scan' in node_type:
                suggestions.append("Sequential scan detected - consider adding appropriate indexes")
            
            if plan.get('Actual Rows', 0) > plan.get('Plan Rows', 0) * 10:
                suggestions.append("Cardinality estimation is off - consider running ANALYZE on tables")
            
            if plan.get('Actual Time', [0, 0])[1] > 100:  # Execution time > 100ms
                suggestions.append("Long execution time - consider query optimization")
        
        # Query type specific suggestions
        if query_type == QueryType.AGGREGATE:
            suggestions.append("Consider using partial indexes for filtered aggregations")
            suggestions.append("Evaluate if materialized views would benefit repeated aggregations")
        
        elif query_type == QueryType.JOIN:
            suggestions.append("Ensure JOIN columns are properly indexed")
            suggestions.append("Consider the order of JOINs - start with most selective")
        
        elif query_type == QueryType.SEARCH:
            suggestions.append("Use PostgreSQL full-text search for text searches")
            suggestions.append("Consider GIN indexes for array and JSONB searches")
        
        return list(set(suggestions))  # Remove duplicates

class QueryOptimizer:
    """Optimize queries using various techniques"""
    
    def __init__(self, engine: Engine, analyzer: QueryAnalyzer):
        self.engine = engine
        self.analyzer = analyzer
        self.optimization_rules = self._load_optimization_rules()
    
    def _load_optimization_rules(self) -> Dict[str, callable]:
        """Load query optimization rules"""
        return {
            'eliminate_subqueries': self._eliminate_unnecessary_subqueries,
            'optimize_joins': self._optimize_join_order,
            'add_limits': self._add_missing_limits,
            'optimize_where_clauses': self._optimize_where_clauses,
            'convert_to_exists': self._convert_in_to_exists,
            'optimize_aggregations': self._optimize_aggregation_queries,
            'add_index_hints': self._add_index_hints
        }
    
    def optimize_query(self, query: str, params: Optional[Dict] = None,
                      level: OptimizationLevel = OptimizationLevel.INTERMEDIATE) -> OptimizationResult:
        """Optimize a query using various techniques"""
        
        # Analyze original query
        before_analysis = self.analyzer.analyze_query(query, params)
        
        # Apply optimization rules
        optimized_query = query
        applied_techniques = []
        
        # Select optimization rules based on level
        rules_to_apply = self._select_rules_by_level(level)
        
        for rule_name in rules_to_apply:
            if rule_name in self.optimization_rules:
                try:
                    new_query = self.optimization_rules[rule_name](optimized_query)
                    if new_query != optimized_query:
                        optimized_query = new_query
                        applied_techniques.append(rule_name)
                except Exception as e:
                    logger.warning(f"Failed to apply optimization rule {rule_name}: {e}")
        
        # Analyze optimized query if changes were made
        after_analysis = None
        improvement_factor = 1.0
        
        if applied_techniques:
            try:
                after_analysis = self.analyzer.analyze_query(optimized_query, params)
                
                # Calculate improvement factor
                if (before_analysis.execution_time > 0 and 
                    after_analysis.execution_time > 0):
                    improvement_factor = (before_analysis.execution_time / 
                                        after_analysis.execution_time)
            except Exception as e:
                logger.error(f"Failed to analyze optimized query: {e}")
        
        return OptimizationResult(
            original_query=query,
            optimized_query=optimized_query,
            improvement_factor=improvement_factor,
            optimization_techniques=applied_techniques,
            before_analysis=before_analysis,
            after_analysis=after_analysis
        )
    
    def _select_rules_by_level(self, level: OptimizationLevel) -> List[str]:
        """Select optimization rules based on optimization level"""
        basic_rules = ['add_limits', 'optimize_where_clauses']
        intermediate_rules = basic_rules + ['eliminate_subqueries', 'convert_to_exists']
        advanced_rules = intermediate_rules + ['optimize_joins', 'optimize_aggregations']
        experimental_rules = advanced_rules + ['add_index_hints']
        
        if level == OptimizationLevel.BASIC:
            return basic_rules
        elif level == OptimizationLevel.INTERMEDIATE:
            return intermediate_rules
        elif level == OptimizationLevel.ADVANCED:
            return advanced_rules
        else:  # EXPERIMENTAL
            return experimental_rules
    
    def _eliminate_unnecessary_subqueries(self, query: str) -> str:
        """Eliminate unnecessary subqueries"""
        # Simple subquery elimination patterns
        patterns = [
            # SELECT * FROM (SELECT ...) -> SELECT ...
            (r'SELECT \* FROM \(SELECT (.+?)\) AS \w+', r'SELECT \1'),
            
            # WHERE col IN (SELECT col FROM ...) -> EXISTS pattern where applicable
            (r'WHERE (\w+) IN \(SELECT (\w+) FROM (\w+) WHERE (.+?)\)',
             r'WHERE EXISTS (SELECT 1 FROM \3 WHERE \2 = \1 AND \4)')
        ]
        
        optimized = query
        for pattern, replacement in patterns:
            optimized = re.sub(pattern, replacement, optimized, flags=re.IGNORECASE)
        
        return optimized
    
    def _optimize_join_order(self, query: str) -> str:
        """Optimize JOIN order (basic implementation)"""
        # This is a simplified implementation
        # In practice, this would require more sophisticated analysis
        return query
    
    def _add_missing_limits(self, query: str) -> str:
        """Add LIMIT clauses where appropriate"""
        # Add LIMIT to SELECT queries without it (if they're not aggregations)
        if (re.search(r'^SELECT', query, re.IGNORECASE) and 
            not re.search(r'LIMIT|GROUP BY|HAVING', query, re.IGNORECASE)):
            # Add a reasonable default limit
            return f"{query.rstrip(';')} LIMIT 1000"
        
        return query
    
    def _optimize_where_clauses(self, query: str) -> str:
        """Optimize WHERE clauses"""
        # Convert LIKE '%value' to LIKE 'value%' where possible
        patterns = [
            # Remove leading wildcards where they might not be necessary
            (r"LIKE\s+'%(\w+)'", r"LIKE '\1%'"),
            
            # Optimize case-insensitive comparisons
            (r"UPPER\((\w+)\)\s*=\s*'(\w+)'", r"\1 ILIKE '\2'"),
            (r"LOWER\((\w+)\)\s*=\s*'(\w+)'", r"\1 ILIKE '\2'")
        ]
        
        optimized = query
        for pattern, replacement in patterns:
            optimized = re.sub(pattern, replacement, optimized, flags=re.IGNORECASE)
        
        return optimized
    
    def _convert_in_to_exists(self, query: str) -> str:
        """Convert IN subqueries to EXISTS where beneficial"""
        # This is a simplified implementation
        # Pattern: WHERE col IN (SELECT col2 FROM table2 WHERE condition)
        # Convert to: WHERE EXISTS (SELECT 1 FROM table2 WHERE table2.col2 = table1.col AND condition)
        
        return query
    
    def _optimize_aggregation_queries(self, query: str) -> str:
        """Optimize aggregation queries"""
        # Add specific optimizations for GROUP BY and aggregation queries
        return query
    
    def _add_index_hints(self, query: str) -> str:
        """Add index hints where beneficial (PostgreSQL specific)"""
        # PostgreSQL doesn't have explicit index hints like MySQL,
        # but we can restructure queries to encourage index usage
        return query

class QueryPerformanceMonitor:
    """Monitor query performance over time"""
    
    def __init__(self, engine: Engine):
        self.engine = engine
        self.slow_query_log = []
        self.query_stats = defaultdict(list)
    
    def monitor_query(self, query: str, execution_time: float, 
                     result_count: Optional[int] = None):
        """Record query performance metrics"""
        query_hash = hash(query)
        
        stats = {
            'query': query,
            'execution_time': execution_time,
            'result_count': result_count,
            'timestamp': datetime.now()
        }
        
        self.query_stats[query_hash].append(stats)
        
        # Log slow queries
        if execution_time > 1.0:  # Queries taking more than 1 second
            self.slow_query_log.append(stats)
    
    def get_slow_queries(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get slowest queries"""
        sorted_queries = sorted(self.slow_query_log, 
                              key=lambda x: x['execution_time'], 
                              reverse=True)
        return sorted_queries[:limit]
    
    def get_query_statistics(self) -> Dict[str, Any]:
        """Get overall query statistics"""
        total_queries = sum(len(stats) for stats in self.query_stats.values())
        if total_queries == 0:
            return {}
        
        all_times = []
        for stats_list in self.query_stats.values():
            all_times.extend([s['execution_time'] for s in stats_list])
        
        return {
            'total_queries': total_queries,
            'unique_queries': len(self.query_stats),
            'avg_execution_time': sum(all_times) / len(all_times),
            'max_execution_time': max(all_times),
            'min_execution_time': min(all_times),
            'slow_queries_count': len(self.slow_query_log),
            'p95_execution_time': sorted(all_times)[int(len(all_times) * 0.95)] if all_times else 0
        }
    
    def analyze_query_patterns(self) -> Dict[str, Any]:
        """Analyze patterns in query execution"""
        patterns = {
            'most_frequent_queries': [],
            'consistently_slow_queries': [],
            'performance_degradation': []
        }
        
        # Most frequent queries
        query_counts = [(len(stats), stats[0]['query'][:100]) 
                       for stats in self.query_stats.values()]
        patterns['most_frequent_queries'] = sorted(query_counts, reverse=True)[:5]
        
        # Consistently slow queries
        for stats_list in self.query_stats.values():
            if len(stats_list) >= 3:  # At least 3 executions
                avg_time = sum(s['execution_time'] for s in stats_list) / len(stats_list)
                if avg_time > 0.5:  # Average > 500ms
                    patterns['consistently_slow_queries'].append({
                        'query': stats_list[0]['query'][:100],
                        'avg_time': avg_time,
                        'execution_count': len(stats_list)
                    })
        
        return patterns

class OpportunityQueryOptimizer:
    """Specialized optimizer for Licitações platform queries"""
    
    def __init__(self, engine: Engine):
        self.engine = engine
        self.analyzer = QueryAnalyzer(engine)
        self.optimizer = QueryOptimizer(engine, self.analyzer)
    
    def get_optimized_opportunity_search(self, 
                                       keywords: List[str] = None,
                                       state: str = None,
                                       modality: str = None,
                                       min_value: float = None,
                                       max_value: float = None,
                                       limit: int = 50) -> str:
        """Generate optimized opportunity search query"""
        
        base_query = """
        SELECT 
            o.id,
            o.title,
            o.organ,
            o.estimated_value,
            o.publish_date,
            o.closing_date,
            o.modality,
            o.status,
            ts_rank(o.search_vector, query) as rank
        FROM opportunities o,
             to_tsquery('portuguese', %(search_terms)s) query
        WHERE 1=1
        """
        
        conditions = []
        
        # Add search condition
        if keywords:
            conditions.append("o.search_vector @@ query")
        
        # Add filters
        if state:
            conditions.append("o.state = %(state)s")
        
        if modality:
            conditions.append("o.modality = %(modality)s")
        
        if min_value:
            conditions.append("o.estimated_value >= %(min_value)s")
        
        if max_value:
            conditions.append("o.estimated_value <= %(max_value)s")
        
        # Add active status filter
        conditions.append("o.status IN ('PUBLISHED', 'OPEN', 'BIDDING')")
        
        # Build complete query
        if conditions:
            base_query += " AND " + " AND ".join(conditions)
        
        # Add ordering and limit
        if keywords:
            base_query += " ORDER BY rank DESC, o.publish_date DESC"
        else:
            base_query += " ORDER BY o.publish_date DESC"
        
        base_query += f" LIMIT {limit}"
        
        return base_query
    
    def get_optimized_user_dashboard_query(self, user_id: str) -> str:
        """Generate optimized user dashboard query"""
        
        return """
        WITH user_stats AS (
            SELECT 
                COUNT(*) as total_proposals,
                COUNT(CASE WHEN status = 'WINNER' THEN 1 END) as won_proposals,
                AVG(final_score) as avg_score,
                MAX(created_at) as last_proposal_date
            FROM proposals 
            WHERE user_id = %(user_id)s
                AND created_at > CURRENT_DATE - INTERVAL '90 days'
        ),
        recent_opportunities AS (
            SELECT COUNT(*) as tracked_opportunities
            FROM opportunities o
            JOIN procurement_monitors pm ON (
                pm.user_id = %(user_id)s
                AND pm.is_active = true
                AND (
                    o.keywords && pm.keywords
                    OR o.state = ANY(pm.regions)
                )
            )
            WHERE o.created_at > CURRENT_DATE - INTERVAL '7 days'
        )
        SELECT 
            us.*,
            ro.tracked_opportunities,
            CASE 
                WHEN us.total_proposals > 0 
                THEN ROUND((us.won_proposals * 100.0 / us.total_proposals), 2)
                ELSE 0 
            END as win_rate_percentage
        FROM user_stats us, recent_opportunities ro
        """
    
    def get_optimized_analytics_query(self, date_range_days: int = 30) -> str:
        """Generate optimized analytics query"""
        
        return f"""
        SELECT 
            DATE_TRUNC('day', publish_date) as day,
            modality,
            state,
            COUNT(*) as opportunity_count,
            SUM(estimated_value) as total_value,
            AVG(estimated_value) as avg_value,
            COUNT(DISTINCT organ) as unique_organs
        FROM opportunities
        WHERE publish_date >= CURRENT_DATE - INTERVAL '{date_range_days} days'
            AND status != 'CANCELLED'
            AND estimated_value > 0
        GROUP BY DATE_TRUNC('day', publish_date), modality, state
        ORDER BY day DESC, total_value DESC
        """

# Factory function
def create_query_optimizer(engine: Engine) -> OpportunityQueryOptimizer:
    """Create configured query optimizer for the platform"""
    return OpportunityQueryOptimizer(engine)

# Example usage and testing
if __name__ == "__main__":
    from sqlalchemy import create_engine
    import os
    
    # Example usage
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost/dbname")
    engine = create_engine(DATABASE_URL)
    
    # Create optimizer
    optimizer = create_query_optimizer(engine)
    
    # Example optimization
    sample_query = """
    SELECT * FROM opportunities 
    WHERE title LIKE '%software%' 
    AND created_at > '2024-01-01'
    """
    
    # Analyze query
    analyzer = QueryAnalyzer(engine)
    analysis = analyzer.analyze_query(sample_query)
    
    print("Query Analysis:")
    print(f"Query Type: {analysis.query_type}")
    print(f"Execution Time: {analysis.execution_time:.3f}s")
    print(f"Cost Estimate: {analysis.cost_estimate}")
    print("Optimization Suggestions:")
    for suggestion in analysis.optimization_suggestions:
        print(f"  - {suggestion}")
    
    # Optimize query
    query_optimizer = QueryOptimizer(engine, analyzer)
    optimization_result = query_optimizer.optimize_query(sample_query)
    
    print(f"\nOptimization Result:")
    print(f"Improvement Factor: {optimization_result.improvement_factor:.2f}x")
    print(f"Applied Techniques: {optimization_result.optimization_techniques}")
    print(f"Optimized Query: {optimization_result.optimized_query}")