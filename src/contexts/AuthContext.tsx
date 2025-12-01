"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { getCognitoConfig } from '@/lib/awsConfig';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  UpdateUserAttributesCommand,
  GlobalSignOutCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  CognitoIdentityClient,
  GetIdCommand,
} from "@aws-sdk/client-cognito-identity";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "./LanguageContext";
import type { User, UserPreferences } from "@/types";
import client from '@/lib/apolloClient';
import { 
  GET_USER_PREFERENCES, 
  CREATE_USER_PREFERENCES, 
  UPDATE_USER_PREFERENCES 
} from '@/lib/graphql/operations';
import { uploadFile, deleteFile } from '@/lib/s3Utils';

// ============================================================================
// TOKEN STORAGE & MANAGEMENT
// ============================================================================

interface StoredTokens {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresAt: number; // Timestamp in milliseconds
  identityId?: string; // Cognito Identity ID for S3 operations
}

const TOKEN_STORAGE_KEY = 'cognito_tokens';
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry

/**
 * Get tokens from localStorage
 */
function getStoredTokens(): StoredTokens | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Save tokens to localStorage
 */
function saveTokens(tokens: StoredTokens): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

/**
 * Clear tokens from localStorage
 */
function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Check if stored tokens are still valid
 */
function areTokensValid(): boolean {
  const tokens = getStoredTokens();
  if (!tokens) return false;
  const now = Date.now();
  return tokens.expiresAt - TOKEN_EXPIRY_BUFFER_MS > now;
}

/**
 * Parse JWT payload (without verification - for client-side only)
 * Do NOT use for security-critical operations
 */
function parseJwt(token: string): Record<string, any> {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to parse JWT:', error);
    return {};
  }
}

/**
 * Extract user attributes from ID token
 */
function extractUserAttributesFromIdToken(idToken: string): {
  sub: string;
  email?: string;
  name?: string;
  email_verified?: boolean;
} {
  const payload = parseJwt(idToken);
  return {
    sub: payload.sub || '',
    email: payload.email,
    name: payload.name,
    email_verified: payload.email_verified,
  };
}

/**
 * Get access token expiry from JWT
 */
function getTokenExpiryFromJwt(token: string): number {
  const payload = parseJwt(token);
  return (payload.exp || 0) * 1000; // Convert seconds to milliseconds
}

// ============================================================================
// TOKEN REFRESH QUEUING
// ============================================================================

/**
 * Shared promise for in-flight token refresh
 * Prevents multiple simultaneous refresh attempts when concurrent requests fail
 * Multiple requests wait for the same refresh promise instead of each refreshing independently
 */
let refreshTokenPromise: Promise<StoredTokens | null> | null = null;

/**
 * Get or create a token refresh promise
 * Ensures only one refresh operation happens at a time across all concurrent requests
 */
function getRefreshTokenPromise(refreshToken: string): Promise<StoredTokens | null> {
  if (!refreshTokenPromise) {
    refreshTokenPromise = (async () => {
      try {
        const newTokens = await performTokenRefresh(refreshToken);
        return newTokens;
      } finally {
        refreshTokenPromise = null; // Clear the promise after refresh completes
      }
    })();
  }
  return refreshTokenPromise;
}

/**
 * Perform the actual token refresh (helper function)
 * Separated from refreshAccessToken to allow promise queuing
 * 
 * @param refreshToken - The refresh token
 * @returns New tokens, or null if refresh fails
 */
async function performTokenRefresh(
  refreshToken: string
): Promise<StoredTokens | null> {
  try {
    const response = await cognitoClient.send(
      new InitiateAuthCommand({
        ClientId: cognitoConfig.clientId,
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      })
    );

    if (!response.AuthenticationResult?.AccessToken) {
      clearTokens();
      return null;
    }

    const newTokens: StoredTokens = {
      accessToken: response.AuthenticationResult.AccessToken,
      idToken: response.AuthenticationResult.IdToken || '',
      refreshToken: refreshToken, // Cognito doesn't return new refresh token
      expiresAt: Date.now() + (response.AuthenticationResult.ExpiresIn || 3600) * 1000,
    };

    saveTokens(newTokens);
    return newTokens;
  } catch (error: any) {
    console.error('[APOLLO_ERROR] Token refresh failed:', error.message);
    clearTokens();
    return null;
  }
}

// ============================================================================
// COGNITO CLIENTS
// ============================================================================

const cognitoConfig = getCognitoConfig();
const cognitoClient = new CognitoIdentityProviderClient({
  region: cognitoConfig.region,
});
const cognitoIdentityClient = new CognitoIdentityClient({
  region: cognitoConfig.region,
});

// ============================================================================
// COGNITO IDENTITY - GET IDENTITY ID
// ============================================================================

/**
 * Get Cognito Identity ID for the authenticated user
 * This ID is used for S3 bucket permissions (identityId maps to {entity_id})
 * 
 * @param idToken - The ID token from Cognito User Pool
 * @returns Promise<string> The Cognito Identity ID
 */
async function getCognitoIdentityId(idToken: string): Promise<string> {
  try {
    const command = new GetIdCommand({
      IdentityPoolId: cognitoConfig.identityPoolId,
      Logins: {
        [`cognito-idp.${cognitoConfig.region}.amazonaws.com/${cognitoConfig.userPoolId}`]: idToken,
      },
    });
    const response = await cognitoIdentityClient.send(command);
    if (!response.IdentityId) {
      throw new Error('Failed to get identity ID from Cognito Identity');
    }
    return response.IdentityId;
  } catch (error) {
    console.error('Failed to get Cognito Identity ID:', error);
    throw error;
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  confirmSignUp: (email: string, confirmationCode: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  confirmForgotPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedData: { name?: string, preferences?: Partial<UserPreferences>, avatarFile?: File | null }) => Promise<boolean>;
  isLoading: boolean;
  isUpdatingUser: boolean;
}

// ============================================================================
// CONTEXT DEFINITION
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// AUTH PROVIDER COMPONENT
// ============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();

  /**
   * Refresh the access token using the refresh token
   * Uses queued promises to prevent simultaneous refresh attempts
   * 
   * @param refreshToken - The refresh token from stored tokens
   * @returns New tokens object, or null if refresh fails
   */
  const refreshAccessToken = useCallback(
    async (refreshToken: string): Promise<StoredTokens | null> => {
      // Use queued promise to prevent multiple simultaneous refreshes
      return getRefreshTokenPromise(refreshToken);
    },
    []
  );

  /**
   * Get valid access token (refresh if needed)
   */
  const getValidAccessToken = useCallback(async (): Promise<string | null> => {
    let tokens = getStoredTokens();

    if (!tokens) {
      return null;
    }

    // Check if token needs refresh
    if (tokens.expiresAt - TOKEN_EXPIRY_BUFFER_MS <= Date.now()) {
      if (!tokens.refreshToken) {
        clearTokens();
        return null;
      }

      tokens = await refreshAccessToken(tokens.refreshToken);
      if (!tokens) {
        return null;
      }
    }

    return tokens.accessToken;
  }, [refreshAccessToken]);

  /**
   * Fetch user preferences from AppSync
   */
  const fetchUserPreferences = useCallback(
    async (userId: string): Promise<UserPreferences | null> => {
      try {
        const accessToken = await getValidAccessToken();
        if (!accessToken) {
          console.error('No valid access token for fetching preferences');
          return null;
        }

        const { data, error } = await client.query({
          query: GET_USER_PREFERENCES,
          variables: { id: userId },
        });
        // Apollo returns the query result under the query name
        const preferences = data?.getUserPreferences;
        
        if (error) {
          console.error('GraphQL errors fetching preferences:', error);
          return null;
        }

        return preferences || null;
      } catch (error: any) {
        console.error(`Failed to fetch user preferences for ${userId}:`, error);
        return null;
      }
    },
    [getValidAccessToken]
  );

  /**
   * Create default user preferences
   */
  const createDefaultUserPreferences = useCallback(
    async (userId: string): Promise<UserPreferences> => {
      try {
        const accessToken = await getValidAccessToken();
        if (!accessToken) {
          throw new Error('No valid access token for creating preferences');
        }

        const { data, error } = await client.mutate({
          mutation: CREATE_USER_PREFERENCES,
          variables: { 
            input: {
              id: userId,
              avatarS3Key: null,
            }
          },
        });

        // Apollo returns mutation result under mutation name
        const preferences = data?.createUserPreferences;

        if (error) {
          throw new Error(`GraphQL errors: ${error}`);
        }

        if (!preferences) {
          throw new Error('Failed to create default preferences');
        }

        return preferences;
      } catch (error) {
        console.error(`Exception creating default user preferences for ${userId}:`, error);
        throw error;
      }
    },
    [getValidAccessToken]
  );

  /**
   * Fetch current user from token and AppSync
   */
  const fetchCurrentUser = useCallback(async (): Promise<User | null> => {
    try {
      const tokens = getStoredTokens();
      if (!tokens) {
        return null;
      }

      // Refresh token if needed
      if (!areTokensValid()) {
        if (!tokens.refreshToken) {
          clearTokens();
          return null;
        }

        const refreshed = await refreshAccessToken(tokens.refreshToken);
        if (!refreshed) {
          return null;
        }
      }

      // Get user attributes from ID token
      const userAttrs = extractUserAttributesFromIdToken(getStoredTokens()!.idToken);
      const userId = userAttrs.sub;

      if (!userId) {
        console.error('No user ID in token');
        return null;
      }

      // Get or refresh identity ID
      let identityId = tokens.identityId;
      if (!identityId) {
        try {
          identityId = await getCognitoIdentityId(tokens.idToken);
          tokens.identityId = identityId;
          saveTokens(tokens);
        } catch (error) {
          console.warn('Failed to get Cognito Identity ID:', error);
          throw error;
        }
      }

      // Fetch preferences
      let userPreferences = await fetchUserPreferences(userId);
      if (!userPreferences) {
        userPreferences = await createDefaultUserPreferences(userId);
      }

      return {
        id: userId,
        email: userAttrs.email || '',
        name: userAttrs.name || '',
        identityId: identityId,
        avatarS3Key: userPreferences?.avatarS3Key || null,
        preferences: userPreferences,
      };
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      return null;
    }
  }, [refreshAccessToken, fetchUserPreferences, createDefaultUserPreferences]);

  /**
   * Check for existing session on mount
   */
  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      try {
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to check session:', error);
        setUser(null);
        clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [fetchCurrentUser]);

  /**
   * LOGIN: Exchange credentials for tokens using InitiateAuthCommand
   */
  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);

      try {
        // Initiate auth with username/password
        const response = await cognitoClient.send(
          new InitiateAuthCommand({
            ClientId: cognitoConfig.clientId,
            AuthFlow: 'USER_PASSWORD_AUTH',
            AuthParameters: {
              USERNAME: email,
              PASSWORD: password,
            },
          })
        );

        if (!response.AuthenticationResult) {
          throw new Error('No authentication result received');
        }

        // Store tokens
        const tokens: StoredTokens = {
          accessToken: response.AuthenticationResult.AccessToken!,
          idToken: response.AuthenticationResult.IdToken!,
          refreshToken: response.AuthenticationResult.RefreshToken,
          expiresAt: getTokenExpiryFromJwt(response.AuthenticationResult.AccessToken!),
        };

        saveTokens(tokens);
        // Also save idToken in a cookie for server-side access
        if (typeof window !== 'undefined') {
          const maxAge = Math.floor((tokens.expiresAt - Date.now()) / 1000);
          const secure = window.location.protocol === 'https:' ? '; Secure' : '';
          const sameSite = '; SameSite=Lax';
          document.cookie = `cognito_id_token=${tokens.idToken}; Path=/; Max-Age=${maxAge}${sameSite}${secure}`;
        }

        // Fetch and set user
        const currentUser = await fetchCurrentUser();
        if (!currentUser) {
          throw new Error('Failed to fetch user after login');
        }

        setUser(currentUser);

        toast({
          title: t('authContextToasts.loginSuccessTitle'),
          description: t('authContextToasts.loginSuccessDescription', {
            name: currentUser.name,
          }),
        });

        router.push('/');
      } catch (error: any) {
        console.error('Login error:', error);

        let errorMessage = t('authErrors.generalLoginFailed');

        if (error.name === 'UserNotFoundException' || error.name === 'NotAuthorizedException') {
          errorMessage = t('authErrors.userNotFound');
        } else if (error.name === 'UserNotConfirmedException') {
          errorMessage = t('authErrors.userNotConfirmed');
        } else if (error.name === 'LimitExceededException') {
          errorMessage = t('authErrors.limitExceeded');
        } else if (error.name === 'TooManyRequestsException') {
          errorMessage = t('authErrors.tooManyRequests');
        }

        toast({
          title: t('common.error'),
          description: errorMessage,
          variant: 'destructive',
        });

        setUser(null);
        clearTokens();
      } finally {
        setIsLoading(false);
      }
    },
    [router, toast, t, fetchCurrentUser]
  );

  /**
   * REGISTER: Create new user with SignUpCommand
   */
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      setIsLoading(true);

      try {
        // Sign up user
        const response = await cognitoClient.send(
          new SignUpCommand({
            ClientId: cognitoConfig.clientId,
            Username: email,
            Password: password,
            UserAttributes: [
              { Name: 'email', Value: email },
              { Name: 'name', Value: name },
            ],
          })
        );

        if (!response.UserSub) {
          throw new Error('No user ID returned from sign up');
        }

        // Auto-confirm user for demo purposes (remove in production)
        // In production, user would receive confirmation code via email
        toast({
          title: t('authContextToasts.registrationSuccessTitle'),
          description: t('authContextToasts.confirmEmailDescription'),
        });

        // Redirect to confirmation page
        router.push(`/confirm-signup?email=${encodeURIComponent(email)}`);
      } catch (error: any) {
        console.error('Registration error:', error);

        let errorMessage = t('authErrors.generalRegistrationFailed');

        if (error.name === 'UsernameExistsException') {
          errorMessage = t('authErrors.usernameExists');
        } else if (error.name === 'InvalidPasswordException') {
          errorMessage = t('authErrors.invalidPassword');
        } else if (error.name === 'LimitExceededException') {
          errorMessage = t('authErrors.limitExceeded');
        } else if (error.name === 'TooManyRequestsException') {
          errorMessage = t('authErrors.tooManyRequests');
        }

        toast({
          title: t('common.error'),
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [router, toast, t]
  );

  /**
   * CONFIRM SIGN UP: Confirm user registration with confirmation code
   */
  const confirmSignUp = useCallback(
    async (email: string, confirmationCode: string) => {
      setIsLoading(true);

      try {
        // Confirm sign up
        await cognitoClient.send(
          new ConfirmSignUpCommand({
            ClientId: cognitoConfig.clientId,
            Username: email,
            ConfirmationCode: confirmationCode,
          })
        );

        toast({
          title: t('authContextToasts.confirmationSuccessTitle'),
          description: t('authContextToasts.confirmationSuccessDescription'),
        });

        // Redirect to login
        router.push('/login');
      } catch (error: any) {
        console.error('Confirm sign up error:', error);

        let errorMessage = t('authErrors.confirmationFailed');

        if (error.name === 'ExpiredCodeException') {
          errorMessage = t('authErrors.codeExpired');
        } else if (error.name === 'CodeMismatchException') {
          errorMessage = t('authErrors.codeMismatch');
        }

        toast({
          title: t('common.error'),
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [router, toast, t]
  );

    /**
   * FORGOT PASSWORD: Initiate password reset flow
   * Sends verification code to user's email
   */
  const forgotPassword = useCallback(
    async (email: string) => {
      setIsLoading(true);

      try {
        // Initiate forgot password flow
        await cognitoClient.send(
          new ForgotPasswordCommand({
            ClientId: cognitoConfig.clientId,
            Username: email,
          })
        );

        toast({
          title: t('authContextToasts.forgotPasswordSentTitle'),
          description: t('authContextToasts.forgotPasswordSentDescription'),
        });

        // Redirect to reset password page with email as query param
        router.push(`/reset-password?email=${encodeURIComponent(email)}`);
      } catch (error: any) {
        console.error('Forgot password error:', error);

        let errorMessage = t('authErrors.forgotPasswordFailed');

        if (error.name === 'UserNotFoundException') {
          errorMessage = t('authErrors.userNotFound');
        } else if (error.name === 'InvalidParameterException') {
          errorMessage = t('authErrors.invalidEmail');
        } else if (error.name === 'LimitExceededException') {
          errorMessage = t('authErrors.limitExceeded');
        } else if (error.name === 'TooManyRequestsException') {
          errorMessage = t('authErrors.tooManyRequests');
        }

        toast({
          title: t('common.error'),
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [router, toast, t]
  );

  /**
   * CONFIRM FORGOT PASSWORD: Complete password reset with verification code
   * User must then log in with their new password
   */
  const confirmForgotPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      setIsLoading(true);

      try {
        // Validate password matches registration policy (minimum 6 chars)
        if (!newPassword || newPassword.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }

        // Confirm forgot password with verification code
        await cognitoClient.send(
          new ConfirmForgotPasswordCommand({
            ClientId: cognitoConfig.clientId,
            Username: email,
            ConfirmationCode: code,
            Password: newPassword,
          })
        );

        toast({
          title: t('authContextToasts.passwordResetSuccessTitle'),
          description: t('authContextToasts.passwordResetSuccessDescription'),
        });

        // Redirect to login page (Option B: require manual login with new password)
        router.push('/login');
      } catch (error: any) {
        console.error('Confirm forgot password error:', error);

        let errorMessage = t('authErrors.passwordResetFailed');

        if (error.name === 'ExpiredCodeException') {
          errorMessage = t('authErrors.codeExpired');
        } else if (error.name === 'CodeMismatchException') {
          errorMessage = t('authErrors.codeMismatch');
        } else if (error.name === 'InvalidPasswordException') {
          errorMessage = t('authErrors.invalidPassword');
        } else if (error.name === 'UserNotFoundException') {
          errorMessage = t('authErrors.userNotFound');
        } else if (error.name === 'LimitExceededException') {
          errorMessage = t('authErrors.limitExceeded');
        } else if (error.message && error.message.includes('at least 6 characters')) {
          errorMessage = t('authErrors.passwordTooShort');
        }

        toast({
          title: t('common.error'),
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [router, toast, t]
  );

  /**
   * LOGOUT: Clear tokens and sign out
   */
  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      const accessToken = await getValidAccessToken();

      // Global sign out (invalidate all tokens)
      if (accessToken) {
        try {
          await cognitoClient.send(
            new GlobalSignOutCommand({
              AccessToken: accessToken,
            })
          );
        } catch (error) {
          console.warn('Global sign out failed (token may be expired):', error);
        }
      }

      // Clear local state
      clearTokens();
      setUser(null);
      // Clear token cookie
      if (typeof window !== 'undefined') {
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        const sameSite = '; SameSite=Lax';
        document.cookie = `cognito_id_token=; Path=/; Max-Age=0${sameSite}${secure}`;
      }

      toast({
        title: t('authContextToasts.loggedOutTitle'),
        description: t('authContextToasts.loggedOutDescription'),
      });

      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear tokens anyway
      clearTokens();
      setUser(null);
      
      toast({
        title: t('common.error'),
        description: 'Failed to log out',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [router, toast, t, getValidAccessToken]);

  /**
   * UPDATE USER: Update name, avatar, and preferences
   */
  const updateUser = useCallback(
    async (updatedData: {
      name?: string;
      preferences?: Partial<UserPreferences>;
      avatarFile?: File | null;
    }): Promise<boolean> => {
      if (!user) {
        toast({
          title: t('common.error'),
          description: t('authContextToasts.errorNoUserSession'),
          variant: 'destructive',
        });
        return false;
      }

      setIsUpdatingUser(true);
      let success = false;

      try {
        const accessToken = await getValidAccessToken();
        if (!accessToken) {
          throw new Error('No valid access token');
        }

        // 1. Update user name attribute if provided
        if (updatedData.name !== undefined && updatedData.name !== user.name) {
          await cognitoClient.send(
            new UpdateUserAttributesCommand({
              AccessToken: accessToken,
              UserAttributes: [
                {
                  Name: 'name',
                  Value: updatedData.name,
                },
              ],
            })
          );
        }

        // 2. Handle avatar upload
        let newAvatarS3Key = user.avatarS3Key;

        if (updatedData.avatarFile !== undefined) {
          const tokens = getStoredTokens();
          const idToken = tokens?.idToken;

          if (!idToken) {
            throw new Error('No ID token available for S3 operations');
          }

          if (updatedData.avatarFile === null) {
            // Remove avatar
            if (user.avatarS3Key) {
              try {
                await deleteFile(user.avatarS3Key, idToken);
                newAvatarS3Key = null;
              } catch (error) {
                console.error('Failed to delete old avatar:', error);
                toast({
                  title: t('common.error'),
                  description: 'Failed to delete avatar',
                  variant: 'destructive',
                });
              }
            }
          } else if (updatedData.avatarFile instanceof File) {
            // Upload new avatar
            if (user.avatarS3Key) {
              try {
                await deleteFile(user.avatarS3Key, idToken);
              } catch (error) {
                console.warn('Failed to delete old avatar before upload:', error);
              }
            }

            try {
              const fileExtension = updatedData.avatarFile.name.split('.').pop();
              const s3Key = `avatars/${user.identityId}/avatar-${Date.now()}.${fileExtension}`;
              await uploadFile(s3Key, updatedData.avatarFile, idToken);

              newAvatarS3Key = s3Key;
            } catch (error) {
              console.error('Error uploading avatar:', error);
              toast({
                title: t('common.error'),
                description: 'Failed to upload avatar',
                variant: 'destructive',
              });
              newAvatarS3Key = user.avatarS3Key;
            }
          }
        }

        // 3. Update preferences in AppSync
        if (updatedData.preferences !== undefined || newAvatarS3Key !== user.avatarS3Key) {
          const currentPreferences = user.preferences || (await fetchUserPreferences(user.id));
          const preferencesToUpdate = {
            ...(currentPreferences || {}),
            ...updatedData.preferences,
            id: user.id,
            avatarS3Key: newAvatarS3Key,
          };

          const { data, error } = await client.mutate({
            mutation: UPDATE_USER_PREFERENCES,
            variables: { 
              input: preferencesToUpdate as UserPreferences 
            },
          });
          
          const updatedPreferences = data?.updateUserPreferences;

          if (error) {
            console.error('Error updating preferences:', error);
            toast({
              title: t('common.error'),
              description: 'Failed to update preferences',
              variant: 'destructive',
            });
          } else if (!updatedPreferences) {
            throw new Error('No preferences returned from update');
          } else {
            setUser((prevUser) => ({
              ...prevUser!,
              preferences: updatedPreferences,
              avatarS3Key: updatedPreferences.avatarS3Key,
            }));
          }
        }

        // 4. Update local user state
        setUser((prevUser) => ({
          ...prevUser!,
          name: updatedData.name || prevUser!.name,
          avatarS3Key: newAvatarS3Key,
        }));

        toast({
          title: t('authContextToasts.profileUpdatedTitle'),
          description: t('authContextToasts.profileUpdatedDescription'),
        });

        success = true;
      } catch (error) {
        console.error('Update user error:', error);
        toast({
          title: t('common.error'),
          description: 'Failed to update profile',
          variant: 'destructive',
        });
        success = false;
      } finally {
        setIsUpdatingUser(false);
      }

      return success;
    },
    [user, toast, t, getValidAccessToken, fetchUserPreferences]
  );

  // ============================================================================
  // APOLLO CLIENT TOKEN REFRESH INTEGRATION
  // ============================================================================

  /**
   * Callback for Apollo ErrorLink to refresh tokens
   * Called when Apollo detects a 401 error
   * Returns the new access token or null if refresh fails
   */
  useEffect(() => {
    const getValidAccessTokenForApollo = async (): Promise<string | null> => {
      const tokens = getStoredTokens();
      if (!tokens) {
        // No tokens stored, user is logged out
        return null;
      }

      // Check if token needs refresh using proactive buffer
      if (tokens.expiresAt - TOKEN_EXPIRY_BUFFER_MS <= Date.now()) {
        if (!tokens.refreshToken) {
          clearTokens();
          return null;
        }
        const refreshedTokens = await refreshAccessToken(tokens.refreshToken);
        if (!refreshedTokens) {
          return null;
        }
        return refreshedTokens.accessToken;
      }

      // Token is still valid
      return tokens.accessToken;
    };

    // Import and set the callback at module level
    // This requires dynamic import to avoid circular dependency
    (async () => {
      try {
        const apolloModule = await import('@/lib/apolloClient');
        apolloModule.setApolloRefreshCallback(getValidAccessTokenForApollo);
      } catch (error) {
        console.error('[APOLLO_ERROR] Failed to register token refresh callback:', error);
      }
    })();
  }, [refreshAccessToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        confirmSignUp,
        forgotPassword,
        confirmForgotPassword,
        logout,
        updateUser,
        isLoading,
        isUpdatingUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
