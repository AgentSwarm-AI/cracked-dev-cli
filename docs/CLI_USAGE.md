# CLI Usage

The Cracked Dev CLI provides a powerful interface to interact with Large Language Models (LLMs) for code-based tasks. Below are the available flags and their usage.

## Flags

- `-r, --root`: Specifies the root path of the codebase to operate on. If not provided, the current directory is used.
- `--instructions-path`: Path to a custom instructions file. This file provides additional context and instructions to the LLM.
- `--instructions`: A raw string containing custom instructions for the LLM. Useful for quick inline instructions without a file.
- `-m, --model`: The AI model to use. Defaults to "gpt-4".
- `-p, --provider`: The LLM provider to use. Specifies which backend service to communicate with.
- `-s, --stream`: Streams the AI response, allowing real-time interaction.
- `-d, --debug`: Enables debug mode, providing detailed logs for troubleshooting.
- `-o, --options`: Custom LLM options in `key=value` format. Customize model behavior and response generation.

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