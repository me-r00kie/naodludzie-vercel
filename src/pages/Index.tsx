import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Cabin, CabinSearchParams, PaginatedResponse } from "@/types";
import { searchCabins } from "@/services/api";
import { Header } from "@/components/Header";
import { SEOHead } from "@/components/SEOHead";
import { CabinCard } from "@/components/CabinCard";
import { HeroSearchBar } from "@/components/HeroSearchBar";
import { FooterNewsletter } from "@/components/FooterNewsletter";

import { FilterPanel } from "@/components/FilterPanel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trees, ChevronLeft, ChevronRight, Star, CalendarClock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Hero image is in public folder for early preload discovery (WebP for LCP optimization)
const heroCabinImage = "/images/hero-cabin-winter.webp";

const BASE_URL = "https://naodludzie.pl";

// Homepage JSON-LD Schema
const homeJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "NaOdludzie",
  url: BASE_URL,
  description: "Platforma rezerwacji domków na odludziu w Polsce. Bieszczady, Mazury, Kaszuby, Karpaty.",
  potentialAction: {
    "@type": "SearchAction",
    target: `${BASE_URL}/?search={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const Index = () => {
  const [searchParams] = useSearchParams();
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "featured" | "lastminute">("all");

  const fetchCabins = async (params: CabinSearchParams = {}) => {
    setIsLoading(true);
    try {
      const result = await searchCabins({ ...params, page: params.page || 1, limit: 9 });
      setCabins(result.data);
      setPagination({
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
      });
    } catch (error) {
      console.error("Failed to fetch cabins:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCabins();
  }, []);

  const handleSearch = (params: CabinSearchParams) => {
    fetchCabins({ ...params, page: 1 });
    setActiveTab("all");
  };

  const handlePageChange = (newPage: number) => {
    fetchCabins({ page: newPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Filter cabins based on active tab
  const filteredCabins = cabins.filter((cabin) => {
    if (activeTab === "featured") return cabin.isFeatured;
    if (activeTab === "lastminute") return cabin.lastMinuteDates && cabin.lastMinuteDates.length > 0;
    return true;
  });

  const featuredCount = cabins.filter((c) => c.isFeatured).length;
  const lastMinuteCount = cabins.filter((c) => c.lastMinuteDates && c.lastMinuteDates.length > 0).length;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* SEO Head */}
      <SEOHead
        title="NaOdludzie - Domki na odludziu w Polsce"
        description="Odkryj unikalne domki na odludziu w Polsce. Bieszczady, Mazury, Kaszuby, Karpaty. Znajdź spokój z dala od cywilizacji. Rezerwuj bezpośrednio u gospodarzy."
        canonicalUrl={BASE_URL}
        ogImage={`${BASE_URL}/images/hero-cabin-winter.webp`}
        ogImageAlt="Przytulny domek w zimowej scenerii - NaOdludzie"
        jsonLd={homeJsonLd}
      />

      <Header />

      {/* Hero Section with Background */}
      <section
        className="relative min-h-[70vh] flex items-center justify-center overflow-hidden"
        aria-label="Wyszukiwarka domków"
      >
        {/* Background Image - using img tag for better FCP */}
        <img
          src={heroCabinImage}
          alt="Domek na odludziu w zimowej scenerii"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />

        <div className="container relative z-10 py-12 md:py-24">
          {/* Removed motion animation for faster FCP/Speed Index */}
          <div className="max-w-4xl mx-auto text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm text-primary mb-6">
              <Trees className="w-4 h-4" />
              <span className="text-sm font-medium">Odkryj miejsca z dala od cywilizacji</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-balance text-foreground drop-shadow-lg">
              Znajdź swoje idealne miejsce <span className="text-primary">na odludziu</span>
            </h1>
            <p className="text-lg text-foreground/90 max-w-2xl mx-auto drop-shadow-md">
              NaOdludzie to miejsce dla tych, którzy szukają prawdziwego spokoju. Odkryj domki w najbardziej
              odosobnionych zakątkach Polski.
            </p>
          </div>

          {/* Hero Search Bar - no motion for faster rendering */}
          <div className="max-w-5xl mx-auto">
            <HeroSearchBar onSearch={handleSearch} isLoading={isLoading} />
          </div>
        </div>
      </section>

      {/* USP Section - use content-visibility for below-fold optimization */}
      <section className="py-12 bg-muted/30" aria-label="Dlaczego NaOdludzie" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 400px' }}>
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <article className="flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border shadow-sm">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h2 className="font-semibold text-foreground mb-2">Uczciwy cennik</h2>
              <p className="text-sm text-muted-foreground">
                Nie pozwalamy na publikację ofert z ukrytymi opłatami. Żadnych dopłat za kWh sauny czy godzinę seansu w
                jacuzzi. Tylko uczciwe ceny.
              </p>
            </article>

            <article className="flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border shadow-sm">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">🐾</span>
              </div>
              <h2 className="font-semibold text-foreground mb-2">Pupil jedzie z Wami?</h2>
              <p className="text-sm text-muted-foreground">
                Jeśli Wasz czworonożny przyjaciel jedzie z Wami – jest traktowany na takich samych zasadach jak Wy.
              </p>
            </article>

            <article className="flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border shadow-sm">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">🌲</span>
              </div>
              <h2 className="font-semibold text-foreground mb-2">Wynik NaOdludzie</h2>
              <p className="text-sm text-muted-foreground">
                Wyjątkowa skala, która pokazuje jak bardzo jesteście na odludziu. Tylko u nas!
              </p>
            </article>
          </div>

          {/* CTA for cabin owners */}
          <div className="mt-10 text-center">
            <Link
              to="/host/add-cabin"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <span className="text-2xl">🏡</span>
              Jesteś właścicielem domku na odludziu? Dodaj ofertę!
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-16" aria-label="Lista domków">
        <div className="container">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Filters Sidebar - collapsible on mobile */}
            <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0" aria-label="Filtry">
              <div className="lg:sticky lg:top-24">
                <FilterPanel onSearch={handleSearch} isLoading={isLoading} />
              </div>
            </aside>

            {/* Results */}
            <main className="flex-1 min-w-0">
              {/* Tagline */}
              <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-lg font-medium text-center">
                  🏡 Zarezerwuj swoje idealne miejsce na odludziu spośród{" "}
                  <span className="font-bold text-primary">{pagination.total}</span> ofert
                </p>
              </div>

              {/* Results Count */}
              <header className="mb-6">
                <h2 className="text-xl font-semibold">
                  {isLoading ? "Ładowanie..." : `${filteredCabins.length} domków na odludziu`}
                </h2>
                <p className="text-sm text-muted-foreground">Posortowane według Wyniku NaOdludzie</p>
              </header>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all" className="flex items-center gap-2">
                    Wszystkie
                  </TabsTrigger>
                  <TabsTrigger value="featured" className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    Polecane
                    {featuredCount > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {featuredCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="lastminute" className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-orange-500" />
                    Last Minute
                    {lastMinuteCount > 0 && (
                      <Badge variant="secondary" className="ml-1 bg-orange-100 text-orange-700">
                        {lastMinuteCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Cabin Grid */}
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="aspect-[4/3] rounded-lg" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredCabins.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredCabins.map((cabin, index) => (
                    <CabinCard key={cabin.id} cabin={cabin} index={index} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trees className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {activeTab === "featured"
                      ? "Brak polecanych ofert"
                      : activeTab === "lastminute"
                        ? "Brak ofert last minute"
                        : "Brak wyników"}
                  </h3>
                  <p className="text-muted-foreground">
                    {activeTab === "featured"
                      ? "Aktualnie nie ma żadnych promowanych domków."
                      : activeTab === "lastminute"
                        ? "Aktualnie nie ma ofert last minute."
                        : "Spróbuj zmienić filtry, aby znaleźć więcej domków."}
                  </p>
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <nav className="flex items-center justify-center gap-2 mt-8" aria-label="Paginacja">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    aria-label="Poprzednia strona"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground px-4">
                    Strona {pagination.page} z {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    aria-label="Następna strona"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </nav>
              )}
            </main>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Logo & Description */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Trees className="w-6 h-6 text-primary" />
                <span className="font-display text-xl font-semibold">NaOdludzie</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                Platforma dla tych, którzy szukają prawdziwego spokoju z dala od cywilizacji.
              </p>
            </div>

            {/* Links */}
            <nav className="space-y-4" aria-label="Stopka - linki">
              <h4 className="font-semibold text-foreground">Przydatne linki</h4>
              <div className="flex flex-col gap-2">
                <Link
                  to="/polityka-prywatnosci"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Polityka prywatności
                </Link>
                <Link to="/regulamin" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Regulamin
                </Link>
                <Link to="/kontakt" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Kontakt
                </Link>
                <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  FAQ
                </Link>
              </div>
            </nav>

            {/* Newsletter */}
            <div>
              <FooterNewsletter />
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              © 2024 NaOdludzie. Wszystkie prawa zastrzeżone.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
