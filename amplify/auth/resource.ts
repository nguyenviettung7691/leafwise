import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: "CODE",
      verificationEmailSubject: "Almost there to LeafWise!",
      verificationEmailBody: (createCode) => `Use this code to confirm your account: ${createCode()}`,
      userInvitation: {
        emailSubject: "Welcome to LeafWise!",
        emailBody: (user, code) =>
        `Good to have you! You can now login with username ${user()} and password ${code()}. Go and plant some trees!`, 
      },
   },
  },
});
