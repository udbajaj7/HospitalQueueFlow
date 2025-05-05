import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { PriorityEnum } from '@shared/schema';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// Form schema for token generation
const tokenFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  mrn: z.string().optional(),
  mobile: z.string().min(10, {
    message: 'Mobile number must be at least 10 digits.',
  }),
  departmentCode: z.string({
    required_error: 'Please select a department.',
  }),
  priority: z.string({
    required_error: 'Please select a priority.',
  }),
});

type TokenFormValues = z.infer<typeof tokenFormSchema>;

interface TokenFormProps {
  onSuccess: (tokenData: any) => void;
}

const TokenForm: React.FC<TokenFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch departments for dropdown
  const { data: departments = [] } = useQuery<Array<{code: string, name: string}>>({
    queryKey: ['/api/departments'],
  });

  // Default form values
  const defaultValues: TokenFormValues = {
    name: '',
    mrn: '',
    mobile: '',
    departmentCode: departments.length > 0 ? departments[0].code : 'OPD',
    priority: PriorityEnum.NORMAL,
  };

  // Initialize form
  const form = useForm<TokenFormValues>({
    resolver: zodResolver(tokenFormSchema),
    defaultValues,
  });

  // Mutations for creating patient and token
  const createPatientMutation = useMutation({
    mutationFn: async (values: TokenFormValues) => {
      // apiRequest already parses the response as JSON if possible
      return await apiRequest('POST', '/api/patients', {
        name: values.name,
        mrn: values.mrn || undefined,
        mobile: values.mobile,
      });
    },
  });

  const createTokenMutation = useMutation({
    mutationFn: async ({ patientId, values }: { patientId: string; values: TokenFormValues }) => {
      // apiRequest already parses the response as JSON if possible
      return await apiRequest('POST', '/api/tokens', {
        patientId,
        departmentCode: values.departmentCode,
        priority: values.priority,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/queues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/departments'] });
      onSuccess(data);
    },
  });

  // Form submission handler
  const onSubmit = async (values: TokenFormValues) => {
    try {
      // First create or get patient
      console.log('Creating patient with values:', values);
      const patient = await createPatientMutation.mutateAsync(values);
      console.log('Patient created:', patient);
      
      // Then create token
      console.log('Creating token for patient:', patient.id, 'with values:', values);
      const token = await createTokenMutation.mutateAsync({ patientId: patient.id, values });
      console.log('Token created:', token);
    } catch (error) {
      console.error('Error creating token:', error);
      let errorMessage = 'Failed to generate token. Please try again.';
      
      // Handle specific error cases
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // Loading state for form submission
  const isSubmitting = createPatientMutation.isPending || createTokenMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Patient Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter patient name" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mrn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Medical Record Number (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Enter MRN if available" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile Number</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter mobile number with country code" 
                    {...field} 
                    disabled={isSubmitting} 
                  />
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
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments?.map((dept: any) => (
                      <SelectItem key={dept.code} value={dept.code}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Priority</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-wrap gap-4"
                  disabled={isSubmitting}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={PriorityEnum.NORMAL} id="normal" />
                    <Label htmlFor="normal">Normal</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={PriorityEnum.EMERGENCY} id="emergency" />
                    <Label htmlFor="emergency">Emergency</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={PriorityEnum.FOLLOW_UP} id="follow-up" />
                    <Label htmlFor="follow-up">Follow-up</Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="pt-4">
          <Button
            type="submit"
            className="w-full py-3"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Generating Token...' : 'Generate Token'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default TokenForm;
