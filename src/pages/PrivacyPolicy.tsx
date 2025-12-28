import { Header } from "@/components/Header";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-foreground">Polityka Prywatności</h1>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">1. Informacje ogólne</h2>
              <p className="text-muted-foreground leading-relaxed">
                Niniejsza polityka prywatności określa zasady przetwarzania i ochrony danych osobowych użytkowników
                korzystających z serwisu NaOdludzie. Administratorem danych osobowych jest NaOdludzie.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">2. Rodzaje zbieranych danych</h2>
              <p className="text-muted-foreground leading-relaxed">
                W ramach korzystania z serwisu zbieramy następujące dane:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Imię i nazwisko</li>
                <li>Adres e-mail</li>
                <li>Numer telefonu</li>
                <li>Dane dotyczące rezerwacji</li>
                <li>Dane dotyczące obiektów noclegowych (dla gospodarzy)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">3. Cel przetwarzania danych</h2>
              <p className="text-muted-foreground leading-relaxed">Dane osobowe przetwarzane są w celu:</p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Świadczenia usług dostępnych w serwisie</li>
                <li>Obsługi rezerwacji i komunikacji między użytkownikami</li>
                <li>Kontaktu z użytkownikami w sprawach związanych z serwisem</li>
                <li>Wysyłania informacji o zmianach w serwisie</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">4. Podstawa prawna przetwarzania</h2>
              <p className="text-muted-foreground leading-relaxed">
                Przetwarzanie danych osobowych odbywa się na podstawie:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Zgody użytkownika (art. 6 ust. 1 lit. a RODO)</li>
                <li>Wykonania umowy (art. 6 ust. 1 lit. b RODO)</li>
                <li>Prawnie uzasadnionego interesu administratora (art. 6 ust. 1 lit. f RODO)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">5. Prawa użytkowników</h2>
              <p className="text-muted-foreground leading-relaxed">Użytkownikom przysługuje prawo do:</p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Dostępu do swoich danych osobowych</li>
                <li>Sprostowania danych</li>
                <li>Usunięcia danych ("prawo do bycia zapomnianym")</li>
                <li>Ograniczenia przetwarzania</li>
                <li>Przenoszenia danych</li>
                <li>Wniesienia sprzeciwu wobec przetwarzania</li>
                <li>Cofnięcia zgody w dowolnym momencie</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">6. Pliki cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                Serwis wykorzystuje pliki cookies w celu zapewnienia prawidłowego funkcjonowania, personalizacji treści
                oraz analizy ruchu. Użytkownik może zarządzać ustawieniami plików cookies w swojej przeglądarce.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">7. Bezpieczeństwo danych</h2>
              <p className="text-muted-foreground leading-relaxed">
                Stosujemy odpowiednie środki techniczne i organizacyjne w celu ochrony danych osobowych przed
                nieautoryzowanym dostępem, utratą lub zniszczeniem.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">8. Kontakt</h2>
              <p className="text-muted-foreground leading-relaxed">
                W sprawach związanych z ochroną danych osobowych można kontaktować się za pośrednictwem formularza
                kontaktowego dostępnego na stronie lub bezpośrednio na adres e-mail administratora.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">9. Zmiany polityki prywatności</h2>
              <p className="text-muted-foreground leading-relaxed">
                Administrator zastrzega sobie prawo do wprowadzania zmian w niniejszej polityce prywatności. O wszelkich
                zmianach użytkownicy będą informowani poprzez serwis.
              </p>
            </section>

            <p className="text-sm text-muted-foreground mt-8">
              Ostatnia aktualizacja: {new Date().toLocaleDateString("pl-PL")}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
