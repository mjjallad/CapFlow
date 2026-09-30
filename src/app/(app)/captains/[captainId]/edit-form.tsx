"use client";

import { useActionState, useState } from "react";
import { saveCaptain, type SaveState } from "./actions";
import { VEHICLE_LABELS, VEHICLE_ORDER, type VehicleKind } from "@/components/vehicle";
import { DateField } from "@/components/date-field";
import { DEDUCTION_LABELS, DEDUCTION_MODES, type DeductionMode } from "@/components/deduction";
import { advanceOnEnter } from "@/components/form-nav";

type Option = { id: string; name: string };
type Referrer = { name: string; relation: string; phone: string };

export type CaptainFields = {
  id: string;
  full_name: string;
  phone: string | null;
  phone_secondary: string | null;
  external_user_id: string | null;
  national_id: string | null;
  referrers: Referrer[];
  team_id: string | null;
  vehicle_kinds: VehicleKind[];
  whatsapp_group: string | null;
  city_id: string | null;
  branch_id: string | null;
  status: "active" | "inactive" | "suspended";
  deduction_rate: number;
  deduction_mode: DeductionMode;
  contract_file_number: string | null;
  activated_on: string | null;
  notes: string | null;
};

const STATUS_LABELS = { active: "نشط", inactive: "غير نشط", suspended: "موقوف" };

const inputClass =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-70";

export function CaptainEditForm({
  captain,
  teams,
  cities,
  branches,
  readOnly,
}: {
  captain: CaptainFields;
  teams: Option[];
  cities: Option[];
  branches: Option[];
  readOnly: boolean;
}) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveCaptain, {});
  const [referrers, setReferrers] = useState<Referrer[]>(captain.referrers);
  const [mode, setMode] = useState<DeductionMode>(captain.deduction_mode);
  const [kinds, setKinds] = useState<VehicleKind[]>(captain.vehicle_kinds);

  // Company vehicles the captain holds today but is being moved off.
  const dropped = captain.vehicle_kinds.filter(
    (kind) => (kind === "company_car" || kind === "company_scooter") && !kinds.includes(kind),
  );
  const askForReturnDate = dropped.length > 0 || (state.needsReturnDate?.length ?? 0) > 0;

  const updateReferrer = (index: number, patch: Partial<Referrer>) =>
    setReferrers((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <form action={action} onKeyDown={advanceOnEnter} className="flex flex-col gap-5">
      <input type="hidden" name="captainId" value={captain.id} />
      <input type="hidden" name="referrers" value={JSON.stringify(referrers)} />

      <Section title="البيانات الشخصية">
        <Field label="الاسم الكامل">
          <input name="full_name" defaultValue={captain.full_name} required disabled={readOnly} className={inputClass} dir="auto" />
        </Field>
        <Field label="رقم الهاتف">
          <input name="phone" defaultValue={captain.phone ?? ""} disabled={readOnly} className={inputClass} dir="ltr" placeholder="+9627…" />
        </Field>
        <Field label="رقم هاتف ثاني">
          <input
            name="phone_secondary"
            defaultValue={captain.phone_secondary ?? ""}
            disabled={readOnly}
            className={inputClass}
            dir="ltr"
            placeholder="+9627…"
          />
        </Field>
        <Field label="الرقم الوطني">
          <input name="national_id" defaultValue={captain.national_id ?? ""} disabled={readOnly} className={inputClass} dir="ltr" />
        </Field>
        <Field label="معرّف المنصة (UserID)">
          <input name="external_user_id" defaultValue={captain.external_user_id ?? ""} disabled={readOnly} className={inputClass} dir="ltr" />
        </Field>

        <div className="sm:col-span-2">
          <div className="mb-1.5 text-sm font-medium">المعرِّفون</div>
          <p className="mb-2 text-xs text-muted">من عرّف الكابتن أو كفله — الاسم وصلة القرابة ورقم التلفون.</p>
          <div className="flex flex-col gap-2">
            {referrers.map((row, index) => (
              <div key={index} className="flex flex-wrap gap-2">
                <input
                  value={row.name}
                  onChange={(e) => updateReferrer(index, { name: e.target.value })}
                  placeholder="الاسم"
                  disabled={readOnly}
                  className={`${inputClass} sm:w-52`}
                  dir="auto"
                />
                <input
                  value={row.relation}
                  onChange={(e) => updateReferrer(index, { relation: e.target.value })}
                  placeholder="صلة القرابة"
                  disabled={readOnly}
                  className={`${inputClass} sm:w-40`}
                  dir="auto"
                />
                <input
                  value={row.phone}
                  onChange={(e) => updateReferrer(index, { phone: e.target.value })}
                  placeholder="رقم الهاتف"
                  disabled={readOnly}
                  className={`${inputClass} sm:w-40`}
                  dir="ltr"
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setReferrers((rows) => rows.filter((_, i) => i !== index))}
                    className="rounded-md border border-border px-3 text-sm text-muted hover:text-danger"
                    aria-label="حذف المعرِّف"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {!readOnly && (
              <button
                type="button"
                onClick={() => setReferrers((rows) => [...rows, { name: "", relation: "", phone: "" }])}
                className="self-start rounded-md border border-border px-3 py-1.5 text-sm hover:bg-background"
              >
                + إضافة معرِّف
              </button>
            )}
            {referrers.length === 0 && readOnly && <span className="text-sm text-muted">—</span>}
          </div>
        </div>
      </Section>

      <Section title="العمل">
        <Field label="الفريق">
          <select name="team_id" defaultValue={captain.team_id ?? ""} disabled={readOnly} className={inputClass}>
            <option value="">—</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                فريق {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="فرع التفعيل">
          <select name="branch_id" defaultValue={captain.branch_id ?? ""} disabled={readOnly} className={inputClass}>
            <option value="">—</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="المدينة">
          <select name="city_id" defaultValue={captain.city_id ?? ""} disabled={readOnly} className={inputClass}>
            <option value="">—</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="sm:col-span-2">
          <div className="mb-1.5 text-sm font-medium">المركبات</div>
          <div className="flex flex-wrap gap-4">
            {VEHICLE_ORDER.map((kind) => (
              <label key={kind} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="vehicle_kinds"
                  value={kind}
                  checked={kinds.includes(kind)}
                  onChange={(e) =>
                    setKinds((current) =>
                      e.target.checked ? [...current, kind] : current.filter((k) => k !== kind),
                    )
                  }
                  disabled={readOnly}
                />
                {VEHICLE_LABELS[kind]}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">اختر أكثر من واحدة إذا كان يعمل على أكثر من مركبة.</p>

          {askForReturnDate && (
            <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
              <p className="mb-2 font-medium text-amber-900 dark:text-amber-200">
                الكابتن يترك {(dropped.length ? dropped.map((k) => VEHICLE_LABELS[k]) : state.needsReturnDate ?? []).join(" و")}
                . أدخل تاريخ تسليمها قبل الحفظ.
              </p>
              <div className="max-w-56">
                <DateField name="company_vehicle_returned_on" disabled={readOnly} />
              </div>
              <p className="mt-2 text-xs text-amber-900/80 dark:text-amber-200/80">
                تبقى المركبة مسجّلة بلوحتها وعدادها وكروكي أضرارها، وتصبح غير مسنَدة لأحد.
              </p>
            </div>
          )}
        </div>

        <Field label="الحالة">
          <select name="status" defaultValue={captain.status} disabled={readOnly} className={inputClass}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="تاريخ التفعيل">
          <DateField name="activated_on" defaultValue={captain.activated_on} disabled={readOnly} />
        </Field>
        <Field label="مجموعة واتساب">
          <input name="whatsapp_group" defaultValue={captain.whatsapp_group ?? ""} disabled={readOnly} className={inputClass} dir="auto" />
        </Field>
        <Field label="رقم ملف العقد" hint="رقم الملف الورقي الذي يُحفظ فيه العقد.">
          <input name="contract_file_number" defaultValue={captain.contract_file_number ?? ""} disabled={readOnly} className={inputClass} dir="ltr" />
        </Field>
        <Field label="اتفاق الخصم" hint="ما يحق للكابتن الاحتفاظ به من الكاش المحصَّل.">
          <select
            name="deduction_mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as DeductionMode)}
            disabled={readOnly}
            className={inputClass}
          >
            {DEDUCTION_MODES.map((m) => (
              <option key={m} value={m}>
                {DEDUCTION_LABELS[m]}
              </option>
            ))}
          </select>
        </Field>
        {mode === "per_order" && (
          <Field label="قيمة الخصم لكل أوردر (دينار)" hint="المتوقع إيداعه = المطلوب − القيمة × الأوردرات.">
            <input
              name="deduction_rate"
              type="number"
              step="0.5"
              min="0"
              defaultValue={captain.deduction_rate}
              disabled={readOnly}
              className={inputClass}
              dir="ltr"
            />
          </Field>
        )}
        {mode === "payouts" && (
          <p className="text-xs text-muted sm:col-span-2">
            يُخصم ما للكابتن من التطبيق في ذلك اليوم، ويُدخله المشرف عند تسجيل الإيداع.
          </p>
        )}
      </Section>

      <Section title="ملاحظات">
        <div className="sm:col-span-2">
          <textarea
            name="notes"
            defaultValue={captain.notes ?? ""}
            disabled={readOnly}
            rows={3}
            placeholder="أي معلومة إضافية عن الكابتن"
            className={`${inputClass} resize-y`}
            dir="auto"
          />
        </div>
      </Section>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.saved && <p className="text-sm text-emerald-700 dark:text-emerald-300">تم الحفظ.</p>}

      {!readOnly && (
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-md bg-accent px-4 py-2.5 font-medium text-accent-foreground disabled:opacity-60"
        >
          {pending ? "جارٍ الحفظ…" : "حفظ التعديلات"}
        </button>
      )}
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-border bg-surface p-5">
      <legend className="px-2 text-sm font-medium">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
