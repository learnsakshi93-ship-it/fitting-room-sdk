plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

group = "com.fittingroom"
version = "0.2.0"

android {
    namespace = "com.fittingroom.sdk"
    compileSdk = 35

    defaultConfig {
        minSdk = 23
        consumerProguardFiles("consumer-rules.pro")
    }
}
