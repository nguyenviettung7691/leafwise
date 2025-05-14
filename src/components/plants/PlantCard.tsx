import Image from 'next/image';
import Link from 'next/link';
import type { Plant } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Leaf, AlertTriangle, CheckCircle2, CalendarClock } from 'lucide-react';

interface PlantCardProps {
  plant: Plant;
}

const healthConditionStyles = {
  healthy: 'bg-green-100 text-green-800 border-green-300',
  needs_attention: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  sick: 'bg-red-100 text-red-800 border-red-300',
  unknown: 'bg-gray-100 text-gray-800 border-gray-300',
};

const healthConditionIcons = {
  healthy: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  needs_attention: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
  sick: <AlertTriangle className="h-4 w-4 text-red-600" />,
  unknown: <Leaf className="h-4 w-4 text-gray-600" />,
};


export function PlantCard({ plant }: PlantCardProps) {
  return (
    <Link href={`/plants/${plant.id}`} className="block group">
      <Card className="overflow-hidden h-full flex flex-col transition-all duration-300 ease-in-out group-hover:shadow-xl hover:border-primary">
        <CardHeader className="p-0 relative">
          <div className="aspect-[4/3] w-full overflow-hidden">
            <Image
              src={plant.primaryPhotoUrl || 'https://placehold.co/400x300.png'}
              alt={plant.commonName}
              width={400}
              height={300}
              className="object-cover w-full h-full transition-transform duration-300 ease-in-out group-hover:scale-105"
              data-ai-hint="plant nature"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow">
          <CardTitle className="text-xl font-semibold mb-1 group-hover:text-primary transition-colors">
            {plant.commonName}
          </CardTitle>
          <p className="text-sm text-muted-foreground italic mb-2">{plant.scientificName}</p>
          {plant.species && <p className="text-xs text-muted-foreground mb-2">Species: {plant.species}</p>}
          
          <div className="flex items-center gap-2 mt-2">
            {healthConditionIcons[plant.healthCondition]}
            <Badge variant="outline" className={cn("capitalize", healthConditionStyles[plant.healthCondition])}>
              {plant.healthCondition.replace('_', ' ')}
            </Badge>
          </div>
        </CardContent>
        <CardFooter className="p-4 border-t">
          <div className="flex items-center text-xs text-muted-foreground gap-1">
            <CalendarClock className="h-3.5 w-3.5" />
            <span>Age: {plant.ageEstimate || 'Unknown'}</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
