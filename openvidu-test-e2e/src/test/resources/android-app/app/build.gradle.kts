plugins {
    id("com.android.application")
}

android {
    namespace = "io.openvidu.test.android"
    compileSdk = 36

    defaultConfig {
        applicationId = "io.openvidu.test.android"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
        // The e2e emulator is x86_64; arm64-v8a lets the app run on real devices too.
        // The other ABIs of the LiveKit WebRTC library would only make the APK bigger
        ndk {
            abiFilters += listOf("x86_64", "arm64-v8a")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("io.livekit:livekit-android:2.30.0")
    implementation("androidx.activity:activity-ktx:1.13.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.11.0")
}
