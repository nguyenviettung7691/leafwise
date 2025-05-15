
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { APP_NAV_CONFIG } from '@/lib/constants';
import { SavePlantForm } from '@/components/plants/SavePlantForm';
import type { PlantFormData } from '@/types';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function NewPlantPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveNewPlant = async (data: PlantFormData) => {
    setIsSaving(true);
    // Simulate API call to save the new plant
    console.log('New plant data (simulated):', data);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: 'Plant Added!',
      description: `${data.commonName} has been (simulated) added to My Plants.`,
    });
    setIsSaving(false);
    router.push('/'); 
  };

  const handleCancelNewPlant = () => {
    router.push('/');
  };

  return (
    <AppLayout navItemsConfig={APP_NAV_CONFIG}>
      <div className="max-w-2xl mx-auto">
        {isSaving ? (
          <div className="flex justify-center items-center h-full min-h-[300px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg">Saving plant...</p>
          </div>
        ) : (
          <SavePlantForm
            onSave={handleSaveNewPlant}
            onCancel={handleCancelNewPlant}
            isLoading={isSaving}
            formTitle="Add New Plant"
            submitButtonText="Add Plant"
          />
        )}
      </div>
    </AppLayout>
  );
}
