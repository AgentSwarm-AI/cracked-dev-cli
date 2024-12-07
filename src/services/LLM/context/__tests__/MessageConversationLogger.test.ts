import { MessageConversationLogger } from '../MessageConversationLogger';
import { DebugLogger } from '@services/logging/DebugLogger';
import { ConfigService } from '@services/ConfigService';
import { IConversationHistoryMessage } from '@services/LLM/ILLMProvider';
import * as path from 'path';

jest.mock('@services/logging/DebugLogger');
jest.mock('@services/ConfigService');

describe('MessageConversationLogger', () => {
  let logger: MessageConversationLogger;
  let debugLogger: jest.Mocked<DebugLogger>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    debugLogger = new DebugLogger() as jest.Mocked<DebugLogger>;
    configService = new ConfigService() as jest.Mocked<ConfigService>;

    // Mock the getConfig method to return a valid configuration object
    configService.getConfig.mockReturnValue({
      provider: 'open-router',
      customInstructions: 'Follow clean code principles',
      interactive: true,
      stream: true,
      debug: false,
      options: 'temperature=0,top_p=0.1,top_k=1,frequence_penalty=0.0,presence_penalty=0.0,repetition_penalty=1.0',
      openRouterApiKey: '',
      appUrl: 'https://localhost:8080',
      appName: 'MyCrackedApp',
      autoScaler: true,
      autoScaleMaxTryPerModel: 2,
      discoveryModel: 'google/gemini-flash-1.5-8b',
      strategyModel: 'qwen/qwq-32b-preview',
      executeModel: 'anthropic/claude-3.5-sonnet:beta',
      includeAllFilesOnEnvToContext: false,
      autoScaleAvailableModels: [
        {
          id: 'qwen/qwen-2.5-coder-32b-instruct',
          description: 'Cheap, fast, slightly better than GPT4o-mini',
          maxWriteTries: 5,
          maxGlobalTries: 10,
        },
        {
          id: 'anthropic/claude-3.5-sonnet:beta',
          description: 'Scaled model for retry attempts',
          maxWriteTries: 5,
          maxGlobalTries: 15,
        },
        {
          id: 'openai/gpt-4o-2024-11-20',
          description: 'Scaled model for retry attempts',
          maxWriteTries: 2,
          maxGlobalTries: 20,
        },
      ],
      runAllTestsCmd: 'yarn test',
      runOneTestCmd: 'yarn test {relativeTestPath}',
      runTypeCheckCmd: 'yarn typecheck',
      enableConversationLog: false,
      logDirectory: 'logs',
      directoryScanner: {
        defaultIgnore: [
          'dist',
          'coverage',
          '.next',
          'build',
          '.cache',
          '.husky',
        ],
        maxDepth: 8,
        allFiles: true,
        directoryFirst: true,
        excludeDirectories: false,
      },
    });

    logger = new MessageConversationLogger(debugLogger, configService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logMessage', () => {
    it('should log user message correctly', () => {
      const message: IConversationHistoryMessage = { role: 'user', content: 'test user message' };
      logger.logMessage(message);
      
      expect(debugLogger.log).toHaveBeenCalledWith('ConversationLogger', 'Message logged', { message });
    });

    it('should log assistant message correctly', () => {
      const message: IConversationHistoryMessage = { role: 'assistant', content: 'test assistant message' };
      logger.logMessage(message);
      
      expect(debugLogger.log).toHaveBeenCalledWith('ConversationLogger', 'Message logged', { message });
    });
  });

  describe('getConversationHistoryPath', () => {
    it('should return conversation history path', () => {
      const expectedPath = path.join(process.cwd(), 'logs', 'conversationHistory.json');
      const actualPath = logger.getConversationHistoryPath();
      expect(actualPath).toBe(expectedPath);
    });
  });

  describe('cleanupLogFiles', () => {
    it('should clean up log files', () => {
      logger.cleanupLogFiles();
      expect(debugLogger.log).toHaveBeenCalledWith('ConversationLogger', 'Log files cleaned up', { logDirectory: 'logs' });
    });
  });

  describe('getConversationHistory', () => {
    it('should return conversation history', () => {
      const messages: IConversationHistoryMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];
      logger.updateConversationHistory(messages, null);

      const history = logger.getConversationHistory();
      expect(history).toEqual(messages);
    });
  });
});