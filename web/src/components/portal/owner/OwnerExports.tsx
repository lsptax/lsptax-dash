import { useState } from "react";
import { ChevronDown, Download, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { downloadFilteredRosterXlsx } from "@/api/ownerDashboard";
import type { OwnerFilters } from "@/utils/ownerFilters";

export default function OwnerExports({ filters }: { filters: OwnerFilters }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [clients, setClients] = useState(true);
  const [properties, setProperties] = useState(true);

  async function exportSelected() {
    if (!clients && !properties) {
      toast({ title: "Pick client details, property details, or both.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await downloadFilteredRosterXlsx(filters, { clients, properties });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Download failed",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={busy}>
          {busy ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {busy ? "Exporting…" : "Export"}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Uses the filters above
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={clients}
          onCheckedChange={(checked) => setClients(Boolean(checked))}
          onSelect={(event) => event.preventDefault()}
        >
          Client details
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={properties}
          onCheckedChange={(checked) => setProperties(Boolean(checked))}
          onSelect={(event) => event.preventDefault()}
        >
          Property details
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!clients && !properties} onSelect={() => exportSelected()}>
          Download{clients && properties ? " both sheets" : ""}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
