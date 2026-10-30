---
name: dnd-virtual-table
description: Sincronizzazione indici dataset/DOM per liste virtualizzate con drag-and-drop — usala quando progetti o implementi un componente che combina virtualizzazione e riordino (nessuno ancora in react-object-page; prerequisito prima del primo ticket che li introduce, vedi design-system-spec.md §6 Pro "tabelle avanzate").
---

# Drag-and-drop su liste virtualizzate

Non esiste ancora un componente così in `packages/core` (nessun `ListReportTable` attuale è
virtualizzato o riordinabile). Questa skill fissa i vincoli **prima** che il primo ticket li
introduca, perché sono facili da sbagliare al primo giro e costosi da correggere dopo.

## Il problema di fondo

Una lista virtualizzata renderizza solo le righe visibili e **ricicla** i nodi DOM quando si
scorre: lo stesso elemento DOM rappresenta una riga di dataset diversa in momenti diversi. Il
drag-and-drop introduce un secondo asse di cambiamento (l'ordine logico del dataset cambia durante
il drag, prima che il commit finale avvenga). I due assi combinati rompono qualunque assunzione
che leghi "indice visivo nel DOM" a "indice nel dataset".

## Regole

- **Identità stabile, mai indice**: ogni riga trascinabile porta una chiave stabile (id del
  dato), non l'indice di render. Un handler di drag che cattura l'indice al mount e lo riusa dopo
  uno scroll/riciclo del nodo sposta la riga sbagliata — bug silenzioso, non un errore a runtime.
- **Indice visivo ≠ indice dataset durante il drag**: il punto di drop si calcola dalla posizione
  reale nel viewport (coordinate, non indice renderizzato), convertita nell'indice del dataset
  *corrente* (che può differere dall'indice al momento del `dragstart` se il dataset è cambiato
  sotto il drag, es. un fetch in corso). Non assumere mai che l'ordine di render coincida con
  l'ordine finale.
- **Nessuna closure stale sul nodo riciclato**: un handler di drag/drop registrato per riga non
  deve catturare `props`/stato per valore in una closure che sopravvive al riciclo del nodo
  virtualizzato — usare un ref aggiornato ad ogni render o passare l'id esplicitamente
  nell'evento, mai leggere una variabile catturata al mount.
- **Scroll durante il drag**: se il drag vicino al bordo del viewport autoscrolla, il calcolo del
  drop target deve ricampionare la posizione ad ogni frame di scroll, non una volta sola
  all'inizio del drag.
- **Test e2e**: non basta un `dragstart`/`dragover`/`drop` sintetico su un indice fisso — il test
  deve scorrere la lista a metà drag e verificare che il drop finisca sulla riga di dataset
  corretta (per id, non per posizione), riusando gli helper geometrici già in `e2e/helpers/
  geometry.ts` (`expectSingleScroller`, `expectNoHorizontalOverflow`) per la parte di layout.
