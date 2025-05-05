import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Kiosk from "@/pages/kiosk";
import Staff from "@/pages/staff";
import Admin from "@/pages/admin";
import AdminDashboard from "@/pages/admin/index";
import AdminDepartments from "@/pages/admin/departments";
import AdminUsers from "@/pages/admin/users";
import AdminDoctors from "@/pages/admin/doctors";
import StaffDashboard from "@/pages/staff/index";
import StaffReports from "@/pages/staff/reports";
import StaffSettings from "@/pages/staff/settings";
import ProfilePage from "@/pages/profile";
import ProtectedRoute from "@/components/protected-route";
import ThemeToggle from "@/components/theme-toggle";
import { Roles } from "@/lib/auth";
import { useWebSocket, getWebSocketUrl } from "./lib/socket";
import { useState, useEffect } from "react";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/login" component={Login} />
      <Route path="/kiosk" component={Kiosk} />
      
      {/* Staff Routes */}
      <Route path="/staff">
        <ProtectedRoute roles={[Roles.STAFF, Roles.ADMIN]}>
          <Staff />
        </ProtectedRoute>
      </Route>
      <Route path="/staff/index">
        <ProtectedRoute roles={[Roles.STAFF, Roles.ADMIN]}>
          <StaffDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/staff/reports">
        <ProtectedRoute roles={[Roles.STAFF, Roles.ADMIN]}>
          <Staff>
            <StaffReports />
          </Staff>
        </ProtectedRoute>
      </Route>
      <Route path="/staff/settings">
        <ProtectedRoute roles={[Roles.STAFF, Roles.ADMIN]}>
          <Staff>
            <StaffSettings />
          </Staff>
        </ProtectedRoute>
      </Route>
      
      {/* Profile Page - accessible to all authenticated users */}
      <Route path="/profile">
        <ProtectedRoute roles={[Roles.ADMIN, Roles.STAFF]}>
          <ProfilePage />
        </ProtectedRoute>
      </Route>
      
      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute roles={[Roles.ADMIN]}>
          <Admin>
            <AdminDashboard />
          </Admin>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/departments">
        <ProtectedRoute roles={[Roles.ADMIN]}>
          <Admin>
            <AdminDepartments />
          </Admin>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute roles={[Roles.ADMIN]}>
          <Admin>
            <AdminUsers />
          </Admin>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/doctors">
        <ProtectedRoute roles={[Roles.ADMIN]}>
          <Admin>
            <AdminDoctors />
          </Admin>
        </ProtectedRoute>
      </Route>
      
      {/* Default Route redirects to Kiosk */}
      <Route path="/">
        <Kiosk />
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
  useEffect(() => {
    try {
      const wsConnect = () => {
        if (retryCount >= maxRetries) {
          setConnectionStatus('error');
          return;
        }
        
        setConnectionStatus('connecting');
        const socket = new WebSocket(getWebSocketUrl());
        
        socket.onopen = () => {
          setConnectionStatus('connected');
          console.log('WebSocket connected successfully');
        };
        
        socket.onclose = () => {
          console.log(`WebSocket connection closed, retry attempt ${retryCount + 1}/${maxRetries}`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            if (retryCount < maxRetries) {
              wsConnect();
            } else {
              setConnectionStatus('error');
            }
          }, 3000);
        };
        
        socket.onerror = (error) => {
          console.error('WebSocket connection error:', error);
          socket.close();
        };
        
        return () => {
          socket.close();
        };
      };
      
      wsConnect();
    } catch (error) {
      console.error('WebSocket initialization error:', error);
      setConnectionStatus('error');
    }
  }, [retryCount]);
  
  return (
    <>
      {children}
      {connectionStatus === 'connecting' && (
        <div className="fixed bottom-4 right-4 bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded shadow-md" role="alert">
          <p className="font-bold">Connecting to server...</p>
          <p>Please wait while we establish a connection.</p>
        </div>
      )}
      {connectionStatus === 'error' && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-md" role="alert">
          <p className="font-bold">WebSocket Disconnected</p>
          <p>Real-time updates are currently unavailable.</p>
          <button 
            onClick={() => setRetryCount(0)} 
            className="mt-2 px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-sm"
          >
            Retry Connection
          </button>
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WebSocketProvider>
          <Toaster />
          <ThemeToggle />
          <Router />
        </WebSocketProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
