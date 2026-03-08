import { defineFunction, secret } from '@aws-amplify/backend';

export const aiFlows = defineFunction({
  name: 'ai-flows',
  entry: './handler.ts',
  timeoutSeconds: 300,
  memoryMB: 1024,
  runtime: 20,
  environment: {
    GOOGLE_API_KEY: secret('GOOGLE_API_KEY'),
  },
});
