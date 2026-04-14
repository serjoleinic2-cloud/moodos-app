package com.moodos.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

import com.google.firebase.firestore.FirebaseFirestore;

import java.util.HashMap;
import java.util.Map;

@CapacitorPlugin(name = "FirebasePlugin")
public class FirebasePlugin extends Plugin {

    @PluginMethod
    public void saveToCloud(PluginCall call) {
        String payload = call.getString("data");
        
        android.util.Log.d("FIREBASE_PLUGIN", "saveToCloud called with data length: " + (payload != null ? payload.length() : 0));

        FirebaseFirestore db = FirebaseFirestore.getInstance();

        Map<String, Object> data = new HashMap<>();
        data.put("payload", payload);
        data.put("timestamp", System.currentTimeMillis());

        db.collection("test")
            .add(data)
            .addOnSuccessListener(documentReference -> {
                android.util.Log.d("FIREBASE_PLUGIN", "SAVE OK - doc: " + documentReference.getId());
                call.resolve();
            })
            .addOnFailureListener(e -> {
                android.util.Log.e("FIREBASE_PLUGIN", "SAVE ERROR: " + e.getMessage());
                call.reject("ERROR", e);
            });
    }
}
