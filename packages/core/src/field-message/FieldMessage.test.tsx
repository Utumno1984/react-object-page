import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { FieldMessage } from './FieldMessage';

describe('FieldMessage', () => {
  it('passes the id to the DOM unchanged and has no live role', () => {
    render(
      <>
        <FieldMessage id="x" tone="help">
          Aiuto
        </FieldMessage>
        <FieldMessage id="y" tone="error">
          Errore
        </FieldMessage>
      </>,
    );
    expect(screen.getByText('Aiuto').closest('#x')).not.toBeNull();
    expect(screen.getByText('Errore').closest('#y')).not.toBeNull();
    expect(document.getElementById('x')).not.toHaveAttribute('role');
    expect(document.getElementById('y')).not.toHaveAttribute('role');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('is referenceable through aria-describedby', () => {
    render(
      <>
        <input aria-label="Nome" aria-describedby="n-err" aria-invalid />
        <FieldMessage id="n-err" tone="error">
          Obbligatorio
        </FieldMessage>
      </>,
    );
    expect(screen.getByRole('textbox', { name: 'Nome' })).toHaveAccessibleDescription('Obbligatorio');
  });

  it('error has a decorative icon, help has none', () => {
    render(
      <>
        <FieldMessage id="h" tone="help">
          a
        </FieldMessage>
        <FieldMessage id="e" tone="error">
          b
        </FieldMessage>
      </>,
    );
    expect(document.querySelector('#h svg')).toBeNull();
    expect(document.querySelector('#e svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('help and error differ only in the colour class', () => {
    render(
      <>
        <FieldMessage id="h" tone="help">
          a
        </FieldMessage>
        <FieldMessage id="e" tone="error">
          b
        </FieldMessage>
      </>,
    );
    const classes = (id: string) => (document.getElementById(id) as HTMLElement).className.split(' ');
    const geometry = (list: string[]) => list.filter((c) => !c.startsWith('text-rop-text') && c !== 'text-rop-error');
    expect(geometry(classes('h'))).toEqual(geometry(classes('e')));
    expect(classes('h')).not.toEqual(classes('e'));
  });

  it.each([null, undefined, false, ''])('renders nothing for empty children (%j)', (children) => {
    const { container } = render(
      <FieldMessage id="x" tone="error">
        {children}
      </FieldMessage>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an empty Fragment or blank text', () => {
    const { container } = render(
      <>
        <FieldMessage id="a" tone="error">
          <></>
        </FieldMessage>
        <FieldMessage id="b" tone="error">
          {'  '}
        </FieldMessage>
      </>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('forwards ref and className', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <FieldMessage id="x" tone="help" ref={ref} className="extra">
        a
      </FieldMessage>,
    );
    expect(ref.current).toBe(document.getElementById('x'));
    expect(ref.current).toHaveClass('extra');
  });
});
