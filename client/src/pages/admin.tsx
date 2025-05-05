import { ReactNode } from 'react';
import Sidebar from '@/components/sidebar';
import MobileNav from '@/components/mobile-nav';
import Header from '@/components/header';

interface AdminProps {
  children?: ReactNode;
}

const Admin = ({ children }: AdminProps) => {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <Sidebar type="admin" />

      {/* Mobile navigation */}
      <MobileNav type="admin" />

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <Header title="Admin Dashboard" userType="admin" />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 pb-16 md:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Admin;
