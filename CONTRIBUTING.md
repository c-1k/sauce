# Contributing to Turf

Thank you for your interest in contributing to Turf! This document provides guidelines for contributing to the project.

## Code of Conduct

Be respectful and inclusive. We welcome contributions from everyone.

## How to Contribute

### Reporting Issues

- Check existing issues before creating a new one
- Include clear reproduction steps
- Provide environment details (OS, Bun version, etc.)

### Submitting Changes

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes following the code style below
4. Write or update tests as needed
5. Run all checks before submitting:
   ```bash
   bun run lint
   bunx tsc --noEmit
   bun test
   ```
6. Submit a pull request

### Code Style

- Use TypeScript with strict mode
- Follow the existing code patterns
- Use Biome for formatting and linting
- Tabs for indentation, double quotes for strings
- Add tests for new functionality

### Commit Messages

- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove, etc.)
- Keep the first line under 72 characters

### Pull Request Guidelines

- One PR per feature or fix
- Keep changes focused and minimal
- Update documentation if needed
- Ensure all CI checks pass

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/turf.git
cd turf

# Install dependencies
bun install

# Run tests
bun test

# Run linter
bun run lint
```

## Questions?

Open a GitHub issue for questions or discussion.
