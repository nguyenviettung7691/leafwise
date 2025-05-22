
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
// APP_NAV_CONFIG is no longer passed as a prop
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon, Languages } from 'lucide-react'; // Renamed Settings to SettingsIcon, added Languages
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext'; // New import

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <AppLayout> {/* navItemsConfig prop removed */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-primary" />
            {t('settings.description')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3 p-4 border rounded-lg bg-secondary/20">
            <div className="flex items-center gap-3 mb-2">
              <Languages className="h-5 w-5 text-primary" />
              <Label htmlFor="language-select" className="text-base font-medium">
                {t('settings.language')}
              </Label>
            </div>
            <Select value={language} onValueChange={(value) => setLanguage(value as 'en' | 'vi')}>
              <SelectTrigger id="language-select" className="w-full md:w-[280px]">
                <SelectValue placeholder={t('settings.language')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('common.english')}</SelectItem>
                <SelectItem value="vi">{t('common.vietnamese')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-h-[200px] flex items-center justify-center border-2 border-dashed border-border rounded-md p-8">
            <p 
              className="text-muted-foreground text-lg text-center" 
              dangerouslySetInnerHTML={{ __html: t('settings.featureInProgress') }} 
            />
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
