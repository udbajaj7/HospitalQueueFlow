import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { ListOrdered, BarChart, Settings, User } from 'lucide-react';

interface MobileNavProps {
  type: 'staff' | 'admin';
}

const MobileNav: React.FC<MobileNavProps> = ({ type }) => {
  const [location] = useLocation();
  const isAdminView = type === 'admin';
  const baseUrl = isAdminView ? '/admin' : '/staff';
  
  // Define navigation items based on user type
  const navItems = isAdminView
    ? [
        { href: baseUrl, icon: <BarChart className="h-5 w-5" />, label: 'Dashboard' },
        { href: `${baseUrl}/departments`, icon: <Settings className="h-5 w-5" />, label: 'Departments' },
        { href: `${baseUrl}/users`, icon: <User className="h-5 w-5" />, label: 'Users' },
        { href: `${baseUrl}/settings`, icon: <Settings className="h-5 w-5" />, label: 'Settings' },
      ]
    : [
        { href: baseUrl, icon: <ListOrdered className="h-5 w-5" />, label: 'Queue' },
        { href: `${baseUrl}/reports`, icon: <BarChart className="h-5 w-5" />, label: 'Reports' },
        { href: `${baseUrl}/settings`, icon: <Settings className="h-5 w-5" />, label: 'Settings' },
        { href: `${baseUrl}/profile`, icon: <User className="h-5 w-5" />, label: 'Profile' },
      ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 z-10">
      <div className="flex justify-around">
        {navItems.map((item) => (
          <div key={item.href}>
            <Link href={item.href}>
              <div className={cn(
                "flex flex-col items-center p-3 cursor-pointer",
                location === item.href
                  ? "text-teal-600 dark:text-teal-500"
                  : "text-gray-500 dark:text-gray-400"
              )}>
                {item.icon}
                <span className="text-xs mt-1">{item.label}</span>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileNav;
