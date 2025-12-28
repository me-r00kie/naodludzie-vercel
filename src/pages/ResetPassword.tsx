import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

const passwordSchema = z.string()
  .min(8, 'Hasło musi mieć co najmniej 8 znaków')
  .max(128, 'Hasło jest za długie')
  .regex(/[A-Z]/, 'Hasło musi zawierać wielką literę')
  .regex(/[a-z]/, 'Hasło musi zawierać małą literę')
  .regex(/[0-9]/, 'Hasło musi zawierać cyfrę');

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Try to extract access_token from URL fragment or query
  const getAccessToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash.replace(/^#/, '');
    const hashParams = new URLSearchParams(hash);
    if (hashParams.get('access_token')) return hashParams.get('access_token');
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('access_token');
  };

  const token = getAccessToken();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const passCheck = passwordSchema.safeParse(password);
      if (!passCheck.success) {
        toast({ title: 'Błąd', description: passCheck.error.errors[0].message, variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      if (password !== confirm) {
        toast({ title: 'Błąd', description: 'Hasła nie są zgodne', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      if (!supabase) throw new Error('Supabase client is not initialized');

      // Update user password. If a recovery access token is present, pass it to updateUser.
      const opts = token ? { accessToken: token } : undefined;
      const { data, error } = await supabase.auth.updateUser({ password }, opts as any);

      if (error) {
        throw new Error(error.message);
      }

      toast({ title: 'Hasło zresetowane', description: 'Możesz teraz się zalogować.' });
      navigate('/auth');
    } catch (err) {
      toast({ title: 'Błąd', description: err instanceof Error ? err.message : 'Nie udało się zresetować hasła', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // If no token is present, still allow user to set password if session exists
    // but we inform them.
    if (!token && typeof window !== 'undefined') {
      const hash = window.location.hash.replace(/^#/, '');
      const hashParams = new URLSearchParams(hash);
      // If no access_token and no session, show notice
      // No-op here; just keep the page working.
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Resetuj hasło</CardTitle>
            <CardDescription>Ustaw nowe hasło dla swojego konta.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nowe hasło</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Potwierdź hasło</Label>
                <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Zapisuję...' : 'Ustaw nowe hasło'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
