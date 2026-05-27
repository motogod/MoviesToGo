/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import './global.css';
import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import mobileAds from 'react-native-google-mobile-ads';
import AppContainer from '@/navigator';

// ** Store Imports
import { store } from '@/store';
import { Provider } from 'react-redux';
import { persistStore } from 'redux-persist';
import { PersistGate } from 'redux-persist/integration/react';

// redux persist setting
const persistor = persistStore(store);

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const statusBarBackgroundColor = '#0B0B0F';

  useEffect(() => {
    mobileAds().initialize();
  }, []);

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <View style={styles.root}>
            <StatusBar
              backgroundColor={statusBarBackgroundColor}
              barStyle={isDarkMode ? 'light-content' : 'light-content'}
              translucent={false}
            />
            <AppContainer />
          </View>
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
