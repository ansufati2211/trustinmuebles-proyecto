import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ClipboardPaste, ExternalLink, EyeOff, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { campo, FilasAsientos, filasAPeticion, type Fila } from "@/components/FilasAsientos";
import { BloqueTecnico, TECNICO_VACIO, tecnicoAPeticion } from "@/components/BloqueTecnico";
import { post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { disociar } from "@/lib/disociar";
import { abrirExterno, CONOCE_AQUI, normalizarNumero, pareceNumeroDePartida, VISOR_BGR } from "@/lib/fuentes";
import { leerPartida } from "@/lib/leerPartida";
import { ETIQUETA_COMPLETITUD } from "@/lib/semaforo";
import type { Completitud, DetalleCaso } from "@/lib/types";

const CONDICIONES = [
  "Lote urbano inscrito en el Registro de Predios.",
  "Lote urbano inscrito, según declara el vendedor.",
];

const hoy = () => new Date().toISOString().slice(0, 10);

/**
 * Registro de una partida transcrita de Conoce Aquí (solo revisor). El texto original se queda en esta pantalla:
 * lo que se envía es la versión limpia de la vista previa, sin nombres, DNI, estado civil ni domicilios.
 */
/** Cuentas de propietario de la demostración, como sugerencia. El servidor valida que sea una cuenta PROPIETARIO. */
const PROPIETARIOS_DEMO = ["propietario-01", "propietario-02"];

export default function RegistrarPartida() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [numero, setNumero] = useState(normalizarNumero(params.get("numero") ?? ""));
  const [denominacion, setDenominacion] = useState("");
  const [contexto, setContexto] = useState("");
  // v0.7: el revisor indica la cuenta del propietario. El caso nace en borrador y sin autorización (lo decide el servidor).
  const [propietario, setPropietario] = useState("");
  const [fechaConsulta, setFechaConsulta] = useState(hoy());
  const [condicion, setCondicion] = useState(CONDICIONES[0]);
  const [completitud, setCompletitud] = useState<Completitud>("COMPLETA");
  const [zona, setZona] = useState("Zona Registral N.° XI - Sede Ica");
  const [oficina, setOficina] = useState("Oficina Registral de Ica");
  const [ubicacion, setUbicacion] = useState("");
  const [area, setArea] = useState("");
  const [linderos, setLinderos] = useState("");
  const [antecedente, setAntecedente] = useState("");
  const [nota, setNota] = useState("");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [tecnico, setTecnico] = useState(TECNICO_VACIO);

  const [pegado, setPegado] = useState("");
  const [avisos, setAvisos] = useState<string[]>([]);
  const [extras, setExtras] = useState<string[]>([]);
  const [nuevoExtra, setNuevoExtra] = useState("");
  const [ignorar, setIgnorar] = useState<string[]>([]);
  const [confirmo, setConfirmo] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  // Textos que pueden traer nombres, en un orden fijo para volver a ponerlos en su lugar.
  const textosOriginales = useMemo(
    () => [...filas.flatMap((f) => [f.texto, f.titulares]), linderos, antecedente, nota],
    [filas, linderos, antecedente, nota],
  );
  const limpieza = useMemo(() => disociar(textosOriginales, { extras, ignorar }), [textosOriginales, extras, ignorar]);

  if (usuario?.rol !== "REVISOR") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-32 gap-4 text-center px-4">
        <p role="alert" className="text-sem-rojo-tinta font-semibold">Solo el revisor puede registrar partidas.</p>
        <Button asChild><Link to="/casos">Volver a los expedientes</Link></Button>
      </div>
    );
  }

  const leer = () => {
    const r = leerPartida(pegado);
    setFilas(r.asientos.map<Fila>((a) => ({
      referencia: a.referencia, tipoActo: a.tipoActo, estado: "VIGENTE", fechaInscripcion: a.fechaInscripcion,
      tituloNumero: a.tituloNumero, fechaPresentacion: a.fechaPresentacion, texto: a.texto,
      canceloNumero: a.canceloNumero, titulares: a.titulares,
    })));
    if (r.areaM2) setArea(r.areaM2);
    if (r.linderos) setLinderos(r.linderos);
    if (r.antecedenteDominial) setAntecedente(r.antecedenteDominial);
    setAvisos(r.avisos);
    setConfirmo(false);
  };

  // Versión limpia que se envía: mismos campos, con el texto ya sin datos personales.
  const limpio = () => {
    const t = limpieza.textos;
    const filasLimpias = filas.map<Fila>((f, i) => ({ ...f, texto: t[2 * i], titulares: t[2 * i + 1] }));
    const base = 2 * filas.length;
    return { filas: filasLimpias, linderos: t[base], antecedente: t[base + 1], nota: t[base + 2] };
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrores([]);
    setGuardando(true);
    const l = limpio();
    const cuerpo = {
      numero: normalizarNumero(numero),
      denominacion: denominacion.trim(),
      contexto: contexto.trim(),
      fechaConsulta,
      condicionRepresentada: condicion,
      completitud,
      nota: l.nota.trim() || null,
      zonaRegistral: zona.trim() || null,
      oficinaRegistral: oficina.trim() || null,
      ubicacion: ubicacion.trim() || null,
      areaM2: area.trim() === "" ? null : Number(area),
      linderos: l.linderos.trim() || null,
      antecedenteDominial: l.antecedente.trim() || null,
      asientos: filasAPeticion(l.filas),
      ...tecnicoAPeticion(tecnico),
      confirmaSinDatosPersonales: confirmo,
      propietarioCodigo: propietario.trim(),
    };
    try {
      const nuevo = await post<DetalleCaso>("/casos", cuerpo);
      navigate(`/casos/${nuevo.codigo}`);
    } catch (err) {
      const texto = err instanceof Error ? err.message : "No se pudo registrar la partida";
      setErrores(texto.split("; "));
    } finally {
      setGuardando(false);
    }
  };

  const limpiaFilas = limpio().filas;
  const hayTexto = filas.length > 0;
  const numeroValido = pareceNumeroDePartida(numero);

  return (
    <div className="flex-1 bg-superficie pb-24">
      <div className="bg-white border-b border-border">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground tracking-tight">
            <FilePlus2 className="w-7 h-7 text-primary" aria-hidden="true" /> Registrar partida
          </h1>
          <p className="text-tinta-2 mt-2 leading-relaxed">
            Consulta la partida en Conoce Aquí (gratis, con tu DNI), pega su texto aquí y revisa la vista previa. Se guarda
            sin nombres, DNI, estado civil ni domicilios de personas naturales.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Button variant="outline" className="rounded-xl" onClick={() => abrirExterno(CONOCE_AQUI)}>
              Abrir Conoce Aquí <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => abrirExterno(VISOR_BGR)}>
              Abrir el Visor BGR <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <form onSubmit={guardar} noValidate className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Card className="rounded-3xl border-border shadow-tarjeta">
          <CardContent className="p-8 space-y-5">
            <h2 className="text-xl font-bold text-foreground">1. Datos de la partida</h2>
            <div className="grid sm:grid-cols-3 gap-5">
              <div>
                <label htmlFor="rp-numero" className="block text-sm font-bold mb-1.5">Número de partida</label>
                <input id="rp-numero" className={campo} maxLength={9} value={numero} aria-invalid={numero !== "" && !numeroValido}
                  onChange={(e) => setNumero(normalizarNumero(e.target.value))} />
                {numero !== "" && !numeroValido && (
                  <p className="text-xs text-sem-rojo-tinta mt-1">Ocho dígitos, con una letra inicial opcional (P07044600).</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="rp-denominacion" className="block text-sm font-bold mb-1.5">Denominación del predio</label>
                <input id="rp-denominacion" className={campo} maxLength={255} placeholder="Mz. D Lote 5 · Hab. Urb. Los Sauces · Ica"
                  value={denominacion} onChange={(e) => setDenominacion(e.target.value)} />
              </div>
            </div>
            <div>
              <label htmlFor="rp-propietario" className="block text-sm font-bold mb-1.5">Código de cuenta del propietario</label>
              <input id="rp-propietario" className={campo} maxLength={40} list="rp-propietarios" placeholder="propietario-01"
                autoComplete="off" value={propietario} onChange={(e) => setPropietario(e.target.value)} />
              <datalist id="rp-propietarios">
                {PROPIETARIOS_DEMO.map((c) => <option key={c} value={c} />)}
              </datalist>
              <p className="text-xs text-tinta-2 mt-1">
                Solo el código de la cuenta: sin nombres, DNI ni teléfonos. El expediente queda en borrador hasta que el
                propietario lo autorice desde su cuenta.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-5">
              <div>
                <label htmlFor="rp-contexto" className="block text-sm font-bold mb-1.5">Distrito</label>
                <input id="rp-contexto" className={campo} maxLength={255} placeholder="Ica, Ica" value={contexto} onChange={(e) => setContexto(e.target.value)} />
              </div>
              <div>
                <label htmlFor="rp-fecha" className="block text-sm font-bold mb-1.5">Fecha de la consulta</label>
                <input id="rp-fecha" type="date" className={campo} value={fechaConsulta} max={hoy()} onChange={(e) => setFechaConsulta(e.target.value)} />
              </div>
              <div>
                <label htmlFor="rp-completitud" className="block text-sm font-bold mb-1.5">Completitud</label>
                <select id="rp-completitud" className={campo} value={completitud} onChange={(e) => setCompletitud(e.target.value as Completitud)}>
                  {(Object.keys(ETIQUETA_COMPLETITUD) as Completitud[]).map((c) => <option key={c} value={c}>{ETIQUETA_COMPLETITUD[c]}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="rp-condicion" className="block text-sm font-bold mb-1.5">Condición representada</label>
              <select id="rp-condicion" className={campo} value={condicion} onChange={(e) => setCondicion(e.target.value)}>
                {CONDICIONES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="rp-zona" className="block text-sm font-bold mb-1.5">Zona registral</label>
                <input id="rp-zona" className={campo} maxLength={120} value={zona} onChange={(e) => setZona(e.target.value)} />
              </div>
              <div>
                <label htmlFor="rp-oficina" className="block text-sm font-bold mb-1.5">Oficina registral</label>
                <input id="rp-oficina" className={campo} maxLength={120} value={oficina} onChange={(e) => setOficina(e.target.value)} />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-5">
              <div className="sm:col-span-2">
                <label htmlFor="rp-ubicacion" className="block text-sm font-bold mb-1.5">Ubicación</label>
                <input id="rp-ubicacion" className={campo} maxLength={255} value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} />
              </div>
              <div>
                <label htmlFor="rp-area" className="block text-sm font-bold mb-1.5">Área (m²)</label>
                <input id="rp-area" type="number" step="0.01" min="0" className={campo} value={area} onChange={(e) => setArea(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border shadow-tarjeta">
          <CardContent className="p-8 space-y-4">
            <h2 className="text-xl font-bold text-foreground">2. Pega el texto de la partida</h2>
            <p className="text-sm text-tinta-2 leading-relaxed">
              Copia los asientos desde Conoce Aquí (C00001, D00001, E00001…). El texto original no se envía: solo se guarda la
              versión limpia que ves en el paso 4. Si el sitio muestra imágenes, escribe los asientos a mano en el paso 3.
            </p>
            <label htmlFor="rp-pegado" className="sr-only">Texto de la partida</label>
            <textarea id="rp-pegado" rows={8} className={`${campo} h-auto py-2 font-mono text-xs`} value={pegado}
              onChange={(e) => setPegado(e.target.value)} placeholder={"C00001\nCOMPRAVENTA\n…"} />
            <Button type="button" variant="outline" className="rounded-xl" onClick={leer} disabled={pegado.trim() === ""}>
              <ClipboardPaste className="w-4 h-4" aria-hidden="true" /> Leer asientos
            </Button>
            {avisos.length > 0 && (
              <ul role="status" className="list-disc pl-5 text-sm text-sem-amarillo-tinta space-y-1">
                {avisos.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border shadow-tarjeta">
          <CardContent className="p-8 space-y-5">
            <h2 className="text-xl font-bold text-foreground">3. Corrige los asientos y la descripción</h2>
            <BloqueTecnico tecnico={tecnico} setTecnico={setTecnico} />
            <FilasAsientos filas={filas} setFilas={setFilas} />
            <div>
              <label htmlFor="rp-linderos" className="block text-sm font-bold mb-1.5">Linderos y medidas perimétricas</label>
              <textarea id="rp-linderos" rows={3} maxLength={1000} className={`${campo} h-auto py-2`} value={linderos} onChange={(e) => setLinderos(e.target.value)} />
            </div>
            <div>
              <label htmlFor="rp-antecedente" className="block text-sm font-bold mb-1.5">Antecedente dominial</label>
              <textarea id="rp-antecedente" rows={2} maxLength={500} className={`${campo} h-auto py-2`} value={antecedente} onChange={(e) => setAntecedente(e.target.value)} />
            </div>
            <div>
              <label htmlFor="rp-nota" className="block text-sm font-bold mb-1.5">Nota (opcional)</label>
              <textarea id="rp-nota" rows={2} maxLength={500} className={`${campo} h-auto py-2`} value={nota} onChange={(e) => setNota(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-2 border-primary/20 shadow-sm">
          <CardContent className="p-8 space-y-5">
            <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <EyeOff className="w-5 h-5 text-primary" aria-hidden="true" /> 4. Vista previa sin datos personales
            </h2>
            <p className="text-sm text-tinta-2 leading-relaxed">
              Los nombres de personas naturales se reemplazan por «Persona natural N»; los DNI, el estado civil y los domicilios
              se omiten. Las empresas y el Estado se conservan. Esto es una ayuda: revisa el texto antes de confirmar.
            </p>

            <div>
              <p className="text-sm font-bold mb-2">Nombres detectados ({limpieza.personas.length})</p>
              {limpieza.personas.length === 0 && <p className="text-sm text-tinta-2">No se detectó ningún nombre de persona.</p>}
              <ul className="space-y-2">
                {limpieza.personas.map((p) => (
                  <li key={p.etiqueta} className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-bold text-foreground">{p.etiqueta}</span>
                    <span className="text-tinta-2">= «{p.nombre}» (solo se ve aquí)</span>
                    <button type="button" className="text-primary font-semibold underline"
                      onClick={() => setIgnorar([...ignorar, p.nombre])}>No es una persona</button>
                  </li>
                ))}
              </ul>
              {ignorar.length > 0 && (
                <p className="text-sm text-tinta-2 mt-2">
                  Conservados por indicación tuya: {ignorar.join(", ")}.{" "}
                  <button type="button" className="text-primary font-semibold underline" onClick={() => setIgnorar([])}>Deshacer</button>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="rp-extra" className="block text-sm font-bold mb-1.5">¿Quedó un nombre sin ocultar? Escríbelo para ocultarlo</label>
              <div className="flex gap-2">
                <input id="rp-extra" className={campo} maxLength={80} value={nuevoExtra} onChange={(e) => setNuevoExtra(e.target.value)} />
                <Button type="button" variant="outline" className="rounded-xl h-11"
                  disabled={nuevoExtra.trim().length < 3}
                  onClick={() => { setExtras([...extras, nuevoExtra.trim()]); setNuevoExtra(""); }}>Ocultar</Button>
              </div>
              {extras.length > 0 && (
                <p className="text-sm text-tinta-2 mt-2">
                  Ocultados a mano: {extras.join(", ")}.{" "}
                  <button type="button" className="text-primary font-semibold underline" onClick={() => setExtras([])}>Deshacer</button>
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-superficie border border-border p-4 space-y-3" aria-live="polite">
              <p className="text-sm font-bold">Lo que se guardará</p>
              {!hayTexto && <p className="text-sm text-tinta-2">Aún no hay asientos.</p>}
              {limpiaFilas.map((f) => (
                <div key={f.referencia} className="text-sm leading-relaxed">
                  <p className="font-bold text-foreground">{f.referencia || "(sin número)"}{f.titulares ? ` · Titulares: ${f.titulares}` : ""}</p>
                  <p className="text-foreground">{f.texto || "Sin texto."}</p>
                </div>
              ))}
              {limpio().linderos && <p className="text-sm"><span className="font-bold">Linderos: </span>{limpio().linderos}</p>}
              {limpio().antecedente && <p className="text-sm"><span className="font-bold">Antecedente: </span>{limpio().antecedente}</p>}
            </div>

            <label className="flex items-start gap-3 text-sm font-semibold text-foreground">
              <input type="checkbox" className="mt-1 h-4 w-4" checked={confirmo} onChange={(e) => setConfirmo(e.target.checked)} />
              <span>Revisé la vista previa y confirmo que no contiene nombres, DNI ni domicilios de personas naturales.</span>
            </label>

            {errores.length > 0 && (
              <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 p-4">
                <p className="font-bold text-sem-rojo-tinta mb-1">No se registró la partida</p>
                <ul className="list-disc pl-5 text-sm text-sem-rojo-tinta space-y-1">
                  {errores.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" className="rounded-xl" disabled={guardando || !confirmo || !hayTexto || !numeroValido || !propietario.trim()}>
                {guardando ? "Registrando…" : "Registrar partida"}
              </Button>
              <Button type="button" variant="outline" className="rounded-xl" asChild><Link to="/casos">Cancelar</Link></Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
