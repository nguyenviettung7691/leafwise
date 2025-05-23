
// src/lib/idb-helper.ts

const DB_NAME = 'LeafWiseDB';
const DB_VERSION = 1;
const IMAGE_STORE_NAME = 'plantImages';

interface IDBTransactionResult<T> {
  error?: DOMException | null;
  result?: T;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      console.error("IndexedDB not supported by this browser.");
      reject(new Error("IndexedDB not supported"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        db.createObjectStore(IMAGE_STORE_NAME); // Key will be the photoId (string)
      }
    };
  });
}

export async function addImage(photoId: string, imageBlob: Blob): Promise<IDBTransactionResult<IDBValidKey>> {
  try {
    const db = await openDB();
    const transaction = db.transaction(IMAGE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = store.put(imageBlob, photoId);

    return new Promise((resolve) => {
      request.onsuccess = () => resolve({ result: request.result });
      request.onerror = () => {
        console.error('Error adding image to IndexedDB:', request.error);
        resolve({ error: request.error });
      };
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => {
        console.error('Transaction error adding image to IndexedDB:', transaction.error);
        resolve({ error: transaction.error });
         db.close();
      };
    });
  } catch (error: any) {
    console.error('Failed to open DB for adding image:', error);
    return { error };
  }
}

export async function getImage(photoId: string): Promise<Blob | undefined> {
  try {
    const db = await openDB();
    const transaction = db.transaction(IMAGE_STORE_NAME, 'readonly');
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = store.get(photoId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result as Blob | undefined);
      };
      request.onerror = () => {
        console.error('Error fetching image from IndexedDB:', request.error);
        reject(request.error);
      };
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => {
         console.error('Transaction error fetching image from IndexedDB:', transaction.error);
         reject(transaction.error);
         db.close();
      };
    });
  } catch (error) {
    console.error('Failed to open DB for getting image:', error);
    return undefined;
  }
}

export async function deleteImage(photoId: string): Promise<IDBTransactionResult<void>> {
  try {
    const db = await openDB();
    const transaction = db.transaction(IMAGE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = store.delete(photoId);

    return new Promise((resolve) => {
      request.onsuccess = () => resolve({});
      request.onerror = () => {
        console.error('Error deleting image from IndexedDB:', request.error);
        resolve({ error: request.error });
      };
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => {
        console.error('Transaction error deleting image:', transaction.error);
        resolve({ error: transaction.error });
        db.close();
      };
    });
  } catch (error: any) {
    console.error('Failed to open DB for deleting image:', error);
    return { error };
  }
}


export async function clearPlantImages(): Promise<IDBTransactionResult<void>> {
  try {
    const db = await openDB();
    const transaction = db.transaction(IMAGE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = store.clear();

    return new Promise((resolve) => {
      request.onsuccess = () => resolve({});
      request.onerror = () => {
        console.error('Error clearing plant images from IndexedDB:', request.error);
        resolve({ error: request.error });
      };
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => {
        console.error('Transaction error clearing images:', transaction.error);
        resolve({error: transaction.error});
        db.close();
      };
    });
  } catch (error: any) {
    console.error('Failed to open DB for clearing images:', error);
    return { error };
  }
}
