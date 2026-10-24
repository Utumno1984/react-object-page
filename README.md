# react-object-page

Design system React **open-core**: implementazione headless e indipendente dei floorplan
pubblici di [SAP Fiori](https://experience.sap.com/fiori-design-web/) — **List Report**
(lista con filtri, selezione, azioni bulk) e **Object Page** (editor a sezioni ancorate,
save-bar sticky, dirty-tracking) — per chi vuole quella UX enterprise senza lo stack SAP/UI5.

> Non affiliato con né approvato da SAP. "Fiori" è un marchio SAP, citato qui solo in forma
> descrittiva per indicare i pattern di interazione pubblici implementati.

## Stato

Progetto in fase di avvio. Il piano completo (inventario componenti, segmentazione
Free/Pro, architettura, roadmap) è in [`docs/planning/design-system-spec.md`](docs/planning/design-system-spec.md).

## Modello

- **Free** (`packages/core`, MIT): primitivi di base e versioni semplici dei floorplan.
- **Pro** (`packages/pro`, in arrivo, licenza commerciale): componenti con moat tecnico reale
  (virtualizzazione, dirty-tracking avanzato, Change Summary, dialog con griglia incorporata).

## Sviluppo

Vedi `CLAUDE.md` per la pipeline di sviluppo (pianificatore → sviluppatore → tester →
critico-avversariale) e le regole di dominio.
