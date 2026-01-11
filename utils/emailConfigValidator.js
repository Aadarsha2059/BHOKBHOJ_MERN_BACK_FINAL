/**
 * Email Configuration Validator
 * Validates Gmail App Password configuration and provides helpful error messages
 */

/**
 * Validate Gmail App Password format
 * Gmail App Passwords are 16 characters, alphanumeric (no spaces, no special chars except letters and numbers)
 */
const validateAppPassword = (password) => {
  if (!password) {
    return {
      valid: false,
      error: 'EMAIL_PASS is empty or not set',
      suggestion: 'Please set EMAIL_PASS in your .env file with your Gmail App Password'
    };
  }

  // Remove spaces (sometimes users copy with spaces)
  const cleanedPassword = password.trim().replace(/\s/g, '');
  
  // Gmail App Passwords are exactly 16 characters, alphanumeric
  if (cleanedPassword.length !== 16) {
    return {
      valid: false,
      error: `EMAIL_PASS length is ${cleanedPassword.length} characters, but Gmail App Passwords must be exactly 16 characters`,
      suggestion: 'Make sure you copied the complete 16-character App Password from Google Account settings'
    };
  }

  // Check if it contains only alphanumeric characters
  if (!/^[a-zA-Z0-9]+$/.test(cleanedPassword)) {
    return {
      valid: false,
      error: 'EMAIL_PASS contains invalid characters',
      suggestion: 'Gmail App Passwords contain only letters and numbers (no spaces, dashes, or special characters)'
    };
  }

  return {
    valid: true,
    cleanedPassword: cleanedPassword
  };
};

/**
 * Validate Gmail email format
 */
const validateGmailEmail = (email) => {
  if (!email) {
    return {
      valid: false,
      error: 'EMAIL_USER is empty or not set',
      suggestion: 'Please set EMAIL_USER in your .env file with your Gmail address'
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      valid: false,
      error: 'EMAIL_USER is not a valid email format',
      suggestion: 'Please use a valid email address format (e.g., yourname@gmail.com)'
    };
  }

  // Check if it's a Gmail address
  const isGmail = email.toLowerCase().includes('@gmail.com');
  if (!isGmail) {
    return {
      valid: false,
      error: 'EMAIL_USER is not a Gmail address',
      suggestion: 'This configuration is optimized for Gmail. For other providers, you may need to adjust SMTP settings'
    };
  }

  return {
    valid: true,
    email: email.toLowerCase().trim()
  };
};

/**
 * Validate complete email configuration
 */
const validateEmailConfig = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  const emailValidation = validateGmailEmail(emailUser);
  const passwordValidation = validateAppPassword(emailPass);

  const errors = [];
  const suggestions = [];

  if (!emailValidation.valid) {
    errors.push(emailValidation.error);
    suggestions.push(emailValidation.suggestion);
  }

  if (!passwordValidation.valid) {
    errors.push(passwordValidation.error);
    suggestions.push(passwordValidation.suggestion);
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors: errors,
      suggestions: suggestions,
      emailUser: emailUser || 'NOT SET',
      emailPass: emailPass ? '***' + emailPass.slice(-4) : 'NOT SET'
    };
  }

  return {
    valid: true,
    emailUser: emailValidation.email,
    emailPass: passwordValidation.cleanedPassword
  };
};

/**
 * Get helpful instructions for setting up Gmail App Password
 */
const getAppPasswordInstructions = () => {
  return `
📧 Gmail App Password Setup Instructions:
═══════════════════════════════════════════════════════════════

1. Enable 2-Step Verification:
   → Go to: https://myaccount.google.com/security
   → Click "2-Step Verification"
   → Follow the setup process

2. Generate App Password:
   → Go to: https://myaccount.google.com/apppasswords
   → Select "Mail" as the app
   → Select "Other (Custom name)" as device
   → Enter name: "BHOKBHOJ Backend"
   → Click "Generate"

3. Copy the 16-character password:
   → Copy the password (it will look like: abcd efgh ijkl mnop)
   → Remove all spaces when adding to .env file
   → Example: EMAIL_PASS=abcdefghijklmnop

4. Add to .env file:
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-character-app-password-no-spaces

5. Restart your backend server

═══════════════════════════════════════════════════════════════
💡 Important Notes:
   - App Password is NOT your Gmail password
   - App Password is 16 characters, no spaces
   - If you lose it, generate a new one
   - Each App Password can only be used once
═══════════════════════════════════════════════════════════════
`;
};

module.exports = {
  validateAppPassword,
  validateGmailEmail,
  validateEmailConfig,
  getAppPasswordInstructions
};
