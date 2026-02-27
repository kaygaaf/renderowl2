# Cloudflare WAF Configuration

## Custom Rules

### Rule 1: Block Known Bad IPs
Expression: `(http.request.uri.path contains "/admin" and ip.geoip.country in {"CN" "RU" "KP" "IR"})`
Action: Block

### Rule 2: Rate Limiting - API Abuse Prevention
Expression: `(http.request.uri.path contains "/api/")`
Action: Rate limit (100 req/min, block 10 min)

### Rule 3: Block Common Attack Patterns
Expression: `(http.request.uri.path contains "../" or http.request.uri.path contains ".env" or http.request.uri.path contains ".git/")`
Action: Block

### Rule 4: Block SQL Injection
Expression: `(http.request.uri.query contains "UNION SELECT" or http.request.uri.query contains "DROP TABLE")`
Action: Block

## SSL/TLS Settings
- Encryption Mode: Full (strict)
- Always Use HTTPS: On
- HSTS: Enabled (12 months)

## Rate Limiting
- API endpoints: 100 req/min per IP
- Login: 5 req/5min per IP
- Contact form: 3 submissions/min
