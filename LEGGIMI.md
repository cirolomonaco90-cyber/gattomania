# Mostrilli – guida completa

Gioco di logica per Android e iPhone (la parte iPhone è nella sezione "iPhone (iOS)" più sotto): un mostriciattolo per riga, colonna e zona colorata, senza che si tocchino. Nove creature originali, 300 livelli (la griglia cresce da 5×5 a 9×9 nei primi 20), "Mostro del giorno" uguale per tutti, condivisione stile Wordle, pubblicità AdMob (banner, schermo intero a intervalli, video con premio per gli aiuti), acquisto una tantum "Rimuovi pubblicità" e consenso GDPR.

## Cosa è stato verificato e cosa no

- **Verificato**: tutti i 300 livelli e tutti gli 800 "mostri del giorno" pre-generati hanno una sola soluzione (controllo automatico con `tools/verify-puzzles.js`, che gira anche a ogni build su GitHub); il generatore è deterministico, quindi lo stesso giorno dà lo stesso puzzle su ogni telefono. Inoltre l'intero gioco è stato provato in un browser Chromium che simula un telefono: tocchi, errori, aiuti, vittoria, condivisione, mostro del giorno, video di prova.
- **Compilato su GitHub**: la parte Android (Kotlin, AdMob, consenso GDPR) compila correttamente, sia in versione di prova (APK) sia in versione di produzione minificata (AAB, senza firma).
- **Acquisto "Rimuovi pubblicità"**: la logica dell'interfaccia è provata in simulazione nel browser; la parte Android (Billing) può essere verificata davvero solo con l'app installata da Google Play (vedi Passo 6).
- **Non ancora provato su un telefono vero**: nessuno ha ancora aperto l'APK su un dispositivo. Installalo e dimmi se vedi qualcosa che non va (annunci di test, vibrazione, condivisione, tasto indietro): è il primo collaudo da fare.

## Passo 1 – Compilare su GitHub (nessuna installazione sul tuo PC)

1. Apri il repository su GitHub → scheda **Actions**.
2. Il workflow **Compila Mostrilli** parte da solo a ogni modifica (o con *Run workflow*).
3. A fine build, nella pagina del run trovi gli **Artifacts**:
   - `mostrilli-apk-di-prova`: un APK da installare sul tuo telefono per giocarci subito (dovrai consentire l'installazione da fonti sconosciute). Usa sempre annunci di test.
   - `mostrilli-per-google-play`: il pacchetto `.aab` firmato da caricare su Google Play (compare dopo il Passo 2).

## Passo 2 – Chiave di firma (una volta sola)

1. Actions → **Genera chiave di firma (una volta sola)** → *Run workflow*.
2. Scarica l'artefatto `chiave-di-firma-RISERVATO` (vale 3 giorni). Dentro trovi `upload.jks`, le password e il testo in base64.
3. **Conserva `upload.jks` e le password in un posto sicuro** (password manager e un backup). Senza non potrai aggiornare l'app.
4. Settings → Secrets and variables → Actions → *New repository secret*, crea:
   `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS` (= `upload`), `KEY_PASSWORD`.
5. Rilancia **Compila Mostrilli**: ora produce anche il `.aab` firmato.

## Passo 3 – AdMob (per guadagnare davvero)

1. Crea l'account su admob.google.com (ti serve anche un profilo di pagamento per incassare).
2. *App → Aggiungi app* → Android (puoi indicare "non ancora pubblicata" e collegarla allo store dopo) con nome Mostrilli.
3. Crea 3 **unità pubblicitarie**: *Banner*, *Interstitial* (a schermo intero) e *Con premio* (ricompensa: 3 aiuti).
4. Come segreti del repository crea: `ADMOB_APP_ID` (finisce con `~numero`), `ADMOB_BANNER_ID`, `ADMOB_INTERSTITIAL_ID`, `ADMOB_REWARDED_ID` (finiscono con `/numero`).
5. Nel modulo **Privacy e messaggistica** di AdMob crea e pubblica un messaggio di consenso GDPR (UE/UK): è quello che l'app mostra al primo avvio.

**Importante:** finché non imposti questi segreti l'app usa ID di test e **non guadagna nulla**. Non cliccare mai sui tuoi annunci veri (AdMob può sospenderti): per provare usa l'APK di prova, che usa sempre annunci di test.

## Passo 4 – Informativa privacy (obbligatoria)

1. Apri `docs/privacy.html`, sostituisci i segnaposto `[INSERISCI ...]` con nome e email di contatto.
2. Pubblicala: nel repository, Settings → Pages → Source *Deploy from a branch*, cartella `/docs`. Con un account GitHub gratuito serve che il repository sia **pubblico** (non contiene segreti: gli ID AdMob e la chiave sono nei Secrets).
3. L'indirizzo sarà `https://cirolomonaco90-cyber.github.io/gattomania/privacy.html` (è già quello usato nell'app; se cambi nome al repository aggiornalo in `app/src/main/assets/app.js`).

## Passo 5 – Google Play Console

1. Crea l'account sviluppatore su play.google.com/console (25 $ una tantum, verifica dell'identità).
2. *Crea app* → Gioco, gratuita. Testi e impostazioni da scegliere: `store/scheda-play-store.md`. Immagini: cartella `store/`.
3. Carica il `.aab` in un **test chiuso**. Per gli account personali nuovi Google richiede almeno **12 tester iscritti per 14 giorni consecutivi** prima di poter chiedere l'accesso alla produzione (requisito verificato a ottobre 2026). Per gli account di organizzazione la regola di norma non si applica: verifica nella Play Console quale vale per te.
4. L'app punta ad Android 16 (API 36), come richiesto da Google per i nuovi caricamenti dal 31 agosto 2026.
5. Accetta *Play App Signing* quando richiesto.

## Passo 6 – Acquisto "Rimuovi pubblicità"

L'app contiene già il pulsante e il codice (Google Play Billing). Manca solo creare il prodotto nella Play Console:

1. Play Console → la tua app → **Monetizza con Play → Prodotti → Prodotti una tantum → Crea prodotto**.
2. **ID prodotto: `remove_ads`** (esattamente così, minuscolo: è scritto nel codice). Nome per esempio "Rimuovi pubblicità", descrizione "Elimina per sempre tutti gli annunci e rendi gratuiti gli aiuti".
3. Imposta il **prezzo** (per esempio 2,99 €) e **attiva** il prodotto. Di solito serve prima aver caricato almeno un pacchetto (anche in test interno) e aver impostato un profilo di pagamento.
4. Per provare senza pagare: Impostazioni → **Test delle licenze** → aggiungi il tuo indirizzo Gmail come tester di licenza. I suoi acquisti sono finti e gratuiti.
5. **Si prova solo con l'app installata da Google Play** (test interno o chiuso, dal link per i tester). Con l'APK di prova scaricato da GitHub la fatturazione non è disponibile e il pulsante di acquisto non compare: è normale.
6. Dopo l'acquisto spariscono banner, schermi interi e video; gli aiuti diventano gratis. "Ripristina acquisti" è nelle Impostazioni dell'app (utile se cambi telefono). Se Google rimborsa l'acquisto, gli annunci tornano alla prossima apertura.

## iPhone (iOS)

La versione iPhone usa **lo stesso gioco** (`app/src/main/assets`): ogni modifica a livelli, grafica o testi vale per entrambe. Il contenitore nativo è in `ios/` (Swift): WebView, AdMob, consenso GDPR, richiesta di tracciamento (ATT), vibrazione, condivisione e acquisto "Rimuovi pubblicità" con StoreKit.

**Stato**: il codice iOS **compila** su GitHub (workflow *Compila Mostrilli iOS*, su un Mac di GitHub). Non è ancora stato aperto su un iPhone vero; la firma e il caricamento su TestFlight si potranno verificare solo quando avrai impostato i segreti Apple qui sotto.

### i1 – Account Apple Developer

1. Iscriviti al programma su developer.apple.com/programs (a pagamento, ogni anno: controlla il prezzo aggiornato). Serve un ID Apple con autenticazione a due fattori.
2. Annota il **Team ID** (10 caratteri): developer.apple.com → Account → Membership details.
3. In developer.apple.com → Certificates, Identifiers & Profiles → **Identifiers** → `+` → App IDs → App: descrizione "Mostrilli", Bundle ID *Explicit* **`it.mostrilli.app`**. Lascia le capacità predefinite (gli acquisti in-app sono già inclusi).

### i2 – App in App Store Connect

1. appstoreconnect.apple.com → App → `+` → **Nuova app**: piattaforma iOS, nome "Mostrilli: puzzle di logica" (se è già preso, aggiungi una parola), lingua principale Italiano, Bundle ID `it.mostrilli.app`, SKU `mostrilli`.
2. Testi, parole chiave e impostazioni: `store/scheda-app-store.md`. Screenshot iPhone 6,9": `store/iphone-it/` e `store/iphone-en/` (1290×2796). Icona: viene presa dall'app.
3. Per l'acquisto: la tua app → **Monetizzazione → Acquisti in-app** → `+` → tipo **Non consumabile**, ID prodotto **`remove_ads`** (esatto), prezzo (es. 2,99 €), nome e descrizione in italiano e inglese, uno screenshot qualsiasi del gioco per la revisione. Il primo acquisto in-app va inviato in revisione **insieme** alla prima versione dell'app.
4. Prima di poter vendere: Accordi, imposte e banking → accetta l'accordo **App a pagamento** e inserisci i dati bancari e fiscali.

### i3 – Chiave API per GitHub (firma e caricamento automatici)

1. App Store Connect → Utenti e accessi → **Integrazioni → App Store Connect API** → *Genera chiave API* con accesso **Admin** (serve per creare da sola certificato e profilo di distribuzione).
2. Scarica il file `AuthKey_XXXX.p8` (si può scaricare **una sola volta**: conservalo) e annota **Key ID** e **Issuer ID**.
3. Nel repository GitHub → Settings → Secrets and variables → Actions, crea:
   `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (incolla tutto il contenuto del file .p8, righe BEGIN/END comprese), `APPLE_TEAM_ID`.
4. Actions → **Compila Mostrilli iOS** → *Run workflow*. Se va tutto bene, dopo 10-30 minuti la build compare in App Store Connect → TestFlight.

### i4 – AdMob per iPhone

In AdMob aggiungi una **seconda app** (piattaforma iOS) e crea di nuovo le 3 unità (banner, interstitial, con premio). Poi crea i segreti `ADMOB_IOS_APP_ID`, `ADMOB_IOS_BANNER_ID`, `ADMOB_IOS_INTERSTITIAL_ID`, `ADMOB_IOS_REWARDED_ID`. Senza questi l'app iPhone usa annunci di test. Nel messaggio di consenso di AdMob (Privacy e messaggistica) puoi aggiungere anche il messaggio esplicativo per l'**IDFA**, che compare prima della richiesta di tracciamento di Apple.

### i5 – Provare e pubblicare

1. Installa **TestFlight** sull'iPhone. In App Store Connect → TestFlight → *Test interni* aggiungi te stesso: ricevi l'invito e installi l'app.
2. L'acquisto in TestFlight è finto e gratuito (ambiente di prova di Apple): puoi provarlo quante volte vuoi.
3. Quando sei soddisfatto: nella pagina della versione scegli la build, compila *Privacy dell'app* (vedi la scheda), allega l'acquisto `remove_ads` e invia in revisione. Su Apple non c'è il test obbligatorio con 12 tester, ma la revisione può chiedere modifiche.
4. Quando l'app è pubblicata, incolla il suo link in `docs/index.html` (variabile `APP_STORE_URL`): è la pagina che si apre dai risultati condivisi dall'iPhone e porta chi la apre allo store giusto.

## Aggiornamenti futuri

Ogni build incrementa da sola il `versionCode` (numero del run). Per cambiare il gioco modifica i file in `app/src/main/assets/` (HTML/CSS/JS), fai commit e scarica il nuovo `.aab`.

- Rigenerare i livelli: `node tools/build-puzzles.js 300 800` (livelli, giorni del mostro del giorno).
- Rifare le immagini dello store (Google Play e App Store): `python3 tools/make-store-assets.py`.
- Su iPhone il numero di build cresce da solo (numero del run); per una nuova versione visibile agli utenti cambia `MARKETING_VERSION` in `ios/project.yml` (es. "1.1").
- Collaudo del motore: `node tools/test-engine.js`.
- Mostro del giorno: gli 800 puzzle coprono fino a dicembre 2028; dopo, l'app li genera sul momento (può servire qualche secondo). Prima di quella data conviene rigenerarli e pubblicare un aggiornamento.

## Idee per farla diventare virale

- La **condivisione** produce la mappa colorata di ogni sfida senza spoiler: pubblicala nei social con il link allo store.
- Registra brevi video del gioco (il mostro che balla alla vittoria è fatto per questo) per Reel, TikTok e Shorts.
- Il **mostro del giorno** e la serie di giorni consecutivi sono il motivo per riaprire l'app ogni giorno.

## Non ancora incluso

Classifiche, notifiche giornaliere e salvataggio su cloud. Il progetto è pronto per aggiungerli.
