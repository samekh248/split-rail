/** PRD §5.2 canonical production Content-Security-Policy (SPLR-42). */
export const PRODUCTION_CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self'; connect-src 'self' *.quickbooks.com *.googleapis.com; object-src 'none';";

export const DEVELOPMENT_STYLE_SRC_SUFFIX = " style-src 'self' 'unsafe-inline'";
