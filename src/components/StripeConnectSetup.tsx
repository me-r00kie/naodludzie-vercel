import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { ManualPaymentVerification } from './ManualPaymentVerification';
import { 
  CreditCard, 
  Building2, 
  User, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  RefreshCw,
  Wallet,
  Banknote
} from 'lucide-react';

interface StripeConnectStatus {
  hasAccount: boolean;
  stripeAccountId?: string;
  onboardingCompleted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  accountType?: string;
  businessName?: string;
}

interface Cabin {
  id: string;
  title: string;
  verification_transfer_sent?: boolean;
  manual_payment_verified?: boolean;
}

export const StripeConnectSetup = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<StripeConnectStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [accountType, setAccountType] = useState<'individual' | 'company'>('individual');
  const [businessName, setBusinessName] = useState('');
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [selectedCabin, setSelectedCabin] = useState<Cabin | null>(null);

  useEffect(() => {
    if (user) {
      checkStatus();
      fetchCabins();
    }
  }, [user]);

  const fetchCabins = async () => {
    try {
      const { data, error } = await supabase
        .from('cabins')
        .select('id, title, verification_transfer_sent, manual_payment_verified')
        .eq('owner_id', user!.id);

      if (error) throw error;
      setCabins(data || []);
      if (data && data.length > 0) {
        setSelectedCabin(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch cabins:', error);
    }
  };

  const getReadableError = (err: unknown) => {
    const fallback = 'Wystąpił błąd podczas łączenia ze Stripe.';
    if (!err) return fallback;
    const text = err instanceof Error ? err.message : String(err);
    const match = text.match(/\{\"error\":\"([^\"]+)\"\}/);
    if (match?.[1]) return match[1];
    const match2 = text.match(/\{"error":"([^"]+)"\}/);
    if (match2?.[1]) return match2[1];
    return text || fallback;
  };

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-connect-status');
      if (error) throw error;
      setStatus(data);
      if (data.accountType) setAccountType(data.accountType);
      if (data.businessName) setBusinessName(data.businessName);
    } catch (error) {
      console.error('Failed to check Stripe status:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się sprawdzić statusu konta Stripe.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (accountType === 'company' && !businessName.trim()) {
      toast({
        title: 'Błąd',
        description: 'Podaj nazwę firmy.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        body: {
          accountType,
          businessName: accountType === 'company' ? businessName.trim() : null,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast({
          title: 'Przekierowanie do Stripe',
          description: 'Dokończ konfigurację konta w nowym oknie.',
        });
      }
    } catch (error) {
      console.error('Failed to create Stripe account:', error);
      const readable = getReadableError(error);
      const needsPlatformProfile = readable.toLowerCase().includes('platform profile');

      toast({
        title: 'Nie udało się uruchomić Stripe Connect',
        description: needsPlatformProfile
          ? `${readable} (Uzupełnij ankietę platformy w Stripe i spróbuj ponownie.)`
          : readable,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleContinueOnboarding = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        body: {
          accountType: status?.accountType || 'individual',
          businessName: status?.businessName,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Failed to continue onboarding:', error);
      toast({
        title: 'Nie udało się kontynuować konfiguracji',
        description: getReadableError(error),
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Account fully set up via Stripe
  if (status?.chargesEnabled && status?.payoutsEnabled) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Płatności online aktywne</CardTitle>
                <CardDescription>Możesz przyjmować płatności od gości</CardDescription>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-white">
              <CheckCircle className="w-3 h-3 mr-1" />
              Aktywne
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Typ konta:</span>
              <span className="font-medium">
                {status.accountType === 'company' ? 'Firma' : 'Osoba prywatna'}
              </span>
            </div>
            {status.businessName && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Nazwa:</span>
                <span className="font-medium">{status.businessName}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Przyjmowanie płatności: Włączone</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Wypłaty: Włączone</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={checkStatus}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Odśwież status
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Onboarding started but not completed
  if (status?.hasAccount && status?.stripeAccountId && !status?.chargesEnabled) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Dokończ konfigurację</CardTitle>
                <CardDescription>Twoje konto Stripe wymaga dokończenia weryfikacji</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-amber-600 border-amber-500">
              W trakcie
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Aby przyjmować płatności online, musisz dokończyć proces weryfikacji w Stripe. 
            Kliknij przycisk poniżej, aby kontynuować.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleContinueOnboarding} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              Dokończ weryfikację
            </Button>
            <Button variant="outline" onClick={checkStatus}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sprawdź status
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No account - show setup options with tabs
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Włącz płatności online</CardTitle>
              <CardDescription>
                Wybierz metodę weryfikacji, aby przyjmować płatności od gości
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="stripe" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stripe" className="gap-2">
                <CreditCard className="w-4 h-4" />
                Stripe Connect
              </TabsTrigger>
              <TabsTrigger value="transfer" className="gap-2">
                <Banknote className="w-4 h-4" />
                Przelew weryfikacyjny
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stripe" className="space-y-6 mt-6">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium">Korzyści Stripe Connect:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Automatyczne przelewy na Twoje konto
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Prowizja 7% od rezerwacji
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Natychmiastowa aktywacja po weryfikacji
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Typ konta</Label>
                  <RadioGroup
                    value={accountType}
                    onValueChange={(val) => setAccountType(val as 'individual' | 'company')}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    <div className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${accountType === 'individual' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
                      <RadioGroupItem value="individual" id="individual" className="mt-1" />
                      <div className="flex-1">
                        <label htmlFor="individual" className="flex items-center gap-2 font-medium cursor-pointer">
                          <User className="w-4 h-4" />
                          Osoba prywatna
                        </label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Wynajem prywatny, bez firmy
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${accountType === 'company' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
                      <RadioGroupItem value="company" id="company" className="mt-1" />
                      <div className="flex-1">
                        <label htmlFor="company" className="flex items-center gap-2 font-medium cursor-pointer">
                          <Building2 className="w-4 h-4" />
                          Firma
                        </label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Działalność gospodarcza lub spółka
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {accountType === 'company' && (
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Nazwa firmy</Label>
                    <Input
                      id="businessName"
                      placeholder="np. Domki Górskie Sp. z o.o."
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <Button 
                onClick={handleCreateAccount} 
                disabled={isCreating || (accountType === 'company' && !businessName.trim())}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Tworzę konto...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Rozpocznij konfigurację Stripe
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="transfer" className="mt-6">
              {cabins.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Brak ofert</h3>
                  <p className="text-sm text-muted-foreground">
                    Najpierw dodaj ofertę domku, aby móc włączyć płatności online.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cabins.length > 1 && (
                    <div className="space-y-2">
                      <Label>Wybierz ofertę do weryfikacji</Label>
                      <select
                        className="w-full p-2 border rounded-lg bg-background"
                        value={selectedCabin?.id || ''}
                        onChange={(e) => {
                          const cabin = cabins.find(c => c.id === e.target.value);
                          setSelectedCabin(cabin || null);
                        }}
                      >
                        {cabins.map(cabin => (
                          <option key={cabin.id} value={cabin.id}>
                            {cabin.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {selectedCabin && (
                    <ManualPaymentVerification
                      cabinId={selectedCabin.id}
                      cabinTitle={selectedCabin.title}
                      verificationTransferSent={selectedCabin.verification_transfer_sent}
                      manualPaymentVerified={selectedCabin.manual_payment_verified}
                      onStatusChange={fetchCabins}
                    />
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
