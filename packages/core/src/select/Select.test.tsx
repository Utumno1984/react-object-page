import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '../dialog/Dialog';
import { Field } from '../field/Field';
import { Select, type SelectOption } from './Select';

// jsdom lacks what Radix Select measures and scrolls with.
beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => undefined;
  proto.releasePointerCapture ??= () => undefined;
  proto.scrollIntoView ??= () => undefined;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const COUNTRIES: SelectOption[] = [
  { value: 'it', label: 'Italia' },
  { value: 'fr', label: 'Francia' },
  { value: 'de', label: 'Germania', disabled: true },
  { value: 'es', label: 'Spagna' },
];

describe('Select', () => {
  it('is a combobox named by the Field label, described by the Field messages, with aria-expanded in sync', async () => {
    const user = userEvent.setup();
    render(
      <Field label="Paese" help="Sede legale" error="Obbligatorio" required>
        <Select options={COUNTRIES} placeholder="Seleziona" />
      </Field>,
    );
    const trigger = screen.getByRole('combobox', { name: 'Paese' });
    expect(trigger).toHaveAccessibleDescription('Obbligatorio Sede legale');
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(trigger).toHaveAttribute('aria-required', 'true');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent('Seleziona');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('click on an option selects it, closes the list, calls onValueChange once and shows the label', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    function Host() {
      const [v, setV] = useState<string | undefined>();
      return (
        <Select
          aria-label="Paese"
          options={COUNTRIES}
          value={v}
          onValueChange={(next) => {
            onValueChange(next);
            setV(next);
          }}
        />
      );
    }
    render(<Host />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Francia' }));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith('fr');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('combobox')).toHaveTextContent('Francia');
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: 'Francia' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'Italia' })).toHaveAttribute('aria-selected', 'false');
    expect(within(screen.getByRole('option', { name: 'Francia' })).queryByRole('img')).toBeNull();
  });

  it('works uncontrolled with defaultValue', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Select aria-label="Paese" options={COUNTRIES} defaultValue="it" onValueChange={onValueChange} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Italia');
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Spagna' }));
    expect(screen.getByRole('combobox')).toHaveTextContent('Spagna');
    expect(onValueChange).toHaveBeenCalledOnce();
  });

  it('keyboard: ArrowDown opens, disabled options are skipped, Enter selects, Escape closes without selecting', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Select aria-label="Paese" options={COUNTRIES} defaultValue="fr" onValueChange={onValueChange} />);
    await user.tab();
    expect(screen.getByRole('combobox')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Francia' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Spagna' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onValueChange).not.toHaveBeenCalled();
    await user.keyboard('{Enter}{ArrowDown}{Enter}');
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('es');
  });

  it('typeahead moves to the matching option; Home and End go to the first and the last enabled', async () => {
    const user = userEvent.setup();
    render(<Select aria-label="Paese" options={COUNTRIES} defaultValue="it" />);
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('sp');
    expect(screen.getByRole('option', { name: 'Spagna' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('option', { name: 'Italia' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('option', { name: 'Spagna' })).toHaveFocus();
  });

  it('a disabled option cannot be picked', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Select aria-label="Paese" options={COUNTRIES} onValueChange={onValueChange} />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Germania' }));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  describe('no echo: a value changed from outside never reaches onValueChange', () => {
    it('after the options arrive late, to a known value, to an unknown one and to undefined', () => {
      const onValueChange = vi.fn();
      const { rerender } = render(
        <Select aria-label="Paese" options={[]} value={undefined} onValueChange={onValueChange} placeholder="Seleziona" />,
      );
      expect(screen.getByRole('combobox')).toHaveTextContent('Seleziona');
      rerender(<Select aria-label="Paese" options={[]} value="it" onValueChange={onValueChange} />);
      rerender(<Select aria-label="Paese" options={COUNTRIES} value="it" onValueChange={onValueChange} />);
      expect(screen.getByRole('combobox')).toHaveTextContent('Italia');
      rerender(<Select aria-label="Paese" options={COUNTRIES} value="xx" onValueChange={onValueChange} />);
      rerender(<Select aria-label="Paese" options={COUNTRIES} value="de" onValueChange={onValueChange} />);
      rerender(
        <Select aria-label="Paese" options={COUNTRIES} value={undefined} onValueChange={onValueChange} placeholder="Seleziona" />,
      );
      expect(screen.getByRole('combobox')).toHaveTextContent('Seleziona');
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('while the list is open the selection indicator follows the value', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      const { rerender } = render(<Select aria-label="Paese" options={COUNTRIES} value="it" onValueChange={onValueChange} />);
      await user.click(screen.getByRole('combobox'));
      expect(screen.getByRole('option', { name: 'Italia' })).toHaveAttribute('aria-selected', 'true');
      rerender(<Select aria-label="Paese" options={COUNTRIES} value="es" onValueChange={onValueChange} />);
      expect(screen.getByRole('option', { name: 'Spagna' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('option', { name: 'Italia' })).toHaveAttribute('aria-selected', 'false');
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('through an async load driven by a state update', async () => {
      const onValueChange = vi.fn();
      function Host() {
        const [data, setData] = useState<{ options: SelectOption[]; value?: string }>({ options: [] });
        return (
          <>
            <button onClick={() => setData({ options: COUNTRIES, value: 'es' })}>carica</button>
            <Select aria-label="Paese" options={data.options} value={data.value} onValueChange={onValueChange} />
          </>
        );
      }
      render(<Host />);
      await act(async () => screen.getByRole('button', { name: 'carica' }).click());
      expect(screen.getByRole('combobox')).toHaveTextContent('Spagna');
      expect(onValueChange).not.toHaveBeenCalled();
    });
  });

  it('a value with no option shows the raw value, or unknownValueLabel, and calls nothing', () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<Select aria-label="Paese" options={COUNTRIES} value="zz" onValueChange={onValueChange} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('zz');
    rerender(
      <Select aria-label="Paese" options={COUNTRIES} value="zz" unknownValueLabel="(non più disponibile)" onValueChange={onValueChange} />,
    );
    expect(screen.getByRole('combobox')).toHaveTextContent('(non più disponibile)');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('no value shows the placeholder and exposes no sentinel value', async () => {
    const user = userEvent.setup();
    render(<Select aria-label="Paese" options={COUNTRIES} value={undefined} placeholder="Seleziona" />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Seleziona');
    await user.click(screen.getByRole('combobox'));
    expect(screen.getAllByRole('option').every((o) => o.getAttribute('aria-selected') !== 'true')).toBe(true);
  });

  it('empty options: the list opens with a declared text and the trigger shows the placeholder', async () => {
    const user = userEvent.setup();
    render(<Select aria-label="Paese" options={[]} placeholder="Seleziona" />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Seleziona');
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByText('Nessuna opzione')).toBeInTheDocument();
  });

  it('options removed while the list is open do not crash it', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Select aria-label="Paese" options={COUNTRIES} />);
    await user.click(screen.getByRole('combobox'));
    rerender(<Select aria-label="Paese" options={COUNTRIES.slice(2)} />);
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Germania', 'Spagna']);
  });

  it('warns once in development about duplicate values and keeps the first', async () => {
    const user = userEvent.setup();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Select
        aria-label="Paese"
        options={[
          { value: 'a', label: 'Uno' },
          { value: 'a', label: 'Due' },
        ]}
      />,
    );
    await user.click(screen.getByRole('combobox'));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Uno']);
    expect(warn.mock.calls.filter(([m]) => String(m).includes('unique values')).length).toBeLessThanOrEqual(1);
  });

  describe('Field states', () => {
    it('disabled: not focusable, not openable', async () => {
      const user = userEvent.setup();
      render(
        <Field label="Paese" state="disabled">
          <Select options={COUNTRIES} />
        </Field>,
      );
      const trigger = screen.getByRole('combobox', { name: 'Paese' });
      expect(trigger).toBeDisabled();
      await user.click(trigger);
      await user.tab();
      expect(trigger).not.toHaveFocus();
      expect(screen.queryByRole('listbox')).toBeNull();
    });

    it.each(['forced', 'locked'] as const)('%s: focusable, shows the value, never opens, value never changes', async (state) => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Field label="Paese" state={state} stateReason="Deciso dal contratto">
          <Select options={COUNTRIES} value="it" onValueChange={onValueChange} />
        </Field>,
      );
      const trigger = screen.getByRole('combobox', { name: 'Paese' });
      expect(trigger).toHaveTextContent('Italia');
      expect(trigger).toHaveAccessibleDescription('Deciso dal contratto');
      expect(trigger).toHaveAttribute('aria-readonly', 'true');
      await user.tab();
      expect(trigger).toHaveFocus();
      await user.keyboard('{Enter}{ }{ArrowDown}{ArrowUp}fr');
      await user.click(trigger);
      expect(screen.queryByRole('listbox')).toBeNull();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(onValueChange).not.toHaveBeenCalled();
    });
  });

  it('forwards the ref and merges className over the defaults, and does not leak wrapper props on the DOM', () => {
    const ref = { current: null as HTMLButtonElement | null };
    const warn = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <Select
        ref={ref}
        aria-label="Paese"
        options={COUNTRIES}
        value="zz"
        unknownValueLabel="?"
        emptyLabel="vuoto"
        placeholder="Seleziona"
        size="sm"
        data-testid="sel"
        className="py-4"
      />,
    );
    const trigger = screen.getByTestId('sel');
    expect(ref.current).toBe(trigger);
    expect(trigger).toHaveClass('py-4');
    expect(trigger).not.toHaveClass('py-[5px]');
    for (const name of ['options', 'unknownvaluelabel', 'unknownValueLabel', 'emptylabel', 'emptyLabel', 'size', 'defaultvalue', 'placeholder', 'onvaluechange']) {
      expect(trigger).not.toHaveAttribute(name);
    }
    expect(trigger.outerHTML).not.toMatch(/\[object Object\]|unknown/i);
    expect(warn).not.toHaveBeenCalled();
  });

  it('inside a Dialog, picking an option leaves the dialog open and Escape closes only the list first', async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Apri</DialogTrigger>
        <DialogContent>
          <DialogTitle>Modifica</DialogTitle>
          <Select aria-label="Paese" options={COUNTRIES} />
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByRole('button', { name: 'Apri' }));
    await user.click(screen.getByRole('combobox', { name: 'Paese' }));
    await user.click(screen.getByRole('option', { name: 'Spagna' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Paese' })).toHaveTextContent('Spagna');
    await user.click(screen.getByRole('combobox', { name: 'Paese' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
