'use client';

import { getS3Config, getCognitoConfig } from '@/lib/awsConfig';
import { 
  S3Client, 
  PutObjectCommand, 
  DeleteObjectCommand, 
  DeleteObjectsCommand 
} from '@aws-sdk/client-s3';
import { 
  CognitoIdentityClient, 
  GetIdCommand,
  GetCredentialsForIdentityCommand
} from '@aws-sdk/client-cognito-identity';

const s3Config = getS3Config();
const cognitoConfig = getCognitoConfig();

/**
 * Get Cognito Identity ID from ID token
 * Required for obtaining temporary AWS credentials
 * 
 * @param idToken - Cognito ID token
 * @returns Cognito Identity ID
 */
async function getCognitoIdentityId(idToken: string): Promise<string> {
  const cognitoIdentityClient = new CognitoIdentityClient({
    region: cognitoConfig.region,
  });

  const response = await cognitoIdentityClient.send(
    new GetIdCommand({
      IdentityPoolId: cognitoConfig.identityPoolId,
      Logins: {
        [`cognito-idp.${cognitoConfig.region}.amazonaws.com/${cognitoConfig.userPoolId}`]: idToken,
      },
    })
  );

  if (!response.IdentityId) {
    throw new Error('Failed to get Cognito Identity ID');
  }

  return response.IdentityId;
}

/**
 * Get temporary AWS credentials from Cognito Identity
 * These credentials are used to authenticate S3 operations
 * 
 * @param idToken - Cognito ID token
 * @param identityId - Cognito Identity ID
 * @returns AWS temporary credentials (AccessKeyId, SecretKey, SessionToken)
 */
async function getCognitoIdentityCredentials(
  idToken: string,
  identityId: string
): Promise<{ AccessKeyId: string; SecretKey: string; SessionToken: string }> {
  const cognitoIdentityClient = new CognitoIdentityClient({
    region: cognitoConfig.region,
  });

  const response = await cognitoIdentityClient.send(
    new GetCredentialsForIdentityCommand({
      IdentityId: identityId,
      Logins: {
        [`cognito-idp.${cognitoConfig.region}.amazonaws.com/${cognitoConfig.userPoolId}`]: idToken,
      },
    })
  );

  if (!response.Credentials) {
    throw new Error('Failed to get temporary credentials from Cognito Identity');
  }

  return {
    AccessKeyId: response.Credentials.AccessKeyId || '',
    SecretKey: response.Credentials.SecretKey || '',
    SessionToken: response.Credentials.SessionToken || '',
  };
}

/**
 * Create S3Client with Cognito Identity credentials
 * Uses temporary AWS credentials obtained from Cognito Identity Pool
 * 
 * @param idToken - Cognito ID token for authentication
 * @returns Configured S3Client instance with temporary credentials
 */
async function createS3ClientWithCredentials(idToken: string): Promise<S3Client> {
  try {
    const identityId = await getCognitoIdentityId(idToken);
    const credentials = await getCognitoIdentityCredentials(idToken, identityId);

    return new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: credentials.AccessKeyId,
        secretAccessKey: credentials.SecretKey,
        sessionToken: credentials.SessionToken,
      },
    });
  } catch (error) {
    console.error('Failed to create S3Client with credentials:', error);
    throw error;
  }
}

/**
 * Upload a single file to S3 using PutObjectCommand
 * Uses Cognito Identity credentials for secure, authenticated access
 * 
 * @param key - S3 object key (e.g., 'plants/{identityId}/photo-123.jpg')
 * @param file - File object to upload
 * @param idToken - Cognito ID token for authentication
 * @returns Uploaded S3 key
 * @throws Error if upload fails or credentials are invalid
 */
export async function uploadFile(
  key: string,
  file: File,
  idToken: string
): Promise<string> {
  if (!idToken) {
    throw new Error('ID token required for S3 upload. User must be authenticated.');
  }

  try {
    const s3Client = await createS3ClientWithCredentials(idToken);

    const command = new PutObjectCommand({
      Bucket: s3Config.bucketName,
      Key: key,
      Body: file,
      ContentType: file.type,
    });

    await s3Client.send(command);
    return key;
  } catch (error) {
    console.error(`Failed to upload file to S3 key ${key}:`, error);
    throw error;
  }
}

/**
 * Delete a single file from S3
 * Uses Cognito Identity credentials for secure, authenticated access
 * 
 * @param key - S3 object key to delete
 * @param idToken - Cognito ID token for authentication
 * @throws Error if deletion fails or credentials are invalid
 */
export async function deleteFile(key: string, idToken: string): Promise<void> {
  if (!idToken) {
    throw new Error('ID token required for S3 delete. User must be authenticated.');
  }

  try {
    const s3Client = await createS3ClientWithCredentials(idToken);

    const command = new DeleteObjectCommand({
      Bucket: s3Config.bucketName,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error(`Failed to delete file from S3 key ${key}:`, error);
    throw error;
  }
}

/**
 * Delete multiple files from S3 in a single batch operation
 * Uses Cognito Identity credentials for secure, authenticated access
 * More efficient than individual delete calls for multiple objects
 * 
 * @param keys - Array of S3 object keys to delete
 * @param idToken - Cognito ID token for authentication
 * @throws Error if deletion fails or credentials are invalid
 */
export async function deleteMultipleFiles(
  keys: string[],
  idToken: string
): Promise<void> {
  if (keys.length === 0) return;

  if (!idToken) {
    throw new Error('ID token required for S3 delete. User must be authenticated.');
  }

  try {
    const s3Client = await createS3ClientWithCredentials(idToken);

    const command = new DeleteObjectsCommand({
      Bucket: s3Config.bucketName,
      Delete: {
        Objects: keys.map(key => ({ Key: key })),
      },
    });

    await s3Client.send(command);
  } catch (error) {
    console.error(`Failed to delete multiple files from S3:`, error);
    throw error;
  }
}