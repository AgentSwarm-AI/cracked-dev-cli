# CrackedAgent Application Flow

This document outlines the critical path application flow starting from `CrackedAgent.ts`. The `CrackedAgent` class interacts with a Language Model (LLM) to parse and execute actions based on the messages it receives. The primary interaction occurs through the `LLMProvider`, which utilizes the `OpenRouterAPI` to communicate with the OpenRouter service.

## Sequence of Execution

1. **Initialization**:

   - The `CrackedAgent` initializes with dependencies including `FileReader`, `ActionsParser`, `LLMContextCreator`, `DebugLogger`, and `StreamHandler`.
   - The `LLMProvider` is instantiated and configured with the `OpenRouterAPI`.

2. **Execute Method**:

   - The `execute` method processes the input message and options.
   - It sets up execution by merging default options and initializing the LLM.
   - A context for the message is created and the model is validated.
   - Depending on the `stream` option, it either handles normal execution or streaming execution.

3. **Setup Execution**:

   - Default options are merged with provided options.
   - The LLM provider (`OpenRouterAPI`) is initialized using `LLMProvider.getInstance`.
   - The stream and actions parser are reset.
   - The conversation history is cleared if requested.
   - The model is validated using `OpenRouterAPI`.
   - Instructions are set up, either from the provided path or default instructions.

4. **Handle Normal Execution**:

   - A message is sent to the LLM using `OpenRouterAPI` and the response is logged.
   - Any actions in the response are parsed and executed.
   - The response and any actions are returned.

5. **Handle Stream Execution**:

   - A message is streamed to the LLM using `OpenRouterAPI`, appending each chunk to the buffer.
   - Actions from the stream buffer are parsed and executed.
   - The response and any actions are returned.

6. **Parse and Execute Actions**:

   - Actions from the response or stream buffer are parsed using `ActionsParser`.
   - Each action is executed and results are logged using `DebugLogger`.
   - Follow-up messages are processed recursively.

7. **LLM Interaction with OpenRouterAPI**:

   - The `OpenRouterAPI` sends messages to the model and receives responses.
   - It manages conversation history and model validation.
   - It handles both streaming and normal message exchanges.

   Methods include:

   - `sendMessage` for sending non-streaming messages.
   - `sendMessageWithContext` for messages with system instructions.
   - `clearConversationContext` for clearing conversation history.
   - `getConversationContext` for retrieving the current conversation context.
   - `addSystemInstructions` for adding system-level instructions.
   - `getAvailableModels` for fetching available models from the provider.
   - `validateModel` for validating the specified model.
   - `getModelInfo` for retrieving detailed information about a specific model.
   - `streamMessage` for streaming messages.

8. **Debugging**:

   - The `DebugLogger` logs various steps and data for debugging.
   - It can be enabled or disabled based on the `debug` option.

## Mermaid Diagram

```mermaid
graph TD
   A[CrackedAgent execute] --> B[Setup Execution]
   B --> B1[Merge Options]
   B --> B2[Initialize LLMProvider]
   B2 --> B2a[Get Instance from LLMProvider]
   B --> B3[Reset Stream Handler]
   B --> B4[Reset Actions Parser]
   B --> B5[Clear Conversation History if needed]
   B --> B6[Validate Model using OpenRouterAPI]
   B --> B7[Setup Instructions]
   B7 -->|Instructions File| B7a[Read Instructions File]
   B7 -->|No File| B7b[Add System Instructions]
   B7b -->|Default Instructions| B7c[Add Default Instructions]

   A --> C[Stream]
   C -- Yes --> D[Handle Stream Execution]
   D --> D1[Stream Message using OpenRouterAPI]
   D --> D2[Parse and Execute Actions Stream]
   D2 --> D3[Recursive Parse and Execute Actions Follow ups]

   C -- No --> E[Handle Normal Execution]
   E --> E1[Send Message using OpenRouterAPI]
   E --> E2[Log Response]
   E --> E3[Parse and Execute Actions Normal]
   E3 --> E4[Recursive Parse and Execute Actions Follow ups]

   D2 --> F[Actions Parser]
   E3 --> F

   F --> G[Execute Actions]
   F --> H[OpenRouterAPI]
   H --> I[Send Message]
   H --> J[Receive Response]
   H --> K[Manage Conversation History]
   H --> L[Validate Model]
   H --> M[Handle Streaming]
   H --> N[Handle Normal Messaging]

   B --> O[DebugLogger]
   O --> P[Log Steps and Data]
   O --> Q[Enable Disable Debugging]
```
