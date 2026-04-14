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

    private static WebView sWebView;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Log.i("TAG", "=== ON CREATE START ===");
        
        new android.os.Handler().postDelayed(() -> {
            try {
                WebView webView = getBridge().getWebView();
                
                if (webView != null) {
                    sWebView = webView;
                    webView.getSettings().setJavaScriptEnabled(true);
                    webView.addJavascriptInterface(new FirebaseBridge(), "Android");
                    Log.i("TAG", "=== Android bridge registered ===");
                    Log.i("TAG", "=== WebView: " + webView + " ===");
                } else {
                    Log.e("TAG", "WebView is null!");
                }
            } catch (Exception e) {
                Log.e("TAG", "Error: " + e.getMessage());
            }
        }, 2000);
        
        Log.i("TAG", "=== ON CREATE END ===");
    }

    public static class FirebaseBridge {
        
        @JavascriptInterface
        public void saveToCloud(String jsonData) {
            Log.d("FIREBASE", "BRIDGE CALLED: saveToCloud");
            Log.d("FIREBASE", "WebView ref: " + sWebView);
            
            FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
            if (user == null) {
                Log.e("FIREBASE", "Not authenticated - trying anonymous");
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
