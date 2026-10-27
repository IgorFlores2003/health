package com.ritmo.health;

import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Troca o ícone do app habilitando um dos activity-alias do AndroidManifest
 * (.IconRed, .IconBlue...). O Android não permite gerar ícones em tempo de
 * execução, então só as cores empacotadas estão disponíveis.
 *
 * Desabilitar o alias pelo qual o app foi aberto fecha o app na hora, mesmo
 * com DONT_KILL_APP. Por isso a troca fica guardada (set) e só é aplicada
 * quando a pessoa toca em "Aplicar ícone" (apply). Aplicar sozinho ao ir
 * para segundo plano fechava o app ao abrir o WhatsApp, por exemplo.
 */
@CapacitorPlugin(name = "AppIcon")
public class AppIconPlugin extends Plugin {

    private static final List<String> NAMES = Arrays.asList(
        "red", "orange", "amber", "green", "teal", "blue", "indigo", "purple", "pink", "graphite"
    );
    private static final String PREFS = "ritmo-app-icon";
    private static final String PENDING = "pending";

    @PluginMethod
    public void set(PluginCall call) {
        String name = call.getString("name", "red");
        if (!NAMES.contains(name)) {
            call.reject("Ícone desconhecido: " + name);
            return;
        }
        // Salvo em disco: se o processo morrer antes do onStop, a troca não se perde.
        prefs().edit().putString(PENDING, name).apply();
        JSObject result = new JSObject();
        result.put("name", name);
        call.resolve(result);
    }

    /** Ícone escolhido que ainda não foi aplicado (ou null). */
    @PluginMethod
    public void pending(PluginCall call) {
        JSObject result = new JSObject();
        result.put("name", prefs().getString(PENDING, null));
        call.resolve(result);
    }

    /** Aplica o ícone guardado. O Android fecha o app em seguida. */
    @PluginMethod
    public void apply(PluginCall call) {
        String name = prefs().getString(PENDING, null);
        if (name == null) {
            call.resolve();
            return;
        }
        prefs().edit().remove(PENDING).commit();
        call.resolve();
        apply(name);
    }

    private void apply(String name) {
        PackageManager pm = getContext().getPackageManager();
        String pkg = getContext().getPackageName();
        // Habilita o novo antes de desabilitar os outros: sempre há um ícone na tela inicial.
        pm.setComponentEnabledSetting(
            new ComponentName(pkg, pkg + ".Icon" + capitalize(name)),
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
            PackageManager.DONT_KILL_APP
        );
        for (String other : NAMES) {
            if (other.equals(name)) continue;
            pm.setComponentEnabledSetting(
                new ComponentName(pkg, pkg + ".Icon" + capitalize(other)),
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP
            );
        }
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static String capitalize(String s) {
        return s.substring(0, 1).toUpperCase(Locale.ROOT) + s.substring(1);
    }
}
