import { Mail, Settings, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, checkIsAdmin } from "@/lib/firebase";
import { useCurrency, CurrencyCode } from "@/contexts/CurrencyContext";

const CURRENCIES: CurrencyCode[] = ['GBP', 'AUD', 'JPY', 'USD'];

const SiteNav = () => {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const { currency, setCurrency } = useCurrency();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const status = await checkIsAdmin(user);
        setIsAdmin(status);
      } else {
        setIsAdmin(false);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/70 border-b border-border/50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-sm gradient-bronze flex items-center justify-center font-display text-primary-foreground text-lg">
            JDM
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg tracking-wider">JDM RETRO RIDES</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hidden md:block">
              Est. Japan · British-Owned
            </div>
          </div>
        </Link>
        <nav className="hidden lg:flex items-center gap-8 text-sm font-medium">
          <Link to="/" className="hover:text-bronze transition-colors">
            Home
          </Link>
          <Link to="/inventory" className="hover:text-bronze transition-colors">
            Inventory
          </Link>
          <Link to="/#about" className="hover:text-bronze transition-colors">
            About
          </Link>
          <Link to="/#process" className="hover:text-bronze transition-colors">
            Process
          </Link>
          <Link to="/#contact" className="hover:text-bronze transition-colors">
            Contact
          </Link>
          {isAdmin && (
            <Link to="/admin" className="text-bronze hover:text-bronze/80 transition-colors flex items-center gap-2">
              <Settings className="w-4 h-4" /> Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center rounded-sm border border-border bg-background/50 overflow-hidden text-xs">
            {CURRENCIES.map(code => (
              <button
                key={code}
                onClick={() => setCurrency(code)}
                className={`px-3 py-2 transition-colors ${
                  currency === code 
                    ? 'bg-bronze text-primary-foreground font-medium' 
                    : 'hover:bg-foreground/5'
                }`}
              >
                {code}
              </button>
            ))}
          </div>
          <Button
            asChild
            className="hidden sm:flex bg-bronze hover:bg-primary/90 text-primary-foreground font-medium rounded-sm gap-2"
          >
            <Link to="/#contact">
              <Mail className="w-4 h-4" /> Enquire
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-foreground hover:bg-transparent hover:text-bronze"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-16 left-0 right-0 bg-background border-b border-border/50 p-6 flex flex-col gap-6 shadow-xl">
          <nav className="flex flex-col gap-4 text-lg font-medium">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="hover:text-bronze transition-colors">Home</Link>
            <Link to="/inventory" onClick={() => setMobileMenuOpen(false)} className="hover:text-bronze transition-colors">Inventory</Link>
            <Link to="/#about" onClick={() => setMobileMenuOpen(false)} className="hover:text-bronze transition-colors">About</Link>
            <Link to="/#process" onClick={() => setMobileMenuOpen(false)} className="hover:text-bronze transition-colors">Process</Link>
            <Link to="/#contact" onClick={() => setMobileMenuOpen(false)} className="hover:text-bronze transition-colors">Contact</Link>
            {isAdmin && (
              <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="text-bronze hover:text-bronze/80 transition-colors flex items-center gap-2">
                <Settings className="w-5 h-5" /> Admin
              </Link>
            )}
          </nav>
          
          <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
            {CURRENCIES.map(code => (
              <button
                key={code}
                onClick={() => { setCurrency(code); setMobileMenuOpen(false); }}
                className={`px-4 py-2 text-sm rounded-sm transition-colors border flex-1 ${
                  currency === code 
                    ? 'border-bronze bg-bronze/10 text-bronze font-medium' 
                    : 'border-border bg-background hover:bg-foreground/5'
                }`}
              >
                {code}
              </button>
            ))}
          </div>
          
          <Button
            asChild
            className="w-full sm:hidden bg-bronze hover:bg-primary/90 text-primary-foreground font-medium rounded-sm gap-2 h-12"
          >
            <Link to="/#contact" onClick={() => setMobileMenuOpen(false)}>
              <Mail className="w-4 h-4" /> Enquire
            </Link>
          </Button>
        </div>
      )}
    </header>
  );
};

export default SiteNav;
