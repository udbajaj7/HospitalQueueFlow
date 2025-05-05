import React, { useState } from "react";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, PlusCircle } from "lucide-react";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Define schema for availability
const availabilitySchema = z.object({
  dayOfWeek: z.string(),
  startHour: z.string()
    .refine(val => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 23, {
      message: "Start hour must be between 0-23",
    }),
  endHour: z.string()
    .refine(val => !isNaN(Number(val)) && Number(val) >= 1 && Number(val) <= 24, {
      message: "End hour must be between 1-24",
    }),
});

// Schema validation for the entire form
const doctorAvailabilityFormSchema = z.object({
  availabilities: z.array(availabilitySchema)
    .refine(items => {
      // Check for overlaps within the same day
      const dayGroups = items.reduce((acc, item) => {
        const day = item.dayOfWeek;
        if (!acc[day]) acc[day] = [];
        acc[day].push(item);
        return acc;
      }, {} as Record<string, typeof items>);
      
      // Check each day group for overlaps
      for (const day in dayGroups) {
        const slots = dayGroups[day];
        for (let i = 0; i < slots.length; i++) {
          const slotA = slots[i];
          const startA = parseInt(slotA.startHour);
          const endA = parseInt(slotA.endHour);
          
          if (startA >= endA) {
            return false; // End hour must be greater than start hour
          }
          
          // Check against other slots
          for (let j = i + 1; j < slots.length; j++) {
            const slotB = slots[j];
            const startB = parseInt(slotB.startHour);
            const endB = parseInt(slotB.endHour);
            
            // Check for overlap
            if ((startA < endB && endA > startB)) {
              return false;
            }
          }
        }
      }
      return true;
    }, {
      message: "Time slots cannot overlap or have invalid ranges (end must be greater than start)",
    }),
});

type DoctorAvailabilityFormValues = z.infer<typeof doctorAvailabilityFormSchema>;

interface DoctorAvailabilityFormProps {
  existingAvailabilities?: Array<{
    id?: string;
    dayOfWeek: number;
    startHour: number;
    endHour: number;
  }>;
  onSubmit: (data: DoctorAvailabilityFormValues) => void;
  isLoading?: boolean;
}

const dayOptions = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

export function DoctorAvailabilityForm({
  existingAvailabilities = [],
  onSubmit,
  isLoading = false,
}: DoctorAvailabilityFormProps) {
  const { toast } = useToast();
  
  // Setup default values from existing availabilities
  const defaultValues: DoctorAvailabilityFormValues = {
    availabilities: existingAvailabilities.map(avail => ({
      dayOfWeek: String(avail.dayOfWeek),
      startHour: String(avail.startHour),
      endHour: String(avail.endHour)
    })),
  };
  
  // Initialize with at least one empty availability if none exist
  if (defaultValues.availabilities.length === 0) {
    defaultValues.availabilities.push({
      dayOfWeek: "1",  // Default to Monday
      startHour: "9",  // Default to 9 AM
      endHour: "17",   // Default to 5 PM
    });
  }
  
  const form = useForm<DoctorAvailabilityFormValues>({
    resolver: zodResolver(doctorAvailabilityFormSchema),
    defaultValues,
    mode: "onChange"
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "availabilities"
  });
  
  // Handler for form submission
  const handleSubmit = (values: DoctorAvailabilityFormValues) => {
    try {
      onSubmit(values);
    } catch (error) {
      console.error("Error submitting availability form:", error);
      toast({
        title: "Error saving availabilities",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  // Add a new time slot
  const addTimeSlot = () => {
    append({
      dayOfWeek: "1",  // Default to Monday
      startHour: "9",  // Default to 9 AM
      endHour: "17",   // Default to 5 PM
    });
  };
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Doctor Availability</CardTitle>
        <CardDescription>
          Define when the doctor is available to see patients. Add multiple time slots per day if needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex flex-wrap items-end gap-4 p-4 border rounded-md">
                  <FormField
                    control={form.control}
                    name={`availabilities.${index}.dayOfWeek`}
                    render={({ field }) => (
                      <FormItem className="flex-1 min-w-[200px]">
                        <FormLabel>Day of Week</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {dayOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name={`availabilities.${index}.startHour`}
                    render={({ field }) => (
                      <FormItem className="w-28">
                        <FormLabel>Start Hour</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            max="23"
                            placeholder="0-23"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name={`availabilities.${index}.endHour`}
                    render={({ field }) => (
                      <FormItem className="w-28">
                        <FormLabel>End Hour</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="1"
                            max="24"
                            placeholder="1-24"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    className="mb-2"
                  >
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            
            <Button
              type="button"
              variant="outline"
              onClick={addTimeSlot}
              className="w-full"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Time Slot
            </Button>
            
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Availability"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}