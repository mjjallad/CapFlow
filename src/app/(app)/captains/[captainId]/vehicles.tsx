"use client";

import { useActionState, useState } from "react";
import { removeVehicle, saveVehicleAction, type VehicleState } from "./actions";
import { VEHICLE_LABELS, type VehicleKind } from "@/components/vehicle";

export type VehicleRow = {
  id: string;
  kind: VehicleKind;
  model: string | null;
  plate_number: string | null;
  made_year: number | null;
  color: string | null;
  odometer_km: number | null;
  received_on: string | null;
  notes: string | null;
};

const COMPANY_KINDS: VehicleKind[] = ["company_car", "company_scooter"];

const inputClass =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-70";

export function CaptainVehicles({
  captainId,
  vehicles,
  readOnly,
}: {
  captainId: string;
  vehicles: VehicleRow[];
  readOnly: boolean;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <div>
        <h2 className="font-medium">مركبات الشركة</h2>
        <p className="mt-1 text-xs text-muted">تفاصيل السيارة أو السكوتر المسلَّم للكابتن.</p>
      </div>

      {vehicles.length === 0 && !adding && (
        <p className="text-sm text-muted">لا توجد مركبة مسجّلة.</p>
      )}

      {vehicles.map((vehicle) => (
        <VehicleForm key={vehicle.id} captainId={captainId} vehicle={vehicle} readOnly={readOnly} />
      ))}

      {adding && (
        <VehicleForm
          captainId={captainId}
          vehicle={null}
          readOnly={readOnly}
          onCancel={() => setAdding(false)}
        />
      )}

      {!readOnly && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="self-start rounded-md border border-border px-3 py-1.5 text-sm hover:bg-background"
        >
          + إضافة مركبة
        </button>
      )}
    </section>
  );
}

function VehicleForm({
  captainId,
  vehicle,
  readOnly,
  onCancel,
}: {
  captainId: string;
  vehicle: VehicleRow | null;
  readOnly: boolean;
  onCancel?: () => void;
}) {
  const [state, action, pending] = useActionState<VehicleState, FormData>(saveVehicleAction, {});

  return (
    <form action={action} className="rounded-lg border border-border p-4">
      <input type="hidden" name="captainId" value={captainId} />
      {vehicle && <input type="hidden" name="vehicleId" value={vehicle.id} />}

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="النوع">
          <select name="kind" defaultValue={vehicle?.kind ?? "company_car"} disabled={readOnly} className={inputClass}>
            {COMPANY_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {VEHICLE_LABELS[kind]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="نوع المركبة / السكوتر" hint="مثلاً: Hyundai Accent">
          <input name="model" defaultValue={vehicle?.model ?? ""} disabled={readOnly} className={inputClass} dir="auto" />
        </Field>
        <Field label="رقم اللوحة">
          <input name="plate_number" defaultValue={vehicle?.plate_number ?? ""} disabled={readOnly} className={inputClass} dir="ltr" />
        </Field>
        <Field label="سنة الصنع">
          <input
            name="made_year"
            type="number"
            min="1950"
            max="2100"
            defaultValue={vehicle?.made_year ?? ""}
            disabled={readOnly}
            className={inputClass}
            dir="ltr"
          />
        </Field>
        <Field label="اللون">
          <input name="color" defaultValue={vehicle?.color ?? ""} disabled={readOnly} className={inputClass} dir="auto" />
        </Field>
        <Field label="عداد المشي (كم)">
          <input
            name="odometer_km"
            type="number"
            min="0"
            defaultValue={vehicle?.odometer_km ?? ""}
            disabled={readOnly}
            className={inputClass}
            dir="ltr"
          />
        </Field>
        <Field label="تاريخ الاستلام">
          <input
            name="received_on"
            type="date"
            defaultValue={vehicle?.received_on ?? ""}
            disabled={readOnly}
            className={inputClass}
            dir="ltr"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="ملاحظات المركبة">
            <textarea name="notes" defaultValue={vehicle?.notes ?? ""} disabled={readOnly} rows={2} className={`${inputClass} resize-y`} dir="auto" />
          </Field>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.saved && <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">تم الحفظ.</p>}

      {!readOnly && (
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
          >
            {pending ? "جارٍ الحفظ…" : vehicle ? "حفظ" : "إضافة"}
          </button>
          {vehicle ? <DeleteButton vehicleId={vehicle.id} /> : (
            <button type="button" onClick={onCancel} className="text-sm text-muted hover:text-foreground">
              إلغاء
            </button>
          )}
        </div>
      )}
    </form>
  );
}

function DeleteButton({ vehicleId }: { vehicleId: string }) {
  const [state, action, pending] = useActionState<VehicleState, FormData>(removeVehicle, {});

  return (
    <form action={action}>
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <button type="submit" disabled={pending} className="text-sm text-muted hover:text-danger disabled:opacity-50">
        {pending ? "…" : "حذف المركبة"}
      </button>
      {state.error && <span className="ms-2 text-sm text-danger">{state.error}</span>}
    </form>
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
