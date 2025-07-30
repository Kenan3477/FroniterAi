"""
Database Management CLI Tool

Command-line interface for Frontier database administration including:
- Database initialization and setup
- Migration management
- Backup and restore operations
- Performance monitoring and optimization
- Schema validation and maintenance
"""

import os
import sys
import json
import click
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from api.database.config import DatabaseManager
from api.database.migrations import MigrationManager, SeedDataManager, BackupManager, QueryOptimizer
from api.database.initialize_database import DatabaseInitializer

@click.group()
@click.option('--config', help='Database configuration file path')
@click.option('--verbose', '-v', is_flag=True, help='Enable verbose output')
@click.pass_context
def cli(ctx, config, verbose):
    """Frontier Database Management CLI"""
    ctx.ensure_object(dict)
    ctx.obj['config'] = config
    ctx.obj['verbose'] = verbose
    
    if verbose:
        import logging
        logging.basicConfig(level=logging.DEBUG)

@cli.command()
@click.option('--sample-data/--no-sample-data', default=True, help='Create sample data')
@click.option('--force', is_flag=True, help='Force initialization even if database exists')
@click.pass_context
def init(ctx, sample_data, force):
    """Initialize the database with schemas, migrations, and seed data"""
    click.echo("🚀 Initializing Frontier database...")
    
    try:
        initializer = DatabaseInitializer(ctx.obj.get('config'))
        results = initializer.initialize(create_sample_data=sample_data)
        
        if results['success']:
            click.echo("✅ Database initialization completed successfully!")
            
            # Display summary
            click.echo(f"\n📊 Summary:")
            click.echo(f"  Duration: {results.get('total_duration', 'N/A')}")
            click.echo(f"  Steps completed: {len(results['steps_completed'])}")
            
            if results['warnings']:
                click.echo(f"  Warnings: {len(results['warnings'])}")
            
            if ctx.obj['verbose']:
                for step in results['steps_completed']:
                    click.echo(f"    ✓ {step}")
        else:
            click.echo("❌ Database initialization failed!")
            for error in results['errors']:
                click.echo(f"  Error: {error}")
            sys.exit(1)
            
    except Exception as e:
        click.echo(f"❌ Initialization failed: {e}")
        sys.exit(1)

@cli.command()
@click.pass_context
def status(ctx):
    """Show database status and health information"""
    click.echo("📊 Database Status Report")
    click.echo("=" * 50)
    
    try:
        initializer = DatabaseInitializer(ctx.obj.get('config'))
        db_manager = DatabaseManager()
        
        # Test connections
        click.echo("\n🔗 Database Connections:")
        for name, engine in db_manager.engines.items():
            try:
                with engine.connect() as conn:
                    click.echo(f"  ✅ {name}: Connected")
            except Exception as e:
                click.echo(f"  ❌ {name}: Failed - {e}")
        
        # Migration status
        try:
            database_url = str(db_manager.engines['primary'].url)
            migration_manager = MigrationManager(database_url)
            migration_status = migration_manager.get_migration_status()
            
            click.echo(f"\n📈 Migration Status:")
            click.echo(f"  Total migrations: {migration_status['total_migrations']}")
            click.echo(f"  Applied: {migration_status['applied_count']}")
            click.echo(f"  Pending: {migration_status['pending_count']}")
            
        except Exception as e:
            click.echo(f"  ⚠️ Migration status unavailable: {e}")
        
        # Backup status
        try:
            backup_manager = BackupManager(database_url)
            backups = backup_manager.list_backups()
            
            click.echo(f"\n💾 Backup Status:")
            click.echo(f"  Available backups: {len(backups)}")
            if backups:
                latest = backups[0]
                click.echo(f"  Latest backup: {latest['filename']} ({latest['size_mb']} MB)")
            
        except Exception as e:
            click.echo(f"  ⚠️ Backup status unavailable: {e}")
        
    except Exception as e:
        click.echo(f"❌ Status check failed: {e}")
        sys.exit(1)

@cli.group()
def migrate():
    """Migration management commands"""
    pass

@migrate.command('create')
@click.argument('message')
@click.option('--auto', is_flag=True, help='Auto-generate migration from model changes')
@click.pass_context
def create_migration(ctx, message, auto):
    """Create a new migration"""
    try:
        db_manager = DatabaseManager()
        database_url = str(db_manager.engines['primary'].url)
        migration_manager = MigrationManager(database_url)
        
        result = migration_manager.create_migration(message, auto_generate=auto)
        if result:
            click.echo(f"✅ Migration created: {result}")
        else:
            click.echo("❌ Failed to create migration")
            sys.exit(1)
            
    except Exception as e:
        click.echo(f"❌ Migration creation failed: {e}")
        sys.exit(1)

@migrate.command('apply')
@click.option('--target', default='head', help='Target revision (default: head)')
@click.pass_context
def apply_migrations(ctx, target):
    """Apply pending migrations"""
    try:
        db_manager = DatabaseManager()
        database_url = str(db_manager.engines['primary'].url)
        migration_manager = MigrationManager(database_url)
        
        click.echo(f"🔄 Applying migrations to {target}...")
        if migration_manager.apply_migrations(target):
            click.echo("✅ Migrations applied successfully")
        else:
            click.echo("❌ Migration application failed")
            sys.exit(1)
            
    except Exception as e:
        click.echo(f"❌ Migration failed: {e}")
        sys.exit(1)

@migrate.command('rollback')
@click.argument('target')
@click.pass_context
def rollback_migration(ctx, target):
    """Rollback to a specific migration"""
    click.confirm(f"Are you sure you want to rollback to {target}?", abort=True)
    
    try:
        db_manager = DatabaseManager()
        database_url = str(db_manager.engines['primary'].url)
        migration_manager = MigrationManager(database_url)
        
        click.echo(f"🔄 Rolling back to {target}...")
        if migration_manager.rollback_migration(target):
            click.echo("✅ Rollback completed successfully")
        else:
            click.echo("❌ Rollback failed")
            sys.exit(1)
            
    except Exception as e:
        click.echo(f"❌ Rollback failed: {e}")
        sys.exit(1)

@migrate.command('history')
@click.pass_context
def migration_history(ctx):
    """Show migration history"""
    try:
        db_manager = DatabaseManager()
        database_url = str(db_manager.engines['primary'].url)
        migration_manager = MigrationManager(database_url)
        
        history = migration_manager.get_migration_history()
        
        if history:
            click.echo("📈 Migration History:")
            click.echo("-" * 80)
            for migration in history:
                applied_at = migration.get('applied_at', 'Not applied')
                click.echo(f"{migration['migration_id']:30} {migration['description']:30} {applied_at}")
        else:
            click.echo("No migration history available")
            
    except Exception as e:
        click.echo(f"❌ Failed to get migration history: {e}")
        sys.exit(1)

@cli.group()
def backup():
    """Backup and restore commands"""
    pass

@backup.command('create')
@click.option('--name', help='Backup name (default: timestamp)')
@click.option('--no-data', is_flag=True, help='Schema only backup')
@click.pass_context
def create_backup(ctx, name, no_data):
    """Create a database backup"""
    try:
        db_manager = DatabaseManager()
        database_url = str(db_manager.engines['primary'].url)
        backup_manager = BackupManager(database_url)
        
        click.echo("💾 Creating backup...")
        backup_file = backup_manager.create_backup(name, include_data=not no_data)
        
        if backup_file:
            click.echo(f"✅ Backup created: {backup_file}")
        else:
            click.echo("❌ Backup creation failed")
            sys.exit(1)
            
    except Exception as e:
        click.echo(f"❌ Backup failed: {e}")
        sys.exit(1)

@backup.command('restore')
@click.argument('backup_file')
@click.option('--target-db', help='Target database URL (default: current)')
@click.pass_context
def restore_backup(ctx, backup_file, target_db):
    """Restore database from backup"""
    click.confirm(f"Are you sure you want to restore from {backup_file}?", abort=True)
    
    try:
        db_manager = DatabaseManager()
        database_url = str(db_manager.engines['primary'].url)
        backup_manager = BackupManager(database_url)
        
        click.echo(f"🔄 Restoring from {backup_file}...")
        if backup_manager.restore_backup(backup_file, target_db):
            click.echo("✅ Restore completed successfully")
        else:
            click.echo("❌ Restore failed")
            sys.exit(1)
            
    except Exception as e:
        click.echo(f"❌ Restore failed: {e}")
        sys.exit(1)

@backup.command('list')
@click.pass_context
def list_backups(ctx):
    """List available backups"""
    try:
        db_manager = DatabaseManager()
        database_url = str(db_manager.engines['primary'].url)
        backup_manager = BackupManager(database_url)
        
        backups = backup_manager.list_backups()
        
        if backups:
            click.echo("💾 Available Backups:")
            click.echo("-" * 80)
            click.echo(f"{'Filename':30} {'Size (MB)':10} {'Created':20} {'Type':10}")
            click.echo("-" * 80)
            for backup in backups:
                click.echo(f"{backup['filename']:30} {backup['size_mb']:10.2f} {backup['created_at'][:19]:20} {backup['type']:10}")
        else:
            click.echo("No backups available")
            
    except Exception as e:
        click.echo(f"❌ Failed to list backups: {e}")
        sys.exit(1)

@backup.command('cleanup')
@click.option('--days', default=30, help='Remove backups older than N days')
@click.pass_context
def cleanup_backups(ctx, days):
    """Clean up old backups"""
    try:
        db_manager = DatabaseManager()
        database_url = str(db_manager.engines['primary'].url)
        backup_manager = BackupManager(database_url)
        
        click.echo(f"🗑️ Cleaning up backups older than {days} days...")
        cleaned_count = backup_manager.cleanup_old_backups(days)
        click.echo(f"✅ Removed {cleaned_count} old backup files")
        
    except Exception as e:
        click.echo(f"❌ Cleanup failed: {e}")
        sys.exit(1)

@cli.group()
def optimize():
    """Performance optimization commands"""
    pass

@optimize.command('indexes')
@click.pass_context
def create_indexes(ctx):
    """Create recommended performance indexes"""
    try:
        db_manager = DatabaseManager()
        database_url = str(db_manager.engines['primary'].url)
        optimizer = QueryOptimizer(database_url)
        
        click.echo("🚀 Creating performance indexes...")
        indexes = optimizer.create_recommended_indexes()
        click.echo(f"✅ Created {len(indexes)} indexes")
        
        if ctx.obj['verbose']:
            for index in indexes:
                click.echo(f"  {index}")
                
    except Exception as e:
        click.echo(f"❌ Index creation failed: {e}")
        sys.exit(1)

@optimize.command('analyze')
@click.argument('query')
@click.pass_context
def analyze_query(ctx, query):
    """Analyze query performance"""
    try:
        db_manager = DatabaseManager()
        database_url = str(db_manager.engines['primary'].url)
        optimizer = QueryOptimizer(database_url)
        
        click.echo("🔍 Analyzing query performance...")
        analysis = optimizer.analyze_query_performance(query)
        
        if 'error' in analysis:
            click.echo(f"❌ Analysis failed: {analysis['error']}")
            sys.exit(1)
        
        click.echo(f"⏱️ Execution time: {analysis['execution_time_ms']:.2f}ms")
        
        if analysis.get('optimization_suggestions'):
            click.echo("\n💡 Optimization suggestions:")
            for suggestion in analysis['optimization_suggestions']:
                click.echo(f"  • {suggestion}")
        
        if ctx.obj['verbose'] and analysis.get('execution_plan'):
            click.echo("\n📋 Execution plan:")
            for step in analysis['execution_plan']:
                click.echo(f"  {step}")
                
    except Exception as e:
        click.echo(f"❌ Query analysis failed: {e}")
        sys.exit(1)

@cli.command()
@click.pass_context
def seed(ctx):
    """Load seed data"""
    try:
        db_manager = DatabaseManager()
        database_url = str(db_manager.engines['primary'].url)
        seed_manager = SeedDataManager(database_url)
        
        click.echo("🌱 Loading seed data...")
        if seed_manager.load_seed_data():
            click.echo("✅ Seed data loaded successfully")
        else:
            click.echo("❌ Seed data loading failed")
            sys.exit(1)
            
    except Exception as e:
        click.echo(f"❌ Seed loading failed: {e}")
        sys.exit(1)

@cli.command()
@click.option('--format', type=click.Choice(['json', 'yaml', 'table']), default='table')
@click.pass_context
def validate(ctx, format):
    """Validate database schema and integrity"""
    try:
        db_manager = DatabaseManager()
        database_url = str(db_manager.engines['primary'].url)
        migration_manager = MigrationManager(database_url)
        
        click.echo("🔍 Validating database schema...")
        validation = migration_manager.validate_schema()
        
        if format == 'json':
            click.echo(json.dumps(validation, indent=2))
        elif format == 'yaml':
            import yaml
            click.echo(yaml.dump(validation, default_flow_style=False))
        else:
            # Table format
            click.echo(f"Schema valid: {'✅' if validation['valid'] else '❌'}")
            click.echo(f"Total tables: {validation['total_tables']}")
            
            if validation.get('missing_tables'):
                click.echo(f"Missing tables: {', '.join(validation['missing_tables'])}")
            
            if validation.get('constraint_issues'):
                click.echo("Constraint issues:")
                for issue in validation['constraint_issues']:
                    click.echo(f"  • {issue}")
                    
    except Exception as e:
        click.echo(f"❌ Validation failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    cli()
