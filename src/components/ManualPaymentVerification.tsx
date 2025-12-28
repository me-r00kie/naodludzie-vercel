import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  Copy, 
  Check, 
  Clock, 
  CreditCard,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface ManualPaymentVerificationProps {
  cabinId: string;
  cabinTitle: string;
  verificationTransferSent?: boolean;
  manualPaymentVerified?: boolean;
  onStatusChange?: () => void;
}

const BANK_DETAILS = {
  companyName: 'K1 GROUP sp. z o.o.',
  address: 'Wiśniowa 5',
  city: '55-300 Środa Śląska',
  bank: 'mBank',
  accountNumber: '89 1140 2004 0000 3602 8123 0858',
};

export function ManualPaymentVerification({
  cabinId,
  cabinTitle,
  verificationTransferSent = false,
  manualPaymentVerified = false,
  onStatusChange,
}: ManualPaymentVerificationProps) {
  const [isMarking, setIsMarking] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const transferTitle = `Przelew weryfikacyjny ${cabinTitle}`;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
      toast({ title: 'Skopiowano!', description: `${label} skopiowano do schowka.` });
    } catch {
      toast({ title: 'Błąd', description: 'Nie udało się skopiować.', variant: 'destructive' });
    }
  };

  const handleMarkAsSent = async () => {
    if (!termsAccepted) {
      toast({
        title: 'Akceptacja regulaminu',
        description: 'Musisz zaakceptować regulamin przed kontynuowaniem.',
        variant: 'destructive',
      });
      return;
    }

    setIsMarking(true);
    try {
      const { error } = await supabase
        .from('cabins')
        .update({ verification_transfer_sent: true })
        .eq('id', cabinId);

      if (error) throw error;

      toast({
        title: 'Oznaczono jako wysłany',
        description: 'Twój przelew zostanie zweryfikowany przez administratora.',
      });
      onStatusChange?.();
    } catch (error) {
      console.error('Failed to mark transfer:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się oznaczyć przelewu.',
        variant: 'destructive',
      });
    } finally {
      setIsMarking(false);
    }
  };

  if (manualPaymentVerified) {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-green-700 dark:text-green-400">
                Płatności online aktywne
              </h3>
              <p className="text-sm text-muted-foreground">
                Twój przelew weryfikacyjny został potwierdzony. Możesz przyjmować płatności online.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (verificationTransferSent) {
    return (
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-700 dark:text-amber-400">
                Oczekiwanie na weryfikację
              </h3>
              <p className="text-sm text-muted-foreground">
                Twój przelew weryfikacyjny jest w trakcie weryfikacji. Skontaktujemy się z Tobą po jego potwierdzeniu.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Weryfikacja przelewem</CardTitle>
            <CardDescription>
              Alternatywa dla Stripe Connect - przelew weryfikacyjny 1 zł
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Building2 className="w-4 h-4" />
            Dane do przelewu:
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Odbiorca:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{BANK_DETAILS.companyName}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(BANK_DETAILS.companyName, 'Nazwa firmy')}
                >
                  {copied === 'Nazwa firmy' ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Adres:</span>
              <span className="font-medium">{BANK_DETAILS.address}, {BANK_DETAILS.city}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Bank:</span>
              <span className="font-medium">{BANK_DETAILS.bank}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Numer konta:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-xs sm:text-sm">{BANK_DETAILS.accountNumber}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(BANK_DETAILS.accountNumber.replace(/\s/g, ''), 'Numer konta')}
                >
                  {copied === 'Numer konta' ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Kwota:</span>
              <Badge variant="secondary">1,00 zł</Badge>
            </div>
            
            <div className="flex items-start justify-between pt-2 border-t border-border">
              <span className="text-muted-foreground">Tytuł przelewu:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-right max-w-[200px] break-words">{transferTitle}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 flex-shrink-0"
                  onClick={() => copyToClipboard(transferTitle, 'Tytuł przelewu')}
                >
                  {copied === 'Tytuł przelewu' ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400">Ważne informacje</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>• Przelew weryfikacyjny wynosi 1 zł</li>
                <li>• Weryfikacja trwa do 2 dni roboczych</li>
                <li>• Po weryfikacji aktywujemy płatności online dla Twojej oferty</li>
                <li>• Prowizja od rezerwacji wynosi 5%</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="terms"
            checked={termsAccepted}
            onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
          />
          <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
            Akceptuję{' '}
            <a href="/regulamin-platnosci" target="_blank" className="text-primary hover:underline">
              regulamin przyjmowania płatności online
            </a>{' '}
            oraz zobowiązuję się do przestrzegania zasad serwisu NaOdludzie.
          </Label>
        </div>

        <Button
          className="w-full"
          onClick={handleMarkAsSent}
          disabled={isMarking || !termsAccepted}
        >
          {isMarking ? 'Zapisywanie...' : 'Oznaczyć przelew jako wysłany'}
        </Button>
      </CardContent>
    </Card>
  );
}