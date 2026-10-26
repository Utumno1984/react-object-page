import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { FieldMessage } from './FieldMessage';

const meta = {
  title: 'Primitives/FieldMessage',
  component: FieldMessage,
  parameters: { layout: 'padded' },
  argTypes: {
    tone: { control: 'radio', options: ['help', 'error'] },
    id: { control: 'text' },
    children: { control: 'text' },
  },
  args: { id: 'field-message', tone: 'help', children: 'Almeno 8 caratteri.' },
} satisfies Meta<typeof FieldMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Controls: tone, id, text. The play function wires the message to a control the way the Field
 * ticket will: the message is the control's accessible description, and it is not a live region.
 */
export const Playground: Story = {
  render: (args) => (
    <div style={{ maxWidth: 320 }}>
      <label style={{ display: 'block' }}>
        Password
        <input
          style={{ display: 'block', width: '100%' }}
          aria-describedby={args.children ? args.id : undefined}
          aria-invalid={args.tone === 'error' || undefined}
        />
      </label>
      <FieldMessage {...args} />
    </div>
  ),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('textbox', { name: 'Password' })).toHaveAccessibleDescription(String(args.children));
    await expect(canvas.queryByRole('alert')).toBeNull();
  },
};

/** Help and error side by side: same type size, spacing and height; only colour (and the error icon) differ. */
export const SideBySide: Story = {
  tags: ['visual'],
  render: () => (
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ width: 240 }} data-testid="help-col">
        <input aria-label="Nome" aria-describedby="sb-help" style={{ width: '100%' }} />
        <FieldMessage id="sb-help" tone="help" data-testid="help">
          Come appare sulla fattura.
        </FieldMessage>
      </div>
      <div style={{ width: 240 }} data-testid="error-col">
        <input aria-label="Cognome" aria-describedby="sb-error" aria-invalid style={{ width: '100%' }} />
        <FieldMessage id="sb-error" tone="error" data-testid="error">
          Campo obbligatorio.
        </FieldMessage>
      </div>
      <div style={{ width: 160 }}>
        <FieldMessage id="sb-long" tone="error" data-testid="long">
          Supercalifragilistichespiralidoso non va a capo da solo
        </FieldMessage>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('textbox', { name: 'Nome' })).toHaveAccessibleDescription('Come appare sulla fattura.');
    await expect(canvas.getByRole('textbox', { name: 'Cognome' })).toHaveAccessibleDescription('Campo obbligatorio.');
  },
};
