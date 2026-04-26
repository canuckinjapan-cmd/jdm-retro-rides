import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight } from "lucide-react";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  subject: z.string().trim().max(150).optional(),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

interface ContactFormProps {
  defaultSubject?: string;
  compact?: boolean;
}

const ContactForm = ({ defaultSubject = "", compact = false }: ContactFormProps) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState({
    name: "",
    email: "",
    subject: defaultSubject,
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(values);
    if (!result.success) {
      toast({
        title: "Please check the form",
        description: result.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    // Placeholder — wire to backend (Lovable Cloud) when ready
    setTimeout(() => {
      setSubmitting(false);
      toast({
        title: "Message sent",
        description: "We'll reply within 24 hours (JST business hours).",
      });
      setValues({ name: "", email: "", subject: defaultSubject, message: "" });
    }, 600);
  };

  const labelCls =
    "block text-[10px] font-bold text-bronze tracking-[0.2em] uppercase mb-2";
  const inputCls =
    "w-full bg-background/60 border-border rounded-sm focus-visible:ring-bronze";

  return (
    <form onSubmit={handleSubmit} className={compact ? "space-y-4" : "space-y-5"}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cf-name" className={labelCls}>Full Name</Label>
          <Input
            id="cf-name"
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            placeholder="John Doe"
            maxLength={100}
            required
            className={inputCls}
          />
        </div>
        <div>
          <Label htmlFor="cf-email" className={labelCls}>Email Address</Label>
          <Input
            id="cf-email"
            type="email"
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
            placeholder="john@example.com"
            maxLength={255}
            required
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="cf-subject" className={labelCls}>Interested Vehicle / Subject</Label>
        <Input
          id="cf-subject"
          value={values.subject}
          onChange={(e) => setValues({ ...values, subject: e.target.value })}
          placeholder="e.g. 1992 Nissan Skyline R32"
          maxLength={150}
          className={inputCls}
        />
      </div>
      <div>
        <Label htmlFor="cf-message" className={labelCls}>Your Message</Label>
        <Textarea
          id="cf-message"
          value={values.message}
          onChange={(e) => setValues({ ...values, message: e.target.value })}
          placeholder="Tell us chassis code, budget and timeframe..."
          maxLength={2000}
          required
          className={`${inputCls} min-h-[140px]`}
        />
      </div>
      <Button
        type="submit"
        size="lg"
        disabled={submitting}
        className="w-full justify-between bg-bronze hover:bg-primary/90 text-primary-foreground rounded-sm h-12 text-base"
      >
        <span>{submitting ? "Sending..." : "Send Enquiry"}</span>
        <ArrowRight className="w-5 h-5" />
      </Button>
    </form>
  );
};

export default ContactForm;
