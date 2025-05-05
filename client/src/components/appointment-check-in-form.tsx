import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInMinutes } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, 
  AlertCircle, 
  UserCheck, 
  Clock, 
  Calendar, 
  Phone,
  CheckCircle
} from "lucide-react";

// Form schema for appointment check-in
const appointmentCheckInSchema = z.object({
  appointmentCode: z.string().min(1, "Appointment code is required"),
});

const mobileCheckInSchema = z.object({
  patientMobile: z.string().min(10, "Mobile number must be at least 10 digits"),
});

type AppointmentCheckInValues = z.infer<typeof appointmentCheckInSchema>;
type MobileCheckInValues = z.infer<typeof mobileCheckInSchema>;

export function AppointmentCheckInForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [appointmentDetails, setAppointmentDetails] = useState<any>(null);
  const [tokenCreated, setTokenCreated] = useState<any>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("code");
  
  // Form for appointment code check-in
  const appointmentForm = useForm<AppointmentCheckInValues>({
    resolver: zodResolver(appointmentCheckInSchema),
    defaultValues: {
      appointmentCode: "",
    },
  });
  
  // Form for mobile number check-in
  const mobileForm = useForm<MobileCheckInValues>({
    resolver: zodResolver(mobileCheckInSchema),
    defaultValues: {
      patientMobile: "",
    },
  });
  
  // Verify appointment mutation
  const verifyAppointmentMutation = useMutation({
    mutationFn: async (data: { code?: string; mobile?: string }) => {
      return await apiRequest("POST", "/api/appointments/verify", data);
    },
    onSuccess: async (response) => {
      try {
        const data = await response.json();
        
        if (!data || (Array.isArray(data) && data.length === 0)) {
          setCheckInError("No appointment found with the provided details");
          return;
        }
        
        // Use the first appointment if multiple found (mobile number case)
        const appointment = Array.isArray(data) ? data[0] : data;
        
        // Check if appointment is within check-in window (30 min before/after)
        const appointmentTime = new Date(appointment.scheduledTime);
        const now = new Date();
        const timeDiff = differenceInMinutes(appointmentTime, now);
        
        if (timeDiff > 30) {
          setCheckInError(`It's too early to check in. Please return closer to your appointment time (${format(appointmentTime, "h:mm a")})`);
          return;
        }
        
        if (timeDiff < -30) {
          setCheckInError("You've missed your appointment window. Please contact the help desk for assistance.");
          return;
        }
        
        setAppointmentDetails(appointment);
        setCheckInError(null);
      } catch (error) {
        console.error("Error processing appointment response:", error);
        setCheckInError("Error verifying appointment. Please try again.");
      }
    },
    onError: (error: Error) => {
      setCheckInError(error.message);
      toast({
        title: "Error verifying appointment",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Check-in appointment mutation
  const checkInMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      return await apiRequest("POST", `/api/appointments/${appointmentId}/check-in`, {});
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setTokenCreated(data);
      queryClient.invalidateQueries({ queryKey: ["/api/tokens"] });
      
      toast({
        title: "Check-in successful",
        description: `Token #${data.tokenNumber} created successfully`,
      });
      
      // Reset forms and state
      appointmentForm.reset();
      mobileForm.reset();
      setAppointmentDetails(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error checking in",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle appointment code form submission
  const onSubmitAppointmentCode = (values: AppointmentCheckInValues) => {
    setCheckInError(null);
    verifyAppointmentMutation.mutate({ code: values.appointmentCode });
  };
  
  // Handle mobile number form submission
  const onSubmitMobile = (values: MobileCheckInValues) => {
    setCheckInError(null);
    verifyAppointmentMutation.mutate({ mobile: values.patientMobile });
  };
  
  // Handle check-in confirmation
  const handleCheckIn = () => {
    if (appointmentDetails?.id) {
      checkInMutation.mutate(appointmentDetails.id);
    }
  };
  
  // Reset all state when trying again
  const handleTryAgain = () => {
    setTokenCreated(null);
    setAppointmentDetails(null);
    setCheckInError(null);
    appointmentForm.reset();
    mobileForm.reset();
  };
  
  return (
    <div className="w-full max-w-md mx-auto">
      {tokenCreated ? (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Check-in Successful</CardTitle>
            <CardDescription className="text-green-700">
              You have been checked in for your appointment
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
              Check In Another Appointment
            </Button>
          </CardFooter>
        </Card>
      ) : appointmentDetails ? (
        <Card>
          <CardHeader>
            <CardTitle>Appointment Found</CardTitle>
            <CardDescription>
              Please confirm your appointment details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-start space-x-3">
                <UserCheck className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-gray-500">Patient</p>
                  <p>{appointmentDetails.patientName}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-gray-500">Appointment</p>
                  <p>{format(new Date(appointmentDetails.scheduledTime), "PPP h:mm a")}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Phone className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-gray-500">Contact</p>
                  <p>{appointmentDetails.patientMobile}</p>
                </div>
              </div>
            </div>
            
            <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-700">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              <AlertTitle>Ready to check in</AlertTitle>
              <AlertDescription>
                You're within the check-in window. Please confirm to get your token.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button 
              onClick={handleCheckIn}
              className="w-full"
              disabled={checkInMutation.isPending}
            >
              {checkInMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking In...
                </>
              ) : (
                "Confirm Check-in"
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleTryAgain}
              className="w-full"
              disabled={checkInMutation.isPending}
            >
              Cancel
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Appointment Check-in</CardTitle>
            <CardDescription>
              Check in for your scheduled appointment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="code" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="code">Appointment Code</TabsTrigger>
                <TabsTrigger value="mobile">Mobile Number</TabsTrigger>
              </TabsList>
              
              <TabsContent value="code">
                <Form {...appointmentForm}>
                  <form onSubmit={appointmentForm.handleSubmit(onSubmitAppointmentCode)} className="space-y-4">
                    <FormField
                      control={appointmentForm.control}
                      name="appointmentCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Appointment Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your appointment code" {...field} />
                          </FormControl>
                          <FormDescription>
                            Enter the code you received when booking your appointment
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {checkInError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{checkInError}</AlertDescription>
                      </Alert>
                    )}
                    
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={verifyAppointmentMutation.isPending}
                    >
                      {verifyAppointmentMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify Appointment"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="mobile">
                <Form {...mobileForm}>
                  <form onSubmit={mobileForm.handleSubmit(onSubmitMobile)} className="space-y-4">
                    <FormField
                      control={mobileForm.control}
                      name="patientMobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your mobile number" type="tel" {...field} />
                          </FormControl>
                          <FormDescription>
                            Enter the mobile number you used for booking
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {checkInError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{checkInError}</AlertDescription>
                      </Alert>
                    )}
                    
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={verifyAppointmentMutation.isPending}
                    >
                      {verifyAppointmentMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Find Appointment"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}