import { createContext, useContext, useId } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const FieldIdContext = createContext<string | undefined>(undefined);

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps) {
  const generatedId = useId();
  const id = label ? generatedId : undefined;

  return (
    <div>
      {label ? (
        <label htmlFor={id} className="label">
          {label}
        </label>
      ) : null}
      <FieldIdContext.Provider value={id}>{children}</FieldIdContext.Provider>
      {error ? (
        <span className="mt-1 block text-xs text-rose-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      ) : null}
    </div>
  );
}

function useFieldId(ownId?: string) {
  const contextId = useContext(FieldIdContext);
  return ownId ?? contextId;
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ invalid, className = '', id, ...rest }: InputProps) {
  const resolvedId = useFieldId(id);

  return (
    <input
      id={resolvedId}
      className={`input ${invalid ? 'input-error' : ''} ${className}`}
      {...rest}
    />
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function Textarea({ invalid, className = '', id, ...rest }: TextareaProps) {
  const resolvedId = useFieldId(id);

  return (
    <textarea
      id={resolvedId}
      className={`input resize-y ${invalid ? 'input-error' : ''} ${className}`}
      {...rest}
    />
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export function Select({ invalid, className = '', id, ...rest }: SelectProps) {
  const resolvedId = useFieldId(id);

  return (
    <select
      id={resolvedId}
      className={`input ${invalid ? 'input-error' : ''} ${className}`}
      {...rest}
    />
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="break-words text-sm font-medium text-slate-800">{label}</p>
        {description ? (
          <p className="mt-0.5 break-words text-xs text-slate-500">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
          checked ? 'bg-brand-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
