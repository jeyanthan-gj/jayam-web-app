import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { User, Phone, Mail, Calendar, Camera, Save, Loader2, Upload, Lock, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const Profile = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [pwdLoading, setPwdLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState({
        username: '',
        birthday: '',
        email: '',
        avatar_url: ''
    });

    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username || '',
                birthday: user.birthday || '',
                email: user.email || '',
                avatar_url: user.avatar_url || ''
            });
        }
    }, [user]);

    if (!user) return null;

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
            toast.success('Photo uploaded! Click Save to finish.');
        } catch (error: any) {
            toast.error(error.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.username.trim()) {
            toast.error("Mobile number (username) cannot be empty");
            return;
        }

        setLoading(true);
        try {
            // Check if username is already taken by another user
            if (formData.username !== user.username) {
                const { data: existingUser } = await supabase
                    .from('users')
                    .select('id')
                    .eq('username', formData.username)
                    .maybeSingle();

                if (existingUser) {
                    toast.error("Mobile number already in use");
                    setLoading(false);
                    return;
                }
            }

            // 1. Update the staff table first if needed (to avoid constraint issues if any, 
            // though they are currently loosely linked)
            if (user.role === 'staff') {
                const { error: staffError } = await supabase
                    .from('staff')
                    .update({ mobile_number: formData.username })
                    .eq('mobile_number', user.username);

                if (staffError) throw staffError;
            }

            // 2. Update the users table
            const { error } = await supabase
                .from('users')
                .update({
                    username: formData.username,
                    birthday: formData.birthday || null,
                    email: formData.email,
                    avatar_url: formData.avatar_url
                })
                .eq('id', user.id);

            if (error) throw error;

            toast.success('Profile updated successfully!');

            const updatedUser = { ...user, ...formData };
            localStorage.setItem('jayam_user', JSON.stringify(updatedUser));

            // If username changed, they might need to logout and login again, 
            // but for now let's just reload.
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            toast.error("Please fill all password fields");
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        setPwdLoading(true);
        try {
            const { data: userData, error: fetchError } = await supabase
                .from('users')
                .select('password')
                .eq('id', user.id)
                .single();

            if (fetchError) throw fetchError;

            if ((userData as any).password !== passwordData.oldPassword) {
                toast.error("Incorrect old password");
                return;
            }

            const { error: updateError } = await supabase
                .from('users')
                .update({ password: passwordData.newPassword })
                .eq('id', user.id);

            if (updateError) throw updateError;

            toast.success("Password changed successfully!");
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            toast.error(error.message || "Failed to change password");
        } finally {
            setPwdLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div>
                <h1 className="text-3xl font-black font-display tracking-tight">My Profile</h1>
                <p className="text-muted-foreground mt-1 text-sm font-medium uppercase tracking-[0.15em]">Manage your personal information</p>
            </div>

            <div className="max-w-4xl space-y-8">
                {/* Personal Information Card */}
                <div className="glass-card rounded-[2.5rem] p-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl transition-all duration-700 group-hover:bg-primary/10"></div>

                    <div className="flex flex-col md:flex-row items-center gap-10 relative z-10 border-b border-border/50 pb-10 mb-10">
                        <div className="relative group/avatar">
                            <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden bg-muted flex items-center justify-center shadow-2xl transition-transform duration-500 group-hover/avatar:scale-105 border-4 border-background">
                                {formData.avatar_url ? (
                                    <img src={formData.avatar_url} className="w-full h-full object-cover" alt="Profile" />
                                ) : (
                                    <div className="w-full h-full gradient-primary flex items-center justify-center text-5xl font-black text-primary-foreground">
                                        {user.name?.[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xl hover:scale-110 transition-all cursor-pointer z-20"
                            >
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                        </div>

                        <div className="flex-1 text-center md:text-left space-y-2">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                <h2 className="text-4xl font-black font-display tracking-tight">{user.name}</h2>
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted text-muted-foreground'}`}>
                                    {user.role}
                                </span>
                            </div>
                            <p className="text-lg text-muted-foreground font-medium italic">@{user.username}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        <div className="space-y-6">
                            <div className="space-y-4 bg-muted/30 p-6 rounded-[2rem] border border-border/50 transition-all hover:bg-muted/50 hover:border-primary/20">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mobile Number</p>
                                </div>
                                <Input
                                    value={formData.username}
                                    onChange={e => setFormData(d => ({ ...d, username: e.target.value }))}
                                    className="rounded-xl border-2 h-12 font-bold"
                                    placeholder="Enter mobile number"
                                />
                                <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-widest italic opacity-60">This is also your login username</p>
                            </div>

                            <div className="space-y-4 bg-muted/30 p-6 rounded-[2rem] border border-border/50 transition-all">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Birthday</p>
                                </div>
                                <Input
                                    type="date"
                                    value={formData.birthday}
                                    onChange={e => setFormData(d => ({ ...d, birthday: e.target.value }))}
                                    className="rounded-xl border-2 h-12 font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-4 bg-muted/30 p-6 rounded-[2rem] border border-border/50 transition-all">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email Address</p>
                                </div>
                                <Input
                                    type="email"
                                    placeholder="yourname@gmail.com"
                                    value={formData.email}
                                    onChange={e => setFormData(d => ({ ...d, email: e.target.value }))}
                                    className="rounded-xl border-2 h-12 font-bold"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 flex justify-end relative z-10">
                        <Button
                            onClick={handleSave}
                            disabled={loading || uploading}
                            className="gradient-primary text-primary-foreground rounded-2xl px-10 h-14 font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <Save className="w-5 h-5 mr-3" />}
                            Update Profile
                        </Button>
                    </div>
                </div>

                {/* Change Password Card */}
                <div className="glass-card rounded-[2.5rem] p-10 relative overflow-hidden group border-2 border-transparent hover:border-primary/10 transition-all">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full -ml-32 -mt-32 blur-3xl transition-all duration-700"></div>

                    <div className="flex items-center gap-4 mb-10 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
                            <Lock className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black font-display tracking-tight uppercase">Change Password</h2>
                            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Update your security credentials</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Current Password</Label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={passwordData.oldPassword}
                                onChange={e => setPasswordData(p => ({ ...p, oldPassword: e.target.value }))}
                                className="rounded-xl border-2 h-12 font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">New Password</Label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={passwordData.newPassword}
                                onChange={e => setPasswordData(p => ({ ...p, newPassword: e.target.value }))}
                                className="rounded-xl border-2 h-12 font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Confirm New Password</Label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={passwordData.confirmPassword}
                                onChange={e => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))}
                                className="rounded-xl border-2 h-12 font-bold"
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end relative z-10">
                        <Button
                            onClick={handleChangePassword}
                            disabled={pwdLoading}
                            className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-2xl px-10 h-14 font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all"
                        >
                            {pwdLoading ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <ShieldCheck className="w-5 h-5 mr-3" />}
                            Update Password
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
