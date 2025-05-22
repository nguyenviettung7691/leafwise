
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { SavePlantForm } from '@/components/plants/SavePlantForm';
import type { PlantFormData, Plant } from '@/types';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePlantData } from '@/contexts/PlantDataContext'; // Import PlantDataContext

export default function NewPlantPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { addPlant } = usePlantData(); // Use PlantDataContext
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveNewPlant = async (data: PlantFormData) => {
    setIsSaving(true);
    
    // Simulate network delay (optional, but good for UX)
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newPlantId = `mock-plant-${Date.now()}`;
    let newPhotoUrl: string | undefined = undefined;

    if (data.primaryPhoto && data.primaryPhoto[0]) {
      const file = data.primaryPhoto[0];
      newPhotoUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = (error) => {
          console.error("Error reading file for data URL:", error);
          resolve(undefined);
        }
        reader.readAsDataURL(file);
      });
    } else if (data.diagnosedPhotoDataUrl) { // This case might not be relevant for manual add, but good to keep if form supports it
      newPhotoUrl = data.diagnosedPhotoDataUrl;
    }
    
    const newPlant: Plant = {
      id: newPlantId,
      commonName: data.commonName,
      scientificName: data.scientificName || undefined,
      familyCategory: data.familyCategory,
      ageEstimate: data.ageEstimateYears ? `${data.ageEstimateYears} ${t('diagnosePage.resultDisplay.ageUnitYears', { count: data.ageEstimateYears })}` : undefined,
      ageEstimateYears: data.ageEstimateYears,
      healthCondition: data.healthCondition,
      location: data.location || undefined,
      customNotes: data.customNotes || undefined,
      primaryPhotoUrl: newPhotoUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(data.commonName)}`,
      photos: newPhotoUrl ? [{
        id: `p-${newPlantId}-initial-${Date.now()}`,
        url: newPhotoUrl,
        dateTaken: new Date().toISOString(),
        healthCondition: data.healthCondition, // Use form's health condition
        diagnosisNotes: t('addNewPlantPage.initialDiagnosisNotes'),
      }] : [],
      careTasks: [],
      plantingDate: new Date().toISOString(),
      lastCaredDate: undefined, // New plants don't have a last cared date
    };

    addPlant(newPlant); // Use context function to add plant

    toast({
      title: t('addNewPlantPage.toastPlantAddedTitle'),
      description: t('addNewPlantPage.toastPlantAddedDescription', { plantName: newPlant.commonName }),
    });
    setIsSaving(false);
    router.push(`/plants/${newPlantId}`);
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
            hideInternalHeader={false} // Show the form's own header here
          />
        )}
      </div>
    </AppLayout>
  );
}
