"use client";
import type { FieldMeta, FieldOption } from "@/lib/cases/types";
import { getPath, setPath } from "@/lib/lab/path";
import { FIELD_THEORY } from "@/lib/theory";
import { inputClass, TheoryBadge, WhyLine } from "../ui";

type Obj = Record<string, unknown>;

/**
 * designSchema + formMeta 로 입력란을 자동 렌더링한다. 사례 전용 로직은 없다.
 * 값은 중첩 객체이고 입력란 이름은 점 표기 경로("metrics.primary").
 */
export function AutoForm({
  meta, value, onChange, disabled, idPrefix = "", invalid = [], errorsId,
}: {
  meta: FieldMeta[]; value: Obj; onChange: (v: Obj) => void; disabled?: boolean;
  /** 한 화면에 폼이 여러 개(예: P2 와 P3)일 때 입력란 id 가 겹치지 않게 붙이는 접두사 */
  idPrefix?: string;
  /** 검증에 실패한 입력란 이름(aria-invalid 표시용) */
  invalid?: string[];
  /** 오류 목록 요소의 id(aria-describedby 로 연결) */
  errorsId?: string;
}) {
  const set = (name: string, v: unknown) => onChange(setPath(value, name, v));
  return (
    <div className="space-y-4">
      {meta.map((f) => (
        <Field
          key={f.name} f={f} v={getPath(value, f.name)} set={(v) => set(f.name, v)} disabled={disabled}
          idPrefix={idPrefix} invalid={invalid.includes(f.name)} errorsId={errorsId}
        />
      ))}
    </div>
  );
}

type A11y = { invalid?: boolean; describedBy?: string };

function Field({ f, v, set, disabled, idPrefix, invalid, errorsId }: { f: FieldMeta; v: unknown; set: (v: unknown) => void; disabled?: boolean; idPrefix: string; invalid: boolean; errorsId?: string }) {
  const id = `f-${idPrefix ? `${idPrefix}-` : ""}${f.name}`;
  const a11y: A11y = { invalid, describedBy: invalid ? errorsId : undefined };
  return (
    <div>
      <label id={`${id}-label`} htmlFor={id} className="mb-1 block text-sm font-semibold">
        {f.label}
        {FIELD_THEORY[f.name] && <TheoryBadge k={FIELD_THEORY[f.name]} />}
      </label>
      {f.help && <p className="mb-1.5 text-xs text-ink3">{f.help}</p>}
      {f.why && <WhyLine why={f.why} lead="왜 묻나요" className="mb-1.5" />}
      <Control id={id} f={f} v={v} set={set} disabled={disabled} a11y={a11y} />
      <OptionWhyList f={f} />
    </div>
  );
}

const same = (o: FieldOption, v: unknown) => o.value === v;

const BOOLEAN_OPTIONS: FieldOption[] = [{ label: "예", value: true }, { label: "아니요", value: false }];
/** boolean 은 사례가 options 를 주면 그 라벨을, 없으면 예/아니요를 쓴다 */
const optionsOf = (f: FieldMeta): FieldOption[] => f.options ?? (f.type === "boolean" ? BOOLEAN_OPTIONS : []);

/**
 * 보기마다 "왜 있나요?" 접이식 목록. 고르기 전에 보기를 나란히 비교할 수 있게 label — desc 와 한 줄을 함께 보여 준다.
 * why 가 있는 보기가 하나도 없으면 그리지 않는다(다른 사례 화면은 그대로).
 */
function OptionWhyList({ f }: { f: FieldMeta }) {
  const opts = optionsOf(f);
  if (!opts.some((o) => o.why)) return null;
  return (
    <details className="mt-1.5 rounded-lg border border-line px-3 py-2">
      <summary className="cursor-pointer text-xs font-semibold text-ink2">선택지마다 왜 있나요?</summary>
      <ul className="mt-2 space-y-2">
        {opts.map((o) => (
          <li key={String(o.value)}>
            <span className="block text-xs font-semibold text-ink">
              {o.label}
              {o.desc && <span className="font-normal text-ink3"> — {o.desc}</span>}
            </span>
            {o.why && <WhyLine why={o.why} />}
          </li>
        ))}
      </ul>
    </details>
  );
}

function Control({ id, f, v, set, disabled, a11y }: { id: string; f: FieldMeta; v: unknown; set: (v: unknown) => void; disabled?: boolean; a11y: A11y }) {
  const aria = { "aria-invalid": a11y.invalid || undefined, "aria-describedby": a11y.describedBy };
  switch (f.type) {
    case "text":
      return <input id={id} className={inputClass} value={(v as string) ?? ""} disabled={disabled} onChange={(e) => set(e.target.value)} {...aria} />;
    case "textarea":
      return <textarea id={id} rows={2} className={inputClass} value={(v as string) ?? ""} disabled={disabled} onChange={(e) => set(e.target.value)} {...aria} />;
    case "number":
      return (
        <div className="flex items-center gap-2">
          <input
            id={id} type="number" className={`${inputClass} max-w-40`} min={f.min} max={f.max} step={f.step}
            value={typeof v === "number" ? v : ""} disabled={disabled}
            onChange={(e) => set(e.target.value === "" ? undefined : Number(e.target.value))} {...aria}
          />
          {f.unit && <span className="text-sm text-ink3">{f.unit}</span>}
        </div>
      );
    case "select": {
      const sel = f.options?.find((o) => same(o, v));
      return (
        <>
          <select
            id={id} className={inputClass} disabled={disabled} value={sel ? String(f.options!.indexOf(sel)) : ""} {...aria}
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
        <div role="radiogroup" id={id} aria-labelledby={`${id}-label`} className="flex gap-2" {...aria}>
          {optionsOf(f).map((o) => (
            <button
              key={String(o.value)} type="button" role="radio" aria-checked={v === o.value} disabled={disabled} onClick={() => set(o.value)}
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
        <div id={id} role="group" aria-labelledby={`${id}-label`} className="flex flex-wrap gap-2" {...aria}>
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
