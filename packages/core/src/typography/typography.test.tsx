import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Text } from './Text';
import { Title } from './Title';

describe('Text', () => {
  it('renders a <p> with the body token by default', () => {
    render(<Text>hello</Text>);
    const el = screen.getByText('hello');
    expect(el.tagName).toBe('P');
    expect(el).toHaveClass('text-rop-body');
  });

  it.each([
    ['caption', 'text-rop-caption'],
    ['label', 'text-rop-label'],
    ['body', 'text-rop-body'],
  ] as const)('variant %s applies %s and only that size', (variant, cls) => {
    render(<Text variant={variant}>x</Text>);
    const el = screen.getByText('x');
    expect(el).toHaveClass(cls);
    const sizes = Array.from(el.classList).filter((c) => /^text-rop-(caption|body|label)$/.test(c));
    expect(sizes).toEqual([cls]);
  });

  it.each(['p', 'span', 'div', 'label'] as const)('as=%s changes the element', (as) => {
    render(<Text as={as}>x</Text>);
    expect(screen.getByText('x').tagName).toBe(as.toUpperCase());
  });

  it('mono adds the monospace family and keeps the variant size (mono + caption)', () => {
    render(
      <Text mono variant="caption">
        x
      </Text>,
    );
    const el = screen.getByText('x');
    expect(el).toHaveClass('font-rop-mono', 'text-rop-caption');
  });

  it('without mono the family is the sans token, not the monospace one', () => {
    render(<Text>x</Text>);
    expect(screen.getByText('x')).not.toHaveClass('font-rop-mono');
    expect(screen.getByText('x')).toHaveClass('font-rop-sans');
  });

  it('a consumer className in conflict with a default wins (merge via cn)', () => {
    render(<Text className="text-rop-title-lg">x</Text>);
    const el = screen.getByText('x');
    expect(el).toHaveClass('text-rop-title-lg');
    expect(el).not.toHaveClass('text-rop-body');
  });

  it('a consumer font family wins over mono', () => {
    render(
      <Text mono className="font-rop-sans">
        x
      </Text>,
    );
    const el = screen.getByText('x');
    expect(el).toHaveClass('font-rop-sans');
    expect(el).not.toHaveClass('font-rop-mono');
  });

  it('as="label" forwards htmlFor to the DOM', () => {
    render(
      <>
        <Text as="label" htmlFor="f">
          Name
        </Text>
        <input id="f" />
      </>,
    );
    expect(screen.getByText('Name')).toHaveAttribute('for', 'f');
    expect(screen.getByLabelText('Name')).toBe(document.getElementById('f'));
  });

  it('htmlFor is a type error unless as="label"; inline svg gets the line-box margin only inside Text', () => {
    // @ts-expect-error htmlFor only makes sense on a label
    const bad = <Text htmlFor="x">t</Text>;
    expect(bad).toBeTruthy();
    render(<Text>t</Text>);
    expect(screen.getByText('t').className).toContain('[&_svg]:my-[-0.25em]');
  });

  it('forwards the ref and HTML props', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Text ref={ref} data-testid="t" id="i">
        x
      </Text>,
    );
    expect(ref.current).toBe(screen.getByTestId('t'));
    expect(ref.current).toHaveAttribute('id', 'i');
  });
});

describe('Title', () => {
  it.each([1, 2, 3, 4, 5, 6] as const)('level %i renders the matching heading', (level) => {
    render(<Title level={level}>t</Title>);
    expect(screen.getByRole('heading', { level })).toBeInTheDocument();
  });

  it('size is independent from level: h1 + sm is an <h1> with the title-sm scale', () => {
    render(
      <Title level={1} size="sm">
        t
      </Title>,
    );
    const el = screen.getByRole('heading', { level: 1 });
    expect(el).toHaveClass('text-rop-title-sm');
    expect(el).not.toHaveClass('text-rop-title-lg');
  });

  it.each(['sm', 'md', 'lg'] as const)('size=%s applies text-rop-title-%s', (size) => {
    render(
      <Title level={3} size={size}>
        t
      </Title>,
    );
    expect(screen.getByRole('heading')).toHaveClass(`text-rop-title-${size}`);
  });

  it('has a default size per level', () => {
    render(
      <>
        <Title level={1}>a</Title>
        <Title level={2}>b</Title>
        <Title level={6}>c</Title>
      </>,
    );
    expect(screen.getByText('a')).toHaveClass('text-rop-title-lg');
    expect(screen.getByText('b')).toHaveClass('text-rop-title-md');
    expect(screen.getByText('c')).toHaveClass('text-rop-title-sm');
  });

  it('a consumer className in conflict wins (merge via cn)', () => {
    render(
      <Title level={2} className="text-rop-caption">
        t
      </Title>,
    );
    const el = screen.getByRole('heading');
    expect(el).toHaveClass('text-rop-caption');
    expect(el).not.toHaveClass('text-rop-title-md');
  });

  it('an out-of-range level is a type error', () => {
    // @ts-expect-error level must be 1..6
    const bad = <Title level={7}>t</Title>;
    // @ts-expect-error level is required
    const missing = <Title>t</Title>;
    expect(bad).toBeTruthy();
    expect(missing).toBeTruthy();
  });

  it('forwards the ref', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(
      <Title level={2} ref={ref}>
        t
      </Title>,
    );
    expect(ref.current?.tagName).toBe('H2');
  });
});
