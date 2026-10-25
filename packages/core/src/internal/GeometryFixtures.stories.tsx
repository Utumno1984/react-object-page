// Internal fixtures for the geometry helpers' self-tests (e2e/geometry.spec.ts): each helper
// has a "healthy" fixture that must pass and a "broken" one that must fail. Not exported from
// the package, and deliberately NOT tagged `visual` (several are broken on purpose).
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'Internal/GeometryFixtures',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const box = { width: 240, height: 120, border: '1px solid #888' } as const;
const tall = { height: 400 } as const;

/** One scroller only: the outer box scrolls, the inner content does not. */
export const SingleScrollerHealthy: Story = {
  render: () => (
    <div data-testid="root" style={{ ...box, overflowY: 'auto' }}>
      <div style={tall}>content</div>
    </div>
  ),
};

/** Double scroll: the outer box AND a nested box both scroll vertically. */
export const DoubleScroll: Story = {
  render: () => (
    <div data-testid="root" style={{ ...box, overflowY: 'auto' }}>
      <div style={{ height: 300 }}>
        <div style={{ height: 80, overflowY: 'auto' }}>
          <div style={tall}>inner</div>
        </div>
      </div>
    </div>
  ),
};

/** No horizontal overflow: everything fits in the container. */
export const NoOverflowHealthy: Story = {
  render: () => (
    <div data-testid="root" style={{ ...box, overflow: 'hidden' }}>
      <div style={{ width: '100%' }}>fits</div>
    </div>
  ),
};

/** The container itself has horizontally scrollable content (scrollWidth > clientWidth). */
export const HorizontalScroll: Story = {
  render: () => (
    <div data-testid="root" style={{ ...box, overflowX: 'auto' }}>
      <div style={{ width: 600 }}>too wide</div>
    </div>
  ),
};

/** The container clips nothing, but a descendant sticks out of its bounding box. */
export const DescendantSticksOut: Story = {
  render: () => (
    <div data-testid="root" style={{ ...box, overflow: 'visible' }}>
      <div style={{ position: 'relative', left: 200, width: 100 }}>sticks out</div>
    </div>
  ),
};

const focusCss = `
  .geo-btn:focus-visible { outline: 3px solid #1a56db; outline-offset: 2px; }
`;

/** The focus ring has room: the wrapper pads the button by more than the ring extent. */
export const FocusRingVisible: Story = {
  render: () => (
    <>
      <style>{focusCss}</style>
      <div data-testid="root" style={{ overflow: 'hidden', padding: 12, width: 160 }}>
        <button type="button" className="geo-btn" data-testid="target">
          Focus me
        </button>
      </div>
    </>
  ),
};

/** The focus ring is cut off by an ancestor with overflow: hidden and no padding. */
export const FocusRingClipped: Story = {
  render: () => (
    <>
      <style>{focusCss}</style>
      <div data-testid="root" style={{ overflow: 'hidden', padding: 0, width: 160 }}>
        <button type="button" className="geo-btn" data-testid="target">
          Focus me
        </button>
      </div>
    </>
  ),
};

/** No focus indicator at all (outline: none): the helper must fail, not pass vacuously. */
export const FocusRingMissing: Story = {
  render: () => (
    <div data-testid="root" style={{ overflow: 'hidden', padding: 12, width: 160 }}>
      <button type="button" data-testid="target" style={{ outline: 'none' }}>
        Focus me
      </button>
    </div>
  ),
};
