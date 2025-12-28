import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ExtraFee } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Send, Calendar, Users, MessageSquare, Mail, Sparkles, LogIn, Phone, BadgePercent, AlertTriangle } from 'lucide-react';
import { z } from 'zod';

const GUEST_PRICE_MARKUP = 1.07; // 7% markup for non-logged users

const phoneSchema = z.string().regex(/^\d{9}$/, { message: "Numer telefonu musi mieć dokładnie 9 cyfr" });

interface BookingRequestFormProps {
  cabinId: string;
  cabinTitle: string;
  hostId: string;
  pricePerNight: number;
  minNights: number;
  maxGuests: number;
  bookedDates?: Date[];
  extraFees?: ExtraFee[];
}

const emailSchema = z.string().trim().email({ message: "Podaj poprawny adres email" }).max(255, { message: "Email jest za długi" });

export function BookingRequestForm({
  cabinId,
  cabinTitle,
  hostId,
  pricePerNight,
  minNights,
  maxGuests,
  bookedDates = [],
  extraFees = []
}: BookingRequestFormProps) {
  const { user } = useAuth();
  const [selectedFees, setSelectedFees] = useState<Record<string, boolean>>({});
  
  // Create a Set of booked date strings for quick lookup
  const bookedDatesSet = new Set(
    bookedDates.map(d => d.toISOString().split('T')[0])
  );
  
  // Check if a date is booked
  const isDateBooked = (dateString: string) => {
    return bookedDatesSet.has(dateString);
  };
  
  // Check if any date in range is booked
  const hasBookedDateInRange = (start: string, end: string) => {
    if (!start || !end) return false;
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      if (bookedDatesSet.has(d.toISOString().split('T')[0])) {
        return true;
      }
    }
    return false;
  };
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [guestsCount, setGuestsCount] = useState(1);
  const [message, setMessage] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateNights = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const nights = calculateNights();
  
  // Calculate display price - +7% for non-logged users
  const displayPrice = user 
    ? pricePerNight 
    : Math.round(pricePerNight * GUEST_PRICE_MARKUP);
  const accommodationTotal = nights * displayPrice;

  // Calculate extra fees
  const calculateExtraFeesTotal = () => {
    let total = 0;
    extraFees.forEach(fee => {
      if (selectedFees[fee.id]) {
        if (fee.unit === 'per_day') {
          total += fee.amount * nights;
        } else {
          total += fee.amount;
        }
      }
    });
    return total;
  };

  const extraFeesTotal = calculateExtraFeesTotal();
  const totalPrice = accommodationTotal + extraFeesTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      toast({
        title: 'Błąd',
        description: 'Wybierz daty pobytu.',
        variant: 'destructive',
      });
      return;
    }

    if (nights < minNights) {
      toast({
        title: 'Za krótki pobyt',
        description: `Minimalny pobyt to ${minNights} nocy.`,
        variant: 'destructive',
      });
      return;
    }

    // Check if selected dates overlap with booked dates
    if (bookedDates.length > 0 && hasBookedDateInRange(startDate, endDate)) {
      toast({
        title: 'Termin niedostępny',
        description: 'Wybrany zakres dat zawiera dni, które są już zajęte.',
        variant: 'destructive',
      });
      return;
    }

    if (guestsCount > maxGuests) {
      toast({
        title: 'Za dużo gości',
        description: `Maksymalna liczba gości to ${maxGuests}.`,
        variant: 'destructive',
      });
      return;
    }

    // Validate email and phone for non-logged users
    if (!user) {
      const emailValidation = emailSchema.safeParse(guestEmail);
      if (!emailValidation.success) {
        toast({
          title: 'Błąd',
          description: emailValidation.error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }

      const phoneValidation = phoneSchema.safeParse(guestPhone);
      if (!phoneValidation.success) {
        toast({
          title: 'Błąd',
          description: phoneValidation.error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (user) {
        // Logged-in user - create booking request in database
        const { error: requestError } = await supabase
          .from('booking_requests')
          .insert({
            cabin_id: cabinId,
            guest_id: user.id,
            host_id: hostId,
            start_date: startDate,
            end_date: endDate,
            guests_count: guestsCount,
            message: message || null,
            status: 'pending'
          });

        if (requestError) throw requestError;

        // Send email notification to host
        try {
          await supabase.functions.invoke('send-booking-request-email', {
            body: {
              cabinTitle,
              hostId,
              guestId: user.id,
              guestName: user.email,
              startDate,
              endDate,
              guestsCount,
              message,
              totalPrice
            }
          });
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
        }
      } else {
        // Non-logged user - send email only
        try {
          await supabase.functions.invoke('send-booking-request-email', {
            body: {
              cabinTitle,
              hostId,
              guestEmail: guestEmail.trim(),
              guestName: guestName.trim() || 'Gość',
              guestPhone: guestPhone.trim(),
              startDate,
              endDate,
              guestsCount,
              message,
              totalPrice,
              isAnonymous: true
            }
          });
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
          throw new Error('Nie udało się wysłać zapytania');
        }
      }

      toast({
        title: 'Zapytanie wysłane!',
        description: 'Host otrzyma powiadomienie o Twoim zapytaniu.',
      });

      // Reset form
      setStartDate('');
      setEndDate('');
      setGuestsCount(1);
      setMessage('');
      setGuestEmail('');
      setGuestName('');
      setGuestPhone('');
    } catch (error) {
      console.error('Error submitting booking request:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się wysłać zapytania. Spróbuj ponownie.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <CardTitle className="text-2xl">
              {displayPrice} zł
              <span className="text-base font-normal text-muted-foreground">/noc</span>
            </CardTitle>
          </div>
          {user && (
            <div className="flex items-center gap-1.5 text-sm text-primary">
              <BadgePercent className="w-4 h-4" />
              <span className="font-medium">Specjalna cena dla zalogowanych!</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Logged user benefits banner */}
          {!user && (
            <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/20">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Zalogowani użytkownicy mogą liczyć na lepsze ceny!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Zarejestruj się, aby uzyskać dostęp do ekskluzywnych ofert i zniżek.
                  </p>
                  <Link 
                    to={`/auth?redirectTo=${encodeURIComponent(window.location.pathname)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Zaloguj się lub zarejestruj
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Guest info for non-logged users */}
          {!user && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="space-y-2">
                <Label htmlFor="guestEmail" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Twój email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="guestEmail"
                  type="email"
                  placeholder="jan@example.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  required
                  maxLength={255}
                />
                <p className="text-xs text-muted-foreground">Host odpowie na ten adres</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="guestName">Twoje imię (opcjonalnie)</Label>
                <Input
                  id="guestName"
                  type="text"
                  placeholder="Jan Kowalski"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value.slice(0, 100))}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guestPhone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Twój numer telefonu <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="guestPhone"
                  type="tel"
                  placeholder="123456789"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  required
                  maxLength={9}
                  pattern="\d{9}"
                />
                <p className="text-xs text-muted-foreground">9 cyfr, bez myślników i spacji</p>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Przyjazd
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
                className={isDateBooked(startDate) ? 'border-destructive' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Wyjazd
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>

          {/* Warning if dates overlap with booked dates */}
          {startDate && endDate && hasBookedDateInRange(startDate, endDate) && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-sm">
                Wybrany zakres dat zawiera dni, które są już zajęte. Sprawdź kalendarz dostępności i wybierz inne daty.
              </p>
            </div>
          )}

          {/* Guests */}
          <div className="space-y-2">
            <Label htmlFor="guests" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Liczba gości
            </Label>
            <Input
              id="guests"
              type="number"
              min={1}
              max={maxGuests}
              value={guestsCount}
              onChange={(e) => setGuestsCount(parseInt(e.target.value) || 1)}
            />
            <p className="text-xs text-muted-foreground">Max. {maxGuests} osób</p>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Wiadomość do hosta (opcjonalnie)
            </Label>
            <Textarea
              id="message"
              placeholder="Przedstaw się i opisz cel swojego pobytu..."
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
              rows={3}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">{message.length}/2000</p>
          </div>

          {/* Price Summary */}
          {nights > 0 && (
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>{displayPrice} zł × {nights} nocy</span>
                <span>{accommodationTotal} zł</span>
              </div>
              
              {/* Extra fees summary */}
              {extraFees.length > 0 && (
                <div className="border-t border-border pt-2 mt-2 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Dodatkowe opłaty:</p>
                  {extraFees.map(fee => (
                    <div key={fee.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`fee-${fee.id}`}
                          checked={selectedFees[fee.id] || false}
                          onCheckedChange={(checked) => 
                            setSelectedFees(prev => ({ ...prev, [fee.id]: checked === true }))
                          }
                        />
                        <label htmlFor={`fee-${fee.id}`} className="cursor-pointer text-muted-foreground">
                          {fee.name} 
                          <span className="text-xs ml-1">
                            ({fee.unit === 'per_day' ? `${fee.amount} zł × ${nights} nocy` : 'jednorazowo'})
                          </span>
                        </label>
                      </div>
                      {selectedFees[fee.id] && (
                        <span>
                          {fee.unit === 'per_day' ? fee.amount * nights : fee.amount} zł
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex justify-between font-semibold pt-2 border-t border-border">
                <span>Szacowana suma</span>
                <span>{totalPrice} zł</span>
              </div>
              {user && (
                <p className="text-xs text-primary flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Oszczędzasz 7% jako zalogowany użytkownik
                </p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={
              isSubmitting || 
              !startDate || 
              !endDate || 
              nights < minNights || 
              (bookedDates.length > 0 && hasBookedDateInRange(startDate, endDate)) ||
              (!user && (!guestEmail || guestPhone.length !== 9))
            }
          >
            {isSubmitting ? (
              'Wysyłam...'
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Wyślij zapytanie
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Host odpowie na Twoje zapytanie emailem
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
