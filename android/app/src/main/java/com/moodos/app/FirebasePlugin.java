package com.moodos.app;

import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

import java.util.HashMap;
import java.util.Map;

@CapacitorPlugin(name = "FirebasePlugin")
public class FirebasePlugin extends Plugin {

    @Override
    public void load() {
        super.load();
        Log.d("FIREBASE_PLUGIN", "LOADED");
    }

    @SuppressWarnings("unused")
    @PluginMethod
    public void saveToCloud(PluginCall call) {
        Log.d("FIREBASE_PLUGIN", "CALLED");
        
        try {
            String data = call.getString("data", "no-data");
            Log.d("FIREBASE_PLUGIN", "DATA length: " + (data != null ? data.length() : 0));

            FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
            if (user == null) {
                Log.e("FIREBASE_PLUGIN", "Not authenticated");
                call.reject("not_authenticated");
                return;
            }

            String uid = user.getUid();
            FirebaseFirestore db = FirebaseFirestore.getInstance();

            Map<String, Object> map = new HashMap<>();
            map.put("payload", data);
            map.put("updatedAt", System.currentTimeMillis());

            db.collection("neyra_users")
                .document(uid)
                .collection("core")
                .document("main")
                .set(map)
                .addOnSuccessListener(v -> {
                    Log.d("FIREBASE_PLUGIN", "SUCCESS WRITE");
                    call.resolve();
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
