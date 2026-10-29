import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { TruncatedText } from './TruncatedText';

beforeAll(() => {
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

// jsdom has no layout: the measure the component reads is faked per element.
function fakeWidths(el: HTMLElement, scrollWidth: number, clientWidth: number) {
  Object.defineProperty(el, 'scrollWidth', { value: scrollWidth, configurable: true });
  Object.defineProperty(el, 'clientWidth', { value: clientWidth, configurable: true });
}

const queryTooltip = () => screen.queryByRole('tooltip');

describe('TruncatedText', () => {
  it('renders the full text in the DOM, as a span by default and a div with `as`', () => {
    const { rerender } = render(<TruncatedText data-testid="t">A long text</TruncatedText>);
    expect(screen.getByTestId('t').tagName).toBe('SPAN');
    expect(screen.getByTestId('t')).toHaveTextContent('A long text');
    rerender(
      <TruncatedText as="div" data-testid="t">
        A long text
      </TruncatedText>,
    );
    expect(screen.getByTestId('t').tagName).toBe('DIV');
  });

  it('is not a tab stop by default; tabIndex from the consumer reaches the element', () => {
    const { rerender } = render(<TruncatedText data-testid="t">x</TruncatedText>);
    expect(screen.getByTestId('t')).not.toHaveAttribute('tabindex');
    rerender(
      <TruncatedText data-testid="t" tabIndex={0}>
        x
      </TruncatedText>,
    );
    expect(screen.getByTestId('t')).toHaveAttribute('tabindex', '0');
  });

  it('forwards the ref and merges className over the defaults', () => {
    const ref = createRef<HTMLElement>();
    render(
      <TruncatedText ref={ref} data-testid="t" className="min-w-[10px] text-red-500">
        x
      </TruncatedText>,
    );
    expect(ref.current).toBe(screen.getByTestId('t'));
    const classes = screen.getByTestId('t').className.split(/\s+/);
    // The consumer's `min-w-[10px]` replaces the default `min-w-0` (no concatenated conflict).
    expect(classes).toContain('min-w-[10px]');
    expect(classes).not.toContain('min-w-0');
    expect(classes).toContain('text-red-500');
    expect(classes).toContain('max-w-full');
  });

  it('does not leak its own props (tooltipContent, as) to the DOM', () => {
    render(
      <TruncatedText data-testid="t" as="div" tooltipContent="Extra">
        x
      </TruncatedText>,
    );
    const attributes = screen.getByTestId('t').getAttributeNames();
    expect(attributes.filter((name) => /tooltip|^as$/i.test(name))).toEqual([]);
  });

  it('opens nothing at mount, not even when the truncated text is focused programmatically', async () => {
    // (React's `autoFocus` only focuses form controls: the focus is given from the ref callback.)
    render(
      <TruncatedText data-testid="t" tabIndex={0} ref={(el) => el?.focus()}>
        A long text
      </TruncatedText>,
    );
    fakeWidths(screen.getByTestId('t'), 500, 100);
    expect(screen.getByTestId('t')).toHaveFocus();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(queryTooltip()).toBeNull();
  });
});

describe('TruncatedText: the tooltip appears only when truncated, measured at the gesture', () => {
  it('opens on keyboard focus when truncated, with the full text and no aria-describedby on the element', async () => {
    const user = userEvent.setup();
    render(
      <TruncatedText data-testid="t" tabIndex={0}>
        A very long text
      </TruncatedText>,
    );
    const el = screen.getByTestId('t');
    fakeWidths(el, 500, 100);
    await user.tab();
    expect(el).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('A very long text');
    // The text is the element's own content: a description would make it read twice.
    expect(el).not.toHaveAttribute('aria-describedby');
  });

  it('opens nothing when the text fits (scrollWidth equal to clientWidth, also at exactly the width)', async () => {
    const user = userEvent.setup();
    render(
      <TruncatedText data-testid="t" tabIndex={0}>
        Fits exactly
      </TruncatedText>,
    );
    fakeWidths(screen.getByTestId('t'), 200, 200);
    await user.tab();
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(queryTooltip()).toBeNull();
  });

  it('judges by the width at the gesture: narrowed after the mount opens, widened again does not', async () => {
    const user = userEvent.setup();
    render(
      <TruncatedText data-testid="t" tabIndex={0}>
        A very long text
      </TruncatedText>,
    );
    const el = screen.getByTestId('t');
    fakeWidths(el, 500, 500); // fits at mount
    fakeWidths(el, 500, 120); // the container shrinks afterwards
    await user.tab();
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(queryTooltip()).toBeNull());
    el.blur();
    fakeWidths(el, 500, 600); // widened again
    await user.tab();
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(queryTooltip()).toBeNull();
  });

  it('closes an open tooltip when the text changes to one that fits', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <TruncatedText data-testid="t" tabIndex={0}>
        A very long text
      </TruncatedText>,
    );
    const el = screen.getByTestId('t');
    fakeWidths(el, 500, 100);
    await user.tab();
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    fakeWidths(el, 50, 100);
    rerender(
      <TruncatedText data-testid="t" tabIndex={0}>
        Short
      </TruncatedText>,
    );
    await waitFor(() => expect(queryTooltip()).toBeNull());
  });
});

describe('TruncatedText: non-string children', () => {
  it('uses the plain text of the children, or tooltipContent when given', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <TruncatedText data-testid="t" tabIndex={0}>
        <strong>Bold</strong> and <em>italic</em> {42}
      </TruncatedText>,
    );
    fakeWidths(screen.getByTestId('t'), 500, 100);
    await user.tab();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Bold and italic 42');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(queryTooltip()).toBeNull());
    screen.getByTestId('t').blur();

    rerender(
      <TruncatedText data-testid="t" tabIndex={0} tooltipContent="Custom text">
        <strong>Bold</strong>
      </TruncatedText>,
    );
    fakeWidths(screen.getByTestId('t'), 500, 100);
    await user.tab();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Custom text');
  });

  it('empty children give no tooltip and no crash', async () => {
    const user = userEvent.setup();
    render(
      <TruncatedText data-testid="t" tabIndex={0}>
        {null}
      </TruncatedText>,
    );
    fakeWidths(screen.getByTestId('t'), 500, 100);
    await user.tab();
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(queryTooltip()).toBeNull();
  });
});
