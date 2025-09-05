plugins {
  // 1) Plugin de Android
  id("com.android.application")
  // 2) Plugin de Kotlin
  id("kotlin-android")
  // 3) Plugin de Google Services (Firebase)
  id("com.google.gms.google-services")
  // 4) Plugin de Flutter (SIEMPRE al final)
  id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.example.kiosk_app"
    compileSdk = flutter.compileSdkVersion
        // Forzar la versión de NDK requerida por Firebase plugins:
    ndkVersion = "27.0.12077973"

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.example.kiosk_app"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = 23
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

flutter {
    source = "../.."
}
