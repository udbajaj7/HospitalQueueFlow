
import { useState } from "react";
import { format, sub } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useDepartments } from "@/hooks/use-departments";
import { useTokenHistory } from "@/hooks/use-token-history";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent,
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, Download, Search } from "lucide-react";
import { formatWaitTime, getStatusText, getPriorityText } from "@/lib/utils";

export default function ReportsPage() {
  const { user } = useAuth();
  const { data: departments, isLoading: isLoadingDepartments } = useDepartments();
  
  // Default to last 7 days
  const [startDate, setStartDate] = useState<Date | undefined>(sub(new Date(), { days: 7 }));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [departmentCode, setDepartmentCode] = useState<string>(
    user?.departmentCode || 'all'
  );
  
  // Get token history based on selected filters
  const { 
    data: tokenHistory, 
    isLoading: isLoadingHistory,
    refetch
  } = useTokenHistory(startDate, endDate, departmentCode);
  
  // Export data as CSV
  const exportCSV = () => {
    if (!tokenHistory || tokenHistory.length === 0) return;
    
    // Column headers
    const headers = [
      "Token Number",
      "Department",
      "Patient Name",
      "Mobile",
      "Priority",
      "Status",
      "Issued At",
      "Called At",
      "Served At",
      "Wait Time (min)",
      "Doctor"
    ];
    
    // Map rows to CSV format
    const rows = tokenHistory.map(token => [
      token.tokenNumber,
      token.department,
      token.patientName || "Walk-in",
      token.patientMobile || "-",
      getPriorityText(token.priority),
      getStatusText(token.status),
      formatDateTime(token.issuedAt),
      token.calledAt ? formatDateTime(token.calledAt) : "-",
      token.servedAt ? formatDateTime(token.servedAt) : "-",
      token.waitTime.toString(),
      token.doctorName || "-"
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    
    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `token-history-${format(new Date(), "yyyy-MM-dd")}.csv`);
    a.click();
  };
  
  // Helper to format date and time for display
  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "dd/MM/yyyy hh:mm a");
    } catch (e) {
      return dateStr;
    }
  };
  
  // Calculate summary stats
  const totalTokens = tokenHistory?.length || 0;
  const servedTokens = tokenHistory?.filter(t => t.status === "SERVED").length || 0;
  const noShowTokens = tokenHistory?.filter(t => t.status === "NO_SHOW").length || 0;
  const avgWaitTime = tokenHistory?.reduce((sum, t) => sum + t.waitTime, 0) || 0;
  const avgWaitDisplay = totalTokens > 0 ? Math.round(avgWaitTime / totalTokens) : 0;
  
  return (
    <div className="space-y-6">
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Report Filters</CardTitle>
            <CardDescription>Select date range and department to filter results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Department</label>
                {isLoadingDepartments ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select 
                    value={departmentCode} 
                    onValueChange={setDepartmentCode}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments?.map((dept: { code: string; name: string }) => (
                        <SelectItem key={dept.code} value={dept.code}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              
              <div className="flex-none self-end md:self-end pt-4 md:pt-0">
                <Button onClick={() => refetch()} className="w-full md:w-auto">
                  <Search className="mr-2 h-4 w-4" />
                  Generate Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Summary Cards */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Total Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalTokens}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Served</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{servedTokens}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">No Shows</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{noShowTokens}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Avg Wait Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatWaitTime(avgWaitDisplay)}</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Token History</CardTitle>
            <Button 
              onClick={exportCSV} 
              disabled={!tokenHistory || tokenHistory.length === 0}
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
          <CardDescription>
            Historical record of all tokens for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Token</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issued At</TableHead>
                    <TableHead>Called At</TableHead>
                    <TableHead>Served At</TableHead>
                    <TableHead>Wait Time</TableHead>
                    <TableHead>Doctor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokenHistory && tokenHistory.length > 0 ? (
                    tokenHistory.map((token) => (
                      <TableRow key={token.id}>
                        <TableCell className="font-medium">{token.tokenNumber}</TableCell>
                        <TableCell>{token.department}</TableCell>
                        <TableCell>{token.patientName || "Walk-in"}</TableCell>
                        <TableCell>{getPriorityText(token.priority)}</TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${token.status === "SERVED" ? "bg-green-100 text-green-800" : 
                              token.status === "CALLED" ? "bg-blue-100 text-blue-800" : 
                              token.status === "NO_SHOW" ? "bg-red-100 text-red-800" : 
                              "bg-yellow-100 text-yellow-800"}`}
                          >
                            {getStatusText(token.status)}
                          </div>
                        </TableCell>
                        <TableCell>{formatDateTime(token.issuedAt)}</TableCell>
                        <TableCell>{token.calledAt ? formatDateTime(token.calledAt) : "-"}</TableCell>
                        <TableCell>{token.servedAt ? formatDateTime(token.servedAt) : "-"}</TableCell>
                        <TableCell>{formatWaitTime(token.waitTime)}</TableCell>
                        <TableCell>{token.doctorName || "-"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No token history found for the selected period.
                        <br />
                        Try changing your filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          {tokenHistory?.length ? `Showing ${tokenHistory.length} token records` : "No data available"}
        </CardFooter>
      </Card>
    </div>
  );
}
