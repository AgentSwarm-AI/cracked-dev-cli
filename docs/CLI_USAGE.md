# Cracked Dev CLI

AI agent CLI for performing operations on local projects through natural language.

## Core Command

```bash
crkd [options] <message>
```

### Required Options

- `--root, -r <path>` - Specify the root path of the codebase to operate on
- `--instructions, -i <path>` - Path to custom instructions file for the AI agent
- `--model, -m <model>` - AI model to use (e.g., gpt-4, gpt-3.5-turbo)

### Example Usage

```bash
# Basic usage
crkd --root ./my-project --instructions ./instructions.md --model gpt-4 "Add error handling to the user service"

# With shorthand options
crkd -r ./my-project -i ./instructions.md -m gpt-4 "Create a new React component for user profile"

# Using config file
crkd "Refactor the authentication flow"
```

## Configuration

Create a `.crkdrc` file in your project:

```json
{
  "root": "./",
  "instructions": "./dev-instructions.md",
  "model": "gpt-4"
}
```

## Custom Instructions Format

```markdown
# Project Guidelines

- Use TypeScript for all new files
- Follow SOLID principles
- Use styled-components for styling

# Code Style

- Named exports only
- Interface names prefixed with 'I'
- Tests required for new components

# Architecture

- Clean Architecture
- Feature-based folder structure
- Shared utilities in utils/
```

## Examples

1. Adding new features:

```bash
crkd "Create a new authentication service with JWT support"
```

2. Fixing issues:

```bash
crkd "Fix the error handling in UserService.ts"
```

3. Code improvements:

```bash
crkd "Refactor the user profile component to follow SOLID principles"
```

## Error Handling

The CLI will:

- Validate the codebase path exists
- Ensure custom instructions file is readable
- Verify model availability
- Provide clear error messages for invalid operations
