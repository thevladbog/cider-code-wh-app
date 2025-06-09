# Secure Certificate Management Setup

This document explains how to configure the secure certificate management system for the CI/CD pipeline.

## Overview

The CI/CD pipeline has been updated to handle TLS certificates securely:

- **Development/Beta builds**: Generate self-signed certificates automatically
- **Production builds**: Load certificates from secure storage (Azure Key Vault, AWS Secrets Manager, or HashiCorp Vault)
- **Fallback**: If no secure storage is configured, falls back to self-signed certificates

## Required Repository Secrets

Configure the following secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

### For Azure Key Vault (Optional)
- `SECRET_PROVIDER`: Set to `azure`
- `KEYVAULT_NAME`: Name of your Azure Key Vault
- `DOMAIN_NAME`: Your production domain name

### For AWS Secrets Manager (Optional)
- `SECRET_PROVIDER`: Set to `aws`
- `AWS_REGION`: AWS region where secrets are stored
- `DOMAIN_NAME`: Your production domain name

### For HashiCorp Vault (Optional)
- `SECRET_PROVIDER`: Set to `vault`
- `VAULT_ADDR`: Vault server address
- `VAULT_TOKEN`: Vault authentication token
- `DOMAIN_NAME`: Your production domain name

### For No Secure Storage (Default)
- Leave `SECRET_PROVIDER` unset or set to `none`
- Optionally set `DOMAIN_NAME` (defaults to `localhost`)

## How It Works

1. **Certificate Generation Scripts**:
   - `scripts/generate-dev-certs.cjs`: Creates self-signed certificates for development
   - `scripts/generate-production-certs.cjs`: Attempts to get Let's Encrypt certificates, falls back to self-signed
   - `scripts/load-certificates.cjs`: Loads certificates from secure storage during builds

2. **Build Process**:
   - For `release-stable` branch: Loads certificates from secure storage
   - For `release-beta` branch: Generates self-signed certificates
   - Certificates are placed in `certs/` directory during build (excluded from repository)

3. **Security Features**:
   - Certificates are never stored in the repository
   - `.gitignore` prevents accidental commits of certificate files
   - Certificates are generated/loaded only during the build process
   - Supports multiple secure storage providers

## Local Development

For local development, run:
```bash
node scripts/generate-dev-certs.cjs
```

This will create self-signed certificates in the `certs/` directory for local testing.

## Troubleshooting

1. **Certificates not found during build**: Check that the secure storage provider is configured correctly and secrets are set.

2. **Build fails with certificate errors**: The system will fall back to self-signed certificates if secure storage fails.

3. **Local development SSL issues**: The self-signed certificates will trigger browser warnings - this is expected for development.

## Security Notes

- Never commit certificate files to the repository
- Rotate certificates regularly through your secure storage provider
- Monitor certificate expiration dates
- Use strong passwords/tokens for secure storage access
