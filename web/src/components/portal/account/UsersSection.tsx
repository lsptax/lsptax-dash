import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deletePortalUser, listPortalUsers, updatePortalUser, type PortalUser } from "@/api/users";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST } from "@/routes/ROUTES";
import { isOwnerDashboardRole, readStoredUser } from "@/utils/ownerRole";

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "client", label: "Client" },
] as const;

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLES.map((role) => [role.value, role.label])
);

function roleLabel(type: string) {
  const key = String(type || "client").trim().toLowerCase();
  return ROLE_LABELS[key] || type || "Client";
}

function formatJoined(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function signedInUserId() {
  const id = Number(readStoredUser()?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function persistSignedInUser(next: { name: string; email: string; type: string }) {
  localStorage.setItem("username", next.name);
  localStorage.setItem("email", next.email);
  try {
    const raw = localStorage.getItem("user");
    const parsed = raw ? JSON.parse(raw) : {};
    localStorage.setItem(
      "user",
      JSON.stringify({ ...parsed, name: next.name, email: next.email, type: next.type })
    );
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("portal-user-updated"));
}

export default function UsersSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentId = signedInUserId();
  const [editing, setEditing] = useState<PortalUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("client");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<PortalUser | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deletingBusy, setDeletingBusy] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["portal-users"],
    queryFn: listPortalUsers,
    meta: QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST,
  });

  const users = usersQuery.data ?? [];
  const managementCount = users.filter((user) => isOwnerDashboardRole(user.type)).length;

  function openEdit(user: PortalUser) {
    setEditing(user);
    setEditName(user.name);
    setEditRole(String(user.type || "client").trim().toLowerCase());
  }

  function openDelete(user: PortalUser) {
    setDeleting(user);
    setConfirmEmail("");
  }

  async function refreshUsers() {
    await queryClient.invalidateQueries({ queryKey: ["portal-users"] });
    await queryClient.invalidateQueries({ queryKey: ["staff"] });
  }

  async function onSaveEdit() {
    if (!editing) return;
    const name = editName.trim();
    if (!name) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const updated = await updatePortalUser(editing.id, { name, type: editRole });
      const isSelf = currentId === editing.id;
      const roleChanged = isSelf && updated.type !== editing.type;
      if (isSelf) {
        persistSignedInUser({
          name: updated.name,
          email: updated.email,
          type: updated.type,
        });
      }
      await refreshUsers();
      setEditing(null);
      if (roleChanged) {
        window.location.reload();
        return;
      }
      toast({ title: "User updated" });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Could not update user",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function onConfirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await deletePortalUser(deleting.id);
      await refreshUsers();
      setDeleting(null);
      setConfirmEmail("");
      toast({ title: "User deleted" });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Could not delete user",
        variant: "destructive",
      });
    } finally {
      setDeletingBusy(false);
    }
  }

  if (usersQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading users…</p>;
  }

  if (usersQuery.error) {
    return (
      <p className="text-sm text-destructive">
        {usersQuery.error instanceof Error ? usersQuery.error.message : "Failed to load users"}
      </p>
    );
  }

  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">No portal users yet.</p>;
  }

  const deleteConfirmed =
    deleting != null &&
    confirmEmail.trim().toLowerCase() === deleting.email.trim().toLowerCase();

  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isSelf = currentId === user.id;
              const lastManagement = isOwnerDashboardRole(user.type) && managementCount <= 1;
              const deleteReason = isSelf
                ? "You can't delete the account you're signed in with."
                : lastManagement
                  ? "The only owner or admin account can't be deleted."
                  : null;
              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.name}
                    {isSelf ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">You</span>
                    ) : null}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{roleLabel(user.type)}</TableCell>
                  <TableCell>{formatJoined(user.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button type="button" variant="outline" size="sm" onClick={() => openEdit(user)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={Boolean(deleteReason)}
                        title={deleteReason ?? undefined}
                        onClick={() => openDelete(user)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editing != null} onOpenChange={(open) => !saving && !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>
              {editing ? `Update the name and role for ${editing.email}.` : "Update this user."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-name">Name</Label>
              <Input
                id="edit-user-name"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                autoComplete="off"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-role">Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger id="edit-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void onSaveEdit()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleting != null}
        onOpenChange={(open) => {
          if (deletingBusy) return;
          if (!open) {
            setDeleting(null);
            setConfirmEmail("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this user permanently?</DialogTitle>
            <DialogDescription>
              {deleting
                ? `${deleting.name} (${deleting.email}) will lose access to the portal.`
                : "This login will be removed."}
            </DialogDescription>
          </DialogHeader>
          {deleting ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm text-destructive">
                This permanently deletes the login. They cannot sign in again, and the account
                cannot be restored. Properties they consult stay on file, and they are removed as
                the consultant.
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-delete-email">
                  Type <span className="font-medium text-foreground">{deleting.email}</span> to
                  confirm
                </Label>
                <Input
                  id="confirm-delete-email"
                  value={confirmEmail}
                  onChange={(event) => setConfirmEmail(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={deleting.email}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deletingBusy}
              onClick={() => {
                setDeleting(null);
                setConfirmEmail("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!deleteConfirmed || deletingBusy}
              onClick={() => void onConfirmDelete()}
            >
              {deletingBusy ? "Deleting…" : "Delete user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
