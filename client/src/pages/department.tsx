import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import QueueTable from '@/components/queue-table';
import Header from '@/components/header';
import Sidebar from '@/components/sidebar';
import MobileNav from '@/components/mobile-nav';

const Department = () => {
  const { user } = useAuth();
  const params = useParams();
  const [, setLocation] = useLocation();
  const departmentCode = params.code;
  const [selectedDepartment, setSelectedDepartment] = useState(departmentCode || '');

  // Fetch departments
  const { data: departments, isLoading: loadingDepartments } = useQuery({
    queryKey: ['/api/departments'],
  });

  // Handle department change
  const handleDepartmentChange = (value: string) => {
    setSelectedDepartment(value);
    setLocation(`/departments/${value}`);
  };

  // Handle call next button
  const handleCallNext = () => {
    // This would typically call an API to get the next token and update its status
    // For now, we'll leave this functionality to be implemented in the QueueTable component
    console.log('Call next patient for department:', selectedDepartment);
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <Sidebar type="staff" />

      {/* Mobile navigation */}
      <MobileNav type="staff" />

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <Header title={`Department: ${selectedDepartment || 'All'}`} userType="staff" />

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 pb-16 md:pb-8">
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-4 sm:mb-0">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Department Queue</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Manage patient queue and token status
                </p>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <div className="relative">
                  {loadingDepartments ? (
                    <Skeleton className="h-10 w-48" />
                  ) : (
                    <Select
                      value={selectedDepartment}
                      onValueChange={handleDepartmentChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Departments</SelectItem>
                        {departments?.map((dept: any) => (
                          <SelectItem key={dept.code} value={dept.code}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Button
                  type="button"
                  className="bg-teal-600 hover:bg-teal-700"
                  onClick={handleCallNext}
                >
                  <i className="fa-solid fa-bullhorn mr-2"></i>
                  Call Next Patient
                </Button>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Queue Management</CardTitle>
            </CardHeader>
            <CardContent>
              <QueueTable departmentCode={selectedDepartment} onCallNext={handleCallNext} />
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Department;
