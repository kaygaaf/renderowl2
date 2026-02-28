# 🤝 Renderowl 2.0 - Contributing Guide

Thank you for your interest in contributing to Renderowl 2.0! This guide will help you get started.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [How to Contribute](#how-to-contribute)
3. [Code Style](#code-style)
4. [Testing](#testing)
5. [Pull Request Process](#pull-request-process)
6. [Development Setup](#development-setup)
7. [Community](#community)

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- [ ] Read the [README.md](../README.md)
- [ ] Read the [Architecture Guide](ARCHITECTURE.md)
- [ ] Set up your local development environment
- [ ] Joined our community channels

### Code of Conduct

We are committed to providing a welcoming and inclusive experience:

- Be respectful and constructive
- Welcome newcomers
- Focus on what's best for the community
- Show empathy towards others
- Harassment and discrimination are not tolerated

---

## How to Contribute

### Types of Contributions

We welcome:

- 🐛 **Bug Reports** - Found an issue? Let us know!
- 💡 **Feature Requests** - Have an idea? Share it!
- 📝 **Documentation** - Help improve docs
- 🔧 **Bug Fixes** - Fix existing issues
- ✨ **New Features** - Add functionality
- 🎨 **UI/UX Improvements** - Enhance the interface
- ⚡ **Performance** - Make it faster
- 🧪 **Tests** - Improve test coverage

### Reporting Bugs

When reporting bugs, please include:

```markdown
**Description:**
A clear description of the bug

**Steps to Reproduce:**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Screenshots:**
If applicable

**Environment:**
- OS: [e.g., macOS, Windows]
- Browser: [e.g., Chrome, Safari]
- Version: [e.g., 2.0.1]

**Additional Context:**
Any other information
```

### Suggesting Features

Feature requests should include:

```markdown
**Feature Description:**
What should be added

**Problem Statement:**
What problem does this solve

**Proposed Solution:**
How should it work

**Alternatives Considered:**
Other approaches

**Additional Context:**
Mockups, examples, etc.
```

---

## Code Style

### General Guidelines

- Write clean, readable code
- Follow existing patterns
- Comment complex logic
- Keep functions small and focused
- Use meaningful variable names

### TypeScript/JavaScript (Frontend)

We use ESLint and Prettier for code formatting:

```bash
# Check code style
cd frontend && npm run lint

# Fix auto-fixable issues
cd frontend && npm run lint:fix

# Format with Prettier
cd frontend && npm run format
```

**Style Rules:**

```typescript
// ✅ Good - Explicit types
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ❌ Bad - Missing types
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Good - Descriptive names
const userProfile = await getUserProfile(userId);

// ❌ Bad - Abbreviations
const up = await getUP(uid);

// ✅ Good - Interface naming
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

// ✅ Good - Component structure
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button
      className={cn('btn', `btn-${variant}`)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### Go (Backend)

We use `gofmt`, `goimports`, and `golangci-lint`:

```bash
# Format code
cd backend && gofmt -w .

# Fix imports
cd backend && goimports -w .

# Run linter
cd backend && golangci-lint run
```

**Style Rules:**

```go
// ✅ Good - Package naming
package user_service

// ✅ Good - Interface naming
type UserRepository interface {
    GetByID(ctx context.Context, id string) (*User, error)
    Create(ctx context.Context, user *User) error
}

// ✅ Good - Error handling
func (s *UserService) GetUser(ctx context.Context, id string) (*User, error) {
    user, err := s.repo.GetByID(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("failed to get user: %w", err)
    }
    return user, nil
}

// ✅ Good - Struct tags
type User struct {
    ID        string    `json:"id" db:"id"`
    Email     string    `json:"email" db:"email" validate:"required,email"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// ✅ Good - Context first parameter
func ProcessRequest(ctx context.Context, req *Request) (*Response, error) {
    // ...
}

// ✅ Good - Constructor pattern
func NewUserService(repo UserRepository, logger *zap.Logger) *UserService {
    return &UserService{
        repo:   repo,
        logger: logger,
    }
}
```

### CSS/Tailwind

```css
/* ✅ Good - Utility classes */
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">

/* ✅ Good - Component variants */
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium",
  {
    variants: {
      variant: {
        primary: "bg-blue-600 text-white hover:bg-blue-700",
        secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-base",
      },
    },
  }
);
```

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `VideoPlayer.tsx` |
| Hooks | camelCase with use prefix | `useTimeline.ts` |
| Utilities | camelCase | `formatDuration.ts` |
| Styles | camelCase | `globals.css` |
| Tests | Same as file + .test | `VideoPlayer.test.tsx` |
| Go files | snake_case | `user_service.go` |

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style (formatting) |
| `refactor` | Code refactoring |
| `perf` | Performance improvements |
| `test` | Adding or fixing tests |
| `chore` | Maintenance tasks |
| `ci` | CI/CD changes |

**Examples:**

```bash
feat(editor): add keyboard shortcuts for timeline

Add keyboard navigation for:
- Arrow keys for frame-by-frame
- Space for play/pause
- Delete for removing clips

fix(api): resolve race condition in credit deduction

Ensure atomic operation by using database transaction
with row-level locking.

docs(readme): update installation instructions

Add troubleshooting section for common Docker issues.
```

---

## Testing

### Frontend Testing

We use Jest and React Testing Library:

```bash
# Run all tests
cd frontend && npm test

# Run with coverage
cd frontend && npm run test:coverage

# Run specific file
cd frontend && npm test VideoPlayer.test.tsx

# Watch mode
cd frontend && npm run test:watch
```

**Test Structure:**

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoPlayer } from './VideoPlayer';

describe('VideoPlayer', () => {
  it('renders play button', () => {
    render(<VideoPlayer src="video.mp4" />);
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  it('toggles play state on click', () => {
    render(<VideoPlayer src="video.mp4" />);
    const playButton = screen.getByRole('button', { name: /play/i });
    
    fireEvent.click(playButton);
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });
});
```

### Backend Testing

We use Go's built-in testing:

```bash
# Run all tests
cd backend && go test ./...

# Run with coverage
cd backend && go test -cover ./...

# Run specific package
cd backend && go test ./internal/service/...

# Verbose output
cd backend && go test -v ./...
```

**Test Structure:**

```go
package service

import (
    "testing"
    "context"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
)

func TestUserService_GetUser(t *testing.T) {
    // Arrange
    mockRepo := new(MockUserRepository)
    service := NewUserService(mockRepo, nil)
    
    expectedUser := &User{ID: "123", Email: "test@example.com"}
    mockRepo.On("GetByID", mock.Anything, "123").Return(expectedUser, nil)
    
    // Act
    user, err := service.GetUser(context.Background(), "123")
    
    // Assert
    assert.NoError(t, err)
    assert.Equal(t, expectedUser, user)
    mockRepo.AssertExpectations(t)
}
```

### E2E Testing

We use Playwright:

```bash
# Run E2E tests
cd frontend && npm run test:e2e

# Run with UI
cd frontend && npm run test:e2e:ui

# Run specific test
cd frontend && npm run test:e2e -- timeline.spec.ts
```

### Test Coverage

Minimum coverage requirements:

| Component | Minimum Coverage |
|-----------|-----------------|
| Frontend | 70% |
| Backend | 80% |
| Critical Paths | 90% |

---

## Pull Request Process

### Before Creating a PR

1. **Sync with main:**
   ```bash
   git checkout main
   git pull origin main
   git checkout your-branch
   git rebase main
   ```

2. **Run tests:**
   ```bash
   # Frontend
   cd frontend && npm test
   
   # Backend
   cd backend && go test ./...
   ```

3. **Check code style:**
   ```bash
   # Frontend
   cd frontend && npm run lint
   
   # Backend
   cd backend && golangci-lint run
   ```

4. **Update documentation:**
   - Update README if needed
   - Add JSDoc/GoDoc comments
   - Update CHANGELOG.md

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
Describe testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No new warnings

## Screenshots (if applicable)
Add screenshots for UI changes
```

### PR Review Process

1. **Automated Checks:**
   - CI must pass
   - Code coverage requirements
   - Linting checks

2. **Code Review:**
   - At least 1 approval required
   - Address all comments
   - Resolve conversations

3. **Merge:**
   - Squash and merge to main
   - Delete branch after merge

### Review Guidelines

**As a Reviewer:**
- Be constructive and kind
- Explain the "why" behind suggestions
- Approve when ready, don't just comment
- Request changes for blocking issues

**As an Author:**
- Respond to all comments
- Don't take feedback personally
- Ask questions if unclear
- Make requested changes promptly

---

## Development Setup

### Initial Setup

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/renderowl2.0.git
cd renderowl2.0

# 3. Add upstream remote
git remote add upstream https://github.com/kayorama/renderowl2.0.git

# 4. Run setup
./scripts/setup-local.sh
```

### Branch Naming

```
feature/description     # New features
fix/description         # Bug fixes
docs/description        # Documentation
refactor/description    # Code refactoring
test/description        # Test updates
chore/description       # Maintenance
```

**Examples:**
- `feature/ai-voice-cloning`
- `fix/timeline-drag-bug`
- `docs/api-examples`

### Workflow

```bash
# 1. Sync with upstream
git checkout main
git pull upstream main
git push origin main

# 2. Create feature branch
git checkout -b feature/my-feature

# 3. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 4. Push to your fork
git push origin feature/my-feature

# 5. Create Pull Request on GitHub
```

### Keeping Your Fork Updated

```bash
git fetch upstream
git checkout main
git rebase upstream/main
git push origin main
```

---

## Community

### Communication Channels

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General questions and ideas
- **Slack** - Real-time chat (#renderowl-dev)
- **Email** - security@renderowl.com (security issues only)

### Getting Help

**Before asking:**
1. Check existing documentation
2. Search GitHub issues
3. Try debugging yourself

**When asking:**
- Provide context
- Include error messages
- Share relevant code
- Mention what you've tried

### Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation

### Maintainer Team

| Name | Role | GitHub |
|------|------|--------|
| Kay | Lead Maintainer | @kayorama |

---

## Additional Resources

- [Architecture Guide](ARCHITECTURE.md)
- [API Documentation](API_DOCUMENTATION.md)
- [User Guide](USER_GUIDE.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Thank you for contributing to Renderowl 2.0! 🦉✨**

**[⬆ Back to Top](#-renderowl-20---contributing-guide)**
