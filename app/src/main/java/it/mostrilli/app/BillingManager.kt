package it.mostrilli.app

import android.app.Activity
import android.content.Context
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams

/**
 * Acquisto una tantum "Rimuovi pubblicita'" con Google Play Billing.
 *
 * Il prodotto va creato nella Play Console (Monetizza -> Prodotti -> Prodotti una tantum)
 * con ID esattamente uguale a [PRODUCT_ID]. Finche' l'app non e' installata da Google Play
 * (ad esempio con l'APK di prova) la fatturazione non e' disponibile e il pulsante
 * d'acquisto nell'app non compare.
 */
class BillingManager(
    private val activity: Activity,
    private val onAdsRemovedChanged: (Boolean) -> Unit,
    private val onPrice: (String) -> Unit,
    private val onMessage: (String) -> Unit
) {
    private val prefs = activity.getSharedPreferences("billing", Context.MODE_PRIVATE)
    private var productDetails: ProductDetails? = null
    private var offerToken: String? = null

    /** Ultimo stato noto (salvato sul telefono, cosi' funziona anche offline). */
    var adsRemoved: Boolean
        get() = prefs.getBoolean(KEY_ADS_REMOVED, false)
        private set(value) { prefs.edit().putBoolean(KEY_ADS_REMOVED, value).apply() }

    var price: String = ""
        private set

    private val client: BillingClient = BillingClient.newBuilder(activity.applicationContext)
        .setListener { result, purchases ->
            when (result.responseCode) {
                BillingClient.BillingResponseCode.OK -> if (purchases != null) handlePurchases(purchases, authoritative = false)
                BillingClient.BillingResponseCode.USER_CANCELED -> Unit
                BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> refreshPurchases()
                else -> onMessage("error")
            }
        }
        .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
        .enableAutoServiceReconnection()
        .build()

    fun start() {
        client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                    queryProduct()
                    refreshPurchases()
                }
            }

            override fun onBillingServiceDisconnected() {
                // Con enableAutoServiceReconnection() la libreria si riconnette da sola.
            }
        })
    }

    fun end() {
        if (client.isReady) client.endConnection()
    }

    private fun queryProduct() {
        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(
                listOf(
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(PRODUCT_ID)
                        .setProductType(BillingClient.ProductType.INAPP)
                        .build()
                )
            )
            .build()
        client.queryProductDetailsAsync(params) { result, details ->
            if (result.responseCode != BillingClient.BillingResponseCode.OK) return@queryProductDetailsAsync
            val pd = details.productDetailsList.firstOrNull() ?: return@queryProductDetailsAsync
            val offer = pd.oneTimePurchaseOfferDetailsList?.firstOrNull()
            productDetails = pd
            offerToken = offer?.offerToken
            price = offer?.formattedPrice.orEmpty()
            if (price.isNotEmpty()) onPrice(price)
        }
    }

    /** Controlla gli acquisti gia' fatti (anche su un altro telefono con lo stesso account Google). */
    fun refreshPurchases() {
        if (!client.isReady) return
        val params = QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()
        client.queryPurchasesAsync(params) { result, purchases ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                handlePurchases(purchases, authoritative = true)
            }
        }
    }

    fun buy() {
        val pd = productDetails
        if (!client.isReady || pd == null) {
            onMessage("unavailable")
            return
        }
        val item = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(pd)
        offerToken?.let { item.setOfferToken(it) }
        val flow = BillingFlowParams.newBuilder().setProductDetailsParamsList(listOf(item.build())).build()
        val result = client.launchBillingFlow(activity, flow)
        if (result.responseCode != BillingClient.BillingResponseCode.OK) onMessage("error")
    }

    private fun handlePurchases(purchases: List<Purchase>, authoritative: Boolean) {
        var owned = false
        var pending = false
        for (p in purchases) {
            if (!p.products.contains(PRODUCT_ID)) continue
            when (p.purchaseState) {
                Purchase.PurchaseState.PURCHASED -> {
                    owned = true
                    if (!p.isAcknowledged) acknowledge(p)
                }
                Purchase.PurchaseState.PENDING -> pending = true
                else -> Unit
            }
        }
        when {
            owned -> updateAdsRemoved(true)
            pending -> onMessage("pending")
            // La lista degli acquisti e' completa: se non c'e' piu' (rimborso) si ripristinano gli annunci.
            authoritative -> updateAdsRemoved(false)
        }
    }

    private fun acknowledge(p: Purchase) {
        val params = AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.purchaseToken).build()
        client.acknowledgePurchase(params) { /* se fallisce, ci riproviamo al prossimo avvio */ }
    }

    private fun updateAdsRemoved(value: Boolean) {
        val changed = adsRemoved != value
        adsRemoved = value
        if (changed) onAdsRemovedChanged(value)
    }

    companion object {
        /** Deve coincidere con l'ID del prodotto una tantum creato nella Play Console. */
        const val PRODUCT_ID = "remove_ads"
        private const val KEY_ADS_REMOVED = "ads_removed"
    }
}
