import { ConfigService } from "@services/ConfigService";
import { DebugLogger } from "@services/logging/DebugLogger";
import { ModelInfo } from "@services/LLM/ModelInfo";
import { MessageContextManager } from "../MessageContextManager";
import { MessageContextCleanup } from "../MessageContextCleanup";
import { MessageConversationLogger } from "../MessageConversationLogger";
import { MessageContextBuilder } from "../MessageContextBuilder";
import { IConversationHistoryMessage } from "@services/LLM/ILLMProvider";

describe('MessageContextCleanup', () => {
  let cleanup: MessageContextCleanup;
  let manager: MessageContextManager;
  let contextBuilder: MessageContextBuilder;
  let debugLogger: DebugLogger;
  let modelInfo: ModelInfo;
  let configService: ConfigService;
  let conversationLogger: MessageConversationLogger;

  beforeEach(() => {
    debugLogger = new DebugLogger();
    configService = new ConfigService();
    modelInfo = new ModelInfo(debugLogger);
    conversationLogger = new MessageConversationLogger(debugLogger, configService);
    contextBuilder = new MessageContextBuilder();
    manager = new MessageContextManager(debugLogger, modelInfo, configService, conversationLogger, contextBuilder, new MessageContextCleanup(contextBuilder));
    cleanup = new MessageContextCleanup(contextBuilder);
  });

  it('should clean up message context correctly', async () => {
    // Arrange
    contextBuilder.addMessage('user', 'Hello');
    contextBuilder.addMessage('assistant', 'World');
    const estimateTokens = jest.fn().mockReturnValue(100); // Return high token count to trigger cleanup

    // Act
    await cleanup.cleanupContext(50, estimateTokens); // Set max tokens lower than estimated

    // Assert
    const cleanedContext = contextBuilder.getConversationHistory().filter(msg => msg.role !== 'system');
    expect(cleanedContext.length).toBeLessThan(2);
  });

  it('should handle empty context without errors', async () => {
    // Arrange
    const estimateTokens = jest.fn().mockReturnValue(100);

    // Act & Assert
    expect(async () => await cleanup.cleanupContext(50, estimateTokens)).not.toThrow();
    const cleanedContext = contextBuilder.getConversationHistory().filter(msg => msg.role !== 'system');
    expect(cleanedContext).toHaveLength(0);
  });

  it('should maintain other context properties during cleanup', async () => {
    // Arrange
    contextBuilder.addMessage('user', 'Test');
    contextBuilder.setSystemInstructions('System Instructions');
    const estimateTokens = jest.fn().mockReturnValue(100); // High token count

    // Act
    await cleanup.cleanupContext(50, estimateTokens); // Lower max tokens

    // Assert
    const cleanedContext = contextBuilder.getConversationHistory().filter(msg => msg.role !== 'system');
    expect(cleanedContext).toHaveLength(0);
    expect(contextBuilder.getSystemInstructions()).toBe('System Instructions');
  });
});