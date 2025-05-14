
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { IdentifyPlantClient } from '@/components/plants/IdentifyPlantClient';
import { APP_NAV_CONFIG } from '@/lib/constants'; // Updated import

export default function IdentifyPage() {
  return (
    <AppLayout navItemsConfig={APP_NAV_CONFIG}> {/* Updated prop */}
      <div className="max-w-2xl mx-auto">
        <IdentifyPlantClient />
      </div>
    </AppLayout>
  );
}
