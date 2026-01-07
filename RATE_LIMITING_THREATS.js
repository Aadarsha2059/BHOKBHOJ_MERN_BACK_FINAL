const THREATS = {
    ddos: 'Distributed Denial of Service - Overwhelming server with requests',
    bruteForce: 'Brute force attacks on authentication endpoints',
    apiAbuse: 'Excessive API calls consuming server resources',
    credentialStuffing: 'Automated login attempts with stolen credentials',
    resourceExhaustion: 'Depleting server CPU, memory, or bandwidth',
    costInflation: 'Unlimited API usage leading to high infrastructure costs'
};

const SOLUTIONS = {
    generalLimiter: '100 requests per 15 minutes for all endpoints',
    authLimiter: '5 login attempts per 15 minutes with skip on success',
    apiLimiter: '60 requests per minute for API endpoints',
    strictLimiter: '10 requests per minute for sensitive operations',
    clientIdentification: 'Track by user ID, IP address, or forwarded IP',
    environmentAware: 'Stricter limits in production, relaxed in development',
    skipOptions: 'Exclude health checks and static files from rate limiting'
};

module.exports = { THREATS, SOLUTIONS };

