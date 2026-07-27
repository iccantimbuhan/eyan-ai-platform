export interface PublishRequest {
  projectId: string;
  assetType: string;
  sourceId: string;
  title: string;
  body: string;
  mediaUrl?: string;
}

export interface PublishResult {
  externalId: string;
  externalUrl: string;
}

export interface PlatformProvider {
  readonly name: string;

  publish(request: PublishRequest): Promise<PublishResult>;
}
