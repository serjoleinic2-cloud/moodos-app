package com.moodos.app;

import android.os.Bundle;
import android.os.Handler;
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
    private FirebaseBridge firebaseBridge = null;
    private long lastSyncTime = 0;
    private static final long SYNC_THROTTLE_MS = 2000;

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

    @Override
    protected void onDestroy() {
        Log.i("TAG", "=== onDestroy ===");
        bridgeRegistered = false;
        firebaseBridge = null;
        super.onDestroy();
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
                    firebaseBridge = new FirebaseBridge();
                    webView.addJavascriptInterface(firebaseBridge, "Android");
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

    public class FirebaseBridge {
        
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

        @JavascriptInterface
        public void loadFromCloud(String callback) {
            Log.d("FIREBASE", "BRIDGE CALLED: loadFromCloud");
            
            FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
            if (user == null) {
                Log.e("FIREBASE", "Not authenticated");
                return;
            }
            
            String uid = user.getUid();
            loadFromFirestore(uid, callback);
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
            long now = System.currentTimeMillis();
            if (now - lastSyncTime < SYNC_THROTTLE_MS) {
                Log.d("FIREBASE", "Sync throttled");
                return;
            }
            lastSyncTime = now;
            
            if (uid == null || uid.isEmpty()) {
                Log.e("FIREBASE", "NO UID — ABORT SAVE");
                return;
            }

            FirebaseFirestore db = FirebaseFirestore.getInstance();

            Map<String, Object> data = new HashMap<>();
            data.put("payload", jsonData);
            data.put("updatedAt", System.currentTimeMillis());

            db.collection("neyra_users")
                .document(uid)
                .collection("core")
                .document("main")
                .set(data)
                .addOnSuccessListener(v -> Log.d("FIREBASE", "SAVE OK"))
                .addOnFailureListener(e -> {
                    Log.e("FIREBASE", "SAVE ERROR: " + e.getMessage());
                    lastSyncTime = 0;
                });
        }

        private void loadFromFirestore(String uid, String callback) {
            if (uid == null || uid.isEmpty()) {
                Log.e("FIREBASE", "NO UID — ABORT LOAD");
                return;
            }

            FirebaseFirestore db = FirebaseFirestore.getInstance();

            db.collection("neyra_users")
                .document(uid)
                .collection("core")
                .document("main")
                .get()
                .addOnSuccessListener(doc -> {
                    if (doc.exists() && doc.contains("payload")) {
                        String payload = doc.getString("payload");
                        Log.d("FIREBASE", "LOAD OK");
                        if (webView != null) {
                            sendCloudDataToJS(callback, payload);
                        }
                    } else {
                        Log.d("FIREBASE", "No data found");
                        if (webView != null) {
                            sendCloudDataToJS(callback, null);
                        }
                    }
                })
                .addOnFailureListener(e -> {
                    Log.e("FIREBASE", "LOAD ERROR: " + e.getMessage());
                    if (webView != null) {
                        sendCloudDataToJS(callback, null);
                    }
                });
        }

        private void sendCloudDataToJS(String callback, String data) {
            if (callback == null || callback.isEmpty()) return;
            if (webView == null) return;
            
            webView.post(() -> {
                if (webView == null) return;
                try {
                    String jsonData = data != null ? data : "null";
                    String escaped = jsonData
                        .replace("\\", "\\\\")
                        .replace("\"", "\\\"")
                        .replace("\n", "\\n")
                        .replace("\r", "\\r")
                        .replace("\t", "\\t");
                    String js = callback + "(\"" + escaped + "\")";
                    webView.evaluateJavascript(js, null);
                } catch (Exception e) {
                    Log.e("FIREBASE", "JS call error: " + e.getMessage());
                }
            });
        }

        private void sendCloudDataWithRetry(String data, int retries) {
            if (retries <= 0) return;
            if (data == null || data.isEmpty()) return;
            if (webView == null) return;

            webView.post(() -> {
                if (webView == null) return;
                try {
                    String escaped = data
                        .replace("\\", "\\\\")
                        .replace("\"", "\\\"")
                        .replace("\n", "\\n")
                        .replace("\r", "\\r")
                        .replace("\t", "\\t");
                    webView.evaluateJavascript(
                        "if (window.onCloudData && window._appReady) { window.onCloudData(\"" + escaped + "\"); } else { 'NOT_READY'; }",
                        value -> {
                            if (value != null && value.contains("NOT_READY")) {
                                Log.d("FIREBASE", "JS not ready, scheduling retry");
                                new Handler().postDelayed(() -> 
                                    sendCloudDataWithRetry(data, retries - 1), 500);
                            }
                        }
                    );
                } catch (Exception e) {
                    Log.e("FIREBASE", "JS retry error: " + e.getMessage());
                }
            });
        }

        @Override
        public void onTrimMemory(int level) {
            super.onTrimMemory(level);
            if (level >= TRIM_MEMORY_MODERATE && webView != null) {
                Log.i("TAG", "WebView memory pressure - clearing cache");
                webView.clearCache(true);
            }
        }

        @JavascriptInterface
        public void deleteCloudData() {
            Log.d("FIREBASE", "BRIDGE CALLED: deleteCloudData");
            
            FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
            if (user == null) {
                Log.e("FIREBASE", "Not authenticated");
                return;
            }
            
            String uid = user.getUid();
            deleteFromFirestore(uid);
        }
        
        private void deleteFromFirestore(String uid) {
            if (uid == null || uid.isEmpty()) {
                Log.e("FIREBASE", "NO UID — ABORT DELETE");
                return;
            }

            FirebaseFirestore db = FirebaseFirestore.getInstance();

            db.collection("neyra_users")
                .document(uid)
                .collection("core")
                .document("main")
                .delete()
                .addOnSuccessListener(v -> Log.d("FIREBASE", "DELETE OK"))
                .addOnFailureListener(e -> Log.e("FIREBASE", "DELETE ERROR: " + e.getMessage()));
        }
    }
}
