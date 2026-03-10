
'use client';

import { useState, useEffect } from 'react';
import { getS3Config } from '@/lib/awsConfig';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3ClientWithCredentials } from '@/lib/s3Utils';
import { useAuth } from '@/contexts/AuthContext';

const s3Config = getS3Config();

const TOKEN_STORAGE_KEY = 'cognito_tokens';

/** Presigned URL cache TTL in milliseconds (50 minutes).
 *  Presigned URLs are valid for 1 hour (3600 s); we cache for 50 min
 *  to avoid serving URLs that are about to expire. */
const URL_CACHE_TTL_MS = 50 * 60 * 1000;

interface CachedUrl {
  url: string;
  expiresAt: number;
}

/** Module-level cache: S3 key → presigned URL with expiration */
const urlCache = new Map<string, CachedUrl>();

/**
 * Invalidate all cached presigned URLs.
 * Call this on logout or when credentials change.
 */
export function invalidatePresignedUrlCache(): void {
  urlCache.clear();
}

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
 * Generates a signed S3 URL using AWS SDK v3 presigner with Cognito credentials.
 * Results are cached for 50 minutes (out of the 1-hour presigned URL validity)
 * to avoid redundant Cognito credential requests and URL signing.
 * 
 * @param photoKey - S3 object key (e.g., 'avatars/{userId}/avatar-123.jpg')
 * @param idToken - Cognito ID token for obtaining temporary AWS credentials
 * @returns Signed URL string that can be used directly in img src
 * @throws Error if signing fails or credentials are missing
 */
async function generateSignedUrl(photoKey: string, idToken: string): Promise<string> {
  // Check URL cache first
  const cached = urlCache.get(photoKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.url;
  }

  try {
    const s3Client = await createS3ClientWithCredentials(idToken);
    
    const command = new GetObjectCommand({
      Bucket: s3Config.bucketName,
      Key: photoKey,
    });

    // Generate signed URL valid for 1 hour (3600 seconds)
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Cache the signed URL for 50 minutes
    urlCache.set(photoKey, {
      url: signedUrl,
      expiresAt: Date.now() + URL_CACHE_TTL_MS,
    });
    
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
      } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
        console.error(
          `Failed to load image ${photoKey} from S3 for user ${userId}:`,
          err
        );
        setError(err);
        setImageUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignedUrl();
  }, [photoKey, userId, user]); // Include 'user' to refresh signed URL when user changes

  return { imageUrl, isLoading, error };
}