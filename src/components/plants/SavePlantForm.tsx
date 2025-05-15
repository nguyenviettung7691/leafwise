
'use client';

import type { PlantFormData, PlantHealthCondition } from '@/types';
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
import { useState, useEffect } from 'react';
import { Leaf, UploadCloud, Save } from 'lucide-react';

// Conditionally define schema for primaryPhoto to handle FileList in browser vs. server
const primaryPhotoSchema = typeof window !== 'undefined'
  ? z.instanceof(FileList).optional().nullable()
  : z.any().optional().nullable(); // Fallback for non-browser environments

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
  onSave: (data: PlantFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SavePlantForm({ initialData, onSave, onCancel, isLoading }: SavePlantFormProps) {
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

  useEffect(() => {
    if (initialData?.diagnosedPhotoDataUrl) {
      setImagePreview(initialData.diagnosedPhotoDataUrl);
    }
  }, [initialData?.diagnosedPhotoDataUrl]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('primaryPhoto', event.target.files);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      form.setValue('primaryPhoto', null);
      // If user deselects, revert to diagnosed photo if available, else null
      setImagePreview(initialData?.diagnosedPhotoDataUrl || null);
    }
  };

  const onSubmit = async (data: SavePlantFormValues) => {
    await onSave(data);
  };

  return (
    <Card className="shadow-lg animate-in fade-in-50">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Leaf className="h-6 w-6 text-primary" />
          Save to My Plants
        </CardTitle>
        <CardDescription>
          Confirm or update the details for this plant.
        </CardDescription>
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plant Image</FormLabel>
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
                                <p className="text-xs text-muted-foreground">SVG, PNG, JPG or GIF (MAX. 4MB)</p>
                                {field.value?.[0] && <p className="text-xs text-primary mt-1">{field.value[0].name}</p>}
                            </div>
                            <Input 
                                id="primaryPhoto-input" 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={handlePhotoChange}
                            />
                        </label>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  <FormLabel>Scientific Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Monstera deliciosa" {...field} />
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
                    <Input placeholder="e.g., Araceae" {...field} />
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
                  <FormLabel>Age (Years, Est.)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 2" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
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
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Living Room Window" {...field} />
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
                  <FormLabel>Custom Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Water when top inch is dry." {...field} rows={3}/>
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : <><Save className="mr-2 h-4 w-4" /> Save Plant</>}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
