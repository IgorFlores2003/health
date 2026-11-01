package com.ritmo.health;

import android.Manifest;
import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Lê o contador de passos do celular (Sensor.TYPE_STEP_COUNTER). O próprio
 * chip conta os passos o tempo todo, mesmo com o app fechado e sem gastar
 * bateria; o valor é o total desde que o celular ligou. O app guarda a
 * última leitura e soma a diferença ao dia (src/steps.ts).
 */
@CapacitorPlugin(
    name = "StepCounter",
    permissions = {
        @Permission(strings = { Manifest.permission.ACTIVITY_RECOGNITION }, alias = "activity")
    }
)
public class StepCounterPlugin extends Plugin {

    private Sensor sensor() {
        SensorManager sm = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        return sm == null ? null : sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
    }

    /** Antes do Android 10 a contagem não pede permissão. */
    private boolean allowed() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
            || getPermissionState("activity") == PermissionState.GRANTED;
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", sensor() != null);
        result.put("granted", allowed());
        call.resolve(result);
    }

    @PluginMethod
    public void requestAccess(PluginCall call) {
        if (allowed()) {
            status(call);
            return;
        }
        requestPermissionForAlias("activity", call, "accessCallback");
    }

    @PermissionCallback
    private void accessCallback(PluginCall call) {
        status(call);
    }

    /** Total de passos desde que o celular ligou e quando ligou (ms). */
    @PluginMethod
    public void read(PluginCall call) {
        Sensor sensor = sensor();
        if (sensor == null) {
            call.reject("Este celular não tem contador de passos.", "UNAVAILABLE");
            return;
        }
        if (!allowed()) {
            call.reject("Permita o acesso à atividade física.", "DENIED");
            return;
        }
        SensorManager sm = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        Handler handler = new Handler(Looper.getMainLooper());
        final boolean[] done = { false };
        SensorEventListener listener = new SensorEventListener() {
            @Override
            public void onSensorChanged(SensorEvent event) {
                if (done[0]) return;
                done[0] = true;
                sm.unregisterListener(this);
                JSObject result = new JSObject();
                result.put("steps", (double) event.values[0]);
                result.put("bootAt", System.currentTimeMillis() - SystemClock.elapsedRealtime());
                call.resolve(result);
            }

            @Override
            public void onAccuracyChanged(Sensor s, int accuracy) {}
        };
        sm.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL);
        // Alguns aparelhos só mandam o valor quando há um passo novo.
        handler.postDelayed(() -> {
            if (done[0]) return;
            done[0] = true;
            sm.unregisterListener(listener);
            call.reject("O contador não respondeu. Dê alguns passos e tente de novo.", "TIMEOUT");
        }, 4000);
    }
}
