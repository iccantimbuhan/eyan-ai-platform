export interface SaveFileInput {
  buffer: Buffer;
  projectId: string;
  extension: string;
}

export interface SavedFile {
  path: string;
  url: string;
  bytes: number;
}

export interface StorageProvider {
  save(input: SaveFileInput): Promise<SavedFile>;

  delete(path: string): Promise<void>;

  getUrl(path: string): string;
}
