
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { SavePlantForm } from '@/components/plants/SavePlantForm';
import type { PlantFormData, Plant } from '@/types';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePlantData } from '@/contexts/PlantDataContext';
import { useAuth } from '@/contexts/AuthContext';

export default function NewPlantPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { addPlant: addPlantToContext } = usePlantData();
  const [isSaving, setIsSaving] = useState(false);

  // Update handleSaveNewPlant to accept plant data and the primary photo file
  const handleSaveNewPlant = async (data: Omit<PlantFormData, 'primaryPhoto' | 'diagnosedPhotoDataUrl'>, primaryPhotoFile?: File | null) => {
    if (!user?.id) {
      toast({ title: t('common.error'), description: t('authContextToasts.errorNoUserSession'), variant: 'destructive'});
      router.push('/login');
      return;
    }
    setIsSaving(true);

    // The PlantDataContext addPlant method handles creating the plant and uploading the image
    // We just need to prepare the plant data (without image data/keys) and pass the file.
    const newPlantData: Omit<Plant, 'id' | 'photos' | 'careTasks' | 'lastCaredDate'> = {
      commonName: data.commonName,
      scientificName: data.scientificName || undefined,
      familyCategory: data.familyCategory,
      ageEstimateYears: data.ageEstimateYears,
      healthCondition: data.healthCondition,
      location: data.location || undefined,
      customNotes: data.customNotes || undefined,
      plantingDate: new Date().toISOString(),
      // primaryPhotoUrl, photos, careTasks, lastCaredDate will be handled by the context method
    };

    try {
        // Call the context method, passing the plant data and the file
        const createdPlant = await addPlantToContext(newPlantData as Plant, primaryPhotoFile); // Cast to Plant as context expects it

        toast({
          title: t('addNewPlantPage.toastPlantAddedTitle'),
          description: t('addNewPlantPage.toastPlantAddedDescription', { plantName: createdPlant.commonName }),
        });
        // Redirect using the ID returned by the context method
        router.push(`/plants/${createdPlant.id}`);

    } catch (error) {
        console.error("Error saving new plant:", error);
        toast({ title: t('common.error'), description: t('addNewPlantPage.toastErrorSavingPlant'), variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const handleCancelNewPlant = () => {
    router.push('/');
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        {isSaving ? (
          <div className="flex justify-center items-center h-full min-h-[300px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg">{t('addNewPlantPage.savingText')}</p>
          </div>
        ) : (
          <SavePlantForm
            onSave={handleSaveNewPlant}
            onCancel={handleCancelNewPlant}
            isLoading={isSaving}
            formTitle={t('addNewPlantPage.formTitle')}
            formDescription={t('addNewPlantPage.formDescription')}
            submitButtonText={t('addNewPlantPage.submitButtonText')}
            hideInternalHeader={false}
          />
        )}
      </div>
    </AppLayout>
  );
}
