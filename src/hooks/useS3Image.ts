
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
    // photoKey is now the S3 key
    if (!photoKey || !userId) { // userId might not be strictly needed for public/protected access, but good practice for scoping
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
        // Use Storage.getUrl to get a temporary URL for the S3 object
        // Assuming default access level 'guest' or 'protected' based on your Amplify Storage setup
        // If using 'protected', the key should be 'protected/userId/photoKey'
        // If using 'private', the key should be 'private/userId/photoKey'
        // For simplicity in this prototype, let's assume 'protected' and the key includes the user ID path.
        // You might need to adjust the key path based on your Storage configuration.
        // Let's assume the key stored in the model is the full path, e.g., 'protected/user123/photo-abc.webp'
        const { url } = await getUrl({ key: photoKey, options: { accessLevel: 'protected' } }); // Adjust accessLevel if needed

        setImageUrl(url.toString()); // Convert URL object to string

      } catch (e: any) {
        console.error(`Failed to load image ${photoKey} from S3 for user ${userId}:`, e);
        setError(e);
        setImageUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImage();
  }, [photoKey, userId]); // Add userId to dependencies

  return { imageUrl, isLoading, error };
}