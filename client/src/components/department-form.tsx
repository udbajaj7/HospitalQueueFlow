import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DepartmentCategoryEnum } from '@shared/schema';

// Form schema
const departmentFormSchema = z.object({
  code: z.string().min(2, {
    message: 'Department code must be at least 2 characters.',
  }).max(5, {
    message: 'Department code must not exceed 5 characters.',
  }),
  name: z.string().min(2, {
    message: 'Department name must be at least 2 characters.',
  }),
  category: z.string({
    required_error: "Please select a department category",
  }),
  slaThreshold: z.string().min(1, {
    message: 'SLA threshold must be at least 1 minute.',
  }),
  avgServiceTime: z.string().min(1, {
    message: 'Average service time must be at least 1 minute.',
  }),
});

type DepartmentFormValues = z.infer<typeof departmentFormSchema>;

interface DepartmentFormProps {
  department?: any;
  onSubmit: (data: DepartmentFormValues) => void;
  isLoading?: boolean;
}

const DepartmentForm: React.FC<DepartmentFormProps> = ({
  department,
  onSubmit,
  isLoading = false,
}) => {
  // Default form values
  const defaultValues: Partial<DepartmentFormValues> = {
    code: department?.code || '',
    name: department?.name || '',
    category: department?.category || DepartmentCategoryEnum.REGISTRATION,
    slaThreshold: department?.slaThreshold || '30',
    avgServiceTime: department?.avgServiceTime || '15',
  };

  // Initialize form
  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues,
  });

  // Disable code field when editing
  const isEditing = !!department;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department Code</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g. ONC, RAD, CAR" 
                  {...field} 
                  disabled={isLoading || isEditing} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g. Oncology, Radiology, Cardiology" 
                  {...field} 
                  disabled={isLoading} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department Category</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={DepartmentCategoryEnum.REGISTRATION}>Registration</SelectItem>
                  <SelectItem value={DepartmentCategoryEnum.BILLING}>Billing</SelectItem>
                  <SelectItem value={DepartmentCategoryEnum.SAMPLE_COLLECTION}>Sample Collection</SelectItem>
                  <SelectItem value={DepartmentCategoryEnum.PHARMACY}>Pharmacy</SelectItem>
                  <SelectItem value={DepartmentCategoryEnum.RADIOLOGY}>Radiology</SelectItem>
                  <SelectItem value={DepartmentCategoryEnum.OPD_CONSULTATION}>OPD Consultation</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slaThreshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SLA Threshold (minutes)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field} 
                  disabled={isLoading} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="avgServiceTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Average Service Time (minutes)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field} 
                  disabled={isLoading} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : isEditing ? 'Update Department' : 'Create Department'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default DepartmentForm;
