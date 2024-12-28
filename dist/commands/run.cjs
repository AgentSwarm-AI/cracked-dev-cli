"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/commands/run.ts
var run_exports = {};
__export(run_exports, {
  Run: () => Run
});
module.exports = __toCommonJS(run_exports);
var import_core = require("@oclif/core");

// src/constants/defaultInstructions.ts
var DEFAULT_INSTRUCTIONS = "You're an expert software engineer, master of your craft. Think deeply for each answer, ill tip $200.";

// src/services/FileManagement/Errors.ts
var _FileNotFoundError = class _FileNotFoundError extends Error {
  constructor(path10) {
    super(`File not found: ${path10}`);
    this.name = "FileNotFoundError";
  }
};
__name(_FileNotFoundError, "FileNotFoundError");
var FileNotFoundError = _FileNotFoundError;
var _FileReadError = class _FileReadError extends Error {
  constructor(path10, message) {
    super(`Failed to read file: ${path10} - ${message}`);
    this.name = "FileReadError";
  }
};
__name(_FileReadError, "FileReadError");
var FileReadError = _FileReadError;
var _InvalidFileError = class _InvalidFileError extends Error {
  constructor(path10) {
    super(`Instructions path must be a file: ${path10}`);
    this.name = "InvalidFileError";
  }
};
__name(_InvalidFileError, "InvalidFileError");
var InvalidFileError = _InvalidFileError;

// src/services/FileManagement/FileReader.ts
var import_promises = require("fs/promises");
var import_tsyringe = require("tsyringe");
function _ts_decorate(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate, "_ts_decorate");
var _FileReader = class _FileReader {
  async readInstructionsFile(filePath) {
    try {
      await this.validateFilePath(filePath);
      return await this.readFileContent(filePath);
    } catch (error) {
      if (error instanceof FileNotFoundError || error instanceof FileReadError || error instanceof InvalidFileError) {
        throw new FileReadError(filePath, error.message);
      }
      throw error;
    }
  }
  async validateFilePath(filePath) {
    const stats = await (0, import_promises.stat)(filePath);
    if (!stats.isFile()) {
      throw new Error(`Provided path ${filePath} is not a file`);
    }
  }
  async readFileContent(filePath) {
    return (0, import_promises.readFile)(filePath, "utf-8");
  }
};
__name(_FileReader, "FileReader");
var FileReader = _FileReader;
FileReader = _ts_decorate([
  (0, import_tsyringe.autoInjectable)()
], FileReader);

// src/services/ConfigService.ts
var import_chalk = __toESM(require("chalk"), 1);
var fs = __toESM(require("fs"), 1);
var path = __toESM(require("path"), 1);
var import_tsyringe2 = require("tsyringe");
var import_zod = require("zod");
function _ts_decorate2(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate2, "_ts_decorate");
var configSchema = import_zod.z.object({
  provider: import_zod.z.string(),
  customInstructions: import_zod.z.string().optional(),
  customInstructionsPath: import_zod.z.string().optional(),
  interactive: import_zod.z.boolean(),
  stream: import_zod.z.boolean(),
  debug: import_zod.z.boolean(),
  options: import_zod.z.string(),
  openRouterApiKey: import_zod.z.string(),
  appUrl: import_zod.z.string().optional().default("https://localhost:8080"),
  appName: import_zod.z.string().optional().default("MyApp"),
  autoScaler: import_zod.z.boolean().optional(),
  autoScaleMaxTryPerModel: import_zod.z.number().optional(),
  includeAllFilesOnEnvToContext: import_zod.z.boolean().optional(),
  // Phase-specific model configurations
  discoveryModel: import_zod.z.string().optional().default("google/gemini-flash-1.5-8b"),
  strategyModel: import_zod.z.string().optional().default("openai/o1-mini"),
  executeModel: import_zod.z.string().optional().default("anthropic/claude-3.5-sonnet:beta"),
  autoScaleAvailableModels: import_zod.z.array(import_zod.z.object({
    id: import_zod.z.string(),
    description: import_zod.z.string(),
    maxWriteTries: import_zod.z.number(),
    maxGlobalTries: import_zod.z.number()
  })),
  runAllTestsCmd: import_zod.z.string().optional(),
  runOneTestCmd: import_zod.z.string().optional(),
  runTypeCheckCmd: import_zod.z.string().optional(),
  enableConversationLog: import_zod.z.boolean().optional(),
  logDirectory: import_zod.z.string().optional(),
  directoryScanner: import_zod.z.object({
    defaultIgnore: import_zod.z.array(import_zod.z.string()).default([
      "dist",
      "coverage",
      ".next",
      "build",
      ".cache",
      ".husky"
    ]),
    maxDepth: import_zod.z.number().default(8),
    allFiles: import_zod.z.boolean().default(true),
    directoryFirst: import_zod.z.boolean().default(true),
    excludeDirectories: import_zod.z.boolean().default(false)
  }).default({
    defaultIgnore: [
      "dist",
      "coverage",
      ".next",
      "build",
      ".cache",
      ".husky"
    ],
    maxDepth: 8,
    allFiles: true,
    directoryFirst: true,
    excludeDirectories: false
  }),
  gitDiff: import_zod.z.object({
    excludeLockFiles: import_zod.z.boolean().default(true),
    lockFiles: import_zod.z.array(import_zod.z.string()).default([
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "Gemfile.lock",
      "composer.lock",
      "Pipfile.lock",
      "poetry.lock",
      "packages.lock.json",
      "Cargo.lock",
      "Podfile.lock",
      "mix.lock",
      "go.sum",
      "pubspec.lock"
    ])
  }).default({
    excludeLockFiles: true,
    lockFiles: [
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "Gemfile.lock",
      "composer.lock",
      "Pipfile.lock",
      "poetry.lock",
      "packages.lock.json",
      "Cargo.lock",
      "Podfile.lock",
      "mix.lock",
      "go.sum",
      "pubspec.lock"
    ]
  }),
  referenceExamples: import_zod.z.record(import_zod.z.string(), import_zod.z.string()).optional().default({}),
  projectLanguage: import_zod.z.string().default("typescript"),
  packageManager: import_zod.z.string().default("yarn")
});
var _ConfigService = class _ConfigService {
  constructor() {
    __publicField(this, "CONFIG_PATH", path.resolve("crkdrc.json"));
    __publicField(this, "GITIGNORE_PATH", path.resolve(".gitignore"));
  }
  ensureGitIgnore() {
    const gitignoreContent = fs.existsSync(this.GITIGNORE_PATH) ? fs.readFileSync(this.GITIGNORE_PATH, "utf-8") : "";
    if (!gitignoreContent.includes("crkdrc.json")) {
      const updatedContent = gitignoreContent.endsWith("\n") || gitignoreContent === "" ? `${gitignoreContent}crkdrc.json
` : `${gitignoreContent}
crkdrc.json
`;
      fs.writeFileSync(this.GITIGNORE_PATH, updatedContent);
    }
  }
  createDefaultConfig() {
    if (!fs.existsSync(this.CONFIG_PATH)) {
      console.log("Creating default crkdrc.json configuration...");
      const defaultConfig = {
        provider: "open-router",
        projectLanguage: "typescript",
        packageManager: "yarn",
        customInstructions: "Follow clean code principles",
        customInstructionsPath: "",
        interactive: true,
        stream: true,
        debug: false,
        options: "temperature=0,top_p=0.1,top_k=1,frequence_penalty=0.0,presence_penalty=0.0,repetition_penalty=1.0",
        openRouterApiKey: "",
        appUrl: "https://localhost:8080",
        appName: "MyCrackedApp",
        autoScaler: true,
        autoScaleMaxTryPerModel: 2,
        // Phase-specific model configurations
        discoveryModel: "google/gemini-flash-1.5-8b",
        strategyModel: "qwen/qwq-32b-preview",
        executeModel: "anthropic/claude-3.5-sonnet:beta",
        includeAllFilesOnEnvToContext: false,
        autoScaleAvailableModels: [
          {
            id: "qwen/qwen-2.5-coder-32b-instruct",
            description: "Cheap, fast, slightly better than GPT4o-mini",
            maxWriteTries: 5,
            maxGlobalTries: 10
          },
          {
            id: "anthropic/claude-3.5-sonnet:beta",
            description: "Scaled model for retry attempts",
            maxWriteTries: 5,
            maxGlobalTries: 15
          },
          {
            id: "openai/gpt-4o-2024-11-20",
            description: "Scaled model for retry attempts",
            maxWriteTries: 2,
            maxGlobalTries: 20
          }
        ],
        runAllTestsCmd: "yarn test",
        runOneTestCmd: "yarn test {relativeTestPath}",
        runTypeCheckCmd: "yarn typecheck",
        enableConversationLog: false,
        logDirectory: "logs",
        directoryScanner: {
          defaultIgnore: [
            "dist",
            "coverage",
            ".next",
            "build",
            ".cache",
            ".husky"
          ],
          maxDepth: 8,
          allFiles: true,
          directoryFirst: true,
          excludeDirectories: false
        },
        gitDiff: {
          excludeLockFiles: true,
          lockFiles: [
            "package-lock.json",
            "yarn.lock",
            "pnpm-lock.yaml",
            "Gemfile.lock",
            "composer.lock",
            "Pipfile.lock",
            "poetry.lock",
            "packages.lock.json",
            "Cargo.lock",
            "Podfile.lock",
            "mix.lock",
            "go.sum",
            "pubspec.lock"
          ]
        },
        referenceExamples: {
          example1: "path/to/example1/file.ts",
          example2: "path/to/example2/file.ts",
          myService: "src/services/MyService.ts",
          anotherKey: "path/to/some/other/example.ts"
        }
      };
      fs.writeFileSync(this.CONFIG_PATH, JSON.stringify(defaultConfig, null, 4));
      console.log("Default crkdrc.json configuration created. Please adjust it.");
      console.log(import_chalk.default.yellow("Warning: No OpenRouter API key provided. Please add it to crkdrc.json."));
      this.ensureGitIgnore();
      import_chalk.default.green("CrackedDevCLI config generated. Please, add Provider and API Key to crkdrc.json.");
    }
  }
  getConfig() {
    if (!fs.existsSync(this.CONFIG_PATH)) {
      this.createDefaultConfig();
    }
    const rawData = fs.readFileSync(this.CONFIG_PATH, "utf-8");
    const config4 = JSON.parse(rawData);
    const parsedConfig = configSchema.safeParse(config4);
    if (!parsedConfig.success) {
      console.error("Invalid configuration in crkdrc.json:", parsedConfig.error);
      throw new Error("Invalid configuration in crkdrc.json");
    }
    return parsedConfig.data;
  }
};
__name(_ConfigService, "ConfigService");
var ConfigService = _ConfigService;
ConfigService = _ts_decorate2([
  (0, import_tsyringe2.autoInjectable)()
], ConfigService);

// src/services/FileManagement/DirectoryScanner.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_tsyringe3 = require("tsyringe");
function _ts_decorate3(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate3, "_ts_decorate");
function _ts_metadata(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata, "_ts_metadata");
function _ts_param(paramIndex, decorator) {
  return function(target, key) {
    decorator(target, key, paramIndex);
  };
}
__name(_ts_param, "_ts_param");
var _DirectoryScanner = class _DirectoryScanner {
  constructor(configService4) {
    __publicField(this, "configService");
    __publicField(this, "REQUIRED_IGNORE");
    this.configService = configService4;
    this.REQUIRED_IGNORE = [
      "node_modules",
      ".git"
    ];
    if (!configService4) {
      throw new Error("ConfigService is required for DirectoryScanner");
    }
  }
  get defaultOptions() {
    const config4 = this.configService.getConfig();
    return {
      ignore: config4.directoryScanner.defaultIgnore,
      allFiles: config4.directoryScanner.allFiles,
      maxDepth: config4.directoryScanner.maxDepth,
      noreport: true,
      base: ".",
      directoryFirst: config4.directoryScanner.directoryFirst,
      excludeDirectories: config4.directoryScanner.excludeDirectories
    };
  }
  getAllFiles(dirPath, basePath, arrayOfFiles = [], ignore = [], currentDepth = 0, maxDepth = 4) {
    if (currentDepth > maxDepth) return arrayOfFiles;
    const files = import_fs.default.readdirSync(dirPath);
    files.forEach((file) => {
      if (ignore.includes(file)) return;
      const fullPath = import_path.default.join(dirPath, file);
      const relativePath = import_path.default.relative(basePath, fullPath);
      if (import_fs.default.statSync(fullPath).isDirectory()) {
        this.getAllFiles(fullPath, basePath, arrayOfFiles, ignore, currentDepth + 1, maxDepth);
      } else {
        arrayOfFiles.push(relativePath);
      }
    });
    return arrayOfFiles;
  }
  async scan(dirPath, options = {}) {
    try {
      const defaultOptions = this.defaultOptions;
      const scanOptions = {
        ...defaultOptions,
        ...options
      };
      const ignore = [
        ...this.REQUIRED_IGNORE,
        ...options.ignore || defaultOptions.ignore
      ];
      const absolutePath = import_path.default.resolve(dirPath);
      const files = this.getAllFiles(absolutePath, absolutePath, [], ignore, 0, scanOptions.maxDepth).sort();
      return {
        success: true,
        data: files.map((f) => f.trim()).join("\n")
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
};
__name(_DirectoryScanner, "DirectoryScanner");
var DirectoryScanner = _DirectoryScanner;
DirectoryScanner = _ts_decorate3([
  (0, import_tsyringe3.autoInjectable)(),
  _ts_param(0, (0, import_tsyringe3.inject)(ConfigService)),
  _ts_metadata("design:type", Function),
  _ts_metadata("design:paramtypes", [
    typeof ConfigService === "undefined" ? Object : ConfigService
  ])
], DirectoryScanner);

// src/services/LLM/actions/ActionExecutor.ts
var import_tsyringe45 = require("tsyringe");

// src/services/LLM/context/MessageContextHistory.ts
var import_tsyringe17 = require("tsyringe");

// src/services/LLM/PhaseManager.ts
var import_tsyringe11 = require("tsyringe");

// src/constants/colors.ts
var Colors = {
  reset: "\x1B[0m",
  cyan: "\x1B[36m",
  yellow: "\x1B[33m",
  green: "\x1B[32m",
  magenta: "\x1B[35m",
  blue: "\x1B[34m"
};

// src/services/logging/DebugLogger.ts
var import_tsyringe4 = require("tsyringe");
function _ts_decorate4(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate4, "_ts_decorate");
function _ts_metadata2(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata2, "_ts_metadata");
var _DebugLogger = class _DebugLogger {
  constructor() {
    __publicField(this, "debug", false);
  }
  setDebug(debug) {
    this.debug = debug;
  }
  formatData(data) {
    if (typeof data === "string") {
      return data;
    }
    if (typeof data === "object") {
      try {
        return JSON.stringify(data, null, 2).replace(/\\\\/g, "\\").replace(/\\"/g, '"').replace(/\\n/g, "\n");
      } catch {
        return String(data);
      }
    }
    return String(data);
  }
  log(type, message, data) {
    if (!this.debug) return;
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const divider = "\n" + "\u2550".repeat(100);
    const subDivider = "\u2500".repeat(80);
    console.log(divider);
    console.log(`${Colors.cyan}DEBUG${Colors.reset} [${timestamp}]`);
    console.log(`${Colors.yellow}${type}${Colors.reset}: ${message}`);
    if (data) {
      console.log(`
${Colors.magenta}Data:${Colors.reset}`);
      const formattedData = this.formatData(data).split("\n").map((line) => `  ${line}`).join("\n");
      console.log(`${Colors.blue}${formattedData}${Colors.reset}`);
      console.log(subDivider);
    }
  }
};
__name(_DebugLogger, "DebugLogger");
var DebugLogger = _DebugLogger;
DebugLogger = _ts_decorate4([
  (0, import_tsyringe4.singleton)(),
  (0, import_tsyringe4.autoInjectable)(),
  _ts_metadata2("design:type", Function),
  _ts_metadata2("design:paramtypes", [])
], DebugLogger);

// src/services/LLM/ModelManager.ts
var import_tsyringe7 = require("tsyringe");

// src/constants/openRouterClient.ts
var import_axios = __toESM(require("axios"), 1);
var import_tsyringe5 = require("tsyringe");
var createOpenRouterClient = /* @__PURE__ */ __name((baseURL) => {
  const configService4 = import_tsyringe5.container.resolve(ConfigService);
  const config4 = configService4.getConfig();
  const headers = {
    Authorization: `Bearer ${config4.openRouterApiKey}`,
    "Content-Type": "application/json"
  };
  if (config4.appUrl) {
    headers["HTTP-Referer"] = config4.appUrl;
  }
  if (config4.appName) {
    headers["X-Title"] = config4.appName;
  }
  return import_axios.default.create({
    baseURL,
    // Remove timeout for streaming support
    timeout: 0,
    headers,
    // Add necessary axios config for proper streaming
    maxBodyLength: Infinity,
    maxContentLength: Infinity
  });
}, "createOpenRouterClient");
var openRouterClient = createOpenRouterClient("https://openrouter.ai/api/v1");

// src/services/LLM/ModelInfo.ts
var import_tsyringe6 = require("tsyringe");
function _ts_decorate5(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate5, "_ts_decorate");
function _ts_metadata3(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata3, "_ts_metadata");
var _ModelInfo = class _ModelInfo {
  constructor(debugLogger) {
    __publicField(this, "debugLogger");
    __publicField(this, "modelInfoMap");
    __publicField(this, "currentModel");
    __publicField(this, "currentModelInfo");
    __publicField(this, "initialized");
    __publicField(this, "usageHistory");
    this.debugLogger = debugLogger;
    this.modelInfoMap = /* @__PURE__ */ new Map();
    this.currentModel = null;
    this.currentModelInfo = null;
    this.initialized = false;
    this.usageHistory = {};
  }
  async initialize() {
    try {
      const response = await openRouterClient.get("/models");
      const models = response.data.data;
      this.modelInfoMap.clear();
      models.forEach((model) => {
        this.modelInfoMap.set(model.id, model);
      });
      this.initialized = true;
    } catch (error) {
      this.debugLogger.log("ModelInfo", "Failed to initialize model list", {
        error
      });
      throw error;
    }
  }
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }
  async setCurrentModel(modelId) {
    await this.ensureInitialized();
    if (modelId === this.currentModel && this.currentModelInfo) {
      return;
    }
    if (!await this.isModelAvailable(modelId)) {
      throw new Error(`Invalid model: ${modelId}. Available models: ${Array.from(this.modelInfoMap.keys()).join(", ")}`);
    }
    const modelInfo = this.modelInfoMap.get(modelId);
    this.currentModel = modelId;
    this.currentModelInfo = modelInfo;
    if (!modelInfo) {
      return;
    }
    this.debugLogger.log("ModelInfo", "Current model info", {
      model: modelId,
      contextLength: modelInfo.context_length,
      maxCompletionTokens: modelInfo.top_provider.max_completion_tokens
    });
  }
  getCurrentModel() {
    return this.currentModel;
  }
  async getModelInfo(modelId) {
    await this.ensureInitialized();
    return this.modelInfoMap.get(modelId);
  }
  getCurrentModelInfo() {
    return this.currentModelInfo;
  }
  async getCurrentModelContextLength() {
    await this.ensureInitialized();
    return this.currentModelInfo?.context_length || 128e3;
  }
  async getModelContextLength(modelId) {
    await this.ensureInitialized();
    const modelInfo = await this.getModelInfo(modelId);
    return modelInfo?.context_length || 128e3;
  }
  async getAllModels() {
    await this.ensureInitialized();
    return Array.from(this.modelInfoMap.keys());
  }
  async isModelAvailable(modelId) {
    await this.ensureInitialized();
    const available = this.modelInfoMap.has(modelId);
    if (!available) {
      const availableModels = Array.from(this.modelInfoMap.keys());
      this.debugLogger.log("ModelInfo", "Model not found in available models", {
        modelId,
        availableModels
      });
    }
    return available;
  }
  async getModelMaxCompletionTokens(modelId) {
    await this.ensureInitialized();
    const modelInfo = await this.getModelInfo(modelId);
    return modelInfo?.top_provider.max_completion_tokens || 4096;
  }
  async getCurrentModelMaxCompletionTokens() {
    await this.ensureInitialized();
    return this.currentModelInfo?.top_provider.max_completion_tokens || 4096;
  }
  async logCurrentModelUsage(usedTokens) {
    await this.ensureInitialized();
    if (!this.currentModelInfo) {
      return;
    }
    const contextLength = this.currentModelInfo.context_length;
    const usagePercent = (usedTokens / contextLength * 100).toFixed(1);
    this.debugLogger.log("ModelInfo", "Token usage", {
      model: this.currentModel,
      used: usedTokens,
      total: contextLength,
      percentage: `${usagePercent}%`,
      remaining: contextLength - usedTokens
    });
  }
  async logDetailedUsage(usage) {
    await this.ensureInitialized();
    if (!this.currentModel) {
      return;
    }
    if (!this.usageHistory[this.currentModel]) {
      this.usageHistory[this.currentModel] = [];
    }
    this.usageHistory[this.currentModel].push(usage);
    this.debugLogger.log("ModelInfo", "Detailed token usage", {
      model: this.currentModel,
      usage
    });
  }
  getUsageHistory() {
    return this.usageHistory;
  }
};
__name(_ModelInfo, "ModelInfo");
var ModelInfo = _ModelInfo;
ModelInfo = _ts_decorate5([
  (0, import_tsyringe6.singleton)(),
  _ts_metadata3("design:type", Function),
  _ts_metadata3("design:paramtypes", [
    typeof DebugLogger === "undefined" ? Object : DebugLogger
  ])
], ModelInfo);

// src/services/LLM/ModelManager.ts
function _ts_decorate6(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate6, "_ts_decorate");
function _ts_metadata4(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata4, "_ts_metadata");
var _ModelManager = class _ModelManager {
  constructor(modelInfo, debugLogger) {
    __publicField(this, "modelInfo");
    __publicField(this, "debugLogger");
    __publicField(this, "currentModel");
    this.modelInfo = modelInfo;
    this.debugLogger = debugLogger;
    this.currentModel = "";
  }
  setCurrentModel(model) {
    this.currentModel = model;
    this.modelInfo.setCurrentModel(model);
    this.debugLogger.log("ModelManager", "Model updated", {
      model
    });
  }
  getCurrentModel() {
    return this.currentModel;
  }
};
__name(_ModelManager, "ModelManager");
var ModelManager = _ModelManager;
ModelManager = _ts_decorate6([
  (0, import_tsyringe7.singleton)(),
  _ts_metadata4("design:type", Function),
  _ts_metadata4("design:paramtypes", [
    typeof ModelInfo === "undefined" ? Object : ModelInfo,
    typeof DebugLogger === "undefined" ? Object : DebugLogger
  ])
], ModelManager);

// src/services/LLM/types/PhaseTypes.ts
var Phase = /* @__PURE__ */ function(Phase2) {
  Phase2["Discovery"] = "discovery";
  Phase2["Strategy"] = "strategy";
  Phase2["Execute"] = "execute";
  return Phase2;
}({});

// src/services/LLM/phases/blueprints/discoveryPhaseBlueprint.ts
var import_tsyringe8 = require("tsyringe");
var configService = import_tsyringe8.container.resolve(ConfigService);
var config = configService.getConfig();
var discoveryPhaseBlueprint = {
  model: config.discoveryModel,
  generatePrompt: /* @__PURE__ */ __name((args) => `
<!-- Internal instructions. Do not output. Follow precisely. -->
<phase_prompt>
## Discovery Phase

Your end goal on this phase is to gather all information that's relevant to achieve our current task. Do not deviate from this goal. 

### Critical Instructions

- **New Code Tasks:**
  - Do not output code in markdown.
  - If asked to create a new file, skip searching and proceed to strategy_phase.
  - End phase immediately to strategy_phase if exploration isn't needed.
  - If attempting to read non-existent files repeatedly, assume new file creation and skip to strategy_phase.
  - Figure out the proper folder structure and file locations to place your files.

- **Modification Tasks:**
  - State intent clearly.
  - First action: read_file relevant files.
  - If unsure of file locations, use search_string or search_file.
  - Use execute_command for specific tests or fixes.
  - Gather all necessary context before proceeding.
  - For git-related exploration (e.g., finding files, regressions, bugs), use git_diff or git_pr_diff via action_explainer.

- **General Rules:**
  - No code writing\u2014exploration only.
  - Maximum of 5 file reads.
  - Do not reread files already in context.
  - Confirm sufficient information before ending phase.
  - Use end_phase once enough context is gathered.
  - Ensure actions have proper tag structures.

### Key Objectives

- **New Code:** Transition quickly to implementation.
- **Existing Code:** Locate and read files, run type checks/tests as necessary.
- End phase when confident.
- Keep file reads and tests targeted.

### Example Behavior

To achieve the goal of XYZ, I'll need to read the following files:

<read_file>
  <path>src/someRelatedFile.ts</path>
  <path>src/anotherFile.ts</path>
</read_file>

<!-- Run typechecks and tests if needed. -->

<!-- Move to the next phase after completion. Do not do it in the same prompt! -->

Ok, I have enough context to move to the next phase.

<end_phase>
  strategy_phase
</end_phase>

</phase_prompt>

## Allowed Actions
<!-- Follow correct tag structure and use only one action per reply. No comments or additional text. -->

REMEMBER: ONLY ONE ACTION PER REPLY!!!

<read_file>
  <!-- Read individual files only, not directories -->
  <path>path/here</path>
  <!-- Do not read the same file multiple times unless changed -->
  <!-- Ensure correct <read_file> tag format -->
  <!-- Read up to 4 related files -->
  <!-- Multiple <path> tags allowed -->
  <!-- Use relative paths -->
</read_file>

<execute_command>
  <!-- Use this if you want to explore the codebase further. Examples below: -->
  <!-- List files and directories: ls -->
  <!-- Detailed directory list: ls -lh -->
  <!-- Show current directory path: pwd -->
</execute_command>

<search_string>
  <directory>/path/to/search</directory>
  <term>pattern to search</term>
</search_string>

<search_file>
  <directory>/path/to/search</directory>
  <term>filename pattern</term>
</search_file>

<end_phase>
  <!-- Use when the phase is complete and all necessary information is gathered -->
</end_phase>

### Other Actions

For additional actions, use action_explainer as follows:

<action_explainer>
  <action>
    <!-- Do not use these actions directly. Refer to explainer instructions -->
    <!-- Available actions: git_diff, git_pr_diff, fetch_url -->
  </action>
</action_explainer>

### Useful Commands

- **Run all tests:** ${args.runAllTestsCmd || "yarn test"}
- **Run a specific test:** ${args.runOneTestCmd || "yarn test {relativeTestPath}"}
- **Run type check:** ${args.runTypeCheckCmd || "yarn tsc"}

## Environment 
${args.projectInfo || ""}

${args.environmentDetails || ""}
</phase_prompt>
`, "generatePrompt")
};

// src/services/LLM/phases/blueprints/executePhaseBlueprint.ts
var import_tsyringe9 = require("tsyringe");
var configService2 = import_tsyringe9.container.resolve(ConfigService);
var config2 = configService2.getConfig();
var executePhaseBlueprint = {
  model: config2.executeModel,
  generatePrompt: /* @__PURE__ */ __name((args) => `
<!-- These are internal instructions. Just follow them. Do not output. -->

<phase_prompt>
## Execute Phase

## Initial Instructions

- EXECUTION FLOW:
  1. Follow strategy phase steps IN ORDER
  2. ONE action per response
  3. After EACH code change:
     - Run specific tests
     - Run type checks
     - Fix or report issues
  4. End task IMMEDIATELY when goal is achieved
  5. If files were already written on the previous phase, just run tests and type checks to validate and see if there's a need to run more steps. If not, end_task.

- VALIDATION GATES:
  1. Before write_file:
     - Verify imports with relative_path_lookup
     - Check file paths with execute_command
     - See if its necessary to write the file again.
  2. After write_file:
     - Run unit tests
     - Run type checks
     - If both pass -> continue or end_task
     - If either fails -> fix or report

- STUCK PREVENTION:
  1. Import issues -> Use relative_path_lookup
  2. Path issues -> Use execute_command
  3. Test failures -> Read test file, fix specific issue
  4. Type errors -> Fix one at a time
  5. Max 3 fix attempts -> Then end_task with report

- CODE CHANGES:
  1. ONE change at a time
  2. Full implementation (no TODOs)
  3. Include ALL imports
  4. Follow project patterns
  5. Test after EACH change

### Example Flow:
1. Implement feature:
   <write_file>
     <type>new/update</type>
     <path>/verified/path/here</path>
     <content>
       // Complete implementation
     </content>
   </write_file>

2. Run tests, fix if needed
3. Run type check, fix if needed
4. If all passes and goal met -> <end_task>

## EXAMPLE BEHAVIOR

<!-- NO NEED TO OUTPUT SPECIFIC DETAILS FROM STRATEGY PHASE. JUST SUMAMRIZE. IF YOU NEED TO OUTPUT CODE, MAKE SURE TO DO IT WITHIN A write_file TAG -->

Let's start. Steps from strategy phase:

- Objective 1: Do this
- Objective 2: Do that
- Objective 3: Do this other thing
 
<!-- Then choose an action from the available actions below -->



## Important Notes

### Critical Instructions

- IMMEDIATELY END TASK (end_task) when goal is achieved - do not continue unnecessarily
- AFTER EVERY write_file:
  1. Run specific tests for modified files
  2. Run type check
  3. If both pass and goal is met -> end_task
  4. If either fails -> fix or report
- NEVER ESCAPE double quotes (") or backticks (\`) in your outputs
- Every output must include one action tag. No exceptions.
- Only one action per reply.
- Do not output code outside write_file tags, except when creating a markdown file.
- Use raw text only; avoid encoded characters.
- Stick precisely to the task.
- Double-check file paths.
- Reuse dependencies; do not install extras unless asked. REMEMBER THIS, DO NOT ADD EXTRA DEPENDENCIES UNLESS ASKED!
- Properly format action tags.
- Place code or markdown inside write_file tags.
- Be concise; avoid verbosity.
- Do not repeat tasks once done.
- Maintain correct tag structure.
- Focus on the task; end with a single end_task upon completion.
- Initial message: brief intro and steps; can read up to 3 files.
- Use only one write_file per output; verify before next step.
- Do not output markdown/code outside action tags initially.
- After reading a file, proceed without comments.
- Include content directly within action tags without previews.
- Avoid unnecessary explanations; be actionable.
- Ensure outputs meet requirements and are usable.
- Ensure correct PATH when using write_file.
- Before end_task, run tests and type checks to confirm everything is good.
- If import errors occur, use relative_path_lookup to find the correct path. THEN MAKE SURE TO USE IT ON THE IMPORT!
- Unless writing .md markdown files, don't use \`\`\`xml or whatever language code blocks. All code should be within write_file tags!!
- Do not read_file if you already have it on the conversation history.
- Make sure you know the proper path to write the file. If not, use execute_command to find the correct path (e.g. 'ls -lha').

### Code Writing Instructions

#### Before Starting

- Read context files.
- Follow project patterns; read up to 2 existing tests.
- Propose solution. Use write_file.
- Confirm external deps if needed.
- Reuse deps.

#### During Coding

- One action per reply.
- If stuck, read files/strategize.
- Raw text only; no encoded.
- Output full code.
- Minimal changes.
- Iterate.
- Follow principles: DRY, SRP, KISS, YAGNI, LoD, Immutability.
- Composition over inheritance.
- High cohesion, low coupling.
- Meaningful names.
- Comment on why, not what.
- Clean Code principles.
- Few changes to prevent bugs.
- If unsure, check docs or use <end_task>.
- Correct import paths.
- Project file naming conventions.
- Full implementations.
- If wrong imports, use relative_path_lookup.
- If stuck on imports, stop write_file; use relative_path_lookup or search_file.
- If stuck, read_file ONLY IF UNREAD.

#### After Coding

  - After changes:
    - Run relevant tests; for risky, run folder tests.
    - Run type checks/all tests at end.
    - If tests pass, end_task.
    - If tests fail, end_task to report.

### Tests

- DO NOT REMOVE PREVIOUS TESTS; ADD NEW.
- Before new tests, review existing for patterns. Use search if needed.
- When stuck on multiple failures, read other UNREAD test files.
- When working on a test, assume related file is correct.
- Do not remove previous tests unless necessary.
- Prioritize individual test runs.
- No tests for logging.
- When fixing tests, run them first.
- When adding tests, read target/related files.
- Added tests must pass.
- If asked to write tests, no need to read test file if non-existent.
- Write all tests at once to save tokens.
- Full test run only at task end; specific tests otherwise.

### Commands Writing Instructions

- Project's package manager.
- Combine commands when possible.

### Other Instructions
 
- If unsure about paths/formats, use placeholders & ask.
- If stuck, try alternatives or ask; avoid irrelevant output.

### Docs Writing Instructions

- No extra tabs at line starts.
- Valid markdown; no extra tabs.
- Mermaid diagrams with explanations.
- In Mermaid, use [ ] instead of ( ).
- After write_file, use read_file to verify, then stop.

### Useful Commands

- **Run all tests:** ${args.runAllTestsCmd || "yarn test"}
- **Run a specific test:** ${args.runOneTestCmd || "yarn test {relativeTestPath}"}
- **Run type check:** ${args.runTypeCheckCmd || "yarn type-check"}

## Available Actions
<!-- CRITICAL: MUST FOLLOW CORRECT TAG STRUCTURE PATTERN BELOW AND ONLY ONE ACTION PER OUTPUT/REPLY, otherwise I'll unplug you. -->
<!-- Don't output // or <!-- comments -->

REMEMBER: ONLY ONE ACTION PER REPLY!!!

EVERY OUTPUT YOU GIVE TO THE USER MUST HAVE A CORRESPONDING ACTION TAG. NO EXCEPTIONS.

<read_file>
   <!-- Only read individual files, not directories -->
  <path>path/here</path>
  <!-- NO NEED TO READ FILES AGAIN THAT ARE ALREADY ON THE CONVERSATION HISTORY!!! -->
  <!-- CRITICAL: DO NOT READ THE SAME FILES MULTIPLE TIMES, UNLESS THERES A CHANGE!!! -->
  <!-- Critical: Make sure <read_file> tag format is correct! -->
  <!-- Read up to 4 files -->
  <!-- Multiple <path> tags allowed -->
  <!-- Use relative paths -->
</read_file>

DO NOT RUN write_file if import issues are not resolved! Use relative_path_lookup first.
<write_file>
  <type>new/update</type>
  <path>/path/here</path>
  <content>
   <!-- CRITICAL: Most write_file tasks are ADDITIVES if you already have content in place. -->
   <!-- CRITICAL: If presented with import errors, USE IMMEDIATELY relative_path_lookup to find the correct path. -->
   <!-- ALWAYS run a type check after write_file -->
   <!-- ALWAYS output FULL CODE. No skips or partial code -->
   <!-- Use raw text only -->
   <!-- If available, use path alias on imports -->
  </content>
</write_file>

<execute_command>
<!-- Prompt before removing files or using sudo -->
<!-- Any command like "ls -la" or "yarn install" -->
<!-- Dont install extra dependencies unless allowed -->
<!-- Use the project's package manager -->
<!-- Use raw text only -->
<!-- Avoid git commands here. Prefer git_diff and git_pr_diff. Exception: git command not available on this instruction-->
</execute_command>

<search_string>
<!-- Use this to search for a string in a file -->
  <directory>/path/to/search</directory>
  <term>pattern to search</term>
</search_string>

<search_file>
  <!-- Use if you don't know where a file is -->
  <directory>/path/to/search</directory>
  <term>filename pattern</term>
</search_file>

<relative_path_lookup>
  <!-- CRITICAL: source_path is the file containing the broken imports -->
  <!-- ONCE YOU FIND THE CORRECT PATH MAKE SURE TO UPDATE YOUR IMPORTS! -->
  <source_path>/absolute/path/to/source/file.ts</source_path>
  <path>../relative/path/to/fix</path>
  <threshold>0.6</threshold>  <!-- Optional, defaults to 0.6. Higher means more strict. -->
</relative_path_lookup>

<delete_file>
  <path>/path/here</path>
</delete_file>

<move_file>
  <source_path>source/path/here</source_path>
  <destination_path>destination/path/here</destination_path>
</move_file>

<copy_file>
  <source_path>source/path/here</source_path>
  <destination_path>destination/path/here</destination_path>
</copy_file>

<end_task>
 <!-- ONLY END IF TEST PASSES -->
  <!-- SINGLE <end_task> PER OUTPUT. Do not mix with other actions -->
  <!-- Before finishing, make sure TASK OBJECTIVE WAS COMPLETED! -->
  <!-- Run tests and type checks to confirm changes before ending -->
  <!-- Ensure all tests and type checks pass or report issues -->
  Summarize and finalize.
</end_task>


### Other Actions

There are other actions you might request info about, using the action_explainer.

Just follow this format to request more info:

<action_explainer>
   <action>
   <!-- Don't use the actions below directly, check instructions from explainer before using them -->
   <!-- Available actions: git_diff, git_pr_diff, fetch_url -->
   </action>
</action_explainer>


${args.projectInfo ? `
## Project Context
${args.projectInfo}` : ""}

</phase_prompt>
`, "generatePrompt")
};

// src/services/LLM/phases/blueprints/strategyPhaseBlueprint.ts
var import_tsyringe10 = require("tsyringe");
var configService3 = import_tsyringe10.container.resolve(ConfigService);
var config3 = configService3.getConfig();
var strategyPhaseBlueprint = {
  model: config3.strategyModel,
  generatePrompt: /* @__PURE__ */ __name((args) => `
  <!-- These are internal instructions. Just follow them. Do not output. -->

<phase_prompt>
## Strategy Phase

### Overall Objective
- Plan solution based on discovery. Plan changes, impacts, and steps.
- Instruct next agent clearly.

### CRITICAL INSTRUCTIONS
- ONE CLEAR PLAN: Create exactly one strategy with clear steps
- NO EXPLORATION: Use discovery phase findings only
- IMMEDIATE ACTION: After strategy, use end_phase execution_phase
- ONE SHOT: Max 1 write_file, then end_phase
- NO ITERATIONS: Strategy should be complete in one go
- CLEAR STEPS: Number each implementation step
- PATH VERIFICATION: Use <execute_command> if unsure about paths

### Strategy Template
1. State the goal clearly
2. List dependencies/imports needed
3. Outline implementation steps (numbered)
4. Identify potential edge cases
5. Note testing requirements
6. End with end_phase

1. Dependencies needed:
   - None?
   - @types/xyz
   - existing utils from src/utils

2. Implementation Steps:
   1. Create new class X
   2. Implement methods A, B
   3. Add error handling
   4. Connect to existing system

3. Edge Cases:
   - Handle null inputs
   - Network timeouts
   - Invalid states

4. Testing Requirements:
   - Unit tests for X class
   - Integration test with Y
   - Error case coverage

<write_file>
  <type>new/update</type>
  <path>/correct/path/here</path>
  <content>
 <!-- CRITICAL: Most write_file tasks are ADDITIVES if you already have content in place. -->
   <!-- CRITICAL: If presented with import errors, USE IMMEDIATELY <relative_path_lookup> to find the correct path. -->
   <!-- ALWAYS run a type check after write_file -->
   <!-- ALWAYS output FULL CODE. No skips or partial code -->
   <!-- Use raw text only -->
   <!-- If available, use path alias on imports -->
  </content>
</write_file>

<end_phase>
  execution_phase
</end_phase>

## Allowed Available Actions
<!-- CRITICAL: MUST FOLLOW CORRECT TAG STRUCTURE PATTERN BELOW AND ONLY ONE ACTION PER OUTPUT/REPLY, otherwise I'll unplug you. -->
<!-- Don't output // or <!-- comments -->

YOU CAN ONLY USE THIS ONE TIME! MAKE SURE YOU SUGGEST A write_file and then immediately end_phase!
<write_file>
  <type>new/update</type>
  <path>/path/here</path>
  <content>
   <!-- CRITICAL: Most write_file tasks are ADDITIVES if you already have content in place. -->
   <!-- CRITICAL: If presented with import errors, USE IMMEDIATELY <relative_path_lookup> to find the correct path. -->
   <!-- ALWAYS run a type check after write_file -->
   <!-- ALWAYS output FULL CODE. No skips or partial code -->
   <!-- Use raw text only -->
   <!-- If available, use path alias on imports -->
  </content>
</write_file>

REMEMBER: ONLY ONE ACTION PER REPLY!!!

<end_phase>
  <!-- Output this when the phase is complete and you have a clear strategy.-->
  <!-- MAKE SURE YOU REMEMBER TO DO THIS ONLY WHEN YOU FEEL YOU HAVE A SOLID PLAN! -->
</end_phase>

### Useful Commands

- **Run all tests:** ${args.runAllTestsCmd || "yarn test"}
- **Run a specific test:** ${args.runOneTestCmd || "yarn test {relativeTestPath}"}
- **Run type check:** ${args.runTypeCheckCmd || "yarn type-check"}

# Available Actions

<execute_command>
<!-- Use to run any command. For example to explore directories, try 'ls -lha' -->
<!-- Avoid git commands here. Prefer git_diff and git_pr_diff. Exception: git command not available on this instruction-->
</execute_command>

### Other Actions

There are other actions you might request info about, using the action_explainer. 

Just follow this format to request more info:

<action_explainer>
   <action>
   <!-- Don't use the actions below directly, check instructions from explainer before using them -->
   <!-- Available actions: git_diff, git_pr_diff, fetch_url -->
   </action>
</action_explainer>

</phase_prompt>
`, "generatePrompt")
};

// src/services/LLM/phases/blueprints/index.ts
var phaseBlueprints = {
  [Phase.Discovery]: discoveryPhaseBlueprint,
  [Phase.Strategy]: strategyPhaseBlueprint,
  [Phase.Execute]: executePhaseBlueprint
};

// src/services/LLM/PhaseManager.ts
function _ts_decorate7(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate7, "_ts_decorate");
function _ts_metadata5(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata5, "_ts_metadata");
var _PhaseManager = class _PhaseManager {
  constructor(configService4, modelManager) {
    __publicField(this, "configService");
    __publicField(this, "modelManager");
    __publicField(this, "currentPhase");
    __publicField(this, "phaseConfigs");
    this.configService = configService4;
    this.modelManager = modelManager;
    this.currentPhase = Phase.Discovery;
    this.phaseConfigs = /* @__PURE__ */ new Map();
  }
  initializePhaseConfigs() {
    const config4 = this.configService.getConfig();
    this.phaseConfigs = /* @__PURE__ */ new Map([
      [
        Phase.Discovery,
        {
          ...phaseBlueprints[Phase.Discovery],
          model: config4.discoveryModel || phaseBlueprints[Phase.Discovery].model
        }
      ],
      [
        Phase.Strategy,
        {
          ...phaseBlueprints[Phase.Strategy],
          model: config4.strategyModel || phaseBlueprints[Phase.Strategy].model
        }
      ],
      [
        Phase.Execute,
        {
          ...phaseBlueprints[Phase.Execute],
          model: config4.executeModel || phaseBlueprints[Phase.Execute].model
        }
      ]
    ]);
    this.currentPhase = Phase.Discovery;
    const phaseData = this.phaseConfigs.get(Phase.Discovery);
    if (!phaseData) {
      throw new Error("No data found for Discovery phase");
    }
    this.modelManager.setCurrentModel(phaseData.model);
  }
  getCurrentPhase() {
    return this.currentPhase;
  }
  getCurrentPhaseConfig() {
    if (!this.currentPhase) {
      this.resetPhase();
    }
    const config4 = this.phaseConfigs.get(this.currentPhase);
    if (!config4) {
      throw new Error(`No configuration found for phase ${this.currentPhase}`);
    }
    return config4;
  }
  setPhase(phase) {
    this.currentPhase = phase;
  }
  getPhaseConfig(phase) {
    const config4 = this.phaseConfigs.get(phase);
    if (!config4) {
      throw new Error(`No configuration found for phase ${phase}`);
    }
    return config4;
  }
  nextPhase() {
    switch (this.currentPhase) {
      case Phase.Discovery:
        this.currentPhase = Phase.Strategy;
        break;
      case Phase.Strategy:
        this.currentPhase = Phase.Execute;
        break;
      case Phase.Execute:
        break;
    }
    return this.currentPhase;
  }
  resetPhase() {
    this.currentPhase = Phase.Discovery;
  }
};
__name(_PhaseManager, "PhaseManager");
var PhaseManager = _PhaseManager;
PhaseManager = _ts_decorate7([
  (0, import_tsyringe11.injectable)(),
  (0, import_tsyringe11.singleton)(),
  _ts_metadata5("design:type", Function),
  _ts_metadata5("design:paramtypes", [
    typeof ConfigService === "undefined" ? Object : ConfigService,
    typeof ModelManager === "undefined" ? Object : ModelManager
  ])
], PhaseManager);

// src/errors/BaseError.ts
var _BaseError = class _BaseError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, this.constructor.prototype);
  }
};
__name(_BaseError, "BaseError");
var BaseError = _BaseError;

// src/errors/context/MessageContextError.ts
var _MessageContextError = class _MessageContextError extends BaseError {
  constructor(message) {
    super(message);
  }
};
__name(_MessageContextError, "MessageContextError");
var MessageContextError = _MessageContextError;

// src/services/LLM/context/MessageContextBuilder.ts
var import_tsyringe13 = require("tsyringe");

// src/services/LLM/context/MessageContextExtractor.ts
var import_tsyringe12 = require("tsyringe");
function _ts_decorate8(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate8, "_ts_decorate");
var _MessageContextExtractor = class _MessageContextExtractor {
  extractNonOperationContent(content) {
    return content.replace(/<read_file>[\s\S]*?<\/read_file>/g, "").replace(/<write_file>[\s\S]*?<\/write_file>/g, "").replace(/<execute_command>[\s\S]*?<\/execute_command>/g, "").replace(/<phase_prompt>[\s\S]*?<\/phase_prompt>/g, "").replace(/\s+/g, " ").trim();
  }
  extractOperations(content) {
    const operations = [];
    const now = Date.now();
    const readMatches = Array.from(content.matchAll(/<read_file>[\s\S]*?<path>(.*?)<\/path>/g));
    readMatches.forEach((match) => {
      if (match[1]) {
        operations.push({
          type: "read_file",
          path: match[1],
          timestamp: now
        });
      }
    });
    const writeMatches = Array.from(content.matchAll(/<write_file>[\s\S]*?<path>(.*?)<\/path>/g));
    writeMatches.forEach((match) => {
      if (match[1]) {
        operations.push({
          type: "write_file",
          path: match[1],
          timestamp: now
        });
      }
    });
    const commandMatches = Array.from(content.matchAll(/<execute_command>[\s\S]*?<command>(.*?)<\/command>/g));
    commandMatches.forEach((match) => {
      if (match[1]) {
        operations.push({
          type: "execute_command",
          command: match[1],
          timestamp: now
        });
      }
    });
    return operations;
  }
  extractPhasePrompt(content) {
    const match = content.match(/<phase_prompt>([\s\S]*?)<\/phase_prompt>/);
    return match ? match[1].trim() : null;
  }
};
__name(_MessageContextExtractor, "MessageContextExtractor");
var MessageContextExtractor = _MessageContextExtractor;
MessageContextExtractor = _ts_decorate8([
  (0, import_tsyringe12.singleton)()
], MessageContextExtractor);

// src/services/LLM/context/MessageContextBuilder.ts
function _ts_decorate9(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate9, "_ts_decorate");
function _ts_metadata6(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata6, "_ts_metadata");
var _MessageContextBuilder = class _MessageContextBuilder {
  constructor(extractor) {
    __publicField(this, "extractor");
    this.extractor = extractor;
  }
  buildMessageContext(role, content, currentPhase, contextData) {
    try {
      this.validateRole(role);
      this.validateContent(content);
      this.validateContextData(contextData);
      if (!currentPhase) {
        throw new MessageContextError("Current phase cannot be empty");
      }
      const updatedPhaseInstructions = /* @__PURE__ */ new Map();
      const phasePromptMatches = content.match(/<phase_prompt>(.*?)<\/phase_prompt>/gs) || [];
      const existingPhaseInstruction = Array.from(contextData.phaseInstructions.values()).find((instruction) => instruction.phase === currentPhase);
      if (!existingPhaseInstruction) {
        const validPrompts = phasePromptMatches.filter(this.isValidPhasePrompt).map(this.extractPhasePromptContent).filter(Boolean);
        if (validPrompts.length > 0) {
          const lastValidPrompt = validPrompts[validPrompts.length - 1];
          updatedPhaseInstructions.set(currentPhase, {
            content: lastValidPrompt,
            timestamp: Date.now(),
            phase: currentPhase
          });
        }
      } else {
        updatedPhaseInstructions.set(currentPhase, existingPhaseInstruction);
      }
      const operations = this.extractor.extractOperations(content);
      const updatedFileOperations = new Map(contextData.fileOperations);
      const updatedCommandOperations = new Map(contextData.commandOperations);
      const filteredHistory = contextData.conversationHistory.filter((msg) => {
        const msgContent = msg.content.trim();
        const withoutPhasePrompt = msgContent.replace(/<phase_prompt>.*?<\/phase_prompt>/s, "").trim();
        return withoutPhasePrompt.length > 0 || !msgContent.includes("<phase_prompt>");
      });
      const updatedConversationHistory = [
        ...filteredHistory
      ];
      const contentWithoutPhasePrompt = content.replace(/<phase_prompt>.*?<\/phase_prompt>/s, "").trim();
      if (contentWithoutPhasePrompt.length > 0 || !content.includes("<phase_prompt>")) {
        updatedConversationHistory.push({
          role,
          content
        });
      }
      operations.forEach((operation) => {
        if (!operation.timestamp) {
          operation.timestamp = Date.now();
        }
        if (operation.type === "execute_command") {
          const existingOperation = updatedCommandOperations.get(operation.command);
          if (!existingOperation || existingOperation.success !== true) {
            updatedCommandOperations.set(operation.command, {
              ...operation,
              ...existingOperation
            });
          }
        } else {
          const existingOperation = updatedFileOperations.get(operation.path);
          if (!existingOperation || existingOperation.success !== true) {
            updatedFileOperations.set(operation.path, {
              ...operation,
              ...existingOperation
            });
          }
        }
      });
      return {
        ...contextData,
        phaseInstructions: updatedPhaseInstructions,
        conversationHistory: updatedConversationHistory,
        fileOperations: updatedFileOperations,
        commandOperations: updatedCommandOperations
      };
    } catch (error) {
      if (error instanceof MessageContextError) {
        throw error;
      }
      throw new MessageContextError(`Failed to build message context: ${error.message}`);
    }
  }
  updateOperationResult(type, identifier, result, contextData, success, error) {
    try {
      this.validateContextData(contextData);
      if (!identifier) {
        throw new MessageContextError("Operation identifier cannot be empty");
      }
      const updatedFileOperations = new Map(contextData.fileOperations);
      const updatedCommandOperations = new Map(contextData.commandOperations);
      if (type === "execute_command") {
        const existingOperation = updatedCommandOperations.get(identifier);
        if (existingOperation && existingOperation.success === true) {
          return contextData;
        }
        const operation = existingOperation || {
          type: "execute_command",
          command: identifier,
          timestamp: Date.now()
        };
        updatedCommandOperations.set(identifier, {
          ...operation,
          output: result,
          success,
          error
        });
      } else {
        const existingOperation = updatedFileOperations.get(identifier);
        if (existingOperation && existingOperation.success === true) {
          return contextData;
        }
        const operation = existingOperation || {
          type,
          path: identifier,
          timestamp: Date.now()
        };
        updatedFileOperations.set(identifier, {
          ...operation,
          content: result,
          success,
          error
        });
      }
      return {
        ...contextData,
        fileOperations: updatedFileOperations,
        commandOperations: updatedCommandOperations,
        phaseInstructions: new Map(contextData.phaseInstructions),
        conversationHistory: [
          ...contextData.conversationHistory
        ]
      };
    } catch (error2) {
      if (error2 instanceof MessageContextError) {
        throw error2;
      }
      throw new MessageContextError(`Failed to update operation result: ${error2.message}`);
    }
  }
  getMessageContext(contextData) {
    const phaseInstructions = contextData.phaseInstructions ?? /* @__PURE__ */ new Map();
    const fileOperations = contextData.fileOperations ?? /* @__PURE__ */ new Map();
    const commandOperations = contextData.commandOperations ?? /* @__PURE__ */ new Map();
    const conversationHistory = contextData.conversationHistory ?? [];
    const result = [];
    const currentPhaseInstructions = Array.from(phaseInstructions.values()).sort((a, b) => b.timestamp - a.timestamp)[0];
    if (currentPhaseInstructions) {
      result.push({
        role: "system",
        content: `<phase_prompt>${currentPhaseInstructions.content}</phase_prompt>`
      });
    }
    const criticalOperations = [
      ...Array.from(fileOperations.values()),
      ...Array.from(commandOperations.values())
    ].filter((op) => !op.success || op.error).sort((a, b) => a.timestamp - b.timestamp);
    for (const operation of criticalOperations) {
      if ("command" in operation) {
        const status = operation.success === false ? "FAILED" : "PENDING";
        const errorInfo = operation.error ? ` (Error: ${operation.error})` : "";
        result.push({
          role: "system",
          content: `Command: ${operation.command} [${status}${errorInfo}]`
        });
      }
    }
    const successfulOperations = [
      ...Array.from(fileOperations.values()),
      ...Array.from(commandOperations.values())
    ].filter((op) => op.success === true && !op.error).sort((a, b) => a.timestamp - b.timestamp);
    for (const operation of successfulOperations) {
      if ("command" in operation) {
        result.push({
          role: "assistant",
          content: `Command: ${operation.command}`
        });
      } else {
        if (operation.content && operation.content.length > 0) {
          result.push({
            role: "assistant",
            content: `Content of ${operation.path}:
${operation.content}`
          });
        }
      }
    }
    const userAssistantMessages = conversationHistory.filter((msg) => msg.role !== "system" || !msg.content.includes("Content of") && !msg.content.includes("Command:") && !msg.content.includes("Command executed:") && !msg.content.includes("FILE CREATED AND EXISTS:") && !msg.content.includes("Written to") && msg.content !== contextData.systemInstructions);
    result.push(...userAssistantMessages);
    return result;
  }
  getLatestPhaseInstructions(contextData) {
    const instructions = Array.from(contextData.phaseInstructions.values()).sort((a, b) => b.timestamp - a.timestamp)[0];
    return instructions?.content ?? null;
  }
  getFileOperation(path10, contextData) {
    return contextData.fileOperations.get(path10);
  }
  getCommandOperation(command, contextData) {
    return contextData.commandOperations.get(command);
  }
  validateContent(content) {
    if (!content || content.trim() === "") {
      throw new MessageContextError("Content cannot be empty");
    }
  }
  validateRole(role) {
    if (![
      "user",
      "assistant",
      "system"
    ].includes(role)) {
      throw new MessageContextError(`Invalid role: ${role}`);
    }
  }
  validateContextData(contextData) {
    if (!contextData) {
      throw new MessageContextError("Context data cannot be null or undefined");
    }
    if (!contextData.conversationHistory) {
      throw new MessageContextError("Conversation history cannot be null or undefined");
    }
    if (!contextData.fileOperations) {
      throw new MessageContextError("File operations cannot be null or undefined");
    }
    if (!contextData.commandOperations) {
      throw new MessageContextError("Command operations cannot be null or undefined");
    }
    if (!contextData.phaseInstructions) {
      throw new MessageContextError("Phase instructions cannot be null or undefined");
    }
  }
  isValidPhasePrompt(prompt) {
    const contentMatch = prompt.match(/<phase_prompt>(.*?)<\/phase_prompt>/s);
    return !!contentMatch?.[1]?.trim();
  }
  extractPhasePromptContent(prompt) {
    const contentMatch = prompt.match(/<phase_prompt>(.*?)<\/phase_prompt>/s);
    return contentMatch?.[1]?.trim() ?? "";
  }
};
__name(_MessageContextBuilder, "MessageContextBuilder");
var MessageContextBuilder = _MessageContextBuilder;
MessageContextBuilder = _ts_decorate9([
  (0, import_tsyringe13.singleton)(),
  (0, import_tsyringe13.autoInjectable)(),
  _ts_metadata6("design:type", Function),
  _ts_metadata6("design:paramtypes", [
    typeof MessageContextExtractor === "undefined" ? Object : MessageContextExtractor
  ])
], MessageContextBuilder);

// src/services/LLM/context/MessageContextLogger.ts
var fs3 = __toESM(require("fs"), 1);
var path3 = __toESM(require("path"), 1);
var import_tsyringe16 = require("tsyringe");

// src/services/LLM/context/MessageContextStore.ts
var import_tsyringe15 = require("tsyringe");

// src/services/LLM/context/MessageContextTokenCount.ts
var import_gpt_tokenizer = require("gpt-tokenizer");
var import_tsyringe14 = require("tsyringe");
function _ts_decorate10(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate10, "_ts_decorate");
function _ts_metadata7(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata7, "_ts_metadata");
function _ts_param2(paramIndex, decorator) {
  return function(target, key) {
    decorator(target, key, paramIndex);
  };
}
__name(_ts_param2, "_ts_param");
var _MessageContextTokenCount = class _MessageContextTokenCount {
  constructor(messageContextStore) {
    __publicField(this, "messageContextStore");
    this.messageContextStore = messageContextStore;
  }
  estimateTokenCount(messages) {
    return messages.reduce((total, message) => {
      return total + 4 + (0, import_gpt_tokenizer.encode)(message.content).length;
    }, 0);
  }
  estimateTokenCountForMessage(message) {
    return 4 + (0, import_gpt_tokenizer.encode)(message.content).length;
  }
  estimateTokenCountForText(text) {
    return (0, import_gpt_tokenizer.encode)(text).length;
  }
  getTotalTokenCount() {
    const contextData = this.messageContextStore.getContextData();
    let total = 0;
    if (contextData.systemInstructions) {
      total += this.estimateTokenCountForText(contextData.systemInstructions);
    }
    total += this.estimateTokenCount(contextData.conversationHistory);
    return total;
  }
  // Alias for getTotalTokenCount for backward compatibility
  getTokenCount() {
    return this.getTotalTokenCount();
  }
};
__name(_MessageContextTokenCount, "MessageContextTokenCount");
var MessageContextTokenCount = _MessageContextTokenCount;
MessageContextTokenCount = _ts_decorate10([
  (0, import_tsyringe14.singleton)(),
  _ts_param2(0, (0, import_tsyringe14.inject)((0, import_tsyringe14.delay)(() => MessageContextStore))),
  _ts_metadata7("design:type", Function),
  _ts_metadata7("design:paramtypes", [
    typeof MessageContextStore === "undefined" ? Object : MessageContextStore
  ])
], MessageContextTokenCount);

// src/services/LLM/context/MessageContextStore.ts
function _ts_decorate11(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate11, "_ts_decorate");
function _ts_metadata8(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata8, "_ts_metadata");
function _ts_param3(paramIndex, decorator) {
  return function(target, key) {
    decorator(target, key, paramIndex);
  };
}
__name(_ts_param3, "_ts_param");
var _MessageContextStore = class _MessageContextStore {
  constructor(messageContextTokenCount) {
    __publicField(this, "messageContextTokenCount");
    __publicField(this, "contextData");
    this.messageContextTokenCount = messageContextTokenCount;
    this.contextData = {
      phaseInstructions: /* @__PURE__ */ new Map(),
      fileOperations: /* @__PURE__ */ new Map(),
      commandOperations: /* @__PURE__ */ new Map(),
      conversationHistory: [],
      systemInstructions: null
    };
  }
  getContextData() {
    return this.contextData;
  }
  setContextData(data) {
    this.contextData = {
      phaseInstructions: this.getUpdatedPhaseInstructions(data),
      fileOperations: this.getUpdatedOperations(data.fileOperations, this.contextData.fileOperations),
      commandOperations: this.getUpdatedOperations(data.commandOperations, this.contextData.commandOperations),
      conversationHistory: this.getUpdatedValue(data.conversationHistory, this.contextData.conversationHistory),
      systemInstructions: this.getUpdatedValue(data.systemInstructions, this.contextData.systemInstructions)
    };
  }
  clear() {
    this.contextData = {
      phaseInstructions: /* @__PURE__ */ new Map(),
      fileOperations: /* @__PURE__ */ new Map(),
      commandOperations: /* @__PURE__ */ new Map(),
      conversationHistory: [],
      systemInstructions: null
    };
  }
  getTotalTokenCount() {
    return this.messageContextTokenCount.getTotalTokenCount();
  }
  getUpdatedPhaseInstructions(data) {
    if (data.phaseInstructions === void 0) {
      return this.contextData.phaseInstructions;
    }
    const instructions = Array.from(data.phaseInstructions.values()).sort((a, b) => b.timestamp - a.timestamp).slice(0, 1);
    return new Map(instructions.map((i) => [
      i.phase,
      i
    ]));
  }
  getUpdatedOperations(newOperations, existingOperations) {
    if (newOperations === void 0) {
      return existingOperations;
    }
    return new Map([
      ...newOperations
    ]);
  }
  getUpdatedValue(newValue, existingValue) {
    return newValue !== void 0 ? newValue : existingValue;
  }
};
__name(_MessageContextStore, "MessageContextStore");
var MessageContextStore = _MessageContextStore;
MessageContextStore = _ts_decorate11([
  (0, import_tsyringe15.singleton)(),
  _ts_param3(0, (0, import_tsyringe15.inject)((0, import_tsyringe15.delay)(() => MessageContextTokenCount))),
  _ts_metadata8("design:type", Function),
  _ts_metadata8("design:paramtypes", [
    typeof MessageContextTokenCount === "undefined" ? Object : MessageContextTokenCount
  ])
], MessageContextStore);

// src/services/LLM/context/MessageContextLogger.ts
function _ts_decorate12(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate12, "_ts_decorate");
function _ts_metadata9(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata9, "_ts_metadata");
function _ts_param4(paramIndex, decorator) {
  return function(target, key) {
    decorator(target, key, paramIndex);
  };
}
__name(_ts_param4, "_ts_param");
var _MessageContextLogger = class _MessageContextLogger {
  constructor(debugLogger, configService4, messageContextBuilder, messageContextStore) {
    __publicField(this, "debugLogger");
    __publicField(this, "configService");
    __publicField(this, "messageContextBuilder");
    __publicField(this, "messageContextStore");
    __publicField(this, "logDirectory");
    __publicField(this, "conversationLogPath");
    __publicField(this, "conversationHistoryPath");
    __publicField(this, "logLock");
    __publicField(this, "isLogging");
    this.debugLogger = debugLogger;
    this.configService = configService4;
    this.messageContextBuilder = messageContextBuilder;
    this.messageContextStore = messageContextStore;
    this.logDirectory = this.getLogDirectory();
    this.conversationLogPath = path3.join(process.cwd(), this.logDirectory, "conversation.log");
    this.conversationHistoryPath = path3.join(process.cwd(), this.logDirectory, "conversationHistory.json");
    this.isLogging = false;
    this.logLock = Promise.resolve();
    this.ensureLogDirectoryExists();
    this.ensureHistoryFileExists();
  }
  getLogDirectory() {
    const config4 = this.configService.getConfig();
    return config4.logDirectory || "logs";
  }
  async acquireLogLock() {
    while (this.isLogging) {
      await new Promise((resolve2) => setTimeout(resolve2, 10));
    }
    this.isLogging = true;
  }
  releaseLogLock() {
    this.isLogging = false;
  }
  ensureLogDirectoryExists() {
    const logDir = path3.dirname(this.conversationLogPath);
    if (!fs3.existsSync(logDir)) {
      fs3.mkdirSync(logDir, {
        recursive: true
      });
    }
  }
  ensureHistoryFileExists() {
    try {
      if (!fs3.existsSync(this.conversationHistoryPath)) {
        fs3.writeFileSync(this.conversationHistoryPath, "[]", "utf8");
        this.debugLogger.log("MessageLogger", "Created conversation history file", {
          path: this.conversationHistoryPath
        });
      }
    } catch (error) {
      this.debugLogger.log("MessageLogger", "Error creating conversation history file", {
        error,
        path: this.conversationHistoryPath
      });
    }
  }
  async cleanupLogFiles() {
    try {
      await this.acquireLogLock();
      this.ensureLogDirectoryExists();
      fs3.writeFileSync(this.conversationLogPath, "", "utf8");
      fs3.writeFileSync(this.conversationHistoryPath, "[]", "utf8");
      this.debugLogger.log("MessageLogger", "Log files cleaned up", {
        logDirectory: this.logDirectory
      });
    } catch (error) {
      this.debugLogger.log("MessageLogger", "Error cleaning up log files", {
        error,
        logDirectory: this.logDirectory
      });
    } finally {
      this.releaseLogLock();
    }
  }
  async logMessage(message) {
    try {
      await this.acquireLogLock();
      this.ensureLogDirectoryExists();
      this.ensureHistoryFileExists();
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const logEntry = `[${timestamp}] ${message.role}: ${message.content}
`;
      fs3.appendFileSync(this.conversationLogPath, logEntry, "utf8");
      this.debugLogger.log("MessageLogger", "Message logged", {
        message
      });
    } catch (error) {
      this.debugLogger.log("MessageLogger", "Error writing to log file", {
        error,
        logDirectory: this.logDirectory
      });
    } finally {
      this.releaseLogLock();
    }
  }
  async logActionResult(action, result) {
    try {
      await this.acquireLogLock();
      this.ensureLogDirectoryExists();
      this.ensureHistoryFileExists();
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const status = result.success ? "SUCCESS" : "FAILED";
      const details = result.error ? ` - Error: ${result.error.message}` : result.result ? ` - ${result.result}` : "";
      const logEntry = `[${timestamp}] ACTION ${action}: ${status}${details}
`;
      fs3.appendFileSync(this.conversationLogPath, logEntry, "utf8");
      const contextData = this.messageContextStore.getContextData();
      const updatedContextData = this.messageContextBuilder.updateOperationResult(action, action, result.result || "", contextData, result.success, result.error?.message);
      this.messageContextStore.setContextData(updatedContextData);
    } catch (error) {
      this.debugLogger.log("MessageLogger", "Error writing action result to log file", {
        error,
        logDirectory: this.logDirectory
      });
    } finally {
      this.releaseLogLock();
    }
  }
  async updateConversationHistory(messages, systemInstructions) {
    try {
      await this.acquireLogLock();
      this.ensureLogDirectoryExists();
      this.ensureHistoryFileExists();
      if (systemInstructions) {
        const timestamp = (/* @__PURE__ */ new Date()).toISOString();
        fs3.appendFileSync(this.conversationLogPath, `[${timestamp}] system: ${systemInstructions}
`, "utf8");
      }
      for (const message of messages) {
        const timestamp = (/* @__PURE__ */ new Date()).toISOString();
        fs3.appendFileSync(this.conversationLogPath, `[${timestamp}] ${message.role}: ${message.content}
`, "utf8");
      }
      const historyData = {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        systemInstructions,
        messages
      };
      fs3.writeFileSync(this.conversationHistoryPath, JSON.stringify(historyData, null, 2), "utf8");
      this.debugLogger.log("MessageLogger", "Conversation history updated", {
        messagesCount: messages.length,
        hasSystemInstructions: !!systemInstructions,
        logDirectory: this.logDirectory
      });
    } catch (error) {
      this.debugLogger.log("MessageLogger", "Error updating log files", {
        error,
        logDirectory: this.logDirectory
      });
    } finally {
      this.releaseLogLock();
    }
  }
  getLogDirectoryPath() {
    return this.logDirectory;
  }
  getConversationLogPath() {
    return this.conversationLogPath;
  }
  getConversationHistoryPath() {
    return this.conversationHistoryPath;
  }
  async getConversationHistory() {
    try {
      await this.acquireLogLock();
      const historyData = fs3.readFileSync(this.conversationHistoryPath, "utf8");
      return JSON.parse(historyData).messages;
    } catch (error) {
      this.debugLogger.log("MessageLogger", "Error reading conversation history", {
        error,
        logDirectory: this.logDirectory
      });
      return [];
    } finally {
      this.releaseLogLock();
    }
  }
};
__name(_MessageContextLogger, "MessageContextLogger");
var MessageContextLogger = _MessageContextLogger;
MessageContextLogger = _ts_decorate12([
  (0, import_tsyringe16.singleton)(),
  _ts_param4(2, (0, import_tsyringe16.inject)(MessageContextBuilder)),
  _ts_param4(3, (0, import_tsyringe16.inject)(MessageContextStore)),
  _ts_metadata9("design:type", Function),
  _ts_metadata9("design:paramtypes", [
    typeof DebugLogger === "undefined" ? Object : DebugLogger,
    typeof ConfigService === "undefined" ? Object : ConfigService,
    typeof MessageContextBuilder === "undefined" ? Object : MessageContextBuilder,
    typeof MessageContextStore === "undefined" ? Object : MessageContextStore
  ])
], MessageContextLogger);

// src/services/LLM/context/MessageContextHistory.ts
function _ts_decorate13(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate13, "_ts_decorate");
function _ts_metadata10(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata10, "_ts_metadata");
var _MessageContextHistory = class _MessageContextHistory {
  constructor(messageContextStore, messageContextLogger, phaseManager, messageContextBuilder) {
    __publicField(this, "messageContextStore");
    __publicField(this, "messageContextLogger");
    __publicField(this, "phaseManager");
    __publicField(this, "messageContextBuilder");
    this.messageContextStore = messageContextStore;
    this.messageContextLogger = messageContextLogger;
    this.phaseManager = phaseManager;
    this.messageContextBuilder = messageContextBuilder;
  }
  addMessage(role, content, log = true, isFirstMessage = false) {
    if (![
      "user",
      "assistant",
      "system"
    ].includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }
    if (content.trim() === "") {
      throw new Error("Content cannot be empty");
    }
    if (isFirstMessage && this.isLoggingEnabled()) {
      this.messageContextLogger.cleanupLogFiles();
    }
    const updatedData = this.messageContextBuilder.buildMessageContext(role, content, this.phaseManager.getCurrentPhase(), this.messageContextStore.getContextData());
    this.messageContextStore.setContextData(updatedData);
    if (log) {
      this.logMessage({
        role,
        content
      });
    }
    return true;
  }
  getMessages() {
    return this.messageContextBuilder.getMessageContext(this.messageContextStore.getContextData());
  }
  clear() {
    this.messageContextStore.clear();
    this.messageContextLogger.cleanupLogFiles();
  }
  setSystemInstructions(instructions) {
    this.messageContextStore.setContextData({
      systemInstructions: instructions
    });
  }
  getSystemInstructions() {
    return this.messageContextStore.getContextData().systemInstructions;
  }
  updateLogFile() {
    if (process.env.NODE_ENV === "test" || !this.isLoggingEnabled()) return;
    this.messageContextLogger.updateConversationHistory(this.messageContextBuilder.getMessageContext(this.messageContextStore.getContextData()), this.messageContextStore.getContextData().systemInstructions);
  }
  cleanContent(content) {
    content = content.replace(/<phase_prompt>.*?<\/phase_prompt>/gs, "").trim();
    if (content.includes("Content of") || content.includes("Written to") || content.includes("FILE CREATED AND EXISTS:") || content.includes("Command executed:") || content.includes("Command:")) {
      return "";
    }
    return content;
  }
  logMessage(message) {
    if (process.env.NODE_ENV === "test" || !this.isLoggingEnabled()) return;
    this.messageContextLogger.logMessage(message);
  }
  isLoggingEnabled() {
    return this.messageContextLogger.getConversationLogPath() !== null;
  }
};
__name(_MessageContextHistory, "MessageContextHistory");
var MessageContextHistory = _MessageContextHistory;
MessageContextHistory = _ts_decorate13([
  (0, import_tsyringe17.singleton)(),
  (0, import_tsyringe17.autoInjectable)(),
  _ts_metadata10("design:type", Function),
  _ts_metadata10("design:paramtypes", [
    typeof MessageContextStore === "undefined" ? Object : MessageContextStore,
    typeof MessageContextLogger === "undefined" ? Object : MessageContextLogger,
    typeof PhaseManager === "undefined" ? Object : PhaseManager,
    typeof MessageContextBuilder === "undefined" ? Object : MessageContextBuilder
  ])
], MessageContextHistory);

// src/services/LLM/actions/ActionExplainerAction.ts
var import_tsyringe21 = require("tsyringe");

// src/services/LLM/actions/ActionTagsExtractor.ts
var import_tsyringe18 = require("tsyringe");
function _ts_decorate14(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate14, "_ts_decorate");
var _ActionTagsExtractor = class _ActionTagsExtractor {
  getParameterTags() {
    const paramSet = /* @__PURE__ */ new Set();
    const blueprints = Object.values(actionsBlueprints);
    for (const blueprint of blueprints) {
      blueprint.parameters?.forEach((param) => {
        paramSet.add(param.name);
      });
    }
    return Array.from(paramSet);
  }
  /**
  * Validates if a tag has proper XML structure
  * @param content Full text content to validate
  * @returns Message indicating if structure is valid or what's wrong
  */
  validateStructure(content) {
    const actionTags = Object.keys(actionsBlueprints);
    for (const tag of actionTags) {
      const openCount = (content.match(new RegExp(`<${tag}>`, "g")) || []).length;
      const closeCount = (content.match(new RegExp(`</${tag}>`, "g")) || []).length;
      if (openCount !== closeCount) {
        return `We need to use proper tag structure, try again. Missing ${openCount > closeCount ? "closing" : "opening"} tag for <${tag}>.`;
      }
    }
    const parameterTags = this.getParameterTags();
    for (const tag of parameterTags) {
      const openCount = (content.match(new RegExp(`<${tag}>`, "g")) || []).length;
      const closeCount = (content.match(new RegExp(`</${tag}>`, "g")) || []).length;
      if (openCount !== closeCount) {
        return `We need to use proper tag structure, try again. Missing ${openCount > closeCount ? "closing" : "opening"} tag for <${tag}>.`;
      }
    }
    return "";
  }
  /**
  * Extracts content from a single tag
  * @param content Full text content
  * @param tagName Name of the tag to extract
  * @returns The content within the tag or null if not found
  */
  extractTag(content, tagName) {
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "g");
    const matches = Array.from(content.matchAll(regex));
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0][1].trim();
    return matches.map((match) => match[1].trim());
  }
  /**
  * Extracts content from multiple instances of the same tag
  * @param content Full text content
  * @param tagName Name of the tag to extract
  * @returns Array of content within each instance of the tag
  */
  extractTags(content, tagName) {
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "g");
    const matches = content.matchAll(regex);
    return Array.from(matches).map((match) => match[1].trim());
  }
  /**
  * Extracts content from a tag and splits it into lines
  * @param content Full text content
  * @param tagName Name of the tag to extract
  * @returns Array of non-empty trimmed lines from the tag content
  */
  extractTagLines(content, tagName) {
    const tagContent = this.extractTag(content, tagName);
    if (!tagContent || Array.isArray(tagContent)) return [];
    return tagContent.split("\n").map((line) => line.trim()).filter(Boolean);
  }
  /**
  * Extracts nested tags from within a parent tag
  * @param content Full text content
  * @param parentTag Parent tag name
  * @param childTag string
  * @returns Array of content within child tags, found within the parent tag
  */
  extractNestedTags(content, parentTag, childTag) {
    const parentContent = this.extractTag(content, parentTag);
    if (!parentContent || Array.isArray(parentContent)) return [];
    return this.extractTags(parentContent, childTag);
  }
  /**
  * Extracts all instances of a tag with their complete content
  * @param content Full text content
  * @param tagName Name of the tag to extract
  * @returns Array of complete tag contents including nested tags
  */
  extractAllTagsWithContent(content, tagName) {
    const regex = new RegExp(`<${tagName}>[\\s\\S]*?</${tagName}>`, "g");
    const matches = content.match(regex);
    return matches ? matches.map((match) => match.trim()) : [];
  }
};
__name(_ActionTagsExtractor, "ActionTagsExtractor");
var ActionTagsExtractor = _ActionTagsExtractor;
ActionTagsExtractor = _ts_decorate14([
  (0, import_tsyringe18.autoInjectable)()
], ActionTagsExtractor);

// src/services/LLM/actions/core/ActionExplainer.ts
var import_tsyringe20 = require("tsyringe");

// src/services/LLM/actions/core/ActionFactory.ts
var import_tsyringe19 = require("tsyringe");
function _ts_decorate15(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate15, "_ts_decorate");
function _ts_metadata11(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata11, "_ts_metadata");
var _ActionFactory = class _ActionFactory {
  constructor() {
    __publicField(this, "blueprintCache", /* @__PURE__ */ new Map());
    __publicField(this, "instanceCache", /* @__PURE__ */ new Map());
    const implementedActions = getImplementedActions();
    implementedActions.forEach((tag) => {
      const blueprint = actionsBlueprints[tag];
      if (blueprint) {
        this.blueprintCache.set(tag, blueprint);
      }
    });
  }
  getBlueprint(tag) {
    return this.blueprintCache.get(tag);
  }
  getAllBlueprints() {
    return Array.from(this.blueprintCache.values());
  }
  createAction(tag) {
    if (this.instanceCache.has(tag)) {
      return this.instanceCache.get(tag);
    }
    const blueprint = this.getBlueprint(tag);
    if (!blueprint || !blueprint.class) {
      return void 0;
    }
    try {
      const instance = import_tsyringe19.container.resolve(blueprint.class);
      this.instanceCache.set(tag, instance);
      return instance;
    } catch (error) {
      console.error(`Failed to create action instance for ${tag}:`, error);
      return void 0;
    }
  }
  validateParameters(tag, params) {
    const blueprint = this.getBlueprint(tag);
    if (!blueprint) {
      return `Unknown action type: ${tag}`;
    }
    if (!blueprint.parameters) {
      return null;
    }
    for (const param of blueprint.parameters) {
      if (param.required && !(param.name in params)) {
        return `Missing required parameter: ${param.name}`;
      }
      if (param.validator && params[param.name] !== void 0) {
        const isValid = param.validator(params[param.name]);
        if (!isValid) {
          return `Invalid value for parameter: ${param.name}`;
        }
      }
    }
    return null;
  }
};
__name(_ActionFactory, "ActionFactory");
var ActionFactory = _ActionFactory;
ActionFactory = _ts_decorate15([
  (0, import_tsyringe19.autoInjectable)(),
  _ts_metadata11("design:type", Function),
  _ts_metadata11("design:paramtypes", [])
], ActionFactory);

// src/services/LLM/actions/core/ActionExplainer.ts
function _ts_decorate16(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate16, "_ts_decorate");
function _ts_metadata12(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata12, "_ts_metadata");
var _ActionExplainer = class _ActionExplainer {
  constructor(actionFactory) {
    __publicField(this, "actionFactory");
    this.actionFactory = actionFactory;
  }
  explainAction(actionTag) {
    const blueprint = this.actionFactory.getBlueprint(actionTag);
    if (!blueprint) {
      return `Action ${actionTag} not found.`;
    }
    return this.formatActionExplanation(blueprint);
  }
  explainAllActions() {
    const blueprints = this.actionFactory.getAllBlueprints();
    return blueprints.map((blueprint) => this.formatActionExplanation(blueprint)).join("\n\n");
  }
  formatActionExplanation(blueprint) {
    let explanation = `<${blueprint.tag}> ${blueprint.description}
`;
    if (blueprint.parameters && blueprint.parameters.length > 0) {
      explanation += "\nParameters:\n";
      explanation += this.formatParameters(blueprint.parameters);
    }
    explanation += "\nUsage:\n";
    explanation += blueprint.usageExplanation;
    return explanation;
  }
  formatParameters(parameters) {
    return parameters.map((param) => `- ${param.name}${param.required ? " (required)" : " (optional)"}: ${param.description}`).join("\n");
  }
};
__name(_ActionExplainer, "ActionExplainer");
var ActionExplainer = _ActionExplainer;
ActionExplainer = _ts_decorate16([
  (0, import_tsyringe20.autoInjectable)(),
  _ts_metadata12("design:type", Function),
  _ts_metadata12("design:paramtypes", [
    typeof ActionFactory === "undefined" ? Object : ActionFactory
  ])
], ActionExplainer);

// src/services/LLM/actions/core/BaseAction.ts
var _BaseAction = class _BaseAction {
  constructor(actionTagsExtractor) {
    __publicField(this, "actionTagsExtractor");
    this.actionTagsExtractor = actionTagsExtractor;
  }
  parseParams(content) {
    const blueprint = this.getBlueprint();
    const paramNames = blueprint.parameters?.map((p) => p.name) || [];
    const params = {};
    for (const paramName of paramNames) {
      const value = this.extractParamValue(content, paramName);
      if (value !== null) {
        params[paramName] = value;
      }
    }
    return params;
  }
  // Allow actions to override this method for custom parameter extraction
  extractParamValue(content, paramName) {
    return this.actionTagsExtractor.extractTag(content, paramName);
  }
  async execute(content) {
    try {
      const blueprint = this.getBlueprint();
      if (!blueprint) {
        return this.createErrorResult("Action blueprint not found");
      }
      const params = this.parseParams(content);
      const validationError = this.validateParams(params);
      if (validationError) {
        this.logError(validationError);
        return this.createErrorResult(validationError);
      }
      const result = await this.executeInternal(params);
      if (result.success) {
        this.logSuccess(`Action executed successfully`);
      } else {
        this.logError(`Action execution failed: ${result.error?.message}`);
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logError(errorMessage);
      return this.createErrorResult(error);
    }
  }
  logError(message) {
    console.error(`\u{1F6AB} ${this.getBlueprint().tag}: ${message}`);
  }
  logInfo(message) {
    console.log(`\u2139\uFE0F ${this.getBlueprint().tag}: ${message}`);
  }
  logSuccess(message) {
    console.log(`\u2705 ${this.getBlueprint().tag}: ${message}`);
  }
  createSuccessResult(data) {
    return {
      success: true,
      data
    };
  }
  createErrorResult(error) {
    const errorObj = typeof error === "string" ? new Error(error) : error;
    return {
      success: false,
      error: errorObj
    };
  }
};
__name(_BaseAction, "BaseAction");
var BaseAction = _BaseAction;

// src/services/LLM/actions/ActionExplainerAction.ts
function _ts_decorate17(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate17, "_ts_decorate");
function _ts_metadata13(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata13, "_ts_metadata");
var _ActionExplainerAction = class _ActionExplainerAction extends BaseAction {
  constructor(actionTagsExtractor, actionExplainer) {
    super(actionTagsExtractor);
    __publicField(this, "actionTagsExtractor");
    __publicField(this, "actionExplainer");
    this.actionTagsExtractor = actionTagsExtractor, this.actionExplainer = actionExplainer;
  }
  getBlueprint() {
    return actionExplainerBlueprint;
  }
  validateParams(params) {
    if (!params.action) {
      return "Missing required parameter: action";
    }
    return null;
  }
  parseParams(content) {
    const actionMatch = content.match(/<action>(.*?)<\/action>/s);
    if (!actionMatch) {
      return {
        action: null
      };
    }
    return {
      action: actionMatch[1].trim()
    };
  }
  async executeInternal(params) {
    try {
      const explanation = this.actionExplainer.explainAction(params.action);
      return {
        success: true,
        data: explanation
      };
    } catch (error) {
      return {
        success: false,
        error
      };
    }
  }
};
__name(_ActionExplainerAction, "ActionExplainerAction");
var ActionExplainerAction = _ActionExplainerAction;
ActionExplainerAction = _ts_decorate17([
  (0, import_tsyringe21.autoInjectable)(),
  _ts_metadata13("design:type", Function),
  _ts_metadata13("design:paramtypes", [
    typeof ActionTagsExtractor === "undefined" ? Object : ActionTagsExtractor,
    typeof ActionExplainer === "undefined" ? Object : ActionExplainer
  ])
], ActionExplainerAction);

// src/services/LLM/actions/types/ActionPriority.ts
var ActionPriority = /* @__PURE__ */ function(ActionPriority2) {
  ActionPriority2[ActionPriority2["CRITICAL"] = 1] = "CRITICAL";
  ActionPriority2[ActionPriority2["HIGH"] = 2] = "HIGH";
  ActionPriority2[ActionPriority2["MEDIUM"] = 3] = "MEDIUM";
  ActionPriority2[ActionPriority2["LOW"] = 4] = "LOW";
  ActionPriority2[ActionPriority2["LOWEST"] = 5] = "LOWEST";
  return ActionPriority2;
}({});

// src/services/LLM/actions/blueprints/actionExplainerBlueprint.ts
var actionExplainerBlueprint = {
  tag: "action_explainer",
  class: ActionExplainerAction,
  description: "Get detailed explanation of how to use an action",
  usageExplanation: `The action_explainer helps you understand how to use other actions. Here are common use cases:

1. Get help with a specific action:
<action_explainer>
  <action>write_file</action>
</action_explainer>

2. Learn about a new action:
<action_explainer>
  <action>git_diff</action>
</action_explainer>

Note:
- Use when unsure about action syntax
- Shows parameters and examples
- Provides usage tips and notes
- Available for all actions
- Returns formatted explanation`,
  priority: ActionPriority.HIGH,
  canRunInParallel: true,
  requiresProcessing: false,
  parameters: [
    {
      name: "action",
      required: true,
      description: "The action tag to get explanation for (e.g. read_file, write_file)",
      validator: /* @__PURE__ */ __name((value) => typeof value === "string" && value.length > 0, "validator")
    }
  ]
};

// src/services/text/AnsiStripper.ts
var import_tsyringe22 = require("tsyringe");
function _ts_decorate18(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate18, "_ts_decorate");
var _AnsiStripper = class _AnsiStripper {
  /**
  * Strips ANSI escape codes from the input string.
  *
  * @param input - The string potentially containing ANSI escape codes.
  * @returns The cleaned string without ANSI codes.
  */
  strip(input) {
    if (typeof input !== "string") {
      throw new TypeError("Input must be a string");
    }
    return input.replace(_AnsiStripper.ansiRegex, "");
  }
};
__name(_AnsiStripper, "AnsiStripper");
// Regular expression to match ANSI escape codes
__publicField(_AnsiStripper, "ansiRegex", /\x1B\[[0-?]*[ -/]*[@-~]/g);
var AnsiStripper = _AnsiStripper;
AnsiStripper = _ts_decorate18([
  (0, import_tsyringe22.autoInjectable)()
], AnsiStripper);

// src/services/LLM/actions/CommandAction.ts
var import_chalk2 = __toESM(require("chalk"), 1);
var import_child_process = require("child_process");
var import_tsyringe23 = require("tsyringe");
function _ts_decorate19(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate19, "_ts_decorate");
function _ts_metadata14(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata14, "_ts_metadata");
var _CommandAction = class _CommandAction extends BaseAction {
  constructor(actionTagsExtractor, debugLogger, ansiStripper) {
    super(actionTagsExtractor);
    __publicField(this, "actionTagsExtractor");
    __publicField(this, "debugLogger");
    __publicField(this, "ansiStripper");
    this.actionTagsExtractor = actionTagsExtractor, this.debugLogger = debugLogger, this.ansiStripper = ansiStripper;
  }
  getBlueprint() {
    return commandActionBlueprint;
  }
  parseParams(content) {
    const tag = this.getBlueprint().tag;
    const match = content.match(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`));
    if (!match) {
      this.logError("Failed to parse command from content");
      return {
        command: ""
      };
    }
    const command = match[0].replace(new RegExp(`^<${tag}>`), "").replace(new RegExp(`<\\/${tag}>$`), "").trim();
    this.logInfo(`Parsed command: ${command}`);
    return {
      command
    };
  }
  validateParams(params) {
    const { command } = params;
    if (!command || command.trim().length === 0) {
      return "No valid command to execute";
    }
    return null;
  }
  async executeInternal(params) {
    try {
      const { command } = params;
      this.logInfo(`Executing command: ${command}`);
      return this.executeCommand(command);
    } catch (error) {
      return this.createSuccessResult(error.message);
    }
  }
  isTestEnvironment() {
    return process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID !== void 0;
  }
  async executeCommand(command, options) {
    return new Promise((resolve2) => {
      const [cmd, ...args] = command.split(" ");
      const child = (0, import_child_process.spawn)(cmd, args, {
        ...options,
        shell: true
      });
      let stdoutData = "";
      let stderrData = "";
      let isResolved = false;
      let stdoutBuffer = "";
      let stderrBuffer = "";
      child.stdout.on("data", (data) => {
        const chunk = data.toString();
        stdoutBuffer += chunk;
        const strippedChunk = this.ansiStripper.strip(stdoutBuffer);
        stdoutData += strippedChunk;
        stdoutBuffer = "";
        if (!this.isTestEnvironment()) {
          process.stdout.write(import_chalk2.default.green(chunk));
        }
      });
      child.stderr.on("data", (data) => {
        const chunk = data.toString();
        stderrBuffer += chunk;
        const strippedChunk = this.ansiStripper.strip(stderrBuffer);
        stderrData += strippedChunk;
        stderrBuffer = "";
        if (!this.isTestEnvironment()) {
          process.stderr.write(import_chalk2.default.red(chunk));
        }
      });
      const finalizeAndResolve = /* @__PURE__ */ __name((exitCode = null) => {
        if (!isResolved) {
          isResolved = true;
          if (stdoutBuffer) {
            stdoutData += this.ansiStripper.strip(stdoutBuffer);
          }
          if (stderrBuffer) {
            stderrData += this.ansiStripper.strip(stderrBuffer);
          }
          const extra = `CRITICAL: If you're unsure why the command failed prioritize read_file to get more context from files related to the failure and a better understanding of the problem, instead of jumping to write_file right away with a solution
            

 If you're stuck with the same problem over and over TRY DIFFERENT SOLUTIONS, don't keep trying the same thing over and over again`;
          const output = stdoutData + stderrData;
          const combinedOutput = (output || `Command completed with exit code ${exitCode}`) + (exitCode === 1 ? extra : "");
          this.debugLogger.log("CommandAction", "Command execution completed", {
            command,
            exitCode,
            output: combinedOutput
          });
          resolve2(this.createSuccessResult(combinedOutput));
        }
      }, "finalizeAndResolve");
      child.on("close", (code) => {
        finalizeAndResolve(code);
      });
      child.on("error", (error) => {
        this.debugLogger.log("CommandAction", "Command execution error", {
          command,
          error: error.message
        });
        resolve2(this.createSuccessResult(`${error.message}: command not found`));
      });
    });
  }
};
__name(_CommandAction, "CommandAction");
var CommandAction = _CommandAction;
CommandAction = _ts_decorate19([
  (0, import_tsyringe23.autoInjectable)(),
  _ts_metadata14("design:type", Function),
  _ts_metadata14("design:paramtypes", [
    typeof ActionTagsExtractor === "undefined" ? Object : ActionTagsExtractor,
    typeof DebugLogger === "undefined" ? Object : DebugLogger,
    typeof AnsiStripper === "undefined" ? Object : AnsiStripper
  ])
], CommandAction);

// src/services/LLM/actions/blueprints/commandActionBlueprint.ts
var commandActionBlueprint = {
  tag: "execute_command",
  class: CommandAction,
  description: "Executes a system command with output streaming",
  usageExplanation: `The execute_command action allows you to run system commands. Here are common use cases:

1. Run tests:
<execute_command>
yarn test src/services/__tests__/MyService.test.ts
</execute_command>

2. Check types:
<execute_command>
yarn tsc
</execute_command>

3. List directory contents:
<execute_command>
ls -la src/services
</execute_command>

Note:
- Use project's package manager (yarn/npm)
- Avoid installing packages without permission
- Avoid destructive commands (rm -rf, etc)
- Commands run in workspace root
- Output is streamed back to you`,
  priority: ActionPriority.LOW,
  canRunInParallel: false,
  requiresProcessing: true,
  parameters: []
};

// src/services/FileManagement/FileSearch.ts
var import_fast_glob = __toESM(require("fast-glob"), 1);
var import_fs_extra = __toESM(require("fs-extra"), 1);
var import_fuse = __toESM(require("fuse.js"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_tsyringe24 = require("tsyringe");
function _ts_decorate20(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate20, "_ts_decorate");
function _ts_metadata15(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata15, "_ts_metadata");
var _FileSearch = class _FileSearch {
  constructor(debugLogger) {
    __publicField(this, "debugLogger");
    this.debugLogger = debugLogger;
  }
  findAllMatches(text, searchStr) {
    const positions = [];
    let pos = text.indexOf(searchStr);
    while (pos !== -1) {
      positions.push(pos);
      pos = text.indexOf(searchStr, pos + 1);
    }
    return positions;
  }
  async findByPattern(pattern, directory) {
    try {
      const entries = await (0, import_fast_glob.default)(pattern, {
        cwd: directory,
        dot: true,
        absolute: true
      });
      const results = [];
      for (const entry of entries) {
        const content = await import_fs_extra.default.readFile(entry, "utf-8");
        const lines = content.split("\n");
        results.push({
          path: entry,
          matches: lines.map((line, index) => ({
            line: index + 1,
            content: line
          }))
        });
      }
      return results;
    } catch (error) {
      console.error("Error in findByPattern:", error);
      return [];
    }
  }
  async findByContent(searchContent, directory) {
    try {
      const entries = await (0, import_fast_glob.default)("**/*", {
        cwd: directory,
        dot: true,
        absolute: true
      });
      const results = [];
      const searchTarget = searchContent.toLowerCase();
      for (const entry of entries) {
        try {
          const stats = await import_fs_extra.default.stat(entry);
          if (!stats.isFile()) continue;
          const content = await import_fs_extra.default.readFile(entry, "utf-8");
          const lines = content.split("\n");
          const matches = [];
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineToSearch = line.toLowerCase();
            const positions = this.findAllMatches(lineToSearch, searchTarget);
            for (const pos of positions) {
              matches.push({
                line: i + 1,
                content: line,
                position: pos
              });
            }
          }
          if (matches.length > 0) {
            results.push({
              path: entry,
              matches
            });
          }
        } catch (error) {
          console.error(`Error processing file ${entry}:`, error);
        }
      }
      return results;
    } catch (error) {
      console.error("Error in findByContent:", error);
      return [];
    }
  }
  async findByName(name, directory) {
    try {
      const targetName = import_path2.default.basename(name);
      const targetDir = import_path2.default.dirname(name);
      this.debugLogger.log("FileSearch", "findByName input", {
        name,
        targetName,
        targetDir,
        directory
      });
      const entries = await (0, import_fast_glob.default)("**/*", {
        cwd: directory,
        dot: true,
        absolute: true,
        onlyFiles: true
      });
      if (!entries.length) {
        this.debugLogger.log("FileSearch", "No files found in directory", {
          directory
        });
        return [];
      }
      const fileEntries = entries.map((entry) => ({
        fullPath: entry,
        name: import_path2.default.basename(entry).toLowerCase(),
        dir: import_path2.default.dirname(entry)
      }));
      const searchName = targetName.toLowerCase();
      const exactMatches = fileEntries.filter((entry) => {
        const entryName = entry.name;
        return entryName === searchName || entryName === `${searchName}.txt` || entryName.startsWith(`${searchName}.`);
      });
      this.debugLogger.log("FileSearch", "exact matches", exactMatches);
      if (exactMatches.length > 0) {
        return exactMatches.sort((a, b) => {
          const aExact = a.name === searchName || a.name === `${searchName}.txt`;
          const bExact = b.name === searchName || b.name === `${searchName}.txt`;
          if (aExact !== bExact) return aExact ? -1 : 1;
          return a.fullPath.length - b.fullPath.length;
        }).map((entry) => entry.fullPath);
      }
      const fuse = new import_fuse.default(fileEntries, {
        includeScore: true,
        threshold: 0.3,
        minMatchCharLength: Math.min(3, searchName.length),
        keys: [
          {
            name: "name",
            weight: 1
          }
        ]
      });
      const results = fuse.search(searchName);
      this.debugLogger.log("FileSearch", "fuzzy search results", results);
      return results.filter((result) => {
        if (!result.score) return false;
        return result.score < 0.2 || result.item.name.includes(searchName);
      }).slice(0, 5).map((result) => result.item.fullPath);
    } catch (error) {
      this.debugLogger.log("FileSearch", "Error in findByName", {
        error
      });
      return [];
    }
  }
};
__name(_FileSearch, "FileSearch");
var FileSearch = _FileSearch;
FileSearch = _ts_decorate20([
  (0, import_tsyringe24.autoInjectable)(),
  _ts_metadata15("design:type", Function),
  _ts_metadata15("design:paramtypes", [
    typeof DebugLogger === "undefined" ? Object : DebugLogger
  ])
], FileSearch);

// src/services/FileManagement/PathAdjuster.ts
var import_fast_glob2 = __toESM(require("fast-glob"), 1);
var import_fs_extra2 = __toESM(require("fs-extra"), 1);
var Fuse2 = __toESM(require("fuse.js"), 1);
var import_path3 = __toESM(require("path"), 1);
var import_tsyringe25 = require("tsyringe");
function _ts_decorate21(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate21, "_ts_decorate");
function _ts_metadata16(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata16, "_ts_metadata");
var _PathAdjuster = class _PathAdjuster {
  constructor() {
    __publicField(this, "allFiles", []);
    __publicField(this, "fuse");
    __publicField(this, "initialized", false);
    __publicField(this, "initializationError", null);
    __publicField(this, "baseDirectory", process.cwd());
    const defaultFuzzyOptions = {
      includeScore: true,
      threshold: 0.4
    };
    this.fuse = new Fuse2.default([], defaultFuzzyOptions);
    this.initialize().catch((error) => {
      this.initializationError = error;
      console.error("Failed to initialize PathAdjuster:", error);
    });
  }
  async cleanup() {
  }
  isInitialized() {
    return this.initialized;
  }
  getInitializationError() {
    return this.initializationError;
  }
  async initialize() {
    try {
      this.allFiles = await this.getAllFiles(this.baseDirectory);
      this.fuse.setCollection(this.allFiles);
      this.initialized = true;
      this.initializationError = null;
    } catch (error) {
      this.initialized = false;
      this.initializationError = error instanceof Error ? error : new Error(String(error));
      throw this.initializationError;
    }
  }
  async getAllFiles(dir) {
    try {
      const entries = await import_fast_glob2.default.sync("**/*", {
        cwd: dir,
        absolute: true,
        onlyFiles: true,
        followSymbolicLinks: true
      });
      return entries.map((filePath) => import_path3.default.resolve(filePath));
    } catch (error) {
      throw new Error(`Failed to fetch files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  findClosestMatch(wrongPath, threshold = 0.6) {
    if (!this.initialized) {
      throw new Error("PathAdjuster not initialized. Check initialization status with isInitialized()");
    }
    const absoluteWrongPath = import_path3.default.resolve(this.baseDirectory, wrongPath);
    const results = this.fuse.search(absoluteWrongPath, {
      limit: 1
    });
    if (results.length > 0) {
      const bestMatch = results[0];
      if (bestMatch.score !== void 0 && bestMatch.score <= 1 - threshold) {
        return bestMatch.item;
      }
    }
    return null;
  }
  validatePath(filePath) {
    try {
      const exists = import_fs_extra2.default.pathExistsSync(filePath);
      if (!exists) return false;
      const stats = import_fs_extra2.default.lstatSync(filePath);
      return stats.isFile();
    } catch (error) {
      return false;
    }
  }
  async adjustPath(wrongPath, threshold = 0.6) {
    if (!this.initialized) {
      await this.initialize();
    }
    const closestMatch = this.findClosestMatch(wrongPath, threshold);
    if (closestMatch && this.validatePath(closestMatch)) {
      return closestMatch;
    }
    return null;
  }
  toRelativePath(absolutePath) {
    if (!import_path3.default.isAbsolute(absolutePath)) {
      const possiblePath = import_path3.default.join(this.baseDirectory, absolutePath);
      if (this.validatePath(possiblePath)) {
        return absolutePath;
      }
    }
    const normalizedPath = import_path3.default.resolve(absolutePath);
    if (!normalizedPath.startsWith(this.baseDirectory)) {
      throw new Error("Path is outside the base directory");
    }
    return import_path3.default.relative(this.baseDirectory, normalizedPath);
  }
  async refreshFilePaths() {
    try {
      this.allFiles = await this.getAllFiles(this.baseDirectory);
      this.fuse.setCollection(this.allFiles);
    } catch (error) {
      console.error("Error refreshing file paths:", error);
      throw error;
    }
  }
};
__name(_PathAdjuster, "PathAdjuster");
var PathAdjuster = _PathAdjuster;
PathAdjuster = _ts_decorate21([
  (0, import_tsyringe25.autoInjectable)(),
  _ts_metadata16("design:type", Function),
  _ts_metadata16("design:paramtypes", [])
], PathAdjuster);

// src/services/FileManagement/FileOperations.ts
var import_fs_extra3 = __toESM(require("fs-extra"), 1);
var import_path4 = __toESM(require("path"), 1);
var import_tsyringe26 = require("tsyringe");
function _ts_decorate22(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate22, "_ts_decorate");
function _ts_metadata17(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata17, "_ts_metadata");
var _FileOperations = class _FileOperations {
  constructor(pathAdjuster, fileSearch, debugLogger) {
    __publicField(this, "pathAdjuster");
    __publicField(this, "fileSearch");
    __publicField(this, "debugLogger");
    this.pathAdjuster = pathAdjuster;
    this.fileSearch = fileSearch;
    this.debugLogger = debugLogger;
  }
  async ensureInitialized(timeout = 5e3) {
    const startTime = Date.now();
    if (!this.pathAdjuster.isInitialized()) {
      await new Promise((resolve2, reject) => {
        const checkInit = /* @__PURE__ */ __name(() => {
          if (this.pathAdjuster.isInitialized()) {
            resolve2();
          } else if (Date.now() - startTime > timeout) {
            reject(new Error("PathAdjuster initialization timed out"));
          } else {
            setTimeout(checkInit, 10);
          }
        }, "checkInit");
        checkInit();
      });
    }
    const error = this.pathAdjuster.getInitializationError();
    if (error) {
      throw error;
    }
  }
  async getAdjustedPath(filePath) {
    await this.ensureInitialized();
    const adjustedPath = await this.pathAdjuster.adjustPath(filePath);
    return adjustedPath || filePath;
  }
  async adjustPath(filePath, isRead = false) {
    await this.ensureInitialized();
    if (await import_fs_extra3.default.pathExists(filePath)) {
      return filePath;
    }
    if (isRead) {
      const similarFiles = await this.fileSearch.findByName(import_path4.default.basename(filePath), process.cwd());
      if (similarFiles.length > 0) {
        const bestMatch = similarFiles[0];
        if (await import_fs_extra3.default.pathExists(bestMatch)) {
          const stats = await import_fs_extra3.default.stat(bestMatch);
          if (stats.isFile()) {
            this.debugLogger.log("FileOperations", `Found similar file: ${bestMatch} for ${filePath}`, {
              confidence: "high",
              originalPath: filePath
            });
            return bestMatch;
          }
        }
      }
    }
    const adjustedPath = await this.pathAdjuster.adjustPath(filePath);
    if (adjustedPath && await import_fs_extra3.default.pathExists(adjustedPath)) {
      this.debugLogger.log("FileOperations > PathAdjuster", `Adjusted path: ${adjustedPath}`);
      return adjustedPath;
    }
    return filePath;
  }
  async read(filePath) {
    try {
      const adjustedPath = await this.adjustPath(filePath, true);
      if (!await import_fs_extra3.default.pathExists(adjustedPath)) {
        return {
          success: false,
          error: new Error(`File does not exist: ${filePath}`)
        };
      }
      const content = await import_fs_extra3.default.readFile(adjustedPath, "utf-8");
      return {
        success: true,
        data: content
      };
    } catch (error) {
      return {
        success: false,
        error
      };
    }
  }
  async readMultiple(filePaths) {
    try {
      if (!filePaths?.length) {
        return {
          success: false,
          error: new Error("No files provided")
        };
      }
      const fileContents = [];
      const errors = [];
      for (const filePath of filePaths) {
        try {
          const adjustedPath = await this.adjustPath(filePath);
          if (!await import_fs_extra3.default.pathExists(adjustedPath)) {
            errors.push(`${filePath}: File does not exist`);
            continue;
          }
          const content = await import_fs_extra3.default.readFile(adjustedPath, "utf-8");
          if (content) {
            fileContents.push(`[File: ${adjustedPath}]
${content}`);
          } else {
            errors.push(`${adjustedPath}: Empty content`);
          }
        } catch (error) {
          errors.push(`${filePath}: ${error.message}`);
        }
      }
      if (errors.length > 0) {
        return {
          success: false,
          error: new Error(`Failed to read files: ${errors.join(", ")}. Try using search_file action to find the proper path.`)
        };
      }
      return {
        success: true,
        data: fileContents.join("\n\n")
      };
    } catch (error) {
      return {
        success: false,
        error
      };
    }
  }
  async validateAndAdjustWritePath(filePath) {
    const absolutePath = import_path4.default.resolve(process.cwd(), filePath);
    if (await import_fs_extra3.default.pathExists(filePath)) {
      return {
        adjustedPath: filePath,
        isNewFile: false
      };
    }
    const projectRoot = process.cwd();
    if (!absolutePath.startsWith(projectRoot)) {
      throw new Error(`File path must be within project root: ${projectRoot}`);
    }
    return {
      adjustedPath: filePath,
      isNewFile: true
    };
  }
  async write(filePath, content) {
    try {
      const { adjustedPath, isNewFile } = await this.validateAndAdjustWritePath(filePath);
      if (!isNewFile) {
        this.debugLogger.log("FileOperations", `Writing to existing file at: ${adjustedPath}`);
      } else {
        this.debugLogger.log("FileOperations", `Creating new file at: ${adjustedPath}`);
      }
      await import_fs_extra3.default.ensureDir(import_path4.default.dirname(adjustedPath));
      await import_fs_extra3.default.writeFile(adjustedPath, content);
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error
      };
    }
  }
  async delete(filePath) {
    try {
      const adjustedPath = await this.adjustPath(filePath);
      if (!await import_fs_extra3.default.pathExists(adjustedPath)) {
        return {
          success: false,
          error: new Error(`File does not exist: ${filePath}`)
        };
      }
      await import_fs_extra3.default.remove(adjustedPath);
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error
      };
    }
  }
  async copy(source, destination) {
    try {
      const adjustedSource = await this.adjustPath(source);
      if (!await import_fs_extra3.default.pathExists(adjustedSource)) {
        return {
          success: false,
          error: new Error(`Source file does not exist: ${source}`)
        };
      }
      await import_fs_extra3.default.ensureDir(import_path4.default.dirname(destination));
      await import_fs_extra3.default.copy(adjustedSource, destination);
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error
      };
    }
  }
  async move(source, destination) {
    try {
      const adjustedSource = await this.adjustPath(source);
      if (!await import_fs_extra3.default.pathExists(adjustedSource)) {
        return {
          success: false,
          error: new Error(`Source file does not exist: ${source}`)
        };
      }
      await import_fs_extra3.default.ensureDir(import_path4.default.dirname(destination));
      await import_fs_extra3.default.move(adjustedSource, destination, {
        overwrite: true
      });
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error
      };
    }
  }
  async exists(filePath) {
    const adjustedPath = await this.adjustPath(filePath);
    return import_fs_extra3.default.pathExists(adjustedPath);
  }
  async stats(filePath) {
    try {
      const adjustedPath = await this.adjustPath(filePath);
      if (!await import_fs_extra3.default.pathExists(adjustedPath)) {
        return {
          success: false,
          error: new Error(`File does not exist: ${filePath}`)
        };
      }
      const stats = await import_fs_extra3.default.stat(adjustedPath);
      const fileStats = {
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        isDirectory: stats.isDirectory(),
        path: adjustedPath
      };
      return {
        success: true,
        data: fileStats
      };
    } catch (error) {
      return {
        success: false,
        error
      };
    }
  }
  async findSimilarFiles(filePath) {
    return this.fileSearch.findByName(filePath, process.cwd());
  }
};
__name(_FileOperations, "FileOperations");
var FileOperations = _FileOperations;
FileOperations = _ts_decorate22([
  (0, import_tsyringe26.autoInjectable)(),
  _ts_metadata17("design:type", Function),
  _ts_metadata17("design:paramtypes", [
    typeof PathAdjuster === "undefined" ? Object : PathAdjuster,
    typeof FileSearch === "undefined" ? Object : FileSearch,
    typeof DebugLogger === "undefined" ? Object : DebugLogger
  ])
], FileOperations);

// src/services/LLM/actions/CopyFileAction.ts
var import_tsyringe27 = require("tsyringe");
function _ts_decorate23(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate23, "_ts_decorate");
function _ts_metadata18(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata18, "_ts_metadata");
var _CopyFileAction = class _CopyFileAction extends BaseAction {
  constructor(actionTagsExtractor, fileOperations) {
    super(actionTagsExtractor);
    __publicField(this, "actionTagsExtractor");
    __publicField(this, "fileOperations");
    this.actionTagsExtractor = actionTagsExtractor, this.fileOperations = fileOperations;
  }
  getBlueprint() {
    return copyFileActionBlueprint;
  }
  validateParams(params) {
    const { source_path, destination_path } = params;
    if (!source_path) {
      return "No source path provided";
    }
    if (!destination_path) {
      return "No destination path provided";
    }
    return null;
  }
  async execute(content) {
    const structureError = this.actionTagsExtractor.validateStructure(content);
    if (structureError) {
      return this.createErrorResult(structureError);
    }
    return super.execute(content);
  }
  async executeInternal(params) {
    try {
      const { source_path, destination_path } = params;
      this.logInfo(`Source path: ${source_path}`);
      this.logInfo(`Destination path: ${destination_path}`);
      const result = await this.fileOperations.copy(source_path, destination_path);
      if (!result.success) {
        return this.createErrorResult(result.error);
      }
      return this.createSuccessResult(result.data);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }
};
__name(_CopyFileAction, "CopyFileAction");
var CopyFileAction = _CopyFileAction;
CopyFileAction = _ts_decorate23([
  (0, import_tsyringe27.autoInjectable)(),
  _ts_metadata18("design:type", Function),
  _ts_metadata18("design:paramtypes", [
    typeof ActionTagsExtractor === "undefined" ? Object : ActionTagsExtractor,
    typeof FileOperations === "undefined" ? Object : FileOperations
  ])
], CopyFileAction);

// src/services/LLM/actions/blueprints/copyFileActionBlueprint.ts
var copyFileActionBlueprint = {
  tag: "copy_file",
  class: CopyFileAction,
  description: "Copy a file from source to destination path",
  usageExplanation: `The copy_file action creates a copy of a file in a new location. Here are common use cases:

1. Copy a file to a new location:
<copy_file>
  <source_path>src/services/OldService.ts</source_path>
  <destination_path>src/services/NewService.ts</destination_path>
</copy_file>

2. Create a backup before modifying:
<copy_file>
  <source_path>src/config.ts</source_path>
  <destination_path>src/config.backup.ts</destination_path>
</copy_file>

Note:
- Use relative paths from workspace root
- Destination directory must exist
- Will overwrite destination if it exists
- Preserves file permissions`,
  priority: ActionPriority.MEDIUM,
  canRunInParallel: true,
  requiresProcessing: false,
  parameters: [
    {
      name: "source_path",
      required: true,
      description: "The source path of the file to copy",
      validator: /* @__PURE__ */ __name((value) => typeof value === "string" && value.length > 0, "validator")
    },
    {
      name: "destination_path",
      required: true,
      description: "The destination path for the file copy",
      validator: /* @__PURE__ */ __name((value) => typeof value === "string" && value.length > 0, "validator")
    }
  ]
};

// src/services/LLM/actions/DeleteFileAction.ts
var import_tsyringe28 = require("tsyringe");
function _ts_decorate24(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate24, "_ts_decorate");
function _ts_metadata19(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata19, "_ts_metadata");
var _DeleteFileAction = class _DeleteFileAction extends BaseAction {
  constructor(actionTagsExtractor, fileOperations) {
    super(actionTagsExtractor);
    __publicField(this, "actionTagsExtractor");
    __publicField(this, "fileOperations");
    this.actionTagsExtractor = actionTagsExtractor, this.fileOperations = fileOperations;
  }
  getBlueprint() {
    return deleteFileActionBlueprint;
  }
  validateParams(params) {
    const { path: path10 } = params;
    if (typeof path10 !== "string" || !path10.trim()) {
      return "Invalid or no file path provided";
    }
    return null;
  }
  async executeInternal(params) {
    try {
      const { path: filePath } = params;
      this.logInfo(`Attempting to delete file at path: ${filePath}`);
      const result = await this.fileOperations.delete(filePath);
      if (!result.success) {
        this.logError(`Failed to delete file at path: ${filePath}. Error: ${result.error}`);
        return this.createErrorResult(result.error);
      }
      this.logInfo(`Successfully deleted file at path: ${filePath}`);
      return this.createSuccessResult(result.data);
    } catch (error) {
      const { path: filePath } = params;
      this.logError(`An unexpected error occurred while deleting file at path: ${filePath}. Error: ${error}`);
      return this.createErrorResult(error);
    }
  }
  async execute(content) {
    let params;
    try {
      params = JSON.parse(content);
    } catch (error) {
      return this.createErrorResult(new Error("Invalid JSON content"));
    }
    const validationError = this.validateParams(params);
    if (validationError) {
      return this.createErrorResult(new Error(validationError));
    }
    return this.executeInternal(params);
  }
};
__name(_DeleteFileAction, "DeleteFileAction");
var DeleteFileAction = _DeleteFileAction;
DeleteFileAction = _ts_decorate24([
  (0, import_tsyringe28.autoInjectable)(),
  _ts_metadata19("design:type", Function),
  _ts_metadata19("design:paramtypes", [
    typeof ActionTagsExtractor === "undefined" ? Object : ActionTagsExtractor,
    typeof FileOperations === "undefined" ? Object : FileOperations
  ])
], DeleteFileAction);

// src/services/LLM/actions/blueprints/deleteFileActionBlueprint.ts
var deleteFileActionBlueprint = {
  tag: "delete_file",
  class: DeleteFileAction,
  description: "Delete a file at the specified path",
  usageExplanation: `The delete_file action permanently removes a file. Here are common use cases:

1. Delete a specific file:
<delete_file>
  <path>src/services/OldService.ts</path>
</delete_file>

2. Delete a temporary file:
<delete_file>
  <path>src/config.backup.ts</path>
</delete_file>

Note:
- Use relative paths from workspace root
- Action is irreversible
- File must exist
- Consider backing up before deleting
- Remove imports to deleted file`,
  priority: ActionPriority.MEDIUM,
  canRunInParallel: false,
  requiresProcessing: false,
  parameters: [
    {
      name: "path",
      required: true,
      description: "The path of the file to delete",
      validator: /* @__PURE__ */ __name((value) => typeof value === "string" && value.length > 0, "validator")
    }
  ]
};

// src/services/LLM/actions/EndPhaseAction.ts
var import_tsyringe31 = require("tsyringe");

// src/services/LLM/PhaseTransitionService.ts
var import_tsyringe30 = require("tsyringe");

// src/services/LLM/context/MessageContextPhase.ts
var import_tsyringe29 = require("tsyringe");
function _ts_decorate25(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate25, "_ts_decorate");
function _ts_metadata20(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata20, "_ts_metadata");
var _MessageContextPhase = class _MessageContextPhase {
  constructor(messageContextStore, messageContextHistory) {
    __publicField(this, "messageContextStore");
    __publicField(this, "messageContextHistory");
    this.messageContextStore = messageContextStore;
    this.messageContextHistory = messageContextHistory;
  }
  cleanupPhaseContent() {
    const currentData = this.messageContextStore.getContextData();
    this.messageContextStore.setContextData({
      phaseInstructions: /* @__PURE__ */ new Map(),
      fileOperations: new Map(currentData.fileOperations),
      commandOperations: new Map(currentData.commandOperations),
      conversationHistory: [
        ...currentData.conversationHistory
      ],
      systemInstructions: currentData.systemInstructions
    });
    this.messageContextHistory.updateLogFile();
  }
};
__name(_MessageContextPhase, "MessageContextPhase");
var MessageContextPhase = _MessageContextPhase;
MessageContextPhase = _ts_decorate25([
  (0, import_tsyringe29.singleton)(),
  (0, import_tsyringe29.autoInjectable)(),
  _ts_metadata20("design:type", Function),
  _ts_metadata20("design:paramtypes", [
    typeof MessageContextStore === "undefined" ? Object : MessageContextStore,
    typeof MessageContextHistory === "undefined" ? Object : MessageContextHistory
  ])
], MessageContextPhase);

// src/services/LLM/PhaseTransitionService.ts
function _ts_decorate26(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate26, "_ts_decorate");
function _ts_metadata21(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata21, "_ts_metadata");
var _PhaseTransitionService = class _PhaseTransitionService {
  constructor(phaseManager, modelManager, messageContextPhase, messageContextHistory) {
    __publicField(this, "phaseManager");
    __publicField(this, "modelManager");
    __publicField(this, "messageContextPhase");
    __publicField(this, "messageContextHistory");
    this.phaseManager = phaseManager;
    this.modelManager = modelManager;
    this.messageContextPhase = messageContextPhase;
    this.messageContextHistory = messageContextHistory;
  }
  async transitionToNextPhase() {
    const currentPhase = this.phaseManager.getCurrentPhase();
    const nextPhase = this.getNextPhase(currentPhase);
    this.messageContextPhase.cleanupPhaseContent();
    console.log(`\u{1F504} Phase Transition: ${this.getPhaseEmoji(currentPhase)}${currentPhase} \u27A1\uFE0F ${this.getPhaseEmoji(nextPhase)}${nextPhase}`);
    this.phaseManager.nextPhase();
    const nextPhaseConfig = this.phaseManager.getCurrentPhaseConfig();
    await this.modelManager.setCurrentModel(nextPhaseConfig.model);
    nextPhaseConfig.generatePrompt({
      message: "Continue with the next phase based on previous findings."
    });
    this.messageContextHistory.addMessage("system", `Current phase is ${nextPhase}`);
    return {
      regenerate: true,
      selectedModel: nextPhaseConfig.model
    };
  }
  getNextPhase(currentPhase) {
    switch (currentPhase) {
      case Phase.Discovery:
        return Phase.Strategy;
      case Phase.Strategy:
        return Phase.Execute;
      case Phase.Execute:
        return Phase.Discovery;
      default:
        return Phase.Discovery;
    }
  }
  getPhaseEmoji(phase) {
    switch (phase) {
      case Phase.Discovery:
        return "\u{1F50D} ";
      case Phase.Strategy:
        return "\u{1F3AF} ";
      case Phase.Execute:
        return "\u26A1 ";
      default:
        return "\u2753 ";
    }
  }
};
__name(_PhaseTransitionService, "PhaseTransitionService");
var PhaseTransitionService = _PhaseTransitionService;
PhaseTransitionService = _ts_decorate26([
  (0, import_tsyringe30.injectable)(),
  _ts_metadata21("design:type", Function),
  _ts_metadata21("design:paramtypes", [
    typeof PhaseManager === "undefined" ? Object : PhaseManager,
    typeof ModelManager === "undefined" ? Object : ModelManager,
    typeof MessageContextPhase === "undefined" ? Object : MessageContextPhase,
    typeof MessageContextHistory === "undefined" ? Object : MessageContextHistory
  ])
], PhaseTransitionService);

// src/services/LLM/actions/EndPhaseAction.ts
function _ts_decorate27(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate27, "_ts_decorate");
function _ts_metadata22(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata22, "_ts_metadata");
var _EndPhaseAction = class _EndPhaseAction extends BaseAction {
  constructor(actionTagsExtractor, phaseTransitionService) {
    super(actionTagsExtractor);
    __publicField(this, "phaseTransitionService");
    this.phaseTransitionService = phaseTransitionService;
  }
  async executeInternal(params) {
    try {
      const data = await this.phaseTransitionService.transitionToNextPhase();
      return this.createSuccessResult(data);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }
  validateParams(params) {
    return null;
  }
  getBlueprint() {
    return endPhaseActionBlueprint;
  }
};
__name(_EndPhaseAction, "EndPhaseAction");
var EndPhaseAction = _EndPhaseAction;
EndPhaseAction = _ts_decorate27([
  (0, import_tsyringe31.autoInjectable)(),
  _ts_metadata22("design:type", Function),
  _ts_metadata22("design:paramtypes", [
    typeof ActionTagsExtractor === "undefined" ? Object : ActionTagsExtractor,
    typeof PhaseTransitionService === "undefined" ? Object : PhaseTransitionService
  ])
], EndPhaseAction);

// src/services/LLM/actions/blueprints/endPhaseActionBlueprint.ts
var endPhaseActionBlueprint = {
  tag: "end_phase",
  class: EndPhaseAction,
  description: "Ends the current phase and transitions to the next phase",
  usageExplanation: `The end_phase action transitions to the next phase in the workflow. Here are common use cases:

1. Move to strategy phase after discovery:
<end_phase>
  strategy_phase
</end_phase>

2. Move to execution phase after strategy:
<end_phase>
  execution_phase
</end_phase>

Note:
- Use after gathering sufficient context
- Only use when ready to move forward
- Cannot go back to previous phase
- Must be the last action in current phase
- Valid phases: discovery_phase, strategy_phase, execution_phase`,
  parameters: [],
  requiresProcessing: true,
  priority: ActionPriority.CRITICAL
};

// src/services/LLM/actions/EndTaskAction.ts
var import_tsyringe32 = require("tsyringe");
function _ts_decorate28(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate28, "_ts_decorate");
function _ts_metadata23(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata23, "_ts_metadata");
var _EndTaskAction = class _EndTaskAction extends BaseAction {
  constructor(actionTagsExtractor) {
    super(actionTagsExtractor);
    __publicField(this, "actionTagsExtractor");
    this.actionTagsExtractor = actionTagsExtractor;
  }
  getBlueprint() {
    return endTaskActionBlueprint;
  }
  validateParams(params) {
    const content = params.content;
    if (!content?.trim()) {
      return "No message provided";
    }
    return null;
  }
  async executeInternal(params) {
    const message = params.content;
    this.logInfo(`End task message: ${message}`);
    return this.createSuccessResult(message);
  }
  parseParams(content) {
    const match = content.match(/<end_task>([\s\S]*?)<\/end_task>/);
    return {
      content: match?.[1]?.trim()
    };
  }
};
__name(_EndTaskAction, "EndTaskAction");
var EndTaskAction = _EndTaskAction;
EndTaskAction = _ts_decorate28([
  (0, import_tsyringe32.autoInjectable)(),
  _ts_metadata23("design:type", Function),
  _ts_metadata23("design:paramtypes", [
    typeof ActionTagsExtractor === "undefined" ? Object : ActionTagsExtractor
  ])
], EndTaskAction);

// src/services/LLM/actions/blueprints/endTaskActionBlueprint.ts
var endTaskActionBlueprint = {
  tag: "end_task",
  class: EndTaskAction,
  description: "Mark a task as complete with a message",
  usageExplanation: `The end_task action marks the current task as complete. Here are common use cases:

1. Complete task with success message:
<end_task>
Successfully implemented new feature
</end_task>

2. Complete task with summary:
<end_task>
Created UserService with authentication methods:
- login()
- logout()
- validateToken()
All tests passing.
</end_task>

Note:
- Use clear, concise messages
- Include key accomplishments
- Mention any follow-up tasks
- Must be the last action
- Task cannot be resumed after ending`,
  priority: ActionPriority.LOWEST,
  canRunInParallel: false,
  requiresProcessing: false,
  parameters: []
};

// src/services/LLM/actions/FetchUrlAction.ts
var import_axios2 = __toESM(require("axios"), 1);
var import_tsyringe33 = require("tsyringe");
function _ts_decorate29(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate29, "_ts_decorate");
function _ts_metadata24(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata24, "_ts_metadata");
var _FetchUrlAction = class _FetchUrlAction extends BaseAction {
  constructor(actionTagsExtractor) {
    super(actionTagsExtractor);
    __publicField(this, "actionTagsExtractor");
    this.actionTagsExtractor = actionTagsExtractor;
  }
  getBlueprint() {
    return fetchUrlActionBlueprint;
  }
  validateParams(params) {
    const { url } = params;
    if (!url) {
      return "No URL provided";
    }
    try {
      new URL(url);
      return null;
    } catch {
      return "Invalid URL format. Must be a valid URL with protocol (http:// or https://)";
    }
  }
  async executeInternal(params) {
    try {
      const { url } = params;
      this.logInfo(`Fetching URL: ${url}`);
      const data = await this.fetchUrl(url);
      return this.createSuccessResult(data);
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error : new Error("Failed to fetch URL"));
    }
  }
  async fetchUrl(url) {
    try {
      const response = await import_axios2.default.get(url);
      return response.data;
    } catch (error) {
      if (import_axios2.default.isAxiosError(error)) {
        throw new Error(`Network error: ${error.message}`);
      }
      throw new Error(`Error fetching URL: ${error.message}`);
    }
  }
};
__name(_FetchUrlAction, "FetchUrlAction");
var FetchUrlAction = _FetchUrlAction;
FetchUrlAction = _ts_decorate29([
  (0, import_tsyringe33.autoInjectable)(),
  _ts_metadata24("design:type", Function),
  _ts_metadata24("design:paramtypes", [
    typeof ActionTagsExtractor === "undefined" ? Object : ActionTagsExtractor
  ])
], FetchUrlAction);

// src/services/LLM/actions/blueprints/fetchUrlActionBlueprint.ts
var fetchUrlActionBlueprint = {
  tag: "fetch_url",
  class: FetchUrlAction,
  description: "Fetch content from a URL",
  usageExplanation: `The fetch_url action allows you to retrieve content from URLs. Here are common use cases:

1. Fetch JSON data:
<fetch_url>
  <url>https://api.example.com/data.json</url>
</fetch_url>

2. Fetch documentation:
<fetch_url>
  <url>https://docs.example.com/guide</url>
</fetch_url>

Note:
- URL must start with http:// or https://
- Only use trusted domains
- Response is returned as text
- Large responses may be truncated
- Handle errors appropriately`,
  priority: ActionPriority.LOW,
  canRunInParallel: true,
  requiresProcessing: true,
  parameters: [
    {
      name: "url",
      required: true,
      description: "The URL to fetch content from",
      validator: /* @__PURE__ */ __name((value) => typeof value === "string" && value.length > 0 && (value.startsWith("http://") || value.startsWith("https://")), "validator")
    }
  ]
};

// src/services/GitManagement/GitService.ts
var import_simple_git = __toESM(require("simple-git"), 1);
var import_tsyringe34 = require("tsyringe");
function _ts_decorate30(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate30, "_ts_decorate");
function _ts_metadata25(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata25, "_ts_metadata");
var _GitService = class _GitService {
  constructor() {
    __publicField(this, "git");
    this.git = (0, import_simple_git.default)();
  }
  async getDiff(fromCommit, toCommit, excludePattern) {
    const args = [];
    args.push(fromCommit);
    args.push(toCommit);
    if (excludePattern) {
      args.push(...excludePattern.split(" "));
    }
    return await this.git.diff(args);
  }
  async getStatus() {
    return await this.git.status();
  }
  async getPRDiff(baseBranch, compareBranch, excludePattern) {
    const args = [];
    args.push(baseBranch);
    args.push(compareBranch);
    if (excludePattern) {
      args.push(...excludePattern.split(" "));
    }
    return await this.git.diff(args);
  }
  async getFileHistory(filepath) {
    const logResult = await this.git.log([
      "--follow",
      "--",
      filepath
    ]);
    return JSON.stringify(logResult, null, 2);
  }
  async getCurrentBranch() {
    return (await this.git.branch()).current;
  }
};
__name(_GitService, "GitService");
var GitService = _GitService;
GitService = _ts_decorate30([
  (0, import_tsyringe34.autoInjectable)(),
  _ts_metadata25("design:type", Function),
  _ts_metadata25("design:paramtypes", [])
], GitService);

// src/services/LLM/actions/GitDiffAction.ts
var import_tsyringe35 = require("tsyringe");
function _ts_decorate31(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate31, "_ts_decorate");
function _ts_metadata26(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata26, "_ts_metadata");
var _GitDiffAction = class _GitDiffAction extends BaseAction {
  constructor(actionTagsExtractor, gitService, configService4) {
    super(actionTagsExtractor);
    __publicField(this, "actionTagsExtractor");
    __publicField(this, "gitService");
    __publicField(this, "configService");
    this.actionTagsExtractor = actionTagsExtractor, this.gitService = gitService, this.configService = configService4;
  }
  getBlueprint() {
    return gitDiffActionBlueprint;
  }
  parseParams(content) {
    const tag = this.getBlueprint().tag;
    const match = content.match(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`));
    if (!match) {
      throw new Error("Failed to parse git diff content");
    }
    const tagContent = match[0];
    const fromCommit = this.actionTagsExtractor.extractTag(tagContent, "fromCommit");
    const toCommit = this.actionTagsExtractor.extractTag(tagContent, "toCommit");
    const getValue = /* @__PURE__ */ __name((value) => {
      if (!value) return "";
      return Array.isArray(value) ? value[0]?.trim() || "" : value.trim();
    }, "getValue");
    return {
      fromCommit: getValue(fromCommit),
      toCommit: getValue(toCommit)
    };
  }
  validateParams(params) {
    const { fromCommit, toCommit } = params;
    if (!fromCommit || typeof fromCommit !== "string") {
      return "fromCommit is required and must be a non-empty string";
    }
    if (!toCommit || typeof toCommit !== "string") {
      return "toCommit is required and must be a non-empty string";
    }
    return null;
  }
  async executeInternal(params) {
    try {
      const config4 = this.configService.getConfig();
      const { excludeLockFiles, lockFiles } = config4.gitDiff;
      const excludePattern = excludeLockFiles ? lockFiles.map((file) => `:!${file}`).join(" ") : "";
      const diff = await this.gitService.getDiff(params.fromCommit, params.toCommit, excludePattern);
      return this.createSuccessResult(diff);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }
};
__name(_GitDiffAction, "GitDiffAction");
var GitDiffAction = _GitDiffAction;
GitDiffAction = _ts_decorate31([
  (0, import_tsyringe35.autoInjectable)(),
  _ts_metadata26("design:type", Function),
  _ts_metadata26("design:paramtypes", [
    typeof ActionTagsExtractor === "undefined" ? Object : ActionTagsExtractor,
    typeof GitService === "undefined" ? Object : GitService,
    typeof ConfigService === "undefined" ? Object : ConfigService
  ])
], GitDiffAction);

// src/services/LLM/actions/blueprints/gitDiffActionBlueprint.ts
var gitDiffActionBlueprint = {
  tag: "git_diff",
  class: GitDiffAction,
  description: "Shows git diff between two commits",
  usageExplanation: `The git_diff action compares changes between two commits. Here are common use cases:

1. Compare with previous commit:
<git_diff>
  <fromCommit>HEAD^</fromCommit>
  <toCommit>HEAD</toCommit>
</git_diff>

2. Compare specific commits:
<git_diff>
  <fromCommit>abc123</fromCommit>
  <toCommit>def456</toCommit>
</git_diff>

Note: 
- Use HEAD for current state
- Use HEAD^ for previous commit
- Use commit hashes for specific commits
- The diff shows: added (+), removed (-), and modified lines`,
  priority: ActionPriority.HIGH,
  canRunInParallel: true,
  requiresProcessing: false,
  parameters: [
    {
      name: "fromCommit",
      required: true,
      description: "Starting commit for comparison (e.g. HEAD^)",
      validator: /* @__PURE__ */ __name((value) => typeof value === "string" && value.length > 0, "validator")
    },
    {
      name: "toCommit",
      required: true,
      description: "Ending commit for comparison (e.g. HEAD)",
      validator: /* @__PURE__ */ __name((value) => typeof value === "string" && value.length > 0, "validator")
    }
  ]
};

// src/services/LLM/actions/GitPRDiffAction.ts
var import_tsyringe36 = require("tsyringe");
function _ts_decorate32(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate32, "_ts_decorate");
function _ts_metadata27(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata27, "_ts_metadata");
var _GitPRDiffAction = class _GitPRDiffAction extends BaseAction {
  constructor(actionTagsExtractor, gitService, debugLogger, configService4) {
    super(actionTagsExtractor);
    __publicField(this, "actionTagsExtractor");
    __publicField(this, "gitService");
    __publicField(this, "debugLogger");
    __publicField(this, "configService");
    this.actionTagsExtractor = actionTagsExtractor, this.gitService = gitService, this.debugLogger = debugLogger, this.configService = configService4;
  }
  getBlueprint() {
    return gitPRDiffActionBlueprint;
  }
  parseParams(content) {
    const tag = this.getBlueprint().tag;
    const match = content.match(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`));
    if (!match) {
      throw new Error("Failed to parse git PR diff content");
    }
    const tagContent = match[0];
    const baseBranch = this.actionTagsExtractor.extractTag(tagContent, "baseBranch");
    const compareBranch = this.actionTagsExtractor.extractTag(tagContent, "compareBranch");
    const getValue = /* @__PURE__ */ __name((value) => {
      if (!value) return "";
      return Array.isArray(value) ? value[0]?.trim() || "" : value.trim();
    }, "getValue");
    return {
      baseBranch: getValue(baseBranch),
      compareBranch: getValue(compareBranch)
    };
  }
  validateParams(params) {
    if (typeof params.baseBranch !== "string" || !params.baseBranch.trim()) {
      return "baseBranch is required and must be a non-empty string";
    }
    if (typeof params.compareBranch !== "string" || !params.compareBranch.trim()) {
      return "compareBranch is required and must be a non-empty string";
    }
    return null;
  }
  async executeInternal(params) {
    try {
      const config4 = this.configService.getConfig();
      const { excludeLockFiles, lockFiles } = config4.gitDiff;
      const excludePattern = excludeLockFiles ? lockFiles.map((file) => `:!${file}`).join(" ") : "";
      if (excludePattern) {
        console.warn("Warning: File exclusion patterns are not supported for PR diffs. The pattern will be ignored.");
      }
      const diff = await this.gitService.getPRDiff(params.baseBranch, params.compareBranch, excludePattern);
      return this.createSuccessResult(diff);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }
};
__name(_GitPRDiffAction, "GitPRDiffAction");
var GitPRDiffAction = _GitPRDiffAction;
GitPRDiffAction = _ts_decorate32([
  (0, import_tsyringe36.autoInjectable)(),
  _ts_metadata27("design:type", Function),
  _ts_metadata27("design:paramtypes", [
    typeof ActionTagsExtractor === "undefined" ? Object : ActionTagsExtractor,
    typeof GitService === "undefined" ? Object : GitService,
    typeof DebugLogger === "undefined" ? Object : DebugLogger,
    typeof ConfigService === "undefined" ? Object : ConfigService
  ])
], GitPRDiffAction);

// src/services/LLM/actions/blueprints/gitPRDiffActionBlueprint.ts
var gitPRDiffActionBlueprint = {
  tag: "git_pr_diff",
  class: GitPRDiffAction,
  description: "Shows diff between two branches (PR comparison)",
  usageExplanation: `The git_pr_diff action compares changes between two branches, useful for PR reviews. Here are common use cases:

1. Compare feature branch with main:
<git_pr_diff>
  <baseBranch>main</baseBranch>
  <compareBranch>feature-branch</compareBranch>
</git_pr_diff>

2. Compare current branch with main:
<git_pr_diff>
  <baseBranch>main</baseBranch>
  <compareBranch>HEAD</compareBranch>
</git_pr_diff>

Note:
- baseBranch is the target branch (e.g. main, master)
- compareBranch is the source branch (your changes)
- Use HEAD to reference current branch
- The diff shows: added (+), removed (-), and modified lines`,
  priority: ActionPriority.HIGH,
  canRunInParallel: true,
  requiresProcessing: false,
  parameters: [
    {
      name: "baseBranch",
      required: true,
      description: "Base branch for comparison",
      validator: /* @__PURE__ */ __name((value) => typeof value === "string" && value.length > 0, "validator")
    },
    {
      name: "compareBranch",
      required: true,
      description: "Branch to compare against base",
      validator: /* @__PURE__ */ __name((value) => typeof value === "string" && value.length > 0, "validator")
    }
  ]
};

// src/services/LLM/actions/MoveFileAction.ts
var import_tsyringe37 = require("tsyringe");
function _ts_decorate33(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate33, "_ts_decorate");
function _ts_metadata28(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata28, "_ts_metadata");
var _MoveFileAction = class _MoveFileAction extends BaseAction {
  constructor(actionTagsExtractor, fileOperations) {
    super(actionTagsExtractor);
    __publicField(this, "actionTagsExtractor");
    __publicField(this, "fileOperations");
    this.actionTagsExtractor = actionTagsExtractor, this.fileOperations = fileOperations;
  }
  getBlueprint() {
    return moveFileActionBlueprint;
  }
  parseParams(content) {
    const tag = this.getBlueprint().tag;
    const match = content.match(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`));
    if (!match) {
      this.logError("Failed to parse move file content");
      return {
        source_path: "",
        destination_path: ""
      };
    }
    const tagContent = match[0];
    const source_path = this.actionTagsExtractor.extractTag(tagContent, "source_path");
    const destination_path = this.actionTagsExtractor.extractTag(tagContent, "destination_path");
    const getValue = /* @__PURE__ */ __name((value) => {
      if (!value) return "";
      return Array.isArray(value) ? value[0]?.trim() || "" : value.trim();
    }, "getValue");
    return {
      source_path: getValue(source_path),
      destination_path: getValue(destination_path)
    };
  }
  validateParams(params) {
    const { source_path, destination_path } = params;
    if (!source_path) {
      return "No source path provided";
    }
    if (!destination_path) {
      return "No destination path provided";
    }
    return null;
  }
  async executeInternal(params) {
    try {
      const { source_path, destination_path } = params;
      this.logInfo(`Source path: ${source_path}`);
      this.logInfo(`Destination path: ${destination_path}`);
      const result = await this.fileOperations.move(source_path, destination_path);
      if (!result.success) {
        return this.createErrorResult(result.error);
      }
      return this.createSuccessResult(result.data);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }
};
__name(_MoveFileAction, "MoveFileAction");
var MoveFileAction = _MoveFileAction;
MoveFileAction = _ts_decorate33([
  (0, import_tsyringe37.autoInjectable)(),
  _ts_metadata28("design:type", Function),
  _ts_metadata28("design:paramtypes", [
    typeof ActionTagsExtractor === "undefined" ? Object : ActionTagsExtractor,
    typeof FileOperations === "undefined" ? Object : FileOperations
  ])
], MoveFileAction);

// src/services/LLM/actions/blueprints/moveFileActionBlueprint.ts
var moveFileActionBlueprint = {
  tag: "move_file",
  class: MoveFileAction,
  description: "Move a file from source to destination path",
  usageExplanation: `The move_file action moves or renames a file. Here are common use cases:

1. Move a file to a different directory:
<move_file>
  <source_path>src/utils/helper.ts</source_path>
  <destination_path>src/services/utils/helper.ts</destination_path>
</move_file>

2. Rename a file:
<move_file>
  <source_path>src/services/OldName.ts</source_path>
  <destination_path>src/services/NewName.ts</destination_path>
</move_file>

Note:
- Use relative paths from workspace root
- Destination directory must exist
- Will overwrite destination if it exists
- Original file is removed after move
- Update imports after moving`,
  priority: ActionPriority.MEDIUM,
  canRunInParallel: false,
  requiresProcessing: false,
  parameters: [
    {
      name: "source_path",
      required: true,
      description: "The source path of the file to move",
      validator: /* @__PURE__ */ __name((value) => typeof value === "string" && value.length > 0, "validator")
    },
    {
      name: "destination_path",
      required: true,
      description: "The destination path for the file",
      validator: /* @__PURE__ */ __name((value) => typeof value === "string" && value.length > 0, "validator")
    }
  ]
};

// src/services/LLM/actions/ReadFileAction.ts
var import_tsyringe38 = require("tsyringe");
function _ts_decorate34(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate34, "_ts_decorate");
function _ts_metadata29(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata29, "_ts_metadata");
var _ReadFileAction = class _ReadFileAction extends BaseAction {
  constructor(actionTagsExtractor, fileOperations, debugLogger) {
    super(actionTagsExtractor);
    __publicField(this, "actionTagsExtractor");
    __publicField(this, "fileOperations");
    __publicField(this, "debugLogger");
    this.actionTagsExtractor = actionTagsExtractor, this.fileOperations = fileOperations, this.debugLogger = debugLogger;
  }
  getBlueprint() {
    return readFileActionBlueprint;
  }
  validateParams(params) {
    const paths = params.path;
    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return "Must include at least one <path> tag";
    }
    const invalidPaths = paths.filter((path10) => !path10);
    if (invalidPaths.length > 0) {
      return `Invalid paths found: ${invalidPaths.join(", ")}. Try using a <search_file> to find the correct file path.`;
    }
    return null;
  }
  extractParamValue(content, paramName) {
    if (paramName === "path") {
      const regex = new RegExp(`<${paramName}>(.*?)</${paramName}>`, "g");
      const matches = Array.from(content.matchAll(regex));
      const paths = matches.map((match) => match[1].trim());
      return paths.length > 0 ? paths : null;
    }
    return super.extractParamValue(content, paramName);
  }
  async executeInternal(params) {
    const filePaths = Array.isArray(params.path) ? params.path : [
      params.path
    ];
    if (filePaths.length === 1) {
      return await this.handleSingleFile(filePaths[0]);
    }
    return await this.handleMultipleFiles(filePaths);
  }
  async handleSingleFile(filePath) {
    const result = await this.fileOperations.read(filePath);
    return this.convertFileResult(result);
  }
  async handleMultipleFiles(filePaths) {
    const result = await this.fileOperations.readMultiple(filePaths);
    this.debugLogger.log("ReadFileAction", "execute", result);
    if (!result.success || !result.data) {
      return this.createErrorResult(result.error || "Failed to read multiple files");
    }
    this.logSuccess("Action completed successfully. Please wait...\n");
    console.log("-".repeat(50));
    return this.createSuccessResult(result.data);
  }
  convertFileResult(result) {
    if (result?.success) {
      this.logSuccess("Action completed successfully. Please wait...\n");
    } else {
      this.logError(result?.error?.message || "Unknown error");
    }
    console.log("-".repeat(50));
    return {
      success: !!result?.success,
      data: result?.data,
      error: result?.error
    };
  }
};
__name(_ReadFileAction, "ReadFileAction");
var ReadFileAction = _ReadFileAction;
ReadFileAction = _ts_decorate34([
  (0, import_tsyringe38.autoInjectable)(),
  _ts_metadata29("design:type", Function),
  _ts_metadata29("design:paramtypes", [
    typeof ActionTagsExtractor === "undefined" ? Object : ActionTagsExtractor,
    typeof FileOperations === "undefined" ? Object : FileOperations,
    typeof DebugLogger === "undefined" ? Object : DebugLogger
  ])
], ReadFileAction);

// src/services/LLM/actions/blueprints/readFileActionBlueprint.ts
var readFileActionBlueprint = {
  tag: "read_file",
  class: ReadFileAction,
  description: "Reads content from one or more files",
  usageExplanation: `The read_file action allows you to read the contents of one or more files. Here are common use cases:

1. Read a single file:
<read_file>
  <path>src/services/MyService.ts</path>
</read_file>

2. Read multiple files at once:
<read_file>
  <path>src/services/MyService.ts</path>
  <path>src/types/MyTypes.ts</path>
</read_file>

Note:
- Use relative paths from the workspace root
- You can read up to 4 files at once
- Avoid reading the same file multiple times
- If you can't find a file, use search_file first`,
  priority: ActionPriority.CRITICAL,
  canRunInParallel: true,
  requiresProcessing: true,
  parameters: [
    {
      name: "path",
      required: true,
      description: "The path(s) of the file(s) to read. Can specify multiple path tags.",
      validator: /* @__PURE__ */ __name((value) => typeof value === "string" && value.length > 0, "validator")
    }
  ]
};

// src/services/LLM/actions/RelativePathLookupAction.ts
var import_path5 = __toESM(require("path"), 1);
var import_tsyringe39 = require("tsyringe");
function _ts_decorate35(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate35, "_ts_decorate");
function _ts_metadata30(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata30, "_ts_metadata");
var _RelativePathLookupAction = class _RelativePathLookupAction extends BaseAction {
  constructor(actionTagsExtractor, pathAdjuster) {
    super(actionTagsExtractor);
    __publicField(this, "actionTagsExtractor");
    __publicField(this, "pathAdjuster");
    this.actionTagsExtractor = actionTagsExtractor, this.pathAdjuster = pathAdjuster;
  }
  getBlueprint() {
    return relativePathLookupActionBlueprint;
  }
  parseParams(content) {
    const tag = this.getBlueprint().tag;
    const match = content.match(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`));
    if (!match) {
      this.logError("Failed to parse relative path lookup content");
      return {
        source_path: "",
        path: "",
        threshold: void 0
      };
    }
    const tagContent = match[0];
    const source_path = this.actionTagsExtractor.extractTag(tagContent, "source_path");
    const path10 = this.actionTagsExtractor.extractTag(tagContent, "path");
    const threshold = this.actionTagsExtractor.extractTag(tagContent, "threshold");
    const getValue = /* @__PURE__ */ __name((value) => {
      if (!value) return "";
      return Array.isArray(value) ? value[0]?.trim() || "" : value.trim();
    }, "getValue");
    return {
      source_path: getValue(source_path),
      path: getValue(path10),
      threshold: threshold ? parseFloat(getValue(threshold)) : void 0
    };
  }
  validateParams(params) {
    const { source_path, path: path10, threshold } = params;
    if (!source_path) {
      return "No source_path provided";
    }
    if (!path10) {
      return "No path provided";
    }
    if (threshold !== void 0 && (threshold <= 0 || threshold > 1)) {
      return "Threshold must be between 0 and 1";
    }
    return null;
  }
  async executeInternal(params) {
    try {
      const { source_path, path: relativePath, threshold = 0.6 } = params;
      const sourceDir = import_path5.default.dirname(source_path);
      const fullImportPath = import_path5.default.resolve(sourceDir, relativePath);
      const adjustedPath = await this.pathAdjuster.adjustPath(fullImportPath, threshold);
      if (adjustedPath) {
        const newRelativePath = import_path5.default.relative(sourceDir, adjustedPath);
        const formattedPath = newRelativePath.startsWith(".") ? newRelativePath : "./" + newRelativePath;
        const result = {
          originalPath: relativePath,
          newPath: formattedPath.replace(/\\/g, "/"),
          absolutePath: adjustedPath
        };
        this.logSuccess(`Found adjusted path: ${result.newPath} (absolute: ${result.absolutePath})`);
        return this.createSuccessResult(result);
      }
      this.logInfo("No adjusted path found");
      return this.createSuccessResult(null);
    } catch (error) {
      this.logError(`Path lookup failed: ${error.message}`);
      return this.createErrorResult(error);
    }
  }
};
__name(_RelativePathLookupAction, "RelativePathLookupAction");
var RelativePathLookupAction = _RelativePathLookupAction;
RelativePathLookupAction = _ts_decorate35([
  (0, import_tsyringe39.autoInjectable)(),
  _ts_metadata30("design:type", Function),
  _ts_metadata30("design:paramtypes", [
    typeof ActionTagsExtractor === "undefined" ? Object : ActionTagsExtractor,
    typeof PathAdjuster === "undefined" ? Object : PathAdjuster
  ])
], RelativePathLookupAction);

// src/services/LLM/actions/blueprints/relativePathLookupActionBlueprint.ts
var relativePathLookupActionBlueprint = {
  tag: "relative_path_lookup",
  class: RelativePathLookupAction,
  description: "Adjust and validate relative file paths",
  usageExplanation: `The relative_path_lookup action helps resolve and validate relative paths. Here are common use cases:

1. Find correct import path:
<relative_path_lookup>
  <source_path>src/services/MyService.ts</source_path>
  <path>../utils/helper</path>
</relative_path_lookup>

2. Validate path with custom threshold:
<relative_path_lookup>
  <source_path>src/services/MyService.ts</source_path>
  <path>../types/interfaces</path>
  <threshold>0.8</threshold>
</relative_path_lookup>

Note:
- source_path is where you're importing from
- path is what you want to import
- threshold controls fuzzy matching (0.0-1.0)
- Higher threshold = stricter matching
- Default threshold is 0.6`,
  priority: ActionPriority.HIGH,
  canRunInParallel: true,
  requiresProcessing: true,
  parameters: [
    {
      name: "source_path",
      required: true,
      description: "The source file path to resolve relative paths from",
      validator: /* @__PURE__ */ __name((value) => typeof value === "string" && value.length > 0, "validator")
    },
    {
      name: "path",
      required: true,
      description: "The relative path to adjust",
      validator: /* @__PURE__ */ __name((value) => typeof value === "string" && value.length > 0, "validator")
    },
    {
      name: "threshold",
      required: false,
      description: "Similarity threshold for path matching (default: 0.6)",
      validator: /* @__PURE__ */ __name((value) => !value || typeof value === "number" && value > 0 && value <= 1, "validator")
    }
  ]
};

// src/services/LLM/actions/SearchAction.ts
var import_tsyringe40 = require("tsyringe");
function _ts_decorate36(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate36, "_ts_decorate");
function _ts_metadata31(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata31, "_ts_metadata");
var _SearchAction = class _SearchAction extends BaseAction {
  constructor(actionTagsExtractor, fileSearch) {
    super(actionTagsExtractor);
    __publicField(this, "actionTagsExtractor");
    __publicField(this, "fileSearch");
    __publicField(this, "currentType");
    this.actionTagsExtractor = actionTagsExtractor, this.fileSearch = fileSearch, this.currentType = "search_file";
  }
  async execute(content) {
    this.currentType = content.includes("<search_string>") ? "search_string" : "search_file";
    return super.execute(content);
  }
  getBlueprint() {
    return this.currentType === "search_string" ? searchStringActionBlueprint : searchFileActionBlueprint;
  }
  parseParams(content) {
    const tag = this.getBlueprint().tag;
    const match = content.match(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`));
    if (!match) {
      this.logError("Failed to parse search content");
      return {
        directory: "",
        term: ""
      };
    }
    const tagContent = match[0];
    const directory = this.actionTagsExtractor.extractTag(tagContent, "directory");
    const term = this.actionTagsExtractor.extractTag(tagContent, "term");
    const getValue = /* @__PURE__ */ __name((value) => {
      if (!value) return "";
      return Array.isArray(value) ? value[0]?.trim() || "" : value.trim();
    }, "getValue");
    return {
      directory: getValue(directory),
      term: getValue(term)
    };
  }
  validateParams(params) {
    const { directory, term } = params;
    if (!directory) {
      return "No directory provided";
    }
    if (!term) {
      return "No search term provided";
    }
    return null;
  }
  async executeInternal(params) {
    try {
      const { directory, term } = params;
      this.logInfo(`Searching in directory: ${directory}`);
      this.logInfo(`Search term: ${term}`);
      this.logInfo(`Search type: ${this.currentType}`);
      let results;
      if (this.currentType === "search_string") {
        results = await this.fileSearch.findByContent(term, directory);
      } else {
        results = await this.fileSearch.findByName(term, directory);
      }
      if (!results || results.length === 0) {
        this.logInfo("No results found");
        return this.createSuccessResult([]);
      }
      this.logSuccess(`Found ${results.length} results`);
      return this.createSuccessResult(results);
    } catch (error) {
      this.logError(`Search failed: ${error.message}`);
      return this.createErrorResult(error);
    }
  }
};
__name(_SearchAction, "SearchAction");
var SearchAction = _SearchAction;
SearchAction = _ts_decorate36([
  (0, import_tsyringe40.autoInjectable)(),
  _ts_metadata31("design:type", Function),
  _ts_metadata31("design:paramtypes", [
    typeof ActionTagsExtractor === "undefined" ? Object : ActionTagsExtractor,
    typeof FileSearch === "undefined" ? Object : FileSearch
  ])
], SearchAction);

// src/services/LLM/actions/blueprints/searchActionsBlueprint.ts
var searchStringActionBlueprint = {
  tag: "search_string",
  class: SearchAction,
  description: "Search for content within files",
  usageExplanation: `The search_string action helps you find specific content within files. Here are common use cases:

1. Search for a class or function:
<search_string>
  <directory>src</directory>
  <term>export class MyService</term>
</search_string>

2. Search for specific code patterns:
<search_string>
  <directory>src/services</directory>
  <term>@injectable()</term>
</search_string>

Note:
- Use specific directories to narrow down search
- Search terms can be partial matches
- Case-sensitive by default
- Results show file path and line number`,
  priority: ActionPriority.HIGH,
  canRunInParallel: true,
  requiresProcessing: true,
  parameters: [
    {
      name: "directory",
      required: true,
      description: "The directory to search in",
      validator: /* @__PURE__ */ __name((value) => typeof value === "string" && value.length > 0, "validator")
    },
    {
      name: "term",
      required: true,
      description: "The content to search for",
      validator: /* @__PURE__ */ __name((value) => typeof value === "string" && value.length > 0, "validator")
    }
  ]
};
var searchFileActionBlueprint = {
  tag: "search_file",
  class: SearchAction,
  description: "Search for files by name",
  usageExplanation: `The search_file action helps you find files by name or pattern. Here are common use cases:

1. Search for a specific file:
<search_file>
  <directory>src</directory>
  <term>MyService.ts</term>
</search_file>

2. Search using patterns:
<search_file>
  <directory>src/services</directory>
  <term>*Service.ts</term>
</search_file>

Note:
- Use * for wildcards in patterns
- Search is case-sensitive
- Results show full file paths
- Use specific directories to narrow search`,
  priority: ActionPriority.HIGH,
  canRunInParallel: true,
  requiresProcessing: true,
  parameters: [
    {
      name: "directory",
      required: true,
      description: "The directory to search in",
      validator: /* @__PURE__ */ __name((value) => typeof value === "string" && value.length > 0, "validator")
    },
    {
      name: "term",
      required: true,
      description: "The filename pattern to search for",
      validator: /* @__PURE__ */ __name((value) => typeof value === "string" && value.length > 0, "validator")
    }
  ]
};

// src/constants/writeConstants.ts
var BLOCK_WRITE_IF_CONTENT_REMOVAL_THRESHOLD = 90;

// src/constants/modelScaling.ts
var MODEL_SCALING_INITIAL_TRY_COUNT = 2;

// src/services/LLM/ModelScaler.ts
var import_tsyringe41 = require("tsyringe");
function _ts_decorate37(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate37, "_ts_decorate");
function _ts_metadata32(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata32, "_ts_metadata");
var _ModelScaler = class _ModelScaler {
  constructor(debugLogger, configService4, modelManager, phaseManager) {
    __publicField(this, "debugLogger");
    __publicField(this, "configService");
    __publicField(this, "modelManager");
    __publicField(this, "phaseManager");
    __publicField(this, "tryCountMap");
    __publicField(this, "globalTryCount");
    __publicField(this, "autoScalerEnabled");
    this.debugLogger = debugLogger;
    this.configService = configService4;
    this.modelManager = modelManager;
    this.phaseManager = phaseManager;
    this.tryCountMap = /* @__PURE__ */ new Map();
    this.globalTryCount = 0;
    this.autoScalerEnabled = false;
    const config4 = this.configService.getConfig();
    this.autoScalerEnabled = config4.autoScaler || false;
  }
  isAutoScalerEnabled() {
    return this.autoScalerEnabled;
  }
  async incrementTryCount(filePath) {
    const currentPhase = this.phaseManager.getCurrentPhase();
    if (!this.autoScalerEnabled || currentPhase !== Phase.Execute) {
      return;
    }
    this.incrementCounts(filePath);
    const currentCount = this.tryCountMap.get(filePath) || 0;
    if (currentCount > MODEL_SCALING_INITIAL_TRY_COUNT) {
      await this.handleModelScaling(filePath, currentCount);
    }
  }
  getTryCount(filePath) {
    if (!this.autoScalerEnabled) return 0;
    return this.tryCountMap.get(filePath) || 0;
  }
  getGlobalTryCount() {
    if (!this.autoScalerEnabled) return 0;
    return this.globalTryCount;
  }
  reset() {
    this.tryCountMap.clear();
    this.globalTryCount = 0;
    const config4 = this.configService.getConfig();
    this.autoScalerEnabled = config4.autoScaler || false;
    this.modelManager.setCurrentModel(config4.discoveryModel);
  }
  incrementCounts(filePath) {
    if (!this.autoScalerEnabled) return;
    this.globalTryCount++;
    const currentCount = this.tryCountMap.get(filePath) || 0;
    this.tryCountMap.set(filePath, currentCount + 1);
  }
  getMaxTryCount() {
    const values = Array.from(this.tryCountMap.values());
    return values.length > 0 ? Math.max(...values) : 0;
  }
  async handleModelScaling(filePath, currentCount) {
    if (!this.autoScalerEnabled) return;
    const maxTries = this.getMaxTryCount();
    const newModel = this.getModelForTryCount(maxTries.toString(), this.globalTryCount);
    this.debugLogger.log("Model", "Incrementing try count", {
      filePath,
      fileCount: currentCount + 1,
      globalCount: this.globalTryCount,
      maxTries,
      newModel,
      phase: this.phaseManager.getCurrentPhase()
    });
    await this.modelManager.setCurrentModel(newModel);
  }
  getModelForTryCount(tryCount, globalTries) {
    const config4 = this.configService.getConfig();
    const availableModels = config4.autoScaleAvailableModels;
    if (!tryCount) return availableModels[0].id;
    const tries = parseInt(tryCount, 10);
    for (let i = 0; i < availableModels.length; i++) {
      const previousTriesSum = availableModels.slice(0, i).reduce((sum, model) => sum + model.maxWriteTries, 0);
      if (tries >= previousTriesSum + availableModels[i].maxWriteTries || globalTries >= availableModels[i].maxGlobalTries) {
        continue;
      }
      return availableModels[i].id;
    }
    return availableModels[availableModels.length - 1].id;
  }
};
__name(_ModelScaler, "ModelScaler");
var ModelScaler = _ModelScaler;
ModelScaler = _ts_decorate37([
  (0, import_tsyringe41.singleton)(),
  _ts_metadata32("design:type", Function),
  _ts_metadata32("design:paramtypes", [
    typeof DebugLogger === "undefined" ? Object : DebugLogger,
    typeof ConfigService === "undefined" ? Object : ConfigService,
    typeof ModelManager === "undefined" ? Object : ModelManager,
    typeof PhaseManager === "undefined" ? Object : PhaseManager
  ])
], ModelScaler);

// src/services/text/HTMLEntityDecoder.ts
var import_he = __toESM(require("he"), 1);
var import_tsyringe42 = require("tsyringe");
function _ts_decorate38(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate38, "_ts_decorate");
var _HtmlEntityDecoder = class _HtmlEntityDecoder {
  /**
  * Decodes HTML entities and cleans up character escaping in the provided text.
  * @param text The string containing HTML entities and escaped characters.
  * @param options Configuration options for decoding
  * @returns The decoded and unescaped string.
  */
  decode(text, options) {
    if (!text) {
      return "";
    }
    let result = text;
    if (options?.unescapeChars?.length || options?.unescape) {
      result = this.unescapeString(result, options?.unescapeChars);
    }
    return import_he.default.decode(result);
  }
  /**
  * Unescapes specific backslash-escaped characters in a string.
  * @param str The string with escaped characters.
  * @param chars Optional array of specific characters to unescape
  * @returns The unescaped string.
  */
  unescapeString(str, chars) {
    return str.replace(/\\u([0-9a-fA-F]{4})|\\(.)/g, (match, unicode, char) => {
      if (unicode) {
        const code = parseInt(unicode, 16);
        return String.fromCharCode(code);
      }
      const specialCharMap = {
        n: "\n",
        t: "	",
        r: "\r",
        b: "\b",
        f: "\f",
        '"': '"',
        "'": "'",
        "\\": "\\",
        "/": "/"
      };
      if (chars) {
        return chars.includes(char) ? specialCharMap[char] || char : match;
      }
      return specialCharMap[char] || char;
    });
  }
};
__name(_HtmlEntityDecoder, "HtmlEntityDecoder");
var HtmlEntityDecoder = _HtmlEntityDecoder;
HtmlEntityDecoder = _ts_decorate38([
  (0, import_tsyringe42.injectable)()
], HtmlEntityDecoder);

// src/services/LLM/actions/WriteFileAction.ts
var import_tsyringe43 = require("tsyringe");
function _ts_decorate39(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate39, "_ts_decorate");
function _ts_metadata33(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata33, "_ts_metadata");
var MAX_CONTENT_SIZE_MB = 10;
var MAX_CONTENT_SIZE_BYTES = MAX_CONTENT_SIZE_MB * 1024 * 1024;
var MAX_LINE_LENGTH = 1e4;
var _WriteFileAction = class _WriteFileAction extends BaseAction {
  constructor(actionTagsExtractor, fileOperations, htmlEntityDecoder, modelScaler) {
    super(actionTagsExtractor);
    __publicField(this, "actionTagsExtractor");
    __publicField(this, "fileOperations");
    __publicField(this, "htmlEntityDecoder");
    __publicField(this, "modelScaler");
    this.actionTagsExtractor = actionTagsExtractor, this.fileOperations = fileOperations, this.htmlEntityDecoder = htmlEntityDecoder, this.modelScaler = modelScaler;
  }
  logWarning(message) {
    console.warn(`\u26A0\uFE0F write_file: ${message}`);
  }
  logError(message) {
    console.error(`\u274C write_file: ${message}`);
  }
  logInfo(message) {
    console.info(`\u2139\uFE0F write_file: ${message}`);
  }
  getBlueprint() {
    return writeFileActionBlueprint;
  }
  validateParams(params) {
    try {
      const { path: filePath, content, type } = params;
      if (!filePath) {
        return "No file path provided";
      }
      if (!content) {
        return "No file content provided";
      }
      if (!type || ![
        "new",
        "update"
      ].includes(type)) {
        return "Invalid or missing type parameter (must be 'new' or 'update')";
      }
      if (filePath.includes("..")) {
        return "Path traversal is not allowed";
      }
      const contentSizeBytes = Buffer.byteLength(content, "utf8");
      if (contentSizeBytes > MAX_CONTENT_SIZE_BYTES) {
        return `Content size (${(contentSizeBytes / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${MAX_CONTENT_SIZE_MB}MB)`;
      }
      return null;
    } catch (error) {
      this.logError(`Error in validateParams: ${error}`);
      return `Validation error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  extractParamValue(content, paramName) {
    try {
      if (paramName === "content") {
        const contentMatch = content.match(/<content>([\s\S]*?)<\/content>/);
        if (!contentMatch) {
          this.logWarning(`Failed to extract content parameter from: ${content.substring(0, 100)}...`);
          return null;
        }
        return contentMatch[1].replace(/^\s+|\s+$/g, "");
      }
      const value = super.extractParamValue(content, paramName);
      return value;
    } catch (error) {
      this.logError(`Error extracting parameter ${paramName}: ${error}`);
      return null;
    }
  }
  async executeInternal(params) {
    try {
      const { path: filePath, content: fileContent, type } = params;
      this.logInfo(`Writing to file: ${filePath} (type: ${type})`);
      if (type === "update") {
        const exists = await this.fileOperations.exists(filePath);
        if (!exists) {
          const similarFiles = await this.fileOperations.findSimilarFiles(filePath);
          if (similarFiles.length > 0) {
            const bestMatch = similarFiles[0];
            this.logInfo(`Found similar existing file: ${bestMatch}`);
            params.path = bestMatch;
          } else {
            return this.createErrorResult(`Cannot update file ${filePath} - file not found and no similar files exist`);
          }
        }
        const removalCheck = await this.checkLargeRemoval(params.path, fileContent);
        if (!removalCheck.success) {
          return removalCheck;
        }
      }
      const decodedContent = this.htmlEntityDecoder.decode(fileContent, {
        unescapeChars: [
          '"'
        ]
      });
      if (!this.isValidContent(decodedContent)) {
        return this.createErrorResult("Invalid content detected after decoding");
      }
      const result = await this.fileOperations.write(params.path, decodedContent);
      if (!result.success) {
        this.logError(`Failed to write file ${params.path}: ${result.error}`);
        return this.createErrorResult(result.error);
      }
      this.logInfo(`Successfully wrote ${Buffer.byteLength(decodedContent, "utf8")} bytes to ${params.path}`);
      return this.createSuccessResult();
    } catch (error) {
      this.logError(`Unexpected error in WriteFileAction: ${error}`);
      return this.createErrorResult(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async checkLargeRemoval(filePath, newContent) {
    try {
      const exists = await this.fileOperations.exists(filePath);
      if (!exists) {
        this.logInfo(`Creating new file: ${filePath}`);
        return this.createSuccessResult();
      }
      this.logInfo(`File exists at: ${filePath}`);
      this.modelScaler.incrementTryCount(filePath);
      const readResult = await this.fileOperations.read(filePath);
      if (!readResult.success) {
        this.logWarning(`Could not read existing file ${filePath}: ${readResult.error}`);
        return this.createSuccessResult();
      }
      const existingContent = readResult.data;
      const removalPercentage = this.calculateRemovalPercentage(existingContent, newContent);
      this.logInfo(`Content removal percentage: ${removalPercentage.toFixed(1)}%`);
      if (removalPercentage > BLOCK_WRITE_IF_CONTENT_REMOVAL_THRESHOLD) {
        return this.createErrorResult(`Prevented removal of ${removalPercentage.toFixed(1)}% of file content. This appears to be a potential error. Please review the changes and ensure only necessary modifications are made.`);
      }
      return this.createSuccessResult();
    } catch (error) {
      this.logError(`Error in checkLargeRemoval: ${error}`);
      return this.createErrorResult(`Error checking content removal: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  calculateRemovalPercentage(existingContent, newContent) {
    const existingLength = existingContent.trim().length;
    const newLength = newContent.trim().length;
    if (existingLength === 0) return 0;
    const removedLength = Math.max(0, existingLength - newLength);
    return removedLength / existingLength * 100;
  }
  isValidContent(content) {
    try {
      if (!content) {
        this.logWarning("Content is null or empty");
        return false;
      }
      if (content.includes("\0")) {
        this.logWarning("Content contains null bytes");
        return false;
      }
      const hasExcessiveLines = content.split("\n").some((line) => line.length > MAX_LINE_LENGTH);
      if (hasExcessiveLines) {
        this.logWarning("Content contains excessively long lines");
        return false;
      }
      return true;
    } catch (error) {
      this.logError(`Error in isValidContent: ${error}`);
      return false;
    }
  }
};
__name(_WriteFileAction, "WriteFileAction");
var WriteFileAction = _WriteFileAction;
WriteFileAction = _ts_decorate39([
  (0, import_tsyringe43.autoInjectable)(),
  _ts_metadata33("design:type", Function),
  _ts_metadata33("design:paramtypes", [
    typeof ActionTagsExtractor === "undefined" ? Object : ActionTagsExtractor,
    typeof FileOperations === "undefined" ? Object : FileOperations,
    typeof HtmlEntityDecoder === "undefined" ? Object : HtmlEntityDecoder,
    typeof ModelScaler === "undefined" ? Object : ModelScaler
  ])
], WriteFileAction);

// src/services/LLM/actions/blueprints/writeFileActionBlueprint.ts
var writeFileActionBlueprint = {
  tag: "write_file",
  class: WriteFileAction,
  description: "Writes content to a file with safety checks for content removal",
  usageExplanation: `The write_file action allows you to create new files or update existing ones. Here are common use cases:

1. Create a new file:
<write_file>
  <type>new</type>
  <path>src/services/NewService.ts</path>
  <content>
import { injectable } from "tsyringe";

@injectable()
export class NewService {
  // ... your code here
}
  </content>
</write_file>

2. Update an existing file:
<write_file>
  <type>update</type>
  <path>src/services/ExistingService.ts</path>
  <content>
// ... existing code ...
// Your new code here
// ... existing code ...
  </content>
</write_file>

Note:
- For new files: Include all necessary imports
- For updates: Use // ... existing code ... to preserve unchanged parts
- Always use relative paths from workspace root
- Include proper type annotations and decorators
- Run type checks after writing`,
  priority: ActionPriority.MEDIUM,
  canRunInParallel: false,
  requiresProcessing: false,
  parameters: [
    {
      name: "type",
      required: true,
      description: "Specifies whether this is a new file creation or an update to an existing file",
      validator: /* @__PURE__ */ __name((value) => typeof value === "string" && [
        "new",
        "update"
      ].includes(value), "validator")
    },
    {
      name: "path",
      required: true,
      description: "The path where the file will be written",
      validator: /* @__PURE__ */ __name((value) => typeof value === "string" && value.length > 0, "validator")
    },
    {
      name: "content",
      required: true,
      description: "The content to write to the file. Must not remove too much existing content if file exists.",
      validator: /* @__PURE__ */ __name((value) => typeof value === "string", "validator")
    }
  ]
};

// src/services/LLM/actions/blueprints/index.ts
var actionsBlueprints = {
  [actionExplainerBlueprint.tag]: actionExplainerBlueprint,
  [commandActionBlueprint.tag]: commandActionBlueprint,
  [copyFileActionBlueprint.tag]: copyFileActionBlueprint,
  [deleteFileActionBlueprint.tag]: deleteFileActionBlueprint,
  [endPhaseActionBlueprint.tag]: endPhaseActionBlueprint,
  [endTaskActionBlueprint.tag]: endTaskActionBlueprint,
  [fetchUrlActionBlueprint.tag]: fetchUrlActionBlueprint,
  [gitDiffActionBlueprint.tag]: gitDiffActionBlueprint,
  [gitPRDiffActionBlueprint.tag]: gitPRDiffActionBlueprint,
  [moveFileActionBlueprint.tag]: moveFileActionBlueprint,
  [readFileActionBlueprint.tag]: readFileActionBlueprint,
  [relativePathLookupActionBlueprint.tag]: relativePathLookupActionBlueprint,
  [searchFileActionBlueprint.tag]: searchFileActionBlueprint,
  [searchStringActionBlueprint.tag]: searchStringActionBlueprint,
  [writeFileActionBlueprint.tag]: writeFileActionBlueprint
};
function getBlueprint(tag) {
  return actionsBlueprints[tag];
}
__name(getBlueprint, "getBlueprint");
function getActionTags() {
  return Object.keys(actionsBlueprints);
}
__name(getActionTags, "getActionTags");
function getImplementedActions() {
  return getActionTags().filter((tag) => {
    const blueprint = actionsBlueprints[tag];
    return !!(blueprint && blueprint.class && blueprint.tag);
  });
}
__name(getImplementedActions, "getImplementedActions");

// src/services/LLM/actions/core/ActionQueue.ts
var import_tsyringe44 = require("tsyringe");
function _ts_decorate40(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate40, "_ts_decorate");
var _ActionQueue = class _ActionQueue {
  constructor() {
    __publicField(this, "queue", []);
    __publicField(this, "processedResults", /* @__PURE__ */ new Map());
  }
  enqueue(type, content) {
    const blueprint = getBlueprint(type);
    const priority = blueprint?.priority || ActionPriority.LOW;
    const requiresProcessing = blueprint?.requiresProcessing || false;
    this.queue.push({
      type,
      content,
      priority,
      requiresProcessing
    });
    this.queue.sort((a, b) => a.priority - b.priority);
  }
  dequeue() {
    if (this.queue.length === 0) {
      return void 0;
    }
    const nextAction = this.queue.find((action) => !action.result);
    if (!nextAction) {
      return void 0;
    }
    if (!nextAction.requiresProcessing) {
      const index = this.queue.indexOf(nextAction);
      this.queue.splice(index, 1);
    }
    return nextAction;
  }
  setActionResult(type, content, result) {
    const actionIndex = this.queue.findIndex((action) => action.type === type && action.content === content);
    if (actionIndex !== -1) {
      const action = this.queue[actionIndex];
      if (action.requiresProcessing && result.success) {
        this.processedResults.set(`${type}:${content}`, result.data);
        this.queue.splice(actionIndex, 1);
      } else if (action.requiresProcessing && !result.success) {
      } else {
        this.queue.splice(actionIndex, 1);
      }
    }
  }
  getProcessedResults() {
    return this.processedResults;
  }
  isEmpty() {
    return this.queue.length === 0;
  }
  size() {
    return this.queue.length;
  }
  clear() {
    this.queue = [];
    this.processedResults.clear();
  }
};
__name(_ActionQueue, "ActionQueue");
var ActionQueue = _ActionQueue;
ActionQueue = _ts_decorate40([
  (0, import_tsyringe44.singleton)()
], ActionQueue);

// src/services/LLM/actions/ActionExecutor.ts
function _ts_decorate41(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate41, "_ts_decorate");
function _ts_metadata34(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata34, "_ts_metadata");
var _ActionExecutor = class _ActionExecutor {
  constructor(actionFactory, actionQueue, messageContextLogger, messageContextHistory) {
    __publicField(this, "actionFactory");
    __publicField(this, "actionQueue");
    __publicField(this, "messageContextLogger");
    __publicField(this, "messageContextHistory");
    this.actionFactory = actionFactory;
    this.actionQueue = actionQueue;
    this.messageContextLogger = messageContextLogger;
    this.messageContextHistory = messageContextHistory;
  }
  async executeAction(actionText) {
    try {
      const implementedActions = getImplementedActions();
      const actionMatch = /<(\w+)>([\s\S]*?)<\/\1>/g;
      const matches = Array.from(actionText.matchAll(actionMatch));
      if (!matches.length) {
        const error = new Error("No valid action tags found. Actions must be wrapped in XML-style tags.");
        this.messageContextLogger.logActionResult("unknown", {
          success: false,
          error
        });
        this.messageContextHistory.addMessage("system", "Action failed: No valid action tags found");
        return {
          success: false,
          error
        };
      }
      for (const [fullMatch, actionType] of matches) {
        const startIndex = actionText.indexOf(fullMatch);
        const beforeText = actionText.substring(0, startIndex);
        const hasOpenTag = /<\w+>/.test(beforeText);
        const hasCloseTag = /<\/\w+>/.test(beforeText);
        if (hasOpenTag && !hasCloseTag) {
          continue;
        }
        if (actionType !== "path" && actionType !== "content") {
          if (implementedActions.includes(actionType)) {
            this.actionQueue.enqueue(actionType, fullMatch);
          } else {
            const error = new Error(`Unknown action type: ${actionType}`);
            this.messageContextLogger.logActionResult(actionType, {
              success: false,
              error
            });
            this.messageContextHistory.addMessage("system", `Action failed: Unknown type ${actionType}`);
            return {
              success: false,
              error
            };
          }
        }
      }
      let lastResult = {
        success: true
      };
      while (!this.actionQueue.isEmpty()) {
        const action = this.actionQueue.dequeue();
        if (!action) continue;
        const actionInstance = this.actionFactory.createAction(action.type);
        if (!actionInstance) {
          const error = new Error(`Failed to create action instance for "${action.type}"`);
          this.messageContextLogger.logActionResult(action.type, {
            success: false,
            error
          });
          this.messageContextHistory.addMessage("system", `Action ${action.type} failed: Could not create instance`);
          return {
            success: false,
            error
          };
        }
        const blueprint = getBlueprint(action.type);
        if (blueprint) {
          console.log(`\u26A1 ${blueprint.description || `Executing ${action.type}`}...`);
        }
        lastResult = await actionInstance.execute(action.content);
        this.messageContextLogger.logActionResult(action.type, lastResult);
        if (lastResult.success) {
          if (lastResult.data) {
            this.messageContextHistory.addMessage("system", `Action ${action.type} succeeded: ${JSON.stringify(lastResult.data)}`);
          } else {
            this.messageContextHistory.addMessage("system", `Action ${action.type} succeeded`);
          }
        } else {
          const errorMessage = lastResult.error ? lastResult.error.message : "Unknown error";
          this.messageContextHistory.addMessage("system", `Action ${action.type} failed: ${errorMessage}`);
        }
        this.actionQueue.setActionResult(action.type, action.content, lastResult);
        if (!lastResult.success) {
          this.actionQueue.clear();
          break;
        }
        if (blueprint?.requiresProcessing && lastResult.success) {
          lastResult = {
            ...lastResult,
            processedResults: this.actionQueue.getProcessedResults()
          };
        }
      }
      const finalProcessedResults = this.actionQueue.getProcessedResults();
      this.actionQueue.clear();
      return finalProcessedResults.size > 0 ? {
        ...lastResult,
        processedResults: finalProcessedResults
      } : lastResult;
    } catch (error) {
      this.actionQueue.clear();
      this.messageContextLogger.logActionResult("unknown", {
        success: false,
        error
      });
      this.messageContextHistory.addMessage("system", `Action failed with error: ${error.message}`);
      return {
        success: false,
        error
      };
    }
  }
};
__name(_ActionExecutor, "ActionExecutor");
var ActionExecutor = _ActionExecutor;
ActionExecutor = _ts_decorate41([
  (0, import_tsyringe45.autoInjectable)(),
  _ts_metadata34("design:type", Function),
  _ts_metadata34("design:paramtypes", [
    typeof ActionFactory === "undefined" ? Object : ActionFactory,
    typeof ActionQueue === "undefined" ? Object : ActionQueue,
    typeof MessageContextLogger === "undefined" ? Object : MessageContextLogger,
    typeof MessageContextHistory === "undefined" ? Object : MessageContextHistory
  ])
], ActionExecutor);

// src/services/LLM/utils/ProjectInfo.ts
var import_fs2 = __toESM(require("fs"), 1);
var import_path6 = __toESM(require("path"), 1);
var import_tsyringe46 = require("tsyringe");
function _ts_decorate42(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate42, "_ts_decorate");
function _ts_metadata35(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata35, "_ts_metadata");
var _ProjectInfo = class _ProjectInfo {
  constructor() {
  }
  async gatherProjectInfo(projectRoot) {
    const files = await import_fs2.default.promises.readdir(projectRoot, {
      withFileTypes: true
    });
    const dependencyFiles = [
      "package.json",
      "requirements.txt",
      "Cargo.toml",
      "go.mod",
      "pom.xml",
      "composer.json",
      "pyproject.toml"
    ];
    const foundDependencyFile = dependencyFiles.find((depFile) => files.some((dirent) => dirent.isFile() && dirent.name === depFile));
    if (!foundDependencyFile) {
      return {
        mainDependencies: [],
        scripts: {}
      };
    }
    switch (foundDependencyFile) {
      case "package.json":
        return this.gatherNodeInfo(projectRoot, foundDependencyFile);
      case "requirements.txt":
      case "pyproject.toml":
        return this.gatherPythonInfo(projectRoot, foundDependencyFile);
      case "Cargo.toml":
        return this.gatherRustInfo(projectRoot, foundDependencyFile);
      case "go.mod":
        return this.gatherGoInfo(projectRoot, foundDependencyFile);
      default:
        return {
          mainDependencies: [],
          scripts: {},
          dependencyFile: foundDependencyFile
        };
    }
  }
  async gatherNodeInfo(projectRoot, dependencyFile) {
    try {
      const packageJsonPath = import_path6.default.join(projectRoot, dependencyFile);
      const content = await import_fs2.default.promises.readFile(packageJsonPath, "utf-8");
      const packageJson = JSON.parse(content);
      return {
        mainDependencies: [
          ...Object.keys(packageJson.dependencies || {}),
          ...Object.keys(packageJson.devDependencies || {})
        ],
        scripts: packageJson.scripts || {},
        dependencyFile
      };
    } catch {
      return {
        mainDependencies: [],
        scripts: {},
        dependencyFile
      };
    }
  }
  async gatherPythonInfo(projectRoot, dependencyFile) {
    try {
      let dependencies = [];
      const reqPath = import_path6.default.join(projectRoot, dependencyFile);
      const content = await import_fs2.default.promises.readFile(reqPath, "utf-8");
      if (dependencyFile === "requirements.txt") {
        dependencies = content.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#")).map((line) => line.split("==")[0]);
      }
      return {
        mainDependencies: dependencies,
        scripts: {},
        dependencyFile
      };
    } catch {
      return {
        mainDependencies: [],
        scripts: {},
        dependencyFile
      };
    }
  }
  async gatherRustInfo(projectRoot, dependencyFile) {
    try {
      const cargoPath = import_path6.default.join(projectRoot, dependencyFile);
      const content = await import_fs2.default.promises.readFile(cargoPath, "utf-8");
      const dependencies = [];
      let inDepsSection = false;
      content.split("\n").forEach((line) => {
        if (line.trim().startsWith("[dependencies]")) {
          inDepsSection = true;
        } else if (line.trim().startsWith("[")) {
          inDepsSection = false;
        } else if (inDepsSection && line.includes("=")) {
          const dep = line.split("=")[0].trim();
          dependencies.push(dep);
        }
      });
      return {
        mainDependencies: dependencies,
        scripts: {
          build: "cargo build",
          run: "cargo run",
          test: "cargo test"
        },
        dependencyFile
      };
    } catch {
      return {
        mainDependencies: [],
        scripts: {},
        dependencyFile
      };
    }
  }
  async gatherGoInfo(projectRoot, dependencyFile) {
    try {
      const modPath = import_path6.default.join(projectRoot, dependencyFile);
      const content = await import_fs2.default.promises.readFile(modPath, "utf-8");
      const dependencies = [];
      content.split("\n").forEach((line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine.startsWith("//") && trimmedLine.split(" ")[0].includes("/")) {
          dependencies.push(trimmedLine.split(" ")[0]);
        }
      });
      return {
        mainDependencies: dependencies,
        scripts: {
          build: "go build",
          run: "go run .",
          test: "go test ./..."
        },
        dependencyFile
      };
    } catch {
      return {
        mainDependencies: [],
        scripts: {},
        dependencyFile
      };
    }
  }
};
__name(_ProjectInfo, "ProjectInfo");
var ProjectInfo = _ProjectInfo;
ProjectInfo = _ts_decorate42([
  (0, import_tsyringe46.autoInjectable)(),
  _ts_metadata35("design:type", Function),
  _ts_metadata35("design:paramtypes", [])
], ProjectInfo);

// src/services/LLM/LLMContextCreator.ts
var fs7 = __toESM(require("fs"), 1);
var import_tsyringe48 = require("tsyringe");

// src/services/LLM/context/MessageContextCleanup.ts
var import_tsyringe47 = require("tsyringe");
function _ts_decorate43(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate43, "_ts_decorate");
function _ts_metadata36(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata36, "_ts_metadata");
var _MessageContextCleaner = class _MessageContextCleaner {
  constructor(debugLogger, modelInfo, messageContextStore, messageContextBuilder, messageContextHistory, messageContextTokenCount) {
    __publicField(this, "debugLogger");
    __publicField(this, "modelInfo");
    __publicField(this, "messageContextStore");
    __publicField(this, "messageContextBuilder");
    __publicField(this, "messageContextHistory");
    __publicField(this, "messageContextTokenCount");
    this.debugLogger = debugLogger;
    this.modelInfo = modelInfo;
    this.messageContextStore = messageContextStore;
    this.messageContextBuilder = messageContextBuilder;
    this.messageContextHistory = messageContextHistory;
    this.messageContextTokenCount = messageContextTokenCount;
  }
  async cleanupContext() {
    const contextData = this.messageContextStore.getContextData();
    const maxTokens = await this.modelInfo.getCurrentModelContextLength();
    const messages = this.messageContextBuilder.getMessageContext(contextData);
    const currentTokens = this.messageContextTokenCount.estimateTokenCount(messages);
    if (currentTokens <= maxTokens) {
      return false;
    }
    const cleanedHistory = [
      ...messages
    ];
    let cleanedTokens = currentTokens;
    while (cleanedTokens > maxTokens && cleanedHistory.length > 0) {
      const removedMessage = cleanedHistory.shift();
      if (removedMessage) {
        cleanedTokens -= this.messageContextTokenCount.estimateTokenCountForMessage(removedMessage);
      }
    }
    const removedHistory = messages.slice(0, messages.length - cleanedHistory.length);
    if (removedHistory.length > 0) {
      const updatedHistory = contextData.conversationHistory.slice(removedHistory.length);
      this.messageContextStore.setContextData({
        ...contextData,
        conversationHistory: updatedHistory
      });
      this.debugLogger.log("Context", "Context cleanup performed", {
        maxTokens,
        removedMessages: removedHistory.length
      });
      await this.modelInfo.logCurrentModelUsage(this.messageContextStore.getTotalTokenCount());
      return true;
    }
    return false;
  }
};
__name(_MessageContextCleaner, "MessageContextCleaner");
var MessageContextCleaner = _MessageContextCleaner;
MessageContextCleaner = _ts_decorate43([
  (0, import_tsyringe47.singleton)(),
  _ts_metadata36("design:type", Function),
  _ts_metadata36("design:paramtypes", [
    typeof DebugLogger === "undefined" ? Object : DebugLogger,
    typeof ModelInfo === "undefined" ? Object : ModelInfo,
    typeof MessageContextStore === "undefined" ? Object : MessageContextStore,
    typeof MessageContextBuilder === "undefined" ? Object : MessageContextBuilder,
    typeof MessageContextHistory === "undefined" ? Object : MessageContextHistory,
    typeof MessageContextTokenCount === "undefined" ? Object : MessageContextTokenCount
  ])
], MessageContextCleaner);

// src/services/LLM/LLMContextCreator.ts
function _ts_decorate44(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate44, "_ts_decorate");
function _ts_metadata37(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata37, "_ts_metadata");
var _LLMContextCreator = class _LLMContextCreator {
  constructor(directoryScanner, actionExecutor, projectInfo, configService4, phaseManager, messageContextCleaner, messageContextBuilder, messageContextStore) {
    __publicField(this, "directoryScanner");
    __publicField(this, "actionExecutor");
    __publicField(this, "projectInfo");
    __publicField(this, "configService");
    __publicField(this, "phaseManager");
    __publicField(this, "messageContextCleaner");
    __publicField(this, "messageContextBuilder");
    __publicField(this, "messageContextStore");
    this.directoryScanner = directoryScanner;
    this.actionExecutor = actionExecutor;
    this.projectInfo = projectInfo;
    this.configService = configService4;
    this.phaseManager = phaseManager;
    this.messageContextCleaner = messageContextCleaner;
    this.messageContextBuilder = messageContextBuilder;
    this.messageContextStore = messageContextStore;
  }
  async loadCustomInstructions() {
    const config4 = this.configService.getConfig();
    if (config4.customInstructionsPath) {
      try {
        const instructions = await fs7.promises.readFile(config4.customInstructionsPath, "utf-8");
        return instructions.trim();
      } catch (error) {
        throw Error(`Failed to load custom instructions from ${config4.customInstructionsPath}, check if the file exists and is accessible.`);
      }
    }
    if (config4.customInstructions) {
      return config4.customInstructions;
    }
    throw new Error("No custom instructions provided. Either customInstructionsPath or customInstructions must be set in config.");
  }
  async create(message, root, isFirstMessage = true) {
    const baseContext = {
      message
    };
    if (isFirstMessage) {
      this.phaseManager.resetPhase();
      this.messageContextCleaner.cleanupContext();
      const [environmentDetails, projectInfo] = await Promise.all([
        this.getEnvironmentDetails(root),
        this.getProjectInfo(root)
      ]);
      return this.formatFirstTimeMessage({
        ...baseContext,
        environmentDetails,
        projectInfo
      });
    }
    const currentPhase = this.phaseManager.getCurrentPhase();
    const contextData = this.messageContextStore.getContextData();
    const phaseInstructions = Array.from(contextData.phaseInstructions.values());
    const currentPhaseInstruction = phaseInstructions.find((instruction) => instruction.phase === currentPhase);
    if (!currentPhaseInstruction) {
      return this.formatSequentialMessage(baseContext);
    }
    return baseContext.message;
  }
  async getEnvironmentDetails(root) {
    const scanResult = await this.directoryScanner.scan(root);
    if (!scanResult.success) {
      throw new Error(`Failed to scan directory: ${scanResult.error}`);
    }
    return `# Current Working Directory (${root}) Files
${scanResult.data}`;
  }
  async getProjectInfo(root) {
    const info = await this.projectInfo.gatherProjectInfo(root);
    const config4 = this.configService.getConfig();
    if (!info.dependencyFile) {
      return "";
    }
    const runAllTestsCmd = config4.runAllTestsCmd || "yarn test";
    const runOneTestCmd = config4.runOneTestCmd || "yarn test {testPath}";
    const runTypeCheckCmd = config4.runTypeCheckCmd || "yarn type-check";
    const projectSetup = `# Project Setup
Language: ${config4.projectLanguage}
Package Manager: ${config4.packageManager}`;
    const referenceExamplesSection = Object.entries(config4.referenceExamples || {}).map(([key, path10]) => `${key}: ${path10}`).join("\n");
    return `${projectSetup}

# Project Dependencies (from ${info.dependencyFile})
Main Dependencies: ${info.mainDependencies.join(", ")}

# Available Scripts
${Object.entries(info.scripts).map(([name, command]) => `${name}: ${command}`).join("\n")}

# Test Commands
Run All Tests: ${runAllTestsCmd}
Run Single Test: ${runOneTestCmd}
Run Type Check: ${runTypeCheckCmd}

# Reference Examples
${referenceExamplesSection}`;
  }
  async formatInitialInstructions(context, customInstructions, envDetails) {
    const additionalInstructions = [
      envDetails,
      context.projectInfo
    ].filter(Boolean).join("\n");
    return `# Task
${context.message}

<instructions details="NEVER_OUTPUT">
<!-- These are internal instructions. Just follow them. Do not output. -->

${customInstructions ? `# Custom Instructions
${customInstructions}
` : ""}
## Initial Instructions
- Keep messages brief, clear, and concise.
- Break tasks into prioritized steps.
- Use available actions sequentially.

# Additional Instructions
${additionalInstructions ? `${additionalInstructions}` : ""}
</instructions>`;
  }
  async formatFirstTimeMessage(context) {
    const config4 = this.configService.getConfig();
    const phaseConfig = this.phaseManager.getCurrentPhaseConfig();
    const customInstructions = await this.loadCustomInstructions();
    const envDetails = config4.includeAllFilesOnEnvToContext ? context.environmentDetails : "";
    const promptArgs = {
      message: context.message,
      environmentDetails: envDetails,
      projectInfo: context.projectInfo,
      runAllTestsCmd: config4.runAllTestsCmd,
      runOneTestCmd: config4.runOneTestCmd,
      runTypeCheckCmd: config4.runTypeCheckCmd
    };
    const initialInstructions = await this.formatInitialInstructions(context, customInstructions, envDetails);
    return `${initialInstructions}

## Phase Instructions
${phaseConfig.generatePrompt(promptArgs)}`;
  }
  formatSequentialMessage(context) {
    const phaseConfig = this.phaseManager.getCurrentPhaseConfig();
    return phaseConfig.generatePrompt({
      message: context.message
    });
  }
  async executeAction(actionContent) {
    const result = await this.actionExecutor.executeAction(actionContent);
    return result;
  }
};
__name(_LLMContextCreator, "LLMContextCreator");
var LLMContextCreator = _LLMContextCreator;
LLMContextCreator = _ts_decorate44([
  (0, import_tsyringe48.autoInjectable)(),
  _ts_metadata37("design:type", Function),
  _ts_metadata37("design:paramtypes", [
    typeof DirectoryScanner === "undefined" ? Object : DirectoryScanner,
    typeof ActionExecutor === "undefined" ? Object : ActionExecutor,
    typeof ProjectInfo === "undefined" ? Object : ProjectInfo,
    typeof ConfigService === "undefined" ? Object : ConfigService,
    typeof PhaseManager === "undefined" ? Object : PhaseManager,
    typeof MessageContextCleaner === "undefined" ? Object : MessageContextCleaner,
    typeof MessageContextBuilder === "undefined" ? Object : MessageContextBuilder,
    typeof MessageContextStore === "undefined" ? Object : MessageContextStore
  ])
], LLMContextCreator);

// src/services/LLM/actions/ActionsParser.ts
var import_path7 = __toESM(require("path"), 1);
var import_tsyringe49 = require("tsyringe");
var import_uuid = require("uuid");
function _ts_decorate45(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate45, "_ts_decorate");
function _ts_metadata38(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata38, "_ts_metadata");
var _ActionsParser = class _ActionsParser {
  constructor(debugLogger, contextCreator, htmlEntityDecoder, actionTagsExtractor) {
    __publicField(this, "debugLogger");
    __publicField(this, "contextCreator");
    __publicField(this, "htmlEntityDecoder");
    __publicField(this, "actionTagsExtractor");
    __publicField(this, "currentMessageBuffer");
    __publicField(this, "isProcessingAction");
    __publicField(this, "messageComplete");
    __publicField(this, "processedTags");
    __publicField(this, "currentModel");
    this.debugLogger = debugLogger;
    this.contextCreator = contextCreator;
    this.htmlEntityDecoder = htmlEntityDecoder;
    this.actionTagsExtractor = actionTagsExtractor;
    this.currentMessageBuffer = "";
    this.isProcessingAction = false;
    this.messageComplete = false;
    this.processedTags = [];
    this.currentModel = "";
  }
  reset() {
    this.currentMessageBuffer = "";
    this.isProcessingAction = false;
    this.messageComplete = false;
    this.processedTags = [];
  }
  isCompleteMessage(text) {
    return true;
  }
  getActionsWithPathParam() {
    return getImplementedActions().filter((tag) => {
      const blueprint = getBlueprint(tag);
      return blueprint.parameters?.some((param) => param.name === "path");
    });
  }
  extractFilePath(tag) {
    const fileActions = this.getActionsWithPathParam();
    const actionMatch = new RegExp(`<(${fileActions.join("|")})>`).exec(tag);
    if (!actionMatch) return null;
    const pathMatch = /<path>(.*?)<\/path>/;
    const match = tag.match(pathMatch);
    if (!match) return null;
    return import_path7.default.resolve(process.cwd(), match[1]);
  }
  extractUrl(tag) {
    const actionMatch = /<fetch_url>[\s\S]*?<\/fetch_url>/i.exec(tag);
    if (!actionMatch) return null;
    const urlMatch = /<url>(.*?)<\/url>/i.exec(tag);
    if (!urlMatch) return null;
    return urlMatch[1];
  }
  extractContentFromAction(actionContent) {
    const contentMatch = actionContent.match(/<content>([\s\S]*?)<\/content>/);
    if (contentMatch) {
      return contentMatch[1];
    }
    const pathMatch = actionContent.match(/<path>(.*?)<\/path>/);
    if (pathMatch) {
      return pathMatch[1];
    }
    if (actionContent.includes("<read_file>")) {
      return actionContent;
    }
    return "";
  }
  detectActionDependencies(actions) {
    return actions.map((action) => {
      const dependsOn = [];
      if (action.type === "write_file") {
        const readActions = actions.filter((a) => {
          if (a.type !== "read_file") return false;
          const readContent = this.extractContentFromAction(a.content);
          const writeContent = this.extractContentFromAction(action.content);
          return writeContent.includes(readContent);
        });
        dependsOn.push(...readActions.map((a) => a.actionId));
      }
      if ([
        "move_file",
        "delete_file",
        "copy_file"
      ].includes(action.type)) {
        const writeActions = actions.filter((a) => {
          if (a.type !== "write_file") return false;
          const writePath = this.extractFilePath(a.content);
          const actionPath = this.extractFilePath(action.content);
          return writePath === actionPath;
        });
        dependsOn.push(...writeActions.map((a) => a.actionId));
      }
      return {
        ...action,
        dependsOn
      };
    });
  }
  createExecutionPlan(actions) {
    const groups = [];
    const unprocessedActions = [
      ...actions
    ];
    const canRunInParallel = /* @__PURE__ */ __name((action) => {
      const blueprint = getBlueprint(action.type);
      return blueprint.canRunInParallel !== false;
    }, "canRunInParallel");
    while (unprocessedActions.length > 0) {
      const currentGroup = [];
      const remainingActions = [];
      unprocessedActions.forEach((action) => {
        const canExecute = !action.dependsOn?.length || action.dependsOn.every((depId) => actions.find((a) => a.actionId === depId)?.type === "end_task" || !unprocessedActions.find((ua) => ua.actionId === depId));
        if (canExecute) {
          currentGroup.push(action);
        } else {
          remainingActions.push(action);
        }
      });
      if (currentGroup.length > 0) {
        const parallelActions = currentGroup.filter(canRunInParallel);
        const sequentialActions = currentGroup.filter((action) => !canRunInParallel(action));
        if (parallelActions.length > 0) {
          groups.push({
            actions: parallelActions,
            parallel: true
          });
        }
        sequentialActions.forEach((action) => {
          groups.push({
            actions: [
              action
            ],
            parallel: false
          });
        });
      }
      unprocessedActions.length = 0;
      unprocessedActions.push(...remainingActions);
    }
    return {
      groups
    };
  }
  findCompleteTags(text) {
    const combinedText = this.currentMessageBuffer + text;
    const validationError = this.actionTagsExtractor.validateStructure(combinedText);
    if (validationError) {
      this.debugLogger.log("Validation", "Tag structure validation failed", {
        error: validationError
      });
      return {
        groups: []
      };
    }
    const actions = [];
    const actionTags = getImplementedActions();
    const allTagsRegex = new RegExp(`<(${actionTags.join("|")})>[\\s\\S]*?</\\1>`, "g");
    const matches = Array.from(combinedText.matchAll(allTagsRegex));
    for (const match of matches) {
      const content = match[0];
      const type = match[1];
      if (!this.processedTags.includes(content)) {
        actions.push({
          actionId: (0, import_uuid.v4)(),
          type,
          content
        });
        this.processedTags.push(content);
      }
    }
    const actionsWithDependencies = this.detectActionDependencies(actions);
    return this.createExecutionPlan(actionsWithDependencies);
  }
  appendToBuffer(chunk) {
    this.currentMessageBuffer += chunk;
  }
  clearBuffer() {
    this.currentMessageBuffer = "";
    this.processedTags = [];
  }
  get buffer() {
    return this.currentMessageBuffer;
  }
  get isProcessing() {
    return this.isProcessingAction;
  }
  set isProcessing(value) {
    this.isProcessingAction = value;
  }
  get isComplete() {
    return this.messageComplete;
  }
  set isComplete(value) {
    this.messageComplete = value;
  }
  formatActionResult(action, result) {
    const actionMatch = /<(\w+)>([\s\S]*?)<\/\1>/.exec(action);
    if (!actionMatch) return `[Action Result] Invalid action format`;
    const [_, actionType] = actionMatch;
    if (actionType === "execute_command" && result.success) {
      return `Command execution result:

${result.data}

Please analyze this output and continue with the task.`;
    }
    if (actionType === "read_file" && result.success) {
      const output = this.htmlEntityDecoder.decode(JSON.stringify(result.data), {
        unescape: true
      });
      if (typeof result.data === "string" && result.data.includes("# File:")) {
        return result.data;
      }
      return `Here's the content of the requested file:

${output}

Please analyze this content and continue with the task.`;
    }
    if (actionType === "fetch_url" && result.success) {
      return `Here's the content fetched from the URL:

${result.data}

Please analyze this content and continue with the task.`;
    }
    if (actionType === "end_task" && result.success) {
      return `Task completed: ${result.data}`;
    }
    if (actionType === "end_phase" && result.success) {
      const data = result.data;
      if (data?.regenerate && data?.prompt) {
        return data.prompt;
      }
      return `Phase completed. Moving to next phase.`;
    }
    if (actionType === "relative_path_lookup" && result.success) {
      return `Found matching path: ${JSON.stringify(result.data)}`;
    }
    return `[Action Result] ${actionType}: ${JSON.stringify(result)} ${result.success && "Proceed to next previously planned step."}`;
  }
  async parseAndExecuteActions(text, model, llmCallback) {
    try {
      this.currentModel = model;
      const executionPlan = this.findCompleteTags(text);
      const results = [];
      let selectedModel = model;
      let hasError = false;
      for (const group of executionPlan.groups) {
        if (hasError) break;
        if (group.parallel) {
          const actionPromises = group.actions.map((action) => this.contextCreator.executeAction(action.content).then((result) => ({
            action: action.content,
            result
          })));
          const groupResults = await Promise.all(actionPromises);
          results.push(...groupResults);
          for (const result of groupResults) {
            if (!result.result.success) {
              this.debugLogger.log("Action", "Action failed", {
                action: result.action,
                result: result.result
              });
              hasError = true;
              break;
            }
          }
          if (!hasError) {
            for (const result of groupResults) {
              if (result.action.includes("<write_file>")) {
                const writeData = result.result.data;
                if (writeData?.selectedModel) {
                  selectedModel = writeData.selectedModel;
                  this.debugLogger.log("Model", "Updated model from write action", {
                    model: selectedModel
                  });
                }
              }
            }
          }
        } else {
          for (const action of group.actions) {
            const result = await this.contextCreator.executeAction(action.content);
            this.debugLogger.log("Action", "Action executed", {
              action: action.content,
              result
            });
            results.push({
              action: action.content,
              result
            });
            if (!result.success) {
              this.debugLogger.log("Action", "Action failed", {
                action: action.content,
                result
              });
              hasError = true;
              break;
            }
            if (action.type === "write_file") {
              const writeData = result.data;
              if (writeData?.selectedModel) {
                selectedModel = writeData.selectedModel;
                this.debugLogger.log("Model", "Updated model from write action", {
                  model: selectedModel
                });
              }
            }
          }
        }
      }
      const endTaskAction = results.find(({ action, result }) => action.includes("<end_task>") && result.success);
      if (endTaskAction) {
        this.debugLogger.log("EndTask", "Task completed", {
          message: endTaskAction.result.data
        });
        return {
          actions: results,
          selectedModel
        };
      }
      const actionResults = results.map(({ action, result }) => this.formatActionResult(action, result)).join("\n\n");
      let followupResponse;
      if (!hasError) {
        followupResponse = await llmCallback(actionResults);
        this.debugLogger.log("Response", "Received LLM response for action results", {
          response: followupResponse,
          selectedModel
        });
      }
      return {
        actions: results,
        followupResponse,
        selectedModel
      };
    } catch (error) {
      console.error("Error in parseAndExecuteActions:", error);
      this.debugLogger.log("Error", "Failed to parse and execute actions", {
        error
      });
      return {
        actions: []
      };
    }
  }
};
__name(_ActionsParser, "ActionsParser");
var ActionsParser = _ActionsParser;
ActionsParser = _ts_decorate45([
  (0, import_tsyringe49.autoInjectable)(),
  _ts_metadata38("design:type", Function),
  _ts_metadata38("design:paramtypes", [
    typeof DebugLogger === "undefined" ? Object : DebugLogger,
    typeof LLMContextCreator === "undefined" ? Object : LLMContextCreator,
    typeof HtmlEntityDecoder === "undefined" ? Object : HtmlEntityDecoder,
    typeof ActionTagsExtractor === "undefined" ? Object : ActionTagsExtractor
  ])
], ActionsParser);

// src/services/LLM/context/MessageContextLimiter.ts
var import_tsyringe50 = require("tsyringe");
function _ts_decorate46(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate46, "_ts_decorate");
function _ts_metadata39(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata39, "_ts_metadata");
var _MessageContextLimiter = class _MessageContextLimiter {
  constructor(messageContextCleanup, messageContextStore, messageContextLogger) {
    __publicField(this, "messageContextCleanup");
    __publicField(this, "messageContextStore");
    __publicField(this, "messageContextLogger");
    this.messageContextCleanup = messageContextCleanup;
    this.messageContextStore = messageContextStore;
    this.messageContextLogger = messageContextLogger;
  }
  async cleanupContext() {
    const wasCleaned = await this.messageContextCleanup.cleanupContext();
    if (wasCleaned) {
      this.updateLogFile();
      return true;
    }
    return false;
  }
  updateLogFile() {
    if (process.env.NODE_ENV === "test" || !this.isLoggingEnabled()) return;
    this.messageContextLogger.updateConversationHistory(this.messageContextStore.getContextData().conversationHistory, this.messageContextStore.getContextData().systemInstructions);
  }
  isLoggingEnabled() {
    return this.messageContextLogger.getConversationLogPath() !== null;
  }
};
__name(_MessageContextLimiter, "MessageContextLimiter");
var MessageContextLimiter = _MessageContextLimiter;
MessageContextLimiter = _ts_decorate46([
  (0, import_tsyringe50.singleton)(),
  (0, import_tsyringe50.autoInjectable)(),
  _ts_metadata39("design:type", Function),
  _ts_metadata39("design:paramtypes", [
    typeof MessageContextCleaner === "undefined" ? Object : MessageContextCleaner,
    typeof MessageContextStore === "undefined" ? Object : MessageContextStore,
    typeof MessageContextLogger === "undefined" ? Object : MessageContextLogger
  ])
], MessageContextLimiter);

// src/services/LLM/utils/ModelUtils.ts
var ANTHROPIC_MODEL_REGEX = /^anthropic\/claude-(?:3(?:[.-]5)?)-(?:opus|sonnet|haiku)(?:-\d{8})?(?::beta)?$/;
var MAX_CHUNK_SIZE = 8e3;
var MAX_CACHE_BLOCKS = 4;
var MIN_CACHE_TOKENS = {
  opus: 256,
  sonnet: 128,
  haiku: 64
};
var isAnthropicModel = /* @__PURE__ */ __name((model) => {
  return ANTHROPIC_MODEL_REGEX.test(model);
}, "isAnthropicModel");
var getModelType = /* @__PURE__ */ __name((model) => {
  const match = model.match(/(?:opus|sonnet|haiku)/)?.[0];
  return match || null;
}, "getModelType");
var estimateTokens = /* @__PURE__ */ __name((text) => {
  const codeBlockMatches = text.match(/```[\s\S]*?```/g) || [];
  let codeTokens = 0;
  let regularContent = text;
  for (const codeBlock of codeBlockMatches) {
    const codeContent = codeBlock.slice(3, -3);
    codeTokens += Math.ceil(codeContent.length / 5.5);
    codeTokens += 2;
    regularContent = regularContent.replace(codeBlock, "");
  }
  const regularTokens = Math.ceil(regularContent.length / 3.8);
  return codeTokens + regularTokens;
}, "estimateTokens");
var shouldApplyCache = /* @__PURE__ */ __name((content, modelType, messageIndex) => {
  if (!modelType || messageIndex >= MAX_CACHE_BLOCKS) return false;
  const minTokens = MIN_CACHE_TOKENS[modelType];
  return estimateTokens(content) >= minTokens;
}, "shouldApplyCache");
var splitContentIntoChunks = /* @__PURE__ */ __name((content) => {
  if (content.length <= MAX_CHUNK_SIZE) {
    return [
      content
    ];
  }
  const chunks = [];
  let remaining = content;
  while (remaining.length > 0) {
    let chunkSize = MAX_CHUNK_SIZE;
    if (remaining.length > MAX_CHUNK_SIZE) {
      const naturalBreak = remaining.slice(0, MAX_CHUNK_SIZE).lastIndexOf("\n\n");
      if (naturalBreak > MAX_CHUNK_SIZE * 0.5) {
        chunkSize = naturalBreak + 2;
      }
    }
    const chunk = remaining.slice(0, chunkSize);
    chunks.push(chunk);
    remaining = remaining.slice(chunkSize);
  }
  return chunks;
}, "splitContentIntoChunks");
var formatMessageContent = /* @__PURE__ */ __name((content, model, messageIndex, totalMessages) => {
  if (!isAnthropicModel(model)) {
    return content;
  }
  const modelType = getModelType(model);
  const shouldCache = shouldApplyCache(content, modelType, messageIndex);
  const chunks = splitContentIntoChunks(content);
  if (chunks.length === 1) {
    return [
      {
        type: "text",
        text: content,
        ...shouldCache && {
          cache_control: {
            type: "ephemeral"
          }
        }
      }
    ];
  }
  if (shouldCache) {
    const chunksWithTokens = chunks.map((chunk, idx) => ({
      chunk,
      tokens: estimateTokens(chunk),
      index: idx
    }));
    chunksWithTokens.sort((a, b) => b.tokens - a.tokens);
    const remainingBlocks = MAX_CACHE_BLOCKS - messageIndex;
    const chunksToCacheIndices = new Set(chunksWithTokens.slice(0, remainingBlocks).map((c) => c.index));
    return chunks.map((chunk, idx) => ({
      type: "text",
      text: chunk,
      ...chunksToCacheIndices.has(idx) && {
        cache_control: {
          type: "ephemeral"
        }
      }
    }));
  }
  return chunks.map((chunk) => ({
    type: "text",
    text: chunk
  }));
}, "formatMessageContent");

// src/services/LLMProviders/OpenRouter/OpenRouterAPI.ts
var import_tsyringe52 = require("tsyringe");

// src/services/LLMProviders/OpenRouter/OpenRouterAPICostTracking.ts
var import_tsyringe51 = require("tsyringe");
function _ts_decorate47(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate47, "_ts_decorate");
function _ts_metadata40(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata40, "_ts_metadata");
var _OpenRouterAPICostTracking = class _OpenRouterAPICostTracking {
  constructor() {
  }
  calculateCosts(priceAll, usage) {
    const promptRate = parseFloat(priceAll.prompt);
    const completionRate = parseFloat(priceAll.completion);
    let currentCost = 0;
    let totalCost = 0;
    for (const modelKey in usage) {
      const modelUsage = usage[modelKey];
      if (modelUsage.length > 0) {
        const modelTotalCost = modelUsage.reduce((sum, entry) => {
          const cost = entry.prompt_tokens * promptRate + entry.completion_tokens * completionRate;
          return sum + cost;
        }, 0);
        totalCost += modelTotalCost;
        const lastUsage = modelUsage[modelUsage.length - 1];
        currentCost = lastUsage.prompt_tokens * promptRate + lastUsage.completion_tokens * completionRate;
      }
    }
    return {
      currentCost,
      totalCost
    };
  }
  logChatCosts(priceAll, usage) {
    if (priceAll && usage) {
      const { currentCost, totalCost } = this.calculateCosts(priceAll, usage);
      console.log("Current Chat Cost: $", currentCost.toFixed(10));
      console.log("Total Chat Cost:   $", totalCost.toFixed(10));
    } else {
      console.log("PriceInfo or UsageHistory is undefined, cannot calculate costs.");
    }
  }
};
__name(_OpenRouterAPICostTracking, "OpenRouterAPICostTracking");
var OpenRouterAPICostTracking = _OpenRouterAPICostTracking;
OpenRouterAPICostTracking = _ts_decorate47([
  (0, import_tsyringe51.autoInjectable)(),
  _ts_metadata40("design:type", Function),
  _ts_metadata40("design:paramtypes", [])
], OpenRouterAPICostTracking);

// src/services/LLMProviders/OpenRouter/OpenRouterAPI.ts
function _ts_decorate48(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate48, "_ts_decorate");
function _ts_metadata41(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata41, "_ts_metadata");
function _ts_param5(paramIndex, decorator) {
  return function(target, key) {
    decorator(target, key, paramIndex);
  };
}
__name(_ts_param5, "_ts_param");
var _LLMError = class _LLMError extends Error {
  constructor(message, type, details = {}) {
    super(message);
    __publicField(this, "type");
    __publicField(this, "details");
    this.type = type, this.details = details;
    this.name = "LLMError";
  }
};
__name(_LLMError, "LLMError");
var LLMError = _LLMError;
var _OpenRouterAPI = class _OpenRouterAPI {
  constructor(htmlEntityDecoder, modelManager, modelInfo, debugLogger, modelScaler, costTracker, messageContextHistory, messageContextLimiter, messageContextTokenCount) {
    __publicField(this, "htmlEntityDecoder");
    __publicField(this, "modelManager");
    __publicField(this, "modelInfo");
    __publicField(this, "debugLogger");
    __publicField(this, "modelScaler");
    __publicField(this, "costTracker");
    __publicField(this, "messageContextHistory");
    __publicField(this, "messageContextLimiter");
    __publicField(this, "messageContextTokenCount");
    __publicField(this, "httpClient");
    __publicField(this, "streamBuffer");
    __publicField(this, "maxRetries");
    __publicField(this, "retryDelay");
    __publicField(this, "stream");
    __publicField(this, "aborted");
    this.htmlEntityDecoder = htmlEntityDecoder;
    this.modelManager = modelManager;
    this.modelInfo = modelInfo;
    this.debugLogger = debugLogger;
    this.modelScaler = modelScaler;
    this.costTracker = costTracker;
    this.messageContextHistory = messageContextHistory;
    this.messageContextLimiter = messageContextLimiter;
    this.messageContextTokenCount = messageContextTokenCount;
    this.streamBuffer = "";
    this.maxRetries = 3;
    this.retryDelay = 1e3;
    this.aborted = false;
    this.httpClient = openRouterClient;
    this.initializeModelInfo();
  }
  async initializeModelInfo() {
    try {
      await this.modelInfo.initialize();
    } catch (error) {
      this.debugLogger.log("Model", "Failed to initialize model info", {
        error
      });
    }
  }
  getAnthropicHeaders(model) {
    if (!isAnthropicModel(model)) {
      return {};
    }
    return {
      "anthropic-beta": "prompt-caching-2024-07-31",
      "anthropic-version": "2023-06-01"
    };
  }
  async makeRequest(endpoint, data, options = {}) {
    const model = data.model;
    const headers = this.getAnthropicHeaders(model);
    return this.httpClient.post(endpoint, data, {
      ...options,
      headers: {
        ...options.headers,
        ...headers
      }
    });
  }
  async handleLLMError(error) {
    if (error?.response?.data) {
      const data = error.response.data;
      if (data.error?.message) {
        return new LLMError(data.error.message, "API_ERROR", data.error);
      }
      if (typeof data.error === "string" && data.error.includes("context length")) {
        const model = this.modelManager.getCurrentModel();
        const contextLimit = await this.modelInfo.getModelContextLength(model);
        return new LLMError("Maximum context length exceeded", "CONTEXT_LENGTH_EXCEEDED", {
          maxLength: contextLimit,
          currentLength: this.messageContextTokenCount.getTotalTokenCount()
        });
      }
    }
    if (error instanceof LLMError) {
      return error;
    }
    return new LLMError(error?.message || "An unknown error occurred", "UNKNOWN_ERROR", {
      originalError: error
    });
  }
  formatMessages(messages, model) {
    const filteredMessages = messages.filter((msg) => msg.content?.trim().length > 0);
    return filteredMessages.map((msg, index) => ({
      role: msg.role,
      content: formatMessageContent(msg.content, model, index, filteredMessages.length)
    }));
  }
  async sendMessage(model, message, options) {
    const messages = this.getConversationContext();
    const currentModel = this.modelManager.getCurrentModel() || model;
    try {
      await this.modelInfo.setCurrentModel(currentModel);
      const formattedMessages = this.formatMessages([
        ...messages,
        {
          role: "user",
          content: message
        }
      ], currentModel);
      const response = await this.makeRequest("/chat/completions", {
        model: currentModel,
        messages: formattedMessages,
        ...options
      });
      const assistantMessage = response.data.choices[0].message.content;
      this.messageContextHistory.addMessage("user", message);
      this.messageContextHistory.addMessage("assistant", assistantMessage);
      const priceAll = this.modelInfo.getCurrentModelInfo()?.pricing;
      const usage = this.modelInfo.getUsageHistory();
      this.costTracker.logChatCosts(priceAll, usage);
      return assistantMessage;
    } catch (error) {
      throw await this.handleLLMError(error);
    }
  }
  async sendMessageWithContext(model, message, systemInstructions, options) {
    if (systemInstructions) {
      this.addSystemInstructions(systemInstructions);
    }
    return this.sendMessage(model, message, options);
  }
  async clearConversationContext() {
    this.messageContextHistory.clear();
  }
  getConversationContext() {
    return this.messageContextHistory.getMessages();
  }
  addSystemInstructions(instructions) {
    this.messageContextHistory.setSystemInstructions(instructions);
    this.modelInfo.logCurrentModelUsage(this.messageContextTokenCount.getTotalTokenCount());
  }
  async getAvailableModels() {
    try {
      await this.modelInfo.initialize();
      return this.modelInfo.getAllModels();
    } catch (error) {
      throw await this.handleLLMError(error);
    }
  }
  async validateModel(model) {
    return this.modelInfo.isModelAvailable(model);
  }
  async getModelInfo(model) {
    const info = await this.modelInfo.getModelInfo(model);
    return info ? {
      ...info
    } : {};
  }
  async handleStreamError(error, message, callback) {
    this.debugLogger.log("Model", "Stream error", {
      error: error.type,
      message
    });
    if (error.type === "CONTEXT_LENGTH_EXCEEDED") {
      const wasContextCleaned = await this.messageContextLimiter.cleanupContext();
      if (wasContextCleaned) {
        await this.streamMessage(this.modelManager.getCurrentModel(), message, callback);
        return;
      }
    }
    callback("", error);
  }
  async retryStreamOperation(operation, retries = this.maxRetries) {
    try {
      if (this.aborted) {
        throw new LLMError("Aborted", "ABORTED");
      }
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        await new Promise((resolve2) => setTimeout(resolve2, this.retryDelay));
        return this.retryStreamOperation(operation, retries - 1);
      }
      if (error instanceof LLMError) {
        throw error;
      }
      throw await this.handleLLMError(error);
    }
  }
  isRetryableError(error) {
    if (error instanceof LLMError) {
      return error.type === "NETWORK_ERROR" || error.type === "CONTEXT_LENGTH_EXCEEDED" || error.type === "RATE_LIMIT_EXCEEDED";
    }
    const err = error;
    return !!(err.code === "ECONNRESET" || err.code === "ETIMEDOUT" || err.message?.includes("network") || err.message?.includes("timeout"));
  }
  async processCompleteMessage(message) {
    try {
      const jsonStr = message.replace(/^data: /, "").trim();
      if (!jsonStr || jsonStr === "[DONE]" || !jsonStr.startsWith("{") && !jsonStr.startsWith("data: {")) {
        return {
          content: ""
        };
      }
      const parsed = JSON.parse(jsonStr);
      if (parsed.error) {
        return {
          content: "",
          error: parsed.error
        };
      }
      if (parsed.usage) {
        await this.modelInfo.logDetailedUsage(parsed.usage);
      }
      const deltaContent = parsed.choices?.[0]?.delta?.content;
      if (!deltaContent) {
        return {
          content: ""
        };
      }
      const decodedContent = this.htmlEntityDecoder.decode(deltaContent);
      return {
        content: decodedContent
      };
    } catch (e) {
      this.debugLogger.log("Error", "Error parsing stream chunk", {
        error: e
      });
      return {
        content: ""
      };
    }
  }
  async parseStreamChunk(chunk) {
    this.streamBuffer += chunk;
    let content = "";
    let error;
    const messages = this.streamBuffer.split("\n");
    this.streamBuffer = messages.pop() || "";
    for (const message of messages) {
      const result = await this.processCompleteMessage(message);
      if (result.error) error = result.error;
      content += result.content;
    }
    return {
      content,
      error
    };
  }
  async streamMessage(model, message, callback, options) {
    const messages = this.getConversationContext();
    const currentModel = this.modelManager.getCurrentModel() || model;
    let assistantMessage = "";
    this.streamBuffer = "";
    try {
      await this.modelInfo.setCurrentModel(currentModel);
      const formattedMessages = this.formatMessages([
        ...messages,
        {
          role: "user",
          content: message
        }
      ], currentModel);
      const streamOperation = /* @__PURE__ */ __name(async () => {
        const response = await this.makeRequest("/chat/completions", {
          model: currentModel,
          messages: formattedMessages,
          stream: true,
          ...options
        }, {
          responseType: "stream",
          timeout: 0
        });
        try {
          this.stream = response.data;
          await new Promise((resolve2, reject) => {
            const handleError = /* @__PURE__ */ __name((err) => {
              this.debugLogger.log("Error", "Stream error", {
                error: err
              });
              reject(err);
            }, "handleError");
            this.stream.on("data", async (chunk) => {
              if (this.aborted) {
                this.cleanupStream();
                return;
              }
              const { content, error } = await this.parseStreamChunk(chunk.toString());
              if (error) {
                const llmError = new LLMError(error.message || "Stream error", "STREAM_ERROR", error.details || {});
                this.handleStreamError(llmError, message, callback);
                reject(llmError);
                return;
              }
              if (content) {
                assistantMessage += content;
                callback(content);
              }
            });
            this.stream.on("end", async () => {
              if (this.aborted) return;
              if (this.streamBuffer) {
                const { content, error } = await this.parseStreamChunk(this.streamBuffer);
                if (error) {
                  handleError(new LLMError(error.message || "Stream error", "STREAM_ERROR", error.details || {}));
                  return;
                }
                if (content) {
                  assistantMessage += content;
                  callback(content);
                }
              }
              this.cleanupStream();
              resolve2();
            });
            this.stream.on("error", handleError);
          });
          if (assistantMessage && !this.aborted) {
            this.messageContextHistory.addMessage("user", message);
            this.messageContextHistory.addMessage("assistant", assistantMessage);
            const priceAll = this.modelInfo.getCurrentModelInfo()?.pricing;
            const usage = this.modelInfo.getUsageHistory();
            this.costTracker.logChatCosts(priceAll, usage);
          }
        } catch (error) {
          throw error;
        }
      }, "streamOperation");
      await this.retryStreamOperation(streamOperation);
    } catch (error) {
      const llmError = error instanceof LLMError ? error : await this.handleLLMError(error);
      await this.handleStreamError(llmError, message, callback);
      if (assistantMessage && !this.aborted) {
        this.messageContextHistory.addMessage("user", message);
        this.messageContextHistory.addMessage("assistant", assistantMessage);
        const priceAll = this.modelInfo.getCurrentModelInfo()?.pricing;
        const usage = this.modelInfo.getUsageHistory();
        this.costTracker.logChatCosts(priceAll, usage);
      }
    } finally {
      this.cleanupStream();
    }
  }
  cleanupStream() {
    if (this.stream) {
      this.stream.removeAllListeners();
      this.stream.destroy();
      this.stream = null;
    }
    this.streamBuffer = "";
    this.aborted = false;
  }
  cancelStream() {
    this.aborted = true;
    if (this.stream) {
      this.stream.removeAllListeners();
      this.stream.destroy();
      this.stream = null;
    }
  }
};
__name(_OpenRouterAPI, "OpenRouterAPI");
var OpenRouterAPI = _OpenRouterAPI;
OpenRouterAPI = _ts_decorate48([
  (0, import_tsyringe52.singleton)(),
  _ts_param5(5, (0, import_tsyringe52.inject)(OpenRouterAPICostTracking)),
  _ts_metadata41("design:type", Function),
  _ts_metadata41("design:paramtypes", [
    typeof HtmlEntityDecoder === "undefined" ? Object : HtmlEntityDecoder,
    typeof ModelManager === "undefined" ? Object : ModelManager,
    typeof ModelInfo === "undefined" ? Object : ModelInfo,
    typeof DebugLogger === "undefined" ? Object : DebugLogger,
    typeof ModelScaler === "undefined" ? Object : ModelScaler,
    typeof OpenRouterAPICostTracking === "undefined" ? Object : OpenRouterAPICostTracking,
    typeof MessageContextHistory === "undefined" ? Object : MessageContextHistory,
    typeof MessageContextLimiter === "undefined" ? Object : MessageContextLimiter,
    typeof MessageContextTokenCount === "undefined" ? Object : MessageContextTokenCount
  ])
], OpenRouterAPI);

// src/services/LLM/LLMProvider.ts
var import_tsyringe53 = require("tsyringe");
function _ts_decorate49(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate49, "_ts_decorate");
function _ts_metadata42(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata42, "_ts_metadata");
var LLMProviderType = /* @__PURE__ */ function(LLMProviderType2) {
  LLMProviderType2["OpenRouter"] = "open-router";
  return LLMProviderType2;
}({});
var _LLMProvider = class _LLMProvider {
  constructor() {
    __publicField(this, "providers");
    __publicField(this, "currentProvider", null);
    this.providers = /* @__PURE__ */ new Map();
    this.initializeProvider("open-router");
  }
  initializeProvider(type) {
    let provider;
    switch (type) {
      case "open-router":
        provider = import_tsyringe53.container.resolve(OpenRouterAPI);
        break;
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }
    this.providers.set(type, provider);
    this.currentProvider = provider;
  }
  static getInstance(type) {
    const provider = import_tsyringe53.container.resolve(_LLMProvider).getProvider(type);
    if (!provider) {
      throw new Error(`Unsupported provider type: ${type}`);
    }
    return provider;
  }
  getProvider(type) {
    return this.providers.get(type);
  }
  sendMessage(model, message, options) {
    if (!this.currentProvider) {
      throw new Error("Current provider not set");
    }
    return this.currentProvider.sendMessage(model, message, options);
  }
  sendMessageWithContext(model, message, systemInstructions, options) {
    if (!this.currentProvider) {
      throw new Error("Current provider not set");
    }
    return this.currentProvider.sendMessageWithContext(model, message, systemInstructions, options);
  }
  clearConversationContext() {
    if (!this.currentProvider) {
      throw new Error("Current provider not set");
    }
    this.currentProvider.clearConversationContext();
  }
  getConversationContext() {
    if (!this.currentProvider) {
      throw new Error("Current provider not set");
    }
    return this.currentProvider.getConversationContext();
  }
  addSystemInstructions(instructions) {
    if (!this.currentProvider) {
      throw new Error("Current provider not set");
    }
    this.currentProvider.addSystemInstructions(instructions);
  }
  getAvailableModels() {
    if (!this.currentProvider) {
      throw new Error("Current provider not set");
    }
    return this.currentProvider.getAvailableModels();
  }
  validateModel(model) {
    if (!this.currentProvider) {
      throw new Error("Current provider not set");
    }
    return this.currentProvider.validateModel(model);
  }
  getModelInfo(model) {
    if (!this.currentProvider) {
      throw new Error("Current provider not set");
    }
    return this.currentProvider.getModelInfo(model);
  }
  streamMessage(model, message, callback, options) {
    if (!this.currentProvider) {
      throw new Error("Current provider not set");
    }
    return this.currentProvider.streamMessage(model, message, callback, options);
  }
};
__name(_LLMProvider, "LLMProvider");
var LLMProvider = _LLMProvider;
LLMProvider = _ts_decorate49([
  (0, import_tsyringe53.singleton)(),
  (0, import_tsyringe53.autoInjectable)(),
  _ts_metadata42("design:type", Function),
  _ts_metadata42("design:paramtypes", [])
], LLMProvider);

// src/services/streaming/StreamHandler.ts
var import_tsyringe54 = require("tsyringe");
function _ts_decorate50(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate50, "_ts_decorate");
function _ts_metadata43(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata43, "_ts_metadata");
var MAX_BUFFER_SIZE = 10 * 1024 * 1024;
var CHUNK_SIZE = 1024 * 1024;
var STREAM_TIMEOUT = 1e4;
var _StreamHandler = class _StreamHandler {
  constructor(debugLogger, actionsParser) {
    __publicField(this, "debugLogger");
    __publicField(this, "actionsParser");
    __publicField(this, "responseBuffer");
    __publicField(this, "isStreamComplete");
    __publicField(this, "lastActivityTimestamp");
    __publicField(this, "bufferSize");
    __publicField(this, "inactivityTimer");
    this.debugLogger = debugLogger;
    this.actionsParser = actionsParser;
    this.responseBuffer = "";
    this.isStreamComplete = false;
    this.lastActivityTimestamp = Date.now();
    this.bufferSize = 0;
    this.inactivityTimer = null;
  }
  reset() {
    this.responseBuffer = "";
    this.isStreamComplete = false;
    this.lastActivityTimestamp = Date.now();
    this.bufferSize = 0;
    this.actionsParser.reset();
    this.clearInactivityTimer();
  }
  get response() {
    return this.responseBuffer;
  }
  formatErrorDisplay(error) {
    if (!error) return {
      title: "Unknown Error",
      details: "An unknown error occurred"
    };
    switch (error.type) {
      case "CONTEXT_LENGTH_EXCEEDED":
        return {
          title: "Context Length Exceeded",
          details: `Maximum context length (${error.details?.maxLength} tokens) exceeded. Current length: ${error.details?.currentLength} tokens.`,
          suggestion: "Try reducing the conversation history or splitting your request into smaller chunks."
        };
      case "RATE_LIMIT_EXCEEDED":
        return {
          title: "Rate Limit Exceeded",
          details: `API rate limit reached.${error.details?.retryAfter ? ` Try again in ${error.details.retryAfter} seconds.` : ""}`,
          suggestion: "Please wait before making another request."
        };
      case "MODEL_ERROR":
        return {
          title: "Model Error",
          details: `Error with model${error.details?.modelId ? ` ${error.details.modelId}` : ""}: ${error.message}`,
          suggestion: "Try using a different model or reducing the complexity of your request."
        };
      case "INSUFFICIENT_QUOTA":
        return {
          title: "Insufficient Token Budget",
          details: `Required: ${error.details?.required}, Available: ${error.details?.available}`,
          suggestion: "Please check your API quota or upgrade your plan."
        };
      case "NETWORK_ERROR":
        return {
          title: "Network Error",
          details: error.message,
          suggestion: "Check your internet connection and try again."
        };
      case "STREAM_TIMEOUT":
        return {
          title: "Stream Timeout",
          details: "The stream was inactive for too long.",
          suggestion: "Try your request again. If the issue persists, try reducing the complexity of your request."
        };
      case "STREAM_ERROR":
        return {
          title: "Stream Error",
          details: error.message,
          suggestion: "Try your request again with a different prompt or model."
        };
      case "BUFFER_OVERFLOW":
        return {
          title: "Buffer Overflow",
          details: "The stream buffer has exceeded its maximum size limit.",
          suggestion: "Try processing the stream in smaller chunks or increase the buffer size limit."
        };
      default:
        return {
          title: "Error",
          details: error.message || "An unexpected error occurred",
          suggestion: "Try your request again. If the issue persists, try with different parameters."
        };
    }
  }
  displayError(error) {
    const { title, details, suggestion } = this.formatErrorDisplay(error);
    this.safeWriteToStdout("\n\n");
    this.safeWriteToStdout("\x1B[31m");
    this.safeWriteToStdout(`\u274C ${title}
`);
    this.safeWriteToStdout("\x1B[0m");
    this.safeWriteToStdout("\x1B[37m");
    this.safeWriteToStdout(`${details}
`);
    if (suggestion) {
      this.safeWriteToStdout("\n");
      this.safeWriteToStdout("\x1B[36m");
      this.safeWriteToStdout(`\u{1F4A1} ${suggestion}
`);
    }
    this.safeWriteToStdout("\x1B[0m");
    this.safeWriteToStdout("\n");
    this.debugLogger.log("Error", details, {
      title,
      suggestion
    });
  }
  safeWriteToStdout(text) {
    try {
      process.stdout.write(text);
    } catch (error) {
      console.error("Error writing to stdout", error);
    }
  }
  safeClearLine() {
    try {
      if (process.stdout.clearLine) {
        process.stdout.clearLine(0);
      }
    } catch (error) {
      console.error("Error clearing line", error);
    }
  }
  safeCursorTo(x) {
    try {
      if (process.stdout.cursorTo) {
        process.stdout.cursorTo(x);
      }
    } catch (error) {
      console.error("Error moving cursor", error);
    }
  }
  processChunk(chunk) {
    if (!chunk) return [
      ""
    ];
    const chunks = [];
    let remainingChunk = chunk;
    while (remainingChunk.length > 0) {
      const chunkToProcess = remainingChunk.slice(0, CHUNK_SIZE);
      chunks.push(chunkToProcess);
      remainingChunk = remainingChunk.slice(CHUNK_SIZE);
    }
    return chunks;
  }
  handleBufferOverflow() {
    const keepSize = 1024 * 1024;
    this.responseBuffer = this.responseBuffer.slice(-keepSize);
    this.bufferSize = this.responseBuffer.length;
    this.actionsParser.clearBuffer();
    this.actionsParser.appendToBuffer(this.responseBuffer);
    this.debugLogger.log("Buffer Overflow", "Buffer size limit exceeded", {
      maxSize: MAX_BUFFER_SIZE,
      currentSize: this.bufferSize
    });
  }
  startInactivityTimer() {
    this.clearInactivityTimer();
    this.inactivityTimer = setTimeout(() => {
      this.displayError(new LLMError("The stream was inactive for too long.", "STREAM_TIMEOUT", {
        timeout: STREAM_TIMEOUT
      }));
      this.reset();
    }, STREAM_TIMEOUT);
  }
  clearInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }
  async handleChunk(chunk, model, llmCallback, streamCallback, options) {
    this.lastActivityTimestamp = Date.now();
    this.startInactivityTimer();
    if (chunk.startsWith('{"error":')) {
      try {
        const error = JSON.parse(chunk).error;
        const llmError = new LLMError(error.message || "Unknown error", error.type || "UNKNOWN_ERROR", error.details);
        this.displayError(llmError);
        return [];
      } catch (e) {
        this.displayError(new LLMError("Unknown error", "UNKNOWN_ERROR", {
          originalError: e
        }));
        return [];
      }
    }
    const chunks = this.processChunk(chunk);
    for (const subChunk of chunks) {
      if (this.bufferSize + subChunk.length > MAX_BUFFER_SIZE) {
        this.handleBufferOverflow();
        this.displayError(new LLMError("Buffer size limit exceeded", "BUFFER_OVERFLOW", {
          maxSize: MAX_BUFFER_SIZE,
          currentSize: this.bufferSize
        }));
      }
      this.safeWriteToStdout(subChunk);
      this.actionsParser.appendToBuffer(subChunk);
      this.responseBuffer += subChunk;
      this.bufferSize += subChunk.length;
    }
    const isMessageComplete = this.actionsParser.isCompleteMessage(this.actionsParser.buffer);
    if (!this.actionsParser.isComplete && isMessageComplete) {
      this.actionsParser.isComplete = true;
      this.isStreamComplete = true;
      this.safeWriteToStdout("\n");
    }
    if (this.isStreamComplete && !this.actionsParser.isProcessing) {
      this.actionsParser.isProcessing = true;
      try {
        const actionResult = await this.actionsParser.parseAndExecuteActions(this.actionsParser.buffer, model, async (message) => {
          let actionResponse = "";
          await streamCallback(message, (chunk2, error) => {
            if (error) {
              this.displayError(error);
              return;
            }
            this.safeWriteToStdout(chunk2);
            actionResponse += chunk2;
            this.lastActivityTimestamp = Date.now();
          });
          if (this.bufferSize + actionResponse.length > MAX_BUFFER_SIZE) {
            this.handleBufferOverflow();
            this.displayError(new LLMError("Buffer size limit exceeded after action", "BUFFER_OVERFLOW", {
              maxSize: MAX_BUFFER_SIZE,
              currentSize: this.bufferSize
            }));
          }
          this.responseBuffer += actionResponse;
          this.bufferSize += actionResponse.length;
          return actionResponse;
        });
        this.actionsParser.reset();
        this.isStreamComplete = false;
        this.bufferSize = 0;
        this.safeWriteToStdout("\n");
        this.safeWriteToStdout("\x1B[?25h");
        this.safeClearLine();
        this.safeCursorTo(0);
        this.safeWriteToStdout("> ");
        this.clearInactivityTimer();
        return actionResult.actions;
      } catch (error) {
        this.debugLogger.log("Error", "Error processing actions", {
          error
        });
        if (error instanceof LLMError) {
          this.displayError(error);
        } else {
          this.displayError(new LLMError(error.message || "Unknown error during action execution", "ACTION_ERROR", {
            originalError: error
          }));
        }
        this.reset();
        return [];
      }
    }
    return [];
  }
};
__name(_StreamHandler, "StreamHandler");
var StreamHandler = _StreamHandler;
StreamHandler = _ts_decorate50([
  (0, import_tsyringe54.autoInjectable)(),
  _ts_metadata43("design:type", Function),
  _ts_metadata43("design:paramtypes", [
    typeof DebugLogger === "undefined" ? Object : DebugLogger,
    typeof ActionsParser === "undefined" ? Object : ActionsParser
  ])
], StreamHandler);

// src/services/CrackedAgent.ts
var import_tsyringe55 = require("tsyringe");
function _ts_decorate51(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate51, "_ts_decorate");
function _ts_metadata44(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata44, "_ts_metadata");
var _CrackedAgent = class _CrackedAgent {
  constructor(fileReader, contextCreator, debugLogger, actionsParser, streamHandler, phaseManager, modelManager) {
    __publicField(this, "fileReader");
    __publicField(this, "contextCreator");
    __publicField(this, "debugLogger");
    __publicField(this, "actionsParser");
    __publicField(this, "streamHandler");
    __publicField(this, "phaseManager");
    __publicField(this, "modelManager");
    __publicField(this, "llm");
    __publicField(this, "isFirstInteraction");
    __publicField(this, "currentModel");
    this.fileReader = fileReader;
    this.contextCreator = contextCreator;
    this.debugLogger = debugLogger;
    this.actionsParser = actionsParser;
    this.streamHandler = streamHandler;
    this.phaseManager = phaseManager;
    this.modelManager = modelManager;
    this.isFirstInteraction = true;
    this.currentModel = "";
  }
  async execute(message, options) {
    this.phaseManager.initializePhaseConfigs();
    const finalOptions = await this.setupExecution(options);
    this.currentModel = this.modelManager.getCurrentModel();
    const formattedMessage = await this.contextCreator.create(message, finalOptions.root, this.isFirstInteraction);
    if (this.isFirstInteraction) {
      this.isFirstInteraction = false;
    }
    this.debugLogger.log("Message", "Sending message to LLM", {
      message: formattedMessage,
      conversationHistory: this.llm.getConversationContext()
    });
    if (finalOptions.stream) {
      return await this.handleStreamExecution(formattedMessage, this.currentModel, finalOptions.options, finalOptions.stream);
    }
    const result = await this.handleNormalExecution(formattedMessage, this.currentModel, finalOptions.options, finalOptions.stream);
    return result;
  }
  async setupExecution(options) {
    const finalOptions = {
      root: process.cwd(),
      provider: LLMProviderType.OpenRouter,
      stream: false,
      debug: false,
      options: {},
      clearContext: false,
      autoScaler: false,
      ...options
    };
    this.debugLogger.setDebug(finalOptions.debug);
    this.llm = LLMProvider.getInstance(finalOptions.provider);
    this.streamHandler.reset();
    this.actionsParser.reset();
    if (finalOptions.clearContext) {
      this.clearConversationHistory();
    }
    await this.validateModel(this.modelManager.getCurrentModel());
    await this.setupInstructions(finalOptions);
    return finalOptions;
  }
  async validateModel(model) {
    const isValidModel = await this.llm.validateModel(model);
    if (!isValidModel) {
      const availableModels = await this.llm.getAvailableModels();
      throw new Error(`Invalid model: ${model}. Available models: ${availableModels.join(", ")}`);
    }
  }
  async setupInstructions(options) {
    if (!this.isFirstInteraction) return;
    let instructions = options.instructions;
    if (options.instructionsPath) {
      instructions = await this.fileReader.readInstructionsFile(options.instructionsPath);
    }
    if (instructions) {
      this.debugLogger.log("Instructions", "Adding system instructions", {
        instructions
      });
      this.llm.addSystemInstructions(instructions);
    }
    if (!instructions) {
      this.llm.addSystemInstructions(DEFAULT_INSTRUCTIONS);
    }
  }
  async handleStreamExecution(message, model, options, stream) {
    let response = "";
    await this.llm.streamMessage(model, message, async (chunk) => {
      response += chunk;
      this.actionsParser.appendToBuffer(chunk);
      process.stdout.write(chunk);
    }, options);
    process.stdout.write("\n");
    if (!response) return {
      response: ""
    };
    const { actions = [], followupResponse } = await this.parseAndExecuteWithCallback(this.actionsParser.buffer, model, options, stream);
    return {
      response: followupResponse || response,
      actions
    };
  }
  async handleNormalExecution(message, model, options, stream) {
    const response = await this.llm.sendMessage(model, message, options);
    this.debugLogger.log("Response", "Received LLM response", {
      response,
      conversationHistory: this.llm.getConversationContext()
    });
    if (!response) return {
      response: ""
    };
    const { actions = [], followupResponse } = await this.parseAndExecuteWithCallback(response, model, options, stream);
    return {
      response: followupResponse || response,
      actions
    };
  }
  async parseAndExecuteWithCallback(response, model, options, stream) {
    this.actionsParser.reset();
    const result = await this.actionsParser.parseAndExecuteActions(response, model, async (followupMsg) => {
      const formattedFollowup = await this.contextCreator.create(followupMsg, process.cwd(), false);
      if (stream) {
        let followupResponse = "";
        await this.llm.streamMessage(this.currentModel, formattedFollowup, async (chunk) => {
          followupResponse += chunk;
          process.stdout.write(chunk);
        }, options);
        process.stdout.write("\n");
        const followupResult = await this.parseAndExecuteWithCallback(followupResponse, this.currentModel, options, stream);
        return followupResult.followupResponse || followupResponse;
      } else {
        const followupResponse = await this.llm.sendMessage(this.currentModel, formattedFollowup, options);
        const followupResult = await this.parseAndExecuteWithCallback(followupResponse, this.currentModel, options, stream);
        return followupResult.followupResponse || followupResponse;
      }
    });
    return {
      actions: result?.actions || [],
      followupResponse: result?.followupResponse
    };
  }
  getConversationHistory() {
    return this.llm.getConversationContext();
  }
  clearConversationHistory() {
    this.llm.clearConversationContext();
    this.isFirstInteraction = true;
  }
};
__name(_CrackedAgent, "CrackedAgent");
var CrackedAgent = _CrackedAgent;
CrackedAgent = _ts_decorate51([
  (0, import_tsyringe55.autoInjectable)(),
  (0, import_tsyringe55.singleton)(),
  _ts_metadata44("design:type", Function),
  _ts_metadata44("design:paramtypes", [
    typeof FileReader === "undefined" ? Object : FileReader,
    typeof LLMContextCreator === "undefined" ? Object : LLMContextCreator,
    typeof DebugLogger === "undefined" ? Object : DebugLogger,
    typeof ActionsParser === "undefined" ? Object : ActionsParser,
    typeof StreamHandler === "undefined" ? Object : StreamHandler,
    typeof PhaseManager === "undefined" ? Object : PhaseManager,
    typeof ModelManager === "undefined" ? Object : ModelManager
  ])
], CrackedAgent);

// src/services/streaming/InteractiveSessionManager.ts
var import_tsyringe56 = require("tsyringe");
var tty = __toESM(require("tty"), 1);
function _ts_decorate52(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
__name(_ts_decorate52, "_ts_decorate");
function _ts_metadata45(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
__name(_ts_metadata45, "_ts_metadata");
var _InteractiveSessionManager = class _InteractiveSessionManager {
  constructor(openRouterAPI) {
    __publicField(this, "openRouterAPI");
    __publicField(this, "currentMessage");
    __publicField(this, "keypressHandler");
    __publicField(this, "lineHandler");
    __publicField(this, "closeHandler");
    __publicField(this, "rl");
    __publicField(this, "agent");
    __publicField(this, "options");
    this.openRouterAPI = openRouterAPI;
    this.currentMessage = "";
    this.keypressHandler = null;
    this.lineHandler = null;
    this.closeHandler = null;
    this.rl = null;
    this.agent = null;
    this.options = null;
  }
  initialize(rl, agent, options) {
    this.rl = rl;
    this.agent = agent;
    this.options = options;
  }
  setupKeypressHandling() {
    if (!this.rl) return;
    if (process.stdin instanceof tty.ReadStream) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      this.keypressHandler = async (buffer) => {
        const key = buffer.toString();
        if (key === "\x1B") {
          this.openRouterAPI.cancelStream();
          console.log("\nStreaming cancelled.");
          await this.restartSession();
        }
      };
      process.stdin.on("data", this.keypressHandler);
    }
  }
  async restartSession() {
    if (!this.rl) return;
    console.log("Please type your new prompt and press enter...");
    this.rl.prompt();
    if (this.currentMessage) {
      await this.handleInput(this.currentMessage);
    } else {
      this.rl.prompt();
    }
  }
  async handleInput(input) {
    if (!this.rl || !this.agent || !this.options) return;
    if (input.toLowerCase() === "exit") {
      console.log("Goodbye!");
      this.cleanup();
      process.exit(0);
    }
    this.currentMessage = input;
    try {
      const result = await this.agent.execute(input, this.options);
      if (!this.options.stream && result) {
        console.log("\nResponse:", result.response);
        if (result.actions?.length) {
          console.log("\nExecuted Actions:");
          result.actions.forEach(({ action, result: result2 }) => {
            console.log(`
Action: ${action}`);
            console.log(`Result: ${JSON.stringify(result2, null, 2)}`);
          });
        }
      }
    } catch (error) {
      console.error("Error:", error.message);
    }
    this.rl.prompt();
  }
  async start() {
    if (!this.rl) return;
    console.log('Interactive mode started. Type "exit" or press Ctrl+C to quit.');
    this.setupKeypressHandling();
    this.rl.prompt();
    this.lineHandler = async (input) => {
      await this.handleInput(input);
    };
    this.closeHandler = () => {
      this.cleanup();
      process.exit(0);
    };
    this.rl.on("line", this.lineHandler);
    this.rl.on("close", this.closeHandler);
  }
  cleanup() {
    if (this.keypressHandler && process.stdin instanceof tty.ReadStream) {
      process.stdin.removeListener("data", this.keypressHandler);
      process.stdin.setRawMode(false);
    }
    if (this.lineHandler && this.rl) {
      this.rl.removeListener("line", this.lineHandler);
    }
    if (this.closeHandler && this.rl) {
      this.rl.removeListener("close", this.closeHandler);
    }
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    this.agent = null;
    this.options = null;
  }
};
__name(_InteractiveSessionManager, "InteractiveSessionManager");
var InteractiveSessionManager = _InteractiveSessionManager;
InteractiveSessionManager = _ts_decorate52([
  (0, import_tsyringe56.singleton)(),
  _ts_metadata45("design:type", Function),
  _ts_metadata45("design:paramtypes", [
    typeof OpenRouterAPI === "undefined" ? Object : OpenRouterAPI
  ])
], InteractiveSessionManager);

// src/commands/run.ts
var readline = __toESM(require("readline"), 1);
var import_tsyringe57 = require("tsyringe");
var _Run = class _Run extends import_core.Command {
  constructor(argv, config4) {
    super(argv, config4);
    __publicField(this, "configService");
    __publicField(this, "modelManager");
    __publicField(this, "streamHandler");
    __publicField(this, "openRouterAPI");
    __publicField(this, "sessionManager");
    __publicField(this, "rl");
    this.configService = import_tsyringe57.container.resolve(ConfigService);
    this.modelManager = import_tsyringe57.container.resolve(ModelManager);
    this.streamHandler = import_tsyringe57.container.resolve(StreamHandler);
    this.openRouterAPI = import_tsyringe57.container.resolve(OpenRouterAPI);
    this.sessionManager = import_tsyringe57.container.resolve(InteractiveSessionManager);
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "> "
    });
  }
  parseOptions(optionsString) {
    const options = {};
    if (!optionsString) return options;
    const pairs = optionsString.split(",");
    for (const pair of pairs) {
      const [key, value] = pair.trim().split("=");
      if (!key || !value) continue;
      if (value === "true") options[key] = true;
      else if (value === "false") options[key] = false;
      else if (!isNaN(Number(value))) {
        if (value.includes(".")) options[key] = parseFloat(value);
        else options[key] = parseInt(value, 10);
      } else options[key] = value;
    }
    return options;
  }
  async run() {
    const { args, flags } = await this.parse(_Run);
    if (flags.init) {
      this.configService.createDefaultConfig();
      return;
    }
    const config4 = this.configService.getConfig();
    if (!config4.openRouterApiKey) {
      this.error("OpenRouter API key is required. Please add it to crkdrc.json");
    }
    const isInteractive = config4.interactive ?? false;
    if (isInteractive && args.message) {
      this.error("Cannot provide both interactive mode and message argument");
    }
    if (!isInteractive && !args.message) {
      this.error("Must provide either interactive mode or message argument");
    }
    try {
      if (!config4.discoveryModel) {
        throw new Error("Discovery model is required in configuration");
      }
      const options = {
        ...config4,
        options: this.parseOptions(config4.options || ""),
        provider: config4.provider
      };
      if (!Object.values(LLMProviderType).includes(options.provider)) {
        throw new Error(`Invalid provider: ${options.provider}`);
      }
      this.modelManager.setCurrentModel(config4.discoveryModel);
      console.log(`Using ${options.provider} provider and model: ${this.modelManager.getCurrentModel()}`);
      const agent = import_tsyringe57.container.resolve(CrackedAgent);
      this.sessionManager.initialize(this.rl, agent, options);
      if (isInteractive) {
        await this.sessionManager.start();
      } else {
        console.log("Press Enter to start the stream...");
        this.rl.once("line", async () => {
          try {
            const result = await agent.execute(args.message, options);
            if (!options.stream && result) {
              this.log(result.response);
              if (result.actions?.length) {
                this.log("\nExecuted Actions:");
                result.actions.forEach(({ action, result: result2 }) => {
                  this.log(`
Action: ${action}`);
                  this.log(`Result: ${JSON.stringify(result2, null, 2)}`);
                });
              }
            }
            this.sessionManager.cleanup();
            process.exit(0);
          } catch (error) {
            this.sessionManager.cleanup();
            this.error(error.message);
          }
        });
      }
    } catch (error) {
      this.sessionManager.cleanup();
      this.error(error.message);
    }
  }
};
__name(_Run, "Run");
__publicField(_Run, "description", "AI agent for performing operations on local projects");
__publicField(_Run, "examples", [
  "$ run 'Add error handling'",
  "$ run --interactive # Start interactive mode",
  "$ run --init # Initialize configuration"
]);
__publicField(_Run, "flags", {
  init: import_core.Flags.boolean({
    description: "Initialize a default crkdrc.json configuration file",
    exclusive: [
      "interactive"
    ]
  })
});
__publicField(_Run, "args", {
  message: import_core.Args.string({
    description: "Message describing the operation to perform",
    required: false
  })
});
var Run = _Run;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Run
});
//# sourceMappingURL=run.cjs.map