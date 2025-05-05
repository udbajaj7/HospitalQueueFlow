import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { HospitalIcon, ListOrdered, BarChart, Settings, Stethoscope } from 'lucide-react';

interface SidebarProps {
  type: 'staff' | 'admin';
}

const Sidebar: React.FC<SidebarProps> = ({ type }) => {
  const [location] = useLocation();
  const { user, logout, logoutLoading } = useAuth();
  
  const isAdminView = type === 'admin';
  const baseUrl = isAdminView ? '/admin' : '/staff';
  
  // Define navigation items based on user type
  const navItems = isAdminView
    ? [
        { href: baseUrl, icon: <BarChart className="w-5" />, label: 'Dashboard' },
        { href: `${baseUrl}/departments`, icon: <HospitalIcon className="w-5" />, label: 'Departments' },
        { href: `${baseUrl}/doctors`, icon: <Stethoscope className="w-5" />, label: 'Doctors' },
        { href: `${baseUrl}/users`, icon: <User className="w-5" />, label: 'User Management' },
        { href: `${baseUrl}/analytics`, icon: <BarChart className="w-5" />, label: 'Analytics' },
        { href: `${baseUrl}/history`, icon: <ListOrdered className="w-5" />, label: 'History' },
        { href: `${baseUrl}/settings`, icon: <Settings className="w-5" />, label: 'Settings' },
      ]
    : [
        { href: baseUrl, icon: <ListOrdered className="w-5" />, label: 'Queue Management' },
        { href: `${baseUrl}/reports`, icon: <BarChart className="w-5" />, label: 'Reports' },
        { href: `${baseUrl}/settings`, icon: <Settings className="w-5" />, label: 'Settings' },
      ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-800 text-white h-screen">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center">
          <div className="bg-teal-600 p-2 rounded-md">
            <HospitalIcon className="h-5 w-5" />
          </div>
          <h1 className="ml-3 text-lg font-bold">RGCIRC</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {isAdminView ? 'Admin Console' : 'Queue Management System'}
        </p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <div key={item.href}>
            <Link href={item.href}>
              <div
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-md cursor-pointer",
                  location === item.href
                    ? "bg-slate-700 text-white"
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </div>
            </Link>
          </div>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-700">
        <Link href="/profile">
          <div className="flex items-center hover:bg-slate-700 p-2 rounded-md cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-teal-700 flex items-center justify-center">
              <span className="text-white text-sm">
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-400">{user?.role || 'Role'}</p>
            </div>
          </div>
        </Link>
        <Button
          variant="ghost"
          className="mt-4 w-full flex items-center justify-center space-x-2 text-sm text-slate-300 hover:text-white"
          onClick={() => logout()}
          disabled={logoutLoading}
        >
          <LogOut className="h-4 w-4" />
          <span>{logoutLoading ? 'Logging out...' : 'Logout'}</span>
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
