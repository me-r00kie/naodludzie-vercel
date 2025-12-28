import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { 
  Calendar, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  CreditCard,
  Home,
  Loader2,
  MessageCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import ChatWindow from './ChatWindow';

interface GuestBookingRequest {
  id: string;
  cabin_id: string;
  host_id: string;
  start_date: string;
  end_date: string;
  guests_count: number;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  cabins?: { 
    title: string; 
    price_per_night: number;
    slug: string;
  };
  hostProfile?: { name: string | null; email: string };
}

const PLATFORM_FEE_PERCENT = 7;

export const GuestBookingsPanel = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<GuestBookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
  const [activeChatRequestId, setActiveChatRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data: bookingsData, error } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('guest_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!bookingsData || bookingsData.length === 0) {
        setBookings([]);
        setIsLoading(false);
        return;
      }

      // Get cabin info
      const cabinIds = [...new Set(bookingsData.map(b => b.cabin_id))];
      const hostIds = [...new Set(bookingsData.map(b => b.host_id))];

      const [cabinsRes, profilesRes] = await Promise.all([
        supabase.from('cabins').select('id, title, price_per_night, slug').in('id', cabinIds),
        supabase.from('profiles').select('id, name, email').in('id', hostIds)
      ]);

      const cabinsMap = new Map((cabinsRes.data || []).map(c => [c.id, c]));
      const profilesMap = new Map((profilesRes.data || []).map(p => [p.id, p]));

      const enrichedBookings = bookingsData.map(booking => ({
        ...booking,
        cabins: cabinsMap.get(booking.cabin_id),
        hostProfile: profilesMap.get(booking.host_id)
      }));

      setBookings(enrichedBookings);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać rezerwacji.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateNights = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handlePayment = async (booking: GuestBookingRequest) => {
    if (!booking.cabins) return;
    
    setPayingBookingId(booking.id);
    
    try {
      const nights = calculateNights(booking.start_date, booking.end_date);
      const pricePerNight = booking.cabins.price_per_night;
      
      const { data, error } = await supabase.functions.invoke('create-booking-payment', {
        body: {
          bookingRequestId: booking.id,
          cabinTitle: booking.cabins.title,
          pricePerNight,
          nights,
          guestsCount: booking.guests_count,
          startDate: booking.start_date,
          endDate: booking.end_date,
          hostId: booking.host_id
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('Nie otrzymano linku do płatności');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Błąd płatności',
        description: 'Nie udało się utworzyć sesji płatności. Spróbuj ponownie.',
        variant: 'destructive',
      });
    } finally {
      setPayingBookingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="text-amber-500 border-amber-500">
            <Clock className="w-3 h-3 mr-1" />
            Oczekuje na akceptację
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="text-green-500 border-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Zaakceptowana - zapłać online
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="text-red-500 border-red-500">
            <XCircle className="w-3 h-3 mr-1" />
            Odrzucona
          </Badge>
        );
      default:
        return null;
    }
  };

  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const approvedCount = bookings.filter(b => b.status === 'approved').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Moje rezerwacje</CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary">
              <Clock className="w-3 h-3 mr-1" />
              {pendingCount} oczekujących
            </Badge>
            <Badge variant="secondary" className="text-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              {approvedCount} do zapłaty
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking, index) => {
              const nights = calculateNights(booking.start_date, booking.end_date);
              const totalPrice = booking.cabins ? booking.cabins.price_per_night * nights : 0;
              const platformFee = Math.round(totalPrice * PLATFORM_FEE_PERCENT / 100);
              
              return (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Link 
                            to={`/cabin/${booking.cabins?.slug}`}
                            className="font-semibold hover:text-primary transition-colors"
                          >
                            {booking.cabins?.title || 'Domek'}
                          </Link>
                          {getStatusBadge(booking.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {format(new Date(booking.start_date), 'd MMM', { locale: pl })} - {format(new Date(booking.end_date), 'd MMM yyyy', { locale: pl })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>{booking.guests_count} gości</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Home className="w-4 h-4" />
                            <span>{nights} nocy</span>
                          </div>
                        </div>
                        
                        {/* Price breakdown */}
                        {booking.cabins && (
                          <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">
                                {booking.cabins.price_per_night} zł × {nights} nocy
                              </span>
                              <span>{totalPrice} zł</span>
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">
                                Prowizja serwisu (7%)
                              </span>
                              <span>{platformFee} zł</span>
                            </div>
                            <div className="flex justify-between font-semibold pt-2 border-t border-border">
                              <span>Razem do zapłaty</span>
                              <span>{totalPrice + platformFee} zł</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment button for approved bookings */}
                    {booking.status === 'approved' && (
                      <div className="border-t border-border pt-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm text-emerald-600">
                          <CheckCircle className="w-4 h-4" />
                          <span>Host zaakceptował Twoją rezerwację! Zapłać, aby ją potwierdzić.</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() => handlePayment(booking)}
                            disabled={payingBookingId === booking.id}
                            className="gap-2"
                          >
                            {payingBookingId === booking.id ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Przygotowuję płatność...
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-4 h-4" />
                                Zapłać {(totalPrice + platformFee)} zł
                              </>
                            )}
                          </Button>
                          
                          {activeChatRequestId === booking.id ? (
                            <ChatWindow 
                              bookingRequestId={booking.id}
                              otherUserName={booking.hostProfile?.name || 'Host'}
                              onClose={() => setActiveChatRequestId(null)}
                            />
                          ) : (
                            <Button
                              variant="outline"
                              onClick={() => setActiveChatRequestId(booking.id)}
                              className="gap-2"
                            >
                              <MessageCircle className="w-4 h-4" />
                              Chat z hostem
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {booking.status === 'pending' && (
                      <div className="border-t border-border pt-4">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Host ma 24 godziny na odpowiedź. Otrzymasz powiadomienie email.
                        </p>
                      </div>
                    )}

                    {booking.status === 'rejected' && (
                      <div className="border-t border-border pt-4">
                        <p className="text-sm text-muted-foreground">
                          Niestety host odrzucił Twoją prośbę o rezerwację. Sprawdź inne dostępne terminy lub poszukaj innego domku.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Brak rezerwacji</h3>
            <p className="text-muted-foreground mb-4">
              Nie masz jeszcze żadnych rezerwacji.
            </p>
            <Button asChild>
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Przeglądaj domki
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
