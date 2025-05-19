
'use client';

import type { CarePlanTaskFormData } from '@/types';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; 
import { Textarea } from '@/components/ui/textarea'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlusCircle, Check, ChevronsUpDown, Edit2, CalendarIcon } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const taskFormSchema = z.object({
  name: z.string().min(1, { message: "Task name is required." }),
  description: z.string().optional(),
  startDate: z.string().refine(val => val && !isNaN(Date.parse(val)), { message: "Start date is required." }),
  frequencyMode: z.enum(['adhoc', 'daily', 'every_x_days', 'weekly', 'every_x_weeks', 'monthly', 'every_x_months', 'yearly'], {
    required_error: "Frequency mode is required.",
  }),
  frequencyValue: z.coerce.number().min(1, "Value must be at least 1.").optional(),
  timeOfDayOption: z.enum(['specific_time', 'all_day'], {
    required_error: "Time of day option is required.",
  }),
  specificTime: z.string().optional(), 
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
    description?: string;
    startDate: string; // This will be used as the nextDueDate
    frequency: string;
    timeOfDay: string;
    level: 'basic' | 'advanced';
};

interface CarePlanTaskFormProps {
  initialData?: CarePlanTaskFormData;
  onSave: (data: OnSaveTaskData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  formTitle?: string;
  formDescription?: string; 
  submitButtonText?: string;
}

const predefinedTasks = [
    { value: "watering", label: "Watering" },
    { value: "lighting_adjustment", label: "Lighting Adjustment" },
    { value: "fertilizing", label: "Fertilizing" },
    { value: "pruning", label: "Pruning" },
    { value: "repotting", label: "Repotting" },
    { value: "pest_check", label: "Pest Check" },
    { value: "soil_aeration", label: "Soil Aeration" },
    { value: "dusting_leaves", label: "Dusting Leaves" },
    { value: "rotate_pot", label: "Rotate Pot" },
];

export function CarePlanTaskForm({ 
  initialData, 
  onSave, 
  onCancel, 
  isLoading,
  formTitle = "Add New Care Plan Task",
  formDescription, 
  submitButtonText 
}: CarePlanTaskFormProps) {
  const form = useForm<CarePlanTaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: initialData || {
      name: '',
      description: '', 
      startDate: new Date().toISOString(),
      frequencyMode: 'adhoc',
      frequencyValue: undefined,
      timeOfDayOption: 'all_day',
      specificTime: '',
      level: 'basic',
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    } else {
      form.reset({ 
        name: '',
        description: '',
        startDate: new Date().toISOString(),
        frequencyMode: 'adhoc',
        frequencyValue: undefined,
        timeOfDayOption: 'all_day',
        specificTime: '',
        level: 'basic',
      });
    }
  }, [initialData, form]);

  const [comboboxOpen, setComboboxOpen] = React.useState(false);
  const [commandInputValue, setCommandInputValue] = React.useState(initialData?.name || '');


  const watchedFrequencyMode = form.watch('frequencyMode');
  const watchedTimeOfDayOption = form.watch('timeOfDayOption');

  const actualSubmitButtonText = submitButtonText || (initialData ? "Update Task" : "Add Task");
  const SubmitIcon = initialData ? Edit2 : PlusCircle;


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
        description: data.description, 
        startDate: data.startDate, // Pass the selected start date
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
            <FormItem className="flex flex-col">
              <FormLabel>Task Name <span className="text-destructive">*</span></FormLabel>
              <Popover open={comboboxOpen} onOpenChange={(isOpen) => {
                  setComboboxOpen(isOpen);
                  if (isOpen) {
                    setCommandInputValue(field.value || '');
                  }
              }}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboboxOpen}
                      className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                    >
                      {field.value ? predefinedTasks.find(task => task.label.toLowerCase() === field.value.toLowerCase())?.label || field.value : "Select or type task..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search or type custom..."
                      value={commandInputValue}
                      onValueChange={setCommandInputValue}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                              e.preventDefault();
                              if (commandInputValue.trim()) {
                                  form.setValue('name', commandInputValue.trim(), { shouldValidate: true });
                                  setComboboxOpen(false);
                              }
                          }
                      }}
                    />
                    <CommandList>
                        <CommandEmpty>No task found. Type custom name and press Enter.</CommandEmpty>
                        <CommandGroup>
                        {predefinedTasks.map((task) => (
                            <CommandItem
                            key={task.value}
                            value={task.label}
                            onSelect={() => {
                                form.setValue('name', task.label, { shouldValidate: true });
                                setCommandInputValue(task.label); 
                                setComboboxOpen(false);
                            }}
                            >
                            <Check
                                className={cn(
                                "mr-2 h-4 w-4",
                                (form.getValues('name') || '').toLowerCase() === task.label.toLowerCase() ? "opacity-100" : "opacity-0"
                                )}
                            />
                            {task.label}
                            </CommandItem>
                        ))}
                        </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>What care task is this? Type custom or select from list.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Use distilled water, ensure good drainage." {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Start Date <span className="text-destructive">*</span></FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(parseISO(field.value), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? parseISO(field.value) : undefined}
                    onSelect={(date) => field.onChange(date ? date.toISOString() : '')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                The date this task will first be due.
              </FormDescription>
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
                  <Input 
                    type="number" 
                    placeholder="e.g., 3" 
                    {...field} 
                    value={field.value ?? ''} 
                    onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} 
                  />
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
                        <Input type="time" placeholder="HH:MM" {...field} value={field.value ?? ''} />
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
            {isLoading ? 'Saving...' : <><SubmitIcon className="mr-2 h-4 w-4" /> {actualSubmitButtonText}</>}
          </Button>
        </div>
      </form>
    </Form>
  );
}
