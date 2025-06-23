
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import type { Plant, PlantFormData, PlantPhoto, PlantHealthCondition } from '@/types';
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
    const loadPlantData = async () => {
      setIsLoadingPage(true);
      const foundPlant = getPlantById(id);
      if (foundPlant) {
        setPlant(foundPlant);

        if (typeof foundPlant.photos === 'function') {
          // foundPlant.photos is a LazyLoader function from the base Amplify schema type
          const photosResult = await foundPlant.photos(); // This resolves to an object like { data: PlantPhoto[], ... }
          setGalleryPhotos(photosResult.data ? photosResult.data as PlantPhoto[] : []);
        } else if (Array.isArray(foundPlant.photos)) {
          // foundPlant.photos is already an array (e.g., if pre-resolved by getPlantById)
          setGalleryPhotos(foundPlant.photos as PlantPhoto[]);
        } else {
          // Default to an empty array if photos is null/undefined and not a function
          setGalleryPhotos([]);
        }

        setInitialFormData({
          commonName: foundPlant.commonName,
          scientificName: foundPlant.scientificName || '',
          familyCategory: foundPlant.familyCategory || '',
          ageEstimateYears: foundPlant.ageEstimateYears,
          healthCondition: foundPlant.healthCondition as PlantHealthCondition,
          location: foundPlant.location || '',
          customNotes: foundPlant.customNotes || '',
          diagnosedPhotoDataUrl: foundPlant.primaryPhotoUrl || null,
        });
      } else {
        notFound();
      }
      setIsLoadingPage(false);
    };

    if (id) {
      loadPlantData();
    }
  }, [id, getPlantById]);

  // Updated handleUpdatePlant to accept plant data and the primary photo file
  const handleUpdatePlant = async (data: Omit<PlantFormData, 'primaryPhoto'>, primaryPhotoFile?: File | null) => {
    if (!plant || !plant.id || !user?.id) {
        toast({ title: t('common.error'), description: t('editPlantPage.toastErrorFindingPlant'), variant: 'destructive'});
        return;
    }
    setIsSaving(true);

    // Prepare updated plant data (without image data/keys)
    const updatedPlantData: Partial<Omit<Plant, 'primaryPhotoUrl' | 'photos' | 'careTasks' | 'owner'>> = { // Exclude primaryPhotoUrl here
      commonName: data.commonName,
      scientificName: data.scientificName || undefined,
      familyCategory: data.familyCategory || '',
      ageEstimateYears: data.ageEstimateYears,
      healthCondition: data.healthCondition,
      location: data.location || undefined,
      customNotes: data.customNotes || undefined,
    };

    try {
        // Call the context method, passing the plant ID, updated data, and the file.
        // The context method handles uploading the new file (if any), deleting the old one,
        // and updating the primaryPhotoUrl field on the Plant record.
        // It also handles the case where an existing gallery photo was selected as primary
        // (by passing its S3 key as the 4th argument) or if the primary photo was removed (passing null as 4th arg).
        await updatePlant(
            plant.id,
            updatedPlantData, // This no longer contains primaryPhotoUrl
            primaryPhotoFile,
            data.diagnosedPhotoDataUrl // Pass S3 key or null from form as the 4th argument
        );

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
