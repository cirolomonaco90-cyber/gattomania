import Foundation
import StoreKit

/// Acquisto una tantum "Rimuovi pubblicita'" con StoreKit 2.
///
/// Il prodotto va creato in App Store Connect (la tua app -> Monetizzazione -> Acquisti in-app)
/// come "Non consumabile" con ID prodotto esattamente uguale a `productID`.
@MainActor
final class StoreManager {
    static let productID = "remove_ads"
    private static let cacheKey = "ads_removed"

    var onAdsRemovedChanged: ((Bool) -> Void)?
    var onPrice: ((String) -> Void)?
    var onMessage: ((String) -> Void)?

    /// Prezzo gia' formattato nella valuta dell'utente, vuoto finche' l'App Store non risponde.
    private(set) var price = ""
    private var product: Product?
    private var updatesTask: Task<Void, Never>?

    /// Ultimo stato noto, salvato sul telefono cosi' vale anche senza connessione.
    var adsRemoved: Bool { UserDefaults.standard.bool(forKey: Self.cacheKey) }

    func start() {
        // Acquisti completati fuori dall'app, approvati dopo (es. "Chiedi di acquistare") o rimborsati.
        updatesTask = Task { [weak self] in
            for await result in Transaction.updates {
                guard let self = self else { return }
                await self.process(result)
            }
        }
        Task {
            await self.loadProduct()
            await self.refresh()
        }
    }

    func loadProduct() async {
        do {
            let products = try await Product.products(for: [Self.productID])
            guard let first = products.first else { return }
            product = first
            price = first.displayPrice
            onPrice?(price)
        } catch {
            // App Store non raggiungibile: il pulsante d'acquisto resta nascosto.
        }
    }

    /// Ricontrolla con l'App Store cosa possiede l'utente (anche su un altro iPhone con lo stesso ID Apple).
    func refresh() async {
        var owned = false
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result,
               transaction.productID == Self.productID,
               transaction.revocationDate == nil {
                owned = true
            }
        }
        setAdsRemoved(owned)
    }

    func buy() {
        Task {
            if self.product == nil { await self.loadProduct() }
            guard let product = self.product else {
                self.onMessage?("unavailable")
                return
            }
            do {
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    await self.process(verification)
                case .pending:
                    self.onMessage?("pending")
                case .userCancelled:
                    break
                @unknown default:
                    break
                }
            } catch {
                self.onMessage?("error")
            }
        }
    }

    func restore() {
        Task {
            try? await AppStore.sync()
            await self.refresh()
        }
    }

    private func process(_ result: VerificationResult<Transaction>) async {
        guard case .verified(let transaction) = result else {
            onMessage?("error")
            return
        }
        if transaction.productID == Self.productID {
            setAdsRemoved(transaction.revocationDate == nil)
        }
        await transaction.finish()
    }

    private func setAdsRemoved(_ value: Bool) {
        let changed = adsRemoved != value
        UserDefaults.standard.set(value, forKey: Self.cacheKey)
        if changed { onAdsRemovedChanged?(value) }
    }
}
