import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDraftSearch } from "@/hooks/useListSearchParams";
import { mergeClientListParams } from "@/utils/listParams/clients";
import { mergePropertyListParams } from "@/utils/listParams/properties";
import { mergeProspectListParams } from "@/utils/listParams/prospects";
import { mergeInvoiceListParams } from "@/components/portal/invoices/invoiceListSearchParams";
import { routes } from "@/routes/ROUTES";
import { cn } from "@/lib/utils";

type SearchTarget = "clients" | "properties" | "prospects" | "invoices" | "global";

function resolveSearchTarget(path: string): {
  target: SearchTarget;
  placeholder: string;
  label: string;
} {
  if (path === "properties") {
    return {
      target: "properties",
      placeholder: "Search account, property ID, or client…",
      label: "Search properties",
    };
  }
  if (path === "clients/list-client") {
    return {
      target: "clients",
      placeholder: "Search name or client number…",
      label: "Search clients",
    };
  }
  if (path === "prospects/list-prospect") {
    return {
      target: "prospects",
      placeholder: "Search prospect name…",
      label: "Search prospects",
    };
  }
  if (path === "invoices") {
    return {
      target: "invoices",
      placeholder: "Search account or #client number…",
      label: "Search invoices",
    };
  }
  return {
    target: "global",
    placeholder: "Search clients, properties, prospects…",
    label: "Search portal",
  };
}

export function HeaderSearch({ className }: { className?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const path = location.pathname.replace(/^\/portal\/?/, "").split("?")[0] ?? "";
  const { target, placeholder, label } = resolveSearchTarget(path);
  const appliedSearch = target === "global" ? "" : (searchParams.get("search") ?? "");

  const commitToList = (value: string) => {
    const search = value.trim();
    switch (target) {
      case "properties":
        setSearchParams(mergePropertyListParams(searchParams, { search, offset: 0 }), {
          replace: true,
        });
        break;
      case "clients":
        setSearchParams(mergeClientListParams(searchParams, { search, offset: 0 }), {
          replace: true,
        });
        break;
      case "prospects":
        setSearchParams(mergeProspectListParams(searchParams, { search, offset: 0 }), {
          replace: true,
        });
        break;
      case "invoices":
        setSearchParams(mergeInvoiceListParams(searchParams, { search, offset: 0 }), {
          replace: true,
        });
        break;
      case "global":
        if (search) navigate(routes.clients.list({ search }));
        break;
    }
  };

  const { searchTerm, setSearchTerm, commitSearch, clearSearch } = useDraftSearch(
    appliedSearch,
    commitToList
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA") return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <form
      className={cn("relative min-w-0 w-full", className)}
      onSubmit={(event) => {
        event.preventDefault();
        commitSearch();
      }}
    >
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        className="h-9 bg-muted/50 pl-8 pr-16"
      />
      {searchTerm || appliedSearch ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearSearch}
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground sm:inline">
          {typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
            ? "⌘K"
            : "Ctrl K"}
        </kbd>
      )}
    </form>
  );
}
