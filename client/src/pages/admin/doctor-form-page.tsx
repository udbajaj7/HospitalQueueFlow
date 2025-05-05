import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Doctor } from "@shared/schema";
import { DoctorForm } from "@/components/doctor-form";
import { DoctorAvailabilityForm } from "@/components/doctor-availability-form";
import { PageHeader } from "@/components/page-header";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function DoctorFormPage() {
  const { id } = useParams();
  const [_, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [saveSuccessful, setSaveSuccessful] = useState(false);
  
  // Fetch departments data
  const { 
    data: departments = [], 
    isLoading: isLoadingDepartments 
  } = useQuery<Array<{ code: string; name: string }>>({
    queryKey: ["/api/departments"],
  });

  // Fetch doctor data if editing existing doctor
  const { 
    data: doctor, 
    isLoading: isLoadingDoctor 
  } = useQuery<Doctor>({
    queryKey: ["/api/doctors", id],
    enabled: !!id,
  });
  
  // Fetch doctor availability if editing
  const {
    data: availabilities = [],
    isLoading: isLoadingAvailabilities
  } = useQuery<Array<{ id?: string; dayOfWeek: number; startHour: number; endHour: number }>>({
    queryKey: ["/api/doctors", id, "availabilities"],
    enabled: !!id,
  });

  // Doctor create/update mutation
  const doctorMutation = useMutation({
    mutationFn: async (data: any) => {
      if (id) {
        return await apiRequest("PUT", `/api/doctors/${id}`, data);
      } else {
        return await apiRequest("POST", "/api/doctors", data);
      }
    },
    onSuccess: async (response) => {
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
      
      // If this is a new doctor, navigate to edit page to set availability
      if (!id) {
        toast({
          title: "Doctor created successfully",
          description: "Now you can set the doctor's availability",
        });
        navigate(`/admin/doctors/edit/${data.id}`);
      } else {
        toast({
          title: "Doctor updated successfully",
          description: "Doctor information has been updated",
        });
        setSaveSuccessful(true);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving doctor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Availability update mutation
  const availabilityMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", `/api/doctors/${id}/availabilities`, data.availabilities);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors", id, "availabilities"] });
      toast({
        title: "Availability updated",
        description: "Doctor availability has been updated successfully",
      });
      setSaveSuccessful(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving availability",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset success state when component remounts
  useEffect(() => {
    setSaveSuccessful(false);
  }, [id]);

  // Handle doctor form submission
  const handleDoctorSubmit = (data: any) => {
    doctorMutation.mutate(data);
  };

  // Handle availability form submission
  const handleAvailabilitySubmit = (data: any) => {
    if (!id) {
      toast({
        title: "Error",
        description: "Please save doctor information first",
        variant: "destructive",
      });
      return;
    }
    
    // Convert string values to numbers before submitting
    const formattedAvailabilities = data.availabilities.map((avail: any) => ({
      dayOfWeek: parseInt(avail.dayOfWeek),
      startHour: parseInt(avail.startHour),
      endHour: parseInt(avail.endHour),
    }));
    
    availabilityMutation.mutate({ availabilities: formattedAvailabilities });
  };

  const isLoading = isLoadingDepartments || (id && isLoadingDoctor);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Button 
        variant="ghost" 
        className="mb-4" 
        onClick={() => navigate("/admin/doctors")}
      >
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Doctors
      </Button>
      
      <PageHeader
        title={id ? "Edit Doctor" : "Add New Doctor"}
        description={id ? "Edit doctor information and availability" : "Create a new doctor profile"}
      />
      
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <DoctorForm
              doctor={doctor}
              departments={departments || []}
              onSubmit={handleDoctorSubmit}
              isLoading={doctorMutation.isPending}
            />
          </div>
          
          {id && (
            <div>
              <DoctorAvailabilityForm
                existingAvailabilities={availabilities || []}
                onSubmit={handleAvailabilitySubmit}
                isLoading={availabilityMutation.isPending}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}