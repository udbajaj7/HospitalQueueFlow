import { useQuery } from '@tanstack/react-query';
import StatsCards from '@/components/stats-cards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';
import { useTheme } from 'next-themes';
import { formatISO } from 'date-fns';

const AdminDashboard = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Fetch departments for charts
  const { data: departments } = useQuery({
    queryKey: ['/api/departments'],
  });

  // Fetch tokens for today
  const today = formatISO(new Date()).split('T')[0];
  const { data: queues } = useQuery({
    queryKey: [`/api/queues?date=${today}`],
  });

  // Dashboard stats
  const { data: dashboardStats } = useQuery({
    queryKey: ['/api/stats/dashboard'],
  });

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Prepare data for department distribution chart
  const getDepartmentData = () => {
    if (!departments || !queues) return [];
    
    // Create mapping of department codes to names
    const deptMap = departments.reduce((acc: any, dept: any) => {
      acc[dept.code] = dept.name;
      return acc;
    }, {});
    
    // Count tokens by department
    const counts: Record<string, number> = {};
    queues.forEach((token: any) => {
      counts[token.departmentCode] = (counts[token.departmentCode] || 0) + 1;
    });
    
    // Format for chart
    return Object.entries(counts).map(([code, count]) => ({
      name: deptMap[code] || code,
      value: count
    }));
  };

  // Prepare data for status distribution chart
  const getStatusData = () => {
    if (!queues) return [];
    
    // Count tokens by status
    const counts: Record<string, number> = {};
    queues.forEach((token: any) => {
      counts[token.status] = (counts[token.status] || 0) + 1;
    });
    
    // Format for chart
    return Object.entries(counts).map(([status, count]) => ({
      name: status,
      value: count
    }));
  };

  // Prepare data for wait time by department chart
  const getWaitTimeData = () => {
    if (!departments) return [];
    return departments.map((dept: any) => ({
      name: dept.name,
      avgWait: dept.avgServiceTime
    }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">System Overview</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">Monitor system performance and manage settings</p>
      
      {/* Stats cards */}
      <StatsCards />
      
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Department Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Token Distribution by Department</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getDepartmentData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getDepartmentData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#1e293b' : '#fff', 
                    color: isDark ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: '0.5rem'
                  }} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Token Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getStatusData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getStatusData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#1e293b' : '#fff', 
                    color: isDark ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: '0.5rem'
                  }} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Average Wait Time by Department */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Average Service Time by Department</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getWaitTimeData()}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: isDark ? '#9ca3af' : '#4b5563' }} 
                />
                <YAxis 
                  label={{ 
                    value: 'Minutes', 
                    angle: -90, 
                    position: 'insideLeft',
                    fill: isDark ? '#9ca3af' : '#4b5563'
                  }} 
                  tick={{ fill: isDark ? '#9ca3af' : '#4b5563' }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#1e293b' : '#fff', 
                    color: isDark ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: '0.5rem'
                  }} 
                />
                <Legend />
                <Bar dataKey="avgWait" name="Average Service Time (minutes)" fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
