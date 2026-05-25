"use client";

import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, UserCheck, UserX, Clock, Trash2, Search, Edit, MoreVertical, Briefcase, Phone, Mail, Building, FileText, Activity } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const employeeSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Valid phone number required"),
  role: z.string().min(2, "Role designation is required"),
  salary: z.preprocess((val) => Number(val), z.number().min(0, "Salary must be a positive number")),
  joining_date: z.string().nonempty("Joining date is required"),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const supabase = createClient();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema) as any,
    defaultValues: {
      full_name: "",
      phone: "",
      role: "",
      salary: 0,
      joining_date: "2026-01-01",
    }
  });

  useEffect(() => {
    form.setValue("joining_date", new Date().toISOString().split('T')[0]);
  }, [form]);

  const editForm = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema) as any
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch employees
      const { data: empData } = await supabase.from("employees").select("*").order("created_at", { ascending: false });
      if (empData) setEmployees(empData);
      
      // Fetch today's attendance
      const today = new Date().toISOString().split('T')[0];
      const { data: attData } = await supabase.from("attendance").select("*").eq('date', today);
      if (attData) setAttendance(attData);
    } catch (error) {
      console.error("Failed to fetch employees data:", error);
      toast.error("Failed to sync personnel data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('realtime_employees')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddSubmit = async (data: EmployeeFormValues) => {
    try {
      const { data: branches, error: branchError } = await supabase.from('branches').select('id').limit(1);
      const branchId = branches && branches.length > 0 ? branches[0].id : null;
      
      const names = data.full_name.trim().split(" ");
      const firstName = names[0];
      const lastName = names.length > 1 ? names.slice(1).join(" ") : " "; // fallback to space if no last name to satisfy NOT NULL
      
      const { data: insertedUser, error } = await supabase.from("employees").insert({
        branch_id: branchId,
        first_name: firstName,
        last_name: lastName,
        phone: data.phone,
        designation: data.role,
        base_salary: data.salary,
        joined_at: data.joining_date
      }).select();

      if (error) {
        console.error("Insert Error Payload:", error);
        throw new Error(error.message || "Database insertion failed");
      }

      const newEmp = insertedUser && insertedUser[0];

      await supabase.from("activity_logs").insert({
        action: `Added employee: ${data.full_name}`,
        entity_type: "employees"
      });

      toast.success(`Employee added successfully`, {
        description: newEmp ? `ID: EMP-${newEmp.id.substring(0,5).toUpperCase()}` : ""
      });

      setIsAddOpen(false);
      form.reset();
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to add employee", { description: err.message });
    }
  };

  const openEditModal = (emp: any) => {
    setSelectedEmployee(emp);
    editForm.reset({
      full_name: `${emp.first_name} ${emp.last_name}`.trim(),
      phone: emp.phone || "",
      role: emp.designation || "",
      salary: emp.base_salary || 0,
      joining_date: emp.joined_at || new Date().toISOString().split('T')[0]
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (data: EmployeeFormValues) => {
    if (!selectedEmployee) return;
    try {
      const names = data.full_name.trim().split(" ");
      const firstName = names[0];
      const lastName = names.length > 1 ? names.slice(1).join(" ") : " ";

      const { error } = await supabase.from("employees").update({
        first_name: firstName,
        last_name: lastName,
        phone: data.phone,
        designation: data.role,
        base_salary: data.salary,
        joined_at: data.joining_date,
        updated_at: new Date().toISOString()
      }).eq("id", selectedEmployee.id);

      if (error) throw error;

      toast.success("Employee updated successfully!");
      setIsEditOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update employee");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;
    try {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;

      await supabase.from("activity_logs").insert({
        action: `Deleted employee: ${name}`,
        entity_type: "employees"
      });
      
      toast.success(`Employee ${name} deleted`);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete employee.");
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
      const role = (emp.designation || "").toLowerCase();
      const query = searchQuery.toLowerCase();
      return fullName.includes(query) || role.includes(query);
    });
  }, [employees, searchQuery]);

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const lateCount = attendance.filter(a => a.status === 'late').length;
  const totalCount = employees.length;
  // Calculate explicitly recorded absences or fallback to missing headcount if any check-ins exist
  const explicitAbsent = attendance.filter(a => a.status === 'absent').length;
  const absentCount = explicitAbsent > 0 ? explicitAbsent : Math.max(0, totalCount - presentCount - lateCount);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto flex flex-col h-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              Staff & Attendance <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage personnel profiles, track shifts, and automate payroll.</p>
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={<Button className="h-8 sm:h-10 text-xs sm:text-sm px-2.5 sm:px-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(0,102,255,0.3)] transition-all" />}>
              <Plus className="w-4 h-4 mr-2" /> Register Employee
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[425px] glass-panel border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>Register New Employee</DialogTitle>
                <DialogDescription className="text-muted-foreground">Add a new staff member to your branch operations.</DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(handleAddSubmit)} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input id="full_name" {...form.register("full_name")} className="bg-background/50 border-white/10" placeholder="e.g. Rahul Sharma" />
                  {form.formState.errors.full_name && <p className="text-red-400 text-xs">{form.formState.errors.full_name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" {...form.register("phone")} className="bg-background/50 border-white/10" placeholder="e.g. 9876543210" />
                  {form.formState.errors.phone && <p className="text-red-400 text-xs">{form.formState.errors.phone.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role / Designation</Label>
                  <Input id="role" {...form.register("role")} className="bg-background/50 border-white/10" placeholder="e.g. Pump Attendant" />
                  {form.formState.errors.role && <p className="text-red-400 text-xs">{form.formState.errors.role.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salary">Base Salary (₹)</Label>
                    <Input id="salary" type="number" {...form.register("salary", { valueAsNumber: true })} className="bg-background/50 border-white/10" />
                    {form.formState.errors.salary && <p className="text-red-400 text-xs">{form.formState.errors.salary.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="joining_date">Joining Date</Label>
                    <Input id="joining_date" type="date" {...form.register("joining_date")} className="bg-background/50 border-white/10" />
                    {form.formState.errors.joining_date && <p className="text-red-400 text-xs">{form.formState.errors.joining_date.message}</p>}
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" className="border-white/10" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90">Save Profile</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-[425px] glass-panel border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>Edit Employee</DialogTitle>
                <DialogDescription className="text-muted-foreground">Update staff details and compensation.</DialogDescription>
              </DialogHeader>
              <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_full_name">Full Name</Label>
                  <Input id="edit_full_name" {...editForm.register("full_name")} className="bg-background/50 border-white/10" />
                  {editForm.formState.errors.full_name && <p className="text-red-400 text-xs">{editForm.formState.errors.full_name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_phone">Phone Number</Label>
                  <Input id="edit_phone" {...editForm.register("phone")} className="bg-background/50 border-white/10" />
                  {editForm.formState.errors.phone && <p className="text-red-400 text-xs">{editForm.formState.errors.phone.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_role">Role / Designation</Label>
                  <Input id="edit_role" {...editForm.register("role")} className="bg-background/50 border-white/10" />
                  {editForm.formState.errors.role && <p className="text-red-400 text-xs">{editForm.formState.errors.role.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_salary">Base Salary (₹)</Label>
                    <Input id="edit_salary" type="number" {...editForm.register("salary", { valueAsNumber: true })} className="bg-background/50 border-white/10" />
                    {editForm.formState.errors.salary && <p className="text-red-400 text-xs">{editForm.formState.errors.salary.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_joining_date">Joining Date</Label>
                    <Input id="edit_joining_date" type="date" {...editForm.register("joining_date")} className="bg-background/50 border-white/10" />
                    {editForm.formState.errors.joining_date && <p className="text-red-400 text-xs">{editForm.formState.errors.joining_date.message}</p>}
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" className="border-white/10" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90">Save Changes</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Analytics Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-panel border-white/5 relative overflow-hidden">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Staff</p>
                {loading ? <Skeleton className="h-8 w-12 mt-1 bg-white/10" /> : <h3 className="text-2xl font-bold text-white mt-1">{totalCount}</h3>}
              </div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-white/5">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <UserCheck className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Present Today</p>
                {loading ? <Skeleton className="h-8 w-12 mt-1 bg-white/10" /> : <h3 className="text-2xl font-bold text-white mt-1">{presentCount}</h3>}
              </div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-white/5">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                <UserX className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Absent</p>
                {loading ? <Skeleton className="h-8 w-12 mt-1 bg-white/10" /> : <h3 className="text-2xl font-bold text-white mt-1">{absentCount}</h3>}
              </div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-white/5">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
                <Clock className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Late Check-ins</p>
                {loading ? <Skeleton className="h-8 w-12 mt-1 bg-white/10" /> : <h3 className="text-2xl font-bold text-white mt-1">{lateCount}</h3>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Directory & Controls */}
        <Card className="glass-panel border-white/5 flex-1 flex flex-col overflow-hidden min-h-[500px]">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-4 gap-4">
            <div>
              <CardTitle>Staff Directory</CardTitle>
              <CardDescription>Comprehensive list of all branch personnel.</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, role..." 
                className="pl-9 bg-black/40 border-white/10 text-white w-full transition-all focus:bg-background/80" 
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-auto flex-1">
            <Table>
              <TableHeader className="bg-black/20 sticky top-0 z-10 backdrop-blur-md">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Employee Name</TableHead>
                  <TableHead className="text-muted-foreground hidden md:table-cell">Contact</TableHead>
                  <TableHead className="text-muted-foreground hidden sm:table-cell">Compensation</TableHead>
                  <TableHead className="text-muted-foreground">Live Status</TableHead>
                  <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i} className="border-white/5">
                      <TableCell><Skeleton className="h-10 w-[200px] bg-white/5" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px] bg-white/5" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[80px] bg-white/5" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-[80px] rounded-full bg-white/5" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 ml-auto bg-white/5" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                      <Users className="w-12 h-12 text-white/10 mx-auto mb-3" />
                      No employees found matching your search.
                    </TableCell>
                  </TableRow>
                ) : filteredEmployees.map((emp) => {
                  const attRecord = attendance.find(a => a.employee_id === emp.id);
                  const status = attRecord ? attRecord.status : 'absent';
                  const shortId = `EMP-${emp.id.substring(0, 5).toUpperCase()}`;
                  
                  return (
                    <Sheet key={emp.id}>
                      <TableRow className="border-white/5 hover:bg-white/5 transition-colors cursor-pointer group">
                        <TableCell>
                          <SheetTrigger className="text-left">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border border-white/10 group-hover:border-primary/50 transition-colors">
                                <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                                  {emp.first_name[0]}{emp.last_name[0] || ''}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-white">{emp.first_name} {emp.last_name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 rounded">{shortId}</span>
                                  <span className="text-xs text-muted-foreground">{emp.designation}</span>
                                </div>
                              </div>
                            </div>
                          </SheetTrigger>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm font-medium hidden md:table-cell">{emp.phone || 'N/A'}</TableCell>
                        <TableCell className="text-muted-foreground font-medium text-sm hidden sm:table-cell">₹{Number(emp.base_salary).toLocaleString()}/mo</TableCell>
                        <TableCell>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                            status === 'present' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                            status === 'late' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 
                            'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-white data-[state=open]:bg-white/10" />}>
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[160px] bg-black border-white/10 text-white">
                              <DropdownMenuItem className="cursor-pointer hover:bg-white/10 focus:bg-white/10" onClick={() => openEditModal(emp)}>
                                <Edit className="mr-2 h-4 w-4 text-primary" /> Edit Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer hover:bg-white/10 focus:bg-white/10 text-red-400 focus:text-red-300" onClick={() => handleDelete(emp.id, `${emp.first_name} ${emp.last_name}`)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Terminate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>

                      {/* Employee Profile Slide-out */}
                      <SheetContent className="bg-[#0A0A0A] border-l border-white/10 text-white sm:max-w-md w-full overflow-y-auto">
                        <SheetHeader className="pb-6 border-b border-white/5 text-left">
                          <div className="flex items-center gap-4 mt-6">
                            <Avatar className="h-16 w-16 border-2 border-primary/30 shadow-[0_0_15px_rgba(0,102,255,0.2)]">
                              <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                                {emp.first_name[0]}{emp.last_name[0] || ''}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <SheetTitle className="text-2xl">{emp.first_name} {emp.last_name}</SheetTitle>
                              <SheetDescription className="text-primary font-mono text-xs mt-1 bg-primary/10 inline-block px-2 py-0.5 rounded border border-primary/20">
                                {shortId}
                              </SheetDescription>
                            </div>
                          </div>
                        </SheetHeader>
                        
                        <div className="mt-6">
                          <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="w-full bg-white/5 border border-white/5 p-1 rounded-lg">
                              <TabsTrigger value="overview" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-white">Overview</TabsTrigger>
                              <TabsTrigger value="attendance" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-white">Attendance</TabsTrigger>
                              <TabsTrigger value="payroll" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-white">Payroll</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="overview" className="mt-6 space-y-6">
                              <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Professional Info</h3>
                                <Card className="bg-white/5 border-none p-4 grid gap-4">
                                  <div className="flex items-center gap-3">
                                    <Briefcase className="w-4 h-4 text-primary" />
                                    <div className="text-sm"><span className="text-muted-foreground mr-2">Role:</span> <span className="font-medium text-white">{emp.designation}</span></div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Building className="w-4 h-4 text-emerald-500" />
                                    <div className="text-sm"><span className="text-muted-foreground mr-2">Branch:</span> <span className="font-medium text-white">Main Station</span></div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Activity className="w-4 h-4 text-amber-500" />
                                    <div className="text-sm"><span className="text-muted-foreground mr-2">Joined:</span> <span className="font-medium text-white">{new Date(emp.joined_at).toLocaleDateString()}</span></div>
                                  </div>
                                </Card>
                              </div>
                              <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Details</h3>
                                <Card className="bg-white/5 border-none p-4 grid gap-4">
                                  <div className="flex items-center gap-3">
                                    <Phone className="w-4 h-4 text-primary" />
                                    <div className="text-sm"><span className="text-muted-foreground mr-2">Mobile:</span> <span className="font-medium text-white">{emp.phone || 'Not Provided'}</span></div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Mail className="w-4 h-4 text-primary" />
                                    <div className="text-sm"><span className="text-muted-foreground mr-2">Email:</span> <span className="font-medium text-white">user@smartfuel.os</span></div>
                                  </div>
                                </Card>
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="attendance" className="mt-6 space-y-4">
                              <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                <div className="flex items-center gap-3">
                                  <UserCheck className="w-5 h-5 text-emerald-500" />
                                  <span className="font-semibold text-emerald-400">Current Status</span>
                                </div>
                                <span className={`uppercase font-black text-sm tracking-wider ${status === 'present' ? 'text-emerald-500' : status === 'late' ? 'text-orange-500' : 'text-red-500'}`}>{status}</span>
                              </div>
                              <Card className="bg-white/5 border-white/5 p-4 flex flex-col items-center justify-center py-10 text-center">
                                <Clock className="w-10 h-10 text-white/20 mb-3" />
                                <p className="text-muted-foreground text-sm">Detailed shift logs are integrated into the Shifts Module.</p>
                                <Button variant="outline" className="mt-4 border-white/10 hover:bg-white/10" onClick={() => window.location.href='/shifts'}>Go to Shifts Module</Button>
                              </Card>
                            </TabsContent>

                            <TabsContent value="payroll" className="mt-6 space-y-4">
                              <Card className="bg-primary/10 border-primary/20 p-6 flex flex-col items-center justify-center text-center rounded-xl shadow-[inset_0_0_20px_rgba(0,102,255,0.1)]">
                                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Base Salary</p>
                                <h2 className="text-4xl font-black text-white">₹{Number(emp.base_salary).toLocaleString()}</h2>
                                <p className="text-xs text-primary/70 mt-1">per month</p>
                              </Card>
                              <Card className="bg-white/5 border-white/5 p-4 flex flex-col items-center justify-center py-10 text-center">
                                <FileText className="w-10 h-10 text-white/20 mb-3" />
                                <p className="text-muted-foreground text-sm">Full salary disbursement controls are available in Payroll.</p>
                                <Button variant="outline" className="mt-4 border-white/10 hover:bg-white/10" onClick={() => window.location.href='/payroll'}>Open Payroll Hub</Button>
                              </Card>
                            </TabsContent>
                          </Tabs>
                        </div>
                      </SheetContent>
                    </Sheet>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
