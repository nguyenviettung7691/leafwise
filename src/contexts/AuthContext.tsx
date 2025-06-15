"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  fetchUserAttributes,
  updateUserAttributes,
} from "@aws-amplify/auth";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "./LanguageContext";
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type { User, UserPreferences } from "@/types";
import { uploadData, remove } from 'aws-amplify/storage';

const client = generateClient<Schema>();

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedData: { name?: string, preferences?: Partial<UserPreferences>, avatarFile?: File | null }) => Promise<boolean>;
  isLoading: boolean;
  isUpdatingUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();

  // Helper function to fetch user preferences from Data backend
  const fetchUserPreferences = useCallback(async (userId: string): Promise<UserPreferences | null> => {
      try {
          const { data: preferences } = await client.models.UserPreferences.get({ id: userId },{ authMode: 'userPool' });
          return preferences;
      } catch (error) {
          console.error(`Failed to fetch user preferences for ${userId}:`, error);
          return null;
      }
  }, []);

  // Helper function to create default user preferences if none exist
  const createDefaultUserPreferences = useCallback(async (userId: string): Promise<UserPreferences> => {
       try {
           const { data: preferences, errors } = await client.models.UserPreferences.create({
              id: userId,
              pushNotifications: false,
              avatarS3Key: null,
              notifyDaysBefore: 1,
              notifyTimeUnit: 'days',
              notifySpecificTime: '09:00',
           },{ authMode: 'userPool' });
           if (errors || !preferences) {
               console.error(`Failed to create default user preferences for ${userId}:`, errors);
               throw new Error(errors ? errors[0].message : "Failed to create default preferences.");
           }
           return preferences;
       } catch (error) {
           console.error(`Exception creating default user preferences for ${userId}:`, error);
           throw error;
       }
  }, []);

  // Effect to check for current user on mount
  useEffect(() => {
    const checkCurrentUser = async () => {
      setIsLoading(true);
      try {
        const currentUser = await getCurrentUser();
        const userAttributes = await fetchUserAttributes();

        let userPreferences = await fetchUserPreferences(currentUser.userId);
        if (!userPreferences) {
             userPreferences = await createDefaultUserPreferences(currentUser.userId);
        }

        setUser({
          id: currentUser.userId,
          email: userAttributes.email || currentUser.username,
          name: userAttributes.name || currentUser.username,
          avatarS3Key: userPreferences?.avatarS3Key,
          preferences: userPreferences,
        });
      } catch (error) {
        console.log("No current authenticated user", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkCurrentUser();
  }, [fetchUserPreferences, createDefaultUserPreferences]);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);

      try {
        const signInOutput = await signIn({
          username: email,
          password,
        });

        if (!signInOutput.isSignedIn) {
          // Handle cases where sign-in is not complete (e.g., MFA required)
          // For this simple login flow, we'll throw an error, but you might
          // want to handle different next steps (e.g., confirmSignIn)
          throw new Error("Sign in failed or requires further steps.");
        }

        const currentUser = await getCurrentUser();
        const userAttributes = await fetchUserAttributes();

        let userPreferences = await fetchUserPreferences(currentUser.userId);
         if (!userPreferences) {
             userPreferences = await createDefaultUserPreferences(currentUser.userId);
        }

        setUser({
          id: currentUser.userId,
          email: userAttributes.email || currentUser.username,
          name: userAttributes.name || currentUser.username,
          avatarS3Key: userPreferences?.avatarS3Key,
          preferences: userPreferences,
        });

        toast({
          title: t("authContextToasts.loginSuccessTitle"),
          description: t("authContextToasts.loginSuccessDescription", {
            name: userAttributes.name || currentUser.username,
          }),
        });
        router.push("/");
      } catch (error: any) {
        console.error("Login error:", error);
        let errorMessage = t("authErrors.generalLoginFailed");

         if (error.name === 'UserNotFoundException' || error.name === 'NotAuthorizedException') {
            errorMessage = t("authErrors.userNotFound");
         } else if (error.name === 'LimitExceededException') {
            errorMessage = t("authErrors.limitExceeded");
         } else if (error.name === 'TooManyRequestsException') {
            errorMessage = t("authErrors.tooManyRequests");
         }
        // Add more specific error handling based on Amplify Auth errors if needed

        toast({
          title: t("common.error"),
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [router, toast, t, fetchUserPreferences, createDefaultUserPreferences],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      setIsLoading(true);

      try {
        const { isSignUpComplete, userId, nextStep } = await signUp({
          username: email,
          password: password,
          options: {
            userAttributes: {
              email: email,
              name: name,
            },
          },
        });

        if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
           toast({
             title: t("authContextToasts.registrationSuccessTitle"),
             description: t("authContextToasts.confirmEmailDescription"),
           });
           router.push(`/confirm-signup?email=${encodeURIComponent(email)}`);
        } else if (isSignUpComplete) {
           const currentUser = await getCurrentUser();
           const userAttributes = await fetchUserAttributes();

           const userPreferences = await createDefaultUserPreferences(currentUser.userId);

           setUser({
             id: currentUser.userId,
             email: userAttributes.email || currentUser.username,
             name: userAttributes.name || currentUser.username,
             avatarS3Key: userPreferences?.avatarS3Key,
             preferences: userPreferences,
           });

           toast({
             title: t("authContextToasts.registrationSuccessTitle"),
             description: t("authContextToasts.registrationSuccessDescription", {
               name: userAttributes.name || currentUser.username,
             }),
           });
           router.push("/");
        } else {
           console.log("Sign up next step:", nextStep);
           toast({
             title: t("common.info"),
             description: "Registration requires further steps.",
           });
        }
      } catch (error: any) {
        console.error("Registration error:", error);
        let errorMessage = t("authErrors.generalRegistrationFailed");

        if (error.name === 'UsernameExistsException') {
           errorMessage = t("authErrors.usernameExists");
        } else if (error.name === 'InvalidPasswordException') {
           errorMessage = t("authErrors.invalidPassword");
        } else if (error.name === 'LimitExceededException') {
            errorMessage = t("authErrors.limitExceeded");
        } else if (error.name === 'TooManyRequestsException') {
            errorMessage = t("authErrors.tooManyRequests");
        }
        // Add more error types as needed (e.g., CodeMismatchException, ExpiredCodeException for confirmSignUp)

        toast({
          title: t("common.error"),
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [router, toast, t, createDefaultUserPreferences],
  );

  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      await signOut();
      setUser(null);

      toast({
        title: t("authContextToasts.loggedOutTitle"),
        description: t("authContextToasts.loggedOutDescription"),
      });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: t("common.error"),
        description: "Failed to log out.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [router, toast, t]);

  // Update user attributes function using Amplify Auth
  const updateUser = useCallback(
    async (updatedData: { name?: string, preferences?: Partial<UserPreferences>, avatarFile?: File | null }): Promise<boolean> => {
      if (!user) {
        toast({
          title: t("common.error"),
          description: t("authContextToasts.errorNoUserSession"),
          variant: "destructive",
        });
        return false;
      }
      setIsUpdatingUser(true); // Use specific loading state
      let success = false;
      try {
        // 1. Update Cognito attributes (only name for now)
        const userAttributes = await fetchUserAttributes();
        const attributesToUpdate: Record<string, string> = {};
        if (updatedData.name !== undefined && updatedData.name !== userAttributes.name) {
          attributesToUpdate.name = updatedData.name;
        }
        if (Object.keys(attributesToUpdate).length > 0) {
          await updateUserAttributes({ userAttributes: attributesToUpdate });
        }

        // 2. Handle Avatar Upload and update UserPreferences model
        let newAvatarS3Key = user.avatarS3Key; // Start with current key
        if (updatedData.avatarFile !== undefined) { // Check if avatarFile was explicitly passed
             if (updatedData.avatarFile === null) {
                 // User wants to remove the avatar
                 if (user.avatarS3Key) {
                     try {
                         await remove({ path: user.avatarS3Key });
                         newAvatarS3Key = null; // Set key to null after deletion
                     } catch (e) {
                         console.error("Failed to delete old avatar from S3:", e);
                         // Decide how to handle failure: warn user, or proceed keeping old avatar?
                         // For now, log and proceed, keeping the old key in the model.
                         toast({ title: t('common.error'), description: t('profilePage.toasts.errorDeletingAvatar'), variant: "destructive" });
                     }
                 } else {
                     newAvatarS3Key = null; // Already no avatar, just ensure key is null
                 }
             } else if (updatedData.avatarFile instanceof File) {
                 // User uploaded a new avatar file
                 // Delete old avatar first if it exists
                 if (user.avatarS3Key) {
                     try {
                         await remove({ path: user.avatarS3Key });
                     } catch (e) {
                         console.warn("Failed to delete old avatar from S3 before uploading new one:", e);
                         // Continue with upload even if old deletion fails
                     }
                 }
                 // Upload new avatar
                 try {
                     const fileExtension = updatedData.avatarFile.name.split('.').pop();
                     const { path } = await uploadData({
                        path: ({identityId}) => `avatars/${identityId}/avatar-${Date.now()}.${fileExtension}`,
                        data: updatedData.avatarFile
                     }).result;
                     newAvatarS3Key = path; // Store the new S3 key
                 } catch (e) {
                     console.error("Error uploading new avatar to S3:", e);
                     toast({ title: t('common.error'), description: t('profilePage.toasts.errorUploadingAvatar'), variant: "destructive" });
                     // Revert avatarS3Key to the previous value if upload fails
                     newAvatarS3Key = user.avatarS3Key;
                 }
             }
        }

        // 3. Update UserPreferences model
        if (updatedData.preferences !== undefined || newAvatarS3Key !== user.avatarS3Key) {
            const currentPreferences = user.preferences || await fetchUserPreferences(user.id) || await createDefaultUserPreferences(user.id); // Ensure we have current preferences
            const preferencesToUpdate = {
                ...(currentPreferences || {}), // Spread current preferences if they exist (includes id)
                ...updatedData.preferences, // Apply updates from input
                avatarS3Key: newAvatarS3Key, // Apply new avatar key
            } as const; // Use const assertion to ensure type safety

            // Only update if there are actual changes to preference fields or avatarS3Key
            const hasPreferenceChanges =
                (updatedData.preferences?.pushNotifications !== undefined && updatedData.preferences.pushNotifications !== currentPreferences.pushNotifications) ||
                (newAvatarS3Key !== user.avatarS3Key) ||
                (updatedData.preferences?.notifyDaysBefore !== undefined && updatedData.preferences.notifyDaysBefore !== currentPreferences.notifyDaysBefore) ||
                (updatedData.preferences?.notifyTimeUnit !== undefined && updatedData.preferences.notifyTimeUnit !== currentPreferences.notifyTimeUnit) ||
                (updatedData.preferences?.notifySpecificTime !== undefined && updatedData.preferences.notifySpecificTime !== currentPreferences.notifySpecificTime);

            if (hasPreferenceChanges) {
                 const { data: updatedPreferences, errors: preferenceErrors } = await client.models.UserPreferences.update(preferencesToUpdate, { authMode: 'userPool' });
                 if (preferenceErrors || !updatedPreferences) {
                     console.error(`Error updating user preferences for ${user.id}:`, preferenceErrors);
                     toast({ title: t('common.error'), description: t('profilePage.toasts.preferenceUpdateError'), variant: "destructive" });
                     // Decide how to handle failure: revert local state, or keep partial?
                     // For now, log and proceed.
                 } else {
                     // Update local user state with new preferences
                     setUser(prevUser => ({
                         ...prevUser!,
                         preferences: updatedPreferences,
                         avatarS3Key: updatedPreferences.avatarS3Key, // Ensure avatarS3Key is also updated in top-level user object
                     }));
                 }
            }
        }


        // After all updates, refetch user attributes to ensure name is fresh
        const updatedUserAttributes = await fetchUserAttributes();
        setUser(prevUser => ({
             ...prevUser!,
             name: updatedUserAttributes.name || prevUser!.name, // Update name in local state
        }));


        toast({
          title: t("authContextToasts.profileUpdatedTitle"),
          description: t("authContextToasts.profileUpdatedDescription"),
        });
        success = true;
      } catch (error) {
        console.error("Update user error:", error);
        toast({
          title: t("common.error"),
          description: t("profilePage.toasts.profileUpdateError"),
          variant: "destructive",
        });
        success = false;
      } finally {
        setIsUpdatingUser(false); // Use specific loading state
      }
      return success;
    },
    [user, toast, t, fetchUserPreferences, createDefaultUserPreferences], // Add dependencies
  );

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout, updateUser, isLoading, isUpdatingUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
