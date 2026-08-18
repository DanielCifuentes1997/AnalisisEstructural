/**
 * Prisma simulado para los tests unitarios de los servicios.
 *
 * Se prueba la logica de negocio (reglas, permisos, transiciones), no el
 * SQL: para eso estan las pruebas end-to-end contra la API real. Aqui lo
 * que importa es que cada regla se cumpla sin depender de que Supabase
 * este disponible.
 */
export type PrismaMock = ReturnType<typeof createPrismaMock>;

const model = () => ({
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
  groupBy: jest.fn(),
});

export function createPrismaMock() {
  // $transaction se declara vacio y se implementa despues: si se
  // definiera aqui referenciando a `mock`, TypeScript no podria inferir
  // el tipo (se referenciaria a si mismo).
  const mock = {
    users: model(),
    volunteerProfiles: model(),
    propertyRequests: model(),
    visits: model(),
    messages: model(),
    abuseReports: model(),
    adminNotices: model(),
    visitNotes: model(),
    visitNoteZones: model(),
    auditLogs: model(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $executeRawUnsafe: jest.fn(),
    $transaction: jest.fn(),
  };

  // Soporta las dos formas: el arreglo de operaciones y la interactiva
  // con callback (la que usa acceptRequest para reclamar el caso).
  mock.$transaction.mockImplementation(
    async (arg: unknown): Promise<unknown> => {
      if (typeof arg === "function") {
        return (arg as (tx: unknown) => Promise<unknown>)(mock);
      }
      return Promise.all(arg as Promise<unknown>[]);
    },
  );

  return mock;
}

/** Servicio de bitacora simulado: solo verificamos que se llame bien. */
export function createAuditMock() {
  return {
    record: jest.fn().mockResolvedValue(undefined),
    list: jest.fn().mockResolvedValue([]),
  };
}
