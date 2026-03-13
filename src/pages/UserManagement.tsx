import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, Trash2, Shield, User, Key, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface UserItem {
    id: string;
    name: string;
    username: string;
    role: 'admin' | 'staff';
}

const UserManagement = () => {
    const { isAdmin } = useAuth();
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ name: '', username: '', password: '', role: 'staff' as 'admin' | 'staff' });

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('users')
            .select('id, name, username, role')
            .order('name');

        if (error) {
            toast.error('Failed to load users');
        } else {
            setUsers(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (isAdmin) fetchUsers();
    }, [isAdmin]);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.username || !form.password || !form.name) {
            toast.error('Please fill all fields');
            return;
        }

        setCreating(true);
        try {
            const { error } = await supabase
                .from('users')
                .insert({
                    username: form.username,
                    password: form.password,
                    name: form.name,
                    role: form.role
                });

            if (error) throw error;

            toast.success(`Account created for ${form.name}!`);
            setForm({ name: '', username: '', password: '', role: 'staff' });
            fetchUsers();
        } catch (error: any) {
            toast.error(error.message || 'Failed to create user');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteUser = async (id: string, name: string) => {
        if (name === 'Shop Admin' || name === 'admin') {
            toast.error("Cannot delete the primary admin account");
            return;
        }
        if (!confirm(`Delete login account for ${name}?`)) return;

        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) {
            toast.error(error.message);
        } else {
            toast.success('User deleted successfully');
            fetchUsers();
        }
    };

    if (!isAdmin) return <div className="p-8 text-center text-muted-foreground">Access Restricted</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold font-display">User Management</h1>
                <p className="text-muted-foreground mt-1">Manage local login accounts (No email needed)</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <div className="glass-card rounded-2xl p-6 space-y-5">
                        <h2 className="text-xl font-semibold font-display">Create Account</h2>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" />
                            </div>
                            <div className="space-y-2">
                                <Label>Username</Label>
                                <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="staff01" />
                            </div>
                            <div className="space-y-2">
                                <Label>Password</Label>
                                <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={form.role} onValueChange={(v: any) => setForm(f => ({ ...f, role: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="staff">Staff</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={creating}>
                                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                                Save User
                            </Button>
                        </form>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="glass-card rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold font-display">Existing Users</h2>
                            <Button variant="ghost" size="sm" onClick={fetchUsers}><RefreshCw className={loading ? 'animate-spin' : ''} /></Button>
                        </div>
                        <div className="space-y-3">
                            {users.map((u) => (
                                <div key={u.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${u.role === 'admin' ? 'gradient-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                                            {u.name[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium">{u.name}</p>
                                            <p className="text-xs text-muted-foreground">User: {u.username}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-muted text-muted-foreground">{u.role}</span>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id, u.name)}><Trash2 className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
