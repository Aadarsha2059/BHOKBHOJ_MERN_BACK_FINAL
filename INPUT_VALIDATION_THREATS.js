const THREATS = {
    sqlInjection: 'SQL injection through malicious input in forms or queries',
    nosqlInjection: 'NoSQL injection using MongoDB operators in input fields',
    xss: 'Cross-site scripting attacks via script tags in user input',
    commandInjection: 'Command injection through shell metacharacters',
    pathTraversal: 'Path traversal attacks using ../ sequences',
    typeConfusion: 'Type confusion attacks by sending wrong data types',
    bufferOverflow: 'Buffer overflow through excessively long input',
    dataCorruption: 'Data corruption from invalid or malformed input',
    privilegeEscalation: 'Privilege escalation through manipulated input',
    businessLogicBypass: 'Business logic bypass through invalid input values'
};

const SOLUTIONS = {
    typeValidation: 'Validate data types (string, number, boolean)',
    lengthValidation: 'Enforce min/max length constraints',
    formatValidation: 'Validate formats (email, phone, URL) using regex',
    requiredFields: 'Enforce required field validation',
    sanitization: 'Sanitize input to remove dangerous characters',
    patternMatching: 'Use regex patterns to validate input format',
    customValidation: 'Implement custom validation functions for complex rules',
    enumValidation: 'Restrict values to predefined enum lists',
    rangeValidation: 'Validate numeric ranges (min/max)',
    recursiveSanitization: 'Recursively sanitize nested objects and arrays'
};

module.exports = { THREATS, SOLUTIONS };

