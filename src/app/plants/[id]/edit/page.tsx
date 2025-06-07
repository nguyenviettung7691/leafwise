
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import type { Plant, PlantFormData, PlantPhoto } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { SavePlantForm } from '@/components/plants/SavePlantForm';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePlantData } from '@/contexts/PlantDataContext';
import { useAuth } from '@/contexts/AuthContext';

export default function EditPlantPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const { t } = useLanguage(); 
  const { getPlantById, updatePlant } = usePlantData();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [initialFormData, setInitialFormData] = useState<Partial<PlantFormData> | undefined>(undefined);
  const [galleryPhotos, setGalleryPhotos] = useState<PlantPhoto[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      const foundPlant = getPlantById(id);
      if (foundPlant) {
        setPlant(foundPlant);
        setGalleryPhotos(foundPlant.photos || []);
        
        setInitialFormData({
          commonName: foundPlant.commonName,
          scientificName: foundPlant.scientificName || '',
          familyCategory: foundPlant.familyCategory || '',
          ageEstimateYears: foundPlant.ageEstimateYears,
          healthCondition: foundPlant.healthCondition,
          location: foundPlant.location || '',
          customNotes: foundPlant.customNotes || '',
          diagnosedPhotoDataUrl: foundPlant.primaryPhotoUrl || null, 
        });
      } else {
        notFound();
      }
    }
    setIsLoadingPage(false);
  }, [id, getPlantById]);

  // Updated handleUpdatePlant to accept plant data and the primary photo file
  const handleUpdatePlant = async (data: Omit<PlantFormData, 'primaryPhoto' | 'diagnosedPhotoDataUrl'>, primaryPhotoFile?: File | null) => {
    if (!plant || !plant.id || !user?.id) {
        toast({ title: t('common.error'), description: t('editPlantPage.toastErrorFindingPlant'), variant: 'destructive'});
        return;
    }
    setIsSaving(true);

    // Prepare updated plant data (without image data/keys)
    // The SavePlantForm passes the S3 key of a selected gallery photo in data.diagnosedPhotoDataUrl
    // if no new file was uploaded. If a new file was uploaded, primaryPhotoFile is the File object.
    // If the primary photo was removed, primaryPhotoFile is null and data.diagnosedPhotoDataUrl is null.
    const updatedPlantData: Partial<Plant> = {
      commonName: data.commonName,
      scientificName: data.scientificName || undefined,
      familyCategory: data.familyCategory || '',
      ageEstimateYears: data.ageEstimateYears,
      healthCondition: data.healthCondition,
      location: data.location || undefined,
      customNotes: data.customNotes || undefined,
      // primaryPhotoUrl will be handled by the context method based on the file or selected URL
      // photos and careTasks are not updated via this form
    };

    try {
        // Call the context method, passing the plant ID, updated data, and the file.
        // The context method handles uploading the new file (if any), deleting the old one,
        // and updating the primaryPhotoUrl field on the Plant record.
        // It also handles the case where an existing gallery photo was selected as primary
        // (by passing its S3 key in updatedPlantData.primaryPhotoUrl) or if the primary photo was removed.
        // The SavePlantForm passes the S3 key in data.diagnosedPhotoDataUrl if no new file is uploaded.
        // If a new file is uploaded, primaryPhotoFile is the File object.
        // If the primary photo is removed, primaryPhotoFile is null and data.diagnosedPhotoDataUrl is null.
        // The context method needs to know if a *new file* is being uploaded (primaryPhotoFile is File),
        // if an *existing gallery photo* is being set as primary (primaryPhotoFile is null, updatedPlantData.primaryPhotoUrl is S3 key),
        // or if the *primary photo is being removed* (primaryPhotoFile is null, updatedPlantData.primaryPhotoUrl is null).
        // The SavePlantForm's onSave signature passes the file and the diagnosedPhotoDataUrl (which holds the S3 key or data URL).
        // We need to pass the file and the potential new primaryPhotoUrl (S3 key or null) to the context.

        // The SavePlantForm passes the S3 key of a selected gallery photo in `data.diagnosedPhotoDataUrl`
        // when no new file is uploaded. If a new file is uploaded, `primaryPhotoFile` is the File object.
        // If the primary photo is removed, `primaryPhotoFile` is null and `data.diagnosedPhotoDataUrl` is null.
        // The `updatePlant` context method expects `primaryPhotoFile` for new uploads, and `updatedPlantData.primaryPhotoUrl`
        // for setting an existing gallery photo as primary or removing the primary photo.

        // So, we pass the file if it exists, and the potential new primaryPhotoUrl from the form data.
        await updatePlant(plant.id, { ...updatedPlantData, primaryPhotoUrl: data.diagnosedPhotoDataUrl }, primaryPhotoFile);


        toast({
          title: t('editPlantPage.toastPlantUpdatedTitle'),
          description: t('editPlantPage.toastPlantUpdatedDescription', { plantName: data.commonName }),
        });

        setIsSaving(false);
        router.push(`/plants/${id}`);

    } catch (error) {
        console.error("Error saving edited plant:", error);
        toast({ title: t('common.error'), description: t('editPlantPage.toastErrorSavingPlant'), variant: "destructive" });
        setIsSaving(false);
    }
  };

  if (isLoadingPage || !initialFormData) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!plant) {
    return notFound();
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <SavePlantForm
          initialData={initialFormData}
          galleryPhotos={galleryPhotos}
          onSave={handleUpdatePlant}
          onCancel={() => router.push(`/plants/${id}`)}
          isLoading={isSaving}
          formTitle={t('editPlantPage.formTitle')}
          formDescription={t('editPlantPage.formDescription', { plantName: plant.commonName })}
          submitButtonText={t('editPlantPage.submitButtonText')}
          hideInternalHeader={false}
        />
      </div>
    </AppLayout>
  );
}
