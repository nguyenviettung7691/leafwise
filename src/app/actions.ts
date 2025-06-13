'use server';

import webpush from 'web-push';
import serverClient from '@/lib/serverClient';

// Configure web-push with your VAPID keys
// Ensure these environment variables are set in your deployment environment
webpush.setVapidDetails(
  'mailto:matsu-nguyen@proton.me', // Replace with your contact email
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushSubscriptionKeys {
    p256dh: string;
    auth: string;
}

interface PushSubscription {
    endpoint: string;
    expirationTime: number | null;
    keys: PushSubscriptionKeys;
}

export async function subscribeUser(userId: string, sub: PushSubscription) {
  console.log(`Attempting to subscribe user ${userId}`, sub);
  try {
    // Check if a subscription already exists for this user
    const { data: existingSubscription, errors: getErrors } = await serverClient.models.PushSubscription.get({ id: userId }, { authMode: 'userPool' });

    if (getErrors) {
        // If the error is 'not found', it's expected and we proceed to create
        if (getErrors[0].message.includes('not found')) {
            console.log(`Subscription for user ${userId} not found. Proceeding to create.`);
        } else {
            // Log other errors during get and return failure
            console.error(`Error getting existing subscription for user ${userId}:`, getErrors);
            return { success: false, error: getErrors[0].message || 'Failed to check existing subscription.' };
        }
    }

    if (existingSubscription) {
        console.log(`Subscription already exists for user ${userId}. Updating.`);
        // Update the existing subscription
        const { data: updatedSubscription, errors: updateErrors } = await serverClient.models.PushSubscription.update({
            id: userId, // Use user ID as the ID
            endpoint: sub.endpoint,
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
            userId: userId, // Ensure userId is set
        },{ authMode: 'userPool' });
         if (updateErrors) {
            console.error(`Error updating subscription for user ${userId}:`, updateErrors);
            // Return the specific error message from the backend
            return { success: false, error: updateErrors[0].message || 'Failed to update subscription.' };
         }
         console.log(`Subscription updated for user ${userId}.`);
         return { success: true, subscription: updatedSubscription };

    } else {
        console.log(`Creating new subscription for user ${userId}.`);
        // Create a new subscription record
        const { data: createdSubscription, errors: createErrors } = await serverClient.models.PushSubscription.create({
            id: userId, // Use user ID as the ID for a 1:1 mapping
            endpoint: sub.endpoint,
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
            userId: userId, // Ensure userId is set
        },{ authMode: 'userPool' });

        if (createErrors) {
            console.error(`Error creating subscription for user ${userId}:`, createErrors);
            // Return the specific error message from the backend
            return { success: false, error: createErrors[0].message || 'Failed to create subscription.' };
        }
        console.log(`Subscription created for user ${userId}.`);
        return { success: true, subscription: createdSubscription };
    }

  } catch (error: any) {
    console.error(`Error subscribing user ${userId}:`, error);
    return { success: false, error: error.message || 'Failed to subscribe user.' };
  }
}

export async function unsubscribeUser(userId: string) {
  console.log(`Attempting to unsubscribe user ${userId}`);
   try {
    // Delete the subscription record for this user using their ID
    const { data: deletedSubscription, errors } = await serverClient.models.PushSubscription.delete({ id: userId },{ authMode: 'userPool' });

    if (errors) {
        console.error(`Error deleting subscription for user ${userId}:`, errors);
        // If the subscription wasn't found, it's still a success from the user's perspective
        if (errors[0].message.includes('not found')) {
             console.log(`Subscription for user ${userId} not found, but unsubscribe requested. Considering successful.`);
             return { success: true };
        }
        return { success: false, error: errors[0].message || 'Failed to delete subscription record.' };
    }
    console.log(`Subscription deleted for user ${userId}.`);
    return { success: true };

  } catch (error: any) {
    console.error(`Error unsubscribing user ${userId}:`, error);
    return { success: false, error: error.message || 'Failed to unsubscribe user.' };
  }
}

// This is a test function to send a notification to a specific user's subscription
// In a real application, this would be triggered by a backend process for scheduled tasks
export async function sendTestNotification(userId: string, message: string, plantId?: string) {
  console.log(`Attempting to send test notification to user ${userId}`);
  try {
    // Fetch the user's subscription from the backend
    const { data: subscription, errors: getErrors } = await serverClient.models.PushSubscription.get({ id: userId },{ authMode: 'userPool' });

    if (getErrors || !subscription) {
      console.warn(`No subscription found for user ${userId}. Cannot send notification.`, getErrors);
      return { success: false, error: getErrors ? getErrors[0].message : 'No subscription available for this user.' };
    }

    const payload = JSON.stringify({
      title: 'LeafWise Test Notification',
      body: message,
      icon: '/maskable-icon.png', // Use your app icon
      data: { // Optional data to include, e.g., for navigation
        url: plantId ? `/plants/${plantId}` : '/', // URL to open on click
        plantId: plantId,
      },
    });

    // web-push expects a specific format for the subscription object
    const webPushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
        },
    };

    await webpush.sendNotification(
      webPushSubscription,
      payload
    );
    console.log(`Test notification sent to user ${userId}.`);
    return { success: true };

  } catch (error: any) {
    console.error(`Error sending push notification to user ${userId}:`, error);

    // Handle specific web-push errors, e.g., subscription expired
    if (error.statusCode === 404 || error.statusCode === 410) {
        console.log(`Subscription for user ${userId} is no longer valid. Removing from backend.`);
        // Automatically remove invalid subscription
        await unsubscribeUser(userId);
        return { success: false, error: 'Subscription expired or invalid. Please re-subscribe.' };
    }

    return { success: false, error: `Failed to send notification: ${error.message}` };
  }
}