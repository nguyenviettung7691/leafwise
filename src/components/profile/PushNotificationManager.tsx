'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Bell, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { urlBase64ToUint8Array } from '@/lib/utils';
import { subscribeUser, unsubscribeUser, sendTestNotification } from '@/app/actions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface NotificationSettings {
  enabled: boolean;
  daysBefore: number;
  timeUnit: 'days' | 'weeks';
  specificTime: string; // HH:MM format
}

const defaultNotificationSettings: NotificationSettings = {
  enabled: false,
  daysBefore: 1,
  timeUnit: 'days',
  specificTime: '09:00',
};

interface PushNotificationManagerProps {
  // We'll manage state internally based on AuthContext user preferences
}

export function PushNotificationManager({}: PushNotificationManagerProps) {
  const { user, isLoading: authLoading, updateUser } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [isSupported, setIsSupported] = useState(false);
  const [isBrowserSubscribed, setIsBrowserSubscribed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' ? Notification.permission : 'default'
  );
  const [notificationTiming, setNotificationTiming] = useState<{
    daysBefore: number | string;
    timeUnit: 'days' | 'weeks';
    specificTime: string; // HH:MM
  }>(defaultNotificationSettings);

  const didInit = useRef(false);

  const isPushEnabledInPreferences = user?.preferences?.pushNotifications ?? false;
  const isTimingDisabled = !isPushEnabledInPreferences || isProcessing || notificationPermission !== 'granted';
  const isToggleDisabled = authLoading || isProcessing || notificationPermission === 'denied';

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast({ title: t('common.error'), description: t('profilePage.notifications.browserNotSupported'), variant: "destructive" });
      return false;
    }
    if (Notification.permission === 'granted') {
      setNotificationPermission('granted');
      return true;
    }
    if (Notification.permission === 'denied') {
      setNotificationPermission('denied');
      toast({ title: t('profilePage.notifications.permissionPreviouslyDeniedTitle'), description: t('profilePage.notifications.permissionPreviouslyDeniedBody'), variant: "default" });
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast({ title: t('profilePage.notifications.welcomeTitle'), description: t('profilePage.notifications.welcomeBody') });
        return true;
      } else {
        toast({ title: t('profilePage.notifications.permissionDeniedTitle'), description: t('profilePage.notifications.permissionDeniedBody'), variant: "default" });
        return false;
      }
    } catch (error) {
        console.error("Error requesting notification permission:", error);
        toast({ title: t('common.error'), description: t('profilePage.notifications.failedToRequestPermission'), variant: "destructive"}); // Add i18n key
        return false;
    }
  }, [toast, t]);

  const checkSubscriptionStatus = useCallback(async () => {
    setIsProcessing(true);
    let browserIsCurrentlySubscribed = false;
    try {
      /// Ensure Service Worker is active and ready before checking subscription
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const registration = await navigator.serviceWorker.ready;
          const subFromPushManager = await registration.pushManager.getSubscription();

          if (subFromPushManager) {
              browserIsCurrentlySubscribed = true;
          }
          // If no subFromPushManager, browserIsCurrentlySubscribed remains false.
      }
      // If serviceWorker or PushManager not supported (or SW not active),
      // browserIsCurrentlySubscribed remains false.
      setIsBrowserSubscribed(browserIsCurrentlySubscribed);

    } catch (error) {
      console.error("Error checking push subscription status:", error);
      setIsBrowserSubscribed(false);
    } finally {
      setIsProcessing(false);
    }
  }, [setIsBrowserSubscribed, setIsProcessing]);

  // one time init for browser current state
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
        setIsSupported(true);
        const currentPermission = Notification.permission;
        setNotificationPermission(currentPermission);
        checkSubscriptionStatus();
    } else {
        setIsSupported(false);
    }
  }, []);

  // update state when user preferences changed
  useEffect(() => {
    if (authLoading) {
        return;
    }

    if (user?.preferences) {
      setNotificationTiming({
        daysBefore: user.preferences.notifyDaysBefore ?? defaultNotificationSettings.daysBefore,
        timeUnit: (user.preferences.notifyTimeUnit === 'days' || user.preferences.notifyTimeUnit === 'weeks')
          ? user.preferences.notifyTimeUnit
          : defaultNotificationSettings.timeUnit,
        specificTime: user.preferences.notifySpecificTime ?? defaultNotificationSettings.specificTime,
      });
    } else {
       setNotificationTiming(defaultNotificationSettings);
    }
  }, [user?.preferences]);

  const subscribeToPush = async () => {
    if (!isSupported || !user?.id || notificationPermission !== 'granted') {
        console.warn("Cannot subscribe: Not supported, no user, or permission not granted.");
        return;
    }
    setIsProcessing(true); // Use combined state
    let browserSub: PushSubscription | null = null;
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSub = await registration.pushManager.getSubscription();

      browserSub = existingSub;

      if (!existingSub) {
         console.log("Subscribing in browser...");
         browserSub = await registration.pushManager.subscribe({
           userVisibleOnly: true,
           applicationServerKey: urlBase64ToUint8Array(
             process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
           ),
         });
         console.log("Browser subscribed:", browserSub);
      } else {
         console.log("Already subscribed in browser.");
      }

      if (browserSub) {
          const serializedSub = JSON.parse(JSON.stringify(browserSub));
          const serverActionResult = await subscribeUser(user.id, serializedSub);

          if (serverActionResult.success) {
              console.log("Server action subscribeUser successful.");
              toast({ title: t('common.success'), description: t('profilePage.notifications.successfullySubscribed') });
              setIsBrowserSubscribed(true);
          } else {
              console.error("Server action subscribeUser failed:", serverActionResult.error);
              // Browser is subscribed, but backend sync failed.
              // isBrowserSubscribed remains true. Show error toast.
              toast({ title: t('common.error'), description: serverActionResult.error || t('profilePage.notifications.failedToSubscribe'), variant: "destructive" });
          }
      } else {
          // This case should ideally not happen if permission is granted,
          // but handle defensively. Browser subscription failed.
          console.error("Browser subscription failed unexpectedly.");
          toast({ title: t('common.error'), description: t('profilePage.notifications.failedToSubscribe'), variant: "destructive" });
      }

    } catch (error: any) {
      console.error("Error during push subscription process:", error);
      let errorMessage = t('profilePage.notifications.failedToSubscribe');
      if (error.message.includes('denied')) {
         errorMessage = t('profilePage.notifications.permissionDeniedBody');
      }
      toast({ title: t('common.error'), description: errorMessage, variant: "destructive" });
    }
  }


  const unsubscribeFromPush = async () => {
    if (!isSupported || !user?.id) return;
    setIsProcessing(true); // Use combined state
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();

      if (sub) {
        console.log("Unsubscribing in browser...");
        await sub.unsubscribe();
        console.log("Browser unsubscribed.");
      } else {
         console.log("No browser subscription found to unsubscribe.");
      }

      const serverActionResult = await unsubscribeUser(user.id); // Await and check result

      if (serverActionResult.success) {
          console.log("Server action unsubscribeUser successful.");
          toast({ title: t('common.success'), description: t('profilePage.notifications.successfullyUnsubscribed') });
          setIsBrowserSubscribed(false);
      } else {
          console.error("Server action unsubscribeUser failed:", serverActionResult.error);
          // Browser is unsubscribed, but backend failed.
          // isBrowserSubscribed is already false. Show error toast.
          toast({ title: t('common.error'), description: serverActionResult.error || t('profilePage.notifications.failedToUnsubscribe'), variant: "destructive" });
      }


    } catch (error) {
      console.error("Error during push unsubscription process:", error);
      // If browser unsubscribe failed, isBrowserSubscribed might still be true.
      // If backend unsubscribe failed, isBrowserSubscribed is already false (if browser succeeded).
      // Let's ensure isBrowserSubscribed reflects the *browser's* state after the attempt.
      // A more complex check might be needed here if browser unsubscribe can fail *after* setting state.
      // For now, assume browser unsubscribe either succeeds or throws before state update.
      toast({ title: t('common.error'), description: t('profilePage.notifications.failedToUnsubscribe'), variant: "destructive" });
    }
  }

  const handlePushToggle = async (checked: boolean) => {
    if (!user?.id || authLoading || isProcessing) return; // Use combined state

    setIsProcessing(true); // Use combined state
    try {
        // Update the user preference toggle first
        // This will trigger the AuthContext effect which updates the local user state
        await updateUser({ preferences: { ...user.preferences, pushNotifications: checked } });
        // Local state will be updated by AuthContext effect

        if (checked) {
            // If enabling, request permission and subscribe
            if (notificationPermission === 'denied') {
                 toast({ title: t('common.info'), description: t('profilePage.notifications.permissionPreviouslyDeniedBody'), variant: "default" });
                 // The switch will visually revert if the preference update fails or AuthContext syncs back
                 return; // Stop here if permission is denied
            }
            if (notificationPermission === 'default') {
                 const granted = await requestNotificationPermission();
                 if (!granted) {
                     // Permission not granted, keep switch off (AuthContext effect handles this)
                     return;
                 }
            }
            // Permission is granted, proceed with subscription
            // subscribeToPush manages its own loading state (isProcessing)
            await subscribeToPush();

        } else {
            // If disabling, unsubscribe
            // unsubscribeFromPush manages its own loading state (isProcessing)
            await unsubscribeFromPush();
        }

    } catch (error) {
        console.error("Error toggling push notifications:", error);
        toast({ title: t('common.error'), description: t('profilePage.toasts.preferenceUpdateError', { preferenceKey: t('profilePage.preferences.pushNotifications') }), variant: "destructive" });
        // Revert the switch visually on error if needed - AuthContext effect should handle this
    } finally {
        setIsProcessing(false); // Use combined state
    }
  }

  const handleTimingInputChange = (key: keyof Omit<typeof notificationTiming, 'enabled'>, value: any) => {
    if (key === 'daysBefore') {
      if (value === "" || (/^\d+$/.test(String(value)) && parseInt(String(value), 10) >= 0) ) {
        setNotificationTiming(prev => ({ ...prev, daysBefore: value }));
      } else if (typeof value === 'number' && value >= 0) {
        setNotificationTiming(prev => ({ ...prev, daysBefore: value }));
      }
    } else {
      setNotificationTiming(prev => ({ ...prev, [key]: value }));
    }
  };

  // Saves all timing settings
  const handleSaveTimingSettings = async () => {
    if (!user?.id || authLoading || isProcessing) return;

    const daysBeforeValue = parseInt(String(notificationTiming.daysBefore), 10);
    const validDaysBefore = (!isNaN(daysBeforeValue) && daysBeforeValue >= 0)
        ? daysBeforeValue
        : defaultNotificationSettings.daysBefore; // Fallback to default if invalid or empty

    setIsProcessing(true);
    try {
        await updateUser({
            preferences: {
                ...user.preferences,
                notifyDaysBefore: validDaysBefore,
                notifyTimeUnit: notificationTiming.timeUnit,
                notifySpecificTime: notificationTiming.specificTime,
            }
        });
        toast({ title: t('common.success'), description: t('profilePage.toasts.preferenceUpdatedSuccess', { preferenceKey: t('profilePage.notifications.timingSettingsLabel')})});

    } catch (error) {
        console.error(`Error saving notification timing settings:`, error);
        toast({ title: t('common.error'), description: t('profilePage.toasts.preferenceUpdateError', { preferenceKey: t('profilePage.notifications.timingSettingsLabel') }), variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  }


  // Test notification state and handler
  const [testMessage, setTestMessage] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleSendTestNotification = async () => {
    if (!user?.id || !isBrowserSubscribed || isSendingTest || isProcessing) return; // Use combined state
    setIsSendingTest(true);
    try {
      // Use the server action to send the test notification
      const result = await sendTestNotification(user.id, testMessage || t('profilePage.notifications.testSentBodySample')); // Use i18n key for default message
      if (result.success) {
         toast({ title: t('profilePage.notifications.testSentTitle'), description: t('profilePage.notifications.testSentBody') });
         setTestMessage('');
      } else {
         toast({ title: t('common.error'), description: result.error || t('profilePage.notifications.testSendError'), variant: "destructive" }); // Add i18n key
      }
    } catch (error) {
      console.error("Error sending test notification:", error);
      toast({ title: t('common.error'), description: t('profilePage.notifications.testSendError'), variant: "destructive" }); // Add i18n key
    } finally {
      setIsSendingTest(false);
    }
  };


  if (!isSupported) {
    return (
      <Alert variant="default" className="bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300">
        <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        <AlertTitle>{t('profilePage.notifications.browserNotSupportedTitle')}</AlertTitle> {/* Add i18n key */}
        <AlertDescription>{t('profilePage.notifications.browserNotSupported')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" />
          {t('profilePage.preferences.pushNotifications')} {/* Re-using preference key as title */}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="push-notifications-toggle" className="text-base font-medium">
            {t('profilePage.notifications.sectionDescription')}
          </Label>
          {isProcessing ? ( // Show loader if any process is loading
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <Switch
              id="push-notifications-toggle"
              checked={isPushEnabledInPreferences}
              onCheckedChange={handlePushToggle}
              disabled={isToggleDisabled} // Use combined disabled state
            />
          )}
        </div>

        {/* Alerts based on permission and subscription status */}
        {notificationPermission === 'denied' && (
          <Alert variant="default" className="bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300">
              <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertTitle>{t('profilePage.notifications.permissionPreviouslyDeniedTitle')}</AlertTitle>
              <AlertDescription>{t('profilePage.notifications.permissionPreviouslyDeniedBody')}</AlertDescription>
          </Alert>
        )}
         {notificationPermission === 'default' && isPushEnabledInPreferences && !isProcessing && ( // Only show if not processing
             <Alert variant="default" className="bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle>{t('profilePage.notifications.permissionRequiredTitle')}</AlertTitle> {/* Add i18n key */}
                <AlertDescription>{t('profilePage.notifications.permissionRequiredBody')}</AlertDescription> {/* Add i18n key */}
            </Alert>
         )}
         {/* Show "Not Subscribed" alert only if preference is ON, permission is GRANTED, NOT browser subscribed, and NOT currently processing */}
         {notificationPermission === 'granted' && isPushEnabledInPreferences && !isBrowserSubscribed && !isProcessing && (
             <Alert variant="default" className="bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle>{t('profilePage.notifications.notSubscribedTitle')}</AlertTitle> {/* Add i18n key */}
                <AlertDescription>{t('profilePage.notifications.notSubscribedBody')}</AlertDescription> {/* Add i18n key */}
            </Alert>
         )}


        {/* Notification Timing Settings */}
        <div className="space-y-3 pt-4 border-t">
            <p className="text-sm font-medium">{t('profilePage.notifications.timingSettingsLabel')}</p> {/* Add i18n key */}
            <p className="text-xs text-muted-foreground">{t('profilePage.notifications.timingSettingsDescription')}</p> {/* Add i18n key */}

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className='flex items-center gap-2'>
                  <Label htmlFor="notify-days-before" className="text-sm font-normal shrink-0">{t('profilePage.notifications.notifyBeforeLabel')}</Label> {/* Add i18n key */}
                  <Input
                      id="notify-days-before"
                      type="number"
                      min="0"
                      value={String(notificationTiming.daysBefore)} // Handle number or ""
                      onChange={(e) => handleTimingInputChange('daysBefore', e.target.value)}
                      className="w-20"
                      disabled={isTimingDisabled}
                  />
                  <Select
                      value={notificationTiming.timeUnit}
                      onValueChange={(value) => handleTimingInputChange('timeUnit', value as 'days' | 'weeks')}
                      disabled={isTimingDisabled}
                  >
                      <SelectTrigger className="w-[100px]">
                          <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="days">{t('common.days')}</SelectItem>
                          <SelectItem value="weeks">{t('common.weeks')}</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
                 <div className='flex items-center gap-2'>
                  <Label htmlFor="notify-specific-time" className="text-sm font-normal shrink-0">{t('profilePage.notifications.atTimeLabel')}</Label> {/* Add i18n key */}
                  <Input
                      id="notify-specific-time"
                      type="time"
                      value={notificationTiming.specificTime || defaultNotificationSettings.specificTime}
                      onChange={(e) => handleTimingInputChange('specificTime', e.target.value)}
                      className="w-34"
                      disabled={isTimingDisabled}
                  />
                 </div>
            </div>
            <Button
                onClick={handleSaveTimingSettings}
                disabled={isTimingDisabled || isProcessing}
                size="sm"
            >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('common.saveChanges')}
            </Button>
        </div>


        {/* Test Notification Section */}
        {notificationPermission === 'granted' && isBrowserSubscribed && (
          <div className="space-y-2 pt-4 border-t">
              <p className="text-sm font-medium text-foreground/80">{t('profilePage.notifications.testSectionTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('profilePage.notifications.currentPermissionLabel')}: <Badge variant="secondary" className="capitalize">{notificationPermission}</Badge></p>
              <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                      type="text"
                      placeholder={t('profilePage.notifications.testMessagePlaceholder')}
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      disabled={isSendingTest || isProcessing} // Disable if sending test or any other process
                      className="flex-grow"
                  />
                  <Button onClick={handleSendTestNotification} disabled={isSendingTest || !user?.id || isProcessing}> {/* Disable if sending test, no user, or any other process */}
                      {isSendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Bell className="mr-2 h-4 w-4"/>}
                      {t('profilePage.notifications.sendTestButton')}
                  </Button>
              </div>
          </div>
        )}
         {notificationPermission === 'default' && (
            <div className="space-y-2 pt-4 border-t">
                <p className="text-sm font-medium text-foreground/80">{t('profilePage.notifications.testSectionTitle')}</p>
                <p className="text-xs text-muted-foreground">{t('profilePage.notifications.currentPermissionLabel')}: <Badge variant="secondary" className="capitalize">{notificationPermission}</Badge></p>
                <Button variant="outline" size="sm" onClick={requestNotificationPermission} disabled={authLoading || isProcessing}> {/* Disable if auth loading or any other process */}
                    {t('profilePage.notifications.requestPermissionButton')}
                </Button>
            </div>
         )}
         {/* Permission Denied Section */}
         {notificationPermission === 'denied' && (
            <div className="space-y-2 pt-4 border-t">
                <p className="text-sm font-medium text-foreground/80">{t('profilePage.notifications.testSectionTitle')}</p>
                <p className="text-xs text-muted-foreground">{t('profilePage.notifications.currentPermissionLabel')}: <Badge variant="secondary" className="capitalize">{notificationPermission}</Badge></p>
                <Button variant="outline" size="sm" disabled>
                    {t('profilePage.notifications.permissionBlocked')}
                </Button>
            </div>
         )}

      </CardContent>
    </Card>
  );
}