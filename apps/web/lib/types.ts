import type { RequestState } from "@proyecto/shared-types";

// No existen en @proyecto/shared-types: solo hay schema del body del
// POST, no de las respuestas. Ademas la forma difiere entre POST (trae
// latitude/longitude via SQL crudo) y GET (Prisma excluye el campo
// geography automaticamente).
export interface PropertyRequestListItem {
  id: string;
  citizen_id: string;
  structural_type: string;
  damages_json: Record<string, unknown>;
  priority_score: number;
  state: RequestState;
  created_at: string;
  updated_at: string;
}

export type PropertyRequestDetail = PropertyRequestListItem;

export interface PropertyRequestCreated extends PropertyRequestListItem {
  latitude: number;
  longitude: number;
}
