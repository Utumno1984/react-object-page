---
name: test-harness-spec
description: Come scrivere una fixture in Internal/Harness su Storybook per validare stati asincroni e contesti controllati di un hook — usala quando aggiungi o rivedi una fixture in packages/core/src/internal/*.stories.tsx.
---

# Test harness: fixture in Internal/*

Riferimento: `UseObjectPageFormFixture.stories.tsx`, `UseListReportFixture.stories.tsx`,
`UseComboboxFixture.stories.tsx`, `ReturnFocus.stories.tsx`, `OverlayLayers.stories.tsx`,
`GeometryFixtures.stories.tsx`, `Harness.stories.tsx` sono i precedenti da seguire.

## Cosa sono (e cosa non sono)

Una fixture `Internal/*` è un componente minimale, **senza styling di produzione**, che monta un
hook (mai un intero componente pubblico) ed espone il suo stato interno via `data-testid`, per
poterlo leggere da un test e2e senza dipendere dal markup di un componente reale (che può cambiare
per ragioni visive non legate all'hook). Non è mai esportata dal pacchetto (`src/index.ts` non la
tocca) e non va mai ri-esportata da lì.

## Stati asincroni

Simula il ritardo con `setTimeout`/una Promise esplicita, mai un valore già pronto al mount: il
bug più comune nei consumer di un hook di stato (dirty-tracking, ricerca, filtro) è distinguere
un valore che arriva **dopo** il mount da uno presente fin dall'inizio. Esempio dal pattern già in
uso (`UseObjectPageFormFixture`): un bottone "Carica dati" che dopo 500ms chiama `reset(valore)`,
così un test può verificare che il form NON diventi sporco quando l'idratazione arriva da un gesto
esplicito, e CHE lo diventi quando l'utente modifica un campo dopo.

## Contesti controllati

Esponi sia il percorso felice sia quello di errore come azioni separate (es. due bottoni "Salva
(ok)" / "Salva (errore)" che chiamano la stessa funzione del hook con un risultato diverso), non
solo il caso che funziona. Lo stato interno che un test deve poter leggere (dirty, saving, errore,
conteggio, ecc.) è un `data-testid` dedicato con il valore reso in testo semplice (`sì`/`no`,
messaggio di errore) — non dedurlo da una classe CSS o da un attributo ARIA pensato per
l'accessibilità, che può cambiare indipendentemente dallo stato che il test vuole verificare.

## Cosa verificare da un test contro questa fixture

- Lo stato cambia nell'ordine giusto (es. `saving: true` compare prima del risultato, sparisce
  dopo, indipendentemente da successo o errore).
- Un'azione ripetuta mentre un'operazione è già in corso (secondo click su "Salva" prima che la
  prima finisca) ha il comportamento dichiarato dal ticket (ignorata, in coda, ecc.), non quello
  che capita per come React ha schedulato gli effetti.
- Smontare il componente a metà di un'operazione asincrona non lascia un `setState` su un
  componente smontato (nessun warning React in console) né un listener/timer orfano.
