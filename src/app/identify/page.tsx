import { AppLayout } from '@/components/layout/AppLayout';
import { IdentifyPlantClient } from '@/components/plants/IdentifyPlantClient';
import { NAV_ITEMS } from '@/lib/constants';

export default function IdentifyPage() {
  return (
    <AppLayout navItems={NAV_ITEMS}>
      <div className="max-w-2xl mx-auto">
        <IdentifyPlantClient />
      </div>
    </AppLayout>
  );
}
