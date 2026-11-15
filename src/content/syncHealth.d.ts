export type SyncHealth = { at: number; ok: boolean; lastSuccessAt: number };
export function toSyncHealth(runs: unknown, now?: number): SyncHealth | null;
