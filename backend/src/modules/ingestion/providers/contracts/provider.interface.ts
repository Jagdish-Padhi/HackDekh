export interface IngestionResult {
  ok: boolean;
  count: number;
  data: any[];
}

export interface IngestionProvider {
  readonly name: string;
  fetchAndSave(): Promise<IngestionResult>;
}
