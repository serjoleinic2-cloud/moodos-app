package com.moodos.app;

import android.os.Bundle;
import android.util.Log;

import com.getcapacitor.BridgeActivity;
import com.moodos.app.FirebasePlugin;

public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    registerPlugin(FirebasePlugin.class);

    Log.d("BRIDGE", "MainActivity onCreate");
    Log.d("BRIDGE", "FirebasePlugin registered");
  }
}
