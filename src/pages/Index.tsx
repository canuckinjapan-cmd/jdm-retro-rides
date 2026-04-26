import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Search,
  ShieldCheck,
  Ship,
  Key,
  Gauge,
  Cog,
  MapPin,
  ArrowRight,
  Star,
  Phone,
  ZoomIn,
  Info,
} from "lucide-react";
import heroImg from "@/assets/hero-jdm.jpg";
import auctionLane from "@/assets/auction-lane.jpg";
import SiteNav from "@/components/SiteNav";
import ContactForm from "@/components/ContactForm";
import FacebookIcon from "@/components/icons/FacebookIcon";
import { inventory, statusStyles, Vehicle } from "@/data/inventory";
import { useCurrency } from "@/contexts/CurrencyContext";
import SlideshowModal from "@/components/SlideshowModal";
import { VehicleDetailsOverlay } from "@/components/VehicleDetailsOverlay";
import { db, collection, getDocs, query, where, orderBy } from "@/lib/firebase";

const FACEBOOK_URL = "https://www.facebook.com/";

const steps = [
  {
    n: "01",
    icon: Search,
    title: "Tell us what you want",
    body: "Send your wish-list — chassis, year, budget. We confirm what's realistic and what to expect on the lanes.",
  },
  {
    n: "02",
    icon: ShieldCheck,
    title: "We bid at the auctions",
    body: "Our team is on the floor at USS, JU and TAA every week. Auction sheets translated, every car inspected in person.",
  },
  {
    n: "03",
    icon: Cog,
    title: "Compliance & prep",
    body: "Deregistration, export documents, JEVIC inspection, shipping — handled. You receive weekly photo updates.",
  },
  {
    n: "04",
    icon: Ship,
    title: "Delivered to your door",
    body: "RoRo or container to UK, Australia or your nearest port. We stay with the car until the keys are in your hand.",
  },
];

const Index = () => {
  const { convertPrice, currency } = useCurrency();
  const heroImgRef = useRef<HTMLImageElement | null>(null);
  const [scrollY, setScrollY] = useState(0);

  const [slideshowImages, setSlideshowImages] = useState<string[]>([]);
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null);
  const [featuredVehicles, setFeaturedVehicles] = useState<Vehicle[]>(inventory.slice(0, 4));

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const q = query(
          collection(db, "vehicles"), 
          where("featured", "==", true),
          orderBy("featuredOrder", "asc")
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
        if (list.length > 0) {
          setFeaturedVehicles(list);
        }
      } catch (error) {
        console.error("Error fetching featured vehicles:", error);
      }
    };
    fetchFeatured();
  }, []);

  useEffect(() => {
    if (!activeVehicle) return;
    const handleClose = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('article')) setActiveVehicle(null);
    };
    document.addEventListener('mousedown', handleClose);
    return () => {
      document.removeEventListener('mousedown', handleClose);
    };
  }, [activeVehicle]);

  const openSlideshow = (images?: string[]) => {
    if (!images || images.length === 0) return;
    setSlideshowImages(images);
    setSlideshowOpen(true);
  };

  // Subtle parallax on the hero background image
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      {/* HERO */}
      <section className="relative min-h-[100svh] flex items-end overflow-hidden grain">
        <img
          ref={heroImgRef}
          src={heroImg}
          alt="Vintage Nissan Skyline GT-R parked in a Japanese warehouse at night"
          className="absolute inset-0 w-full h-[120%] object-cover will-change-transform"
          style={{
            transform: `translate3d(0, ${scrollY * 0.3}px, 0) scale(1.05)`,
          }}
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 bg-background/30" />

        <div className="relative max-w-7xl mx-auto px-6 pb-20 pt-32 w-full">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="h-px w-10 bg-bronze" />
              <span className="mono text-xs uppercase tracking-[0.3em] text-bronze">
                Since 1994 · Nagoya, Japan
              </span>
            </div>
            <h1 className="font-display text-5xl sm:text-7xl md:text-8xl leading-[0.9] mb-6">
              30+ Years Inside <br />
              Japan's Auctions. <br />
              <span className="text-bronze">Shipped to your driveway.</span>
            </h1>
            <p className="text-lg text-foreground/80 max-w-xl mb-10">
              British-run, Japan-based. We hand-source legendary JDM classics from USS, JU and
              TAA — translated, inspected and exported to the UK, Australia and beyond.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                asChild
                size="lg"
                className="bg-bronze hover:bg-primary/90 text-primary-foreground font-medium rounded-sm gap-2 h-12 px-8"
              >
                <Link to="/inventory">
                  Browse Inventory <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-foreground/30 text-foreground hover:border-bronze hover:text-bronze hover:bg-bronze/10 rounded-sm h-12 px-8 gap-2 transition-colors"
              >
                <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
                  <FacebookIcon className="w-4 h-4" /> Facebook
                </a>
              </Button>
            </div>

            {/* Trust strip */}
            <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl">
              {[
                [<AnimatedNumber key="num1" value={30} suffix="+" />, "Years exporting"],
                [<AnimatedNumber key="num2" value={1200} suffix="+" />, "Cars delivered"],
                ["USS / JU", "Auction access"],
                ["UK · AU", "Primary markets"],
              ].map(([k, v]) => (
                <div key={v as string} className="border-l border-bronze/40 pl-3">
                  <div className="font-display text-3xl text-bronze">{k}</div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{v as string}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 right-6 hidden md:flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          <span>Scroll</span>
          <span className="h-px w-12 bg-muted-foreground/50" />
        </div>
      </section>

      {/* INVENTORY */}
      <section id="inventory" className="py-24 sm:py-32 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="h-px w-10 bg-bronze" />
                <span className="mono text-xs uppercase tracking-[0.3em] text-bronze">
                  Current Inventory
                </span>
              </div>
              <h2 className="font-display text-5xl md:text-6xl leading-none">
                On the floor <br />
                <span className="text-bronze">in Nagoya.</span>
              </h2>
            </div>
            <p className="text-muted-foreground max-w-md">
              A live, hand-picked selection. Every car personally inspected, with full auction
              sheets and translated reports available on request.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-8">
            {featuredVehicles.map((c, index) => {
              const isLeft2Col = index % 2 === 0;
              return (
                <article
                  key={c.id}
                  className="group gradient-card border border-border rounded-sm shadow-deep hover:border-bronze/50 transition-all duration-500 relative scroll-mt-24"
                >
                  {!activeVehicle || activeVehicle.id !== c.id ? (
                  <>
                    <div
                      className={`relative aspect-[16/10] overflow-hidden bg-secondary group/main ${
                        c.images && c.images.length > 0 ? "cursor-pointer" : ""
                      }`}
                      onClick={() => openSlideshow(c.images || [c.img])}
                    >
                      <img
                        src={c.images ? c.images[0] : c.img}
                        alt={`${c.year} ${c.name}`}
                        loading="lazy"
                        width={1280}
                        height={800}
                        className="w-full h-full object-cover transition-transform duration-700 lg:group-hover/main:scale-105"
                      />
                      {c.images && c.images.length > 0 && (
                        <div className="absolute inset-0 pointer-events-none">
                          <ZoomIn className="text-white opacity-0 group-hover/main:opacity-100 w-10 h-10 transition-opacity absolute top-4 right-4 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]" />
                        </div>
                      )}
                      <div className="absolute top-4 left-4 flex gap-2">
                        <Badge
                          variant="outline"
                          className={`rounded-sm uppercase tracking-wider text-[10px] font-mono ${statusStyles[c.status]}`}
                        >
                          {c.status}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="rounded-sm uppercase tracking-wider text-[10px] font-mono bg-background/60 backdrop-blur-sm border-border text-foreground/80"
                        >
                          {c.grade}
                        </Badge>
                      </div>
                      <div className="absolute bottom-4 right-4 mono text-xs px-2 py-1 bg-background/70 backdrop-blur-sm border border-border rounded-sm">
                        {c.chassis}
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4 mb-5">
                        <div>
                          <div className="mono text-xs text-bronze tracking-wider mb-1">{c.year}</div>
                          <h3 className="font-display text-3xl leading-none">{c.name}</h3>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex flex-col items-end">
                            <span>Price {currency !== 'JPY' && '· Approx'}</span>
                          </div>
                          <div className="font-display text-2xl text-bronze">{convertPrice(c.priceJPY).formatted}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm mb-6 pt-5 border-t border-border">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Gauge className="w-4 h-4 text-bronze" /> {c.mileage}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Cog className="w-4 h-4 text-bronze" /> {c.transmission}
                        </div>
                        <div className="mono text-[11px] text-muted-foreground tracking-wider uppercase col-span-1">
                          {c.displacementLabel}
                        </div>
                        <div className="mono text-[11px] text-muted-foreground tracking-wider uppercase col-span-1">
                          {c.stockNumber ? `Stock: ${c.stockNumber}` : ""}
                        </div>
                      </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            variant="outline"
                            className="flex-1 rounded-sm border-border hover:border-bronze hover:bg-bronze/10 hover:text-bronze transition-colors h-11"
                            onClick={(e) => {
                              const article = e.currentTarget.closest('article');
                              if (article) article.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              setActiveVehicle(c);
                            }}
                          >
                            <Info className="w-4 h-4 mr-2 hidden md:block" />
                            View Details
                          </Button>
                          <Button
                            asChild
                            className="flex-1 rounded-sm gradient-bronze hover:opacity-90 transition-opacity h-11 border-0 text-white"
                            disabled={c.status === "SOLD"}
                          >
                            <Link to="/#contact">
                              <Mail className="w-4 h-4 mr-2 hidden md:block" />
                              {c.status === "SOLD" ? "Sold" : "Enquire"}
                            </Link>
                          </Button>
                        </div>
                    </div>
                  </>
                ) : (
                  <VehicleDetailsOverlay 
                    vehicle={c} 
                    onClose={() => setActiveVehicle(null)} 
                    className={`
                      fixed inset-0 z-[100] rounded-none md:rounded-sm
                      md:absolute md:inset-auto md:top-0 md:h-full md:z-30
                      ${isLeft2Col ? 'md:left-0 md:w-[calc(200%+2rem)]' : 'md:left-[calc(-100%-2rem)] md:w-[calc(200%+2rem)]'}
                      md:landscape:inset-0 md:landscape:left-0 md:landscape:w-full md:landscape:h-full
                      lg:inset-0 lg:left-0 lg:w-full lg:h-full
                    `}
                  />
                )}
              </article>
            );
          })}
          </div>

          <div className="mt-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="text-sm text-foreground/60 italic">
              *Converted prices are estimates based on daily rates. Final transaction in JPY.
            </div>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-sm border-bronze text-bronze hover:bg-bronze hover:text-primary-foreground transition-colors gap-2 h-12 px-8"
            >
              <Link to="/inventory">
                See all vehicles <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-24 bg-secondary/40 border-y border-border">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
                About · Since 1994
              </span>
            </div>
            <h2 className="font-display text-5xl md:text-6xl leading-tight mb-8">
              A British specialist,<br /> <span className="text-bronze">rooted in Japan.</span>
            </h2>
          </div>
          <div className="max-w-xl space-y-6 text-foreground/80 leading-relaxed text-lg pt-2 lg:pt-12">
            <p>
              We've been exporting cars from Japan since 1994. British-owned and based at the
              auction floor, our access is what three decades of reputation buys: full membership
              across USS, TAA, CAA, JU and more — and the relationships that get the right car, at the
              right price, shipped on the right date.
            </p>
            <p>
              We don't stock a huge yard. We <em className="text-bronze not-italic">buy to order</em> — because the best cars for our clients
              rarely sit on forecourts. Every vehicle is supplied with auction report, service history and
              a landed-cost quote in GBP or AUD. No surprises.
            </p>
            <div className="grid grid-cols-2 gap-8 pt-8 mt-8 border-t border-border">
              <div>
                <div className="mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">UK DELIVERY</div>
                <div className="font-mono text-sm">Full RORO & container</div>
              </div>
              <div>
                <div className="mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">COMPLIANCE</div>
                <div className="font-mono text-sm">Guided end-to-end</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="process" className="py-24 sm:py-32 bg-secondary/30 relative overflow-hidden grain">
        <div className="absolute inset-0 opacity-10">
          <img src={auctionLane} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-10 bg-bronze" />
              <span className="mono text-xs uppercase tracking-[0.3em] text-bronze">
                The Process
              </span>
            </div>
            <h2 className="font-display text-5xl md:text-6xl leading-none mb-6">
              From a Tokyo lane <br />
              <span className="text-bronze">to your garage.</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              You're not buying off a forecourt. You're hiring 30 years of Japanese-market
              expertise to find, vet and ship the right car — without the guesswork.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-sm overflow-hidden border border-border">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.n}
                  className="bg-background p-8 group hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-8">
                    <span className="font-display text-5xl text-bronze/30 group-hover:text-bronze transition-colors">
                      {s.n}
                    </span>
                    <div className="w-12 h-12 rounded-sm border border-bronze/40 flex items-center justify-center text-bronze">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="font-display text-2xl mb-3 leading-tight">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-20 grid md:grid-cols-3 gap-8">
            {[
              {
                icon: MapPin,
                t: "On the ground in Japan",
                b: "Office in Nagoya. We attend auctions in person — no remote middlemen.",
              },
              {
                icon: ShieldCheck,
                t: "Translated auction sheets",
                b: "Every grade, every note. You see what we see, in plain English.",
              },
              {
                icon: Key,
                t: "Door-to-door logistics",
                b: "Compliance, shipping and delivery handled end-to-end.",
              },
            ].map(({ icon: Icon, t, b }) => (
              <div key={t} className="flex gap-4 p-6 border border-border rounded-sm bg-background/60">
                <Icon className="w-6 h-6 text-bronze shrink-0 mt-1" />
                <div>
                  <div className="font-medium mb-1">{t}</div>
                  <div className="text-sm text-muted-foreground">{b}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 bg-secondary/40 border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-4">
              <span className="mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Client Words
              </span>
            </div>
            <h2 className="font-display text-5xl md:text-6xl leading-tight">
              Thirty years of driveways.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-background border border-border group overflow-hidden">
              <div className="aspect-[4/3] overflow-hidden">
                <img 
                  src="https://carniche.co.jp/wp-content/uploads/2026/01/1989-Nissan-GTR-wht.jpg" 
                  alt="1989 Skyline GT-R" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 group-hover:duration-700 ease-out" 
                />
              </div>
              <div className="p-8">
                <div className="mono text-[10px] uppercase tracking-wider text-muted-foreground mb-4">
                  1989 Skyline GT-R
                </div>
                <p className="text-xl mb-8 leading-relaxed font-serif text-foreground/90">
                  "Seamless. They found a Grade 4.5 R32 that exceeded my expectations. Communication through shipping was top-notch."
                </p>
                <div className="flex items-center justify-between text-xs tracking-wider text-muted-foreground mono mt-auto uppercase">
                  <span>Marcus Thorne</span>
                  <span className="flex items-center gap-2"><span className="text-sm">🇬🇧</span> United Kingdom</span>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-background border border-border group overflow-hidden">
              <div className="aspect-[4/3] overflow-hidden">
                <img 
                  src="https://carniche.co.jp/wp-content/uploads/2026/01/1994-Honda-Beat-red.jpg" 
                  alt="1994 Honda Beat" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ease-out" 
                />
              </div>
              <div className="p-8">
                <div className="mono text-[10px] uppercase tracking-wider text-muted-foreground mb-4">
                  1994 Honda Beat
                </div>
                <p className="text-xl mb-8 leading-relaxed font-serif text-foreground/90">
                  "My first import. Detailed auction reports and all logistics in Japan handled for me — on the driveway in Manchester without a hitch."
                </p>
                <div className="flex items-center justify-between text-xs tracking-wider text-muted-foreground mono mt-auto uppercase">
                  <span>Elena Rodriguez</span>
                  <span className="flex items-center gap-2"><span className="text-sm">🇬🇧</span> United Kingdom</span>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-background border border-border group overflow-hidden">
              <div className="aspect-[4/3] overflow-hidden">
                <img 
                  src="https://carniche.co.jp/wp-content/uploads/2026/02/2018-Impressa-WRX-Sti-blue.jpg" 
                  alt="2018 WRX STI" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ease-out" 
                />
              </div>
              <div className="p-8 flex flex-col h-[calc(100%-75%)]">
                <div className="mono text-[10px] uppercase tracking-wider text-muted-foreground mb-4">
                  2018 WRX STI
                </div>
                <p className="text-xl mb-8 leading-relaxed font-serif text-foreground/90">
                  "Pristine STI via their auction access. Arrived in Melbourne exactly as described. Professional from first email to delivery."
                </p>
                <div className="flex items-center justify-between text-xs tracking-wider text-muted-foreground mono mt-auto uppercase">
                  <span>James Chen</span>
                  <span className="flex items-center gap-2"><span className="text-sm">🇦🇺</span> Australia</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-24 bg-secondary/40 border-y border-border scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-start">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-10 bg-bronze" />
              <span className="mono text-xs uppercase tracking-[0.3em] text-bronze">
                Contact Us
              </span>
            </div>
            <h2 className="font-display text-5xl md:text-6xl leading-none mb-6">
              Got a car <br />
              <span className="text-bronze">in mind?</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Tell us the chassis code and your budget. We'll come back within 24 hours with
              what's on the lanes this week.
            </p>

            <div className="space-y-4">
              <a
                href="tel:+8152XXXXXXX"
                className="flex items-center gap-3 text-foreground/90 hover:text-bronze transition-colors"
              >
                <Phone className="w-5 h-5 text-bronze" />
                <span className="mono text-sm">+81 (0) 52-XXX-XXXX</span>
              </a>
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-foreground/90 hover:text-bronze transition-colors"
              >
                <FacebookIcon className="w-5 h-5" />
                <span className="text-sm">Follow us on Facebook</span>
              </a>
              <div className="mono text-xs text-muted-foreground pt-2">
                JST 09:00 — 18:00 · Replies in English
              </div>
            </div>
          </div>

          <div className="border border-border rounded-sm bg-background/60 p-6 md:p-8 shadow-deep">
            <ContactForm />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-background py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm gradient-bronze flex items-center justify-center font-display text-primary-foreground text-sm">
              JDM
            </div>
            <span className="font-display tracking-wider">JDM RETRO RIDES</span>
          </div>
          <div className="mono text-xs uppercase tracking-[0.3em] text-muted-foreground text-center">
            Nagoya · Japan · British-Owned · Est. 1994
          </div>
          <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} JDM Retro Rides</div>
        </div>
      </footer>
      <SlideshowModal
        images={slideshowImages}
        initialIndex={0}
        isOpen={slideshowOpen}
        onClose={() => setSlideshowOpen(false)}
      />
    </div>
  );
};

export default Index;
