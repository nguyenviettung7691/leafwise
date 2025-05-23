
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
import { addImage, dataURLtoBlob } from '@/lib/idb-helper'; // Import IDB helpers

export default function NewPlantPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { addPlant: addPlantToContext } = usePlantData();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveNewPlant = async (data: PlantFormData) => {
    setIsSaving(true);

    const newPlantId = `plant-${Date.now()}`;
    let finalPhotoIdForStorage: string | undefined = undefined;
    let generatedPrimaryPhotoUrl: string | undefined = undefined;

    if (data.diagnosedPhotoDataUrl && data.diagnosedPhotoDataUrl.startsWith('data:image/')) {
      const blob = dataURLtoBlob(data.diagnosedPhotoDataUrl);
      if (blob) {
        finalPhotoIdForStorage = `photo-${newPlantId}-${Date.now()}`;
        try {
          await addImage(finalPhotoIdForStorage, blob);
          generatedPrimaryPhotoUrl = finalPhotoIdForStorage; // Store IDB key
        } catch (e) {
          console.error("Error during IndexedDB image save:", e);
          toast({ title: t('common.error'), description: "Failed to save plant image locally.", variant: "destructive" });
          generatedPrimaryPhotoUrl = `https://placehold.co/600x400.png?text=${encodeURIComponent(data.commonName || 'Plant')}`; // Fallback
        }
      } else {
         toast({ title: t('common.error'), description: "Failed to process image for local storage.", variant: "destructive" });
         generatedPrimaryPhotoUrl = `https://placehold.co/600x400.png?text=${encodeURIComponent(data.commonName || 'Plant')}`;
      }
    } else if (data.diagnosedPhotoDataUrl) {
      // This case implies an existing URL (e.g. placeholder, or already an IDB key if editing was done this way)
      // For a new plant, this shouldn't typically happen if SavePlantForm provides a data URL for new uploads.
      generatedPrimaryPhotoUrl = data.diagnosedPhotoDataUrl;
    } else {
      generatedPrimaryPhotoUrl = `https://placehold.co/600x400.png?text=${encodeURIComponent(data.commonName || 'Plant')}`;
    }
    
    const newPlant: Plant = {
      id: newPlantId,
      commonName: data.commonName,
      scientificName: data.scientificName || undefined,
      familyCategory: data.familyCategory,
      ageEstimate: data.ageEstimateYears ? t('diagnosePage.resultDisplay.ageUnitYears', { count: data.ageEstimateYears }) : undefined,
      ageEstimateYears: data.ageEstimateYears,
      healthCondition: data.healthCondition,
      location: data.location || undefined,
      customNotes: data.customNotes || undefined,
      primaryPhotoUrl: generatedPrimaryPhotoUrl,
      photos: generatedPrimaryPhotoUrl && finalPhotoIdForStorage
        ? [{
            id: finalPhotoIdForStorage,
            url: finalPhotoIdForStorage, // Store IDB key
            dateTaken: new Date().toISOString(),
            healthCondition: data.healthCondition,
            diagnosisNotes: t('addNewPlantPage.initialDiagnosisNotes'),
          }]
        : [],
      careTasks: [],
      plantingDate: new Date().toISOString(),
      lastCaredDate: undefined,
    };

    addPlantToContext(newPlant);

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
            hideInternalHeader={false}
          />
        )}
      </div>
    </AppLayout>
  );
}
