# IoT Device Management System - Internal Documentation

Welcome to the internal documentation for our IoT Device Management System. This documentation covers the complete architecture, APIs, and operational procedures for the system.

## System Overview

Our IoT Device Management System provides real-time tracking and monitoring of IoT devices through a multi-tier architecture:

- **Device Layer**: IoT devices sending sensor data via CoAP
- **Ingestion Layer**: Fly.io Python server handling CoAP-to-HTTPS translation
- **Processing Layer**: Supabase Edge Functions for data processing and location services
- **Storage Layer**: Supabase PostgreSQL with Row Level Security
- **Frontend Layer**: React dashboard for device monitoring and management

## Quick Start

For development and operational tasks, refer to these quick links:

- [System Architecture](architecture/overview.md) - High-level system design
- [API Documentation](api/edge-function.md) - HTTP API specifications
- [Local Setup](development/setup.md) - Development environment setup
- [Deployment Guide](operations/deployment.md) - Production deployment procedures
- [Troubleshooting](operations/troubleshooting.md) - Common issues and solutions

## Key Features

- **Real-time Location Tracking**: GNSS, Wi-Fi, and cellular positioning
- **Secure Data Ingestion**: HMAC signature verification for all device data
- **Role-based Access Control**: Admin, manager, and user permission levels
- **Interactive Dashboard**: Live device status and location visualization
- **Scalable Architecture**: Auto-scaling Fly.io infrastructure with Supabase backend

## Security Model

The system implements multiple security layers:

- **Device Authentication**: HMAC-SHA256 signature verification
- **Transport Security**: HTTPS/TLS encryption for all API communications
- **Access Control**: JWT-based authentication with Row Level Security (RLS)
- **Data Validation**: Schema validation and input sanitization
- **Network Security**: Rate limiting and DDoS protection

## Support & Maintenance

For system support and maintenance issues:

1. Check the [Monitoring](operations/monitoring.md) section for system health
2. Review [Troubleshooting](operations/troubleshooting.md) for common solutions
3. Consult [Change Log](reference/changelog.md) for recent updates
4. Contact the engineering team for escalation

---

**Last Updated**: {{ git_revision_date_localized }}  
**Version**: 1.0.0