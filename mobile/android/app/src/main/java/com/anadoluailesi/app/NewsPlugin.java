package com.anadoluailesi.app;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** The "Haberler" card's yes / no: switches the hourly news check (NewsWorker) on or off. */
@CapacitorPlugin(name = "News")
public class NewsPlugin extends Plugin {
    @PluginMethod
    public void enable(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        Context c = getContext();
        c.getSharedPreferences(NewsWorker.PREFS, Context.MODE_PRIVATE).edit().putBoolean(NewsWorker.KEY_ON, on).apply();
        if (on) NewsWorker.schedule(c); else NewsWorker.cancel(c);
        call.resolve(new JSObject().put("enabled", on));
    }

    /** Called at every start of the app: a player who said yes keeps the check scheduled. */
    static void resume(Context c) {
        if (c.getSharedPreferences(NewsWorker.PREFS, Context.MODE_PRIVATE).getBoolean(NewsWorker.KEY_ON, false)) NewsWorker.schedule(c);
    }
}
