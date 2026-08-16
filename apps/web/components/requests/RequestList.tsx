import type { PropertyRequestListItem } from "../../lib/types";
import { RequestCard } from "./RequestCard";

export function RequestList({ requests }: { requests: PropertyRequestListItem[] }) {
  if (requests.length === 0) {
    return (
      <p className="py-8 text-center text-gray-500">
        Todavia no has reportado ninguna vivienda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {requests.map((request) => (
        <RequestCard key={request.id} request={request} />
      ))}
    </div>
  );
}
