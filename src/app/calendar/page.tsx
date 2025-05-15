
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
// APP_NAV_CONFIG is no longer passed as a prop
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext'; // Import useLanguage

export default function CalendarPage() {
  const { t } = useLanguage(); // Get translation function

  return (
    <AppLayout> {/* navItemsConfig prop removed */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('nav.careCalendar')}</h1> {/* Example of translating page title */}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            {/* This title could also be translated if needed */}
            Upcoming Tasks 
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="min-h-[300px] flex items-center justify-center border-2 border-dashed border-border rounded-md p-8">
            <p className="text-muted-foreground text-lg text-center">
              {/* This text could also be translated */}
              Care calendar feature is under development. <br />
              Soon you'll see all your plant care tasks here!
            </p>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
