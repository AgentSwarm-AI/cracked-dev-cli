import { z } from 'zod';
export { Run } from './commands/run.js';
import '@oclif/core/lib/interfaces';
import '@oclif/core';

interface IConversationHistoryMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

declare class FileReader {
    readInstructionsFile(filePath: string): Promise<string>;
    private validateFilePath;
    private readFileContent;
}

declare const configSchema: z.ZodObject<{
    provider: z.ZodString;
    customInstructions: z.ZodOptional<z.ZodString>;
    customInstructionsPath: z.ZodOptional<z.ZodString>;
    interactive: z.ZodBoolean;
    stream: z.ZodBoolean;
    debug: z.ZodBoolean;
    options: z.ZodString;
    openRouterApiKey: z.ZodString;
    appUrl: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    appName: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    autoScaler: z.ZodOptional<z.ZodBoolean>;
    autoScaleMaxTryPerModel: z.ZodOptional<z.ZodNumber>;
    includeAllFilesOnEnvToContext: z.ZodOptional<z.ZodBoolean>;
    discoveryModel: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    strategyModel: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    executeModel: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    autoScaleAvailableModels: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        description: z.ZodString;
        maxWriteTries: z.ZodNumber;
        maxGlobalTries: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        maxWriteTries: number;
        maxGlobalTries: number;
    }, {
        id: string;
        description: string;
        maxWriteTries: number;
        maxGlobalTries: number;
    }>, "many">;
    runAllTestsCmd: z.ZodOptional<z.ZodString>;
    runOneTestCmd: z.ZodOptional<z.ZodString>;
    runTypeCheckCmd: z.ZodOptional<z.ZodString>;
    enableConversationLog: z.ZodOptional<z.ZodBoolean>;
    logDirectory: z.ZodOptional<z.ZodString>;
    directoryScanner: z.ZodDefault<z.ZodObject<{
        defaultIgnore: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        maxDepth: z.ZodDefault<z.ZodNumber>;
        allFiles: z.ZodDefault<z.ZodBoolean>;
        directoryFirst: z.ZodDefault<z.ZodBoolean>;
        excludeDirectories: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        defaultIgnore: string[];
        maxDepth: number;
        allFiles: boolean;
        directoryFirst: boolean;
        excludeDirectories: boolean;
    }, {
        defaultIgnore?: string[] | undefined;
        maxDepth?: number | undefined;
        allFiles?: boolean | undefined;
        directoryFirst?: boolean | undefined;
        excludeDirectories?: boolean | undefined;
    }>>;
    gitDiff: z.ZodDefault<z.ZodObject<{
        excludeLockFiles: z.ZodDefault<z.ZodBoolean>;
        lockFiles: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        excludeLockFiles: boolean;
        lockFiles: string[];
    }, {
        excludeLockFiles?: boolean | undefined;
        lockFiles?: string[] | undefined;
    }>>;
    referenceExamples: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>>;
    projectLanguage: z.ZodDefault<z.ZodString>;
    packageManager: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    provider: string;
    interactive: boolean;
    stream: boolean;
    debug: boolean;
    options: string;
    openRouterApiKey: string;
    appUrl: string;
    appName: string;
    discoveryModel: string;
    strategyModel: string;
    executeModel: string;
    autoScaleAvailableModels: {
        id: string;
        description: string;
        maxWriteTries: number;
        maxGlobalTries: number;
    }[];
    directoryScanner: {
        defaultIgnore: string[];
        maxDepth: number;
        allFiles: boolean;
        directoryFirst: boolean;
        excludeDirectories: boolean;
    };
    gitDiff: {
        excludeLockFiles: boolean;
        lockFiles: string[];
    };
    referenceExamples: Record<string, string>;
    projectLanguage: string;
    packageManager: string;
    customInstructions?: string | undefined;
    customInstructionsPath?: string | undefined;
    autoScaler?: boolean | undefined;
    autoScaleMaxTryPerModel?: number | undefined;
    includeAllFilesOnEnvToContext?: boolean | undefined;
    runAllTestsCmd?: string | undefined;
    runOneTestCmd?: string | undefined;
    runTypeCheckCmd?: string | undefined;
    enableConversationLog?: boolean | undefined;
    logDirectory?: string | undefined;
}, {
    provider: string;
    interactive: boolean;
    stream: boolean;
    debug: boolean;
    options: string;
    openRouterApiKey: string;
    autoScaleAvailableModels: {
        id: string;
        description: string;
        maxWriteTries: number;
        maxGlobalTries: number;
    }[];
    customInstructions?: string | undefined;
    customInstructionsPath?: string | undefined;
    appUrl?: string | undefined;
    appName?: string | undefined;
    autoScaler?: boolean | undefined;
    autoScaleMaxTryPerModel?: number | undefined;
    includeAllFilesOnEnvToContext?: boolean | undefined;
    discoveryModel?: string | undefined;
    strategyModel?: string | undefined;
    executeModel?: string | undefined;
    runAllTestsCmd?: string | undefined;
    runOneTestCmd?: string | undefined;
    runTypeCheckCmd?: string | undefined;
    enableConversationLog?: boolean | undefined;
    logDirectory?: string | undefined;
    directoryScanner?: {
        defaultIgnore?: string[] | undefined;
        maxDepth?: number | undefined;
        allFiles?: boolean | undefined;
        directoryFirst?: boolean | undefined;
        excludeDirectories?: boolean | undefined;
    } | undefined;
    gitDiff?: {
        excludeLockFiles?: boolean | undefined;
        lockFiles?: string[] | undefined;
    } | undefined;
    referenceExamples?: Record<string, string> | undefined;
    projectLanguage?: string | undefined;
    packageManager?: string | undefined;
}>;
type Config = z.infer<typeof configSchema>;
declare class ConfigService {
    private readonly CONFIG_PATH;
    private readonly GITIGNORE_PATH;
    private ensureGitIgnore;
    createDefaultConfig(): void;
    getConfig(): Config;
}

interface IFileStats {
    size: number;
    createdAt: Date;
    modifiedAt: Date;
    isDirectory: boolean;
    path: string;
}
interface IFileOperationResult {
    success: boolean;
    error?: Error;
    data?: IFileStats | string | void | Record<string, string>;
}

interface IDirectoryScanner {
    scan(path: string, options?: Partial<TreeOptions>): Promise<IFileOperationResult>;
}
interface TreeOptions {
    ignore: string[];
    allFiles?: boolean;
    maxDepth?: number;
    noreport?: boolean;
    base?: string;
    directoryFirst?: boolean;
    excludeDirectories?: boolean;
}

declare class DirectoryScanner implements IDirectoryScanner {
    private configService;
    private readonly REQUIRED_IGNORE;
    constructor(configService: ConfigService);
    private get defaultOptions();
    private getAllFiles;
    scan(dirPath: string, options?: Partial<TreeOptions>): Promise<IFileOperationResult>;
}

declare class DebugLogger {
    private debug;
    constructor();
    setDebug(debug: boolean): void;
    private formatData;
    log(type: string, message: string, data?: any): void;
}

interface IModelArchitecture {
    tokenizer: string;
    instruct_type: string;
    modality: string;
}
interface IModelPricing {
    prompt: string;
    completion: string;
    request: string;
    image: string;
}
interface IModelProvider {
    context_length: number;
    max_completion_tokens: number;
    is_moderated: boolean;
}
interface IModelRequestLimits {
    prompt_tokens: number | null;
    completion_tokens: number | null;
}
interface IModelInfo {
    id: string;
    name: string;
    created: number;
    description: string;
    pricing: IModelPricing;
    context_length: number;
    architecture: IModelArchitecture;
    top_provider: IModelProvider;
    per_request_limits: IModelRequestLimits;
}

declare class ModelInfo {
    private debugLogger;
    private modelInfoMap;
    private currentModel;
    private currentModelInfo;
    private initialized;
    private usageHistory;
    constructor(debugLogger: DebugLogger);
    initialize(): Promise<void>;
    private ensureInitialized;
    setCurrentModel(modelId: string): Promise<void>;
    getCurrentModel(): string | null;
    getModelInfo(modelId: string): Promise<IModelInfo | undefined>;
    getCurrentModelInfo(): IModelInfo | null;
    getCurrentModelContextLength(): Promise<number>;
    getModelContextLength(modelId: string): Promise<number>;
    getAllModels(): Promise<string[]>;
    isModelAvailable(modelId: string): Promise<boolean>;
    getModelMaxCompletionTokens(modelId: string): Promise<number>;
    getCurrentModelMaxCompletionTokens(): Promise<number>;
    logCurrentModelUsage(usedTokens: number): Promise<void>;
    logDetailedUsage(usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    }): Promise<void>;
    getUsageHistory(): {
        [model: string]: {
            prompt_tokens: number;
            completion_tokens: number;
            total_tokens: number;
        }[];
    };
}

declare class ModelManager {
    private modelInfo;
    private debugLogger;
    private currentModel;
    constructor(modelInfo: ModelInfo, debugLogger: DebugLogger);
    setCurrentModel(model: string): void;
    getCurrentModel(): string;
}

declare enum Phase {
    Discovery = "discovery",
    Strategy = "strategy",
    Execute = "execute"
}
interface IPhasePromptArgs {
    message: string;
    environmentDetails?: string;
    projectInfo?: string;
    [key: string]: any;
}
interface IPhaseConfig {
    model: string;
    generatePrompt: (args: IPhasePromptArgs) => string;
}

declare class PhaseManager {
    private configService;
    private modelManager;
    private currentPhase;
    private phaseConfigs;
    constructor(configService: ConfigService, modelManager: ModelManager);
    initializePhaseConfigs(): void;
    getCurrentPhase(): Phase;
    getCurrentPhaseConfig(): IPhaseConfig;
    setPhase(phase: Phase): void;
    getPhaseConfig(phase: Phase): IPhaseConfig;
    nextPhase(): Phase;
    resetPhase(): void;
}

declare class MessageContextTokenCount {
    private messageContextStore;
    constructor(messageContextStore: MessageContextStore);
    estimateTokenCount(messages: IConversationHistoryMessage[]): number;
    estimateTokenCountForMessage(message: IConversationHistoryMessage): number;
    estimateTokenCountForText(text: string): number;
    getTotalTokenCount(): number;
    getTokenCount(): number;
}

interface BaseOperation {
    timestamp: number;
    success?: boolean;
    error?: string;
}
interface MessageFileOperation extends BaseOperation {
    type: "read_file" | "write_file";
    path: string;
    content?: string;
}
interface MessageCommandOperation extends BaseOperation {
    type: "execute_command";
    command: string;
    output?: string;
}
interface MessagePhaseInstruction {
    phase: string;
    content: string;
    timestamp: number;
}
interface IMessageContextData {
    phaseInstructions: Map<string, MessagePhaseInstruction>;
    fileOperations: Map<string, MessageFileOperation>;
    commandOperations: Map<string, MessageCommandOperation>;
    conversationHistory: IConversationHistoryMessage[];
    systemInstructions: string | null;
}
declare class MessageContextStore {
    private messageContextTokenCount;
    private contextData;
    constructor(messageContextTokenCount: MessageContextTokenCount);
    getContextData(): IMessageContextData;
    setContextData(data: Partial<IMessageContextData>): void;
    clear(): void;
    getTotalTokenCount(): number;
    private getUpdatedPhaseInstructions;
    private getUpdatedOperations;
    private getUpdatedValue;
}

type MessageOperation = MessageFileOperation | MessageCommandOperation;
declare class MessageContextExtractor {
    extractNonOperationContent(content: string): string;
    extractOperations(content: string): MessageOperation[];
    extractPhasePrompt(content: string): string | null;
}

type MessageRole = "user" | "assistant" | "system";
declare class MessageContextBuilder {
    private extractor;
    constructor(extractor: MessageContextExtractor);
    buildMessageContext(role: MessageRole, content: string, currentPhase: string, contextData: IMessageContextData): IMessageContextData;
    updateOperationResult(type: "read_file" | "write_file" | "execute_command", identifier: string, result: string, contextData: IMessageContextData, success?: boolean, error?: string): IMessageContextData;
    getMessageContext(contextData: IMessageContextData): IConversationHistoryMessage[];
    getLatestPhaseInstructions(contextData: IMessageContextData): string | null;
    getFileOperation(path: string, contextData: IMessageContextData): MessageFileOperation | undefined;
    getCommandOperation(command: string, contextData: IMessageContextData): MessageCommandOperation | undefined;
    private validateContent;
    private validateRole;
    private validateContextData;
    private isValidPhasePrompt;
    private extractPhasePromptContent;
}

interface MessageIActionResult {
    success: boolean;
    error?: Error;
    result?: string;
}
declare class MessageContextLogger {
    private debugLogger;
    private configService;
    private messageContextBuilder;
    private messageContextStore;
    private readonly logDirectory;
    private readonly conversationLogPath;
    private readonly conversationHistoryPath;
    private readonly logLock;
    private isLogging;
    constructor(debugLogger: DebugLogger, configService: ConfigService, messageContextBuilder: MessageContextBuilder, messageContextStore: MessageContextStore);
    private getLogDirectory;
    private acquireLogLock;
    private releaseLogLock;
    private ensureLogDirectoryExists;
    private ensureHistoryFileExists;
    cleanupLogFiles(): Promise<void>;
    logMessage(message: IConversationHistoryMessage): Promise<void>;
    logActionResult(action: string, result: MessageIActionResult): Promise<void>;
    updateConversationHistory(messages: IConversationHistoryMessage[], systemInstructions: string | null): Promise<void>;
    getLogDirectoryPath(): string;
    getConversationLogPath(): string;
    getConversationHistoryPath(): string;
    getConversationHistory(): Promise<IConversationHistoryMessage[]>;
}

declare class MessageContextHistory {
    private messageContextStore;
    private messageContextLogger;
    private phaseManager;
    private messageContextBuilder;
    constructor(messageContextStore: MessageContextStore, messageContextLogger: MessageContextLogger, phaseManager: PhaseManager, messageContextBuilder: MessageContextBuilder);
    addMessage(role: string, content: string, log?: boolean, isFirstMessage?: boolean): boolean;
    getMessages(): IConversationHistoryMessage[];
    clear(): void;
    setSystemInstructions(instructions: string): void;
    getSystemInstructions(): string | null;
    updateLogFile(): void;
    private cleanContent;
    private logMessage;
    private isLoggingEnabled;
}

declare class ActionTagsExtractor {
    private getParameterTags;
    /**
     * Validates if a tag has proper XML structure
     * @param content Full text content to validate
     * @returns Message indicating if structure is valid or what's wrong
     */
    validateStructure(content: string): string;
    /**
     * Extracts content from a single tag
     * @param content Full text content
     * @param tagName Name of the tag to extract
     * @returns The content within the tag or null if not found
     */
    extractTag(content: string, tagName: string): string | string[] | null;
    /**
     * Extracts content from multiple instances of the same tag
     * @param content Full text content
     * @param tagName Name of the tag to extract
     * @returns Array of content within each instance of the tag
     */
    extractTags(content: string, tagName: string): string[];
    /**
     * Extracts content from a tag and splits it into lines
     * @param content Full text content
     * @param tagName Name of the tag to extract
     * @returns Array of non-empty trimmed lines from the tag content
     */
    extractTagLines(content: string, tagName: string): string[];
    /**
     * Extracts nested tags from within a parent tag
     * @param content Full text content
     * @param parentTag Parent tag name
     * @param childTag string
     * @returns Array of content within child tags, found within the parent tag
     */
    extractNestedTags(content: string, parentTag: string, childTag: string): string[];
    /**
     * Extracts all instances of a tag with their complete content
     * @param content Full text content
     * @param tagName Name of the tag to extract
     * @returns Array of complete tag contents including nested tags
     */
    extractAllTagsWithContent(content: string, tagName: string): string[];
}

declare class CommandError extends Error {
    readonly data?: string | undefined;
    readonly exitCode?: (number | null) | undefined;
    constructor(message: string, data?: string | undefined, exitCode?: (number | null) | undefined);
}

type ValidatorFn = (value: string | number | boolean | unknown) => boolean;
interface WriteActionData {
    selectedModel?: string;
    regenerate?: boolean;
    [key: string]: unknown;
}
interface IActionResult {
    success: boolean;
    data?: WriteActionData | unknown;
    error?: Error | CommandError;
    processedResults?: Map<string, unknown>;
}
interface IActionDependency {
    actionId: string;
    type: ActionTag;
    content: string;
    dependsOn?: string[];
}
interface IActionGroup {
    actions: IActionDependency[];
    parallel: boolean;
}
interface IActionExecutionPlan {
    groups: IActionGroup[];
}

interface IActionParameter {
    name: string;
    required: boolean;
    description: string;
    validator?: ValidatorFn;
    mayContainNestedContent?: boolean;
}
interface IAction {
    execute(...args: unknown[]): Promise<IActionResult>;
}
type ActionConstructor = {
    new (actionTagsExtractor: ActionTagsExtractor, ...dependencies: any[]): IAction;
};
interface IActionBlueprint {
    tag: string;
    class: ActionConstructor;
    description: string;
    usageExplanation: string;
    parameters?: IActionParameter[];
    canRunInParallel?: boolean;
    priority?: number;
    requiresProcessing?: boolean;
}

declare const actionsBlueprints: {
    readonly [x: string]: IActionBlueprint;
};
type ActionTag = keyof typeof actionsBlueprints & string;

declare class ActionFactory {
    private blueprintCache;
    private instanceCache;
    constructor();
    getBlueprint(tag: string): IActionBlueprint | undefined;
    getAllBlueprints(): IActionBlueprint[];
    createAction(tag: ActionTag): IAction | undefined;
    validateParameters(tag: string, params: Record<string, any>): string | null;
}

declare enum ActionPriority {
    /**
     * Critical priority for actions that must be executed first
     * Example: read_file when mixed with other actions
     */
    CRITICAL = 1,
    /**
     * High priority for actions that should be executed early
     * Example: search operations, path lookups
     */
    HIGH = 2,
    /**
     * Medium priority for standard file operations
     * Example: write_file, move_file, copy_file
     */
    MEDIUM = 3,
    /**
     * Low priority for actions that should be executed later
     * Example: fetch_url, execute_command
     */
    LOW = 4,
    /**
     * Lowest priority for actions that should be executed last
     * Example: end_task
     */
    LOWEST = 5
}

interface QueuedAction {
    type: string;
    content: string;
    priority: ActionPriority;
    requiresProcessing: boolean;
    result?: IActionResult;
}
declare class ActionQueue {
    private queue;
    private processedResults;
    enqueue(type: string, content: string): void;
    dequeue(): QueuedAction | undefined;
    setActionResult(type: string, content: string, result: IActionResult): void;
    getProcessedResults(): Map<string, unknown>;
    isEmpty(): boolean;
    size(): number;
    clear(): void;
}

declare class ActionExecutor {
    private actionFactory;
    private actionQueue;
    private messageContextLogger;
    private messageContextHistory;
    constructor(actionFactory: ActionFactory, actionQueue: ActionQueue, messageContextLogger: MessageContextLogger, messageContextHistory: MessageContextHistory);
    executeAction(actionText: string): Promise<IActionResult>;
}

interface IProjectInfo {
    mainDependencies: string[];
    scripts: Record<string, string>;
    dependencyFile?: string;
}
declare class ProjectInfo {
    constructor();
    gatherProjectInfo(projectRoot: string): Promise<IProjectInfo>;
    private gatherNodeInfo;
    private gatherPythonInfo;
    private gatherRustInfo;
    private gatherGoInfo;
}

declare class MessageContextCleaner {
    private debugLogger;
    private modelInfo;
    private messageContextStore;
    private messageContextBuilder;
    private messageContextHistory;
    private messageContextTokenCount;
    constructor(debugLogger: DebugLogger, modelInfo: ModelInfo, messageContextStore: MessageContextStore, messageContextBuilder: MessageContextBuilder, messageContextHistory: MessageContextHistory, messageContextTokenCount: MessageContextTokenCount);
    cleanupContext(): Promise<boolean>;
}

declare class LLMContextCreator {
    private directoryScanner;
    private actionExecutor;
    private projectInfo;
    private configService;
    private phaseManager;
    private messageContextCleaner;
    private messageContextBuilder;
    private messageContextStore;
    constructor(directoryScanner: DirectoryScanner, actionExecutor: ActionExecutor, projectInfo: ProjectInfo, configService: ConfigService, phaseManager: PhaseManager, messageContextCleaner: MessageContextCleaner, messageContextBuilder: MessageContextBuilder, messageContextStore: MessageContextStore);
    private loadCustomInstructions;
    create(message: string, root: string, isFirstMessage?: boolean): Promise<string>;
    private getEnvironmentDetails;
    private getProjectInfo;
    private formatInitialInstructions;
    private formatFirstTimeMessage;
    private formatSequentialMessage;
    executeAction(actionContent: string): Promise<IActionResult>;
}

interface IHtmlEntityDecoderOptions {
    unescape?: boolean;
    unescapeChars?: string[];
}
declare class HtmlEntityDecoder {
    /**
     * Decodes HTML entities and cleans up character escaping in the provided text.
     * @param text The string containing HTML entities and escaped characters.
     * @param options Configuration options for decoding
     * @returns The decoded and unescaped string.
     */
    decode(text: string, options?: IHtmlEntityDecoderOptions): string;
    /**
     * Unescapes specific backslash-escaped characters in a string.
     * @param str The string with escaped characters.
     * @param chars Optional array of specific characters to unescape
     * @returns The unescaped string.
     */
    private unescapeString;
}

interface ActionExecutionResult {
    actions: Array<{
        action: string;
        result: any;
    }>;
    followupResponse?: string;
    selectedModel?: string;
}
declare class ActionsParser {
    private debugLogger;
    private contextCreator;
    private htmlEntityDecoder;
    private actionTagsExtractor;
    private currentMessageBuffer;
    private isProcessingAction;
    private messageComplete;
    private processedTags;
    private currentModel;
    constructor(debugLogger: DebugLogger, contextCreator: LLMContextCreator, htmlEntityDecoder: HtmlEntityDecoder, actionTagsExtractor: ActionTagsExtractor);
    reset(): void;
    isCompleteMessage(text: string): boolean;
    private getActionsWithPathParam;
    extractFilePath(tag: string): string | null;
    extractUrl(tag: string): string | null;
    private extractContentFromAction;
    private detectActionDependencies;
    private createExecutionPlan;
    findCompleteTags(text: string): IActionExecutionPlan;
    appendToBuffer(chunk: string): void;
    clearBuffer(): void;
    get buffer(): string;
    get isProcessing(): boolean;
    set isProcessing(value: boolean);
    get isComplete(): boolean;
    set isComplete(value: boolean);
    private formatActionResult;
    parseAndExecuteActions(text: string, model: string, llmCallback: (message: string) => Promise<string>): Promise<ActionExecutionResult>;
}

declare enum LLMProviderType {
    OpenRouter = "open-router"
}

declare class LLMError extends Error {
    readonly type: string;
    readonly details: Record<string, unknown>;
    constructor(message: string, type: string, details?: Record<string, unknown>);
}

interface StreamCallback {
    (message: string): Promise<string>;
}
interface StreamChunkCallback {
    (chunk: string, error?: LLMError): void;
}
declare class StreamHandler {
    private debugLogger;
    private actionsParser;
    private responseBuffer;
    private isStreamComplete;
    private lastActivityTimestamp;
    private bufferSize;
    private inactivityTimer;
    constructor(debugLogger: DebugLogger, actionsParser: ActionsParser);
    reset(): void;
    get response(): string;
    private formatErrorDisplay;
    private displayError;
    private safeWriteToStdout;
    private safeClearLine;
    private safeCursorTo;
    private processChunk;
    private handleBufferOverflow;
    private startInactivityTimer;
    private clearInactivityTimer;
    handleChunk(chunk: string, model: string, llmCallback: StreamCallback, streamCallback: (message: string, callback: StreamChunkCallback) => Promise<void>, options?: Record<string, unknown>): Promise<{
        action: string;
        result: any;
    }[]>;
}

interface CrackedAgentOptions {
    root?: string;
    instructionsPath?: string;
    instructions?: string;
    provider?: LLMProviderType;
    stream?: boolean;
    debug?: boolean;
    options?: Record<string, unknown>;
    clearContext?: boolean;
    autoScaler?: boolean;
}
interface ExecutionResult {
    response: string;
    actions?: Array<{
        action: string;
        result: any;
    }>;
}
declare class CrackedAgent {
    private fileReader;
    private contextCreator;
    private debugLogger;
    private actionsParser;
    private streamHandler;
    private phaseManager;
    private modelManager;
    private llm;
    private isFirstInteraction;
    private currentModel;
    constructor(fileReader: FileReader, contextCreator: LLMContextCreator, debugLogger: DebugLogger, actionsParser: ActionsParser, streamHandler: StreamHandler, phaseManager: PhaseManager, modelManager: ModelManager);
    execute(message: string, options: CrackedAgentOptions): Promise<ExecutionResult>;
    private setupExecution;
    private validateModel;
    private setupInstructions;
    private handleStreamExecution;
    private handleNormalExecution;
    private parseAndExecuteWithCallback;
    getConversationHistory(): IConversationHistoryMessage[];
    clearConversationHistory(): void;
}

declare const crackedAgent: CrackedAgent;

export { crackedAgent };
