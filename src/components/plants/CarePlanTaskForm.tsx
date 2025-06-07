
'use client';

import type { CarePlanTaskFormData } from '@/types';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlusCircle, Check, ChevronsUpDown, Edit2, CalendarIcon, Loader2 } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';


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
    startDate: string; 
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
    { value: "watering", labelKey: "carePlanTaskForm.taskTypes.watering" },
    { value: "lighting_adjustment", labelKey: "carePlanTaskForm.taskTypes.lighting_adjustment" },
    { value: "fertilizing", labelKey: "carePlanTaskForm.taskTypes.fertilizing" },
    { value: "pruning", labelKey: "carePlanTaskForm.taskTypes.pruning" },
    { value: "repotting", labelKey: "carePlanTaskForm.taskTypes.repotting" },
    { value: "pest_check", labelKey: "carePlanTaskForm.taskTypes.pest_check" },
    { value: "soil_aeration", labelKey: "carePlanTaskForm.taskTypes.soil_aeration" },
    { value: "dusting_leaves", labelKey: "carePlanTaskForm.taskTypes.dusting_leaves" },
    { value: "rotate_pot", labelKey: "carePlanTaskForm.taskTypes.rotate_pot" },
];

export function CarePlanTaskForm({ 
  initialData, 
  onSave, 
  onCancel, 
  isLoading,
  submitButtonText 
}: CarePlanTaskFormProps) {
  const { t } = useLanguage();
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

  const actualSubmitButtonText = submitButtonText || (initialData ? t('carePlanTaskForm.updateButton') : t('carePlanTaskForm.addButton'));
  const SubmitIcon = initialData ? Edit2 : PlusCircle;


  const onSubmit = (data: CarePlanTaskFormData) => {
    let frequencyString = '';
    switch (data.frequencyMode) {
        case 'adhoc': frequencyString = t('carePlanTaskForm.frequencyOptions.adhoc'); break;
        case 'daily': frequencyString = t('carePlanTaskForm.frequencyOptions.daily'); break;
        case 'weekly': frequencyString = t('carePlanTaskForm.frequencyOptions.weekly'); break;
        case 'monthly': frequencyString = t('carePlanTaskForm.frequencyOptions.monthly'); break;
        case 'yearly': frequencyString = t('carePlanTaskForm.frequencyOptions.yearly'); break;
        case 'every_x_days': frequencyString = t('carePlanTaskForm.frequencyOptions.every_x_days_formatted', {count: data.frequencyValue ?? 1}); break;
        case 'every_x_weeks': frequencyString = t('carePlanTaskForm.frequencyOptions.every_x_weeks_formatted', {count: data.frequencyValue ?? 1}); break;
        case 'every_x_months': frequencyString = t('carePlanTaskForm.frequencyOptions.every_x_months_formatted', {count: data.frequencyValue ?? 1}); break;
    }

    const timeOfDayString = data.timeOfDayOption === 'all_day' ? t('carePlanTaskForm.timeOfDayOptionAllDay') : data.specificTime!;

    onSave({
        name: data.name,
        description: data.description, 
        startDate: data.startDate, 
        frequency: frequencyString,
        timeOfDay: timeOfDayString,
        level: data.level,
    });
  };

  const frequencyOptions = [
    { value: 'adhoc', labelKey: 'carePlanTaskForm.frequencyOptions.adhoc' },
    { value: 'daily', labelKey: 'carePlanTaskForm.frequencyOptions.daily' },
    { value: 'every_x_days', labelKey: 'carePlanTaskForm.frequencyOptions.every_x_days' },
    { value: 'weekly', labelKey: 'carePlanTaskForm.frequencyOptions.weekly' },
    { value: 'every_x_weeks', labelKey: 'carePlanTaskForm.frequencyOptions.every_x_weeks' },
    { value: 'monthly', labelKey: 'carePlanTaskForm.frequencyOptions.monthly' },
    { value: 'every_x_months', labelKey: 'carePlanTaskForm.frequencyOptions.every_x_months' },
    { value: 'yearly', labelKey: 'carePlanTaskForm.frequencyOptions.yearly' },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t('carePlanTaskForm.taskNameLabel')} <span className="text-destructive">*</span></FormLabel>
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
                      {field.value
                        ? predefinedTasks.find(task => t(task.labelKey).toLowerCase() === field.value.toLowerCase())
                          ? t(predefinedTasks.find(task => t(task.labelKey).toLowerCase() === field.value.toLowerCase())!.labelKey)
                          : field.value
                        : t('carePlanTaskForm.taskNamePlaceholder')}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput
                      placeholder={t('carePlanTaskForm.taskNamePlaceholder')}
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
                        <CommandEmpty>{t('carePlanTaskForm.taskNameCommandEmpty')}</CommandEmpty>
                        <CommandGroup>
                        {predefinedTasks.map((task) => (
                            <CommandItem
                            key={task.value}
                            value={t(task.labelKey)}
                            onSelect={() => {
                                form.setValue('name', t(task.labelKey), { shouldValidate: true });
                                setCommandInputValue(t(task.labelKey)); 
                                setComboboxOpen(false);
                            }}
                            >
                            <Check
                                className={cn(
                                "mr-2 h-4 w-4",
                                (form.getValues('name') || '').toLowerCase() === t(task.labelKey).toLowerCase() ? "opacity-100" : "opacity-0"
                                )}
                            />
                            {t(task.labelKey)}
                            </CommandItem>
                        ))}
                        </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>{t('carePlanTaskForm.taskNameDescription')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('carePlanTaskForm.descriptionLabel')}</FormLabel>
              <FormControl>
                <Textarea placeholder={t('carePlanTaskForm.descriptionPlaceholder')} {...field} value={field.value ?? ''} />
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
              <FormLabel>{t('carePlanTaskForm.startDateLabel')} <span className="text-destructive">*</span></FormLabel>
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
                        <span>{t('carePlanTaskForm.startDatePlaceholder')}</span>
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
                {t('carePlanTaskForm.startDateDescription')}
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
              <FormLabel>{t('carePlanTaskForm.frequencyLabel')} <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('carePlanTaskForm.frequencyPlaceholder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {frequencyOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>
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
                <FormLabel>{t('carePlanTaskForm.frequencyValueLabel')} <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder={t('carePlanTaskForm.frequencyValuePlaceholder')}
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
              <FormLabel>{t('carePlanTaskForm.timeOfDayLabel')} <span className="text-destructive">*</span></FormLabel>
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
                    <FormLabel className="font-normal">{t('carePlanTaskForm.timeOfDayOptionAllDay')}</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="specific_time" />
                    </FormControl>
                    <FormLabel className="font-normal">{t('carePlanTaskForm.timeOfDayOptionSpecificTime')}</FormLabel>
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
                    <FormLabel>{t('carePlanTaskForm.specificTimeLabel')} <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                        <Input type="time" placeholder={t('carePlanTaskForm.specificTimePlaceholder')} {...field} value={field.value ?? ''} />
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
              <FormLabel>{t('carePlanTaskForm.levelLabel')} <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('carePlanTaskForm.levelPlaceholder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="basic">{t('common.basic')}</SelectItem>
                  <SelectItem value="advanced">{t('common.advanced')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <SubmitIcon className="mr-2 h-4 w-4" />}
            {isLoading ? t('carePlanTaskForm.savingButton') : actualSubmitButtonText}
          </Button>
        </div>
      </form>
    </Form>
  );
}

    