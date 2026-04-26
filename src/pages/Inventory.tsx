import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Cog, Gauge, Search, ZoomIn, Info, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import SiteNav from "@/components/SiteNav";
import { inventory, statusStyles, Vehicle } from "@/data/inventory";
import { useCurrency } from "@/contexts/CurrencyContext";
import SlideshowModal from "@/components/SlideshowModal";
import { VehicleDetailsOverlay } from "@/components/VehicleDetailsOverlay";
import { db, collection, getDocs, query, orderBy } from "@/lib/firebase";

type MainSort = "stock-az" | "stock-za" | "featured" | "newest" | "oldest";
type PriceSort = "" | "high-low" | "low-high";
type DispSort = "" | "high-low" | "low-high";

const Inventory = () => {
  const { convertPrice, currency } = useCurrency();
  const [mainSort, setMainSort] = useState<MainSort>("stock-az");
  const [priceSort, setPriceSort] = useState<PriceSort>("");
  const [dispSort, setDispSort] = useState<DispSort>("");
  const [stockOnly, setStockOnly] = useState(false);
  const [queryTerm, setQueryTerm] = useState("");
  const [dbVehicles, setDbVehicles] = useState<Vehicle[]>(inventory);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const q = query(collection(db, "vehicles"), orderBy("stockNumber", "asc"));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
        if (list.length > 0) {
          setDbVehicles(list);
        }
      } catch (error) {
        console.error("Error fetching inventory:", error);
      }
    };
    fetchVehicles();
  }, []);

  const [slideshowImages, setSlideshowImages] = useState<string[]>([]);
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null);

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

  const visible = useMemo(() => {
    let list = [...dbVehicles];
    if (stockOnly) list = list.filter((v) => v.status === "AVAILABLE");
    if (queryTerm.trim()) {
      const q = queryTerm.toLowerCase();
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.chassis.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      if (mainSort === "stock-az") return (a.stockNumber || "").localeCompare(b.stockNumber || "");
      if (mainSort === "stock-za") return (b.stockNumber || "").localeCompare(a.stockNumber || "");
      if (mainSort === "newest") return b.year - a.year;
      if (mainSort === "oldest") return a.year - b.year;
      // featured: featured first
      const fa = a.featured ? 1 : 0;
      const fb = b.featured ? 1 : 0;
      if (fa !== fb) return fb - fa;
      
      // If both featured, sort by featuredOrder
      if (a.featured && b.featured) {
        return (a.featuredOrder || 0) - (b.featuredOrder || 0);
      }
      
      return 0;
    });
    if (priceSort === "high-low")
      list.sort((a, b) => b.priceJPY - a.priceJPY);
    if (priceSort === "low-high")
      list.sort((a, b) => a.priceJPY - b.priceJPY);
    if (dispSort === "high-low")
      list.sort((a, b) => b.displacementCc - a.displacementCc);
    if (dispSort === "low-high")
      list.sort((a, b) => a.displacementCc - b.displacementCc);

    return list;
  }, [mainSort, priceSort, dispSort, stockOnly, queryTerm]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      {/* Header */}
      <section className="pt-32 pb-12 border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="h-px w-10 bg-bronze" />
            <span className="mono text-xs uppercase tracking-[0.3em] text-bronze">
              Vehicles
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl leading-none mb-4">
            Current & Past <span className="text-bronze">Inventory</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Hand-picked from USS, JU and TAA auctions across Japan. Every
            vehicle inspected on the lane. Translated auction sheets available
            on request.
          </p>
        </div>
      </section>

      {/* Filter bar */}
      <section className="relative z-30">
        <div className="bg-secondary/30 px-4 pt-4 pb-1 md:hidden">
          <div className="max-w-7xl mx-auto text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Filter by:
          </div>
        </div>
        
        <div className="sticky top-16 z-30 bg-secondary/30 backdrop-blur-md border-b border-border pb-4 pt-1 md:py-4 lg:py-8 px-4 md:px-6">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center gap-3 md:gap-4">
            <div className="hidden md:block text-xs uppercase tracking-[0.2em] text-muted-foreground lg:mr-2">
              Filter by:
            </div>

            <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-3 flex-1">
            <Select
              value={mainSort}
              onValueChange={(v) => setMainSort(v as MainSort)}
            >
              <SelectTrigger className="w-full md:w-[180px] h-[38px] md:h-10 text-xs md:text-sm rounded-sm bg-background border-border">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stock-az">Stock # (A-Z)</SelectItem>
                <SelectItem value="stock-za">Stock # (Z-A)</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="newest">Year (Newest)</SelectItem>
                <SelectItem value="oldest">Year (Oldest)</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={priceSort || "any"}
              onValueChange={(v) =>
                setPriceSort(v === "any" ? "" : (v as PriceSort))
              }
            >
              <SelectTrigger className="w-full md:w-[200px] h-[38px] md:h-10 text-xs md:text-sm rounded-sm bg-background border-border">
                <SelectValue placeholder="Price (Sort)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Price (Sort)</SelectItem>
                <SelectItem value="high-low">Price (High to Low)</SelectItem>
                <SelectItem value="low-high">Price (Low to High)</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={dispSort || "any"}
              onValueChange={(v) =>
                setDispSort(v === "any" ? "" : (v as DispSort))
              }
            >
              <SelectTrigger className="w-full md:w-[240px] h-[38px] md:h-10 text-xs md:text-sm rounded-sm bg-background border-border col-span-2 sm:col-span-1">
                <SelectValue placeholder="Displacement (Sort)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Displacement (Sort)</SelectItem>
                <SelectItem value="high-low">
                  Displacement (High to Low)
                </SelectItem>
                <SelectItem value="low-high">
                  Displacement (Low to High)
                </SelectItem>
              </SelectContent>
            </Select>

            <label className="flex items-center gap-2 text-xs md:text-sm px-3 h-[38px] md:h-10 border border-border rounded-sm bg-background cursor-pointer col-span-2 sm:col-span-1 w-full sm:w-auto mt-1 sm:mt-0">
              <Checkbox
                checked={stockOnly}
                onCheckedChange={(c) => setStockOnly(Boolean(c))}
              />
              <span className="whitespace-nowrap">In stock only</span>
            </label>
          </div>

          <div className="relative w-full lg:w-64 mt-1 lg:mt-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={queryTerm}
              onChange={(e) => setQueryTerm(e.target.value)}
              placeholder="Search chassis or model..."
              maxLength={60}
              className="w-full h-[38px] md:h-10 pl-9 pr-3 text-xs md:text-sm bg-background border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-bronze"
            />
          </div>
        </div>
        </div>
      </section>

      {/* Count */}
      <section className="py-6">
        <div className="max-w-7xl mx-auto px-6 mono text-xs text-muted-foreground tracking-wider uppercase">
          Showing <span className="text-foreground font-bold">{visible.length}</span> vehicles
        </div>
      </section>

      {/* Grid */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6">
          {visible.length === 0 ? (
            <div className="py-24 text-center text-muted-foreground">
              No vehicles match your filters.
            </div>
          ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {visible.map((c, index) => {
                  const isLeft2Col = index % 2 === 0;
                  const isLeft3Col = index % 3 === 0;
                  const isCenter3Col = index % 3 === 1;

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
                            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
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
                                <div className="mono text-xs text-bronze tracking-wider mb-1">
                                  {c.year}
                                </div>
                                <h3 className="font-display text-2xl leading-none">
                                  {c.name}
                                </h3>
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex flex-col items-end">
                                  <span>Price {currency !== 'JPY' && '· Approx'}</span>
                                </div>
                                <div className="font-display text-xl text-bronze">
                                  {convertPrice(c.priceJPY).formatted}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm mb-6 pt-5 border-t border-border">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Gauge className="w-4 h-4 text-bronze" /> {c.mileage}
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Cog className="w-4 h-4 text-bronze" /> {c.transmission}
                              </div>
                              <div className="mono text-[11px] text-muted-foreground tracking-wider uppercase">
                                {c.displacementLabel}
                              </div>
                              <div className="mono text-[11px] text-muted-foreground tracking-wider uppercase">
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
                                <Link to={`/#contact`}>
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
                            lg:absolute lg:inset-auto lg:top-0 lg:h-full lg:z-30
                            ${isLeft3Col ? 'lg:left-0 lg:w-[calc(200%+2rem)]' : 
                              isCenter3Col ? 'lg:left-0 lg:w-[calc(200%+2rem)]' : 
                              'lg:left-[calc(-100%-2rem)] lg:w-[calc(200%+2rem)]'}
                          `}
                        />
                      )}
                    </article>
                  );
                })}
              </div>
          )}
          
          <div className="mt-8 text-sm text-foreground/60 italic">
            *Converted prices are estimates based on daily rates. Final transaction in JPY.
          </div>
        </div>
      </section>

      {/* Footer */}
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
          <div className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} JDM Retro Rides
          </div>
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

export default Inventory;
