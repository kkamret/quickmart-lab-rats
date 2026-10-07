"use client";
import type { FieldMeta, FieldOption } from "@/lib/cases/types";
import { getPath, setPath } from "@/lib/lab/path";
import { FIELD_THEORY } from "@/lib/theory";
import { inputClass, TheoryBadge } from "../ui";

type Obj = Record<string, unknown>;

/**
 * designSchema + formMeta 로 입력란을 자동 렌더링한다. 사례 전용 로직은 없다.
 * 값은 중첩 객체이고 입력란 이름은 점 표기 경로("metrics.primary").
 */
export function AutoForm({ meta, value, onChange, disabled }: { meta: FieldMeta[]; value: Obj; onChange: (v: Obj) => void; disabled?: boolean }) {
  const set = (name: string, v: unknown) => onChange(setPath(value, name, v));
  return (
    <div className="space-y-4">
      {meta.map((f) => (
        <Field key={f.name} f={f} v={getPath(value, f.name)} set={(v) => set(f.name, v)} disabled={disabled} />
      ))}
    </div>
  );
}

function Field({ f, v, set, disabled }: { f: FieldMeta; v: unknown; set: (v: unknown) => void; disabled?: boolean }) {
  const id = `f-${f.name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {f.label}
        {FIELD_THEORY[f.name] && <TheoryBadge k={FIELD_THEORY[f.name]} />}
      </label>
      {f.help && <p className="mb-1.5 text-xs text-ink3">{f.help}</p>}
      <Control id={id} f={f} v={v} set={set} disabled={disabled} />
    </div>
  );
}

const same = (o: FieldOption, v: unknown) => o.value === v;

function Control({ id, f, v, set, disabled }: { id: string; f: FieldMeta; v: unknown; set: (v: unknown) => void; disabled?: boolean }) {
  switch (f.type) {
    case "text":
      return <input id={id} className={inputClass} value={(v as string) ?? ""} disabled={disabled} onChange={(e) => set(e.target.value)} />;
    case "textarea":
      return <textarea id={id} rows={2} className={inputClass} value={(v as string) ?? ""} disabled={disabled} onChange={(e) => set(e.target.value)} />;
    case "number":
      return (
        <div className="flex items-center gap-2">
          <input
            id={id} type="number" className={`${inputClass} max-w-40`} min={f.min} max={f.max} step={f.step}
            value={typeof v === "number" ? v : ""} disabled={disabled}
            onChange={(e) => set(e.target.value === "" ? undefined : Number(e.target.value))}
          />
          {f.unit && <span className="text-sm text-ink3">{f.unit}</span>}
        </div>
      );
    case "select": {
      const sel = f.options?.find((o) => same(o, v));
      return (
        <>
          <select
            id={id} className={inputClass} disabled={disabled} value={sel ? String(f.options!.indexOf(sel)) : ""}
            onChange={(e) => set(e.target.value === "" ? undefined : f.options![Number(e.target.value)].value)}
          >
            <option value="">선택해 주세요</option>
            {f.options?.map((o, i) => <option key={String(o.value)} value={i}>{o.label}</option>)}
          </select>
          {sel?.desc && <p className="mt-1 text-xs text-ink3">{sel.desc}</p>}
        </>
      );
    }
    case "boolean":
      return (
        <div role="radiogroup" id={id} className="flex gap-2">
          {[{ label: "예", value: true }, { label: "아니요", value: false }].map((o) => (
            <button
              key={o.label} type="button" role="radio" aria-checked={v === o.value} disabled={disabled} onClick={() => set(o.value)}
              className={`rounded-lg border px-4 py-1.5 text-sm ${v === o.value ? "border-brand bg-brand-soft font-semibold text-ink" : "border-line bg-surface text-ink2 hover:bg-sunk"} disabled:opacity-60`}
            >
              {o.label}
            </button>
          ))}
        </div>
      );
    case "multiselect": {
      const cur = Array.isArray(v) ? (v as unknown[]) : [];
      const toggle = (o: FieldOption) => set(cur.includes(o.value) ? cur.filter((x) => x !== o.value) : [...cur, o.value]);
      return (
        <div id={id} className="flex flex-wrap gap-2">
          {f.options?.map((o) => (
            <label
              key={String(o.value)} title={o.desc}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${cur.includes(o.value) ? "border-brand bg-brand-soft" : "border-line bg-sunk"} ${disabled ? "opacity-60" : ""}`}
            >
              <input type="checkbox" checked={cur.includes(o.value)} disabled={disabled} onChange={() => toggle(o)} />
              {o.label}
            </label>
          ))}
        </div>
      );
    }
  }
}
