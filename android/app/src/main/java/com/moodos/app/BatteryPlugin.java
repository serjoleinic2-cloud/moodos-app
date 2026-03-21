package com.moodos.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.content.Context;
import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

@CapacitorPlugin(name = "Battery")
public class BatteryPlugin extends Plugin {

    @PluginMethod
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        android.util.Log.d("BatteryPlugin", "isIgnoringBatteryOptimizations called");
        Context context = getContext();
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        boolean ignoring = pm.isIgnoringBatteryOptimizations(context.getPackageName());
        JSObject result = new JSObject();
        result.put("ignoring", ignoring);
        call.resolve(result);
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        android.util.Log.d("BatteryPlugin", "requestIgnoreBatteryOptimizations called");
        Context context = getContext();
        Intent intent = new Intent();
        intent.setAction(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
        intent.setData(Uri.parse("package:" + context.getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
        call.resolve();
    }
}
