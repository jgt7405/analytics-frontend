"use client";

import SharedCWVTable, {
  type CWVTableProps,
} from "@/components/features/shared/CWVTable";

export default function CWVTable(props: CWVTableProps) {
  return <SharedCWVTable {...props} sport="football" />;
}
