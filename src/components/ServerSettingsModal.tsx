import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import {
  API_PRESETS,
  getApiBase,
  normalizeBase,
  setApiBase,
} from '../config/api';
import { Modal } from './Modal';

interface ServerSettingsModalProps {
  onClose: () => void;
  onSaved: (base: string) => void;
  reloadHint?: boolean;
}

export function ServerSettingsModal({
  onClose,
  onSaved,
  reloadHint = true,
}: ServerSettingsModalProps) {
  const [value, setValue] = useState(() => getApiBase());
  const formId = useId();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const base = setApiBase(value);
    onSaved(base);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Servidor backend"
      subtitle="Elige la instancia a la que se conectará este panel."
      footer={
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" type="submit" form={formId}>
            Guardar servidor
          </button>
        </>
      }
    >
      <form id={formId} className="modal-body" onSubmit={submit}>
        <label className="field">
          <span>URL del backend</span>
          <input
            className="input"
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="https://granbar-bq.onrender.com"
            autoFocus
          />
        </label>

        <div className="preset-list" aria-label="Servidores disponibles">
          {API_PRESETS.map((preset) => {
            const active = normalizeBase(value) === preset.value;
            return (
              <button
                key={preset.value}
                className={`preset-item${active ? ' active' : ''}`}
                type="button"
                aria-pressed={active}
                onClick={() => setValue(preset.value)}
              >
                <strong>{preset.label}</strong>
                <span>{preset.value.replace(/^https?:\/\//, '')}</span>
              </button>
            );
          })}
        </div>

        <p className="subtle">
          {reloadHint
            ? 'Al guardar, el panel se recargará para consultar los datos del nuevo servidor.'
            : 'La URL se guarda en este navegador; no requiere rebuild.'}
        </p>
      </form>
    </Modal>
  );
}
