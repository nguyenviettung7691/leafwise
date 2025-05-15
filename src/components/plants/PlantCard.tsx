
import Image from 'next/image';
import Link from 'next/link';
import type { Plant, CareTask } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Leaf, AlertTriangle, CheckCircle2, CalendarClock, History } from 'lucide-react'; // Added History icon
import { format, isToday, isTomorrow, differenceInDays, parseISO } from 'date-fns';

interface PlantCardProps {
  plant: Plant;
}

const healthConditionStyles = {
  healthy: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-500',
  needs_attention: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-500',
  sick: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-500',
  unknown: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/30 dark:text-gray-300 dark:border-gray-500',
};

const healthConditionIcons = {
  healthy: <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />,
  needs_attention: <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />,
  sick: <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />,
  unknown: <Leaf className="h-4 w-4 text-gray-600 dark:text-gray-400" />,
};

const getNextUpcomingTask = (tasks: CareTask[]): CareTask | null => {
  if (!tasks || tasks.length === 0) return null;

  const upcomingTasks = tasks
    .filter(task => !task.isPaused && task.nextDueDate)
    .map(task => ({ ...task, nextDueDateObj: parseISO(task.nextDueDate!) }))
    .filter(task => task.nextDueDateObj >= new Date(new Date().setHours(0,0,0,0)) ) // Only today or future
    .sort((a, b) => a.nextDueDateObj.getTime() - b.nextDueDateObj.getTime());
    
  return upcomingTasks.length > 0 ? upcomingTasks[0] : null;
};

const formatDueDate = (dueDate: string): string => {
  const date = parseISO(dueDate);
  const now = new Date();
  const today = new Date(now.setHours(0,0,0,0));
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';

  const diff = differenceInDays(date, today);
  if (diff > 0 && diff <= 7) return `In ${diff} day${diff > 1 ? 's' : ''}`;
  
  return format(date, 'MMM d');
};

const formatDateSimple = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(parseISO(dateString), 'MMM d, yyyy');
};

export function PlantCard({ plant }: PlantCardProps) {
  const nextUpcomingTask = getNextUpcomingTask(plant.careTasks);

  return (
    <Link href={`/plants/${plant.id}`} className="block group">
      <Card className="overflow-hidden h-full flex flex-col transition-all duration-300 ease-in-out group-hover:shadow-xl hover:border-primary dark:hover:border-primary">
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
          {plant.scientificName && <p className="text-sm text-muted-foreground italic mb-2">{plant.scientificName}</p>}
          
          <div className="flex items-center gap-2 mt-2">
            {healthConditionIcons[plant.healthCondition]}
            <Badge 
              variant="outline" 
              className={cn(
                "capitalize", 
                healthConditionStyles[plant.healthCondition]
              )}
            >
              {plant.healthCondition.replace('_', ' ')}
            </Badge>
          </div>
        </CardContent>
        <CardFooter className="p-4 border-t flex flex-col items-start gap-1.5 text-xs text-muted-foreground">
          {nextUpcomingTask ? (
            <div className="flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span>Next: {nextUpcomingTask.name} - {formatDueDate(nextUpcomingTask.nextDueDate!)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5 flex-shrink-0" />
              <span>No upcoming tasks</span>
            </div>
          )}
          {plant.lastCaredDate && (
            <div className="flex items-center gap-1">
              <History className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Last Cared: {formatDateSimple(plant.lastCaredDate)}</span>
            </div>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
