
'use client';

import type { CarePlanTaskFormData } from '@/types';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlusCircle } from 'lucide-react';

const taskFormSchema = z.object({
  name: z.string().min(1, { message: "Task name is required." }),
  frequencyMode: z.enum(['adhoc', 'daily', 'every_x_days', 'weekly', 'every_x_weeks', 'monthly', 'every_x_months', 'yearly'], {
    required_error: "Frequency mode is required.",
  }),
  frequencyValue: z.coerce.number().min(1, "Value must be at least 1.").optional(),
  timeOfDayOption: z.enum(['specific_time', 'all_day'], {
    required_error: "Time of day option is required.",
  }),
  specificTime: z.string().optional(), // HH:MM format
  level: z.enum(['basic', 'advanced'], {
    required_error: "Task level is required.",
  }),
}).refine(data => {
  if (['every_x_days', 'every_x_weeks', 'every_x_months'].includes(data.frequencyMode) && (data.frequencyValue === undefined || data.frequencyValue < 1)) {
    return false;
  }
  return true;
}, {
  message: "Frequency value is required for 'Every X...' options.",
  path: ["frequencyValue"],
}).refine(data => {
  if (data.timeOfDayOption === 'specific_time' && (!data.specificTime || !/^\d{2}:\d{2}$/.test(data.specificTime))) {
    return false;
  }
  return true;
}, {
  message: "Valid HH:MM time is required for 'Specific Time'.",
  path: ["specificTime"],
});


export type OnSaveTaskData = {
    name: string;
    frequency: string;
    timeOfDay: string;
    level: 'basic' | 'advanced';
};

interface CarePlanTaskFormProps {
  onSave: (data: OnSaveTaskData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CarePlanTaskForm({ onSave, onCancel, isLoading }: CarePlanTaskFormProps) {
  const form = useForm<CarePlanTaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      name: '',
      frequencyMode: 'adhoc',
      timeOfDayOption: 'all_day',
      level: 'basic',
    },
  });

  const watchedFrequencyMode = form.watch('frequencyMode');
  const watchedTimeOfDayOption = form.watch('timeOfDayOption');

  const onSubmit = (data: CarePlanTaskFormData) => {
    let frequencyString = '';
    switch (data.frequencyMode) {
        case 'adhoc': frequencyString = 'Ad-hoc'; break;
        case 'daily': frequencyString = 'Daily'; break;
        case 'weekly': frequencyString = 'Weekly'; break;
        case 'monthly': frequencyString = 'Monthly'; break;
        case 'yearly': frequencyString = 'Yearly'; break;
        case 'every_x_days': frequencyString = `Every ${data.frequencyValue} Days`; break;
        case 'every_x_weeks': frequencyString = `Every ${data.frequencyValue} Weeks`; break;
        case 'every_x_months': frequencyString = `Every ${data.frequencyValue} Months`; break;
    }

    const timeOfDayString = data.timeOfDayOption === 'all_day' ? 'All day' : data.specificTime!;

    onSave({
        name: data.name,
        frequency: frequencyString,
        timeOfDay: timeOfDayString,
        level: data.level,
    });
  };

  const frequencyOptions = [
    { value: 'adhoc', label: 'Ad-hoc (As needed)' },
    { value: 'daily', label: 'Daily' },
    { value: 'every_x_days', label: 'Every X Days' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'every_x_weeks', label: 'Every X Weeks' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'every_x_months', label: 'Every X Months' },
    { value: 'yearly', label: 'Yearly' },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Name <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="e.g., Water, Check soil moisture, Rotate pot" {...field} />
              </FormControl>
              <FormDescription>What care task is this?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="frequencyMode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frequency <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {frequencyOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {['every_x_days', 'every_x_weeks', 'every_x_months'].includes(watchedFrequencyMode) && (
          <FormField
            control={form.control}
            name="frequencyValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Every (Number) <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 3" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="timeOfDayOption"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Time of Day <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="all_day" />
                    </FormControl>
                    <FormLabel className="font-normal">All Day</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="specific_time" />
                    </FormControl>
                    <FormLabel className="font-normal">Specific Time</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchedTimeOfDayOption === 'specific_time' && (
            <FormField
                control={form.control}
                name="specificTime"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Set Time (HH:MM) <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                        <Input type="time" placeholder="HH:MM" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        )}

        <FormField
          control={form.control}
          name="level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Level <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select task level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : <><PlusCircle className="mr-2 h-4 w-4" /> Add Task</>}
          </Button>
        </div>
      </form>
    </Form>
  );
}
