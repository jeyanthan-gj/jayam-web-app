import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit, Trash2, UserX, Loader2, Calendar, Phone, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface StaffMember {
  id: string;
  name: string;
  salary: number | null;
  salary_date: string | null;
  mobile_number: string;
  // User profile data from joined table
  avatar_url?: string;
  birthday?: string;
  email?: string;
}

const Staff = () => {
  const { isAdmin } = useAuth();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [form, setForm] = useState({ name: '', salary: '', salary_date: '', mobile_number: '' });

  const fetchData = async () => {
    setLoading(true);
    if (isAdmin) {
      // Fetch staff and join with the users table using mobile_number = username
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .order('name');

      if (staffError) {
        toast.error(staffError.message);
      } else if (staffData) {
        // Since we don't have a real SQL JOIN in the API for cross-table linking 
        // without foreign keys, we'll fetch users separately and map them.
        const { data: usersData } = await (supabase
          .from('users')
          .select('username, avatar_url, birthday, email'));

        const merged: StaffMember[] = staffData.map((s: any) => {
          const userProfile = (usersData as any[])?.find(u => u.username === s.mobile_number);
          return {
            ...s,
            avatar_url: userProfile?.avatar_url,
            birthday: userProfile?.birthday,
            email: userProfile?.email
          };
        });
        setStaffList(merged);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [isAdmin]);

  const openDialog = (staff?: StaffMember) => {
    if (staff) {
      setEditingStaff(staff);
      setForm({
        name: staff.name,
        salary: String(staff.salary || ''),
        salary_date: staff.salary_date || '',
        mobile_number: staff.mobile_number || ''
      });
    } else {
      setEditingStaff(null);
      setForm({ name: '', salary: '', salary_date: '', mobile_number: '' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.mobile_number.trim()) { toast.error('Mobile number is required'); return; }

    setLoading(true);
    try {
      const staffData = {
        name: form.name,
        salary: form.salary ? Number(form.salary) : null,
        salary_date: form.salary_date || null,
        mobile_number: form.mobile_number,
      };

      if (editingStaff) {
        const { error } = await supabase.from('staff').update(staffData).eq('id', editingStaff.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('staff').insert(staffData);
        if (error) throw error;
      }

      // Create or Update Login Account in 'users' table
      const userData = {
        name: form.name,
        username: form.mobile_number,
        password: form.mobile_number,
        role: 'staff' as const
      };

      if (editingStaff) {
        await supabase.from('users').update(userData).eq('username', editingStaff.mobile_number);
      } else {
        const { error: userError } = await supabase.from('users').insert(userData);
        if (userError && !userError.message.includes('unique')) throw userError;
      }

      setDialogOpen(false);
      fetchData();
      toast.success(editingStaff ? 'Staff updated' : 'Staff created');
    } catch (error: any) {
      toast.error(error.message);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, mobile: string) => {
    if (!confirm('Delete this staff member and their login account?')) return;

    setLoading(true);
    try {
      await Promise.all([
        supabase.from('staff').delete().eq('id', id),
        supabase.from('users').delete().eq('username', mobile)
      ]);
      toast.success('Staff deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
    setLoading(false);
  };

  if (loading && staffList.length === 0) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black font-display tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium uppercase tracking-[0.2em]">{staffList.length} total team members</p>
        </div>
        <Button onClick={() => openDialog()} className="gradient-primary text-primary-foreground rounded-2xl px-6 h-12 font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all">
          <Plus className="w-5 h-5 mr-2" /> Add New Staff
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staffList.map((staff, i) => (
          <div key={staff.id} className="glass-card rounded-[2.5rem] p-8 relative overflow-hidden group hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary/10 transition-colors"></div>

            <div className="flex items-start justify-between relative z-10 mb-6 font-display">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-muted border-2 border-background shadow-md">
                  {staff.avatar_url ? (
                    <img src={staff.avatar_url} className="w-full h-full object-cover" alt={staff.name} />
                  ) : (
                    <div className="w-full h-full gradient-primary flex items-center justify-center text-2xl font-black text-primary-foreground">
                      {staff.name[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-black text-xl tracking-tight leading-tight">{staff.name}</h3>
                  <p className="text-2xl font-black text-primary mt-1">₹{staff.salary?.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => openDialog(staff)}><Edit className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => handleDelete(staff.id, staff.mobile_number)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>

            <div className="space-y-3 relative z-10">
              <div className="flex items-center gap-3 text-sm font-bold text-muted-foreground/80 bg-muted/30 p-3 rounded-xl">
                <Phone className="w-4 h-4 text-primary" />
                {staff.mobile_number}
              </div>

              {staff.email && (
                <div className="flex items-center gap-3 text-sm font-bold text-muted-foreground/80 bg-muted/30 p-3 rounded-xl truncate">
                  <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                  {staff.email}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 p-3 rounded-xl">
                  <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-1">Salary Date</p>
                  <p className="text-xs font-bold flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-primary" /> {staff.salary_date || 'N/A'}
                  </p>
                </div>
                <div className="bg-muted/30 p-3 rounded-xl">
                  <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-1">Birthday</p>
                  <p className="text-xs font-bold flex items-center gap-2 text-pink-500">
                    <Calendar className="w-3 h-3" /> {staff.birthday || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {staffList.length === 0 && (
        <div className="text-center py-20 bg-muted/20 rounded-[3rem] border-2 border-dashed border-muted-foreground/20">
          <UserX className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-xl font-bold font-display opacity-40 uppercase tracking-widest">No staff members found</p>
          <p className="text-sm text-muted-foreground mt-2">Click the button above to add your first team member</p>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader><DialogTitle className="text-2xl font-black text-center">{editingStaff ? 'Edit Staff Member' : 'Add New Staff'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest">Full Name</Label>
              <Input className="rounded-xl h-12 border-2" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Staff name" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest">Mobile Number</Label>
              <Input className="rounded-xl h-12 border-2" value={form.mobile_number} onChange={e => setForm(f => ({ ...f, mobile_number: e.target.value }))} placeholder="Username & Password" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest">Salary (₹)</Label>
                <Input type="number" className="rounded-xl h-12 border-2" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} placeholder="Monthly" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest">Salary Date</Label>
                <Input type="date" className="rounded-xl h-12 border-2" value={form.salary_date} onChange={e => setForm(f => ({ ...f, salary_date: e.target.value }))} />
              </div>
            </div>
            <Button onClick={handleSave} disabled={loading} className="w-full h-12 gradient-primary text-primary-foreground rounded-xl font-bold mt-4 shadow-lg shadow-primary/20">
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {editingStaff ? 'Update Staff & Account' : 'Create Staff & Account'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Staff;
