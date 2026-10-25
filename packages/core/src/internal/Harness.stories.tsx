// Internal fixture for the e2e harness self-tests. Not exported from the package
// (the tsup entry is src/index.ts only) and never to be re-exported from it.
import { createPortal } from 'react-dom';
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'Internal/Harness',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Accessible bare component (no landmark/heading): axe must report no violations. */
export const Valid: Story = {
  render: () => <button type="button">Save</button>,
};

/** Deliberately broken fixture: a button with no accessible name. */
export const ButtonWithoutName: Story = {
  render: () => <button type="button" data-testid="nameless" />,
};

/** Deliberately broken fixture: the nameless button lives in a portal on document.body. */
export const PortalButtonWithoutName: Story = {
  render: () => (
    <>
      <button type="button">Open</button>
      {createPortal(<button type="button" data-testid="portal-nameless" />, document.body)}
    </>
  ),
};

/** Fixture: renders nothing, gotoStory must fail explicitly. */
export const RendersNothing: Story = {
  render: () => <></>,
};

/** Fixture: throws while rendering, gotoStory must fail explicitly. */
export const ThrowsOnRender: Story = {
  render: () => {
    throw new Error('harness-boom');
  },
};
