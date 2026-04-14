package com.moodos.app;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import android.webkit.JavascriptInterface;

import com.getcapacitor.BridgeActivity;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

import java.util.HashMap;
import java.util.Map;

public class MainActivity extends BridgeActivity {

    private WebView webView;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        android.util.Log.i("TAG", "=== ON CREATE START ===");
        
        new android.os.Handler().postDelayed(() -> {
            try {
                webView = getBridge().getWebView();
                
                if (webView != null) {
                    webView.getSettings().setJavaScriptEnabled(true);
                    webView.addJavascriptInterface(new FirebaseBridge(), "Android");
                    android.util.Log.i("TAG", "=== Android bridge registered ===");
                } else {
                    android.util.Log.e("TAG", "WebView is null!");
                }
            } catch (Exception e) {
                android.util.Log.e("TAG", "Error: " + e.getMessage());
            }
        }, 1000);
        
        android.util.Log.i("TAG", "=== ON CREATE END ===");
    }

    public class FirebaseBridge {
        @JavascriptInterface
        public void saveToCloud(String jsonData) {
            Log.d("FIREBASE", "BRIDGE CALLED: saveToCloud");
            
            FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
            if (user == null) {
                Log.e("FIREBASE", "Not authenticated");
                return;
            }
            
            String uid = user.getUid();
            Log.d("FIREBASE", "UID: " + uid);
            
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
