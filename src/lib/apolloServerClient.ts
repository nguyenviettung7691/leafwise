/**
 * Server-side Apollo Client factory for AppSync (Cognito User Pools auth)
 *
 * - Reads the Cognito ID token from Next.js cookies ("cognito_id_token")
 * - Sends the raw JWT in the Authorization header (no "Bearer" prefix)
 * - Creates a fresh ApolloClient per request for proper SSR/edge isolation
 */

import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client';
import { cookies } from 'next/headers';
import { getAppSyncConfig } from '@/lib/awsConfig';

export async function createServerApolloClient(): Promise<ApolloClient> {
  const appSync = getAppSyncConfig();

  // Read the token once per request
  const cookieStore = await cookies();
  const idToken = cookieStore.get('cognito_id_token')?.value ?? '';

  const authLink = new ApolloLink((operation, forward) => {
    operation.setContext(({ headers = {} }) => ({
      headers: {
        ...headers,
        // AppSync expects raw JWT for Cognito User Pools auth
        authorization: idToken,
      },
    }));

    return forward(operation);
  });

  const httpLink = new HttpLink({
    uri: appSync.endpoint,
    // Server-side fetch; include cookies if needed by your API gateway setup
    // Next.js provides global fetch in Node and Edge runtimes
    fetch,
  });

  return new ApolloClient({
    ssrMode: true,
    link: ApolloLink.from([authLink, httpLink]),
    cache: new InMemoryCache(),
  });
}
