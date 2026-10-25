import AppTrackingTransparency
import GoogleMobileAds
import UIKit
import UserMessagingPlatform
import WebKit

/// Contenitore nativo del gioco su iPhone: mostra la pagina web (stessi file dell'app Android)
/// in una WKWebView e le affianca banner, interstitial e video con premio (AdMob),
/// consenso GDPR (Google UMP), richiesta di tracciamento (ATT), vibrazione, condivisione
/// e l'acquisto "Rimuovi pubblicita'" (StoreKit).
///
/// La pagina parla con l'app tramite l'oggetto JavaScript `window.Android`, lo stesso usato
/// su Android: qui viene ricreato da uno script iniettato all'avvio (vedi `bootstrapScript`).
final class GameViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler,
    BannerViewDelegate, FullScreenContentDelegate {

    private static let background = UIColor(red: 0x6C / 255.0, green: 0x3F / 255.0, blue: 0xD1 / 255.0, alpha: 1)
    private static let saveKey = "mostrilli_v1"
    /// Pagina che porta allo store giusto (App Store o Google Play): e' il link nei risultati condivisi.
    private static let shareURL = "https://cirolomonaco90-cyber.github.io/gattomania/"
    private static let minInterstitialGap: TimeInterval = 90
    private static let retryDelay: TimeInterval = 60

    private var webView: WKWebView!
    private let bannerHolder = UIView()
    private var bannerHeight: NSLayoutConstraint!
    private var banner: BannerView?
    private var interstitial: InterstitialAd?
    private var rewarded: RewardedAd?
    private var rewardEarned = false
    private var lastInterstitialAt = Date.distantPast
    private var adsStarted = false
    private var consentRequested = false
    private let store = StoreManager()

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    // MARK: - Avvio

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = Self.background

        store.onAdsRemovedChanged = { [weak self] removed in
            guard let self = self else { return }
            self.applyAdsState()
            self.js("window.__iosState.adsRemoved=\(removed);window.onAdsRemoved&&window.onAdsRemoved(\(removed));")
        }
        store.onPrice = { [weak self] price in
            let p = JS.string(price)
            self?.js("window.__iosState.price=\(p);window.onRemoveAdsPrice&&window.onRemoveAdsPrice(\(p));")
        }
        store.onMessage = { [weak self] code in
            self?.js("window.onBillingMessage&&window.onBillingMessage(\(JS.string(code)));")
        }

        buildUI()
        store.start()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        if !consentRequested {
            consentRequested = true
            gatherConsent()
        }
    }

    func appDidBecomeActive() {
        // Cattura acquisti fatti mentre l'app era in background o su un altro dispositivo.
        Task { await store.refresh() }
    }

    func appDidEnterBackground() {
        webView?.evaluateJavaScript("window.__iosBackup&&window.__iosBackup()", completionHandler: nil)
    }

    private func buildUI() {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(AssetSchemeHandler(), forURLScheme: AssetSchemeHandler.scheme)
        config.mediaTypesRequiringUserActionForPlayback = []
        config.allowsInlineMediaPlayback = true

        let contentController = WKUserContentController()
        contentController.add(WeakMessageHandler(self), name: "native")
        contentController.addUserScript(
            WKUserScript(source: bootstrapScript(), injectionTime: .atDocumentStart, forMainFrameOnly: true)
        )
        config.userContentController = contentController

        let web = WKWebView(frame: .zero, configuration: config)
        web.isOpaque = false
        web.backgroundColor = Self.background
        web.scrollView.backgroundColor = Self.background
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.allowsLinkPreview = false
        web.navigationDelegate = self
        web.uiDelegate = self
        #if DEBUG
        if #available(iOS 16.4, *) { web.isInspectable = true }
        #endif
        webView = web

        web.translatesAutoresizingMaskIntoConstraints = false
        bannerHolder.translatesAutoresizingMaskIntoConstraints = false
        bannerHolder.backgroundColor = Self.background
        view.addSubview(web)
        view.addSubview(bannerHolder)

        let safe = view.safeAreaLayoutGuide
        bannerHeight = bannerHolder.heightAnchor.constraint(equalToConstant: 0)
        NSLayoutConstraint.activate([
            web.topAnchor.constraint(equalTo: safe.topAnchor),
            web.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            web.bottomAnchor.constraint(equalTo: bannerHolder.topAnchor),
            bannerHolder.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            bannerHolder.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            bannerHolder.bottomAnchor.constraint(equalTo: safe.bottomAnchor),
            bannerHeight
        ])

        web.load(URLRequest(url: AssetSchemeHandler.startURL))
    }

    /// Ricrea in JavaScript lo stesso oggetto `window.Android` dell'app Android, cosi' il gioco non cambia.
    /// Copia anche i progressi in UserDefaults: se iOS svuotasse la memoria della WebView, vengono ripristinati.
    private func bootstrapScript() -> String {
        let backup = UserDefaults.standard.string(forKey: Self.saveKey).map { JS.string($0) } ?? "null"
        let price = JS.string(store.price)
        let shareURL = JS.string(Self.shareURL)
        return """
        (function () {
          var KEY = 'mostrilli_v1';
          var backup = \(backup);
          try { if (backup && !localStorage.getItem(KEY)) localStorage.setItem(KEY, backup); } catch (e) {}
          function post(m) { try { window.webkit.messageHandlers.native.postMessage(m); } catch (e) {} }
          window.__iosState = { adsRemoved: \(store.adsRemoved), price: \(price), privacy: false };
          window.STORE_URL = \(shareURL);
          window.Android = {
            vibrate: function (ms) { post({ cmd: 'vibrate', ms: +ms || 0 }); },
            share: function (text) { post({ cmd: 'share', text: String(text) }); },
            openUrl: function (url) { post({ cmd: 'openUrl', url: String(url) }); },
            showInterstitial: function () { post({ cmd: 'showInterstitial' }); },
            showRewarded: function () { post({ cmd: 'showRewarded' }); },
            adsRemoved: function () { return !!window.__iosState.adsRemoved; },
            removeAdsPrice: function () { return window.__iosState.price || ''; },
            buyRemoveAds: function () { post({ cmd: 'buyRemoveAds' }); },
            restorePurchases: function () { post({ cmd: 'restorePurchases' }); },
            privacyOptionsRequired: function () { return !!window.__iosState.privacy; },
            showPrivacyOptions: function () { post({ cmd: 'showPrivacyOptions' }); }
          };
          function backupNow() {
            try { var v = localStorage.getItem(KEY); if (v) post({ cmd: 'backup', value: v }); } catch (e) {}
          }
          window.__iosBackup = backupNow;
          document.addEventListener('visibilitychange', function () { if (document.hidden) backupNow(); });
          window.addEventListener('pagehide', backupNow);
          setInterval(backupNow, 10000);
        })();
        """
    }

    // MARK: - Messaggi dalla pagina

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let cmd = body["cmd"] as? String else { return }
        switch cmd {
        case "vibrate":
            vibrate(ms: (body["ms"] as? NSNumber)?.intValue ?? 15)
        case "share":
            share(text: body["text"] as? String ?? "")
        case "openUrl":
            if let s = body["url"] as? String, let url = URL(string: s) { openExternal(url) }
        case "showInterstitial":
            showInterstitial()
        case "showRewarded":
            showRewarded()
        case "buyRemoveAds":
            store.buy()
        case "restorePurchases":
            store.restore()
        case "showPrivacyOptions":
            showPrivacyOptions()
        case "backup":
            if let value = body["value"] as? String { UserDefaults.standard.set(value, forKey: Self.saveKey) }
        default:
            break
        }
    }

    private func js(_ code: String) {
        guard let web = webView else { return }
        web.evaluateJavaScript("if(window.__iosState){\(code)}", completionHandler: nil)
    }

    /// Aggiorna la pagina con lo stato attuale (acquisto, prezzo, obbligo di mostrare le opzioni privacy).
    private func pushState() {
        let privacy = ConsentInformation.shared.privacyOptionsRequirementStatus == .required
        var code = "window.__iosState.adsRemoved=\(store.adsRemoved);window.__iosState.privacy=\(privacy);"
        if !store.price.isEmpty {
            code += "window.__iosState.price=\(JS.string(store.price));window.onRemoveAdsPrice&&window.onRemoveAdsPrice(window.__iosState.price);"
        }
        js(code)
    }

    // MARK: - Navigazione

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }
        if url.scheme == AssetSchemeHandler.scheme || url.scheme == "about" {
            decisionHandler(.allow)
        } else {
            openExternal(url)
            decisionHandler(.cancel)
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        pushState()
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.reload()
    }

    /// Link con target="_blank" / window.open: si aprono in Safari.
    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url { openExternal(url) }
        return nil
    }

    private func openExternal(_ url: URL) {
        guard let scheme = url.scheme?.lowercased(), scheme == "https" || scheme == "http" else { return }
        UIApplication.shared.open(url)
    }

    // MARK: - Vibrazione e condivisione

    private func vibrate(ms: Int) {
        let style: UIImpactFeedbackGenerator.FeedbackStyle = ms < 20 ? .light : (ms < 45 ? .medium : .heavy)
        let generator = UIImpactFeedbackGenerator(style: style)
        generator.impactOccurred()
    }

    private func share(text: String) {
        let sheet = UIActivityViewController(activityItems: [text], applicationActivities: nil)
        if let popover = sheet.popoverPresentationController {
            popover.sourceView = view
            popover.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
        }
        present(sheet, animated: true)
    }

    // MARK: - Consenso GDPR + tracciamento + avvio annunci

    private func gatherConsent() {
        let parameters = RequestParameters()
        ConsentInformation.shared.requestConsentInfoUpdate(with: parameters) { [weak self] error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                Task {
                    if error == nil {
                        try? await ConsentForm.loadAndPresentIfRequired(from: self)
                    }
                    self.pushState()
                    self.requestTrackingThenStartAds()
                }
            }
        }
        // Se il consenso era gia' stato raccolto in passato si puo' partire subito.
        if ConsentInformation.shared.canRequestAds { startAds() }
    }

    private func requestTrackingThenStartAds() {
        if store.adsRemoved { return } // senza pubblicita' non serve chiedere il tracciamento
        if ATTrackingManager.trackingAuthorizationStatus == .notDetermined {
            ATTrackingManager.requestTrackingAuthorization { [weak self] _ in
                DispatchQueue.main.async { self?.startAdsIfAllowed() }
            }
        } else {
            startAdsIfAllowed()
        }
    }

    private func startAdsIfAllowed() {
        if ConsentInformation.shared.canRequestAds { startAds() }
    }

    private func startAds() {
        guard !store.adsRemoved, !adsStarted else { return }
        adsStarted = true
        MobileAds.shared.requestConfiguration.maxAdContentRating = .parentalGuidance
        MobileAds.shared.start()
        loadBanner()
        loadInterstitial()
        loadRewarded()
    }

    private func showPrivacyOptions() {
        Task {
            try? await ConsentForm.presentPrivacyOptionsForm(from: self)
            self.pushState()
        }
    }

    /// Chiamata quando l'acquisto "Rimuovi pubblicita'" cambia (acquistato, ripristinato o rimborsato).
    private func applyAdsState() {
        if store.adsRemoved {
            banner?.removeFromSuperview()
            banner = nil
            bannerHeight.constant = 0
            interstitial = nil
            rewarded = nil
        } else if ConsentInformation.shared.canRequestAds {
            if adsStarted {
                loadBanner()
                loadInterstitial()
                loadRewarded()
            } else {
                startAds()
            }
        }
    }

    private func retryLater(_ action: @escaping (GameViewController) -> Void) {
        DispatchQueue.main.asyncAfter(deadline: .now() + Self.retryDelay) { [weak self] in
            guard let self = self, !self.store.adsRemoved else { return }
            action(self)
        }
    }

    private static func adUnit(_ key: String) -> String {
        Bundle.main.object(forInfoDictionaryKey: key) as? String ?? ""
    }

    // MARK: - Banner

    private func loadBanner() {
        guard !store.adsRemoved else { return }
        let width = view.bounds.width > 0 ? view.bounds.width : 320
        let bannerView = BannerView(adSize: largePortraitAnchoredAdaptiveBanner(width: width))
        bannerView.adUnitID = Self.adUnit("MostrilliBannerID")
        bannerView.rootViewController = self
        bannerView.delegate = self
        bannerView.translatesAutoresizingMaskIntoConstraints = false
        banner?.removeFromSuperview()
        banner = bannerView
        bannerHolder.addSubview(bannerView)
        NSLayoutConstraint.activate([
            bannerView.centerXAnchor.constraint(equalTo: bannerHolder.centerXAnchor),
            bannerView.topAnchor.constraint(equalTo: bannerHolder.topAnchor)
        ])
        bannerView.load(Request())
    }

    func bannerViewDidReceiveAd(_ bannerView: BannerView) {
        guard bannerView === banner, !store.adsRemoved else { return }
        bannerHeight.constant = bannerView.adSize.size.height
    }

    func bannerView(_ bannerView: BannerView, didFailToReceiveAdWithError error: Error) {
        guard bannerView === banner else { return }
        retryLater { $0.banner?.load(Request()) }
    }

    // MARK: - Interstitial

    private func loadInterstitial() {
        guard !store.adsRemoved else { return }
        Task {
            do {
                let ad = try await InterstitialAd.load(with: Self.adUnit("MostrilliInterstitialID"), request: Request())
                ad.fullScreenContentDelegate = self
                self.interstitial = self.store.adsRemoved ? nil : ad
            } catch {
                self.interstitial = nil
                self.retryLater { $0.loadInterstitial() }
            }
        }
    }

    private func showInterstitial() {
        guard !store.adsRemoved, let ad = interstitial else { return }
        let now = Date()
        if now.timeIntervalSince(lastInterstitialAt) < Self.minInterstitialGap { return } // mai annunci troppo ravvicinati
        lastInterstitialAt = now
        ad.present(from: self)
    }

    // MARK: - Video con premio

    private func loadRewarded() {
        guard !store.adsRemoved else { return }
        Task {
            do {
                let ad = try await RewardedAd.load(with: Self.adUnit("MostrilliRewardedID"), request: Request())
                ad.fullScreenContentDelegate = self
                self.rewarded = self.store.adsRemoved ? nil : ad
            } catch {
                self.rewarded = nil
                self.retryLater { $0.loadRewarded() }
            }
        }
    }

    private func showRewarded() {
        if store.adsRemoved { // chi ha comprato non deve guardare video: la ricompensa e' immediata
            js("window.onRewardedResult(true);")
            return
        }
        guard let ad = rewarded else {
            js("window.onRewardedResult(false,'notready');")
            loadRewarded()
            return
        }
        rewardEarned = false
        ad.present(from: self) { [weak self] in
            self?.rewardEarned = true
        }
    }

    // MARK: - FullScreenContentDelegate

    func adDidDismissFullScreenContent(_ ad: FullScreenPresentingAd) {
        if let current = rewarded, ad === current {
            rewarded = nil
            js("window.onRewardedResult(\(rewardEarned));")
            loadRewarded()
        } else {
            interstitial = nil
            loadInterstitial()
        }
    }

    func ad(_ ad: FullScreenPresentingAd, didFailToPresentFullScreenContentWithError error: Error) {
        if let current = rewarded, ad === current {
            rewarded = nil
            js("window.onRewardedResult(false,'error');")
            loadRewarded()
        } else {
            interstitial = nil
            loadInterstitial()
        }
    }
}
