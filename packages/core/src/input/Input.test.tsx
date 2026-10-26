import { fireEvent, render, screen } from '@testing-library/react';
import { Field } from '../field/Field';
import { Input } from './Input';

function describedIds(el: HTMLElement): string[] {
  return (el.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
}

describe('Input', () => {
  it('works as a native styled input outside a Field: props, forwarded ref, merged className', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Input ref={ref} aria-label="Cerca" placeholder="Cerca" className="py-4" size="sm" />);
    const input = screen.getByRole('textbox', { name: 'Cerca' });
    expect(ref.current).toBe(input);
    expect(input).toHaveClass('py-4');
    expect(input).not.toHaveClass('py-[5px]');
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('merges its own aria-describedby with the Field one', () => {
    render(
      <>
        <span id="extra">Extra</span>
        <Field label="Nome" help="Aiuto">
          <Input aria-describedby="extra" />
        </Field>
      </>,
    );
    const input = screen.getByRole('textbox', { name: 'Nome' });
    expect(describedIds(input)).toHaveLength(2);
    expect(input).toHaveAccessibleDescription('Aiuto Extra');
  });

  it('inside a Field the Field wins over id and aria-invalid passed to the Input', () => {
    render(
      <Field label="Nome" id="from-field">
        <Input id="own" aria-invalid />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Nome' });
    expect(input.id).toBe('from-field');
  });

  it('a type=number forced input stays read-only', () => {
    render(
      <Field label="Qta" state="forced" stateReason="Regola">
        <Input type="number" defaultValue={5} />
      </Field>,
    );
    const input = screen.getByRole('spinbutton', { name: 'Qta' });
    expect(input).toHaveAttribute('readonly');
    fireEvent.wheel(input, { deltaY: -100 });
    expect(input).toHaveValue(5);
  });
});
