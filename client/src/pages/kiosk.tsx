import { useState } from 'react';
import { Link } from 'wouter';
import TokenForm from '@/components/token-form';
import TokenDisplay from '@/components/token-display';
import QueueStatus from '@/components/queue-status';
import { Card, CardContent } from '@/components/ui/card';
import { Hospital } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const Kiosk = () => {
  const [tokenData, setTokenData] = useState<any>(null);
  const [showForm, setShowForm] = useState(true);

  // Fetch departments for the token display
  const { data: departments } = useQuery({
    queryKey: ['/api/departments'],
  });

  // Handle token generation success
  const handleTokenSuccess = (data: any) => {
    setTokenData(data);
    setShowForm(false);
  };

  // Handle new token button
  const handleNewToken = () => {
    setShowForm(true);
  };

  // Find department details
  const getDepartmentName = (code: string) => {
    if (!departments) return code;
    const department = departments.find((dept: any) => dept.code === code);
    return department?.name || code;
  };

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
              <Link href="/login">
                <a className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  Admin Login
                </a>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-5xl mx-auto w-full px-4 py-8">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            {showForm ? 'Generate New Token' : 'Token Generated'}
          </h2>
          
          {showForm ? (
            <TokenForm onSuccess={handleTokenSuccess} />
          ) : (
            tokenData && (
              <TokenDisplay 
                token={tokenData} 
                patient={tokenData.patient} 
                department={{
                  name: getDepartmentName(tokenData.departmentCode)
                }}
                onNewToken={handleNewToken}
              />
            )
          )}
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
