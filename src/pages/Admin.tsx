import { useState, useEffect } from "react";
import { 
  auth, 
  login, 
  logout, 
  db, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  checkIsAdmin,
  Vehicle,
  VehicleStatus
} from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, LogOut, Edit2, Trash2, Cloud, Search, Database, ShieldCheck } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import { inventory } from "@/data/inventory";
import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Admin = () => {
  const { convertPrice, currency } = useCurrency();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [sortBy, setSortBy] = useState("stock-az");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    name: "",
    year: 2024,
    chassis: "",
    img: "",
    priceJPY: 0,
    mileage: "",
    mileageKm: 0,
    grade: "",
    transmission: "MT",
    displacementCc: 0,
    displacementLabel: "",
    status: "AVAILABLE",
    featured: false,
    featuredOrder: 0,
    stockNumber: "",
    description: "",
    color: "",
    repaired: "No repair history",
    seatingCapacity: 2,
    driveSystem: "2WD",
    images: []
  });

  useEffect(() => {
    let isSubscribed = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isSubscribed) return;
      
      console.log("Auth state verified:", user?.email);
      setUser(user);
      
      if (user) {
        setCheckingAdmin(true);
        try {
          console.log("Verifying admin privileges...");
          const adminStatus = await checkIsAdmin(user);
          console.log("Admin verification result:", adminStatus);
          
          if (isSubscribed) {
            setIsAdmin(adminStatus);
            if (adminStatus) {
              fetchInventory();
            }
          }
        } catch (error) {
          console.error("Admin verification error:", error);
          toast.error("Security check failed. Please refresh.");
        } finally {
          if (isSubscribed) setCheckingAdmin(false);
        }
      } else {
        if (isSubscribed) setIsAdmin(false);
      }
      
      if (isSubscribed) setLoading(false);
    });
    
    return () => { isSubscribed = false; unsubscribe(); };
  }, []);

  const fetchInventory = async () => {
    try {
      let q;
      if (sortBy === "newest") {
        q = query(collection(db, "vehicles"), orderBy("updatedAt", "desc"));
      } else if (sortBy === "oldest") {
        q = query(collection(db, "vehicles"), orderBy("updatedAt", "asc"));
      } else if (sortBy === "stock-az") {
        q = query(collection(db, "vehicles"), orderBy("stockNumber", "asc"));
      } else {
        q = query(collection(db, "vehicles"), orderBy("stockNumber", "desc"));
      }
      
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          dateAdded: data.updatedAt ? new Date(data.updatedAt.seconds * 1000).toISOString().split('T')[0] : "-"
        } as Vehicle;
      });
      setVehicles(list);
    } catch (error) {
      console.error("Inventory sync error:", error);
      toast.error("Database connection lost. Check your connection.");
    }
  };

  useEffect(() => {
    if (isAdmin) fetchInventory();
  }, [sortBy, isAdmin]);

  const handleSave = async () => {
    try {
      const vehicleData = {
        ...formData,
        updatedAt: serverTimestamp()
      };

      if (editingVehicle) {
        await updateDoc(doc(db, "vehicles", editingVehicle.id), vehicleData);
        toast.success("Vehicle database updated");
      } else {
        await addDoc(collection(db, "vehicles"), vehicleData);
        toast.success("New vehicle entry created");
      }
      setIsDialogOpen(false);
      fetchInventory();
    } catch (error) {
      console.error("Firestore write error:", error);
      toast.error("Write unauthorized or invalid data");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently remove this vehicle from inventory?")) return;
    setIsDeleting(id);
    try {
      await deleteDoc(doc(db, "vehicles", id));
      toast.success("System entry removed");
      fetchInventory();
    } catch (error) {
      console.error("Firestore delete error:", error);
      toast.error("Delete operation failed");
    } finally {
      setIsDeleting(null);
    }
  };

  const openAdd = () => {
    setEditingVehicle(null);
    setFormData({
      name: "",
      year: 2024,
      chassis: "",
      img: "",
      priceJPY: 0,
      mileage: "",
      mileageKm: 0,
      grade: "",
      transmission: "MT",
      displacementCc: 0,
      displacementLabel: "",
      status: "AVAILABLE",
      featured: false,
      featuredOrder: 0,
      stockNumber: "",
      description: "",
      color: "",
      repaired: "No repair history",
      seatingCapacity: 2,
      driveSystem: "2WD",
      images: []
    });
    setIsDialogOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setFormData(v);
    setIsDialogOpen(true);
  };

  const handleSeedData = async () => {
    if (!confirm("This will clear all current listings and sync with the initial inventory. Continue?")) return;
    setIsSeeding(true);
    try {
      // Clear existing vehicles
      const snapshot = await getDocs(collection(db, "vehicles"));
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Seed new data
      for (const item of inventory) {
        // Remove ID and use Firestore's ID
        const { id, ...vehicleData } = item;
        await addDoc(collection(db, "vehicles"), {
          ...vehicleData,
          updatedAt: serverTimestamp()
        });
      }
      toast.success("Inventory synced with actual listings");
      fetchInventory();
    } catch (error) {
      console.error("Seeding error:", error);
      toast.error("Failed to sync database");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      toast.info(`${files.length} files selected. Storage integration is required for actual uploads.`);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      toast.info(`${files.length} photos dropped. Storage integration is required.`);
    }
  };

  if (loading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <Loader2 className="w-16 h-16 animate-spin text-bronze" />
          <div className="absolute inset-0 blur-2xl bg-bronze/20 animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <div className="font-display text-2xl uppercase tracking-[0.2em] text-foreground">
            {loading ? "Initializing System" : "Verifying Clearance"}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground animate-pulse">
            Secure WebSocket Connection established...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col pt-32">
        <SiteNav />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md w-full p-12 border border-border rounded-sm bg-secondary/20 text-center">
            <ShieldCheck className="w-16 h-16 text-bronze mx-auto mb-8 opacity-40" />
            <h1 className="font-display text-5xl mb-4">RESTRICTED AREA</h1>
            <p className="text-muted-foreground text-sm mb-10 leading-relaxed tracking-wider italic">
              Log in with an authorized JDM Retro Rides account to manage system inventory.
            </p>
            <Button 
              onClick={login}
              className="w-full bg-bronze hover:bg-bronze/90 text-black h-12 rounded-sm font-black tracking-widest"
            >
              LOG IN WITH GOOGLE
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background pt-32 flex flex-col items-center justify-center px-6">
        <SiteNav />
        <div className="max-w-md text-center">
          <h1 className="font-display text-5xl text-destructive mb-4 tracking-tighter">ACCESS DENIED</h1>
          <p className="text-muted-foreground mb-8">
            You are logged in as <span className="text-foreground">{user.email}</span>. <br />
            This account does not have administrator privileges.
          </p>
          <Button onClick={logout} variant="outline" className="gap-2">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 pt-32 pb-24">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="font-display text-4xl mb-2">Inventory Management <span className="text-success text-[10px] uppercase tracking-wider ml-4">● Connected</span></h1>
            <p className="text-muted-foreground text-sm tracking-wide">Add, edit, or remove vehicle listings.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleSeedData}
              disabled={isSeeding}
              className="border-white/10 hover:bg-white hover:text-black gap-2 h-11 px-4 rounded-sm font-bold text-[10px] uppercase tracking-widest transition-all"
            >
              {isSeeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
              Sync Initial Inventory
            </Button>
            <div className="flex items-center gap-3 bg-secondary/20 px-4 py-2 border border-white/5 rounded-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Sort By:</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer appearance-none pr-2"
              >
                <option value="newest" className="bg-[#1a1a1c] text-foreground">Date Added (Newest)</option>
                <option value="oldest" className="bg-[#1a1a1c] text-foreground">Date Added (Oldest)</option>
                <option value="stock-az" className="bg-[#1a1a1c] text-foreground">Stock # (A-Z)</option>
                <option value="stock-za" className="bg-[#1a1a1c] text-foreground">Stock # (Z-A)</option>
              </select>
            </div>
            <Button 
              onClick={openAdd}
              className="bg-bronze hover:bg-bronze/90 text-black h-11 px-6 rounded-sm font-bold tracking-widest gap-2 shadow-[0_0_15px_rgba(205,127,50,0.2)]"
            >
              <Plus className="w-5 h-5" /> Add New Vehicle
            </Button>
          </div>
        </div>

        <div className="hidden md:block border border-white/5 rounded-sm overflow-hidden bg-secondary/5 backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-secondary/20 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black">
              <tr>
                <th className="px-6 py-5 border-b border-white/5">Vehicle</th>
                <th className="px-6 py-5 border-b border-white/5">Date Added</th>
                <th className="px-6 py-5 border-b border-white/5">Stock #</th>
                <th className="px-6 py-5 border-b border-white/5">Status</th>
                <th className="px-6 py-5 border-b border-white/5">Price</th>
                <th className="px-6 py-5 border-b border-white/5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[13px] tracking-wide text-muted-foreground">
              {vehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-32 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="opacity-20 flex flex-col items-center mb-8">
                        <Search className="w-12 h-12 mb-4" />
                        <div className="font-display text-4xl uppercase tracking-tighter">No Stock Found</div>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={handleSeedData}
                        disabled={isSeeding}
                        className="border-bronze text-bronze hover:bg-white hover:text-black gap-2"
                      >
                        {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                        Sync Initial Inventory
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-white/[0.02] transition-colors group border-b border-white/5 last:border-0">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-16 aspect-video rounded-sm overflow-hidden bg-secondary border border-white/5 shrink-0">
                          <img src={v.img} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="text-foreground font-bold mb-0.5">{v.year} {v.name}</div>
                          <div className="text-[10px] opacity-60 uppercase">{v.year} · {v.transmission}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap opacity-80">
                      {v.dateAdded}
                    </td>
                    <td className="px-6 py-5 font-mono text-[11px] opacity-80">
                      {v.stockNumber || "-"}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-1 rounded-sm text-[9px] font-black tracking-widest border border-current bg-current/10 ${
                        v.status === 'AVAILABLE' ? 'text-success' : v.status === 'RESERVED' ? 'text-bronze' : 'text-destructive'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-foreground font-bold">{convertPrice(v.priceJPY).formatted}</div>
                    </td>
                    <td className="px-6 py-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 px-2">
                        <Button onClick={() => openEdit(v)} size="icon" variant="ghost" className="h-8 w-8 hover:bg-bronze hover:text-black">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => v.id && handleDelete(v.id)} size="icon" variant="ghost" className="h-8 w-8 hover:bg-destructive hover:text-white" disabled={isDeleting === v.id}>
                          {isDeleting === v.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Inventory View */}
        <div className="md:hidden space-y-4">
          {vehicles.length === 0 ? (
             <div className="py-24 text-center border border-white/5 rounded-sm bg-secondary/5">
                <Search className="w-12 h-12 mb-4 mx-auto opacity-20" />
                <div className="font-display text-2xl uppercase tracking-tighter opacity-20 mb-6">No Stock Found</div>
                <Button 
                  variant="outline" 
                  onClick={handleSeedData}
                  disabled={isSeeding}
                  className="border-bronze text-bronze hover:bg-white hover:text-black gap-2"
                >
                  {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  Sync Initial Inventory
                </Button>
             </div>
          ) : (
            vehicles.map((v) => (
              <div key={v.id} className="bg-secondary/10 border border-white/5 rounded-sm p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-20 aspect-video rounded-sm overflow-hidden bg-secondary border border-white/5 shrink-0">
                    <img src={v.img} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="text-foreground font-bold text-base truncate">{v.year} {v.name}</div>
                      <Cloud className="w-3 h-3 text-success shrink-0" />
                    </div>
                    <div className="text-[10px] opacity-60 uppercase">{v.year} · {v.transmission}</div>
                  </div>
                </div>
                
                <div className="space-y-3 pt-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Added:</span>
                    <span className="font-medium text-foreground/80">{v.dateAdded}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Stock:</span>
                    <span className="font-mono text-foreground/80 lowercase">{v.stockNumber || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Status:</span>
                    <span className={`inline-block px-2.5 py-1 rounded-sm text-[8px] font-black tracking-widest border border-current bg-current/10 ${
                      v.status === 'AVAILABLE' ? 'text-success' : v.status === 'RESERVED' ? 'text-bronze' : 'text-destructive'
                    }`}>
                      {v.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Price:</span>
                    <span className="font-bold text-bronze text-sm">{convertPrice(v.priceJPY).formatted}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button onClick={() => openEdit(v)} variant="secondary" className="bg-secondary/50 hover:bg-bronze hover:text-black gap-2 h-10 px-6 text-[10px] uppercase font-bold tracking-widest rounded-sm">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button 
                    onClick={() => v.id && handleDelete(v.id)} 
                    className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-white gap-2 h-10 px-6 text-[10px] uppercase font-bold tracking-widest rounded-sm border border-destructive/20"
                    disabled={isDeleting === v.id}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <footer className="py-12 border-t border-border/50 flex flex-col items-center gap-4">
        <div className="opacity-40 text-[10px] tracking-widest uppercase">
          Authenticated Session for: {user.email}
        </div>
        <Button onClick={logout} variant="outline" className="h-9 px-6 rounded-sm border-white/10 gap-2 font-bold tracking-widest text-[10px] uppercase">
          <LogOut className="w-3.5 h-3.5" /> Log Out
        </Button>
      </footer>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl bg-[#0d0d0e] border-border text-foreground rounded-sm p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-8 border-b border-white/5">
            <DialogTitle className="font-display text-4xl tracking-tight">
              {editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
            {/* IDENTITY & STATUS */}
            <section className="space-y-6">
              <h3 className="font-sans text-xs font-black tracking-[0.3em] uppercase text-bronze border-b border-bronze/20 pb-2">IDENTITY & STATUS</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2 md:col-span-1">
                  <Label className="text-xs font-bold text-muted-foreground tracking-wide">Vehicle Name</Label>
                  <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-background border-white/10 rounded-sm h-11" placeholder="1996 Toyota MR2" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground tracking-wide">Stock Number</Label>
                  <Input value={formData.stockNumber} onChange={e => setFormData({...formData, stockNumber: e.target.value})} className="bg-background border-white/10 rounded-sm h-11" placeholder="J.6502" />
                </div>
                <div className="grid grid-cols-2 gap-6 md:col-span-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground tracking-wide">Status</Label>
                    <select 
                      className="w-full h-11 bg-background border border-white/10 rounded-sm px-3 text-sm focus:outline-none focus:ring-1 focus:ring-bronze appearance-none"
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value as any})}
                    >
                      <option value="AVAILABLE" className="bg-[#1a1a1c]">AVAILABLE</option>
                      <option value="RESERVED" className="bg-[#1a1a1c]">RESERVED</option>
                      <option value="SOLD" className="bg-[#1a1a1c]">SOLD</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground tracking-wide">Price (¥)</Label>
                    <Input type="number" value={formData.priceJPY} onChange={e => setFormData({...formData, priceJPY: parseInt(e.target.value)})} className="bg-background border-white/10 rounded-sm h-11" />
                  </div>
                </div>
                <div className="space-y-4 md:col-span-2">
                  <Label className="text-xs font-bold text-muted-foreground tracking-wide">Featured Vehicle Listing Order</Label>
                  <div className="flex items-center gap-8">
                    {[1, 2, 3, 4].map((num) => (
                      <div key={num} className="flex items-center gap-3">
                        <Checkbox 
                          id={`feat-${num}`}
                          checked={formData.featuredOrder === num || (formData.featured && formData.featuredOrder === undefined && num === 1)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, featured: true, featuredOrder: num });
                            } else {
                              setFormData({ ...formData, featured: false, featuredOrder: 0 });
                            }
                          }}
                          className="w-5 h-5 rounded-none border-white/20 data-[state=checked]:bg-bronze data-[state=checked]:border-bronze"
                        />
                        <Label htmlFor={`feat-${num}`} className="text-xs cursor-pointer font-bold">{num}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* TECHNICAL SPECIFICATIONS */}
            <section className="space-y-6">
              <h3 className="font-sans text-xs font-black tracking-[0.3em] uppercase text-bronze border-b border-bronze/20 pb-2">TECHNICAL SPECIFICATIONS</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground tracking-wide">Year</Label>
                  <Input type="number" value={formData.year} onChange={e => setFormData({...formData, year: parseInt(e.target.value)})} className="bg-background border-white/10 rounded-sm h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground tracking-wide">Mileage (km)</Label>
                  <Input type="number" value={formData.mileageKm} onChange={e => {
                    const val = parseInt(e.target.value);
                    setFormData({...formData, mileageKm: val, mileage: `${val.toLocaleString()} km`});
                  }} className="bg-background border-white/10 rounded-sm h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground tracking-wide">Displacement (cc)</Label>
                  <Input type="number" value={formData.displacementCc} onChange={e => {
                    const val = parseInt(e.target.value);
                    setFormData({...formData, displacementCc: val, displacementLabel: `${(val/1000).toFixed(1)}L`});
                  }} className="bg-background border-white/10 rounded-sm h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground tracking-wide">Transmission</Label>
                   <select 
                    className="w-full h-11 bg-background border border-white/10 rounded-sm px-3 text-sm focus:outline-none focus:ring-1 focus:ring-bronze appearance-none"
                    value={formData.transmission}
                    onChange={e => setFormData({...formData, transmission: e.target.value})}
                  >
                    <option value="MT" className="bg-[#1a1a1c]">MT</option>
                    <option value="AT" className="bg-[#1a1a1c]">AT</option>
                    <option value="5-Speed Manual" className="bg-[#1a1a1c]">5-Speed Manual</option>
                    <option value="6-Speed Manual" className="bg-[#1a1a1c]">6-Speed Manual</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground tracking-wide">Color</Label>
                  <Input value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} className="bg-background border-white/10 rounded-sm h-11" placeholder="Super Red II" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground tracking-wide">Drive System</Label>
                  <select 
                    className="w-full h-11 bg-background border border-white/10 rounded-sm px-3 text-sm focus:outline-none focus:ring-1 focus:ring-bronze appearance-none"
                    value={formData.driveSystem}
                    onChange={e => setFormData({...formData, driveSystem: e.target.value})}
                  >
                    <option value="2WD" className="bg-[#1a1a1c]">2WD</option>
                    <option value="4WD" className="bg-[#1a1a1c]">4WD</option>
                    <option value="AWD" className="bg-[#1a1a1c]">AWD</option>
                    <option value="RWD" className="bg-[#1a1a1c]">RWD</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground tracking-wide">Repaired</Label>
                  <select 
                    className="w-full h-11 bg-background border border-white/10 rounded-sm px-3 text-sm focus:outline-none focus:ring-1 focus:ring-bronze appearance-none"
                    value={formData.repaired}
                    onChange={e => setFormData({...formData, repaired: e.target.value})}
                  >
                    <option value="No repair history" className="bg-[#1a1a1c]">No repair history</option>
                    <option value="Minor panel repair" className="bg-[#1a1a1c]">Minor panel repair</option>
                    <option value="Fully restored" className="bg-[#1a1a1c]">Fully restored</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground tracking-wide">Seating</Label>
                  <Input type="number" value={formData.seatingCapacity} onChange={e => setFormData({...formData, seatingCapacity: parseInt(e.target.value)})} className="bg-background border-white/10 rounded-sm h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground tracking-wide">Grade</Label>
                  <Input value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} className="bg-background border-white/10 rounded-sm h-11" placeholder="4.0" />
                </div>
              </div>
            </section>

            {/* ADDITIONAL INFORMATION */}
            <section className="space-y-6">
              <h3 className="font-sans text-xs font-black tracking-[0.3em] uppercase text-bronze border-b border-bronze/20 pb-2">ADDITIONAL INFORMATION</h3>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground tracking-wide">Description (Paragraphs for View Details)</Label>
                <textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full min-h-[160px] bg-background border border-white/10 rounded-sm p-4 text-sm focus:outline-none focus:ring-1 focus:ring-bronze resize-none leading-relaxed"
                  placeholder="A fun and engaging mid-engine sports car..."
                />
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="font-sans text-xs font-black tracking-[0.3em] uppercase text-bronze border-b border-bronze/20 pb-2">PHOTOS (FIRST IS FEATURED)</h3>
              <div className="space-y-6">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  className="border-2 border-dashed border-white/5 rounded-sm p-16 text-center bg-secondary/5 hover:bg-secondary/10 hover:border-bronze/30 transition-all cursor-pointer group"
                >
                  <Cloud className="w-12 h-12 text-bronze mx-auto mb-6 opacity-40 group-hover:opacity-100 transition-opacity" />
                  <div className="text-sm font-bold mb-1 tracking-wide">Click or Drag photos here</div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-widest">Upload multiple photos from your PC or Smartphone</div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    multiple 
                    className="hidden" 
                    accept="image/*"
                  />
                </div>

                {formData.images && formData.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {formData.images.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-sm overflow-hidden border border-white/10 group bg-secondary">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            className="w-8 h-8 rounded-sm"
                            onClick={() => {
                              if (confirm("Remove this photo?")) {
                                const newImages = [...(formData.images || [])];
                                newImages.splice(idx, 1);
                                setFormData({ ...formData, images: newImages });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {idx === 0 && (
                          <div className="absolute top-2 left-2 bg-bronze text-black text-[8px] font-black uppercase px-2 py-0.5 rounded-sm">Featured</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          <DialogFooter className="p-8 border-t border-white/5 bg-secondary/10 flex items-center justify-end gap-4">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-sm tracking-widest font-bold text-xs uppercase h-12 px-10">Cancel</Button>
            <Button onClick={handleSave} className="bg-bronze hover:bg-bronze/90 text-black px-12 h-12 rounded-sm font-black tracking-widest shadow-[0_0_20px_rgba(205,127,50,0.15)] uppercase">Save Vehicle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
