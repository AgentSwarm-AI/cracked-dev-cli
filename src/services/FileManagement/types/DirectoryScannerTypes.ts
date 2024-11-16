import { IFileOperationResult } from "./FileManagementTypes";

export interface TreeResult {
  name: string;
  size: number;
  type: string;
  children?: TreeResult[];
}

export interface IDirectoryScanner {
  scan(
    path: string,
    options?: Partial<TreeOptions>,
  ): Promise<IFileOperationResult>;
  scanLight(path: string): Promise<IFileOperationResult>;
}

export interface TreeOptions {
  ignore?: string[];
  allFiles?: boolean;
  maxDepth?: number;
  noreport?: boolean;
  base?: string;
  directoryFirst?: boolean;
}
