package com.anadoluailesi.app;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.google.android.gms.ads.MobileAds;

/**
 * The game full screen: drawn edge to edge (under the cutout too), status and navigation bars
 * hidden (a swipe from the edge shows them for a moment). Phones keep it sideways; tablets and
 * foldables (smallest width 600 dp and more) turn freely, as Google Play asks for large screens
 * (the game works upright too).
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlayGamesPlugin.class); // Play Games sign-in (the safety log's player id)
        registerPlugin(NewsPlugin.class); // the "Haberler" card: the hourly news check (NewsWorker)
        super.onCreate(savedInstanceState);
        // the ads SDK started on a thread of its own, as Google asks: the plugin starts it on the main thread when the first
        // banner comes (the opening screen), and on a slow phone that held the first frames up (ANRs: "no focused window")
        new Thread(() -> MobileAds.initialize(getApplicationContext()), "ads-init").start();
        NewsPlugin.resume(this);
        // edge to edge: the bars' colours and the cutout come from the theme (res/values*/styles, edge.xml) — not
        // androidx EdgeToEdge.enable(), which sets them with the calls Android 15 deprecates (Play's vitals flag those)
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (getResources().getConfiguration().smallestScreenWidthDp < 600) setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        hideBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideBars(); // back from a permission prompt, an ad or another app
    }

    private void hideBars() {
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
