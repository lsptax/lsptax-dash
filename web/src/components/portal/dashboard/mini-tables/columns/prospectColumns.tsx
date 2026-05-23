"use client";
import { ColumnDef } from "@tanstack/react-table";

export type Prospects = {
  id: string;
  name: string;
  email: string;
  mobile: string;
};

export const prospectColumn: ColumnDef<Prospects>[] = [
  {
    accessorKey: "id",
    header: "Prospect #",
  },
  {
    accessorKey: "name",
    header: "Prospect Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "mobile",
    header: "Mobile",
  },
];
