---
name: storybook-and-wcag-review
description: Checklist WCAG e QA per le story di Storybook (Primitives, Forms, Floorplans) — usala ogni volta che scrivi o modifichi una story, prima di aprire o aggiornare una PR.
---

# Storybook and WCAG review

Applicabile a ogni story in `Primitives/*`, `Forms/*`, `Floorplans/*` (non alle fixture interne di
`Internal/Harness`, che non sono pubblicate e non seguono questa checklist).

## Check WCAG

Ogni volta che lavori su un componente o sulla sua story, verifica:

- **Regioni `aria-live`**: annunci di caricamento, errori e cambi di conteggio dinamici (es. il
  conteggio risultati di `ListReportTable`) sono davvero dentro una regione live, con
  `role`/`aria-live` coerenti con l'urgenza (`polite` per i conteggi, `assertive`/`alert` per gli
  errori bloccanti) — e scattano una sola volta per cambiamento osservabile, non ad ogni render.
- **`:focus-visible`**: ogni elemento interattivo nuovo ha un indicatore di fuoco visibile solo da
  tastiera (mai al click, stessa convenzione `focus-visible:` già in uso su `Button`/`Field`), con
  contrasto non-testuale ≥3:1 (WCAG 1.4.11) contro lo sfondo su cui può effettivamente cadere.
- Nessuna violazione axe sulla story (il harness e2e la verifica già via
  `expectNoA11yViolations`): una story nuova ci deve passare attraverso, non esserne esclusa.

## Test e QA

Prima di aprire o aggiornare una PR:

- `npm run check` verde (lint + tipi + build + unit).
- Suite e2e verde in locale (non solo "dovrebbe passare in CI"); se il componente è ad alto
  raggio d'impatto (overlay, List Report, Object Page), anche la suite visiva.
- Nessun file temporaneo di debug (script ad-hoc, screenshot di prova, branch/PR di test) resta
  nel repo o su GitHub a fine lavoro: pulisci prima di consegnare, coerente con la convenzione già
  in uso per gli smoke test dal vivo in `CLAUDE.md`.
