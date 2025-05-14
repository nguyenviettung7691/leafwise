
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { APP_NAV_CONFIG } from '@/lib/constants'; // Updated import
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Leaf, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function NewPlantPage() {
  const [isAddingPlant, setIsAddingPlant] = useState(false);

  const handleAddPlant = async () => {
    setIsAddingPlant(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsAddingPlant(false);
    alert("Plant adding simulated!");
  };

  return (
    <AppLayout navItemsConfig={APP_NAV_CONFIG}> {/* Updated prop */}
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Leaf className="h-6 w-6 text-primary" />
              Add New Plant
            </CardTitle>
            <CardDescription>
              Enter the details for your new plant. You can add more information later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="commonName">Common Name</Label>
                <Input id="commonName" placeholder="e.g., Swiss Cheese Plant" />
              </div>
              <div>
                <Label htmlFor="scientificName">Scientific Name</Label>
                <Input id="scientificName" placeholder="e.g., Monstera deliciosa" />
              </div>
            </div>
            <div>
              <Label htmlFor="species">Species (Optional)</Label>
              <Input id="species" placeholder="e.g., Araceae" />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="healthCondition">Health Condition</Label>
                <Select>
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
              <div>
                <Label htmlFor="location">Location (Optional)</Label>
                <Input id="location" placeholder="e.g., Living Room Window" />
              </div>
            </div>
            <div>
              <Label htmlFor="primaryPhoto">Primary Photo (Optional)</Label>
              <Input id="primaryPhoto" type="file" accept="image/*" className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
            </div>
            <div>
              <Label htmlFor="customNotes">Custom Notes (Optional)</Label>
              <Textarea id="customNotes" placeholder="e.g., Water when top inch is dry, loves humidity." />
            </div>
            <Button className="w-full" onClick={handleAddPlant} disabled={isAddingPlant}>
              {isAddingPlant ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Plant...
                </>
              ) : (
                'Add Plant'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
