import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Button } from '../button/Button';
import { Tooltip, TooltipProvider } from './Tooltip';

beforeAll(() => {
  // jsdom has no ResizeObserver, which Radix's popper uses to measure the trigger and the content.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const queryTooltip = () => screen.queryByRole('tooltip');

describe('Tooltip: opens only on real gestures', () => {
  it('opens on hover and describes the trigger while open', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Elimina riga" delayDuration={0}>
        <Button size="icon-xs" aria-label="Elimina riga">
          x
        </Button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Elimina riga' });
    expect(queryTooltip()).toBeNull();
    expect(trigger).not.toHaveAttribute('aria-describedby');
    await user.hover(trigger);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Elimina riga');
    expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.id);
    // Radix keeps it open while the pointer is inside the grace area towards the tooltip (it is
    // hoverable); a pointer move elsewhere closes it.
    await user.unhover(trigger);
    await user.pointer({ target: document.body, coords: { clientX: 900, clientY: 900 } });
    await waitFor(() => expect(queryTooltip()).toBeNull());
    expect(trigger).not.toHaveAttribute('aria-describedby');
  });

  it('opens when the focus arrives by Tab and closes when it leaves', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>prima</button>
        <Tooltip content="Aiuto">
          <Button>Con tooltip</Button>
        </Tooltip>
      </>,
    );
    await user.tab();
    expect(queryTooltip()).toBeNull();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Con tooltip' })).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Aiuto');
    await user.tab({ shift: true });
    await act(async () => undefined);
    expect(queryTooltip()).toBeNull();
  });

  it('never opens at mount, with autoFocus, or on a programmatic focus()', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Aiuto" delayDuration={0}>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus -- the autoFocus trigger is the case under test */}
        <Button autoFocus>Auto</Button>
      </Tooltip>,
    );
    const button = screen.getByRole('button', { name: 'Auto' });
    expect(button).toHaveFocus();
    await act(async () => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(queryTooltip()).toBeNull();

    act(() => button.blur());
    act(() => button.focus());
    await act(async () => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(queryTooltip()).toBeNull();

    // The same button reached with the keyboard does open it.
    act(() => button.blur());
    await user.tab();
    expect(button).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  });

  it('a focus() right after a non-navigation key (Enter) does not open it', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Button onClick={() => document.getElementById('target')?.focus()}>Sposta il fuoco</Button>
        <Tooltip content="Aiuto" delayDuration={0}>
          <Button id="target">Bersaglio</Button>
        </Tooltip>
      </>,
    );
    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Bersaglio' })).toHaveFocus();
    await act(async () => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(queryTooltip()).toBeNull();
  });

  it('a panel opened by ArrowDown whose autoFocus lands on a trigger does not open it', async () => {
    const user = userEvent.setup();
    function Menu() {
      const [open, setOpen] = useState(false);
      return (
        <>
          {/* Another tooltip, already mounted: the key tracking must not depend on it being the first. */}
          <Tooltip content="Altro" delayDuration={0}>
            <Button>Altro</Button>
          </Tooltip>
          <button onKeyDown={(e) => e.key === 'ArrowDown' && setOpen(true)}>Menu</button>
          {open && (
            <Tooltip content="Dentro il menu" delayDuration={0}>
              {/* eslint-disable-next-line jsx-a11y/no-autofocus -- the autoFocus trigger is the case under test */}
              <Button autoFocus>Prima voce</Button>
            </Tooltip>
          )}
        </>
      );
    }
    render(<Menu />);
    screen.getByRole('button', { name: 'Menu' }).focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Prima voce' })).toHaveFocus();
    await act(async () => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(queryTooltip()).toBeNull();
  });

  it('arrow keys moving the focus between triggers that already exist do open the tooltip', async () => {
    const user = userEvent.setup();
    function Toolbar() {
      const [refs] = useState(() => [createRef<HTMLButtonElement>(), createRef<HTMLButtonElement>()]);
      return (
        <div
          role="toolbar"
          aria-label="Azioni"
          onKeyDown={(e) => e.key === 'ArrowRight' && refs[1]!.current?.focus()}
        >
          <Tooltip content="Uno" delayDuration={0}>
            <Button ref={refs[0]}>Uno</Button>
          </Tooltip>
          <Tooltip content="Due" delayDuration={0}>
            <Button ref={refs[1]} tabIndex={-1}>
              Due
            </Button>
          </Tooltip>
        </div>
      );
    }
    render(<Toolbar />);
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: 'Due' })).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Due');
  });

  it('a click closes it and its focus does not reopen it', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Tooltip content="Aiuto" delayDuration={0}>
        <Button onClick={onClick}>Azione</Button>
      </Tooltip>,
    );
    const button = screen.getByRole('button', { name: 'Azione' });
    await user.hover(button);
    await screen.findByRole('tooltip');
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    await act(async () => undefined);
    expect(queryTooltip()).toBeNull();
  });
});

describe('Tooltip: empty content', () => {
  for (const [label, content] of [
    ['empty string', ''],
    ['whitespace', '   '],
    ['null', null],
    ['undefined', undefined],
    ['false', false],
  ] as const) {
    it(`${label}: no tooltip and no aria-describedby`, async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content={content} delayDuration={0}>
          <Button>Vuoto</Button>
        </Tooltip>,
      );
      const button = screen.getByRole('button', { name: 'Vuoto' });
      await user.hover(button);
      await user.tab();
      await act(async () => new Promise((resolve) => setTimeout(resolve, 30)));
      expect(queryTooltip()).toBeNull();
      expect(button).not.toHaveAttribute('aria-describedby');
    });
  }

  it('an empty-content trigger does not make the next tooltip of the provider skip its delay', async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={400}>
        <Tooltip content="">
          <Button>Vuoto</Button>
        </Tooltip>
        <Tooltip content="Pieno">
          <Button>Pieno</Button>
        </Tooltip>
      </TooltipProvider>,
    );
    await user.hover(screen.getByRole('button', { name: 'Vuoto' }));
    await user.unhover(screen.getByRole('button', { name: 'Vuoto' }));
    await user.hover(screen.getByRole('button', { name: 'Pieno' }));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 100)));
    expect(queryTooltip()).toBeNull();
    expect(await screen.findByRole('tooltip', undefined, { timeout: 1500 })).toHaveTextContent('Pieno');
  });

  it('a missing child (false, null) renders nothing and does not throw', () => {
    expect(() =>
      render(
        <>
          <Tooltip content="x">{false as const}</Tooltip>
          <Tooltip content="x">{null}</Tooltip>
        </>,
      ),
    ).not.toThrow();
    expect(queryTooltip()).toBeNull();
  });

  it('content that becomes empty while open closes the tooltip', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Tooltip content="Testo" delayDuration={0}>
        <Button>Cambia</Button>
      </Tooltip>,
    );
    const button = screen.getByRole('button', { name: 'Cambia' });
    await user.hover(button);
    await screen.findByRole('tooltip');
    rerender(
      <Tooltip content="" delayDuration={0}>
        <Button>Cambia</Button>
      </Tooltip>,
    );
    expect(queryTooltip()).toBeNull();
    expect(button).not.toHaveAttribute('aria-describedby');
  });

  it('content that changes while open updates the text', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Tooltip content="Uno" delayDuration={0}>
        <Button>Testo</Button>
      </Tooltip>,
    );
    await user.hover(screen.getByRole('button', { name: 'Testo' }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Uno');
    rerender(
      <Tooltip content="Due" delayDuration={0}>
        <Button>Testo</Button>
      </Tooltip>,
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent('Due');
  });
});

describe('Tooltip: disabled trigger', () => {
  it('by default a disabled trigger gets no tooltip and stays out of the tab order wrapper', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Tooltip content="Motivo" delayDuration={0}>
        <Button disabled>Disattivo</Button>
      </Tooltip>,
    );
    const button = screen.getByRole('button', { name: 'Disattivo' });
    await user.hover(button);
    await user.tab();
    await act(async () => new Promise((resolve) => setTimeout(resolve, 30)));
    expect(queryTooltip()).toBeNull();
    expect(button).not.toHaveAttribute('aria-describedby');
    expect(container.querySelector('span[tabindex]')).toBeNull();
  });

  it('with disabledTriggerFocusable a focusable span is the trigger and opens it by keyboard', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Tooltip content="Motivo" disabledTriggerFocusable>
        <Button disabled>Disattivo</Button>
      </Tooltip>,
    );
    const span = container.querySelector<HTMLElement>('span[tabindex="0"]');
    expect(span).not.toBeNull();
    expect(span).toContainElement(screen.getByRole('button', { name: 'Disattivo' }));
    await user.tab();
    expect(span).toHaveFocus();
    const tooltip = await screen.findByRole('tooltip');
    expect(span!.getAttribute('aria-describedby')).toBe(tooltip.id);
  });

  it('disabledTriggerFocusable does not wrap an enabled trigger', () => {
    const { container } = render(
      <Tooltip content="Motivo" disabledTriggerFocusable>
        <Button>Attivo</Button>
      </Tooltip>,
    );
    expect(container.querySelector('span[tabindex]')).toBeNull();
  });

  it('a tooltip open when the trigger becomes disabled is closed, and does not come back', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Tooltip content="Motivo" delayDuration={0}>
        <Button>Stato</Button>
      </Tooltip>,
    );
    await user.hover(screen.getByRole('button', { name: 'Stato' }));
    await screen.findByRole('tooltip');
    rerender(
      <Tooltip content="Motivo" delayDuration={0}>
        <Button disabled>Stato</Button>
      </Tooltip>,
    );
    expect(queryTooltip()).toBeNull();
    rerender(
      <Tooltip content="Motivo" delayDuration={0}>
        <Button>Stato</Button>
      </Tooltip>,
    );
    await act(async () => new Promise((resolve) => setTimeout(resolve, 30)));
    expect(queryTooltip()).toBeNull();
  });
});

describe('Tooltip: provider', () => {
  it('works with no TooltipProvider (supplies its own)', async () => {
    const user = userEvent.setup();
    expect(() =>
      render(
        <Tooltip content="Senza provider" delayDuration={0}>
          <Button>Solo</Button>
        </Tooltip>,
      ),
    ).not.toThrow();
    await user.hover(screen.getByRole('button', { name: 'Solo' }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Senza provider');
  });

  it('works inside a TooltipProvider', async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip content="Con provider">
          <Button>Dentro</Button>
        </Tooltip>
      </TooltipProvider>,
    );
    await user.hover(screen.getByRole('button', { name: 'Dentro' }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Con provider');
  });
});

describe('Tooltip: controlled', () => {
  it('open={true} shows it and Escape asks to close through onOpenChange', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Tooltip content="Fisso" open onOpenChange={onOpenChange}>
        <Button>Controllato</Button>
      </Tooltip>,
    );
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Fisso');
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    // Controlled: it stays open until the consumer says otherwise.
    expect(queryTooltip()).not.toBeNull();
  });

  it('open={false} ignores hover but reports the request', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Tooltip content="Chiuso" open={false} onOpenChange={onOpenChange} delayDuration={0}>
        <Button>Controllato</Button>
      </Tooltip>,
    );
    await user.hover(screen.getByRole('button', { name: 'Controllato' }));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 30)));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(queryTooltip()).toBeNull();
  });
});

describe('Tooltip: asChild and no leak', () => {
  it('preserves the child ref and its handlers', async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    const onFocus = vi.fn();
    render(
      <Tooltip content="Ref">
        <Button ref={ref} onClick={onClick} onFocus={onFocus}>
          Mio
        </Button>
      </Tooltip>,
    );
    const button = screen.getByRole('button', { name: 'Mio' });
    expect(ref.current).toBe(button);
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it('does not leak wrapper props onto the trigger or the content', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip
        content="Contenuto"
        side="bottom"
        align="start"
        sideOffset={9}
        delayDuration={0}
        onOpenChange={() => undefined}
        disabledTriggerFocusable
      >
        <Button aria-label="Nome">i</Button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Nome' });
    await user.hover(trigger);
    const tooltip = await screen.findByRole('tooltip');
    const forbidden = [
      'content',
      'side',
      'align',
      'sideoffset',
      'delayduration',
      'open',
      'onopenchange',
      'disabledtriggerfocusable',
      'collisionpadding',
      'aschild',
    ];
    for (const node of [trigger, tooltip]) {
      const names = node.getAttributeNames().map((n) => n.toLowerCase());
      for (const name of forbidden) expect(names).not.toContain(name);
    }
  });
});

describe('Tooltip: unmount', () => {
  it('leaves no orphan tooltip when the trigger unmounts while open', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Tooltip content="Orfano" delayDuration={0}>
        <Button>Via</Button>
      </Tooltip>,
    );
    await user.hover(screen.getByRole('button', { name: 'Via' }));
    await screen.findByRole('tooltip');
    rerender(<div />);
    expect(queryTooltip()).toBeNull();
    expect(document.body.querySelector('[data-radix-popper-content-wrapper]')).toBeNull();
  });
});
