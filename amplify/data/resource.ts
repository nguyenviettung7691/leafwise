import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  // Define the Plant model
  Plant: a.model({
    // Fields based on src/types/index.ts Plant interface
    commonName: a.string().required(),
    scientificName: a.string(),
    familyCategory: a.string(),
    ageEstimateYears: a.integer(),
    healthCondition: a.string().required(), // Store as string, validation happens client-side
    location: a.string(),
    plantingDate: a.string(), // Store date as ISO string
    customNotes: a.string(),
    primaryPhotoUrl: a.string(), // This will store the S3 key
    // Relationships
    photos: a.hasMany('PlantPhoto', 'plant'), // A Plant has many PlantPhotos
    careTasks: a.hasMany('CareTask', 'plant'), // A Plant has many CareTasks
  }).authorization((allow) => [allow.owner()]), // Owner authorization

  // Define the PlantPhoto model
  PlantPhoto: a.model({
    // Fields based on src/types/index.ts PlantPhoto interface
    url: a.string().required(), // This will store the S3 key
    notes: a.string(),
    dateTaken: a.string().required(), // Store date as ISO string
    healthCondition: a.string().required(), // Store as string
    diagnosisNotes: a.string(),
    // Relationship back to Plant
    plantId: a.id().required(),
    plant: a.belongsTo('Plant', 'plantId'),
  }).authorization((allow) => [allow.owner()]), // Owner authorization

  // Define the CareTask model
  CareTask: a.model({
    // Fields based on src/types/index.ts CareTask interface
    name: a.string().required(),
    description: a.string(),
    frequency: a.string().required(),
    timeOfDay: a.string(),
    lastCompleted: a.string(), // Store date as ISO string
    nextDueDate: a.string(), // Store date as ISO string
    isPaused: a.boolean().required(),
    resumeDate: a.string(), // Store date as ISO string
    level: a.string().required(), // Store as string
    // Relationship back to Plant
    plantId: a.id().required(),
    plant: a.belongsTo('Plant', 'plantId'),
  }).authorization((allow) => [allow.owner()]), // Owner authorization

  // Define the UserPreferences model
  UserPreferences: a.model({
    // Fields based on src/types/index.ts UserPreferences interface
    id: a.id().required(), // User's Cognito sub
    emailNotifications: a.boolean(),
    pushNotifications: a.boolean(),
    avatarS3Key: a.string(), // Store S3 key for avatar
  }).authorization((allow) => [allow.owner()]), // Owner authorization
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
