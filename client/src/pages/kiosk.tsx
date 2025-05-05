import { useState } from 'react';
import { Link } from 'wouter';
import TokenForm from '@/components/token-form';
import TokenDisplay from '@/components/token-display';
import { WalkInForm } from '@/components/walk-in-form';
import { AppointmentCheckInForm } from '@/components/appointment-check-in-form';
import QueueStatus from '@/components/queue-status';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Hospital, Users, CalendarCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const Kiosk = () => {
  const [tokenData, setTokenData] = useState<any>(null);
  const [showForm, setShowForm] = useState(true);

  // Fetch departments for the token display
  const { data: departments = [] } = useQuery<Array<{ code: string; name: string }>>({
    queryKey: ['/api/departments'],
  });

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white dark:bg-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-teal-700 text-white p-2 rounded-md">
                <Hospital className="h-5 w-5" />
              </div>
              <h1 className="ml-3 text-2xl font-bold text-slate-900 dark:text-white">RGCIRC Queue Management</h1>
            </div>
            <div className="hidden md:flex items-center space-x-3">
              <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 rounded-full text-sm">Kiosk Mode</span>
              <Link href="/login" className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                Admin Login
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-5xl mx-auto w-full px-4 py-8">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            Patient Registration
          </h2>
          
          <Tabs defaultValue="walk-in" className="mt-6">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="walk-in" className="text-base flex items-center">
                <Users className="mr-2 h-4 w-4" /> Walk-in Patient
              </TabsTrigger>
              <TabsTrigger value="appointment" className="text-base flex items-center">
                <CalendarCheck className="mr-2 h-4 w-4" /> Appointment Check-in
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="walk-in">
              <WalkInForm />
            </TabsContent>
            
            <TabsContent value="appointment">
              <AppointmentCheckInForm />
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Current Queue Status</h2>
          <QueueStatus />
        </div>
      </main>
    </div>
  );
};

export default Kiosk;
