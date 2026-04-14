package com.moodos.app;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import android.webkit.JavascriptInterface;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

import java.util.HashMap;
import java.util.Map;

public class MainActivity extends BridgeActivity {

    private WebView webView;
    private boolean bridgeRegistered = false;

    @Override
    public void onStart() {
        super.onStart();
        Log.i("TAG", "=== onStart ===");
        registerBridge();
    }

    @Override
    public void onResume() {
        super.onResume();
        Log.i("TAG", "=== onResume ===");
        registerBridge();
    }

    private void registerBridge() {
        if (bridgeRegistered) {
            Log.i("TAG", "Bridge already registered");
            return;
        }
        
        try {
            Log.i("TAG", "Trying to get bridge...");
            Bridge bridge = getBridge();
            
            if (bridge != null) {
                Log.i("TAG", "Bridge found: " + bridge);
                webView = bridge.getWebView();
                
                if (webView != null) {
                    Log.i("TAG", "WebView found: " + webView);
                    webView.getSettings().setJavaScriptEnabled(true);
                    webView.addJavascriptInterface(new FirebaseBridge(), "Android");
                    bridgeRegistered = true;
                    Log.i("TAG", "=== Android bridge REGISTERED ===");
                } else {
                    Log.e("TAG", "WebView is null!");
                }
            } else {
                Log.e("TAG", "Bridge is null!");
            }
        } catch (Exception e) {
            Log.e("TAG", "Error: " + e.getMessage());
        }
    }

    public static class FirebaseBridge {
        
        @JavascriptInterface
        public void saveToCloud(String jsonData) {
            Log.d("FIREBASE", "BRIDGE CALLED: saveToCloud");
            
            FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
            if (user == null) {
                Log.e("FIREBASE", "Not authenticated - signing in anonymously");
                signInAndSave(jsonData);
                return;
            }
            
            String uid = user.getUid();
            Log.d("FIREBASE", "UID: " + uid);
            saveToFirestore(uid, jsonData);
        }
        
        private void signInAndSave(String jsonData) {
            FirebaseAuth.getInstance().signInAnonymously()
                .addOnSuccessListener(authResult -> {
                    String uid = authResult.getUser().getUid();
                    Log.d("FIREBASE", "Anonymous auth OK: " + uid);
                    saveToFirestore(uid, jsonData);
                })
                .addOnFailureListener(e -> {
                    Log.e("FIREBASE", "Anonymous auth FAILED: " + e.getMessage());
                });
        }
        
        private void saveToFirestore(String uid, String jsonData) {
            FirebaseFirestore db = FirebaseFirestore.getInstance();
            Map<String, Object> data = new HashMap<>();
            data.put("payload", jsonData);
            data.put("timestamp", System.currentTimeMillis());
            
            db.collection("test")
                .add(data)
                .addOnSuccessListener(doc -> {
                    Log.d("FIREBASE", "BRIDGE SAVE OK - doc: " + doc.getId());
                })
                .addOnFailureListener(e -> {
                    Log.e("FIREBASE", "BRIDGE SAVE ERROR: " + e.getMessage());
                });
        }
    }
}
