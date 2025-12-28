import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, Home, AlertCircle } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';

export default function BookingSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const bookingId = searchParams.get('booking_id');
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<{
    totalAmount?: string;
    platformFee?: string;
    hostAmount?: string;
  } | null>(null);

  useEffect(() => {
    async function verifyPayment() {
      if (!sessionId) {
        setError('Brak identyfikatora sesji płatności');
        setIsVerifying(false);
        return;
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke('verify-booking-payment', {
          body: { sessionId, bookingRequestId: bookingId }
        });

        if (fnError) throw fnError;

        if (data.paid) {
          setPaymentVerified(true);
          setPaymentDetails({
            totalAmount: data.totalAmount,
            platformFee: data.platformFee,
            hostAmount: data.hostAmount,
          });
        } else {
          setError('Płatność nie została potwierdzona');
        }
      } catch (err) {
        console.error('Payment verification error:', err);
        setError('Błąd weryfikacji płatności');
      } finally {
        setIsVerifying(false);
      }
    }

    verifyPayment();
  }, [sessionId, bookingId]);

  return (
    <>
      <SEOHead
        title="Potwierdzenie płatności | Na Odludziu"
        description="Twoja rezerwacja została potwierdzona"
        canonicalUrl="https://naodludzie.pl/booking-success"
      />
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            {isVerifying ? (
              <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
            ) : paymentVerified ? (
              <CheckCircle className="w-16 h-16 mx-auto text-emerald-500" />
            ) : (
              <AlertCircle className="w-16 h-16 mx-auto text-destructive" />
            )}
            <CardTitle className="text-2xl mt-4">
              {isVerifying 
                ? 'Weryfikuję płatność...' 
                : paymentVerified 
                  ? 'Płatność potwierdzona!' 
                  : 'Problem z płatnością'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {isVerifying && (
              <p className="text-muted-foreground">
                Proszę czekać, trwa weryfikacja Twojej płatności...
              </p>
            )}
            
            {paymentVerified && (
              <>
                <p className="text-muted-foreground">
                  Dziękujemy za rezerwację! Host został powiadomiony o Twojej rezerwacji.
                </p>
                {paymentDetails?.totalAmount && (
                  <div className="bg-muted/50 p-4 rounded-lg text-left space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Zapłacono:</span>
                      <span className="font-semibold">{paymentDetails.totalAmount} zł</span>
                    </div>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  Potwierdzenie zostało wysłane na Twój adres email.
                </p>
              </>
            )}
            
            {error && !isVerifying && (
              <p className="text-destructive">{error}</p>
            )}
            
            <Button asChild className="w-full mt-6">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Wróć do strony głównej
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
