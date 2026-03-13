import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Smartphone, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const Login = () => {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(form.email, form.password);
    if (error) {
      toast.error(error);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-8 text-center">
          <div className="w-24 h-24 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-background ring-8 ring-primary/5 mb-6 bg-white p-2">
            <img src="/brand-logo.jpg" alt="Logo icon" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-4xl font-black font-display text-gradient-primary uppercase tracking-tight">Jayam Mobiles</h1>
          <p className="text-muted-foreground mt-2 text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Shop Management System</p>
        </div>

        {/* Form */}
        <div className="glass-card rounded-2xl p-6 space-y-5">
          <h2 className="text-xl font-semibold font-display text-center">
            Welcome Back
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Username / Email</Label>
              <Input
                id="email"
                placeholder="admin"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
