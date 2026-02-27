# Security Dashboard Configuration

## GitHub Security Tab
Primary dashboard at: `https://github.com/{owner}/{repo}/security`

## Security SLAs
| Severity | Fix Deadline |
|----------|--------------|
| 🔴 Critical | 24 hours |
| 🟠 High | 7 days |
| 🟡 Medium | 30 days |
| 🟢 Low | 90 days |

## Tools Summary
| Category | Tool | Location |
|----------|------|----------|
| SAST | Semgrep | GitHub Security Tab |
| Dependencies | Snyk | GitHub Security Tab |
| Secrets | GitLeaks | GitHub Security Tab |
| Containers | Trivy | GitHub Security Tab |
| WAF | Cloudflare | Cloudflare Dashboard |

## README Badge
```markdown
![Security](https://github.com/{owner}/{repo}/actions/workflows/sast-semgrep.yml/badge.svg)
```
