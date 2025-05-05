import { Link, useLocation } from 'wouter';
import Sidebar from '@/components/sidebar';
import MobileNav from '@/components/mobile-nav';
import Header from '@/components/header';
import StaffDashboard from '@/pages/staff/index';

interface StaffProps {
  children?: React.ReactNode;
}

const Staff = ({ children }: StaffProps) => {
  const [location] = useLocation();
  const path = location.split('/')[2]; // Get the second part of the path

  // Determine title based on the current path
  const getTitle = () => {
    switch (path) {
      case 'reports':
        return 'Reports Dashboard';
      case 'settings':
        return 'Staff Settings';
      default:
        return 'Queue Management';
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <Sidebar type="staff" />

      {/* Mobile navigation */}
      <MobileNav type="staff" />

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <Header title={getTitle()} userType="staff" />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 pb-16 md:pb-8">
          {children || <StaffDashboard />}
        </main>
      </div>
    </div>
  );
};

export default Staff;
