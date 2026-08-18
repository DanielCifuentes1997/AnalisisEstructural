import type {
  AbuseReason,
  MessageKind,
  ProposalStatus,
  Damages,
  HousingType,
  Profession,
  Role,
  RequestState,
  UserStatus,
  VerificationStatus,
  ZoneStatus,
} from "@proyecto/shared-types";

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
  // Solo indica si el admin ya reviso su matricula; el numero en si
  // nunca sale del panel de administracion.
  is_verified: boolean;
}

// ---------- Panel de administracion (@Roles("ADMIN")) ----------

export interface AdminMetrics {
  requests_by_state: Partial<Record<RequestState, number>>;
  requests_total: number;
  volunteers_by_verification: Partial<Record<VerificationStatus, number>>;
  volunteers_active: number;
  users_total: number;
  users_suspended: number;
}

// Unica respuesta del sistema que expone matricula y cedula: existe
// para que el admin las verifique a mano.
export interface AdminVolunteer {
  id: string;
  user_id: string;
  full_name: string;
  id_document_number: string;
  declared_profession: Profession;
  professional_license: string | null;
  photo_url: string;
  phone_number: string;
  user_status: UserStatus;
  is_active: boolean;
  verification_status: VerificationStatus;
  verified_at: string | null;
  review_notes: string | null;
  visits_count: number;
  active_visits_count: number;
  completed_count: number;
  released_by_self_count: number;
  released_by_admin_count: number;
  // null cuando todavia hay menos de 3 casos cerrados: el porcentaje
  // no diria nada con tan poca muestra.
  completion_rate: number | null;
  is_underperforming: boolean;
  pending_notices_count: number;
  abuse_reports_count: number;
  created_at: string;
}

export interface AdminAbuseReport {
  id: string;
  visit_id: string;
  reason: AbuseReason;
  details: string | null;
  created_at: string;
  reviewed_at: string | null;
  volunteer_id: string;
  volunteer_name: string;
  citizen_name: string;
  request_state: RequestState;
}

export interface AdminRequest {
  id: string;
  reporter_name: string;
  address_text: string;
  address_complement: string | null;
  housing_type: HousingType;
  state: RequestState;
  created_at: string;
  updated_at: string;
  citizen_phone: string;
  assigned_volunteer_name: string | null;
  hours_since_update: number;
  is_stuck_candidate: boolean;
}

export interface AdminAuditLog {
  id: string;
  timestamp: string;
  actor_id: string;
  actor_phone: string | null;
  action: string;
  resource_id: string;
  prior_state: string | null;
  new_state: string | null;
  notes: string | null;
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
  address_complement: string | null;
  housing_type: HousingType;
  damages_json: DamagesResponse;
  priority_score: number;
  state: RequestState;
  created_at: string;
  updated_at: string;
}

export interface VisitNoteZone {
  zone_name: string;
  status: ZoneStatus;
  comment: string | null;
}

export interface VisitNote {
  general_comments: string | null;
  created_at: string;
  zones: VisitNoteZone[];
}

export interface PropertyRequestDetail extends PropertyRequestListItem {
  assigned_volunteer: AssignedVolunteer | null;
  // Solo llega cuando el analista ya hizo check-in y espera el PIN.
  verification_pin: string | null;
  visit_note: VisitNote | null;
  // Solo llega mientras hay analista asignado: abre el chat.
  active_visit_id: string | null;
}

// GET /v1/visits - los casos que este voluntario ya acepto.
export interface VisitListItem {
  visit_id: string;
  request_id: string;
  released_at: string | null;
  created_at: string;
  reporter_name: string;
  address_text: string;
  address_complement: string | null;
  housing_type: HousingType;
  state: RequestState;
}

export interface PropertyRequestCreated extends PropertyRequestListItem {
  latitude: number;
  longitude: number;
}

// GET /v1/requests/heatmap - punto real y todo lo que el analista
// necesita para decidir si acepta (daños, descripcion, fotos). Lo que NO
// viaja aqui es la identidad: direccion, nombre y telefono del ciudadano.
export interface HeatmapItem {
  id: string;
  housing_type: HousingType;
  state: RequestState;
  created_at: string;
  damages_json: DamagesResponse;
  latitude: number;
  longitude: number;
}

// POST /v1/requests/:id/accept y GET /v1/visits/:id - solo visible para
// el voluntario asignado, coordenadas exactas + contacto del ciudadano.
export interface VisitDetail {
  id: string;
  reporter_name: string;
  address_text: string;
  address_complement: string | null;
  housing_type: HousingType;
  damages_json: DamagesResponse;
  state: RequestState;
  latitude: number;
  longitude: number;
  visit_id: string;
  released_at: string | null;
}

// ---------- Chat entre ciudadano y analista ----------

export interface ChatMessage {
  kind: MessageKind;
  proposed_date: string | null;
  proposal_status: ProposalStatus | null;
  // Solo la otra parte puede responder una propuesta viva.
  can_respond: boolean;
  id: string;
  body: string;
  sender_role: Role;
  is_mine: boolean;
  created_at: string;
  read_at: string | null;
}

export interface Conversation {
  scheduled_at: string | null;
  can_propose_date: boolean;
  visit_id: string;
  request_state: RequestState;
  is_closed: boolean;
  counterpart: { name: string; photo_url: string | null };
  messages: ChatMessage[];
}

export interface UnreadSummary {
  total: number;
  by_visit: Record<string, number>;
}

// ---------- Perfil propio del analista ----------

export interface AdminNotice {
  id: string;
  body: string;
  created_at: string;
  resolved_at: string | null;
}

export interface MyVolunteerProfile {
  id: string;
  full_name: string;
  id_document_number: string;
  declared_profession: Profession;
  professional_license: string | null;
  photo_url: string;
  phone_number: string;
  verification_status: VerificationStatus;
  is_active: boolean;
  review_notes: string | null;
  notices: AdminNotice[];
}

// ---------- Moderacion de conversaciones (admin) ----------

export interface AdminConversationSummary {
  visit_id: string;
  citizen_name: string;
  volunteer_name: string;
  request_state: RequestState;
  released_at: string | null;
  messages_count: number;
  created_at: string;
}

export interface AdminConversation {
  visit_id: string;
  citizen_name: string;
  volunteer_name: string;
  request_state: RequestState;
  released_at: string | null;
  messages: {
    id: string;
    body: string;
    sender_role: Role;
    author: string;
    created_at: string;
  }[];
}

export interface ConsentStatus {
  current_version: string;
  accepted_version: string | null;
  accepted_at: string | null;
  needs_acceptance: boolean;
}
