import { gql } from '@apollo/client';
import type { TypedDocumentNode } from '@apollo/client';
import type { UserPreferences, Plant, PlantPhoto, CareTask } from '@/types';

// ============================================================================
// USER PREFERENCES - TYPES & OPERATIONS
// ============================================================================

interface GetUserPreferencesData {
  getUserPreferences: UserPreferences;
}

interface GetUserPreferencesVariables {
  id: string;
}

export const GET_USER_PREFERENCES: TypedDocumentNode<
  GetUserPreferencesData,
  GetUserPreferencesVariables
> = gql`
  query GetUserPreferences($id: ID!) {
    getUserPreferences(id: $id) {
      id
      avatarS3Key
      createdAt
      updatedAt
      owner
    }
  }
`;

interface CreateUserPreferencesData {
  createUserPreferences: UserPreferences;
}

interface CreateUserPreferencesVariables {
  input: {
    id: string;
    avatarS3Key?: string | null;
  };
}

export const CREATE_USER_PREFERENCES: TypedDocumentNode<
  CreateUserPreferencesData,
  CreateUserPreferencesVariables
> = gql`
  mutation CreateUserPreferences($input: CreateUserPreferencesInput!) {
    createUserPreferences(input: $input) {
      id
      avatarS3Key
      createdAt
      updatedAt
      owner
    }
  }
`;

interface UpdateUserPreferencesData {
  updateUserPreferences: UserPreferences;
}

interface UpdateUserPreferencesVariables {
  input: {
    id: string;
    avatarS3Key?: string | null;
  };
}

export const UPDATE_USER_PREFERENCES: TypedDocumentNode<
  UpdateUserPreferencesData,
  UpdateUserPreferencesVariables
> = gql`
  mutation UpdateUserPreferences($input: UpdateUserPreferencesInput!) {
    updateUserPreferences(input: $input) {
      id
      avatarS3Key
      createdAt
      updatedAt
      owner
    }
  }
`;

interface DeleteUserPreferencesData {
  deleteUserPreferences: {
    id: string;
  };
}

interface DeleteUserPreferencesVariables {
  input: {
    id: string;
  };
}

export const DELETE_USER_PREFERENCES: TypedDocumentNode<
  DeleteUserPreferencesData,
  DeleteUserPreferencesVariables
> = gql`
  mutation DeleteUserPreferences($input: DeleteUserPreferencesInput!) {
    deleteUserPreferences(input: $input) {
      id
    }
  }
`;

// ============================================================================
// PLANT QUERIES & MUTATIONS - TYPES & OPERATIONS
// ============================================================================

interface ListPlantsData {
  listPlants: {
    items: Plant[];
    nextToken: string | null;
  };
}

interface ListPlantsVariables {
  // No variables for this query
}

export const LIST_PLANTS: TypedDocumentNode<
  ListPlantsData,
  ListPlantsVariables
> = gql`
  query ListPlants {
    listPlants {
      items {
        id
        commonName
        scientificName
        familyCategory
        ageEstimateYears
        healthCondition
        location
        plantingDate
        customNotes
        primaryPhotoUrl
        createdAt
        updatedAt
        owner
      }
      nextToken
    }
  }
`;

interface CreatePlantData {
  createPlant: Plant;
}

interface CreatePlantVariables {
  input: {
    commonName: string;
    scientificName?: string | null;
    familyCategory?: string | null;
    ageEstimateYears?: number | null;
    healthCondition: string;
    location?: string | null;
    plantingDate?: string | null;
    customNotes?: string | null;
    primaryPhotoUrl?: string | null;
  };
}

export const CREATE_PLANT: TypedDocumentNode<
  CreatePlantData,
  CreatePlantVariables
> = gql`
  mutation CreatePlant($input: CreatePlantInput!) {
    createPlant(input: $input) {
      id
      commonName
      scientificName
      familyCategory
      ageEstimateYears
      healthCondition
      location
      plantingDate
      customNotes
      primaryPhotoUrl
      createdAt
      updatedAt
      owner
    }
  }
`;

interface UpdatePlantData {
  updatePlant: Plant;
}

interface UpdatePlantVariables {
  input: {
    id: string;
    commonName?: string | null;
    scientificName?: string | null;
    familyCategory?: string | null;
    ageEstimateYears?: number | null;
    healthCondition?: string | null;
    location?: string | null;
    plantingDate?: string | null;
    customNotes?: string | null;
    primaryPhotoUrl?: string | null;
  };
}

export const UPDATE_PLANT: TypedDocumentNode<
  UpdatePlantData,
  UpdatePlantVariables
> = gql`
  mutation UpdatePlant($input: UpdatePlantInput!) {
    updatePlant(input: $input) {
      id
      commonName
      scientificName
      familyCategory
      ageEstimateYears
      healthCondition
      location
      plantingDate
      customNotes
      primaryPhotoUrl
      createdAt
      updatedAt
      owner
    }
  }
`;

interface DeletePlantData {
  deletePlant: {
    id: string;
  };
}

interface DeletePlantVariables {
  input: {
    id: string;
  };
}

export const DELETE_PLANT: TypedDocumentNode<
  DeletePlantData,
  DeletePlantVariables
> = gql`
  mutation DeletePlant($input: DeletePlantInput!) {
    deletePlant(input: $input) {
      id
    }
  }
`;

interface GetPlantData {
  getPlant: Plant;
}

interface GetPlantVariables {
  id: string;
}

export const GET_PLANT: TypedDocumentNode<
  GetPlantData,
  GetPlantVariables
> = gql`
  query GetPlant($id: ID!) {
    getPlant(id: $id) {
      id
      commonName
      scientificName
      familyCategory
      ageEstimateYears
      healthCondition
      location
      plantingDate
      customNotes
      primaryPhotoUrl
      createdAt
      updatedAt
      owner
    }
  }
`;

// ============================================================================
// PLANT PHOTO QUERIES & MUTATIONS - TYPES & OPERATIONS
// ============================================================================

interface ListPlantPhotosData {
  listPlantPhotos: {
    items: PlantPhoto[];
    nextToken: string | null;
  };
}

interface ListPlantPhotosVariables {
  // No variables for this query
}

export const LIST_PLANT_PHOTOS: TypedDocumentNode<
  ListPlantPhotosData,
  ListPlantPhotosVariables
> = gql`
  query ListPlantPhotos {
    listPlantPhotos {
      items {
        id
        plantId
        url
        notes
        dateTaken
        healthCondition
        diagnosisNotes
        createdAt
        updatedAt
        owner
      }
      nextToken
    }
  }
`;

interface CreatePlantPhotoData {
  createPlantPhoto: PlantPhoto;
}

interface CreatePlantPhotoVariables {
  input: {
    plantId: string;
    url: string;
    notes?: string | null;
    dateTaken: string;
    healthCondition: string;
    diagnosisNotes?: string | null;
  };
}

export const CREATE_PLANT_PHOTO: TypedDocumentNode<
  CreatePlantPhotoData,
  CreatePlantPhotoVariables
> = gql`
  mutation CreatePlantPhoto($input: CreatePlantPhotoInput!) {
    createPlantPhoto(input: $input) {
      id
      plantId
      url
      notes
      dateTaken
      healthCondition
      diagnosisNotes
      createdAt
      updatedAt
      owner
    }
  }
`;

interface UpdatePlantPhotoData {
  updatePlantPhoto: PlantPhoto;
}

interface UpdatePlantPhotoVariables {
  input: {
    id: string;
    notes?: string | null;
    healthCondition?: string | null;
    diagnosisNotes?: string | null;
  };
}

export const UPDATE_PLANT_PHOTO: TypedDocumentNode<
  UpdatePlantPhotoData,
  UpdatePlantPhotoVariables
> = gql`
  mutation UpdatePlantPhoto($input: UpdatePlantPhotoInput!) {
    updatePlantPhoto(input: $input) {
      id
      plantId
      url
      notes
      dateTaken
      healthCondition
      diagnosisNotes
      createdAt
      updatedAt
      owner
    }
  }
`;

interface DeletePlantPhotoData {
  deletePlantPhoto: {
    id: string;
  };
}

interface DeletePlantPhotoVariables {
  input: {
    id: string;
  };
}

export const DELETE_PLANT_PHOTO: TypedDocumentNode<
  DeletePlantPhotoData,
  DeletePlantPhotoVariables
> = gql`
  mutation DeletePlantPhoto($input: DeletePlantPhotoInput!) {
    deletePlantPhoto(input: $input) {
      id
    }
  }
`;

interface GetPlantPhotoData {
  getPlantPhoto: PlantPhoto;
}

interface GetPlantPhotoVariables {
  id: string;
}

export const GET_PLANT_PHOTO: TypedDocumentNode<
  GetPlantPhotoData,
  GetPlantPhotoVariables
> = gql`
  query GetPlantPhoto($id: ID!) {
    getPlantPhoto(id: $id) {
      id
      plantId
      url
      notes
      dateTaken
      healthCondition
      diagnosisNotes
      createdAt
      updatedAt
      owner
    }
  }
`;

// ============================================================================
// CARE TASK QUERIES & MUTATIONS - TYPES & OPERATIONS
// ============================================================================

interface ListCareTasksData {
  listCareTasks: {
    items: CareTask[];
    nextToken: string | null;
  };
}

interface ListCareTasksVariables {
  // No variables for this query
}

export const LIST_CARE_TASKS: TypedDocumentNode<
  ListCareTasksData,
  ListCareTasksVariables
> = gql`
  query ListCareTasks {
    listCareTasks {
      items {
        id
        plantId
        name
        description
        frequency
        frequencyEvery
        timeOfDay
        nextDueDate
        isPaused
        level
        createdAt
        updatedAt
        owner
      }
      nextToken
    }
  }
`;

interface CreateCareTaskData {
  createCareTask: CareTask;
}

interface CreateCareTaskVariables {
  input: {
    plantId: string;
    name: string;
    description?: string | null;
    frequency: string;
    frequencyEvery?: number | null;
    timeOfDay?: string | null;
    nextDueDate: string;
    isPaused: boolean;
    level: string;
  };
}

export const CREATE_CARE_TASK: TypedDocumentNode<
  CreateCareTaskData,
  CreateCareTaskVariables
> = gql`
  mutation CreateCareTask($input: CreateCareTaskInput!) {
    createCareTask(input: $input) {
      id
      plantId
      name
      description
      frequency
      frequencyEvery
      timeOfDay
      nextDueDate
      isPaused
      level
      createdAt
      updatedAt
      owner
    }
  }
`;

interface UpdateCareTaskData {
  updateCareTask: CareTask;
}

interface UpdateCareTaskVariables {
  input: {
    id: string;
    name?: string | null;
    description?: string | null;
    frequency?: string | null;
    frequencyEvery?: number | null;
    timeOfDay?: string | null;
    nextDueDate?: string | null;
    isPaused?: boolean | null;
    level?: string | null;
  };
}

export const UPDATE_CARE_TASK: TypedDocumentNode<
  UpdateCareTaskData,
  UpdateCareTaskVariables
> = gql`
  mutation UpdateCareTask($input: UpdateCareTaskInput!) {
    updateCareTask(input: $input) {
      id
      plantId
      name
      description
      frequency
      frequencyEvery
      timeOfDay
      nextDueDate
      isPaused
      level
      createdAt
      updatedAt
      owner
    }
  }
`;

interface DeleteCareTaskData {
  deleteCareTask: {
    id: string;
  };
}

interface DeleteCareTaskVariables {
  input: {
    id: string;
  };
}

export const DELETE_CARE_TASK: TypedDocumentNode<
  DeleteCareTaskData,
  DeleteCareTaskVariables
> = gql`
  mutation DeleteCareTask($input: DeleteCareTaskInput!) {
    deleteCareTa sk(input: $input) {
      id
    }
  }
`;