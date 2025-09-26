#!/bin/bash

# =====================================================
# TraceChain V2 Database Monitoring Script
# =====================================================

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-tracechain_v2}"
DB_USER="${DB_USER:-postgres}"
MONITOR_INTERVAL="${MONITOR_INTERVAL:-60}"
LOG_FILE="${LOG_FILE:-/var/log/tracechain_monitor.log}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1" >> "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1" >> "$LOG_FILE"
}

# Function to check database connection
check_connection() {
    if psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" --no-password -c "SELECT 1;" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to get database size
get_database_size() {
    psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" --no-password -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | tr -d ' '
}

# Function to get active connections
get_active_connections() {
    psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" --no-password -t -c "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';" | tr -d ' '
}

# Function to get total connections
get_total_connections() {
    psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" --no-password -t -c "SELECT COUNT(*) FROM pg_stat_activity;" | tr -d ' '
}

# Function to get database uptime
get_database_uptime() {
    psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" --no-password -t -c "SELECT EXTRACT(EPOCH FROM (now() - pg_postmaster_start_time()))::int;" | tr -d ' '
}

# Function to get slow queries
get_slow_queries() {
    psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" --no-password -c "
        SELECT 
            query,
            calls,
            total_time,
            mean_time,
            rows
        FROM pg_stat_statements 
        WHERE mean_time > 1000 
        ORDER BY mean_time DESC 
        LIMIT 5;
    " 2>/dev/null || echo "No slow queries found"
}

# Function to get table sizes
get_table_sizes() {
    psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" --no-password -c "
        SELECT 
            schemaname||'.'||tablename as table_name,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10;
    "
}

# Function to get index usage
get_index_usage() {
    psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" --no-password -c "
        SELECT 
            schemaname,
            tablename,
            indexname,
            idx_scan,
            idx_tup_read,
            idx_tup_fetch
        FROM pg_stat_user_indexes 
        ORDER BY idx_scan DESC 
        LIMIT 10;
    "
}

# Function to get lock information
get_lock_info() {
    psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" --no-password -c "
        SELECT 
            mode,
            locktype,
            granted,
            COUNT(*) as count
        FROM pg_locks 
        GROUP BY mode, locktype, granted
        ORDER BY count DESC;
    "
}

# Function to get replication lag (if applicable)
get_replication_lag() {
    psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" --no-password -c "
        SELECT 
            client_addr,
            state,
            sent_lsn,
            write_lsn,
            flush_lsn,
            replay_lsn,
            write_lag,
            flush_lag,
            replay_lag
        FROM pg_stat_replication;
    " 2>/dev/null || echo "No replication configured"
}

# Function to get database statistics
get_database_stats() {
    psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" --no-password -c "
        SELECT 
            'Total Products' as metric, 
            COUNT(*)::text as value 
        FROM products
        UNION ALL
        SELECT 
            'Active Products' as metric, 
            COUNT(*)::text as value 
        FROM products WHERE is_active = true
        UNION ALL
        SELECT 
            'Total Users' as metric, 
            COUNT(*)::text as value 
        FROM users
        UNION ALL
        SELECT 
            'Total Checkpoints' as metric, 
            COUNT(*)::text as value 
        FROM checkpoints
        UNION ALL
        SELECT 
            'Total Trace Points' as metric, 
            COALESCE(SUM(points), 0)::text as value 
        FROM trace_points
        UNION ALL
        SELECT 
            'Total TRACE Tokens' as metric, 
            COALESCE(SUM(amount), 0)::text as value 
        FROM trace_token_transactions WHERE status = 'confirmed';
    "
}

# Function to check for long-running queries
check_long_running_queries() {
    local threshold="${1:-300}" # 5 minutes default
    
    psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" --no-password -c "
        SELECT 
            pid,
            now() - pg_stat_activity.query_start AS duration,
            query,
            state
        FROM pg_stat_activity 
        WHERE (now() - pg_stat_activity.query_start) > interval '$threshold seconds'
        AND state != 'idle';
    "
}

# Function to check for blocked queries
check_blocked_queries() {
    psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" --no-password -c "
        SELECT 
            blocked_locks.pid AS blocked_pid,
            blocked_activity.usename AS blocked_user,
            blocking_locks.pid AS blocking_pid,
            blocking_activity.usename AS blocking_user,
            blocked_activity.query AS blocked_statement,
            blocking_activity.query AS blocking_statement
        FROM pg_catalog.pg_locks blocked_locks
        JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
        JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
        AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
        AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
        AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
        AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
        AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
        AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
        AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
        AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
        AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
        AND blocking_locks.pid != blocked_locks.pid
        JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
        WHERE NOT blocked_locks.granted;
    "
}

# Function to check disk space
check_disk_space() {
    df -h | grep -E "(Filesystem|/dev/)" | while read -r line; do
        echo "$line"
    done
}

# Function to check memory usage
check_memory_usage() {
    free -h
}

# Function to check CPU usage
check_cpu_usage() {
    top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print "CPU Usage: " 100 - $1 "%"}'
}

# Function to generate monitoring report
generate_report() {
    local report_file="/tmp/tracechain_monitor_report_$(date +'%Y%m%d_%H%M%S').txt"
    
    log "Generating monitoring report: $report_file"
    
    {
        echo "TraceChain V2 Database Monitoring Report"
        echo "======================================="
        echo "Date: $(date)"
        echo "Database: $DB_NAME"
        echo "Host: $DB_HOST:$DB_PORT"
        echo ""
        
        echo "Database Status:"
        echo "---------------"
        if check_connection; then
            echo "Status: ONLINE"
        else
            echo "Status: OFFLINE"
        fi
        
        echo ""
        echo "Database Metrics:"
        echo "----------------"
        echo "Database Size: $(get_database_size)"
        echo "Active Connections: $(get_active_connections)"
        echo "Total Connections: $(get_total_connections)"
        echo "Uptime: $(get_database_uptime) seconds"
        
        echo ""
        echo "Application Statistics:"
        echo "----------------------"
        get_database_stats
        
        echo ""
        echo "Table Sizes:"
        echo "------------"
        get_table_sizes
        
        echo ""
        echo "Index Usage:"
        echo "------------"
        get_index_usage
        
        echo ""
        echo "Lock Information:"
        echo "----------------"
        get_lock_info
        
        echo ""
        echo "System Resources:"
        echo "----------------"
        check_disk_space
        echo ""
        check_memory_usage
        echo ""
        check_cpu_usage
        
    } > "$report_file"
    
    log "Monitoring report generated: $report_file"
    echo "$report_file"
}

# Function to send alert
send_alert() {
    local message="$1"
    local severity="${2:-WARNING}"
    
    # Log the alert
    error "ALERT [$severity]: $message"
    
    # Here you could integrate with external alerting systems
    # For example: Slack, email, PagerDuty, etc.
    
    # Example: Send to Slack (if webhook is configured)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 TraceChain Database Alert [$severity]: $message\"}" \
            "$SLACK_WEBHOOK_URL" >/dev/null 2>&1
    fi
    
    # Example: Send email (if mail is configured)
    if [ -n "$ALERT_EMAIL" ]; then
        echo "TraceChain Database Alert [$severity]: $message" | mail -s "Database Alert" "$ALERT_EMAIL"
    fi
}

# Function to check thresholds and send alerts
check_thresholds() {
    local active_connections=$(get_active_connections)
    local total_connections=$(get_total_connections)
    local database_size=$(get_database_size | sed 's/[^0-9.]//g')
    
    # Check connection limits
    if [ "$active_connections" -gt 50 ]; then
        send_alert "High active connections: $active_connections" "WARNING"
    fi
    
    if [ "$total_connections" -gt 100 ]; then
        send_alert "High total connections: $total_connections" "CRITICAL"
    fi
    
    # Check for long-running queries
    local long_queries=$(check_long_running_queries 300 | wc -l)
    if [ "$long_queries" -gt 0 ]; then
        send_alert "Long-running queries detected: $long_queries" "WARNING"
    fi
    
    # Check for blocked queries
    local blocked_queries=$(check_blocked_queries | wc -l)
    if [ "$blocked_queries" -gt 0 ]; then
        send_alert "Blocked queries detected: $blocked_queries" "CRITICAL"
    fi
}

# Function to run continuous monitoring
run_monitoring() {
    log "Starting continuous monitoring (interval: ${MONITOR_INTERVAL}s)"
    
    while true; do
        # Check database connection
        if ! check_connection; then
            send_alert "Database connection failed" "CRITICAL"
            sleep "$MONITOR_INTERVAL"
            continue
        fi
        
        # Check thresholds
        check_thresholds
        
        # Log current status
        info "Database Size: $(get_database_size), Active Connections: $(get_active_connections), Total Connections: $(get_total_connections)"
        
        sleep "$MONITOR_INTERVAL"
    done
}

# Function to show help
show_help() {
    echo "TraceChain V2 Database Monitoring Script"
    echo "======================================="
    echo ""
    echo "Usage: $0 [OPTIONS] [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  status            Show database status"
    echo "  stats             Show database statistics"
    echo "  tables            Show table sizes"
    echo "  indexes           Show index usage"
    echo "  locks             Show lock information"
    echo "  queries           Show slow queries"
    echo "  long-running      Show long-running queries"
    echo "  blocked           Show blocked queries"
    echo "  replication       Show replication status"
    echo "  report            Generate monitoring report"
    echo "  monitor           Run continuous monitoring"
    echo "  help              Show this help message"
    echo ""
    echo "Options:"
    echo "  -h, --host HOST     Database host (default: localhost)"
    echo "  -p, --port PORT     Database port (default: 5432)"
    echo "  -d, --database DB   Database name (default: tracechain_v2)"
    echo "  -u, --user USER     Database user (default: postgres)"
    echo "  -i, --interval SEC  Monitoring interval (default: 60)"
    echo "  -l, --log-file FILE Log file (default: /var/log/tracechain_monitor.log)"
    echo ""
    echo "Environment Variables:"
    echo "  DB_HOST            Database host"
    echo "  DB_PORT            Database port"
    echo "  DB_NAME            Database name"
    echo "  DB_USER            Database user"
    echo "  MONITOR_INTERVAL   Monitoring interval"
    echo "  LOG_FILE           Log file path"
    echo "  SLACK_WEBHOOK_URL  Slack webhook for alerts"
    echo "  ALERT_EMAIL        Email for alerts"
    echo ""
    echo "Examples:"
    echo "  $0 status                    # Show database status"
    echo "  $0 stats                     # Show database statistics"
    echo "  $0 monitor                   # Run continuous monitoring"
    echo "  $0 report                    # Generate monitoring report"
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
        -i|--interval)
            MONITOR_INTERVAL="$2"
            shift 2
            ;;
        -l|--log-file)
            LOG_FILE="$2"
            shift 2
            ;;
        status)
            if check_connection; then
                log "Database is ONLINE"
                echo "Database Size: $(get_database_size)"
                echo "Active Connections: $(get_active_connections)"
                echo "Total Connections: $(get_total_connections)"
                echo "Uptime: $(get_database_uptime) seconds"
            else
                error "Database is OFFLINE"
                exit 1
            fi
            exit 0
            ;;
        stats)
            get_database_stats
            exit 0
            ;;
        tables)
            get_table_sizes
            exit 0
            ;;
        indexes)
            get_index_usage
            exit 0
            ;;
        locks)
            get_lock_info
            exit 0
            ;;
        queries)
            get_slow_queries
            exit 0
            ;;
        long-running)
            check_long_running_queries
            exit 0
            ;;
        blocked)
            check_blocked_queries
            exit 0
            ;;
        replication)
            get_replication_lag
            exit 0
            ;;
        report)
            generate_report
            exit 0
            ;;
        monitor)
            run_monitoring
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
