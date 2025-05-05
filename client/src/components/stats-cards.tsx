import { useDashboardStats } from '@/hooks/use-queue';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, CheckCircle, XCircle, Clock, Calendar, CalendarDays } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  className?: string;
  trend?: { value: number; label: string };
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  className = "bg-blue-100 dark:bg-blue-900", 
  trend 
}) => {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-center">
          <div className={`flex-shrink-0 rounded-md p-2 ${className}`}>
            {icon}
          </div>
          <div className="ml-3 w-0 flex-1">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
              {title}
            </div>
            <div className="flex items-baseline">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {value}
              </div>
              {trend && (
                <div className={`ml-1 flex items-baseline text-xs font-semibold ${
                  trend.value > 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  <span className="sr-only">{trend.value > 0 ? 'Increased' : 'Decreased'} by</span>
                  {trend.value > 0 ? '↑' : '↓'} {Math.abs(trend.value)}{trend.label}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const StatsCards: React.FC = () => {
  const { data: stats, isLoading } = useDashboardStats();
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-center">
                <Skeleton className="h-8 w-8 rounded-md" />
                <div className="ml-3 w-0 flex-1">
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-4 w-10" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (!stats) {
    return null;
  }
  
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard
        title="Waiting Patients"
        value={stats.waitingPatients}
        icon={<Users className="text-blue-600 dark:text-blue-400 h-4 w-4" />}
        className="bg-blue-100 dark:bg-blue-900"
      />
      
      <StatCard
        title="Served Today"
        value={stats.servedToday}
        icon={<CheckCircle className="text-green-600 dark:text-green-400 h-4 w-4" />}
        className="bg-green-100 dark:bg-green-900"
      />
      
      <StatCard
        title="No-Shows"
        value={stats.noShows}
        icon={<XCircle className="text-red-600 dark:text-red-400 h-4 w-4" />}
        className="bg-red-100 dark:bg-red-900"
      />
      
      <StatCard
        title="Avg. Wait Time"
        value={`${stats.avgWaitTime}m`}
        icon={<Clock className="text-yellow-600 dark:text-yellow-400 h-4 w-4" />}
        className="bg-yellow-100 dark:bg-yellow-900"
      />
      
      <StatCard
        title="Walk-ins"
        value={stats.walkIns || 0}
        icon={<Users className="text-amber-600 dark:text-amber-400 h-4 w-4" />}
        className="bg-amber-100 dark:bg-amber-900"
      />
      
      <StatCard
        title="Appointments"
        value={stats.appointments || 0}
        icon={<Calendar className="text-indigo-600 dark:text-indigo-400 h-4 w-4" />}
        className="bg-indigo-100 dark:bg-indigo-900"
      />
    </div>
  );
};

export default StatsCards;
