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
    public void onStart() {
        super.onStart();
        Log.d("BRIDGE", "onStart called");
        registerBridgeOnce();
    }

    @Override
    public void onResume() {
        super.onResume();
        Log.d("BRIDGE", "onResume called");
        registerBridgeOnce();
    }

    private void registerBridgeOnce() {
        if (bridgeRegistered) {
            Log.d("BRIDGE", "Already registered, skipping");
            return;
        }
        
        try {
            Log.d("BRIDGE", "Trying to get bridge...");
            Bridge bridge = getBridge();
            if (bridge != null) {
                Log.d("BRIDGE", "Bridge found");
                WebView webView = bridge.getWebView();
                if (webView != null) {
                    Log.d("BRIDGE", "WebView found");
                    webViewRef = webView;
                    webView.getSettings().setJavaScriptEnabled(true);
                    webView.addJavascriptInterface(new FirebaseBridge(), "Android");
                    Log.d("BRIDGE", "JavaScript interface registered as 'Android'");
                    bridgeRegistered = true;
                    
                    signInAndLoad();
                } else {
                    Log.e("BRIDGE", "WebView is null!");
                }
            } else {
                Log.e("BRIDGE", "Bridge is null!");
            }
        } catch (Exception e) {
            Log.e("BRIDGE", "Failed to register JS interface: " + e.getMessage(), e);
        }
    }

    private void signInAndLoad() {
        Log.d("BRIDGE", "Starting anonymous auth...");
        FirebaseAuth.getInstance().signInAnonymously()
            .addOnSuccessListener(authResult -> {
                FirebaseUser user = authResult.getUser();
                if (user != null) {
                    currentUid = user.getUid();
                    Log.d("FIREBASE", "AUTH OK: " + currentUid);
                    loadFromCloud(currentUid);
                } else {
                    Log.e("FIREBASE", "Auth result user is null!");
                }
            })
            .addOnFailureListener(e -> {
                Log.e("FIREBASE", "AUTH FAILED: " + e.getMessage());
            });
    }

    private void loadFromCloud(String uid) {
        Log.d("FIREBASE", "Loading from cloud for UID: " + uid);
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
            Log.d("BRIDGE", "METHOD CALLED: saveToCloud");
            Log.d("BRIDGE", "Data length: " + (jsonData != null ? jsonData.length() : 0));
            
            try {
                FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
                if (user == null) {
                    Log.e("FIREBASE", "Not authenticated - user is null");
                    return;
                }

                String uid = user.getUid();
                Log.d("FIREBASE", "Saving for UID: " + uid);
                FirebaseFirestore db = FirebaseFirestore.getInstance();
                Map<String, Object> data = new HashMap<>();
                data.put("payload", jsonData);
                data.put("timestamp", System.currentTimeMillis());

                db.collection("test")
                    .add(data)
                    .addOnSuccessListener(aVoid ->
                        Log.d("FIREBASE", "BRIDGE SAVE OK - doc: " + uid))
                    .addOnFailureListener(e ->
                        Log.e("FIREBASE", "BRIDGE SAVE ERROR: " + e.getMessage()));
            } catch (Exception e) {
                Log.e("FIREBASE", "Exception in saveToCloud: " + e.getMessage(), e);
            }
        }
        
        @JavascriptInterface
        public void ping() {
            Log.d("BRIDGE", "PING received!");
        }
    }
}
