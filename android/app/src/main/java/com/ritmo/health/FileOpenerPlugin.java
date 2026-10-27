package com.ritmo.health;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import androidx.core.content.FileProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

/**
 * Abre um arquivo salvo pelo app (ex.: o PDF do relatório, no cache) no
 * leitor padrão do celular, pelo FileProvider declarado no AndroidManifest.
 */
@CapacitorPlugin(name = "FileOpener")
public class FileOpenerPlugin extends Plugin {

    @PluginMethod
    public void open(PluginCall call) {
        String uri = call.getString("uri");
        String mime = call.getString("mime", "application/pdf");
        if (uri == null) {
            call.reject("Arquivo não informado.");
            return;
        }
        File file = new File(Uri.parse(uri).getPath());
        if (!file.exists()) {
            call.reject("Arquivo não encontrado.");
            return;
        }
        Uri content = FileProvider.getUriForFile(
            getContext(), getContext().getPackageName() + ".fileprovider", file
        );
        Intent intent = new Intent(Intent.ACTION_VIEW)
            .setDataAndType(content, mime)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getActivity().startActivity(intent);
            call.resolve();
        } catch (ActivityNotFoundException e) {
            call.reject("Nenhum app para abrir PDF.", "NO_APP");
        }
    }
}
