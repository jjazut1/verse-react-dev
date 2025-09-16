import { db, auth } from '../config/firebase';
import { addDoc, doc, getDoc, Timestamp } from 'firebase/firestore';

export interface GenerateItemsParams {
  prompt: string;
  count: number;
  mode?: 'items' | 'sentences' | 'word_defs';
}

export async function generateCategoryItems(params: GenerateItemsParams): Promise<any[]> {
  // Firestore-triggered flow to avoid CORS
  // 1) write request doc
  const requestRef = await addDoc((await import('firebase/firestore')).collection(db, 'categoryGenRequests'), {
    prompt: params.prompt,
    count: params.count,
    mode: params.mode || 'items',
    uid: auth.currentUser?.uid || null,
    timestamp: Timestamp.now(),
  } as any);

  const resultRef = doc(db, 'categoryGenResults', requestRef.id);

  // 2) poll for result (simple client-side wait)
  const start = Date.now();
  const timeoutMs = 45000; // allow cold starts
  // eslint-disable-next-line no-console
  console.log('[CategoryGen] requestId:', requestRef.id, 'prompt:', params.prompt, 'count:', params.count, 'mode:', params.mode || 'items');
  while (Date.now() - start < timeoutMs) {
    const snap = await getDoc(resultRef);
    if (snap.exists()) {
      const data: any = snap.data();
      if (data.success && Array.isArray(data.items)) {
        return data.items as string[];
      }
      throw new Error(data?.error || 'Generation failed');
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Generation timeout');
}


