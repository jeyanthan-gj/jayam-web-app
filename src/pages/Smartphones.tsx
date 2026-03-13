import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, Trash2, Edit, Smartphone, Loader2, Filter, X, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
}

interface Variant {
  id?: string;
  model_id?: string;
  ram_rom: string;
  color: string;
  price: number;
  display?: string;
  battery?: string;
  processor?: string;
  charging_speed?: string;
  front_camera?: string;
  back_camera?: string;
  image_url?: string;
  localFile?: File; // For preview and upload tracking
}

interface PhoneModel {
  id: string;
  brand_id: string;
  name: string;
  display: string | null;
  battery: string | null;
  charging_speed: string | null;
  front_camera: string | null;
  back_camera: string | null;
  processor: string | null;
  image_url: string | null;
  variants?: Variant[];
}

const Smartphones = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<PhoneModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [ramFilter, setRamFilter] = useState('');
  const [processorFilter, setProcessorFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Refs for hidden inputs
  const modelInputRef = useRef<HTMLInputElement>(null);
  const brandInputRef = useRef<HTMLInputElement>(null);
  const variantInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Brand dialog state
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [brandFile, setBrandFile] = useState<File | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  // Model dialog state
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<PhoneModel | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [modelForm, setModelForm] = useState({
    brand_id: '', name: '', display: '',
    battery: '', charging_speed: '', front_camera: '', back_camera: '',
    processor: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: brandsRes } = await supabase.from('brands').select('*').order('name');
      const { data: modelsRes } = await supabase.from('models').select('*, variants(*)').order('name');
      if (brandsRes) setBrands(brandsRes as any);
      if (modelsRes) setModels(modelsRes as any);
    } catch (err: any) {
      console.error("Data Fetch Error:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getPathFromUrl = (url: string) => {
    const parts = url.split('/storage/v1/object/public/images/');
    return parts.length > 1 ? parts[1] : null;
  };

  const deleteImageFromStorage = async (url: string | null) => {
    if (!url) return;
    const path = getPathFromUrl(url);
    if (path) {
      await supabase.storage.from('images').remove([path]);
    }
  };

  const uploadImage = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      if (uploadError.message.includes('bucket not found')) {
        throw new Error("Storage bucket 'images' not found. Ensure you ran the Repair SQL.");
      }
      if (uploadError.message.includes('policy')) {
        throw new Error("Permission Denied: Ensure you ran the Repair SQL.");
      }
      throw uploadError;
    }

    const { data } = supabase.storage.from('images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSaveBrand = async () => {
    if (!newBrandName.trim()) return;
    setIsSaving(true);
    try {
      let logo_url = editingBrand?.logo_url || null;
      if (brandFile) {
        if (editingBrand?.logo_url) await deleteImageFromStorage(editingBrand.logo_url);
        logo_url = await uploadImage(brandFile, 'brands');
      }
      if (editingBrand) {
        await supabase.from('brands').update({ name: newBrandName, logo_url }).eq('id', editingBrand.id);
      } else {
        await supabase.from('brands').insert({ name: newBrandName, logo_url });
      }
      setBrandDialogOpen(false);
      setNewBrandName('');
      setBrandFile(null);
      fetchData();
      toast.success('Brand saved successfully');
    } catch (error: any) {
      toast.error(error.message);
    }
    setIsSaving(false);
  };

  const handleDeleteBrand = async (brand: Brand) => {
    if (!confirm(`Delete ${brand.name}?`)) return;
    try {
      const { data: relatedModels } = await supabase.from('models').select('image_url').eq('brand_id', brand.id);
      if (relatedModels) {
        for (const model of (relatedModels as any[])) {
          if (model.image_url) await deleteImageFromStorage(model.image_url);
        }
      }
      if (brand.logo_url) await deleteImageFromStorage(brand.logo_url);
      await supabase.from('brands').delete().eq('id', brand.id);
      fetchData();
      toast.success('Brand deleted');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openModelDialog = (model?: PhoneModel) => {
    if (model) {
      setEditingModel(model);
      setModelForm({
        brand_id: model.brand_id,
        name: model.name,
        display: model.display || '',
        battery: model.battery || '',
        charging_speed: model.charging_speed || '',
        front_camera: model.front_camera || '',
        back_camera: model.back_camera || '',
        processor: model.processor || '',
      });
      setVariants(model.variants || []);
    } else {
      setEditingModel(null);
      setModelForm({ brand_id: brands[0]?.id || '', name: '', display: '', battery: '', charging_speed: '', front_camera: '', back_camera: '', processor: '' });
      setVariants([{ ram_rom: '', color: '', price: 0 }]);
    }
    setModelFile(null);
    setModelDialogOpen(true);
  };

  const handleSaveModel = async () => {
    if (!modelForm.name.trim() || !modelForm.brand_id) { toast.error('Name and brand are required'); return; }
    if (variants.length === 0) { toast.error('At least one variant is required'); return; }

    setIsSaving(true);
    try {
      // 1. Upload main model image
      let image_url = editingModel?.image_url || null;
      if (modelFile) {
        if (editingModel?.image_url) await deleteImageFromStorage(editingModel.image_url);
        image_url = await uploadImage(modelFile, 'models');
      }

      const modelData = {
        brand_id: modelForm.brand_id,
        name: modelForm.name,
        display: modelForm.display || "",
        battery: modelForm.battery || "",
        charging_speed: modelForm.charging_speed || "",
        front_camera: modelForm.front_camera || "",
        back_camera: modelForm.back_camera || "",
        processor: modelForm.processor || "",
        image_url
      };

      let modelId = editingModel?.id;

      if (editingModel) {
        const { error } = await supabase.from('models').update(modelData).eq('id', editingModel.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('models').insert(modelData).select('id').single();
        if (error) throw error;
        modelId = (data as any).id;
      }

      if (modelId) {
        // Clear old variants
        if (editingModel) {
          await supabase.from('variants' as any).delete().eq('model_id', modelId);
        }

        // 2. Upload variant images one by one
        const variantsToInsert = await Promise.all(variants.map(async (v) => {
          let variant_image = v.image_url || null;
          if (v.localFile) {
            // Delete old if exists (unlikely in this flow but good practice)
            if (v.image_url) await deleteImageFromStorage(v.image_url);
            variant_image = await uploadImage(v.localFile, 'variants');
          }

          return {
            model_id: modelId,
            ram_rom: v.ram_rom,
            color: v.color,
            price: Number(v.price) || 0,
            display: v.display || modelForm.display,
            battery: v.battery || modelForm.battery,
            processor: v.processor || modelForm.processor,
            charging_speed: v.charging_speed || modelForm.charging_speed,
            front_camera: v.front_camera || modelForm.front_camera,
            back_camera: v.back_camera || modelForm.back_camera,
            image_url: variant_image
          };
        }));

        const { error: vError } = await supabase.from('variants').insert(variantsToInsert as any);
        if (vError) throw vError;
      }

      setModelDialogOpen(false);
      fetchData();
      toast.success(editingModel ? 'Model updated' : 'Model added');
    } catch (error: any) {
      console.error("Save Error:", error);
      toast.error(error.message);
    }
    setIsSaving(false);
  };

  const handleDeleteModel = async (model: PhoneModel) => {
    if (!confirm(`Delete ${model.name}?`)) return;
    try {
      if (model.image_url) await deleteImageFromStorage(model.image_url);
      await supabase.from('models').delete().eq('id', model.id);
      fetchData();
      toast.success('Model deleted');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredModels = models
    .filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());
      const matchesBrand = brandFilter === 'all' || m.brand_id === brandFilter;
      const minPrice = priceRange.min ? Number(priceRange.min) : 0;
      const maxPrice = priceRange.max ? Number(priceRange.max) : Infinity;

      const matchesPrice = (m.variants || []).some(v => v.price >= minPrice && v.price <= maxPrice);
      const matchesRam = !ramFilter || (m.variants || []).some(v => v.ram_rom.toLowerCase().includes(ramFilter.toLowerCase()));
      const matchesProcessor = !processorFilter ||
        m.processor?.toLowerCase().includes(processorFilter.toLowerCase()) ||
        (m.variants || []).some(v => v.processor?.toLowerCase().includes(processorFilter.toLowerCase()));

      return matchesSearch && matchesBrand && (priceRange.min || priceRange.max ? matchesPrice : true) && matchesRam && matchesProcessor;
    })
    .sort((a, b) => {
      if (sortOrder === 'price-asc') {
        const minA = Math.min(...(a.variants || []).map(v => v.price), Infinity);
        const minB = Math.min(...(b.variants || []).map(v => v.price), Infinity);
        return minA - minB;
      }
      if (sortOrder === 'price-desc') {
        const minA = Math.max(...(a.variants || []).map(v => v.price), 0);
        const minB = Math.max(...(b.variants || []).map(v => v.price), 0);
        return minB - minA;
      }
      if (sortOrder === 'name-asc') return a.name.localeCompare(b.name);
      return 0; // default newest/fetch order
    });

  const getBrandName = (brandId: string) => brands.find(b => b.id === brandId)?.name || 'Unknown';

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-fade-in p-2 md:p-6 pb-20">
      {/* Hidden Global Inputs */}
      <input type="file" ref={brandInputRef} className="hidden" accept="image/*" onChange={e => setBrandFile(e.target.files?.[0] || null)} />
      <input type="file" ref={modelInputRef} className="hidden" accept="image/*" onChange={e => setModelFile(e.target.files?.[0] || null)} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black font-display tracking-tight">Smartphones</h1>
          <p className="text-muted-foreground font-medium">{filteredModels.length} models available</p>
        </div>
        {isAdmin && (
          <div className="flex gap-3">
            <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl border-2 hover:bg-primary/5 hover:text-primary transition-all">
                  <Plus className="w-4 h-4 mr-2" /> Brand
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl">
                <DialogHeader><DialogTitle>{editingBrand ? 'Edit Brand' : 'Add Brand'}</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider">Brand Name</Label>
                    <Input value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="e.g. Samsung" className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider">Brand Logo</Label>
                    <div
                      onClick={() => brandInputRef.current?.click()}
                      className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center hover:bg-primary/5 cursor-pointer transition-colors"
                    >
                      {brandFile || editingBrand?.logo_url ? (
                        <img src={brandFile ? URL.createObjectURL(brandFile) : editingBrand?.logo_url!} className="h-16 object-contain" alt="Brand Logo" />
                      ) : (
                        <div className="text-center">
                          <Upload className="w-6 h-6 text-primary mb-1 mx-auto" />
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Select Logo</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button onClick={handleSaveBrand} disabled={isSaving} className="w-full gradient-primary rounded-xl h-11 font-bold">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Save Brand
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" className="gradient-primary rounded-xl font-bold px-5" onClick={() => openModelDialog()}>
              <Plus className="w-4 h-4 mr-2" /> Add Model
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input placeholder="Search models by name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-11 rounded-2xl h-12 bg-background border-2 focus:border-primary/50 transition-all shadow-sm" />
          </div>
          <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)} className={`rounded-2xl h-12 w-12 border-2 transition-all ${showFilters ? 'bg-primary text-primary-foreground border-primary' : ''}`}>
            <Filter className="w-5 h-5" />
          </Button>
        </div>

        {showFilters && (
          <div className="glass-card rounded-2xl p-6 border-2 border-primary/10 space-y-6 animate-slide-up shadow-xl shadow-primary/5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Filter by Brand</Label>
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger className="rounded-xl border-border/50 h-10"><SelectValue placeholder="All Brands" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Brands</SelectItem>
                    {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Memory (RAM/ROM)</Label>
                <Input placeholder="e.g. 8GB" value={ramFilter} onChange={e => setRamFilter(e.target.value)} className="rounded-xl h-10 border-border/50" />
              </div>

              <div>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Processor / CPU</Label>
                <Input placeholder="e.g. Snapdragon" value={processorFilter} onChange={e => setProcessorFilter(e.target.value)} className="rounded-xl h-10 border-border/50" />
              </div>

              <div>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Sort Order</Label>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger className="rounded-xl border-border/50 h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    <SelectItem value="name-asc">Name: A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/30">
              <div className="flex gap-4 w-full sm:w-auto">
                <div className="flex-1 sm:flex-none">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Min Price</Label>
                  <Input placeholder="0" type="number" value={priceRange.min} onChange={e => setPriceRange(p => ({ ...p, min: e.target.value }))} className="w-full sm:w-32 rounded-xl h-10 border-border/50" />
                </div>
                <div className="flex-1 sm:flex-none">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Max Price</Label>
                  <Input placeholder="Any" type="number" value={priceRange.max} onChange={e => setPriceRange(p => ({ ...p, max: e.target.value }))} className="w-full sm:w-32 rounded-xl h-10 border-border/50" />
                </div>
              </div>

              <Button variant="ghost" className="h-10 rounded-xl" onClick={() => {
                setBrandFilter('all');
                setPriceRange({ min: '', max: '' });
                setRamFilter('');
                setProcessorFilter('');
                setSortOrder('newest');
              }}>
                <X className="w-4 h-4 mr-2" /> Reset All Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {brands.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
            <span className="h-[1px] w-8 bg-muted-foreground/20"></span> Featured Brands
          </h2>
          <div className="flex flex-wrap gap-4">
            {brands.map(brand => (
              <div
                key={brand.id}
                className={`flex items-center gap-4 bg-background border-2 rounded-2xl pl-3 pr-5 py-2.5 transition-all shadow-sm group relative overflow-hidden ${brandFilter === brand.id ? 'border-primary ring-4 ring-primary/5' : 'hover:border-primary/30'}`}
                onClick={() => setBrandFilter(brandFilter === brand.id ? 'all' : brand.id)}
                role="button"
              >
                {brand.logo_url ? (
                  <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center p-1.5 transition-transform group-hover:scale-110">
                    <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-black text-sm tracking-tight">{brand.name}</p>
                  {isAdmin && (
                    <div className="flex gap-2 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setEditingBrand(brand); setNewBrandName(brand.name); setBrandDialogOpen(true); }} className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider">Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteBrand(brand); }} className="text-[10px] font-bold text-destructive hover:underline uppercase tracking-wider">Delete</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredModels.map((model, i) => (
          <div
            key={model.id}
            className="glass-card rounded-[2rem] overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all duration-500 group bg-card hover:shadow-2xl hover:shadow-primary/10 animate-fade-in block cursor-pointer"
            style={{ animationDelay: `${i * 100}ms` }}
            onClick={() => navigate(`/smartphones/${model.id}`)}
          >
            <div className="h-64 bg-muted/20 relative flex items-center justify-center p-10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              {model.image_url ? (
                <img src={model.image_url} alt={model.name} className="h-full object-contain transition-transform duration-700 group-hover:scale-110 relative z-10" />
              ) : (
                <Smartphone className="w-20 h-20 opacity-10" />
              )}
              {isAdmin && (
                <div className="absolute top-4 right-4 flex gap-2 z-20">
                  <button onClick={(e) => { e.stopPropagation(); openModelDialog(model); }} className="w-10 h-10 rounded-2xl bg-background/80 backdrop-blur-md border border-border/50 flex items-center justify-center shadow-lg hover:bg-primary hover:text-primary-foreground transition-all">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteModel(model); }} className="w-10 h-10 rounded-2xl bg-background/80 backdrop-blur-md border border-border/50 flex items-center justify-center shadow-lg hover:bg-destructive hover:text-destructive-foreground transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="p-7">
              <div className="flex justify-between items-start mb-2">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">{getBrandName(model.brand_id)}</span>
              </div>
              <h3 className="text-2xl font-black font-display tracking-tight text-foreground group-hover:text-primary transition-colors">{model.name}</h3>

              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Starting from</p>
                <p className="text-3xl font-black text-gradient-primary">
                  {model.variants && model.variants.length > 0 ? (
                    `₹${Math.min(...model.variants.map(v => v.price)).toLocaleString()}`
                  ) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto rounded-[2.5rem] p-0 border-none shadow-2xl">
          <div className="bg-gradient-to-br from-primary/10 via-background to-background p-8 md:p-12">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-4xl font-black font-display tracking-tight">{editingModel ? 'Update Model' : 'Create New Model'}</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-4 space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-black uppercase tracking-widest opacity-60">Brand</Label>
                  <Select value={modelForm.brand_id} onValueChange={v => setModelForm(f => ({ ...f, brand_id: v }))}>
                    <SelectTrigger className="h-12 rounded-2xl border-2 shadow-sm"><SelectValue placeholder="Selecting Brand..." /></SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {brands.map(b => <SelectItem key={b.id} value={b.id} className="rounded-xl">{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-black uppercase tracking-widest opacity-60">Model Name</Label>
                  <Input value={modelForm.name} onChange={e => setModelForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. iPhone 15 Pro" className="h-12 rounded-2xl border-2 shadow-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-black uppercase tracking-widest opacity-60">Smartphone Image</Label>
                  <div
                    onClick={() => modelInputRef.current?.click()}
                    className="border-2 border-dashed rounded-[2rem] p-8 flex flex-col items-center justify-center bg-background/50 hover:bg-primary/5 transition-all cursor-pointer group relative overflow-hidden h-64"
                  >
                    {modelFile || editingModel?.image_url ? (
                      <img src={modelFile ? URL.createObjectURL(modelFile) : editingModel?.image_url!} className="h-full object-contain relative z-10" alt="Preview" />
                    ) : (
                      <div className="text-center transition-transform group-hover:scale-110">
                        <Upload className="w-10 h-10 text-primary mb-2 mx-auto" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Upload HQ Image</p>
                      </div>
                    )}
                    <button className="absolute bottom-2 right-2 p-2 bg-white/10 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"><Edit className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black uppercase tracking-tighter">Configurations & Variants</h3>
                  <Button type="button" variant="outline" size="sm" className="rounded-xl border-2 font-bold px-4" onClick={() => {
                    const last = (variants[variants.length - 1] || {}) as any;
                    setVariants([...variants, { ...last, color: '', price: last.price || 0, localFile: undefined }]);
                  }}><Plus className="w-4 h-4 mr-2" /> Add Variant</Button>
                </div>

                <div className="space-y-6">
                  {variants.map((v, idx) => (
                    <div key={idx} className="glass-card rounded-[2rem] p-8 border-2 border-primary/10 relative group bg-background/40 hover:bg-background transition-all">
                      <button onClick={() => setVariants(variants.filter((_, i) => i !== idx))} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-all z-20">
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                        {/* Variant Photo Area */}
                        <div className="md:col-span-3 space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Photo</Label>
                          <div
                            onClick={() => variantInputRefs.current[idx]?.click()}
                            className="aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center hover:bg-primary/5 cursor-pointer transition-all overflow-hidden relative group"
                          >
                            {v.localFile || v.image_url ? (
                              <img src={v.localFile ? URL.createObjectURL(v.localFile) : v.image_url!} className="h-full object-contain" alt="Variant" />
                            ) : (
                              <Smartphone className="w-6 h-6 opacity-20" />
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Edit className="w-5 h-5 text-white" />
                            </div>
                            <input
                              type="file"
                              ref={el => variantInputRefs.current[idx] = el}
                              className="hidden"
                              accept="image/*"
                              onChange={e => {
                                const n = [...variants];
                                n[idx].localFile = e.target.files?.[0];
                                setVariants(n);
                              }}
                            />
                          </div>
                        </div>

                        {/* Variant Details Area */}
                        <div className="md:col-span-9 space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Memory</Label><Input value={v.ram_rom} onChange={e => { const n = [...variants]; n[idx].ram_rom = e.target.value; setVariants(n); }} placeholder="8/256GB" className="rounded-xl h-11 border-2" /></div>
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Color</Label><Input value={v.color} onChange={e => { const n = [...variants]; n[idx].color = e.target.value; setVariants(n); }} placeholder="Titanium" className="rounded-xl h-11 border-2" /></div>
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rate</Label><Input type="number" value={v.price} onChange={e => { const n = [...variants]; n[idx].price = Number(e.target.value); setVariants(n); }} placeholder="₹0" className="rounded-xl h-11 border-2 font-black text-primary" /></div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-6 border-t border-border/50">
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-foreground">Display</Label><Input placeholder="6.7 OLED" className="h-11 rounded-xl text-sm border-2" value={v.display || ''} onChange={e => { const n = [...variants]; n[idx].display = e.target.value; setVariants(n); }} /></div>
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-foreground">Battery</Label><Input placeholder="5000mAh" className="h-11 rounded-xl text-sm border-2" value={v.battery || ''} onChange={e => { const n = [...variants]; n[idx].battery = e.target.value; setVariants(n); }} /></div>
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-foreground">Processor</Label><Input placeholder="A17 Pro" className="h-11 rounded-xl text-sm border-2" value={v.processor || ''} onChange={e => { const n = [...variants]; n[idx].processor = e.target.value; setVariants(n); }} /></div>
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-foreground">Charging (Zap)</Label><Input placeholder="80W Fast" className="h-11 rounded-xl text-sm border-2" value={v.charging_speed || ''} onChange={e => { const n = [...variants]; n[idx].charging_speed = e.target.value; setVariants(n); }} /></div>
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-foreground">Front Camera</Label><Input placeholder="12MP" className="h-11 rounded-xl text-sm border-2" value={v.front_camera || ''} onChange={e => { const n = [...variants]; n[idx].front_camera = e.target.value; setVariants(n); }} /></div>
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-foreground">Back Camera</Label><Input placeholder="50+12MP" className="h-11 rounded-xl text-sm border-2" value={v.back_camera || ''} onChange={e => { const n = [...variants]; n[idx].back_camera = e.target.value; setVariants(n); }} /></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-12 flex justify-end gap-4 border-t pt-8">
              <Button variant="ghost" onClick={() => setModelDialogOpen(false)} className="rounded-2xl h-12 px-8 font-bold">Cancel</Button>
              <Button onClick={handleSaveModel} disabled={isSaving} className="gradient-primary rounded-2xl h-12 px-12 font-black text-lg shadow-xl shadow-primary/20">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Finalize & Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Smartphones;
