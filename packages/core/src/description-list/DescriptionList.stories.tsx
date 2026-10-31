import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '../button/Button';
import { Text } from '../typography/Text';
import { TruncatedText } from '../truncated-text/TruncatedText';
import { DescriptionList, DescriptionListItem, type DescriptionListLayout } from './DescriptionList';

type ValueKind = 'strings' | 'mixed' | 'with-empties';

const BORDER = '1px dashed var(--color-rop-border)';
const LONG_WORD = 'A'.repeat(200);

function Items({ kind, onOpen }: { kind: ValueKind; onOpen?: () => void }): ReactNode {
  if (kind === 'strings') {
    return (
      <>
        <DescriptionListItem label="Fornitore">Acme S.r.l.</DescriptionListItem>
        <DescriptionListItem label="Numero">INV-2026-0142</DescriptionListItem>
        <DescriptionListItem label="Importo totale">1.240,00 €</DescriptionListItem>
        <DescriptionListItem label="Scadenza">30/11/2026</DescriptionListItem>
      </>
    );
  }
  if (kind === 'with-empties') {
    return (
      <>
        <DescriptionListItem label="Fornitore">Acme S.r.l.</DescriptionListItem>
        <DescriptionListItem label="Note">{null}</DescriptionListItem>
        <DescriptionListItem label="Riferimento">{''}</DescriptionListItem>
        <DescriptionListItem label="Allegati">{0}</DescriptionListItem>
        <DescriptionListItem label="Approvato">{false}</DescriptionListItem>
      </>
    );
  }
  return (
    <>
      <DescriptionListItem label="Fornitore">Acme S.r.l.</DescriptionListItem>
      <DescriptionListItem label="Sito">
        <a href="#acme">acme.example</a>
      </DescriptionListItem>
      <DescriptionListItem label="Codice">
        <Text as="span" mono>
          INV-2026-0142
        </Text>
      </DescriptionListItem>
      <DescriptionListItem label="Azione">
        <Button size="inline" variant="ghost" onClick={onOpen}>
          Apri fattura
        </Button>
      </DescriptionListItem>
      <DescriptionListItem label="Indirizzo">
        <div>
          Via Roma 1<br />
          20100 Milano
          <br />
          Italia
        </div>
      </DescriptionListItem>
      <DescriptionListItem label="Stato">Da approvare</DescriptionListItem>
    </>
  );
}

interface DemoProps {
  layout: DescriptionListLayout;
  /** Width of the demo container in px (the list reacts to it, not to the window). */
  width: number;
  valueKind: ValueKind;
  emptyLabel: string;
  onOpen?: () => void;
}

function Demo({ layout, width, valueKind, emptyLabel, onOpen }: DemoProps) {
  return (
    <div
      data-testid="container"
      style={{ width, maxWidth: '100%', border: BORDER, padding: 8, boxSizing: 'content-box' }}
    >
      <DescriptionList layout={layout} emptyLabel={emptyLabel} data-testid="list">
        <Items kind={valueKind} onOpen={onOpen} />
      </DescriptionList>
    </div>
  );
}

const meta = {
  title: 'Data/DescriptionList',
  component: Demo,
  parameters: { layout: 'padded' },
  argTypes: {
    layout: { control: 'radio', options: ['auto', 'inline', 'stacked'] satisfies DescriptionListLayout[] },
    width: { control: { type: 'range', min: 200, max: 800, step: 10 } },
    valueKind: { control: 'select', options: ['strings', 'mixed', 'with-empties'] satisfies ValueKind[] },
    emptyLabel: { control: 'text' },
    onOpen: { control: false },
  },
  args: { layout: 'auto', width: 600, valueKind: 'mixed', emptyLabel: 'Not specified', onOpen: fn() },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

const rect = (el: Element) => el.getBoundingClientRect();

/**
 * Controls: layout, container width (a range), kind of values, empty label. `onOpen` shows in
 * Actions. The play function narrows the container under the threshold, checks the value drops
 * under its label, widens it again and checks the values are back beside the labels in a single
 * column (a string row and a custom-node row start at the same x).
 */
export const Playground: Story = {
  args: { layout: 'auto', width: 600, valueKind: 'mixed' },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const container = canvas.getByTestId('container');
    const original = container.style.width;
    const dds = Array.from(canvasElement.querySelectorAll('dd'));
    const first = dds[0]!.closest('div')!;
    const dt = first.querySelector('dt')!;
    const dd = first.querySelector('dd')!;

    container.style.width = '250px';
    await waitFor(() => expect(rect(dd).top).toBeGreaterThanOrEqual(rect(dt).bottom - 1));
    await expect(Math.abs(rect(dd).left - rect(dt).left)).toBeLessThanOrEqual(1);

    container.style.width = '600px';
    await waitFor(() => expect(rect(dd).left).toBeGreaterThanOrEqual(rect(dt).right));
    await expect(Math.abs(rect(dd).top - rect(dt).top)).toBeLessThanOrEqual(1);
    const lefts = dds.map((d) => Math.round(rect(d).left));
    await expect(new Set(lefts).size).toBe(1);

    await userEvent.click(canvas.getByRole('button', { name: 'Apri fattura' }));
    await expect(args.onOpen).toHaveBeenCalledTimes(1);
    container.style.width = original;
  },
};

/** Inline with mixed values: every value, string or node, starts on the same vertical line. */
export const InlineMixed: Story = {
  tags: ['visual'],
  args: { layout: 'inline', width: 600, valueKind: 'mixed' },
};

/** Stacked with mixed values: the value sits under its label, flush with it. */
export const StackedMixed: Story = {
  tags: ['visual'],
  args: { layout: 'stacked', width: 280, valueKind: 'mixed' },
};

/** `auto` in two containers side by side in the same viewport: the narrow one stacks, the wide one stays inline. */
export const AutoSideBySide: Story = {
  tags: ['visual'],
  argTypes: { width: { control: false } },
  render: ({ valueKind, emptyLabel }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {[600, 280].map((w) => (
        <div key={w} data-testid={`box-${w}`} style={{ width: w, maxWidth: '100%', border: BORDER, padding: 8 }}>
          <DescriptionList emptyLabel={emptyLabel} data-testid={`list-${w}`}>
            <Items kind={valueKind} />
          </DescriptionList>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    // Each list follows ITS container: inline from 24rem (384px) up, stacked below. The boxes
    // shrink on a narrow viewport (max-width: 100%), so the expectation is read from their width.
    const canvas = within(canvasElement);
    const modes: string[] = [];
    for (const id of ['list-600', 'list-280']) {
      const list = canvas.getByTestId(id);
      const item = list.querySelector('div')!;
      const dt = item.querySelector('dt')!;
      const dd = item.querySelector('dd')!;
      const inline = list.getBoundingClientRect().width >= 384;
      modes.push(inline ? 'inline' : 'stacked');
      if (inline) await expect(rect(dd).left).toBeGreaterThanOrEqual(rect(dt).right);
      else await expect(rect(dd).top).toBeGreaterThanOrEqual(rect(dt).bottom - 1);
    }
    // At a desktop width the two containers really differ; that is the point of the story.
    if (window.innerWidth >= 1000) await expect(modes).toEqual(['inline', 'stacked']);
  },
};

function LongAndEmptyList({ width, layout }: { width: number; layout: DescriptionListLayout }) {
  return (
    <div data-testid={`box-${width}`} style={{ width, maxWidth: '100%', border: BORDER, padding: 8 }}>
      <DescriptionList layout={layout} data-testid={`list-${width}`}>
        <DescriptionListItem label={LONG_WORD}>Valore con etichetta lunghissima</DescriptionListItem>
        <DescriptionListItem label="Stringa senza spazi">{LONG_WORD}</DescriptionListItem>
        <DescriptionListItem label="Troncato">
          <TruncatedText>{'Un testo molto lungo che deve essere troncato con i puntini '.repeat(3)}</TruncatedText>
        </DescriptionListItem>
        <DescriptionListItem label="Vuoto">{null}</DescriptionListItem>
        <DescriptionListItem label="Zero">{0}</DescriptionListItem>
      </DescriptionList>
    </div>
  );
}

/** Long values and long labels wrap in their own column; empty values show the placeholder. */
export const LongAndEmpty: Story = {
  tags: ['visual'],
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      <LongAndEmptyList width={600} layout="inline" />
      <LongAndEmptyList width={280} layout="inline" />
      <LongAndEmptyList width={280} layout="stacked" />
    </div>
  ),
};

/** Right-to-left: in inline the labels sit on the right (start side). */
export const Rtl: Story = {
  tags: ['visual'],
  args: { layout: 'inline', width: 600, valueKind: 'mixed' },
  render: (args) => (
    <div dir="rtl">
      <Demo {...args} />
    </div>
  ),
};

/**
 * Edge cases for the e2e suite (not photographed): inside a flex row without width, in a table
 * cell, one item, zero items.
 */
export const EdgeCases: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: 'grid', gap: 24 }}>
      <div data-testid="flex-row" style={{ display: 'flex', width: 700, border: BORDER }}>
        <DescriptionList data-testid="flex-list">
          <DescriptionListItem label="Fornitore">Acme S.r.l.</DescriptionListItem>
        </DescriptionList>
      </div>
      <table>
        <tbody>
          <tr>
            <td data-testid="cell" style={{ width: 500 }}>
              <DescriptionList data-testid="cell-list">
                <DescriptionListItem label="Fornitore">Acme S.r.l.</DescriptionListItem>
              </DescriptionList>
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ width: 500 }}>
        <DescriptionList data-testid="empty-list" />
      </div>
    </div>
  ),
};
