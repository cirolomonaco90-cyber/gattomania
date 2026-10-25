# Scheda App Store – Mostrilli (iPhone)

Da copiare in App Store Connect → la tua app → pagina della versione (e *Informazioni app*).
La descrizione completa è la stessa di Google Play: la trovi in `scheda-play-store.md` (sezioni Italiano ed English).

## Italiano (lingua principale)

- **Nome (max 30):** Mostrilli: puzzle di logica
- **Sottotitolo (max 30):** Un mostrillo per riga e zona
- **Testo promozionale (max 170, si cambia senza revisione):** Nuovo Mostro del giorno ogni giorno, uguale per tutti: risolvilo, condividi il tuo tempo e sfida gli amici!
- **Parole chiave (max 100, separate da virgole, senza spazi):** `puzzle,logica,sudoku,rompicapo,mostri,griglia,carino,cervello,gioco,giornaliero,stelle`
- **Descrizione:** quella italiana di `scheda-play-store.md`.

## English

- **Name:** Mostrilli: Logic Puzzle
- **Subtitle:** One monster per row and zone
- **Promotional text:** A new Daily Monster every day, the same for everyone: solve it, share your time and challenge your friends!
- **Keywords:** `puzzle,logic,sudoku,brain,monsters,grid,cute,daily,cozy,relaxing,star,game`
- **Description:** the English one in `scheda-play-store.md`.

Non usare nelle parole chiave nomi di altri giochi o marchi: Apple lo vieta e può rifiutare l'app.

## Immagini

| Cosa | File |
|---|---|
| Screenshot iPhone 6,9" (IT) | `iphone-it/` (1290×2796) |
| Screenshot iPhone 6,9" (EN) | `iphone-en/` (1290×2796) |
| Icona | presa automaticamente dall'app (`ios/Mostrilli/Assets.xcassets`) |

L'app è solo per iPhone (su iPad si apre in modalità iPhone), quindi non servono screenshot per iPad.

## Impostazioni da scegliere

- **Categoria principale:** Giochi → sottocategoria **Rompicapo** (Puzzle); secondaria facoltativa: Giochi da tavolo o Famiglia.
- **Prezzo:** gratuita. **Acquisti in-app:** `remove_ads`, non consumabile (vedi LEGGIMI.md, passo i2).
- **Classificazione per età:** rispondi "no" a violenza, contenuti per adulti, gioco d'azzardo e simili; indica che ci sono **pubblicità** e **acquisti in-app**. Non segnare l'app come destinata ai bambini (le regole su pubblicità e tracciamento per le app per bambini sono molto più rigide).
- **URL dell'informativa privacy:** `https://cirolomonaco90-cyber.github.io/gattomania/privacy.html`
- **URL di supporto:** `https://cirolomonaco90-cyber.github.io/gattomania/` (oppure una pagina con la tua email di contatto).
- **Crittografia:** l'app non usa crittografia propria (già dichiarato nel progetto, non serve fare altro).

## Privacy dell'app (le "etichette" di Apple)

Il codice di Mostrilli non raccoglie dati; li raccoglie l'SDK pubblicitario di Google. Segui la guida di Google per l'App Store ("Prepararsi per i requisiti di privacy dell'App Store", nel centro assistenza AdMob) e controlla che sia aggiornata. Di solito si dichiara:

- **Identificatori → ID dispositivo** (IDFA, solo se l'utente acconsente): pubblicità di terze parti; usato per il tracciamento.
- **Dati di utilizzo → Interazione con il prodotto e Dati pubblicitari:** pubblicità di terze parti, analisi.
- **Diagnostica → Dati sugli arresti anomali e Dati sulle prestazioni:** pubblicità di terze parti, analisi.
- **Posizione → Posizione approssimativa** (ricavata dall'indirizzo IP): pubblicità di terze parti.

Gli acquisti passano dall'App Store di Apple: lo sviluppatore non riceve dati di pagamento.

## Note per la revisione di Apple (campo "Note")

> Mostrilli is a logic puzzle game. The game UI is built with HTML/CSS/JS bundled in the app (it works fully offline). The optional in-app purchase "remove_ads" (non-consumable) removes all ads and makes hints free; it can be restored from Settings → Restore purchases.
