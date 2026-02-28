#!/bin/bash
# setup-project.sh - Initialize a new client project

set -e

echo "🚀 Antigravity Agency - Project Setup"
echo "======================================"
echo ""

# Get project details
read -p "Client name (kebab-case): " CLIENT_NAME
read -p "Project name (kebab-case): " PROJECT_NAME
read -p "Project type (website/webapp/wordpress): " PROJECT_TYPE

echo ""
echo "Setting up project: $CLIENT_NAME/$PROJECT_NAME"
echo ""

# Create directory structure
PROJECT_DIR="/Users/minion/.openclaw/workspace/PROJECTS/$CLIENT_NAME/$PROJECT_NAME"
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Create numbered folders
mkdir -p {00-brief,01-research,02-planning,03-design,04-development,05-content,06-testing,07-deployment}

# Create initial files
cat > 00-brief/PROJECT-BRIEF.md << EOF
# $PROJECT_NAME - Project Brief

**Client:** $CLIENT_NAME  
**Project:** $PROJECT_NAME  
**Type:** $PROJECT_TYPE  
**Started:** $(date +%Y-%m-%d)

## Requirements

### Goals
- [ ] Define primary goal
- [ ] Define secondary goals

### Audience
- Target users:
- User needs:

### Features
- [ ] Feature 1
- [ ] Feature 2
- [ ] Feature 3

### Technical Requirements
- Platform: $PROJECT_TYPE
- Hosting: 
- Domain: 

## Timeline
- Start Date: $(date +%Y-%m-%d)
- Target Launch: 
- Milestones:

## Budget
- Estimated hours:
- Rate:
- Total:

## Contacts
- Primary contact:
- Email:
- Phone:
EOF

cat > 02-planning/ARCHITECTURE.md << EOF
# Architecture Decisions

**Project:** $PROJECT_NAME  
**Date:** $(date +%Y-%m-%d)

## Tech Stack

### Frontend
- Framework: 
- Styling: 
- Components: 

### Backend (if applicable)
- Language: 
- Framework: 
- Database: 

### Infrastructure
- Hosting: 
- CDN: 
- CI/CD: 

## Decisions

### Decision 1: [Topic]
- **Options Considered:**
  - Option A
  - Option B
- **Decision:** 
- **Rationale:**

## Diagrams

[Add architecture diagrams here]
EOF

cat > 99-HANDOVER/CLIENT-DOCUMENTATION.md << EOF
# Client Documentation

**Project:** $PROJECT_NAME  
**Handover Date:** 

## Overview

[Project description]

## Access Information

### Website
- URL: 
- Login: 
- Password: [Securely provided separately]

### Hosting
- Provider: 
- Control Panel: 
- Credentials: [Securely provided separately]

### Domain
- Registrar: 
- DNS: 

## How to Update Content

### Option 1: [CMS Name]
1. Go to [URL]/admin
2. Login with credentials
3. Navigate to [section]
4. Make changes
5. Save and publish

### Option 2: Contact Us
Email changes to: [email]

## Support

### What's Included
- Bug fixes: 30 days
- Minor updates: 30 days
- Support hours: Business hours

### What's Not Included
- New features
- Major redesigns
- Content updates

### Contact for Support
- Email: 
- Phone: 
- Response time: 24 hours

## Technical Details

### Tech Stack
- [List technologies used]

### Repository
- GitHub: 

### Deployment
- Staging: 
- Production: 

---

**Thank you for choosing Antigravity Creative Agency!**
EOF

cat > _CHANGELOG.md << EOF
# Changelog

All notable changes to this project will be documented here.

## [Unreleased]

### Added
- Initial project setup

## Versioning

We use [Semantic Versioning](https://semver.org/):
- MAJOR: Incompatible changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes
EOF

echo "✅ Project structure created at: $PROJECT_DIR"
echo ""
echo "Next steps:"
echo "1. Fill out 00-brief/PROJECT-BRIEF.md"
echo "2. Complete 01-research/ research"
echo "3. Document architecture in 02-planning/"
echo "4. Start development in 04-development/"
echo ""
echo "Project ready! 🎉"
