package com.moodos.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.d("BRIDGE", "MainActivity onCreate");
    }
}
