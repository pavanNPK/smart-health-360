import { SystemSetting, INSPECTION_MODE_KEY } from '../models/SystemSetting';

let cached: boolean | null = null;
const TTL_MS = 60 * 1000; // 1 minute
let cacheExpiry = 0;

export async function getInspectionMode(): Promise<boolean> {
  if (cached !== null && Date.now() < cacheExpiry) return cached;
  const doc = await SystemSetting.findOne({ key: INSPECTION_MODE_KEY }).lean();
  cached = doc?.value === true;
  cacheExpiry = Date.now() + TTL_MS;
  return cached ?? false;
}

export function invalidateInspectionModeCache(): void {
  cached = null;
}

export async function setInspectionMode(value: boolean, userId: string): Promise<void> {
  await SystemSetting.findOneAndUpdate(
    { key: INSPECTION_MODE_KEY },
    { $set: { value, updatedBy: userId } },
    { upsert: true, new: true }
  );
  invalidateInspectionModeCache();
}
