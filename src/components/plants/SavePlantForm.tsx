
'use client';

import type { PlantFormData, PlantHealthCondition, PlantPhoto } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { Leaf, UploadCloud, Save, Edit, ImagePlus } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const primaryPhotoSchema = typeof window !== 'undefined'
  ? z.instanceof(FileList).optional().nullable()
  : z.any().optional().nullable();

const plantFormSchema = z.object({
  commonName: z.string().min(1, { message: "Common name is required." }),
  scientificName: z.string().optional(),
  familyCategory: z.string().min(1, { message: "Family category is required." }),
  ageEstimateYears: z.coerce.number().min(0, "Age must be a positive number.").optional().nullable(),
  healthCondition: z.enum(['healthy', 'needs_attention', 'sick', 'unknown'], {
    required_error: "Health condition is required.",
  }),
  location: z.string().optional(),
  customNotes: z.string().optional(),
  primaryPhoto: primaryPhotoSchema,
  diagnosedPhotoDataUrl: z.string().optional().nullable(),
});

type SavePlantFormValues = z.infer<typeof plantFormSchema>;

interface SavePlantFormProps {
  initialData?: Partial<PlantFormData>;
  galleryPhotos?: PlantPhoto[];
  onSave: (data: PlantFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  formTitle?: string;
  formDescription?: string;
  submitButtonText?: string;
}

export function SavePlantForm({
  initialData,
  galleryPhotos,
  onSave,
  onCancel,
  isLoading,
  formTitle,
  formDescription,
  submitButtonText
}: SavePlantFormProps) {
  const form = useForm<SavePlantFormValues>({
    resolver: zodResolver(plantFormSchema),
    defaultValues: {
      commonName: initialData?.commonName || '',
      scientificName: initialData?.scientificName || '',
      familyCategory: initialData?.familyCategory || '',
      ageEstimateYears: initialData?.ageEstimateYears !== undefined ? initialData.ageEstimateYears : undefined,
      healthCondition: initialData?.healthCondition || 'unknown',
      location: initialData?.location || '',
      customNotes: initialData?.customNotes || '',
      primaryPhoto: null,
      diagnosedPhotoDataUrl: initialData?.diagnosedPhotoDataUrl || null,
    },
  });

  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.diagnosedPhotoDataUrl || null);
  const [selectedGalleryPhotoUrl, setSelectedGalleryPhotoUrl] = useState<string | null>(initialData?.diagnosedPhotoDataUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Pre-fill image preview from initialData
    if (initialData?.diagnosedPhotoDataUrl && !imagePreview) {
        setImagePreview(initialData.diagnosedPhotoDataUrl);
        setSelectedGalleryPhotoUrl(initialData.diagnosedPhotoDataUrl);
        // Also ensure the form field for diagnosedPhotoDataUrl is set if initialData has it
        form.setValue('diagnosedPhotoDataUrl', initialData.diagnosedPhotoDataUrl);
    }
  }, [initialData, form, imagePreview]);


  const onSubmit = async (data: SavePlantFormValues) => {
    const formDataToSave: PlantFormData = {
        ...data,
        primaryPhoto: data.primaryPhoto instanceof FileList ? data.primaryPhoto : null,
        // diagnosedPhotoDataUrl will hold the URL of the image to be saved,
        // whether it's from a new upload (via imagePreview) or gallery selection.
        diagnosedPhotoDataUrl: imagePreview 
    };
    await onSave(formDataToSave);
  };

  const currentFormTitle = formTitle || "Save Plant Details";
  const currentSubmitButtonText = submitButtonText || "Save Plant";
  const FormIcon = currentFormTitle.toLowerCase().includes("edit") ? Edit : Leaf;

  const handleGalleryPhotoSelect = (photo: PlantPhoto) => {
    setImagePreview(photo.url);
    setSelectedGalleryPhotoUrl(photo.url);
    form.setValue('diagnosedPhotoDataUrl', photo.url, { shouldDirty: true, shouldValidate: true });
    form.setValue('primaryPhoto', null); // Clear any selected file in input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input UI
    }
  };
  
  return (
    <Card className="shadow-lg animate-in fade-in-50">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <FormIcon className="h-6 w-6 text-primary" />
          {currentFormTitle}
        </CardTitle>
        {formDescription && <CardDescription>{formDescription}</CardDescription>}
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {imagePreview && (
              <div className="my-4 p-2 border rounded-md bg-muted/50 flex justify-center">
                <Image
                  src={imagePreview}
                  alt="Plant preview"
                  width={150}
                  height={150}
                  className="rounded-md object-contain max-h-[150px] shadow-md"
                  data-ai-hint="plant user-provided"
                />
              </div>
            )}
            <FormField
              control={form.control}
              name="primaryPhoto"
              render={({ field: { onChange, onBlur, name, ref: formRefSetter } }) => ( // `ref` from field is form's ref
                <FormItem>
                  <FormLabel>Current Photo (Optional)</FormLabel>
                  <FormControl>
                    <div className="flex items-center justify-center w-full">
                        <label
                            htmlFor="primaryPhoto-input"
                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-border border-dashed rounded-lg cursor-pointer bg-card hover:bg-secondary/50"
                        >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                <p className="mb-1 text-sm text-muted-foreground">
                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-muted-foreground">PNG, JPG, GIF, WEBP (MAX. 4MB)</p>
                                {form.getValues('primaryPhoto')?.[0] && <p className="text-xs text-primary mt-1">{form.getValues('primaryPhoto')?.[0].name}</p>}
                            </div>
                            <Input
                                id="primaryPhoto-input"
                                type="file"
                                className="hidden"
                                accept="image/png, image/jpeg, image/gif, image/webp"
                                name={name}
                                ref={(e) => {
                                  formRefSetter(e); // Set react-hook-form's ref
                                  if (e) (fileInputRef as React.MutableRefObject<HTMLInputElement | null>).current = e; // Also set local ref
                                }}
                                onBlur={onBlur}
                                onChange={(e) => {
                                    const files = e.target.files;
                                    onChange(files); // react-hook-form's onChange
                                    if (files && files[0]) {
                                        if (files[0].size > 4 * 1024 * 1024) { 
                                            form.setError("primaryPhoto", { type: "manual", message: "Image too large, max 4MB."});
                                            setImagePreview(initialData?.diagnosedPhotoDataUrl || null); 
                                            e.target.value = ''; 
                                        } else {
                                            form.clearErrors("primaryPhoto");
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                setImagePreview(reader.result as string);
                                                form.setValue('diagnosedPhotoDataUrl', reader.result as string, {shouldDirty: true});
                                            };
                                            reader.readAsDataURL(files[0]);
                                            setSelectedGalleryPhotoUrl(null); // Unselect gallery photo if new file is chosen
                                        }
                                    } else {
                                        // If file selection is cleared, revert to selected gallery photo or initial
                                        setImagePreview(selectedGalleryPhotoUrl || initialData?.diagnosedPhotoDataUrl || null);
                                        form.setValue('diagnosedPhotoDataUrl', selectedGalleryPhotoUrl || initialData?.diagnosedPhotoDataUrl || null);
                                    }
                                }}
                            />
                        </label>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {galleryPhotos && galleryPhotos.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Or Select from Gallery (Optional)</Label>
                <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                  <div className="flex space-x-3 p-3">
                    {galleryPhotos.map((photo) => (
                      <button
                        type="button"
                        key={photo.id}
                        className={cn(
                          "flex-shrink-0 rounded-md w-20 h-20 overflow-hidden border-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                          selectedGalleryPhotoUrl === photo.url ? "border-primary ring-2 ring-primary ring-offset-1" : "border-transparent hover:border-muted-foreground/50"
                        )}
                        onClick={() => handleGalleryPhotoSelect(photo)}
                      >
                        <Image
                          src={photo.url}
                          alt={`Gallery photo ${photo.id}`}
                          width={80}
                          height={80}
                          className="object-cover w-full h-full"
                          data-ai-hint="plant gallery thumbnail"
                        />
                      </button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}

            <FormField
              control={form.control}
              name="commonName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Common Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Swiss Cheese Plant" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scientificName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scientific Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Monstera deliciosa" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="familyCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Family Category <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Araceae" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ageEstimateYears"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age (Years, Est.) (Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" placeholder="e.g., 2" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="healthCondition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Health Condition <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select health status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="healthy">Healthy</SelectItem>
                      <SelectItem value="needs_attention">Needs Attention</SelectItem>
                      <SelectItem value="sick">Sick</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Living Room Window" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Water when top inch is dry." {...field} rows={3} value={field.value ?? ''}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || (!form.formState.isValid && form.formState.isSubmitted)}>
              {isLoading ? 'Saving...' : <><Save className="mr-2 h-4 w-4" /> {currentSubmitButtonText}</>}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
