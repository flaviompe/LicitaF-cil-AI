#!/usr/bin/env python3
"""
Progress Tracking Utilities for Migration
Tracks and reports progress of migration operations
"""

import json
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from pathlib import Path
import threading

logger = logging.getLogger(__name__)

@dataclass
class TaskProgress:
    """Progress information for a migration task"""
    task_id: str
    task_name: str
    status: str  # pending, running, completed, failed
    progress_percentage: float
    current_step: str
    total_items: int
    processed_items: int
    errors: int
    warnings: int
    start_time: datetime
    end_time: Optional[datetime] = None
    estimated_completion: Optional[datetime] = None
    last_update: datetime = None
    details: Dict[str, Any] = None

class ProgressTracker:
    """Progress tracker for migration operations"""
    
    def __init__(self, output_dir: str = "migration/progress"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.tasks: Dict[str, TaskProgress] = {}
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self._lock = threading.Lock()
        
        # Progress file path
        self.progress_file = self.output_dir / f"migration_progress_{self.session_id}.json"
        
        logger.info(f"Progress tracker initialized: {self.progress_file}")
    
    def start_task(self, task_id: str, task_name: str, total_items: int = 0, 
                   details: Optional[Dict[str, Any]] = None) -> None:
        """Start tracking a new task"""
        with self._lock:
            self.tasks[task_id] = TaskProgress(
                task_id=task_id,
                task_name=task_name,
                status="running",
                progress_percentage=0.0,
                current_step="Starting",
                total_items=total_items,
                processed_items=0,
                errors=0,
                warnings=0,
                start_time=datetime.now(),
                last_update=datetime.now(),
                details=details or {}
            )
            
            logger.info(f"Started tracking task: {task_id} - {task_name}")
            self._save_progress()
    
    def update_progress(self, task_id: str, progress_percentage: float = None,
                       current_step: str = None, processed_items: int = None,
                       errors: int = None, warnings: int = None,
                       details: Optional[Dict[str, Any]] = None) -> None:
        """Update progress for a task"""
        with self._lock:
            if task_id not in self.tasks:
                logger.warning(f"Task {task_id} not found for progress update")
                return
            
            task = self.tasks[task_id]
            
            # Update fields if provided
            if progress_percentage is not None:
                task.progress_percentage = min(100.0, max(0.0, progress_percentage))
            
            if current_step is not None:
                task.current_step = current_step
            
            if processed_items is not None:
                task.processed_items = processed_items
                # Calculate progress if total_items is known
                if task.total_items > 0:
                    task.progress_percentage = (processed_items / task.total_items) * 100
            
            if errors is not None:
                task.errors = errors
            
            if warnings is not None:
                task.warnings = warnings
            
            if details:
                task.details.update(details)
            
            # Update timestamps and estimates
            task.last_update = datetime.now()
            
            # Estimate completion time
            if task.progress_percentage > 0 and task.progress_percentage < 100:
                elapsed = (task.last_update - task.start_time).total_seconds()
                estimated_total = elapsed / (task.progress_percentage / 100)
                task.estimated_completion = task.start_time + timedelta(seconds=estimated_total)
            
            self._save_progress()
    
    def complete_task(self, task_id: str, status: str = "completed", 
                     final_details: Optional[Dict[str, Any]] = None) -> None:
        """Mark a task as completed"""
        with self._lock:
            if task_id not in self.tasks:
                logger.warning(f"Task {task_id} not found for completion")
                return
            
            task = self.tasks[task_id]
            task.status = status
            task.progress_percentage = 100.0 if status == "completed" else task.progress_percentage
            task.end_time = datetime.now()
            task.estimated_completion = None
            task.current_step = "Completed" if status == "completed" else "Failed"
            
            if final_details:
                task.details.update(final_details)
            
            logger.info(f"Task completed: {task_id} - Status: {status}")
            self._save_progress()
    
    def fail_task(self, task_id: str, error_message: str, 
                 final_details: Optional[Dict[str, Any]] = None) -> None:
        """Mark a task as failed"""
        details = final_details or {}
        details['error_message'] = error_message
        
        self.complete_task(task_id, "failed", details)
        logger.error(f"Task failed: {task_id} - {error_message}")
    
    def get_task_progress(self, task_id: str) -> Optional[TaskProgress]:
        """Get progress for a specific task"""
        with self._lock:
            return self.tasks.get(task_id)
    
    def get_all_progress(self) -> Dict[str, TaskProgress]:
        """Get progress for all tasks"""
        with self._lock:
            return self.tasks.copy()
    
    def get_overall_progress(self) -> Dict[str, Any]:
        """Get overall migration progress"""
        with self._lock:
            if not self.tasks:
                return {
                    'total_tasks': 0,
                    'completed_tasks': 0,
                    'running_tasks': 0,
                    'failed_tasks': 0,
                    'overall_percentage': 0.0,
                    'total_errors': 0,
                    'total_warnings': 0
                }
            
            total_tasks = len(self.tasks)
            completed_tasks = sum(1 for task in self.tasks.values() if task.status == "completed")
            running_tasks = sum(1 for task in self.tasks.values() if task.status == "running")
            failed_tasks = sum(1 for task in self.tasks.values() if task.status == "failed")
            
            # Calculate weighted overall percentage
            if total_tasks > 0:
                overall_percentage = sum(task.progress_percentage for task in self.tasks.values()) / total_tasks
            else:
                overall_percentage = 0.0
            
            total_errors = sum(task.errors for task in self.tasks.values())
            total_warnings = sum(task.warnings for task in self.tasks.values())
            
            # Calculate estimated completion
            running_tasks_list = [task for task in self.tasks.values() if task.status == "running"]
            estimated_completion = None
            
            if running_tasks_list:
                estimates = [task.estimated_completion for task in running_tasks_list 
                           if task.estimated_completion]
                if estimates:
                    estimated_completion = max(estimates)
            
            return {
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'running_tasks': running_tasks,
                'failed_tasks': failed_tasks,
                'pending_tasks': total_tasks - completed_tasks - running_tasks - failed_tasks,
                'overall_percentage': overall_percentage,
                'total_errors': total_errors,
                'total_warnings': total_warnings,
                'estimated_completion': estimated_completion,
                'session_id': self.session_id
            }
    
    def print_progress_report(self, detailed: bool = False) -> None:
        """Print a progress report to console"""
        overall = self.get_overall_progress()
        
        print("\n" + "="*60)
        print("MIGRATION PROGRESS REPORT")
        print("="*60)
        
        print(f"Session ID: {overall['session_id']}")
        print(f"Overall Progress: {overall['overall_percentage']:.1f}%")
        print(f"Tasks: {overall['completed_tasks']}/{overall['total_tasks']} completed")
        
        if overall['running_tasks'] > 0:
            print(f"Running Tasks: {overall['running_tasks']}")
        
        if overall['failed_tasks'] > 0:
            print(f"Failed Tasks: {overall['failed_tasks']}")
        
        if overall['total_errors'] > 0:
            print(f"Total Errors: {overall['total_errors']}")
        
        if overall['total_warnings'] > 0:
            print(f"Total Warnings: {overall['total_warnings']}")
        
        if overall['estimated_completion']:
            eta = overall['estimated_completion'].strftime("%H:%M:%S")
            print(f"Estimated Completion: {eta}")
        
        if detailed:
            print("\nTask Details:")
            print("-" * 60)
            
            for task in self.tasks.values():
                status_emoji = {
                    'completed': '✅',
                    'running': '🔄',
                    'failed': '❌',
                    'pending': '⏳'
                }.get(task.status, '❓')
                
                print(f"{status_emoji} {task.task_name}")
                print(f"   Progress: {task.progress_percentage:.1f}%")
                print(f"   Status: {task.status}")
                
                if task.total_items > 0:
                    print(f"   Items: {task.processed_items:,}/{task.total_items:,}")
                
                if task.errors > 0:
                    print(f"   Errors: {task.errors}")
                
                if task.warnings > 0:
                    print(f"   Warnings: {task.warnings}")
                
                if task.status == "running" and task.estimated_completion:
                    eta = task.estimated_completion.strftime("%H:%M:%S")
                    print(f"   ETA: {eta}")
                
                print()
        
        print("="*60)
    
    def _save_progress(self) -> None:
        """Save progress to file"""
        try:
            # Convert tasks to serializable format
            serializable_tasks = {}
            for task_id, task in self.tasks.items():
                task_dict = asdict(task)
                # Convert datetime objects to ISO format
                for field in ['start_time', 'end_time', 'estimated_completion', 'last_update']:
                    if task_dict[field]:
                        task_dict[field] = task_dict[field].isoformat()
                
                serializable_tasks[task_id] = task_dict
            
            progress_data = {
                'session_id': self.session_id,
                'last_updated': datetime.now().isoformat(),
                'overall_progress': self.get_overall_progress(),
                'tasks': serializable_tasks
            }
            
            # Handle datetime in overall_progress
            if progress_data['overall_progress']['estimated_completion']:
                progress_data['overall_progress']['estimated_completion'] = \
                    progress_data['overall_progress']['estimated_completion'].isoformat()
            
            with open(self.progress_file, 'w') as f:
                json.dump(progress_data, f, indent=2, default=str)
                
        except Exception as e:
            logger.warning(f"Failed to save progress file: {e}")
    
    def load_progress(self, progress_file: Optional[Path] = None) -> bool:
        """Load progress from file"""
        file_path = progress_file or self.progress_file
        
        try:
            with open(file_path, 'r') as f:
                progress_data = json.load(f)
            
            self.session_id = progress_data.get('session_id', self.session_id)
            
            # Load tasks
            tasks_data = progress_data.get('tasks', {})
            self.tasks.clear()
            
            for task_id, task_dict in tasks_data.items():
                # Convert ISO format back to datetime objects
                for field in ['start_time', 'end_time', 'estimated_completion', 'last_update']:
                    if task_dict[field]:
                        task_dict[field] = datetime.fromisoformat(task_dict[field])
                
                self.tasks[task_id] = TaskProgress(**task_dict)
            
            logger.info(f"Loaded progress from: {file_path}")
            return True
            
        except Exception as e:
            logger.warning(f"Failed to load progress file: {e}")
            return False
    
    def export_report(self, output_file: Optional[Path] = None) -> Path:
        """Export detailed progress report"""
        if not output_file:
            output_file = self.output_dir / f"migration_report_{self.session_id}.json"
        
        overall = self.get_overall_progress()
        
        report = {
            'migration_summary': overall,
            'task_details': [],
            'generated_at': datetime.now().isoformat()
        }
        
        # Add detailed task information
        for task in self.tasks.values():
            task_dict = asdict(task)
            
            # Calculate duration
            if task.end_time:
                duration = (task.end_time - task.start_time).total_seconds()
            else:
                duration = (datetime.now() - task.start_time).total_seconds()
            
            task_dict['duration_seconds'] = duration
            
            # Calculate processing rate
            if duration > 0 and task.processed_items > 0:
                task_dict['items_per_second'] = task.processed_items / duration
            else:
                task_dict['items_per_second'] = 0
            
            # Convert datetime to ISO format
            for field in ['start_time', 'end_time', 'estimated_completion', 'last_update']:
                if task_dict[field]:
                    task_dict[field] = task_dict[field].isoformat()
            
            report['task_details'].append(task_dict)
        
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        logger.info(f"Progress report exported to: {output_file}")
        return output_file
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics for completed tasks"""
        completed_tasks = [task for task in self.tasks.values() if task.status == "completed"]
        
        if not completed_tasks:
            return {}
        
        total_duration = sum(
            (task.end_time - task.start_time).total_seconds() 
            for task in completed_tasks if task.end_time
        )
        
        total_items = sum(task.processed_items for task in completed_tasks)
        total_errors = sum(task.errors for task in completed_tasks)
        total_warnings = sum(task.warnings for task in completed_tasks)
        
        # Calculate rates
        avg_items_per_second = total_items / total_duration if total_duration > 0 else 0
        error_rate = (total_errors / total_items * 100) if total_items > 0 else 0
        warning_rate = (total_warnings / total_items * 100) if total_items > 0 else 0
        
        return {
            'completed_tasks': len(completed_tasks),
            'total_duration_seconds': total_duration,
            'total_items_processed': total_items,
            'avg_items_per_second': avg_items_per_second,
            'total_errors': total_errors,
            'total_warnings': total_warnings,
            'error_rate_percentage': error_rate,
            'warning_rate_percentage': warning_rate
        }

class MigrationProgressMonitor:
    """Real-time progress monitor for migration operations"""
    
    def __init__(self, tracker: ProgressTracker, update_interval: int = 5):
        self.tracker = tracker
        self.update_interval = update_interval
        self.monitoring = False
        self._monitor_thread = None
    
    def start_monitoring(self) -> None:
        """Start real-time monitoring"""
        if self.monitoring:
            return
        
        self.monitoring = True
        self._monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._monitor_thread.start()
        logger.info("Started progress monitoring")
    
    def stop_monitoring(self) -> None:
        """Stop real-time monitoring"""
        self.monitoring = False
        if self._monitor_thread:
            self._monitor_thread.join(timeout=1)
        logger.info("Stopped progress monitoring")
    
    def _monitor_loop(self) -> None:
        """Main monitoring loop"""
        while self.monitoring:
            try:
                # Print progress report
                self.tracker.print_progress_report(detailed=False)
                
                # Check if all tasks are completed
                overall = self.tracker.get_overall_progress()
                if overall['running_tasks'] == 0 and overall['pending_tasks'] == 0:
                    logger.info("All tasks completed, stopping monitor")
                    break
                
                time.sleep(self.update_interval)
                
            except Exception as e:
                logger.error(f"Error in progress monitor: {e}")
                time.sleep(self.update_interval)

def main():
    """Test progress tracker"""
    import random
    import asyncio
    
    async def simulate_migration():
        tracker = ProgressTracker()
        
        # Start monitoring
        monitor = MigrationProgressMonitor(tracker, update_interval=2)
        monitor.start_monitoring()
        
        try:
            # Simulate multiple migration tasks
            tasks = [
                ('users', 'Migrate Users', 1000),
                ('companies', 'Migrate Companies', 500),
                ('opportunities', 'Migrate Opportunities', 2000),
                ('proposals', 'Migrate Proposals', 1500)
            ]
            
            for task_id, task_name, total_items in tasks:
                tracker.start_task(task_id, task_name, total_items)
                
                # Simulate processing
                for i in range(0, total_items, 50):
                    processed = min(i + 50, total_items)
                    
                    # Simulate some errors and warnings
                    errors = random.randint(0, 2) if random.random() < 0.1 else 0
                    warnings = random.randint(0, 5) if random.random() < 0.2 else 0
                    
                    tracker.update_progress(
                        task_id,
                        processed_items=processed,
                        current_step=f"Processing batch {i//50 + 1}",
                        errors=errors,
                        warnings=warnings
                    )
                    
                    await asyncio.sleep(0.1)  # Simulate processing time
                
                # Complete task
                if random.random() < 0.9:  # 90% success rate
                    tracker.complete_task(task_id)
                else:
                    tracker.fail_task(task_id, "Simulated failure")
            
            # Final report
            tracker.print_progress_report(detailed=True)
            
            # Export report
            report_file = tracker.export_report()
            print(f"Report exported to: {report_file}")
            
            # Performance metrics
            metrics = tracker.get_performance_metrics()
            print(f"Performance metrics: {metrics}")
            
        finally:
            monitor.stop_monitoring()
    
    asyncio.run(simulate_migration())

if __name__ == "__main__":
    main()