# TraceChain V2 Database Schema

## Overview

This PostgreSQL database schema supports the complete TraceChain V2 ecosystem, providing efficient storage and querying capabilities for supply chain traceability, token economy, compliance management, and analytics.

## Database Architecture

### Core Components

1. **Product Management**: Products, checkpoints, stakeholders, and traceability chains
2. **Token Economy**: TRACE tokens, staking pools, rewards, and transactions
3. **Compliance**: Standards, certifications, and verification processes
4. **Payments**: Escrow contracts and payment processing
5. **NFTs**: Digital certificates and verification codes
6. **Analytics**: Materialized views and reporting tables
7. **Audit**: Complete audit trail and logging

## Schema Structure

### Core Tables

#### Users (`users`)
- **Purpose**: User accounts supporting both custodial and non-custodial wallets
- **Key Fields**: `wallet_address`, `email`, `user_tier`, `is_custodial`
- **Indexes**: Wallet address, email, user tier, creation date

#### Products (`products`)
- **Purpose**: Product registry mirroring smart contract Product struct
- **Key Fields**: `product_id`, `product_name`, `batch_number`, `manufacturer_id`
- **Indexes**: Product ID, batch number, manufacturer, product type, active status

#### Checkpoints (`checkpoints`)
- **Purpose**: Supply chain checkpoints with environmental data
- **Key Fields**: `product_id`, `timestamp`, `location`, `status`, `temperature`, `humidity`
- **Indexes**: Product ID, stakeholder, status, timestamp, location

#### Traceability Chain (`traceability_chain`)
- **Purpose**: Denormalized traceability chain for fast queries
- **Key Fields**: `product_id`, `checkpoint_id`, `sequence_order`, `duration_hours`
- **Indexes**: Product ID, sequence order, stakeholder relationships

### Token Economy Tables

#### Trace Points (`trace_points`)
- **Purpose**: Off-chain reward points system
- **Key Fields**: `user_id`, `points`, `points_type`, `source_product_id`
- **Indexes**: User ID, points type, creation date, claimed status

#### TRACE Token Transactions (`trace_token_transactions`)
- **Purpose**: On-chain TRACE token transactions
- **Key Fields**: `user_id`, `amount`, `transaction_type`, `status`
- **Indexes**: User ID, transaction type, status, creation date

#### Staking Pools (`staking_pools`)
- **Purpose**: Token staking pools with different APY rates
- **Key Fields**: `pool_name`, `pool_type`, `apy_percentage`, `min_stake_amount`
- **Indexes**: Pool type, active status

#### User Stakes (`user_stakes`)
- **Purpose**: User staking positions and rewards
- **Key Fields**: `user_id`, `pool_id`, `amount`, `unlock_at`
- **Indexes**: User ID, pool ID, active status, unlock date

### Compliance Tables

#### Compliance Standards (`compliance_standards`)
- **Purpose**: Supported compliance standards and certifications
- **Key Fields**: `standard_name`, `standard_code`, `category`
- **Indexes**: Standard code, category, active status

#### Product Certifications (`product_certifications`)
- **Purpose**: Product compliance certifications
- **Key Fields**: `product_id`, `standard_id`, `certification_number`, `is_valid`
- **Indexes**: Product ID, standard ID, valid status

#### Compliance Checkpoints (`compliance_checkpoints`)
- **Purpose**: Compliance verification at each checkpoint
- **Key Fields**: `product_id`, `checkpoint_id`, `standard_id`, `compliance_status`
- **Indexes**: Product ID, compliance status

### Payment Tables

#### Payment Contracts (`payment_contracts`)
- **Purpose**: Payment and escrow contract instances
- **Key Fields**: `contract_address`, `product_id`, `buyer_id`, `seller_id`, `amount`
- **Indexes**: Contract address, product ID, buyer, seller, status

#### Escrow Transactions (`escrow_transactions`)
- **Purpose**: Escrow transaction details
- **Key Fields**: `payment_contract_id`, `amount`, `status`, `released_at`
- **Indexes**: Payment contract ID, status

### NFT Tables

#### NFT Certificates (`nft_certificates`)
- **Purpose**: NFT-based product certificates
- **Key Fields**: `token_id`, `product_id`, `owner_id`, `certificate_type`
- **Indexes**: Token ID, product ID, owner, valid status

#### Certificate Codes (`certificate_codes`)
- **Purpose**: Certificate verification codes
- **Key Fields**: `certificate_id`, `verification_code`, `is_used`
- **Indexes**: Verification code, used status

### Analytics Tables

#### Product Analytics (`product_analytics`)
- **Purpose**: Materialized analytics data for products
- **Key Fields**: `product_id`, `total_checkpoints`, `compliance_score`, `trust_score`
- **Indexes**: Product ID

#### User Analytics (`user_analytics`)
- **Purpose**: Materialized analytics data for users
- **Key Fields**: `user_id`, `total_products`, `total_trace_points`, `trust_rating`
- **Indexes**: User ID

### Audit Tables

#### Audit Logs (`audit_logs`)
- **Purpose**: Complete audit trail for all data changes
- **Key Fields**: `table_name`, `record_id`, `operation`, `old_values`, `new_values`
- **Indexes**: Table name, record ID, changed date, changed by

#### System Events (`system_events`)
- **Purpose**: System event logging
- **Key Fields**: `event_type`, `event_data`, `severity`, `source`
- **Indexes**: Event type, severity, creation date

## Materialized Views

### Product Traceability Summary
- **Purpose**: Aggregated product traceability data
- **Key Metrics**: Total checkpoints, stakeholders, trace duration
- **Refresh**: Daily or on-demand

### User Activity Summary
- **Purpose**: Aggregated user activity data
- **Key Metrics**: Total products, checkpoints, trace points, tokens
- **Refresh**: Daily or on-demand

### Compliance Summary
- **Purpose**: Aggregated compliance data
- **Key Metrics**: Total certifications, compliance score
- **Refresh**: Daily or on-demand

## Indexes and Performance

### Primary Indexes
- **B-tree indexes** for equality and range queries
- **GIN indexes** for JSONB columns and full-text search
- **Partial indexes** for active records
- **Composite indexes** for common query patterns

### Performance Optimizations
- **Materialized views** for complex aggregations
- **Concurrent index creation** to avoid blocking
- **Connection pooling** with user-specific limits
- **Statement timeouts** to prevent long-running queries

## Functions and Procedures

### Business Logic Functions
- `calculate_trust_score()`: Calculate user trust score
- `get_product_trace_chain()`: Get complete traceability chain
- `check_product_compliance()`: Check product compliance status
- `update_analytics()`: Update analytics tables

### Maintenance Functions
- `refresh_materialized_views()`: Refresh all materialized views
- `cleanup_old_data()`: Clean up old audit logs and events
- `analyze_all_tables()`: Update table statistics
- `check_database_health()`: Check database health metrics

### Monitoring Functions
- `get_system_stats()`: Get system statistics
- `get_table_sizes()`: Get table size information
- `get_database_info()`: Get database version and configuration

## Triggers

### Audit Triggers
- **Automatic audit logging** for critical tables
- **Change tracking** with old and new values
- **User identification** for audit trails

### Update Triggers
- **Automatic timestamp updates** for updated_at columns
- **Data consistency** enforcement
- **Cascade operations** for related records

## Security and Access Control

### User Roles
- **tracechain_app**: Full application access
- **tracechain_readonly**: Read-only access
- **tracechain_analytics**: Analytics and reporting access

### Permissions
- **Table-level permissions** based on user roles
- **Function-level permissions** for business logic
- **Sequence permissions** for ID generation
- **Default privileges** for future objects

### Security Features
- **Connection limits** per user
- **Statement timeouts** to prevent abuse
- **Work memory limits** for analytics queries
- **Audit logging** for all changes

## Data Types and Constraints

### Custom Types
- **product_type**: Enum for product categories
- **checkpoint_status**: Enum for checkpoint statuses
- **stakeholder_role**: Enum for stakeholder roles
- **user_tier**: Enum for user tiers
- **transaction_status**: Enum for transaction statuses

### Constraints
- **Foreign key constraints** for referential integrity
- **Unique constraints** for business keys
- **Check constraints** for data validation
- **Not null constraints** for required fields

## Maintenance and Monitoring

### Daily Maintenance
- **Table analysis** for query optimization
- **Materialized view refresh** for up-to-date data
- **Analytics updates** for reporting
- **Data cleanup** for old records

### Weekly Maintenance
- **Table vacuuming** for space reclamation
- **Index reindexing** for performance
- **Health checks** for system monitoring
- **Backup verification** for data integrity

### Monitoring
- **Database size monitoring** with alerts
- **Connection monitoring** for capacity planning
- **Query performance monitoring** for optimization
- **Error logging** for troubleshooting

## Backup and Recovery

### Backup Strategy
- **Full database backups** daily
- **Incremental backups** hourly
- **Transaction log backups** every 15 minutes
- **Point-in-time recovery** capability

### Recovery Procedures
- **Automated recovery** from latest backup
- **Manual recovery** for specific time points
- **Data validation** after recovery
- **Performance verification** post-recovery

## Scaling and Performance

### Horizontal Scaling
- **Read replicas** for analytics queries
- **Connection pooling** for high concurrency
- **Load balancing** for distributed access
- **Partitioning** for large tables

### Vertical Scaling
- **Memory optimization** for query performance
- **CPU optimization** for concurrent operations
- **Storage optimization** for I/O performance
- **Network optimization** for data transfer

## Integration Points

### Smart Contract Integration
- **Event listening** for blockchain events
- **Data synchronization** with smart contracts
- **Transaction tracking** for audit trails
- **State validation** for consistency

### API Integration
- **RESTful APIs** for data access
- **GraphQL APIs** for complex queries
- **WebSocket APIs** for real-time updates
- **Batch APIs** for bulk operations

### External System Integration
- **IPFS integration** for metadata storage
- **Oracle integration** for external data
- **Payment gateway integration** for transactions
- **Notification system integration** for alerts

## Troubleshooting

### Common Issues
- **Connection timeouts**: Check connection limits and timeouts
- **Query performance**: Check indexes and query plans
- **Disk space**: Monitor database size and cleanup old data
- **Memory usage**: Check work_mem settings and query complexity

### Diagnostic Queries
- **Database health check**: `SELECT * FROM check_database_health();`
- **System statistics**: `SELECT * FROM get_system_stats();`
- **Table sizes**: `SELECT * FROM get_table_sizes();`
- **Active connections**: `SELECT * FROM pg_stat_activity;`

### Performance Tuning
- **Index optimization**: Analyze query patterns and add missing indexes
- **Query optimization**: Use EXPLAIN ANALYZE for query plans
- **Configuration tuning**: Adjust PostgreSQL parameters for workload
- **Maintenance scheduling**: Optimize maintenance window timing

## Development and Testing

### Development Environment
- **Local PostgreSQL instance** for development
- **Test data generation** for realistic testing
- **Schema migrations** for version control
- **Data seeding** for consistent test data

### Testing Strategy
- **Unit tests** for individual functions
- **Integration tests** for table relationships
- **Performance tests** for query optimization
- **Load tests** for concurrent access

### Deployment
- **Schema deployment** with version control
- **Data migration** for schema changes
- **Rollback procedures** for failed deployments
- **Validation scripts** for deployment verification

## Documentation and Support

### Schema Documentation
- **Table documentation** with field descriptions
- **Function documentation** with usage examples
- **Index documentation** with performance notes
- **View documentation** with query examples

### API Documentation
- **Endpoint documentation** with parameters
- **Response documentation** with examples
- **Error documentation** with troubleshooting
- **Rate limiting documentation** with limits

### Support Resources
- **Database monitoring** dashboards
- **Performance metrics** and alerts
- **Error logging** and analysis
- **User guides** and tutorials

## Future Enhancements

### Planned Features
- **Real-time analytics** with streaming data
- **Machine learning** integration for predictions
- **Advanced reporting** with custom dashboards
- **Mobile optimization** for mobile applications

### Scalability Improvements
- **Sharding** for horizontal scaling
- **Caching** for frequently accessed data
- **CDN integration** for global performance
- **Microservices** architecture for modularity

### Security Enhancements
- **Encryption at rest** for sensitive data
- **Encryption in transit** for network security
- **Advanced auditing** for compliance
- **Access control** improvements

## Conclusion

This PostgreSQL database schema provides a robust, scalable, and secure foundation for the TraceChain V2 ecosystem. It supports all core functionality including product traceability, token economy, compliance management, and analytics while maintaining high performance and data integrity.

The schema is designed to grow with the platform, supporting both current requirements and future enhancements while maintaining optimal performance and security standards.
