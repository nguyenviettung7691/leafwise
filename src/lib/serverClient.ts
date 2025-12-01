/**
 * Server-side Apollo Client for AppSync operations
 *
 * This module provides the server-side Apollo Client instance configured
 * to communicate with AWS AppSync GraphQL API. It replaces the previous
 * Amplify adapter-based approach.
 *
 * The client automatically injects Cognito ID tokens from Next.js cookies
 * into the Authorization header for authenticated requests.
 *
 * Usage in Server Components:
 * ```typescript
 * 'use server';
 * import serverClient from '@/lib/serverClient';
 * import { gql } from '@apollo/client';
 *
 * export async function getPlantData(plantId: string) {
 *   const { data } = await serverClient.query({
 *     query: gql`
 *       query GetPlant($id: ID!) {
 *         plant(id: $id) {
 *           id
 *           commonName
 *           location
 *         }
 *       }
 *     `,
 *     variables: { id: plantId },
 *   });
 *   return data;
 * }
 * ```
 *
 * Usage in API Routes:
 * ```typescript
 * // app/api/plants/[id]/route.ts
 * import { NextRequest, NextResponse } from 'next/server';
 * import serverClient from '@/lib/serverClient';
 * import { gql } from '@apollo/client';
 *
 * export async function GET(
 *   request: NextRequest,
 *   { params }: { params: { id: string } }
 * ) {
 *   try {
 *     const { data } = await serverClient.query({
 *       query: PLANT_QUERY,
 *       variables: { id: params.id },
 *     });
 *     return NextResponse.json(data);
 *   } catch (error) {
 *     return NextResponse.json(
 *       { error: 'Failed to fetch plant' },
 *       { status: 500 }
 *     );
 *   }
 * }
 * ```
 *
 * Token Management:
 * - Tokens are read from Next.js cookies (set by AuthContext on client)
 * - Authorization header is automatically injected by authLink
 * - No credentials exposure to the browser
 *
 * Migration from Amplify:
 * - Removed: generateServerClientUsingCookies from @aws-amplify/adapter-nextjs
 * - Removed: dependency on amplify_outputs.json
 * - Added: Direct Apollo Client with Cognito auth header injection
 */

import serverClient from './apolloClient';

export default serverClient;