// --- Inicio bloque buildscript para Google Services ---
buildscript {
  repositories {
    google()
    mavenCentral()
  }
  dependencies {
    // Plugin Android normal
    classpath("com.android.tools.build:gradle:7.4.1")
    // Plugin de Google Services para Firebase
    classpath("com.google.gms:google-services:4.3.15")
  }
}
// --- Fin bloque buildscript para Google Services ---


allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory = rootProject.layout.buildDirectory.dir("../../build").get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
