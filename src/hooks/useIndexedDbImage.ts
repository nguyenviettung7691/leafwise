
'use client';

import { useState, useEffect } from 'react';
import { getImage as getIDBImage } from '@/lib/idb-helper'; // Renamed to avoid conflict

interface UseIndexedDbImageReturn {
  imageUrl: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function useIndexedDbImage(photoId: string | undefined, userId?: string | undefined): UseIndexedDbImageReturn {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let currentObjectUrl: string | null = null;

    if (!photoId || !userId) { // Check for userId as well
      setImageUrl(null); 
      setIsLoading(false);
      setError(null);
      return;
    }
    
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
        const blob = await getIDBImage(userId, photoId); // Pass userId
        if (blob) {
          currentObjectUrl = URL.createObjectURL(blob);
          setImageUrl(currentObjectUrl);
        } else {
           if (photoId.includes('placehold.co')) {
             setImageUrl(photoId);
           } else {
            console.warn(`Image blob not found for ID: ${photoId} for user ${userId}, and it's not a known placeholder.`);
            setImageUrl(null); 
           }
        }
      } catch (e: any) {
        console.error(`Failed to load image ${photoId} from IndexedDB for user ${userId}:`, e);
        setError(e);
        setImageUrl(null); 
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
  }, [photoId, userId]); // Add userId to dependencies

  return { imageUrl, isLoading, error };
}
