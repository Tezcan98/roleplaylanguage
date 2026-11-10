package com.anadoluailesi.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;

/**
 * News from the server, without Firebase: about once an hour (and only with a network) the app
 * reads https://anadoluailesi.com.tr/haber.json ({ "id", "title", "body" }) and, when its id is a
 * new one, puts the message in the status bar. Published from the computer with tools/push.mjs.
 * Runs only for players who said yes to the "Haberler" card (NewsPlugin keeps that); the first
 * run only remembers the current id, so a message that is already old is never shown.
 */
public class NewsWorker extends Worker {
    static final String PREFS = "news", KEY_ON = "on", KEY_ID = "lastId", CHANNEL = "news";
    private static final String URL_ = "https://anadoluailesi.com.tr/haber.json";

    public NewsWorker(@NonNull Context context, @NonNull WorkerParameters params) { super(context, params); }

    /** Starts the hourly check (once; a second call keeps the one that runs). */
    static void schedule(Context c) {
        Constraints net = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        PeriodicWorkRequest req = new PeriodicWorkRequest.Builder(NewsWorker.class, 1, TimeUnit.HOURS).setConstraints(net).build();
        WorkManager.getInstance(c).enqueueUniquePeriodicWork("news", ExistingPeriodicWorkPolicy.KEEP, req);
    }

    static void cancel(Context c) { WorkManager.getInstance(c).cancelUniqueWork("news"); }

    @NonNull
    @Override
    public Result doWork() {
        Context c = getApplicationContext();
        SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!p.getBoolean(KEY_ON, false)) return Result.success();
        try {
            HttpURLConnection h = (HttpURLConnection) new URL(URL_ + "?t=" + System.currentTimeMillis()).openConnection();
            h.setConnectTimeout(10000); h.setReadTimeout(10000);
            if (h.getResponseCode() != 200) return Result.retry();
            StringBuilder sb = new StringBuilder();
            try (BufferedReader r = new BufferedReader(new InputStreamReader(h.getInputStream(), "UTF-8"))) { String l; while ((l = r.readLine()) != null) sb.append(l); }
            JSONObject j = new JSONObject(sb.toString());
            String id = j.optString("id", ""), title = j.optString("title", ""), body = j.optString("body", "");
            if (id.isEmpty() || title.isEmpty()) return Result.success();
            String last = p.getString(KEY_ID, null);
            p.edit().putString(KEY_ID, id).apply();
            if (last == null || last.equals(id)) return Result.success(); // the first look, or nothing new
            show(c, title, body);
            return Result.success();
        } catch (Exception e) { return Result.retry(); }
    }

    private static void show(Context c, String title, String body) {
        NotificationManagerCompat nm = NotificationManagerCompat.from(c);
        if (!nm.areNotificationsEnabled()) return; // Android 13+: the player did not allow it
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Haberler", NotificationManager.IMPORTANCE_DEFAULT);
            c.getSystemService(NotificationManager.class).createNotificationChannel(ch);
        }
        Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        PendingIntent pi = PendingIntent.getActivity(c, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CHANNEL)
            .setSmallIcon(c.getApplicationInfo().icon).setContentTitle(title).setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body)).setContentIntent(pi).setAutoCancel(true);
        try { nm.notify(1001, b.build()); } catch (SecurityException e) { /* permission taken away meanwhile */ }
    }
}
