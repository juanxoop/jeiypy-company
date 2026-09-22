/** Vista previa ilustrada del concepto Blackroom Barber (sustituible por una captura real). */
export function BlackroomPreview() {
  return (
    <div aria-hidden className="relative h-full w-full overflow-hidden bg-[#08080a]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_75%_20%,rgb(201_183_156/0.14),transparent_60%)]" />
      <div className="absolute inset-y-0 right-[8%] w-[18%] bg-[repeating-linear-gradient(135deg,rgb(245_247_250/0.05)_0_10px,transparent_10px_22px)] [mask-image:linear-gradient(to_bottom,transparent,#000_30%,#000_70%,transparent)]" />

      <div className="relative flex h-full flex-col p-[6%]">
        <div className="flex items-center justify-between">
          <span className="text-[clamp(8px,1.4vw,11px)] font-semibold tracking-[0.35em] text-[#e9e1d4]">BLACKROOM</span>
          <div className="flex gap-[6%]">
            <span className="h-[3px] w-6 rounded-full bg-white/15" />
            <span className="h-[3px] w-6 rounded-full bg-white/15" />
            <span className="h-[3px] w-6 rounded-full bg-white/15" />
          </div>
        </div>

        <div className="mt-auto max-w-[62%]">
          <p className="text-[clamp(8px,1.2vw,10px)] tracking-[0.3em] text-[#c9b79c]">BARBER STUDIO</p>
          <p className="mt-[3%] text-[clamp(18px,4.2vw,40px)] leading-[0.95] font-semibold tracking-[-0.04em] text-[#f3eee6]">
            El corte que
            <br />
            te define.
          </p>
          <div className="mt-[6%] flex gap-2">
            <span className="rounded-full bg-[#e9e1d4] px-[0.9em] py-[0.5em] text-[clamp(7px,1.1vw,10px)] font-medium text-[#0b0b0d]">
              Reservar cita
            </span>
            <span className="rounded-full border border-white/20 px-[0.9em] py-[0.5em] text-[clamp(7px,1.1vw,10px)] text-white/70">
              Servicios
            </span>
          </div>
        </div>

        <div className="mt-[7%] grid grid-cols-3 gap-[3%]">
          {["Corte", "Barba", "Ritual"].map((item) => (
            <div key={item} className="rounded-lg border border-white/10 bg-white/[0.03] p-[8%]">
              <span className="block text-[clamp(7px,1vw,10px)] text-white/80">{item}</span>
              <span className="mt-[10%] block h-[3px] w-2/3 rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
