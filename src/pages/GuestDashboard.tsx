import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { GuestBookingsPanel } from '@/components/GuestBookingsPanel';
import { SEOHead } from '@/components/SEOHead';

const GuestDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/auth?redirectTo=/my-bookings');
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Moje rezerwacje | Na Odludziu"
        description="Przeglądaj i zarządzaj swoimi rezerwacjami domków na odludziu"
        canonicalUrl="https://naodludzie.pl/my-bookings"
      />
      <Header />
      
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Moje rezerwacje</h1>
          <p className="text-muted-foreground">Przeglądaj status swoich rezerwacji i dokonuj płatności</p>
        </div>

        <GuestBookingsPanel />
      </main>
    </div>
  );
};

export default GuestDashboard;
