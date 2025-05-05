import { useState } from "react";
import { 
  useDoctors, 
  useCreateDoctor, 
  useUpdateDoctor, 
  useDeleteDoctor 
} from "@/hooks/use-doctors";
import { useToast } from "@/hooks/use-toast";
import { DoctorForm } from "@/components/doctor-form";
import { DoctorTable } from "@/components/doctor-table";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { type Doctor } from "@shared/schema";
import { 
  Dialog, 
  DialogContent, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function DoctorsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | undefined>(undefined);
  const [departmentFilter, setDepartmentFilter] = useState<string | undefined>(undefined);
  
  const { data: doctors, isLoading: isLoadingDoctors } = useDoctors(departmentFilter);
  const { data: allDepartments = [], isLoading: isLoadingDepartments } = useQuery<Array<{ code: string; name: string }>>({
    queryKey: ['/api/departments'],
    queryFn: () => apiRequest('/api/departments'),
  });
  
  const createDoctorMutation = useCreateDoctor();
  const updateDoctorMutation = useUpdateDoctor();
  const deleteDoctorMutation = useDeleteDoctor();
  
  const { toast } = useToast();
  
  const handleCreateDoctor = (data: any) => {
    createDoctorMutation.mutate(data, {
      onSuccess: () => {
        toast({
          title: "Doctor created",
          description: "The doctor has been created successfully.",
        });
        setIsDialogOpen(false);
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: "Failed to create doctor. Please try again.",
          variant: "destructive",
        });
      },
    });
  };
  
  const handleUpdateDoctor = (data: any) => {
    if (!selectedDoctor) return;
    
    updateDoctorMutation.mutate(
      { id: selectedDoctor.id, data },
      {
        onSuccess: () => {
          toast({
            title: "Doctor updated",
            description: "The doctor has been updated successfully.",
          });
          setIsDialogOpen(false);
          setSelectedDoctor(undefined);
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: "Failed to update doctor. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };
  
  const handleDeleteDoctor = (id: string) => {
    deleteDoctorMutation.mutate(id, {
      onSuccess: () => {
        toast({
          title: "Doctor deleted",
          description: "The doctor has been deleted successfully.",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: "Failed to delete doctor. Please try again.",
          variant: "destructive",
        });
      },
    });
  };
  
  const handleEditDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setIsDialogOpen(true);
  };
  
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedDoctor(undefined);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Doctor Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedDoctor(undefined)}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Doctor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DoctorForm
              doctor={selectedDoctor}
              onSubmit={selectedDoctor ? handleUpdateDoctor : handleCreateDoctor}
              isLoading={createDoctorMutation.isPending || updateDoctorMutation.isPending}
              departments={allDepartments || []}
            />
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Doctors Directory</CardTitle>
          <CardDescription>
            Manage department doctors and their status
          </CardDescription>
          <div className="flex justify-end items-center space-x-4 mt-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="department-filter">Filter by Department:</Label>
              <Select
                value={departmentFilter || "all"}
                onValueChange={(value) => setDepartmentFilter(value === "all" ? undefined : value)}
              >
                <SelectTrigger id="department-filter" className="w-[180px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {allDepartments?.map((dept: { code: string; name: string }) => (
                    <SelectItem key={dept.code} value={dept.code}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingDoctors || isLoadingDepartments ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <DoctorTable
              doctors={doctors || []}
              onEdit={handleEditDoctor}
              onDelete={handleDeleteDoctor}
              isDeleting={deleteDoctorMutation.isPending}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Missing imports
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";