"use client";

import { ColumnDef } from "@tanstack/react-table";
import formatDate from "@/utils/formatDate";

import { NavLink } from "react-router-dom";
import { routes } from "@/routes/ROUTES";

export type PropertyDetails = {
  type: string;
  class: string;
  assessor: string;
  address: string[];
};

export type CADOwner = {
  name: string;
  address: string;
  mailingAddress: string;
};

export type Properties = {
  propertyId: number;
  clientId: string;
  clientNumber?: string;
  propertyAccount: string;
  propertyDetails: PropertyDetails;
  cadOwner: CADOwner;
  hearingDate: string;
  aoaSigned: string;
  addedOn: string;
  status: number; // 1 = active, 0 = archived
};

export const propertiesColumn: ColumnDef<Properties>[] = [
  {
    accessorKey: "clientId",
    header: "Client #",
    cell: ({ row }) => {
      const clientId = row.original.clientId;
      const clientNumber = row.original.clientNumber ?? clientId;

      return (
        <NavLink to={routes.client.detail(clientId)}>
          <div className="text-blue-400 font-bold">#{clientNumber}</div>
        </NavLink>
      );
    },
  },
  {
    accessorKey: "propertyAccount",
    header: "Property Account#",
    cell: ({ row }) => {
      const propertyAccount = row.original.propertyAccount;

      return (
        <NavLink
          to={routes.properties.view(row.original.propertyId)}
        >
          <div className="text-green-400 font-bold">#{propertyAccount}</div>
        </NavLink>
      );
    },
  },
  {
    accessorKey: "propertyDetails",
    header: "Property Details",
    cell: ({ row }) => {
      const details = row.original.propertyDetails;
      return (
        <div className=" gap-4">
          <div className="flex flex-col">
            <h1 className="text-xs font-bold text-muted-foreground">
              Assessor:
            </h1>
            {details.assessor ? details.assessor : "N/A"}
          </div>{" "}
          <div className="flex flex-col">
            <h1 className="text-xs font-bold text-muted-foreground">
              Address:
            </h1>
            {details.address ? details.address.join(", ") : "N/A"}
          </div>
        </div>
      );
    },
  },
  {
    id: "cadOwner.name",
    accessorFn: (row) => row.cadOwner?.name ?? "",
    header: "CAD Owner",
    cell: ({ row }) => {
      const owner = row.original.cadOwner;
      return (
        <div>
          <div className="flex flex-col">
            <h1 className="text-xs font-bold text-muted-foreground">Name:</h1>
            {owner.name}
          </div>
          <div className="flex flex-col">
            <h1 className="text-xs font-bold text-muted-foreground">Address:</h1>
            {owner.address ?? "N/A"}
          </div>
          <div className="flex flex-col">
            <h1 className="text-xs font-bold text-muted-foreground">Mailing Address:</h1>
            {owner.mailingAddress ?? "N/A"}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "addedOn",
    header: "Added On",
    cell: ({ row }) => {
      const addedOn = row.original.addedOn;
      return <div>{formatDate(addedOn)}</div>;
    },
  },
];
