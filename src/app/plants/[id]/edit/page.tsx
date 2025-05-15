
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { APP_NAV_CONFIG } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Leaf, Loader2, Save } from 'lucide-react';
import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { mockPlants } from '@/lib/mock-data';
import type { Plant, PlantHealthCondition } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function EditPlantPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [formData, setFormData] = useState({
    commonName: '',
    scientificName: '',
    familyCategory: '',
    ageEstimate: '',
    healthCondition: 'unknown' as PlantHealthCondition,
    location: '',
    customNotes: '',
    primaryPhotoUrl: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      const foundPlant = mockPlants.find(p => p.id === id);
      if (foundPlant) {
        setPlant(foundPlant);
        setFormData({
          commonName: foundPlant.commonName,
          scientificName: foundPlant.scientificName || '',
          familyCategory: foundPlant.familyCategory || '',
          ageEstimate: foundPlant.ageEstimate || '',
          healthCondition: foundPlant.healthCondition,
          location: foundPlant.location || '',
          customNotes: foundPlant.customNotes || '',
          primaryPhotoUrl: foundPlant.primaryPhotoUrl || '',
        });
      } else {
        notFound();
      }
    }
    setIsLoading(false);
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, healthCondition: value as PlantHealthCondition }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In a real app, you would update the plant data in your backend.
    // For this prototype, we'll just show a toast and navigate.
    console.log('Updated plant data (simulated):', { ...plant, ...formData });
    
    toast({
      title: 'Plant Updated!',
      description: `${formData.commonName} has been (simulated) updated.`,
    });
    setIsSaving(false);
    router.push(`/plants/${id}`);
  };

  if (isLoading) {
    return (
      <AppLayout navItemsConfig={APP_NAV_CONFIG}>
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
    <AppLayout navItemsConfig={APP_NAV_CONFIG}>
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Leaf className="h-6 w-6 text-primary" />
              Edit Plant: {plant.commonName}
            </CardTitle>
            <CardDescription>
              Update the details for your plant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="commonName">Common Name <span className="text-destructive">*</span></Label>
                  <Input 
                    id="commonName" 
                    name="commonName"
                    value={formData.commonName} 
                    onChange={handleChange} 
                    required 
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <Label htmlFor="scientificName">Scientific Name</Label>
                  <Input 
                    id="scientificName" 
                    name="scientificName"
                    value={formData.scientificName} 
                    onChange={handleChange} 
                    disabled={isSaving}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="familyCategory">Family Category <span className="text-destructive">*</span></Label>
                <Input 
                  id="familyCategory" 
                  name="familyCategory"
                  value={formData.familyCategory} 
                  onChange={handleChange} 
                  required 
                  disabled={isSaving}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="ageEstimate">Age Estimate</Label>
                  <Input 
                    id="ageEstimate" 
                    name="ageEstimate"
                    value={formData.ageEstimate} 
                    onChange={handleChange} 
                    placeholder="e.g., 2 years"
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <Label htmlFor="healthCondition">Health Condition <span className="text-destructive">*</span></Label>
                  <Select 
                    value={formData.healthCondition} 
                    onValueChange={handleSelectChange}
                    required
                    disabled={isSaving}
                  >
                    <SelectTrigger id="healthCondition">
                      <SelectValue placeholder="Select health status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="healthy">Healthy</SelectItem>
                      <SelectItem value="needs_attention">Needs Attention</SelectItem>
                      <SelectItem value="sick">Sick</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="location">Location</Label>
                <Input 
                  id="location" 
                  name="location"
                  value={formData.location} 
                  onChange={handleChange} 
                  placeholder="e.g., Living Room Window"
                  disabled={isSaving}
                />
              </div>
              
              <div>
                <Label htmlFor="primaryPhotoUrl">Primary Photo URL</Label>
                <Input 
                  id="primaryPhotoUrl" 
                  name="primaryPhotoUrl"
                  type="url"
                  value={formData.primaryPhotoUrl} 
                  onChange={handleChange} 
                  placeholder="https://example.com/image.png"
                  disabled={isSaving}
                />
              </div>

              <div>
                <Label htmlFor="customNotes">Custom Notes</Label>
                <Textarea 
                  id="customNotes" 
                  name="customNotes"
                  value={formData.customNotes} 
                  onChange={handleChange} 
                  placeholder="e.g., Water when top inch is dry."
                  rows={3} 
                  disabled={isSaving}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Plant...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Plant
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

    