import { FileSearch } from '../FileSearch';
import { DebugLogger } from '@services/logging/DebugLogger';
import path from 'path';
import fs from 'fs-extra';

const mockDebugLogger = new DebugLogger();

afterEach(() => {
  jest.clearAllMocks();
});

describe('FileSearch', () => {
  const testDir = path.join(__dirname, 'test-files');

  beforeAll(async () => {
    await fs.ensureDir(testDir);
    await fs.writeFile(path.join(testDir, 'test1.txt'), 'This is a test file with searchable content');
    await fs.writeFile(path.join(testDir, 'test2.txt'), 'Another test file with different content');
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  it('should search files correctly by content', async () => {
    const fileSearch = new FileSearch(mockDebugLogger);
    const result = await fileSearch.findByContent('searchable content', testDir);
    expect(result).toHaveLength(1);
    expect(result[0].matches[0].content).toContain('searchable content');
  });

  it('should return an empty array if no files match by content', async () => {
    const fileSearch = new FileSearch(mockDebugLogger);
    const result = await fileSearch.findByContent('xyz123uniquenonexistentstring', testDir);
    expect(result).toEqual([]);
  });

  it('should find multiple files with matching content', async () => {
    const fileSearch = new FileSearch(mockDebugLogger);
    const result = await fileSearch.findByContent('test file', testDir);
    expect(result).toHaveLength(2);
    expect(result[0].matches[0].content).toContain('test file');
    expect(result[1].matches[0].content).toContain('test file');
  });
});