import Link from "next/link";
import { DATA_POLICY_VERSION } from "@proyecto/shared-types";
import { LogoLockup } from "../../components/ui/Logo";

// Borrador redactado siguiendo los requisitos de la Ley 1581 de 2012 y
// el Decreto 1377 de 2013. Un abogado deberia revisarlo antes de operar
// de verdad.
//
// Los datos del responsable se leen del entorno, no van escritos aqui:
// asi no quedan en el repositorio. La ley exige publicar nombre,
// domicilio y un canal de contacto; NO exige el documento de identidad
// del responsable, y por eso no se pide ni se muestra en ninguna parte.
const RESPONSABLE = {
  nombre: process.env.NEXT_PUBLIC_RESPONSABLE_NOMBRE ?? "[pendiente]",
  ciudad: process.env.NEXT_PUBLIC_RESPONSABLE_CIUDAD ?? "[pendiente]",
  correo: process.env.NEXT_PUBLIC_RESPONSABLE_CORREO ?? "[pendiente]",
};

export const metadata = {
  title: "Política de tratamiento de datos",
};

export default function DataPolicyPage() {
  return (
    <main className="min-h-screen bg-sand-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 flex justify-center">
          <LogoLockup subtitle="Política de datos" />
        </div>

        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-sand-900">
          Política de tratamiento de datos personales
        </h1>
        <p className="mb-8 text-sm text-sand-500">
          Versión {DATA_POLICY_VERSION} · Ley 1581 de 2012 y Decreto 1377 de
          2013
        </p>

        <div className="flex flex-col gap-6 text-sm leading-relaxed text-sand-700">
          <Section title="1. Quién responde por tus datos">
            <p>
              <strong>{RESPONSABLE.nombre}</strong>, con domicilio en{" "}
              {RESPONSABLE.ciudad}, es el responsable del tratamiento de los
              datos personales recogidos en esta plataforma.
            </p>
            <p className="mt-2">
              Canal de contacto para cualquier asunto relacionado con tus
              datos:{" "}
              <a
                href={`mailto:${RESPONSABLE.correo}`}
                className="font-medium text-brand-700 underline"
              >
                {RESPONSABLE.correo}
              </a>
              .
            </p>
          </Section>

          <Section title="2. Qué datos recogemos">
            <p className="mb-2">
              Solo lo necesario para conectar a una persona afectada con un
              analista voluntario:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <strong>De quien reporta:</strong> número de celular, nombre,
                dirección y ubicación de la vivienda, descripción y fotos de
                los daños.
              </li>
              <li>
                <strong>De quien se registra como analista:</strong> número de
                celular, nombre, número de documento, profesión declarada,
                matrícula profesional cuando aplica, y foto de perfil.
              </li>
              <li>
                <strong>De la visita:</strong> ubicación registrada al llegar,
                mensajes intercambiados en el chat y la nota de
                acompañamiento.
              </li>
            </ul>
            <p className="mt-2">
              Las fotos que se solicitan son de los daños del inmueble, no de
              personas. La única fotografía de una persona es la de perfil del
              analista, que él mismo carga sabiendo que será visible para
              quien acompañe.
            </p>
          </Section>

          <Section title="3. Para qué los usamos">
            <ul className="ml-5 list-disc space-y-1">
              <li>Mostrar la solicitud en el mapa para que un analista la tome.</li>
              <li>
                Permitir que las dos partes se comuniquen por el chat y
                acuerden la visita.
              </li>
              <li>
                Verificar que quien llega a tu casa es quien dice ser (PIN y
                validación de ubicación).
              </li>
              <li>
                Revisar manualmente la identidad y la matrícula de los
                analistas, y moderar las conversaciones para prevenir fraudes.
              </li>
              <li>Dejar registro de las acciones administrativas.</li>
            </ul>
            <p className="mt-2">
              No vendemos, alquilamos ni cedemos datos a terceros con fines
              comerciales, ni los usamos para publicidad.
            </p>
          </Section>

          <Section title="4. Qué ve cada quien">
            <p className="mb-2">
              La plataforma está diseñada para revelar lo mínimo en cada
              momento:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <strong>Antes de aceptar</strong>, el analista solo ve el punto
                en el mapa, los daños marcados, tu descripción y las fotos. No
                ve tu nombre, ni tu dirección, ni tu teléfono.
              </li>
              <li>
                <strong>Al aceptar</strong>, se le revelan tu nombre y la
                dirección exacta, porque sin eso no puede llegar.
              </li>
              <li>
                <strong>Tu número de celular nunca se le entrega</strong>: para
                eso existe el chat dentro de la aplicación.
              </li>
              <li>
                El equipo administrador puede consultar los perfiles completos
                y leer las conversaciones, únicamente para moderar y prevenir
                fraudes.
              </li>
            </ul>
          </Section>

          <Section title="5. Tus derechos como titular">
            <p className="mb-2">En cualquier momento puedes:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Conocer qué datos tuyos tenemos y cómo los usamos.</li>
              <li>Actualizarlos o corregirlos si están incompletos o errados.</li>
              <li>
                Solicitar que los eliminemos, salvo cuando exista un deber
                legal o contractual de conservarlos.
              </li>
              <li>Revocar la autorización que nos diste.</li>
              <li>
                Presentar quejas ante la Superintendencia de Industria y
                Comercio.
              </li>
            </ul>
            <p className="mt-2">
              Para ejercerlos, escríbenos a{" "}
              <a
                href={`mailto:${RESPONSABLE.correo}`}
                className="font-medium text-brand-700 underline"
              >
                {RESPONSABLE.correo}
              </a>
              . Respondemos las consultas en
              un máximo de diez (10) días hábiles y los reclamos en quince (15)
              días hábiles, conforme a la ley.
            </p>
          </Section>

          <Section title="6. Cuánto tiempo los conservamos">
            <p>
              Mantenemos los datos mientras tu cuenta esté activa y, después,
              durante el tiempo necesario para atender obligaciones legales o
              reclamaciones. Cumplido ese plazo, se eliminan o se anonimizan.
            </p>
          </Section>

          <Section title="7. Seguridad">
            <p>
              Aplicamos medidas técnicas razonables para proteger la
              información: acceso por código de un solo uso al celular, sesiones
              cifradas y control de permisos por rol. Ningún sistema es
              infalible, así que también te pedimos no compartir datos
              sensibles por el chat.
            </p>
          </Section>

          <Section title="8. Cambios">
            <p>
              Si modificamos esta política, publicaremos una versión nueva y te
              pediremos aceptarla otra vez antes de seguir usando la
              plataforma.
            </p>
          </Section>

          <Section title="9. Aviso importante">
            <p>
              Este es un canal de acompañamiento comunitario informal. Los
              analistas son voluntarios con criterio técnico auto-declarado; no
              emiten dictámenes oficiales ni reemplazan a los organismos de
              emergencia ni a un profesional contratado formalmente.
            </p>
          </Section>
        </div>

        <p className="mt-10 text-center text-sm">
          <Link href="/" className="text-sand-500 underline hover:text-sand-900">
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold text-sand-900">{title}</h2>
      {children}
    </section>
  );
}

// Resalta lo que el responsable todavia tiene que completar.
