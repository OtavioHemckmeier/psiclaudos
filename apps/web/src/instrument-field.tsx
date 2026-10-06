import { useState } from "react";

export type InstrumentField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: Array<{ value: string; label: string }>;
};

export function InstrumentFieldControl({
  field,
  value,
  disabled,
  onChange,
}: {
  field: InstrumentField;
  value: unknown;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  const [newRespondent, setNewRespondent] = useState("");
  const [customRespondents, setCustomRespondents] = useState<string[]>([]);
  if (field.type === "TEXTAREA") {
    return (
      <textarea
        disabled={disabled}
        rows={5}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
      />
    );
  }
  if (field.type === "BOOLEAN") {
    return (
      <label className="boolean-field">
        <input
          disabled={disabled}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />{" "}
        Sim
      </label>
    );
  }
  if (field.type === "MULTIPLE_CHOICE") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <fieldset className="choice-list">
        {field.options?.map((option) => (
          <label key={option.value}>
            <input
              disabled={disabled}
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, option.value]
                    : selected.filter((item) => item !== option.value),
                )
              }
            />{" "}
            {option.label}
          </label>
        ))}
      </fieldset>
    );
  }
  if (field.type === "SINGLE_CHOICE" || (field.type === "SCALE" && field.options?.length)) {
    if (field.id.startsWith("asrs_") || /^snap_iv_(?:form_\d+_item_\d+|\d+)$/.test(field.id) || field.id.startsWith("bai_") || /^bdi_ii_\d+$/.test(field.id) || /^scared_(?:c_\d+|p_(?:form_\d+_item_\d+|\d+))$/.test(field.id)) {
      const isSnapIv = field.id.startsWith("snap_iv_") || field.id.startsWith("bai_") || field.id.startsWith("bdi_ii_");
      return (
        <div className={/^scared_(?:c_\d+|p_(?:form_\d+_item_\d+|\d+))$/.test(field.id) ? "scared-choice-list" : isSnapIv ? "snapiv-choice-list" : "asrs-choice-list"}>
          {field.options?.map((option) => (
            <label key={option.value} title={option.label}>
              <input
                disabled={disabled}
                type="radio"
                name={field.id}
                aria-label={option.label}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      );
    }
    if (field.id.endsWith("_respondent")) {
      const selectedValue = String(value ?? "");
      const options = [...(field.options ?? [])];
      for (const respondent of [...customRespondents, selectedValue]) {
        if (respondent && !options.some((option) => option.value === respondent)) {
          options.push({ value: respondent, label: respondent });
        }
      }
      const addRespondent = () => {
        const respondent = newRespondent.trim();
        if (!respondent) return;
        setCustomRespondents((current) => [...new Set([...current, respondent])]);
        onChange(respondent);
        setNewRespondent("");
      };
      return (
        <div className="snapiv-respondent-control">
          <select
            disabled={disabled}
            value={selectedValue}
            onChange={(event) => onChange(event.target.value)}
            required={field.required}
          >
            <option value="">Selecione</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="snapiv-add-respondent">
            <input
              aria-label="Novo Respondente"
              disabled={disabled}
              placeholder="Novo Respondente"
              value={newRespondent}
              onChange={(event) => setNewRespondent(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addRespondent();
                }
              }}
            />
            <button type="button" disabled={disabled || !newRespondent.trim()} onClick={addRespondent}>
              + Adicionar
            </button>
          </div>
        </div>
      );
    }
    return (
      <select
        disabled={disabled}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
      >
        <option value="">Selecione</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  const inputType = field.type === "NUMBER" || field.type === "SCALE"
    ? "number" : field.type === "DATE" ? "date" : "text";
  return (
    <input
      disabled={disabled}
      type={inputType}
      value={String(value ?? "")}
      onChange={(event) => onChange(event.target.value)}
      required={field.required}
    />
  );
}
