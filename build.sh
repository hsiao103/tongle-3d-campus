#!/bin/bash
# 在本資料夾執行：bash build.sh → 產生 school.html，並複製為 index.html（GitHub Pages 用）
cd "$(dirname "$0")"
cat part3a.js > part3.js; echo >> part3.js; cat part3b.js part3c.js >> part3.js
(cat part1.html; echo '<script>'; cat vendor/GLTFLoader.js vendor/SkeletonUtils.js vendor/herodata.js; echo '</script><script>'; cat part2.js part2d.js part2e.js part3.js part4.js part5.js part6.js part7.js part8.js; echo '</script>') > school.html
cat part2.js part2d.js part2e.js part3.js part4.js part5.js part6.js part7.js part8.js > all.js
node --check all.js && cp school.html index.html && echo "built: school.html / index.html"
