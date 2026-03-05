#!/bin/bash
# ============================================================================
# Kyo.is macOS DMG 构建脚本
# ============================================================================
# 用途: 构建并签名 macOS DMG 安装包
# 依赖: Tauri CLI, Xcode Command Line Tools, Apple Developer Account
# ============================================================================

set -e

echo "🚀 开始构建 Kyo.is macOS DMG..."

# 检查是否安装 Tauri CLI
if ! command -v cargo-tauri &> /dev/null; then
    echo "❌ 未找到 Tauri CLI，正在安装..."
    cargo install tauri-cli
fi

# 检查开发者证书
echo "📝 检查代码签名证书..."
security find-identity -v -p codesigning

echo ""
echo "请选择签名方式:"
echo "1. 使用开发者证书签名 (推荐)"
echo "2. 不签名 (仅本地测试)"
read -p "请输入选项 (1/2): " choice

if [ "$choice" = "1" ]; then
    read -p "请输入证书名称 (如 'Developer ID Application: Your Name'): " cert_name
    read -p "请输入 Apple ID: " apple_id
    read -p "请输入 Team ID: " team_id

    # 设置环境变量
    export APPLE_CERTIFICATE="$cert_name"
    export APPLE_ID="$apple_id"
    export APPLE_TEAM_ID="$team_id"

    echo "✅ 将使用证书: $cert_name"

    # 构建并签名
    cd src-tauri
    cargo tauri build --target universal-apple-darwin

    echo ""
    echo "🔐 开始公证..."
    echo "注意: 公证需要 App-Specific Password，请在 appleid.apple.com 生成"
    read -p "请输入 App-Specific Password: " -s app_password
    echo ""

    # 公证 DMG
    DMG_PATH="../target/universal-apple-darwin/release/bundle/dmg/Kyo_1.0.0_universal.dmg"
    xcrun notarytool submit "$DMG_PATH" \
        --apple-id "$apple_id" \
        --team-id "$team_id" \
        --password "$app_password" \
        --wait

    # 装订公证票据
    xcrun stapler staple "$DMG_PATH"

    echo "✅ 公证完成！"
else
    echo "⚠️  构建未签名版本..."
    cd src-tauri
    cargo tauri build --target universal-apple-darwin
fi

echo ""
echo "🎉 构建完成！"
echo "📦 DMG 位置: target/universal-apple-darwin/release/bundle/dmg/"
ls -lh ../target/universal-apple-darwin/release/bundle/dmg/
