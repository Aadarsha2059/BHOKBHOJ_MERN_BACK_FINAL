/**
 * Security Validation Middleware for White Box Testing
 * Detects and logs common attack patterns (SQL injection, XSS, command injection, etc.)
 * Provides detailed error messages visible in Burp Suite for security testing
 */

// Common attack patterns to detect - Made more specific to avoid false positives
const ATTACK_PATTERNS = {
  sqlInjection: [
    // SQL keywords (removed SCRIPT to avoid false positives with HTML)
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION)\b.*['"]/i,
    // SQL injection patterns with quotes and operators
    /['"].*\b(OR|AND)\b.*['"]\s*=\s*['"]/i,
    // SQL comment patterns
    /--\s|(\/\*.*\*\/)/i,
    // SQL injection with semicolon and quotes
    /['"]\s*;\s*(SELECT|INSERT|UPDATE|DELETE|DROP)/i,
    // URL encoded SQL injection
    /(\%27|\%3B).*(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)/i,
    // SQL injection with OR/AND conditions
    /\b(OR|AND)\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i
  ],
  xss: [
    // HTML script tags (most common XSS)
    /<script[^>]*>.*?<\/script>/gi,
    // HTML iframe tags
    /<iframe[^>]*>.*?<\/iframe>/gi,
    // JavaScript protocol
    /javascript\s*:/gi,
    // Event handlers (onclick, onerror, etc.) - must be in HTML attribute context
    /<[^>]+\bon\w+\s*=\s*["'][^"']*["']/gi,
    // Image with javascript
    /<img[^>]*src\s*=\s*["']?\s*javascript:/gi,
    // SVG onload
    /<svg[^>]*onload\s*=/gi,
    // Body onload
    /<body[^>]*onload\s*=/gi,
    // Alert function inside HTML tags (XSS context)
    /<[^>]*>.*?alert\s*\(/gi,
    // Document manipulation (XSS context)
    /<[^>]*>.*?document\.(cookie|write|domain)/gi,
    // Eval function (XSS context)
    /<[^>]*>.*?eval\s*\(/gi
  ],
  commandInjection: [
    // Command injection with shell operators and commands
    /[;&|]\s*(cat|ls|pwd|whoami|id|uname|ps|kill|rm|mv|cp|chmod|chown|sudo|su|nc|netcat|wget|curl)\b/i,
    // Command substitution with backticks
    /`\s*(cat|ls|pwd|whoami|id|uname|ps|kill|rm|mv|cp|chmod|chown|sudo|su)\b/i,
    // Command substitution with $()
    /\$\([^)]*(cat|ls|pwd|whoami|id|uname|ps|kill|rm|mv|cp|chmod|chown|sudo|su)/i,
    // Pipe with command
    /\|\s*(cat|ls|pwd|whoami|id|uname|ps|kill|rm|mv|cp|chmod|chown|sudo|su)\b/i,
    // Semicolon with command
    /;\s*(cat|ls|pwd|whoami|id|uname|ps|kill|rm|mv|cp|chmod|chown|sudo|su)\b/i,
    // Command chaining
    /&&\s*(cat|ls|pwd|whoami|id|uname|ps|kill|rm|mv|cp|chmod|chown|sudo|su)\b/i
  ],
  pathTraversal: [
    /\.\.\//g,
    /\.\.\\/g,
    /\/etc\/passwd/i,
    /\/etc\/shadow/i,
    /\/proc\/self/i,
    /\/windows\/system32/i
  ],
  nosqlInjection: [
    /\$where/i,
    /\$ne/i,
    /\$gt/i,
    /\$lt/i,
    /\$gte/i,
    /\$lte/i,
    /\$in/i,
    /\$nin/i,
    /\$regex/i,
    /\$exists/i,
    /\$or/i,
    /\$and/i,
    /\$not/i,
    /\$nor/i,
    /\$expr/i,
    /\$jsonSchema/i,
    /\$text/i,
    /\$mod/i,
    /\$type/i,
    /\$all/i,
    /\$elemMatch/i,
    /\$size/i,
    /\$bitsAllSet/i,
    /\$bitsAnySet/i,
    /\$bitsAllClear/i,
    /\$bitsAnyClear/i,
    /\$slice/i,
    /\$comment/i,
    /\$meta/i,
    /\$natural/i
  ]
};

/**
 * Check if a value contains attack patterns
 * @param {string} value - The value to check
 * @param {string} fieldName - The field name for logging
 * @returns {Object|null} - Returns attack details if found, null otherwise
 */
function detectAttack(value, fieldName) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const detectedAttacks = [];
  
  // ✅ PRIORITY: Check XSS first (most common and specific)
  // XSS patterns are very specific and shouldn't conflict with others
  for (const pattern of ATTACK_PATTERNS.xss) {
    if (pattern.test(value)) {
      detectedAttacks.push({
        type: 'Cross-Site Scripting (XSS)',
        pattern: pattern.toString(),
        severity: 'HIGH',
        description: '⚠️ SECURITY WARNING: Cross-Site Scripting (XSS) attack detected! This malicious input contains script tags or JavaScript code that could execute in user browsers, potentially stealing sensitive data or performing unauthorized actions. This input has been BLOCKED for security.'
      });
      // If XSS is detected, don't check for other attacks (XSS is the primary concern)
      // This prevents false positives
      if (detectedAttacks.length > 0) {
        return {
          field: fieldName,
          value: value.substring(0, 100),
          attacks: detectedAttacks,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  // Check SQL Injection (only if not XSS)
  for (const pattern of ATTACK_PATTERNS.sqlInjection) {
    if (pattern.test(value)) {
      // Double-check: Make sure it's not part of an HTML tag (XSS)
      if (!/<[^>]*>/.test(value) || /<script|SELECT|INSERT|UPDATE|DELETE|DROP|UNION/i.test(value)) {
        detectedAttacks.push({
          type: 'SQL Injection',
          pattern: pattern.toString(),
          severity: 'HIGH',
          description: '⚠️ SECURITY WARNING: SQL injection attempt detected! This malicious input contains SQL keywords or injection patterns that could manipulate database queries, potentially allowing unauthorized data access or modification. This input has been BLOCKED for security.'
        });
        break; // Only report once per attack type
      }
    }
  }

  // Check Command Injection (only if not XSS and not SQL)
  for (const pattern of ATTACK_PATTERNS.commandInjection) {
    if (pattern.test(value)) {
      // Double-check: Make sure it's actual command injection, not just parentheses from XSS
      // Command injection should have shell operators (;, |, &, `, $) AND a command
      if (!/<script|alert\(|document\./i.test(value)) {
        detectedAttacks.push({
          type: 'Command Injection',
          pattern: pattern.toString(),
          severity: 'CRITICAL',
          description: '🚨 CRITICAL SECURITY WARNING: Command injection detected! This malicious input contains shell commands and operators that could execute arbitrary commands on the server, potentially compromising the entire system. This input has been BLOCKED immediately.'
        });
        break;
      }
    }
  }

  // Check Path Traversal
  for (const pattern of ATTACK_PATTERNS.pathTraversal) {
    if (pattern.test(value)) {
      detectedAttacks.push({
        type: 'Path Traversal',
        pattern: pattern.toString(),
        severity: 'HIGH',
        description: 'Potential path traversal attack detected. This could allow unauthorized file system access.'
      });
      break;
    }
  }

  // Check NoSQL Injection
  for (const pattern of ATTACK_PATTERNS.nosqlInjection) {
    if (pattern.test(value)) {
      detectedAttacks.push({
        type: 'NoSQL Injection',
        pattern: pattern.toString(),
        severity: 'HIGH',
        description: 'Potential NoSQL injection detected. This could allow unauthorized database queries.'
      });
      break;
    }
  }

  if (detectedAttacks.length > 0) {
    return {
      field: fieldName,
      value: value.substring(0, 100), // Truncate for logging
      attacks: detectedAttacks,
      timestamp: new Date().toISOString()
    };
  }

  return null;
}

/**
 * Recursively check all fields in an object
 * @param {Object} obj - The object to check
 * @param {string} prefix - Field name prefix for nested objects
 * @returns {Array} - Array of detected attacks
 */
function checkObject(obj, prefix = '') {
  const attacks = [];

  if (!obj || typeof obj !== 'object') {
    return attacks;
  }

  for (const [key, value] of Object.entries(obj)) {
    const fieldName = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      const attack = detectAttack(value, fieldName);
      if (attack) {
        attacks.push(attack);
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively check nested objects
      attacks.push(...checkObject(value, fieldName));
    }
  }

  return attacks;
}

/**
 * Security validation middleware
 * Detects malicious payloads and provides detailed error responses
 */
const securityValidation = (req, res, next) => {
  // Skip security validation for OPTIONS requests
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Check request body
  const bodyAttacks = req.body ? checkObject(req.body) : [];
  
  // Check query parameters
  const queryAttacks = req.query ? checkObject(req.query) : [];
  
  // Check URL parameters
  const paramsAttacks = req.params ? checkObject(req.params) : [];

  // Combine all detected attacks
  const allAttacks = [...bodyAttacks, ...queryAttacks, ...paramsAttacks];

  if (allAttacks.length > 0) {
    // Log security violation for white box testing
    console.log('\n🚨 🚨 🚨 SECURITY VIOLATION DETECTED 🚨 🚨 🚨');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📍 Endpoint:', req.method, req.originalUrl);
    console.log('🌐 Origin:', req.headers.origin || 'N/A');
    console.log('👤 IP Address:', req.ip || req.connection.remoteAddress || 'N/A');
    console.log('🕐 Timestamp:', new Date().toISOString());
    console.log('═══════════════════════════════════════════════════════════════');
    
    allAttacks.forEach((attack, index) => {
      console.log(`\n🔴 Attack #${index + 1}:`);
      console.log('   Field:', attack.field);
      console.log('   Value:', attack.value);
      attack.attacks.forEach(a => {
        console.log(`   ⚠️  Type: ${a.type}`);
        console.log(`   ⚠️  Severity: ${a.severity}`);
        console.log(`   ⚠️  Description: ${a.description}`);
        console.log(`   ⚠️  Pattern: ${a.pattern}`);
      });
    });
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('💡 This security violation is visible in Burp Suite response');
    console.log('💡 Use this information for white box security testing');
    console.log('🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨\n');

    // Return detailed error response (visible in Burp Suite)
    const highestSeverity = allAttacks.reduce((max, attack) => {
      const attackSeverity = attack.attacks[0].severity;
      const severityOrder = { 'CRITICAL': 3, 'HIGH': 2, 'MEDIUM': 1, 'LOW': 0 };
      return severityOrder[attackSeverity] > severityOrder[max] ? attackSeverity : max;
    }, 'LOW');

    // Get the primary attack type (first detected attack)
    const primaryAttack = allAttacks[0].attacks[0];
    
    return res.status(400).json({
      success: false,
      message: `🚨 SECURITY ALERT: ${primaryAttack.type} detected and BLOCKED`,
      security: {
        attackType: primaryAttack.type, // ✅ EXACT attack type detected
        severity: primaryAttack.severity,
        violations: allAttacks.length,
        highestSeverity: highestSeverity,
        details: allAttacks.map(attack => ({
          field: attack.field,
          value: attack.value,
          attackType: attack.attacks[0].type, // ✅ Only the exact attack type
          severity: attack.attacks[0].severity,
          description: attack.attacks[0].description,
          warning: `⚠️ This ${attack.attacks[0].type} attempt has been BLOCKED. Your request has been logged for security monitoring.`
        })),
        timestamp: new Date().toISOString(),
        endpoint: `${req.method} ${req.originalUrl}`,
        action: 'BLOCKED',
        note: 'This security violation has been logged. All malicious input is automatically rejected.'
      }
    });
  }

  // No attacks detected, proceed
  next();
};

module.exports = securityValidation;

