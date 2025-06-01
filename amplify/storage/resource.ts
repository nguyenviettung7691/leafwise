import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'leafwise',
  access: (allow) => ({
    // Allow authenticated users (owners) to read and write their own files
    // in the 'protected' directory.
    // Files will be stored under 'protected/{user_identity_id}/'
    'protected/*': [
      allow.owner.entity(['user']), // Assuming 'user' is the entity type from Auth
    ],
    // Optionally, if you need public read access for some files (e.g., default images)
    // 'public/*': [allow.guest.to(['read'])],
    // Optionally, if you need private access (only the owner can read/write)
    // 'private/*': [allow.owner.entity(['user']).to(['read', 'write'])],
  }),
});