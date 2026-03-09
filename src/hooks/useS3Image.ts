
'use client';

import { useState, useEffect } from 'react';
import { getS3Config } from '@/lib/awsConfig';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3ClientWithCredentials } from '@/lib/s3Utils';
import { useAuth } from '@/contexts/AuthContext';

const s3Config = getS3Config();

const TOKEN_STORAGE_KEY = 'cognito_tokens';

function getIdToken(): string | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!stored) return null;
  try {
    const tokens = JSON.parse(stored);
    return tokens?.idToken ?? null;
  } catch {
    return null;
  }
}

interface UseS3ImageReturn {
  imageUrl: string | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Generates a signed S3 URL using AWS SDK v3 presigner with Cognito credentials
 * The signed URL is valid for 1 hour (3600 seconds) and includes SigV4 authorization
 * 
 * @param photoKey - S3 object key (e.g., 'avatars/{userId}/avatar-123.jpg')
 * @param idToken - Cognito ID token for obtaining temporary AWS credentials
 * @returns Signed URL string that can be used directly in img src
 * @throws Error if signing fails or credentials are missing
 */
async function generateSignedUrl(photoKey: string, idToken: string): Promise<string> {
  try {
    const s3Client = await createS3ClientWithCredentials(idToken);
    
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
        const idToken = getIdToken();
        if (!idToken) {
          throw new Error('No ID token available. User must be authenticated.');
        }
        // Generate signed URL using AWS SDK v3 with Cognito credentials
        const signedUrl = await generateSignedUrl(photoKey, idToken);
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