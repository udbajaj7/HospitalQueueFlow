import { Menu } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from 'wouter';
import { getRoleText } from '@/lib/utils';

interface HeaderProps {
  title: string;
  userType: 'admin' | 'staff' | 'kiosk';
}

const Header: React.FC<HeaderProps> = ({ title, userType }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout, logoutLoading } = useAuth();

  const userTypeColorMap = {
    admin: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100',
    staff: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100',
    kiosk: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100',
  };

  const userRoleName = user ? getRoleText(user.role) : '';

  return (
    <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-gray-500 dark:text-gray-400 mr-3"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <>
                <span className={`hidden sm:inline-block px-3 py-1 rounded-full text-sm whitespace-nowrap ${userTypeColorMap[userType]}`}>
                  {userRoleName} View
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none"
                    >
                      <span className="md:hidden">{user.name.charAt(0)}</span>
                      <span className="hidden md:inline-block">{user.name}</span>
                      <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                    <DropdownMenuLabel className="text-sm text-muted-foreground">
                      {userRoleName}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <a className="w-full cursor-pointer">Profile</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <a className="w-full cursor-pointer">Settings</a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => logout()}
                      disabled={logoutLoading}
                      className="text-red-600 dark:text-red-400 cursor-pointer"
                    >
                      {logoutLoading ? 'Logging out...' : 'Logout'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
