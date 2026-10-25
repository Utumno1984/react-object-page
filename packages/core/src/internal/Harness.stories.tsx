// Internal fixture for the e2e harness self-tests. Not exported from the package
// (the tsup entry is src/index.ts only) and never to be re-exported from it.
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'Internal/Harness',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Accessible fixture: axe must report no violations. */
export const Valid: Story = {
  render: () => (
    <main>
      <h1>Harness</h1>
      <button type="button">Save</button>
    </main>
  ),
};

/** Deliberately broken fixture: a button with no accessible name. */
export const ButtonWithoutName: Story = {
  render: () => (
    <main>
      <h1>Harness</h1>
      {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
      <button type="button" data-testid="nameless" />
    </main>
  ),
};
