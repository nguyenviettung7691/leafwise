import { CognitoJwtVerifier } from 'aws-jwt-verify';

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function getVerifier() {
  if (!verifier) {
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    if (!userPoolId) {
      throw new Error('COGNITO_USER_POOL_ID environment variable is not set');
    }
    verifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: 'id',
      clientId: null, // Accept tokens from any client in this user pool
    });
  }
  return verifier;
}

export interface JwtPayload {
  sub: string;
  email?: string;
  [key: string]: unknown;
}

/**
 * Validates a Cognito ID token (raw JWT, no "Bearer" prefix).
 * Returns the decoded payload on success, or throws on failure.
 */
export async function validateToken(token: string): Promise<JwtPayload> {
  const v = getVerifier();
  const payload = await v.verify(token);
  return payload as JwtPayload;
}
