
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { SavePlantForm } from '@/components/plants/SavePlantForm';
import type { Plant, SavePlantFormValues } from '@/types';
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
  const { addPlant } = usePlantData();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveNewPlant = async (data: Omit<SavePlantFormValues, 'primaryPhoto'>, primaryPhotoFile?: File | null) => {
    if (!user?.id) {
      toast({ title: t('common.error'), description: t('authContextToasts.errorNoUserSession'), variant: 'destructive'});
      router.push('/login');
      return;
    }
    setIsSaving(true);

    const newPlantData: Omit<Plant, 'id' | 'photos' | 'careTasks' | 'primaryPhotoUrl' | 'createdAt' | 'updatedAt'> = {
      commonName: data.commonName,
      scientificName: data.scientificName || undefined,
      familyCategory: data.familyCategory,
      ageEstimateYears: data.ageEstimateYears,
      healthCondition: data.healthCondition,
      location: data.location || undefined,
      customNotes: data.customNotes || undefined,
      plantingDate: new Date().toISOString(),
    };

    try {
        const createdPlant = await addPlant(
          newPlantData as Omit<Plant, 'id' | 'photos' | 'careTasks' | 'createdAt' | 'updatedAt'>,
          primaryPhotoFile,
          undefined,
          'manual'
        );

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
