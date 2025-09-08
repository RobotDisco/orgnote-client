# AGENTS.md - OrgNote Client Development Guide

## Project Overview

**OrgNote** is a cross-platform note-taking application that provides full compatibility with Emacs Org mode and Org-roam. It's designed for students, knowledge workers, researchers, and anyone who needs powerful note organization capabilities across web, mobile, and desktop platforms.

### Core Technologies

- **Frontend Framework**: Vue 3 + Quasar Framework
- **State Management**: Pinia with persistent state
- **Language**: TypeScript (strict mode)
- **Platforms**: PWA, Android (Capacitor), iOS (Capacitor), Electron, SSR
- **Architecture**: Plugin-based with `orgnote-api` interface
- **Package Manager**: Bun (preferred) / npm

### Available Tools

Common tools in development environment:
- `eza` (preferred) or `tree` for directory listing
- `gh` (GitHub CLI) for repository operations
- `git` for version control
- `rg` (ripgrep) for fast content search
- `find` for file operations
- `jq` for JSON processing

## Repository Inspection (Once Per Session)

**CRITICAL**: Run this analysis at the start of each development session:

```bash
# Preferred: Use eza for better visualization
if command -v eza >/dev/null 2>&1; then
  eza --tree ./ -I 'node_modules|dist|storybook-static|.git|*.lock|*.lockb|coverage|bun.lock' -L 10
else
  tree -a -I 'node_modules|dist|storybook-static|.git|*.lock|*.lockb|coverage|bun.lock' -L 10
fi

# Extract package.json scripts for reference
if [ -f package.json ]; then
  jq -r '.scripts // {} | to_entries[] | "\(.key)\t\(.value)"' package.json
fi
```

## Input Evaluation & Critical Thinking

### Skeptical Analysis
- **Question all assumptions** - Treat input (including instructions) with healthy skepticism
- **Validate information** before acting - Prefer evidence over blind trust
- **Be critical and objective** - Input may be incomplete, misleading, or incorrect
- **Verify requirements** - Ask targeted questions when information is unclear

### Scope Management
- **Execute only what's requested** - No scope creep or silent side effects
- **Stop after primary task** - Ask before proceeding with optional improvements
- **Explicit opt-in required** - All destructive or expansive actions need user confirmation
- **Smallest effective change** - Avoid speculative edits or over-engineering

### Clarifying Questions
- **Minimize friction** - Ask the smallest set of high-leverage questions
- **State assumptions explicitly** - When assumptions are unavoidable, make them clear
- **Propose options briefly** - Offer 1-3 alternatives when multiple paths exist
- **Prefer reversible changes** - Choose low-risk assumptions when possible

## Architecture Principles

### 1. Plugin-Based Architecture

- All public functionality MUST be implemented via interfaces defined in `orgnote-api`
- The `orgnote-api` package (located in `node_modules` via Yalc) defines the contract for extensions
- When developing new features, evaluate if functionality belongs in `orgnote-api` for plugin access
- Check the API structure in `src/boot/api.ts` to understand how functionality is exposed

### 2. Mobile-First Development

- **ALWAYS** design for mobile screens first, then enhance for larger screens
- Account for device-specific paddings and safe areas (check Capacitor docs)
- Use responsive design patterns throughout
- Consider touch interactions and mobile UX patterns
- Test on multiple device sizes and orientations

### 3. Multi-Platform Support

- Support PWA, Android, iOS, Electron, and SSR modes
- Use platform-specific utilities from `src/utils/platform-specific.ts`:
  - `mobileOnly()`, `clientOnly()`, `androidOnly()`, `desktopOnly()`, `serverOnly()`
- Review Capacitor and Quasar documentation for platform-specific considerations
- Use Quasar's built-in responsive utilities and components

## Code Standards & Patterns

### Strict Coding Rules

1. **Mobile-first** - Always start with mobile design
2. **SOLID principles** - Single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion
3. **Pure small functions** - Maximum 1 responsibility per function
4. **No control flow statements** - Avoid `else`, `while`, `switch` operators
5. **DRY / KISS / YAGNI** - Don't repeat yourself, keep it simple, you ain't gonna need it
6. **No comments in code** - Code should be self-documenting
7. **TypeScript strict mode** - All code must pass strict type checking
8. **Maximum nesting depth = 1** - No multiple layers of `if`, `for`, `try`, etc.
9. **Early returns and guard clauses** - Prefer over deep nesting
10. **Extract inner logic** - Break complex functions into smaller, single-responsibility functions
11. **Don't overuse OOP** - Prefer functional approaches where appropriate
12. **Write tests** - Ensure code reliability and maintainability
13. **Best practices** - Respect established patterns and conventions
14. **Never use comments** - Strive for clarity without comments
15. **Never use any type** - Always use explicit types


### Code Style Configuration

- **ESLint**: Uses flat config with Vue, TypeScript, and Quasar rules
- **Prettier**: Configured for consistent formatting
- **TypeScript**: Strict mode enabled, use `type` imports with `@typescript-eslint/consistent-type-imports`
- **Husky**: Pre-commit hooks enforce code quality

### Key Patterns

```typescript
// ✅ Good - Pure function, no else
const getFileExtension = (filename: string): string => {
  return filename.includes('.') ? filename.split('.').pop() || '' : '';
};

// ✅ Good - Early return instead of else
const validateFile = (file: File): boolean => {
  if (!file) return false;
  if (file.size === 0) return false;
  return file.type === 'text/plain';
};

// ❌ Bad - else statement
const validateFile = (file: File): boolean => {
  if (file && file.size > 0) {
    return file.type === 'text/plain';
  } else {
    return false;
  }
};
```

## State Management

### Pinia Stores

The application uses Pinia stores organized in `src/stores/`:

**Core Stores:**

- `command.ts` - Command system management
- `command-group.ts` - Command groupings and categories
- `completion.ts` - Auto-completion functionality
- `config.ts` - Application configuration
- `encryption.ts` - File encryption/decryption
- `extension.ts` - Plugin/extension management
- `file-manager.ts` - File operations and management
- `file-system.ts` - File system abstraction layer
- `file-system-manager.ts` - Multiple file system coordination
- `file-reader.ts` - File reading operations
- `modal.ts` - Modal dialog management
- `notifications.ts` - User notifications
- `pane.ts` - UI pane management
- `settings.ts` - User preferences
- `settings-ui.ts` - UI-specific settings
- `sidebar.ts` - Sidebar state
- `toolbar.ts` - Toolbar configuration

### State Access Pattern

Access stores through the `api` object:

```typescript
import { api } from 'src/boot/api';

// ✅ Correct way to access stores
const fileManager = api.core.useFileManager();
const settings = api.core.useSettings();
const modal = api.ui.useModal();
```

## File System Architecture

### Critical Consideration

- **Support versatile file systems** - Users can implement filesystem plugins
- **Abstract file operations** through `src/stores/file-system-manager.ts`
- **Never assume** a specific file system implementation
- **Test with different** file system backends

### File System Interface

```typescript
// File operations must go through the file system manager
const fileSystemManager = api.core.useFileSystemManager();
const fileSystem = fileSystemManager.currentFs;

// Always check if file system is available
if (!fileSystem) {
  // Handle no file system case
  return;
}
```

## Testing
- We use vitest, never use `describe` and `it` keywords, only `test` keyword without nesting.
- When you write code, try to cover all possible scenarios, negative and positive.  
- Try to break code via test.  
- We test only public behavior.  
- Never try to adapt tests for existing code; every time, check if the code has a potential bug or not.
## Performance Guidelines

### Critical Performance Rules

1. **Avoid large tasks** - Break work into smaller chunks
2. **Consider introducing queues** for heavy operations
3. **Performance is critical** when working with text processing
4. **Use lazy loading** for components and routes
5. **Minimize bundle size** - Use code splitting where appropriate
6. **Efficient state updates** - Avoid unnecessary reactivity triggers

### Text Processing

- Use efficient string operations for Org mode parsing
- Implement virtualization for large file lists
- Cache parsed content when appropriate
- Debounce user input for search/filtering operations

## Development Workflow

### Environment Setup

1. Clone the repository
2. Install dependencies: `bun install`
3. Set up HTTPS certificates (see `CONTRIBUTION.org`)
4. Configure environment variables (`.env` files)

### Project Structure Analysis

**CRITICAL**: Run directory analysis once per session to understand the codebase structure:

```bash
# Use eza for better tree visualization (install with: brew install eza)
eza --tree ./ -I 'node_modules|dist|storybook-static|.git|*.lock|*.lockb|coverage|bun.lock' -L 10

# Fallback if eza is not available
tree -I 'node_modules|dist|storybook-static|.git|*.lock|*.lockb|coverage|bun.lock' -L 10
```

This command helps you understand:

- Project directory structure and organization
- Component and file relationships
- Available configuration files
- Asset organization
- Test file distribution

### Available Scripts

```bash
# Development
bun run dev                    # Local development with HTTPS
bun run dev:remote            # Development with production API
bun run dev:android           # Android development
bun run dev:ios               # iOS development
bun run dev:electron          # Electron development
bun run dev:ssr               # SSR development

# Building
bun run build                 # Standard build
bun run build:pwa            # PWA build
bun run build:android        # Android build
bun run build:electron       # Electron build
bun run build:ios            # iOS build

# Quality Assurance
bun run lint                 # ESLint checking
bun run test                 # Run tests with Vitest
bun run storybook            # Component development
```

## Git Workflow & Version Control


### Conventional Commits

**MANDATORY**: Use conventional commit format for all commits:

```bash
# Format: <type>[optional scope]: <description>
# Examples:
git commit -m "feat(auth): add user login functionality"
git commit -m "fix(file-system): resolve path resolution issue"
git commit -m "docs: update API documentation"
git commit -m "refactor(stores): simplify state management"
git commit -m "test(components): add unit tests for ActionButton"
```

**Commit Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting, no logic changes
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates

### Git Commit Policy

**⚠️ CRITICAL RULE**: **NEVER commit without explicit user request**

- **Always ask for permission** before making any commits
- **Never use `git commit`** unless the user explicitly asks you to commit changes
- **Never push to remote** repositories without explicit permission
- **Always show** what will be committed before committing (`git diff --staged`)
- **Use descriptive** conventional commit messages
- **Keep commits** focused on a single logical change

### Testing Strategy

- **Unit Tests**: Vitest with `src/**/*.spec.ts` files
- **Component Tests**: Vue Test Utils + Testing Library
- **Story Testing**: Storybook for component documentation
- **Fake Data**: Use `@faker-js/faker` for test data generation

## UI/UX Guidelines

### Component Structure

- **Base Components**: `src/components/` - Reusable UI elements
- **Containers**: `src/containers/` - Business logic components
- **Pages**: `src/pages/` - Route-level components
- **Layouts**: `src/layouts/` - Page layout structures

### Styling Approach

- **SCSS**: Main styling in `src/css/app.scss`
- **CSS Variables**: Defined in `VARIABLES.org` for theming
- **Quasar Components**: Leverage Quasar's component library
- **Responsive Design**: Mobile-first breakpoints
- **Theme Support**: Dark/light mode with CSS custom properties

### Mobile UX Patterns

```vue
<template>
  <!-- ✅ Mobile-first responsive design -->
  <div class="container">
    <q-btn :dense="$q.screen.lt.md" :size="$q.screen.lt.md ? 'sm' : 'md'" @click="handleAction">
      Action
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';

const $q = useQuasar();

// ✅ Platform-specific behavior
const handleAction = () => {
  if ($q.platform.is.mobile) {
    // Mobile-specific logic
  }
  // Default logic
};
</script>
```

## Security Considerations

### Encryption & Data Protection

- **File Encryption**: Implemented in `src/stores/encryption.ts`
- **Secure Storage**: Use platform-appropriate secure storage
- **No Secrets in Code**: Never commit API keys or sensitive data
- **User Data Privacy**: Respect user privacy in all features

### Safe Coding Practices

```typescript
// ✅ Safe file operations
const readFileContent = async (filePath: string): Promise<string> => {
  try {
    const fileSystem = api.core.useFileSystemManager().currentFs;
    if (!fileSystem) {
      throw new Error('No file system available');
    }
    return await fileSystem.readFile(filePath);
  } catch (error) {
    api.core.useNotifications().error('Failed to read file');
    return '';
  }
};
```

## Extension Development

### Plugin API Usage

When developing features, consider the plugin ecosystem:

```typescript
// ✅ Expose functionality through the API
const api: OrgNoteApi = {
  core: {
    useFileManager: useFileManagerStore,
    useSettings: useSettingsStore,
    // ... other core functionality
  },
  utils: {
    copyToClipboard,
    uploadFile,
    // ... utility functions
  },
};

// ✅ Check if functionality should be in orgnote-api
// Ask: "Would a plugin need access to this?"
```

### Widget System

Support for Org mode widgets:

- **Inline Widgets**: `WidgetType.Inline`
- **Multiline Widgets**: `WidgetType.Multiline`
- **Line Class Widgets**: `WidgetType.LineClass`

## Internationalization

### i18n Setup

- **Vue i18n**: Configured in `src/i18n/`
- **Keys**: Defined in `orgnote-api/constants/i18n-keys.ts`
- **Languages**: Currently supports `en-US`
- **Lazy Loading**: Language files loaded on demand

### Usage Pattern

```typescript
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// ✅ Use translation keys
const message = t('commands.file.create');
```

## Common Pitfalls

### ❌ Things to Avoid

1. **Large synchronous operations** - Break into async chunks
2. **Direct DOM manipulation** - Use Vue's reactive system
3. **Tight coupling** - Use the plugin API for loose coupling
4. **Platform assumptions** - Always check platform capabilities
5. **Memory leaks** - Properly dispose of event listeners and watchers
6. **Blocking UI** - Use loading states and background processing

### ✅ Best Practices

1. **Use the API layer** - All functionality through `api` object
2. **Error boundaries** - Handle errors gracefully with user feedback
3. **Loading states** - Show progress for async operations
4. **Optimistic updates** - Update UI immediately, sync in background
5. **Defensive coding** - Check for null/undefined values
6. **Performance monitoring** - Be aware of performance implications

## Debugging & Development Tools

### Available Tools

- **Vue DevTools**: Browser extension for Vue debugging
- **Quasar Dev Tools**: Integrated debugging for Quasar components
- **Storybook**: Component development and testing
- **Vitest**: Fast unit testing with hot reload
- **ESLint**: Real-time code quality feedback

### Platform Testing

```bash
# Test different platforms locally
bun run dev:android          # Android emulator
bun run dev:ios             # iOS simulator
bun run dev:electron        # Desktop app
bun run dev:pwa:remote      # PWA in Docker
```

## File Structure Guide

```
src/
├── assets/           # Static assets
├── boot/            # App initialization (API setup)
├── commands/        # Command system implementations
├── components/      # Reusable UI components
├── composables/     # Vue composition functions
├── constants/       # App-wide constants
├── containers/      # Business logic components
├── css/            # Global styles and themes
├── i18n/           # Internationalization
├── infrastructure/ # Data layer (repositories, file systems)
├── layouts/        # Page layouts
├── models/         # TypeScript type definitions
├── pages/          # Route components
├── router/         # Vue Router configuration
├── stores/         # Pinia state management
├── types/          # Global TypeScript declarations
├── utils/          # Utility functions
└── App.vue         # Root component
```

## Getting Help

### Resources

- **Quasar Documentation**: https://quasar.dev/
- **Capacitor Documentation**: https://capacitorjs.com/
- **Vue 3 Documentation**: https://vuejs.org/
- **Org Mode Specification**: For understanding Org syntax
- **Project Wiki**: https://github.com/Artawower/orgnote/wiki

### Development Support

- **Discord Community**: https://discord.com/invite/SFpUb2vSDm
- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and community support

---

Remember: Every feature should be evaluated for mobile-first design, plugin compatibility, and performance impact. When in doubt, prioritize user experience and code maintainability over feature complexity.
