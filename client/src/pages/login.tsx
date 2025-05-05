import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { loginSchema, type LoginCredentials } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Hospital } from 'lucide-react';

const Login = () => {
  const { login, loginLoading } = useAuth();
  const [location] = useLocation();
  const [error, setError] = useState<string | null>(null);

  // Get return URL from query params
  const searchParams = new URLSearchParams(location.split('?')[1]);
  const returnUrl = searchParams.get('returnUrl') || '/';

  // Form setup
  const form = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // Form submission
  const onSubmit = async (data: LoginCredentials) => {
    setError(null);
    console.log('Login submitted with data:', data);
    try {
      // Call our login mutation function from useAuth
      await login(data);
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please check your credentials and try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center">
            <div className="bg-teal-700 text-white p-2 rounded-md">
              <Hospital className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">RGCIRC Queue Management</CardTitle>
          <CardDescription>Sign in to access the system</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full bg-teal-700 hover:bg-teal-800" disabled={loginLoading}>
                {loginLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            <Link href="/kiosk" className="text-teal-700 dark:text-teal-500 hover:underline">
              Continue to Kiosk Mode
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
