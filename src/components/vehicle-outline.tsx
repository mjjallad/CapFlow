import type { VehicleKind } from "@/components/vehicle";
import { DAMAGE_COLORS, type DamageMark } from "@/components/damage";

/**
 * The outline a damage mark is placed on. `outlineUrl` points at a drawing the
 * office dropped into public/vehicle-sketch/; without one the built-in vector
 * is used. Marks are shares of the drawing (0–1), so either works.
 */
export function VehicleOutline({ kind, outlineUrl }: { kind: VehicleKind; outlineUrl?: string }) {
  if (outlineUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- supplied by the office, no fixed size to optimize for
    return <img src={outlineUrl} alt="مخطط المركبة" className="w-full select-none" draggable={false} />;
  }
  return kind === "company_scooter" ? <ScooterOutline /> : <CarOutline />;
}

/** The numbered marks drawn over an outline. */
export function DamagePins({ marks }: { marks: DamageMark[] }) {
  return (
    <>
      {marks.map((mark, index) => (
        <span
          key={index}
          className="pointer-events-none absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold text-white shadow"
          style={{ left: `${mark.x * 100}%`, top: `${mark.y * 100}%`, backgroundColor: DAMAGE_COLORS[mark.kind] }}
        >
          {index + 1}
        </span>
      ))}
    </>
  );
}

/** Top view, front on the left — the layout body shops and insurers draw. */
function CarOutline() {
  return (
    <svg viewBox="0 0 480 320" className="w-full" role="img" aria-label="مخطط السيارة من الأعلى">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        {/* body */}
        <path
          opacity="0.9"
          d="M104 64 L386 64 C422 64 444 78 450 100 C454 118 456 142 456 170 C456 198 454 222 450 240 C444 262 422 276 386 276 L104 276 C72 276 48 260 42 236 C36 216 34 194 34 170 C34 146 36 124 42 104 C48 80 72 64 104 64 Z"
        />
        {/* bonnet edges */}
        <path opacity="0.45" d="M60 112 C86 92 120 82 156 78" />
        <path opacity="0.45" d="M60 228 C86 248 120 258 156 262" />
        {/* windscreen, roof, rear screen */}
        <path opacity="0.6" d="M168 122 L208 104 L208 236 L168 218 Z" />
        <rect opacity="0.6" x="208" y="104" width="128" height="132" rx="10" />
        <path opacity="0.6" d="M336 104 L378 122 L378 218 L336 236 Z" />
        {/* side windows */}
        <g opacity="0.4">
          <rect x="216" y="84" width="54" height="16" rx="6" />
          <rect x="274" y="84" width="54" height="16" rx="6" />
          <rect x="216" y="240" width="54" height="16" rx="6" />
          <rect x="274" y="240" width="54" height="16" rx="6" />
        </g>
        {/* door seams and rear quarter lines */}
        <g opacity="0.35">
          <path d="M212 64 L212 84" />
          <path d="M272 64 L272 84" />
          <path d="M332 64 L332 84" />
          <path d="M212 276 L212 256" />
          <path d="M272 276 L272 256" />
          <path d="M332 276 L332 256" />
          <path d="M378 122 L420 92" />
          <path d="M378 218 L420 248" />
        </g>
        {/* wing mirrors */}
        <g opacity="0.55">
          <path d="M158 64 C156 52 160 46 170 46 C178 46 181 52 179 64 Z" />
          <path d="M158 276 C156 288 160 294 170 294 C178 294 181 288 179 276 Z" />
        </g>
        {/* head and tail lamps */}
        <g opacity="0.5">
          <path d="M40 124 C50 108 70 96 94 90 L98 110 C78 116 60 126 50 140 Z" />
          <path d="M40 216 C50 232 70 244 94 250 L98 230 C78 224 60 214 50 200 Z" />
          <path d="M450 118 C442 104 426 95 406 91 L402 111 C418 115 432 122 440 132 Z" />
          <path d="M450 222 C442 236 426 245 406 249 L402 229 C418 225 432 218 440 208 Z" />
        </g>
        {/* wipers and panel creases */}
        <g opacity="0.35">
          <path d="M182 140 L152 152" />
          <path d="M182 200 L152 188" />
          <path d="M120 82 L124 98" />
          <path d="M120 258 L124 242" />
          <path d="M414 100 L420 112" />
          <path d="M414 240 L420 228" />
        </g>
      </g>
      <g fill="currentColor" opacity="0.45" fontSize="12" textAnchor="middle">
        <text x="60" y="26">الأمام</text>
        <text x="428" y="26">الخلف</text>
      </g>
    </svg>
  );
}

/** Side view: the angle a scooter's scratches are usually described from. */
function ScooterOutline() {
  return (
    <svg viewBox="0 0 340 210" className="w-full" role="img" aria-label="مخطط السكوتر من الجانب">
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
        <g opacity="0.85">
          <circle cx="72" cy="150" r="34" />
          <circle cx="266" cy="150" r="34" />
        </g>
        <g opacity="0.25">
          <circle cx="72" cy="150" r="13" />
          <circle cx="266" cy="150" r="13" />
        </g>
        {/* front fender, fork and handlebar with mirror */}
        <path opacity="0.5" d="M40 136 C46 112 62 100 84 100 L104 100" />
        <path opacity="0.85" d="M72 150 L106 74" />
        <path opacity="0.85" d="M96 92 L120 40" />
        <path opacity="0.7" d="M100 36 L146 36" />
        <path opacity="0.5" d="M138 34 L150 18" />
        <ellipse opacity="0.5" cx="154" cy="14" rx="9" ry="6" />
        {/* leg shield and floorboard */}
        <path opacity="0.7" d="M116 50 C104 76 100 96 104 118 L104 128 L178 128" />
        <path opacity="0.5" d="M128 60 L108 104" />
        {/* body, seat and top case */}
        <path opacity="0.85" d="M178 128 L182 108 C184 100 190 96 198 96 L242 96 C252 96 258 102 258 112 L258 124" />
        <path opacity="0.85" d="M196 96 L200 76 C202 68 208 64 216 64 L246 64 C254 64 258 70 258 78 L258 96" />
        <path opacity="0.6" d="M200 76 L258 76" />
        <path opacity="0.6" d="M258 82 L284 82 C290 82 292 86 290 92 L284 106 L258 106" />
        <path opacity="0.85" d="M258 124 L266 150" />
        <path opacity="0.5" d="M178 128 L158 150" />
        <path opacity="0.4" d="M232 124 L238 150" />
      </g>
      <g fill="currentColor" opacity="0.4" fontSize="11" textAnchor="middle">
        <text x="72" y="200">الأمام</text>
        <text x="266" y="200">الخلف</text>
      </g>
    </svg>
  );
}
