import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Banknote, Percent, Settings, Calendar, RefreshCw, ArrowRight, CheckCircle2 } from "lucide-react";

const ForHosts = () => {
  const benefits = [
    {
      icon: Banknote,
      title: "Bez abonamentu i formalności",
      description:
        "Ofertę dodajesz bezpłatnie. Bez opłat na start, abonamentu i ukrytych kosztów. Konfiguracja jest prosta i szybka, ale jeżeli będziesz potrzebować wsparcia, nasz zespół przeprowadzi Cię przez cały proces.",
    },
    {
      icon: Percent,
      title: "Brak prowizji",
      description:
        "Jesteśmy jedynym portalem, gdzie wystawienie ogłoszeń jest darmowe. Na dodatek.. nie pobieramy prowizji na start.",
    },
    {
      icon: Settings,
      title: "Własne zasady rezerwacji",
      description:
        "Udostępnij rezerwacje natychmiastowe lub akceptuj je ręcznie. Określ dni zameldowania i wymeldowania, godziny i minimalny czas pobytu. Możesz ustalić zasady zarówno dla całego miejsca, jak i dla konkretnych domów oraz pokoi.",
    },
    {
      icon: Calendar,
      title: "Elastyczne zarządzanie cennikiem",
      description:
        "W dowolnym momencie zarządzaj swoim cennikiem. Dostosuj ceny do sezonu, weekendów i długości pobytu. Dodaj zniżki takie jak Last Minute, First Minute czy Promocyjne Terminy specjalne i przyciągnij do swojego obiekty jeszcze więcej Gości.",
    },
    {
      icon: RefreshCw,
      title: "Synchronizacja kalendarzy",
      badge: "NIEBAWEM",
      description:
        "Oferujemy synchronizację z większością popularnych kalendarzy, a to oznacza dostępność Twojego obiektu zostanie automatycznie zaktualizowana, kiedy otrzymasz rezerwacje w innym miejscu i odwrotnie. Nie martw się o overbooking.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">Zostań gospodarzem na NaOdludzie.pl</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Dołącz do społeczności właścicieli wyjątkowych miejsc i zacznij zarabiać na swoim obiekcie już dziś.
          </p>
          <Link to="/auth">
            <Button size="lg" className="gap-2">
              Dodaj swój obiekt <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Dlaczego warto z nami współpracować?</h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit, index) => (
              <Card key={index} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                {benefit.badge && (
                  <div className="absolute top-4 right-4">
                    <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded-full">
                      {benefit.badge}
                    </span>
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-primary/10 p-3 shrink-0">
                      <benefit.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2 text-foreground">{benefit.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{benefit.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6 text-foreground">Proste i przejrzyste zasady</h2>
              <ul className="space-y-4">
                {[
                  "Rejestracja i dodanie ogłoszenia zajmuje kilka minut",
                  "Sam decydujesz o cenach i dostępności",
                  "Bezpośredni kontakt z gośćmi przez wbudowany chat",
                  "Pełna kontrola nad rezerwacjami",
                  "Wsparcie techniczne na każdym etapie",
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-center">
              <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
                <h3 className="text-2xl font-bold mb-4 text-foreground">Gotowy, aby zacząć?</h3>
                <p className="text-muted-foreground mb-6">
                  Zarejestruj się jako gospodarz i dodaj swój pierwszy obiekt już dziś!
                </p>
                <Link to="/auth">
                  <Button size="lg" className="w-full">
                    Zarejestruj się jako gospodarz
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} NaOdludzie.pl Wszystkie prawa zastrzeżone.</p>
        </div>
      </footer>
    </div>
  );
};

export default ForHosts;
