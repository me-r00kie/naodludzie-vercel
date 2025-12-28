import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, Home, ArrowLeft } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';

export default function BookingCanceled() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('booking_id');

  return (
    <>
      <SEOHead
        title="Płatność anulowana | Na Odludziu"
        description="Płatność za rezerwację została anulowana"
        canonicalUrl="https://naodludzie.pl/booking-canceled"
      />
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <XCircle className="w-16 h-16 mx-auto text-amber-500" />
            <CardTitle className="text-2xl mt-4">
              Płatność anulowana
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Płatność została anulowana. Twoja rezerwacja nie została potwierdzona.
            </p>
            <p className="text-sm text-muted-foreground">
              Jeśli chcesz, możesz spróbować ponownie lub skontaktować się z hostem.
            </p>
            
            <div className="flex flex-col gap-3 mt-6">
              <Button asChild variant="outline">
                <Link to="javascript:history.back()">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Wróć do rezerwacji
                </Link>
              </Button>
              <Button asChild>
                <Link to="/">
                  <Home className="w-4 h-4 mr-2" />
                  Wróć do strony głównej
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
