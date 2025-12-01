'use client';

import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  HttpLink,
  Observable,
} from '@apollo/client';
import { ErrorLink } from '@apollo/client/link/error';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { getAppSyncConfig } from '@/lib/awsConfig';

const appSyncConfig = getAppSyncConfig();

/**
 * Retrieves the Cognito ID token for GraphQL authentication
 * - Client-side: reads from localStorage
 * - Server-side: reads from Next.js cookies (async)
 * 
 * Note: On server-side, this is called within ApolloLink which doesn't
 * support async operations directly. Use with caution in server contexts.
 * 
 * @returns ID token string or null if not authenticated
 */
function getIdToken(): string | null {
  if (typeof window === 'undefined') {
    // Server-side: cannot read localStorage
    return null;
  }

  try {
    const tokensJson = localStorage.getItem('cognito_tokens');
    if (!tokensJson) return null;

    const tokens = JSON.parse(tokensJson);
    return tokens.idToken || null;
  } catch {
    return null;
  }
}

/**
 * Auth link that injects Cognito ID token into Authorization header
 * Called for every GraphQL request to AppSync
 * 
 * Note: Works for client-side requests. For server-side requests,
 * create a separate Apollo instance or use direct gql queries.
 */
const authLink = new ApolloLink((operation, forward) => {
  const idToken = getIdToken();

  operation.setContext({
    headers: {
      // AppSync with Cognito User Pools expects the raw JWT (no Bearer prefix)
      authorization: idToken || '',
    },
  });

  return forward(operation);
});

/**
 * Helper function to refresh token
 * Must be defined and injected by AuthContext to access its state
 * Will be set via setApolloRefreshCallback()
 */
let apolloRefreshTokenCallback: (() => Promise<string | null>) | null = null;

export function setApolloRefreshCallback(
  callback: () => Promise<string | null>
): void {
  apolloRefreshTokenCallback = callback;
}

async function refreshTokenAndRetry(): Promise<string | null> {
  if (!apolloRefreshTokenCallback) {
    console.error('[APOLLO_ERROR] No refresh callback set in Apollo client');
    return null;
  }

  return apolloRefreshTokenCallback();
}

/**
 * Error link that handles 401 Unauthorized errors
 * Automatically attempts to refresh the token and retry the request
 */
const errorLink = new ErrorLink(({ error, operation, forward }) => {
  // Check for 401 Unauthorized in GraphQL errors
  if (CombinedGraphQLErrors.is(error)) {
    for (const err of error.errors) {
      if (
        err.message?.includes('Unauthorized') ||
        err.message?.includes('unauthorized') ||
        (err as any).errorType === 'UnauthorizedException'
      ) {
        console.log('[APOLLO_ERROR] 401 Unauthorized detected, attempting token refresh');

        // Return an Observable that refreshes the token and retries
        return new Observable(observer => {
          (async () => {
            try {
              const newToken = await refreshTokenAndRetry();

              if (!newToken) {
                console.error('[APOLLO_ERROR] Token refresh failed, user logged out');
                throw new Error('Session expired. Please sign in again.');
              }

              console.log('[APOLLO_ERROR] Token refreshed, retrying request');

              // Update the operation with the new token
              operation.setContext({
                headers: {
                  // Use raw JWT (no Bearer prefix)
                  authorization: newToken,
                },
              });

              // Retry the operation with the new token
              forward(operation).subscribe(observer);
            } catch (err) {
              console.error('[APOLLO_ERROR] Token refresh and retry failed:', err);
              observer.error(err);
            }
          })();
        });
      }
    }
  }

  // Handle network errors (401 HTTP status code)
  if (error && 'statusCode' in error && (error as any).statusCode === 401) {
    console.log('[APOLLO_ERROR] HTTP 401 detected, attempting token refresh');

    return new Observable(observer => {
      (async () => {
        try {
          const newToken = await refreshTokenAndRetry();

          if (!newToken) {
            console.error('[APOLLO_ERROR] Token refresh failed on network 401');
            throw new Error('Session expired. Please sign in again.');
          }

          console.log('[APOLLO_ERROR] Token refreshed, retrying request');

          operation.setContext({
            headers: {
              // Use raw JWT (no Bearer prefix)
              authorization: newToken,
            },
          });

          forward(operation).subscribe(observer);
        } catch (err) {
          console.error('[APOLLO_ERROR] Network 401 refresh and retry failed:', err);
          observer.error(err);
        }
      })();
    });
  }
});

/**
 * HTTP link to AppSync endpoint
 * Uses credentials: 'include' to send cookies with requests
 */
const httpLink = new HttpLink({
  uri: appSyncConfig.endpoint,
  credentials: 'include',
});

/**
 * Apollo Client instance for client-side usage
 * Link chain order:
 * 1. authLink - adds token to headers
 * 2. errorLink - intercepts 401 errors and retries
 * 3. httpLink - sends the request
 */
const client = new ApolloClient({
  link: ApolloLink.from([authLink, errorLink, httpLink]),
  cache: new InMemoryCache(),
});

export default client;