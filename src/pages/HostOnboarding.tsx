import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { 
  Trees, 
  ArrowLeft, 
  ArrowRight,
  Building2,
  FileText,
  CreditCard,
  CheckCircle,
  User,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProfileData {
  business_name: string;
  nip: string;
  address: string;
  city: string;
  postal_code: string;
  terms_accepted_at: string | null;
}

const STEPS = [
  { id: 1, title: 'Dane firmowe', icon: Building2, description: 'Opcjonalne dane do faktur' },
  { id: 2, title: 'Regulamin', icon: FileText, description: 'Akceptacja warunków' },
  { id: 3, title: 'Podsumowanie', icon: CheckCircle, description: 'Gotowe!' },
];

const HostOnboarding = () => {
  const navigate = useNavigate();
  const { user, isHost, isLoading: authLoading } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    business_name: '',
    nip: '',
    address: '',
    city: '',
    postal_code: '',
    terms_accepted_at: null,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?register=true');
      return;
    }
    if (!authLoading && user && !isHost) {
      navigate('/');
      return;
    }
    if (user) {
      fetchProfileData();
    }
  }, [user, isHost, authLoading, navigate]);

  const fetchProfileData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('business_name, nip, address, city, postal_code, terms_accepted_at')
        .eq('id', user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfileData({
          business_name: data.business_name || '',
          nip: data.nip || '',
          address: data.address || '',
          city: data.city || '',
          postal_code: data.postal_code || '',
          terms_accepted_at: data.terms_accepted_at,
        });
        
        // If terms already accepted, check this
        if (data.terms_accepted_at) {
          setTermsAccepted(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const saveProfileData = async () => {
    setIsSaving(true);
    try {
      const updates: any = {
        business_name: profileData.business_name || null,
        nip: profileData.nip || null,
        address: profileData.address || null,
        city: profileData.city || null,
        postal_code: profileData.postal_code || null,
      };

      if (termsAccepted && !profileData.terms_accepted_at) {
        updates.terms_accepted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user!.id);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać danych.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      // Save business data
      const success = await saveProfileData();
      if (success) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      if (!termsAccepted) {
        toast({
          title: 'Akceptacja regulaminu',
          description: 'Musisz zaakceptować regulamin, aby kontynuować.',
          variant: 'destructive',
        });
        return;
      }
      const success = await saveProfileData();
      if (success) {
        setCurrentStep(3);
      }
    } else if (currentStep === 3) {
      navigate('/host/dashboard');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
          <Link to="/host/dashboard">
            <Button variant="ghost">
              Pomiń na razie
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b border-border/50 py-6">
        <div className="container">
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                        isActive && 'bg-primary text-primary-foreground',
                        isCompleted && 'bg-green-500 text-white',
                        !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={cn(
                      'text-xs mt-2 text-center hidden sm:block',
                      isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                    )}>
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={cn(
                        'w-8 sm:w-16 h-0.5 mx-2',
                        currentStep > step.id ? 'bg-green-500' : 'bg-muted'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-8 px-4">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="shadow-card">
                  <CardHeader className="text-center">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="font-display text-2xl">Dane firmowe</CardTitle>
                    <CardDescription>
                      Opcjonalne dane do faktur i dokumentów. Możesz je uzupełnić później.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="business_name">Nazwa firmy / Imię i nazwisko</Label>
                      <Input
                        id="business_name"
                        name="business_name"
                        placeholder="np. Jan Kowalski lub Firma XYZ sp. z o.o."
                        value={profileData.business_name}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nip">NIP (opcjonalnie)</Label>
                      <Input
                        id="nip"
                        name="nip"
                        placeholder="np. 1234567890"
                        value={profileData.nip}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Adres</Label>
                      <Input
                        id="address"
                        name="address"
                        placeholder="np. ul. Leśna 15"
                        value={profileData.address}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="postal_code">Kod pocztowy</Label>
                        <Input
                          id="postal_code"
                          name="postal_code"
                          placeholder="np. 00-001"
                          value={profileData.postal_code}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">Miasto</Label>
                        <Input
                          id="city"
                          name="city"
                          placeholder="np. Warszawa"
                          value={profileData.city}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="shadow-card">
                  <CardHeader className="text-center">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="font-display text-2xl">Regulamin serwisu</CardTitle>
                    <CardDescription>
                      Przeczytaj i zaakceptuj regulamin, aby korzystać z serwisu NaOdludzie.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="rounded-lg border border-border bg-muted/30 p-4 max-h-64 overflow-y-auto text-sm space-y-3">
                      <h4 className="font-semibold">Regulamin dla Hostów - NaOdludzie</h4>
                      
                      <p><strong>§1. Postanowienia ogólne</strong></p>
                      <p>1. Niniejszy regulamin określa zasady korzystania z serwisu NaOdludzie przez osoby oferujące wynajem nieruchomości (Hosty).</p>
                      <p>2. Serwis jest prowadzony przez K1 GROUP sp. z o.o. z siedzibą w Środzie Śląskiej.</p>
                      
                      <p><strong>§2. Wymagania dla Hostów</strong></p>
                      <p>1. Host zobowiązuje się do rzetelnego opisywania oferowanych nieruchomości.</p>
                      <p>2. Zdjęcia muszą być aktualne i przedstawiać rzeczywisty stan obiektu.</p>
                      <p>3. Host odpowiada za aktualność kalendarza dostępności.</p>
                      
                      <p><strong>§3. Płatności online</strong></p>
                      <p>1. Host może włączyć płatności online po weryfikacji.</p>
                      <p>2. Prowizja od rezerwacji online wynosi 5% wartości rezerwacji.</p>
                      <p>3. Rozliczenia następują po zakończeniu pobytu gościa.</p>
                      
                      <p><strong>§4. Odpowiedzialność</strong></p>
                      <p>1. Host ponosi pełną odpowiedzialność za stan i bezpieczeństwo obiektu.</p>
                      <p>2. Serwis NaOdludzie pośredniczy wyłącznie w kontakcie między Hostem a Gościem.</p>
                      
                      <p><strong>§5. Anulowanie rezerwacji</strong></p>
                      <p>1. Polityka anulowania jest ustalana indywidualnie przez Hosta.</p>
                      <p>2. Host zobowiązuje się respektować ustaloną politykę anulowania.</p>
                    </div>

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="terms"
                        checked={termsAccepted}
                        onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                      />
                      <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                        Przeczytałem/am i akceptuję{' '}
                        <Link to="/regulamin" target="_blank" className="text-primary hover:underline">
                          regulamin serwisu
                        </Link>{' '}
                        oraz{' '}
                        <Link to="/polityka-prywatnosci" target="_blank" className="text-primary hover:underline">
                          politykę prywatności
                        </Link>.
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="shadow-card">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <CardTitle className="font-display text-2xl">Wszystko gotowe!</CardTitle>
                    <CardDescription>
                      Twoje konto hosta zostało skonfigurowane. Możesz teraz dodawać oferty.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                      <h4 className="font-semibold">Co dalej?</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Dodaj swoją pierwszą ofertę domku
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Połącz kalendarz zewnętrzny (opcjonalnie)
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Włącz płatności online (Stripe lub przelew weryfikacyjny)
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Zarządzaj rezerwacjami z panelu hosta
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Wstecz
            </Button>
            <Button onClick={handleNext} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Zapisywanie...
                </>
              ) : currentStep === 3 ? (
                <>
                  Przejdź do panelu
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Dalej
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HostOnboarding;