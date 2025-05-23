
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
  const { addPlant: addPlantToContext } = usePlantData(); // Renamed to avoid conflict
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveNewPlant = async (data: PlantFormData) => {
    setIsSaving(true);
    // await new Promise(resolve => setTimeout(resolve, 1000)); // Keep for simulated delay if desired

    const newPlantId = `plant-${Date.now()}`;
    let finalPhotoIdForStorage: string | undefined = undefined;
    let generatedPrimaryPhotoUrl: string | undefined = undefined; // This will store the IDB key

    if (data.diagnosedPhotoDataUrl && data.diagnosedPhotoDataUrl.startsWith('data:image/')) {
      const blob = dataURLtoBlob(data.diagnosedPhotoDataUrl);
      if (blob) {
        finalPhotoIdForStorage = `photo-${newPlantId}-${Date.now()}`;
        try {
          const idbResult = await addImage(finalPhotoIdForStorage, blob);
          if (idbResult.error) {
            console.error("Failed to save image to IndexedDB:", idbResult.error);
            toast({ title: t('common.error'), description: "Failed to save plant image locally.", variant: "destructive" });
            // Potentially don't save the plant or save without image
            generatedPrimaryPhotoUrl = `https://placehold.co/600x400.png?text=${encodeURIComponent(data.commonName || 'Plant')}`; // Fallback
          } else {
            generatedPrimaryPhotoUrl = finalPhotoIdForStorage; // Store IDB key
          }
        } catch (e) {
            console.error("Error during IndexedDB image save:", e);
            generatedPrimaryPhotoUrl = `https://placehold.co/600x400.png?text=${encodeURIComponent(data.commonName || 'Plant')}`; // Fallback
        }
      } else {
         // Blob conversion failed
         generatedPrimaryPhotoUrl = `https://placehold.co/600x400.png?text=${encodeURIComponent(data.commonName || 'Plant')}`;
      }
    } else if (data.diagnosedPhotoDataUrl) {
      // This case is unlikely for "new plant" if SavePlantForm works as intended (only data URLs for new uploads)
      // But if it's somehow an existing URL (e.g., a placeholder was manually entered or re-selected)
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
      primaryPhotoUrl: generatedPrimaryPhotoUrl, // This is now an IDB key or placeholder
      photos: generatedPrimaryPhotoUrl && finalPhotoIdForStorage // Only add to photos array if it was actually stored in IDB
        ? [{
            id: finalPhotoIdForStorage, // Use the same ID as the primary photo for this initial entry
            url: finalPhotoIdForStorage, // Store IDB key
            dateTaken: new Date().toISOString(),
            healthCondition: data.healthCondition,
            diagnosisNotes: t('addNewPlantPage.initialDiagnosisNotes'),
          }]
        : [], // Empty array if no photo was successfully processed for IDB
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
