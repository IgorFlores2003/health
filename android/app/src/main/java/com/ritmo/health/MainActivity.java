package com.ritmo.health;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppIconPlugin.class);
        registerPlugin(FileOpenerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
