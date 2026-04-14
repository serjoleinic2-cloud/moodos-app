package com.moodos.app;

import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

import com.google.firebase.firestore.FirebaseFirestore;

import java.util.HashMap;
import java.util.Map;

@CapacitorPlugin(name = "FirebasePlugin")
public class FirebasePlugin extends Plugin {

    @Override
    protected void load() {
        super.load();
        Log.d("FIREBASE_PLUGIN", "LOADED");
        Log.d("FIREBASE_PLUGIN", "Plugins: " + getBridge().getPlugins().keySet().toString());
    }

    @PluginMethod
    public void saveToCloud(PluginCall call) {
        Log.d("FIREBASE_PLUGIN", "CALLED");
        
        try {
            String data = call.getString("data", "no-data");
            Log.d("FIREBASE_PLUGIN", "DATA length: " + (data != null ? data.length() : 0));

            FirebaseFirestore db = FirebaseFirestore.getInstance();

            Map<String, Object> map = new HashMap<>();
            map.put("data", data);
            map.put("timestamp", System.currentTimeMillis());

            db.collection("test")
                .add(map)
                .addOnSuccessListener(doc -> {
                    Log.d("FIREBASE_PLUGIN", "SUCCESS WRITE - doc: " + doc.getId());
                    JSObject result = new JSObject();
                    result.put("id", doc.getId());
                    call.resolve(result);
                })
                .addOnFailureListener(e -> {
                    Log.e("FIREBASE_PLUGIN", "ERROR: " + e.getMessage());
                    call.reject(e.getMessage());
                });

        } catch (Exception e) {
            Log.e("FIREBASE_PLUGIN", "EXCEPTION: " + e.getMessage());
            call.reject("exception");
        }
    }
}
