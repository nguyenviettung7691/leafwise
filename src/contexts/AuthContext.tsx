"use client";

import type { User } from "@/types";
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
  fetchUserAttributes, // Import fetchUserAttributes
  updateUserAttributes, // Import updateUserAttributes
  AuthUser, // Keep AuthUser type if needed for internal typing
} from "@aws-amplify/auth";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "./LanguageContext";

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedData: { name?: string }) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
// localStorage key can still be used to quickly check if a user was logged in
// but the source of truth for user data will be Cognito via getCurrentUser
const CURRENT_USER_ID_KEY = "currentLeafwiseUserId"; // Consider renaming or removing if not strictly needed

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();

  // Effect to check for current user on mount
  useEffect(() => {
    const checkCurrentUser = async () => {
      setIsLoading(true);
      try {
        // Use getCurrentUser to get the authenticated user from Amplify
        const currentUser = await getCurrentUser();
        // Fetch user attributes separately
        const userAttributes = await fetchUserAttributes();

        // Map Cognito user attributes to your User type
        setUser({
          id: currentUser.userId, // Cognito sub
          email: userAttributes.email || currentUser.username, // Use email from attributes or username
          name: userAttributes.name || currentUser.username, // Use name from attributes or username
          // avatarUrl and preferences are not available here
        });
        // Optionally update localStorage key with Cognito userId (sub)
        localStorage.setItem(CURRENT_USER_ID_KEY, currentUser.userId);
      } catch (error) {
        // No authenticated user found
        console.log("No current authenticated user", error);
        setUser(null);
        localStorage.removeItem(CURRENT_USER_ID_KEY); // Clear stale key
      } finally {
        setIsLoading(false);
      }
    };
    checkCurrentUser();
  }, []); // Empty dependency array means this runs once on mount

  // Login function using Amplify Auth
  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);

      try {
        // Call signIn and get the SignInOutput directly
        const signInOutput = await signIn({
          username: email, // Cognito username is email
          password,
        });

        // Check if sign-in was successful using the signInOutput object
        if (!signInOutput.isSignedIn) {
          // Handle cases where sign-in is not complete (e.g., MFA required)
          // For this simple login flow, we'll throw an error, but you might
          // want to handle different next steps (e.g., confirmSignIn)
          throw new Error("Sign in failed or requires further steps.");
        }
        // Get the current authenticated user after successful sign-in
        // This is needed to get user attributes like email or sub (userId)
        const currentUser = await getCurrentUser();
        const userAttributes = await fetchUserAttributes(); // Fetch attributes

        // Map Cognito user attributes to your User type
        setUser({
          id: currentUser.userId, // Cognito sub
          email: userAttributes.email || currentUser.username, // Use email from attributes
          name: userAttributes.name || currentUser.username, // Use name from attributes
          // avatarUrl and preferences are not available here
        });

        localStorage.setItem(CURRENT_USER_ID_KEY, currentUser.userId); // Store Cognito userId (sub)
        toast({
          title: t("authContextToasts.loginSuccessTitle"),
          description: t("authContextToasts.loginSuccessDescription", {
            name: userAttributes.name || currentUser.username, // Use name from attributes for toast
          }),
        });
        router.push("/"); // Redirect to homepage on success
      } catch (error: any) {
        console.error("Login error:", error);
        let errorMessage = t("authErrors.generalLoginFailed"); // Default error message

         if (error.name === 'UserNotFoundException' || error.name === 'NotAuthorizedException') {
            errorMessage = t("authErrors.userNotFound"); // Use translated message
         } else if (error.name === 'LimitExceededException') {
            errorMessage = t("authErrors.limitExceeded"); // Use translated message
         } else if (error.name === 'TooManyRequestsException') {
            errorMessage = t("authErrors.tooManyRequests"); // Use translated message
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
    [router, toast, t],
  );

  // Register function using Amplify Auth
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      setIsLoading(true);

      try {
        // Call Amplify signUp
        const { isSignUpComplete, userId, nextStep } = await signUp({
          username: email, // Cognito uses username for login, which is email in your config
          password: password,
          options: {
            userAttributes: {
              email: email,
              name: name, // Store name as a Cognito attribute
            },
          },
        });

        // Handle the next step (e.g., email confirmation)
        if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
           toast({
             title: t("authContextToasts.registrationSuccessTitle"),
             description: t("authContextToasts.confirmEmailDescription"),
           });
           router.push(`/confirm-signup?email=${encodeURIComponent(email)}`);
        } else if (isSignUpComplete) {
           // If sign up is complete immediately (e.g., no confirmation required)
           // Get the current user after successful sign-up if auto-logged in
           const currentUser = await getCurrentUser();
           const userAttributes = await fetchUserAttributes(); // Fetch attributes

           setUser({
             id: currentUser.userId,
             email: userAttributes.email || currentUser.username,
             name: userAttributes.name || currentUser.username,
           });
           localStorage.setItem(CURRENT_USER_ID_KEY, currentUser.userId);

           toast({
             title: t("authContextToasts.registrationSuccessTitle"),
             description: t("authContextToasts.registrationSuccessDescription", {
               name: userAttributes.name || currentUser.username, // Use name from attributes for toast
             }),
           });
           router.push("/"); // Redirect to homepage or dashboard
        } else {
           // Handle other potential next steps if needed
           console.log("Sign up next step:", nextStep);
           toast({
             title: t("common.info"),
             description: "Registration requires further steps.",
           });
        }
      } catch (error: any) {
        console.error("Registration error:", error);
        let errorMessage = t("authErrors.generalRegistrationFailed"); // Default error message

        if (error.name === 'UsernameExistsException') {
           errorMessage = t("authErrors.usernameExists"); // Use translated message
        } else if (error.name === 'InvalidPasswordException') {
           errorMessage = t("authErrors.invalidPassword"); // Use translated message
        } else if (error.name === 'LimitExceededException') {
            errorMessage = t("authErrors.limitExceeded"); // Use translated message
        } else if (error.name === 'TooManyRequestsException') {
            errorMessage = t("authErrors.tooManyRequests"); // Use translated message
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
    [router, toast, t],
  );

  // Logout function using Amplify Auth
  const logout = useCallback(async () => {
    setIsLoading(true); // Set loading state for logout

    try {
      await signOut(); // Call Amplify signOut
      setUser(null);
      localStorage.removeItem(CURRENT_USER_ID_KEY);
      // Keep IndexedDB clearPlantImages if needed for local data cleanup
      // await clearPlantImages(user.id); // Assuming user.id holds the email or sub

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
      setIsLoading(false); // Reset loading state
    }
  }, [router, toast, t]);

  // Update user attributes function using Amplify Auth
  const updateUser = useCallback(
    async (updatedData: { name?: string }) => { // Only allow updating name for now
      if (!user) {
        toast({
          title: t("common.error"),
          description: t("authContextToasts.errorNoUserSession"),
          variant: "destructive",
        });
        return;
      }
      setIsLoading(true);

      try {
        // Fetch current attributes to compare
        const userAttributes = await fetchUserAttributes();

        const attributesToUpdate: Record<string, string> = {};
        // Compare with fetched attributes
        if (updatedData.name !== undefined && updatedData.name !== userAttributes.name) {
          attributesToUpdate.name = updatedData.name;
        }

        // Update attributes in Cognito if there are any changes
        if (Object.keys(attributesToUpdate).length > 0) {
          // Call updateUserAttributes with the correct input structure
          await updateUserAttributes({ userAttributes: attributesToUpdate }); // Corrected call

          // After updating, fetch the user again to ensure state is fresh
          const updatedCognitoUser = await getCurrentUser();
          const updatedUserAttributes = await fetchUserAttributes();

           setUser({
             id: updatedCognitoUser.userId,
             email: updatedUserAttributes.email || updatedCognitoUser.username,
             name: updatedUserAttributes.name || updatedCognitoUser.username,
           });
        } else {
           // If no attributes were updated in Cognito, just ensure local state is consistent
           setUser((prevUser) => ({
             ...prevUser!,
             ...updatedData, // Apply local updates if any (e.g., if we added non-Cognito fields back)
           }));
        }

        toast({
          title: t("authContextToasts.profileUpdatedTitle"),
          description: t("authContextToasts.profileUpdatedDescription"),
        });
      } catch (error) {
        console.error("Update user error:", error);
        // Add more specific error handling based on Amplify Auth errors if needed
        toast({
          title: t("common.error"),
          description: t("profilePage.toasts.profileUpdateError"),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [user, toast, t],
  );

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout, updateUser, isLoading }}
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
