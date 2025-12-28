import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Imię musi mieć co najmniej 2 znaki")
    .max(100, "Imię może mieć maksymalnie 100 znaków"),
  email: z.string().trim().email("Nieprawidłowy adres e-mail").max(255, "Email może mieć maksymalnie 255 znaków"),
  subject: z
    .string()
    .trim()
    .min(5, "Temat musi mieć co najmniej 5 znaków")
    .max(200, "Temat może mieć maksymalnie 200 znaków"),
  message: z
    .string()
    .trim()
    .min(10, "Wiadomość musi mieć co najmniej 10 znaków")
    .max(2000, "Wiadomość może mieć maksymalnie 2000 znaków"),
});

type ContactFormData = z.infer<typeof contactSchema>;

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: data,
      });

      if (error) throw error;

      toast.success("Wiadomość została wysłana! Odpowiemy najszybciej jak to możliwe.");
      form.reset();
    } catch (error) {
      console.error("Error sending contact form:", error);
      toast.error("Wystąpił błąd podczas wysyłania wiadomości. Spróbuj ponownie później.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold mb-4 text-foreground">Kontakt</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Masz pytania? Chętnie pomożemy! Skontaktuj się z nami za pomocą poniższego formularza.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Contact Info Cards */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">E-mail</h3>
                    <p className="text-sm text-muted-foreground">kontakt@naodludzie.pl</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Infolinia Pon-Pt 8-18</h3>
                    <p className="text-sm text-muted-foreground">+48 603 165 603</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Biuro</h3>
                    <p className="text-sm text-muted-foreground">Środa Śląska, Wiśniowa 5</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Wyślij wiadomość</CardTitle>
                  <CardDescription>Wypełnij formularz, a odpowiemy najszybciej jak to możliwe.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Imię</FormLabel>
                              <FormControl>
                                <Input placeholder="Jan Kowalski" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>E-mail</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="jan@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Temat</FormLabel>
                            <FormControl>
                              <Input placeholder="W czym możemy pomóc?" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Wiadomość</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Opisz swoją sprawę..."
                                className="min-h-[150px] resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                        {isSubmitting ? (
                          "Wysyłanie..."
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Wyślij wiadomość
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Contact;
