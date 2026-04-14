package com.moodos.app;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;
import android.webkit.WebView;
import android.webkit.JavascriptInterface;
import com.google.firebase.firestore.FirebaseFirestore;
import android.util.Log;
import android.os.Handler;
import android.os.Looper;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends BridgeActivity {

    private WebView webViewRef;

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(BatteryPlugin.class);
        super.onCreate(savedInstanceState);
        Handler mainHandler = new Handler(Looper.getMainLooper());
        
        mainHandler.postDelayed(() -> {
            try {
                Bridge bridge = getBridge();
                if (bridge != null) {
                    WebView webView = bridge.getWebView();
                    if (webView != null) {
                        webViewRef = webView;
                        webView.addJavascriptInterface(new FirebaseBridge(), "Android");
                        Log.d("FIREBASE", "JavaScript interface registered");
                        
                        // Load cloud data on startup
                        loadFromCloud();
                    }
                }
            } catch (Exception e) {
                Log.e("FIREBASE", "Failed to register JS interface: " + e.getMessage());
            }
        }, 1000);
    }

    private void loadFromCloud() {
        FirebaseFirestore db = FirebaseFirestore.getInstance();
        db.collection("user_data")
            .orderBy("timestamp", com.google.firebase.firestore.Query.Direction.DESCENDING)
            .limit(1)
            .get()
            .addOnSuccessListener(queryDocumentSnapshots -> {
                if (queryDocumentSnapshots != null && !queryDocumentSnapshots.isEmpty()) {
                    Map<String, Object> data = queryDocumentSnapshots.getDocuments().getFirst().getData();
                    if (data != null && data.containsKey("payload")) {
                        String payload = (String) data.get("payload");
                        String js = "window.onCloudData && window.onCloudData(" + payload + ")";
                        webViewRef.evaluateJavascript(js, null);
                        Log.d("FIREBASE", "CLOUD DATA LOADED");
                    }
                } else {
                    Log.d("FIREBASE", "No cloud data found");
                }
            })
            .addOnFailureListener(e -> 
                Log.e("FIREBASE", "LOAD ERROR: " + e));
    }

    @SuppressWarnings("unused")
    public static class FirebaseBridge {
        @JavascriptInterface
        public void saveToCloud(String jsonData) {
            FirebaseFirestore db = FirebaseFirestore.getInstance();
            Map<String, Object> data = new HashMap<>();
            data.put("payload", jsonData);
            data.put("timestamp", System.currentTimeMillis());
            
            db.collection("user_data")
                .add(data)
                .addOnSuccessListener(documentReference -> 
                    Log.d("FIREBASE", "BRIDGE SAVE OK - doc: " + documentReference.getId()))
                .addOnFailureListener(e -> 
                    Log.e("FIREBASE", "BRIDGE SAVE ERROR: " + e));
        }
    }
}
