/**
 * Capacitor 配置 - 帽子21点
 * 用于打包 Android/iOS 原生App
 * 
 * 使用方法:
 * 1. npm run build (构建Web)
 * 2. npx cap sync (同步到原生平台)
 * 3. npx cap add android (添加Android平台)
 * 4. npx cap add ios (添加iOS平台)
 * 5. npx cap open android (打开Android Studio)
 * 6. npx cap open ios (打开Xcode)
 */

const config = {
  appId: 'com.maozi.blackjack',
  appName: '帽子21点',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#f8f9fa',
      showSpinner: true,
      spinnerColor: '#2ecc71',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#f8f9fa',
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
    },
  },
};

module.exports = config;
