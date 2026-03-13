import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
    MapPin, Navigation, Clock, CheckCircle2, XCircle, Loader2,
    RotateCw, ShieldCheck, BarChart3, TrendingUp, Filter, Users,
    Calendar as CalendarIcon, ArrowRight, UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
    format, startOfMonth, endOfMonth, eachDayOfInterval, isPast, isToday,
    startOfYear, endOfYear, subMonths, parseISO, isWithinInterval,
    getYear, startOfDay
} from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';

// Shop coordinates
const SHOP_LAT = 8.149201;
const SHOP_LNG = 77.5716038;
const RADIUS_KM = 1.0;

const Attendance = () => {
    const { user, isAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [marking, setMarking] = useState(false);
    const [todaysAttendance, setTodaysAttendance] = useState<any>(null);
    const [distance, setDistance] = useState<number | null>(null);
    const [allAttendance, setAllAttendance] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);

    // Selection state
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [targetStaff, setTargetStaff] = useState<any>(null);

    // Filters
    const [filterType, setFilterType] = useState<'month' | 'year' | 'lifetime'>('month');
    const [selectedYear, setSelectedYear] = useState<string>(format(new Date(), 'yyyy'));
    const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [dailyAttendance, setDailyAttendance] = useState<any[]>([]);

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 1. Fetch Staff List
            const { data: staffs } = await supabase.from('staff').select('*').order('name');
            setStaffList(staffs || []);

            if (isAdmin) {
                // 2. Fetch Daily Attendance for all staff
                const { data: dailyAtt } = await supabase
                    .from('attendance')
                    .select('*')
                    .eq('date', selectedDate);
                setDailyAttendance(dailyAtt || []);
            }

            // 3. Identify Target Staff (Self if staff, or selected if admin)
            let staffIdToFetch = selectedStaffId;
            if (!isAdmin) {
                const self = (staffs as any[])?.find(s => s.mobile_number === user.username);
                staffIdToFetch = self?.id || null;
            }

            if (staffIdToFetch) {
                const staffObj = staffs?.find(s => s.id === staffIdToFetch);
                setTargetStaff(staffObj);

                const { data: att } = await supabase
                    .from('attendance')
                    .select('*')
                    .eq('staff_id', staffIdToFetch)
                    .order('date', { ascending: false });

                if (att) {
                    setAllAttendance(att);
                    setTodaysAttendance(att.find(a => a.date === format(new Date(), 'yyyy-MM-dd')));
                }
            } else {
                setAllAttendance([]);
                setTodaysAttendance(null);
                setTargetStaff(null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Stats calculation
    const filteredStats = useMemo(() => {
        if (!targetStaff) return null;

        let startBound: Date;
        let endBound: Date = new Date();
        const staffJoinDate = new Date(targetStaff.created_at);

        if (filterType === 'lifetime') startBound = staffJoinDate;
        else if (filterType === 'year') {
            startBound = startOfYear(new Date(parseInt(selectedYear), 0, 1));
            endBound = endOfYear(new Date(parseInt(selectedYear), 11, 31));
            if (getYear(endBound) === getYear(new Date())) endBound = new Date();
        } else {
            const [y, m] = selectedMonth.split('-').map(Number);
            startBound = startOfMonth(new Date(y, m - 1, 1));
            endBound = endOfMonth(new Date(y, m - 1, 1));
            const now = new Date();
            if (isWithinInterval(now, { start: startBound, end: endBound })) endBound = now;
        }

        if (startBound < staffJoinDate) startBound = staffJoinDate;
        if (startBound > endBound) return { present: 0, absent: 0, avgTime: 'N/A', chartData: [] };

        const intervalDays = eachDayOfInterval({ start: startOfDay(startBound), end: startOfDay(endBound) });
        let presentCount = 0;
        let absentCount = 0;
        let totalMinutes = 0;
        let totalPresentWithTime = 0;

        intervalDays.forEach(day => {
            const dStr = format(day, 'yyyy-MM-dd');
            const record = allAttendance.find(a => a.date === dStr);
            if (record?.status === 'present') {
                presentCount++;
                if (record.created_at) {
                    const time = new Date(record.created_at);
                    totalMinutes += (time.getHours() * 60 + time.getMinutes());
                    totalPresentWithTime++;
                }
            } else if (isPast(day) && !isToday(day)) {
                absentCount++;
            }
        });

        const avgMin = totalPresentWithTime > 0 ? totalMinutes / totalPresentWithTime : 0;
        const avgTime = totalPresentWithTime > 0
            ? `${Math.floor(avgMin / 60) % 12 || 12}:${Math.floor(avgMin % 60).toString().padStart(2, '0')} ${Math.floor(avgMin / 60) >= 12 ? 'PM' : 'AM'}`
            : 'N/A';

        return {
            present: presentCount,
            absent: absentCount,
            avgTime,
            chartData: [
                { name: 'Present', value: presentCount, fill: '#22c55e' },
                { name: 'Absent', value: absentCount, fill: '#ef4444' }
            ]
        };
    }, [allAttendance, filterType, selectedYear, selectedMonth, targetStaff]);

    // Summary logic for Admin (What's happening today)
    const todaySummary = useMemo(() => {
        if (!isAdmin) return null;
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        return staffList.map(s => {
            // Find if this staff marked attendance today
            // Note: need to fetch today's attendance for everyone if admin
            // For now, let's assume we fetch all attendance records for today elsewhere
            return {
                id: s.id,
                name: s.name,
                // Placeholder: will need a separate fetch or joined data for full admin summary
            };
        });
    }, [staffList, isAdmin]);

    useEffect(() => { fetchData(); if (!isAdmin) handleGetLocation(); }, [user, selectedStaffId, selectedDate]);

    const handleGetLocation = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => setDistance(calculateDistance(pos.coords.latitude, pos.coords.longitude, SHOP_LAT, SHOP_LNG)),
            () => toast.error("Please enable GPS"),
            { enableHighAccuracy: true }
        );
    };

    const markAttendance = async () => {
        if (!user || distance === null || distance > RADIUS_KM) return;
        setMarking(true);
        try {
            const { data: staffData } = await supabase.from('staff')
                .select('id')
                .eq('mobile_number', user.username)
                .single();

            if (staffData) {
                await supabase.from('attendance').insert({
                    staff_id: staffData.id,
                    date: format(new Date(), 'yyyy-MM-dd'),
                    status: 'present'
                });
                toast.success("Done!"); fetchData();
            }
        } catch { toast.error("Failed"); } finally { setMarking(false); }
    };

    const years = useMemo(() => {
        const arr = [];
        for (let i = getYear(new Date()); i >= 2024; i--) arr.push(String(i));
        return arr;
    }, []);

    const isInside = distance !== null && distance <= RADIUS_KM;

    if (loading && !staffList.length) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-12 animate-fade-in pb-20">
            {/* Header Area */}
            <div className="flex flex-col items-center justify-center space-y-4 pt-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50 backdrop-blur-md">
                    {isAdmin ? <Users className="w-4 h-4 text-primary" /> : <MapPin className="w-4 h-4 text-primary" />}
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                        {isAdmin ? 'Staff Attendance Monitor' : 'Location Verification Lock'}
                    </span>
                </div>
                <h1 className="text-5xl font-black font-display tracking-tighter text-center">
                    {isAdmin ? 'Attendance Terminal' : 'Daily Presence'}
                </h1>
            </div>

            {/* Admin Overview (Today's Status) */}
            {isAdmin && (
                <div className="max-w-6xl mx-auto w-full px-4 space-y-10">
                    <div className="glass-card rounded-[3rem] p-10 border-4 border-background shadow-2xl overflow-hidden relative group">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black font-display tracking-tight">Attendance Summary</h3>
                                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest leading-3 italic">Live status of all members</p>
                            </div>

                            <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-2xl border border-border/50">
                                <Button
                                    variant={selectedDate === format(new Date(), 'yyyy-MM-dd') ? 'default' : 'ghost'}
                                    onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                                    className="rounded-xl font-black text-[10px] tracking-widest h-10"
                                >
                                    TODAY
                                </Button>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="bg-background border-2 border-border/50 rounded-xl px-4 h-10 font-black text-[10px] tracking-wider outline-none focus:border-primary transition-colors"
                                />
                            </div>
                        </div>

                        {/* Quick Dashboard */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                            <div className="bg-success/5 border border-success/20 p-6 rounded-3xl flex items-center justify-between group-hover:bg-success/10 transition-colors">
                                <div>
                                    <p className="text-[10px] font-black text-success uppercase tracking-widest mb-1">
                                        {selectedDate === format(new Date(), 'yyyy-MM-dd') ? 'Present Today' : 'Present on Date'}
                                    </p>
                                    <p className="text-4xl font-black font-display">{dailyAttendance.filter(a => a.status === 'present').length}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-success/20 flex items-center justify-center text-success"><UserCheck className="w-6 h-6" /></div>
                            </div>
                            <div className="bg-destructive/5 border border-destructive/20 p-6 rounded-3xl flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-destructive uppercase tracking-widest mb-1">
                                        {selectedDate === format(new Date(), 'yyyy-MM-dd') ? 'Absent Today' : 'Absent on Date'}
                                    </p>
                                    <p className="text-4xl font-black font-display">{staffList.length - dailyAttendance.filter(a => a.status === 'present').length}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-destructive/20 flex items-center justify-center text-destructive"><XCircle className="w-6 h-6" /></div>
                            </div>
                            <div className="bg-primary/5 border border-primary/20 p-6 rounded-3xl flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Total Staff</p>
                                    <p className="text-4xl font-black font-display">{staffList.length}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary"><Users className="w-6 h-6" /></div>
                            </div>
                        </div>
                    </div>

                    {/* Attendance Table */}
                    <div className="glass-card rounded-[3rem] p-8 border-4 border-background shadow-xl">
                        <div className="flex items-center justify-between mb-8 px-4">
                            <h3 className="text-xl font-black font-display tracking-tight uppercase">Daily Log: {format(parseISO(selectedDate), 'MMMM dd, yyyy')}</h3>
                            <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">
                                <Clock className="w-3 h-3" />
                                {format(new Date(), 'hh:mm a')}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-separate border-spacing-y-3">
                                <thead>
                                    <tr className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-4">
                                        <th className="pb-4 pl-6">Staff Member</th>
                                        <th className="pb-4">Status</th>
                                        <th className="pb-4">Check-in Time</th>
                                        <th className="pb-4 pr-6 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {staffList.map(staff => {
                                        const record = dailyAttendance.find(a => a.staff_id === staff.id);
                                        const isPresent = record?.status === 'present';

                                        return (
                                            <tr key={staff.id} className="group hover:scale-[1.01] transition-all duration-300">
                                                <td className="bg-muted/30 rounded-l-[1.5rem] py-5 pl-8 border-y-2 border-l-2 border-transparent group-hover:border-primary/20 group-hover:bg-background">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black">
                                                            {staff.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-xs uppercase tracking-tight">{staff.name}</p>
                                                            <p className="text-[10px] font-bold text-muted-foreground">{staff.role || 'Staff'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="bg-muted/30 py-5 border-y-2 border-transparent group-hover:border-primary/20 group-hover:bg-background">
                                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isPresent ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                                                        {isPresent ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                        {isPresent ? 'Present' : 'Absent'}
                                                    </div>
                                                </td>
                                                <td className="bg-muted/30 py-5 border-y-2 border-transparent group-hover:border-primary/20 group-hover:bg-background font-black text-[10px] text-muted-foreground">
                                                    {isPresent ? (record.created_at ? format(new Date(record.created_at), 'hh:mm a') : '--:--') : '--:--'}
                                                </td>
                                                <td className="bg-muted/30 rounded-r-[1.5rem] py-5 pr-8 border-y-2 border-r-2 border-transparent group-hover:border-primary/20 group-hover:bg-background text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedStaffId(staff.id);
                                                            setTimeout(() => {
                                                                document.getElementById('staff-stats-section')?.scrollIntoView({ behavior: 'smooth' });
                                                            }, 100);
                                                        }}
                                                        className={`rounded-xl font-black text-[9px] uppercase tracking-widest h-8 ${selectedStaffId === staff.id ? 'bg-primary text-white hover:bg-primary' : 'hover:bg-primary/10 hover:text-primary'}`}
                                                    >
                                                        Review history <ArrowRight className="w-3 h-3 ml-1" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Staff Mark Presence (only for staff, or if staff picker selected nothing) */}
            {!isAdmin && (
                <div className="w-full max-w-lg mx-auto">
                    <div className="glass-card rounded-[3rem] p-10 border-4 border-background shadow-2xl relative overflow-hidden group bg-gradient-to-b from-background to-muted/20">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                        <div className="space-y-10 relative z-10 flex flex-col items-center">
                            <div className="relative">
                                <div className={`absolute inset-0 rounded-full blur-3xl opacity-20 ${isInside ? 'bg-success' : 'bg-primary'}`}></div>
                                <div className="relative w-48 h-48 rounded-full border-2 border-border/50 flex items-center justify-center bg-background/50 backdrop-blur-xl shadow-inner group-hover:scale-110 transition-transform duration-700">
                                    {distance === null ? (
                                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                                    ) : todaysAttendance ? (
                                        <CheckCircle2 className="w-20 h-20 text-success animate-bounce-in" />
                                    ) : (
                                        <div className="relative flex items-center justify-center">
                                            <div className={`absolute w-32 h-32 rounded-full border-2 ${isInside ? 'border-success/30 animate-ping' : 'border-primary/30 animate-ping'}`}></div>
                                            {isInside ? (
                                                <Navigation className="w-16 h-16 text-success drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]" />
                                            ) : (
                                                <MapPin className="w-16 h-16 text-primary drop-shadow-[0_0_15px_rgba(234,88,12,0.3)]" />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="text-center space-y-2">
                                {todaysAttendance ? (
                                    <>
                                        <h3 className="text-3xl font-black font-display text-success uppercase">Verified</h3>
                                        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">{format(new Date(todaysAttendance.created_at), 'hh:mm a')}</p>
                                    </>
                                ) : distance !== null ? (
                                    <>
                                        <h3 className="text-4xl font-black font-display tracking-tight">{distance.toFixed(2)} <span className="text-lg text-muted-foreground">KM</span></h3>
                                        <button onClick={handleGetLocation} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-primary"><RotateCw className="w-3 h-3" /></button>
                                    </>
                                ) : <p className="text-muted-foreground italic font-medium">Radar search...</p>}
                            </div>

                            {!todaysAttendance && (
                                <Button
                                    onClick={markAttendance}
                                    disabled={marking || !isInside}
                                    className={`w-full h-18 rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-2xl transition-all border-b-4 active:border-b-0 active:translate-y-1 ${isInside ? 'bg-success text-success-foreground border-success-foreground/20' : 'bg-muted text-muted-foreground'}`}
                                >
                                    {marking ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <ShieldCheck className="w-6 h-6 mr-3" />}
                                    Mark Presence
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Results Dashboard (Stats) */}
            <div id="staff-stats-section" className="scroll-mt-20">
                {targetStaff && filteredStats ? (
                    <div className="max-w-6xl mx-auto w-full px-4 space-y-8 pt-10 border-t border-border/50 animate-fade-in">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <BarChart3 className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black font-display tracking-tight uppercase">{targetStaff.name}&apos;s Stats</h2>
                                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest leading-3 italic">Performance history detail</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 bg-muted/30 p-3 rounded-[2rem] border border-border/50">
                                <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                                    <SelectTrigger className="w-[110px] rounded-xl border-2 font-black uppercase text-[9px] tracking-widest h-10 shadow-sm transition-all hover:scale-105">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl font-black uppercase text-[10px] tracking-widest">
                                        <SelectItem value="month">Monthly</SelectItem>
                                        <SelectItem value="year">Yearly</SelectItem>
                                        <SelectItem value="lifetime">Lifetime</SelectItem>
                                    </SelectContent>
                                </Select>
                                {filterType === 'month' && (
                                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                        <SelectTrigger className="w-[150px] rounded-xl border-2 font-black uppercase text-[9px] h-10 shadow-sm transition-all hover:scale-105">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl font-black uppercase text-[10px]">
                                            {[...Array(12)].map((_, i) => {
                                                const d = subMonths(new Date(), i);
                                                return <SelectItem key={i} value={format(d, 'yyyy-MM')}>{format(d, 'MMMM yyyy')}</SelectItem>;
                                            })}
                                        </SelectContent>
                                    </Select>
                                )}
                                {filterType === 'year' && (
                                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                                        <SelectTrigger className="w-[110px] rounded-xl border-2 font-black h-10 shadow-sm transition-all hover:scale-105">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl font-black">
                                            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="glass-card p-6 rounded-[2rem] border-2 border-transparent hover:border-primary/20 transition-all">
                                <p className="text-[10px] font-black text-muted-foreground uppercase mb-2">Avg. Check-in</p>
                                <p className="text-2xl font-black font-display text-primary">{filteredStats.avgTime}</p>
                                <div className="mt-4 flex items-center justify-between"><Clock className="w-4 h-4 text-primary" /><span className="text-[9px] font-bold text-success uppercase">Punctual</span></div>
                            </div>
                            <div className="glass-card p-6 rounded-[2rem] border-2 border-transparent hover:border-success/20 transition-all">
                                <p className="text-[10px] font-black text-muted-foreground uppercase mb-2">Present Days</p>
                                <p className="text-2xl font-black font-display text-success">{filteredStats.present} Days</p>
                                <div className="mt-4 flex items-center justify-between"><CheckCircle2 className="w-4 h-4 text-success" /><span className="text-[9px] font-bold text-muted-foreground uppercase">Verified</span></div>
                            </div>
                            <div className="glass-card p-6 rounded-[2rem] border-2 border-transparent hover:border-destructive/20 transition-all">
                                <p className="text-[10px] font-black text-muted-foreground uppercase mb-2">Absent Days</p>
                                <p className="text-2xl font-black font-display text-destructive">{filteredStats.absent} Days</p>
                                <div className="mt-4 flex items-center justify-between"><XCircle className="w-4 h-4 text-destructive" /><span className="text-[9px] font-bold text-muted-foreground uppercase">Unverified</span></div>
                            </div>
                            <div className="glass-card p-6 rounded-[2rem] bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xl">
                                <p className="text-[10px] font-black uppercase mb-2 opacity-80">Score</p>
                                <p className="text-2xl font-black font-display">
                                    {(filteredStats.present + filteredStats.absent) > 0 ? `${Math.round((filteredStats.present / (filteredStats.present + filteredStats.absent)) * 100)}%` : '0%'}
                                </p>
                                <div className="mt-4 flex items-center justify-between"><ShieldCheck className="w-4 h-4" /><span className="text-[9px] font-black uppercase opacity-80">Trust Index</span></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 glass-card p-8 rounded-[3rem] relative overflow-hidden group">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] italic underline underline-offset-8 decoration-primary/40">Performance Chart</h3>
                                </div>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={filteredStats.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: 'currentColor' }} dy={10} />
                                            <Tooltip cursor={{ fill: 'rgba(234, 88, 12, 0.05)' }} contentStyle={{ borderRadius: '1.5rem', border: 'none', background: '#18181b', color: '#fff', fontSize: '10px', fontWeight: 900 }} />
                                            <Bar dataKey="value" stroke="none" radius={[15, 15, 0, 0]} barSize={60}>
                                                {filteredStats.chartData.map((e: any, i: number) => <Cell key={`cell-${i}`} fill={e.fill} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="glass-card p-8 rounded-[3rem] flex flex-col items-center justify-center text-center relative overflow-hidden">
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-4">Breakdown</h3>
                                <div className="h-[250px] w-full relative flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={filteredStats.chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" animationDuration={1000}>
                                                {filteredStats.chartData.map((e: any, i: number) => <Cell key={`pie-cell-${i}`} fill={e.fill} stroke="none" />)}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '1rem', fontWeight: 900 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-3xl font-black font-display italic">
                                            {(filteredStats.present + filteredStats.absent) > 0 ? Math.round((filteredStats.present / (filteredStats.present + filteredStats.absent)) * 100) : '0'}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : isAdmin && (
                    <div className="max-w-6xl mx-auto w-full px-4 text-center py-24 opacity-50 bg-muted/20 rounded-[4rem] border-4 border-dashed border-muted-foreground/10 my-10 animate-pulse">
                        <Users className="w-16 h-16 mx-auto mb-6 text-muted-foreground" />
                        <h3 className="text-2xl font-black text-muted-foreground font-display tracking-tight uppercase italic underline underline-offset-8 decoration-primary/40">
                            Select a member above to see detailed history
                        </h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Attendance;
