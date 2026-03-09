import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { aiFlows } from './functions/ai-flows/resource';
import { FunctionUrlAuthType, Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { CfnOutput } from 'aws-cdk-lib';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  aiFlows,
});

// Enable Lambda Function URL for AI flows (auth handled inside Lambda via JWT validation)
const aiFlowsLambda = backend.aiFlows.resources.lambda as LambdaFunction;
const fnUrl = aiFlowsLambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
});

// Pass the User Pool ID to the Lambda so it can validate JWTs
aiFlowsLambda.addEnvironment(
  'COGNITO_USER_POOL_ID',
  backend.auth.resources.userPool.userPoolId
);

// Output the Function URL for frontend configuration
new CfnOutput(backend.stack, 'AiFlowsFunctionUrl', {
  value: fnUrl.url,
  description: 'Lambda Function URL for AI flows',
});

// extract L1 CfnUserPool resources
const { cfnUserPool } = backend.auth.resources.cfnResources;
// modify cfnUserPool policies directly
cfnUserPool.policies = {
  passwordPolicy: {
    minimumLength: 6,
    requireLowercase: false,
    requireNumbers: false,
    requireSymbols: false,
    requireUppercase: false,
  },
};

// Enable USER_PASSWORD_AUTH flow on the app client (required for direct username/password login)
const { cfnUserPoolClient } = backend.auth.resources.cfnResources;
cfnUserPoolClient.explicitAuthFlows = [
  ...(cfnUserPoolClient.explicitAuthFlows as string[] || []),
  'ALLOW_USER_PASSWORD_AUTH',
];

// enable Transfer Acceleration on the bucket
// const s3Bucket = backend.storage.resources.bucket;
// const cfnBucket = s3Bucket.node.defaultChild as s3.CfnBucket;
// cfnBucket.accelerateConfiguration = {
//   accelerationStatus: "Enabled" // 'Suspended' if you want to disable transfer acceleration
// }