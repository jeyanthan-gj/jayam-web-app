import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Smartphone, Monitor, Cpu, Battery, Zap, Camera, Palette, HardDrive, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const SmartphoneDetail = () => {
  const { id } = useParams();
  const [model, setModel] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [brandName, setBrandName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('models').select('*, variants(*)').eq('id', id!).single();
      if (data) {
        setModel(data);
        if (data.variants && data.variants.length > 0) {
          setSelectedVariant(data.variants[0]);
        }
        const { data: brand } = await supabase.from('brands').select('name').eq('id', data.brand_id).single();
        setBrandName(brand?.name || 'Unknown');
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!model) return <div className="text-center py-12 text-muted-foreground">Model not found</div>;

  const currentSpecs = [
    { icon: Monitor, label: 'Display', value: selectedVariant?.display || model.display },
    { icon: HardDrive, label: 'RAM / ROM', value: selectedVariant?.ram_rom },
    { icon: Palette, label: 'Color', value: selectedVariant?.color },
    { icon: Battery, label: 'Battery', value: selectedVariant?.battery || model.battery },
    { icon: Zap, label: 'Charging', value: selectedVariant?.charging_speed || model.charging_speed },
    { icon: Camera, label: 'Front Camera', value: selectedVariant?.front_camera || model.front_camera },
    { icon: Camera, label: 'Back Camera', value: selectedVariant?.back_camera || model.back_camera },
    { icon: Cpu, label: 'Processor', value: selectedVariant?.processor || model.processor },
  ].filter(s => s.value);

  return (
    <div className="space-y-6 animate-fade-in">
      <Link to="/smartphones">
        <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Smartphones</Button>
      </Link>

      <div className="glass-card rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-8 mb-8">
          <div className="w-full md:w-1/3 aspect-square glass-card rounded-2xl flex items-center justify-center p-8 bg-muted/30 border-border">
            {selectedVariant?.image_url || model.image_url ? (
              <img src={selectedVariant?.image_url || model.image_url} alt={model.name} className="max-h-full max-w-full object-contain animate-fade-in" key={selectedVariant?.id} />
            ) : (
              <Smartphone className="w-20 h-20 text-muted-foreground opacity-20" />
            )}
          </div>

          <div className="flex-1">
            <p className="text-sm text-primary font-medium tracking-wide uppercase">{brandName}</p>
            <h1 className="text-3xl md:text-4xl font-bold font-display mt-1">{model.name}</h1>

            <div className="mt-6 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Select Variant</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {model.variants?.map((v: any) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`px-4 py-2 rounded-xl border-2 transition-all text-sm font-bold ${selectedVariant?.id === v.id
                          ? 'border-primary bg-primary/10 text-primary shadow-md'
                          : 'border-border bg-muted/50 hover:bg-muted text-muted-foreground'
                        }`}
                    >
                      {v.ram_rom} • {v.color}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Price</p>
                <p className="text-4xl font-black text-gradient-primary mt-1">₹{selectedVariant?.price?.toLocaleString() || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold font-display flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" /> Technical Specifications
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {currentSpecs.map((spec, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl border border-border/50 hover:border-primary/30 transition-colors group">
                <div className="w-11 h-11 rounded-xl bg-background border flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <spec.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">{spec.label}</p>
                  <p className="font-bold text-sm text-foreground">{spec.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartphoneDetail;
