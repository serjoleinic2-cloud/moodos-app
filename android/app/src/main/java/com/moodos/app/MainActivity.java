package com.moodos.app;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;
import android.webkit.WebView;
import android.webkit.JavascriptInterface;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import android.util.Log;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends BridgeActivity {

    private WebView webViewRef;
    private String currentUid = null;
    private boolean bridgeRegistered = false;

    @Override
    public void onResume() {
        super.onResume();
        registerBridgeOnce();
    }

    private void registerBridgeOnce() {
        if (bridgeRegistered) return;
        
        try {
            Bridge bridge = getBridge();
            if (bridge != null) {
                WebView webView = bridge.getWebView();
                if (webView != null) {
                    webViewRef = webView;
                    webView.getSettings().setJavaScriptEnabled(true);
                    webView.addJavascriptInterface(new FirebaseBridge(), "Android");
                    Log.d("FIREBASE", "JavaScript interface registered");
                    bridgeRegistered = true;
                    
                    signInAndLoad();
                }
            }
        } catch (Exception e) {
            Log.e("FIREBASE", "Failed to register JS interface: " + e.getMessage());
        }
    }

    private void signInAndLoad() {
        FirebaseAuth.getInstance().signInAnonymously()
            .addOnSuccessListener(authResult -> {
                FirebaseUser user = authResult.getUser();
                if (user != null) {
                    currentUid = user.getUid();
                    Log.d("FIREBASE", "AUTH OK: " + currentUid);
                    loadFromCloud(currentUid);
                }
            })
            .addOnFailureListener(e -> {
                Log.e("FIREBASE", "AUTH FAILED: " + e.getMessage());
            });
    }

    private void loadFromCloud(String uid) {
        FirebaseFirestore db = FirebaseFirestore.getInstance();
        db.collection("user_data")
            .document(uid)
            .get()
            .addOnSuccessListener(documentSnapshot -> {
                if (documentSnapshot != null && documentSnapshot.exists()) {
                    String json = documentSnapshot.getString("payload");
                    if (json != null) {
                        runOnUiThread(() -> {
                            String js = "window.onCloudData && window.onCloudData(" + json + ")";
                            webViewRef.evaluateJavascript(js, null);
                            Log.d("FIREBASE", "CLOUD DATA LOADED");
                        });
                    }
                } else {
                    Log.d("FIREBASE", "No cloud data found for user");
                }
            })
            .addOnFailureListener(e -> 
                Log.e("FIREBASE", "LOAD ERROR: " + e.getMessage()));
    }

    @SuppressWarnings("unused")
    public static class FirebaseBridge {
        @JavascriptInterface
        public void saveToCloud(String jsonData) {
            FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
            if (user == null) {
                Log.e("FIREBASE", "Not authenticated");
                return;
            }

            String uid = user.getUid();
            Log.d("FIREBASE", "Saving for UID: " + uid);
            FirebaseFirestore db = FirebaseFirestore.getInstance();
            Map<String, Object> data = new HashMap<>();
            data.put("payload", jsonData);
            data.put("updatedAt", System.currentTimeMillis());

            db.collection("user_data")
                .document(uid)
                .set(data)
                .addOnSuccessListener(documentReference -> 
                    Log.d("FIREBASE", "BRIDGE SAVE OK - doc: " + uid))
                .addOnFailureListener(e -> 
                    Log.e("FIREBASE", "BRIDGE SAVE ERROR: " + e));
        }
    }
}
