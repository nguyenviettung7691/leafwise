
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
import { useAuth } from '@/contexts/AuthContext';

export default function NewPlantPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { addPlant: addPlantToContext } = usePlantData();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveNewPlant = async (data: PlantFormData) => {
    if (!user?.id) {
      toast({ title: t('common.error'), description: t('authContextToasts.errorNoUserSession'), variant: 'destructive'});
      router.push('/login');
      return;
    }
    setIsSaving(true);

    const newPlantId = `plant-${Date.now()}`;
    let idbPhotoId: string | undefined = undefined;

    if (data.diagnosedPhotoDataUrl && data.diagnosedPhotoDataUrl.startsWith('data:image/')) {
      const blob = dataURLtoBlob(data.diagnosedPhotoDataUrl);
      if (blob) {
        idbPhotoId = `photo-${user.id}-${newPlantId}-${Date.now()}`; // Scoped photo ID
        try {
          await addIDBImage(user.id, idbPhotoId, blob);
        } catch (e) {
          console.error("Error during IndexedDB image save:", e);
          toast({ title: t('common.error'), description: t('diagnosePage.toasts.imageSaveError'), variant: "destructive" });
          idbPhotoId = undefined;
        }
      } else {
         toast({ title: t('common.error'), description: t('diagnosePage.toasts.imageProcessError'), variant: "destructive" });
         idbPhotoId = undefined;
      }
    } else if (data.diagnosedPhotoDataUrl) {
      if (!data.diagnosedPhotoDataUrl.startsWith('data:image/')) {
        idbPhotoId = data.diagnosedPhotoDataUrl;
      }
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
      primaryPhotoUrl: idbPhotoId,
      photos: idbPhotoId
        ? [{
            id: idbPhotoId,
            url: idbPhotoId,
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
