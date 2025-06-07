import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'leafwise',
  access: (allow) => ({
    'avatars/{entity_id}/*': [
      // {entity_id} is the token that is replaced with the user identity id
      allow.entity('identity').to(['read', 'write', 'delete']),
      allow.authenticated.to(['read']),
    ],
    'plants/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
      allow.authenticated.to(['read']),
    ]
  }),
});