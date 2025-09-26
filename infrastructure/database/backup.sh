#!/bin/bash

# =====================================================
# TraceChain V2 Database Backup Script
# =====================================================

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-tracechain_v2}"
DB_USER="${DB_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +'%Y%m%d_%H%M%S')
BACKUP_FILE="$BACKUP_DIR/tracechain_v2_backup_$TIMESTAMP.sql"
BACKUP_FILE_COMPRESSED="$BACKUP_FILE.gz"

# Function to create full backup
create_full_backup() {
    log "Creating full database backup..."
    
    # Create full backup
    pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --verbose \
        --no-password \
        --format=custom \
        --compress=9 \
        --file="$BACKUP_FILE"
    
    # Compress the backup
    gzip "$BACKUP_FILE"
    
    log "Full backup created: $BACKUP_FILE_COMPRESSED"
    
    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE_COMPRESSED" | cut -f1)
    log "Backup size: $BACKUP_SIZE"
}

# Function to create schema-only backup
create_schema_backup() {
    log "Creating schema-only backup..."
    
    SCHEMA_BACKUP_FILE="$BACKUP_DIR/tracechain_v2_schema_$TIMESTAMP.sql"
    
    pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --verbose \
        --no-password \
        --schema-only \
        --file="$SCHEMA_BACKUP_FILE"
    
    # Compress the schema backup
    gzip "$SCHEMA_BACKUP_FILE"
    
    log "Schema backup created: $SCHEMA_BACKUP_FILE.gz"
}

# Function to create data-only backup
create_data_backup() {
    log "Creating data-only backup..."
    
    DATA_BACKUP_FILE="$BACKUP_DIR/tracechain_v2_data_$TIMESTAMP.sql"
    
    pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --verbose \
        --no-password \
        --data-only \
        --file="$DATA_BACKUP_FILE"
    
    # Compress the data backup
    gzip "$DATA_BACKUP_FILE"
    
    log "Data backup created: $DATA_BACKUP_FILE.gz"
}

# Function to create table-specific backup
create_table_backup() {
    local table_name="$1"
    log "Creating backup for table: $table_name"
    
    TABLE_BACKUP_FILE="$BACKUP_DIR/tracechain_v2_${table_name}_$TIMESTAMP.sql"
    
    pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --verbose \
        --no-password \
        --table="$table_name" \
        --file="$TABLE_BACKUP_FILE"
    
    # Compress the table backup
    gzip "$TABLE_BACKUP_FILE"
    
    log "Table backup created: $TABLE_BACKUP_FILE.gz"
}

# Function to create incremental backup
create_incremental_backup() {
    log "Creating incremental backup..."
    
    INCREMENTAL_BACKUP_FILE="$BACKUP_DIR/tracechain_v2_incremental_$TIMESTAMP.sql"
    
    # Get the last backup timestamp
    LAST_BACKUP=$(ls -t "$BACKUP_DIR"/tracechain_v2_backup_*.sql.gz 2>/dev/null | head -n1)
    
    if [ -n "$LAST_BACKUP" ]; then
        # Extract timestamp from last backup filename
        LAST_TIMESTAMP=$(basename "$LAST_BACKUP" | sed 's/tracechain_v2_backup_\(.*\)\.sql\.gz/\1/')
        LAST_DATE=$(echo "$LAST_TIMESTAMP" | cut -d'_' -f1)
        LAST_TIME=$(echo "$LAST_TIMESTAMP" | cut -d'_' -f2)
        
        # Convert to PostgreSQL timestamp format
        LAST_DATETIME="${LAST_DATE:0:4}-${LAST_DATE:4:2}-${LAST_DATE:6:2} ${LAST_TIME:0:2}:${LAST_TIME:2:2}:${LAST_TIME:4:2}"
        
        log "Incremental backup since: $LAST_DATETIME"
        
        # Create incremental backup using WAL files (if available)
        pg_dump \
            --host="$DB_HOST" \
            --port="$DB_PORT" \
            --username="$DB_USER" \
            --dbname="$DB_NAME" \
            --verbose \
            --no-password \
            --data-only \
            --where="created_at > '$LAST_DATETIME'" \
            --file="$INCREMENTAL_BACKUP_FILE"
        
        # Compress the incremental backup
        gzip "$INCREMENTAL_BACKUP_FILE"
        
        log "Incremental backup created: $INCREMENTAL_BACKUP_FILE.gz"
    else
        warning "No previous backup found, creating full backup instead"
        create_full_backup
    fi
}

# Function to restore from backup
restore_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log "Restoring from backup: $backup_file"
    
    # Check if backup is compressed
    if [[ "$backup_file" == *.gz ]]; then
        # Decompress and restore
        gunzip -c "$backup_file" | psql \
            --host="$DB_HOST" \
            --port="$DB_PORT" \
            --username="$DB_USER" \
            --dbname="$DB_NAME" \
            --verbose
    else
        # Restore directly
        psql \
            --host="$DB_HOST" \
            --port="$DB_PORT" \
            --username="$DB_USER" \
            --dbname="$DB_NAME" \
            --verbose \
            --file="$backup_file"
    fi
    
    log "Restore completed successfully"
}

# Function to list available backups
list_backups() {
    log "Available backups:"
    ls -la "$BACKUP_DIR"/tracechain_v2_*.sql.gz 2>/dev/null | while read -r line; do
        echo "  $line"
    done
}

# Function to clean up old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    find "$BACKUP_DIR" -name "tracechain_v2_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    
    log "Old backups cleaned up"
}

# Function to verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        return 1
    fi
    
    log "Verifying backup integrity: $backup_file"
    
    # Check if backup is compressed
    if [[ "$backup_file" == *.gz ]]; then
        # Verify compressed backup
        if gunzip -t "$backup_file" 2>/dev/null; then
            log "Backup integrity verified successfully"
            return 0
        else
            error "Backup integrity check failed"
            return 1
        fi
    else
        # Verify uncompressed backup
        if pg_restore --list "$backup_file" >/dev/null 2>&1; then
            log "Backup integrity verified successfully"
            return 0
        else
            error "Backup integrity check failed"
            return 1
        fi
    fi
}

# Function to create backup report
create_backup_report() {
    local report_file="$BACKUP_DIR/backup_report_$TIMESTAMP.txt"
    
    log "Creating backup report: $report_file"
    
    {
        echo "TraceChain V2 Database Backup Report"
        echo "===================================="
        echo "Date: $(date)"
        echo "Database: $DB_NAME"
        echo "Host: $DB_HOST:$DB_PORT"
        echo ""
        echo "Backup Statistics:"
        echo "------------------"
        echo "Total backups: $(ls "$BACKUP_DIR"/tracechain_v2_*.sql.gz 2>/dev/null | wc -l)"
        echo "Total size: $(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)"
        echo ""
        echo "Recent Backups:"
        echo "---------------"
        ls -la "$BACKUP_DIR"/tracechain_v2_*.sql.gz 2>/dev/null | tail -10
        echo ""
        echo "Database Statistics:"
        echo "-------------------"
        psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" --no-password -c "
            SELECT 
                'Total Tables' as metric, 
                COUNT(*)::text as value 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            UNION ALL
            SELECT 
                'Total Products' as metric, 
                COUNT(*)::text as value 
            FROM products
            UNION ALL
            SELECT 
                'Total Users' as metric, 
                COUNT(*)::text as value 
            FROM users
            UNION ALL
            SELECT 
                'Total Checkpoints' as metric, 
                COUNT(*)::text as value 
            FROM checkpoints;
        "
    } > "$report_file"
    
    log "Backup report created: $report_file"
}

# Function to show help
show_help() {
    echo "TraceChain V2 Database Backup Script"
    echo "===================================="
    echo ""
    echo "Usage: $0 [OPTIONS] [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  full              Create full database backup"
    echo "  schema            Create schema-only backup"
    echo "  data              Create data-only backup"
    echo "  incremental       Create incremental backup"
    echo "  table <name>      Create backup for specific table"
    echo "  restore <file>    Restore from backup file"
    echo "  list              List available backups"
    echo "  verify <file>     Verify backup integrity"
    echo "  cleanup           Clean up old backups"
    echo "  report            Create backup report"
    echo "  help              Show this help message"
    echo ""
    echo "Options:"
    echo "  -h, --host HOST     Database host (default: localhost)"
    echo "  -p, --port PORT     Database port (default: 5432)"
    echo "  -d, --database DB   Database name (default: tracechain_v2)"
    echo "  -u, --user USER     Database user (default: postgres)"
    echo "  -b, --backup-dir DIR Backup directory (default: /backups)"
    echo "  -r, --retention DAYS Retention days (default: 30)"
    echo ""
    echo "Environment Variables:"
    echo "  DB_HOST            Database host"
    echo "  DB_PORT            Database port"
    echo "  DB_NAME            Database name"
    echo "  DB_USER            Database user"
    echo "  BACKUP_DIR         Backup directory"
    echo "  RETENTION_DAYS     Retention days"
    echo ""
    echo "Examples:"
    echo "  $0 full                    # Create full backup"
    echo "  $0 restore backup.sql.gz   # Restore from backup"
    echo "  $0 list                    # List available backups"
    echo "  $0 cleanup                 # Clean up old backups"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--host)
            DB_HOST="$2"
            shift 2
            ;;
        -p|--port)
            DB_PORT="$2"
            shift 2
            ;;
        -d|--database)
            DB_NAME="$2"
            shift 2
            ;;
        -u|--user)
            DB_USER="$2"
            shift 2
            ;;
        -b|--backup-dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -r|--retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        full)
            create_full_backup
            create_backup_report
            cleanup_old_backups
            exit 0
            ;;
        schema)
            create_schema_backup
            exit 0
            ;;
        data)
            create_data_backup
            exit 0
            ;;
        incremental)
            create_incremental_backup
            exit 0
            ;;
        table)
            if [ -z "$2" ]; then
                error "Table name required for table backup"
                exit 1
            fi
            create_table_backup "$2"
            exit 0
            ;;
        restore)
            if [ -z "$2" ]; then
                error "Backup file required for restore"
                exit 1
            fi
            restore_backup "$2"
            exit 0
            ;;
        list)
            list_backups
            exit 0
            ;;
        verify)
            if [ -z "$2" ]; then
                error "Backup file required for verification"
                exit 1
            fi
            verify_backup "$2"
            exit 0
            ;;
        cleanup)
            cleanup_old_backups
            exit 0
            ;;
        report)
            create_backup_report
            exit 0
            ;;
        help|--help|-h)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# If no command provided, show help
show_help
