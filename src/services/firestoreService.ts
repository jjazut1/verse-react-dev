import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const db = getFirestore();
const auth = getAuth();

export function setupFirestoreListener({
  collectionName,
  onSuccess,
  onError,
}: {
  collectionName: string;
  onSuccess: (data: any[]) => void;
  onError?: (error: Error) => void;
}) {
  const user = auth.currentUser;

  if (!user) {
    console.warn('[Firestore] Listener skipped: no authenticated user');
    return;
  }

  user.getIdToken(true).then(() => {
    try {
      const unsubscribe = onSnapshot(
        collection(db, collectionName),
        (snapshot) => {
          const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          onSuccess(docs);
        },
        (error) => {
          console.error('[Firestore] Listener failed:', error);
          if (onError) onError(error);
        }
      );

      return unsubscribe;
    } catch (err: any) {
      console.error('[Firestore] Exception during listener setup:', err);
      if (onError) onError(err);
    }
  });
} 