import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, Save } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const AdminSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('system');
  
  // System settings
  const [systemSettings, setSystemSettings] = useState({
    enableQueueOptimization: true,
    allowWalkIns: true,
    maxWaitTimeAlert: '45',
    smsNotifications: true,
    allowPatientSelfCheckIn: false,
    publicDisplayMode: 'standard',
  });
  
  // Integration settings
  const [integrationSettings, setIntegrationSettings] = useState({
    enableTwilioIntegration: true,
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
    enableEmailNotifications: false,
    smtpServer: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
  });
  
  // Save system settings mutation
  const saveSystemSettingsMutation = useMutation({
    mutationFn: async (settings: typeof systemSettings) => {
      return await apiRequest('PUT', '/api/settings/system', settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/system'] });
      toast({
        title: 'Settings Saved',
        description: 'System settings have been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to save settings: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Save integration settings mutation
  const saveIntegrationSettingsMutation = useMutation({
    mutationFn: async (settings: typeof integrationSettings) => {
      return await apiRequest('PUT', '/api/settings/integrations', settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/integrations'] });
      toast({
        title: 'Settings Saved',
        description: 'Integration settings have been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to save settings: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Handle saving system settings
  const handleSaveSystemSettings = () => {
    saveSystemSettingsMutation.mutate(systemSettings);
  };
  
  // Handle saving integration settings
  const handleSaveIntegrationSettings = () => {
    saveIntegrationSettingsMutation.mutate(integrationSettings);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">System Settings</h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>
        
        <TabsContent value="system" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Queue Settings</CardTitle>
              <CardDescription>Configure how the queue system behaves</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="enableQueueOptimization">Enable Queue Optimization</Label>
                    <Switch 
                      id="enableQueueOptimization"
                      checked={systemSettings.enableQueueOptimization}
                      onCheckedChange={(checked) => setSystemSettings({...systemSettings, enableQueueOptimization: checked})}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Automatically optimizes queue order based on priority and wait time
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="allowWalkIns">Allow Walk-ins</Label>
                    <Switch 
                      id="allowWalkIns"
                      checked={systemSettings.allowWalkIns}
                      onCheckedChange={(checked) => setSystemSettings({...systemSettings, allowWalkIns: checked})}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Permit staff to create tokens for walk-in patients
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxWaitTimeAlert">Maximum Wait Time Alert (minutes)</Label>
                  <Input 
                    id="maxWaitTimeAlert"
                    type="number" 
                    value={systemSettings.maxWaitTimeAlert}
                    onChange={(e) => setSystemSettings({...systemSettings, maxWaitTimeAlert: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="publicDisplayMode">Public Display Mode</Label>
                  <Select 
                    value={systemSettings.publicDisplayMode}
                    onValueChange={(value) => setSystemSettings({...systemSettings, publicDisplayMode: value})}
                  >
                    <SelectTrigger id="publicDisplayMode">
                      <SelectValue placeholder="Select display mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard (Token Number Only)</SelectItem>
                      <SelectItem value="enhanced">Enhanced (Token + Patient Name)</SelectItem>
                      <SelectItem value="detailed">Detailed (All Information)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                <div className="space-y-2">
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="smsNotifications">SMS Notifications</Label>
                    <Switch 
                      id="smsNotifications"
                      checked={systemSettings.smsNotifications}
                      onCheckedChange={(checked) => setSystemSettings({...systemSettings, smsNotifications: checked})}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Send SMS notifications to patients about token status
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="allowPatientSelfCheckIn">Patient Self Check-in</Label>
                    <Switch 
                      id="allowPatientSelfCheckIn"
                      checked={systemSettings.allowPatientSelfCheckIn}
                      onCheckedChange={(checked) => setSystemSettings({...systemSettings, allowPatientSelfCheckIn: checked})}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Allow patients to self check-in using kiosk mode
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSaveSystemSettings} 
                disabled={saveSystemSettingsMutation.isPending}
              >
                {saveSystemSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="integrations" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Twilio Integration</CardTitle>
              <CardDescription>Configure SMS notification settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="enableTwilioIntegration">Enable Twilio Integration</Label>
                  <Switch 
                    id="enableTwilioIntegration"
                    checked={integrationSettings.enableTwilioIntegration}
                    onCheckedChange={(checked) => setIntegrationSettings({...integrationSettings, enableTwilioIntegration: checked})}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Enable SMS notifications via Twilio
                </p>
              </div>
              
              {integrationSettings.enableTwilioIntegration && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="twilioAccountSid">Twilio Account SID</Label>
                      <Input 
                        id="twilioAccountSid"
                        placeholder="ACxxxxxxxxxxxx" 
                        value={integrationSettings.twilioAccountSid}
                        onChange={(e) => setIntegrationSettings({...integrationSettings, twilioAccountSid: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="twilioAuthToken">Twilio Auth Token</Label>
                      <Input 
                        id="twilioAuthToken"
                        type="password"
                        placeholder="xxxxxxxx" 
                        value={integrationSettings.twilioAuthToken}
                        onChange={(e) => setIntegrationSettings({...integrationSettings, twilioAuthToken: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="twilioPhoneNumber">Twilio Phone Number</Label>
                      <Input 
                        id="twilioPhoneNumber"
                        placeholder="+1234567890" 
                        value={integrationSettings.twilioPhoneNumber}
                        onChange={(e) => setIntegrationSettings({...integrationSettings, twilioPhoneNumber: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Note</AlertTitle>
                    <AlertDescription>
                      You need a Twilio account to use SMS notifications. Sign up at <a href="https://www.twilio.com" target="_blank" rel="noreferrer" className="underline">twilio.com</a>
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </CardContent>
            
            <CardHeader className="pt-6 pb-2 border-t">
              <CardTitle>Email Integration</CardTitle>
              <CardDescription>Configure email notification settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="enableEmailNotifications">Enable Email Notifications</Label>
                  <Switch 
                    id="enableEmailNotifications"
                    checked={integrationSettings.enableEmailNotifications}
                    onCheckedChange={(checked) => setIntegrationSettings({...integrationSettings, enableEmailNotifications: checked})}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Send email notifications to patients about token status
                </p>
              </div>
              
              {integrationSettings.enableEmailNotifications && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="smtpServer">SMTP Server</Label>
                    <Input 
                      id="smtpServer"
                      placeholder="smtp.example.com" 
                      value={integrationSettings.smtpServer}
                      onChange={(e) => setIntegrationSettings({...integrationSettings, smtpServer: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input 
                      id="smtpPort"
                      placeholder="587" 
                      value={integrationSettings.smtpPort}
                      onChange={(e) => setIntegrationSettings({...integrationSettings, smtpPort: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="smtpUser">SMTP Username</Label>
                    <Input 
                      id="smtpUser"
                      placeholder="user@example.com" 
                      value={integrationSettings.smtpUser}
                      onChange={(e) => setIntegrationSettings({...integrationSettings, smtpUser: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">SMTP Password</Label>
                    <Input 
                      id="smtpPassword"
                      type="password"
                      placeholder="password" 
                      value={integrationSettings.smtpPassword}
                      onChange={(e) => setIntegrationSettings({...integrationSettings, smtpPassword: e.target.value})}
                    />
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSaveIntegrationSettings} 
                disabled={saveIntegrationSettingsMutation.isPending}
              >
                {saveIntegrationSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="database" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Management</CardTitle>
              <CardDescription>Database operations and maintenance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  These operations are destructive and should be used with caution.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4 pt-4">
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-medium">Clear Old Records</h3>
                  <p className="text-sm text-muted-foreground">Remove token records older than the selected period</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Select defaultValue="90">
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select time period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="180">6 months</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" disabled>
                      Clear Records
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 pt-4 border-t">
                  <h3 className="text-lg font-medium">Reset Queue Numbers</h3>
                  <p className="text-sm text-muted-foreground">Reset token numbering sequence for all departments</p>
                  <Button variant="outline" className="w-auto mt-2" disabled>
                    Reset Queue Numbers
                  </Button>
                </div>
                
                <div className="flex flex-col gap-2 pt-4 border-t">
                  <h3 className="text-lg font-medium">Database Backup</h3>
                  <p className="text-sm text-muted-foreground">Export a backup of the database</p>
                  <Button variant="outline" className="w-auto mt-2" disabled>
                    Export Database
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Note: Database management features are currently under development and will be available in a future update.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;