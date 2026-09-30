import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { sketchOutlineUrls } from "@/lib/captains/sketch";
import { DamagePins, VehicleOutline } from "@/components/vehicle-outline";
import { DAMAGE_COLORS, DAMAGE_LABELS, type DamageMark } from "@/components/damage";
import { VEHICLE_LABELS } from "@/components/vehicle";
import { formatDay } from "@/lib/dates";
import { PrintButton } from "./print-button";

export default async function VehicleHandoverPage({
  params,
}: PageProps<"/captains/[captainId]/vehicles/[vehicleId]/print">) {
  const { captainId, vehicleId } = await params;
  const ctx = await requireTenant("captains.read");
  const admin = createAdminClient();

  const [{ data: vehicle }, { data: captain }] = await Promise.all([
    admin
      .from("vehicles")
      .select("*")
      .eq("id", vehicleId)
      .eq("captain_id", captainId)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle(),
    admin
      .from("captains")
      .select("full_name, phone, phone_secondary, national_id, external_user_id, team:teams(name), branch:branches(name)")
      .eq("id", captainId)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle(),
  ]);
  if (!vehicle || !captain) notFound();

  const marks = (vehicle.damage_marks ?? []) as unknown as DamageMark[];
  const outlineUrl = sketchOutlineUrls()[vehicle.kind];
  const today = new Intl.DateTimeFormat("en-GB", {
    timeZone: ctx.membership.tenant.timezone,
    dateStyle: "short",
  }).format(new Date());

  return (
    <div className="print-sheet mx-auto flex max-w-3xl flex-col gap-5">
      <div className="no-print">
        <PrintButton />
      </div>

      <header className="flex items-start justify-between gap-4 border-b border-border pb-3">
        <div>
          <h1 className="text-lg font-bold">نموذج تسليم مركبة</h1>
          <p className="text-sm text-muted">{ctx.membership.tenant.name}</p>
        </div>
        <div className="text-sm text-muted" dir="ltr">
          {today}
        </div>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-bold">بيانات الكابتن</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <Row label="الاسم" value={captain.full_name} />
          <Row label="الهاتف" value={captain.phone} ltr />
          <Row label="هاتف ثاني" value={captain.phone_secondary} ltr />
          <Row label="الرقم الوطني" value={captain.national_id} ltr />
          <Row label="معرّف المنصة" value={captain.external_user_id} ltr />
          <Row label="الفريق" value={captain.team?.name ? `فريق ${captain.team.name}` : null} />
          <Row label="فرع التفعيل" value={captain.branch?.name ?? null} />
        </dl>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold">بيانات المركبة</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <Row label="النوع" value={VEHICLE_LABELS[vehicle.kind]} />
          <Row label="الطراز" value={vehicle.model} />
          <Row label="رقم اللوحة" value={vehicle.plate_number} ltr />
          <Row label="سنة الصنع" value={vehicle.made_year ? String(vehicle.made_year) : null} ltr />
          <Row label="اللون" value={vehicle.color} />
          <Row label="عداد المشي" value={vehicle.odometer_km ? `${vehicle.odometer_km.toLocaleString("en-US")} كم` : null} ltr />
          <Row label="تاريخ الاستلام" value={formatDay(vehicle.received_on)} ltr />
          <Row label="تاريخ الكشف" value={formatDay(vehicle.inspected_on)} ltr />
        </dl>
        {vehicle.notes && <p className="mt-2 text-sm">ملاحظات: {vehicle.notes}</p>}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold">كروكي الأضرار قبل التسليم</h2>
        <div className="relative w-full overflow-hidden rounded-lg border border-border bg-white">
          <VehicleOutline kind={vehicle.kind} outlineUrl={outlineUrl} />
          <DamagePins marks={marks} />
        </div>

        {marks.length === 0 ? (
          <p className="mt-2 text-sm">لا توجد أضرار مسجّلة عند التسليم.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-muted">
                <th className="py-1 text-start font-medium">#</th>
                <th className="py-1 text-start font-medium">النوع</th>
                <th className="py-1 text-start font-medium">الموضع / الوصف</th>
              </tr>
            </thead>
            <tbody>
              {marks.map((mark, index) => (
                <tr key={index} className="border-b border-border">
                  <td className="py-1">
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: DAMAGE_COLORS[mark.kind] }}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-1">{DAMAGE_LABELS[mark.kind]}</td>
                  <td className="py-1" dir="auto">
                    {mark.note || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-2 text-sm">
        <p>
          أقرّ باستلام المركبة الموصوفة أعلاه بحالتها المبيّنة في الكروكي، وأتعهّد بالمحافظة عليها وإعادتها بالحالة
          نفسها عدا الاستهلاك الطبيعي.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-8">
          <SignatureLine label="المستلِم (الكابتن)" />
          <SignatureLine label="المسلِّم (عن الشركة)" />
        </div>
      </section>
    </div>
  );
}

function Row({ label, value, ltr }: { label: string; value: string | null; ltr?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted">{label}:</dt>
      <dd dir={ltr ? "ltr" : "auto"}>{value ?? "—"}</dd>
    </div>
  );
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div>
      <div className="mb-1 text-muted">{label}</div>
      <div className="h-10 border-b border-border" />
      <div className="mt-1 text-xs text-muted">الاسم والتوقيع والتاريخ</div>
    </div>
  );
}
