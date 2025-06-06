
'use client';

import { useState, useEffect } from 'react';
import { getUrl } from 'aws-amplify/storage';

interface UseS3ImageReturn {
  imageUrl: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function useS3Image(photoKey: string | undefined, userId?: string | undefined): UseS3ImageReturn {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!photoKey || !userId) {
      setImageUrl(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Handle data URLs or HTTP URLs directly
    if (photoKey.startsWith('data:') || photoKey.startsWith('http')) {
      setImageUrl(photoKey);
      setIsLoading(false);
      setError(null);
      return;
    }

    const fetchImage = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { url } = await getUrl({ path: photoKey });

        setImageUrl(url.toString());

      } catch (e: any) {
        console.error(`Failed to load image ${photoKey} from S3 for user ${userId}:`, e);
        setError(e);
        setImageUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImage();
  }, [photoKey, userId]);

  return { imageUrl, isLoading, error };
}