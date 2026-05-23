"use client";
import { ColumnDef } from "@tanstack/react-table";

export type ContractOwner = {
  name: string;
  email: string;
  phone: string;
  percent: string;
};

// Main columns definition
export const contractOwnerColumns: ColumnDef<ContractOwner>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "percent",
    header: "Percent",
  },

];
