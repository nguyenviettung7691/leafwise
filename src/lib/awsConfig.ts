/**
 * AWS Configuration Module
 *
 * Centralizes all AWS service configuration (Cognito, AppSync, S3)
 * that was previously provided by amplify_outputs.json.
 *
 * Environment variables (prefixed with REACT_APP_) are loaded at build time
 * and must be set in:
 * - Development: .env.local (git-ignored)
 * - Production: AWS Amplify Console → Environment variables
 */

/**
 * Type definition for AWS configuration
 */
export interface AWSConfig {
  cognito: {
    /** AWS region where Cognito user pool is deployed (e.g., 'us-east-1') */
    region: string;
    /** Cognito User Pool ID (format: region_alphanumeric, e.g., 'us-east-1_xxxxx') */
    userPoolId: string;
    /** Cognito App Client ID (long alphanumeric string) */
    clientId: string;
    /** Cognito Identity Pool ID (format: region:uuid) for federated identity */
    identityPoolId: string;
  };
  appSync: {
    /** AppSync GraphQL endpoint URL (https://xxx.appsync-api.region.amazonaws.com/graphql) */
    endpoint: string;
  };
  s3: {
    /** S3 bucket name for storing plant images, avatars, etc. */
    bucketName: string;
    /** AWS region where S3 bucket is deployed (e.g., 'us-east-1') */
    region: string;
  };
}

/**
 * Validates that all required environment variables are present.
 * Throws an error with helpful message if any are missing.
 *
 * @throws {Error} If any required environment variables are missing
 */
function validateEnvVars(): void {
  const requiredVars: (keyof NodeJS.ProcessEnv)[] = [
    'REACT_APP_COGNITO_REGION',
    'REACT_APP_COGNITO_USER_POOL_ID',
    'REACT_APP_COGNITO_CLIENT_ID',
    'REACT_APP_COGNITO_IDENTITY_POOL_ID',
    'REACT_APP_APPSYNC_ENDPOINT',
    'REACT_APP_S3_BUCKET_NAME',
    'REACT_APP_S3_REGION',
  ];

  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    const missingList = missing.join(', ');
    throw new Error(
      `[AWS Config] Missing required environment variables:\n${missingList}\n\n` +
        `Please ensure these variables are set in:\n` +
        `- Development: .env.local (in project root)\n` +
        `- Production: AWS Amplify Console → Environment variables\n\n` +
        `See src/lib/awsConfig.ts for documentation.`
    );
  }
}

/**
 * Loads and validates AWS configuration from environment variables.
 * Called once at module initialization.
 *
 * @returns {AWSConfig} Configuration object for all AWS services
 * @throws {Error} If validation fails (missing environment variables)
 */
function loadConfig(): AWSConfig {
  try {
    validateEnvVars();

    return {
      cognito: {
        region: process.env.REACT_APP_COGNITO_REGION!,
        userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID!,
        clientId: process.env.REACT_APP_COGNITO_CLIENT_ID!,
        identityPoolId: process.env.REACT_APP_COGNITO_IDENTITY_POOL_ID!,
      },
      appSync: {
        endpoint: process.env.REACT_APP_APPSYNC_ENDPOINT!,
      },
      s3: {
        bucketName: process.env.REACT_APP_S3_BUCKET_NAME!,
        region: process.env.REACT_APP_S3_REGION!,
      },
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
}

/**
 * Singleton AWS configuration instance.
 * Loaded once at module initialization from environment variables.
 *
 * Usage:
 * ```typescript
 * import { awsConfig } from '@/lib/awsConfig';
 *
 * const cognitoRegion = awsConfig.cognito.region;
 * const s3Bucket = awsConfig.s3.bucketName;
 * ```
 */
export const awsConfig = loadConfig();

/**
 * Helper function to get Cognito configuration
 * Useful for creating Cognito SDK clients
 *
 * @returns {AWSConfig['cognito']} Cognito configuration object
 */
export function getCognitoConfig(): AWSConfig['cognito'] {
  return awsConfig.cognito;
}

/**
 * Helper function to get AppSync configuration
 * Useful for creating Apollo client or GraphQL client
 *
 * @returns {AWSConfig['appSync']} AppSync configuration object
 */
export function getAppSyncConfig(): AWSConfig['appSync'] {
  return awsConfig.appSync;
}

/**
 * Helper function to get S3 configuration
 * Useful for creating S3 SDK client
 *
 * @returns {AWSConfig['s3']} S3 configuration object
 */
export function getS3Config(): AWSConfig['s3'] {
  return awsConfig.s3;
}

/**
 * Gets the full Cognito User Pool endpoint URL
 * Useful for constructing Cognito-related URLs
 *
 * Format: https://cognito-idp.{region}.amazonaws.com/
 *
 * @returns {string} Cognito endpoint URL
 */
export function getCognitoEndpoint(): string {
  return `https://cognito-idp.${awsConfig.cognito.region}.amazonaws.com`;
}

/**
 * Gets the S3 bucket endpoint URL
 * Useful for constructing direct S3 URLs
 *
 * Format: https://{bucket}.s3.{region}.amazonaws.com
 *
 * @returns {string} S3 bucket endpoint URL
 */
export function getS3BucketEndpoint(): string {
  return `https://${awsConfig.s3.bucketName}.s3.${awsConfig.s3.region}.amazonaws.com`;
}