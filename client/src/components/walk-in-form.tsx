import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Doctor } from "@shared/schema";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, UserCheck, Clock, TimerOff } from "lucide-react";

// Form schema for walk-in registration
const walkInFormSchema = z.object({
  patientName: z.string().min(2, "Name must be at least 2 characters"),
  patientMobile: z.string().min(10, "Mobile number must be at least 10 digits"),
  departmentCode: z.string().min(1, "Department is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  priority: z.string().optional(),
});

type WalkInFormValues = z.infer<typeof walkInFormSchema>;

export function WalkInForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentHour = new Date().getHours();
  const currentDate = format(new Date(), "yyyy-MM-dd");
  
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [tokenCreated, setTokenCreated] = useState<any>(null);
  
  // Form initialization
  const form = useForm<WalkInFormValues>({
    resolver: zodResolver(walkInFormSchema),
    defaultValues: {
      patientName: "",
      patientMobile: "",
      departmentCode: "",
      doctorId: "",
      priority: "normal",
    },
  });
  
  // Fetch departments
  const { 
    data: departments = [], 
    isLoading: isDepartmentsLoading 
  } = useQuery<Array<{ code: string; name: string }>>({
    queryKey: ["/api/departments"],
  });
  
  // Fetch available doctors for the selected department
  const { 
    data: doctors = [], 
    isLoading: isDoctorsLoading,
    refetch: refetchDoctors
  } = useQuery<Doctor[]>({
    queryKey: ["/api/doctors"],
    queryFn: async () => {
      if (!selectedDepartment) return [];
      const response = await fetch(`/api/doctors?department=${selectedDepartment}`);
      if (!response.ok) {
        throw new Error("Failed to fetch doctors for department");
      }
      return response.json();
    },
    enabled: !!selectedDepartment,
  });
  
  // Fetch doctor slot availability when a doctor is selected
  const { 
    data: doctorSlot, 
    isLoading: isSlotLoading,
    refetch: refetchSlot
  } = useQuery<any>({
    queryKey: ["/api/doctors", selectedDoctor, "slots"],
    queryFn: async () => {
      if (!selectedDoctor) return null;
      const response = await fetch(
        `/api/doctors/${selectedDoctor}/slots?date=${currentDate}&hour=${currentHour}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch doctor availability");
      }
      return response.json();
    },
    enabled: !!selectedDoctor,
  });
  
  // Create token mutation for walk-in patients
  const createTokenMutation = useMutation({
    mutationFn: async (data: WalkInFormValues) => {
      const tokenData = {
        ...data,
        source: "walkin",
        isWalkIn: true,
      };
      return await apiRequest("POST", "/api/tokens", tokenData);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setTokenCreated(data);
      queryClient.invalidateQueries({ queryKey: ["/api/tokens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/doctors", selectedDoctor, "slots"] });
      
      toast({
        title: "Walk-in token created",
        description: `Token #${data.tokenNumber} created successfully`,
      });
      
      // Reset form
      form.reset();
      setSelectedDoctor(null);
      setSelectedDepartment(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating token",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle department change
  useEffect(() => {
    if (selectedDepartment) {
      refetchDoctors();
      form.setValue("doctorId", "");
      setSelectedDoctor(null);
    }
  }, [selectedDepartment, refetchDoctors, form]);
  
  // Handle doctor change
  useEffect(() => {
    if (selectedDoctor) {
      refetchSlot();
    }
  }, [selectedDoctor, refetchSlot]);
  
  // Handle form submission
  const onSubmit = (values: WalkInFormValues) => {
    if (!doctorSlot?.isAvailable) {
      toast({
        title: "Doctor unavailable",
        description: "The selected doctor is not available at this time",
        variant: "destructive",
      });
      return;
    }
    
    if (doctorSlot?.remainingWalkInSlots <= 0) {
      toast({
        title: "No walk-in slots available",
        description: "All walk-in slots for this hour are filled. Please select another doctor or try again later.",
        variant: "destructive",
      });
      return;
    }
    
    createTokenMutation.mutate(values);
  };
  
  // Reset token created state when trying again
  const handleTryAgain = () => {
    setTokenCreated(null);
  };
  
  return (
    <div className="w-full max-w-md mx-auto">
      {tokenCreated ? (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Walk-in Token Created</CardTitle>
            <CardDescription className="text-green-700">
              Your token has been created successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">
                #{tokenCreated.tokenNumber}
              </p>
              <p className="mt-2 text-gray-600">
                {format(new Date(tokenCreated.issuedAt), "PPpp")}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <h3 className="font-medium text-gray-700 flex items-center">
                  <UserCheck className="h-4 w-4 mr-2 text-blue-500" /> Patient
                </h3>
                <p className="mt-1">{tokenCreated.patientName}</p>
              </div>
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <h3 className="font-medium text-gray-700 flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-blue-500" /> Wait Time
                </h3>
                <p className="mt-1">~{tokenCreated.waitTime} min</p>
              </div>
            </div>
            
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Please keep your token number for reference. You'll be called when it's your turn.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={handleTryAgain} className="w-full">
              Register Another Patient
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Walk-in Registration</CardTitle>
            <CardDescription>
              Register as a walk-in patient to join the queue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="patientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter patient name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="patientMobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter mobile number"
                          type="tel"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Will be used for SMS notifications
                      </FormDescription>
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
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedDepartment(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((dept) => (
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
                
                <FormField
                  control={form.control}
                  name="doctorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Doctor</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedDoctor(value);
                        }}
                        value={field.value}
                        disabled={!selectedDepartment || isDoctorsLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select doctor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {doctors
                            .filter(doc => doc.active)
                            .map((doctor) => (
                              <SelectItem key={doctor.id} value={doctor.id}>
                                {doctor.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {selectedDoctor && doctorSlot && !isSlotLoading && (
                  <div className="py-2">
                    {doctorSlot.isAvailable ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-800">
                        <p className="font-medium">Doctor is available</p>
                        <p className="text-sm">Walk-in slots remaining: {doctorSlot.remainingWalkInSlots}</p>
                      </div>
                    ) : (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 flex items-start">
                        <TimerOff className="h-5 w-5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Doctor is not available at this time</p>
                          <p className="text-sm">Please select another doctor or visit during their scheduled hours</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    createTokenMutation.isPending ||
                    isSlotLoading ||
                    (selectedDoctor && doctorSlot && 
                      (!doctorSlot.isAvailable || doctorSlot.remainingWalkInSlots <= 0))
                  }
                >
                  {createTokenMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Token...
                    </>
                  ) : (
                    "Get Token"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}