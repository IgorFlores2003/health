package com.ritmo.health;

import android.content.ComponentName;
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
 */
@CapacitorPlugin(name = "AppIcon")
public class AppIconPlugin extends Plugin {

    private static final List<String> NAMES = Arrays.asList(
        "red", "orange", "amber", "green", "teal", "blue", "indigo", "purple", "pink", "graphite"
    );

    @PluginMethod
    public void set(PluginCall call) {
        String name = call.getString("name", "red");
        if (!NAMES.contains(name)) {
            call.reject("Ícone desconhecido: " + name);
            return;
        }
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
        JSObject result = new JSObject();
        result.put("name", name);
        call.resolve(result);
    }

    private static String capitalize(String s) {
        return s.substring(0, 1).toUpperCase(Locale.ROOT) + s.substring(1);
    }
}
