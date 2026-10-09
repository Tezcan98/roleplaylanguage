package com.anadoluailesi.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.games.GamesSignInClient;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;

/**
 * Google Play Games sign-in: the player's Play Games player id, kept with what they write in the
 * square and to the characters (the 90-day safety log on the server) so a harmful conversation can
 * be traced to an account. Does nothing until the Play Games Services project id is set in
 * res/values/strings.xml (game_services_project_id; "0" = not set up yet).
 */
@CapacitorPlugin(name = "PlayGames")
public class PlayGamesPlugin extends Plugin {
    private boolean ready = false;

    @Override
    public void load() {
        String id = getContext().getString(R.string.game_services_project_id);
        if (id == null || id.isEmpty() || id.equals("0")) return; // not set up in Play Console yet
        try { PlayGamesSdk.initialize(getContext()); ready = true; } catch (Exception e) { ready = false; }
    }

    /** { signedIn, playerId?, name? } — silent if the player already uses Play Games, otherwise the sign-in sheet. */
    @PluginMethod
    public void signIn(PluginCall call) {
        if (!ready) { call.resolve(result(false)); return; }
        try {
            GamesSignInClient client = PlayGames.getGamesSignInClient(getActivity());
            client.isAuthenticated().addOnCompleteListener(t -> {
                if (t.isSuccessful() && t.getResult().isAuthenticated()) { player(call); return; }
                client.signIn().addOnCompleteListener(t2 -> {
                    if (t2.isSuccessful() && t2.getResult().isAuthenticated()) player(call); else call.resolve(result(false));
                });
            });
        } catch (Exception e) { call.resolve(result(false)); }
    }

    private void player(PluginCall call) {
        PlayGames.getPlayersClient(getActivity()).getCurrentPlayer().addOnCompleteListener(t -> {
            if (!t.isSuccessful() || t.getResult() == null) { call.resolve(result(false)); return; }
            JSObject r = result(true);
            r.put("playerId", t.getResult().getPlayerId());
            r.put("name", t.getResult().getDisplayName());
            call.resolve(r);
        });
    }

    private static JSObject result(boolean signedIn) { JSObject r = new JSObject(); r.put("signedIn", signedIn); return r; }
}
