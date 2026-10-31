---
name: hook-and-floorplan-architecture
description: Separazione hook/UI per Floorplans (ListReport), Forms (Object Page) e Internal/Harness — usala quando scrivi o rivedi logica di stato complessa (dirty-tracking, dirty-guard, reset asincroni, gestione filtro) in questi componenti.
---

# Hook and floorplan architecture

Applicabile a: `src/list-report/` (Floorplans, es. `ListReportTable`, `ListReportFilterBar`),
`src/object-page/` (Forms, es. `useObjectPageForm`, `useDirtyGuard`), e alle fixture di
`Internal/Harness`.

## Separazione delle responsabilità

Tutta la logica di stato complessa vive nell'hook correlato, mai nel componente di presentazione:

- **Dirty-tracking / dirty-guard** (confronto con la baseline reale, distinzione tra un'eco di
  sistema dopo un'idratazione asincrona e un gesto dell'utente) → `useObjectPageForm`,
  `useDirtyGuard`. Vedi "Object Page / dirty-tracking" in `CLAUDE.md`: un valore che arriva da
  fuori dopo il mount non deve mai marcare il form come sporco.
- **Reset asincroni / idratazione post-mount** → gestiti nell'hook, non in un `useEffect` dentro
  il componente UI.
- **Gestione del filtro** (bozza vs committed, tracking dell'ultima richiesta valida, scarto delle
  risposte superate) → `use-list-report`, non `ListReportFilterBar`/`ListReportTable`.

Un componente di presentazione (il `.tsx` che renderizza markup) riceve stato e callback già
pronti dall'hook; non contiene `useState`/`useReducer` per stato che un consumer esterno deve
poter osservare o guidare dall'esterno.

## TypeScript: tipi estensibili per le interfacce dei form

Il vincolo generico sui valori di un form (`useObjectPageForm<Values>`, `useDirtyGuard` e simili)
deve essere `extends object`, non `Record<string, unknown>`:

```ts
function useObjectPageForm<Values extends object>(/* ... */) {}
```

`Record<string, unknown>` non è assegnabile da un'`interface` dichiarata dal consumer (le
interfacce non hanno un'index signature implicita), quindi rifiuta il caso d'uso più comune — un
consumer che passa la propria `interface FormValues { ... }`. `extends object` accetta sia
un'interfaccia sia un literal type, senza perdere il controllo dei tipi sulle chiavi.
