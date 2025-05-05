import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Roles } from '@/lib/auth';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Form schema
const userFormSchema = z.object({
  username: z.string().min(3, {
    message: 'Username must be at least 3 characters.',
  }),
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  password: z.string().min(6, {
    message: 'Password must be at least 6 characters.',
  }).optional(),
  role: z.string({
    required_error: 'Please select a role.',
  }),
  departmentCode: z.string().optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  user?: any;
  onSubmit: (data: UserFormValues) => void;
  isLoading?: boolean;
}

const UserForm: React.FC<UserFormProps> = ({
  user,
  onSubmit,
  isLoading = false,
}) => {
  // Fetch departments for dropdown
  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ['/api/departments'],
  });
  
  // Default form values
  const defaultValues: Partial<UserFormValues> = {
    username: user?.username || '',
    name: user?.name || '',
    role: user?.role || Roles.STAFF,
    departmentCode: user?.departmentCode || 'all', // Ensure this is never empty string
  };

  // Initialize form
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues,
  });

  // Check if we're in edit mode (no password required)
  const isEditing = !!user;
  
  // Get current role value to conditionally show department field
  const currentRole = form.watch('role');
  const showDepartmentField = currentRole === Roles.STAFF;

  // Handle form submission
  const handleSubmit = (values: UserFormValues) => {
    // Process department code - convert 'all' to undefined
    if (values.departmentCode === 'all') {
      values.departmentCode = undefined;
    }
    
    // Remove password if it's empty and we're editing
    if (isEditing && !values.password) {
      const { password, ...rest } = values;
      onSubmit(rest);
    } else {
      onSubmit(values);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter username" 
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
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter full name" 
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
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{isEditing ? 'New Password (leave blank to keep current)' : 'Password'}</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  placeholder={isEditing ? "Leave blank to keep current password" : "Enter password"} 
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
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={Roles.ADMIN}>Administrator</SelectItem>
                  <SelectItem value={Roles.STAFF}>Staff</SelectItem>
                  <SelectItem value={Roles.KIOSK}>Kiosk</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {showDepartmentField && (
          <FormField
            control={form.control}
            name="departmentCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
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
        )}
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : isEditing ? 'Update User' : 'Create User'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default UserForm;
