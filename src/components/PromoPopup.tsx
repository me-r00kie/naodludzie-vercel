import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Gift, Sparkles, Mail, UserPlus, X, Percent } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email({ message: 'Podaj poprawny adres email' });

const POPUP_STORAGE_KEY = 'promo_popup_shown';
const POPUP_COOLDOWN_HOURS = 24;

interface PromoPopupProps {
  cabinSlug?: string;
}

export function PromoPopup({ cabinSlug }: PromoPopupProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check if popup should be shown
    const checkPopup = () => {
      const lastShown = localStorage.getItem(POPUP_STORAGE_KEY);
      
      if (lastShown) {
        const lastShownDate = new Date(parseInt(lastShown));
        const hoursSinceShown = (Date.now() - lastShownDate.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceShown < POPUP_COOLDOWN_HOURS) {
          return;
        }
      }

      // Show popup after a delay
      const timer = setTimeout(() => {
        setIsOpen(true);
        localStorage.setItem(POPUP_STORAGE_KEY, Date.now().toString());
      }, 5000);

      return () => clearTimeout(timer);
    };

    checkPopup();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      toast({
        title: 'Błąd',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    if (!consent) {
      toast({
        title: 'Błąd',
        description: 'Musisz wyrazić zgodę na otrzymywanie wiadomości.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert({
          email: email.trim().toLowerCase(),
          source: 'promo_popup',
          cabin_slug: cabinSlug || null,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Już jesteś zapisany!',
            description: 'Ten adres email jest już w naszej bazie.',
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: 'Dziękujemy! 🎉',
          description: 'Otrzymasz kod rabatowy na podany adres email.',
        });
      }

      setIsOpen(false);
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać do newslettera. Spróbuj ponownie.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0">
        <div className="relative">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-background/80 backdrop-blur hover:bg-background transition-colors"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header gradient */}
          <div className="bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 px-6 pt-8 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold mb-4">
              <Gift className="w-4 h-4" />
              PROGRAM RABATOWY
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Opłaca się być z nami!
            </h2>
            <p className="text-foreground/80">
              Dołącz do społeczności <strong>NaOdludzie</strong> i korzystaj ze specjalnych ofert oraz zniżek!
            </p>
          </div>

          {/* Benefits section */}
          <div className="px-6 py-5 space-y-4 border-b border-border">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10 text-primary shrink-0">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Rabat dla zarejestrowanych</p>
                <p className="text-sm text-muted-foreground">
                  Zalogowani użytkownicy płacą mniej za każdą rezerwację!
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-accent/20 text-accent-foreground shrink-0">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  Dodatkowe <span className="text-primary">10% zniżki</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Zapisz się do newslettera i otrzymuj kody rabatowe na wybrane oferty!
                </p>
              </div>
            </div>
          </div>

          {/* Form section */}
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="popup-email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="popup-email"
                type="email"
                placeholder="twoj@email.pl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="popup-consent"
                checked={consent}
                onCheckedChange={(checked) => setConsent(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="popup-consent" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
                Chcę otrzymywać e-maile z rabatami, inspiracjami i nowościami. Chciałbym również otrzymać kod na 10% zniżki.
              </label>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                'Zapisuję...'
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Zapisz się i odbierz rabat
                </>
              )}
            </Button>

            {!user && (
              <p className="text-center text-sm text-muted-foreground">
                Masz już konto?{' '}
                <Link 
                  to={`/auth?redirectTo=${encodeURIComponent(window.location.pathname)}`}
                  className="text-primary hover:underline font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  Zaloguj się
                </Link>
              </p>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
