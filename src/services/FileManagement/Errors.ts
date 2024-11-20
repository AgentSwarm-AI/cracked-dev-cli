export class FileNotFoundError extends Error {
      constructor(path: string) {
        super(`File not found: ${path}`);
        this.name = "FileNotFoundError";
      }
    }

    export class FileReadError extends Error {
      constructor(path: string, message: string) {
        super(`Failed to read file: ${path} - ${message}`);
        this.name = "FileReadError";
      }
    }

    export class InvalidFileError extends Error {
      constructor(path: string) {
        super(`Instructions path must be a file: ${path}`);
        this.name = "InvalidFileError";
      }
    }