import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { listDocuments, photoUrl, type Referrer } from "@/lib/captains/service";
import { DepositStatusBadge } from "@/components/deposit-status";
import { formatDay, formatMoney, weekdayArabic } from "@/lib/dates";
import { CaptainEditForm, type CaptainFields } from "./edit-form";
import { PhotoForm } from "./photo-form";
import { CaptainDocuments } from "./documents";
import { CaptainVehicles } from "./vehicles";
import { listVehicles } from "@/lib/captains/vehicles";
import { sketchOutlineUrls } from "@/lib/captains/sketch";
import { vehicleSummary } from "@/components/vehicle";

const RECENT_DAYS = 14;

export default async function CaptainPage({ params }: PageProps<"/captains/[captainId]">) {
  const { captainId } = await params;
  const ctx = await requireTenant("captains.read");
  const { currency_code: currency, timezone: tz } = ctx.membership.tenant;
  const canManage = can(ctx.membership.role, "captains.manage");
  const supabase = await createClient();

  const { data: captain } = await supabase
    .from("captains")
    .select(
      "id, full_name, phone, phone_secondary, external_user_id, national_id, referrers, team_id, vehicle_kinds, whatsapp_group, city_id, branch_id, status, deduction_rate, contract_file_number, activated_on, notes, photo_path, needs_review, review_note, team:teams(name), city:cities(name), branch:branches(name)",
    )
    .eq("id", captainId)
    .maybeSingle();
  if (!captain) notFound();

  const [{ data: teams }, { data: cities }, { data: branches }, photo, documents, vehicles, { data: cases }] =
    await Promise.all([
    supabase.from("teams").select("id, name").eq("is_active", true).order("name"),
    supabase.from("cities").select("id, name").eq("is_active", true).order("name"),
    supabase.from("branches").select("id, name").eq("is_active", true).order("name"),
    photoUrl(captain.photo_path),
    listDocuments({ tenantId: ctx.tenantId, captainId }),
    listVehicles({ tenantId: ctx.tenantId, captainId }),
    supabase
      .from("deposit_cases")
      .select("id, status, collected_amount, expected_amount, deposited_amount, withdrawn_amount, day:operating_days!deposit_cases_operating_day_id_fkey(business_date)")
      .eq("captain_id", captainId)
      .order("created_at", { ascending: false })
      .limit(RECENT_DAYS),
  ]);

  const fields: CaptainFields = {
    id: captain.id,
    full_name: captain.full_name,
    phone: captain.phone,
    phone_secondary: captain.phone_secondary,
    external_user_id: captain.external_user_id,
    national_id: captain.national_id,
    referrers: (captain.referrers ?? []) as unknown as Referrer[],
    team_id: captain.team_id,
    vehicle_kinds: captain.vehicle_kinds ?? [],
    whatsapp_group: captain.whatsapp_group,
    city_id: captain.city_id,
    branch_id: captain.branch_id,
    status: captain.status,
    deduction_rate: captain.deduction_rate,
    contract_file_number: captain.contract_file_number,
    activated_on: captain.activated_on,
    notes: captain.notes,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/captains" className="text-sm text-muted hover:underline">
          ← الكباتن
        </Link>
      </div>

      <div className="flex flex-wrap items-start gap-5 rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-col items-center gap-2">
          {photo ? (
            <Image
              src={photo}
              alt={captain.full_name}
              width={112}
              height={112}
              unoptimized
              className="h-28 w-28 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted">
              بلا صورة
            </div>
          )}
          {canManage && <PhotoForm captainId={captain.id} />}
        </div>

        <div className="flex-1">
          <h1 className="text-xl font-semibold" dir="auto">
            {captain.full_name}
          </h1>
          <dl className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            <Row label="الهاتف" value={captain.phone} ltr />
            <Row label="هاتف ثاني" value={captain.phone_secondary} ltr />
            <Row label="معرّف المنصة" value={captain.external_user_id} ltr />
            <Row label="الرقم الوطني" value={captain.national_id} ltr />
            <Row label="الفريق" value={captain.team?.name ? `فريق ${captain.team.name}` : null} />
            <Row label="مجموعة واتساب" value={captain.whatsapp_group} />
            <Row label="المدينة" value={captain.city?.name ?? null} />
            <Row label="فرع التفعيل" value={captain.branch?.name ?? null} />
            <Row label="المركبات" value={vehicleSummary(captain.vehicle_kinds)} />
            <Row label="تاريخ التفعيل" value={formatDay(captain.activated_on)} ltr />
            <Row label="رقم ملف العقد" value={captain.contract_file_number} ltr />
            {((captain.referrers ?? []) as unknown as Referrer[]).map((r, i) => (
              <Row
                key={i}
                label={`معرِّف: ${r.name || "—"}`}
                value={[r.national_id, r.phone].filter(Boolean).join(" · ") || null}
                ltr
              />
            ))}
          </dl>
          {captain.needs_review && (
            <p className="mt-3 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
              بحاجة مراجعة{captain.review_note ? `: ${captain.review_note}` : ""}
            </p>
          )}
        </div>
      </div>

      <CaptainEditForm
        captain={fields}
        teams={teams ?? []}
        cities={cities ?? []}
        branches={branches ?? []}
        readOnly={!canManage}
      />

      {(captain.vehicle_kinds ?? []).some((k) => k === "company_car" || k === "company_scooter") && (
        <CaptainVehicles captainId={captain.id} vehicles={vehicles} readOnly={!canManage} outlineUrls={sketchOutlineUrls()} />
      )}

      <CaptainDocuments captainId={captain.id} documents={documents} readOnly={!canManage} timeZone={tz} />

      <section>
        <h2 className="mb-2 font-medium">آخر الأيام</h2>
        {!cases?.length ? (
          <p className="rounded-xl border border-border bg-surface p-5 text-sm text-muted">لا توجد أيام مسجّلة بعد.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-background text-muted">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">اليوم</th>
                  <th className="px-3 py-2 text-start font-medium">الحالة</th>
                  <th className="px-3 py-2 text-start font-medium">المطلوب</th>
                  <th className="px-3 py-2 text-start font-medium">المتوقع</th>
                  <th className="px-3 py-2 text-start font-medium">المودَع</th>
                  <th className="px-3 py-2 text-start font-medium">المسحوب</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      {c.day?.business_date ? (
                        <Link href={`/days/${c.day.business_date}`} className="hover:underline">
                          <span dir="ltr">{c.day.business_date}</span> · {weekdayArabic(c.day.business_date)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <DepositStatusBadge status={c.status} />
                    </td>
                    <td className="px-3 py-2 tabular-nums" dir="ltr">{formatMoney(c.collected_amount, currency)}</td>
                    <td className="px-3 py-2 tabular-nums" dir="ltr">{formatMoney(c.expected_amount, currency)}</td>
                    <td className="px-3 py-2 tabular-nums" dir="ltr">{formatMoney(c.deposited_amount, currency)}</td>
                    <td className="px-3 py-2 tabular-nums" dir="ltr">{formatMoney(c.withdrawn_amount, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
