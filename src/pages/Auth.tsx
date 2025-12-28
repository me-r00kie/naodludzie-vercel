import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { Trees, ArrowLeft, User, Home, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { z } from 'zod';

const passwordSchema = z.string()
  .min(8, 'Hasło musi mieć co najmniej 8 znaków')
  .max(128, 'Hasło jest za długie')
  .regex(/[A-Z]/, 'Hasło musi zawierać wielką literę')
  .regex(/[a-z]/, 'Hasło musi zawierać małą literę')
  .regex(/[0-9]/, 'Hasło musi zawierać cyfrę');

const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string().min(1, 'Hasło jest wymagane'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Imię musi mieć co najmniej 2 znaki'),
  email: z.string().email('Nieprawidłowy adres email'),
  password: passwordSchema,
  phone: z.string().optional(),
  role: z.enum(['guest', 'host']),
});

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  
  const [isRegister, setIsRegister] = useState(searchParams.get('register') === 'true');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'guest' as 'guest' | 'host',
  });

  // Get redirect URL from query params
  const redirectTo = searchParams.get('redirectTo') || '/';

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(redirectTo);
    }
  }, [user, navigate, redirectTo]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      if (isRegister) {
        const result = registerSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach(err => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        await register(formData.email, formData.password, formData.role, formData.name, formData.phone || undefined);
        toast({
          title: 'Konto utworzone!',
          description: 'Zostałeś pomyślnie zarejestrowany.',
        });
        navigate(redirectTo);
        return;
      } else {
        const result = loginSchema.safeParse({ email: formData.email, password: formData.password });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach(err => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        await login(formData.email, formData.password);
        toast({
          title: 'Zalogowano!',
          description: 'Witaj z powrotem.',
        });
        navigate(redirectTo);
        return;
      }
      
      navigate('/');
    } catch (error) {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Wystąpił nieoczekiwany błąd',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 py-4">
        <div className="container flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
              <Trees className="w-6 h-6" />
            </div>
            <span className="font-display text-xl font-semibold">NaOdludzie</span>
          </Link>
          <Link to="/">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Wróć
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card className="shadow-card">
            <CardHeader className="text-center">
              <CardTitle className="font-display text-2xl">
                {isRegister ? 'Utwórz konto' : 'Zaloguj się'}
              </CardTitle>
              <CardDescription>
                {isRegister
                  ? 'Dołącz do społeczności NaOdludzie'
                  : 'Witaj z powrotem! Zaloguj się na swoje konto.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegister && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Imię</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Jan Kowalski"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={errors.name ? 'border-destructive' : ''}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="jan@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Hasło</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={errors.password ? 'border-destructive' : ''}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>

                {isRegister && (
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Telefon (opcjonalnie)
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+48 123 456 789"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </div>
                )}

                {isRegister && (
                  <div className="space-y-3">
                    <Label>Wybierz typ konta</Label>
                    <RadioGroup
                      value={formData.role}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as 'guest' | 'host' }))}
                      className="grid grid-cols-2 gap-4"
                    >
                      <Label
                        htmlFor="guest"
                        className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          formData.role === 'guest'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <RadioGroupItem value="guest" id="guest" className="sr-only" />
                        <User className="w-8 h-8 mb-2 text-muted-foreground" />
                        <span className="font-medium">Gość</span>
                        <span className="text-xs text-muted-foreground text-center mt-1">
                          Chcę rezerwować domki
                        </span>
                      </Label>
                      <Label
                        htmlFor="host"
                        className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          formData.role === 'host'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <RadioGroupItem value="host" id="host" className="sr-only" />
                        <Home className="w-8 h-8 mb-2 text-muted-foreground" />
                        <span className="font-medium">Host</span>
                        <span className="text-xs text-muted-foreground text-center mt-1">
                          Chcę wynajmować domki
                        </span>
                      </Label>
                    </RadioGroup>
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading
                    ? (isRegister ? 'Tworzę konto...' : 'Loguję...')
                    : (isRegister ? 'Utwórz konto' : 'Zaloguj się')}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {isRegister ? 'Masz już konto?' : 'Nie masz konta?'}{' '}
                  <button
                    type="button"
                    onClick={() => setIsRegister(!isRegister)}
                    className="text-primary font-medium hover:underline"
                  >
                    {isRegister ? 'Zaloguj się' : 'Zarejestruj się'}
                  </button>
                </p>
              </div>

            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default AuthPage;
