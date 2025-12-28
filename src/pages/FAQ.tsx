import { Header } from "@/components/Header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  {
    question: "Czym jest NaOdludzie?",
    answer: "NaOdludzie to platforma łącząca właścicieli unikalnych domków na odludziu z osobami szukającymi wyjątkowego wypoczynku z dala od zgiełku miasta. Oferujemy szeroki wybór domków w malowniczych lokalizacjach w całej Polsce."
  },
  {
    question: "Jak mogę zarezerwować domek?",
    answer: "Wybierz interesujący Cię domek, sprawdź dostępne terminy i wyślij zapytanie rezerwacyjne poprzez formularz na stronie domku. Właściciel otrzyma Twoje zgłoszenie i skontaktuje się z Tobą w celu potwierdzenia rezerwacji."
  },
  {
    question: "Czy muszę się rejestrować, aby dokonać rezerwacji?",
    answer: "Tak, rejestracja jest wymagana do wysłania zapytania rezerwacyjnego. Dzięki temu możesz śledzić status swoich rezerwacji i komunikować się z właścicielami domków."
  },
  {
    question: "Jak działa system rezerwacji?",
    answer: "Po wysłaniu zapytania rezerwacyjnego, właściciel domku otrzymuje powiadomienie i może zaakceptować lub odrzucić Twoją prośbę. Po akceptacji otrzymasz potwierdzenie z dalszymi instrukcjami dotyczącymi płatności i przyjazdu."
  },
  {
    question: "Czy mogę anulować rezerwację?",
    answer: "Polityka anulowania zależy od właściciela domku. Szczegóły znajdziesz w opisie każdego domku. W razie potrzeby skontaktuj się bezpośrednio z właścicielem poprzez czat w systemie."
  },
  {
    question: "Czy mogę zabrać ze sobą zwierzęta?",
    answer: "To zależy od konkretnego domku. Przy każdej ofercie znajdziesz informację, czy zwierzęta są akceptowane. Szukaj domków z ikoną zwierzaka lub użyj filtra 'Zwierzęta dozwolone'."
  },
  {
    question: "Jak mogę wystawić swój domek na NaOdludzie?",
    answer: "Zarejestruj się jako gospodarz, a następnie dodaj swój domek wypełniając formularz z opisem, zdjęciami i szczegółami oferty. Po weryfikacji przez nasz zespół, Twój domek pojawi się na platformie."
  },
  {
    question: "Ile kosztuje wystawienie domku?",
    answer: "Wystawienie domku na NaOdludzie jest bezpłatne. Szczegóły dotyczące ewentualnych prowizji znajdziesz w regulaminie serwisu."
  },
  {
    question: "Co to jest wskaźnik 'Off-Grid Score'?",
    answer: "Off-Grid Score to nasz unikalny wskaźnik pokazujący, jak bardzo dany domek jest odizolowany od cywilizacji. Im wyższy wynik, tym bardziej 'na odludziu' znajduje się domek. Uwzględniamy takie czynniki jak odległość od najbliższych sąsiadów, dostęp do internetu, czy źródło energii."
  },
  {
    question: "Jak mogę się skontaktować z obsługą?",
    answer: "Możesz skontaktować się z nami poprzez formularz kontaktowy na stronie lub wysyłając wiadomość na adres podany w zakładce 'Kontakt'."
  }
];

const FAQ = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-foreground mb-8 text-center">
          Najczęściej zadawane pytania
        </h1>
        
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqItems.map((item, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card border border-border rounded-lg px-6"
              >
                <AccordionTrigger className="text-left text-foreground hover:text-primary">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </main>
    </div>
  );
};

export default FAQ;
