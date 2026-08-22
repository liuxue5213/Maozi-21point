#!/bin/bash
# ============================================
# 帽子21点 - App构建脚本
# 构建Android APK / iOS IPA
# ============================================

set -e

echo "============================================"
echo "  🎩 帽子21点 - App构建"
echo "============================================"

# 配置
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-amd64}"

# 1. 构建前端Web
echo ""
echo "[1/5] 构建前端Web..."
cd "$(dirname "$0")/../frontend"
npm install
npm run build

# 2. 同步到原生平台
echo ""
echo "[2/5] 同步到原生平台..."
npx cap sync

# 3. 构建Android APK
echo ""
echo "[3/5] 构建Android APK..."
cd android

# 检查Gradle
if [ ! -f "./gradlew" ]; then
    echo "错误: 未找到gradlew，请确保已添加Android平台"
    exit 1
fi

./gradlew assembleRelease

APK_PATH="app/build/outputs/apk/release/app-release-unsigned.apk"
if [ -f "$APK_PATH" ]; then
    echo ""
    echo "✅ Android APK构建成功!"
    echo "   路径: $(pwd)/$APK_PATH"
    
    # 复制到输出目录
    mkdir -p ../../dist/app
    cp "$APK_PATH" ../../dist/app/帽子21点-android.apk
else
    echo "❌ Android APK构建失败"
fi

cd ..

# 4. 构建iOS (仅macOS)
echo ""
echo "[4/5] 构建iOS..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! command -v xcodebuild &> /dev/null; then
        echo "⚠️  未找到xcodebuild，跳过iOS构建"
        echo "   请在Mac上运行: npx cap open ios"
    else
        echo "   正在构建iOS..."
        cd ios/App
        xcodebuild -workspace App.xcscheme -scheme App -configuration Release -destination 'generic/platform=iOS' build
        cd ../..
        echo "✅ iOS构建完成"
    fi
else
    echo "⚠️  非macOS系统，跳过iOS构建"
    echo "   请在Mac上运行: npx cap open ios"
fi

# 5. 总结
echo ""
echo "============================================"
echo "  🎩 帽子21点 - 构建完成!"
echo "============================================"
echo ""
echo "  📱 Android APK: dist/app/帽子21点-android.apk"
echo "  🍎 iOS: 使用Xcode打开 ios/App"
echo ""
