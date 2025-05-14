
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { NAV_ITEMS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <AppLayout navItems={NAV_ITEMS}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Application Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="min-h-[300px] flex items-center justify-center border-2 border-dashed border-border rounded-md p-8">
            <p className="text-muted-foreground text-lg text-center">
              Settings page is under construction. <br />
              Customize your app preferences here soon!
            </p>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
