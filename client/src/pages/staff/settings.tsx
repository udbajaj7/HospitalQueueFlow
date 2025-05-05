import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Bell, Volume2, Vibrate, MessageSquare } from 'lucide-react';

const StaffSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('notifications');
  
  // Settings state
  const [notificationSettings, setNotificationSettings] = useState({
    enableSoundAlerts: true,
    enableDesktopNotifications: true,
    enableVibration: true, 
    enableSmsNotifications: false,
  });
  
  const [displaySettings, setDisplaySettings] = useState({
    defaultDepartment: user?.departmentCode || 'all',
    refreshInterval: '30',
    theme: 'system',
  });
  
  // Save notification settings mutation
  const saveNotificationSettingsMutation = useMutation({
    mutationFn: async (settings: typeof notificationSettings) => {
      return await apiRequest('PUT', `/api/users/${user?.id}/settings/notifications`, settings);
    },
    onSuccess: () => {
      toast({
        title: 'Settings Saved',
        description: 'Your notification settings have been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: 'Failed to save notification settings.',
        variant: 'destructive',
      });
    },
  });
  
  // Save display settings mutation
  const saveDisplaySettingsMutation = useMutation({
    mutationFn: async (settings: typeof displaySettings) => {
      return await apiRequest('PUT', `/api/users/${user?.id}/settings/display`, settings);
    },
    onSuccess: () => {
      toast({
        title: 'Settings Saved',
        description: 'Your display settings have been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: 'Failed to save display settings.',
        variant: 'destructive',
      });
    },
  });
  
  // Save notification settings
  const handleSaveNotificationSettings = () => {
    saveNotificationSettingsMutation.mutate(notificationSettings);
  };
  
  // Save display settings
  const handleSaveDisplaySettings = () => {
    saveDisplaySettingsMutation.mutate(displaySettings);
  };
  
  // Fetch departments for dropdown
  const { data: departments = [] } = useQuery<Array<{code: string, name: string}>>({
    queryKey: ['/api/departments'],
  });
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Staff Settings</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your application preferences and notification settings</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="display">Display</TabsTrigger>
        </TabsList>
        
        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure how you want to be notified about queue updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Volume2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <div>
                      <Label htmlFor="sound-alerts">Sound Alerts</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Play a sound when a new patient is added to queue</p>
                    </div>
                  </div>
                  <Switch 
                    id="sound-alerts"
                    checked={notificationSettings.enableSoundAlerts}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, enableSoundAlerts: checked }))}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <div>
                      <Label htmlFor="desktop-notifications">Desktop Notifications</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Show desktop notifications for important events</p>
                    </div>
                  </div>
                  <Switch 
                    id="desktop-notifications"
                    checked={notificationSettings.enableDesktopNotifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, enableDesktopNotifications: checked }))}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Vibrate className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <div>
                      <Label htmlFor="vibration">Vibration</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Vibrate on mobile devices when tokens are called</p>
                    </div>
                  </div>
                  <Switch 
                    id="vibration"
                    checked={notificationSettings.enableVibration}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, enableVibration: checked }))}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <div>
                      <Label htmlFor="sms-notifications">SMS Notifications</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Receive SMS alerts for critical queue updates</p>
                    </div>
                  </div>
                  <Switch 
                    id="sms-notifications"
                    checked={notificationSettings.enableSmsNotifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, enableSmsNotifications: checked }))}
                  />
                </div>
                
                <div className="pt-4">
                  <Button onClick={handleSaveNotificationSettings} disabled={saveNotificationSettingsMutation.isPending}>
                    {saveNotificationSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="display" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Display Settings</CardTitle>
              <CardDescription>Customize how the application looks and behaves</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="default-department">Default Department</Label>
                  <Select 
                    value={displaySettings.defaultDepartment} 
                    onValueChange={(value) => setDisplaySettings(prev => ({ ...prev, defaultDepartment: value }))}
                  >
                    <SelectTrigger id="default-department">
                      <SelectValue placeholder="Select a default department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.code} value={dept.code}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    This will be the default department view when you log in
                  </p>
                </div>
                
                <Separator />
                
                <div className="grid gap-2">
                  <Label htmlFor="refresh-interval">Auto-Refresh Interval</Label>
                  <Select 
                    value={displaySettings.refreshInterval} 
                    onValueChange={(value) => setDisplaySettings(prev => ({ ...prev, refreshInterval: value }))}
                  >
                    <SelectTrigger id="refresh-interval">
                      <SelectValue placeholder="Select refresh interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">1 minute</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    How often the queue data should refresh automatically
                  </p>
                </div>
                
                <Separator />
                
                <div className="grid gap-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select 
                    value={displaySettings.theme} 
                    onValueChange={(value) => setDisplaySettings(prev => ({ ...prev, theme: value }))}
                  >
                    <SelectTrigger id="theme">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System Default</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Choose the application theme that works best for you
                  </p>
                </div>
                
                <div className="pt-4">
                  <Button onClick={handleSaveDisplaySettings} disabled={saveDisplaySettingsMutation.isPending}>
                    {saveDisplaySettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffSettings;