import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST } from "@/routes/ROUTES";
import { getProfile, updatePassword, updateProfile } from "@/api/profile";

function persistUser(name: string, email: string) {
  localStorage.setItem("username", name);
  localStorage.setItem("email", email);
  try {
    const raw = localStorage.getItem("user");
    const parsed = raw ? JSON.parse(raw) : {};
    localStorage.setItem("user", JSON.stringify({ ...parsed, name, email }));
  } catch {
    /* ignore */
  }
}

export default function ProfilePage() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    meta: QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST,
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    setName(profileQuery.data.name || "");
    setEmail(profileQuery.data.email || "");
  }, [profileQuery.data]);

  async function onSaveProfile(event: FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const next = await updateProfile({ name: name.trim(), email: email.trim() });
      persistUser(next.name, next.email);
      toast({ title: "Profile saved" });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Could not save profile",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function onSavePassword(event: FormEvent) {
    event.preventDefault();
    setSavingPassword(true);
    try {
      await updatePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      toast({ title: "Password updated" });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Could not update password",
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  }

  const role = profileQuery.data?.type || "—";

  return (
    <div className="w-full px-4 sm:px-5 py-4 space-y-3 max-w-2xl">
      {profileQuery.error ? (
        <div className="rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">
          {profileQuery.error instanceof Error
            ? profileQuery.error.message
            : "Failed to load profile"}
        </div>
      ) : null}

      <form onSubmit={onSaveProfile} className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="profile-name">Name</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={profileQuery.isLoading}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={profileQuery.isLoading}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-role">Role</Label>
          <Input id="profile-role" value={role} disabled />
        </div>
        <Button type="submit" disabled={savingProfile || profileQuery.isLoading}>
          {savingProfile ? "Saving…" : "Save profile"}
        </Button>
      </form>

      <form onSubmit={onSavePassword} className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold">Password</h2>
          <p className="text-xs text-muted-foreground mt-1">At least 6 characters.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>
        <Button type="submit" variant="outline" disabled={savingPassword}>
          {savingPassword ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
