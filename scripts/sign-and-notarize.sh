#!/bin/bash
# ============================================================================
# Kyo.is DMG 签名和公证脚本
# ============================================================================

set -e

# 配置信息
CERT_NAME="Developer ID Application: SHU YE (X689MYAJ7K)"
APPLE_ID="yesssssshu@gmail.com"
TEAM_ID="X689MYAJ7K"
APP_PASSWORD="vlhf-ywgy-ujak-tlgy"

# 文件路径
APP_PATH="/Users/yeshu/Desktop/kyo.is/src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Kyo.app"
DMG_PATH="/Users/yeshu/Desktop/kyo.is/src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/Kyo_1.0.0_aarch64.dmg"

echo "🔐 开始签名和公证流程..."
echo ""

# 步骤 1: 签名应用
echo "📝 步骤 1/5: 签名应用..."
codesign --force --options runtime --timestamp --sign "$CERT_NAME" "$APP_PATH/Contents/MacOS/kyo"
codesign --force --options runtime --timestamp --sign "$CERT_NAME" "$APP_PATH"
echo "✅ 应用签名完成"
echo ""

# 步骤 2: 验证签名
echo "🔍 步骤 2/5: 验证应用签名..."
codesign --verify --deep --strict --verbose=2 "$APP_PATH"
echo "✅ 签名验证通过"
echo ""

# 步骤 3: 签名 DMG
echo "📝 步骤 3/5: 签名 DMG..."
codesign --force --timestamp --sign "$CERT_NAME" "$DMG_PATH"
echo "✅ DMG 签名完成"
echo ""

# 步骤 4: 提交公证
echo "🚀 步骤 4/5: 提交公证 (需要 5-15 分钟)..."
echo "正在上传到 Apple 服务器..."
xcrun notarytool submit "$DMG_PATH" \
  --apple-id "$APPLE_ID" \
  --team-id "$TEAM_ID" \
  --password "$APP_PASSWORD" \
  --wait

echo "✅ 公证完成"
echo ""

# 步骤 5: 装订公证票据
echo "📎 步骤 5/5: 装订公证票据..."
xcrun stapler staple "$DMG_PATH"
echo "✅ 装订完成"
echo ""

# 最终验证
echo "🔍 最终验证..."
spctl -a -t open --context context:primary-signature -v "$DMG_PATH"
echo ""

echo "🎉 签名和公证全部完成!"
echo "📦 DMG 位置: $DMG_PATH"
echo ""
echo "现在用户可以直接下载安装,无任何警告!"
