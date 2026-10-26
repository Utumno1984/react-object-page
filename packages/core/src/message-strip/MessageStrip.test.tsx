import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageStrip } from './MessageStrip';

describe('MessageStrip', () => {
  describe('tone and live role', () => {
    it('defaults to info: role=status, with a decorative icon', () => {
      const { container } = render(<MessageStrip>Salvato</MessageStrip>);
      const strip = screen.getByRole('status');
      expect(strip).toHaveTextContent('Salvato');
      const icon = container.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it.each(['info', 'success', 'warning'] as const)('tone=%s uses role=status', (tone) => {
      render(<MessageStrip tone={tone}>x</MessageStrip>);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('tone=error uses role=alert', () => {
      render(<MessageStrip tone="error">x</MessageStrip>);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.queryByRole('status')).toBeNull();
    });

    it('live={false} removes the live role', () => {
      render(
        <>
          <MessageStrip live={false}>a</MessageStrip>
          <MessageStrip live={false} tone="error">
            b
          </MessageStrip>
        </>,
      );
      expect(screen.queryByRole('status')).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('changing tone from info to error after mount switches the role to alert', () => {
      const { rerender } = render(<MessageStrip tone="info">x</MessageStrip>);
      expect(screen.getByRole('status')).toBeInTheDocument();
      rerender(<MessageStrip tone="error">x</MessageStrip>);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('each tone has a distinct class set', () => {
      const seen = new Set<string>();
      for (const tone of ['info', 'success', 'warning', 'error'] as const) {
        const { unmount } = render(<MessageStrip tone={tone}>x</MessageStrip>);
        seen.add(screen.getByRole(tone === 'error' ? 'alert' : 'status').className);
        unmount();
      }
      expect(seen.size).toBe(4);
    });
  });

  describe('tone as text', () => {
    it('puts the tone name in the accessible text content', () => {
      render(<MessageStrip tone="error">Salvataggio fallito</MessageStrip>);
      expect(screen.getByRole('alert')).toHaveTextContent('Error: Salvataggio fallito');
    });

    it.each([
      ['info', 'Information'],
      ['success', 'Success'],
      ['warning', 'Warning'],
    ] as const)('default label of %s', (tone, label) => {
      render(<MessageStrip tone={tone}>x</MessageStrip>);
      expect(screen.getByRole('status')).toHaveTextContent(`${label}: x`);
    });

    it('toneLabel overrides the default', () => {
      render(
        <MessageStrip tone="warning" toneLabel="Attenzione">
          x
        </MessageStrip>,
      );
      expect(screen.getByRole('status')).toHaveTextContent('Attenzione: x');
    });
  });

  describe('title and content', () => {
    it('renders the title in bold before the content, in the same block', () => {
      render(
        <MessageStrip title="Titolo" tone="success">
          Corpo
        </MessageStrip>,
      );
      const title = screen.getByText('Titolo');
      expect(title.tagName).toBe('STRONG');
      const body = screen.getByText('Corpo');
      expect(title.parentElement).toBe(body.parentElement);
      expect(title.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('title only: no empty content node', () => {
      render(<MessageStrip title="Solo titolo" />);
      const block = screen.getByText('Solo titolo').parentElement as HTMLElement;
      // hidden tone name + the title, nothing else
      expect(Array.from(block.children).map((c) => c.tagName)).toEqual(['SPAN', 'STRONG']);
    });

    it('no title and no content: renders neither the title nor the content node', () => {
      render(<MessageStrip tone="info">{''}</MessageStrip>);
      const block = screen.getByRole('status').querySelector('.min-w-0') as HTMLElement;
      expect(Array.from(block.children).map((c) => c.tagName)).toEqual(['SPAN']);
    });

    it('forwards ref, className and DOM props to the root', () => {
      const ref = createRef<HTMLDivElement>();
      render(
        <MessageStrip ref={ref} className="extra" data-testid="s">
          x
        </MessageStrip>,
      );
      expect(ref.current).toBe(screen.getByTestId('s'));
      expect(ref.current).toHaveClass('extra');
    });
  });

  describe('dismiss', () => {
    it('has no close button without onDismiss', () => {
      render(<MessageStrip>x</MessageStrip>);
      expect(screen.queryByRole('button')).toBeNull();
    });

    it('click calls onDismiss once and does not unmount the strip', async () => {
      const onDismiss = vi.fn();
      render(<MessageStrip onDismiss={onDismiss}>x</MessageStrip>);
      await userEvent.click(screen.getByRole('button'));
      expect(onDismiss).toHaveBeenCalledOnce();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it.each(['{Enter}', ' '])('keyboard %j calls onDismiss once', async (key) => {
      const onDismiss = vi.fn();
      render(<MessageStrip onDismiss={onDismiss}>x</MessageStrip>);
      await userEvent.tab();
      expect(screen.getByRole('button')).toHaveFocus();
      await userEvent.keyboard(key);
      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('is an icon-xs ghost Button (24px square class) with a decorative close icon', () => {
      render(<MessageStrip onDismiss={() => {}}>x</MessageStrip>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('size-6');
      expect(button).toHaveAttribute('type', 'button');
      expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    });

    it('default name includes the title; two strips have different names', () => {
      render(
        <>
          <MessageStrip title="Salvataggio non riuscito" tone="error" onDismiss={() => {}} />
          <MessageStrip title="Profilo aggiornato" tone="success" onDismiss={() => {}} />
        </>,
      );
      expect(screen.getByRole('button', { name: 'Dismiss message: Salvataggio non riuscito' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Dismiss message: Profilo aggiornato' })).toBeInTheDocument();
    });

    it('dismissLabel overrides the default name', () => {
      render(<MessageStrip title="T" dismissLabel="Chiudi" onDismiss={() => {}} />);
      expect(screen.getByRole('button', { name: 'Chiudi' })).toBeInTheDocument();
    });

    it('without a title the name is the plain default', () => {
      render(<MessageStrip onDismiss={() => {}}>x</MessageStrip>);
      expect(screen.getByRole('button', { name: 'Dismiss message' })).toBeInTheDocument();
    });

    it('title as a React node: the name uses its text, never "[object Object]"', () => {
      render(
        <MessageStrip
          title={
            <>
              Errore <em>grave</em> {42}
            </>
          }
          onDismiss={() => {}}
        />,
      );
      expect(screen.getByRole('button', { name: 'Dismiss message: Errore grave 42' })).toBeInTheDocument();
    });

    it('title node without text (icon only): falls back to the plain default name', () => {
      render(<MessageStrip title={<svg aria-hidden="true" />} onDismiss={() => {}} />);
      expect(screen.getByRole('button', { name: 'Dismiss message' })).toBeInTheDocument();
    });
  });
});
