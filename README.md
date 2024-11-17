# Cracked Dev CLI

An AI agent CLI tool for performing operations on local projects through natural language. This tool enables developers to make codebase changes, add features, and fix issues using natural language commands.

## Features

- Natural language interaction with your codebase
- Support for multiple AI models (e.g., GPT-4, GPT-3.5-turbo)
- Custom instruction support for project-specific guidelines
- Automated code modifications following best practices
- Built with TypeScript for type safety

## Getting Started

### Prerequisites

- Node.js >= 16
- Yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/cracked-dev-cli.git

# Install dependencies
cd cracked-dev-cli
yarn install
```

### Setting Up Your Environment

This project requires a `.env` file for environment-specific configurations. Use the provided `.env.example` as a template. You need to copy it to `.env` and replace the placeholder values with your actual configuration.

```bash
cp .env.example .env
```

Edit the `.env` file with your preferred text editor:

**Ensure that you replace the placeholder values with your actual API key, application URL, and application name.**

## Development Workflow

1. Start the TypeScript compiler in watch mode. This is ONLY the auto compilation of TypeScript files. You still have to run the command below.

```bash
yarn dev
```

2. Check on [CLI USAGE](./docs/CLI_USAGE.md) for available options and examples of how to run the CLI

## Project Structure

```
cracked-dev-cli/
├── bin/                    # CLI entry point
├── src/
│   ├── commands/          # CLI commands
│   ├── config/            # Configuration
│   ├── constants/         # Shared constants
│   ├── middleware/        # CLI middleware
│   ├── services/          # Core services
│   │   ├── Calculator/    # Calculator service
│   │   ├── LLM/          # LLM service
│   │   └── LLMProviders/  # LLM provider implementations
│   └── utils/             # Utility functions
├── docs/                  # Documentation
└── tests/                 # Test files
```

## Usage

Basic command structure:

```bash
crkd [options] <message>
```

Required options:

- `--root, -r <path>` - Specify the root path of the codebase to operate on
- `--instructions, -i <path>` - Path to custom instructions file for the AI agent
- `--model, -m <model>` - AI model to use (e.g., gpt-4, gpt-3.5-turbo)

Example:

```bash
crkd --root ./my-project --instructions ./instructions.md --model gpt-4 "Add error handling to the user service"
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

## Custom Instructions

Create a markdown file with your project guidelines:

```markdown
# Project Guidelines

- Use TypeScript for all new files
- Follow SOLID principles
- Use styled-components for styling

# Code Style

- Named exports only
- Interface names prefixed with 'I'
- Tests required for new components
```

## Development

### Prerequisites

- Node.js >= 16
- Yarn

### Setup Development Environment

1. Clone the repository
2. Install dependencies: `yarn install`
3. Start TypeScript compiler: `yarn dev`
4. Run tests: `yarn test`

### Testing

Run the test suite:

```bash
yarn test
```

Run type checking:

```bash
yarn typecheck
```

Run linting:

```bash
yarn lint
```

Format code:

```bash
yarn format
```

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request

## License

MIT License - see the [LICENSE](LICENSE) file for details
