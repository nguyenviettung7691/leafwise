import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Plant: a.model({
    commonName: a.string().required(),
    scientificName: a.string(),
    familyCategory: a.string(),
    ageEstimateYears: a.integer(),
    healthCondition: a.string().required(),
    location: a.string(),
    plantingDate: a.string(), // Store date as ISO string
    customNotes: a.string(),
    primaryPhotoUrl: a.string(), // This will store the S3 key
    photos: a.hasMany('PlantPhoto', 'plantId'),
    careTasks: a.hasMany('CareTask', 'plantId'),
  }).authorization((allow) => [allow.owner()]),

  PlantPhoto: a.model({
    url: a.string().required(), // This will store the S3 key
    notes: a.string(),
    dateTaken: a.string().required(), // Store date as ISO string
    healthCondition: a.string().required(),
    diagnosisNotes: a.string(),
    plantId: a.id().required(),
    plant: a.belongsTo('Plant', 'plantId'),
  }).authorization((allow) => [allow.owner()]),

  CareTask: a.model({
    name: a.string().required(),
    description: a.string(),
    frequency: a.string().required(),
    frequencyEvery: a.integer(),
    timeOfDay: a.string(),
    nextDueDate: a.string(), // Store date as ISO string
    isPaused: a.boolean().required(),
    level: a.string().required(), // Store as string
    plantId: a.id().required(),
    plant: a.belongsTo('Plant', 'plantId'),
  }).authorization((allow) => [allow.owner()]),

  UserPreferences: a.model({
    id: a.id().required(), // User's Cognito sub
    avatarS3Key: a.string(),
  }).authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    // This tells the data client in your app (generateClient())
    // to sign API requests with the user authentication token.
    defaultAuthorizationMode: 'userPool',
  },
});
