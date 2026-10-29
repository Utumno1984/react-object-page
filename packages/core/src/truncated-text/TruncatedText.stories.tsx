import { useState, type CSSProperties, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../button/Button';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../dialog/Dialog';
import { TruncatedText } from './TruncatedText';

const LONG =
  'Fornitore Bianchi & Associati S.r.l. - fattura 2026/0142 in attesa di approvazione da parte dell’ufficio acquisti';
const BORDER = '1px dashed #94a3b8';

interface DemoArgs {
  children: string;
  /** Width of the demo container, px. */
  width: number;
  tabIndex: 'nessuno' | '0';
  onFocus: (event: unknown) => void;
}

const meta: Meta<DemoArgs> = {
  title: 'Data/TruncatedText',
  parameters: { layout: 'fullscreen' },
  argTypes: {
    children: { control: 'text' },
    width: { control: { type: 'range', min: 80, max: 600, step: 10 }, description: 'Larghezza del contenitore demo (px)' },
    tabIndex: {
      control: 'select',
      options: ['nessuno', '0'],
      description: 'Senza tabIndex il testo non è un tab stop; con 0 il fuoco da tastiera apre il tooltip.',
    },
    onFocus: { control: false },
  },
  args: { children: LONG, width: 200, tabIndex: 'nessuno', onFocus: fn() },
};

export default meta;
type Story = StoryObj<DemoArgs>;

const PAGE: CSSProperties = { padding: 24, fontFamily: 'system-ui, sans-serif', fontSize: 14, minHeight: 200 };
const NO_CONTROLS = { controls: { disable: true } };

function Page({ children }: { children?: ReactNode }) {
  return <main style={PAGE}>{children}</main>;
}

const tooltip = () => within(document.body).queryByRole('tooltip');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Ends a play that hovered: pointer away, nothing focused, nothing open. */
async function settle(trigger: HTMLElement) {
  await userEvent.unhover(trigger);
  await userEvent.hover(document.body);
  (document.activeElement as HTMLElement | null)?.blur();
  await waitFor(() => expect(tooltip()).toBeNull());
}

/**
 * Controls: `children` (the text), `width` (the demo container), `tabIndex` (`0` makes the text
 * reachable by keyboard); `onFocus` appears in Actions. The play function hovers the text: if it is
 * truncated at the current width the tooltip shows the full text, otherwise nothing opens. Then it
 * widens the container to 900px and hovers again: the same element must now open nothing.
 */
export const Playground: Story = {
  render: ({ children, width, tabIndex, onFocus }) => (
    <Page>
      <div data-testid="container" style={{ width, border: BORDER }}>
        <TruncatedText data-testid="text" tabIndex={tabIndex === '0' ? 0 : undefined} onFocus={onFocus}>
          {children}
        </TruncatedText>
      </div>
    </Page>
  ),
  play: async ({ args, canvasElement }) => {
    const text = within(canvasElement).getByTestId('text');
    const container = within(canvasElement).getByTestId('container');
    await expect(tooltip()).toBeNull();
    const truncated = text.scrollWidth > text.clientWidth;
    await userEvent.hover(text);
    if (truncated) {
      await expect(await within(document.body).findByRole('tooltip', undefined, { timeout: 3000 })).toHaveTextContent(
        args.children,
      );
    } else {
      await wait(800);
      await expect(tooltip()).toBeNull();
    }
    await settle(text);

    const original = container.style.width;
    container.style.width = '900px';
    await expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth);
    await userEvent.hover(text);
    await wait(800);
    await expect(tooltip()).toBeNull();
    await settle(text);
    container.style.width = original;
  },
};

/** A block in a 200px container: ellipsis, never wider than the container. */
export const Block: Story = {
  tags: ['visual'],
  parameters: NO_CONTROLS,
  render: () => (
    <Page>
      <div data-testid="container" style={{ width: 200, border: BORDER }}>
        <TruncatedText data-testid="text">{LONG}</TruncatedText>
      </div>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    const text = within(canvasElement).getByTestId('text');
    await expect(text.getBoundingClientRect().width).toBeLessThanOrEqual(200);
    await expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
  },
};

/** A flex item next to a button: the text shrinks (`min-width: 0`) instead of pushing the row wider. */
export const InFlexRow: Story = {
  tags: ['visual'],
  parameters: NO_CONTROLS,
  render: () => (
    <Page>
      <div data-testid="container" style={{ display: 'flex', alignItems: 'center', gap: 8, width: 240, border: BORDER }}>
        <TruncatedText data-testid="text">{LONG}</TruncatedText>
        <Button size="sm">Apri</Button>
      </div>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    const container = within(canvasElement).getByTestId('container');
    await expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth);
    const text = within(canvasElement).getByTestId('text');
    await expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
  },
};

/** Short text in a wide container: no ellipsis, and no tooltip on hover. */
export const NotTruncated: Story = {
  tags: ['visual'],
  parameters: NO_CONTROLS,
  render: () => (
    <Page>
      <div data-testid="container" style={{ width: 320, border: BORDER }}>
        <TruncatedText data-testid="text">Fattura 2026/0142</TruncatedText>
      </div>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    const text = within(canvasElement).getByTestId('text');
    await expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth);
    await userEvent.hover(text);
    await wait(800);
    await expect(tooltip()).toBeNull();
    await settle(text);
  },
};

/** A cell of a `table-layout: fixed` table: the column keeps its width and the text truncates. */
export const InTableCell: Story = {
  tags: ['visual'],
  parameters: NO_CONTROLS,
  render: () => (
    <Page>
      <table data-testid="table" style={{ tableLayout: 'fixed', width: 320, borderCollapse: 'collapse' }}>
        <colgroup>
          <col style={{ width: 70 }} />
          <col />
          <col style={{ width: 80 }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={{ border: BORDER }}>0142</td>
            <td style={{ border: BORDER }}>
              <TruncatedText data-testid="text">{LONG}</TruncatedText>
            </td>
            <td style={{ border: BORDER }}>€ 1.240</td>
          </tr>
        </tbody>
      </table>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    const table = within(canvasElement).getByTestId('table');
    await expect(table.getBoundingClientRect().width).toBeLessThanOrEqual(320);
    const text = within(canvasElement).getByTestId('text');
    await expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
  },
};

/** `dir="rtl"`: the ellipsis goes on the left, where the text ends. */
export const Rtl: Story = {
  parameters: NO_CONTROLS,
  render: () => (
    <Page>
      <div dir="rtl" data-testid="container" style={{ width: 160, border: BORDER }}>
        <TruncatedText data-testid="text">{'هذا نص طويل جدا يتجاوز عرض الحاوية بكثير ويجب أن يقتطع'}</TruncatedText>
      </div>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    const text = within(canvasElement).getByTestId('text');
    await expect(getComputedStyle(text).direction).toBe('rtl');
    await expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
  },
};

/**
 * Non-string children: the tooltip uses `tooltipContent` when given, otherwise the plain text of the
 * children. Empty children render nothing to show: no tooltip, no crash.
 */
export const RichChildren: Story = {
  parameters: NO_CONTROLS,
  render: () => (
    <Page>
      <div style={{ width: 160, border: BORDER, display: 'grid', gap: 8 }}>
        <TruncatedText data-testid="plain">
          <strong>Fornitore</strong> Bianchi &amp; <em>Associati</em> S.r.l., sede legale di Milano
        </TruncatedText>
        <TruncatedText data-testid="custom" tooltipContent="Descrizione personalizzata">
          <strong>Fornitore</strong> Bianchi &amp; Associati S.r.l., sede legale di Milano
        </TruncatedText>
        <TruncatedText data-testid="empty" style={{ minHeight: 20 }}>
          {null}
        </TruncatedText>
      </div>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.hover(canvas.getByTestId('plain'));
    await expect(await within(document.body).findByRole('tooltip', undefined, { timeout: 3000 })).toHaveTextContent(
      'Fornitore Bianchi & Associati S.r.l., sede legale di Milano',
    );
    await settle(canvas.getByTestId('plain'));
    await userEvent.hover(canvas.getByTestId('custom'));
    await expect(await within(document.body).findByRole('tooltip', undefined, { timeout: 3000 })).toHaveTextContent(
      'Descrizione personalizzata',
    );
    await settle(canvas.getByTestId('custom'));
    await userEvent.hover(canvas.getByTestId('empty'));
    await wait(800);
    await expect(tooltip()).toBeNull();
    await settle(canvas.getByTestId('empty'));
  },
};

/**
 * The text takes the focus at mount (programmatically, from the ref callback: React's `autoFocus`
 * only focuses form controls): nothing opens until the user acts.
 */
export const AutoFocus: Story = {
  parameters: NO_CONTROLS,
  render: () => (
    <Page>
      <div style={{ width: 160, border: BORDER }}>
        <TruncatedText data-testid="text" tabIndex={0} ref={(el) => el?.focus()}>
          {LONG}
        </TruncatedText>
      </div>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    const text = within(canvasElement).getByTestId('text');
    await expect(text).toHaveFocus();
    await wait(800);
    await expect(tooltip()).toBeNull();
  },
};

/** A Dialog that focuses a truncated text (its first tab stop) when it opens: no tooltip either. */
export const InsideDialog: Story = {
  parameters: NO_CONTROLS,
  render: () => (
    <Page>
      <Dialog>
        <DialogTrigger asChild>
          <Button>Apri</Button>
        </DialogTrigger>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Dettaglio</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div style={{ width: 160, border: BORDER }}>
              <TruncatedText data-testid="text" tabIndex={0}>
                {LONG}
              </TruncatedText>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Apri' }));
    const text = await within(document.body).findByTestId('text');
    await waitFor(() => expect(text).toHaveFocus());
    await wait(800);
    await expect(tooltip()).toBeNull();
  },
};

/**
 * The text changes while the tooltip is open: Tab to the text (the tooltip opens), then press `-`
 * (short text) and the tooltip closes because there is nothing left to reveal; `+` restores it.
 */
export const ChangesWhileOpen: Story = {
  parameters: NO_CONTROLS,
  render: () => {
    function Host() {
      const [short, setShort] = useState(false);
      return (
        <Page>
          <div style={{ width: 160, border: BORDER }}>
            <TruncatedText
              data-testid="text"
              tabIndex={0}
              onKeyDown={(event) => (event.key === '+' || event.key === '-') && setShort(event.key === '-')}
            >
              {short ? 'Breve' : LONG}
            </TruncatedText>
          </div>
        </Page>
      );
    }
    return <Host />;
  },
  play: async ({ canvasElement }) => {
    const text = within(canvasElement).getByTestId('text');
    await userEvent.tab();
    await expect(text).toHaveFocus();
    await expect(await within(document.body).findByRole('tooltip')).toHaveTextContent('Fornitore Bianchi');
    await userEvent.keyboard('-');
    await waitFor(() => expect(tooltip()).toBeNull());
    await userEvent.keyboard('+');
    await expect(text).toHaveTextContent('Fornitore Bianchi');
    await settle(text);
  },
};
