import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Mail, Sparkles, Check } from "lucide-react";

const emailSchema = z.string().email("Podaj poprawny adres email");

export const FooterNewsletter = () => {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      toast({
        title: "Nieprawidłowy email",
        description: "Podaj poprawny adres email.",
        variant: "destructive",
      });
      return;
    }

    if (!consent) {
      toast({
        title: "Wymagana zgoda",
        description: "Zaakceptuj zgodę na przetwarzanie danych.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("newsletter_subscribers").insert({
        email: email.trim().toLowerCase(),
        source: "footer",
      });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Email już zapisany",
            description: "Ten adres email jest już w naszej bazie.",
          });
        } else {
          throw error;
        }
      } else {
        setIsSubscribed(true);
        toast({
          title: "Dziękujemy! 🎉",
          description: "Zostałeś zapisany do newslettera.",
        });
      }
    } catch (error) {
      console.error("Newsletter error:", error);
      toast({
        title: "Wystąpił błąd",
        description: "Spróbuj ponownie później.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubscribed) {
    return (
      <div className="flex items-center justify-center gap-3 p-6 rounded-xl bg-primary/10 border border-primary/20">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Check className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Jesteś zapisany! 🎉</p>
          <p className="text-sm text-muted-foreground">Dziękujemy za zaufanie.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Mail className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            Bądź na bieżąco!
          </h3>
          <p className="text-sm text-muted-foreground">Nowe domki i oferty prosto na Twój email</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Twój email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 bg-background/80"
            disabled={isSubmitting}
          />
          <Button type="submit" disabled={isSubmitting} size="default">
            {isSubmitting ? "..." : "Zapisz"}
          </Button>
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="footer-consent"
            checked={consent}
            onCheckedChange={(checked) => setConsent(checked === true)}
            disabled={isSubmitting}
            className="mt-0.5"
          />
          <label htmlFor="footer-consent" className="text-xs text-muted-foreground cursor-pointer leading-tight">
            Wyrażam zgodę na przetwarzanie moich danych w celu wysyłki newslettera
          </label>
        </div>
      </form>
    </div>
  );
};
