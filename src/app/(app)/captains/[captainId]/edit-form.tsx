"use client";

import { useActionState } from "react";
import { saveCaptain, type SaveState } from "./actions";
import { VEHICLE_LABELS } from "@/components/vehicle";

type Option = { id: string; name: string };

export type CaptainFields = {
  id: string;
  full_name: string;
  phone: string | null;
  external_user_id: string | null;
  national_id: string | null;
  team_id: string | null;
  vehicle_type: keyof typeof VEHICLE_LABELS | null;
  whatsapp_group: string | null;
  service_center_name: string | null;
  city_id: string | null;
  status: "active" | "inactive" | "suspended";
  deduction_rate: number;
  notes: string | null;
};

const STATUS_LABELS = { active: "نشط", inactive: "غير نشط", suspended: "موقوف" };

export function CaptainEditForm({
  captain,
  teams,
  cities,
  readOnly,
}: {
  captain: CaptainFields;
  teams: Option[];
  cities: Option[];
  readOnly: boolean;
}) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveCaptain, {});

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="captainId" value={captain.id} />

      <Section title="البيانات الشخصية">
        <Field label="الاسم الكامل">
          <input name="full_name" defaultValue={captain.full_name} required disabled={readOnly} className={inputClass} dir="auto" />
        </Field>
        <Field label="رقم الهاتف">
          <input name="phone" defaultValue={captain.phone ?? ""} disabled={readOnly} className={inputClass} dir="ltr" placeholder="+9627…" />
        </Field>
        <Field label="الرقم الوطني">
          <input name="national_id" defaultValue={captain.national_id ?? ""} disabled={readOnly} className={inputClass} dir="ltr" />
        </Field>
        <Field label="معرّف المنصة (UserID)">
          <input name="external_user_id" defaultValue={captain.external_user_id ?? ""} disabled={readOnly} className={inputClass} dir="ltr" />
        </Field>
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
        <Field label="المركبة">
          <select name="vehicle_type" defaultValue={captain.vehicle_type ?? ""} disabled={readOnly} className={inputClass}>
            <option value="">مركبته الخاصة</option>
            {Object.entries(VEHICLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
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
        <Field label="الحالة">
          <select name="status" defaultValue={captain.status} disabled={readOnly} className={inputClass}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="مجموعة واتساب">
          <input name="whatsapp_group" defaultValue={captain.whatsapp_group ?? ""} disabled={readOnly} className={inputClass} dir="auto" />
        </Field>
        <Field label="مركز الخدمة">
          <input name="service_center_name" defaultValue={captain.service_center_name ?? ""} disabled={readOnly} className={inputClass} dir="auto" />
        </Field>
        <Field label="خصم لكل أوردر (دينار)" hint="0 = لا خصم. المتوقع إيداعه = المطلوب − الخصم × الأوردرات.">
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

const inputClass =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-70";

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
