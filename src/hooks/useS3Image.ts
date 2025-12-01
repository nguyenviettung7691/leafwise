
'use client';

import { useState, useEffect } from 'react';
import { getS3Config } from '@/lib/awsConfig';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { useAuth } from '@/contexts/AuthContext';

const s3Config = getS3Config();

interface UseS3ImageReturn {
  imageUrl: string | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Generates a signed S3 URL using AWS SDK v3 presigner
 * The signed URL is valid for 1 hour (3600 seconds) and includes SigV4 authorization
 * 
 * @param photoKey - S3 object key (e.g., 'avatars/{userId}/avatar-123.jpg')
 * @returns Signed URL string that can be used directly in img src
 * @throws Error if signing fails or config is missing
 */
async function generateSignedUrl(photoKey: string): Promise<string> {
  try {
    const s3Client = new S3Client({ region: s3Config.region });
    
    const command = new GetObjectCommand({
      Bucket: s3Config.bucketName,
      Key: photoKey,
    });

    // Generate signed URL valid for 1 hour (3600 seconds)
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    return signedUrl;
  } catch (error) {
    console.error(`Failed to generate signed URL for key ${photoKey}:`, error);
    throw error;
  }
}

export function useS3Image(
  photoKey: string | undefined,
  userId?: string | undefined
): UseS3ImageReturn {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth(); // Get current user to trigger refresh on auth changes

  useEffect(() => {
    // Early exit if photoKey or userId is missing
    if (!photoKey || !userId) {
      setImageUrl(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Handle data URLs or HTTP URLs directly (bypass S3 signing)
    if (photoKey.startsWith('data:') || photoKey.startsWith('http')) {
      setImageUrl(photoKey);
      setIsLoading(false);
      setError(null);
      return;
    }

    const fetchSignedUrl = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Generate signed URL using AWS SDK v3
        const signedUrl = await generateSignedUrl(photoKey);
        setImageUrl(signedUrl);
      } catch (e: any) {
        console.error(
          `Failed to load image ${photoKey} from S3 for user ${userId}:`,
          e
        );
        setError(e);
        setImageUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignedUrl();
  }, [photoKey, userId, user]); // Include 'user' to refresh signed URL when user changes

  return { imageUrl, isLoading, error };
}