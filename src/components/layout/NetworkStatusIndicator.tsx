
'use client';

import { useState, useEffect } from 'react';
import { Sprout, Leaf } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function NetworkStatusIndicator() {
  const { t, dateFnsLocale } = useLanguage();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [lastConnectedTime, setLastConnectedTime] = useState<Date | null>(null);
  const appVersionName = "Sapling Kodama"; // Codename

  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        setLastConnectedTime(new Date());
      }
    }

    const handleOnline = () => {
      setIsOnline(true);
      setLastConnectedTime(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const formatLastConnected = () => {
    if (!isOnline && !lastConnectedTime) {
      return t('networkIndicator.neverConnected');
    }
    if (isOnline && !lastConnectedTime && typeof navigator !== 'undefined' && !navigator.onLine) {
      return t('networkIndicator.checking');
    }
    if (lastConnectedTime) {
      return t('networkIndicator.lastConnected', { time: format(lastConnectedTime, 'Pp', { locale: dateFnsLocale }) });
    }
    return t('networkIndicator.checking');
  };

  const tooltipStatusText = isOnline ? t('networkIndicator.online') : t('networkIndicator.offline');

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                "p-2 rounded-full shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors",
                isOnline ? "bg-primary/80 hover:bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
              aria-label={tooltipStatusText}
            >
              {isOnline ? <Sprout className="h-5 w-5" /> : <Leaf className="h-5 w-5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            <p className={cn("font-semibold", isOnline ? "text-primary" : "text-destructive")}>{tooltipStatusText}</p>
            <p className="text-muted-foreground">{formatLastConnected()}</p>
            <p className="text-muted-foreground mt-1">{t('networkIndicator.version', { versionName: appVersionName })}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
