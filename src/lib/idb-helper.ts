
// src/lib/idb-helper.ts

const DB_NAME_PREFIX = 'LeafWiseDB_'; // Prefix for user-specific databases
const DB_VERSION = 1;
const IMAGE_STORE_NAME = 'plantImages';

interface IDBTransactionResult<T> {
  error?: DOMException | null;
  result?: T;
}

function openDB(userId: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!userId) {
      // console.error("User ID is required to open IndexedDB.");
      reject(new Error("User ID is required"));
      return;
    }
    if (!('indexedDB' in window)) {
      // console.error("IndexedDB not supported by this browser.");
      reject(new Error("IndexedDB not supported"));
      return;
    }

    const dbName = `${DB_NAME_PREFIX}${userId}`;
    const request = indexedDB.open(dbName, DB_VERSION);

    request.onerror = (event) => {
      console.error(`IndexedDB error for user ${userId}:`, (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        db.createObjectStore(IMAGE_STORE_NAME); 
      }
    };
  });
}

export async function addImage(userId: string, photoId: string, imageBlob: Blob): Promise<IDBTransactionResult<IDBValidKey>> {
  if (!userId) return { error: new DOMException("User ID is required", "DataError") };
  try {
    const db = await openDB(userId);
    const transaction = db.transaction(IMAGE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = store.put(imageBlob, photoId);

    return new Promise((resolve) => {
      request.onsuccess = () => resolve({ result: request.result });
      request.onerror = (dbEvent) => {
        console.error('Error adding image to IndexedDB:', (dbEvent.target as IDBRequest).error);
        resolve({ error: (dbEvent.target as IDBRequest).error });
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

export async function getImage(userId: string, photoId: string): Promise<Blob | undefined> {
  if (!userId) {
    // console.warn("getImage called without userId");
    return undefined;
  }
  try {
    const db = await openDB(userId);
    const transaction = db.transaction(IMAGE_STORE_NAME, 'readonly');
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = store.get(photoId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result as Blob | undefined);
      };
      request.onerror = (dbEvent) => {
        console.error('Error fetching image from IndexedDB:', (dbEvent.target as IDBRequest).error);
        reject((dbEvent.target as IDBRequest).error);
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

export async function deleteImage(userId: string, photoId: string): Promise<IDBTransactionResult<void>> {
  if (!userId) return { error: new DOMException("User ID is required", "DataError") };
  try {
    const db = await openDB(userId);
    const transaction = db.transaction(IMAGE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = store.delete(photoId);

    return new Promise((resolve) => {
      request.onsuccess = () => resolve({});
      request.onerror = (dbEvent) => {
        console.error('Error deleting image from IndexedDB:', (dbEvent.target as IDBRequest).error);
        resolve({ error: (dbEvent.target as IDBRequest).error });
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


export async function clearPlantImages(userId: string): Promise<IDBTransactionResult<void>> {
  if (!userId) return { error: new DOMException("User ID is required", "DataError") };
  try {
    const db = await openDB(userId);
    const transaction = db.transaction(IMAGE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = store.clear();

    return new Promise((resolve) => {
      request.onsuccess = () => resolve({});
      request.onerror = (dbEvent) => {
        console.error('Error clearing plant images from IndexedDB:', (dbEvent.target as IDBRequest).error);
        resolve({ error: (dbEvent.target as IDBRequest).error });
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

// Utility to convert data URL to Blob
export function dataURLtoBlob(dataurl: string): Blob | null {
  if (!dataurl || !dataurl.includes(',')) {
    console.error('Invalid data URL for blob conversion');
    return null;
  }
  try {
    const arr = dataurl.split(',');
    if (arr.length < 2) return null;
    
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || mimeMatch.length < 2) return null;
    const mime = mimeMatch[1];
    
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
  } catch (e) {
    console.error("Error converting data URL to Blob:", e);
    return null;
  }
}
