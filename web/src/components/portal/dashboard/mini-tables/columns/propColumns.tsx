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
  propertyId: string;
  clientId: string;
  clientNumber?: string;
  propertyAccount: string;
  propertyDetails: PropertyDetails;
  cadOwner: CADOwner;
  hearingDate: string;
  aoaSigned: string;
  addedOn: string;
  status: number;
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
      const id = row.original.propertyAccount;
      return <div className="text-green-500 font-bold">#{id}</div>;
    },
  },
  {
    accessorKey: "cadOwner",
    header: "CAD Owner",
    cell: ({ row }) => {
      const owner = row.original.cadOwner;
      return <div className="">{owner.name}</div>;
    },
  },
  {
    accessorKey: "aoaSigned",
    header: "AOA Signed",
    cell: ({ row }) => {
      const aoaSigned = row.original.aoaSigned;
      return <div>{formatDate(aoaSigned)}</div>;
    },
  },
  // {
  //   accessorKey: "addedOn",
  //   header: "Added On",
  //   cell: ({ row }) => {
  //     const addedOn = row.original.addedOn;
  //     return <div>{formatDate(addedOn)}</div>;
  //   },
  // },
];
