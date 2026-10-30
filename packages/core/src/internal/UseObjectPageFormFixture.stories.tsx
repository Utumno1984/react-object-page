// Internal fixture for `useObjectPageForm`: bare `<input>`s, no style. Not exported from the
// package and never to be re-exported from it.
import { useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useObjectPageForm } from '../object-page/use-object-page-form';

type Invoice = { supplier: string; amount: string };

const EMPTY: Invoice = { supplier: '', amount: '' };
const LOADED: Invoice = { supplier: 'ACME srl', amount: '120.00' };

function FormDemo() {
  const form = useObjectPageForm<Invoice>({ baseline: EMPTY });
  const { reset } = form;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const load = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => reset(LOADED), 500);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', display: 'grid', gap: 8, justifyItems: 'start' }}>
      <label>
        Supplier <input value={form.values.supplier} onChange={(e) => form.setValue('supplier', e.target.value)} />
      </label>
      <label>
        Amount <input value={form.values.amount} onChange={(e) => form.setValue('amount', e.target.value)} />
      </label>
      <p data-testid="dirty">dirty: {form.isDirty ? 'sì' : 'no'}</p>
      <p data-testid="saving">{form.isSaving ? 'saving…' : ''}</p>
      <p role="alert" data-testid="error">
        {form.saveError !== null ? `Errore: ${String((form.saveError as Error).message)}` : ''}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={load}>
          Carica dati
        </button>
        <button type="button" onClick={() => form.reset()}>
          Annulla
        </button>
        <button type="button" onClick={() => void form.save(async () => undefined)}>
          Salva (ok)
        </button>
        <button
          type="button"
          onClick={() =>
            void form.save(async () => {
              throw new Error('server non raggiungibile');
            })
          }
        >
          Salva (errore)
        </button>
      </div>
    </div>
  );
}

const meta = {
  title: 'Internal/UseObjectPageFormFixture',
  component: FormDemo,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof FormDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
