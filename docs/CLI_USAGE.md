# CLI Usage

## Flags

- `-r, --root`: Root path of the codebase to operate on (default: current directory)
- `--instructions-path`: Path to custom instructions file
- `--instructions`: Raw custom instructions string
- `-m, --model`: AI model to use (default: "gpt-4")
- `-p, --provider`: LLM provider to use
- `-s, --stream`: Stream the AI response
- `-d, --debug`: Enable debug mode
- `-o, --options`: LLM options in key=value format

## Examples

PS: `yarn dev:cli` is just to run the CLI in development mode. In production, you can use `crkd` directly.

Basic usage:

```bash
yarn dev:cli crkd --provider "open-router" --model "qwen/qwen-2.5-coder-32b-instruct" --stream --interactive --debug
```

Example usage:

```bash
 yarn dev:cli crkd --instructions "Follow clean code" --provider "open-router" --model "openai/gpt-4o-mini" --options "temperature=0.7,max_tokens=2000,top_p=0.9" "Tell me which files from my system you find interesting?" --stream
```

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

- `presence_penalty` (-2.0 to 2.0): Positive values penalize tokens that have appeared.
  Example: `presence_penalty=0.5`

- `repetition_penalty` (0.0 to 2.0): Higher values reduce token repetition.
  Example: `repetition_penalty=1.2`

- `top_k` (0 or above): Limits token choices to top K options.
  Example: `top_k=40`

- `min_p` (0.0 to 1.0): Minimum probability threshold for token selection.
  Example: `min_p=0.05`

- `top_a` (0.0 to 1.0): Dynamic probability threshold based on highest token.
  Example: `top_a=0.8`

- `seed` (integer): For deterministic outputs.
  Example: `seed=42`
