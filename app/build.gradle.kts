import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Legge un valore da -P..., da variabile d'ambiente o usa il default.
fun setting(name: String, default: String): String =
    (project.findProperty(name) as String?)?.takeIf { it.isNotBlank() }
        ?: System.getenv(name)?.takeIf { it.isNotBlank() }
        ?: default

// ID di test ufficiali di Google AdMob.
val testAppId = "ca-app-pub-3940256099942544~3347511713"
val testBanner = "ca-app-pub-3940256099942544/9214589741"
val testInterstitial = "ca-app-pub-3940256099942544/1033173712"
val testRewarded = "ca-app-pub-3940256099942544/5224354917"

val admobAppId = setting("ADMOB_APP_ID", testAppId)
val admobBanner = setting("ADMOB_BANNER_ID", testBanner)
val admobInterstitial = setting("ADMOB_INTERSTITIAL_ID", testInterstitial)
val admobRewarded = setting("ADMOB_REWARDED_ID", testRewarded)

val keystorePath = setting("KEYSTORE_FILE", "")

android {
    namespace = "it.mostrilli.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "it.mostrilli.app"
        minSdk = 26
        targetSdk = 36
        versionCode = setting("VERSION_CODE", "1").toInt()
        versionName = "1.0"
    }

    buildFeatures {
        buildConfig = true
    }

    signingConfigs {
        if (keystorePath.isNotEmpty()) {
            create("release") {
                storeFile = file(keystorePath)
                storePassword = setting("KEYSTORE_PASSWORD", "")
                keyAlias = setting("KEY_ALIAS", "upload")
                keyPassword = setting("KEY_PASSWORD", "")
            }
        }
    }

    buildTypes {
        debug {
            // In debug si usano SEMPRE gli annunci di test: mai cliccare annunci veri sul proprio telefono.
            manifestPlaceholders["admobAppId"] = testAppId
            buildConfigField("String", "ADMOB_BANNER_ID", "\"$testBanner\"")
            buildConfigField("String", "ADMOB_INTERSTITIAL_ID", "\"$testInterstitial\"")
            buildConfigField("String", "ADMOB_REWARDED_ID", "\"$testRewarded\"")
        }
        release {
            manifestPlaceholders["admobAppId"] = admobAppId
            buildConfigField("String", "ADMOB_BANNER_ID", "\"$admobBanner\"")
            buildConfigField("String", "ADMOB_INTERSTITIAL_ID", "\"$admobInterstitial\"")
            buildConfigField("String", "ADMOB_REWARDED_ID", "\"$admobRewarded\"")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (keystorePath.isNotEmpty()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    lint {
        abortOnError = false
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("com.google.android.gms:play-services-ads:25.5.0")
    implementation("com.google.android.ump:user-messaging-platform:4.0.0")
    implementation("com.android.billingclient:billing:9.1.0")
}

// Avviso se si compila la versione di produzione con gli ID di test.
tasks.matching { it.name == "bundleRelease" || it.name == "assembleRelease" }.configureEach {
    doFirst {
        if (admobAppId == testAppId) {
            logger.warn("ATTENZIONE: build di release con ID AdMob di TEST: non guadagnerai nulla. Imposta ADMOB_* (vedi LEGGIMI.md).")
        }
        if (keystorePath.isEmpty()) {
            logger.warn("ATTENZIONE: nessuna chiave di firma (KEYSTORE_FILE): il pacchetto di release non e' firmato e Google Play lo rifiutera'.")
        }
    }
}
