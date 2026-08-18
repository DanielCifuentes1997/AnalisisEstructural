/**
 * Los esquemas de @proyecto/shared-types no son solo validacion de
 * formato: en ellos viven decisiones de producto (a quien se le pide
 * matricula, cuando el apartamento es obligatorio). Se prueban aqui
 * porque son el contrato que comparten backend y frontend.
 */
import {
  createPropertyRequestSchema,
  proposeVisitDateSchema,
  registerVolunteerSchema,
  reportAbuseSchema,
  requiresProfessionalLicense,
  sendMessageSchema,
  updateVolunteerProfileSchema,
  type Profession,
} from "@proyecto/shared-types";

const baseRequest = {
  location: { latitude: 4.5339, longitude: -75.6811 },
  address_text: "Carrera 14 #20-30, Armenia, Quindio",
  reporter_name: "Rosa Delgado",
  damages_json: { selected: ["fisuras_grietas"], description: "Grieta grande" },
  photo_urls: [],
};

const baseVolunteer = {
  full_name: "Elena Vargas",
  id_document_number: "1094563882",
  photo_url: "https://example.com/e.jpg",
};

describe("Matricula profesional segun profesion", () => {
  const CON_MATRICULA: Profession[] = [
    "ARQUITECTO",
    "INGENIERO_CIVIL",
    "INGENIERO_CIVIL_ESTRUCTURAS",
    "INGENIERO_GEOTECNISTA",
  ];
  const SIN_MATRICULA: Profession[] = [
    "CONSTRUCTOR",
    "TECNOLOGO_OBRAS_CIVILES",
    "TECNICO_CONSTRUCCION",
    "MAESTRO_DE_OBRA",
    "ESTUDIANTE_ARQUITECTURA_INGENIERIA_CIVIL",
    "OTRO",
  ];

  it.each(CON_MATRICULA)("%s la requiere", (profession) => {
    expect(requiresProfessionalLicense(profession)).toBe(true);
  });

  it.each(SIN_MATRICULA)("%s no la requiere", (profession) => {
    expect(requiresProfessionalLicense(profession)).toBe(false);
  });

  it("sin profesion elegida no la requiere", () => {
    expect(requiresProfessionalLicense(null)).toBe(false);
    expect(requiresProfessionalLicense(undefined)).toBe(false);
  });

  it("un arquitecto sin matricula no puede registrarse", () => {
    const result = registerVolunteerSchema.safeParse({
      ...baseVolunteer,
      declared_profession: "ARQUITECTO",
    });

    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toMatch(/matricula|tarjeta/i);
  });

  it("un maestro de obra sin matricula si puede", () => {
    const result = registerVolunteerSchema.safeParse({
      ...baseVolunteer,
      declared_profession: "MAESTRO_DE_OBRA",
    });

    expect(result.success).toBe(true);
  });

  it("una matricula con solo espacios no cuenta", () => {
    const result = registerVolunteerSchema.safeParse({
      ...baseVolunteer,
      declared_profession: "INGENIERO_CIVIL",
      professional_license: "    ",
    });

    expect(result.success).toBe(false);
  });

  it("la foto de perfil es obligatoria", () => {
    const result = registerVolunteerSchema.safeParse({
      full_name: "Elena Vargas",
      id_document_number: "1094563882",
      declared_profession: "CONSTRUCTOR",
    });

    expect(result.success).toBe(false);
  });

  // El bucket de fotos de analistas es privado: se guarda la ruta dentro
  // del bucket, no una URL publica.
  it("acepta una ruta de almacenamiento como foto", () => {
    const result = registerVolunteerSchema.safeParse({
      ...baseVolunteer,
      photo_url: "perfiles/8f3a-2b19.jpg",
      declared_profession: "CONSTRUCTOR",
    });

    expect(result.success).toBe(true);
  });

  it("editar el perfil mantiene la exigencia de matricula", () => {
    const result = updateVolunteerProfileSchema.safeParse({
      ...baseVolunteer,
      professional_license: "COPNIA-123",
    });

    expect(result.success).toBe(true);
  });
});

describe("Complemento de direccion segun tipo de vivienda", () => {
  // En un edificio, sin apartamento el analista llega a la porteria y
  // no sabe a que puerta tocar.
  it("un apartamento sin complemento se rechaza", () => {
    const result = createPropertyRequestSchema.safeParse({
      ...baseRequest,
      housing_type: "APARTAMENTO",
    });

    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toMatch(/apartamento/i);
  });

  it("un apartamento con complemento se acepta", () => {
    const result = createPropertyRequestSchema.safeParse({
      ...baseRequest,
      housing_type: "APARTAMENTO",
      address_complement: "Torre/Bloque 4, Apto 502",
    });

    expect(result.success).toBe(true);
  });

  it("una casa sin complemento se acepta", () => {
    const result = createPropertyRequestSchema.safeParse({
      ...baseRequest,
      housing_type: "CASA",
    });

    expect(result.success).toBe(true);
  });

  it("un complemento en blanco no salva al apartamento", () => {
    const result = createPropertyRequestSchema.safeParse({
      ...baseRequest,
      housing_type: "APARTAMENTO",
      address_complement: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("la descripcion del problema es obligatoria", () => {
    const result = createPropertyRequestSchema.safeParse({
      ...baseRequest,
      housing_type: "CASA",
      damages_json: { selected: [], description: "" },
    });

    expect(result.success).toBe(false);
  });

  it("se puede reportar sin marcar ningun daño, describiendolo", () => {
    const result = createPropertyRequestSchema.safeParse({
      ...baseRequest,
      housing_type: "CASA",
      damages_json: { selected: [], description: "Se siente raro el piso" },
    });

    expect(result.success).toBe(true);
  });

  it("rechaza coordenadas fuera de rango", () => {
    const result = createPropertyRequestSchema.safeParse({
      ...baseRequest,
      housing_type: "CASA",
      location: { latitude: 200, longitude: -75 },
    });

    expect(result.success).toBe(false);
  });
});

describe("Denuncias", () => {
  it("el motivo 'Otro' obliga a explicar que paso", () => {
    const result = reportAbuseSchema.safeParse({ reason: "OTRO" });

    expect(result.success).toBe(false);
  });

  it("los demas motivos no obligan a detallar", () => {
    const result = reportAbuseSchema.safeParse({ reason: "PIDIO_DINERO" });

    expect(result.success).toBe(true);
  });

  it("rechaza un motivo inventado", () => {
    const result = reportAbuseSchema.safeParse({ reason: "CUALQUIER_COSA" });

    expect(result.success).toBe(false);
  });
});

describe("Mensajes del chat", () => {
  it("no se puede enviar un mensaje vacio", () => {
    expect(sendMessageSchema.safeParse({ body: "   " }).success).toBe(false);
  });

  it("limita el largo para que nadie inunde la conversacion", () => {
    const result = sendMessageSchema.safeParse({ body: "a".repeat(1001) });

    expect(result.success).toBe(false);
  });

  it("recorta los espacios de los extremos", () => {
    const result = sendMessageSchema.safeParse({ body: "  Buenas tardes  " });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.body).toBe("Buenas tardes");
  });
});

describe("Propuesta de fecha para la visita", () => {
  const inDays = (days: number) =>
    new Date(Date.now() + days * 24 * 3600_000).toISOString();

  it("acepta una fecha proxima", () => {
    expect(
      proposeVisitDateSchema.safeParse({ proposed_date: inDays(2) }).success,
    ).toBe(true);
  });

  it("rechaza una fecha que ya paso", () => {
    const result = proposeVisitDateSchema.safeParse({
      proposed_date: inDays(-1),
    });

    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toMatch(/paso/i);
  });

  // Mas alla de un mes deja de ser "cuadrar una visita" y casi siempre
  // es un error de digitacion del año.
  it("rechaza una fecha demasiado lejana", () => {
    expect(
      proposeVisitDateSchema.safeParse({ proposed_date: inDays(60) }).success,
    ).toBe(false);
  });

  it("acepta una nota opcional junto a la fecha", () => {
    const result = proposeVisitDateSchema.safeParse({
      proposed_date: inDays(1),
      note: "Mejor en la mañana",
    });

    expect(result.success).toBe(true);
  });

  it("rechaza una fecha sin formato valido", () => {
    expect(
      proposeVisitDateSchema.safeParse({ proposed_date: "el viernes" }).success,
    ).toBe(false);
  });
});
