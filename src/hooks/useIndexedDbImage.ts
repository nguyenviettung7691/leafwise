
'use client';

import { useState, useEffect } from 'react';
import { getImage } from '@/lib/idb-helper';

interface UseIndexedDbImageReturn {
  imageUrl: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function useIndexedDbImage(photoId: string | undefined): UseIndexedDbImageReturn {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let currentObjectUrl: string | null = null;

    if (!photoId) {
      setImageUrl(null); // Reset if photoId is undefined (e.g. plant has no primary photo)
      setIsLoading(false);
      setError(null);
      return;
    }
    
    // Prevent fetching if photoId is a data URL or http/https URL
    if (photoId.startsWith('data:') || photoId.startsWith('http')) {
      setImageUrl(photoId);
      setIsLoading(false);
      setError(null);
      return;
    }


    const fetchImage = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const blob = await getImage(photoId);
        if (blob) {
          currentObjectUrl = URL.createObjectURL(blob);
          setImageUrl(currentObjectUrl);
        } else {
          // If blob is not found, it could be an old placeholder or an error
          // For prototype, we can try to show it as is if it looks like a URL
           if (photoId.includes('placehold.co')) {
             setImageUrl(photoId);
           } else {
            console.warn(`Image blob not found for ID: ${photoId}, and it's not a known placeholder.`);
            setImageUrl(null); // Or a specific "not found" image URL
            // setError(new Error('Image not found in IndexedDB'));
           }
        }
      } catch (e: any) {
        console.error(`Failed to load image ${photoId} from IndexedDB:`, e);
        setError(e);
        setImageUrl(null); // Or a fallback error image URL
      } finally {
        setIsLoading(false);
      }
    };

    fetchImage();

    return () => {
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [photoId]);

  return { imageUrl, isLoading, error };
}
