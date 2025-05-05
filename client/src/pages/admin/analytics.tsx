import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronDown, Download } from 'lucide-react';
import { format, subDays, formatISO } from 'date-fns';
import { useTheme } from 'next-themes';

// Custom tooltip component for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 shadow-lg rounded-lg border">
        <p className="font-medium text-sm">{`${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AdminAnalytics = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [activeTab, setActiveTab] = useState('overview');

  // Convert date range to ISO strings for query
  const fromDate = formatISO(dateRange.from).split('T')[0];
  const toDate = formatISO(dateRange.to).split('T')[0];

  // Fetch token history for analytics
  const { data: tokenHistory = [], isLoading: isLoadingHistory } = useQuery<any[]>({
    queryKey: [`/api/reports/token-history?startDate=${fromDate}&endDate=${toDate}`],
  });

  // Fetch departments for filtering
  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ['/api/departments'],
  });

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
  const CHART_BACKGROUND = isDark ? '#1f2937' : '#ffffff';
  const LINE_STROKE = isDark ? '#e5e7eb' : '#374151';

  // Prepare data for status distribution chart
  const getStatusData = () => {
    if (!tokenHistory) return [];
    
    const statusCounts: Record<string, number> = {
      'SERVED': 0,
      'NO_SHOW': 0,
      'CALLED': 0,
      'ISSUED': 0,
    };
    
    tokenHistory.forEach((token: any) => {
      statusCounts[token.status] = (statusCounts[token.status] || 0) + 1;
    });
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count
    }));
  };

  // Prepare data for department distribution chart
  const getDepartmentData = () => {
    if (!tokenHistory || !departments) return [];
    
    // Create mapping of department codes to names
    const deptMap = departments.reduce((acc: any, dept: any) => {
      acc[dept.code] = dept.name;
      return acc;
    }, {});
    
    // Count tokens by department
    const counts: Record<string, number> = {};
    tokenHistory.forEach((token: any) => {
      counts[token.departmentCode] = (counts[token.departmentCode] || 0) + 1;
    });
    
    // Format for chart
    return Object.entries(counts).map(([code, count]) => ({
      name: deptMap[code] || code,
      value: count
    }));
  };

  // Prepare data for wait time trend
  const getWaitTimeTrend = () => {
    if (!tokenHistory) return [];
    
    // Group by day and calculate average wait time
    const waitTimeByDay: Record<string, { total: number, count: number }> = {};
    
    tokenHistory.forEach((token: any) => {
      if (token.servedAt && token.issuedAt) {
        const day = token.issuedAt.split('T')[0];
        const waitTime = token.waitTime || 0;
        
        if (!waitTimeByDay[day]) {
          waitTimeByDay[day] = { total: 0, count: 0 };
        }
        
        waitTimeByDay[day].total += waitTime;
        waitTimeByDay[day].count += 1;
      }
    });
    
    // Calculate average and format for chart
    return Object.entries(waitTimeByDay).map(([day, { total, count }]) => ({
      date: format(new Date(day), 'MMM dd'),
      avgWaitTime: Math.round(total / count),
    }));
  };

  // Prepare priority distribution data
  const getPriorityData = () => {
    if (!tokenHistory) return [];
    
    const priorityCounts: Record<string, number> = {
      'NORMAL': 0,
      'EMERGENCY': 0,
      'FOLLOW_UP': 0,
    };
    
    tokenHistory.forEach((token: any) => {
      priorityCounts[token.priority] = (priorityCounts[token.priority] || 0) + 1;
    });
    
    return Object.entries(priorityCounts).map(([priority, count]) => ({
      name: priority,
      value: count
    }));
  };

  // Handle exporting data as CSV
  const exportAsCSV = () => {
    if (!tokenHistory) return;
    
    // Create CSV content
    const headers = ['Token Number', 'Department', 'Patient', 'Priority', 'Status', 'Issued At', 'Served At', 'Wait Time (min)'];
    
    const rows = tokenHistory.map((token: any) => [
      token.tokenNumber,
      token.department,
      token.patientName,
      token.priority,
      token.status,
      token.issuedAt ? new Date(token.issuedAt).toLocaleString() : '',
      token.servedAt ? new Date(token.servedAt).toLocaleString() : '',
      token.waitTime || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = `queue-analytics-${fromDate}-to-${toDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Queue Analytics</h1>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <DatePickerWithRange 
            date={dateRange}
            setDate={setDateRange}
          />
          
          <Button variant="outline" size="sm" onClick={exportAsCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="wait-times">Wait Times</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Status Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Status Distribution</CardTitle>
                <CardDescription>Token status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingHistory ? (
                  <div className="w-full h-[200px] flex items-center justify-center">
                    <Skeleton className="h-[200px] w-full rounded-lg" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={getStatusData()}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {getStatusData().map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            
            {/* Priority Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Priority Distribution</CardTitle>
                <CardDescription>Token priority breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingHistory ? (
                  <div className="w-full h-[200px] flex items-center justify-center">
                    <Skeleton className="h-[200px] w-full rounded-lg" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={getPriorityData()}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {getPriorityData().map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            
            {/* Department Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Department Distribution</CardTitle>
                <CardDescription>Tokens by department</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingHistory ? (
                  <div className="w-full h-[200px] flex items-center justify-center">
                    <Skeleton className="h-[200px] w-full rounded-lg" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={getDepartmentData()}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {getDepartmentData().map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Wait Time Trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Wait Time Trend</CardTitle>
              <CardDescription>Average wait time by day (minutes)</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="w-full h-[300px] flex items-center justify-center">
                  <Skeleton className="h-[300px] w-full rounded-lg" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={getWaitTimeTrend()}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                    <XAxis 
                      dataKey="date" 
                      stroke={LINE_STROKE} 
                      tick={{ fill: isDark ? '#e5e7eb' : '#374151' }}
                    />
                    <YAxis 
                      stroke={LINE_STROKE} 
                      tick={{ fill: isDark ? '#e5e7eb' : '#374151' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="avgWaitTime" 
                      name="Avg Wait Time (min)" 
                      stroke="#0088FE" 
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="wait-times" className="space-y-6 mt-6">
          {/* Wait time analytics tab content */}
          <Card>
            <CardHeader>
              <CardTitle>Wait Time Distribution</CardTitle>
              <CardDescription>Wait time ranges across all departments</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <Skeleton className="h-[400px] w-full rounded-lg" />
              ) : (
                <div className="h-[400px]">
                  {/* Wait time distribution chart would go here */}
                  <p className="text-center py-8 text-muted-foreground">
                    Wait time distribution visualization will be implemented in a future update.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="distribution" className="space-y-6 mt-6">
          {/* Distribution analytics tab content */}
          <Card>
            <CardHeader>
              <CardTitle>Department Performance</CardTitle>
              <CardDescription>Wait time comparison by department</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <Skeleton className="h-[400px] w-full rounded-lg" />
              ) : (
                <div className="h-[400px]">
                  {/* Department performance chart would go here */}
                  <p className="text-center py-8 text-muted-foreground">
                    Department performance visualization will be implemented in a future update.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trends" className="space-y-6 mt-6">
          {/* Trends analytics tab content */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Trends</CardTitle>
              <CardDescription>Patient volume and wait time trends</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <Skeleton className="h-[400px] w-full rounded-lg" />
              ) : (
                <div className="h-[400px]">
                  {/* Trends chart would go here */}
                  <p className="text-center py-8 text-muted-foreground">
                    Weekly trend visualization will be implemented in a future update.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAnalytics;