# Cracked Dev CLI

An AI agent CLI tool for performing operations on local projects through natural language. This tool enables developers to make codebase changes, add features, and fix issues using natural language commands.

⚠️ **Security Warning:** Make sure `crkdrc.json` is included in your `.gitignore` file to prevent accidentally committing your API keys. The file contains sensitive information that should never be pushed to version control.

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

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit the `.env` file with your OpenRouter API key and other configurations:

```
OPENROUTER_API_KEY=your_api_key_here
APP_URL=your_app_url
APP_NAME=your_app_name
```

3. Initialize the CLI configuration:

```bash
# Initialize with API key from command line
yarn dev:cli crkd --init --openRouterApiKey your_api_key_here

# Or initialize using API key from .env
yarn dev:cli crkd --init
```

This will create a `crkdrc.json` configuration file with your settings. The OpenRouter API key will be taken from the command line argument if provided, otherwise it will use the key from your `.env` file.

## CLI Usage

### Available Flags

- `--init`: Initialize a default crkdrc.json configuration file
- `--openRouterApiKey`: Provide OpenRouter API key during initialization (optional, can use .env instead)
- `-r, --root`: Root path of the codebase (default: current directory)
- `--instructions-path`: Path to custom instructions file
- `--instructions`: Raw custom instructions string
- `-m, --model`: AI model to use (default: gpt-4)
- `-p, --provider`: LLM provider to use
- `-s, --stream`: Stream the AI response
- `-d, --debug`: Enable debug mode
- `-o, --options`: LLM options in key=value format
- `-i, --interactive`: Enable interactive mode
- `--auto-scaler`: Enable model auto-scaling based on tries

### Example Commands

Basic usage:

```bash
yarn dev:cli crkd --provider "open-router" --model "gpt-4" "Add error handling"
```

With custom instructions:

```bash
yarn dev:cli crkd --instructions "Follow clean code" --model "gpt-4" --options "temperature=0.7" "Create component"
```

Interactive mode:

```bash
yarn dev:cli crkd --interactive -m gpt-4 -p open-router
```

Auto-scaling mode:

```bash
yarn dev:cli crkd --auto-scaler --provider "open-router" --model "gpt-4" "Create component"
```

### LLM Options

Customize model behavior using these options in format `key=value,key2=value2`:

- `temperature` (0.0-2.0): Controls randomness
- `max_tokens` (1+): Maximum tokens to generate
- `top_p` (0.0-1.0): Controls diversity via nucleus sampling
- `frequency_penalty` (-2.0-2.0): Penalize frequent tokens
- `presence_penalty` (-2.0-2.0): Penalize repeated tokens
- `repetition_penalty` (0.0-2.0): Reduce token repetition
- `top_k` (0+): Limit token choices
- `min_p` (0.0-1.0): Minimum probability threshold
- `top_a` (0.0-1.0): Dynamic probability threshold
- `seed` (integer): For deterministic outputs

Example:

```bash
yarn dev:cli crkd --options "temperature=0.7,max_tokens=2000,top_p=0.9"
```

## Project Structure

```typescript
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

## Development

Start the TypeScript compiler in watch mode:

```bash
yarn dev
```

### Testing

```bash
# Run tests
yarn test

# Type checking
yarn tsc

# Linting
yarn lint

# Format code
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
