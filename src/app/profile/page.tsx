
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { APP_NAV_CONFIG } from '@/lib/constants'; // Updated import
import { mockUser } from '@/lib/mock-data';
import type { User } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { UserCircle, Edit3, Bell, Palette } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/LanguageContext'; // Import useLanguage


export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useLanguage(); // Get translation function

  useEffect(() => {
    setUser(mockUser);
    setIsLoading(false);
  }, []);

  const handleEditProfile = () => {
    toast({
      title: "Edit Profile",
      description: "Profile editing functionality is coming soon!",
    });
  };

  const handlePreferenceChange = (preferenceKey: keyof NonNullable<User['preferences']>, value: boolean) => {
    setUser(currentUser => {
      if (!currentUser) return null;
      const updatedUser = {
        ...currentUser,
        preferences: {
          ...currentUser.preferences,
          [preferenceKey]: value,
        },
      };
      console.log(`Preference ${preferenceKey} changed to ${value}`);
      toast({
        title: "Preference Updated",
        description: `${preferenceKey.replace(/([A-Z])/g, ' $1').trim()} set to ${value ? 'On' : 'Off'}.`,
      });
      return updatedUser;
    });
  };

  if (isLoading || !user) {
    return (
      <AppLayout navItemsConfig={APP_NAV_CONFIG}> {/* Updated prop */}
        <div className="flex justify-center items-center h-full">
          <UserCircle className="h-12 w-12 animate-pulse text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout navItemsConfig={APP_NAV_CONFIG}> {/* Updated prop */}
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">{t('nav.profile')}</h1> {/* Example translation */}
          <Button variant="outline" onClick={handleEditProfile}>
            <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-2 border-primary shadow-sm">
                <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar"/>
                <AvatarFallback className="text-2xl bg-muted">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{user.name}</CardTitle>
                <CardDescription className="text-md">{user.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Preferences</CardTitle>
            <CardDescription>Manage your application settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/20">
              <div className='flex items-center gap-3'>
                <Bell className="h-5 w-5 text-primary" />
                <Label htmlFor="emailNotifications" className="text-base">Email Notifications</Label>
              </div>
              <Switch
                id="emailNotifications"
                checked={user.preferences?.emailNotifications || false}
                onCheckedChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
                aria-label="Toggle email notifications"
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/20">
               <div className='flex items-center gap-3'>
                <Palette className="h-5 w-5 text-primary" />
                <Label htmlFor="themePreference" className="text-base">Dark Mode (Coming Soon)</Label>
              </div>
              <Switch
                id="themePreference"
                disabled 
                aria-label="Toggle dark mode"
              />
            </div>
          </CardContent>
           <CardFooter className="pt-6 border-t">
            <p className="text-xs text-muted-foreground">Changes are saved automatically (mocked).</p>
          </CardFooter>
        </Card>

      </div>
    </AppLayout>
  );
}
