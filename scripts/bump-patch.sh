#!/bin/bash
# Auto-bump PATCH version in generate-build-version.ts
# Called by git pre-commit hook
#
# 规则：
#   PATCH 0→1→2→...→99 → MINOR+1, PATCH=0
#   MINOR 0→1→2→...→99 → MAJOR+1, MINOR=0

SCRIPT="scripts/generate-build-version.ts"

# 读取当前版本号
MAJOR=$(grep '^const MAJOR' "$SCRIPT" | sed 's/[^0-9]//g')
MINOR=$(grep '^const MINOR' "$SCRIPT" | sed 's/[^0-9]//g')
PATCH=$(grep '^const PATCH' "$SCRIPT" | sed 's/[^0-9]//g')

# 递增
PATCH=$((PATCH + 1))
if [ "$PATCH" -gt 99 ]; then
  PATCH=0
  MINOR=$((MINOR + 1))
fi
if [ "$MINOR" -gt 99 ]; then
  MINOR=0
  MAJOR=$((MAJOR + 1))
fi

# 写回
sed -i '' "s/^const MAJOR = [0-9]*;/const MAJOR = ${MAJOR};/" "$SCRIPT"
sed -i '' "s/^const MINOR = [0-9]*;/const MINOR = ${MINOR};/" "$SCRIPT"
sed -i '' "s/^const PATCH = [0-9]*;/const PATCH = ${PATCH};/" "$SCRIPT"

# 暂存修改
git add "$SCRIPT"

echo "[version] bumped to ${MAJOR}.${MINOR}.${PATCH}"
