export interface IFileStats {
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  isDirectory: boolean;
  path: string;
}

export interface IFileOperationResult {
  success: boolean;
  error?: Error;
  data?: IFileStats | string | void;
}

export interface IFileSearchResult {
  path: string;
  matches: Array<{
    line: number;
    content: string;
  }>;
}

export interface IFileOperations {
  read(path: string): Promise<IFileOperationResult>;
  write(path: string, content: string | Buffer): Promise<IFileOperationResult>;
  delete(path: string): Promise<IFileOperationResult>;
  copy(source: string, destination: string): Promise<IFileOperationResult>;
  move(source: string, destination: string): Promise<IFileOperationResult>;
  exists(path: string): Promise<boolean>;
  stats(path: string): Promise<IFileOperationResult>;
}

export interface IFileSearch {
  findByPattern(
    pattern: string,
    directory: string,
  ): Promise<IFileSearchResult[]>;
  findByContent(
    content: string,
    directory: string,
  ): Promise<IFileSearchResult[]>;
  findByName(name: string, directory: string): Promise<string[]>;
}

export interface IDirectoryScanner {
  scan(directory: string, options: IScanOptions): Promise<string>;
}

export interface IScanOptions {
  maxDepth?: number;
  exclude?: string[];
  includeFiles?: boolean;
  includeDirs?: boolean;
  pattern?: string;
}
