#!/usr/bin/env node

/**
 * Script to validate CI environment for certificate generation
 * Checks if all required environment variables and dependencies are available
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Validating CI environment for certificate generation...');

// Check required environment variables
const requiredEnvVars = [
  'DOMAIN_NAME',
  'ACME_EMAIL',
  'CLOUDFLARE_API_TOKEN'
];

let missingVars = [];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    missingVars.push(envVar);
  } else {
    console.log(`✅ ${envVar}: ${envVar === 'CLOUDFLARE_API_TOKEN' ? '[HIDDEN]' : process.env[envVar]}`);
  }
}

if (missingVars.length > 0) {
  console.error(`❌ Missing environment variables: ${missingVars.join(', ')}`);
  console.error('💡 Please ensure all required secrets are configured in GitHub repository settings');
  process.exit(1);
}

// Check if we're running on Linux (required for certbot)
if (process.platform !== 'linux') {
  console.log('⚠️  Certificate generation only runs on Linux runners');
  console.log('🔄 Skipping validation - certificates will be generated on Linux runner');
  process.exit(0);
}

// Check if required tools are available
const requiredTools = [
  { name: 'certbot', command: 'certbot --version' },
  { name: 'openssl', command: 'openssl version' },
  { name: 'python3', command: 'python3 --version' }
];

for (const tool of requiredTools) {
  try {
    const output = execSync(tool.command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${tool.name}: ${output.trim()}`);
  } catch (error) {
    console.error(`❌ ${tool.name} not found or not working`);
    console.error(`   Command: ${tool.command}`);
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }
}

// Validate domain format
const domain = process.env.DOMAIN_NAME;
const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.)*[a-zA-Z]{2,}$/;
if (!domainRegex.test(domain)) {
  console.error(`❌ Invalid domain format: ${domain}`);
  console.error('💡 Domain should be in format: example.com or subdomain.example.com');
  process.exit(1);
}

// Validate email format
const email = process.env.ACME_EMAIL;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error(`❌ Invalid email format: ${email}`);
  process.exit(1);
}

// Create certs directory if it doesn't exist
const certsDir = path.join(process.cwd(), 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
  console.log(`📁 Created certs directory: ${certsDir}`);
} else {
  console.log(`📁 Certs directory exists: ${certsDir}`);
}

console.log('🎉 CI environment validation passed!');
console.log('🚀 Ready to generate production certificates');
