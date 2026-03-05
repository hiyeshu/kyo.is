# macOS DMG 构建与分发指南

## 架构设计

Kyo.is macOS 应用采用 **Web Shell** 架构:
- DMG 包含一个轻量级 Tauri 壳
- 应用启动后直接加载 `https://kyo.is`
- 无需打包前端资源,DMG 体积极小 (~5MB)
- 网站更新后,所有用户立即获得最新版本
- 无需重新分发 DMG

## 前置准备

### 1. 安装依赖

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装 Tauri CLI
cargo install tauri-cli

# 安装 Xcode Command Line Tools
xcode-select --install
```

### 2. 配置开发者证书

#### 获取证书
1. 登录 [Apple Developer](https://developer.apple.com/account)
2. 进入 **Certificates, Identifiers & Profiles**
3. 创建 **Developer ID Application** 证书
4. 下载并双击安装到钥匙串

#### 验证证书
```bash
security find-identity -v -p codesigning
```

应该看到类似输出:
```
1) XXXXXXXXXX "Developer ID Application: Your Name (TEAM_ID)"
```

### 3. 生成 App-Specific Password

公证需要 App-Specific Password (不是 Apple ID 密码):

1. 访问 [appleid.apple.com](https://appleid.apple.com)
2. 登录后进入 **Security** → **App-Specific Passwords**
3. 点击 **Generate Password**
4. 输入标签 (如 "Kyo Notarization")
5. 保存生成的密码 (格式: `xxxx-xxxx-xxxx-xxxx`)

## 构建流程

### 方式 1: 使用自动化脚本 (推荐)

```bash
# 运行构建脚本
./scripts/build-dmg.sh
```

脚本会引导你:
1. 选择是否签名
2. 输入证书名称
3. 输入 Apple ID 和 Team ID
4. 输入 App-Specific Password
5. 自动构建、签名、公证、装订

### 方式 2: 手动构建

#### 2.1 不签名 (仅本地测试)

```bash
cd src-tauri
cargo tauri build --target universal-apple-darwin
```

输出: `target/universal-apple-darwin/release/bundle/dmg/Kyo_1.0.0_universal.dmg`

⚠️ 用户下载后会看到 "无法验证开发者" 警告

#### 2.2 签名但不公证

```bash
cd src-tauri

# 设置证书
export APPLE_CERTIFICATE="Developer ID Application: Your Name (TEAM_ID)"

# 构建
cargo tauri build --target universal-apple-darwin
```

⚠️ macOS 10.15+ 仍会提示 "无法验证"

#### 2.3 签名 + 公证 (推荐)

```bash
cd src-tauri

# 1. 设置环境变量
export APPLE_CERTIFICATE="Developer ID Application: Your Name (TEAM_ID)"
export APPLE_ID="your@email.com"
export APPLE_TEAM_ID="TEAM_ID"

# 2. 构建
cargo tauri build --target universal-apple-darwin

# 3. 公证
DMG_PATH="../target/universal-apple-darwin/release/bundle/dmg/Kyo_1.0.0_universal.dmg"

xcrun notarytool submit "$DMG_PATH" \
  --apple-id "$APPLE_ID" \
  --team-id "$APPLE_TEAM_ID" \
  --password "xxxx-xxxx-xxxx-xxxx" \
  --wait

# 4. 装订公证票据
xcrun stapler staple "$DMG_PATH"

# 5. 验证
spctl -a -t open --context context:primary-signature -v "$DMG_PATH"
```

✅ 用户下载后可直接打开,无警告

## 分发策略

### 选项 1: 网站直接下载 (推荐)

**优点:**
- 无审核,立即发布
- 完全控制更新节奏
- 可追踪下载量

**步骤:**
1. 上传 DMG 到 CDN (如 Vercel Blob Storage)
2. 在 `kyo.is/download` 提供下载链接
3. 用户下载后拖入 Applications 文件夹

**更新策略:**
- DMG 本身无需频繁更新 (仅 Web Shell)
- 网站更新后,所有用户自动获得最新版本
- 仅在 Tauri 版本升级或修复安全问题时重新分发 DMG

### 选项 2: Mac App Store

**优点:**
- 用户信任度高
- 自动更新

**缺点:**
- 审核周期 1-3 天
- 需要 $99/年 开发者账号
- 需要遵守 App Store 审核指南
- 需要使用 Mac App Store 证书 (非 Developer ID)

**不推荐原因:**
- Web Shell 架构可能被拒 (加载外部网页)
- 审核会延迟功能发布

### 选项 3: Homebrew Cask

**优点:**
- 开发者友好
- 自动更新

**步骤:**
1. 创建 Cask 定义文件
2. 提交 PR 到 `homebrew/cask`
3. 用户通过 `brew install --cask kyo` 安装

**示例 Cask:**
```ruby
cask "kyo" do
  version "1.0.0"
  sha256 "..."

  url "https://kyo.is/downloads/Kyo_#{version}_universal.dmg"
  name "Kyo"
  desc "Web-Based Agentic AI OS"
  homepage "https://kyo.is"

  app "Kyo.app"
end
```

## 版本管理

### 更新 DMG 版本号

编辑 `src-tauri/tauri.conf.json`:
```json
{
  "version": "1.0.1"
}
```

### 发布新版本

```bash
# 1. 更新版本号
vim src-tauri/tauri.conf.json

# 2. 构建新 DMG
./scripts/build-dmg.sh

# 3. 上传到 CDN
# (手动或通过 CI/CD)

# 4. 更新下载页面链接
# (如果使用 Homebrew,提交 PR 更新 Cask)
```

## 常见问题

### Q: 用户打开时提示 "已损坏"
A: 需要公证。运行:
```bash
xattr -cr /Applications/Kyo.app
```

### Q: 公证失败 "Invalid Code Signature"
A: 检查 entitlements.plist 是否包含网络权限:
```xml
<key>com.apple.security.network.client</key>
<true/>
```

### Q: 构建失败 "No signing identity found"
A: 确保证书已安装到钥匙串,并且是 **Developer ID Application** 类型

### Q: DMG 体积过大
A: Web Shell 架构下,DMG 应该只有 5-10MB。如果超过 50MB,检查是否错误打包了前端资源。

### Q: 如何支持自动更新?
A: Tauri 内置 Updater,但 Web Shell 架构下不需要:
- 网站更新 = 应用更新
- 仅在 Tauri 本身需要升级时重新分发 DMG

## 成本估算

| 项目 | 费用 | 说明 |
|------|------|------|
| Apple Developer Program | $99/年 | 必需,用于代码签名和公证 |
| CDN 存储 (Vercel Blob) | ~$0.15/GB/月 | 10MB DMG × 1000 下载 = $0.0015 |
| 总计 | ~$100/年 | 几乎全部是开发者账号费用 |

## 推荐方案

基于你的需求 (频繁更新、无审核),推荐:

✅ **网站直接下载 + 代码签名 + 公证**

- 一次性构建 DMG (Web Shell)
- 上传到 Vercel Blob Storage
- 在 kyo.is/download 提供下载
- 网站更新后,所有用户自动获得最新功能
- 仅在 Tauri 安全更新时重新分发 DMG (每年 1-2 次)

## 下一步

1. 运行 `./scripts/build-dmg.sh` 构建第一个 DMG
2. 测试本地安装和运行
3. 配置 Vercel Blob Storage 上传
4. 创建 `/download` 页面
5. (可选) 提交 Homebrew Cask
