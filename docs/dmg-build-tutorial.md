# 🎓 macOS DMG 构建教程 (小白版)

## 📋 当前状态检查

✅ **Xcode Command Line Tools**: 已安装
✅ **Bun**: 已安装
✅ **代码签名证书**: 已安装 (2个证书)
❌ **Rust**: 未安装 (需要安装)
❌ **Tauri CLI**: 未安装 (需要安装)

---

## 🚀 第一步:安装 Rust (必需)

Rust 是 Tauri 的编译器,必须先安装。

### 1.1 打开终端,复制粘贴这条命令:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 1.2 安装过程中会问你:

```
1) Proceed with standard installation (default - just press enter)
2) Customize installation
3) Cancel installation
```

**直接按回车键** (选择默认安装)

### 1.3 安装完成后,运行:

```bash
source $HOME/.cargo/env
```

### 1.4 验证安装成功:

```bash
cargo --version
```

应该看到类似输出: `cargo 1.xx.x`

---

## 🔧 第二步:安装 Tauri CLI

### 2.1 运行命令:

```bash
cargo install tauri-cli
```

⏱️ 这个过程需要 **5-10 分钟**,请耐心等待。

### 2.2 验证安装:

```bash
cargo tauri --version
```

应该看到类似输出: `tauri-cli 2.x.x`

---

## 🔐 第三步:配置代码签名

你已经有 2 个证书:
1. **Apple Development** (开发用)
2. **Apple Distribution** (分发用)

但是要分发给用户下载,我们需要 **Developer ID Application** 证书。

### 3.1 获取 Developer ID 证书

1. 打开浏览器,访问: https://developer.apple.com/account
2. 登录你的开发者账号
3. 点击左侧 **Certificates, Identifiers & Profiles**
4. 点击左侧 **Certificates**
5. 点击右上角 **+** 按钮
6. 选择 **Developer ID Application** (在 "Software" 分类下)
7. 点击 **Continue**
8. 选择你的证书签名请求 (CSR):
   - 如果没有 CSR,点击 "Learn more" 按照指引创建
   - 打开 **钥匙串访问** (Keychain Access)
   - 菜单栏 → **钥匙串访问** → **证书助理** → **从证书颁发机构请求证书**
   - 填写邮箱,选择 "存储到磁盘"
   - 保存 CSR 文件
9. 上传 CSR 文件
10. 下载生成的证书 (`.cer` 文件)
11. **双击证书文件**,会自动安装到钥匙串

### 3.2 验证证书安装成功:

```bash
security find-identity -v -p codesigning
```

应该看到新增一行:
```
3) XXXXXXXXXX "Developer ID Application: SHU YE (X689MYAJ7K)"
```

---

## 🔑 第四步:生成 App-Specific Password

公证需要一个特殊密码 (不是你的 Apple ID 密码)。

### 4.1 生成密码:

1. 访问: https://appleid.apple.com
2. 登录
3. 找到 **Security** (安全性) 部分
4. 找到 **App-Specific Passwords** (应用专用密码)
5. 点击 **Generate Password** (生成密码)
6. 输入标签: `Kyo Notarization`
7. 点击 **Create** (创建)
8. **复制密码** (格式: `xxxx-xxxx-xxxx-xxxx`)
9. **保存到安全的地方** (只显示一次!)

---

## 🎯 第五步:构建 DMG (最简单方式)

现在所有准备工作完成,开始构建!

### 5.1 进入项目目录:

```bash
cd /Users/yeshu/Desktop/kyo.is
```

### 5.2 运行构建脚本:

```bash
./scripts/build-dmg.sh
```

### 5.3 按照提示操作:

**提示 1: 选择签名方式**
```
请选择签名方式:
1. 使用开发者证书签名 (推荐)
2. 不签名 (仅本地测试)
请输入选项 (1/2):
```
→ 输入 `1` 然后回车

**提示 2: 输入证书名称**
```
请输入证书名称:
```
→ 输入: `Developer ID Application: SHU YE (X689MYAJ7K)`

**提示 3: 输入 Apple ID**
```
请输入 Apple ID:
```
→ 输入你的开发者账号邮箱 (如 `your@email.com`)

**提示 4: 输入 Team ID**
```
请输入 Team ID:
```
→ 输入: `X689MYAJ7K`

**提示 5: 输入 App-Specific Password**
```
请输入 App-Specific Password:
```
→ 粘贴第四步生成的密码 (如 `xxxx-xxxx-xxxx-xxxx`)

### 5.4 等待构建完成:

⏱️ 整个过程需要 **10-20 分钟**:
- 编译 Rust 代码: ~5 分钟
- 构建 DMG: ~2 分钟
- 上传公证: ~1 分钟
- 等待 Apple 审核: ~5-15 分钟
- 装订公证票据: ~1 分钟

### 5.5 构建成功!

看到这个输出就成功了:
```
🎉 构建完成!
📦 DMG 位置: target/universal-apple-darwin/release/bundle/dmg/
```

---

## 📦 第六步:测试 DMG

### 6.1 找到 DMG 文件:

```bash
open target/universal-apple-darwin/release/bundle/dmg/
```

会打开 Finder,看到 `Kyo_1.0.0_universal.dmg`

### 6.2 测试安装:

1. 双击 DMG 文件
2. 拖动 Kyo.app 到 Applications 文件夹
3. 打开 Launchpad,找到 Kyo
4. 点击打开

✅ 如果能正常打开,说明签名和公证都成功了!

---

## 🌐 第七步:上传到网站 (可选)

如果你想让用户下载,需要上传到 CDN。

### 7.1 使用 Vercel Blob Storage:

```bash
# 安装 Vercel CLI (如果还没安装)
npm i -g vercel

# 登录
vercel login

# 上传 DMG
vercel blob upload target/universal-apple-darwin/release/bundle/dmg/Kyo_1.0.0_universal.dmg
```

会返回一个 URL,如:
```
https://xxx.public.blob.vercel-storage.com/Kyo_1.0.0_universal.dmg
```

### 7.2 在网站添加下载链接:

在 `kyo.is/download` 页面添加:
```html
<a href="https://xxx.public.blob.vercel-storage.com/Kyo_1.0.0_universal.dmg">
  下载 macOS 版本
</a>
```

---

## ❓ 常见问题

### Q1: 构建失败 "No signing identity found"

**原因**: 证书名称输入错误

**解决**:
```bash
# 查看正确的证书名称
security find-identity -v -p codesigning

# 复制完整的证书名称 (包括括号里的 Team ID)
```

### Q2: 公证失败 "Invalid credentials"

**原因**: Apple ID 或 App-Specific Password 错误

**解决**:
1. 确认 Apple ID 是开发者账号邮箱
2. 重新生成 App-Specific Password
3. 确保密码没有多余的空格

### Q3: 打开 DMG 提示 "已损坏"

**原因**: 公证失败或未完成

**临时解决** (仅测试用):
```bash
xattr -cr /Applications/Kyo.app
```

**正确解决**: 重新构建并确保公证成功

### Q4: 构建太慢了

**原因**: 第一次编译 Rust 需要下载和编译很多依赖

**解决**: 耐心等待,第二次构建会快很多 (~2 分钟)

---

## 🎉 完成!

现在你已经成功构建了一个:
- ✅ 代码签名的
- ✅ 公证过的
- ✅ Universal Binary (支持 Intel + Apple Silicon)
- ✅ Web Shell 架构 (自动更新)

的 macOS DMG!

---

## 📞 需要帮助?

如果遇到问题,可以:
1. 查看详细日志: `cat target/universal-apple-darwin/release/bundle/dmg/build.log`
2. 检查公证状态: `xcrun notarytool history --apple-id your@email.com --team-id X689MYAJ7K`
3. 问我!
