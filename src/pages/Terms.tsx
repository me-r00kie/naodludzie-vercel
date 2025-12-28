import { Header } from "@/components/Header";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-foreground">Regulamin</h1>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">§1. Postanowienia ogólne</h2>
              <ol className="list-decimal list-inside text-muted-foreground space-y-2">
                <li>Niniejszy regulamin określa zasady korzystania z serwisu NaOdludzie.</li>
                <li>Serwis NaOdludzie umożliwia publikowanie i wyszukiwanie ofert noclegowych typu off-grid.</li>
                <li>Korzystanie z serwisu oznacza akceptację niniejszego regulaminu.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">§2. Definicje</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>
                  <strong>Serwis</strong> - platforma internetowa NaOdludzie.pl
                </li>
                <li>
                  <strong>Użytkownik</strong> - osoba korzystająca z serwisu
                </li>
                <li>
                  <strong>Gospodarz</strong> - użytkownik publikujący oferty noclegowe
                </li>
                <li>
                  <strong>Gość</strong> - użytkownik poszukujący noclegów
                </li>
                <li>
                  <strong>Rezerwacja</strong> - zgłoszenie chęci wynajmu obiektu
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">§3. Rejestracja i konto użytkownika</h2>
              <ol className="list-decimal list-inside text-muted-foreground space-y-2">
                <li>Rejestracja w serwisie jest bezpłatna.</li>
                <li>Użytkownik zobowiązany jest do podania prawdziwych danych podczas rejestracji.</li>
                <li>Każdy użytkownik może posiadać tylko jedno konto.</li>
                <li>Użytkownik odpowiada za bezpieczeństwo swojego hasła i konta.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">§4. Zasady dla gospodarzy</h2>
              <ol className="list-decimal list-inside text-muted-foreground space-y-2">
                <li>Publikowanie ofert jest bezpłatne.</li>
                <li>Serwis nie pobiera prowizji od rezerwacji.</li>
                <li>Gospodarz zobowiązany jest do publikowania prawdziwych i aktualnych informacji o obiektach.</li>
                <li>Zdjęcia obiektów muszą być zgodne ze stanem faktycznym.</li>
                <li>Gospodarz samodzielnie ustala ceny i warunki rezerwacji.</li>
                <li>Ogłoszenie jest aktywne przez 60 dni od momentu publikacji.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">§5. Zasady dla gości</h2>
              <ol className="list-decimal list-inside text-muted-foreground space-y-2">
                <li>
                  Gość może składać zapytania rezerwacyjne po zarejestrowaniu się w serwisie lub jako niezalogowany
                  użytkownik.
                </li>
                <li>Zalogowani użytkownicy otrzymują zniżkę na ceny noclegów.</li>
                <li>Gość zobowiązany jest do przestrzegania zasad ustalonych przez gospodarza.</li>
                <li>Wszelkie rozliczenia finansowe odbywają się bezpośrednio między gościem a gospodarzem.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">§6. Rezerwacje</h2>
              <ol className="list-decimal list-inside text-muted-foreground space-y-2">
                <li>Zapytanie rezerwacyjne nie stanowi gwarancji rezerwacji.</li>
                <li>Gospodarz ma prawo zaakceptować lub odrzucić zapytanie rezerwacyjne.</li>
                <li>
                  Szczegóły rezerwacji, w tym sposób płatności, ustalane są bezpośrednio między gościem a gospodarzem.
                </li>
                <li>Serwis nie ponosi odpowiedzialności za niewywiązanie się stron z ustaleń.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">§7. Odpowiedzialność</h2>
              <ol className="list-decimal list-inside text-muted-foreground space-y-2">
                <li>Serwis pełni rolę platformy łączącej gospodarzy z gośćmi.</li>
                <li>Serwis nie jest stroną umów zawieranych między użytkownikami.</li>
                <li>Serwis nie ponosi odpowiedzialności za jakość usług świadczonych przez gospodarzy.</li>
                <li>Serwis nie ponosi odpowiedzialności za treści publikowane przez użytkowników.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">§8. Zakazane działania</h2>
              <p className="text-muted-foreground mb-2">Zabrania się:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Publikowania treści niezgodnych z prawem lub naruszających dobre obyczaje</li>
                <li>Podawania fałszywych informacji</li>
                <li>Korzystania z serwisu w sposób naruszający prawa innych użytkowników</li>
                <li>Podejmowania działań mogących zakłócić funkcjonowanie serwisu</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">§9. Reklamacje</h2>
              <ol className="list-decimal list-inside text-muted-foreground space-y-2">
                <li>
                  Reklamacje dotyczące funkcjonowania serwisu można składać za pośrednictwem formularza kontaktowego.
                </li>
                <li>Reklamacje rozpatrywane są w terminie 14 dni roboczych.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">§10. Postanowienia końcowe</h2>
              <ol className="list-decimal list-inside text-muted-foreground space-y-2">
                <li>Administrator zastrzega sobie prawo do zmiany regulaminu.</li>
                <li>O zmianach regulaminu użytkownicy będą informowani za pośrednictwem serwisu.</li>
                <li>W sprawach nieuregulowanych regulaminem stosuje się przepisy prawa polskiego.</li>
              </ol>
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

export default Terms;
