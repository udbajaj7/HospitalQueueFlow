import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Doctor } from "@shared/schema";
import { Loader2 } from "lucide-react";

export default function DoctorsPage() {
  const [_, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [doctorToDelete, setDoctorToDelete] = useState<Doctor | null>(null);

  // Fetch doctors
  const {
    data: doctors = [],
    isLoading,
    error,
  } = useQuery<Doctor[]>({
    queryKey: ["/api/doctors"],
  });

  // Fetch departments for reference
  const { data: departments = [] } = useQuery<Array<{ code: string; name: string }>>({
    queryKey: ["/api/departments"],
  });

  // Delete doctor mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/doctors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
      toast({
        title: "Doctor deleted",
        description: "Doctor has been removed successfully",
      });
      setDoctorToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting doctor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle edit button click
  const handleEdit = (doctor: Doctor) => {
    navigate(`/admin/doctors/edit/${doctor.id}`);
  };

  // Handle delete button click
  const handleDelete = (doctor: Doctor) => {
    setDoctorToDelete(doctor);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (doctorToDelete) {
      deleteMutation.mutate(doctorToDelete.id);
    }
  };

  // Get department name by code
  const getDepartmentName = (code: string) => {
    const department = departments?.find((dept: any) => dept.code === code);
    return department ? department.name : code;
  };

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Doctors" 
        description="Manage doctor profiles and availability" 
        actions={
          <Button onClick={() => navigate("/admin/doctors/new")}>
            <Plus className="mr-2 h-4 w-4" /> Add Doctor
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-40">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p>Error loading doctors. Please try again.</p>
          </div>
        </div>
      ) : doctors?.length === 0 ? (
        <div className="text-center py-10 border rounded-lg">
          <p className="text-muted-foreground">No doctors found. Add your first doctor to get started.</p>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Appointment Slots/Hour</TableHead>
                <TableHead>Walk-in Slots/Hour</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctors?.map((doctor: Doctor) => (
                <TableRow key={doctor.id}>
                  <TableCell className="font-medium">{doctor.name}</TableCell>
                  <TableCell>{getDepartmentName(doctor.departmentCode)}</TableCell>
                  <TableCell>
                    <Badge variant={doctor.active ? "default" : "outline"}>
                      {doctor.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{doctor.appointmentSlotsPerHour || 0}</TableCell>
                  <TableCell>{doctor.walkInSlotsPerHour || 0}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(doctor)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(doctor)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!doctorToDelete} onOpenChange={(open) => !open && setDoctorToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Doctor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete Dr. {doctorToDelete?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDoctorToDelete(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}