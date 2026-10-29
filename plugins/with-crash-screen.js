/**
 * Expo-Config-Plugin: Absturz-Anzeige für Android (ohne Computer/adb debugbar).
 *
 * - Fängt JEDEN Absturz ab (nativ und JavaScript, denn fatale JS-Fehler werden in
 *   Release-Builds als native JavascriptException geworfen).
 * - Speichert den Bericht in filesDir/last-crash.txt und zeigt ihn sofort in einer
 *   eigenen Activity (eigener Prozess ":crash", läuft also auch, wenn die App tot ist).
 * - Konnte die Anzeige nicht starten, erscheint sie beim nächsten App-Start.
 * - "Ohne Werbung neu starten" legt filesDir/safe-mode an; die App lädt dann keine Werbung.
 */
const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withMainActivity,
  withMainApplication,
} = require('expo/config-plugins');

const crashReporterKt = (pkg) => `package ${pkg}

import android.app.Activity
import android.app.Application
import android.content.Context
import android.os.Build
import android.os.Process
import android.util.Log
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.system.exitProcess

/** Erzeugt von plugins/with-crash-screen.js – nicht von Hand ändern. */
object CrashReporter {
  const val REPORT_FILE = "last-crash.txt"
  const val PENDING_FILE = "pending-crash"
  const val SAFE_MODE_FILE = "safe-mode"

  fun isCrashProcess(context: Context): Boolean = processName(context).endsWith(":crash")

  private fun processName(context: Context): String {
    if (Build.VERSION.SDK_INT >= 28) return Application.getProcessName() ?: ""
    return try {
      File("/proc/self/cmdline").readText().trim(Char(0)).trim()
    } catch (e: Throwable) {
      ""
    }
  }

  fun install(app: Application) {
    val previous = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler { thread, error ->
      if (isCrashProcess(app)) {
        previous?.uncaughtException(thread, error)
        return@setDefaultUncaughtExceptionHandler
      }
      try {
        val report = buildReport(app, thread, error)
        Log.e("WettAppCrash", report)
        File(app.filesDir, REPORT_FILE).writeText(report)
        File(app.filesDir, PENDING_FILE).writeText("1")
        app.startActivity(CrashActivity.intent(app, report))
      } catch (t: Throwable) {
        Log.e("WettAppCrash", "Absturzbericht fehlgeschlagen", t)
      }
      Process.killProcess(Process.myPid())
      exitProcess(10)
    }
  }

  /** Zeigt einen Bericht, der beim letzten Absturz nicht angezeigt werden konnte. */
  fun showPendingReport(activity: Activity) {
    try {
      val pending = File(activity.filesDir, PENDING_FILE)
      val report = File(activity.filesDir, REPORT_FILE)
      if (!pending.exists() || !report.exists()) return
      pending.delete()
      activity.startActivity(CrashActivity.intent(activity, report.readText()))
    } catch (t: Throwable) {
      Log.e("WettAppCrash", "Konnte alten Bericht nicht zeigen", t)
    }
  }

  private fun buildReport(context: Context, thread: Thread, error: Throwable): String {
    val version = try {
      val info = context.packageManager.getPackageInfo(context.packageName, 0)
      val code = if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else @Suppress("DEPRECATION") info.versionCode.toLong()
      "\${info.versionName} (Build \$code)"
    } catch (e: Throwable) {
      "?"
    }
    val time = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.GERMANY).format(Date())
    return buildString {
      appendLine("Wett-App Absturzbericht")
      appendLine("Zeit: \$time")
      appendLine("App: \$version")
      appendLine("Android: \${Build.VERSION.RELEASE} (API \${Build.VERSION.SDK_INT})")
      appendLine("Gerät: \${Build.MANUFACTURER} \${Build.MODEL}")
      appendLine("Thread: \${thread.name}")
      appendLine()
      append(Log.getStackTraceString(error).ifEmpty { error.toString() })
    }
  }
}
`;

const crashActivityKt = (pkg) => `package ${pkg}

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Typeface
import android.os.Bundle
import android.os.Process
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import java.io.File
import kotlin.system.exitProcess

/** Erzeugt von plugins/with-crash-screen.js – zeigt den Absturzbericht (eigener Prozess). */
class CrashActivity : Activity() {
  companion object {
    private const val EXTRA_REPORT = "report"

    fun intent(context: Context, report: String): Intent =
      Intent(context, CrashActivity::class.java)
        .putExtra(EXTRA_REPORT, report.take(100_000))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    File(filesDir, CrashReporter.PENDING_FILE).delete()
    val report = intent.getStringExtra(EXTRA_REPORT) ?: "Kein Bericht vorhanden."
    val pad = (16 * resources.displayMetrics.density).toInt()

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(pad, pad * 2, pad, pad)
    }
    root.addView(TextView(this).apply {
      text = "Die App ist abgestürzt 😵"
      textSize = 22f
      setTypeface(typeface, Typeface.BOLD)
    })
    root.addView(TextView(this).apply {
      text = "Bitte tippe auf „Bericht teilen“ und schick ihn an den Entwickler."
      setPadding(0, pad / 2, 0, pad / 2)
    })

    fun button(label: String, onClick: () -> Unit) = Button(this).apply {
      text = label
      isAllCaps = false
      setOnClickListener { onClick() }
    }

    root.addView(button("📤 Bericht teilen") {
      val send = Intent(Intent.ACTION_SEND)
        .setType("text/plain")
        .putExtra(Intent.EXTRA_SUBJECT, "Wett-App Absturzbericht")
        .putExtra(Intent.EXTRA_TEXT, report)
      startActivity(Intent.createChooser(send, "Bericht teilen"))
    })
    root.addView(button("📋 Kopieren") {
      val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
      clipboard.setPrimaryClip(ClipData.newPlainText("Absturzbericht", report))
      Toast.makeText(this, "Kopiert", Toast.LENGTH_SHORT).show()
    })
    root.addView(button("🔁 App neu starten") { restart(safeMode = false) })
    root.addView(button("🛟 Ohne Werbung neu starten") { restart(safeMode = true) })

    val scroll = ScrollView(this)
    scroll.addView(TextView(this).apply {
      text = report
      textSize = 11f
      typeface = Typeface.MONOSPACE
      setTextIsSelectable(true)
      setPadding(0, pad, 0, pad)
    })
    root.addView(scroll, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
    setContentView(root)
  }

  private fun restart(safeMode: Boolean) {
    val marker = File(filesDir, CrashReporter.SAFE_MODE_FILE)
    if (safeMode) marker.writeText("1") else marker.delete()
    packageManager.getLaunchIntentForPackage(packageName)?.let {
      it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
      startActivity(it)
    }
    finish()
    Process.killProcess(Process.myPid())
    exitProcess(0)
  }
}
`;

function withCrashFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const pkg = cfg.android?.package;
      if (!pkg) throw new Error('with-crash-screen: android.package fehlt in app.json');
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/java', ...pkg.split('.'));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'CrashReporter.kt'), crashReporterKt(pkg));
      fs.writeFileSync(path.join(dir, 'CrashActivity.kt'), crashActivityKt(pkg));
      return cfg;
    },
  ]);
}

function withCrashActivityInManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.activity = app.activity ?? [];
    if (!app.activity.some((a) => a.$['android:name'] === '.CrashActivity')) {
      app.activity.push({
        $: {
          'android:name': '.CrashActivity',
          'android:process': ':crash',
          'android:exported': 'false',
          'android:theme': '@android:style/Theme.Material.Light',
          'android:excludeFromRecents': 'true',
        },
      });
    }
    return cfg;
  });
}

function replaceOnce(contents, search, replacement, what) {
  if (contents.includes(replacement)) return contents;
  if (!contents.includes(search)) {
    throw new Error(`with-crash-screen: ${what} nicht gefunden – Expo-Vorlage hat sich geändert`);
  }
  return contents.replace(search, replacement);
}

function withCrashHooks(config) {
  config = withMainApplication(config, (cfg) => {
    let src = cfg.modResults.contents;
    // So früh wie möglich (vor ContentProvidern wie dem AdMob-Init) installieren.
    src = replaceOnce(
      src,
      'class MainApplication : Application(), ReactApplication {',
      'class MainApplication : Application(), ReactApplication {\n\n  init {\n    CrashReporter.install(this)\n  }',
      'MainApplication-Klasse'
    );
    // Im Absturz-Prozess React Native gar nicht erst starten.
    src = replaceOnce(
      src,
      '  override fun onCreate() {\n    super.onCreate()\n',
      '  override fun onCreate() {\n    super.onCreate()\n    if (CrashReporter.isCrashProcess(this)) return\n',
      'MainApplication.onCreate'
    );
    cfg.modResults.contents = src;
    return cfg;
  });
  return withMainActivity(config, (cfg) => {
    cfg.modResults.contents = replaceOnce(
      cfg.modResults.contents,
      '    super.onCreate(null)\n',
      '    super.onCreate(null)\n    CrashReporter.showPendingReport(this)\n',
      'MainActivity.onCreate'
    );
    return cfg;
  });
}

module.exports = function withCrashScreen(config) {
  return withCrashHooks(withCrashActivityInManifest(withCrashFiles(config)));
};
