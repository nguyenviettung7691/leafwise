
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
import { addImage as addIDBImage, dataURLtoBlob } from '@/lib/idb-helper'; 
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth


export default function NewPlantPage() {
  const { user } = useAuth(); // Get user from AuthContext
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { addPlant: addPlantToContext } = usePlantData();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveNewPlant = async (data: PlantFormData) => {
    if (!user?.id) {
      toast({ title: t('common.error'), description: t('authContextToasts.errorNoUserSession'), variant: 'destructive'});
      return;
    }
    setIsSaving(true);

    const newPlantId = `plant-${Date.now()}`;
    let idbPhotoId: string | undefined = undefined;

    if (data.diagnosedPhotoDataUrl && data.diagnosedPhotoDataUrl.startsWith('data:image/')) {
      const blob = dataURLtoBlob(data.diagnosedPhotoDataUrl);
      if (blob) {
        idbPhotoId = `photo-${newPlantId}-${Date.now()}`;
        try {
          await addIDBImage(user.id, idbPhotoId, blob); // Pass userId
        } catch (e) {
          console.error("Error during IndexedDB image save:", e);
          toast({ title: t('common.error'), description: "Failed to save plant image locally.", variant: "destructive" });
          idbPhotoId = undefined; // Fallback to no specific image if IDB save fails
        }
      } else {
         toast({ title: t('common.error'), description: "Failed to process image for local storage.", variant: "destructive" });
         idbPhotoId = undefined;
      }
    } else if (data.diagnosedPhotoDataUrl) {
      // If it's not a data URL, it might be an existing IDB key (e.g., if form was pre-filled, though less likely for 'new')
      // or a placeholder. We'll assume for 'new' it should mostly be a data URL or null.
      // If it's an existing IDB key, we just use it.
      if (!data.diagnosedPhotoDataUrl.startsWith('data:image/')) {
        idbPhotoId = data.diagnosedPhotoDataUrl;
      }
    }
    // If idbPhotoId is still undefined, a generic placeholder will be used implicitly by display components.
    
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
      primaryPhotoUrl: idbPhotoId, // Stores IDB key or undefined
      photos: idbPhotoId
        ? [{
            id: idbPhotoId, // Use the same ID as the key and for the photo object
            url: idbPhotoId, // Store IDB key
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
