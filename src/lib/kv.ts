import type { Env, DocIndex, DocMeta } from '../types.js';

export async function getIndex(kv: KVNamespace): Promise<DocIndex> {
  const raw = await kv.get('index:all');
  if (!raw) return { docs: [], categories: [], lastUpdated: '' };
  return JSON.parse(raw);
}

export async function getDoc(kv: KVNamespace, path: string): Promise<string | null> {
  return kv.get(`doc:${path}`);
}

export async function getCsGuide(kv: KVNamespace): Promise<string | null> {
  return kv.get('cs-guide');
}

export async function getDocsByCategory(kv: KVNamespace, category: string): Promise<DocMeta[]> {
  const raw = await kv.get(`index:category:${category}`);
  if (!raw) return [];
  return JSON.parse(raw);
}

export async function getSdkVersions(kv: KVNamespace): Promise<Record<string, string>> {
  const raw = await kv.get('meta:sdk-versions');
  if (!raw) return {};
  return JSON.parse(raw);
}
