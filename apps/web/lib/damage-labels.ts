export const DAMAGE_OPTIONS = [
  { key: "fisuras_grietas", label: "Fisuras o grietas visibles en paredes o columnas" },
  { key: "inclinacion", label: "Inclinacion de piso o paredes" },
  { key: "colapso_parcial", label: "Colapso parcial de alguna zona" },
  { key: "humedad_filtraciones", label: "Humedad o filtraciones" },
  { key: "dano_techo", label: "Daño en el techo" },
  { key: "puertas_ventanas", label: "Puertas o ventanas que no cierran bien" },
  { key: "otros", label: "Otros" },
];

const BY_KEY = new Map(DAMAGE_OPTIONS.map((o) => [o.key, o.label]));

export function damageLabel(key: string) {
  return BY_KEY.get(key) ?? key;
}
