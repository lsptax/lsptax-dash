import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { House } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListDetailLink } from "../ListDetailLink";
import { propertyDisplayFields } from "@/utils/propertyDisplay";
import type { Property } from "@/types/types";

export function AssociatedPropertiesSection({
  properties,
  addHref,
  propertyHref,
}: {
  properties: Property[];
  addHref: string;
  propertyHref: (property: Property) => string;
}) {
  const [selectedCounty, setSelectedCounty] = useState("All");

  const uniqueCounties = useMemo(
    () =>
      Array.from(
        new Set(
          properties
            .map((p) => propertyDisplayFields(p).cadCounty)
            .filter((county) => county && county !== "—")
        )
      ),
    [properties]
  );

  const filteredProperties = properties.filter((p) => {
    if (selectedCounty === "All") return true;
    return propertyDisplayFields(p).cadCounty === selectedCounty;
  });

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Associated properties</h2>
        <NavLink to={addHref}>
          <Button variant="outline" size="sm">
            Add Properties
          </Button>
        </NavLink>
      </div>

      {uniqueCounties.length > 1 && (
        <div className="mb-4 flex items-center gap-2">
          <label htmlFor="county-filter" className="text-sm font-medium text-muted-foreground">
            Filter by County:
          </label>
          <select
            id="county-filter"
            value={selectedCounty}
            onChange={(e) => setSelectedCounty(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="All">All</option>
            {uniqueCounties.map((county) => (
              <option key={county} value={county}>
                {county}
              </option>
            ))}
          </select>
        </div>
      )}

      {filteredProperties.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProperties.map((property) => (
            <AssociatedPropertyCard
              key={property.id}
              property={property}
              to={propertyHref(property)}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground col-span-full">
          No properties found for the selected county.
        </p>
      )}
    </div>
  );
}

function AssociatedPropertyCard({
  property,
  to,
}: {
  property: Property;
  to: string;
}) {
  const { accountNumber, cadCounty, nameOnCad } = propertyDisplayFields(property);

  return (
    <ListDetailLink to={to} className="block">
      <div className="h-full rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50 hover:border-primary/40">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <House size={18} className="text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground truncate">
            {accountNumber}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground mb-1">
          <span className="font-medium text-foreground/80">County:</span> {cadCounty}
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground/80">CAD Details:</span>{" "}
          {nameOnCad}
        </p>
      </div>
    </ListDetailLink>
  );
}
