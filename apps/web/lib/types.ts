import type { Damages, HousingType, RequestState } from "@proyecto/shared-types";

// El backend guarda photo_urls dentro de damages_json (no tiene columna
// propia todavia), asi que en las respuestas el shape es mas amplio que
// el Damages de entrada del POST.
export type DamagesResponse = Damages & { photo_urls?: string[] };

// Info minima del voluntario asignado, revelada al ciudadano solo
// despues de que acepta el caso (ver findOneForCitizen en el backend).
export interface AssignedVolunteer {
  full_name: string;
  photo_url: string;
  phone_number: string;
}

// No existen en @proyecto/shared-types: solo hay schema del body del
// POST, no de las respuestas. Ademas la forma difiere entre POST (trae
// latitude/longitude via SQL crudo) y GET (Prisma excluye el campo
// geography automaticamente).
export interface PropertyRequestListItem {
  id: string;
  citizen_id: string;
  reporter_name: string;
  address_text: string;
  housing_type: HousingType;
  damages_json: DamagesResponse;
  priority_score: number;
  state: RequestState;
  created_at: string;
  updated_at: string;
}

export interface PropertyRequestDetail extends PropertyRequestListItem {
  assigned_volunteer: AssignedVolunteer | null;
}

export interface PropertyRequestCreated extends PropertyRequestListItem {
  latitude: number;
  longitude: number;
}

// GET /v1/requests/heatmap - coordenadas ofuscadas, sin datos del ciudadano.
export interface HeatmapItem {
  id: string;
  housing_type: HousingType;
  state: RequestState;
  created_at: string;
  latitude: number;
  longitude: number;
}

// POST /v1/requests/:id/accept y GET /v1/visits/:id - solo visible para
// el voluntario asignado, coordenadas exactas + contacto del ciudadano.
export interface VisitDetail {
  id: string;
  reporter_name: string;
  address_text: string;
  housing_type: HousingType;
  damages_json: DamagesResponse;
  state: RequestState;
  latitude: number;
  longitude: number;
  citizen_phone: string;
  visit_id: string;
}
