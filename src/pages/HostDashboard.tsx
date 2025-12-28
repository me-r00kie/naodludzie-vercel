import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Cabin } from '@/types';
import { getCabinsByOwner, deleteCabin, recalculateOffGridScore } from '@/services/api';
import { Header } from '@/components/Header';
import { OffGridScoreBadge } from '@/components/OffGridScore';
import { BookingRequestsPanel } from '@/components/BookingRequestsPanel';
import { StripeConnectSetup } from '@/components/StripeConnectSetup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  RefreshCw, 
  MapPin,
  Users,
  Wallet,
  BarChart3,
  Home,
  Calendar,
  CreditCard
} from 'lucide-react';
import { motion } from 'framer-motion';

const HostDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingCabin, setDeletingCabin] = useState<Cabin | null>(null);
  const [recalculatingId, setRecalculatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (!user.roles.includes('host')) {
      navigate('/');
      return;
    }

    fetchCabins();
  }, [user, navigate]);

  const fetchCabins = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const data = await getCabinsByOwner(user.id);
      setCabins(data);
    } catch (error) {
      console.error('Failed to fetch cabins:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCabin) return;

    try {
      await deleteCabin(deletingCabin.id);
      setCabins(prev => prev.filter(c => c.id !== deletingCabin.id));
      toast({
        title: 'Domek usunięty',
        description: 'Domek został pomyślnie usunięty.',
      });
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć domku.',
        variant: 'destructive',
      });
    } finally {
      setDeletingCabin(null);
    }
  };

  const handleRecalculateScore = async (cabinId: string) => {
    setRecalculatingId(cabinId);
    try {
      const newScore = await recalculateOffGridScore(cabinId);
      setCabins(prev => prev.map(c => 
        c.id === cabinId ? { ...c, offGridScore: newScore } : c
      ));
      toast({
        title: 'Score przeliczony',
        description: `Nowy OffGrid Score: ${newScore.total}`,
      });
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się przeliczyć score.',
        variant: 'destructive',
      });
    } finally {
      setRecalculatingId(null);
    }
  };

  if (!user || !user.roles.includes('host')) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">Panel Hosta</h1>
            <p className="text-muted-foreground">Zarządzaj swoimi domkami</p>
          </div>
          <Link to="/host/add-cabin">
            <Button variant="hero" size="lg">
              <PlusCircle className="w-5 h-5 mr-2" />
              Dodaj domek
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{cabins.length}</p>
                  <p className="text-sm text-muted-foreground">Domków</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-score-high/10 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-score-high" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {cabins.length > 0
                      ? Math.round(cabins.reduce((sum, c) => sum + c.offGridScore.total, 0) / cabins.length)
                      : 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Śr. OffGrid Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {cabins.reduce((sum, c) => sum + c.maxGuests, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Max. gości łącznie</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {cabins.length > 0
                      ? Math.round(cabins.reduce((sum, c) => sum + c.pricePerNight, 0) / cabins.length)
                      : 0} zł
                  </p>
                  <p className="text-sm text-muted-foreground">Śr. cena/noc</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Cabins and Bookings */}
        <Tabs defaultValue="cabins" className="space-y-6">
          <TabsList>
            <TabsTrigger value="cabins" className="gap-2">
              <Home className="w-4 h-4" />
              Twoje domki
            </TabsTrigger>
            <TabsTrigger value="bookings" className="gap-2">
              <Calendar className="w-4 h-4" />
              Rezerwacje
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Płatności
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cabins">
            <Card>
              <CardHeader>
                <CardTitle>Twoje domki</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="w-20 h-20 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : cabins.length > 0 ? (
                  <div className="space-y-4">
                    {cabins.map((cabin, index) => (
                      <motion.div
                        key={cabin.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <img
                          src={cabin.images[0]?.url || '/placeholder.svg'}
                          alt={cabin.title}
                          className="w-full sm:w-24 h-32 sm:h-20 object-cover rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <Link to={`/cabin/${cabin.slug}`} className="hover:underline">
                            <h3 className="font-semibold truncate">{cabin.title}</h3>
                          </Link>
                          <p className="text-sm text-muted-foreground truncate">{cabin.address}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>{cabin.pricePerNight} zł/noc</span>
                            <span>Do {cabin.maxGuests} osób</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <OffGridScoreBadge score={cabin.offGridScore.total} size="sm" />
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRecalculateScore(cabin.id)}
                              disabled={recalculatingId === cabin.id}
                            >
                              <RefreshCw className={`w-4 h-4 ${recalculatingId === cabin.id ? 'animate-spin' : ''}`} />
                            </Button>
                            <Link to={`/host/edit-cabin/${cabin.id}`}>
                              <Button variant="ghost" size="icon">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingCabin(cabin)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Brak domków</h3>
                    <p className="text-muted-foreground mb-4">
                      Dodaj swój pierwszy domek i zacznij zarabiać.
                    </p>
                    <Link to="/host/add-cabin">
                      <Button>
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Dodaj domek
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <BookingRequestsPanel />
          </TabsContent>

          <TabsContent value="payments">
            <StripeConnectSetup />
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCabin} onOpenChange={() => setDeletingCabin(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć ten domek?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcja jest nieodwracalna. Domek "{deletingCabin?.title}" zostanie trwale usunięty
              wraz ze wszystkimi powiązanymi danymi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Usuń domek
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HostDashboard;
