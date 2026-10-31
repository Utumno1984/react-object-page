// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ObjectPage } from './ObjectPage';
import { ObjectPageFooter } from './ObjectPageFooter';
import { ObjectPageHeader } from './ObjectPageHeader';
import { ObjectPageSection } from './ObjectPageSection';

describe('ObjectPage SSR', () => {
  it('renders on the server (no window, no document) with the titles and no errors', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const html = renderToString(
      <ObjectPage>
        <ObjectPageHeader title="Fattura 2026/0142" />
        <ObjectPageSection id="dati" title="Dati generali">
          corpo
        </ObjectPageSection>
      </ObjectPage>,
    );
    expect(html).toContain('<h1');
    expect(html).toContain('Fattura 2026/0142');
    expect(html).toContain('<section');
    expect(html).toContain('Dati generali');
    expect(error).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('renders a footer on the server as nothing (its slot is not there yet), with no errors', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const html = renderToString(
      <ObjectPage>
        <ObjectPageHeader title="Fattura" />
        <ObjectPageFooter visible message="m">
          <button>Salva</button>
        </ObjectPageFooter>
      </ObjectPage>,
    );
    expect(html).not.toContain('Salva');
    expect(error).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
