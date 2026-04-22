import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/lib/language-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogIn, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { User } from '@shared/schema';

export default function Login() {
  const [, setLocation] = useLocation();
  const { user, loginMutation } = useAuth();
  const { t, language } = useLanguage();
  const [selectedEmail, setSelectedEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Fetch all active users for selection (public endpoint)
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/v2/auth/users-list'],
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      setLocation('/');
    }
  }, [user, setLocation]);

  if (user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmail || !password) {
      return;
    }

    loginMutation.mutate({
      email: selectedEmail,
      password,
      rememberMe,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">AZ</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold" data-testid="text-login-title">
            {language === "ar" ? "تسجيل الدخول" : "Login"}
          </CardTitle>
          <CardDescription data-testid="text-login-subtitle">
            {language === "ar" ? "مركز أ.ز المالي - رؤية 2040" : "A.Z Finance Hub - Vision 2040"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-select" data-testid="label-user">
                {language === "ar" ? "اختر المستخدم" : "Select User"}
              </Label>
              {usersLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" data-testid="loader-users" />
                </div>
              ) : (
                <Select
                  value={selectedEmail}
                  onValueChange={setSelectedEmail}
                >
                  <SelectTrigger id="user-select" data-testid="select-user">
                    <SelectValue 
                      placeholder={language === "ar" ? "اختر حسابك" : "Choose your account"} 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.filter(u => u.isActive).map((u) => (
                      <SelectItem 
                        key={u.id} 
                        value={u.email}
                        data-testid={`option-user-${u.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{u.name}</div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" data-testid="label-password">
                {language === "ar" ? "كلمة المرور" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={language === "ar" ? "أدخل كلمة المرور" : "Enter password"}
                disabled={loginMutation.isPending}
                autoComplete="current-password"
                data-testid="input-password"
              />
            </div>

            <div className="flex items-center space-x-2" dir="ltr">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                data-testid="checkbox-remember"
              />
              <Label 
                htmlFor="remember" 
                className="text-sm cursor-pointer"
              >
                {language === "ar" ? "تذكرني (30 يوم)" : "Remember me (30 days)"}
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={!selectedEmail || !password || loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
                  {language === "ar" ? "جاري تسجيل الدخول..." : "Logging in..."}
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                  {language === "ar" ? "تسجيل الدخول" : "Login"}
                </>
              )}
            </Button>
          </form>

          {loginMutation.isError && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm text-center">
              {loginMutation.error?.message || (language === "ar" ? "فشل تسجيل الدخول" : "Login failed")}
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
