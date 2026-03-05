#!/bin/bash
# ============================================================================
# Kyo.is DMG 公证脚本 (仅公证,不重新签名)
# ============================================================================

set -e

# 配置信息
APPLE_ID="yesssssshu@gmail.com"
TEAM_ID="X689MYAJ7K"
APP_PASSWORD="vlhf-ywgy-ujak-tlgy"

# 文件路径
DMG_PATH="/Users/yeshu/Desktop/kyo.is/src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/Kyo_1.0.0_aarch64.dmg"

echo "🚀 开始公证 DMG..."
echo ""

# 提交公证
echo "📤 提交公证 (需要 5-15 分钟)..."
echo "正在上传到 Apple 服务器..."
xcrun notarytool submit "$DMG_PATH" \
  --apple-id "$APPLE_ID" \
  --team-id "$TEAM_ID" \
  --password "$APP_PASSWORD" \
  --wait

echo ""
echo "✅ 公证完成"
echo ""

# 装订公证票据
echo "📎 装订公证票据..."
xcrun stapler staple "$DMG_PATH"
echo "✅ 装订完成"
echo ""

# 最终验证
echo "🔍 最终验证..."
spctl -a -t open --context context:primary-signature -v "$DMG_PATH"
echo ""

echo "🎉 公证全部完成!"
echo "📦 DMG 位置: $DMG_PATH"
echo ""
echo "现在用户可以直接下载安装,无任何警告!"
