import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const HostTerms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-12">
        <div className="max-w-3xl mx-auto">
          <Link to="/host/dashboard">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Wróć do panelu
            </Button>
          </Link>

          <h1 className="font-display text-3xl font-bold mb-8">
            Regulamin przyjmowania płatności online dla Hostów
          </h1>

          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p className="lead">
              Niniejszy regulamin określa zasady przyjmowania płatności online przez osoby oferujące 
              wynajem nieruchomości (Hosty) w serwisie NaOdludzie.
            </p>

            <h2>§1. Definicje</h2>
            <ol>
              <li><strong>Serwis</strong> - platforma NaOdludzie dostępna pod adresem naodludzie.pl</li>
              <li><strong>Operator</strong> - K1 GROUP sp. z o.o. z siedzibą w Środzie Śląskiej</li>
              <li><strong>Host</strong> - osoba fizyczna lub prawna oferująca wynajem nieruchomości</li>
              <li><strong>Gość</strong> - osoba dokonująca rezerwacji nieruchomości</li>
              <li><strong>Płatność online</strong> - płatność realizowana przez system Stripe lub przelew bankowy</li>
            </ol>

            <h2>§2. Warunki włączenia płatności online</h2>
            <ol>
              <li>Host może włączyć płatności online po spełnieniu jednego z warunków:
                <ul>
                  <li>Połączenie konta Stripe Connect, lub</li>
                  <li>Wykonanie przelewu weryfikacyjnego na kwotę 1 zł</li>
                </ul>
              </li>
              <li>Weryfikacja przelewu następuje w ciągu 2 dni roboczych.</li>
              <li>Po weryfikacji Operator aktywuje płatności online dla ofert Hosta.</li>
            </ol>

            <h2>§3. Prowizja i rozliczenia</h2>
            <ol>
              <li>Prowizja od rezerwacji online wynosi 5% wartości rezerwacji brutto.</li>
              <li>Prowizja jest potrącana automatycznie przed wypłatą środków Hostowi.</li>
              <li>Wypłaty dla Hostów korzystających ze Stripe Connect są realizowane automatycznie.</li>
              <li>Wypłaty dla Hostów zweryfikowanych przelewem są realizowane:
                <ul>
                  <li>Po zakończeniu pobytu Gościa</li>
                  <li>W ciągu 7 dni roboczych od zakończenia pobytu</li>
                  <li>Na konto bankowe podane przez Hosta</li>
                </ul>
              </li>
            </ol>

            <h2>§4. Anulowanie i zwroty</h2>
            <ol>
              <li>Polityka anulowania jest ustalana indywidualnie przez każdego Hosta.</li>
              <li>W przypadku anulowania rezerwacji przez Gościa:
                <ul>
                  <li>Zwrot następuje zgodnie z polityką anulowania Hosta</li>
                  <li>Prowizja Operatora nie podlega zwrotowi</li>
                </ul>
              </li>
              <li>W przypadku anulowania rezerwacji przez Hosta:
                <ul>
                  <li>Gość otrzymuje pełny zwrot płatności</li>
                  <li>Host może zostać obciążony opłatą administracyjną</li>
                </ul>
              </li>
            </ol>

            <h2>§5. Obowiązki Hosta</h2>
            <ol>
              <li>Host zobowiązuje się do:
                <ul>
                  <li>Rzetelnego opisywania oferowanych nieruchomości</li>
                  <li>Utrzymywania aktualnego kalendarza dostępności</li>
                  <li>Honorowania potwierdzonych rezerwacji</li>
                  <li>Zapewnienia standardu zgodnego z opisem oferty</li>
                </ul>
              </li>
              <li>Host ponosi odpowiedzialność za wszelkie roszczenia Gości wynikające z niezgodności oferty z rzeczywistością.</li>
            </ol>

            <h2>§6. Odpowiedzialność Operatora</h2>
            <ol>
              <li>Operator pośredniczy wyłącznie w procesie płatności.</li>
              <li>Operator nie ponosi odpowiedzialności za:
                <ul>
                  <li>Stan nieruchomości oferowanych przez Hostów</li>
                  <li>Niewykonanie lub nienależyte wykonanie usług przez Hosta</li>
                  <li>Spory między Hostem a Gościem</li>
                </ul>
              </li>
            </ol>

            <h2>§7. Dane osobowe</h2>
            <ol>
              <li>Administratorem danych osobowych jest K1 GROUP sp. z o.o.</li>
              <li>Dane są przetwarzane w celu realizacji usług płatności online.</li>
              <li>Szczegóły przetwarzania danych określa <Link to="/polityka-prywatnosci">Polityka Prywatności</Link>.</li>
            </ol>

            <h2>§8. Postanowienia końcowe</h2>
            <ol>
              <li>Operator zastrzega sobie prawo do zmiany niniejszego regulaminu.</li>
              <li>O zmianach Host zostanie poinformowany drogą mailową.</li>
              <li>W sprawach nieuregulowanych zastosowanie mają przepisy prawa polskiego.</li>
              <li>Regulamin wchodzi w życie z dniem publikacji.</li>
            </ol>

            <p className="text-sm text-muted-foreground mt-8">
              Ostatnia aktualizacja: grudzień 2024
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HostTerms;