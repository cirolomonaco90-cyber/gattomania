package it.mostrilli.app

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.RequestConfiguration
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Contenitore nativo del gioco: mostra la pagina web in assets/ dentro una WebView
 * e le affianca banner, interstitial e video con premio (AdMob), il consenso GDPR
 * (Google UMP), vibrazione e condivisione.
 */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private lateinit var bannerHolder: FrameLayout
    private var banner: AdView? = null
    private var interstitial: InterstitialAd? = null
    private var rewarded: RewardedAd? = null
    private var lastInterstitialAt = 0L
    private val adsStarted = AtomicBoolean(false)
    private val main = Handler(Looper.getMainLooper())
    private lateinit var consentInfo: ConsentInformation

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(BG),
            navigationBarStyle = SystemBarStyle.dark(BG)
        )
        super.onCreate(savedInstanceState)
        consentInfo = UserMessagingPlatform.getConsentInformation(this)
        buildUi()
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // Chiede alla pagina se sa gestire "indietro" (chiudere un popup o tornare alla home).
                webView.evaluateJavascript("(window.handleBack ? window.handleBack() : false)") { result ->
                    if (result != "true") finish()
                }
            }
        })
        setupConsentAndAds()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun buildUi() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(BG)
        }
        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            setBackgroundColor(BG)
            overScrollMode = WebView.OVER_SCROLL_NEVER
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.setSupportZoom(false)
            settings.textZoom = 100
            settings.mediaPlaybackRequiresUserGesture = false
            WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
            addJavascriptInterface(Bridge(), "Android")
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                    loader.shouldInterceptRequest(request.url)

                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    if (request.url.host == ASSET_HOST) return false
                    openExternal(request.url)
                    return true
                }

                override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                    recreate() // il processo web e' morto: ricarica tutto invece di chiudere l'app
                    return true
                }
            }
        }
        root.addView(webView, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))

        bannerHolder = FrameLayout(this)
        root.addView(
            bannerHolder,
            LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        )
        setContentView(root)

        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
            v.setPadding(bars.left, bars.top, bars.right, maxOf(bars.bottom, ime.bottom))
            insets
        }
        webView.loadUrl("https://$ASSET_HOST/assets/index.html")
    }

    /* ------------------------------------------------------------ consenso GDPR + avvio annunci */

    private fun setupConsentAndAds() {
        val params = ConsentRequestParameters.Builder().build()
        consentInfo.requestConsentInfoUpdate(
            this, params,
            {
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(this) { _ ->
                    if (consentInfo.canRequestAds()) startAds()
                }
            },
            { _ -> if (consentInfo.canRequestAds()) startAds() }
        )
        // Se il consenso era gia' stato raccolto in passato si puo' partire subito.
        if (consentInfo.canRequestAds()) startAds()
    }

    private fun startAds() {
        if (!adsStarted.compareAndSet(false, true)) return
        MobileAds.setRequestConfiguration(
            RequestConfiguration.Builder()
                .setMaxAdContentRating(RequestConfiguration.MAX_AD_CONTENT_RATING_PG)
                .build()
        )
        Thread {
            MobileAds.initialize(this) {
                runOnUiThread {
                    loadBanner()
                    loadInterstitial()
                    loadRewarded()
                }
            }
        }.start()
    }

    private fun loadBanner() {
        val widthDp = (resources.displayMetrics.widthPixels / resources.displayMetrics.density).toInt()
        val view = AdView(this).apply {
            adUnitId = BuildConfig.ADMOB_BANNER_ID
            setAdSize(AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(this@MainActivity, widthDp))
        }
        banner?.destroy()
        banner = view
        bannerHolder.removeAllViews()
        bannerHolder.addView(view)
        view.loadAd(AdRequest.Builder().build())
    }

    private fun loadInterstitial() {
        InterstitialAd.load(
            this, BuildConfig.ADMOB_INTERSTITIAL_ID, AdRequest.Builder().build(),
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) { interstitial = ad }
                override fun onAdFailedToLoad(error: LoadAdError) {
                    interstitial = null
                    main.postDelayed({ loadInterstitial() }, RETRY_MS)
                }
            }
        )
    }

    private fun loadRewarded() {
        RewardedAd.load(
            this, BuildConfig.ADMOB_REWARDED_ID, AdRequest.Builder().build(),
            object : RewardedAdLoadCallback() {
                override fun onAdLoaded(ad: RewardedAd) { rewarded = ad }
                override fun onAdFailedToLoad(error: LoadAdError) {
                    rewarded = null
                    main.postDelayed({ loadRewarded() }, RETRY_MS)
                }
            }
        )
    }

    private fun showInterstitialNow() {
        val ad = interstitial ?: return
        val now = System.currentTimeMillis()
        if (now - lastInterstitialAt < MIN_INTERSTITIAL_GAP_MS) return // mai annunci troppo ravvicinati
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() { interstitial = null; loadInterstitial() }
            override fun onAdFailedToShowFullScreenContent(error: AdError) { interstitial = null; loadInterstitial() }
        }
        lastInterstitialAt = now
        ad.show(this)
    }

    private fun showRewardedNow() {
        val ad = rewarded
        if (ad == null) {
            callJs("window.onRewardedResult(false, 'notready')")
            loadRewarded()
            return
        }
        var earned = false
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() {
                rewarded = null
                callJs("window.onRewardedResult($earned)")
                loadRewarded()
            }

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                rewarded = null
                callJs("window.onRewardedResult(false, 'error')")
                loadRewarded()
            }
        }
        ad.show(this) { earned = true }
    }

    /* -------------------------------------------------------------------------------- utilita' */

    private fun callJs(js: String) {
        webView.post { webView.evaluateJavascript(js, null) }
    }

    private fun openExternal(uri: Uri) {
        if (uri.scheme != "https" && uri.scheme != "http") return
        try { startActivity(Intent(Intent.ACTION_VIEW, uri)) } catch (_: Exception) { /* nessun browser */ }
    }

    /** Metodi chiamabili da JavaScript come Android.xxx(). Girano su un thread secondario. */
    inner class Bridge {
        @JavascriptInterface
        fun vibrate(ms: Int) {
            @Suppress("DEPRECATION")
            val v = getSystemService(Vibrator::class.java) ?: return
            if (v.hasVibrator()) v.vibrate(VibrationEffect.createOneShot(ms.toLong().coerceIn(1, 200), VibrationEffect.DEFAULT_AMPLITUDE))
        }

        @JavascriptInterface
        fun share(text: String) {
            runOnUiThread {
                val send = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, text)
                }
                startActivity(Intent.createChooser(send, null))
            }
        }

        @JavascriptInterface
        fun openUrl(url: String) { runOnUiThread { openExternal(Uri.parse(url)) } }

        @JavascriptInterface
        fun showInterstitial() { runOnUiThread { showInterstitialNow() } }

        @JavascriptInterface
        fun showRewarded() { runOnUiThread { showRewardedNow() } }

        /** True se l'utente nello Spazio Economico Europeo deve poter riaprire le scelte sul consenso. */
        @JavascriptInterface
        fun privacyOptionsRequired(): Boolean =
            consentInfo.privacyOptionsRequirementStatus == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED

        @JavascriptInterface
        fun showPrivacyOptions() {
            runOnUiThread { UserMessagingPlatform.showPrivacyOptionsForm(this@MainActivity) { _ -> } }
        }
    }

    override fun onPause() { super.onPause(); webView.onPause(); banner?.pause() }
    override fun onResume() { super.onResume(); webView.onResume(); banner?.resume() }
    override fun onDestroy() {
        main.removeCallbacksAndMessages(null)
        banner?.destroy()
        webView.destroy()
        super.onDestroy()
    }

    private companion object {
        const val ASSET_HOST = "appassets.androidplatform.net"
        val BG: Int = Color.parseColor("#6C3FD1")
        const val RETRY_MS = 60_000L
        const val MIN_INTERSTITIAL_GAP_MS = 90_000L
    }
}
