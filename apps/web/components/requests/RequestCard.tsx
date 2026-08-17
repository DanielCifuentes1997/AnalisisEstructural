import Link from "next/link";
import type { HousingType } from "@proyecto/shared-types";
import { StatusBadge } from "../ui/StatusBadge";
import { Card } from "../ui/Card";
import type { PropertyRequestListItem } from "../../lib/types";

const HOUSING_TYPE_LABELS: Record<HousingType, string> = {
  CASA: "Casa",
  APARTAMENTO: "Apartamento",
};

export function RequestCard({ request }: { request: PropertyRequestListItem }) {
  const createdAt = new Date(request.created_at).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Link href={`/requests/${request.id}`}>
      <Card className="flex items-center justify-between gap-4 transition-shadow hover:shadow-md">
        <div>
          <p className="font-medium text-sand-900">
            {HOUSING_TYPE_LABELS[request.housing_type]} — {request.address_text}
          </p>
          <p className="text-sm text-sand-500">Reportada el {createdAt}</p>
        </div>
        <StatusBadge state={request.state} />
      </Card>
    </Link>
  );
}
