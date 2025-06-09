/**
 * Renderer-safe certificate utilities
 * These functions work in the browser context without Node.js dependencies
 */

import { CertificateInfo } from './cert-manager';

/**
 * Get certificate source based on certificate info (renderer-safe version)
 * Since we can't access process.env in renderer, we determine source from certificate properties
 */
export function getCertificateSource(certInfo?: CertificateInfo): string {
  if (!certInfo || !certInfo.valid) {
    return 'Self-signed (Development)';
  }

  // Check issuer to determine source
  const issuer = certInfo.issuer?.toLowerCase() || '';

  if (issuer.includes("let's encrypt")) {
    return "Let's Encrypt";
  }

  // Check for other production CAs
  const productionCAs = [
    'digicert',
    'globalsign',
    'comodo',
    'geotrust',
    'symantec',
    'thawte',
    'sectigo',
    'entrust',
  ];

  if (productionCAs.some(ca => issuer.includes(ca))) {
    return 'Production CA';
  }

  // Check if it's self-signed
  if (certInfo.issuer === certInfo.domain) {
    return 'Self-signed (Development)';
  }

  // Default for unknown but valid certificates
  return 'Certificate Authority';
}

/**
 * Check if certificate is production-ready (renderer-safe version)
 */
export function isProductionReadyCertificate(certInfo: CertificateInfo): boolean {
  if (!certInfo.valid) return false;

  // Check if it's self-signed
  const isSelfSigned = certInfo.issuer === certInfo.domain;
  if (isSelfSigned) return false;

  // Check for known production CAs
  const issuer = certInfo.issuer?.toLowerCase() || '';
  const productionCAs = [
    "let's encrypt",
    'digicert',
    'globalsign',
    'comodo',
    'geotrust',
    'symantec',
    'thawte',
    'sectigo',
    'entrust',
  ];

  return productionCAs.some(ca => issuer.includes(ca));
}
