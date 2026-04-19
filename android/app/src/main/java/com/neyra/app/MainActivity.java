package com.neyra.app;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import android.webkit.JavascriptInterface;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;

public class MainActivity extends BridgeActivity {

    private WebView webView;
    private boolean bridgeRegistered = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

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
    public void onDestroy() {
        Log.i("TAG", "=== onDestroy ===");
        bridgeRegistered = false;
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

    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        if (level >= TRIM_MEMORY_MODERATE && webView != null) {
            Log.i("TAG", "WebView memory pressure - clearing cache");
            webView.clearCache(true);
        }
    }
}
