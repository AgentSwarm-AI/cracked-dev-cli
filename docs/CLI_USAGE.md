# CLI Usage

The Cracked Dev CLI provides a powerful interface to interact with Large Language Models (LLMs) for code-based tasks. Below are the available flags and their usage.

## Getting Started

To initialize the CLI configuration:

```bash
yarn dev:cli crkd --init
```

This will create a default `crkdrc.json` configuration file in your project root. You should then adjust the configuration with your preferred settings and API keys.

## Flags

- `--init`: Initialize a default crkdrc.json configuration file. This flag must be used alone.
- `-r, --root`: Specifies the root path of the codebase to operate on. If not provided, the current directory is used.
- `--instructions-path`: Path to a custom instructions file. This file provides additional context and instructions to the LLM.
- `--instructions`: A raw string containing custom instructions for the LLM. Useful for quick inline instructions without a file.
- `-m, --model`: The AI model to use. Defaults to "gpt-4".
- `-p, --provider`: The LLM provider to use. Specifies which backend service to communicate with.
- `-s, --stream`: Streams the AI response, allowing real-time interaction.
- `-d, --debug`: Enables debug mode, providing detailed logs for troubleshooting.
- `-o, --options`: Custom LLM options in `key=value` format. Customize model behavior and response generation.
- `-i, --interactive`: Enables interactive mode for continuous conversation.
- `--auto-scaler`: Enables auto-scaling of the model based on the number of tries. When enabled, the model will scale up or down based on the try count.

All flags except `--init` can be configured in `crkdrc.json`. Command-line flags will override the configuration file values.

## Best Practices

- **Typed Language**: The CLI works best in a typed language like TypeScript, which helps catch errors early and improves code quality.
- **Tests**: Ensure you have a robust suite of tests. The CLI relies on feedback from tests to determine if its actions are moving towards the goal.
- **Path Aliases**: Configure path aliases to simplify imports and make your codebase more maintainable.

## Examples

### Basic Usage

To run the CLI with a specific model and provider in debug mode with streaming:

```bash
yarn dev:cli crkd --provider "open-router" --model "qwen/qwen-2.5-coder-32b-instruct" --stream --interactive --debug
```

This command uses the `qwen/qwen-2.5-coder-32b-instruct` model from `open-router`, streams the response, and enables debug mode.

### Example Usage with Custom Instructions

To provide custom instructions and options:

```bash
yarn dev:cli crkd --instructions "Follow clean code" --provider "open-router" --model "openai/gpt-4o-mini" --options "temperature=0.7,max_tokens=2000,top_p=0.9" "Tell me which files from my system you find interesting?" --stream
```

This command sends a request with custom instructions `"Follow clean code"`, uses the `openai/gpt-4o-mini` model, and streams the response with specified options.

### Example Usage with Root Path

To specify a root path for the codebase:

```bash
yarn dev:cli crkd --root ./my-project --provider "open-router" --model "gpt-4" "Add error handling"
```

This command operates on the `./my-project` directory, uses the `gpt-4` model from `open-router`, and performs the task of adding error handling.

### Example Usage with Instructions Path

To use a custom instructions file:

```bash
yarn dev:cli crkd --instructions-path ./instructions.md --provider "open-router" --model "gpt-4" "Create component"
```

This command uses the instructions provided in `./instructions.md`, uses the `gpt-4` model from `open-router`, and creates a component.

### Interactive Mode

To start the CLI in interactive mode:

```bash
yarn dev:cli crkd --interactive -m gpt-4 -p open-router
```

This command starts the CLI in interactive mode, allowing you to continuously send messages to the AI and receive responses. Type "exit" or press Ctrl+C to quit.

### Auto-Scaler Mode

To enable auto-scaling of the model based on the number of tries:

```bash
yarn dev:cli crkd --auto-scaler --provider "open-router" --model "gpt-4" "Create component"
```

This command enables auto-scaling, which will adjust the model based on the number of tries, using the `gpt-4` model from `open-router`, and creates a component.

## Available Options

You can customize the LLM behavior using the following options in the format `key=value,key2=value2`:

- `temperature` (0.0 to 2.0): Controls randomness. Lower values make output more focused and deterministic.
  Example: `temperature=0.7`
- `max_tokens` (1 or above): Maximum number of tokens to generate.
  Example: `max_tokens=2000`
- `top_p` (0.0 to 1.0): Controls diversity via nucleus sampling.
  Example: `top_p=0.9`
- `frequency_penalty` (-2.0 to 2.0): Positive values penalize tokens based on their frequency.
  Example: `frequency_penalty=0.5`
- `presence_penalty` (-2.0 to 2.0): Positive values penalize tokens that have appeared before.
  Example: `presence_penalty=0.5`
- `repetition_penalty` (0.0 to 2.0): Higher values reduce token repetition.
  Example: `repetition_penalty=1.2`
- `top_k` (0 or above): Limits token choices to top K options.
  Example: `top_k=40`
- `min_p` (0.0 to 1.0): Minimum probability threshold for token selection.
  Example: `min_p=0.05`
- `top_a` (0.0 to 1.0): Dynamic probability threshold based on the highest token probability.
  Example: `top_a=0.8`
- `seed` (integer): For deterministic outputs.
  Example: `seed=42`
