import { useDepartmentStats } from '@/hooks/use-queue';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const QueueStatus: React.FC = () => {
  const { data: departmentStats, isLoading } = useDepartmentStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!departmentStats || departmentStats.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No departments available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {departmentStats.map((dept) => (
        <Card key={dept.code} className="bg-slate-50 dark:bg-slate-700">
          <CardContent className="p-4">
            <h3 className="font-medium text-slate-900 dark:text-white">{dept.name}</h3>
            <div className="mt-2 flex justify-between items-center">
              <span className="text-sm text-slate-500 dark:text-slate-400">Current Token</span>
              <span className="font-bold text-teal-700 dark:text-teal-500">
                {dept.currentToken || 'None'}
              </span>
            </div>
            <div className="mt-1 flex justify-between items-center">
              <span className="text-sm text-slate-500 dark:text-slate-400">Waiting</span>
              <span className="font-bold text-amber-600 dark:text-amber-500">
                {dept.waitingCount} patient{dept.waitingCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="mt-1 flex justify-between items-center">
              <span className="text-sm text-slate-500 dark:text-slate-400">Avg. Wait</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                ~{dept.avgWait} min
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default QueueStatus;
