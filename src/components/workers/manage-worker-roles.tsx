

"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLanguage } from "@/hooks/use-language";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { dbLoad, dbSave, dbClearAndSave } from "@/lib/db";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "../ui/label";


const roleSchema = z.object({
  name: z.string().min(2, "Role name is required."),
});

type RoleFormValues = z.infer<typeof roleSchema>;
type WorkerRole = {
    id: string;
    name: string;
}

export function ManageWorkerRoles() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [roles, setRoles] = useState<WorkerRole[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<WorkerRole | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<WorkerRole | null>(null);
  const [deleteConfirmationCode, setDeleteConfirmationCode] = useState('');
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
  });

  const DATA_KEY = "worker-roles";

  const fetchRoles = async () => {
    const storedRoles = await dbLoad(DATA_KEY);
    setRoles(storedRoles);
  };
  
  useEffect(() => {
    fetchRoles();
  }, []);

  const openDialog = (role: WorkerRole | null = null) => {
    setEditingRole(role);
    form.reset(role ? { name: role.name } : { name: '' });
    setIsDialogOpen(true);
  }

  const openDeleteDialog = (role: WorkerRole) => {
    setRoleToDelete(role);
    setDeleteConfirmationCode(String(Math.floor(1000 + Math.random() * 9000)));
    setDeleteConfirmationInput('');
  }

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;

    const updatedRoles = roles.filter(r => r.id !== roleToDelete.id);
    await dbClearAndSave(DATA_KEY, updatedRoles);
    setRoles(updatedRoles);
    toast({ title: "Role Deleted" });
    setRoleToDelete(null);
  }

  const onSubmit = async (data: RoleFormValues) => {
    const currentRoles = await dbLoad(DATA_KEY);
    if (editingRole) {
        const index = currentRoles.findIndex((r: WorkerRole) => r.id === editingRole.id);
        if (index > -1) {
            currentRoles[index] = { ...editingRole, ...data };
        }
    } else {
        const newRole = {
            id: `ROLE-${Date.now()}`,
            name: data.name,
        };
        currentRoles.push(newRole);
    }
    await dbSave(DATA_KEY, currentRoles);
    setRoles(currentRoles);
    toast({ title: editingRole ? "Role Updated" : "Role Created" });
    setIsDialogOpen(false);
    setEditingRole(null);
  };

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Manage Worker Roles</CardTitle>
            <CardDescription>Create and manage worker roles/designations.</CardDescription>
        </div>
        <Button onClick={() => openDialog()}>
            <Icons.plus className="mr-2" /> Add New Role
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(role)}>
                        <Icons.settings className="h-4 w-4" />
                    </Button>
                     <Button variant="ghost" size="icon" className="text-destructive" onClick={() => openDeleteDialog(role)}>
                        <Icons.trash className="h-4 w-4" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
             {roles.length === 0 && (
                <TableRow>
                    <TableCell colSpan={2} className="text-center h-24">No roles found.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit' : 'Add'} Worker Role</DialogTitle>
          </DialogHeader>
           <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
               <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Machine Operator" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <DialogFooter>
                    <Button type="submit">{editingRole ? 'Save Changes' : 'Create Role'}</Button>
                </DialogFooter>
            </form>
           </Form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone and will permanently delete the role '{roleToDelete?.name}'. To confirm, please type <code className="font-mono text-base bg-muted px-2 py-1 rounded-md">{deleteConfirmationCode}</code> in the box below.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="delete-confirm">Confirmation Code</Label>
                <Input
                    id="delete-confirm"
                    value={deleteConfirmationInput}
                    onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                    placeholder="Enter the code to confirm"
                    autoFocus
                />
            </div>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleteConfirmationInput !== deleteConfirmationCode} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

