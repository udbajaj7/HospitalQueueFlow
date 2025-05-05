import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { insertDoctorSchema, type Doctor } from "@shared/schema";

// Add client-side validation
const doctorFormSchema = insertDoctorSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  departmentCode: z.string().min(1, "Department is required"),
  appointmentSlotsPerHour: z.coerce.number()
    .int("Must be a whole number")
    .min(0, "Minimum is 0")
    .max(10, "Maximum is 10"),
  walkInSlotsPerHour: z.coerce.number()
    .int("Must be a whole number")
    .min(0, "Minimum is 0")
    .max(10, "Maximum is 10"),
});

type DoctorFormValues = z.infer<typeof doctorFormSchema>;

interface DoctorFormProps {
  doctor?: Doctor;
  onSubmit: (data: DoctorFormValues) => void;
  isLoading?: boolean;
  departments: { code: string; name: string }[];
}

export function DoctorForm({ doctor, onSubmit, isLoading = false, departments }: DoctorFormProps) {
  // Initialize form with default values or existing doctor data
  const defaultValues: DoctorFormValues = {
    name: "",
    departmentCode: "",
    active: true,
    appointmentSlotsPerHour: 4, // Default to 4 appointments per hour
    walkInSlotsPerHour: 2,      // Default to 2 walk-ins per hour
  };

  const form = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorFormSchema),
    defaultValues: doctor ? { ...defaultValues, ...doctor } : defaultValues,
  });

  // Update form values when doctor prop changes
  useEffect(() => {
    if (doctor) {
      form.reset({ ...defaultValues, ...doctor });
    }
  }, [doctor, form]);

  // Handle form submission
  const handleSubmit = (values: DoctorFormValues) => {
    onSubmit(values);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{doctor ? "Edit Doctor" : "Add Doctor"}</CardTitle>
        <CardDescription>
          {doctor 
            ? "Update doctor information" 
            : "Create a new doctor profile for the department"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Doctor Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Dr. John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="departmentCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments.map((department) => (
                        <SelectItem key={department.code} value={department.code}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="appointmentSlotsPerHour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appointment Slots Per Hour</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        max="10" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum number of appointments the doctor can handle per hour
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="walkInSlotsPerHour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Walk-in Slots Per Hour</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        max="10" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum number of walk-in patients the doctor can see per hour
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription className="text-sm text-gray-500">
                      Set doctor availability status
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              disabled={isLoading || !form.formState.isDirty}
              className="w-full"
            >
              {isLoading ? "Saving..." : doctor ? "Update Doctor" : "Add Doctor"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// Missing import
import { FormDescription } from "@/components/ui/form";